import base64
import uuid
from datetime import datetime, timedelta
from typing import Optional

import cv2
import numpy as np

from app import state

try:
    from recommendation_AI.incident_analysis import get_advisory as _get_advisory
except ImportError:
    _get_advisory = None

try:
    from routes.events import notify as _notify_sse
except ImportError:
    def _notify_sse(_: str) -> None:
        pass


def _cache_latest_cctv_snapshot(camera_id: str | None, location: str | None, snapshot_base64: str | None):
    if not camera_id or not location or not snapshot_base64:
        return
    state.latest_cctv_snapshots[(camera_id, location)] = {
        "snapshot_base64": snapshot_base64,
        "timestamp": datetime.now(),
    }


def _get_latest_cctv_snapshot(camera_id: str | None, location: str | None, max_age_seconds: int = 60) -> str | None:
    if not camera_id or not location:
        return None
    entry = state.latest_cctv_snapshots.get((camera_id, location))
    if not entry:
        return None
    ts = entry.get("timestamp")
    if not ts:
        return None
    if datetime.now() - ts > timedelta(seconds=max_age_seconds):
        return None
    return entry.get("snapshot_base64")


def _normalize_flag(flag: str) -> str:
    return (flag or "green").lower()


def _pick_standby_officer() -> Optional[dict]:
    available = [
        o for o in state.officers_db
        if o.get("online")
        and str(o.get("status", "")).lower() == "patrolling"
        and not (o.get("assignedIncidentId") or o.get("assigned_incident_id"))
    ]
    return available[0] if available else None


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


def _persist_pipeline_results(results: list[dict], source_name: str, snapshot_base64=None) -> dict:
    """Persist rule-detected incidents immediately with pending AI status.

    Returns {"created_count": int, "created_incident_ids": list[str]}.
    """
    created_count = 0
    created_incident_ids: list[str] = []
    duplicate_cooldown_seconds = 30

    for result in results:
        if result.get("is_system_error"):
            continue

        incident_data = result.get("incident_data", {})

        incident_name = incident_data.get("name")
        incident_location = incident_data.get("location", "unknown")
        incident_timestamp_str = incident_data.get("timestamp") or datetime.now().isoformat()

        if not incident_name:
            continue

        incident_timestamp = _parse_iso_timestamp(incident_timestamp_str) or datetime.now()

        camera_id = None
        for event in incident_data.get("triggering_events", []):
            metadata = event.get("metadata", {}) or {}
            if metadata.get("camera_id"):
                camera_id = metadata["camera_id"]
                break

        effective_snapshot = None
        for event in incident_data.get("triggering_events", []):
            event_meta = event.get("metadata", {}) or {}
            if event_meta.get("snapshot_base64"):
                effective_snapshot = event_meta["snapshot_base64"]
                break

        if not effective_snapshot:
            effective_snapshot = snapshot_base64
        if not effective_snapshot:
            effective_snapshot = _get_latest_cctv_snapshot(camera_id, incident_location)

        is_duplicate = False
        for existing in reversed(state.incidents_db):
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
            if existing_ts < incident_timestamp - timedelta(seconds=duplicate_cooldown_seconds):
                break

        if is_duplicate:
            continue

        incident = {
            "id": str(uuid.uuid4()),
            "incidentType": incident_name,
            "location": incident_location,
            "source": source_name,
            "camera_id": camera_id,
            "cameraId": camera_id,
            "description": incident_data.get("description", ""),
            "flag": "yellow",
            "severity": "warning",
            "explanation": "Incident detected by rule engine. AI analysis is being generated.",
            "flagReason": "AI analysis pending",
            "actions": [
                "Review the incident immediately",
                "Check CCTV snapshot and location",
                "Wait for AI advisory update",
            ],
            "aiDetails": None,
            "aiStatus": "pending",
            "aiUpdatedAt": None,
            "status": "open",
            "assignedTo": None,
            "createdAt": incident_timestamp.isoformat(),
            "snapshot_base64": effective_snapshot,
        }

        state.incidents_db.append(incident)
        created_count += 1
        created_incident_ids.append(incident["id"])
        _notify_sse("incident_created")

    return {"created_count": created_count, "created_incident_ids": created_incident_ids}


def _run_ai_analysis_for_incident(incident_id: str) -> None:
    """Background task: call AI advisory and update the incident in-place."""
    incident = next((inc for inc in state.incidents_db if inc["id"] == incident_id), None)
    if not incident:
        return

    incident["aiStatus"] = "analyzing"
    _notify_sse("incident_updated")

    if _get_advisory is None:
        incident["aiStatus"] = "failed"
        incident["aiError"] = "AI advisory module not available"
        incident["aiUpdatedAt"] = datetime.now().isoformat()
        _notify_sse("incident_updated")
        return

    incident_input = {
        "incidentType": incident.get("incidentType", ""),
        "location": incident.get("location", ""),
        "source": incident.get("source", ""),
        "description": incident.get("description", ""),
    }

    try:
        advisory = _get_advisory(incident_input)
        incident["flag"] = _normalize_flag(advisory.get("flag", "yellow"))
        incident["explanation"] = advisory.get("description", "")
        incident["flagReason"] = advisory.get("explanation", "")
        incident["actions"] = advisory.get("actions", [])
        incident["aiDetails"] = advisory
        incident["aiStatus"] = "completed"
        incident["aiUpdatedAt"] = datetime.now().isoformat()
    except Exception as e:
        incident["aiStatus"] = "failed"
        incident["aiError"] = str(e)
        incident["aiUpdatedAt"] = datetime.now().isoformat()
        incident["explanation"] = (
            f"AI advisory could not be generated for this incident ({e}). "
            "The rule-engine baseline classification is in effect — please review manually."
        )
        incident["flagReason"] = "AI analysis failed"

    _notify_sse("incident_updated")
