import { FLOOR_LAYOUT } from "../config/floorPlan";

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function isActiveIncident(incident) {
  const status = normalize(incident?.status);

  return ![
    "resolved",
    "closed",
    "completed",
    "cancelled",
    "dismissed",
  ].includes(status);
}

export function formatTime(value) {
  if (!value) return "Unknown time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export function getIncidentType(incident) {
  return (
    incident?.incidentType ||
    incident?.incident_type ||
    incident?.type ||
    incident?.name ||
    "Incident"
  );
}

export function getIncidentTime(incident) {
  return (
    incident?.createdAt ||
    incident?.created_at ||
    incident?.timestamp ||
    incident?.time
  );
}

export function getFloorKey(floor) {
  return floor?.floor_key || floor?.floorKey || floor?.id || "";
}

export function getFloorLabel(floor) {
  return (
    floor?.floor_label ||
    floor?.floorLabel ||
    floor?.label ||
    getFloorKey(floor)
  );
}

export function getLocationKey(location) {
  return (
    location?.location_key ||
    location?.locationKey ||
    location?.id ||
    location?.location ||
    ""
  );
}

export function getLocationLabel(location) {
  return (
    location?.location_label ||
    location?.locationLabel ||
    location?.label ||
    location?.displayLocation ||
    getLocationKey(location)
  );
}

export function getLocationIncidents(location) {
  return [
    ...asArray(location?.active_incidents),
    ...asArray(location?.activeIncidents),
  ].filter(isActiveIncident);
}

export function getLocationOfficers(location) {
  return [
    ...asArray(location?.officers),
    ...asArray(location?.ground_officers),
    ...asArray(location?.groundOfficers),
  ];
}

export function getLocationCameras(location) {
  return [
    ...asArray(location?.cameras),
    ...asArray(location?.camera_list),
    ...asArray(location?.cameraList),
  ];
}

function toSafeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getLocationPriority(location, incidents = []) {
  const priorityIncident = incidents.find(
    (incident) => incident?.priority || incident?.flag || incident?.severity
  );

  const priority =
    location?.highest_priority ||
    location?.highestPriority ||
    location?.priority ||
    location?.flag ||
    priorityIncident?.priority ||
    priorityIncident?.flag ||
    priorityIncident?.severity ||
    "green";

  return normalize(priority) || "green";
}

export function getPriorityTheme(priority) {
  const normalized = normalize(priority);

  if (normalized === "red" || normalized === "critical") {
    return {
      key: "red",
      label: "Critical",
      color: "#fca5a5",
      border: "#ef4444",
      background: "rgba(239, 68, 68, 0.12)",
    };
  }

  if (
    normalized === "yellow" ||
    normalized === "warning" ||
    normalized === "caution"
  ) {
    return {
      key: "yellow",
      label: "Warning",
      color: "#fde68a",
      border: "#facc15",
      background: "rgba(250, 204, 21, 0.12)",
    };
  }

  return {
    key: "green",
    label: "Normal",
    color: "#86efac",
    border: "#22c55e",
    background: "rgba(34, 197, 94, 0.10)",
  };
}

function makeFallbackArea(index) {
  const col = index % 3;
  const row = Math.floor(index / 3);

  return {
    x: 5 + col * 30,
    y: 12 + row * 23,
    w: 25,
    h: 18,
  };
}

export function getVisualArea(floorKey, locationKey, index) {
  return (
    FLOOR_LAYOUT?.[floorKey]?.[locationKey] || {
      id: locationKey,
      label: locationKey,
      ...makeFallbackArea(index),
    }
  );
}

export function getAreaCenter(area) {
  return {
    x: area.x + area.w / 2,
    y: area.y + area.h / 2,
  };
}

export function buildRenderableFloors(locationMap) {
  return asArray(locationMap?.floors).map((floor) => {
    const floorKey = getFloorKey(floor);

    return {
      key: floorKey,
      label: getFloorLabel(floor),
      raw: floor,

      locations: asArray(floor?.locations).map((location, index) => {
        const locationKey = getLocationKey(location);
        const incidents = getLocationIncidents(location);
        const officers = getLocationOfficers(location);
        const cameras = getLocationCameras(location);

        const incidentCount = toSafeNumber(
          location?.incident_count ?? location?.incidentCount,
          incidents.length
        );

        const officerCount = toSafeNumber(
          location?.officer_count ?? location?.officerCount,
          officers.length
        );

        const highestPriority = getLocationPriority(location, incidents);

        return {
          key: locationKey,
          label: getLocationLabel(location),
          type: location?.type || "location",
          visualArea: getVisualArea(floorKey, locationKey, index),

          incidents,
          officers,
          cameras,

          incidentCount,
          officerCount,
          highestPriority,
          priorityTheme: getPriorityTheme(highestPriority),

          raw: location,
        };
      }),
    };
  });
}

