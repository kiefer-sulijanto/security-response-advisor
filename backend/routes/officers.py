from fastapi import APIRouter, HTTPException
from app import state
from schema import UpdateOfficerRequest

from datetime import datetime, timezone

from config.locations import is_valid_location
from routes.events import notify


router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

@router.get("/api/officers")
def get_officers():
    return state.officers_db


@router.patch("/api/officers/{officer_id}")
def update_officer(officer_id: str, req: UpdateOfficerRequest):
    for officer in state.officers_db:
        if officer["id"] == officer_id:
            if req.status is not None:
                officer["status"] = req.status
                officer["lastSeenAt"] = _now_iso()
            if req.location is not None:
                if not is_valid_location(req.location):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid officer location: {req.location}",
                    )

                officer["location"] = req.location
                officer["lastSeenAt"] = _now_iso()
            if req.task is not None:
                officer["task"] = req.task
                officer["lastSeenAt"] = _now_iso()
            if req.online is not None:
                officer["online"] = req.online
                officer["lastSeenAt"] = _now_iso()
            notify("officer_updated")
            return officer
    raise HTTPException(status_code=404, detail="Officer not found")
