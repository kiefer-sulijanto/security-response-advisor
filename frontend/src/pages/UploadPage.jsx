import { useState, useRef, useCallback } from "react";
import { C, card, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import { Spinner } from "../components/ui";
import { extractFramesEveryNSeconds } from "../services/videoUtils";
import { runPipelineMultiFrameAnalysis } from "../services/pipelineAnalysis";

const INCIDENT_TYPES = [
  "VCA Intrusion Detection", "Fire Alarm Response", "Theft / Attempted Theft",
  "Lift Alarm", "Door Access Control Breach", "Suspicious Activity",
  "VCA Prolonged Parking", "Public Order Incident", "Facilities Alert", "Other",
];

export function UploadPage({ onAnalysisComplete }) {
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [hovering, setHovering]   = useState(false);
  const [status, setStatus]       = useState("idle"); // idle | extracting | analyzing | error
  const [statusLabel, setStatusLabel] = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  // Incident context for AI
  const [incidentType, setIncidentType] = useState("");
  const [location, setLocation]         = useState("");
  const fileInputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (f && f.type.startsWith("video/")) { setFile(f); setErrorMsg(""); setStatus("idle"); }
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const startAnalysis = async () => {
    if (!file) return;

    setStatus("extracting");
    setStatusLabel("Extracting frames every 1 second…");
    setErrorMsg("");

    try {
      const frames = await extractFramesEveryNSeconds(file, 1, 30);

      setStatus("analyzing");
      setStatusLabel("Analyzing sampled CCTV frames…");

      const result = await runPipelineMultiFrameAnalysis(frames, {
        camera_id: "cam_sim_01",
        location: location || "server_room",
        confidence_threshold: 0.45,
      });

      onAnalysisComplete({
        videoUrl: URL.createObjectURL(file),
        filename: file.name,
        result,
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Analysis failed. Please try again.");
    }
  };

  const isRunning = status === "extracting" || status === "analyzing";
  const isActive  = dragging || !!file;
  const dzBorder  = isActive ? `2px dashed ${C.green}` : hovering ? `2px dashed #888` : `2px dashed ${C.border}`;
  const dzBg      = isActive ? "rgba(92,186,71,0.07)" : hovering ? "rgba(255,255,255,0.03)" : "transparent";
  const dzShadow  = isActive ? `0 0 0 4px rgba(92,186,71,0.15)` : hovering ? `0 0 0 3px rgba(255,255,255,0.06)` : "none";

  return (
    <div style={{ flex: 1, overflow: "auto", background: C.bg, fontFamily: font }}>
      <TopBar title="Analyze Footage" subtitle="Upload a video for AI threat detection" criticalCount={0} />
      <div style={{ padding: "40px 28px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={card({ padding: 32, width: "100%", maxWidth: 640 })}>

          <div
            onClick={() => !isRunning && fileInputRef.current?.click()}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border: dzBorder, background: dzBg, boxShadow: dzShadow,
              borderRadius: 12, minHeight: 220,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 12,
              cursor: isRunning ? "default" : "pointer",
              transition: "border-color .2s, background .2s, box-shadow .2s, transform .15s",
              transform: hovering && !dragging && !isRunning ? "scale(1.01)" : "scale(1)",
              marginBottom: 24,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12"
                fill={hovering || isActive ? "rgba(92,186,71,0.18)" : C.border} style={{ transition: "fill .2s" }} />
              <path d="M24 14v14M18 20l6-6 6 6" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 34h20" stroke={hovering || isActive ? C.green : C.textMuted}
                strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke .2s" }} />
            </svg>
            <p style={{ fontSize: 15, color: hovering || isActive ? "#ddd" : C.textSecondary,
              textAlign: "center", transition: "color .2s" }}>
              Drag & drop a video, or <span style={{ color: C.green, fontWeight: 600 }}>browse files</span>
            </p>
            <p style={{ fontSize: 12, color: hovering || isActive ? "#888" : C.textMuted, transition: "color .2s" }}>
              .mp4 · .mov · .avi · .webm supported
            </p>
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])} />

          {file && (
            <p style={{ fontSize: 13, color: C.green, fontWeight: 500, textAlign: "center", marginBottom: 12 }}>
              📹 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}

          {/* Incident context — optional, improves AI output */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={ctxLabel}>Incident Type (optional)</label>
              <select value={incidentType} onChange={e => setIncidentType(e.target.value)} style={ctxInput(C)}>
                <option value="">— Auto-detect —</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={ctxLabel}>Camera / Location (optional)</label>
              <input
                type="text"
                placeholder="e.g. Basement B2 — Camera 04"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={ctxInput(C)}
              />
            </div>
          </div>

          {isRunning && (
            <div style={{ marginBottom: 16, background: C.aiAccentDim, borderRadius: 10,
              border: `1px solid ${C.aiAccent}`, padding: "14px 18px",
              display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "extracting", label: "Extracting video frame" },
                { key: "analyzing",  label: "AI analyzing footage" },
              ].map(step => {
                const done    = status === "analyzing" && step.key === "extracting";
                const current = status === step.key;
                return (
                  <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {done ? <span style={{ color: C.green, fontSize: 14 }}>✓</span>
                          : current ? <Spinner size={14} />
                          : <span style={{ width: 14, height: 14, borderRadius: "50%",
                              border: `1px solid ${C.border}`, display: "inline-block" }} />}
                    <span style={{ fontSize: 13, color: done ? C.green : current ? C.aiAccent : C.textMuted,
                      fontWeight: current ? 600 : 400 }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {status === "error" && (
            <div style={{ marginBottom: 16, background: C.redDim, borderRadius: 10,
              border: `1px solid ${C.red}`, padding: "12px 16px" }}>
              <p style={{ fontSize: 13, color: C.red, margin: 0 }}>⚠ {errorMsg}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
            <button onClick={startAnalysis} disabled={!file || isRunning} style={{
              background: !file || isRunning ? "#333" : C.green,
              color: !file || isRunning ? "#666" : "#1a1a1a",
              border: "none", borderRadius: 50, padding: "16px 48px",
              fontSize: 17, fontWeight: 800,
              cursor: !file || isRunning ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 12,
              transition: "transform .15s, background .15s",
            }}
            onMouseEnter={e => { if (file && !isRunning) e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {isRunning ? <Spinner size={16} /> : (
                <span style={{ width: 16, height: 16, background: "#1a1a1a", borderRadius: "50%",
                  opacity: !file ? 0.3 : 1 }} />
              )}
              {isRunning ? statusLabel : "Upload & Analyze"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ctxLabel = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#555960",
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
};
const ctxInput = (C) => ({
  width: "100%", background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPrimary, fontSize: 13, padding: "9px 12px",
  outline: "none", fontFamily: "'Segoe UI', system-ui, sans-serif", appearance: "none",
});
