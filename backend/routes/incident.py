import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app import state
from app.helpers import _normalize_flag, _pick_standby_officer
from recommendation_AI.incident_analysis import get_advisory
from schema import AnalyzeRequest, CreateIncidentRequest, UpdateIncidentRequest
from routes.events import notify

router = APIRouter()


@router.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    incident_input = {
        "incidentType": req.incidentType,
        "location": req.location,
        "source": req.source,
        "description": req.description,
    }

    try:
        advisory = get_advisory(incident_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    flag = _normalize_flag(advisory.get("flag", "green"))
    standby_officer = _pick_standby_officer()

    recommended_officer = None
    if standby_officer:
        recommended_officer = {
            **standby_officer,
            "reason": advisory.get("dispatch_unit", "Best available officer"),
        }

    return {
        "explanation": advisory.get("description", ""),
        "flag": flag,
        "flagReason": advisory.get("explanation", ""),
        "actions": advisory.get("actions", []),
        "recommendedOfficer": recommended_officer,
        "title": advisory.get("title", ""),
        "dispatch_unit": advisory.get("dispatch_unit", ""),
        "expected_response_time": advisory.get("expected_response_time", ""),
    }


@router.get("/api/incidents")
def get_incidents():
    return state.incidents_db


@router.post("/api/incidents", status_code=201)
def create_incident(req: CreateIncidentRequest):
    incident = {
        "id": str(uuid.uuid4()),
        "incidentType": req.incidentType or req.videoName or "Video Security Analysis",
        "videoName": req.videoName,
        "location": req.location or "CCTV Upload",
        "source": req.source,
        "description": req.description,
        "flag": req.flag,
        "severity": req.severity,
        "explanation": req.explanation,
        "flagReason": req.flagReason,
        "actions": req.actions,
        "aiDetails": req.aiDetails,
        "status": "open",
        "assignedTo": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "snapshot_base64": req.snapshot_base64,
    }
    state.incidents_db.append(incident)
    notify("incident_created")
    return incident


@router.patch("/api/incidents/{incident_id}")
def update_incident(incident_id: str, req: UpdateIncidentRequest):
    for incident in state.incidents_db:
        if incident["id"] == incident_id:
            if req.status is not None:
                incident["status"] = req.status
            if req.assignedTo is not None:
                incident["assignedTo"] = req.assignedTo
            notify("incident_updated")
            return incident
    raise HTTPException(status_code=404, detail="Incident not found")
