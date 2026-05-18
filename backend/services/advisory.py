from __future__ import annotations

try:
    from recommendation_AI.incident_analysis import get_advisory
except ImportError:
    get_advisory = None


def build_advisory(incident_dict: dict, enable_advisory: bool) -> dict:
    if not enable_advisory or get_advisory is None:
        return fallback_advisory(incident_dict, "Recommendation engine disabled or unavailable.")

    try:
        advisory = get_advisory(incident_dict)
    except Exception as e:
        return fallback_advisory(incident_dict, f"Recommendation engine failed: {str(e)}")

    if not isinstance(advisory, dict):
        return fallback_advisory(incident_dict, "Recommendation engine returned invalid response.")

    return advisory


def normalize_advisory(advisory: dict, incident_dict: dict) -> dict:
    if not isinstance(advisory, dict):
        return fallback_advisory(incident_dict, "Advisory output was invalid.")

    return {
        "title": advisory.get("title", "Incident Advisory"),
        "flag": advisory.get("flag", "Green"),
        "location": advisory.get("location", incident_dict.get("location", "unknown")),
        "dispatch_unit": advisory.get("dispatch_unit", "Manual Review"),
        "expected_response_time": advisory.get("expected_response_time", "Routine check (< 1 hour)"),
        "description": advisory.get("description", incident_dict.get("description", "")),
        "explanation": advisory.get("explanation", "No detailed explanation provided."),
        "actions": advisory.get("actions", ["Review incident manually"]),
    }


def fallback_advisory(incident_dict: dict, reason: str) -> dict:
    return {
        "title": "Analysis Unavailable",
        "flag": "Yellow",
        "location": incident_dict.get("location", "unknown"),
        "dispatch_unit": "Manual Review",
        "expected_response_time": "Routine check (< 1 hour)",
        "description": reason,
        "explanation": "Fallback response due to unavailable AI analysis.",
        "actions": [
            "Verify source data manually",
            "Review CCTV and logs",
            "Escalate to supervisor if needed",
        ],
    }


def pipeline_error(error_type: str, message: str) -> dict:
    return {
        "is_system_error": True,
        "status": "error",
        "source_type": "system",
        "incident_data": {
            "name": "pipeline_error",
            "location": "system",
            "timestamp": "",
            "triggering_events": [],
            "risk_score": 0,
            "description": error_type,
            "status": "ERROR",
        },
        "advisory": {
            "title": "Pipeline Error",
            "flag": "Yellow",
            "location": "system",
            "dispatch_unit": "Developer Review",
            "expected_response_time": "As needed",
            "description": message,
            "explanation": f"System error occurred during {error_type}.",
            "actions": ["Check logs", "Inspect input payload", "Review stack trace"],
        },
    }
