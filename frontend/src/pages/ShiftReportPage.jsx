import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";

export function ShiftReportPage({ analyses, incidents, dispatches, goReports = [], criticalCount, onLogout }) {
  const [signedOff, setSignedOff] = useState(false);

  const active   = incidents.filter(i => i.status !== "resolved");
  const resolved = incidents.filter(i => i.status === "resolved");

  if (signedOff) {
    return (
      <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
        <TopBar title="End of Shift" subtitle="Session closed" criticalCount={0} />
        <div style={{ padding: "60px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: C.greenDim, border: `2px solid ${C.green}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke={C.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>Sign Off Complete</div>
            <div style={{ fontSize: 14, color: C.textSecondary }}>Session has ended. Have a good rest.</div>
          </div>

          <div style={card({ width: "100%", maxWidth: 420, padding: "20px 24px" })}>
            <Row label="Incidents Logged"   value={incidents.length} />
            <Row label="Resolved"           value={resolved.length} accent="#22c55e" />
            <Row label="Open Incidents"     value={active.length}   accent={active.length > 0 ? C.amber : undefined} />
            <Row label="GO Dispatches"      value={dispatches.length} />
            <Row label="Videos Analyzed"    value={analyses.length} />
            <Row label="GO Field Reports"   value={goReports.length} last />
          </div>

          <button
            onClick={onLogout}
            style={{
              background: C.green, color: "#fff", border: "none", borderRadius: 50,
              padding: "14px 40px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              marginTop: 8, transition: "opacity .15s, transform .12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "scale(1)"; }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
      <TopBar title="End of Shift" subtitle="Sign off to end your session" criticalCount={criticalCount} />

      <div style={{ padding: "40px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

        {/* Shift summary */}
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
            letterSpacing: "0.5px", marginBottom: 10 }}>Shift Summary</div>
          <div style={card({ padding: "20px 24px" })}>
            <Row label="Incidents Logged"   value={incidents.length} />
            <Row label="Resolved"           value={resolved.length} accent="#22c55e" />
            <Row label="Open Incidents"     value={active.length}   accent={active.length > 0 ? C.amber : undefined} />
            <Row label="GO Dispatches"      value={dispatches.length} />
            <Row label="Videos Analyzed"    value={analyses.length} />
            <Row label="GO Field Reports"   value={goReports.length} last />
          </div>
        </div>

        {/* Carry-over warning */}
        {active.length > 0 && (
          <div style={{
            width: "100%", maxWidth: 420,
            background: "rgba(239,175,39,0.08)", border: `1px solid ${C.amber}55`,
            borderRadius: 12, padding: "14px 18px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 4 }}>
              {active.length} Unresolved Incident{active.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary }}>
              These will be carried over and must be briefed to the incoming Command Centre Officer.
            </div>
          </div>
        )}

        {/* Confirmation */}
        <div style={{
          width: "100%", maxWidth: 420,
          background: "rgba(240,120,32,0.05)", border: "1px solid rgba(240,120,32,0.25)",
          borderRadius: 12, padding: "16px 18px",
        }}>
          <div style={{ fontSize: 13, color: C.textSecondary }}>
            By signing off, you confirm that all incidents have been logged and outstanding matters have been noted for handover.
          </div>
        </div>

        <button
          onClick={() => setSignedOff(true)}
          style={{
            width: "100%", maxWidth: 420,
            background: C.green, color: "#fff", border: "none", borderRadius: 50,
            padding: "16px 0", fontSize: 16, fontWeight: 800, cursor: "pointer",
            transition: "opacity .15s, transform .12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = "scale(1)"; }}
        >
          Sign Off
        </button>

      </div>
    </div>
  );
}

function Row({ label, value, accent, last }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0",
      borderBottom: last ? "none" : `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 13, color: C.textSecondary }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent || C.textPrimary }}>{value}</span>
    </div>
  );
}
