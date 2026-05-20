from fastapi import APIRouter, HTTPException

from app import state
from config.location_distances import get_location_distance
from config.locations import LOCATIONS

router = APIRouter(prefix="/api/incidents", tags=["Incident Recommendations"])

AVAILABLE_OFFICER_STATUSES = {"patrolling"}


def _get_location_label(location_key: str | None) -> str:
    if not location_key:
        return "Unknown Location"

    location = LOCATIONS.get(location_key)
    if location:
        return location.get("label", location_key.replace("_", " ").title())

    return location_key.replace("_", " ").title()


def _get_incident_type(incident: dict) -> str:
    return (
        incident.get("incidentType")
        or incident.get("incident_type")
        or incident.get("name")
        or "incident"
    )


def _get_incident_location(incident: dict) -> str | None:
    return (
        incident.get("location")
        or incident.get("incidentLocation")
        or incident.get("incident_location")
    )


def _is_available_officer(officer: dict) -> bool:
    status = str(officer.get("status", "")).lower()
    online = bool(officer.get("online"))

    assigned_incident_id = (
        officer.get("assignedIncidentId")
        or officer.get("assigned_incident_id")
    )

    return (
        online
        and status in AVAILABLE_OFFICER_STATUSES
        and not assigned_incident_id
    )


def _get_reason(distance_score: int) -> str:
    if distance_score == 0:
        return "Already at incident location"
    if distance_score == 1:
        return "Nearby location"
    if distance_score == 2:
        return "Same facility area"
    if distance_score <= 4:
        return "Reachable from current location"

    return "Location distance unknown"


@router.get("/{incident_id}/recommended-officers")
def get_recommended_officers(incident_id: str):
    incident = next(
        (item for item in state.incidents_db if item.get("id") == incident_id),
        None,
    )

    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident_location = _get_incident_location(incident)

    if not incident_location:
        raise HTTPException(
            status_code=400,
            detail="Incident has no location",
        )

    recommendations = []

    for officer in state.officers_db:
        if not _is_available_officer(officer):
            continue

        officer_location = officer.get("location") or officer.get("current_location")

        if not officer_location:
            continue

        distance_score = get_location_distance(
            from_location=incident_location,
            to_location=officer_location,
        )

        recommendations.append(
            {
                "id": officer.get("id"),
                "name": officer.get("name"),
                "badge": officer.get("badge"),
                "status": officer.get("status"),
                "currentLocation": officer_location,
                "currentLocationLabel": _get_location_label(officer_location),
                "distanceScore": distance_score,
                "reason": _get_reason(distance_score),
                "online": officer.get("online"),
                "assignedIncidentId": (
                    officer.get("assignedIncidentId")
                    or officer.get("assigned_incident_id")
                ),
            }
        )

    recommendations.sort(
        key=lambda officer: (
            officer["distanceScore"],
            not bool(officer.get("online")),
            officer.get("name") or "",
        )
    )

    return {
        "incidentId": incident.get("id"),
        "incidentType": _get_incident_type(incident),
        "incidentLocation": incident_location,
        "incidentLocationLabel": _get_location_label(incident_location),
        "recommendedOfficers": recommendations[:3],
    }