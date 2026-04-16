import { C, card, font } from "../constants/colors";
import { CAMERA_CONFIG } from "../config/cameras";
import { TopBar } from "../components/TopBar";
import { CameraFeed } from "../components/CameraFeed";
import { StatCard, EmptyState, Badge, StatusDot } from "../components/ui";
import { api } from "../services/api";

const GO_STATUS_META = {
  responding: { color: "#e24b4a", label: "Responding" },
  patrolling: { color: "#efaf27", label: "Patrolling" },
  standby:    { color: "#4a9eff", label: "Standby"    },
  off_duty:   { color: "#555960", label: "Off Duty"   },
};

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, color: C.textMuted,
      letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 10px 2px",
    }}>{children}</p>
  );
}

function CardHeader({ title, action, onAction }) {
  return (
    <div style={{
      padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 14, borderRadius: 2, background: C.green, display: "inline-block", flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{title}</p>
      </div>
      {action && (
        <button onClick={onAction} style={{
          background: "transparent", border: "none", color: C.green,
          fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
          opacity: 0.85, transition: "opacity .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.85}
        >{action}</button>
      )}
    </div>
  );
}

export function DashboardPage({ onNav, analyses, incidents, groundOfficers = [], dispatches = [] }) {
  const criticalCount = analyses.filter(a => a.result?.segments?.some(s => s.color === C.red)).length;
  const warningCount  = analyses.filter(a => a.result?.segments?.some(s => s.color === C.amber)).length;
  const activeIncidents = incidents.filter(i => i.status !== "resolved");

  async function handleResetDemo() {
    const confirmed = window.confirm(
      "Reset all demo incidents, dispatches, reports, officers, and pipeline state?"
    );
    if (!confirmed) return;
    try {
      await api.resetDemoState();
      window.location.reload();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
      <TopBar
        title="Dashboard"
        subtitle="Security analysis overview"
        criticalCount={activeIncidents.length}
      />

      <div style={{ padding: "24px 28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Stats ── */}
        <div>
          <SectionLabel>Overview</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            <StatCard
              label="Videos Analyzed"
              value={analyses.length || "—"}
              sub={analyses.length ? `${analyses.length} total` : "No videos yet"}
              icon="🎥"
            />
            <StatCard
              label="Threats Detected"
              value={criticalCount || "—"}
              sub={criticalCount ? "Critical events" : "None so far"}
              accent={criticalCount ? C.red : undefined}
              icon="🚨"
            />
            <StatCard
              label="Warnings"
              value={warningCount || "—"}
              sub={warningCount ? "Needs attention" : "None so far"}
              accent={warningCount ? C.amber : undefined}
              icon="⚠️"
            />
            <StatCard
              label="Incidents Logged"
              value={incidents.length || "—"}
              sub={incidents.length ? `${activeIncidents.length} active` : "None logged"}
              accent={activeIncidents.length ? C.red : undefined}
              icon="📋"
            />
          </div>
        </div>

        {/* ── Live Monitoring ── */}
        <div>
          <SectionLabel>Live Monitoring</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Cameras */}
            <div style={card({ padding: 0, overflow: "hidden" })}>
              <div style={{
                padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 3, height: 14, borderRadius: 2, background: C.green, display: "inline-block" }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Live Cameras</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={handleResetDemo} style={{
                    background: "transparent", border: `1px solid ${C.border}`,
                    color: C.textMuted, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", padding: "5px 10px", borderRadius: 6,
                    transition: "border-color .15s, color .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.textSecondary; e.currentTarget.style.color = C.textSecondary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                  >
                    Reset Demo
                  </button>
                  <button onClick={() => onNav("cameras")} style={{
                    background: "transparent", border: "none", color: C.green,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, opacity: 0.85,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.85}
                  >View all →</button>
                </div>
              </div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {CAMERA_CONFIG.slice(0, 4).map(cam => (
                  <div key={cam.id} style={{
                    borderRadius: 8, overflow: "hidden",
                    border: `1px solid ${C.border}`, transition: "border-color .15s", cursor: "pointer",
                  }}
                  onClick={() => onNav("cameras")}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <CameraFeed cam={cam} />
                  </div>
                ))}
              </div>
            </div>

            {/* Incidents */}
            <div style={card({ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" })}>
              <CardHeader
                title="Active Incidents"
                action={incidents.length ? "View all →" : undefined}
                onAction={() => onNav("incidents")}
              />
              {incidents.length === 0 ? (
                <EmptyState icon="" title="No active incidents" />
              ) : (
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {incidents.slice().reverse().slice(0, 8).map((inc, i, arr) => {
                    const sev = inc.severity === "critical" ? "critical"
                              : inc.severity === "warning"  ? "warning" : "info";
                    return (
                      <div key={inc.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
                        borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                        cursor: "pointer", transition: "background .15s",
                      }}
                      onClick={() => onNav("incidents")}
                      onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <StatusDot status={inc.status} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 2px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {inc.title || inc.type || "Incident"}
                          </p>
                          <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                            {inc.createdAt ? new Date(inc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : inc.time || ""}
                          </p>
                        </div>
                        <Badge sev={sev} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Activity ── */}
        <div>
          <SectionLabel>Activity</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Recent Analyses */}
            <div style={card({ padding: 0, overflow: "hidden" })}>
              <CardHeader title="Recent Analyses" action="+ New →" onAction={() => onNav("upload")} />
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
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
                      borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                      cursor: "pointer", transition: "background .15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 8, background: C.border,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="1" y="3" width="10" height="10" rx="2" fill="none" stroke={C.textSecondary} strokeWidth="1.2"/>
                          <path d="M11 6l4-2v8l-4-2" stroke={C.textSecondary} strokeWidth="1.2" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: "0 0 2px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{item.filename}</p>
                        <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{item.time}</p>
                      </div>
                      <Badge sev={sev} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Ground Officers */}
            <div style={card({ padding: 0, overflow: "hidden" })}>
              <CardHeader title="Ground Officers" action="Manage →" onAction={() => onNav("officers")} />
              {groundOfficers.length === 0 ? (
                <EmptyState icon="👮" title="No officers" subtitle="Officers will appear here once added." />
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                    {groundOfficers.map((g, i) => {
                      const meta = GO_STATUS_META[g.status] || GO_STATUS_META.standby;
                      const isLast = i >= groundOfficers.length - 2;
                      return (
                        <div key={g.id} style={{
                          padding: "13px 16px", display: "flex", gap: 10, alignItems: "center",
                          borderRight: i % 2 === 0 ? `1px solid ${C.border}` : "none",
                          borderBottom: !isLast ? `1px solid ${C.border}` : "none",
                        }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: `${meta.color}18`, border: `1.5px solid ${meta.color}44`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 800, color: meta.color,
                          }}>
                            {g.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600, color: C.textPrimary,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{g.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: "50%", background: meta.color,
                                display: "inline-block",
                                boxShadow: g.status === "responding" ? `0 0 0 3px ${meta.color}33` : "none",
                              }} />
                              <span style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {dispatches.length > 0 && (
                    <div style={{
                      padding: "10px 16px", borderTop: `1px solid ${C.border}`,
                      display: "flex", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 11, color: C.textMuted }}>
                        {dispatches.length} dispatch{dispatches.length !== 1 ? "es" : ""} sent today
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: C.green, fontWeight: 600, cursor: "pointer" }}
                        onClick={() => onNav("officers")}>View log →</span>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>


      </div>
    </div>
  );
}
