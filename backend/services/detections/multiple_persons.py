from __future__ import annotations

from datetime import datetime

from services.detections.utils import parse_timestamp


class MultiplePersonsDetector:
    def __init__(
        self,
        required_consecutive_frames: int = 2,
        cooldown_seconds: int = 10,
    ):
        self.config = {
            "required_consecutive_frames": required_consecutive_frames,
            "cooldown_seconds": cooldown_seconds,
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
        key = (camera_id, location)

        state = self.state.get(key, {"consecutive_hits": 0, "last_emission": None})

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
            or (timestamp - last_emission).total_seconds() >= self.config["cooldown_seconds"]
        )

        synthetic_detections: list[dict] = []

        if (
            person_count >= 2
            and state["consecutive_hits"] >= self.config["required_consecutive_frames"]
            and cooled_down
        ):
            base_detection = person_detections[0]
            synthetic_detections.append({
                "label": "multiple_persons",
                "timestamp": timestamp.isoformat(timespec="seconds"),
                "location": location,
                "camera_id": camera_id,
                "confidence": 1.0,
                "in_restricted_area": False,
                "person_count": person_count,
                "debug_reason": f"multiple_persons:{state['consecutive_hits']}_consecutive_frames",
            })
            state["last_emission"] = timestamp
            state["consecutive_hits"] = 0

        self.state[key] = state
        return synthetic_detections

    def clear(self) -> None:
        self.state.clear()
