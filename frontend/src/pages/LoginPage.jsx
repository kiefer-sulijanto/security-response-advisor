import { useState } from "react";
import { font } from "../constants/colors";
import certisLogo from "../images/new-logo-certis-x2.png";

const VALID_USERS = [
  { id: "cc1", name: "Bill Adams",    badge: "CC-0001" },
  { id: "cc2", name: "Julia Roman",   badge: "CC-0002" },
  { id: "cc3", name: "Jeffrey Cowan", badge: "CC-0003" },
  { id: "cc4", name: "Renato Massey", badge: "CC-0004" },
];

const SHIFTS = [
  { id: "morning",   label: "Morning Shift",   time: "07:00 – 15:00" },
  { id: "afternoon", label: "Afternoon Shift",  time: "15:00 – 23:00" },
  { id: "night",     label: "Night Shift",      time: "23:00 – 07:00" },
];

export function LoginPage({ onLogin }) {
  const [name,  setName]  = useState("");
  const [badge, setBadge] = useState("");
  const [shift, setShift] = useState(() => {
    const h = new Date().getHours();
    if (h >= 7 && h < 15) return "morning";
    if (h >= 15 && h < 23) return "afternoon";
    return "night";
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim())  return setError("Please enter your name.");
    if (!badge.trim()) return setError("Please enter your Staff ID.");

    const match = VALID_USERS.find(
      u => u.name.toLowerCase() === name.trim().toLowerCase() &&
           u.badge.toUpperCase() === badge.trim().toUpperCase()
    );

    if (!match) return setError("Name and Staff ID do not match any authorised operator.");

    setError("");
    const shiftObj = SHIFTS.find(s => s.id === shift);
    onLogin({ id: match.id, name: match.name, badge: match.badge, shift: shiftObj });
  };

  return (
    <div style={{
      width: "100%", height: "100vh",
      background: "#111113",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: font,
      overflow: "hidden",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        .cc-label {
          display: block;
          font-size: 11px; font-weight: 700;
          color: #555960;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .cc-input {
          width: 100%;
          background: #242428;
          border: 1px solid #323238;
          border-radius: 12px;
          color: #f0f0f0;
          font-size: 15px;
          padding: 14px 16px;
          outline: none;
          font-family: ${font};
          transition: border-color .15s;
        }
        .cc-input::placeholder { color: #3a3d42; }
        .cc-input:focus { border-color: #F07820; }
      `}</style>

      {/* Logo above card */}
      <div style={{ marginBottom: 20, width: "100%", maxWidth: 420, display: "flex", alignItems: "center", gap: 14 }}>
        <img src={certisLogo} alt="Certis" style={{ width: 72, height: 72, objectFit: "contain" }} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#F07820", letterSpacing: 3, lineHeight: 1.2 }}>CERTIS</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#555960", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>
            AI Command Centre
          </div>
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 420,
        background: "#1c1c1f",
        borderRadius: 16,
        border: "1px solid #2a2a2e",
        padding: "32px 32px 28px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
      }}>

        {/* Card header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#f0f0f0", marginBottom: 4 }}>
            Sign In
          </div>
          <div style={{ fontSize: 13, color: "#555960" }}>
            Enter your credentials to begin your session.
          </div>
        </div>

        {/* Form — ground-officer style inputs */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label className="cc-label">Full Name</label>
            <input
              className="cc-input"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              autoComplete="name"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label className="cc-label">Badge / Staff ID</label>
            <input
              className="cc-input"
              type="text"
              value={badge}
              onChange={e => { setBadge(e.target.value); setError(""); }}
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label className="cc-label">Shift</label>
            <select
              className="cc-input"
              value={shift}
              onChange={e => setShift(e.target.value)}
            >
              {SHIFTS.map(s => (
                <option key={s.id} value={s.id}>{s.label} ({s.time})</option>
              ))}
            </select>
          </div>

          {error && (
            <p style={{
              fontSize: 13, color: "#e24b4a",
              background: "rgba(226,75,74,0.1)",
              border: "1px solid rgba(226,75,74,0.3)",
              borderRadius: 8, padding: "8px 12px", margin: 0,
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              marginTop: 8, padding: "14px 20px",
              fontSize: 16, fontWeight: 700,
              background: "#F07820", color: "#fff",
              border: "none", borderRadius: 50,
              cursor: "pointer",
              transition: "opacity .15s, transform .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "scale(1)"; }}
          >
            Sign In
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: "#323238", marginTop: 24 }}>
          Certis Security Management Platform · v1.0
        </p>
      </div>
    </div>
  );
}
