import { C, card, font } from "../constants/colors";
import { CAMERA_CONFIG } from "../config/cameras";
import { TopBar } from "../components/TopBar";
import { CameraFeed } from "../components/CameraFeed";
import { StatCard, EmptyState, Badge } from "../components/ui";

const GO_STATUS_META = {
  responding: { color: "#e24b4a", label: "Responding" },
  patrolling: { color: "#efaf27", label: "Patrolling" },
  standby:    { color: "#4a9eff", label: "Standby"    },
  off_duty:   { color: "#555960", label: "Off Duty"   },
};

export function DashboardPage({ onNav, analyses, incidents, groundOfficers = [], dispatches = [] }) {
  const criticalCount = analyses.filter(a => a.result?.segments?.some(s => s.color === C.red)).length;
  const warningCount  = analyses.filter(a => a.result?.segments?.some(s => s.color === C.amber)).length;

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font }}>
      <TopBar title="Dashboard" subtitle="Security analysis overview"
        criticalCount={incidents.filter(i => i.status !== "resolved").length} />
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
          <StatCard label="Videos Analyzed"  value={analyses.length || "—"} sub={analyses.length ? `${analyses.length} total` : "No videos yet"} icon="🎥" />
          <StatCard label="Threats Detected" value={criticalCount || "—"} sub={criticalCount ? "Critical events" : "None so far"} accent={criticalCount ? C.red : undefined} icon="🚨" />
          <StatCard label="Warnings"         value={warningCount  || "—"} sub={warningCount  ? "Needs attention" : "None so far"} accent={warningCount ? C.amber : undefined} icon="⚠️" />
          <StatCard label="All Clear (Green)" value={incidents.filter(i=>i.flag==="green").length || "—"} sub="Logged for review" icon="🟢" />
          <StatCard label="Incidents Logged" value={incidents.length || "—"} sub={incidents.length ? `${incidents.filter(i=>i.status!=="resolved").length} active` : "None logged"} icon="📋" />
        </div>

        {/* Camera preview strip */}
        <div style={card({ padding: 20 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Live Cameras</p>
            <button onClick={() => onNav("cameras")} style={{ background: "transparent", border: "none",
              color: C.green, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>View all →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {CAMERA_CONFIG.map(cam => (
              <div key={cam.id} style={{ borderRadius: 8, overflow: "hidden",
                border: `1px solid ${C.border}`, transition: "border-color .15s", cursor: "pointer" }}
                onClick={() => onNav("cameras")}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <CameraFeed cam={cam} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent analyses */}
        <div style={card({ padding: 0, overflow: "hidden" })}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Recent Analyses</p>
            <button onClick={() => onNav("upload")} style={{ background: "transparent", border: "none",
              color: C.green, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>+ New analysis →</button>
          </div>
          {analyses.length === 0 ? (
            <EmptyState icon="🎥" title="No analyses yet"
              subtitle="Upload a video to run your first AI-powered security analysis."
              actionLabel="Upload video" onAction={() => onNav("upload")} />
          ) : (
            analyses.slice().reverse().slice(0, 6).map((item, i, arr) => {
              const hasCritical = item.result?.segments?.some(s => s.color === C.red);
              const hasWarning  = item.result?.segments?.some(s => s.color === C.amber);
              const sev = hasCritical ? "critical" : hasWarning ? "warning" : "info";
              return (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "13px 20px",
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                  cursor: "pointer", transition: "background .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: C.border,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="10" height="10" rx="2" fill="none" stroke={C.textSecondary} strokeWidth="1.2"/>
                      <path d="M11 6l4-2v8l-4-2" stroke={C.textSecondary} strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 2px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.filename}</p>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{item.time}</p>
                  </div>
                  <Badge sev={sev} />
                </div>
              );
            })
          )}
        </div>

        {/* Ground Officers Status */}
        <div style={card({ padding: 0, overflow: "hidden" })}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Ground Officers</p>
            <button onClick={() => onNav("officers")} style={{ background: "transparent", border: "none",
              color: C.green, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>Manage & Dispatch →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)" }}>
            {groundOfficers.map((g, i) => {
              const meta = GO_STATUS_META[g.status] || GO_STATUS_META.standby;
              const isLast = i >= groundOfficers.length - 2;
              return (
                <div key={g.id} style={{
                  padding: "14px 18px", display: "flex", gap: 10, alignItems: "center",
                  borderRight: i % 2 === 0 ? `1px solid ${C.border}` : "none",
                  borderBottom: !isLast ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `${meta.color}22`, border: `1.5px solid ${meta.color}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: meta.color }}>
                    {g.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block",
                        boxShadow: g.status === "responding" ? `0 0 0 3px ${meta.color}33` : "none" }} />
                      <span style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {g.location}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {dispatches.length > 0 && (
            <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.textMuted }}>
                {dispatches.length} dispatch{dispatches.length !== 1 ? "es" : ""} sent today
              </span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: C.green, fontWeight: 600, cursor: "pointer" }}
                onClick={() => onNav("officers")}>View log →</span>
            </div>
          )}
        </div>

        {/* Analyze CTA */}
        <div style={card({ padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between",
          borderColor: C.green, background: "rgba(92,186,71,0.04)" })}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Analyze new footage</p>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Upload a video clip to run AI-powered threat detection</p>
          </div>
          <button onClick={() => onNav("upload")} style={{
            background: C.green, color: "#1a1a1a", border: "none", borderRadius: 50,
            padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0, transition: "transform .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <span style={{ width: 12, height: 12, background: "#1a1a1a", borderRadius: "50%" }} />
            Upload & Analyze
          </button>
        </div>

      </div>
    </div>
  );
}
