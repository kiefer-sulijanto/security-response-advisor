import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Badge, StatusDot, EmptyState } from "../components/ui";

export function IncidentsPage({ incidents, groundOfficers = [], analyses = [], onDispatch, onNav }) {
  const [filter,      setFilter]      = useState("all");
  const [dispatchFor, setDispatchFor] = useState(null);   // incidentId being dispatched
  const [expandedId,  setExpandedId]  = useState(null);   // incidentId showing details
  const [selOfficer,  setSelOfficer]  = useState("");
  const [instrText,   setInstrText]   = useState("");
  const [instrPrio,   setInstrPrio]   = useState("high");

  const filtered = filter === "all" ? incidents
    : incidents.filter(i => i.severity === filter || i.status === filter);

  const handleSendDispatch = (inc) => {
    if (!selOfficer || !instrText.trim()) return;
    onDispatch({ officerId: selOfficer, instruction: instrText.trim(), priority: instrPrio, incidentId: inc.id });
    setDispatchFor(null);
    setSelOfficer("");
    setInstrText("");
    setInstrPrio("high");
  };

  const availableOfficers = groundOfficers.filter(g => g.status !== "off_duty");

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font }}>
      <TopBar title="Incidents" subtitle="Logged security events"
        criticalCount={incidents.filter(i => i.status !== "resolved").length} />
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["all", "critical", "warning", "info", "active", "in_progress", "resolved"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? C.green : C.surface,
              color: filter === f ? "#1a1a1a" : C.textSecondary,
              border: `1px solid ${filter === f ? C.green : C.border}`,
              borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all .15s",
            }}>{FILTER_LABELS[f] || f}</button>
          ))}
        </div>

        <div style={card({ overflow: "hidden", padding: 0 })}>
          {filtered.length === 0 ? (
            <EmptyState icon="📋" title="No incidents"
              subtitle={filter === "all"
                ? "Incidents appear automatically when AI analysis detects threats."
                : `No incidents match the "${filter}" filter.`}
              actionLabel={filter === "all" ? "Analyze a video" : undefined}
              onAction={filter === "all" ? () => onNav("upload") : undefined}
            />
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["ID", "Time", "Source", "Severity", "Status", "Assigned To", "Action", ""].map(h => (
                      <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11,
                        fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".6px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inc) => {
                    const assignedOfficer = inc.assignedTo ? groundOfficers.find(g => g.id === inc.assignedTo) : null;
                    const isDispatching   = dispatchFor === inc.id;
                    return (
                      <>
                        <tr key={inc.id}
                          style={{ borderBottom: expandedId === inc.id ? "none" : `1px solid ${C.border}`, cursor: "default" }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: C.green }}>{inc.videoName || inc.incidentType || inc.id}</td>
                          <td style={{ padding: "14px 18px", fontSize: 13, color: C.textSecondary }}>{inc.timestamp}</td>
                          <td style={{ padding: "14px 18px", fontSize: 13, color: C.textPrimary,
                            maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.videoName}</td>
                          <td style={{ padding: "14px 18px" }}><Badge sev={inc.severity} /></td>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", fontSize: 13, color: C.textPrimary }}>
                              <StatusDot status={inc.status} />
                              {STATUS_LABELS[inc.status] || inc.status}
                            </div>
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            {assignedOfficer ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6,
                                  background: "rgba(240,120,32,0.15)", border: "1px solid rgba(240,120,32,0.4)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 9, fontWeight: 800, color: C.green }}>
                                  {assignedOfficer.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                                </div>
                                <span style={{ fontSize: 12, color: C.textSecondary }}>{assignedOfficer.name.split(" ")[0]}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            <button
                              onClick={() => { setDispatchFor(isDispatching ? null : inc.id); setSelOfficer(""); setInstrText(""); }}
                              style={{
                                background: isDispatching ? C.greenDim : C.surface,
                                border: `1px solid ${isDispatching ? C.green : C.border}`,
                                color: isDispatching ? C.green : C.textSecondary,
                                borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                transition: "all .15s",
                              }}
                            >
                              {isDispatching ? "Cancel" : "Dispatch GO"}
                            </button>
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            <button
                              onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                              style={{
                                background: expandedId === inc.id ? C.blueDim : "transparent",
                                border: `1px solid ${expandedId === inc.id ? C.blue : C.border}`,
                                color: expandedId === inc.id ? C.blue : C.textMuted,
                                borderRadius: 7, padding: "5px 12px", fontSize: 12,
                                fontWeight: 600, cursor: "pointer", transition: "all .15s",
                                display: "flex", alignItems: "center", gap: 5,
                              }}
                            >
                              {expandedId === inc.id ? "▴ Hide Details" : "▾ View Details"}
                            </button>
                          </td>
                        </tr>

                        {/* Inline dispatch panel */}
                        {isDispatching && (
                          <tr key={`${inc.id}-dispatch`}>
                            <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${C.border}` }}>
                              <div style={{ padding: "16px 18px", background: "rgba(240,120,32,0.04)",
                                borderLeft: `3px solid ${C.green}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 14 }}>
                                  Dispatch Ground Officer — {inc.id}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, alignItems: "end" }}>
                                  {/* Officer selector */}
                                  <div>
                                    <label style={labelStyle}>Assign Officer *</label>
                                    <select value={selOfficer} onChange={e => setSelOfficer(e.target.value)} style={inputStyle}>
                                      <option value="">— Select —</option>
                                      {availableOfficers.map(g => (
                                        <option key={g.id} value={g.id}>{g.name} ({g.badge}) · {g.status}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {/* Priority */}
                                  <div>
                                    <label style={labelStyle}>Priority *</label>
                                    <select value={instrPrio} onChange={e => setInstrPrio(e.target.value)} style={inputStyle}>
                                      <option value="critical">Critical</option>
                                      <option value="high">High</option>
                                      <option value="medium">Medium</option>
                                    </select>
                                  </div>
                                  {/* Instruction */}
                                  <div>
                                    <label style={labelStyle}>Instruction *</label>
                                    <input
                                      type="text"
                                      value={instrText}
                                      onChange={e => setInstrText(e.target.value)}
                                      placeholder="e.g. Proceed to Level 3 East and assess the situation..."
                                      style={inputStyle}
                                    />
                                  </div>
                                </div>
                                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                  <button
                                    onClick={() => handleSendDispatch(inc)}
                                    disabled={!selOfficer || !instrText.trim()}
                                    style={{
                                      background: selOfficer && instrText.trim() ? C.green : C.border,
                                      color: selOfficer && instrText.trim() ? "#fff" : C.textMuted,
                                      border: "none", borderRadius: 8, padding: "9px 20px",
                                      fontSize: 13, fontWeight: 700, cursor: selOfficer && instrText.trim() ? "pointer" : "not-allowed",
                                      transition: "all .15s",
                                    }}
                                  >
                                    Send Instruction
                                  </button>
                                  <button onClick={() => setDispatchFor(null)} style={{
                                    background: "transparent", border: `1px solid ${C.border}`,
                                    color: C.textMuted, borderRadius: 8, padding: "9px 16px",
                                    fontSize: 13, cursor: "pointer",
                                  }}>Cancel</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* AI Detail panel */}
                        {expandedId === inc.id && (
                          <tr key={`${inc.id}-detail`}>
                            <td colSpan={8} style={{ padding: 0, borderBottom: `1px solid ${C.border}` }}>
                              <div style={{ padding: "18px 20px", background: "rgba(74,158,255,0.04)", borderLeft: `3px solid ${C.blue}` }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 14 }}>
                                  AI Analysis — {inc.id} · {inc.videoName}
                                </div>

                                {/* Video player — only available in current session */}
                                {(() => {
                                  const match = analyses.find(a => a.filename === inc.videoName || a.filename === inc.incidentType)
                                  return match?.videoUrl ? (
                                    <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden",
                                      border: `1px solid ${C.border}`, background: "#000" }}>
                                      <video src={match.videoUrl} controls
                                        style={{ width: "100%", maxHeight: 300, display: "block", objectFit: "contain" }} />
                                    </div>
                                  ) : (
                                    <div style={{ marginBottom: 14, padding: "10px 14px", background: C.surface,
                                      borderRadius: 8, fontSize: 12, color: C.textMuted,
                                      display: "flex", alignItems: "center", gap: 8 }}>
                                      🎥 <span>Video not available — only accessible in the session it was analyzed</span>
                                    </div>
                                  )
                                })()}

                                {/* Flag + explanation */}
                                {inc.explanation && (
                                  <div style={{ marginBottom: 14, padding: "12px 16px", background: C.surface,
                                    borderRadius: 10, borderLeft: `3px solid ${FLAG_COLORS[inc.flag] || C.amber}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                      <span style={{ fontSize: 16 }}>{FLAG_ICONS[inc.flag] || "🟡"}</span>
                                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                                        color: FLAG_COLORS[inc.flag] || C.amber, letterSpacing: "0.5px" }}>
                                        {FLAG_LABELS[inc.flag] || "Caution"}
                                      </span>
                                      {inc.flagReason && (
                                        <span style={{ fontSize: 12, color: C.textMuted }}>— {inc.flagReason}</span>
                                      )}
                                    </div>
                                    <p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6, margin: 0 }}>{inc.explanation}</p>
                                  </div>
                                )}

                                {/* Actions */}
                                {inc.actions?.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted,
                                      textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                                      Recommended Actions
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {inc.actions.map((action, i) => (
                                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start",
                                          padding: "8px 12px", background: C.surface, borderRadius: 8,
                                          borderLeft: `3px solid ${C.green}` }}>
                                          <span style={{ fontWeight: 800, color: C.green, fontSize: 13, flexShrink: 0 }}>{i + 1}</span>
                                          <span style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>{action}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS = {
  active:      "Active",
  in_progress: "In Progress",
  resolved:    "Resolved",
};

const FILTER_LABELS = {
  all:         "All",
  critical:    "Critical",
  warning:     "Warning",
  info:        "Info",
  active:      "Active",
  in_progress: "In Progress",
  resolved:    "Resolved",
};

const FLAG_COLORS = { red: "#e24b4a", yellow: "#efaf27", green: "#22c55e" };
const FLAG_ICONS  = { red: "🔴", yellow: "🟡", green: "🟢" };
const FLAG_LABELS = { red: "Critical Threat", yellow: "Caution", green: "All Clear" };

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted,
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
};

const inputStyle = {
  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPrimary, fontSize: 13, padding: "9px 12px",
  outline: "none", fontFamily: font,
};
