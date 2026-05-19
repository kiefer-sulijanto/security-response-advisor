import re

import pytest

from config.cameras import CAMERA_REGISTRY
from config.locations import LOCATIONS

try:
    from app import state
except Exception:
    state = None


def is_valid_location(location_key: str) -> bool:
    return location_key in LOCATIONS


def test_locations_registry_is_not_empty():
    assert isinstance(LOCATIONS, dict)
    assert LOCATIONS, "LOCATIONS should not be empty"


def test_location_keys_are_snake_case():
    pattern = re.compile(r"^[a-z][a-z0-9_]*$")

    for location_key in LOCATIONS.keys():
        assert pattern.match(location_key), (
            f"Invalid location key '{location_key}'. "
            "Use snake_case like 'server_room', 'lobby', or 'parking_area'."
        )


def test_each_location_has_required_display_fields():
    required_fields = {"label", "floor"}

    for location_key, location in LOCATIONS.items():
        missing_fields = required_fields - set(location.keys())

        assert not missing_fields, (
            f"Location '{location_key}' is missing required fields: {missing_fields}"
        )

        assert isinstance(location["label"], str)
        assert location["label"].strip(), f"Location '{location_key}' has empty label"

        assert isinstance(location["floor"], str)
        assert location["floor"].strip(), f"Location '{location_key}' has empty floor"


def test_camera_registry_is_not_empty():
    assert isinstance(CAMERA_REGISTRY, list)
    assert CAMERA_REGISTRY, "CAMERA_REGISTRY should not be empty"


def test_camera_ids_are_unique():
    camera_ids = [camera["camera_id"] for camera in CAMERA_REGISTRY]

    assert len(camera_ids) == len(set(camera_ids)), (
        f"Duplicate camera IDs found: {camera_ids}"
    )


def test_all_camera_locations_exist_in_locations_registry():
    for camera in CAMERA_REGISTRY:
        camera_id = camera["camera_id"]
        location_key = camera.get("location")

        assert location_key, f"Camera '{camera_id}' has no location configured"
        assert is_valid_location(location_key), (
            f"Camera '{camera_id}' has invalid location '{location_key}'. "
            f"Add it to config/locations.py or change the camera location."
        )


def test_camera_conf_thresholds_are_valid():
    for camera in CAMERA_REGISTRY:
        camera_id = camera["camera_id"]
        conf_threshold = camera.get("conf_threshold")

        assert isinstance(conf_threshold, (int, float)), (
            f"Camera '{camera_id}' conf_threshold must be a number"
        )
        assert 0 <= conf_threshold <= 1, (
            f"Camera '{camera_id}' conf_threshold must be between 0 and 1"
        )


def test_camera_restricted_zones_match_camera_id():
    for camera in CAMERA_REGISTRY:
        camera_id = camera["camera_id"]
        restricted_zones = camera.get("restricted_zones", {})

        assert isinstance(restricted_zones, dict), (
            f"Camera '{camera_id}' restricted_zones must be a dictionary"
        )

        assert camera_id in restricted_zones, (
            f"Camera '{camera_id}' restricted_zones should contain key '{camera_id}'"
        )


def test_cameras_do_not_use_placeholder_locations():
    placeholder_locations = {"analysis", "unknown", "test", "demo"}

    for camera in CAMERA_REGISTRY:
        camera_id = camera["camera_id"]
        location_key = camera.get("location")

        assert location_key not in placeholder_locations, (
            f"Camera '{camera_id}' uses placeholder location '{location_key}'. "
            "Use a real map location such as 'lobby', 'server_room', or 'parking_area'."
        )


@pytest.mark.skipif(state is None, reason="app.state could not be imported")
def test_seeded_officer_locations_are_valid():
    for officer in state.officers_db:
        officer_id = officer["id"]
        location_key = officer.get("location")

        assert location_key, f"Officer '{officer_id}' has no location"
        assert is_valid_location(location_key), (
            f"Officer '{officer_id}' has invalid location '{location_key}'. "
            "Officer locations should use location keys, not display names. "
            "Example: use 'lobby', not 'Main Lobby'."
        )