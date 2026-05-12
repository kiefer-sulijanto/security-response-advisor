import json
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

_VALID_FLAGS = {"Green", "Yellow", "Red"}
_REQUIRED_INPUT_KEYS = {"incidentType", "location", "source", "description"}
_REQUIRED_OUTPUT_KEYS = {
    "title", "flag", "location", "dispatch_unit",
    "expected_response_time", "description", "explanation", "actions",
}

# Used by _fallback_advisory for pre-validation errors only.
_FALLBACK_ACTIONS = [
    "Step 1: Verify the incident manually and confirm source data.",
    "Step 2: Review CCTV footage and access logs for the reported location.",
    "Step 3: Escalate to the duty supervisor if the situation cannot be confirmed.",
]

_FLAG_RANK = {"Green": 0, "Yellow": 1, "Red": 2}

_MINIMUM_SEVERITY = {
    "intrusion_attempt": "Yellow",
    "unauthorized_access": "Yellow",
    "loitering": "Green",
    "after_hours_presence": "Yellow",
    "tailgating": "Yellow",
    "emergency_distress": "Red",
    "fire_alert": "Red",
    "physical_altercation": "Red",
}


def _article(word: str) -> str:
    return "An" if word[:1].lower() in "aeiou" else "A"


# Per-type concern sentence used as the third sentence in rule-based descriptions.
_CONCERN_SENTENCES = {
    "intrusion_attempt": (
        "An unverified intrusion represents a potential perimeter breach that must be contained and investigated."
    ),
    "unauthorized_access": (
        "Unauthorized access to a controlled area poses an access-control integrity risk requiring immediate investigation."
    ),
    "loitering": (
        "Loitering in or near a controlled area may indicate surveillance activity or an opportunistic security concern."
    ),
    "after_hours_presence": (
        "Presence in a restricted area outside authorized operational hours constitutes a confirmed access-control anomaly."
    ),
    "tailgating": (
        "Tailgating indicates that an unauthorized individual may have gained access using a single valid credential event."
    ),
    "emergency_distress": (
        "A distress or panic alert represents an immediate life-safety concern and must be treated as urgent until verified."
    ),
    "fire_alert": (
        "A fire or smoke alert is a life-safety emergency requiring immediate alarm verification and evacuation action."
    ),
    "physical_altercation": (
        "Physical violence or an active altercation poses an immediate safety risk to all personnel at the reported location."
    ),
}

