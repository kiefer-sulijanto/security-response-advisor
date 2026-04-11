from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from datetime import datetime
from unittest.mock import patch

from services.pipeline import PipelineService


class DummyExtractor:
    def __init__(self, detections=None, should_raise=False):
        self.detections = detections or []
        self.should_raise = should_raise

    def extract_detections(self, frame, conf_threshold=None):
        if self.should_raise:
            raise RuntimeError("extractor failed")
        return self.detections


def test_process_cctv_input_person_detection_no_incident_yet():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    raw_detection = {
        "label": "person",
        "timestamp": "2026-04-07T14:00:00",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    results = pipeline.process_cctv_input(raw_detection)

    assert results == []


def test_process_cctv_input_intrusion_label_triggers_incident():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    raw_detection = {
        "label": "intrusion_or_unauthorized",
        "timestamp": "2026-04-07T14:00:00",
        "location": "vault",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    results = pipeline.process_cctv_input(raw_detection)

    assert len(results) == 1
    assert results[0]["is_system_error"] is False
    assert results[0]["incident_data"]["name"] == "vision_intrusion_alert"
    assert results[0]["incident_data"]["location"] == "vault"


def test_process_access_input_access_denied_alone_no_incident():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    raw_log = {
        "timestamp": "2026-04-07T14:00:05",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09",
    }

    results = pipeline.process_access_input(raw_log)

    assert results == []


def test_pipeline_person_then_access_denied_triggers_intrusion_attempt():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    cctv_input = {
        "label": "person",
        "timestamp": "2026-04-07T14:00:00",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    access_input = {
        "timestamp": "2026-04-07T14:00:05",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09",
    }

    first_results = pipeline.process_cctv_input(cctv_input)
    second_results = pipeline.process_access_input(access_input)

    assert first_results == []
    assert len(second_results) == 1
    assert second_results[0]["is_system_error"] is False
    assert second_results[0]["incident_data"]["name"] == "intrusion_attempt"
    assert second_results[0]["incident_data"]["location"] == "server_room"


def test_pipeline_location_isolation_no_cross_location_incident():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    cctv_input = {
        "label": "person",
        "timestamp": "2026-04-07T14:08:20",
        "location": "lobby",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    access_input = {
        "timestamp": "2026-04-07T14:08:25",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09",
    }

    pipeline.process_cctv_input(cctv_input)
    results = pipeline.process_access_input(access_input)

    assert results == []


def test_process_cctv_frame_uses_registered_extractor_and_triggers_incident():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    extractor = DummyExtractor(
        detections=[
            {
                "label": "intrusion_or_unauthorized",
                "timestamp": "2026-04-07T14:10:00",
                "location": "vault",
                "camera_id": "cam_sim_01",
                "confidence": 0.95,
                "in_restricted_area": False,
            }
        ]
    )

    pipeline.extractors["cam_sim_01"] = extractor

    frame = object()
    results = pipeline.process_cctv_frame(frame=frame, camera_id="cam_sim_01")

    assert len(results) == 1
    assert results[0]["incident_data"]["name"] == "vision_intrusion_alert"
    assert results[0]["incident_data"]["location"] == "vault"


def test_process_cctv_frame_override_location_replaces_extractor_location():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    extractor = DummyExtractor(
        detections=[
            {
                "label": "intrusion_or_unauthorized",
                "timestamp": "2026-04-07T14:10:00",
                "location": "old_location",
                "camera_id": "cam_sim_01",
                "confidence": 0.95,
                "in_restricted_area": False,
            }
        ]
    )

    pipeline.extractors["cam_sim_01"] = extractor

    frame = object()
    results = pipeline.process_cctv_frame(
        frame=frame,
        camera_id="cam_sim_01",
        override_location="vault",
    )

    assert len(results) == 1
    assert results[0]["incident_data"]["location"] == "vault"


def test_process_cctv_frame_unregistered_camera_returns_system_error():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    results = pipeline.process_cctv_frame(
        frame=object(),
        camera_id="missing_cam",
    )

    assert len(results) == 1
    assert results[0]["is_system_error"] is True
    assert results[0]["incident_data"]["status"] == "ERROR"


def test_process_cctv_frame_extractor_failure_returns_system_error():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    pipeline.extractors["cam_sim_01"] = DummyExtractor(should_raise=True)

    results = pipeline.process_cctv_frame(
        frame=object(),
        camera_id="cam_sim_01",
    )

    assert len(results) == 1
    assert results[0]["is_system_error"] is True
    assert results[0]["incident_data"]["status"] == "ERROR"


def test_register_camera_adds_camera():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    with patch("services.pipeline.CCTVExtractor") as MockExtractor:
        pipeline.register_camera(
            camera_id="cam_sim_01",
            model_path="models/best.pt",
            location="server_room",
            conf_threshold=0.6,
        )

    assert "cam_sim_01" in pipeline.extractors
    MockExtractor.assert_called_once_with(
        model_path="models/best.pt",
        camera_id="cam_sim_01",
        location="server_room",
        conf_threshold=0.6,
    )


def test_list_registered_cameras_sorted():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)
    pipeline.extractors["cam_b"] = DummyExtractor()
    pipeline.extractors["cam_a"] = DummyExtractor()

    cameras = pipeline.list_registered_cameras()

    assert cameras == ["cam_a", "cam_b"]


def test_unregister_camera_removes_camera():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)
    pipeline.extractors["cam_sim_01"] = DummyExtractor()

    pipeline.unregister_camera("cam_sim_01")

    assert "cam_sim_01" not in pipeline.extractors


def test_get_buffered_events_returns_serializable_event_dicts():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:00:00",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    buffered = pipeline.get_buffered_events()

    assert isinstance(buffered, list)
    assert len(buffered) == 1
    assert buffered[0]["event_type"] == "person_detected"
    assert buffered[0]["location"] == "server_room"


def test_fight_detection_triggers_violent_incident():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    results = pipeline.process_cctv_input({
        "label": "fighting_or_aggressive",
        "timestamp": "2026-04-07T14:11:40",
        "location": "lobby",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    assert len(results) == 1
    assert results[0]["incident_data"]["name"] == "violent_incident"
    assert results[0]["incident_data"]["location"] == "lobby"


def test_duplicate_suppression_same_event_set_is_suppressed():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    cctv_input = {
        "label": "person",
        "timestamp": "2026-04-07T14:03:20",
        "location": "vault",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    access_input = {
        "timestamp": "2026-04-07T14:03:25",
        "action": "ACCESS_DENIED",
        "location": "vault",
        "user_id": "U123",
        "door_id": "D09",
    }

    first_results = pipeline.process_cctv_input(cctv_input)
    second_results = pipeline.process_access_input(access_input)
    third_results = pipeline.process_access_input(access_input)

    assert first_results == []
    assert len(second_results) == 1
    assert second_results[0]["incident_data"]["name"] == "intrusion_attempt"

    # exact same access event again should not produce a fresh incident
    assert third_results == []


def test_stale_old_pair_does_not_retrigger_with_new_person():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    old_person = {
        "label": "person",
        "timestamp": "2026-04-07T14:00:00",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    old_access_denied = {
        "timestamp": "2026-04-07T14:00:05",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09",
    }

    new_person_only = {
        "label": "person",
        "timestamp": "2026-04-07T14:01:35",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    first_results = pipeline.process_cctv_input(old_person)
    second_results = pipeline.process_access_input(old_access_denied)
    third_results = pipeline.process_cctv_input(new_person_only)

    assert first_results == []
    assert len(second_results) == 1
    assert second_results[0]["incident_data"]["name"] == "intrusion_attempt"

    # new person alone must not rediscover the old already-consumed pair
    assert third_results == []


def test_new_later_fresh_pair_can_trigger_again():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    first_person = {
        "label": "person",
        "timestamp": "2026-04-07T14:05:00",
        "location": "warehouse",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    first_access = {
        "timestamp": "2026-04-07T14:05:04",
        "action": "ACCESS_DENIED",
        "location": "warehouse",
        "user_id": "U123",
        "door_id": "D09",
    }

    second_person = {
        "label": "person",
        "timestamp": "2026-04-07T14:06:10",
        "location": "warehouse",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    }

    second_access = {
        "timestamp": "2026-04-07T14:06:15",
        "action": "ACCESS_DENIED",
        "location": "warehouse",
        "user_id": "U123",
        "door_id": "D09",
    }

    r1 = pipeline.process_cctv_input(first_person)
    r2 = pipeline.process_access_input(first_access)
    r3 = pipeline.process_cctv_input(second_person)
    r4 = pipeline.process_access_input(second_access)

    assert r1 == []
    assert len(r2) == 1
    assert r2[0]["incident_data"]["name"] == "intrusion_attempt"

    assert r3 == []
    assert len(r4) == 1
    assert r4[0]["incident_data"]["name"] == "intrusion_attempt"
    assert r4[0]["incident_data"]["location"] == "warehouse"


def test_simultaneous_two_locations_both_trigger_incidents():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    # two different locations, same timestamps
    pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:20:00",
        "location": "server_room",
        "camera_id": "cam_a",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:20:00",
        "location": "vault",
        "camera_id": "cam_b",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    results_a = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:20:05",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U100",
        "door_id": "D01",
    })

    results_b = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:20:05",
        "action": "ACCESS_DENIED",
        "location": "vault",
        "user_id": "U200",
        "door_id": "D02",
    })

    assert len(results_a) == 1
    assert results_a[0]["incident_data"]["name"] == "intrusion_attempt"
    assert results_a[0]["incident_data"]["location"] == "server_room"

    assert len(results_b) == 1
    assert results_b[0]["incident_data"]["name"] == "intrusion_attempt"
    assert results_b[0]["incident_data"]["location"] == "vault"