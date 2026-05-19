from __future__ import annotations

import pytest

from adapters.cctv_adapter import process_cctv_detection
from core.events import EventType
from services.detections.unattended_bag import UnattendedBagDetector


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bag_det(center=(150, 150), bbox=None, bag_type="backpack", confidence=0.85):
    return {
        "label": "bag",
        "bag_type": bag_type,
        "center": list(center),
        "bbox": bbox or [100, 100, 200, 200],
        "confidence": confidence,
    }


def _person_det(center=(155, 155)):
    return {
        "label": "person",
        "center": list(center),
        "bbox": [130, 100, 180, 250],
        "confidence": 0.90,
    }


def _ts(second: int) -> str:
    return f"2026-04-12T14:30:{second:02d}"


# ---------------------------------------------------------------------------
# Adapter mapping
# ---------------------------------------------------------------------------

def test_adapter_maps_unattended_bag_to_unattended_bag_detected():
    detection = {
        "label": "unattended_bag",
        "timestamp": "2026-04-12T14:30:00",
        "location": "lobby",
        "camera_id": "cam_01",
        "confidence": 0.85,
        "bbox": [100, 100, 200, 200],
        "center": [150, 150],
        "in_restricted_area": False,
        "bag_type": "backpack",
        "unattended_duration_seconds": 15,
        "nearest_person_distance": None,
    }

    events = process_cctv_detection(detection)

    assert len(events) == 1
    assert events[0].event_type == EventType.UNATTENDED_BAG_DETECTED
    assert events[0].location == "lobby"
    assert events[0].source == "cctv"
    assert events[0].metadata["bag_type"] == "backpack"
    assert events[0].metadata["unattended_duration_seconds"] == 15
    assert events[0].metadata["nearest_person_distance"] is None


# ---------------------------------------------------------------------------
# No detection when owner is nearby
# ---------------------------------------------------------------------------

def test_no_detection_when_person_is_near_bag():
    detector = UnattendedBagDetector(
        dwell_seconds=5,
        owner_distance_threshold_px=180,
        cooldown_seconds=30,
    )
    detections = [_bag_det(center=(150, 150)), _person_det(center=(155, 155))]

    result = None
    for i in range(8):
        result = detector.build_detections(detections, "cam_01", "lobby", _ts(i))

    assert result == []


# ---------------------------------------------------------------------------
# Detection emitted after dwell with no person nearby
# ---------------------------------------------------------------------------

def test_detection_emitted_after_dwell_no_person():
    detector = UnattendedBagDetector(
        dwell_seconds=5,
        owner_distance_threshold_px=180,
        cooldown_seconds=30,
    )
    detections = [_bag_det(center=(150, 150), bag_type="suitcase")]

    first_emission = None
    for i in range(7):
        r = detector.build_detections(detections, "cam_01", "lobby", _ts(i))
        if r and first_emission is None:
            first_emission = r

    assert first_emission is not None
    assert len(first_emission) == 1
    det = first_emission[0]
    assert det["label"] == "unattended_bag"
    assert det["bag_type"] == "suitcase"
    assert det["location"] == "lobby"
    assert det["camera_id"] == "cam_01"
    assert det["unattended_duration_seconds"] >= 5
    assert det["nearest_person_distance"] is None
    assert "unattended_bag:" in det["debug_reason"]


# ---------------------------------------------------------------------------
# No repeated detection during cooldown
# ---------------------------------------------------------------------------

def test_no_repeated_detection_during_cooldown():
    detector = UnattendedBagDetector(
        dwell_seconds=5,
        owner_distance_threshold_px=180,
        cooldown_seconds=30,
    )
    detections = [_bag_det()]

    first_emission = None
    for i in range(7):
        r = detector.build_detections(detections, "cam_01", "lobby", _ts(i))
        if r:
            first_emission = r

    assert first_emission is not None and len(first_emission) == 1

    # Call again 2 seconds later — still inside cooldown
    second = detector.build_detections(detections, "cam_01", "lobby", _ts(9))
    assert second == []


