from fastapi import APIRouter, HTTPException

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
                officer["location"] = req.location
            if req.task is not None:
                officer["task"] = req.task
            return officer
    raise HTTPException(status_code=404, detail="Officer not found")
