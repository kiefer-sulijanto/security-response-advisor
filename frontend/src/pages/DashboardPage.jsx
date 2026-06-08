import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { CAMERA_CONFIG } from "../config/cameras";
import { TopBar } from "../components/TopBar";
import { CameraFeed } from "../components/CameraFeed";
import { StatCard, EmptyState, Badge, StatusDot } from "../components/ui";
import { api } from "../services/api";
import { UploadPanel } from "./UploadPage";
import { getIncidentSourceInfo } from "../services/incidentSource";

const GO_STATUS_META = {
  responding: { color: "#e24b4a", label: "Assigned"   },
  patrolling: { color: "#efaf27", label: "Patrolling" },
  standby:    { color: "#4a9eff", label: "Offline"    },
  offline:    { color: "#4a9eff", label: "Offline"    },
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

export function DashboardPage({ onNav, onAnalysisComplete, analyses, incidents, groundOfficers = [], dispatches = [] }) {
  // Threat counts reflect live backend incidents (camera / demo trigger / pipeline),
  // not local upload-analysis history, so the dashboard matches real operations.
  const activeIncidents = incidents.filter(i => i.status !== "resolved");
  const criticalCount  = activeIncidents.filter(i => i.severity === "critical" || i.flag === "red").length;
  const warningCount   = activeIncidents.filter(i => i.severity === "warning"  || i.flag === "yellow").length;
  const threatCount    = criticalCount + warningCount;
  const activeOfficers = groundOfficers.filter(g => g.online);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError,   setResetError]   = useState("");

  async function handleResetDemo() {
    const confirmed = window.confirm(
      "Reset all demo incidents, dispatches, reports, officers, and pipeline state?"
    );
    if (!confirmed) return;
    setResetLoading(true);
    setResetError("");
    try {
      await api.resetDemoState();
      window.location.reload();
    } catch (err) {
      setResetLoading(false);
      setResetError(err.message || "Reset failed");
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
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
            />
            <StatCard
              label="Threats Detected"
              value={threatCount || "—"}
              sub={criticalCount ? `${criticalCount} critical, ${warningCount} warning` : warningCount ? `${warningCount} warnings` : "None so far"}
              accent={criticalCount ? C.red : warningCount ? C.amber : undefined}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            />
            <StatCard
              label="Active Ground Officers"
              value={activeOfficers.length || "—"}
              sub={activeOfficers.length ? `${activeOfficers.length} online` : "None online"}
              accent={activeOfficers.length ? C.blue : undefined}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            />
            <StatCard
              label="Incidents Logged"
              value={incidents.length || "—"}
              sub={incidents.length ? `${activeIncidents.length} active` : "None logged"}
              accent={activeIncidents.length ? C.red : undefined}
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>}
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    <button onClick={handleResetDemo} disabled={resetLoading} style={{
                      background: "transparent", border: `1px solid ${C.border}`,
                      color: resetLoading ? C.textMuted : C.textMuted, fontSize: 11, fontWeight: 600,
                      cursor: resetLoading ? "not-allowed" : "pointer", padding: "5px 10px", borderRadius: 6,
                      transition: "border-color .15s, color .15s", opacity: resetLoading ? 0.5 : 1,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                    onMouseEnter={e => { if (!resetLoading) { e.currentTarget.style.borderColor = C.textSecondary; e.currentTarget.style.color = C.textSecondary; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
                    >
                      {resetLoading && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ animation: "spin 0.8s linear infinite" }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                      )}
                      {resetLoading ? "Resetting…" : "Reset Demo"}
                    </button>
                    {resetError && (
                      <span style={{ fontSize: 10, color: C.red, maxWidth: 140, textAlign: "right", lineHeight: 1.3 }}>
                        {resetError}
                      </span>
                    )}
                  </div>
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
                action={activeIncidents.length ? "View all →" : undefined}
                onAction={() => onNav("incidents")}
              />
              {activeIncidents.length === 0 ? (
                <EmptyState title="No active incidents" />
              ) : (
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {activeIncidents.slice().reverse().slice(0, 8).map((inc, i, arr) => {
                    const sev = inc.severity === "critical" ? "critical"
                              : inc.severity === "warning"  ? "warning" : "info";
                    // Normalized source label (camera / upload / access), consistent
                    // with the Incidents page and report exports.
                    const sourceLabel = getIncidentSourceInfo(inc).label;
                    const timeLabel = inc.createdAt
                      ? new Date(inc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : inc.time || "";
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
                            {inc.incidentType || inc.videoName || "Incident"}
                          </p>
                          <p style={{
                            fontSize: 11, color: C.textMuted, margin: 0,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {sourceLabel}{timeLabel ? ` · ${timeLabel}` : ""}
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

        {/* ── Video Analysis ── */}
        <div>
          <SectionLabel>Analyze Footage</SectionLabel>
          <UploadPanel onAnalysisComplete={onAnalysisComplete} embedded />
        </div>

        {/* ── Activity ── */}
        <div>
          <SectionLabel>Activity</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Recent Analyses */}
            <div style={card({ padding: 0, overflow: "hidden" })}>
              <CardHeader title="Recent Analyses" />
              {analyses.length === 0 ? (
                <EmptyState
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
                  title="No analyses yet"
                  subtitle="Use the Analyze Footage panel above to run your first AI-powered security analysis." />
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
                <EmptyState
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                  title="No officers" subtitle="Officers will appear here once added." />
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
