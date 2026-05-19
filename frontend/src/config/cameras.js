// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  📷 CAMERA CONFIGURATION — SET YOUR 4 CAMERA SOURCES HERE               ║ 
// ║                                                                          ║
// ║  Each camera needs:                                                      ║
// ║    id:     unique string                                                 ║
// ║    name:   display name                                                  ║
// ║    source: one of:                                                       ║
// ║      "device"  → uses browser getUserMedia (webcam/USB cam)              ║
// ║      "stream"  → HLS / DASH / MP4 URL (set streamUrl below)              ║
// ║      "rtsp"    → RTSP URL (requires a proxy; set streamUrl below)        ║
// ║                                                                          ║
// ║  For "device" source, deviceIndex selects which physical camera to use.  ║
// ║  Index 0 = first camera, 1 = second, etc.                                ║
// ║                                                                          ║
// ║  For "stream" source, set streamUrl to a public HLS/MP4 URL, e.g.:       ║
// ║    "https://yourserver.com/cam1/index.m3u8"                              ║
// ║                                                                          ║
// ║  For "rtsp" source, you need a backend proxy (e.g. FFmpeg → HLS).        ║
// ║  Set streamUrl to your proxy's HTTP output URL.                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// change the strcuture with the real floorplan later (dummy only)
export const CAMERA_CONFIG = [
  { id: "cam_01", name: "Cam 1", location: "server_room",       source: "stream", streamUrl: "http://192.168.1.43:4747/video", processingIntervalMs: 500 },
  { id: "cam_02", name: "Cam 2", location: "lobby",             source: "stream", streamUrl: "http://172.20.10.3:4747/video", processingIntervalMs: 500 },
  { id: "cam_03", name: "Cam 3", location: "gathering_area",    source: "stream", streamUrl: "http://172.20.10.4:4747/video", processingIntervalMs: 500 },

  { id: "cam_04", name: "Cam 4", location: "parking_area",      source: "placeholder", videoUrl: "/videos/normal_001.mp4" },
  { id: "cam_05", name: "Cam 5", location: "multi_purpose_room",source: "placeholder", videoUrl: "/videos/normal_002.mp4" },
  { id: "cam_06", name: "Cam 6", location: "store_room",        source: "placeholder", videoUrl: "/videos/normal_004.mp4" },

  {
    id: "cam_01",
    name: "Cam 1",
    location: "server_room",
    mapLocation: "server_room",
    displayLocation: "Server Room",
    floor: "first_floor",
    zone: "Server Room",
    mapX: 12,
    mapY: 12,
    source: "stream",
    streamUrl: "http://172.20.10.2:4747/video",
    processingIntervalMs: 1000,
  },
  {
    id: "cam_02",
    name: "Cam 2",
    location: "room_B",
    mapLocation: "gathering_area",
    displayLocation: "Gathering Area",
    floor: "first_floor",
    zone: "Gathering Area",
    mapX: 38,
    mapY: 36,
    source: "stream",
    streamUrl: "http://172.20.10.3:4747/video",
    processingIntervalMs: 1000,
  },
  {
    id: "cam_03",
    name: "Cam 3",
    location: "room_C",
    mapLocation: "lobby",
    displayLocation: "Lobby",
    floor: "first_floor",
    zone: "Lobby",
    mapX: 66,
    mapY: 73,
    source: "stream",
    streamUrl: "http://172.20.10.4:4747/video",
    processingIntervalMs: 1000,
  },
  {
    id: "cam_04",
    name: "Cam 4",
    location: "carpark_b1",
    mapLocation: "parking_area",
    displayLocation: "Parking Area",
    floor: "basement",
    zone: "Parking Area",
    mapX: 42,
    mapY: 48,
    source: "placeholder",
    videoUrl: "/videos/normal_001.mp4",
  },
  {
    id: "cam_05",
    name: "Cam 5",
    location: "east_wing",
    mapLocation: "office_area",
    displayLocation: "Office Area",
    floor: "second_floor",
    zone: "Office Area",
    mapX: 36,
    mapY: 46,
    source: "placeholder",
    videoUrl: "/videos/normal_002.mp4",
  },
  {
    id: "cam_06",
    name: "Cam 6",
    location: "loading_bay",
    mapLocation: "command_centre",
    displayLocation: "Command Centre",
    floor: "second_floor",
    zone: "Command Centre",
    mapX: 81,
    mapY: 68,
    source: "placeholder",
    videoUrl: "/videos/normal_004.mp4",
  },
];
