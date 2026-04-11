from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import time
from datetime import datetime, timedelta
from services.pipeline import PipelineService
from simulators.access_log_simulator import (
    generate_intrusion_access_sequence,
    generate_normal_access_sequence,
    generate_repeated_denied_access_sequence,
)


def build_stream():
    start_time = datetime.fromisoformat("2026-04-03T16:50:00")

    stream = []

    # Scenario 1: CCTV intrusion + denied access
    stream.append((
        "cctv",
        {
            "label": "intrusion_or_unauthorized",
            "timestamp": (start_time + timedelta(seconds=1)).isoformat(timespec="seconds"),
            "location": "server_room",
            "camera_id": "cam_01",
            "confidence": 0.95,
            "in_restricted_area": False
        }
    ))

    for log in generate_intrusion_access_sequence(start_time):
        stream.append(("access", log))

    # Scenario 2: normal access later
    normal_start = start_time + timedelta(seconds=20)

    stream.append((
        "cctv",
        {
            "label": "normal",
            "timestamp": (normal_start + timedelta(seconds=1)).isoformat(timespec="seconds"),
            "location": "lobby",
            "camera_id": "cam_02",
            "confidence": 0.98,
            "in_restricted_area": False
        }
    ))

    for log in generate_normal_access_sequence(normal_start):
        stream.append(("access", log))

    # Scenario 3: aggressive/fighting
    fight_start = start_time + timedelta(seconds=40)

    stream.append((
        "cctv",
        {
            "label": "fighting_or_aggressive",
            "timestamp": (fight_start + timedelta(seconds=1)).isoformat(timespec="seconds"),
            "location": "lobby",
            "camera_id": "cam_02",
            "confidence": 0.97,
            "in_restricted_area": False
        }
    ))

    # Scenario 4: repeated denied access
    repeated_start = start_time + timedelta(seconds=60)
    for log in generate_repeated_denied_access_sequence(repeated_start):
        stream.append(("access", log))

    # sort by timestamp
    stream.sort(key=lambda item: item[1]["timestamp"])
    return stream


def pretty_print_result(result: dict):
    print("\n=== PIPELINE OUTPUT ===")

    incident_data = result.get("incident_data", {})
    advisory = result.get("advisory", {})

    print(f"Incident Name   : {incident_data.get('name')}")
    print(f"Location        : {incident_data.get('location')}")
    print(f"Timestamp       : {incident_data.get('timestamp')}")
    print(f"Risk Score      : {incident_data.get('risk_score')}")
    print(f"Status          : {incident_data.get('status')}")

    print(f"\nAdvisory Title  : {advisory.get('title')}")
    print(f"Flag            : {advisory.get('flag')}")
    print(f"Dispatch Unit   : {advisory.get('dispatch_unit')}")
    print(f"Response Time   : {advisory.get('expected_response_time')}")
    print(f"Description     : {advisory.get('description')}")
    print(f"Explanation     : {advisory.get('explanation')}")

    actions = advisory.get("actions", [])
    if actions:
        print("Actions:")
        for action in actions:
            print(f" - {action}")


def run_multisource_stream():
    service = PipelineService()
    stream = build_stream()

    print("\nStarting multi-source replay stream...\n")

    for source, payload in stream:
        print(f"[INPUT] {source.upper()} -> {payload}")

        if source == "cctv":
            results = service.process_cctv_input(payload)
        elif source == "access":
            results = service.process_access_input(payload)
        else:
            results = []

        if results:
            for result in results:
                pretty_print_result(result)
        else:
            print("No incident triggered.\n")

        time.sleep(1)


if __name__ == "__main__":
    run_multisource_stream()