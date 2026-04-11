from services.pipeline import PipelineService


def test_streaming_scenario_intrusion_triggers_once():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    r1 = pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:00:00",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    r2 = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:00:05",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09",
    })

    assert r1 == []
    assert len(r2) == 1
    assert r2[0]["incident_data"]["name"] == "intrusion_attempt"
    assert r2[0]["incident_data"]["location"] == "server_room"


def test_streaming_scenario_stale_events_do_not_retrigger():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:00:00",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    first_incident = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:00:05",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09",
    })

    later_person_only = pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:01:35",
        "location": "server_room",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    assert len(first_incident) == 1
    assert later_person_only == []


def test_streaming_scenario_duplicate_suppression_same_event_set():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:03:20",
        "location": "vault",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    first_incident = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:03:25",
        "action": "ACCESS_DENIED",
        "location": "vault",
        "user_id": "U123",
        "door_id": "D09",
    })

    duplicate_incident = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:03:25",
        "action": "ACCESS_DENIED",
        "location": "vault",
        "user_id": "U123",
        "door_id": "D09",
    })

    assert len(first_incident) == 1
    assert duplicate_incident == []


def test_streaming_scenario_new_later_pair_can_trigger_again():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    r1 = pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:05:00",
        "location": "warehouse",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    r2 = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:05:04",
        "action": "ACCESS_DENIED",
        "location": "warehouse",
        "user_id": "U123",
        "door_id": "D09",
    })

    r3 = pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:06:10",
        "location": "warehouse",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    r4 = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:06:15",
        "action": "ACCESS_DENIED",
        "location": "warehouse",
        "user_id": "U123",
        "door_id": "D09",
    })

    assert r1 == []
    assert len(r2) == 1
    assert r3 == []
    assert len(r4) == 1
    assert r4[0]["incident_data"]["name"] == "intrusion_attempt"


def test_streaming_scenario_location_isolation():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    r1 = pipeline.process_cctv_input({
        "label": "person",
        "timestamp": "2026-04-07T14:08:20",
        "location": "lobby",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    r2 = pipeline.process_access_input({
        "timestamp": "2026-04-07T14:08:25",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09",
    })

    assert r1 == []
    assert r2 == []


def test_streaming_scenario_visual_intrusion():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    results = pipeline.process_cctv_input({
        "label": "intrusion_or_unauthorized",
        "timestamp": "2026-04-07T14:10:00",
        "location": "vault",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    assert len(results) == 1
    assert results[0]["incident_data"]["name"] == "vision_intrusion_alert"
    assert results[0]["incident_data"]["location"] == "vault"


def test_streaming_scenario_violent_incident_only_once():
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


def test_streaming_buffer_cleanup_visibility():
    pipeline = PipelineService(window_seconds=120, enable_advisory=False)

    pipeline.process_cctv_input({
        "label": "intrusion_or_unauthorized",
        "timestamp": "2026-04-07T14:10:00",
        "location": "vault",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    pipeline.process_cctv_input({
        "label": "fighting_or_aggressive",
        "timestamp": "2026-04-07T14:11:40",
        "location": "lobby",
        "camera_id": "cam_sim_01",
        "confidence": 0.95,
        "in_restricted_area": False,
    })

    buffered = pipeline.get_buffered_events()

    assert len(buffered) == 2
    timestamps = [event["timestamp"] for event in buffered]
    assert min(timestamps) == "2026-04-07T14:10:00"
    assert max(timestamps) == "2026-04-07T14:11:40"