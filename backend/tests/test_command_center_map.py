from fastapi.testclient import TestClient

from server import app
from app import state
from config.locations import LOCATIONS

client = TestClient(app)


def test_command_center_map_returns_floors():
    response = client.get("/api/command-center/map")

    assert response.status_code == 200

    data = response.json()

    assert "floors" in data
    assert isinstance(data["floors"], list)
    assert data["floors"]


def test_command_center_map_returns_known_locations():
    response = client.get("/api/command-center/map")

    assert response.status_code == 200

    data = response.json()

    returned_location_keys = {
        location["location_key"]
        for floor in data["floors"]
        for location in floor["locations"]
    }

    assert set(LOCATIONS.keys()).issubset(returned_location_keys)


def test_command_center_map_groups_incident_by_location():
    original_incidents = list(state.incidents_db)

    try:
        state.incidents_db.clear()
        state.incidents_db.append(
            {
                "id": "test_incident_001",
                "incidentType": "physical_altercation",
                "location": "lobby",
                "status": "open",
                "priority": "high",
                "createdAt": "2026-05-19T01:20:00",
            }
        )

        response = client.get("/api/command-center/map")

        assert response.status_code == 200

        data = response.json()

        lobby_location = None

        for floor in data["floors"]:
            for location in floor["locations"]:
                if location["location_key"] == "lobby":
                    lobby_location = location

        assert lobby_location is not None
        assert len(lobby_location["active_incidents"]) == 1
        assert lobby_location["active_incidents"][0]["id"] == "test_incident_001"

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)


def test_command_center_map_excludes_resolved_incidents():
    original_incidents = list(state.incidents_db)

    try:
        state.incidents_db.clear()
        state.incidents_db.append(
            {
                "id": "test_incident_resolved",
                "incidentType": "physical_altercation",
                "location": "lobby",
                "status": "resolved",
                "priority": "low",
                "createdAt": "2026-05-19T01:20:00",
            }
        )

        response = client.get("/api/command-center/map")

        assert response.status_code == 200

        data = response.json()

        lobby_location = None

        for floor in data["floors"]:
            for location in floor["locations"]:
                if location["location_key"] == "lobby":
                    lobby_location = location

        assert lobby_location is not None
        assert lobby_location["active_incidents"] == []

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)


def test_command_center_map_groups_officers_by_location():
    original_officers = list(state.officers_db)

    try:
        state.officers_db.clear()
        state.officers_db.append(
            {
                "id": "go_test_001",
                "name": "Officer Test",
                "badge": "SO-TEST",
                "status": "available",
                "location": "command_center",
                "task": None,
                "online": True,
                "assignedIncidentId": None,
            }
        )

        response = client.get("/api/command-center/map")

        assert response.status_code == 200

        data = response.json()

        command_center_location = None

        for floor in data["floors"]:
            for location in floor["locations"]:
                if location["location_key"] == "command_center":
                    command_center_location = location

        assert command_center_location is not None
        assert len(command_center_location["officers"]) == 1
        assert command_center_location["officers"][0]["id"] == "go_test_001"

    finally:
        state.officers_db.clear()
        state.officers_db.extend(original_officers)


def test_command_center_map_ignores_unknown_incident_location():
    original_incidents = list(state.incidents_db)

    try:
        state.incidents_db.clear()
        state.incidents_db.append(
            {
                "id": "test_unknown_location",
                "incidentType": "physical_altercation",
                "location": "not_a_real_location",
                "status": "open",
                "priority": "high",
                "createdAt": "2026-05-19T01:20:00",
            }
        )

        response = client.get("/api/command-center/map")

        assert response.status_code == 200

        data = response.json()

        all_incident_ids = [
            incident["id"]
            for floor in data["floors"]
            for location in floor["locations"]
            for incident in location["active_incidents"]
        ]

        assert "test_unknown_location" not in all_incident_ids

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)

def test_command_center_map_returns_location_summary_fields():
    response = client.get("/api/command-center/map")

    assert response.status_code == 200

    data = response.json()

    for floor in data["floors"]:
        for location in floor["locations"]:
            assert "incident_count" in location
            assert "officer_count" in location
            assert "highest_priority" in location

            assert isinstance(location["incident_count"], int)
            assert isinstance(location["officer_count"], int)
            assert location["highest_priority"] in {"green", "yellow", "red"}

def test_command_center_map_highest_priority_uses_most_severe_incident():
    original_incidents = list(state.incidents_db)

    try:
        state.incidents_db.clear()
        state.incidents_db.extend(
            [
                {
                    "id": "test_yellow_incident",
                    "incidentType": "unauthorized_access",
                    "location": "lobby",
                    "status": "open",
                    "priority": "yellow",
                    "createdAt": "2026-05-19T01:20:00",
                },
                {
                    "id": "test_red_incident",
                    "incidentType": "physical_altercation",
                    "location": "lobby",
                    "status": "open",
                    "priority": "red",
                    "createdAt": "2026-05-19T01:21:00",
                },
            ]
        )

        response = client.get("/api/command-center/map")

        assert response.status_code == 200

        data = response.json()

        lobby_location = None

        for floor in data["floors"]:
            for location in floor["locations"]:
                if location["location_key"] == "lobby":
                    lobby_location = location

        assert lobby_location is not None
        assert lobby_location["incident_count"] == 2
        assert lobby_location["highest_priority"] == "red"

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)

def test_command_center_map_empty_location_has_green_priority():
    original_incidents = list(state.incidents_db)

    try:
        state.incidents_db.clear()

        response = client.get("/api/command-center/map")

        assert response.status_code == 200

        data = response.json()

        for floor in data["floors"]:
            for location in floor["locations"]:
                assert location["incident_count"] == 0
                assert location["highest_priority"] == "green"

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)