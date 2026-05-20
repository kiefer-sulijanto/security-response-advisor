"""
Integration tests for the supervisor → officer workflow.

Tests call route handler functions directly (no HTTP server required) and
inspect the shared in-memory state.  The autouse reset_state fixture in
conftest.py ensures every test starts with a clean slate.

Workflow covered:
  - Incident listing and creation
  - Dispatch creation (sets officer to "responding", links incident)
  - Dispatch status updates (in_progress → incident status; resolved → officer standby)
  - Report creation and listing
  - Manual state reset mirrors what /api/demo/reset does
"""
from __future__ import annotations

import copy
import uuid

import pytest

from app import state
from routes.dispatches import create_dispatch, get_dispatches, update_dispatch
from routes.incident import create_incident, get_incidents
from routes.reports import create_report, get_reports
from schema import (
    CreateDispatchRequest,
    CreateIncidentRequest,
    CreateReportRequest,
    UpdateDispatchRequest,
)


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def test_incident() -> dict:
    """Insert a physical_altercation incident directly into state and return it."""
    incident = {
        "id": str(uuid.uuid4()),
        "incidentType": "physical_altercation",
        "location": "lobby",
        "source": "Test Pipeline",
        "description": "Test fight incident",
        "flag": "red",
        "severity": None,
        "explanation": "Test advisory explanation",
        "flagReason": "High confidence fight detection",
        "actions": ["Dispatch officer", "Review CCTV"],
        "aiDetails": {},
        "status": "open",
        "assignedTo": None,
        "createdAt": "2026-04-15T20:00:00",
        "snapshot_base64": "test_snapshot",
    }
    state.incidents_db.append(incident)
    return incident


@pytest.fixture
def test_dispatch(test_incident) -> dict:
    """Create a dispatch for test_incident assigned to officer go1."""
    officer = next(o for o in state.officers_db if o["id"] == "go1")
    officer["status"] = "patrolling"
    officer["online"] = True

    req = CreateDispatchRequest(
        incidentId=test_incident["id"],
        officerId="go1",
        instruction="Investigate reported fight in lobby",
        location="lobby",
        priority="high",
    )
    return create_dispatch(req)


# ---------------------------------------------------------------------------
# Test 11 — GET /api/incidents returns empty list initially
# ---------------------------------------------------------------------------

def test_get_incidents_returns_empty_initially():
    result = get_incidents()
    assert result == []


# ---------------------------------------------------------------------------
# Test 12 — POST /api/incidents creates an incident
# ---------------------------------------------------------------------------

def test_create_incident_via_route():
    req = CreateIncidentRequest(
        incidentType="physical_altercation",
        location="lobby",
        source="CCTV Frame Pipeline",
        description="Fight detected at lobby camera",
        flag="red",
        snapshot_base64="snapshot_abc",
    )

    incident = create_incident(req)

    assert incident["incidentType"] == "physical_altercation"
    assert incident["location"] == "lobby"
    assert incident["status"] == "open"
    assert incident["snapshot_base64"] == "snapshot_abc"

    all_incidents = get_incidents()
    assert len(all_incidents) == 1
    assert all_incidents[0]["id"] == incident["id"]


# ---------------------------------------------------------------------------
# Test 13 — POST /api/dispatches sets officer to "responding" and links incident
# ---------------------------------------------------------------------------

def test_create_dispatch_sets_officer_responding_and_links_incident(test_incident):
    officer = next(o for o in state.officers_db if o["id"] == "go1")
    officer["status"] = "patrolling"
    officer["online"] = True

    req = CreateDispatchRequest(
        incidentId=test_incident["id"],
        officerId="go1",
        instruction="Respond to lobby fight",
        location="lobby",
        priority="high",
    )

    dispatch = create_dispatch(req)

    # Dispatch created correctly
    assert dispatch["incidentId"] == test_incident["id"]
    assert dispatch["officerId"] == "go1"
    assert dispatch["status"] == "unread"
    assert dispatch["priority"] == "high"

    # Officer status updated
    officer = next(o for o in state.officers_db if o["id"] == "go1")
    assert officer["status"] == "responding"

    # Incident linked to officer
    incident = next(i for i in state.incidents_db if i["id"] == test_incident["id"])
    assert incident["assignedTo"] == "go1"

    # Dispatch visible via get
    dispatches = get_dispatches(officerId="go1")
    assert any(d["id"] == dispatch["id"] for d in dispatches)