# ---------------------------------------------------------------------------
# State separated per camera_id
# ---------------------------------------------------------------------------

def test_state_separated_per_camera_id():
    detector = UnattendedBagDetector(
        dwell_seconds=5,
        owner_distance_threshold_px=180,
        cooldown_seconds=30,
    )
    bag = _bag_det()

    # cam_01 accumulates 6 seconds of dwell
    for i in range(7):
        detector.build_detections([bag], "cam_01", "lobby", _ts(i))

    # cam_02 sees the bag for the first time at the same last timestamp
    result_cam2 = detector.build_detections([bag], "cam_02", "lobby", _ts(6))

    # cam_02 has no accumulated dwell — should not emit
    assert result_cam2 == []


# ---------------------------------------------------------------------------
# clear() removes all state
# ---------------------------------------------------------------------------

def test_clear_removes_detector_state():
    detector = UnattendedBagDetector(dwell_seconds=5)
    bag = _bag_det()

    for i in range(3):
        detector.build_detections([bag], "cam_01", "lobby", _ts(i))

    assert len(detector.state) > 0

    detector.clear()

    assert detector.state == {}


# ---------------------------------------------------------------------------
# Bag detection not emitted when bag disappears within grace period
# ---------------------------------------------------------------------------

def test_bag_removed_after_exit_grace():
    detector = UnattendedBagDetector(
        dwell_seconds=5,
        exit_grace_seconds=3,
        owner_distance_threshold_px=180,
        cooldown_seconds=30,
    )
    bag = _bag_det()

    # Build state over 6 seconds (dwell met)
    for i in range(7):
        detector.build_detections([bag], "cam_01", "lobby", _ts(i))

    # Bag disappears for 4 seconds (beyond grace period)
    detector.build_detections([], "cam_01", "lobby", _ts(11))

    # Bag reappears — state should have been cleared so dwell restarts
    result = detector.build_detections([bag], "cam_01", "lobby", _ts(12))
    assert result == []


# ---------------------------------------------------------------------------
# Unattended timer starts only after person leaves, not from first_seen
# ---------------------------------------------------------------------------

def test_no_emit_immediately_when_person_just_left():
    """
    Bag present with a nearby person for longer than dwell_seconds.
    When the person leaves, the detector must not emit immediately.
    It must only emit after dwell_seconds have elapsed since the person left.
    """
    detector = UnattendedBagDetector(
        dwell_seconds=5,
        owner_distance_threshold_px=180,
        cooldown_seconds=30,
    )
    bag = _bag_det(center=(150, 150))
    person = _person_det(center=(155, 155))  # distance ~7px, well within 180px

    # Phase 1: bag + person together for 8 seconds (> dwell_seconds)
    for i in range(9):  # t=:00 to t=:08
        result = detector.build_detections([bag, person], "cam_01", "lobby", _ts(i))
        assert result == [], f"Should not emit at t={i} while person is present"

    # Phase 2: person leaves at t=:09 — must NOT emit immediately
    result = detector.build_detections([bag], "cam_01", "lobby", _ts(9))
    assert result == [], "Should not emit immediately after person leaves"

    # t=:10 to t=:13 — only 1–4 seconds since person left, below dwell_seconds
    for i in range(10, 14):
        result = detector.build_detections([bag], "cam_01", "lobby", _ts(i))
        assert result == [], f"Should not emit at t={i}, only {i - 9}s since person left"

    # t=:14 — exactly dwell_seconds (5s) since person left at t=:09
    result = detector.build_detections([bag], "cam_01", "lobby", _ts(14))
    assert len(result) == 1, "Should emit after dwell_seconds since person left"
    assert result[0]["label"] == "unattended_bag"
    assert result[0]["unattended_duration_seconds"] >= 5
