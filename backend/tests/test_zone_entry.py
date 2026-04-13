from __future__ import annotations

import json

import pytest

from services.pipeline import PipelineService


class FakeExtractor:
    def __init__(self, detections, location="server_room"):
        self._detections = detections
        self.location = location

    def infer_frame(self, frame, conf_threshold=None, timestamp_override=None):
        ts = timestamp_override or "2026-04-12T18:00:00"

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
        "unauthorized_access": {
            "events": ["restricted_area_entry"],
            "time_window": 60,
            "description": "Person entered restricted area",
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
    p.zone_presence_config["distance_threshold"] = 80.0
    p.zone_presence_config["exit_grace_seconds"] = 3
    return p


def test_restricted_area_entry_emits_once_while_person_stays_inside(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [120, 80, 180, 200],
                "center": [150, 140],
                "in_restricted_area": True,
            }
        ]
    )

    result_1 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T18:00:00",
        include_debug=True,
    )
    assert len(result_1["results"]) == 1
    assert result_1["results"][0]["incident_data"]["name"] == "unauthorized_access"

    result_2 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T18:00:01",
        include_debug=True,
    )
    assert result_2["results"] == []

    result_3 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T18:00:02",
        include_debug=True,
    )
    assert result_3["results"] == []


def test_restricted_area_entry_emits_again_after_exit_and_reentry(pipeline):
    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [120, 80, 180, 200],
                "center": [150, 140],
                "in_restricted_area": True,
            }
        ]
    )

    result_1 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T18:00:00",
        include_debug=True,
    )
    assert len(result_1["results"]) == 1

    pipeline.extractors["cam_01"] = FakeExtractor(detections=[])

    pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T18:00:05",
        include_debug=True,
    )

    pipeline.extractors["cam_01"] = FakeExtractor(
        detections=[
            {
                "label": "person",
                "bbox": [122, 82, 182, 202],
                "center": [152, 142],
                "in_restricted_area": True,
            }
        ]
    )

    result_2 = pipeline.process_cctv_frame(
        frame="dummy_frame",
        camera_id="cam_01",
        timestamp_override="2026-04-12T18:00:09",
        include_debug=True,
    )
    print("BUFFERED EVENTS:", pipeline.get_buffered_events())
    print("RESULTS:", result_2["results"])
    assert len(result_2["results"]) == 1
    assert result_2["results"][0]["incident_data"]["name"] == "unauthorized_access"