"""
Unit tests for FightDetectionService snapshot frame selection.

These tests exercise:
  - snapshot_frame_index returned by the remote classifier is honoured
  - fallback to the middle frame when no index is provided
  - clamping of out-of-range indices
  - graceful handling of non-integer indices
  - no snapshot emitted when is_fighting is False
  - person-missing grace-frame logic (buffer clearing behaviour)
  - encode_snapshot_frame helper (happy path and encoding failure)

No YOLO model, no real fight-AI service, and no network access are required.
"""
from __future__ import annotations

import numpy as np
import pytest

from services.fight_detection_service import FightDetectionService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeRemoteClassifier:
    """Minimal stand-in for RemoteFightClassifier."""

    def __init__(self, response: dict):
        self._response = response

    def predict_clip(self, camera_id: str, frames: list) -> dict:
        return self._response


def _make_frames(n: int = 4) -> list[np.ndarray]:
    """Return n distinct solid-colour BGR frames (value stays within uint8)."""
    return [np.full((32, 32, 3), (i * 40) % 256, dtype=np.uint8) for i in range(n)]


def _build_remote_service(
    monkeypatch,
    response: dict,
    clip: int = 4,
    interval: str = "0",
    grace: str = "3",
) -> FightDetectionService:
    """Construct a FightDetectionService in remote mode with a fake classifier."""
    monkeypatch.setenv("FIGHT_DETECTION_MODE", "remote")
    monkeypatch.setenv("FIGHT_CLIP_FRAME_COUNT", str(clip))
    monkeypatch.setenv("FIGHT_REMOTE_DECISION_INTERVAL_SECONDS", interval)
    monkeypatch.setenv("FIGHT_PERSON_MISSING_GRACE_FRAMES", grace)
    svc = FightDetectionService()
    svc.remote_classifier = _FakeRemoteClassifier(response)
    return svc


def _fill_and_get_last(svc: FightDetectionService, frames: list) -> dict:
    """Push all frames through process_frame and return the last result."""
    result: dict = {}
    for frame in frames:
        result = svc.process_frame(frame=frame, camera_id="cam_test", person_count=2)
    return result


# ---------------------------------------------------------------------------
# Test 1 — snapshot_frame_index from remote response is honoured
# ---------------------------------------------------------------------------

def test_snapshot_uses_remote_index(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": True,
        "class_name": "fighting",
        "confidence": 0.95,
        "source": "fake_remote",
        "raw": {
            "snapshot_frame_index": 2,
            "snapshot_strategy": "test_selected_frame",
        },
        "timing": {},
    })

    result = _fill_and_get_last(svc, _make_frames(4))

    assert result["is_fighting"] is True
    assert isinstance(result["snapshot_base64"], str)
    assert len(result["snapshot_base64"]) > 10
    assert result["snapshot_frame_index"] == 2
    assert result["snapshot_strategy"] == "test_selected_frame"
    assert result["frames_sent"] == 4


# ---------------------------------------------------------------------------
# Test 2 — fallback to middle frame when no index is provided
# ---------------------------------------------------------------------------

def test_snapshot_falls_back_to_middle_frame(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": True,
        "class_name": "fighting",
        "confidence": 0.90,
        "source": "fake_remote",
        "raw": {},          # no snapshot_frame_index
        "timing": {},
    })

    result = _fill_and_get_last(svc, _make_frames(4))

    assert result["is_fighting"] is True
    assert result["snapshot_frame_index"] == 2       # 4 // 2
    assert result["snapshot_strategy"] == "middle_of_positive_clip"
    assert isinstance(result["snapshot_base64"], str)
    assert len(result["snapshot_base64"]) > 0


# ---------------------------------------------------------------------------
# Test 3 — index larger than buffer is clamped to last frame
# ---------------------------------------------------------------------------

def test_snapshot_clamps_high_index(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": True,
        "confidence": 0.91,
        "source": "fake_remote",
        "raw": {"snapshot_frame_index": 999},
        "timing": {},
    })

    result = _fill_and_get_last(svc, _make_frames(4))

    assert result["is_fighting"] is True
    assert result["snapshot_frame_index"] == 3       # clamped to len-1
    assert isinstance(result["snapshot_base64"], str)


# ---------------------------------------------------------------------------
# Test 4 — negative index is clamped to 0
# ---------------------------------------------------------------------------

