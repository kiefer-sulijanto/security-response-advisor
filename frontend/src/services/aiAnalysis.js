import { C } from "../constants/colors";
import { api } from "./api.js";

/*
  Calls the backend /api/analyze endpoint (which uses o3-mini).

  INPUT:
    base64Frame  — base64 JPEG thumbnail (still passed for future vision support)
    videoFile    — original File object (we extract name/type for context)
    incidentMeta — optional: { incidentType, location, source, description }
                   If provided, used directly. Otherwise falls back to filename-based defaults.

  OUTPUT: { segments, actions, flag, explanation, flagReason, recommendedOfficer }
    segments — mapped for the ResultsPage timeline
*/
export async function runAIAnalysis(_base64Frame, videoFile, incidentMeta = {}) {
  const result = await api.analyze({
    incidentType: incidentMeta.incidentType || "Video Security Analysis",
    location:     incidentMeta.location     || "CCTV — " + videoFile.name,
    source:       incidentMeta.source       || "CCTV Upload",
    description:  incidentMeta.description  || `Security footage uploaded for analysis. File: ${videoFile.name}.`,
  });

  // Map flag → segments for the existing ResultsPage timeline component
  const flagColorMap = {
    red:    { color: C.red,   label: "Threat Detected",  desc: result.flagReason || "Critical security threat detected." },
    yellow: { color: C.amber, label: "Caution",          desc: result.flagReason || "Situation requires investigation." },
    green:  { color: C.green, label: "All Clear",        desc: result.flagReason || "No threats detected." },
  };
  const seg = flagColorMap[result.flag] || flagColorMap.green;

  return {
    segments: [{ color: seg.color, startPct: 0, widthPct: 100, label: seg.label, desc: seg.desc }],
    actions:             result.actions            || [],
    flag:                result.flag,
    explanation:         result.explanation        || "",
    flagReason:          result.flagReason         || "",
    recommendedOfficer:  result.recommendedOfficer || null,
  };
}