# SOP minimum-severity rules keyed by incidentType (lowercase).
_INCIDENT_RULES = {
    "intrusion_attempt": {
        "flag": "Yellow",
        "title": "Intrusion Attempt Detected",
        "dispatch_unit": "Ground Response Team",
        "expected_response_time": "Priority response (< 10 mins)",
        "explanation": (
            "Intrusion attempts are classified at minimum Yellow per NPSA Perimeters & Checkpoints SOP. "
            "The incident represents a potential perimeter or checkpoint anomaly requiring immediate ground verification. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Dispatch a Ground Response Team to the reported location to verify and secure the perimeter.",
            "Step 2: Isolate and review CCTV feeds covering the reported area and cross-reference with recent access-control logs.",
            "Step 3: Document findings, preserve CCTV footage, and escalate to the duty supervisor if intrusion is confirmed.",
        ],
    },
    "unauthorized_access": {
        "flag": "Yellow",
        "title": "Unauthorised Access Detected",
        "dispatch_unit": "Ground Response Team",
        "expected_response_time": "Priority response (< 10 mins)",
        "explanation": (
            "Unauthorized access is classified at minimum Yellow per NPSA Automatic Access Control Systems SOP. "
            "The incident indicates a credential or zone authorization anomaly requiring access-log review and ground verification. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Dispatch a Ground Response Team to verify the reported unauthorized access point and assess the area.",
            "Step 2: Retrieve and review access-control logs and CCTV footage for the reported time window and location.",
            "Step 3: Revoke or flag the credential if unauthorized use is confirmed and notify the duty supervisor.",
        ],
    },
    "loitering": {
        "flag": "Green",
        "title": "Loitering Activity Noted",
        "dispatch_unit": "Ground Officer",
        "expected_response_time": "Routine check (< 30 mins)",
        "explanation": (
            "Loitering alone is classified at minimum Green per CISA suspicious-behaviour guidance. "
            "Without additional articulable evidence of a security concern, a routine ground check and CCTV review are sufficient. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Assign a Ground Officer to conduct a routine, non-confrontational verification at the reported location.",
            "Step 2: Monitor CCTV feeds for the area to observe behaviour and duration of loitering activity.",
            "Step 3: Log the observation and escalate to Yellow if additional suspicious indicators are identified.",
        ],
    },
    "after_hours_presence": {
        "flag": "Yellow",
        "title": "After-Hours Presence Detected",
        "dispatch_unit": "Ground Response Team",
        "expected_response_time": "Priority response (< 10 mins)",
        "explanation": (
            "After-hours presence in a restricted area is classified at minimum Yellow per NPSA Automatic Access Control Systems SOP. "
            "The incident indicates an access-control anomaly outside authorized operational hours. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Dispatch a Ground Response Team to identify and challenge any individual present at the restricted location outside authorized hours.",
            "Step 2: Cross-reference access-control logs to confirm whether entry was authorized and review CCTV footage for the reported time.",
            "Step 3: Request identification and authorization from any individual whose access cannot be verified, maintain safe supervision, and escalate to the duty supervisor with full incident documentation.",
        ],
    },
    "tailgating": {
        "flag": "Yellow",
        "title": "Tailgating Incident Detected",
        "dispatch_unit": "Ground Response Team",
        "expected_response_time": "Priority response (< 10 mins)",
        "explanation": (
            "Tailgating is classified at minimum Yellow per NPSA Automatic Access Control Systems SOP as a potential access-control breach. "
            "Multiple individuals may have entered a controlled zone using a single valid access event. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Dispatch a Ground Response Team to the reported access point to identify any unauthorized individuals who may have gained entry.",
            "Step 2: Review CCTV footage of the access-control event and cross-reference the access log to determine the number of persons who entered.",
            "Step 3: Secure the access point if an unauthorized entry is confirmed and document the incident for supervisor review.",
        ],
    },
    "emergency_distress": {
        "flag": "Red",
        "title": "Emergency Distress Alert",
        "dispatch_unit": "Emergency Response Team",
        "expected_response_time": "Immediate (< 3 mins)",
        "explanation": (
            "Distress and panic alerts are classified at minimum Red per OSHA Emergency Action Plan guidance. "
            "The alert must be treated as a live life-safety incident until on-site verification confirms otherwise. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Dispatch an Emergency Response Team to the reported location immediately and activate the emergency notification protocol.",
            "Step 2: Confirm scene safety before entry; assign trained personnel to provide medical assistance if injury is indicated.",
            "Step 3: Notify the duty supervisor and emergency services, and conduct personnel accountability for the affected zone.",
        ],
    },
    "fire_alert": {
        "flag": "Red",
        "title": "Fire / Smoke Alert",
        "dispatch_unit": "Fire Response Team / Emergency Services",
        "expected_response_time": "Immediate (< 3 mins)",
        "explanation": (
            "Fire and smoke alerts are classified at minimum Red per OSHA Emergency Action Plan and Fire Prevention Plan. "
            "The incident is treated as a life-safety emergency requiring alarm verification and evacuation initiation. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Activate the site fire alarm, initiate evacuation of the affected area per site procedure, and notify emergency services immediately.",
            "Step 2: Verify the alert via CCTV and on-site inspection by trained personnel; do not instruct untrained staff to engage the fire.",
            "Step 3: Conduct occupant accountability at the designated assembly point and maintain communication with the Command Center and emergency services.",
        ],
    },
    "physical_altercation": {
        "flag": "Red",
        "title": "Physical Altercation Alert",
        "dispatch_unit": "Trained Security Response Team",
        "expected_response_time": "Immediate (< 3 mins)",
        "explanation": (
            "Physical altercations are classified at minimum Red per HSE Violence and Aggression at Work guidance and OSHA workplace violence controls. "
            "Active violence is an immediate safety risk requiring trained responder dispatch and potential emergency service escalation. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Dispatch trained security personnel to the reported location to safely separate and contain the parties involved.",
            "Step 2: Activate the scene emergency protocol, ensure bystander safety, and monitor CCTV for ongoing or escalating violence.",
            "Step 3: Escalate to police and medical services if injury, a weapon, or continuing violence is present, and preserve all CCTV evidence.",
        ],
    },
}

_DEFAULT_INCIDENT_RULE = {
    "flag": "Green",
    "title": "Security Incident Reported",
    "dispatch_unit": "Ground Officer",
    "expected_response_time": "Routine check (< 30 mins)",
    "explanation": (
        "The incident type could not be matched to a known SOP classification. "
        "A default Green flag and routine response have been assigned pending manual review. "
        "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
    ),
    "actions": [
        "Step 1: Assign a Ground Officer to verify the reported incident at the stated location.",
        "Step 2: Review available CCTV footage and access logs relevant to the reported time and location.",
        "Step 3: Log the incident and escalate to the duty supervisor if a security concern is confirmed.",
    ],
}

