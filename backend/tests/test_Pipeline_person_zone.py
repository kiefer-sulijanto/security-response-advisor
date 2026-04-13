from __future__ import annotations

from datetime import datetime

import pytest

from services.pipeline import PipelineService


# -----------------------------
# Fake extractor for pipeline tests
# -----------------------------
class FakeExtractor:
    def __init__(self, detections):
        self._detections = detections
        self.location = "server_room"

    def infer_frame(self, frame, conf_threshold=None, timestamp_override=None):
        ts = timestamp_override or "2026-04-12T15:00:00"

        normalized = []
        for det in self._detections:
            item = dict(det)
            item.setdefault("timestamp", ts)
            item.setdefault("location", self.location)
            item.setdefault("camera_id", "cam_01")
            item.setdefault("confidence", 0.95)
            normalized.append(item)

        return {
            "detections": normalized,
            "debug": {
                "camera_id": "cam_01",
                "location": self.location,
                "timestamp": ts,
                "results": [],
                "total_detections": len(normalized),
            },
        }


# -----------------------------
# Fixtures
# -----------------------------
@pytest.fixture
def rules_file(tmp_path):
    rules = {
        "unauthorized_access": {
            "events": ["restricted_area_entry"],
            "time_window": 60,
            "description": "Person entered restricted area",
        },
        "intrusion_attempt": {
            "events": ["person_detected", "access_denied"],
            "time_window": 60,
            "description": "Possible unauthorized entry attempt",
        },
        "suspicious_after_hours_presence": {
            "events": ["person_detected", "after_hours_presence"],
            "time_window": 60,
            "description": "Person detected in monitored area during restricted hours",
        },
    }

    path = tmp_path / "incident_rules.json"
    path.write_text(__import__("json").dumps(rules), encoding="utf-8")
    return str(path)


@pytest.fixture
def pipeline(rules_file):
    return PipelineService(
        window_seconds=120,
        rules_file=rules_file,
        enable_advisory=False,
    )


# -----------------------------
# Tests
# -----------------------------
def test_process_cctv_frame_errors_when_camera_missing(pipeline):
    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="unknown_cam",
        include_debug=True,
    )

    assert "results" in result
    assert len(result["results"]) == 1
    assert result["results"][0]["is_system_error"] is True
    assert result["results"][0]["incident_data"]["name"] == "pipeline_error"


def test_pipeline_person_outside_zone_no_incident(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [10, 10, 50, 90],
                "center": [30, 50],
                "in_restricted_area": False,
            }
        ]
    )

    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        include_debug=True,
    )

    assert result["results"] == []
    assert result["debug"]["direct_detection_count"] == 1


def test_pipeline_person_inside_zone_triggers_unauthorized_access(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [150, 150, 250, 250],
                "center": [200, 200],
                "in_restricted_area": True,
            }
        ]
    )

    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        include_debug=True,
    )

    assert len(result["results"]) == 1

    incident = result["results"][0]["incident_data"]
    assert incident["name"] == "unauthorized_access"
    assert incident["location"] == "server_room"

    triggering_event_types = {
        event["event_type"] for event in incident["triggering_events"]
    }
    assert "restricted_area_entry" in triggering_event_types


def test_pipeline_access_plus_person_triggers_intrusion_attempt(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [20, 20, 80, 120],
                "center": [50, 70],
                "in_restricted_area": False,
                "timestamp": "2026-04-12T15:00:00",
            }
        ]
    )

    cctv_result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        include_debug=True,
    )

    assert cctv_result["results"] == []

    access_result = pipeline.process_access_input(
        {
            "timestamp": "2026-04-12T15:00:05",
            "action": "ACCESS_DENIED",
            "location": "server_room",
            "user_id": "U123",
            "door_id": "D01",
        }
    )

    assert len(access_result) == 1

    incident = access_result[0]["incident_data"]
    assert incident["name"] == "intrusion_attempt"

    triggering_event_types = {
        event["event_type"] for event in incident["triggering_events"]
    }
    assert "person_detected" in triggering_event_types
    assert "access_denied" in triggering_event_types

def test_pipeline_person_after_hours_triggers_incident(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [120, 120, 200, 260],
                "center": [160, 190],
                "in_restricted_area": False,
                "timestamp": "2026-04-12T21:30:00",
            }
        ]
    )

    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        include_debug=True,
    )

    assert len(result["results"]) == 1
    incident = result["results"][0]["incident_data"]
    assert incident["name"] == "suspicious_after_hours_presence"