import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Badge, StatusDot } from "../components/ui";

const STATUS_META = {
  responding: { label: "Responding",  color: "#e24b4a", dot: "critical" },
  patrolling: { label: "Patrolling",  color: "#efaf27", dot: "warning"  },
  standby:    { label: "Standby",     color: "#4a9eff", dot: "info"     },
  off_duty:   { label: "Off Duty",    color: "#555960", dot: "info"     },
};

export function GroundOfficersPage({ groundOfficers, dispatches, incidents, onDispatch, criticalCount }) {
  const [expandedId,   setExpandedId]   = useState(null);
  const [instrText,    setInstrText]    = useState("");
  const [instrPrio,    setInstrPrio]    = useState("high");
  const [instrIncident,setInstrIncident]= useState("");

  const handleDispatch = (officerId) => {
    if (!instrText.trim()) return;
    onDispatch({ officerId, instruction: instrText.trim(), priority: instrPrio, incidentId: instrIncident || null });
    setInstrText("");
    setInstrPrio("high");
    setInstrIncident("");
    setExpandedId(null);
  };

  const onDuty = groundOfficers.filter(g => g.status !== "off_duty");
  const responding = groundOfficers.filter(g => g.status === "responding");

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font }}>
      <TopBar title="Ground Officers" subtitle="Field team — live status" criticalCount={criticalCount} />

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <MiniStat label="On Duty"    value={onDuty.length}       accent={C.green} />
          <MiniStat label="Responding" value={responding.length}   accent={C.red}   />
          <MiniStat label="Patrolling" value={groundOfficers.filter(g=>g.status==="patrolling").length} accent={C.amber} />
          <MiniStat label="Dispatches Today" value={dispatches.length} accent={C.blue} />
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
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>{officer.badge} · {officer.shift} Shift</div>
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
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>📍 {officer.location} · Updated {officer.lastUpdate}</div>
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

                  {/* Dispatch form */}
                  {isOpen && (
                    <div style={{ padding: "14px 18px", background: "rgba(240,120,32,0.04)", borderTop: `1px solid ${C.border}` }}>
                      {/* Link to incident (optional) */}
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Link to Incident (optional)</label>
                        <select
                          value={instrIncident}
                          onChange={e => setInstrIncident(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">— None —</option>
                          {incidents.map(inc => (
                            <option key={inc.id} value={inc.id}>{inc.id} · {inc.videoName} ({inc.severity})</option>
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

                      <button
                        onClick={() => handleDispatch(officer.id)}
                        disabled={!instrText.trim()}
                        style={{
                          width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
                          background: instrText.trim() ? C.green : C.border,
                          color: instrText.trim() ? "#fff" : C.textMuted,
                          fontSize: 13, fontWeight: 700, cursor: instrText.trim() ? "pointer" : "not-allowed",
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
                      background: PRIO_DIM[d.priority], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                      {PRIO_ICON[d.priority]}
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
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{d.timestamp}</div>
                    </div>
                    <Badge sev={d.priority === "critical" ? "critical" : d.priority === "high" ? "warning" : "info"} />
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

function MiniStat({ label, value, accent }) {
  return (
    <div style={card({ padding: "16px 18px" })}>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{label}</div>
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
  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPrimary, fontSize: 13, padding: "9px 12px",
  outline: "none", fontFamily: font, appearance: "none",
};

const PRIO_DIM  = { critical: "rgba(226,75,74,0.15)",  high: "rgba(239,175,39,0.15)", medium: "rgba(74,158,255,0.15)" };
const PRIO_ICON = { critical: "🚨", high: "⚠️", medium: "🔔" };