_SYSTEM_PROMPT = """
You are a professional Security Response Advisor for Certis.

Your role is to analyze structured security incident data from CCTV detections, access-control logs, alarm systems, and distress reports. You must produce a formal incident advisory for a Security Operations Center and ground security officers.

You must follow a SOP-guided approach. Do not generate advice freely. Base your analysis only on:
1. The incident data provided by the user.
2. The SOP reference guide below.
3. The severity rules below.
4. The required JSON schema.

==================================================
SOP REFERENCE GUIDE
==================================================

Use these open-access SOP/guideline principles as the basis for your reasoning:

1. Access Control / Intrusion / Unauthorized Access / Tailgating / After-Hours Presence
   Source basis: NPSA Automatic Access Control Systems and NPSA Perimeters & Checkpoints.
   Operational principles:
   - Access control is used to control who goes where and when.
   - Access should be tied to authorized zones, credentials, and operational hours.
   - Unauthorized access attempts should be treated as control-room alerts and reviewed with access logs and CCTV.
   - Tailgating should be treated as a possible access-control breach where multiple persons may have entered using one valid access event.
   - Intrusion attempts should be assessed as perimeter or checkpoint anomalies until verified.

2. Loitering / Suspicious Behaviour
   Source basis: CISA suspicious-behaviour guidance.
   Operational principles:
   - Loitering alone is not automatically a crime or emergency.
   - Treat loitering as suspicious only when supported by articulable facts, such as repeated presence, restricted-area interest, after-hours activity, unusual surveillance, or correlation with other events.
   - Do not infer risk based on appearance, ethnicity, gender, religion, or other protected characteristics.
   - Recommended response should focus on monitoring, CCTV review, and safe ground verification.

3. Emergency Distress / Panic Alert
   Source basis: OSHA Emergency Action Plan and workplace emergency guidance.
   Operational principles:
   - Panic or distress alerts should be treated as urgent until verified.
   - Response should include emergency reporting, dispatch of appropriate personnel, scene safety checks, and accountability.
   - Medical or rescue duties should only be assigned to trained or designated personnel.
   - If the nature of distress is unclear, state that verification is required.

4. Fire / Smoke Alert
   Source basis: OSHA Emergency Action Plan, OSHA Fire Prevention Plan, and workplace fire safety guidance.
   Operational principles:
   - Smoke or fire alerts are life-safety incidents.
   - Response should prioritize alarm verification, evacuation or isolation according to site procedure, occupant accountability, and fire responder notification.
   - Do not instruct untrained security staff to fight the fire.
   - Mention potential ignition or spread risk only as a risk, not as confirmed fact unless the input confirms it.

5. Physical Altercation / Fighting / Aggressive Confrontation
   Source basis: HSE Violence and Aggression at Work guidance and OSHA workplace violence controls.
   Operational principles:
   - Physical violence or active fighting is an immediate safety risk.
   - Response should prioritize safe separation, scene containment, panic/emergency activation, trained security dispatch, and medical/police escalation if injury, weapon, or continuing violence is confirmed.
   - De-escalation may be recommended only if safe and performed by trained personnel.
   - Do not recommend physical intervention unless the input or site policy indicates trained responders are available.

==================================================
SEVERITY RULES
==================================================

Classify the incident strictly as one of:

- Green: Low-risk anomaly, isolated suspicious activity, or insufficient data requiring monitoring or routine verification.
- Yellow: Confirmed non-violent security breach, unauthorized access concern, intrusion attempt, tailgating, after-hours presence in a restricted area, or suspicious behaviour with supporting evidence.
- Red: Life-safety emergency, fire/smoke alert, panic/distress alert, physical violence, weapon indication, medical emergency, serious injury, or active threat.

Minimum severity by incident type:
- intrusion_attempt: Yellow
- unauthorized_access: Yellow
- loitering: Green
- after_hours_presence: Yellow
- tailgating: Yellow
- emergency_distress: Red
- fire_alert: Red
- physical_altercation: Red

You may escalate above the minimum severity if the input clearly supports it.
You must not downgrade below the minimum severity for the detected incident type.

==================================================
ANTI-HALLUCINATION RULES
==================================================

1. Do not invent facts that are not in the input.
2. Do not invent weapons, injuries, fire spread, forced entry, suspect identity, number of people, or police involvement unless explicitly present in the input.
3. If information is missing, say it is not provided and recommend verification.
4. Separate confirmed events from risk interpretation.
5. Do not mention exact SOP clause numbers unless they are provided in the input.
6. Do not claim that the incident is confirmed crime unless the input clearly confirms it.
7. Do not recommend actions that require special training unless assigned to trained personnel.
8. Keep the tone formal, objective, operational, and suitable for an official security incident report.

==================================================
OUTPUT STYLE
==================================================

The description must be 4-5 sentences structured as follows:
1. State the detected incident and location.
2. State the confirmed event sequence from the input.
3. Explain the operational security or life-safety concern.
4. State what needs to be verified.
5. Mention potential operational impact without exaggeration.

The action list must follow this structure exactly, with all 3 steps present:
- Step 1: Verification or immediate safety action.
- Step 2: Containment, monitoring, or dispatch.
- Step 3: Escalation, documentation, or follow-up.

Use professional security terminology, but avoid dramatic or unrealistic language.

==================================================
REQUIRED JSON OUTPUT
==================================================

Output pure JSON only. No markdown. No commentary.

Use exactly this structure:
{
    "title": "Short professional title, max 5 words",
    "flag": "Green or Yellow or Red",
    "location": "Copy the location value from the input exactly. Do not paraphrase, reformat, or rewrite it.",
    "dispatch_unit": "Appropriate response unit",
    "expected_response_time": "Operational response timeframe",
    "description": "Formal 4-5 sentence incident report summary",
    "explanation": "Clear reasoning for the selected flag, referencing the SOP principle in plain language",
    "actions": [
        "Step 1: ...",
        "Step 2: ...",
        "Step 3: ..."
    ]
}
"""


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
        "actions": list(_FALLBACK_ACTIONS),
    }


