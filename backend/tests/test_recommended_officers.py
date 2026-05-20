from fastapi.testclient import TestClient

from app import state
from server import app

client = TestClient(app)


def test_recommends_nearest_available_officers():
    original_incidents = list(state.incidents_db)
    original_officers = list(state.officers_db)

    try:
        state.incidents_db.clear()
        state.officers_db.clear()

        state.incidents_db.append(
            {
                "id": "inc_recommend_test",
                "incidentType": "physical_altercation",
                "location": "server_room",
                "status": "open",
                "priority": "red",
                "createdAt": "2026-05-19T01:20:00",
            }
        )

        state.officers_db.extend(
            [
                {
                    "id": "go_far",
                    "name": "Far Officer",
                    "badge": "SO-FAR",
                    "status": "patrolling",
                    "location": "parking_area",
                    "online": True,
                    "assignedIncidentId": None,
                },
                {
                    "id": "go_near",
                    "name": "Near Officer",
                    "badge": "SO-NEAR",
                    "status": "patrolling",
                    "location": "meeting_room",
                    "online": True,
                    "assignedIncidentId": None,
                },
                {
                    "id": "go_same",
                    "name": "Same Location Officer",
                    "badge": "SO-SAME",
                    "status": "patrolling",
                    "location": "server_room",
                    "online": True,
                    "assignedIncidentId": None,
                },
            ]
        )

        response = client.get("/api/incidents/inc_recommend_test/recommended-officers")

        assert response.status_code == 200

        data = response.json()
        recommendations = data["recommendedOfficers"]

        assert data["incidentId"] == "inc_recommend_test"
        assert data["incidentLocation"] == "server_room"

        assert [officer["id"] for officer in recommendations] == [
            "go_same",
            "go_near",
            "go_far",
        ]

        assert recommendations[0]["distanceScore"] == 0
        assert recommendations[0]["reason"] == "Already at incident location"

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)

        state.officers_db.clear()
        state.officers_db.extend(original_officers)


def test_recommendations_exclude_busy_or_assigned_officers():
    original_incidents = list(state.incidents_db)
    original_officers = list(state.officers_db)

    try:
        state.incidents_db.clear()
        state.officers_db.clear()

        state.incidents_db.append(
            {
                "id": "inc_busy_test",
                "incidentType": "unattended_bag",
                "location": "lobby",
                "status": "open",
                "priority": "yellow",
                "createdAt": "2026-05-19T01:20:00",
            }
        )

        state.officers_db.extend(
            [
                {
                    "id": "go_available",
                    "name": "Available Officer",
                    "badge": "SO-AVL",
                    "status": "patrolling",
                    "location": "lobby",
                    "online": True,
                    "assignedIncidentId": None,
                },
                {
                    "id": "go_responding",
                    "name": "Responding Officer",
                    "badge": "SO-RSP",
                    "status": "responding",
                    "location": "lobby",
                    "online": True,
                    "assignedIncidentId": None,
                },
                {
                    "id": "go_assigned",
                    "name": "Assigned Officer",
                    "badge": "SO-ASG",
                    "status": "patrolling",
                    "location": "lobby",
                    "online": True,
                    "assignedIncidentId": "some_other_incident",
                },
            ]
        )

        response = client.get("/api/incidents/inc_busy_test/recommended-officers")

        assert response.status_code == 200

        data = response.json()
        recommendation_ids = [
            officer["id"] for officer in data["recommendedOfficers"]
        ]

        assert recommendation_ids == ["go_available"]
        assert "go_responding" not in recommendation_ids
        assert "go_assigned" not in recommendation_ids

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)

        state.officers_db.clear()
        state.officers_db.extend(original_officers)


def test_recommendations_return_only_top_three_officers():
    original_incidents = list(state.incidents_db)
    original_officers = list(state.officers_db)

    try:
        state.incidents_db.clear()
        state.officers_db.clear()

        state.incidents_db.append(
            {
                "id": "inc_top_three_test",
                "incidentType": "unauthorized_access",
                "location": "lobby",
                "status": "open",
                "priority": "yellow",
                "createdAt": "2026-05-19T01:20:00",
            }
        )

        for index in range(5):
            state.officers_db.append(
                {
                    "id": f"go_test_{index}",
                    "name": f"Officer {index}",
                    "badge": f"SO-{index}",
                    "status": "patrolling",
                    "location": "lobby",
                    "online": True,
                    "assignedIncidentId": None,
                }
            )

        response = client.get("/api/incidents/inc_top_three_test/recommended-officers")

        assert response.status_code == 200

        data = response.json()

        assert len(data["recommendedOfficers"]) == 3

    finally:
        state.incidents_db.clear()
        state.incidents_db.extend(original_incidents)

        state.officers_db.clear()
        state.officers_db.extend(original_officers)


def test_recommendations_return_404_for_unknown_incident():
    response = client.get("/api/incidents/not_a_real_incident/recommended-officers")

    assert response.status_code == 404