export function flattenRenderableLocations(renderableFloors) {
  return asArray(renderableFloors).flatMap((floor) =>
    asArray(floor.locations).map((location) => ({
      ...location,
      floorKey: floor.key,
      floorLabel: floor.label,
    }))
  );
}

function distanceBetween(areaA, areaB) {
  const centerA = getAreaCenter(areaA);
  const centerB = getAreaCenter(areaB);

  return Math.sqrt(
    Math.pow(centerA.x - centerB.x, 2) +
      Math.pow(centerA.y - centerB.y, 2)
  );
}

export function getNearbyOfficersForLocation(
  renderableFloors,
  targetFloorKey,
  targetLocationKey,
  limit = 5,
  options = {}
) {
  const { excludeOfficerIds = [] } = options;
  const excluded = new Set(excludeOfficerIds.filter(Boolean));

  const allLocations = flattenRenderableLocations(renderableFloors);

  const targetLocation = allLocations.find(
    (location) =>
      normalize(location.floorKey) === normalize(targetFloorKey) &&
      normalize(location.key) === normalize(targetLocationKey)
  );

  if (!targetLocation) return [];

  const officers = [];

  for (const location of allLocations) {
    const sameFloor = normalize(location.floorKey) === normalize(targetFloorKey);

    for (const officer of asArray(location.officers)) {
      if (excluded.has(officer.id)) continue;

      officers.push({
        ...officer,
        currentFloorKey: location.floorKey,
        currentFloorLabel: location.floorLabel,
        currentLocationKey: location.key,
        currentLocationLabel: location.label,
        sameFloor,
        distanceScore:
          distanceBetween(targetLocation.visualArea, location.visualArea) +
          (sameFloor ? 0 : 50),
      });
    }
  }

  return officers
    .sort((a, b) => a.distanceScore - b.distanceScore)
    .slice(0, limit);
}

export function getOfficerAssignedIncidentId(officer) {
  return officer?.assignedIncidentId || officer?.assigned_incident_id || null;
}

export function isOfficerAvailableForDispatch(officer) {
  if (!officer) return false;
  const status = normalize(officer.status);
  const online = officer.online !== false;
  return online && status === "patrolling" && !getOfficerAssignedIncidentId(officer);
}

export function isActiveDispatch(dispatch) {
  const status = normalize(dispatch?.status);
  return ["unread", "acknowledged", "in_progress"].includes(status);
}

export function getDispatchIncidentId(dispatch) {
  return dispatch?.incidentId || dispatch?.incident_id || null;
}

export function getDispatchOfficerId(dispatch) {
  return dispatch?.officerId || dispatch?.officer_id || null;
}

export function getActiveOfficerDispatchMap(dispatches) {
  const map = new Map();
  for (const d of asArray(dispatches)) {
    if (isActiveDispatch(d)) {
      const officerId = getDispatchOfficerId(d);
      if (officerId) map.set(officerId, d);
    }
  }
  return map;
}

// Returns "available" | "responding" | "standby" | "offline"
export function getOfficerVisualStatus(officer, activeDispatchMap) {
  if (!officer || officer.summaryOnly) return "available";
  const status = normalize(officer.status);
  const online = officer.online !== false;

  if (!online || status === "offline" || status === "off_duty") return "offline";

  if (officer.id && activeDispatchMap && activeDispatchMap.has(officer.id)) {
    return "responding";
  }

  if (status === "responding" || status === "in_progress") return "responding";
  if (status === "patrolling") return "available";

  return "standby";
}

export function getOfficerShortLabel(officer, index = 0) {
  const id = String(officer?.id || "").toLowerCase();
  const match = id.match(/go[_-]?(\d+)/i);

  if (match) {
    return `GO_${match[1]}`;
  }

  return `GO_${index + 1}`;
}