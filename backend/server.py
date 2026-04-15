import base64
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import copy
import os

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend root is on sys.path for submodule imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from services.pipeline import PipelineService
from recommendation_AI.incident_analysis import get_advisory

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Certis Security Management API")

frontend_origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------

officers_db: list[dict] = [
    {"id": "go1", "name": "John Tan",   "badge": "SO-1024", "status": "standby", "location": "Main Lobby",      "task": None},
    {"id": "go2", "name": "Sarah Lim",  "badge": "SO-2031", "status": "standby", "location": "Floor 3",         "task": None},
    {"id": "go3", "name": "Mike Chen",  "badge": "SO-1156", "status": "standby", "location": "Basement B1",     "task": None},
    {"id": "go4", "name": "Amy Koh",    "badge": "SO-3042", "status": "standby", "location": "Perimeter Gate",  "task": None},
]

INITIAL_OFFICERS_DB = copy.deepcopy(officers_db)

incidents_db: list[dict] = []
dispatches_db: list[dict] = []
reports_db: list[dict] = []

# ---------------------------------------------------------------------------
# Pipeline (shared instance — persists event buffer across requests)
# ---------------------------------------------------------------------------

pipeline = PipelineService(window_seconds=120, enable_advisory=True)

# ---------------------------------------------------------------------------
# Camera configuration
# ---------------------------------------------------------------------------

CAMERA_REGISTRY = [
    {
        "camera_id": "cam_01",
        "model_path": "models/yolov8n.pt",
        "location": "server_room",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_01": []
        }
    },
    {
        "camera_id": "cam_02",
        "model_path": "models/yolov8n.pt",
        "location": "lobby",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_02": []
        }
    },
    {
        "camera_id": "cam_03",
        "model_path": "models/yolov8n.pt",
        "location": "main_gate",
        "conf_threshold": 0.7,
        "restricted_zones": {
            "cam_03": []
        }
    }
]
    

for cam in CAMERA_REGISTRY:
    pipeline.register_camera(
        camera_id=cam["camera_id"],
        model_path=cam["model_path"],
        location=cam["location"],
        conf_threshold=cam["conf_threshold"],
        restricted_zones=cam["restricted_zones"],
    )

# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    incidentType: str
    location: str
    source: str = "CCTV"
    description: str = ""


class CreateIncidentRequest(BaseModel):
    incidentType: Optional[str] = None
    videoName: Optional[str] = None
    location: Optional[str] = None
    source: str = "CCTV"
    description: str = ""
    flag: str = "green"
    severity: Optional[str] = None
    explanation: str = ""
    flagReason: str = ""
    actions: list[str] = []
    aiDetails: Optional[dict] = None


class UpdateIncidentRequest(BaseModel):
    status: Optional[str] = None
    assignedTo: Optional[str] = None


class UpdateOfficerRequest(BaseModel):
    status: Optional[str] = None
    location: Optional[str] = None
    task: Optional[str] = None


class CreateDispatchRequest(BaseModel):
    incidentId: str
    officerId: str
    instruction: str
    location: Optional[str] = None


class UpdateDispatchRequest(BaseModel):
    status: str


class CreateReportRequest(BaseModel):
    officerId: str
    officerName: Optional[str] = None
    officerBadge: Optional[str] = None
    type: Optional[str] = None
    incidentType: Optional[str] = None
    location: str
    description: str
    severity: Optional[str] = "low"


class CCTVDetectionRequest(BaseModel):
    label: str
    location: str
    camera_id: Optional[str] = None
    confidence: float = 1.0
    timestamp: Optional[str] = None
    in_restricted_area: bool = False


class CCTVFrameRequest(BaseModel):
    image_base64: str
    camera_id: str
    location: Optional[str] = None
    confidence_threshold: Optional[float] = None
    frame_timestamp_seconds: Optional[float] = None
    timestamp: Optional[str] = None
    include_debug: bool = False


class AccessLogRequest(BaseModel):
    action: str
    location: str
    user_id: Optional[str] = None
    door_id: Optional[str] = None
    timestamp: Optional[str] = None

class ManualEventRequest(BaseModel):
    event_type: str
    location: str
    timestamp: Optional[str] = None
    source: str = "manual_trigger"
    metadata: Optional[dict] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_flag(flag: str) -> str:
    return (flag or "green").lower()


def _pick_standby_officer() -> Optional[dict]:
    standby = [o for o in officers_db if o["status"] == "standby"]
    return standby[0] if standby else None


