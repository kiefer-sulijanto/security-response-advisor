import json
import os
from dotenv import load_dotenv
from openai import OpenAI


def get_advisory(incident_dict):
    return certis_incident_analysis(incident_dict)


def certis_incident_analysis(input_data):
    try:
        load_dotenv()
    except Exception as e:
        raise RuntimeError(f"Failed to load environment variables: {e}") from e

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing")

    try:
        client = OpenAI(api_key=api_key)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize OpenAI client: {e}") from e

    system_prompt = """
    You are a professional 'Security Response Advisor' for Certis.
    Your task is to analyze structured incident data from CCTV, access logs, and distress calls, then provide security recommendations.

    Classify the incident strictly into these 3 status flags based on security protocols:
    - Green: Anomalies or suspicious situations that require monitoring or a routine check, but are not immediate crimes.
    - Yellow: Confirmed non-violent crimes, security breaches, or highly suspicious behavior.
    - Red: Critical/Danger! Life-threatening situations, physical violence, weapons, or major emergencies.

    MANDATORY RULES:
    1. Recommendations must be proportionate, highly tactical, and use professional security terminology (e.g., 'containment', 'perimeter breach', 'escalation protocol').
    2. Provide logical reasoning (Explainability) to avoid a black-box approach.
    3. Maintain a strictly objective, professional, and formal tone.
    4. If the input data is empty, corrupted, or lacks clear security context, classify as "Green", state "Insufficient data for full analysis", and advise manual camera verification.
    5. Output MUST be pure JSON with this structure:
    {
        "title": "A short, professional title (max 5 words)",
        "flag": "Green/Yellow/Red",
        "location": "Exact location extracted from data",
        "dispatch_unit": "Specific unit (e.g., 'Armed Response Team', 'Medical Unit')",
        "expected_response_time": "Timeframe (e.g., 'Immediate < 3 mins')",
        "description": "Provide a comprehensive, highly detailed paragraph (minimum 4-5 sentences). Describe the exact chronological events, the specific entities involved, the nature of the threat, and the potential operational impact. Make it sound like an official Certis incident report.",
        "explanation": "Reasoning WHY this flag was chosen",
        "actions": [
            "Step 1: [Immediate Tactical Action] - e.g., 'Deploy Ground Officers to secure the perimeter and establish a chokepoint at the main entry.'",
            "Step 2: [Containment/Investigation] - e.g., 'Command Center to isolate the affected sector CCTV feeds and lock down adjacent electronic doors.'",
            "Step 3: [Escalation/Follow-up] - e.g., 'Cross-reference access logs from the past 2 hours and notify local law enforcement if the suspect attempts egress.'"
        ]
    }
    """

    try:
        response = client.chat.completions.create(
            model="o4-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(input_data)}
            ]
        )
    except Exception as e:
        raise RuntimeError(f"Advisory API request failed: {e}") from e

    try:
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        raise RuntimeError(f"Failed to parse advisory JSON response: {e}") from e