def test_snapshot_clamps_negative_index(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": True,
        "confidence": 0.91,
        "source": "fake_remote",
        "raw": {"snapshot_frame_index": -10},
        "timing": {},
    })

    result = _fill_and_get_last(svc, _make_frames(4))

    assert result["is_fighting"] is True
    assert result["snapshot_frame_index"] == 0
    assert isinstance(result["snapshot_base64"], str)


# ---------------------------------------------------------------------------
# Test 5 — non-integer index triggers fallback
# ---------------------------------------------------------------------------

def test_snapshot_handles_non_integer_index(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": True,
        "confidence": 0.91,
        "source": "fake_remote",
        "raw": {"snapshot_frame_index": "bad"},
        "timing": {},
    })

    result = _fill_and_get_last(svc, _make_frames(4))

    # int("bad") → ValueError → except branch: fall back to middle
    assert result["is_fighting"] is True
    assert result["snapshot_frame_index"] == 2          # 4 // 2
    assert result["snapshot_strategy"] == "middle_of_positive_clip_fallback"
    assert isinstance(result["snapshot_base64"], str)
    # index must be within valid range
    assert 0 <= result["snapshot_frame_index"] <= 3


# ---------------------------------------------------------------------------
# Test 6 — no snapshot emitted when not fighting
# ---------------------------------------------------------------------------

def test_no_snapshot_when_not_fighting(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": False,
        "class_name": "normal",
        "confidence": 0.98,
        "source": "fake_remote",
        "raw": {},
        "timing": {},
    })

    result = _fill_and_get_last(svc, _make_frames(4))

    assert result["is_fighting"] is False
    assert result.get("snapshot_base64") is None


# ---------------------------------------------------------------------------
# Test 7 — a single person-missing frame within the grace window does NOT
#           clear the frame buffer
# ---------------------------------------------------------------------------

def test_single_person_miss_within_grace_does_not_clear_buffer(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": False,
        "confidence": 0.1,
        "source": "fake",
        "raw": {},
        "timing": {},
    }, clip=4, grace="3")

    frames = _make_frames(4)

    # Feed two normal frames (person_count=2 → buffer grows)
    svc.process_frame(frames[0], "cam_test", person_count=2)
    svc.process_frame(frames[1], "cam_test", person_count=2)
    size_before_miss = len(svc.frame_buffer)

    # One miss frame — grace is 3, so buffer must survive
    svc.process_frame(frames[2], "cam_test", person_count=1)

    assert len(svc.frame_buffer) == size_before_miss, (
        "Buffer was cleared after a single missing-person frame, "
        "but grace frames allow temporary gaps."
    )


# ---------------------------------------------------------------------------
# Test 8 — consecutive missing frames exceeding the grace limit clears buffer
# ---------------------------------------------------------------------------

def test_exceeding_grace_frames_clears_buffer(monkeypatch):
    svc = _build_remote_service(monkeypatch, response={
        "is_fighting": False,
        "confidence": 0.1,
        "source": "fake",
        "raw": {},
        "timing": {},
    }, clip=4, grace="2")

    frames = _make_frames(6)

    # Two normal frames (buffer fills partially)
    svc.process_frame(frames[0], "cam_test", person_count=2)
    svc.process_frame(frames[1], "cam_test", person_count=2)

    # Two consecutive miss frames — should hit the grace limit and reset
    svc.process_frame(frames[2], "cam_test", person_count=1)
    result = svc.process_frame(frames[3], "cam_test", person_count=1)

    assert result["source"] == "not_enough_people_reset"
    assert len(svc.frame_buffer) == 0


# ---------------------------------------------------------------------------
# Test 9 — encode_snapshot_frame produces a valid, decodable base64 JPEG
# ---------------------------------------------------------------------------

def test_encode_snapshot_frame_returns_valid_base64():
    import base64 as _b64
    frame = np.zeros((64, 64, 3), dtype=np.uint8)

    result = FightDetectionService.encode_snapshot_frame(frame)

    assert result is not None
    assert isinstance(result, str)
    decoded = _b64.b64decode(result)
    assert len(decoded) > 0             # non-empty JPEG bytes


# ---------------------------------------------------------------------------
# Test 10 — encode_snapshot_frame returns None when cv2.imencode fails
# ---------------------------------------------------------------------------

def test_encode_snapshot_frame_returns_none_on_encoding_failure(monkeypatch):
    import cv2
    # Force imencode to signal failure
    monkeypatch.setattr(cv2, "imencode", lambda *a, **kw: (False, None))

    frame = np.zeros((32, 32, 3), dtype=np.uint8)
    result = FightDetectionService.encode_snapshot_frame(frame)

    assert result is None