def _decode_base64_image(image_base64: str):
    raw = image_base64.strip()
    if "," in raw:
        raw = raw.split(",", 1)[1]

    image_bytes = base64.b64decode(raw)
    image_np = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(image_np, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Invalid image payload")

    return frame

def _parse_iso_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None

def _persist_pipeline_results(results: list[dict], source_name: str) -> int:
    created_count = 0
    duplicate_cooldown_seconds = 30

    for result in results:
        if result.get("is_system_error"):
            continue

        advisory = result.get("advisory", {})
        incident_data = result.get("incident_data", {})

        incident_name = incident_data.get("name")
        incident_location = incident_data.get("location", "unknown")
        incident_timestamp_str = incident_data.get("timestamp") or datetime.now().isoformat()

        if not incident_name:
            continue

        incident_timestamp = _parse_iso_timestamp(incident_timestamp_str) or datetime.now()

        is_duplicate = False
        for existing in reversed(incidents_db):
            if existing.get("incidentType") != incident_name:
                continue
            if existing.get("location") != incident_location:
                continue

            existing_ts = _parse_iso_timestamp(existing.get("createdAt"))
            if existing_ts is None:
                continue

            age_seconds = abs((incident_timestamp - existing_ts).total_seconds())
            if age_seconds <= duplicate_cooldown_seconds:
                is_duplicate = True
                break

            # Since we scan newest first, we can stop once records are clearly older
            if existing_ts < incident_timestamp - timedelta(seconds=duplicate_cooldown_seconds):
                break

        if is_duplicate:
            continue

        incident = {
            "id": str(uuid.uuid4()),
            "incidentType": incident_name,
            "location": incident_location,
            "source": source_name,
            "description": incident_data.get("description", ""),
            "flag": _normalize_flag(advisory.get("flag", "green")),
            "severity": None,
            "explanation": advisory.get("description", ""),
            "flagReason": advisory.get("explanation", ""),
            "actions": advisory.get("actions", []),
            "aiDetails": advisory,
            "status": "open",
            "assignedTo": None,
            "createdAt": incident_timestamp.isoformat(),
        }

        incidents_db.append(incident)
        created_count += 1

    return created_count


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ---------------------------------------------------------------------------
# /api/analyze
# ---------------------------------------------------------------------------

@app.post("/api/analyze")
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


# ---------------------------------------------------------------------------
# /api/incidents
# ---------------------------------------------------------------------------

@app.get("/api/incidents")
def get_incidents():
    return incidents_db


@app.post("/api/incidents", status_code=201)
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
        "createdAt": datetime.now().isoformat(),
    }
    incidents_db.append(incident)
    return incident


@app.patch("/api/incidents/{incident_id}")
def update_incident(incident_id: str, req: UpdateIncidentRequest):
    for incident in incidents_db:
        if incident["id"] == incident_id:
            if req.status is not None:
                incident["status"] = req.status
            if req.assignedTo is not None:
                incident["assignedTo"] = req.assignedTo
            return incident
    raise HTTPException(status_code=404, detail="Incident not found")


# ---------------------------------------------------------------------------
# /api/officers
# ---------------------------------------------------------------------------

@app.get("/api/officers")
def get_officers():
    return officers_db



@app.patch("/api/officers/{officer_id}")
def update_officer(officer_id: str, req: UpdateOfficerRequest):
    for officer in officers_db:
        if officer["id"] == officer_id:
            if req.status is not None:
                officer["status"] = req.status
            if req.location is not None:
                officer["location"] = req.location
            if req.task is not None:
                officer["task"] = req.task
            return officer
    raise HTTPException(status_code=404, detail="Officer not found")


# ---------------------------------------------------------------------------
# /api/dispatches
# ---------------------------------------------------------------------------

@app.get("/api/dispatches")
def get_dispatches(officerId: Optional[str] = Query(default=None)):
    if officerId:
        return [d for d in dispatches_db if d["officerId"] == officerId]
    return dispatches_db


@app.post("/api/dispatches", status_code=201)
def create_dispatch(req: CreateDispatchRequest):
    for officer in officers_db:
        if officer["id"] == req.officerId:
            officer["status"] = "responding"
            break

    for incident in incidents_db:
        if incident["id"] == req.incidentId:
            incident["assignedTo"] = req.officerId
            break

    linked_incident = next((i for i in incidents_db if i["id"] == req.incidentId), None)
    incident_type = linked_incident["incidentType"] if linked_incident else req.incidentId
    incident_location = linked_incident["location"] if linked_incident else req.location

    dispatch = {
        "id": str(uuid.uuid4()),
        "incidentId": req.incidentId,
        "incidentType": incident_type,
        "incidentLocation": incident_location,
        "officerId": req.officerId,
        "instruction": req.instruction,
        "location": req.location or incident_location,
        "status": "unread",
        "createdAt": datetime.now().isoformat(),
    }
    dispatches_db.append(dispatch)
    return dispatch


