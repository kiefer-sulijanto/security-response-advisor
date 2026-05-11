import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app import state
from schema import CreateDispatchRequest, UpdateDispatchRequest

router = APIRouter()


@router.get("/api/dispatches")
def get_dispatches(officerId: Optional[str] = Query(default=None)):
    if officerId:
        return [d for d in state.dispatches_db if d["officerId"] == officerId]
    return state.dispatches_db


@router.post("/api/dispatches", status_code=201)
def create_dispatch(req: CreateDispatchRequest):
    for officer in state.officers_db:
        if officer["id"] == req.officerId:
            officer["status"] = "responding"
            break

    for incident in state.incidents_db:
        if incident["id"] == req.incidentId:
            incident["assignedTo"] = req.officerId
            break

    linked_incident = next((i for i in state.incidents_db if i["id"] == req.incidentId), None)
    incident_type = linked_incident["incidentType"] if linked_incident else req.incidentId
    incident_location = linked_incident["location"] if linked_incident else req.location

    now = datetime.now()
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
    return dispatch


@router.patch("/api/dispatches/{dispatch_id}")
def update_dispatch(dispatch_id: str, req: UpdateDispatchRequest):
    for dispatch in state.dispatches_db:
        if dispatch["id"] == dispatch_id:
            dispatch["status"] = req.status

            if req.status == "in_progress":
                for incident in state.incidents_db:
                    if incident["id"] == dispatch.get("incidentId"):
                        incident["status"] = "in_progress"
                        break

            elif req.status == "resolved":
                for officer in state.officers_db:
                    if officer["id"] == dispatch["officerId"]:
                        officer["status"] = "patrolling"
                        break
                for incident in state.incidents_db:
                    if incident["id"] == dispatch.get("incidentId"):
                        incident["status"] = "resolved"
                        break

            return dispatch
    raise HTTPException(status_code=404, detail="Dispatch not found")
