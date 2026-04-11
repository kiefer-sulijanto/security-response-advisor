from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core.incident_engine import IncidentEngine
from core.event_stream_processor import EventStreamProcessor
from core.events import Event,EventType,create_event
from adapters.cctv_adapter import process_cctv_detection
from adapters.access_log_adapter import process_access_log
from datetime import datetime
from services.pipeline import PipelineService
def run_scenario(name, cctv_inputs=None, access_inputs=None, direct_events=None):
    print("\n" + "=" * 70)
    print(f"SCENARIO: {name}")
    print("=" * 70)

    processor = EventStreamProcessor(window_seconds=120)
    engine = IncidentEngine()

    cctv_inputs = cctv_inputs or []
    access_inputs = access_inputs or []
    direct_events = direct_events or []

    for detection in cctv_inputs:
        events = process_cctv_detection(detection)
        for event in events:
            processor.add_event(event)
            print(f"[CCTV EVENT]   {event}")

    for record in access_inputs:
        events = process_access_log(record)
        for event in events:
            processor.add_event(event)
            print(f"[ACCESS EVENT] {event}")

    for event in direct_events:
        processor.add_event(event)
        print(f"[DIRECT EVENT] {event}")

    current_events = processor.get_events()

    print("\nBuffered Events:")
    for event in current_events:
        print(f" - {event}")

    incidents = engine.detect_incidents(current_events)

    print("\nDetected Incidents:")
    if not incidents:
        print(" - No incidents detected")
    else:
        for incident in incidents:
            print(incident)



if __name__ == "__main__":

    # Scenario 1: Intrusion Attempt
    scenario_1_cctv = {
            "label": "person",
            "timestamp": "2026-03-25T22:41:01",
            "location": "server_room",
            "camera_id": "cam_01",
            "confidence": 0.93,
            "in_restricted_area": False
        }
    

    scenario_1_access = {
            "timestamp": "2026-03-25T22:41:05",
            "action": "ACCESS_DENIED",
            "location": "server_room",
            "user_id": "U123",
            "door_id": "D09"
        }
    

    '''run_scenario(
        "Intrusion Attempt",
        cctv_inputs=scenario_1_cctv,
        access_inputs=scenario_1_access
    )'''

    # Scenario 2: Unauthorized Access
    scenario_2_cctv = [
        {
            "label": "person",
            "timestamp": "2026-03-25T22:45:00",
            "location": "restricted_lab",
            "camera_id": "cam_02",
            "confidence": 0.95,
            "in_restricted_area": True
        }
    ]

    run_scenario(
        "Unauthorized Access",
        cctv_inputs=scenario_2_cctv,
        access_inputs=[]
    )

    # Scenario 3: Fire Alert
        # Scenario 3: Fire Alert
    fire_event = create_event(
        event_type=EventType.SMOKE_DETECTED,
        location="storage_room",
        source="sensor",
        timestamp=datetime.now(),
        metadata={"sensor_id": "smoke_01"}
    )

    run_scenario(
        "Fire Alert",
        direct_events=[fire_event]
    )



    service = PipelineService()

    cctv_input = {
        "label": "person",
        "timestamp": "2026-03-25T22:41:01",
        "location": "server_room",
        "camera_id": "cam_01",
        "confidence": 0.93,
        "in_restricted_area": False
    }

    access_input = {
        "timestamp": "2026-03-25T22:41:05",
        "action": "ACCESS_DENIED",
        "location": "server_room",
        "user_id": "U123",
        "door_id": "D09"
    }

    incidents_1 = service.process_cctv_input(cctv_input)
    print("After CCTV:", incidents_1)

    incidents_2 = service.process_access_input(access_input)
    print("After Access:", incidents_2)




    