def _build_rule_based_description(incident_type: str, location: str, raw_description: str) -> str:
    """Builds a formal 5-sentence description from rule-based components."""
    incident_label = incident_type.replace("_", " ") if incident_type else "security incident"
    s1 = f"{_article(incident_label)} {incident_label} has been reported at {location}."
    s2 = raw_description if raw_description else "No additional event detail was provided in the source data."
    s3 = _CONCERN_SENTENCES.get(
        incident_type,
        "The nature and extent of the incident require on-site verification to determine the appropriate security response.",
    )
    s4 = "Manual verification of CCTV footage, access-control logs, and on-site conditions is required to confirm the nature and extent of the incident."
    s5 = "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
    return f"{s1} {s2} {s3} {s4} {s5}"


def _rule_based_advisory(input_data: dict) -> dict:
    """SOP-respecting advisory for post-validation API failures.

    Called when input is valid but the AI service is unavailable. Applies the
    minimum-severity rules from _INCIDENT_RULES so incidents such as
    intrusion_attempt are never silently downgraded to Green.
    """
    location = input_data["location"].strip()
    incident_type = input_data.get("incidentType", "").strip().lower()
    raw_description = input_data.get("description", "").strip()

    rule = _INCIDENT_RULES.get(incident_type, _DEFAULT_INCIDENT_RULE)

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

    missing_keys = _REQUIRED_INPUT_KEYS - input_data.keys()
    if missing_keys:
        return _fallback_advisory(
            input_data.get("location", "unknown"),
            f"Invalid input: missing required fields: {', '.join(sorted(missing_keys))}.",
        )

    for key in _REQUIRED_INPUT_KEYS:
        if not isinstance(input_data[key], str) or not input_data[key].strip():
            return _fallback_advisory(
                input_data.get("location", "unknown"),
                f"Invalid input: '{key}' must be a non-empty string.",
            )

    location = input_data["location"].strip()

    # --- Post-validation failures: delegate to _rule_based_advisory ---

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
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
            model="o4-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
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
    minimum_flag = _MINIMUM_SEVERITY.get(incident_type_lower, "Green")
    raw_flag = advisory.get("flag", "")
    if raw_flag not in _VALID_FLAGS:
        advisory["flag"] = minimum_flag
    elif _FLAG_RANK.get(raw_flag, 0) < _FLAG_RANK.get(minimum_flag, 0):
        advisory["flag"] = minimum_flag

    # --- Post-process: enforce exactly 3 action strings ---
    actions = advisory.get("actions", [])
    if not isinstance(actions, list):
        actions = []
    actions = [str(a) for a in actions[:3]]
    while len(actions) < 3:
        actions.append(_FALLBACK_ACTIONS[len(actions)])
    advisory["actions"] = actions

    # --- Post-process: ensure all required output keys are present ---
    for key in _REQUIRED_OUTPUT_KEYS:
        if advisory.get(key) is None:
            advisory[key] = [] if key == "actions" else ""

    return advisory
