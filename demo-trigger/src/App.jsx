import { useState } from "react";
import { api } from "./services/api";

const locations = ["server_room", "lobby"];

export default function App() {
  const [location, setLocation] = useState("server_room");
  const [userId, setUserId] = useState("U123");
  const [doorId, setDoorId] = useState("D01");
  const [message, setMessage] = useState("Ready");
  const [loading, setLoading] = useState(false);

  async function sendAccess(action) {
    setLoading(true);
    setMessage(`Sending ${action}...`);

    try {
      const result = await api.processAccessLog({
        action,
        location,
        user_id: userId,
        door_id: doorId,
      });

      setMessage(
        result.incidents_created > 0
          ? `${action} sent. ${result.incidents_created} incident(s) created.`
          : `${action} sent successfully.`
      );
    } catch (err) {
      setMessage(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function sendManualEvent(eventType) {
    setLoading(true);
    setMessage(`Sending ${eventType}...`);

    try {
      const result = await api.manualTrigger({
        event_type: eventType,
        location,
        source: "phone_demo_trigger",
        metadata: {
          user_id: userId,
          door_id: doorId,
        },
      });

      setMessage(
        result.incidents_created > 0
          ? `${eventType} sent. ${result.incidents_created} incident(s) created.`
          : `${eventType} sent successfully.`
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
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1115",
        color: "#f5f7fa",
        fontFamily: "Segoe UI, system-ui, sans-serif",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          background: "#181c22",
          border: "1px solid #2a2f38",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Security Demo Trigger</h1>
        <p style={{ fontSize: 13, color: "#9aa4b2", marginBottom: 20 }}>
          Use this phone page to trigger access-log events for the dashboard demo.
        </p>

        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Location</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={inputStyle}
        >
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 12, marginTop: 14, marginBottom: 6 }}>
          User ID
        </label>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={inputStyle}
        />

        <label style={{ display: "block", fontSize: 12, marginTop: 14, marginBottom: 6 }}>
          Door ID
        </label>
        <input
          value={doorId}
          onChange={(e) => setDoorId(e.target.value)}
          style={inputStyle}
        />

        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <button
            onClick={() => sendAccess("ACCESS_GRANTED")}
            disabled={loading}
            style={{ ...buttonStyle, background: "#1f8f5f" }}
          >
            Access Granted
          </button>

          <button
            onClick={() => sendAccess("ACCESS_DENIED")}
            disabled={loading}
            style={{ ...buttonStyle, background: "#c68b16" }}
          >
            Access Denied
          </button>

          <button
            onClick={() => sendManualEvent("panic_button")}
            disabled={loading}
            style={{ ...buttonStyle, background: "#d64545" }}
          >
            Panic Button
          </button>

          <button
            onClick={() => sendManualEvent("smoke_detected")}
            disabled={loading}
            style={{ ...buttonStyle, background: "#e05a2a" }}
          >
            Fire Alert
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            style={{ ...buttonStyle, background: "#a93f3f" }}
          >
            Reset Demo State
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 13,
            color: "#c9d2dc",
            background: "#11151a",
            borderRadius: 10,
            padding: 12,
            minHeight: 44,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}

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

const buttonStyle = {
  border: "none",
  borderRadius: 12,
  padding: "14px 16px",
  color: "white",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};