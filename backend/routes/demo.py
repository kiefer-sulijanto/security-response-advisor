import copy

from fastapi import APIRouter

from app import state

router = APIRouter()


@router.post("/api/demo/reset")
def reset_demo_state():
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
