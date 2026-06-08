import { useState, useRef, useEffect, Fragment } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Badge } from "../components/ui";
import { getIncidentSourceInfo } from "../services/incidentSource";

const EXPORT_FORMATS = [
  { id: "pdf",  label: "PDF Document",      ext: "pdf"  },
  { id: "docs", label: "Word Document",      ext: "doc"  },
  { id: "xls",  label: "Excel Spreadsheet", ext: "csv"  },
];

const FLAG_COLORS_EXPORT = { red: "#e24b4a", yellow: "#efaf27", green: "#22c55e" };
const FLAG_LABELS_EXPORT = { red: "CRITICAL THREAT", yellow: "CAUTION", green: "ALL CLEAR" };
const SEV_COLORS_EXPORT  = { critical: "#e24b4a", warning: "#efaf27", info: "#4a9eff" };

function getReportSourceLabel(incident) {
  return getIncidentSourceInfo(incident).label;
}
function getReportTimeValue(incident) {
  return formatIncTime(incident.createdAt || incident.timestamp);
}

function generateExport(format, { analyses, incidents, dispatches, groundOfficers, goReports, notes }) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
  const fileDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const critical = incidents.filter(i => i.severity === "critical");
  const resolved = incidents.filter(i => i.status === "resolved");
  const active   = incidents.filter(i => i.status !== "resolved");

  if (format === "pdf") {
    const incidentSections = incidents.map(inc => {
      const assignedOfficer = inc.assignedTo ? groundOfficers.find(g => g.id === inc.assignedTo) : null;
      const incDispatches   = dispatches.filter(d => d.incidentId === inc.id);
      const sevColor        = SEV_COLORS_EXPORT[inc.severity]  || "#9a9da3";
      const flagColor       = FLAG_COLORS_EXPORT[inc.flag]     || "#efaf27";
      const flagLabel       = FLAG_LABELS_EXPORT[inc.flag]     || "CAUTION";

      return `
        <div class="incident-card" style="border-left:4px solid ${sevColor}">
          <div class="incident-header">
            <div>
              <span class="incident-id">${inc.id}</span>
              <span class="incident-source">${getReportSourceLabel(inc)}</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <span class="badge" style="background:${sevColor}22;color:${sevColor};border:1px solid ${sevColor}44">${(inc.severity || "").toUpperCase()}</span>
              <span class="badge" style="background:#f5f5f5;color:${inc.status === "resolved" ? "#22c55e" : "#efaf27"}">
                ${inc.status === "resolved" ? "&#10003; Resolved" : "&#9679; Active"}
              </span>
            </div>
          </div>
          <div class="meta-row">
            <span>&#128336; ${getReportTimeValue(inc)}</span>
            ${assignedOfficer ? `<span>&#128110; Assigned: ${assignedOfficer.name} (${assignedOfficer.badge})</span>` : ""}
          </div>
          ${inc.explanation ? `
            <div class="ai-block" style="border-left:3px solid ${flagColor}">
              <div class="ai-label" style="color:${flagColor}">${flagLabel}${inc.flagReason ? ` — ${inc.flagReason}` : ""}</div>
              <p class="ai-text">${inc.explanation}</p>
            </div>
          ` : ""}
          ${inc.actions?.length > 0 ? `
            <div class="actions-block">
              <p class="actions-label">RECOMMENDED ACTIONS</p>
              <ol class="actions-list">
                ${inc.actions.map(a => `<li>${a}</li>`).join("")}
              </ol>
            </div>
          ` : ""}
          ${incDispatches.length > 0 ? `
            <div class="dispatch-block">
              <p class="actions-label">OFFICER DISPATCHES</p>
              ${incDispatches.map(d => {
                const off = groundOfficers.find(g => g.id === d.officerId);
                return `<div class="dispatch-row">
                  <strong>${off?.name || "&mdash;"} (${off?.badge || ""})</strong> &mdash; ${d.instruction}
                  <span class="ts">${d.timestamp || ""}</span>
                </div>`;
              }).join("")}
            </div>
          ` : ""}
        </div>`;
    }).join("");

    const goReportSections = goReports.map(r => {
      const sevColor = r.severity === "critical" ? "#e24b4a" : r.severity === "high" ? "#efaf27" : "#4a9eff";
      return `
        <div class="incident-card" style="border-left:4px solid ${sevColor}">
          <div class="incident-header">
            <div>
              <span class="incident-id">${r.type || r.incidentType || "Field Report"}</span>
              <span class="incident-source">${r.location || "&mdash;"}</span>
            </div>
            <span class="badge" style="background:${sevColor}22;color:${sevColor};border:1px solid ${sevColor}44">
              ${(r.severity || "info").toUpperCase()}
            </span>
          </div>
          <div class="meta-row">
            <span>&#128110; ${r.officerName || "&mdash;"}${r.officerBadge ? ` (${r.officerBadge})` : ""}</span>
            <span>&#128336; ${r.timestamp || r.createdAt || "&mdash;"}</span>
          </div>
          ${r.description ? `<p style="margin:10px 0 0;font-size:13px;color:#333;line-height:1.6">${r.description}</p>` : ""}
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Shift Report - Certis Security</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px 50px;color:#111;font-size:13px;max-width:900px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #F07820}
      .brand{font-size:24px;font-weight:900;color:#F07820;letter-spacing:-.3px}
      .report-title{font-size:13px;color:#555;margin-top:4px}
      .generated{font-size:12px;color:#777;text-align:right}
      .section-head{font-size:11px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:.8px;margin:28px 0 12px;padding-bottom:6px;border-bottom:1px solid #e0e0e0}
      .stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:8px}
      .stat-box{background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;padding:14px 10px;text-align:center}
      .stat-val{font-size:24px;font-weight:900;color:#111}
      .stat-lbl{font-size:10px;color:#777;margin-top:2px;text-transform:uppercase;letter-spacing:.3px}
      .stat-critical .stat-val{color:#e24b4a}
      .stat-green .stat-val{color:#22c55e}
      .incident-card{background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:16px 18px;margin-bottom:14px;page-break-inside:avoid}
      .incident-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      .incident-id{font-size:13px;font-weight:800;color:#F07820;margin-right:10px}
      .incident-source{font-size:13px;color:#111;font-weight:600}
      .badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:12px}
      .meta-row{display:flex;gap:20px;font-size:12px;color:#666;margin-bottom:10px;flex-wrap:wrap}
      .ai-block{background:#fafafa;border-radius:6px;padding:12px 14px;margin:10px 0}
      .ai-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
      .ai-text{font-size:13px;color:#333;line-height:1.6;margin:0}
      .actions-block{margin-top:12px}
      .actions-label{font-size:10px;font-weight:800;color:#777;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px}
      .actions-list{margin:0;padding-left:20px}
      .actions-list li{font-size:13px;color:#333;line-height:1.7;margin-bottom:2px}
      .dispatch-block{margin-top:12px;border-top:1px solid #f0f0f0;padding-top:10px}
      .dispatch-row{font-size:12px;color:#444;margin-bottom:6px;line-height:1.5}
      .ts{color:#999;font-size:11px;margin-left:8px}
      pre{background:#f9f9f9;padding:14px;border-radius:6px;font-size:12px;line-height:1.6;white-space:pre-wrap;border:1px solid #e5e5e5}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:11px;color:#999;text-align:center}
      @media print{body{padding:20px 30px}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="brand">CERTIS SECURITY</div>
        <div class="report-title">Shift Summary Report &mdash; Command Centre</div>
      </div>
      <div class="generated">
        <div style="font-size:16px;font-weight:800;color:#111">${timeStr}</div>
        <div style="margin-top:2px">${dateStr}</div>
      </div>
    </div>

    <div class="section-head">Overview</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-val">${analyses.length}</div><div class="stat-lbl">Videos Analysed</div></div>
      <div class="stat-box"><div class="stat-val">${incidents.length}</div><div class="stat-lbl">Total Incidents</div></div>
      <div class="stat-box stat-critical"><div class="stat-val">${critical.length}</div><div class="stat-lbl">Critical</div></div>
      <div class="stat-box"><div class="stat-val">${active.length}</div><div class="stat-lbl">Still Active</div></div>
      <div class="stat-box stat-green"><div class="stat-val">${resolved.length}</div><div class="stat-lbl">Resolved</div></div>
      <div class="stat-box"><div class="stat-val">${dispatches.length}</div><div class="stat-lbl">GO Dispatches</div></div>
    </div>

    ${incidents.length > 0 ? `
      <div class="section-head">Incident Details (${incidents.length})</div>
      ${incidentSections}
    ` : ""}

    ${goReports.length > 0 ? `
      <div class="section-head">Ground Officer Field Reports (${goReports.length})</div>
      ${goReportSections}
    ` : ""}

    ${notes.trim() ? `
      <div class="section-head">Shift Notes & Observations</div>
      <pre>${notes.trim()}</pre>
    ` : ""}

    <div class="footer">Certis Group &mdash; Confidential Security Report &middot; ${dateStr}</div>

    </body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    if (win) win.onload = () => { win.print(); URL.revokeObjectURL(url); };
    return;
  }

  if (format === "docs") {
    const incidentRows = incidents.map(inc => {
      const assignedOfficer = inc.assignedTo ? groundOfficers.find(g => g.id === inc.assignedTo) : null;
      const incDispatches   = dispatches.filter(d => d.incidentId === inc.id);
      const sevColor        = SEV_COLORS_EXPORT[inc.severity]  || "#9a9da3";
      const flagColor       = FLAG_COLORS_EXPORT[inc.flag]     || "#efaf27";
      const flagLabel       = FLAG_LABELS_EXPORT[inc.flag]     || "CAUTION";
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ddd;border-left:4px solid ${sevColor};border-radius:4px;margin-bottom:12px">
          <tr><td style="padding:12px 16px">
            <p style="margin:0 0 4px;font-size:14px">
              <strong style="color:#F07820">${inc.id}</strong>&nbsp;&nbsp;${getReportSourceLabel(inc)}
            </p>
            <p style="margin:0 0 8px;font-size:11px;color:#666">
              ${getReportTimeValue(inc)}&nbsp;|&nbsp;${(inc.severity || "").toUpperCase()}&nbsp;|&nbsp;
              <span style="color:${inc.status === "resolved" ? "#22c55e" : "#efaf27"}">${inc.status === "resolved" ? "Resolved" : "Active"}</span>
              ${assignedOfficer ? `&nbsp;|&nbsp;Assigned: ${assignedOfficer.name} (${assignedOfficer.badge})` : ""}
            </p>
            ${inc.explanation ? `
              <table width="100%" cellpadding="10" cellspacing="0" style="background:#f9f9f9;border-left:3px solid ${flagColor};margin:8px 0">
                <tr><td>
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:${flagColor};text-transform:uppercase">${flagLabel}${inc.flagReason ? ` &mdash; ${inc.flagReason}` : ""}</p>
                  <p style="margin:0;font-size:13px;color:#333;line-height:1.6">${inc.explanation}</p>
                </td></tr>
              </table>
            ` : ""}
            ${inc.actions?.length > 0 ? `
              <p style="margin:8px 0 4px;font-size:10px;font-weight:700;color:#777;text-transform:uppercase">Recommended Actions</p>
              <ol style="margin:0;padding-left:20px">
                ${inc.actions.map(a => `<li style="font-size:13px;color:#333;line-height:1.7">${a}</li>`).join("")}
              </ol>
            ` : ""}
            ${incDispatches.length > 0 ? `
              <p style="margin:8px 0 4px;font-size:10px;font-weight:700;color:#777;text-transform:uppercase">Officer Dispatches</p>
              ${incDispatches.map(d => {
                const off = groundOfficers.find(g => g.id === d.officerId);
                return `<p style="margin:0 0 3px;font-size:12px"><strong>${off?.name || "&mdash;"} (${off?.badge || ""})</strong> &mdash; ${d.instruction}</p>`;
              }).join("")}
            ` : ""}
          </td></tr>
        </table>`;
    }).join("");

    const goReportRows = goReports.map(r => {
      const sevColor = r.severity === "critical" ? "#e24b4a" : r.severity === "high" ? "#efaf27" : "#4a9eff";
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ddd;border-left:4px solid ${sevColor};border-radius:4px;margin-bottom:12px">
          <tr><td style="padding:12px 16px">
            <p style="margin:0 0 4px;font-size:14px"><strong>${r.type || r.incidentType || "Field Report"}</strong> &mdash; ${r.location || "&mdash;"}</p>
            <p style="margin:0 0 6px;font-size:11px;color:#666">${r.officerName || "&mdash;"}${r.officerBadge ? ` (${r.officerBadge})` : ""} &nbsp; ${r.timestamp || r.createdAt || ""}</p>
            ${r.description ? `<p style="margin:0;font-size:13px;color:#333;line-height:1.6">${r.description}</p>` : ""}
          </td></tr>
        </table>`;
    }).join("");

    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <meta name=ProgId content=Word.Document>
      <meta name=Generator content='Microsoft Word 15'>
      <meta name=Originator content='Microsoft Word 15'>
      <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 40px; }
        h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .6px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 24px 0 12px; }
      </style>
    </head>
    <body>
      <p style="font-size:24px;font-weight:900;color:#F07820;margin:0 0 2px">CERTIS SECURITY</p>
      <p style="font-size:13px;color:#555;margin:0 0 2px">Shift Summary Report &mdash; Command Centre</p>
      <p style="font-size:12px;color:#777;margin:0 0 16px">${dateStr} &nbsp; ${timeStr}</p>
      <hr style="border:none;border-top:2px solid #F07820;margin-bottom:20px">

      <h2>Overview</h2>
      <table width="100%" cellpadding="12" cellspacing="4" style="border-collapse:separate">
        <tr>
          <td align="center" style="border:1px solid #ddd"><div style="font-size:22px;font-weight:900">${analyses.length}</div><div style="font-size:10px;color:#777;text-transform:uppercase">Videos Analysed</div></td>
          <td align="center" style="border:1px solid #ddd"><div style="font-size:22px;font-weight:900">${incidents.length}</div><div style="font-size:10px;color:#777;text-transform:uppercase">Total Incidents</div></td>
          <td align="center" style="border:1px solid #ddd"><div style="font-size:22px;font-weight:900;color:#e24b4a">${critical.length}</div><div style="font-size:10px;color:#777;text-transform:uppercase">Critical</div></td>
          <td align="center" style="border:1px solid #ddd"><div style="font-size:22px;font-weight:900">${active.length}</div><div style="font-size:10px;color:#777;text-transform:uppercase">Still Active</div></td>
          <td align="center" style="border:1px solid #ddd"><div style="font-size:22px;font-weight:900;color:#22c55e">${resolved.length}</div><div style="font-size:10px;color:#777;text-transform:uppercase">Resolved</div></td>
          <td align="center" style="border:1px solid #ddd"><div style="font-size:22px;font-weight:900">${dispatches.length}</div><div style="font-size:10px;color:#777;text-transform:uppercase">GO Dispatches</div></td>
        </tr>
      </table>

      ${incidents.length > 0 ? `<h2>Incident Details (${incidents.length})</h2>${incidentRows}` : ""}
      ${goReports.length > 0 ? `<h2>Ground Officer Field Reports (${goReports.length})</h2>${goReportRows}` : ""}
      ${notes.trim() ? `<h2>Shift Notes &amp; Observations</h2><p style="font-size:13px;color:#333;line-height:1.6;white-space:pre-wrap">${notes.trim()}</p>` : ""}

      <hr style="border:none;border-top:1px solid #ddd;margin-top:32px">
      <p style="font-size:11px;color:#999;text-align:center">Certis Group &mdash; Confidential Security Report &middot; ${dateStr}</p>
    </body>
    </html>`;

    triggerDownload(new Blob(["﻿", wordHtml], { type: "application/msword" }), `shift_report_${fileDate}.doc`);
    return;
  }

  if (format === "xls") {
    const header = ["ID", "Time", "Source", "Severity", "Status", "AI Flag", "AI Assessment", "Recommended Actions", "Assigned Officer"];
    const rows   = incidents.map(i => {
      const assignedOfficer = i.assignedTo ? groundOfficers.find(g => g.id === i.assignedTo) : null;
      return [
        i.id || "-",
        getReportTimeValue(i),
        getReportSourceLabel(i),
        i.severity || "-",
        i.status || "-",
        FLAG_LABELS_EXPORT[i.flag] || i.flag || "-",
        i.explanation || "-",
        i.actions?.join("; ") || "-",
        assignedOfficer ? `${assignedOfficer.name} (${assignedOfficer.badge})` : "-",
      ];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    triggerDownload(new Blob([csv], { type: "application/vnd.ms-excel" }), `shift_report_${fileDate}.csv`);
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildSummary({ analyses, incidents, dispatches, groundOfficers, goReports, notes }) {
  const now      = new Date();
  const dateStr  = now.toLocaleDateString("en-SG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr  = now.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
  const critical = incidents.filter(i => i.severity === "critical");
  const warning  = incidents.filter(i => i.severity === "warning");
  const resolved = incidents.filter(i => i.status === "resolved");
  const active   = incidents.filter(i => i.status !== "resolved");
  const responding = groundOfficers.filter(g => g.status === "responding");

  const lines = [
    `SHIFT SUMMARY REPORT — CERTIS SECURITY`,
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

  if (incidents.length > 0) {
    lines.push(`INCIDENT DETAILS`);
    lines.push(`${"─".repeat(50)}`);
    incidents.forEach(inc => {
      const assignedOfficer = inc.assignedTo ? groundOfficers.find(g => g.id === inc.assignedTo) : null;
      const incDispatches   = dispatches.filter(d => d.incidentId === inc.id);

      lines.push(`[${inc.id}] ${getReportSourceLabel(inc)}  |  ${(inc.severity || "").toUpperCase()}  |  ${inc.status || "—"}`);
      lines.push(`  Time: ${getReportTimeValue(inc)}`);
      if (inc.flag) lines.push(`  AI Flag: ${FLAG_LABELS_EXPORT[inc.flag] || inc.flag}${inc.flagReason ? ` — ${inc.flagReason}` : ""}`);
      if (inc.explanation) lines.push(`  Assessment: ${inc.explanation}`);
      if (inc.actions?.length > 0) {
        lines.push(`  Recommended Actions:`);
        inc.actions.forEach((a, i) => lines.push(`    ${i + 1}. ${a}`));
      }
      if (assignedOfficer) lines.push(`  Assigned: ${assignedOfficer.name} (${assignedOfficer.badge})`);
      if (incDispatches.length > 0) {
        lines.push(`  Dispatches:`);
        incDispatches.forEach(d => {
          const off = groundOfficers.find(g => g.id === d.officerId);
          lines.push(`    • ${off?.name || "—"}: ${d.instruction}`);
        });
      }
      lines.push(``);
    });
  }

  if (responding.length > 0) {
    lines.push(`OFFICERS STILL RESPONDING`);
    responding.forEach(g => lines.push(`  ${g.name} (${g.badge})`));
    lines.push(``);
  }

  if (active.length > 0) {
    lines.push(`CARRY OVER TO NEXT SHIFT`);
    active.forEach(i => lines.push(`  [${i.id}] ${getReportSourceLabel(i)}  (${i.severity})`));
    lines.push(``);
  }

  if (goReports.length > 0) {
    lines.push(`GROUND OFFICER FIELD REPORTS`);
    goReports.forEach(r => {
      lines.push(`  ${r.type || r.incidentType || "Report"} — ${r.location || "—"}  (${r.officerName || "—"})`);
      if (r.description) lines.push(`    ${r.description}`);
    });
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
  const [expandedIncId, setExpandedIncId] = useState(null);
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
  const active      = incidents.filter(i => i.status !== "resolved");

  if (finalized) {
    return (
      <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
        <TopBar title="Report" subtitle="Finalized" criticalCount={criticalCount} />
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20,
              background: C.greenDim, border: `2px solid ${C.green}`,
              display: "flex", alignItems: "center", justifyContent: "center", color: C.green }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
              </svg>
            </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          <MiniStat icon={<IconVideo />}     label="Videos Analyzed"  value={analyses.length}    accent={C.blue}  />
          <MiniStat icon={<IconAlert />}     label="Incidents"        value={incidents.length}   accent={C.red}   />
          <MiniStat icon={<IconDispatch />}  label="GO Dispatches"    value={dispatches.length}  accent={C.green} />
          <MiniStat icon={<IconClipboard />} label="GO Field Reports" value={goReports.length}   accent={C.blue}  />
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
                    {["ID", "Time", "Source", "Severity", "Status", ""].map((h, hi) => (
                      <th key={hi} style={{ padding: "10px 18px", textAlign: "left", fontSize: 11,
                        fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".5px",
                        width: hi === 5 ? 36 : undefined }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc, i) => {
                    const isExp = expandedIncId === inc.id;
                    const flagColor = { red: C.red, yellow: C.amber, green: "#22c55e" }[inc.flag] || C.amber;
                    const flagLabel = { red: "Critical Threat", yellow: "Caution", green: "All Clear" }[inc.flag] || "Caution";
                    const incDispatches = dispatches.filter(d => d.incidentId === inc.id);
                    const assignedOfficer = inc.assignedTo ? groundOfficers.find(g => g.id === inc.assignedTo) : null;
                    const srcInfo = getIncidentSourceInfo(inc);
                    const timeStr = formatIncTime(inc.createdAt || inc.timestamp);
                    const sev = inc.severity || (inc.flag === "red" ? "critical" : inc.flag === "yellow" ? "warning" : "info");
                    return (
                      <Fragment key={inc.id}>
                        <tr
                          onClick={() => setExpandedIncId(isExp ? null : inc.id)}
                          style={{ borderBottom: !isExp ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: C.green,
                            maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            title={inc.id}>
                            {inc.incidentType || inc.id}
                          </td>
                          <td style={{ padding: "12px 18px", fontSize: 12, color: C.textSecondary, whiteSpace: "nowrap" }}>{timeStr}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSecondary }}>
                              {srcInfo.type === "camera"
                                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                              }
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}
                                title={srcInfo.label}>{srcInfo.label}</span>
                            </span>
                          </td>
                          <td style={{ padding: "12px 18px" }}><Badge sev={sev} /></td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{ fontSize: 12, fontWeight: 600,
                              color: inc.status === "resolved" ? "#22c55e" : C.amber,
                              display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%",
                                background: "currentColor", display: "inline-block", flexShrink: 0 }} />
                              {inc.status === "resolved" ? "Resolved" : "Active"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 18px", textAlign: "center" }}>
                            <div style={{ color: isExp ? C.blue : C.textMuted, display: "inline-flex" }}>
                              {isExp
                                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                              }
                            </div>
                          </td>
                        </tr>
                        {isExp && (
                          <tr style={{ borderBottom: i < incidents.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            <td colSpan={6} style={{ padding: 0 }}>
                              <div style={{ padding: "14px 18px", background: "rgba(74,158,255,0.03)",
                                borderLeft: `3px solid ${flagColor}`, borderTop: `1px solid ${C.border}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase",
                                    letterSpacing: ".5px", color: flagColor }}>
                                    {flagLabel}{inc.flagReason ? ` — ${inc.flagReason}` : ""}
                                  </span>
                                  {assignedOfficer && (
                                    <span style={{ fontSize: 11, color: C.textMuted }}>
                                      · Assigned: {assignedOfficer.name} ({assignedOfficer.badge})
                                    </span>
                                  )}
                                </div>
                                {inc.explanation && (
                                  <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: "0 0 12px" }}>
                                    {inc.explanation}
                                  </p>
                                )}
                                {inc.actions?.length > 0 && (
                                  <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted,
                                      textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
                                      Recommended Actions
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {inc.actions.map((action, idx) => (
                                        <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start",
                                          padding: "8px 12px", background: C.bg, borderRadius: 8,
                                          borderLeft: `3px solid ${C.green}` }}>
                                          <span style={{ fontWeight: 800, color: C.green, fontSize: 13, flexShrink: 0 }}>{idx + 1}</span>
                                          <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>{action}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {incDispatches.length > 0 && (
                                  <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted,
                                      textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
                                      Officer Dispatches
                                    </div>
                                    {incDispatches.map(d => {
                                      const off = groundOfficers.find(g => g.id === d.officerId);
                                      return (
                                        <div key={d.id} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>
                                          <strong style={{ color: C.textPrimary }}>{off?.name} ({off?.badge})</strong>
                                          {" — "}{d.instruction}
                                          <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>{d.timestamp}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: d.priority === "critical" ? C.redDim : d.priority === "high" ? C.amberDim : C.blueDim,
                      color: d.priority === "critical" ? C.red : d.priority === "high" ? C.amber : C.blue }}>
                      {d.priority === "critical" ? <IconAlert /> : d.priority === "high" ? <IconWarning /> : <IconBell />}
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

        {/* GO Field Reports */}
        {goReports.length > 0 && (
          <div>
            <SectionHead>Ground Officer Field Reports</SectionHead>
            <div style={card({ padding: 0, overflow: "hidden" })}>
              {goReports.map((r, i) => (
                <div key={r.id} style={{ display: "flex", gap: 14, padding: "12px 18px", alignItems: "flex-start",
                  borderBottom: i < goReports.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: r.severity === "critical" ? C.redDim : r.severity === "high" ? C.amberDim : C.blueDim,
                    color: r.severity === "critical" ? C.red : r.severity === "high" ? C.amber : C.blue }}>
                    {r.severity === "critical" ? <IconAlert /> : r.severity === "high" ? <IconWarning /> : <IconClipboard />}
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

        {/* Outstanding incidents warning */}
        {active.length > 0 && (
          <div style={{ background: "rgba(239,175,39,0.08)", border: `1px solid ${C.amber}55`,
            borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <IconWarning /> {active.length} Unresolved Incident{active.length > 1 ? "s" : ""}
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
            onClick={() => setSummary(buildSummary({ analyses, incidents, dispatches, groundOfficers, goReports, notes: "" }))}
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
                      try {
                        generateExport(fmt.id, { analyses, incidents, dispatches, groundOfficers, goReports, notes: "" });
                        setFinalized(true);
                      } catch (err) {
                        console.error("Export failed:", err);
                      }
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


function formatIncTime(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (isNaN(d)) return String(raw);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      + " · " + d.toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
  } catch { return String(raw); }
}

const S = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
function IconVideo()     { return <svg {...S}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>; }
function IconAlert()     { return <svg {...S}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function IconWarning()   { return <svg {...S}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function IconDispatch()  { return <svg {...S}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconClipboard() { return <svg {...S}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>; }
function IconBell()      { return <svg {...S}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }

function MiniStat({ icon, label, value, accent }) {
  return (
    <div style={card({ padding: "16px 18px", borderLeft: `3px solid ${accent || C.border}` })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</span>
        <span style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
          background: accent ? `${accent}18` : C.bg, color: accent || C.textMuted,
          border: `1px solid ${accent ? `${accent}30` : C.border}` }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent || C.textPrimary, lineHeight: 1 }}>{value ?? "—"}</div>
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