# ---------------------------------------------------------------------------
# Test 14 — PATCH dispatch to in_progress updates incident status
# ---------------------------------------------------------------------------

def test_update_dispatch_to_in_progress_updates_incident_status(test_dispatch, test_incident):
    req = UpdateDispatchRequest(status="in_progress")

    updated = update_dispatch(test_dispatch["id"], req)

    assert updated["status"] == "in_progress"

    incident = next(i for i in state.incidents_db if i["id"] == test_incident["id"])
    assert incident["status"] == "in_progress"


# ---------------------------------------------------------------------------
# Test 15 — PATCH dispatch to resolved returns officer to patrolling and closes incident
# ---------------------------------------------------------------------------

def test_update_dispatch_to_resolved_returns_officer_patrolling_and_closes_incident(
    test_dispatch, test_incident
):
    req = UpdateDispatchRequest(status="resolved")

    updated = update_dispatch(test_dispatch["id"], req)

    assert updated["status"] == "resolved"

    # Officer back to patrolling
    officer = next(o for o in state.officers_db if o["id"] == "go1")
    assert officer["status"] == "patrolling"

    # Incident marked resolved
    incident = next(i for i in state.incidents_db if i["id"] == test_incident["id"])
    assert incident["status"] == "resolved"


# ---------------------------------------------------------------------------
# Test 16 — POST /api/reports creates a field report
# ---------------------------------------------------------------------------

def test_create_report(test_incident):
    req = CreateReportRequest(
        officerId="go1",
        officerName="Richard Woods",
        officerBadge="SO-1001",
        type="physical_altercation",
        incidentType="physical_altercation",
        location="lobby",
        description="Officer arrived on scene; situation under control.",
        severity="high",
    )

    report = create_report(req)

    assert report["officerId"] == "go1"
    assert report["location"] == "lobby"
    assert "id" in report

    all_reports = get_reports()
    assert len(all_reports) == 1
    assert all_reports[0]["id"] == report["id"]


# ---------------------------------------------------------------------------
# Test 17 — GET /api/reports returns all submitted reports
# ---------------------------------------------------------------------------

def test_get_reports_returns_all_submitted_reports():
    for officer_id in ("go1", "go2", "go3"):
        req = CreateReportRequest(
            officerId=officer_id,
            location="lobby",
            description=f"Report from {officer_id}",
        )
        create_report(req)

    reports = get_reports()
    assert len(reports) == 3
    officer_ids = {r["officerId"] for r in reports}
    assert officer_ids == {"go1", "go2", "go3"}


# ---------------------------------------------------------------------------
# Test 18 — Manual state reset clears all collections and restores officers
# ---------------------------------------------------------------------------

def test_manual_state_reset_clears_all_collections(test_incident):
    # Create dispatch and report so state is dirty
    officer = next(o for o in state.officers_db if o["id"] == "go2")
    officer["status"] = "patrolling"
    officer["online"] = True

    d_req = CreateDispatchRequest(
        incidentId=test_incident["id"],
        officerId="go2",
        instruction="Patrol",
        location="lobby",
    )
    create_dispatch(d_req)

    r_req = CreateReportRequest(
        officerId="go2",
        location="lobby",
        description="Patrolled area, all clear.",
    )
    create_report(r_req)

    assert len(state.incidents_db) >= 1
    assert len(state.dispatches_db) >= 1
    assert len(state.reports_db) >= 1

    # Perform the same operations that /api/demo/reset does
    state.incidents_db.clear()
    state.dispatches_db.clear()
    state.reports_db.clear()
    state.officers_db.clear()
    state.officers_db.extend(copy.deepcopy(state.INITIAL_OFFICERS_DB))
    state.pipeline.reset_state()

    assert state.incidents_db == []
    assert state.dispatches_db == []
    assert state.reports_db == []

    # Officers restored to initial offline state
    assert len(state.officers_db) == len(state.INITIAL_OFFICERS_DB)
    for officer in state.officers_db:
        assert officer["status"] == "offline"
        assert officer["task"] is None
