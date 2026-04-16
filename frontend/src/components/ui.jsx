import { C } from "../constants/colors";

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${C.border}`, borderTopColor: C.green,
      borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
export function Badge({ sev }) {
  const map = {
    critical: { bg: C.redDim,   color: C.red,   label: "Critical" },
    warning:  { bg: C.amberDim, color: C.amber,  label: "Warning"  },
    info:     { bg: C.blueDim,  color: C.blue,   label: "Info"     },
  };
  const t = map[sev] || map.info;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", width: "fit-content",
      background: t.bg, color: t.color, fontSize: 11, fontWeight: 700,
      padding: "3px 10px", borderRadius: 20, letterSpacing: ".4px", textTransform: "uppercase",
      border: `1px solid ${t.color}30`,
    }}>
      {t.label}
    </span>
  );
}

// ── StatusDot ──────────────────────────────────────────────────────────────
export function StatusDot({ status }) {
  const col = status === "active"      ? C.red
            : status === "open"        ? C.amber
            : status === "in_progress" ? C.blue
            : status === "reviewing"   ? C.amber
            : "#22c55e";
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%",
    background: col, marginRight: 6, flexShrink: 0,
    boxShadow: status === "active" || status === "open" ? `0 0 0 3px ${col}33` : "none",
  }} />;
}

// ── StatCard ───────────────────────────────────────────────────────────────
import { card } from "../constants/colors";

export function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={card({
      padding: "18px 20px",
      borderLeft: accent ? `3px solid ${accent}` : `3px solid ${C.border}`,
      transition: "transform .15s, box-shadow .15s",
    })}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.3)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, margin: 0, letterSpacing: ".5px", textTransform: "uppercase" }}>{label}</p>
        <span style={{
          width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          background: accent ? `${accent}18` : C.border, fontSize: 14,
        }}>{icon}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: accent || C.textPrimary, margin: "0 0 4px", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{sub}</p>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", gap: 12, textAlign: "center" }}>
      <div style={{ fontSize: 40, opacity: .35 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: C.textSecondary, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, maxWidth: 280 }}>{subtitle}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} style={{
          marginTop: 8, background: C.green, color: "#1a1a1a", border: "none",
          borderRadius: 50, padding: "10px 24px", fontSize: 13, fontWeight: 700,
          cursor: "pointer", transition: "transform .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >{actionLabel}</button>
      )}
    </div>
  );
}
