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
  { id: "CAM-01", name: "Cam 1", location: "Main Entrance",  source: "device", deviceIndex: 0, streamUrl: "" },
  { id: "CAM-02", name: "Cam 2", location: "Corridor B-2",   source: "stream", deviceIndex: 1, streamUrl: "" },
  { id: "CAM-03", name: "Cam 3", location: "Parking Lot",    source: "stream", deviceIndex: 2, streamUrl: "" },
  { id: "CAM-04", name: "Cam 4", location: "Server Room",    source: "stream", deviceIndex: 3, streamUrl: "" },
  { id: "CAM-05", name: "Cam 5", location: "Lobby East",     source: "stream", deviceIndex: 4, streamUrl: "" },
  { id: "CAM-06", name: "Cam 6", location: "Stairwell A",    source: "stream", deviceIndex: 5, streamUrl: "" },
];

export const NAV = [
  { id: "dashboard", label: "Dashboard",       icon: "⬛" },
  { id: "upload",    label: "Analyze",          icon: "⬆" },
  { id: "cameras",   label: "Cameras",          icon: "◉" },
  { id: "incidents", label: "Incidents",        icon: "⚠" },
  { id: "officers",  label: "Ground Officers",  icon: "👮" },
  { id: "shift",     label: "Shift Report",     icon: "📋" },
];
