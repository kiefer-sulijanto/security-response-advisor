from __future__ import annotations

from datetime import datetime

from core.events import EventType, create_event


MANUAL_EVENT_TYPE_MAP = {
    "panic_button": EventType.PANIC_BUTTON,
    "smoke_detected": EventType.SMOKE_DETECTED,
}


def process_manual_event(raw_input: dict):
    if not isinstance(raw_input, dict):
        raise ValueError("raw_input must be a dict")

    event_type_str = raw_input.get("event_type")
    location = raw_input.get("location")
    timestamp = raw_input.get("timestamp")
    source = raw_input.get("source", "manual_trigger")
    metadata = raw_input.get("metadata", {}) or {}

    if not event_type_str:
        raise ValueError("event_type is required")

    if not location:
        raise ValueError("location is required")

    mapped_event_type = MANUAL_EVENT_TYPE_MAP.get(str(event_type_str).strip().lower())
    if mapped_event_type is None:
        raise ValueError(f"Unsupported manual event_type: {event_type_str}")

    parsed_timestamp = None
    if timestamp:
        try:
            parsed_timestamp = datetime.fromisoformat(timestamp)
        except ValueError as e:
            raise ValueError("timestamp must be a valid ISO format string") from e

    event = create_event(
        event_type=mapped_event_type,
        location=location,
        source=source,
        timestamp=parsed_timestamp,
        metadata=metadata,
    )

    return [event]