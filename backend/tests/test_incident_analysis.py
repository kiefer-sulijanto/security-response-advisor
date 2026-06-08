from recommendation_AI import incident_analysis
from recommendation_AI.incident_analysis import get_advisory


def test_route_format_intrusion_attempt_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory({
        "incidentType": "intrusion_attempt",
        "location": "server_room",
        "source": "CCTV/access_log",
        "description": "Person detected near server room with access denied event.",
    })

    assert result["flag"] == "Yellow"
    assert result["location"] == "server_room"
    assert result["title"]
    assert result["dispatch_unit"]
    assert result["expected_response_time"]
    assert result["description"]
    assert result["explanation"]
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3


def test_pipeline_format_intrusion_attempt_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory({
        "name": "intrusion_attempt",
        "location": "server_room",
        "description": "Possible unauthorized entry attempt.",
        "triggering_events": [],
        "risk_score": 0,
        "status": "NEW",
    })

    assert result["flag"] == "Yellow"
    assert result["location"] == "server_room"
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3


def test_physical_altercation_minimum_red(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory({
        "incidentType": "physical_altercation",
        "location": "main_lobby",
        "source": "CCTV",
        "description": "CCTV detected possible fighting in the main lobby.",
    })

    assert result["flag"] == "Red"
    assert result["location"] == "main_lobby"
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3


def test_fire_alert_minimum_red(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory({
        "incidentType": "fire_alert",
        "location": "pantry_level_2",
        "source": "smoke_detector",
        "description": "Smoke detector triggered near the pantry area.",
    })

    assert result["flag"] == "Red"
    assert result["location"] == "pantry_level_2"
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3


def test_loitering_minimum_green(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory({
        "incidentType": "loitering",
        "location": "car_park_b1",
        "source": "CCTV",
        "description": "Person remained near the car park entrance for an extended period.",
    })

    assert result["flag"] == "Green"
    assert result["location"] == "car_park_b1"
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3


def test_invalid_input_returns_schema_compliant_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory("invalid raw string input")

    assert result["flag"] == "Green"
    assert result["location"] == "unknown"
    assert result["title"]
    assert result["description"]
    assert result["explanation"]
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3


def test_unattended_bag_minimum_yellow(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory({
        "incidentType": "unattended_bag",
        "location": "main_lobby",
        "source": "CCTV",
        "description": "Bag detected in the main lobby with no nearby owner for the configured dwell time.",
    })

    assert result["flag"] == "Yellow"
    assert result["location"] == "main_lobby"
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3


def test_pipeline_format_unattended_bag_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")

    result = get_advisory({
        "name": "unattended_bag",
        "location": "main_lobby",
        "description": "Bag or luggage left unattended in monitored area.",
        "triggering_events": [],
        "risk_score": 7,
        "status": "NEW",
    })

    assert result["flag"] == "Yellow"
    assert result["location"] == "main_lobby"
    assert len(result["actions"]) == 3


def test_fallback_when_openai_package_missing(monkeypatch):
    # Simulate the openai package not being installed even though a key is set:
    # the system must still produce a valid rule-based advisory.
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-key")
    monkeypatch.setattr(incident_analysis, "OpenAI", None)

    result = get_advisory({
        "incidentType": "physical_altercation",
        "location": "main_lobby",
        "source": "CCTV",
        "description": "CCTV detected possible fighting in the main lobby.",
    })

    assert result["flag"] == "Red"
    assert result["location"] == "main_lobby"
    assert isinstance(result["actions"], list)
    assert len(result["actions"]) == 3