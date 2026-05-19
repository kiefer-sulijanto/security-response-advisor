import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from app import state
from schema import CreateReportRequest

router = APIRouter()


@router.get("/api/reports")
def get_reports():
    return state.reports_db


@router.post("/api/reports", status_code=201)
def create_report(req: CreateReportRequest):
    now = datetime.now(timezone.utc)
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
        "timestamp": now.strftime("%H:%M"),
        "createdAt": now.isoformat(),
    }
    state.reports_db.append(report)
    return report
