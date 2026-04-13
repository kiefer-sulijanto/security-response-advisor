import json
from collections import defaultdict
from datetime import timedelta
from pathlib import Path

from core.incident import Incident


class IncidentEngine:
    def __init__(self, rules_file=None, duplicate_cooldown_seconds=30, consumed_retention_seconds=120):
        if rules_file is None:
            rules_file = Path(__file__).resolve().parent.parent / "config" / "incident_rules.json"

        self.rules = self._load_rules(rules_file)
        self.duplicate_cooldown = timedelta(seconds=duplicate_cooldown_seconds)
        self.consumed_retention = timedelta(seconds=consumed_retention_seconds)
        self.recent_incidents = {}
        self.used_event_keys = {}

    def _load_rules(self, rules_file):
        try:
            with open(rules_file, "r", encoding="utf-8") as f:
                rules = json.load(f)
        except FileNotFoundError as e:
            raise RuntimeError(f"Rules file not found: {rules_file}") from e
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Invalid JSON in rules file: {rules_file}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to load rules file: {rules_file}") from e

        if not isinstance(rules, dict):
            raise RuntimeError("Rules file must contain a JSON object")

        return rules
    
    def _is_valid_rule(self, rule):
        return (
            isinstance(rule, dict)
            and isinstance(rule.get("events", []), list)
            and isinstance(rule.get("time_window", 0), (int, float))
        )

    def detect_incidents(self, events):
        if not events:
            return []
        
        incidents = []

        grouped_events = self._group_events_by_location(events)
                            
        for incident_name, rule in self.rules.items():
            try:
                if not self._is_valid_rule(rule):
                    continue
                required_events = rule.get("events", [])
                time_window = rule.get("time_window", 0)

                if not isinstance(required_events, list):
                    continue

                matches = self._check_rule(
                    grouped_events,
                    required_events,
                    time_window
                )

                if not matches:
                    continue

                for matching_events in matches:
                    valid_times = [event.timestamp for event in matching_events if hasattr(event, "timestamp")]
                    if not valid_times:
                        continue

                    incident_time = max(valid_times)
                    incident_signature = self._build_incident_signature(incident_name, matching_events)

                    if self._is_duplicate(incident_signature, incident_time):
                        continue

                    incidents.append(
                        Incident(
                            name=incident_name,
                            location=getattr(matching_events[0], "location", "unknown"),
                            timestamp=incident_time,
                            triggering_events=matching_events,
                            risk_score=rule.get("base_risk", 0),
                            description=rule.get("description", ""),
                            status="NEW"
                        )
                    )

                    self._consume_match(matching_events)
                    self.recent_incidents[incident_signature] = incident_time

            except (AttributeError, TypeError, ValueError, KeyError):
                continue

        try:
            self._cleanup_old_incidents(events)
            self._cleanup_old_consumed_events(events)
        except Exception:
            pass

        return incidents

    def _check_rule(self, grouped_events, required_events, time_window):
        try:
            all_matches = []

            for location, location_events in grouped_events.items():
                location_matches = self._find_matching_events(
                    location_events,
                    required_events,
                    time_window
                )

                for matched in location_matches:
                    if not matched:
                        continue

                    if self._is_consumed_match(matched):
                        continue

                    all_matches.append(matched)

            return all_matches
        except (AttributeError, TypeError, ValueError):
            return []

    def _group_events_by_location(self, events):
        events_by_location = defaultdict(list)

        for event in events:
            try:
                location = getattr(event, "location", "unknown")
                if hasattr(event, "timestamp"):
                    events_by_location[location].append(event)
            except (AttributeError, TypeError):
                continue

        for location in events_by_location:
            try:
                events_by_location[location].sort(key=lambda e: e.timestamp)
            except (AttributeError, TypeError):
                pass

        return events_by_location


    def _find_matching_events(self, location_events, required_events, time_window):
        try:
            if not location_events or not required_events:
                return []

            window = timedelta(seconds=int(time_window))

            filtered_events = [
                e for e in location_events
                if getattr(e, "event_type", None) in required_events
            ]

            if not filtered_events:
                return []

            matches = []
            seen_signatures = set()

            # Try every relevant event as an anchor, newest first
            for anchor in reversed(filtered_events):
                anchor_time = anchor.timestamp
                window_start = anchor_time - window

                candidates = [
                    e for e in filtered_events
                    if window_start <= e.timestamp <= anchor_time
                ]

                matched_by_type = {}

                for event_type in required_events:
                    matching = [e for e in candidates if e.event_type == event_type]
                    if not matching:
                        matched_by_type = {}
                        break

                    # choose the newest event of that type within window
                    matched_by_type[event_type] = max(matching, key=lambda e: e.timestamp)

                if not matched_by_type:
                    continue

                matched_events = [matched_by_type[event_type] for event_type in required_events]

                # ensure anchor really participates
                if anchor not in matched_events:
                    continue

                # avoid duplicate identical combinations
                signature = tuple(
                    sorted(
                        (
                            getattr(e, "event_type", "unknown"),
                            getattr(e, "location", "unknown"),
                            e.timestamp.isoformat() if getattr(e, "timestamp", None) else "no_time"
                        )
                        for e in matched_events
                    )
                )

                if signature in seen_signatures:
                    continue

                seen_signatures.add(signature)
                matches.append(matched_events)

            return matches

        except (AttributeError, TypeError, ValueError):
            return []
        
    def _within_time_window(self, selected_events, time_window):
        try:
            timestamps = sorted(event.timestamp for event in selected_events)
            return (timestamps[-1] - timestamps[0]) <= timedelta(seconds=int(time_window))
        except (AttributeError, TypeError, ValueError):
            return False

    def _build_incident_signature(self, incident_name, matching_events):
        try:
            location = getattr(matching_events[0], "location", "unknown")
            event_signature = tuple(
                sorted(self._event_key(event) for event in matching_events)
            )
            return (incident_name, location, event_signature)
        except (AttributeError, TypeError, ValueError):
            return (incident_name, "unknown", ())

    def _is_duplicate(self, signature, incident_time):
        try:
            last_seen = self.recent_incidents.get(signature)
            if last_seen is None:
                return False

            if incident_time < last_seen:
                return True  # suppress older late-arriving duplicate

            return (incident_time - last_seen) <= self.duplicate_cooldown
        except (TypeError, ValueError):
            return False

    def _cleanup_old_incidents(self, events):
        valid_timestamps = [event.timestamp for event in events if hasattr(event, "timestamp")]
        if not valid_timestamps:
            return

        latest_event_time = max(valid_timestamps)
        cutoff_time = latest_event_time - self.duplicate_cooldown

        expired_keys = [
            key for key, last_seen in self.recent_incidents.items()
            if last_seen < cutoff_time
        ]

        for key in expired_keys:
            del self.recent_incidents[key]
        
    
    def _event_key(self, event):
        ts = getattr(event, "timestamp", None)
        return (
            getattr(event, "event_type", "unknown"),
            getattr(event, "location", "unknown"),
            ts.isoformat() if ts else "no_time"
        )

    def _is_consumed_match(self, matching_events):
        if not matching_events:
            return False
        return any(self._event_key(event) in self.used_event_keys for event in matching_events)

    def _consume_match(self, matching_events):
        if not matching_events:
            return

        latest_time = max(
            event.timestamp for event in matching_events
            if hasattr(event, "timestamp")
        )

        for event in matching_events:
            self.used_event_keys[self._event_key(event)] = latest_time
    
    def _cleanup_old_consumed_events(self, events):
        valid_timestamps = [event.timestamp for event in events if hasattr(event, "timestamp")]
        if not valid_timestamps:
            return

        latest_event_time = max(valid_timestamps)
        cutoff_time = latest_event_time - self.consumed_retention

        expired_keys = [
            key for key, consumed_time in self.used_event_keys.items()
            if consumed_time < cutoff_time
        ]

        for key in expired_keys:
            del self.used_event_keys[key]
        