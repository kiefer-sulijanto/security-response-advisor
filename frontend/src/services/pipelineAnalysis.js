import { C } from "../constants/colors";
import { api } from "./api.js";

function advisoryToSegments(flag, flagReason) {
  const normalized = (flag || "green").toLowerCase();

  const flagColorMap = {
    red: {
      color: C.red,
      label: "Threat Detected",
      desc: flagReason || "Critical security threat detected.",
    },
    yellow: {
      color: C.amber,
      label: "Caution",
      desc: flagReason || "Situation requires investigation.",
    },
    green: {
      color: C.green,
      label: "All Clear",
      desc: flagReason || "No threats detected.",
    },
  };

  const seg = flagColorMap[normalized] || flagColorMap.green;

  return [
    {
      color: seg.color,
      startPct: 0,
      widthPct: 100,
      label: seg.label,
      desc: seg.desc,
    },
  ];
}

const FLAG_SCORE = {
  green: 1,
  yellow: 2,
  red: 3,
};

function normalizeFrameResult(response, frameMeta = {}) {
  const results = response?.results || [];
  const systemErrors = results.filter((r) => r.is_system_error);
  const goodResults = results.filter((r) => !r.is_system_error);

  if (systemErrors.length > 0) {
    return {
      flag: "yellow",
      explanation: systemErrors[0]?.message || "Pipeline system error occurred.",
      flagReason: systemErrors[0]?.error_code || "pipeline_error",
      actions: ["Check backend pipeline configuration"],
      advisory: null,
      incidentData: null,
      rawPipelineResponse: response,
      frameTimestamp: frameMeta.timestamp,
    };
  }

  if (goodResults.length === 0) {
    return {
      flag: "green",
      explanation: "This frame did not trigger any configured incident rule.",
      flagReason: "No incident detected",
      actions: ["Review footage manually if needed"],
      advisory: null,
      incidentData: null,
      rawPipelineResponse: response,
      frameTimestamp: frameMeta.timestamp,
    };
  }

  const first = goodResults[0];
  const advisory = first.advisory || {};
  const incident = first.incident_data || {};

  return {
    flag: (advisory.flag || "green").toLowerCase(),
    explanation: advisory.description || incident.description || "",
    flagReason: advisory.explanation || incident.name || "",
    actions: advisory.actions || [],
    advisory,
    incidentData: incident,
    rawPipelineResponse: response,
    frameTimestamp: frameMeta.timestamp,
  };
}

function aggregateFrameResults(frameResults, options = {}) {
  if (!frameResults.length) {
    return {
      segments: advisoryToSegments("green", "No frames were analyzed."),
      actions: ["Review footage manually if needed"],
      flag: "green",
      explanation: "No frames were analyzed.",
      flagReason: "No analysis",
      recommendedOfficer: null,
      frameResults: [],
      stoppedEarly: false,
      stopReason: null,
    };
  }

  const sorted = [...frameResults].sort((a, b) => {
    return (FLAG_SCORE[b.flag] || 0) - (FLAG_SCORE[a.flag] || 0);
  });

  const worst = sorted[0];
  const mergedActions = [...new Set(frameResults.flatMap((r) => r.actions || []))];
  const triggeredFrames = frameResults.filter((r) => r.flag !== "green");
  const triggeredCount = triggeredFrames.length;
  const triggeredTimes = triggeredFrames
    .map((r) => r.frameTimestamp)
    .filter((v) => typeof v === "number")
    .slice(0, 5)
    .map((v) => `${v.toFixed(1)}s`);

  const earlyStopSuffix = options.stoppedEarly
    ? ` Analysis stopped early after detecting ${options.stopReason || "a confirmed incident"}.`
    : "";

  return {
    segments: advisoryToSegments(worst.flag, worst.flagReason),
    actions: mergedActions.length ? mergedActions : ["Review footage manually if needed"],
    flag: worst.flag,
    explanation:
      triggeredCount > 0
        ? `${worst.explanation} (${triggeredCount} frame(s) triggered incident logic${triggeredTimes.length ? ` around ${triggeredTimes.join(", ")}` : ""}.)${earlyStopSuffix}`
        : `No incident was triggered across the sampled frames.${earlyStopSuffix}`,
    flagReason: worst.flagReason,
    recommendedOfficer: null,
    frameResults,
    advisory: worst.advisory,
    incidentData: worst.incidentData,
    stoppedEarly: !!options.stoppedEarly,
    stopReason: options.stopReason || null,
  };
}

export async function runPipelineMultiFrameAnalysis(frames, meta = {}) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("No frames provided for analysis.");
  }

  const responses = [];
  const incidentCounts = {};
  let stoppedEarly = false;
  let stopReason = null;

  const earlyStopFlagLevels = meta.earlyStopFlagLevels || ["red"];
  const earlyStopHitThreshold = meta.earlyStopHitThreshold ?? 2;

  for (const frame of frames) {
    const imageBase64 = typeof frame === "string" ? frame : frame?.imageBase64;
    const timestamp = typeof frame === "object" ? frame?.timestamp : undefined;

    const response = await api.processCctvFrame({
      image_base64: imageBase64,
      camera_id: meta.camera_id || "cam_01",
      location: meta.location || "server_room",
      confidence_threshold: meta.confidence_threshold ?? 0.45,
      frame_timestamp_seconds: timestamp,
      include_debug: true,
    });

    const normalized = normalizeFrameResult(response, { timestamp });
    responses.push(normalized);

    const incidentName = normalized?.incidentData?.name || null;
    const incidentFlag = (normalized?.flag || "green").toLowerCase();

    if (incidentName) {
      incidentCounts[incidentName] = (incidentCounts[incidentName] || 0) + 1;
    }

    const shouldStopByFlag = earlyStopFlagLevels.includes(incidentFlag);
    const shouldStopByRepeatedIncident =
      incidentName && incidentCounts[incidentName] >= earlyStopHitThreshold;

    if (shouldStopByFlag || shouldStopByRepeatedIncident) {
      stoppedEarly = true;
      stopReason = shouldStopByFlag
        ? `${incidentFlag} severity incident detected`
        : `${incidentName} detected ${incidentCounts[incidentName]} times`;
      break;
    }
  }

  return aggregateFrameResults(responses, { stoppedEarly, stopReason });
}