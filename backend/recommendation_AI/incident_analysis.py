import json
import os
from dotenv import load_dotenv

# OpenAI is an optional dependency. The system falls back to rule-based
# advisories when the package is missing, so importing it must never break
# module import (e.g. during pytest collection without openai installed).
try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - exercised only when openai is absent
    OpenAI = None

from .advisory_prompt import SYSTEM_PROMPT
from .advisory_rules import (
    VALID_FLAGS,
    REQUIRED_INPUT_KEYS,
    REQUIRED_OUTPUT_KEYS,
    FALLBACK_ACTIONS,
    FLAG_RANK,
    MINIMUM_SEVERITY,
    CONCERN_SENTENCES,
    INCIDENT_RULES,
    DEFAULT_INCIDENT_RULE,
)

load_dotenv()


def _article(word: str) -> str:
    return "An" if word[:1].lower() in "aeiou" else "A"


def _fallback_advisory(location: str, reason: str) -> dict:
    """Schema-compliant fallback for pre-validation and setup errors only.

    Used when the input is malformed and a clean incidentType is not available.
    For post-validation API failures use _rule_based_advisory instead.
    """
    return {
        "title": "Analysis Unavailable",
        "flag": "Green",
        "location": location or "unknown",
        "dispatch_unit": "Manual Review",
        "expected_response_time": "Routine check (< 1 hour)",
        "description": reason,
        "explanation": "Fallback response: AI analysis could not be completed.",
        "actions": list(FALLBACK_ACTIONS),
    }


def _build_rule_based_description(incident_type: str, location: str, raw_description: str) -> str:
    """Builds a formal 5-sentence description from rule-based components."""
    incident_label = incident_type.replace("_", " ") if incident_type else "security incident"
    s1 = f"{_article(incident_label)} {incident_label} has been reported at {location}."
    s2 = raw_description if raw_description else "No additional event detail was provided in the source data."
    s3 = CONCERN_SENTENCES.get(
        incident_type,
        "The nature and extent of the incident require on-site verification to determine the appropriate security response.",
    )
    s4 = "Manual verification of CCTV footage, access-control logs, and on-site conditions is required to confirm the nature and extent of the incident."
    s5 = "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
    return f"{s1} {s2} {s3} {s4} {s5}"


def _rule_based_advisory(input_data: dict) -> dict:
    """SOP-respecting advisory for post-validation API failures.

    Called when input is valid but the AI service is unavailable. Applies the
    minimum-severity rules from INCIDENT_RULES so incidents such as
    intrusion_attempt are never silently downgraded to Green.
    """
    location = input_data["location"].strip()
    incident_type = input_data.get("incidentType", "").strip().lower()
    raw_description = input_data.get("description", "").strip()

    rule = INCIDENT_RULES.get(incident_type, DEFAULT_INCIDENT_RULE)

    return {
        "title": rule["title"],
        "flag": rule["flag"],
        "location": location,
        "dispatch_unit": rule["dispatch_unit"],
        "expected_response_time": rule["expected_response_time"],
        "description": _build_rule_based_description(incident_type, location, raw_description),
        "explanation": rule["explanation"],
        "actions": list(rule["actions"]),
    }


def get_advisory(incident_dict):
    return certis_incident_analysis(incident_dict)


def certis_incident_analysis(input_data):
    # --- Input validation (pre-validation: no clean incidentType yet) ---
    if not isinstance(input_data, dict):
        return _fallback_advisory("unknown", "Invalid input: expected a dictionary.")

    # --- Normalize to a working copy for backward compatibility ---
    # Supports both the routes format {incidentType, location, source, description}
    # and the pipeline format {name, location, description, triggering_events, ...}.
    input_data = dict(input_data)
    if "incidentType" not in input_data and "name" in input_data:
        input_data["incidentType"] = input_data["name"]
    if "source" not in input_data:
        input_data["source"] = input_data.get("source_type", "pipeline")

    missing_keys = REQUIRED_INPUT_KEYS - input_data.keys()
    if missing_keys:
        return _fallback_advisory(
            input_data.get("location", "unknown"),
            f"Invalid input: missing required fields: {', '.join(sorted(missing_keys))}.",
        )

    for key in REQUIRED_INPUT_KEYS:
        if not isinstance(input_data[key], str) or not input_data[key].strip():
            return _fallback_advisory(
                input_data.get("location", "unknown"),
                f"Invalid input: '{key}' must be a non-empty string.",
            )

    location = input_data["location"].strip()

    # --- Post-validation failures: delegate to _rule_based_advisory ---

    # No openai package installed or no API key: use the SOP rule-based advisory.
    api_key = os.getenv("OPENAI_API_KEY")
    if OpenAI is None or not api_key:
        return _rule_based_advisory(input_data)

    try:
        client = OpenAI(api_key=api_key)
    except Exception:
        return _rule_based_advisory(input_data)

    # Reinforce exact location echo in the user message; post-processing below
    # provides the hard guarantee regardless of model output.
    user_content = (
        f"{json.dumps(input_data)}\n\n"
        f"IMPORTANT: The 'location' field in your JSON output must be exactly: \"{location}\""
    )

    try:
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "o4-mini"),
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
    except Exception:
        return _rule_based_advisory(input_data)

    try:
        advisory = json.loads(response.choices[0].message.content)
    except Exception:
        return _rule_based_advisory(input_data)

    if not isinstance(advisory, dict):
        return _rule_based_advisory(input_data)

    # --- Post-process: hard-enforce location echo ---
    advisory["location"] = location

    # --- Post-process: enforce valid flag and SOP minimum severity ---
    incident_type_lower = input_data.get("incidentType", "").strip().lower()
    minimum_flag = MINIMUM_SEVERITY.get(incident_type_lower, "Green")
    raw_flag = advisory.get("flag", "")
    if raw_flag not in VALID_FLAGS:
        advisory["flag"] = minimum_flag
    elif FLAG_RANK.get(raw_flag, 0) < FLAG_RANK.get(minimum_flag, 0):
        advisory["flag"] = minimum_flag

    # --- Post-process: enforce exactly 3 action strings ---
    actions = advisory.get("actions", [])
    if not isinstance(actions, list):
        actions = []
    actions = [str(a) for a in actions[:3]]
    while len(actions) < 3:
        actions.append(FALLBACK_ACTIONS[len(actions)])
    advisory["actions"] = actions

    # --- Post-process: ensure all required output keys are present ---
    for key in REQUIRED_OUTPUT_KEYS:
        if advisory.get(key) is None:
            advisory[key] = [] if key == "actions" else ""

    return advisory
