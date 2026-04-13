from __future__ import annotations

from datetime import datetime

import pytest

from extractors.cctv_extractor import CCTVExtractor
from adapters.cctv_adapter import process_cctv_detection
from core.events import EventType


# -----------------------------
# Fake YOLO result structures
# -----------------------------
class FakeScalar:
    def __init__(self, value):
        self.value = value

    def item(self):
        return self.value


class FakeTensorList:
    def __init__(self, values):
        self.values = values

    def tolist(self):
        return list(self.values)


class FakeBox:
    def __init__(self, cls_id, conf, xyxy):
        self.cls = [FakeScalar(cls_id)]
        self.conf = [FakeScalar(conf)]
        self.xyxy = [FakeTensorList(xyxy)]


class FakeBoxes:
    def __init__(self, boxes):
        self._boxes = boxes

    def __iter__(self):
        return iter(self._boxes)

    def __len__(self):
        return len(self._boxes)


class FakeResult:
    def __init__(self, boxes, names=None):
        self.boxes = FakeBoxes(boxes)
        self.names = names or {0: "person"}


class FakeModel:
    def __init__(self, results):
        self._results = results

    def __call__(self, frame, classes=None, conf=0.5, verbose=False):
        return self._results


# -----------------------------
# Fixtures
# -----------------------------
@pytest.fixture
def extractor(monkeypatch):
    class DummyYOLO:
        def __init__(self, model_path):
            pass

        def __call__(self, *args, **kwargs):
            return []

    monkeypatch.setattr("extractors.cctv_extractor.YOLO", DummyYOLO)

    ext = CCTVExtractor(
        model_path="dummy.pt",
        camera_id="cam_01",
        location="server_room",
        conf_threshold=0.5,
        restricted_zones={
            "cam_01": [
                [(100, 100), (300, 100), (300, 300), (100, 300)]
            ]
        },
    )
    return ext


@pytest.fixture
def fake_timestamp():
    return "2026-04-12T14:30:00"


# -----------------------------
# Extractor tests
# -----------------------------
def test_extractor_returns_empty_for_none_frame(extractor):
    result = extractor.infer_frame(None)

    assert result["detections"] == []
    assert result["debug"]["error"] == "frame_is_none"


def test_extractor_detects_person_outside_restricted_area(extractor, fake_timestamp):
    fake_boxes = [
        FakeBox(cls_id=0, conf=0.91, xyxy=[10, 10, 50, 90])  # center ~ (30, 50)
    ]
    extractor.model = FakeModel([FakeResult(fake_boxes)])

    result = extractor.infer_frame(frame="dummy_frame", timestamp_override=fake_timestamp)
    detections = result["detections"]

    assert len(detections) == 1
    det = detections[0]

    assert det["label"] == "person"
    assert det["camera_id"] == "cam_01"
    assert det["location"] == "server_room"
    assert det["timestamp"] == fake_timestamp
    assert det["confidence"] == pytest.approx(0.91)
    assert det["bbox"] == [10.0, 10.0, 50.0, 90.0]
    assert det["center"] == [30.0, 50.0]
    assert det["in_restricted_area"] is False


def test_extractor_detects_person_inside_restricted_area(extractor, fake_timestamp):
    fake_boxes = [
        FakeBox(cls_id=0, conf=0.88, xyxy=[150, 150, 250, 250])  # center ~ (200, 200)
    ]
    extractor.model = FakeModel([FakeResult(fake_boxes)])

    result = extractor.infer_frame(frame="dummy_frame", timestamp_override=fake_timestamp)
    detections = result["detections"]

    assert len(detections) == 1
    det = detections[0]

    assert det["label"] == "person"
    assert det["in_restricted_area"] is True
    assert det["center"] == [200.0, 200.0]


def test_extractor_returns_multiple_persons(extractor, fake_timestamp):
    fake_boxes = [
        FakeBox(cls_id=0, conf=0.93, xyxy=[10, 10, 60, 100]),
        FakeBox(cls_id=0, conf=0.84, xyxy=[120, 120, 200, 250]),
    ]
    extractor.model = FakeModel([FakeResult(fake_boxes)])

    result = extractor.infer_frame(frame="dummy_frame", timestamp_override=fake_timestamp)
    detections = result["detections"]

    assert len(detections) == 2
    assert all(d["label"] == "person" for d in detections)
    assert result["debug"]["total_detections"] == 2


# -----------------------------
# Adapter tests
# -----------------------------
def test_adapter_maps_person_to_person_detected(fake_timestamp):
    detection = {
        "label": "person",
        "timestamp": fake_timestamp,
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.95,
        "bbox": [10, 10, 50, 90],
        "center": [30, 50],
        "in_restricted_area": False,
    }

    events = process_cctv_detection(detection)

    assert len(events) == 1
    assert events[0].event_type == EventType.PERSON_DETECTED
    assert events[0].location == "server_room"
    assert events[0].source == "cctv"


def test_adapter_maps_person_in_restricted_area_to_two_events(fake_timestamp):
    detection = {
        "label": "person",
        "timestamp": fake_timestamp,
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.95,
        "bbox": [150, 150, 250, 250],
        "center": [200, 200],
        "in_restricted_area": True,
    }

    events = process_cctv_detection(detection)

    event_types = {event.event_type for event in events}

    assert len(events) == 2
    assert EventType.PERSON_DETECTED in event_types
    assert EventType.RESTRICTED_AREA_ENTRY in event_types


def test_adapter_returns_empty_for_invalid_input():
    assert process_cctv_detection(None) == []
    assert process_cctv_detection("not a dict") == []
    assert process_cctv_detection({}) == []


# -----------------------------
# Extractor + adapter integration test
# -----------------------------
def test_extractor_output_flows_into_adapter(extractor, fake_timestamp):
    fake_boxes = [
        FakeBox(cls_id=0, conf=0.90, xyxy=[150, 150, 250, 250])  # inside restricted zone
    ]
    extractor.model = FakeModel([FakeResult(fake_boxes)])

    result = extractor.infer_frame(frame="dummy_frame", timestamp_override=fake_timestamp)
    detections = result["detections"]

    assert len(detections) == 1

    events = process_cctv_detection(detections[0])
    event_types = {event.event_type for event in events}

    assert EventType.PERSON_DETECTED in event_types
    assert EventType.RESTRICTED_AREA_ENTRY in event_types