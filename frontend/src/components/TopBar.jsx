import { C } from "../constants/colors";

export function TopBar({ title, subtitle, criticalCount }) {
  return (
    <div style={{
      padding: "20px 28px", borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg,
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-.3px" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: C.textMuted, margin: "2px 0 0" }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {criticalCount > 0 ? (
          <div style={{ background: C.redDim, color: C.red, fontSize: 12, fontWeight: 700,
            padding: "6px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.red,
              display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />
            {criticalCount} Unresolved Incident{criticalCount !== 1 ? "s" : ""}
          </div>
        ) : (
          <div style={{ background: C.greenDim, color: C.green, fontSize: 12, fontWeight: 700,
            padding: "6px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            All Clear
          </div>
        )}
        <div style={{ fontSize: 12, color: C.textSecondary }}>
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
