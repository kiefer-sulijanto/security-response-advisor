import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Badge, StatusDot } from "../components/ui";

const STATUS_META = {
  responding: { label: "Assigned",    color: "#e24b4a", dot: "critical" },
  patrolling: { label: "Patrolling",  color: "#efaf27", dot: "warning"  },
  standby:    { label: "Offline",     color: "#4a9eff", dot: "info"     },
  offline:    { label: "Offline",     color: "#4a9eff", dot: "info"     },
  off_duty:   { label: "Off Duty",    color: "#555960", dot: "info"     },
};

export function GroundOfficersPage({ groundOfficers, dispatches, incidents, onDispatch, criticalCount }) {
  const [expandedId,   setExpandedId]   = useState(null);
  const [instrText,    setInstrText]    = useState("");
  const [instrPrio,    setInstrPrio]    = useState("high");
  const [instrIncident,setInstrIncident]= useState("");
  const [successFor,   setSuccessFor]   = useState(null);
  const [dispatchError,setDispatchError]= useState("");

  const handleDispatch = async (officerId) => {
    if (!instrText.trim() || !instrIncident) return;
    setDispatchError("");
    try {
      await onDispatch({ officerId, instruction: instrText.trim(), priority: instrPrio, incidentId: instrIncident });
      setInstrText("");
      setInstrPrio("high");
      setInstrIncident("");
      setExpandedId(null);
      setSuccessFor(officerId);
      setTimeout(() => setSuccessFor(null), 3000);
    } catch (err) {
      setDispatchError(err.message || "Dispatch failed. Please try again.");
    }
  };

  const offlineCount   = groundOfficers.filter(g => g.status === "standby" || g.status === "offline").length;
  const patrollingCount = groundOfficers.filter(g => g.status === "patrolling").length;
  const assignedCount  = groundOfficers.filter(g => g.status === "responding").length;

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
      <TopBar title="Ground Officers" subtitle="Field team — live status" criticalCount={criticalCount} />

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <MiniStat label="Offline"          value={offlineCount}    accent={C.blue}  />
          <MiniStat label="Patrolling"       value={patrollingCount} accent={C.amber} />
          <MiniStat label="Assigned"         value={assignedCount}   accent={C.red}   />
          <MiniStat label="Dispatches Today" value={dispatches.length} accent={C.green} />
        </div>

        {/* Officer cards */}
        <div>
          <SectionHead>Officers On Duty</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {groundOfficers.map(officer => {
              const meta    = STATUS_META[officer.status] || STATUS_META.standby;
              const isOpen  = expandedId === officer.id;
              const myDispatches = dispatches.filter(d => d.officerId === officer.id);

              return (
                <div key={officer.id} style={card({ padding: 0, overflow: "hidden",
                  borderColor: officer.status === "responding" ? "rgba(226,75,74,0.4)" : C.border })}>

                  {/* Card header */}
                  <div style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: `${meta.color}22`,
                      border: `2px solid ${meta.color}55`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800, color: meta.color,
                    }}>
                      {officer.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{officer.name}</span>
                        {officer.online && (
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
                            display: "inline-block", boxShadow: "0 0 0 3px rgba(34,197,94,0.25)", flexShrink: 0,
                          }} title="Online" />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>{officer.badge}{officer.shift ? ` · ${officer.shift} Shift` : ""}</div>
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, display: "inline-block",
                          boxShadow: officer.status === "responding" ? `0 0 0 3px ${meta.color}33` : "none" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isOpen ? null : officer.id)}
                      style={{
                        background: isOpen ? C.greenDim : C.surface,
                        border: `1px solid ${isOpen ? C.green : C.border}`,
                        color: isOpen ? C.green : C.textSecondary,
                        borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isOpen ? "Cancel" : "Dispatch"}
                    </button>
                  </div>

                  {/* Current task */}
                  <div style={{ padding: "0 18px 12px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>Current Task</div>
                    <div style={{ fontSize: 13, color: C.textPrimary }}>{officer.task}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      {officer.lastSeenAt ? `Updated ${new Date(officer.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not yet updated"}
                    </div>
                  </div>

                  {/* Recent dispatches to this officer */}
                  {myDispatches.length > 0 && !isOpen && (
                    <div style={{ padding: "10px 18px", background: "rgba(10,17,32,0.5)" }}>
                      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        Last Instruction
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary,
                        overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {myDispatches[myDispatches.length - 1].instruction}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                        {myDispatches[myDispatches.length - 1].timestamp}
                      </div>
                    </div>
                  )}

                  {/* Success banner */}
                  {successFor === officer.id && !isOpen && (
                    <div style={{ padding: "10px 18px", background: "rgba(34,197,94,0.08)",
                      borderTop: `1px solid rgba(34,197,94,0.25)`,
                      display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
                        Instruction sent to {officer.name.split(" ")[0]}
                      </span>
                    </div>
                  )}

                  {/* Dispatch form */}
                  {isOpen && (
                    <div style={{ padding: "14px 18px", background: "rgba(240,120,32,0.04)", borderTop: `1px solid ${C.border}` }}>
                      {/* Link to incident (required) */}
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Incident *</label>
                        <select
                          value={instrIncident}
                          onChange={e => { setInstrIncident(e.target.value); setDispatchError(""); }}
                          style={inputStyle}
                        >
                          <option value="">— Select Incident —</option>
                          {incidents.map(inc => (
                            <option key={inc.id} value={inc.id}>{inc.id} · {inc.videoName || inc.incidentType} ({inc.severity || inc.flag})</option>
                          ))}
                        </select>
                      </div>

                      {/* Priority */}
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Priority</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          {[["critical","#e24b4a"],["high","#efaf27"],["medium","#4a9eff"]].map(([p,col]) => (
                            <button key={p} onClick={() => setInstrPrio(p)} style={{
                              flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                              border: `2px solid ${instrPrio === p ? col : C.border}`,
                              background: instrPrio === p ? `${col}22` : C.surface,
                              color: instrPrio === p ? col : C.textMuted,
                              cursor: "pointer", textTransform: "uppercase", transition: "all .15s",
                            }}>{p}</button>
                          ))}
                        </div>
                      </div>

                      {/* Instruction */}
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Instruction *</label>
                        <textarea
                          value={instrText}
                          onChange={e => setInstrText(e.target.value)}
                          placeholder="Describe the task and expected action for the officer..."
                          rows={3}
                          style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                        />
                      </div>

                      {dispatchError && expandedId === officer.id && (
                        <div style={{
                          marginBottom: 10, padding: "9px 12px",
                          background: "rgba(226,75,74,0.1)", border: `1px solid rgba(226,75,74,0.35)`,
                          borderRadius: 8, fontSize: 12, color: "#e24b4a",
                        }}>
                          {dispatchError}
                        </div>
                      )}
                      <button
                        onClick={() => handleDispatch(officer.id)}
                        disabled={!instrText.trim() || !instrIncident}
                        style={{
                          width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                          background: instrText.trim() && instrIncident ? C.green : C.border,
                          color: instrText.trim() && instrIncident ? "#fff" : C.textMuted,
                          fontSize: 13, fontWeight: 700, cursor: instrText.trim() && instrIncident ? "pointer" : "not-allowed",
                          transition: "all .15s",
                        }}
                      >
                        Send Instruction to {officer.name.split(" ")[0]}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dispatch log */}
        <div>
          <SectionHead>Dispatch Log — Today</SectionHead>
          <div style={card({ padding: 0, overflow: "hidden" })}>
            {dispatches.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                No dispatches sent yet this shift.
              </div>
            ) : (
              dispatches.slice().reverse().map((d, i, arr) => {
                const off = groundOfficers.find(g => g.id === d.officerId);
                const inc = d.incidentId ? incidents.find(x => x.id === d.incidentId) : null;
                return (
                  <div key={d.id} style={{
                    display: "flex", gap: 14, padding: "14px 20px", alignItems: "flex-start",
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: PRIO_DIM[d.priority ?? "high"],
                      color: PRIO_COLOR[d.priority ?? "high"],
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {PRIO_ICON[d.priority ?? "high"]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                        → {off?.name} ({off?.badge})
                        {inc && <span style={{ color: C.textMuted }}> · {inc.id}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3,
                        overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {d.instruction}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{d.timestamp ?? d.createdAt}</div>
                    </div>
                    <Badge sev={(d.priority ?? "high") === "critical" ? "critical" : (d.priority ?? "high") === "high" ? "warning" : "info"} />
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={card({ padding: "16px 18px" })}>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SectionHead({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
      letterSpacing: "0.5px", marginBottom: 12 }}>{children}</div>
  );
}

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted,
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
};

const inputStyle = {
  width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPrimary, fontSize: 13, padding: "9px 12px",
  outline: "none", fontFamily: font, appearance: "none",
};

const PRIO_DIM  = { critical: "rgba(226,75,74,0.15)",  high: "rgba(239,175,39,0.15)", medium: "rgba(74,158,255,0.15)" };
const PRIO_COLOR = { critical: "#e24b4a", high: "#efaf27", medium: "#4a9eff" };
const _S = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
const PRIO_ICON = {
  critical: <svg {..._S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  high:     <svg {..._S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  medium:   <svg {..._S}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
};
