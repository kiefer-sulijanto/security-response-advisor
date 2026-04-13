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
  {
    id: "cam_sim_01",
    name: "Laptop Webcam",
    location: "server_room",
    source: "device",
    deviceIndex: 0,
    streamUrl: "",
    processingIntervalMs: 2000,
  },
  {
    id: "cam_phone_01",
    name: "Phone Camera",
    location: "lobby",
    source: "device",
    deviceIndex: 1,
    streamUrl: "",
    processingIntervalMs: 2000,
  }
];

export const NAV = [
  { id: "dashboard", label: "Dashboard",       icon: "⬛" },
  { id: "upload",    label: "Analyze",          icon: "⬆" },
  { id: "cameras",   label: "Cameras",          icon: "◉" },
  { id: "incidents", label: "Incidents",        icon: "⚠" },
  { id: "officers",  label: "Ground Officers",  icon: "👮" },
  { id: "shift",     label: "Shift Report",     icon: "📋" },
];
