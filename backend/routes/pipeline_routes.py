import base64
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app import state
from app.helpers import (
    _cache_latest_cctv_snapshot,
    _decode_base64_image,
    _persist_pipeline_results,
)
from schema import AccessLogRequest, CCTVDetectionRequest, CCTVFrameRequest, ManualEventRequest

router = APIRouter()


@router.post("/api/pipeline/cctv")
def pipeline_cctv(req: CCTVDetectionRequest):
    raw_detection = {
        "label": req.label,
        "location": req.location,
        "camera_id": req.camera_id,
        "confidence": req.confidence,
        "timestamp": req.timestamp,
        "in_restricted_area": req.in_restricted_area,
    }

    results = state.pipeline.process_cctv_input(raw_detection)
    created = _persist_pipeline_results(results, "CCTV Pipeline", snapshot_base64=req.image_base64)

    return {
        "results": results,
        "incidents_created": created,
    }


@router.post("/api/pipeline/cctv/frame")
def pipeline_cctv_frame(req: CCTVFrameRequest):
    try:
        frame = _decode_base64_image(req.image_base64)
    except (ValueError, TypeError, base64.binascii.Error) as e:
        raise HTTPException(status_code=400, detail=f"Invalid frame payload: {str(e)}")

    _cache_latest_cctv_snapshot(req.camera_id, req.location, req.image_base64)

    timestamp_override = req.timestamp
    if not timestamp_override:
        timestamp_override = datetime.now().isoformat(timespec="seconds")

    pipeline_output = state.pipeline.process_cctv_frame(
        frame=frame,
        camera_id=req.camera_id,
        override_location=req.location,
        conf_threshold=req.confidence_threshold,
        timestamp_override=timestamp_override,
        include_debug=req.include_debug,
    )

    results = pipeline_output.get("results", [])
    created = _persist_pipeline_results(results, "CCTV Frame Pipeline", req.image_base64)

    return {
        "results": results,
        "incidents_created": created,
        "debug": pipeline_output.get("debug", {}),
    }


@router.post("/api/pipeline/access")
def pipeline_access(req: AccessLogRequest):
    raw_log = {
        "action": req.action,
        "location": req.location,
        "user_id": req.user_id,
        "door_id": req.door_id,
        "timestamp": req.timestamp,
    }

    results = state.pipeline.process_access_input(raw_log)
    created = _persist_pipeline_results(results, "Access Log Pipeline")

    return {
        "results": results,
        "incidents_created": created,
    }


@router.get("/api/pipeline/events")
def pipeline_events():
    return {"events": state.pipeline.get_buffered_events()}


@router.get("/api/pipeline/cameras")
def pipeline_cameras():
    return {"camera_ids": state.pipeline.list_registered_cameras()}


@router.post("/api/pipeline/manual-event")
def pipeline_manual_event(req: ManualEventRequest):
    raw_input = {
        "event_type": req.event_type,
        "location": req.location,
        "timestamp": req.timestamp,
        "source": req.source,
        "metadata": req.metadata,
    }

    results = state.pipeline.process_manual_input(raw_input)
    created = _persist_pipeline_results(results, "Manual Trigger")

    return {
        "results": results,
        "incidents_created": created,
    }
