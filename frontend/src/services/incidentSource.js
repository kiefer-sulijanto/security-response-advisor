/**
 * Returns { type, label } for an incident based on its source/camera fields.
 *
 * type values: "video" | "camera" | "access" | "manual" | "other"
 */
export function getIncidentSourceInfo(inc) {
  const src = (inc.source || "").toLowerCase();
  const cameraId = inc.camera_id || inc.cameraId || "";

  // Video Upload — new backend source name, cam_analysis_01, videoName present,
  // or legacy "CCTV Frame Pipeline" source name
  if (
    cameraId === "cam_analysis_01" ||
    src.includes("upload") ||
    src === "cctv frame pipeline" ||
    inc.videoName
  ) {
    return { type: "video", label: "Video Upload" };
  }

  // Access Log
  if (src.includes("access")) {
    return { type: "access", label: "Access Log" };
  }

  // Manual Trigger
  if (src.includes("manual")) {
    return { type: "manual", label: "Manual Trigger" };
  }

  // Live Camera — new "Live Camera" source, any CCTV source, or cam_ prefix
  if (
    src.includes("live camera") ||
    src.includes("cctv") ||
    src.includes("camera") ||
    (cameraId.startsWith("cam_") && cameraId !== "cam_analysis_01")
  ) {
    const label =
      cameraId && cameraId !== "cam_analysis_01"
        ? `Live Camera (${cameraId})`
        : "Live Camera";
    return { type: "camera", label };
  }

  return { type: "other", label: inc.source || "Unknown source" };
}
