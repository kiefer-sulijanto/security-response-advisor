from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class Event:
    event_type: str
    location: str
    source: str
    timestamp: datetime
    confidence: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "event_type": self.event_type,
            "location": self.location,
            "source": self.source,
            "timestamp": self.timestamp.isoformat(),
            "confidence": self.confidence,
            "metadata": self.metadata,
        }


class EventType:
    PERSON_DETECTED = "person_detected"
    LOITERING_DETECTED = "loitering_detected"
    ACCESS_DENIED = "access_denied"
    ACCESS_GRANTED = "access_granted"
    PANIC_BUTTON = "panic_button"
    DOOR_FORCED_OPEN = "door_forced_open"
    SMOKE_DETECTED = "smoke_detected"
    RESTRICTED_AREA_ENTRY = "restricted_area_entry"
    INTRUSION_DETECTED = "intrusion_detected"
    FIGHT_DETECTED = "fight_detected"
    AFTER_HOURS_PRESENCE = "after_hours_presence"
    MULTIPLE_PERSONS_DETECTED = "multiple_persons_detected"


def create_event(
    event_type,
    location,
    source,
    confidence=1.0,
    timestamp=None,
    metadata=None
):
    try:
        parsed_confidence = float(confidence)
    except (TypeError, ValueError):
        parsed_confidence = 1.0

    if not isinstance(timestamp, datetime):
        timestamp = datetime.now()

    if not isinstance(metadata, dict):
        metadata = {}

    return Event(
        event_type=str(event_type),
        location=str(location or "unknown"),
        source=str(source or "unknown"),
        timestamp=timestamp,
        confidence=parsed_confidence,
        metadata=metadata
    )