from pathlib import Path
import sys
import json
import tempfile
import time
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from services.pipeline import PipelineService


# --------------------------------------------------
# Helpers
# --------------------------------------------------
def write_temp_rules():
    rules = {
        "intrusion_attempt": {
            "events": ["person_detected", "access_denied"],
            "time_window": 60,
            "description": "Possible unauthorized entry attempt",
            "base_risk": 7,
        },
        "violent_incident": {
            "events": ["fight_detected"],
            "time_window": 10,
            "description": "Violent activity detected",
            "base_risk": 9,
        },
        "vision_intrusion_alert": {
            "events": ["intrusion_detected"],
            "time_window": 10,
            "description": "Visual intrusion detected",
            "base_risk": 8,
        },
    }

    temp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8")
    json.dump(rules, temp, indent=2)
    temp.close()
    return temp.name


def make_pipeline(rules_file):
    return PipelineService(
        window_seconds=120,
        rules_file=rules_file,
        enable_advisory=False,
    )


def ts(base_time: datetime, seconds_offset: int) -> str:
    return (base_time + timedelta(seconds=seconds_offset)).isoformat()


def log_result(ok: bool, message: str):
    prefix = "[PASS]" if ok else "[FAIL]"
    print(f"{prefix} {message}")


# --------------------------------------------------
# Stream simulation
# --------------------------------------------------
class StreamSimulator:
    def __init__(self, pipeline, base_time=None, sleep_seconds=0.0):
        self.pipeline = pipeline
        self.base_time = base_time or datetime(2026, 4, 7, 14, 0, 0)
        self.sleep_seconds = sleep_seconds
        self.detected_incidents = []

    def push_cctv(self, seconds_offset: int, label: str, location: str, confidence=0.95, in_restricted_area=False, camera_id="cam_sim_01"):
        payload = {
            "label": label,
            "timestamp": ts(self.base_time, seconds_offset),
            "location": location,
            "camera_id": camera_id,
            "confidence": confidence,
            "in_restricted_area": in_restricted_area,
        }

        print(f"[STREAM][CCTV] {payload}")
        results = self.pipeline.process_cctv_input(payload)
        self._record_results(results, payload_type="cctv", payload=payload)
        self._sleep_if_needed()
        return results

    def push_access(self, seconds_offset: int, action: str, location: str, user_id="U123", door_id="D09"):
        payload = {
            "timestamp": ts(self.base_time, seconds_offset),
            "action": action,
            "location": location,
            "user_id": user_id,
            "door_id": door_id,
        }

        print(f"[STREAM][ACCESS] {payload}")
        results = self.pipeline.process_access_input(payload)
        self._record_results(results, payload_type="access", payload=payload)
        self._sleep_if_needed()
        return results

    def _record_results(self, results, payload_type, payload):
        if not results:
            print("  -> no incidents")
            return

        for result in results:
            incident_data = result.get("incident_data", {})
            incident_name = incident_data.get("name")
            location = incident_data.get("location")
            print(f"  -> INCIDENT: {incident_name} @ {location}")
            self.detected_incidents.append({
                "source_payload_type": payload_type,
                "source_payload": payload,
                "incident_name": incident_name,
                "location": location,
                "full_result": result,
            })

    def _sleep_if_needed(self):
        if self.sleep_seconds > 0:
            time.sleep(self.sleep_seconds)


# --------------------------------------------------
# Assertions
# --------------------------------------------------
def assert_equal(actual, expected, message):
    if actual != expected:
        raise AssertionError(f"{message} | expected={expected}, actual={actual}")


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


def incident_names(results):
    return [r.get("incident_data", {}).get("name") for r in results]


# --------------------------------------------------
# Streaming scenarios
# --------------------------------------------------
def scenario_intrusion_single_trigger(sim: StreamSimulator):
    print("\n=== Scenario 1: intrusion triggers once ===")
    r1 = sim.push_cctv(0, label="person", location="server_room")
    r2 = sim.push_access(5, action="ACCESS_DENIED", location="server_room")

    assert_equal(len(r1), 0, "person alone should not trigger intrusion_attempt")
    assert_equal(len(r2), 1, "person + access_denied should trigger one intrusion_attempt")
    assert_equal(incident_names(r2), ["intrusion_attempt"], "wrong incident for intrusion flow")
    log_result(True, "scenario_intrusion_single_trigger")


def scenario_no_stale_retrigger(sim: StreamSimulator):
    print("\n=== Scenario 2: stale events do not retrigger ===")
    r = sim.push_cctv(95, label="person", location="server_room")
    assert_equal(len(r), 0, "new person alone must not retrigger old intrusion incident")
    log_result(True, "scenario_no_stale_retrigger")


