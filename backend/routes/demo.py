import copy
import os

from fastapi import APIRouter, Header, HTTPException

from app import state

router = APIRouter()

_DEMO_SECRET = os.getenv("DEMO_RESET_SECRET", "")


@router.post("/api/demo/reset")
def reset_demo_state(x_demo_secret: str = Header(default="")):
    if not _DEMO_SECRET or x_demo_secret != _DEMO_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    state.incidents_db.clear()
    state.dispatches_db.clear()
    state.reports_db.clear()

    state.officers_db.clear()
    state.officers_db.extend(copy.deepcopy(state.INITIAL_OFFICERS_DB))

    state.pipeline.reset_state()

    return {
        "status": "ok",
        "message": "Demo state cleared successfully",
    }