@app.patch("/api/dispatches/{dispatch_id}")
def update_dispatch(dispatch_id: str, req: UpdateDispatchRequest):
    for dispatch in dispatches_db:
        if dispatch["id"] == dispatch_id:
            dispatch["status"] = req.status

            if req.status == "in_progress":
                for incident in incidents_db:
                    if incident["id"] == dispatch.get("incidentId"):
                        incident["status"] = "in_progress"
                        break

            elif req.status == "resolved":
                for officer in officers_db:
                    if officer["id"] == dispatch["officerId"]:
                        officer["status"] = "patrolling"
                        break
                for incident in incidents_db:
                    if incident["id"] == dispatch.get("incidentId"):
                        incident["status"] = "resolved"
                        break

            return dispatch
    raise HTTPException(status_code=404, detail="Dispatch not found")


# ---------------------------------------------------------------------------
# /api/reports
# ---------------------------------------------------------------------------

@app.get("/api/reports")
def get_reports():
    return reports_db


@app.post("/api/reports", status_code=201)
def create_report(req: CreateReportRequest):
    report = {
        "id": str(uuid.uuid4()),
        "officerId": req.officerId,
        "officerName": req.officerName,
        "officerBadge": req.officerBadge,
        "type": req.type or req.incidentType or "General Report",
        "incidentType": req.type or req.incidentType or "General Report",
        "location": req.location,
        "description": req.description,
        "severity": req.severity,
        "timestamp": datetime.now().strftime("%H:%M"),
        "createdAt": datetime.now().isoformat(),
    }
    reports_db.append(report)
    return report


# ---------------------------------------------------------------------------
# /api/pipeline
# ---------------------------------------------------------------------------

@app.post("/api/pipeline/cctv")
def pipeline_cctv(req: CCTVDetectionRequest):
    raw_detection = {
        "label": req.label,
        "location": req.location,
        "camera_id": req.camera_id,
        "confidence": req.confidence,
        "timestamp": req.timestamp,
        "in_restricted_area": req.in_restricted_area,
    }

    results = pipeline.process_cctv_input(raw_detection)
    created = _persist_pipeline_results(results, "CCTV Pipeline")

    return {
        "results": results,
        "incidents_created": created,
    }


@app.post("/api/pipeline/cctv/frame")
def pipeline_cctv_frame(req: CCTVFrameRequest):
    try:
        frame = _decode_base64_image(req.image_base64)
    except (ValueError, TypeError, base64.binascii.Error) as e:
        raise HTTPException(status_code=400, detail=f"Invalid frame payload: {str(e)}")

    timestamp_override = req.timestamp
    if not timestamp_override and req.frame_timestamp_seconds is not None:
        timestamp_override = (
            datetime.now() + timedelta(seconds=req.frame_timestamp_seconds)
        ).isoformat(timespec="seconds")

    pipeline_output = pipeline.process_cctv_frame(
        frame=frame,
        camera_id=req.camera_id,
        override_location=req.location,
        conf_threshold=req.confidence_threshold,
        timestamp_override=timestamp_override,
        include_debug=req.include_debug,
    )

    results = pipeline_output.get("results", [])
    created = _persist_pipeline_results(results, "CCTV Frame Pipeline")

    return {
        "results": results,
        "incidents_created": created,
        "debug": pipeline_output.get("debug", {}),
    }


@app.post("/api/pipeline/access")
def pipeline_access(req: AccessLogRequest):
    raw_log = {
        "action": req.action,
        "location": req.location,
        "user_id": req.user_id,
        "door_id": req.door_id,
        "timestamp": req.timestamp,
    }

    results = pipeline.process_access_input(raw_log)
    created = _persist_pipeline_results(results, "Access Log Pipeline")

    return {
        "results": results,
        "incidents_created": created,
    }


@app.get("/api/pipeline/events")
def pipeline_events():
    return {"events": pipeline.get_buffered_events()}


@app.get("/api/pipeline/cameras")
def pipeline_cameras():
    return {"camera_ids": pipeline.list_registered_cameras()}

    
@app.post("/api/pipeline/manual-event")
def pipeline_manual_event(req: ManualEventRequest):
    raw_input = {
        "event_type": req.event_type,
        "location": req.location,
        "timestamp": req.timestamp,
        "source": req.source,
        "metadata": req.metadata,
    }

    results = pipeline.process_manual_input(raw_input)
    created = _persist_pipeline_results(results, "Manual Trigger")

    return {
        "results": results,
        "incidents_created": created,
    }

# ---------------------------------------------------------------------------
# /api/demo/reset
# ---------------------------------------------------------------------------


@app.post("/api/demo/reset")
def reset_demo_state():
    incidents_db.clear()
    dispatches_db.clear()
    reports_db.clear()

    officers_db.clear()
    officers_db.extend(copy.deepcopy(INITIAL_OFFICERS_DB))

    pipeline.reset_state()

    return {
        "status": "ok",
        "message": "Demo state cleared successfully",
    }