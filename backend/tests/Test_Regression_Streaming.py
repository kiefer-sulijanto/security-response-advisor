from pathlib import Path
import sys
import json
import tempfile
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core.events import create_event, EventType
from core.event_stream_processor import EventStreamProcessor
from core.incident_engine import IncidentEngine
from adapters.cctv_adapter import process_cctv_detection
from adapters.access_log_adapter import process_access_log
from services.pipeline import PipelineService


def dt(seconds: int) -> datetime:
    return datetime(2026, 4, 7, 12, 0, 0) + timedelta(seconds=seconds)


def write_temp_rules():
    rules = {
        "intrusion_attempt": {
            "events": ["person_detected", "access_denied"],
            "time_window": 60,
            "description": "Possible unauthorized entry attempt",
            "base_risk": 7
        },
        "violent_incident": {
            "events": ["fight_detected"],
            "time_window": 10,
            "description": "Violent activity detected",
            "base_risk": 9
        },
        "vision_intrusion_alert": {
            "events": ["intrusion_detected"],
            "time_window": 10,
            "description": "Visual intrusion detected",
            "base_risk": 8
        }
    }

    temp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8")
    json.dump(rules, temp, indent=2)
    temp.close()
    return temp.name


def make_engine(rules_file):
    return IncidentEngine(rules_file=rules_file, duplicate_cooldown_seconds=30)


def make_pipeline(rules_file):
    return PipelineService(
        window_seconds=120,
        rules_file=rules_file,
        enable_advisory=False
    )


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


def assert_equal(actual, expected, message):
    if actual != expected:
        raise AssertionError(f"{message} | expected={expected}, actual={actual}")


def print_pass(name):
    print(f"[PASS] {name}")


def print_fail(name, error):
    print(f"[FAIL] {name}: {error}")


def test_cctv_adapter_basic():
    detection = {
        "label": "person",
        "timestamp": dt(0).isoformat(),
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.93,
        "in_restricted_area": True
    }

    events = process_cctv_detection(detection)
    event_types = sorted(e.event_type for e in events)

    assert_equal(event_types, ["person_detected", "restricted_area_entry"], "CCTV adapter should map person + restricted area")
    print_pass("test_cctv_adapter_basic")


def test_access_adapter_basic():
    log = {
        "timestamp": dt(1).isoformat(),
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09"
    }

    events = process_access_log(log)
    assert_equal(len(events), 1, "Access adapter should create one event")
    assert_equal(events[0].event_type, "access_denied", "Access adapter should map ACCESS_DENIED")
    print_pass("test_access_adapter_basic")


def test_stream_processor_cleanup():
    processor = EventStreamProcessor(window_seconds=30)

    processor.add_event(create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(0)))
    processor.add_event(create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(10)))
    processor.add_event(create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(45)))

    events = processor.get_events()
    event_times = [e.timestamp for e in events]

    assert_equal(len(events), 1, "Old events outside stream window should be removed")
    assert_true(dt(0) not in event_times, "Oldest event should be cleaned up")
    assert_true(dt(10) not in event_times, "Second-oldest event should also be cleaned up")
    assert_true(dt(45) in event_times, "Newest event should remain in buffer")
    print_pass("test_stream_processor_cleanup")


def test_intrusion_attempt_detects_once_for_valid_pair():
    rules_file = write_temp_rules()
    engine = make_engine(rules_file)

    events = [
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(0)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(5)),
    ]

    incidents = engine.detect_incidents(events)
    names = [i.name for i in incidents]

    assert_equal(len(incidents), 1, "Valid person + denied access should trigger one incident")
    assert_equal(names[0], "intrusion_attempt", "Incident should be intrusion_attempt")
    print_pass("test_intrusion_attempt_detects_once_for_valid_pair")


def test_old_stale_event_should_not_retrigger_with_new_person():
    rules_file = write_temp_rules()
    engine = make_engine(rules_file)

    old_pair = [
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(0)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(5)),
    ]

    first = engine.detect_incidents(old_pair)
    assert_equal(len(first), 1, "First valid pair should trigger once")

    stale_mix = [
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(0)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(5)),
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(95)),
    ]

    second = engine.detect_incidents(stale_mix)
    assert_equal(len(second), 0, "Old access_denied should not combine with much newer person_detected")
    print_pass("test_old_stale_event_should_not_retrigger_with_new_person")


def test_duplicate_suppression_for_same_exact_match():
    rules_file = write_temp_rules()
    engine = make_engine(rules_file)

    events = [
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(0)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(5)),
    ]

    first = engine.detect_incidents(events)
    second = engine.detect_incidents(events)

    assert_equal(len(first), 1, "First call should detect incident")
    assert_equal(len(second), 0, "Second identical match should be suppressed")
    print_pass("test_duplicate_suppression_for_same_exact_match")


def test_new_valid_pair_after_old_one_can_trigger_again():
    rules_file = write_temp_rules()
    engine = make_engine(rules_file)

    first_events = [
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(0)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(5)),
    ]

    first = engine.detect_incidents(first_events)
    assert_equal(len(first), 1, "First valid pair should trigger")

    second_events = [
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(70)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(75)),
    ]

    second = engine.detect_incidents(second_events)
    assert_equal(len(second), 1, "A genuinely new later pair should trigger again")
    print_pass("test_new_valid_pair_after_old_one_can_trigger_again")


def test_location_isolated_matching():
    rules_file = write_temp_rules()
    engine = make_engine(rules_file)

    events = [
        create_event(EventType.PERSON_DETECTED, "lobby", "cctv", timestamp=dt(0)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(5)),
    ]

    incidents = engine.detect_incidents(events)
    assert_equal(len(incidents), 0, "Events from different locations should not combine")
    print_pass("test_location_isolated_matching")


