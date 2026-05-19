VALID_FLAGS = {"Green", "Yellow", "Red"}

REQUIRED_INPUT_KEYS = {"incidentType", "location", "source", "description"}

REQUIRED_OUTPUT_KEYS = {
    "title", "flag", "location", "dispatch_unit",
    "expected_response_time", "description", "explanation", "actions",
}

# Used by _fallback_advisory for pre-validation errors only.
FALLBACK_ACTIONS = [
    "Step 1: Verify the incident manually and confirm source data.",
    "Step 2: Review CCTV footage and access logs for the reported location.",
    "Step 3: Escalate to the duty supervisor if the situation cannot be confirmed.",
]

FLAG_RANK = {"Green": 0, "Yellow": 1, "Red": 2}

MINIMUM_SEVERITY = {
    "intrusion_attempt": "Yellow",
    "unauthorized_access": "Yellow",
    "loitering": "Green",
    "after_hours_presence": "Yellow",
    "tailgating": "Yellow",
    "emergency_distress": "Red",
    "fire_alert": "Red",
    "physical_altercation": "Red",
    "unattended_bag": "Yellow",
}

# Per-type concern sentence used as the third sentence in rule-based descriptions.
CONCERN_SENTENCES = {
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
    "unattended_bag": (
        "An unattended bag or luggage item in a monitored area may pose a security or safety risk and should be verified as soon as possible."
    ),
}

# SOP minimum-severity rules keyed by incidentType (lowercase).
INCIDENT_RULES = {
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
    "unattended_bag": {
        "flag": "Yellow",
        "title": "Unattended Bag Detected",
        "dispatch_unit": "Ground Response Team",
        "expected_response_time": "Priority response (< 10 mins)",
        "explanation": (
            "An unattended bag or luggage item is classified at minimum Yellow per NPSA Counter-Terrorism Security guidance for suspicious items. "
            "The item has remained stationary without an identified owner and requires ground verification before escalation. "
            "This advisory has been generated using rule-based severity classification and should be reviewed by the duty supervisor."
        ),
        "actions": [
            "Step 1: Verify the item via CCTV — confirm it is unattended and note the bag type, location, and duration before dispatching ground response.",
            "Step 2: Dispatch the Ground Response Team to assess the item; keep a safe distance and do not touch or move the bag until it is cleared.",
            "Step 3: If the bag cannot be attributed to an identified person within the area, isolate the surrounding zone and escalate to the duty supervisor and, if necessary, specialist services.",
        ],
    },
}

DEFAULT_INCIDENT_RULE = {
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
