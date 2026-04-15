from __future__ import annotations

import json
from datetime import datetime, timedelta

import pytest

from core.events import Event, EventType
from core.incident_engine import IncidentEngine


@pytest.fixture
def rules_file(tmp_path):
    rules = {
        "physical_altercation": {
            "events": ["fight_detected"],
            "time_window": 10,
            "description": "Possible physical fight or aggressive confrontation detected",
        },
        "intrusion_attempt": {
            "events": ["person_detected", "access_denied"],
            "time_window": 10,
            "description": "Possible unauthorized entry attempt",
        },
    }

    path = tmp_path / "incident_rules.json"
    path.write_text(json.dumps(rules), encoding="utf-8")
    return str(path)


def make_event(
    event_type,
    timestamp,
    location="lobby",
    source="cctv",
    camera_id="cam_01",
    confidence=0.95,
):
    return Event(
        event_type=event_type,
        location=location,
        source=source,
        timestamp=timestamp,
        confidence=confidence,
        metadata={"camera_id": camera_id},
    )


def test_same_fight_incident_is_suppressed_within_cooldown(rules_file):
    engine = IncidentEngine(
        rules_file=rules_file,
        duplicate_cooldown_seconds=10,
        consumed_retention_seconds=120,
    )

    t0 = datetime.fromisoformat("2026-04-15T20:00:00")

    first_batch = [
        make_event(EventType.FIGHT_DETECTED, t0, location="lobby", camera_id="cam_01")
    ]
    second_batch = [
        make_event(
            EventType.FIGHT_DETECTED,
            t0 + timedelta(seconds=3),
            location="lobby",
            camera_id="cam_01",
        )
    ]

    first_incidents = engine.process_events(first_batch)
    second_incidents = engine.process_events(second_batch)

    assert len(first_incidents) == 1
    assert first_incidents[0].name == "physical_altercation"

    assert second_incidents == []


def test_same_fight_incident_can_trigger_again_after_cooldown(rules_file):
    engine = IncidentEngine(
        rules_file=rules_file,
        duplicate_cooldown_seconds=10,
        consumed_retention_seconds=120,
    )

    t0 = datetime.fromisoformat("2026-04-15T20:00:00")

    first_batch = [
        make_event(EventType.FIGHT_DETECTED, t0, location="lobby", camera_id="cam_01")
    ]
    later_batch = [
        make_event(
            EventType.FIGHT_DETECTED,
            t0 + timedelta(seconds=11),
            location="lobby",
            camera_id="cam_01",
        )
    ]

    first_incidents = engine.process_events(first_batch)
    later_incidents = engine.process_events(later_batch)

    assert len(first_incidents) == 1
    assert len(later_incidents) == 1
    assert later_incidents[0].name == "physical_altercation"


def test_same_incident_different_camera_is_not_suppressed(rules_file):
    engine = IncidentEngine(
        rules_file=rules_file,
        duplicate_cooldown_seconds=10,
        consumed_retention_seconds=120,
    )

    t0 = datetime.fromisoformat("2026-04-15T20:00:00")

    first_batch = [
        make_event(EventType.FIGHT_DETECTED, t0, location="lobby", camera_id="cam_01")
    ]
    second_batch = [
        make_event(
            EventType.FIGHT_DETECTED,
            t0 + timedelta(seconds=3),
            location="lobby",
            camera_id="cam_02",
        )
    ]

    first_incidents = engine.process_events(first_batch)
    second_incidents = engine.process_events(second_batch)

    assert len(first_incidents) == 1
    assert len(second_incidents) == 1
    assert second_incidents[0].name == "physical_altercation"


def test_same_incident_different_location_is_not_suppressed(rules_file):
    engine = IncidentEngine(
        rules_file=rules_file,
        duplicate_cooldown_seconds=10,
        consumed_retention_seconds=120,
    )

    t0 = datetime.fromisoformat("2026-04-15T20:00:00")

    first_batch = [
        make_event(EventType.FIGHT_DETECTED, t0, location="lobby", camera_id="cam_01")
    ]
    second_batch = [
        make_event(
            EventType.FIGHT_DETECTED,
            t0 + timedelta(seconds=3),
            location="server_room",
            camera_id="cam_01",
        )
    ]

    first_incidents = engine.process_events(first_batch)
    second_incidents = engine.process_events(second_batch)

    assert len(first_incidents) == 1
    assert len(second_incidents) == 1
    assert second_incidents[0].name == "physical_altercation"


def test_intrusion_attempt_is_suppressed_within_cooldown_for_same_camera_and_location(rules_file):
    engine = IncidentEngine(
        rules_file=rules_file,
        duplicate_cooldown_seconds=10,
        consumed_retention_seconds=120,
    )

    t0 = datetime.fromisoformat("2026-04-15T20:00:00")

    first_batch = [
        make_event(EventType.PERSON_DETECTED, t0, location="gate_a", camera_id="cam_01"),
        make_event(
            EventType.ACCESS_DENIED,
            t0 + timedelta(seconds=1),
            location="gate_a",
            source="access_log",
            camera_id="cam_01",
        ),
    ]

    second_batch = [
        make_event(
            EventType.PERSON_DETECTED,
            t0 + timedelta(seconds=3),
            location="gate_a",
            camera_id="cam_01",
        ),
        make_event(
            EventType.ACCESS_DENIED,
            t0 + timedelta(seconds=4),
            location="gate_a",
            source="access_log",
            camera_id="cam_01",
        ),
    ]

    first_incidents = engine.process_events(first_batch)
    second_incidents = engine.process_events(second_batch)

    assert len(first_incidents) == 1
    assert first_incidents[0].name == "intrusion_attempt"

    assert second_incidents == []