from datetime import datetime, timedelta


def generate_intrusion_access_sequence(start_time: datetime) -> list[dict]:
    """
    Simulates a denied access event that can combine with CCTV intrusion/person events.
    """
    return [
        {
            "timestamp": (start_time + timedelta(seconds=4)).isoformat(timespec="seconds"),
            "action": "ACCESS_DENIED",
            "location": "server_room",
            "user_id": "U123",
            "door_id": "D09"
        }
    ]


def generate_normal_access_sequence(start_time: datetime) -> list[dict]:
    """
    Simulates a normal successful access event.
    """
    return [
        {
            "timestamp": (start_time + timedelta(seconds=2)).isoformat(timespec="seconds"),
            "action": "ACCESS_GRANTED",
            "location": "lobby",
            "user_id": "U777",
            "door_id": "D01"
        }
    ]


def generate_repeated_denied_access_sequence(start_time: datetime) -> list[dict]:
    """
    Simulates repeated denied access attempts at the same door.
    """
    return [
        {
            "timestamp": (start_time + timedelta(seconds=1)).isoformat(timespec="seconds"),
            "action": "ACCESS_DENIED",
            "location": "server_room",
            "user_id": "U555",
            "door_id": "D09"
        },
        {
            "timestamp": (start_time + timedelta(seconds=4)).isoformat(timespec="seconds"),
            "action": "ACCESS_DENIED",
            "location": "server_room",
            "user_id": "U555",
            "door_id": "D09"
        },
        {
            "timestamp": (start_time + timedelta(seconds=7)).isoformat(timespec="seconds"),
            "action": "ACCESS_DENIED",
            "location": "server_room",
            "user_id": "U555",
            "door_id": "D09"
        }
    ]