from __future__ import annotations

from datetime import datetime

from services.detections.utils import distance_between_centers, parse_timestamp


class LoiteringDetector:
    def __init__(
        self,
        distance_threshold: float = 80.0,
        dwell_seconds: int = 60,
        cooldown_seconds: int = 30,
        exit_grace_seconds: int = 5,
    ):
        self.config = {
            "distance_threshold": distance_threshold,
            "dwell_seconds": dwell_seconds,
            "cooldown_seconds": cooldown_seconds,
            "exit_grace_seconds": exit_grace_seconds,
        }
        self.state: dict[tuple[str, str], dict] = {}

    def build_detections(
        self,
        detections: list[dict],
        camera_id: str,
        location: str,
        timestamp_override: str | None = None,
    ) -> list[dict]:
        timestamp = parse_timestamp(timestamp_override) or datetime.now()
        synthetic_detections: list[dict] = []

        person_detections = [
            d for d in detections
            if isinstance(d, dict) and str(d.get("label", "")).strip().lower() == "person"
        ]

        key = (camera_id, location)
        state = self.state.get(key)

        if not person_detections:
            if state is not None:
                last_seen = state.get("last_seen")
                if last_seen is not None:
                    elapsed = (timestamp - last_seen).total_seconds()
                    if elapsed >= self.config["exit_grace_seconds"]:
                        self.state.pop(key, None)
            return []

        current_center = person_detections[0].get("center")

        if state is None:
            self.state[key] = {
                "first_seen": timestamp,
                "last_seen": timestamp,
                "last_center": current_center,
                "last_emission": None,
            }
            return []

        dist = distance_between_centers(state.get("last_center"), current_center)

        if dist <= self.config["distance_threshold"]:
            state["last_seen"] = timestamp
            state["last_center"] = current_center
        else:
            state["first_seen"] = timestamp
            state["last_seen"] = timestamp
            state["last_center"] = current_center
            state["last_emission"] = None
            self.state[key] = state
            return []

        dwell_time = (state["last_seen"] - state["first_seen"]).total_seconds()
        last_emission = state.get("last_emission")
        cooled_down = (
            last_emission is None
            or (timestamp - last_emission).total_seconds() >= self.config["cooldown_seconds"]
        )

        if dwell_time >= self.config["dwell_seconds"] and cooled_down:
            synthetic_detections.append({
                "label": "loitering",
                "timestamp": timestamp.isoformat(timespec="seconds"),
                "location": location,
                "camera_id": camera_id,
                "confidence": 1.0,
                "in_restricted_area": False,
                "debug_reason": f"loitering:{int(dwell_time)}s_same_area",
            })
            state["last_emission"] = timestamp

        self.state[key] = state
        return synthetic_detections

    def clear(self) -> None:
        self.state.clear()