def scenario_duplicate_suppression(sim: StreamSimulator):
    print("\n=== Scenario 3: duplicate suppression for same event set ===")
    r1 = sim.push_cctv(200, label="person", location="vault")
    r2 = sim.push_access(205, action="ACCESS_DENIED", location="vault")
    r3 = sim.push_access(205, action="ACCESS_DENIED", location="vault")

    assert_equal(len(r1), 0, "first person alone should not trigger")
    assert_equal(len(r2), 1, "valid pair should trigger exactly once")
    assert_equal(len(r3), 0, "same repeated event set should be suppressed")
    log_result(True, "scenario_duplicate_suppression")


def scenario_new_later_pair_can_trigger_again(sim: StreamSimulator):
    print("\n=== Scenario 4: later fresh pair can trigger again ===")
    r1 = sim.push_cctv(300, label="person", location="warehouse")
    r2 = sim.push_access(304, action="ACCESS_DENIED", location="warehouse")
    r3 = sim.push_cctv(370, label="person", location="warehouse")
    r4 = sim.push_access(375, action="ACCESS_DENIED", location="warehouse")

    assert_equal(len(r1), 0, "first person alone should not trigger")
    assert_equal(len(r2), 1, "first valid pair should trigger")
    assert_equal(len(r3), 0, "second person alone should not trigger")
    assert_equal(len(r4), 1, "later fresh pair should trigger again")
    log_result(True, "scenario_new_later_pair_can_trigger_again")


def scenario_location_isolation(sim: StreamSimulator):
    print("\n=== Scenario 5: different locations must not combine ===")
    r1 = sim.push_cctv(500, label="person", location="lobby")
    r2 = sim.push_access(505, action="ACCESS_DENIED", location="server_room")

    assert_equal(len(r1), 0, "person alone should not trigger")
    assert_equal(len(r2), 0, "events from different locations must not combine")
    log_result(True, "scenario_location_isolation")


def scenario_visual_intrusion(sim: StreamSimulator):
    print("\n=== Scenario 6: CCTV intrusion label triggers vision alert ===")
    r = sim.push_cctv(600, label="intrusion_or_unauthorized", location="vault")
    assert_equal(len(r), 1, "intrusion CCTV event should trigger vision_intrusion_alert")
    assert_equal(incident_names(r), ["vision_intrusion_alert"], "wrong incident for intrusion CCTV label")
    log_result(True, "scenario_visual_intrusion")


def scenario_violent_incident(sim: StreamSimulator):
    print("\n=== Scenario 7: fight detection triggers violent incident ===")
    r = sim.push_cctv(700, label="fighting_or_aggressive", location="lobby")
    assert_equal(len(r), 1, "fight detection should trigger violent_incident")
    assert_equal(incident_names(r), ["violent_incident"], "wrong incident for fight detection")
    log_result(True, "scenario_violent_incident")


def scenario_buffer_cleanup_visibility(sim: StreamSimulator):
    print("\n=== Scenario 8: event buffer cleanup behaves as expected ===")
    buffered = sim.pipeline.get_buffered_events()
    timestamps = [item.get("timestamp") for item in buffered]

    assert_true(len(buffered) > 0, "buffer should contain recent events")
    latest_ts = max(timestamps)
    earliest_ts = min(timestamps)
    print(f"[INFO] buffered events count={len(buffered)} earliest={earliest_ts} latest={latest_ts}")
    log_result(True, "scenario_buffer_cleanup_visibility")


# --------------------------------------------------
# Main runner
# --------------------------------------------------
def run_all():
    rules_file = write_temp_rules()
    pipeline = make_pipeline(rules_file)
    sim = StreamSimulator(pipeline=pipeline, sleep_seconds=0.0)

    scenarios = [
        scenario_intrusion_single_trigger,
        scenario_no_stale_retrigger,
        scenario_duplicate_suppression,
        scenario_new_later_pair_can_trigger_again,
        scenario_location_isolation,
        scenario_visual_intrusion,
        scenario_violent_incident,
        scenario_buffer_cleanup_visibility,
    ]

    passed = 0
    failed = 0

    print("=" * 72)
    print("RUNNING SIMULATED STREAMING TEST")
    print("=" * 72)

    for scenario in scenarios:
        try:
            scenario(sim)
            passed += 1
        except Exception as e:
            print(f"[FAIL] {scenario.__name__}: {e}")
            failed += 1

    print("\n" + "=" * 72)
    print(f"STREAM TEST RESULTS: passed={passed}, failed={failed}, total={len(scenarios)}")
    print("=" * 72)

    print("\nDetected incidents summary:")
    for idx, item in enumerate(sim.detected_incidents, start=1):
        print(f"  {idx}. {item['incident_name']} @ {item['location']}")

    if failed > 0:
        raise SystemExit(1)


if __name__ == "__main__":
    run_all()
