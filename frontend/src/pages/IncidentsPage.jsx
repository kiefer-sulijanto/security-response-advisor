import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Badge, StatusDot, EmptyState } from "../components/ui";

const STATUS_LABELS = {
  open:        "Open",
  active:      "Active",
  in_progress: "In Progress",
  reviewing:   "Reviewing",
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
const FLAG_LABELS = { red: "Critical Threat", yellow: "Caution", green: "All Clear" };

const SEV_BORDER = { critical: C.red, warning: C.amber, info: C.blue };

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted,
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
};
const inputStyle = {
  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPrimary, fontSize: 13, padding: "9px 12px",
  outline: "none", fontFamily: font,
};

export function IncidentsPage({ incidents, groundOfficers = [], analyses = [], onDispatch, onNav }) {
  const [filter,      setFilter]      = useState("all");
  const [dispatchFor, setDispatchFor] = useState(null);
  const [expandedId,  setExpandedId]  = useState(null);
  const [selOfficer,  setSelOfficer]  = useState("");
  const [instrText,   setInstrText]   = useState("");
  const [instrPrio,   setInstrPrio]   = useState("high");

  const filtered = filter === "all" ? incidents
    : incidents.filter(i => i.severity === filter || i.status === filter);

  const availableOfficers = groundOfficers.filter(g => g.status !== "off_duty");

  const handleSendDispatch = (inc) => {
    if (!selOfficer || !instrText.trim()) return;
    onDispatch({ officerId: selOfficer, instruction: instrText.trim(), priority: instrPrio, incidentId: inc.id });
    setDispatchFor(null); setSelOfficer(""); setInstrText(""); setInstrPrio("high");
  };

  const total    = incidents.length;
  const active   = incidents.filter(i => i.status === "active").length;
  const critical = incidents.filter(i => i.severity === "critical").length;
  const resolved = incidents.filter(i => i.status === "resolved").length;

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
      <TopBar title="Incidents" subtitle="Logged security events"
        criticalCount={incidents.filter(i => i.status !== "resolved").length} />

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Summary row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Total",    value: total,    color: C.textPrimary },
            { label: "Active",   value: active,   color: C.red   },
            { label: "Critical", value: critical, color: C.red   },
            { label: "Resolved", value: resolved, color: "#22c55e" },
          ].map(s => (
            <div key={s.label} style={card({
              padding: "16px 20px",
              borderLeft: `3px solid ${s.color === C.textPrimary ? C.border : s.color}`,
            })}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
                letterSpacing: ".5px", margin: "0 0 8px" }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all","critical","warning","info","active","in_progress","resolved"].map(f => {
            const isActive = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: isActive ? C.green : "transparent",
                color: isActive ? "#1a1a1a" : C.textSecondary,
                border: `1px solid ${isActive ? C.green : C.border}`,
                borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = C.textSecondary; e.currentTarget.style.color = C.textPrimary; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}}
              >{FILTER_LABELS[f]}</button>
            );
          })}
        </div>

        {/* ── Incident list ── */}
        <div style={card({ padding: 0, overflow: "hidden" })}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1.2fr 1fr 1fr",
            padding: "10px 20px", borderBottom: `1px solid ${C.border}`,
            background: C.sidebar,
          }}>
            {["Incident", "Time", "Source", "Severity", "Status", "Assigned", "Actions"].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: C.textMuted,
                textTransform: "uppercase", letterSpacing: ".6px" }}>{h}</span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="" title="No incidents"
              subtitle={filter === "all"
                ? "Incidents will appear automatically when threats are detected"
                : `No incidents match the "${FILTER_LABELS[filter]}" filter.`}
              actionLabel={filter === "all" ? "Analyze a video" : undefined}
              onAction={filter === "all" ? () => onNav("upload") : undefined}
            />
          ) : (
            filtered.map((inc) => {
              const assignedOfficer = inc.assignedTo ? groundOfficers.find(g => g.id === inc.assignedTo) : null;
              const isDispatching   = dispatchFor === inc.id;
              const isExpanded      = expandedId  === inc.id;
              const borderColor     = SEV_BORDER[inc.severity] || C.border;

              return (
                <div key={inc.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {/* Row */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1.2fr 1fr 1fr",
                    padding: "14px 20px", alignItems: "center",
                    borderLeft: `3px solid ${borderColor}`,
                    transition: "background .15s", cursor: "default",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Incident name */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: "0 0 2px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inc.videoName || inc.incidentType || inc.id}
                      </p>
                      <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>{inc.id}</p>
                    </div>

                    {/* Time */}
                    <span style={{ fontSize: 12, color: C.textSecondary }}>{inc.timestamp}</span>

                    {/* Source */}
                    <span style={{ fontSize: 12, color: C.textSecondary,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inc.videoName || "—"}
                    </span>

                    {/* Severity */}
                    <Badge sev={inc.severity} />

                    {/* Status */}
                    <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: C.textPrimary }}>
                      <StatusDot status={inc.status} />
                      {STATUS_LABELS[inc.status] || inc.status}
                    </div>

                    {/* Assigned */}
                    {assignedOfficer ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: "rgba(240,120,32,0.12)", border: "1px solid rgba(240,120,32,0.3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 800, color: C.green, flexShrink: 0,
                        }}>
                          {assignedOfficer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span style={{ fontSize: 12, color: C.textSecondary,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {assignedOfficer.name.split(" ")[0]}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setDispatchFor(isDispatching ? null : inc.id); setSelOfficer(""); setInstrText(""); }} style={{
                        background: isDispatching ? C.greenDim : "transparent",
                        border: `1px solid ${isDispatching ? C.green : C.border}`,
                        color: isDispatching ? C.green : C.textSecondary,
                        borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
                      }}>
                        {isDispatching ? "Cancel" : "Dispatch"}
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : inc.id)} style={{
                        background: isExpanded ? C.blueDim : "transparent",
                        border: `1px solid ${isExpanded ? C.blue : C.border}`,
                        color: isExpanded ? C.blue : C.textMuted,
                        borderRadius: 6, padding: "4px 8px", fontSize: 11,
                        fontWeight: 600, cursor: "pointer", transition: "all .15s",
                      }}>
                        {isExpanded ? "▴" : "▾"}
                      </button>
                    </div>
                  </div>

                  {/* Dispatch panel */}
                  {isDispatching && (
                    <div style={{
                      padding: "16px 20px",
                      background: "rgba(240,120,32,0.04)",
                      borderTop: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${C.green}`,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.green, margin: "0 0 14px",
                        textTransform: "uppercase", letterSpacing: ".5px" }}>
                        Dispatch Officer — {inc.id}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, alignItems: "end" }}>
                        <div>
                          <label style={labelStyle}>Assign Officer *</label>
                          <select value={selOfficer} onChange={e => setSelOfficer(e.target.value)} style={inputStyle}>
                            <option value="">— Select —</option>
                            {availableOfficers.map(g => (
                              <option key={g.id} value={g.id}>{g.name} ({g.badge}) · {g.status}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Priority *</label>
                          <select value={instrPrio} onChange={e => setInstrPrio(e.target.value)} style={inputStyle}>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Instruction *</label>
                          <input type="text" value={instrText} onChange={e => setInstrText(e.target.value)}
                            placeholder="e.g. Proceed to Level 3 East and assess the situation..."
                            style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <button onClick={() => handleSendDispatch(inc)}
                          disabled={!selOfficer || !instrText.trim()}
                          style={{
                            background: selOfficer && instrText.trim() ? C.green : C.border,
                            color: selOfficer && instrText.trim() ? "#1a1a1a" : C.textMuted,
                            border: "none", borderRadius: 8, padding: "9px 20px",
                            fontSize: 13, fontWeight: 700,
                            cursor: selOfficer && instrText.trim() ? "pointer" : "not-allowed",
                            transition: "all .15s",
                          }}>Send Instruction</button>
                        <button onClick={() => setDispatchFor(null)} style={{
                          background: "transparent", border: `1px solid ${C.border}`,
                          color: C.textMuted, borderRadius: 8, padding: "9px 16px",
                          fontSize: 13, cursor: "pointer",
                        }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Detail panel */}
                  {isExpanded && (
                    <div style={{
                      padding: "18px 20px",
                      background: "rgba(74,158,255,0.03)",
                      borderTop: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${C.blue}`,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.blue, margin: "0 0 14px",
                        textTransform: "uppercase", letterSpacing: ".5px" }}>
                        AI Analysis — {inc.id}
                      </p>
                      {inc.snapshot_base64 && (
                      <div
                        style={{
                          padding: "16px 20px",
                          borderTop: `1px solid ${C.border}`,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.textMuted,
                            margin: "0 0 10px",
                            textTransform: "uppercase",
                            letterSpacing: ".5px",
                          }}
                        >
                          Incident Snapshot
                        </p>

                        <img
                        src={
                          inc.snapshot_base64?.startsWith("data:")
                            ? inc.snapshot_base64
                            : `data:image/jpeg;base64,${inc.snapshot_base64}`
                        }
                        alt="Incident snapshot"
                        style={{
                          width: "100%",
                          maxWidth: 360,
                          height: "auto",
                          borderRadius: 10,
                          border: `1px solid ${C.border}`,
                          display: "block",
                          objectFit: "cover",
                        }}
                      />
                      </div>
                    )}
                      {/* Video */}
                      {(() => {
                        const match = analyses.find(a => a.filename === inc.videoName || a.filename === inc.incidentType);
                        return match?.videoUrl ? (
                          <div style={{ marginBottom: 16, borderRadius: 10, overflow: "hidden",
                            border: `1px solid ${C.border}`, background: "#000" }}>
                            <video src={match.videoUrl} controls
                              style={{ width: "100%", maxHeight: 280, display: "block", objectFit: "contain" }} />
                          </div>
                        ) : (
                          <div style={{ marginBottom: 14, padding: "10px 14px", background: C.surface,
                            borderRadius: 8, fontSize: 12, color: C.textMuted }}>
                            Video not available — only accessible in the session it was analyzed
                          </div>
                        );
                      })()}

                      {/* Flag + explanation */}
                      {inc.explanation && (
                        <div style={{ marginBottom: 14, padding: "12px 16px", background: C.surface,
                          borderRadius: 10, borderLeft: `3px solid ${FLAG_COLORS[inc.flag] || C.amber}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
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

                      {/* Recommended actions */}
                      {inc.actions?.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
                            letterSpacing: ".5px", margin: "0 0 8px" }}>Recommended Actions</p>
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
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
