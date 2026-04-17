import { useRef, useState } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";

export function ResultsPage({ analysis, onBack }) {
  const { videoUrl, filename, result } = analysis;
  const videoRef    = useRef(null);
  const [activeClip, setActiveClip] = useState(null);

  const incidentSegs = result.segments.filter(s => s.color !== "#22c55e");

  const seekTo = (seg, idx) => {
    const vid = videoRef.current;
    if (!vid) return;
    const duration = vid.duration || 0;
    const startSec = (seg.startPct / 100) * duration;
    vid.currentTime = startSec;
    vid.play();
    setActiveClip(idx);
  };
  console.log("snapshotBase64 exists?", !!result?.snapshotBase64, result?.snapshotBase64?.slice?.(0, 30));

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font, overscrollBehavior: "contain" }}>
      <TopBar title="Analysis Results" subtitle={`AI threat detection complete · ${filename}`} criticalCount={0} />
      <div style={{ padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

        <button onClick={onBack} style={{
          alignSelf: "flex-start", background: "transparent", color: C.textSecondary,
          border: `1px solid ${C.border}`, borderRadius: 50,
          padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          transition: "color .2s, border-color .2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#aaa"; }}
        onMouseLeave={e => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.borderColor = C.border; }}
        >← Analyze another video</button>

        <div style={card({ padding: 0, overflow: "hidden", width: "100%", maxWidth: 720 })}>
          <div style={{ background: "#000" }}>
            <video ref={videoRef} src={videoUrl} controls
              style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "cover" }}
              onEnded={() => setActiveClip(null)} />
            {/* Timeline */}
            <div style={{ width: "100%", height: 12, background: "#111", position: "relative", cursor: "pointer" }}
              onClick={e => {
                const vid = videoRef.current;
                if (!vid || !vid.duration) return;
                const pct = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * 100;
                vid.currentTime = (pct / 100) * vid.duration;
              }}
            >
              {result.segments.map((seg, i) => (
                <div key={i} style={{ position: "absolute", left: `${seg.startPct}%`,
                  width: `${seg.widthPct}%`, height: "100%", background: seg.color, opacity: .9 }} />
              ))}
            </div>
          </div>
          {/* 🤖 AI-GENERATED LEGEND */}
          <div style={{ padding: 24, borderTop: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", gap: 18 }}>
            {result.segments.map((seg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: seg.color,
                  flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: C.textPrimary, marginBottom: 2 }}>{seg.label}</p>
                  <p style={{ fontSize: 14, color: "#bbb", lineHeight: 1.6, margin: 0 }}>{seg.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
              {result.snapshotBase64 && (
        <div style={{ width: "100%", maxWidth: 720 }}>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 14,
              color: C.textPrimary,
            }}
          >
            Detected Frame
          </p>

          <div style={card({ padding: 16, overflow: "hidden" })}>
            <img
              src={result.snapshotBase64}
              alt="Detected incident frame"
              style={{
                width: "100%",
                display: "block",
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                maxHeight: 420,
                objectFit: "contain",
                background: "#000",
              }}
            />
          </div>
        </div>
      )}

        {/* Incident Clips */}
        {incidentSegs.length > 0 && (
          <div style={{ width: "100%", maxWidth: 720 }}>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: C.textPrimary }}>Incident Clips</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {incidentSegs.map((seg, idx) => {
                const isActive = activeClip === idx;
                return (
                  <div key={idx}
                    onClick={() => seekTo(seg, idx)}
                    style={{
                      ...card({ padding: "14px 18px" }),
                      display: "flex", alignItems: "center", gap: 14,
                      cursor: "pointer", transition: "border-color .15s, background .15s",
                      borderColor: isActive ? seg.color : undefined,
                      background: isActive ? `${seg.color}12` : undefined,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = seg.color; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = C.border; }}
                  >
                    {/* Play icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${seg.color}22`, border: `1.5px solid ${seg.color}66`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isActive ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill={seg.color}>
                          <rect x="2" y="1" width="3" height="12" rx="1"/>
                          <rect x="9" y="1" width="3" height="12" rx="1"/>
                        </svg>
                      ) : (
                        <svg width="12" height="14" viewBox="0 0 12 14" fill={seg.color}>
                          <path d="M1 1l10 6-10 6V1z"/>
                        </svg>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 2 }}>
                        {seg.label}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSecondary,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {seg.desc}
                      </div>
                    </div>
                    {/* Timestamp badge */}
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: seg.color,
                      background: `${seg.color}18`, border: `1px solid ${seg.color}44`,
                      borderRadius: 6, padding: "3px 8px", flexShrink: 0,
                    }}>
                      {Math.round(seg.startPct)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Explanation + Flag */}
        {result.explanation && (
          <div style={{ width: "100%", maxWidth: 720 }}>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: C.textPrimary }}>AI Assessment</p>
            <div style={card({
              padding: "18px 20px",
              borderLeft: `4px solid ${FLAG_COLORS[result.flag] || C.green}`,
            })}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{FLAG_ICONS[result.flag] || "🟢"}</span>
                <span style={{
                  fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px",
                  color: FLAG_COLORS[result.flag] || C.green,
                }}>
                  {FLAG_LABELS[result.flag] || "All Clear"}
                </span>
                {result.flagReason && (
                  <span style={{ fontSize: 12, color: C.textMuted }}>— {result.flagReason}</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7, margin: 0 }}>{result.explanation}</p>
            </div>
          </div>
        )}

        {/* Recommended officer */}
        {result.recommendedOfficer && (
          <div style={{ width: "100%", maxWidth: 720 }}>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: C.textPrimary }}>Recommended Dispatch</p>
            <div style={card({
              padding: "16px 20px",
              borderLeft: `4px solid ${C.amber}`,
              display: "flex", gap: 14, alignItems: "flex-start",
            })}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: "rgba(239,175,39,0.15)", border: "1.5px solid rgba(239,175,39,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: C.amber,
              }}>
                {result.recommendedOfficer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
                  {result.recommendedOfficer.name}
                  <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>
                    {result.recommendedOfficer.badge}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                  📍 {result.recommendedOfficer.location} · {result.recommendedOfficer.status}
                </div>
                {result.recommendedOfficer.reason && (
                  <div style={{ fontSize: 13, color: "#bbb", marginTop: 6, lineHeight: 1.5 }}>
                    {result.recommendedOfficer.reason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🤖 AI-GENERATED ACTIONS */}
        {result.actions?.length > 0 && (
          <div style={{ width: "100%", maxWidth: 720 }}>
            <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, color: C.textPrimary }}>Recommended Actions</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {result.actions.map((action, i) => (
                <li key={i} style={card({ padding: "14px 18px", display: "flex", alignItems: "flex-start",
                  gap: 12, borderLeft: `4px solid ${C.green}`, borderRadius: 10 })}>
                  <span style={{ fontWeight: 800, color: C.green, fontSize: 15, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, color: "#ccc", lineHeight: 1.5 }}>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const FLAG_COLORS = { red: "#e24b4a", yellow: "#efaf27", green: "#22c55e" };
const FLAG_ICONS  = { red: "🔴", yellow: "🟡", green: "🟢" };
const FLAG_LABELS = { red: "Critical Threat", yellow: "Caution", green: "All Clear" };
