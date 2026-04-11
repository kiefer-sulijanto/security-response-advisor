from datetime import datetime

from core.events import EventType, create_event


def process_access_log(log_record: dict) -> list:
    if not isinstance(log_record, dict):
        return []

    try:
        timestamp = _parse_timestamp(log_record.get("timestamp"))
        action = str(log_record.get("action", "")).strip().upper()
        location = log_record.get("location") or "unknown"
    except (AttributeError, TypeError, ValueError):
        return []

    metadata = {
        "user_id": log_record.get("user_id"),
        "door_id": log_record.get("door_id")
    }

    try:
        if action == "ACCESS_DENIED":
            return [
                create_event(
                    event_type=EventType.ACCESS_DENIED,
                    location=location,
                    source="access_log",
                    timestamp=timestamp,
                    metadata=metadata
                )
            ]

        if action == "ACCESS_GRANTED":
            return [
                create_event(
                    event_type=EventType.ACCESS_GRANTED,
                    location=location,
                    source="access_log",
                    timestamp=timestamp,
                    metadata=metadata
                )
            ]
    except (TypeError, ValueError):
        return []

    return []


def _parse_timestamp(value):
    if isinstance(value, datetime):
        return value

    if not value:
        return datetime.now()

    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return datetime.now()