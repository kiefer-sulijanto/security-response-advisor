import { C } from "../constants/colors";

export function TopBar({ title, subtitle, criticalCount }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10,
      padding: "16px 28px",
      borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(24,24,27,0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-.3px" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 11, color: C.textMuted, margin: "2px 0 0", letterSpacing: ".2px" }}>{subtitle}</p>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {criticalCount > 0 ? (
          <div style={{
            background: C.redDim, color: C.red, fontSize: 12, fontWeight: 700,
            padding: "6px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6,
            border: `1px solid ${C.red}33`,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: C.red,
              display: "inline-block", animation: "pulse 1.5s ease-in-out infinite",
            }} />
            {criticalCount} Unresolved Incident{criticalCount !== 1 ? "s" : ""}
          </div>
        ) : (
          <div style={{
            background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 12, fontWeight: 700,
            padding: "6px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6,
            border: "1px solid rgba(34,197,94,0.25)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            All Clear
          </div>
        )}

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end",
          padding: "6px 12px", borderRadius: 10,
          background: C.surface, border: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: ".3px" }}>
            {new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}
