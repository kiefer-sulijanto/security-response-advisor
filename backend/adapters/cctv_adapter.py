from datetime import datetime

from core.events import EventType, create_event

LABEL_TO_EVENTS = {
    "person": [EventType.PERSON_DETECTED],
    "intrusion_or_unauthorized": [EventType.INTRUSION_DETECTED],
    "fighting_or_aggressive": [EventType.FIGHT_DETECTED],
}


def process_cctv_detection(detection: dict) -> list:
    if not isinstance(detection, dict):
        return []

    try:
        label = str(detection.get("label", "")).strip().lower()
        timestamp = _parse_timestamp(detection.get("timestamp"))
        location = detection.get("location") or "unknown"
        confidence = _safe_float(detection.get("confidence", 1.0), default=1.0)
        camera_id = detection.get("camera_id")
        raw_restricted = detection.get("in_restricted_area", False)

        if isinstance(raw_restricted, str):
            in_restricted_area = raw_restricted.strip().lower() in {"true", "1", "yes"}
        else:
            in_restricted_area = bool(raw_restricted)
    except (AttributeError, TypeError, ValueError):
        return []

    metadata = {
        "camera_id": camera_id,
        "raw_label": label
    }

    events = []

    try:
        for event_type in LABEL_TO_EVENTS.get(label, []):
            events.append(
                create_event(
                    event_type=event_type,
                    location=location,
                    source="cctv",
                    confidence=confidence,
                    timestamp=timestamp,
                    metadata=metadata
                )
            )

        if in_restricted_area:
            events.append(
                create_event(
                    event_type=EventType.RESTRICTED_AREA_ENTRY,
                    location=location,
                    source="cctv",
                    confidence=confidence,
                    timestamp=timestamp,
                    metadata=metadata
                )
            )
    except (TypeError, ValueError):
        return []

    return events


def _parse_timestamp(value):
    if isinstance(value, datetime):
        return value

    if not value:
        return datetime.now()

    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return datetime.now()


def _safe_float(value, default=1.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default