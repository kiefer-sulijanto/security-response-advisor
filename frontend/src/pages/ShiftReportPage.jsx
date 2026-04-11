import { useState } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Badge } from "../components/ui";

export function ShiftReportPage({ analyses, incidents, dispatches, groundOfficers, criticalCount, goReports = [] }) {
  const [notes,     setNotes]     = useState("");
  const [finalized, setFinalized] = useState(false);

  const now       = new Date();
  const dateStr   = now.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr   = now.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });

  const criticalInc = incidents.filter(i => i.severity === "critical");
  const warningInc  = incidents.filter(i => i.severity === "warning");
  const resolved    = incidents.filter(i => i.status === "resolved");
  const active      = incidents.filter(i => i.status !== "resolved");

  if (finalized) {
    return (
      <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font }}>
        <TopBar title="Shift Report" subtitle="Finalized" criticalCount={criticalCount} />
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20,
              background: C.greenDim, border: `2px solid ${C.green}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📋</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary }}>Report Finalized</div>
              <div style={{ fontSize: 14, color: C.textSecondary, marginTop: 6 }}>
                End of shift report has been submitted to Certis management.
              </div>
            </div>
          </div>

          <div style={card({ width: "100%", maxWidth: 520, padding: "20px 24px" })}>
            <Row label="Date"               value={dateStr} />
            <Row label="Finalized at"        value={timeStr} />
            <Row label="Videos Analyzed"     value={analyses.length} />
            <Row label="Incidents Logged"    value={incidents.length} />
            <Row label="Critical Incidents"  value={criticalInc.length} accent={criticalInc.length > 0 ? C.red : undefined} />
            <Row label="Active (Unresolved)" value={active.length}     accent={active.length > 0 ? C.amber : undefined} />
            <Row label="GO Dispatches"       value={dispatches.length} />
            <Row label="GO Field Reports"    value={goReports.length} />
          </div>

          <button
            onClick={() => setFinalized(false)}
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textSecondary,
              borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Back to Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font }}>
      <TopBar title="Shift Report" subtitle="End of shift — Command Centre" criticalCount={criticalCount} />

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Stats overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
          <MiniStat icon="🎥" label="Videos Analyzed"   value={analyses.length}    accent={C.blue}  />
          <MiniStat icon="🚨" label="Critical Incidents" value={criticalInc.length} accent={C.red}   />
          <MiniStat icon="⚠️" label="Warnings"           value={warningInc.length}  accent={C.amber} />
          <MiniStat icon="👮" label="GO Dispatches"      value={dispatches.length}  accent={C.green} />
          <MiniStat icon="📋" label="GO Field Reports"   value={goReports.length}   accent={C.blue}  />
        </div>

        {/* Incident summary */}
        <div>
          <SectionHead>Incident Summary</SectionHead>
          <div style={card({ padding: 0, overflow: "hidden" })}>
            {incidents.length === 0 ? (
              <EmptyMsg>No incidents recorded this shift.</EmptyMsg>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["ID", "Time", "Source", "Severity", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 11,
                        fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc, i) => (
                    <tr key={inc.id} style={{ borderBottom: i < incidents.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: C.green }}>{inc.id}</td>
                      <td style={{ padding: "12px 18px", fontSize: 13, color: C.textSecondary }}>{inc.timestamp}</td>
                      <td style={{ padding: "12px 18px", fontSize: 13, color: C.textPrimary,
                        maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.videoName}</td>
                      <td style={{ padding: "12px 18px" }}><Badge sev={inc.severity} /></td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600,
                          color: inc.status === "resolved" ? "#22c55e" : C.amber }}>
                          {inc.status === "resolved" ? "✓ Resolved" : "● Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Ground officer dispatch summary */}
        <div>
          <SectionHead>Ground Officer Dispatches</SectionHead>
          <div style={card({ padding: 0, overflow: "hidden" })}>
            {dispatches.length === 0 ? (
              <EmptyMsg>No ground officer dispatches this shift.</EmptyMsg>
            ) : (
              dispatches.map((d, i) => {
                const off = groundOfficers.find(g => g.id === d.officerId);
                const inc = d.incidentId ? incidents.find(x => x.id === d.incidentId) : null;
                return (
                  <div key={d.id} style={{ display: "flex", gap: 14, padding: "12px 18px", alignItems: "flex-start",
                    borderBottom: i < dispatches.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize: 18, width: 32, textAlign: "center", flexShrink: 0 }}>
                      {d.priority === "critical" ? "🚨" : d.priority === "high" ? "⚠️" : "🔔"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                        {off?.name} ({off?.badge}){inc && ` — ${inc.id}`}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{d.instruction}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{d.timestamp}</div>
                    </div>
                    <Badge sev={d.priority === "critical" ? "critical" : d.priority === "high" ? "warning" : "info"} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Analyses */}
        {analyses.length > 0 && (
          <div>
            <SectionHead>AI Video Analyses Conducted</SectionHead>
            <div style={card({ padding: 0, overflow: "hidden" })}>
              {analyses.map((a, i) => {
                const hasCritical = a.result?.segments?.some(s => s.color === "#e24b4a");
                const hasWarning  = a.result?.segments?.some(s => s.color === "#efaf27");
                const sev = hasCritical ? "critical" : hasWarning ? "warning" : "info";
                return (
                  <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 18px", alignItems: "center",
                    borderBottom: i < analyses.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontSize: 15 }}>🎥</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.textPrimary,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{a.time}</div>
                    </div>
                    <Badge sev={sev} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GO Field Reports */}
        {goReports.length > 0 && (
          <div>
            <SectionHead>Ground Officer Field Reports</SectionHead>
            <div style={card({ padding: 0, overflow: "hidden" })}>
              {goReports.map((r, i) => (
                <div key={r.id} style={{ display: "flex", gap: 14, padding: "12px 18px", alignItems: "flex-start",
                  borderBottom: i < goReports.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ fontSize: 18, width: 32, textAlign: "center", flexShrink: 0 }}>
                    {r.severity === "critical" ? "🚨" : r.severity === "high" ? "⚠️" : "📋"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                      {r.type || r.incidentType} — {r.location}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                      {r.officerName}{r.officerBadge ? ` (${r.officerBadge})` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, lineHeight: 1.5 }}>{r.description}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{r.timestamp || r.createdAt}</div>
                  </div>
                  <Badge sev={r.severity === "critical" ? "critical" : r.severity === "high" ? "warning" : "info"} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <SectionHead>Shift Notes & Observations</SectionHead>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any observations, follow-up actions, or notes for the next shift..."
            rows={5}
            style={{
              width: "100%", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, color: C.textPrimary, fontSize: 14, padding: "14px 16px",
              outline: "none", fontFamily: font, resize: "vertical", minHeight: 100,
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Outstanding incidents warning */}
        {active.length > 0 && (
          <div style={{ background: "rgba(239,175,39,0.08)", border: `1px solid ${C.amber}55`,
            borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 4 }}>
              ⚠️ {active.length} Unresolved Incident{active.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary }}>
              These will be carried over and must be briefed to the incoming Command Centre Officer.
            </div>
          </div>
        )}

        {/* Finalize */}
        <button
          onClick={() => setFinalized(true)}
          style={{
            background: C.green, color: "#fff", border: "none", borderRadius: 12,
            padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: "pointer",
            marginBottom: 8, transition: "transform .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Finalize & Submit Shift Report
        </button>

      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, accent }) {
  return (
    <div style={card({ padding: "16px 18px" })}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || C.textPrimary }}>{value || "—"}</div>
    </div>
  );
}

function SectionHead({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted,
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>{children}</div>;
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0",
      borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.textSecondary }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent || C.textPrimary }}>{value}</span>
    </div>
  );
}

function EmptyMsg({ children }) {
  return <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: C.textMuted }}>{children}</div>;
}
