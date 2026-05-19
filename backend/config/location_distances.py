"""
Simple location-based distance scoring for officer recommendations.

Distance score meaning:
0  = same location
1  = nearby location
2  = same general area / same floor
3  = different section / different floor
4  = far
99 = unknown / fallback
"""

LOCATION_DISTANCE = {
    # Main facility
    "server_room": {
        "server_room": 0,
        "meeting_room": 1,
        "multi_purpose_room": 1,
        "gathering_area": 2,
        "conference_room": 2,
        "lobby": 2,
        "canteen": 3,
        "command_center": 3,
        "parking_area": 4,
    },
    "meeting_room": {
        "meeting_room": 0,
        "server_room": 1,
        "multi_purpose_room": 1,
        "gathering_area": 1,
        "conference_room": 2,
        "lobby": 2,
        "canteen": 3,
        "command_center": 3,
        "parking_area": 4,
    },
    "multi_purpose_room": {
        "multi_purpose_room": 0,
        "server_room": 1,
        "meeting_room": 1,
        "gathering_area": 1,
        "conference_room": 2,
        "lobby": 2,
        "canteen": 3,
        "command_center": 3,
        "parking_area": 4,
    },
    "gathering_area": {
        "gathering_area": 0,
        "meeting_room": 1,
        "multi_purpose_room": 1,
        "conference_room": 1,
        "lobby": 1,
        "canteen": 2,
        "server_room": 2,
        "command_center": 3,
        "parking_area": 3,
    },
    "conference_room": {
        "conference_room": 0,
        "gathering_area": 1,
        "canteen": 1,
        "lobby": 2,
        "meeting_room": 2,
        "server_room": 2,
        "command_center": 3,
        "parking_area": 3,
    },
    "canteen": {
        "canteen": 0,
        "conference_room": 1,
        "lobby": 1,
        "gathering_area": 2,
        "meeting_room": 3,
        "server_room": 3,
        "command_center": 3,
        "parking_area": 3,
    },
    "lobby": {
        "lobby": 0,
        "gathering_area": 1,
        "canteen": 1,
        "conference_room": 2,
        "meeting_room": 2,
        "server_room": 2,
        "office_area": 3,
        "command_center": 3,
        "parking_area": 3,
    },

    # Office floor
    "command_center": {
        "command_center": 0,
        "office_area": 1,
        "ceo_office": 1,
        "manager_office": 1,
        "executive_office": 1,
        "lobby": 3,
        "gathering_area": 3,
        "server_room": 3,
        "parking_area": 4,
    },
    "office_area": {
        "office_area": 0,
        "command_center": 1,
        "ceo_office": 1,
        "manager_office": 1,
        "executive_office": 1,
        "lobby": 3,
        "server_room": 3,
        "parking_area": 4,
    },
    "ceo_office": {
        "ceo_office": 0,
        "office_area": 1,
        "command_center": 1,
        "manager_office": 2,
        "executive_office": 2,
        "lobby": 3,
    },
    "manager_office": {
        "manager_office": 0,
        "office_area": 1,
        "command_center": 1,
        "ceo_office": 2,
        "executive_office": 2,
        "lobby": 3,
    },
    "executive_office": {
        "executive_office": 0,
        "office_area": 1,
        "command_center": 1,
        "ceo_office": 2,
        "manager_office": 2,
        "lobby": 3,
    },

    # Basement
    "parking_area": {
        "parking_area": 0,
        "store_room": 1,
        "lobby": 3,
        "canteen": 3,
        "gathering_area": 3,
        "command_center": 4,
        "server_room": 4,
    },
    "store_room": {
        "store_room": 0,
        "parking_area": 1,
        "lobby": 3,
        "command_center": 4,
    },
}


def get_location_distance(from_location: str, to_location: str) -> int:
    if from_location == to_location:
        return 0

    return LOCATION_DISTANCE.get(from_location, {}).get(to_location, 99)