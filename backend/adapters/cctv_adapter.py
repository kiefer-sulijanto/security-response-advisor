from datetime import datetime

from core.events import EventType, create_event

LABEL_TO_EVENTS = {
    "person": [EventType.PERSON_DETECTED],
    "intrusion_or_unauthorized": [EventType.INTRUSION_DETECTED],
    "fighting_or_aggressive": [EventType.FIGHT_DETECTED],
    "multiple_persons": [EventType.MULTIPLE_PERSONS_DETECTED],
    "loitering": [EventType.LOITERING_DETECTED],
}

LOCATION_ALLOWED_HOURS = {
    "server_room": {"start": 8, "end": 18},
    "lobby": {"start": 6, "end": 22},
    "warehouse": {"start": 7, "end": 20},
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
        bbox = detection.get("bbox")
        center = detection.get("center")
        person_count = detection.get("person_count")

        if isinstance(raw_restricted, str):
            in_restricted_area = raw_restricted.strip().lower() in {"true", "1", "yes"}
        else:
            in_restricted_area = bool(raw_restricted)
    except (AttributeError, TypeError, ValueError):
        return []

    metadata = {
        "camera_id": camera_id,
        "raw_label": label,
        "bbox": bbox,
        "center": center,
        "person_count": person_count,
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
                    metadata=metadata,
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
                    metadata=metadata,
                )
            )

        if label == "person" and _is_after_hours(location, timestamp):
            events.append(
                create_event(
                    event_type=EventType.AFTER_HOURS_PRESENCE,
                    location=location,
                    source="cctv",
                    confidence=confidence,
                    timestamp=timestamp,
                    metadata=metadata,
                )
            )

    except (TypeError, ValueError):
        return []

    return events


def _is_after_hours(location: str, timestamp: datetime) -> bool:
    hours = LOCATION_ALLOWED_HOURS.get(location)
    if not hours:
        return False

    start = int(hours["start"])
    end = int(hours["end"])
    hour = timestamp.hour

    return hour < start or hour >= end


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