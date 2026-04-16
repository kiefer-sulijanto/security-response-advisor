// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  📷 CAMERA CONFIGURATION — SET YOUR 4 CAMERA SOURCES HERE              ║
// ║                                                                          ║
// ║  Each camera needs:                                                      ║
// ║    id:     unique string                                                 ║
// ║    name:   display name                                                  ║
// ║    source: one of:                                                       ║
// ║      "device"  → uses browser getUserMedia (webcam/USB cam)              ║
// ║      "stream"  → HLS / DASH / MP4 URL (set streamUrl below)             ║
// ║      "rtsp"    → RTSP URL (requires a proxy; set streamUrl below)        ║
// ║                                                                          ║
// ║  For "device" source, deviceIndex selects which physical camera to use. ║
// ║  Index 0 = first camera, 1 = second, etc.                               ║
// ║                                                                          ║
// ║  For "stream" source, set streamUrl to a public HLS/MP4 URL, e.g.:      ║
// ║    "https://yourserver.com/cam1/index.m3u8"                             ║
// ║                                                                          ║
// ║  For "rtsp" source, you need a backend proxy (e.g. FFmpeg → HLS).      ║
// ║  Set streamUrl to your proxy's HTTP output URL.                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export const CAMERA_CONFIG = [
  { id: "cam_01", name: "Cam 1", location: "main_lobby",    source: "device", deviceIndex: 0, streamUrl: "", processingIntervalMs: 1000 },
  { id: "cam_02", name: "Cam 2", location: "server_room",   source: "device", deviceIndex: 1, streamUrl: "", processingIntervalMs: 1000 },
  { id: "cam_03", name: "Cam 3", location: "main_gate",     source: "device", deviceIndex: 2, streamUrl: "", processingIntervalMs: 1000 },
  { id: "cam_04", name: "Cam 4", location: "carpark_b1",    source: "device", deviceIndex: 3, streamUrl: "", processingIntervalMs: 1000 },
  { id: "cam_05", name: "Cam 5", location: "east_wing",     source: "device", deviceIndex: 4, streamUrl: "", processingIntervalMs: 1000 },
  { id: "cam_06", name: "Cam 6", location: "loading_bay",   source: "device", deviceIndex: 5, streamUrl: "", processingIntervalMs: 1000 },
];

export const NAV = [
  { id: "dashboard", label: "Dashboard",       icon: "⬛" },
  { id: "upload",    label: "Analyze",          icon: "⬆" },
  { id: "cameras",   label: "Cameras",          icon: "◉" },
  { id: "incidents", label: "Incidents",        icon: "⚠" },
  { id: "officers",  label: "Ground Officers",  icon: "👮" },
  { id: "shift",     label: "Shift Report",     icon: "📋" },
];