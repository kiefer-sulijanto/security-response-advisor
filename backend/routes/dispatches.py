import uuid

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app import state
from schema import CreateDispatchRequest, UpdateDispatchRequest

from datetime import datetime, timezone
from config.locations import LOCATIONS
from routes.events import notify

router = APIRouter()

VALID_DISPATCH_STATUSES = {"unread", "acknowledged", "in_progress", "resolved"}

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_location_label(location_key: str | None) -> str:
    if not location_key:
        return "Unknown Location"

    location = LOCATIONS.get(location_key)
    if not location:
        return location_key.replace("_", " ").title()

    return location.get("label", location_key.replace("_", " ").title())


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


@router.get("/api/dispatches")
def get_dispatches(officerId: Optional[str] = Query(default=None)):
    if officerId:
        return [d for d in state.dispatches_db if d["officerId"] == officerId]
    return state.dispatches_db


@router.post("/api/dispatches", status_code=201)
def create_dispatch(req: CreateDispatchRequest):
    linked_officer = next(
    (officer for officer in state.officers_db if officer["id"] == req.officerId),
    None,
    )

    linked_incident = next(
        (incident for incident in state.incidents_db if incident["id"] == req.incidentId),
        None,
    )

    if linked_officer is None:
        raise HTTPException(status_code=404, detail="Officer not found")

    assigned_incident_id = (
        linked_officer.get("assignedIncidentId")
        or linked_officer.get("assigned_incident_id")
    )

    if (
        not linked_officer.get("online")
        or str(linked_officer.get("status", "")).lower() != "patrolling"
        or assigned_incident_id
    ):
        raise HTTPException(
            status_code=409,
            detail="Officer is not available for dispatch",
        )


    if linked_incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident_type = _get_incident_type(linked_incident)
    incident_location = _get_incident_location(linked_incident) or req.location
    location_label = _get_location_label(incident_location)

    linked_officer["status"] = "responding"
    linked_officer["assignedIncidentId"] = req.incidentId
    linked_officer["assigned_incident_id"] = req.incidentId
    linked_officer["task"] = f"Respond to {incident_type} at {location_label}"
    linked_officer["lastSeenAt"] = _now_iso()

    linked_incident["assignedTo"] = req.officerId
    linked_incident["assigned_to"] = req.officerId
    linked_incident["updatedAt"] = _now_iso()

    now = datetime.now(timezone.utc)

    dispatch = {
        "id": str(uuid.uuid4()),
        "incidentId": req.incidentId,
        "incidentType": incident_type,
        "incidentLocation": incident_location,
        "officerId": req.officerId,
        "instruction": req.instruction,
        "location": req.location or incident_location,
        "priority": req.priority or "high",
        "status": "unread",
        "timestamp": now.strftime("%H:%M"),
        "createdAt": now.isoformat(),
    }
    state.dispatches_db.append(dispatch)
    notify("dispatch_created")
    return dispatch


@router.patch("/api/dispatches/{dispatch_id}")
def update_dispatch(dispatch_id: str, req: UpdateDispatchRequest):
    if req.status not in VALID_DISPATCH_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{req.status}'. Must be one of: {sorted(VALID_DISPATCH_STATUSES)}",
        )

    for dispatch in state.dispatches_db:
        if dispatch["id"] == dispatch_id:
            dispatch["status"] = req.status

            if req.status == "in_progress":
                for incident in state.incidents_db:
                    if incident["id"] == dispatch.get("incidentId"):
                        incident["status"] = "in_progress"
                        incident["updatedAt"] = _now_iso()
                        break

            elif req.status == "resolved":
                for officer in state.officers_db:
                    if officer["id"] == dispatch["officerId"]:

                        officer_is_online = bool(officer.get("online"))
                        officer["status"] = "patrolling" if officer_is_online else "offline"
                        officer["assignedIncidentId"] = None
                        officer["assigned_incident_id"] = None
                        officer["task"] = "On Patrol" if officer_is_online else None
                        officer["lastSeenAt"] = _now_iso()
                        break
                for incident in state.incidents_db:
                    if incident["id"] == dispatch.get("incidentId"):
                        incident["status"] = "resolved"
                        incident["updatedAt"] = _now_iso()
                        break
                

            notify("dispatch_updated")
            return dispatch
    raise HTTPException(status_code=404, detail="Dispatch not found")