def test_violent_incident_single_event_rule():
    rules_file = write_temp_rules()
    engine = make_engine(rules_file)

    events = [
        create_event(EventType.FIGHT_DETECTED, "lobby", "cctv", timestamp=dt(12)),
    ]

    incidents = engine.detect_incidents(events)
    assert_equal(len(incidents), 1, "fight_detected should trigger violent_incident")
    assert_equal(incidents[0].name, "violent_incident", "Wrong incident name for fight detection")
    print_pass("test_violent_incident_single_event_rule")


def test_pipeline_cctv_and_access_integration():
    rules_file = write_temp_rules()
    pipeline = make_pipeline(rules_file)

    cctv_payload = {
        "label": "person",
        "timestamp": dt(0).isoformat(),
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.91,
        "in_restricted_area": False
    }

    access_payload = {
        "timestamp": dt(5).isoformat(),
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09"
    }

    result_1 = pipeline.process_cctv_input(cctv_payload)
    result_2 = pipeline.process_access_input(access_payload)

    assert_equal(len(result_1), 0, "Person alone should not yet trigger intrusion_attempt")
    assert_equal(len(result_2), 1, "Second matching access event should trigger via pipeline")

    incident_name = result_2[0]["incident_data"]["name"]
    assert_equal(incident_name, "intrusion_attempt", "Pipeline should return intrusion_attempt")

    advisory_title = result_2[0]["advisory"]["title"]
    assert_equal(advisory_title, "Analysis Unavailable", "Advisory should fallback cleanly when disabled")
    print_pass("test_pipeline_cctv_and_access_integration")


def test_pipeline_no_false_retrigger_after_stale_event():
    rules_file = write_temp_rules()
    pipeline = make_pipeline(rules_file)

    first_person = {
        "label": "person",
        "timestamp": dt(0).isoformat(),
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.95,
        "in_restricted_area": False
    }

    denied = {
        "timestamp": dt(5).isoformat(),
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09"
    }

    later_person = {
        "label": "person",
        "timestamp": dt(95).isoformat(),
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.95,
        "in_restricted_area": False
    }

    r1 = pipeline.process_cctv_input(first_person)
    r2 = pipeline.process_access_input(denied)
    r3 = pipeline.process_cctv_input(later_person)

    assert_equal(len(r1), 0, "Initial person alone should not trigger")
    assert_equal(len(r2), 1, "First valid pair should trigger once")
    assert_equal(len(r3), 0, "Later person alone should not retrigger from stale denied event")
    print_pass("test_pipeline_no_false_retrigger_after_stale_event")


def test_grouping_not_called_excessively_if_method_exists():
    rules_file = write_temp_rules()
    engine = make_engine(rules_file)

    if not hasattr(engine, "_group_events_by_location"):
        print("[SKIP] test_grouping_not_called_excessively_if_method_exists: engine has no _group_events_by_location")
        return

    original = engine._group_events_by_location
    counter = {"count": 0}

    def wrapped(events):
        counter["count"] += 1
        return original(events)

    engine._group_events_by_location = wrapped

    events = [
        create_event(EventType.PERSON_DETECTED, "server_room", "cctv", timestamp=dt(0)),
        create_event(EventType.ACCESS_DENIED, "server_room", "access_log", timestamp=dt(5)),
        create_event(EventType.FIGHT_DETECTED, "lobby", "cctv", timestamp=dt(8)),
    ]

    engine.detect_incidents(events)

    # If grouping is done once per detect call, count should be 1.
    # If it is repeated per rule, count will likely be > 1.
    assert_equal(counter["count"], 1, "Grouping should happen once per detect_incidents call")
    print_pass("test_grouping_not_called_excessively_if_method_exists")


def test_cctv_intrusion_label_maps_to_vision_intrusion_alert():
    rules_file = write_temp_rules()
    pipeline = make_pipeline(rules_file)

    cctv_payload = {
        "label": "intrusion_or_unauthorized",
        "timestamp": dt(30).isoformat(),
        "location": "vault",
        "camera_id": "cam_99",
        "confidence": 0.88,
        "in_restricted_area": False
    }

    results = pipeline.process_cctv_input(cctv_payload)

    assert_equal(len(results), 1, "intrusion_or_unauthorized should trigger visual intrusion rule")
    assert_equal(results[0]["incident_data"]["name"], "vision_intrusion_alert", "Wrong incident from intrusion CCTV label")
    print_pass("test_cctv_intrusion_label_maps_to_vision_intrusion_alert")


def run_all_tests():
    tests = [
        test_cctv_adapter_basic,
        test_access_adapter_basic,
        test_stream_processor_cleanup,
        test_intrusion_attempt_detects_once_for_valid_pair,
        test_old_stale_event_should_not_retrigger_with_new_person,
        test_duplicate_suppression_for_same_exact_match,
        test_new_valid_pair_after_old_one_can_trigger_again,
        test_location_isolated_matching,
        test_violent_incident_single_event_rule,
        test_pipeline_cctv_and_access_integration,
        test_pipeline_no_false_retrigger_after_stale_event,
        test_grouping_not_called_excessively_if_method_exists,
        test_cctv_intrusion_label_maps_to_vision_intrusion_alert,
    ]

    passed = 0
    failed = 0

    print("=" * 70)
    print("RUNNING SECURITY_AI REGRESSION TESTS")
    print("=" * 70)

    for test_func in tests:
        try:
            test_func()
            passed += 1
        except Exception as e:
            print_fail(test_func.__name__, e)
            failed += 1

    print("\n" + "=" * 70)
    print(f"RESULTS: passed={passed}, failed={failed}, total={len(tests)}")
    print("=" * 70)

    if failed > 0:
        raise SystemExit(1)


if __name__ == "__main__":
    run_all_tests()