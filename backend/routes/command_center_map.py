from fastapi import APIRouter

from datetime import datetime, timezone

from config.locations import LOCATIONS
from app import state

router = APIRouter(prefix="/api/command-center", tags=["Command Center Map"])


def _is_active_incident(incident: dict) -> bool:
    status = str(incident.get("status", "")).lower()
    return status not in {"resolved", "closed", "dismissed"}

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _get_incident_location(incident: dict) -> str | None:
    return (
        incident.get("location")
        or incident.get("incidentLocation")
        or incident.get("incident_location")
    )

def _get_highest_priority(active_incidents: list[dict]) -> str:
    priority_rank = {
        "red": 3,
        "yellow": 2,
        "green": 1,
    }

    highest = "green"

    for incident in active_incidents:
        priority = str(
            incident.get("priority")
            or incident.get("flag")
            or incident.get("severity")
            or "green"
        ).lower()

        if priority_rank.get(priority, 0) > priority_rank.get(highest, 0):
            highest = priority

    return highest

def _format_incident_for_map(incident: dict) -> dict:
    return {
        "id": incident.get("id"),
        "incidentType": (
            incident.get("incidentType")
            or incident.get("incident_type")
            or incident.get("name")
        ),
        "status": incident.get("status"),
        "priority": incident.get("priority") or incident.get("flag"),
        "riskScore": incident.get("risk_score") or incident.get("riskScore"),
        "createdAt": incident.get("createdAt") or incident.get("created_at"),
        "assignedTo": incident.get("assignedTo") or incident.get("assigned_to"),
        "hasSnapshot": bool(
            incident.get("snapshotBase64")
            or incident.get("snapshot_base64")
        ),
    }


def _format_officer_for_map(officer: dict) -> dict:
    return {
        "id": officer.get("id"),
        "name": officer.get("name"),
        "badge": officer.get("badge"),
        "status": officer.get("status"),
        "task": officer.get("task"),
        "online": officer.get("online"),
        "assignedIncidentId": (
            officer.get("assignedIncidentId")
            or officer.get("assigned_incident_id")
        ),
        "lastSeenAt": officer.get("lastSeenAt") or officer.get("last_seen_at"),
    }


@router.get("/map")
def get_command_center_map():
    floors_by_key = {}

    for location_key, location in LOCATIONS.items():
        floor_key = location.get("floor", "unknown")
        floor_label = location.get("floor_label", floor_key.replace("_", " ").title())

        if floor_key not in floors_by_key:
            floors_by_key[floor_key] = {
                "floor_key": floor_key,
                "floor_label": floor_label,
                "locations": [],
            }

        active_incidents = []
        for incident in state.incidents_db:
            incident_location = _get_incident_location(incident)

            if incident_location == location_key and _is_active_incident(incident):
                active_incidents.append(_format_incident_for_map(incident))

        officers = []
        for officer in state.officers_db:
            officer_location = officer.get("location") or officer.get("current_location")

            if officer_location == location_key and officer.get("online"):
                officers.append(_format_officer_for_map(officer))

        highest_priority = _get_highest_priority(active_incidents)

        floors_by_key[floor_key]["locations"].append(
            {
                "location_key": location_key,
                "location_label": location.get("label", location_key),
                "type": location.get("type", "area"),

                # frontend summary fields
                "incident_count": len(active_incidents),
                "officer_count": len(officers),
                "highest_priority": highest_priority,

                # detailed data
                "active_incidents": active_incidents,
                "officers": officers,
            }
        )

    return {
        "lastUpdated": _now_iso(),
        "floors": list(floors_by_key.values()),
    }