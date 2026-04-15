from __future__ import annotations

import json

import pytest

from services.pipeline import PipelineService


class FakeExtractor:
    def __init__(self, detections, location="lobby"):
        self._detections = detections
        self.location = location

    def infer_frame(self, frame, conf_threshold=None, timestamp_override=None):
        ts = timestamp_override or "2026-04-15T20:00:00"

        normalized = []
        for det in self._detections:
            item = dict(det)
            item.setdefault("timestamp", ts)
            item.setdefault("location", self.location)
            item.setdefault("camera_id", "cam_fight_01")
            item.setdefault("confidence", 0.95)
            normalized.append(item)

        return {
            "detections": normalized,
            "debug": {
                "camera_id": "cam_fight_01",
                "location": self.location,
                "timestamp": ts,
                "results": [],
                "total_detections": len(normalized),
                "fight_detected": any(
                    d.get("label") == "fighting_or_aggressive"
                    for d in normalized
                ),
            },
        }


@pytest.fixture
def rules_file(tmp_path):
    rules = {
        "physical_altercation": {
            "events": ["fight_detected"],
            "time_window": 10,
            "description": "Possible physical fight or aggressive confrontation detected",
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


def test_pipeline_fighting_detection_triggers_physical_altercation(pipeline):
    pipeline.extractors["cam_fight_01"] = FakeExtractor(
        detections=[
            {
                "label": "fighting_or_aggressive",
                "bbox": None,
                "center": None,
                "in_restricted_area": False,
                "person_count": 2,
                "alert_pairs": [[0, 1]],
                "timestamp": "2026-04-15T20:00:00",
            }
        ],
        location="lobby",
    )

    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_fight_01",
        include_debug=True,
    )

    assert len(result["results"]) == 1

    incident = result["results"][0]["incident_data"]
    assert incident["name"] == "physical_altercation"
    assert incident["location"] == "lobby"

    triggering_event_types = {
        event["event_type"] for event in incident["triggering_events"]
    }
    assert "fight_detected" in triggering_event_types

    assert result["debug"]["direct_detection_count"] == 1


def test_pipeline_no_fighting_detection_produces_no_fight_incident(pipeline):
    pipeline.extractors["cam_fight_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [10, 10, 100, 200],
                "center": [55, 105],
                "in_restricted_area": False,
                "timestamp": "2026-04-15T20:00:00",
            }
        ],
        location="lobby",
    )

    result = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_fight_01",
        include_debug=True,
    )

    assert result["results"] == []
    assert result["debug"]["direct_detection_count"] == 1


def test_pipeline_fighting_detection_deduplicates_same_event_signature(pipeline):
    pipeline.extractors["cam_fight_01"] = FakeExtractor(
        detections=[
            {
                "label": "fighting_or_aggressive",
                "bbox": None,
                "center": None,
                "in_restricted_area": False,
                "person_count": 2,
                "alert_pairs": [[0, 1]],
                "timestamp": "2026-04-15T20:00:00",
            }
        ],
        location="lobby",
    )

    first = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_fight_01",
        include_debug=True,
    )
    second = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_fight_01",
        include_debug=True,
    )

    assert len(first["results"]) == 1
    assert second["results"] == []