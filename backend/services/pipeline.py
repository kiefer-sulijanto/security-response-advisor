from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from adapters.access_log_adapter import process_access_log
from adapters.cctv_adapter import process_cctv_detection
from core.event_stream_processor import EventStreamProcessor
from core.incident_engine import IncidentEngine
from extractors.cctv_extractor import CCTVExtractor

try:
    from recommendation_AI.incident_analysis import get_advisory
except ImportError:
    get_advisory = None


class PipelineService:
    def __init__(
        self,
        window_seconds: int = 120,
        rules_file: str | None = None,
        enable_advisory: bool = True,
    ):
        self.window_seconds = window_seconds
        self.processor = EventStreamProcessor(window_seconds=window_seconds)
        self.engine = IncidentEngine(
            rules_file=rules_file,
            consumed_retention_seconds=window_seconds,
        )
        self.enable_advisory = enable_advisory

        self.extractors: dict[str, CCTVExtractor] = {}
        self.loitering_state: dict[tuple[str, str], dict] = {}
        self.loitering_config = {
            "distance_threshold": 80.0,
            "dwell_seconds": 60,
            "cooldown_seconds": 30,
        }
        self.zone_presence_state: dict[tuple[str, str], dict] = {}
        self.zone_presence_config = {
            "distance_threshold": 80.0,
            "exit_grace_seconds": 3,
        }
        self.multiple_persons_state: dict[tuple[str, str], dict] = {}
        self.multiple_persons_config = {
            "required_consecutive_frames": 2,
            "cooldown_seconds": 10,
        }

    def register_camera(
        self,
        camera_id: str,
        model_path: str,
        location: str,
        conf_threshold: float = 0.5,
        restricted_zones: dict[str, list[list[tuple[float, float]]]] | None = None,
    ) -> None:
        if not camera_id:
            raise ValueError("camera_id is required")
        if not model_path:
            raise ValueError("model_path is required")
        if not location:
            raise ValueError("location is required")

        self.extractors[camera_id] = CCTVExtractor(
            model_path=model_path,
            camera_id=camera_id,
            location=location,
            conf_threshold=conf_threshold,
            restricted_zones=restricted_zones,
        )

    def unregister_camera(self, camera_id: str) -> None:
        self.extractors.pop(camera_id, None)

    def list_registered_cameras(self) -> list[str]:
        return sorted(self.extractors.keys())

    def _distance_between_centers(self, c1: list[float] | None, c2: list[float] | None) -> float:
        if not c1 or not c2 or len(c1) != 2 or len(c2) != 2:
            return float("inf")
        dx = float(c1[0]) - float(c2[0])
        dy = float(c1[1]) - float(c2[1])
        return (dx * dx + dy * dy) ** 0.5

    def _build_multiple_persons_detections(
    self,
    detections: list[dict],
    camera_id: str,
    location: str,
    timestamp_override: str | None = None,
) -> list[dict]:
        timestamp = self._parse_timestamp(timestamp_override) or datetime.now()
        key = (camera_id, location)

        state = self.multiple_persons_state.get(
            key,
            {
                "consecutive_hits": 0,
                "last_emission": None,
            },
        )

        person_detections = [
            d for d in detections
            if isinstance(d, dict) and str(d.get("label", "")).strip().lower() == "person"
        ]

        person_count = len(person_detections)

        if person_count >= 2:
            state["consecutive_hits"] += 1
        else:
            state["consecutive_hits"] = 0

        last_emission = state.get("last_emission")
        cooled_down = (
            last_emission is None
            or (timestamp - last_emission).total_seconds() >= self.multiple_persons_config["cooldown_seconds"]
        )

        synthetic_detections: list[dict] = []

        if (
            person_count >= 2
            and state["consecutive_hits"] >= self.multiple_persons_config["required_consecutive_frames"]
            and cooled_down
        ):
            base_detection = person_detections[0]
            synthetic_detections.append(
                {
                    "label": "multiple_persons",
                    "timestamp": base_detection.get("timestamp"),
                    "location": location,
                    "camera_id": camera_id,
                    "confidence": 1.0,
                    "in_restricted_area": False,
                    "person_count": person_count,
                    "debug_reason": f"multiple_persons:{state['consecutive_hits']}_consecutive_frames",
                }
            )
            state["last_emission"] = timestamp
            state["consecutive_hits"] = 0

        self.multiple_persons_state[key] = state
        return synthetic_detections


    def _suppress_repeated_zone_entries(
        self,
        detections: list[dict],
        camera_id: str,
        location: str,
        timestamp_override: str | None = None,
    ) -> list[dict]:
        timestamp = self._parse_timestamp(timestamp_override) or datetime.now()
        key = (camera_id, location)

        state = self.zone_presence_state.get(
            key,
            {
                "inside_tracks": [],
                "last_seen_inside": None,
            },
        )

        filtered: list[dict] = []
        current_inside_centers: list[list[float]] = []

        for detection in detections:
            if not isinstance(detection, dict):
                continue

            label = str(detection.get("label", "")).strip().lower()
            in_restricted_area = bool(detection.get("in_restricted_area", False))
            center = detection.get("center")

            if label != "person" or not in_restricted_area:
                filtered.append(detection)
                continue

            current_inside_centers.append(center)

            matched_existing = False
            for tracked_center in state["inside_tracks"]:
                if self._distance_between_centers(tracked_center, center) <= self.zone_presence_config["distance_threshold"]:
                    matched_existing = True
                    break

            if not matched_existing:
                filtered.append(detection)

        if current_inside_centers:
            state["inside_tracks"] = current_inside_centers
            state["last_seen_inside"] = timestamp
        else:
            last_seen_inside = state.get("last_seen_inside")
            if last_seen_inside is not None:
                elapsed = (timestamp - last_seen_inside).total_seconds()
                if elapsed >= self.zone_presence_config["exit_grace_seconds"]:
                    state["inside_tracks"] = []
                    state["last_seen_inside"] = None

        self.zone_presence_state[key] = state
        return filtered

    def _build_loitering_detections(
        self,
        detections: list[dict],
        camera_id: str,
        location: str,
        timestamp_override: str | None = None,
    ) -> list[dict]:
        timestamp = self._parse_timestamp(timestamp_override) or datetime.now()
        synthetic_detections: list[dict] = []

        person_detections = [
            d for d in detections
            if isinstance(d, dict) and str(d.get("label", "")).strip().lower() == "person"
        ]

        key = (camera_id, location)
        state = self.loitering_state.get(key)

        if not person_detections:
            return []

        current_center = person_detections[0].get("center")

        if state is None:
            self.loitering_state[key] = {
                "first_seen": timestamp,
                "last_seen": timestamp,
                "last_center": current_center,
                "last_emission": None,
            }
            return []

        distance = self._distance_between_centers(state.get("last_center"), current_center)

        if distance <= self.loitering_config["distance_threshold"]:
            state["last_seen"] = timestamp
            state["last_center"] = current_center
        else:
            state["first_seen"] = timestamp
            state["last_seen"] = timestamp
            state["last_center"] = current_center
            state["last_emission"] = None
            return []

        dwell_time = (state["last_seen"] - state["first_seen"]).total_seconds()
        last_emission = state.get("last_emission")
        cooled_down = (
            last_emission is None
            or (timestamp - last_emission).total_seconds() >= self.loitering_config["cooldown_seconds"]
        )

        if dwell_time >= self.loitering_config["dwell_seconds"] and cooled_down:
            synthetic_detections.append(
                {
                    "label": "loitering",
                    "timestamp": timestamp.isoformat(timespec="seconds"),
                    "location": location,
                    "camera_id": camera_id,
                    "confidence": 1.0,
                    "in_restricted_area": False,
                    "debug_reason": f"loitering:{int(dwell_time)}s_same_area",
                }
            )
            state["last_emission"] = timestamp

        self.loitering_state[key] = state
        return synthetic_detections

    def process_cctv_frame(
        self,
        frame: Any,
        camera_id: str,
        override_location: str | None = None,
        conf_threshold: float | None = None,
        timestamp_override: str | None = None,
        include_debug: bool = False,
    ) -> dict:
        if frame is None:
            return {"results": [], "debug": {"error": "frame_is_none"}}

        if not camera_id:
            return {
                "results": [
                    self._pipeline_error(
                        "camera_not_registered",
                        "camera_id is required",
                    )
                ],
                "debug": {"error": "camera_id_is_required"},
            }

        extractor = self.extractors.get(camera_id)
        if extractor is None:
            return {
                "results": [
                    self._pipeline_error(
                        "camera_not_registered",
                        f"No extractor registered for camera_id={camera_id}",
                    )
                ],
                "debug": {"error": f"camera_not_registered:{camera_id}"},
            }

        try:
            inference = extractor.infer_frame(
                frame,
                conf_threshold=conf_threshold,
                timestamp_override=timestamp_override,
            )
        except (AttributeError, TypeError, ValueError, RuntimeError) as e:
            return {
                "results": [self._pipeline_error("cctv_frame_processing_failed", str(e))],
                "debug": {"error": f"cctv_frame_processing_failed:{e}"},
            }

        raw_detections = list(inference.get("detections", []))

        multiple_persons_detections = self._build_multiple_persons_detections(
            detections=raw_detections,
            camera_id=camera_id,
            location=override_location or getattr(extractor, "location", "unknown"),
            timestamp_override=timestamp_override,
        )

        detections = self._suppress_repeated_zone_entries(
            detections=raw_detections,
            camera_id=camera_id,
            location=override_location or getattr(extractor, "location", "unknown"),
            timestamp_override=timestamp_override,
        )

        detections.extend(multiple_persons_detections)
            
        debug_payload = dict(inference.get("debug", {}))
        

        loitering_detections = self._build_loitering_detections(
            detections=detections,
            camera_id=camera_id,
            location=override_location or getattr(extractor, "location", "unknown"),
            timestamp_override=timestamp_override,
        )

        detections.extend(loitering_detections)

        all_results: list[dict] = []

        for detection in detections:
            if not isinstance(detection, dict):
                continue

            normalized_detection = dict(detection)
            normalized_detection["camera_id"] = camera_id

            if override_location:
                normalized_detection["location"] = override_location

            results = self.process_cctv_input(normalized_detection)
            all_results.extend(results)

        if include_debug:
            return {
                "results": all_results,
                "debug": {
                    **debug_payload,
                    "direct_detection_count": len(inference.get("detections", [])),
                    "loitering_detection_count": len(loitering_detections),
                },
            }

        return {"results": all_results, "debug": {}}

    def process_cctv_input(self, raw_detection: dict) -> list[dict]:
        if not isinstance(raw_detection, dict):
            return [
                self._pipeline_error(
                    "cctv_input_processing_failed",
                    "raw_detection must be a dict",
                )
            ]

        try:
            events = process_cctv_detection(raw_detection)
        except (AttributeError, TypeError, ValueError) as e:
            return [self._pipeline_error("cctv_input_processing_failed", str(e))]

        return self.process_events(events, source_type="cctv_detection")

    def process_access_input(self, raw_log: dict) -> list[dict]:
        if not isinstance(raw_log, dict):
            return [
                self._pipeline_error(
                    "access_input_processing_failed",
                    "raw_log must be a dict",
                )
            ]

        try:
            events = process_access_log(raw_log)
        except (AttributeError, TypeError, ValueError) as e:
            return [self._pipeline_error("access_input_processing_failed", str(e))]

        return self.process_events(events, source_type="access_log")

    def process_events(self, events: list[Any], source_type: str = "unknown") -> list[dict]:
        if not events:
            return []

        try:
            for event in events:
                self.processor.add_event(event)
        except (AttributeError, TypeError, ValueError) as e:
            return [self._pipeline_error("event_buffering_failed", str(e))]

        try:
            buffered_events = self.processor.get_events()
            incidents = self.engine.detect_incidents(buffered_events)
        except Exception as e:
            return [self._pipeline_error("incident_detection_failed", str(e))]

        results: list[dict] = []

        for incident in incidents:
            try:
                incident_dict = incident.to_dict()
            except (AttributeError, TypeError, ValueError) as e:
                results.append(
                    self._pipeline_error(
                        "incident_serialization_failed",
                        str(e),
                    )
                )
                continue

            normalized_incident = self._normalize_incident_data(incident_dict)
            advisory = self._normalize_advisory(
                self._build_advisory(normalized_incident),
                normalized_incident,
            )

            results.append(
                {
                    "is_system_error": False,
                    "status": "ok",
                    "source_type": source_type,
                    "incident_data": normalized_incident,
                    "advisory": advisory,
                }
            )

        return results

    def _build_advisory(self, incident_dict: dict) -> dict:
        if not self.enable_advisory or get_advisory is None:
            return self._fallback_advisory(
                incident_dict,
                "Recommendation engine disabled or unavailable.",
            )

        try:
            advisory = get_advisory(incident_dict)
        except Exception as e:
            return self._fallback_advisory(
                incident_dict,
                f"Recommendation engine failed: {str(e)}",
            )

        if not isinstance(advisory, dict):
            return self._fallback_advisory(
                incident_dict,
                "Recommendation engine returned invalid response.",
            )

        return advisory

    def _normalize_incident_data(self, incident_dict: dict) -> dict:
        if not isinstance(incident_dict, dict):
            return {
                "name": "unknown_incident",
                "location": "unknown",
                "timestamp": "",
                "triggering_events": [],
                "risk_score": 0,
                "description": "",
                "status": "NEW",
            }

        return {
            "name": incident_dict.get("name", "unknown_incident"),
            "location": incident_dict.get("location", "unknown"),
            "timestamp": incident_dict.get("timestamp", ""),
            "triggering_events": incident_dict.get("triggering_events", []),
            "risk_score": incident_dict.get("risk_score", 0),
            "description": incident_dict.get("description", ""),
            "status": incident_dict.get("status", "NEW"),
        }

    def _normalize_advisory(self, advisory: dict, incident_dict: dict) -> dict:
        if not isinstance(advisory, dict):
            return self._fallback_advisory(
                incident_dict,
                "Advisory output was invalid.",
            )

        return {
            "title": advisory.get("title", "Incident Advisory"),
            "flag": advisory.get("flag", "Green"),
            "location": advisory.get("location", incident_dict.get("location", "unknown")),
            "dispatch_unit": advisory.get("dispatch_unit", "Manual Review"),
            "expected_response_time": advisory.get(
                "expected_response_time",
                "Routine check (< 1 hour)",
            ),
            "description": advisory.get(
                "description",
                incident_dict.get("description", ""),
            ),
            "explanation": advisory.get(
                "explanation",
                "No detailed explanation provided.",
            ),
            "actions": advisory.get("actions", ["Review incident manually"]),
        }

    def _fallback_advisory(self, incident_dict: dict, reason: str) -> dict:
        return {
            "title": "Analysis Unavailable",
            "flag": "Green",
            "location": incident_dict.get("location", "unknown"),
            "dispatch_unit": "Manual Review",
            "expected_response_time": "Routine check (< 1 hour)",
            "description": reason,
            "explanation": "Fallback response due to unavailable AI analysis.",
            "actions": [
                "Verify source data manually",
                "Review CCTV and logs",
                "Escalate to supervisor if needed",
            ],
        }

    def _pipeline_error(self, error_type: str, message: str) -> dict:
        return {
            "is_system_error": True,
            "status": "error",
            "source_type": "system",
            "incident_data": {
                "name": "pipeline_error",
                "location": "system",
                "timestamp": "",
                "triggering_events": [],
                "risk_score": 0,
                "description": error_type,
                "status": "ERROR",
            },
            "advisory": {
                "title": "Pipeline Error",
                "flag": "Green",
                "location": "system",
                "dispatch_unit": "Developer Review",
                "expected_response_time": "As needed",
                "description": message,
                "explanation": f"System error occurred during {error_type}.",
                "actions": [
                    "Check logs",
                    "Inspect input payload",
                    "Review stack trace",
                ],
            },
        }

    def get_buffered_events(self) -> list[dict]:
        try:
            return [event.to_dict() for event in self.processor.get_events()]
        except (AttributeError, TypeError, ValueError):
            return []

    def _parse_timestamp(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except (TypeError, ValueError):
            return None
