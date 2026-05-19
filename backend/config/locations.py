LOCATIONS = {
    "server_room": {
        "label": "Server Room",
        "floor": "main_facility",
        "floor_label": "Main Facility",
        "type": "room",
    },
    "meeting_room": {
        "label": "Meeting Room",
        "floor": "main_facility",
        "floor_label": "Main Facility",
        "type": "room",
    },
    "multi_purpose_room": {
        "label": "Multi-purpose Room",
        "floor": "main_facility",
        "floor_label": "Main Facility",
        "type": "room",
    },
    "gathering_area": {
        "label": "Gathering Area",
        "floor": "main_facility",
        "floor_label": "Main Facility",
        "type": "open_area",
    },
    "conference_room": {
        "label": "Conference Room",
        "floor": "main_facility",
        "floor_label": "Main Facility",
        "type": "room",
    },
    "canteen": {
        "label": "Canteen",
        "floor": "main_facility",
        "floor_label": "Main Facility",
        "type": "open_area",
    },
    "lobby": {
        "label": "Lobby",
        "floor": "main_facility",
        "floor_label": "Main Facility",
        "type": "open_area",
    },

    "ceo_office": {
        "label": "CEO Office",
        "floor": "office_floor",
        "floor_label": "Office Floor",
        "type": "room",
    },
    "manager_office": {
        "label": "Manager Office",
        "floor": "office_floor",
        "floor_label": "Office Floor",
        "type": "room",
    },
    "executive_office": {
        "label": "Executive Office",
        "floor": "office_floor",
        "floor_label": "Office Floor",
        "type": "room",
    },
    "office_area": {
        "label": "Office Area",
        "floor": "office_floor",
        "floor_label": "Office Floor",
        "type": "open_area",
    },
    "command_center": {
        "label": "Command Center",
        "floor": "office_floor",
        "floor_label": "Office Floor",
        "type": "security_area",
    },

    "parking_area": {
        "label": "Parking Area",
        "floor": "basement",
        "floor_label": "Basement / Parking",
        "type": "parking",
    },
    "store_room": {
        "label": "Store Room",
        "floor": "basement",
        "floor_label": "Basement / Parking",
        "type": "room",
    },
}

def is_valid_location(location_key: str) -> bool:
    return location_key in LOCATIONS


def get_location(location_key: str) -> dict | None:
    return LOCATIONS.get(location_key)