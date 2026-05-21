"""
Integration tests covering the snapshot data path from detection to persistence.

Layer 1 — Adapter: fight detection snapshot fields survive the conversion from
           raw detection dict to Event metadata.

Layer 2 — Persistence: _persist_pipeline_results prefers event-level
           snapshot_base64 over the request-level fallback.

Layer 3 — Pipeline: a FakeExtractor that emits a fighting_or_aggressive
           detection with snapshot fields produces an incident whose
           triggering-event metadata carries those fields end-to-end.

No YOLO model, real fight AI service, or OpenAI API call is required.
"""
from __future__ import annotations

import json

import pytest

from adapters.cctv_adapter import process_cctv_detection
from core.events import EventType
from services.pipeline import PipelineService


# ---------------------------------------------------------------------------
# Shared helpers / fake extractor
# ---------------------------------------------------------------------------

_FIGHT_TS = "2026-04-15T20:00:00"


def _fight_detection(**extra) -> dict:
    """Minimal fighting_or_aggressive detection dict."""
    base = {
        "label": "fighting_or_aggressive",
        "camera_id": "cam_01",
        "location": "lobby",
        "timestamp": _FIGHT_TS,
        "confidence": 0.95,
        "bbox": None,
        "center": None,
        "in_restricted_area": False,
        "person_count": 2,
    }
    base.update(extra)
    return base


class _SnapshotFakeExtractor:
    """Extractor that always returns one fighting detection with snapshot data."""

    def __init__(
        self,
        snapshot_base64: str = "fight_clip_snapshot",
        snapshot_frame_index: int = 5,
        snapshot_strategy: str = "middle_of_positive_clip",
    ):
        self.location = "lobby"
        self._snap_b64 = snapshot_base64
        self._snap_idx = snapshot_frame_index
        self._snap_strat = snapshot_strategy

    def infer_frame(self, frame, conf_threshold=None, timestamp_override=None):
        ts = timestamp_override or _FIGHT_TS
        return {
            "detections": [_fight_detection(
                timestamp=ts,
                snapshot_base64=self._snap_b64,
                snapshot_frame_index=self._snap_idx,
                snapshot_strategy=self._snap_strat,
            )],
            "debug": {"camera_id": "cam_snap_01", "location": "lobby"},
        }


class _NoSnapshotFakeExtractor:
    """Extractor returning a fighting detection WITHOUT any snapshot fields."""

    def __init__(self):
        self.location = "lobby"

    def infer_frame(self, frame, conf_threshold=None, timestamp_override=None):
        ts = timestamp_override or _FIGHT_TS
        return {
            "detections": [_fight_detection(timestamp=ts)],
            "debug": {"camera_id": "cam_nosnap_01", "location": "lobby"},
        }


@pytest.fixture
def fight_pipeline(tmp_path):
    rules = {
        "physical_altercation": {
            "events": ["fight_detected"],
            "time_window": 10,
            "description": "Possible physical fight detected",
        }
    }
    path = tmp_path / "rules.json"
    path.write_text(json.dumps(rules), encoding="utf-8")
    pipeline = PipelineService(
        window_seconds=120,
        rules_file=str(path),
        enable_advisory=False,
    )
    pipeline.extractors["cam_snap_01"] = _SnapshotFakeExtractor()
    pipeline.extractors["cam_nosnap_01"] = _NoSnapshotFakeExtractor()
    return pipeline


# ---------------------------------------------------------------------------
# Layer 1 — Adapter tests
# ---------------------------------------------------------------------------

def test_adapter_preserves_all_snapshot_fields_in_event_metadata():
    detection = _fight_detection(
        snapshot_base64="abc123",
        snapshot_frame_index=2,
        snapshot_strategy="test_strategy",
    )

    events = process_cctv_detection(detection)

    assert len(events) == 1
    assert events[0].event_type == EventType.FIGHT_DETECTED
    meta = events[0].metadata
    assert meta["snapshot_base64"] == "abc123"
    assert meta["snapshot_frame_index"] == 2
    assert meta["snapshot_strategy"] == "test_strategy"


def test_adapter_snapshot_fields_are_none_when_absent_from_detection():
    detection = _fight_detection()   # no snapshot fields

    events = process_cctv_detection(detection)

    assert len(events) == 1
    meta = events[0].metadata
    assert meta["snapshot_base64"] is None
    assert meta["snapshot_frame_index"] is None
    assert meta["snapshot_strategy"] is None


# ---------------------------------------------------------------------------
# Layer 2 — Persistence tests
# ---------------------------------------------------------------------------

