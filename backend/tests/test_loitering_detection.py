from __future__ import annotations

import json

import pytest

from adapters.cctv_adapter import process_cctv_detection
from core.events import EventType
from services.pipeline import PipelineService


class FakeExtractor:
    def __init__(self, detections, location="server_room"):
        self._detections = detections
        self.location = location

    def infer_frame(self, frame, conf_threshold=None, timestamp_override=None):
        ts = timestamp_override or "2026-04-12T17:00:00"

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


@pytest.fixture
def rules_file(tmp_path):
    rules = {
        "loitering": {
            "events": ["loitering_detected"],
            "time_window": 60,
            "description": "Person loitering in monitored area",
        }
    }

    path = tmp_path / "incident_rules.json"
    path.write_text(json.dumps(rules), encoding="utf-8")
    return str(path)


@pytest.fixture
def pipeline(rules_file):
    p = PipelineService(
        window_seconds=120,
        rules_file=rules_file,
        enable_advisory=False,
    )
    p.loitering_config["dwell_seconds"] = 10
    p.loitering_config["distance_threshold"] = 80.0
    p.loitering_config["cooldown_seconds"] = 30
    return p


def test_adapter_maps_loitering_label():
    detection = {
        "label": "loitering",
        "timestamp": "2026-04-12T17:00:00",
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 1.0,
        "in_restricted_area": False,
    }

    events = process_cctv_detection(detection)

    assert len(events) == 1
    assert events[0].event_type == EventType.LOITERING_DETECTED


def test_pipeline_loitering_triggers_after_dwell_time(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [100, 100, 180, 260],
                "center": [140, 180],
                "in_restricted_area": False,
            }
        ]
    )

    result_1 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T17:00:00",
        include_debug=True,
    )
    assert result_1["results"] == []

    result_2 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T17:00:05",
        include_debug=True,
    )
    assert result_2["results"] == []

    result_3 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T17:00:12",
        include_debug=True,
    )

    assert len(result_3["results"]) == 1
    incident = result_3["results"][0]["incident_data"]
    assert incident["name"] == "loitering"

    triggering_event_types = {
        event["event_type"] for event in incident["triggering_events"]
    }
    assert "loitering_detected" in triggering_event_types


def test_pipeline_loitering_resets_when_person_moves_far(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [100, 100, 180, 260],
                "center": [140, 180],
                "in_restricted_area": False,
            }
        ]
    )

    pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T17:00:00",
        include_debug=True,
    )

    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [400, 100, 480, 260],
                "center": [440, 180],
                "in_restricted_area": False,
            }
        ]
    )

    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T17:00:12",
        include_debug=True,
    )

    assert result["results"] == []