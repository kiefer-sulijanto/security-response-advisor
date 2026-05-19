import { useState } from "react";
import { api } from "./services/api";

const locations = [
  "server_room",
  "meeting_room",
  "multi_purpose_room",
  "gathering_area",
  "conference_room",
  "canteen",
  "lobby",
  "ceo_office",
  "manager_office",
  "executive_office",
  "office_area",
  "command_center",
  "parking_area",
  "store_room",
];

const incidentButtons = [
  {
    key: "physical_altercation",
    label: "Physical Altercation",
    description: "Creates fight_detected from CCTV",
    color: "#d64545",
  },
  {
    key: "intrusion_attempt",
    label: "Intrusion Attempt",
    description: "Creates person_detected + access_denied",
    color: "#c68b16",
  },
  {
    key: "unauthorized_access",
    label: "Unauthorized Access",
    description: "Creates restricted_area_entry",
    color: "#b85dd8",
  },
  {
    key: "tailgating",
    label: "Tailgating",
    description: "Creates access_granted + multiple_persons_detected",
    color: "#e07a2f",
  },
  {
    key: "loitering",
    label: "Loitering",
    description: "Creates loitering_detected",
    color: "#4b7bec",
  },
  {
    key: "after_hours_presence",
    label: "After Hours Presence",
    description: "Creates person_detected + after_hours_presence",
    color: "#6c5ce7",
  },
  {
    key: "emergency_distress",
    label: "Emergency Distress",
    description: "Creates panic_button",
    color: "#e84393",
  },
  {
    key: "fire_alert",
    label: "Fire Alert",
    description: "Creates smoke_detected",
    color: "#e05a2a",
  },
  {
    key: "unattended_bag",
    label: "Unattended Bag",
    description: "Creates unattended_bag via CCTV pipeline",
    color: "#2e86ab",
  },
];

function formatLocationLabel(locationKey) {
  return locationKey
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function nowIso() {
  return new Date().toISOString();
}

function afterHoursIso() {
  const date = new Date();
  date.setHours(2, 0, 0, 0);
  return date.toISOString();
}

export default function App() {
  const [location, setLocation] = useState("lobby");
  const [userId, setUserId] = useState("U123");
  const [doorId, setDoorId] = useState("D01");
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);

  async function sendAccess(action, timestamp = nowIso()) {
    return api.processAccessLog({
      action,
      location,
      user_id: userId,
      door_id: doorId,
      timestamp,
    });
  }

  async function sendCctv(label, options = {}) {
    return api.processCctvDetection({
      label,
      location,
      camera_id: options.camera_id || `demo_${location}`,
      confidence: options.confidence ?? 0.95,
      timestamp: options.timestamp || nowIso(),
      in_restricted_area: options.in_restricted_area ?? false,
    });
  }

  async function sendManualEvent(eventType) {
    return api.manualTrigger({
      event_type: eventType,
      location,
      source: "phone_demo_trigger",
      metadata: {
        user_id: userId,
        door_id: doorId,
      },
    });
  }

  async function triggerIncident(incidentType) {
    setLoading(true);
    setMessage(`Triggering ${incidentType}...`);

    try {
      let responses = [];

      if (incidentType === "physical_altercation") {
        responses = [await sendCctv("fighting_or_aggressive")];
      }

      if (incidentType === "intrusion_attempt") {
        const timestamp = nowIso();

        responses = [
          await sendCctv("person", { timestamp }),
          await sendAccess("ACCESS_DENIED", timestamp),
        ];
      }

      if (incidentType === "unauthorized_access") {
        responses = [
          await sendCctv("person", {
            in_restricted_area: true,
          }),
        ];
      }

      if (incidentType === "tailgating") {
        const timestamp = nowIso();

        responses = [
          await sendAccess("ACCESS_GRANTED", timestamp),
          await sendCctv("multiple_persons", { timestamp }),
        ];
      }

      if (incidentType === "loitering") {
        responses = [await sendCctv("loitering")];
      }

      if (incidentType === "after_hours_presence") {
        responses = [
          await sendCctv("person", {
            timestamp: afterHoursIso(),
          }),
        ];
      }

      if (incidentType === "emergency_distress") {
        responses = [await sendManualEvent("panic_button")];
      }

      if (incidentType === "fire_alert") {
        responses = [await sendManualEvent("smoke_detected")];
      }

      if (incidentType === "unattended_bag") {
        responses = [await sendCctv("unattended_bag")];
      }

      const incidentsCreated = responses.reduce(
        (total, response) => total + (response?.incidents_created || 0),
        0
      );

      setMessage(
        incidentsCreated > 0
          ? `${formatLocationLabel(location)}: ${formatLocationLabel(
              incidentType
            )} created ${incidentsCreated} incident(s).`
          : `${formatLocationLabel(
              incidentType
            )} events sent, but no new incident was created. It may be duplicate-suppressed.`
      );
    } catch (err) {
      setMessage(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm("Reset demo state?");
    if (!confirmed) return;

    setLoading(true);
    setMessage("Resetting demo state...");

    try {
      await api.resetDemoState();
      setMessage("Demo state reset successfully.");
    } catch (err) {
      setMessage(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Security Demo Trigger</h1>

        <p style={{ fontSize: 13, color: "#9aa4b2", marginBottom: 20 }}>
          Use this phone page to create demo incidents for the command center map.
        </p>

        <label style={labelStyle}>Location</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={inputStyle}
        >
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {formatLocationLabel(loc)}
            </option>
          ))}
        </select>

        <label style={{ ...labelStyle, marginTop: 14 }}>User ID</label>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 14 }}>Door ID</label>
        <input
          value={doorId}
          onChange={(e) => setDoorId(e.target.value)}
          style={inputStyle}
        />

        <div style={buttonGridStyle}>
          {incidentButtons.map((incident) => (
            <button
              key={incident.key}
              onClick={() => triggerIncident(incident.key)}
              disabled={loading}
              style={{
                ...buttonStyle,
                background: incident.color,
                opacity: loading ? 0.65 : 1,
              }}
            >
              <span style={{ display: "block", fontSize: 15 }}>
                {incident.label}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  opacity: 0.85,
                }}
              >
                {incident.description}
              </span>
            </button>
          ))}

          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "#a93f3f",
              opacity: loading ? 0.65 : 1,
            }}
          >
            Reset Demo State
          </button>
        </div>

        <div style={messageStyle}>{message}</div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0f1115",
  color: "#f5f7fa",
  fontFamily: "Segoe UI, system-ui, sans-serif",
  padding: 20,
};

const cardStyle = {
  maxWidth: 460,
  margin: "0 auto",
  background: "#181c22",
  border: "1px solid #2a2f38",
  borderRadius: 16,
  padding: 20,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #2e3641",
  background: "#11151a",
  color: "#f5f7fa",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const buttonGridStyle = {
  display: "grid",
  gap: 12,
  marginTop: 20,
};

const buttonStyle = {
  border: "none",
  borderRadius: 12,
  padding: "14px 16px",
  color: "white",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "left",
};

const messageStyle = {
  marginTop: 18,
  fontSize: 13,
  color: "#c9d2dc",
  background: "#11151a",
  borderRadius: 10,
  padding: 12,
  minHeight: 44,
};