def _make_pipeline_result(
    event_snapshot: str | None,
    incident_type: str = "physical_altercation",
    location: str = "lobby",
) -> dict:
    """Create a minimal pipeline result dict for use with _persist_pipeline_results."""
    return {
        "is_system_error": False,
        "incident_data": {
            "name": incident_type,
            "location": location,
            "timestamp": _FIGHT_TS,
            "description": "Test incident",
            "triggering_events": [
                {
                    "event_type": "fight_detected",
                    "metadata": {
                        "camera_id": "cam_01",
                        "snapshot_base64": event_snapshot,
                    },
                }
            ],
        },
        "advisory": {
            "flag": "Red",
            "description": "Test advisory",
            "explanation": "Test explanation",
            "actions": ["Investigate immediately"],
        },
    }


def test_persist_prefers_event_level_snapshot_over_request_snapshot():
    from app import state
    from app.helpers import _persist_pipeline_results

    results = [_make_pipeline_result(event_snapshot="selected_from_fight_clip")]

    count = _persist_pipeline_results(
        results, "Test Pipeline", snapshot_base64="request_level_snapshot"
    )

    assert count["created_count"] == 1
    assert state.incidents_db[0]["snapshot_base64"] == "selected_from_fight_clip"


def test_persist_falls_back_to_request_snapshot_when_event_has_none():
    from app import state
    from app.helpers import _persist_pipeline_results

    results = [_make_pipeline_result(event_snapshot=None)]

    count = _persist_pipeline_results(
        results, "Test Pipeline", snapshot_base64="request_level_snapshot"
    )

    assert count["created_count"] == 1
    assert state.incidents_db[0]["snapshot_base64"] == "request_level_snapshot"


def test_persist_falls_back_to_cached_snapshot_when_both_are_absent():
    from app import state
    from app.helpers import _persist_pipeline_results, _cache_latest_cctv_snapshot

    # Pre-populate the snapshot cache for the camera+location pair
    _cache_latest_cctv_snapshot("cam_01", "lobby", "cached_camera_snapshot")

    results = [_make_pipeline_result(event_snapshot=None)]

    count = _persist_pipeline_results(
        results, "Test Pipeline", snapshot_base64=None
    )

    assert count["created_count"] == 1
    assert state.incidents_db[0]["snapshot_base64"] == "cached_camera_snapshot"


def test_persist_incident_with_no_snapshot_at_all_stores_none():
    from app import state
    from app.helpers import _persist_pipeline_results

    results = [_make_pipeline_result(event_snapshot=None)]

    count = _persist_pipeline_results(
        results, "Test Pipeline", snapshot_base64=None
    )

    assert count["created_count"] == 1
    # No event snapshot, no request snapshot, no cached snapshot → None
    assert state.incidents_db[0]["snapshot_base64"] is None


# ---------------------------------------------------------------------------
# Layer 3 — Pipeline end-to-end tests
# ---------------------------------------------------------------------------

def test_pipeline_fight_incident_has_snapshot_in_event_metadata(fight_pipeline):
    result = fight_pipeline.process_cctv_frame(
        frame="dummy",
        camera_id="cam_snap_01",
        include_debug=True,
    )

    assert len(result["results"]) == 1
    incident_data = result["results"][0]["incident_data"]

    fight_event = next(
        (e for e in incident_data["triggering_events"]
         if e["event_type"] == "fight_detected"),
        None,
    )
    assert fight_event is not None

    meta = fight_event.get("metadata", {})
    assert meta.get("snapshot_base64") == "fight_clip_snapshot"
    assert meta.get("snapshot_frame_index") == 5
    assert meta.get("snapshot_strategy") == "middle_of_positive_clip"


def test_pipeline_fight_snapshot_persisted_from_event_metadata_not_request(fight_pipeline):
    """The fight-clip snapshot should win over the request-level snapshot."""
    from app import state
    from app.helpers import _persist_pipeline_results

    result = fight_pipeline.process_cctv_frame(
        frame="dummy",
        camera_id="cam_snap_01",
        include_debug=True,
    )

    assert len(result["results"]) == 1

    count = _persist_pipeline_results(
        result["results"],
        "Test Pipeline",
        snapshot_base64="request_level_latest_frame",
    )

    assert count["created_count"] == 1
    assert state.incidents_db[0]["snapshot_base64"] == "fight_clip_snapshot"


def test_non_fight_detection_produces_no_snapshot_fields_in_metadata():
    """A plain person detection should not carry any snapshot fields."""
    detection = {
        "label": "person",
        "camera_id": "cam_01",
        "location": "lobby",
        "timestamp": _FIGHT_TS,
        "confidence": 0.92,
        "bbox": [10.0, 10.0, 80.0, 200.0],
        "center": [45.0, 105.0],
        "in_restricted_area": False,
    }

    events = process_cctv_detection(detection)

    assert len(events) >= 1
    assert events[0].event_type == EventType.PERSON_DETECTED

    meta = events[0].metadata
    # Non-fight detections should carry None (not missing) for snapshot fields
    # since the adapter always extracts them with .get()
    assert meta.get("snapshot_base64") is None
    assert meta.get("snapshot_frame_index") is None
    assert meta.get("snapshot_strategy") is None
