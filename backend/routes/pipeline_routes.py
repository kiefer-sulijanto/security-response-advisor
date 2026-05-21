import base64
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from time import perf_counter

from app import state
from app.helpers import (
    _cache_latest_cctv_snapshot,
    _decode_base64_image,
    _persist_pipeline_results,
    _run_ai_analysis_for_incident,
)
from schema import AccessLogRequest, CCTVDetectionRequest, CCTVFrameRequest, ManualEventRequest

router = APIRouter()


@router.post("/api/pipeline/cctv")
def pipeline_cctv(req: CCTVDetectionRequest, background_tasks: BackgroundTasks):
    raw_detection = {
        "label": req.label,
        "location": req.location,
        "camera_id": req.camera_id,
        "confidence": req.confidence,
        "timestamp": req.timestamp,
        "in_restricted_area": req.in_restricted_area,
    }

    results = state.pipeline.process_cctv_input(raw_detection)
    persisted = _persist_pipeline_results(results, "CCTV Pipeline", snapshot_base64=req.image_base64)

    for incident_id in persisted["created_incident_ids"]:
        background_tasks.add_task(_run_ai_analysis_for_incident, incident_id)

    return {
        "results": results,
        "incidents_created": persisted["created_count"],
        "created_incident_ids": persisted["created_incident_ids"],
    }


@router.post("/api/pipeline/cctv/frame")
def pipeline_cctv_frame(req: CCTVFrameRequest, background_tasks: BackgroundTasks):
    request_start = perf_counter()
    timing = {}

    try:
        decode_start = perf_counter()
        frame = _decode_base64_image(req.image_base64)
        timing["decode_seconds"] = perf_counter() - decode_start
    except (ValueError, TypeError, base64.binascii.Error) as e:
        raise HTTPException(status_code=400, detail=f"Invalid frame payload: {str(e)}")

    cache_start = perf_counter()
    _cache_latest_cctv_snapshot(req.camera_id, req.location, req.image_base64)
    timing["snapshot_cache_seconds"] = perf_counter() - cache_start

    timestamp_override = req.timestamp
    if not timestamp_override:
        timestamp_override = datetime.now().isoformat(timespec="seconds")

    pipeline_start = perf_counter()
    pipeline_output = state.pipeline.process_cctv_frame(
        frame=frame,
        camera_id=req.camera_id,
        override_location=req.location,
        conf_threshold=req.confidence_threshold,
        timestamp_override=timestamp_override,
        include_debug=req.include_debug,
    )
    timing["pipeline_seconds"] = perf_counter() - pipeline_start

    results = pipeline_output.get("results", [])

    source_name = "Video Upload" if req.camera_id == "cam_analysis_01" else "Live Camera"

    persist_start = perf_counter()
    persisted = _persist_pipeline_results(results, source_name, req.image_base64)
    timing["incident_persist_seconds"] = perf_counter() - persist_start

    for incident_id in persisted["created_incident_ids"]:
        background_tasks.add_task(_run_ai_analysis_for_incident, incident_id)

    timing["total_seconds"] = perf_counter() - request_start

    response = {
        "results": results,
        "incidents_created": persisted["created_count"],
        "created_incident_ids": persisted["created_incident_ids"],
        "debug": pipeline_output.get("debug", {}),
    }

    if req.include_debug:
        response["timing"] = timing

    return response


@router.post("/api/pipeline/access")
def pipeline_access(req: AccessLogRequest, background_tasks: BackgroundTasks):
    raw_log = {
        "action": req.action,
        "location": req.location,
        "user_id": req.user_id,
        "door_id": req.door_id,
        "timestamp": req.timestamp,
    }

    results = state.pipeline.process_access_input(raw_log)
    persisted = _persist_pipeline_results(results, "Access Log Pipeline")

    for incident_id in persisted["created_incident_ids"]:
        background_tasks.add_task(_run_ai_analysis_for_incident, incident_id)

    return {
        "results": results,
        "incidents_created": persisted["created_count"],
        "created_incident_ids": persisted["created_incident_ids"],
    }


@router.get("/api/pipeline/events")
def pipeline_events():
    return {"events": state.pipeline.get_buffered_events()}


@router.get("/api/pipeline/cameras")
def pipeline_cameras():
    return {"camera_ids": state.pipeline.list_registered_cameras()}


@router.post("/api/pipeline/manual-event")
def pipeline_manual_event(req: ManualEventRequest, background_tasks: BackgroundTasks):
    raw_input = {
        "event_type": req.event_type,
        "location": req.location,
        "timestamp": req.timestamp,
        "source": req.source,
        "metadata": req.metadata,
    }

    results = state.pipeline.process_manual_input(raw_input)
    persisted = _persist_pipeline_results(results, "Manual Trigger")

    for incident_id in persisted["created_incident_ids"]:
        background_tasks.add_task(_run_ai_analysis_for_incident, incident_id)

    return {
        "results": results,
        "incidents_created": persisted["created_count"],
        "created_incident_ids": persisted["created_incident_ids"],
    }
