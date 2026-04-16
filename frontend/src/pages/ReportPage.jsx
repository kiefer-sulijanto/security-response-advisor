import { useState, useRef, useEffect } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Badge } from "../components/ui";

const EXPORT_FORMATS = [
  { id: "pdf",  label: "PDF Document",      icon: "📄", ext: "pdf" },
  { id: "docs", label: "Word Document",      icon: "📝", ext: "doc" },
  { id: "xls",  label: "Excel Spreadsheet", icon: "📊", ext: "csv" },
];

function generateExport(format, { analyses, incidents, dispatches, groundOfficers, goReports, notes }) {
  const now      = new Date();
  const dateStr  = now.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr  = now.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
  const resolved = incidents.filter(i => i.status === "resolved");
  const active   = incidents.filter(i => i.status !== "resolved");

  if (format === "pdf") {
    const rows = incidents.map(i =>
      `<tr><td>${i.id || "—"}</td><td>${i.timestamp || "-"}</td><td>${i.videoName || i.title || "-"}</td><td>${i.severity || "-"}</td><td>${i.status || "—"}</td></tr>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><title>Shift Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111;font-size:13px}
      h1{font-size:20px;margin-bottom:4px} .sub{color:#555;margin-bottom:24px}
      h2{font-size:14px;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.5px;color:#444}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{text-align:left;padding:8px 10px;background:#f5f5f5;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
      td{padding:8px 10px;border-bottom:1px solid #e0e0e0}
      .stat{display:inline-block;margin-right:24px;margin-bottom:8px}
      .stat-val{font-size:22px;font-weight:700} .stat-lbl{font-size:11px;color:#666}
      pre{background:#f9f9f9;padding:14px;border-radius:6px;font-size:12px;line-height:1.6;white-space:pre-wrap}
    </style></head><body>
    <h1>Shift Summary Report - Certis Security</h1>
    <div class="sub">Generated: ${dateStr} at ${timeStr}</div>
    <div>
      <div class="stat"><div class="stat-val">${analyses.length}</div><div class="stat-lbl">Videos Analysed</div></div>
      <div class="stat"><div class="stat-val">${incidents.length}</div><div class="stat-lbl">Total Incidents</div></div>
      <div class="stat"><div class="stat-val">${resolved.length}</div><div class="stat-lbl">Resolved</div></div>
      <div class="stat"><div class="stat-val">${active.length}</div><div class="stat-lbl">Active</div></div>
      <div class="stat"><div class="stat-val">${dispatches.length}</div><div class="stat-lbl">GO Dispatches</div></div>
      <div class="stat"><div class="stat-val">${goReports.length}</div><div class="stat-lbl">Field Reports</div></div>
    </div>
    ${incidents.length > 0 ? `<h2>Incidents</h2><table><thead><tr><th>ID</th><th>Time</th><th>Source</th><th>Severity</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
    ${notes.trim() ? `<h2>Shift Notes</h2><pre>${notes.trim()}</pre>` : ""}
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    if (win) win.onload = () => { win.print(); URL.revokeObjectURL(url); };
    return;
  }

  if (format === "docs") {
    const text = [
      `SHIFT SUMMARY REPORT - CERTIS SECURITY`,
      `Generated: ${dateStr} at ${timeStr}`,
      ``,
      `OVERVIEW`,
      `Videos Analysed:    ${analyses.length}`,
      `Total Incidents:    ${incidents.length}`,
      `Resolved:           ${resolved.length}`,
      `Active:             ${active.length}`,
      `GO Dispatches:      ${dispatches.length}`,
      `GO Field Reports:   ${goReports.length}`,
      ``,
      incidents.length > 0 ? `INCIDENTS\n${incidents.map(i => `  [${i.id}] ${i.videoName || i.title || "-"} | ${i.severity} | ${i.status}`).join("\n")}` : "",
      notes.trim() ? `\nSHIFT NOTES\n${notes.trim()}` : "",
      ``,
      `--- End of Report ---`,
    ].filter(l => l !== "").join("\n");
    triggerDownload(new Blob([text], { type: "application/msword" }), `shift_report_${Date.now()}.doc`);
    return;
  }

  if (format === "xls") {
    const header = ["ID", "Time", "Source", "Severity", "Status"];
    const rows   = incidents.map(i => [i.id || "-", i.timestamp || "-", i.videoName || i.title || "-", i.severity || "-", i.status || "-"]);
    const csv    = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    triggerDownload(new Blob([csv], { type: "application/vnd.ms-excel" }), `shift_report_${Date.now()}.csv`);
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildSummary({ analyses, incidents, dispatches, groundOfficers, goReports, notes }) {
  const now        = new Date();
  const dateStr    = now.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr    = now.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
  const critical   = incidents.filter(i => i.severity === "critical");
  const warning    = incidents.filter(i => i.severity === "warning");
  const resolved   = incidents.filter(i => i.status === "resolved");
  const active     = incidents.filter(i => i.status !== "resolved");
  const responding = groundOfficers.filter(g => g.status === "responding");

  const lines = [
    `SHIFT SUMMARY REPORT`,
    `Generated: ${dateStr} at ${timeStr}`,
    ``,
    `OVERVIEW`,
    `• Videos Analysed:      ${analyses.length}`,
    `• Total Incidents:      ${incidents.length}  (${critical.length} critical, ${warning.length} warnings)`,
    `• Resolved:             ${resolved.length}`,
    `• Still Active:         ${active.length}`,
    `• GO Dispatches Sent:   ${dispatches.length}`,
    `• GO Field Reports:     ${goReports.length}`,
    ``,
  ];

  if (critical.length > 0) {
    lines.push(`CRITICAL INCIDENTS`);
    critical.forEach(i => lines.push(`  [${i.id}] ${i.videoName || i.title || "-"}  (${i.status})`));
    lines.push(``);
  }

  if (active.length > 0) {
    lines.push(`UNRESOLVED — CARRY OVER TO NEXT SHIFT`);
    active.forEach(i => lines.push(`  [${i.id}] ${i.videoName || i.title || "-"}  (${i.severity})`));
    lines.push(``);
  }

  if (responding.length > 0) {
    lines.push(`OFFICERS STILL RESPONDING`);
    responding.forEach(g => lines.push(`  ${g.name} (${g.badge})`));
    lines.push(``);
  }

  if (notes.trim()) {
    lines.push(`SHIFT NOTES`);
    lines.push(notes.trim());
    lines.push(``);
  }

  lines.push(`--- End of Report ---`);
  return lines.join("\n");
}

export function ReportPage({ analyses, incidents, dispatches, groundOfficers, criticalCount, goReports = [] }) {
  const [notes,       setNotes]       = useState("");
  const [finalized,   setFinalized]   = useState(false);
  const [summary,     setSummary]     = useState(null);
  const [copied,      setCopied]      = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const now       = new Date();
  const dateStr   = now.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr   = now.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });

  const criticalInc = incidents.filter(i => i.severity === "critical");
  const warningInc  = incidents.filter(i => i.severity === "warning");
  const resolved    = incidents.filter(i => i.status === "resolved");
  const active      = incidents.filter(i => i.status !== "resolved");

  if (finalized) {
    return (
      <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
        <TopBar title="Report" subtitle="Finalized" criticalCount={criticalCount} />
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
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
      <TopBar title="Report" subtitle="End of shift - Command Centre" criticalCount={criticalCount} />

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

        {/* Summary panel */}
        {summary && (
          <div style={{ background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Shift Summary</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summary).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                style={{
                  background: copied ? C.greenDim : C.surface, border: `1px solid ${copied ? C.green : C.border}`,
                  color: copied ? C.green : C.textSecondary, borderRadius: 8,
                  padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre style={{
              fontSize: 12, color: C.textSecondary, lineHeight: 1.7,
              whiteSpace: "pre-wrap", fontFamily: "monospace", margin: 0,
            }}>
              {summary}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "flex-start" }}>
          <button
            onClick={() => setSummary(buildSummary({ analyses, incidents, dispatches, groundOfficers, goReports, notes }))}
            style={{
              flex: 1, background: C.surface, color: C.textPrimary,
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer",
              transition: "border-color .15s, transform .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.textSecondary; e.currentTarget.style.transform = "scale(1.01)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;        e.currentTarget.style.transform = "scale(1)"; }}
          >
            Summarize
          </button>

          {/* Export button + format picker */}
          <div style={{ flex: 1, position: "relative" }} ref={pickerRef}>
            <button
              disabled={incidents.length === 0}
              onClick={() => setShowPicker(v => !v)}
              style={{
                width: "100%",
                background: incidents.length === 0 ? C.surface : C.green,
                color: incidents.length === 0 ? C.textMuted : "#fff",
                border: incidents.length === 0 ? `1px solid ${C.border}` : "none",
                borderRadius: 12,
                padding: "14px 0",
                fontSize: 15, fontWeight: 800,
                cursor: incidents.length === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background .15s, color .15s",
              }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showPicker ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {incidents.length === 0 && (
              <div style={{ textAlign: "center", fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                No incidents to export
              </div>
            )}

            {showPicker && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 0, right: 0,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 -8px 28px rgba(0,0,0,0.5)",
                zIndex: 200,
              }}>
                <div style={{ padding: "8px 14px 5px", fontSize: 10, fontWeight: 700,
                  color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Choose Format
                </div>
                {EXPORT_FORMATS.map((fmt, i) => (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      setShowPicker(false);
                      generateExport(fmt.id, { analyses, incidents, dispatches, groundOfficers, goReports, notes });
                      setFinalized(true);
                    }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                      cursor: "pointer", color: C.textPrimary, fontSize: 13, fontWeight: 500,
                      textAlign: "left", transition: "background .1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 16 }}>{fmt.icon}</span>
                    <span style={{ flex: 1 }}>{fmt.label}</span>
                    <span style={{ fontSize: 10, color: C.textMuted,
                      background: C.bg, borderRadius: 4, padding: "2px 6px" }}>
                      .{fmt.ext}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
