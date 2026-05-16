from __future__ import annotations

from datetime import datetime

from services.detections.utils import distance_between_centers, parse_timestamp


class ZonePresenceDetector:
    def __init__(
        self,
        distance_threshold: float = 80.0,
        exit_grace_seconds: int = 3,
    ):
        self.config = {
            "distance_threshold": distance_threshold,
            "exit_grace_seconds": exit_grace_seconds,
        }
        self.state: dict[tuple[str, str], dict] = {}

    def suppress_repeated_entries(
        self,
        detections: list[dict],
        camera_id: str,
        location: str,
        timestamp_override: str | None = None,
    ) -> list[dict]:
        timestamp = parse_timestamp(timestamp_override) or datetime.now()
        key = (camera_id, location)

        state = self.state.get(key, {"inside_tracks": [], "last_seen_inside": None})

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

            matched_existing = any(
                distance_between_centers(tracked, center) <= self.config["distance_threshold"]
                for tracked in state["inside_tracks"]
            )

            if not matched_existing:
                filtered.append(detection)
            else:
                filtered.append({**detection, "in_restricted_area": False})

        if current_inside_centers:
            state["inside_tracks"] = current_inside_centers
            state["last_seen_inside"] = timestamp
        else:
            last_seen_inside = state.get("last_seen_inside")
            if last_seen_inside is not None:
                elapsed = (timestamp - last_seen_inside).total_seconds()
                if elapsed >= self.config["exit_grace_seconds"]:
                    state["inside_tracks"] = []
                    state["last_seen_inside"] = None

        self.state[key] = state
        return filtered

    def clear(self) -> None:
        self.state.clear()
