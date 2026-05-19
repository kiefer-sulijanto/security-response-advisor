from fastapi import APIRouter, HTTPException
from config.locations import is_valid_location
from app import state
from schema import UpdateOfficerRequest

router = APIRouter()


@router.get("/api/officers")
def get_officers():
    return state.officers_db


@router.patch("/api/officers/{officer_id}")
def update_officer(officer_id: str, req: UpdateOfficerRequest):
    for officer in state.officers_db:
        if officer["id"] == officer_id:
            if req.status is not None:
                officer["status"] = req.status
            if req.location is not None:
                if not is_valid_location(req.location):
                    raise HTTPException(status_code=400, detail="Invalid officer location")
                officer["location"] = req.location
            if req.task is not None:
                officer["task"] = req.task
            return officer
    raise HTTPException(status_code=404, detail="Officer not found")
