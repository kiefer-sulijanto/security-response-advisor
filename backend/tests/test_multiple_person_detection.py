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
        ts = timestamp_override or "2026-04-12T16:00:00"

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
        "tailgating": {
            "events": ["access_granted", "multiple_persons_detected"],
            "time_window": 10,
            "description": "Possible tailgating through controlled entry",
        }
    }

    path = tmp_path / "incident_rules.json"
    path.write_text(json.dumps(rules), encoding="utf-8")
    return str(path)


@pytest.fixture
def pipeline(rules_file):
    return PipelineService(
        window_seconds=120,
        rules_file=rules_file,
        enable_advisory=False,
    )


def test_adapter_maps_multiple_persons_label():
    detection = {
        "label": "multiple_persons",
        "timestamp": "2026-04-12T16:00:00",
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 1.0,
        "person_count": 2,
        "in_restricted_area": False,
    }

    events = process_cctv_detection(detection)

    assert len(events) == 1
    assert events[0].event_type == EventType.MULTIPLE_PERSONS_DETECTED
    assert events[0].location == "server_room"
    assert events[0].metadata.get("person_count") == 2


def test_pipeline_two_persons_in_single_frame_only_creates_person_events_initially(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [10, 10, 60, 100],
                "center": [35, 55],
                "in_restricted_area": False,
            },
            {
                "label": "person",
                "bbox": [120, 20, 180, 110],
                "center": [150, 65],
                "in_restricted_area": False,
            },
        ]
    )

    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T16:00:00",
        include_debug=True,
    )

    buffered_events = pipeline.get_buffered_events()
    event_types = [event["event_type"] for event in buffered_events]

    assert event_types.count("person_detected") == 2
    assert "multiple_persons_detected" not in event_types
    assert result["debug"]["direct_detection_count"] == 2


def test_pipeline_single_person_does_not_create_multiple_persons_event(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [10, 10, 60, 100],
                "center": [35, 55],
                "in_restricted_area": False,
            }
        ]
    )

    pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        include_debug=True,
    )

    buffered_events = pipeline.get_buffered_events()
    event_types = [event["event_type"] for event in buffered_events]

    assert event_types.count("person_detected") == 1
    assert "multiple_persons_detected" not in event_types


def test_multiple_persons_requires_two_consecutive_frames(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [10, 10, 60, 100],
                "center": [35, 55],
                "in_restricted_area": False,
            },
            {
                "label": "person",
                "bbox": [120, 20, 180, 110],
                "center": [150, 65],
                "in_restricted_area": False,
            },
        ]
    )

    result_1 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-13T16:00:00",
        include_debug=True,
    )
    assert result_1["results"] == []

    buffered_events_1 = pipeline.get_buffered_events()
    event_types_1 = [e["event_type"] for e in buffered_events_1]
    assert event_types_1.count("person_detected") == 2
    assert "multiple_persons_detected" not in event_types_1

    result_2 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-13T16:00:02",
        include_debug=True,
    )
    assert result_2["results"] == []

    buffered_events_2 = pipeline.get_buffered_events()
    event_types_2 = [e["event_type"] for e in buffered_events_2]
    assert event_types_2.count("person_detected") == 4
    assert "multiple_persons_detected" in event_types_2


def test_tailgating_incident_triggers_with_access_granted_plus_confirmed_multiple_persons(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [10, 10, 60, 100],
                "center": [35, 55],
                "in_restricted_area": False,
            },
            {
                "label": "person",
                "bbox": [120, 20, 180, 110],
                "center": [150, 65],
                "in_restricted_area": False,
            },
        ]
    )

    first_frame = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T16:00:00",
        include_debug=True,
    )
    assert first_frame["results"] == []

    second_frame = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T16:00:02",
        include_debug=True,
    )
    assert second_frame["results"] == []

    buffered_events = pipeline.get_buffered_events()
    buffered_event_types = [event["event_type"] for event in buffered_events]
    assert "multiple_persons_detected" in buffered_event_types

    access_result = pipeline.process_access_input(
        {
            "timestamp": "2026-04-12T16:00:05",
            "action": "ACCESS_GRANTED",
            "location": "server_room",
            "user_id": "U123",
            "door_id": "D01",
        }
    )

    assert len(access_result) == 1
    incident = access_result[0]["incident_data"]
    assert incident["name"] == "tailgating"

    triggering_event_types = {
        event["event_type"] for event in incident["triggering_events"]
    }
    assert "access_granted" in triggering_event_types
    assert "multiple_persons_detected" in triggering_event_types