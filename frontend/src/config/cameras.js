const env = import.meta.env;

function envValue(key, fallback = "") {
  const value = env[key];
  return value === undefined || value === null || value === "" ? fallback : value;
}

function envNumber(key, fallback) {
  const value = env[key];
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBoolean(key, fallback) {
  const value = env[key];
  if (value === undefined || value === null || value === "") return fallback;

  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
}

function buildCamera({
  id,
  name,
  location,
  defaultSource = "stream",
  defaultVideoUrl = "",
  defaultProcessingEnabled = true,
}) {
  const key = id.toUpperCase();

  const streamUrl = envValue(`VITE_${key}_STREAM_URL`, "");
  const videoUrl = envValue(`VITE_${key}_VIDEO_URL`, defaultVideoUrl);

  return {
    id,
    name: envValue(`VITE_${key}_NAME`, name),
    location: envValue(`VITE_${key}_LOCATION`, location),
    source: envValue(`VITE_${key}_SOURCE`, defaultSource),
    streamUrl,
    deviceIndex: envNumber(`VITE_${key}_DEVICE_INDEX`, 0),
    videoUrl,
    processingIntervalMs: envNumber(`VITE_${key}_PROCESSING_INTERVAL_MS`, 500),
    processingEnabled: envBoolean(
      `VITE_${key}_PROCESSING_ENABLED`,
      defaultProcessingEnabled
    ),
  };
}

export const CAMERA_CONFIG = [
  buildCamera({
    id: "cam_01",
    name: "Entrance Camera",
    location: "server_room",
    defaultSource: "stream",
    defaultProcessingEnabled: true,
  }),

  buildCamera({
    id: "cam_02",
    name: "Lobby Camera",
    location: "lobby",
    defaultSource: "placeholder",
    defaultVideoUrl: "/videos/fighting.mp4",
    defaultProcessingEnabled: true,
  }),

  /*buildCamera({
    id: "cam_03",
    name: "Gathering Area Camera",
    location: "gathering_area",
    defaultSource: "stream",
    defaultProcessingEnabled: true,
  }),*/

  buildCamera({
    id: "cam_04",
    name: "Main hall Camera",
    location: "parking_area",
    defaultSource: "placeholder",
    defaultVideoUrl: "/videos/normal_001.mp4",
    defaultProcessingEnabled: false,
  }),

  buildCamera({
    id: "cam_05",
    name: "Street Preview",
    location: "multi_purpose_room",
    defaultSource: "placeholder",
    defaultVideoUrl: "/videos/normal_002.mp4",
    defaultProcessingEnabled: false,
  }),

  buildCamera({
    id: "cam_06",
    name: "Main Entrance View",
    location: "store_room",
    defaultSource: "placeholder",
    defaultVideoUrl: "/videos/normal_004.mp4",
    defaultProcessingEnabled: false,
  }),
];
