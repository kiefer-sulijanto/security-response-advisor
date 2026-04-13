from adapters.cctv_adapter import process_cctv_detection
from core.events import EventType


def test_person_during_allowed_hours_does_not_emit_after_hours():
    detection = {
        "label": "person",
        "timestamp": "2026-04-12T10:30:00",
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.95,
        "bbox": [100, 100, 200, 250],
        "center": [150, 175],
        "in_restricted_area": False,
    }

    events = process_cctv_detection(detection)
    event_types = {event.event_type for event in events}

    assert EventType.PERSON_DETECTED in event_types
    assert EventType.AFTER_HOURS_PRESENCE not in event_types


def test_person_after_hours_emits_after_hours_presence():
    detection = {
        "label": "person",
        "timestamp": "2026-04-12T21:15:00",
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.95,
        "bbox": [100, 100, 200, 250],
        "center": [150, 175],
        "in_restricted_area": False,
    }

    events = process_cctv_detection(detection)
    event_types = {event.event_type for event in events}

    assert EventType.PERSON_DETECTED in event_types
    assert EventType.AFTER_HOURS_PRESENCE in event_types


def test_unknown_location_does_not_emit_after_hours_presence():
    detection = {
        "label": "person",
        "timestamp": "2026-04-12T23:00:00",
        "location": "unknown_area",
        "camera_id": "cam_01",
        "confidence": 0.95,
        "bbox": [100, 100, 200, 250],
        "center": [150, 175],
        "in_restricted_area": False,
    }

    events = process_cctv_detection(detection)
    event_types = {event.event_type for event in events}

    assert EventType.PERSON_DETECTED in event_types
    assert EventType.AFTER_HOURS_PRESENCE not in event_types

