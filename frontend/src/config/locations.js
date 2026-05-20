export const LOCATION_OPTIONS = [
  { value: "server_room", label: "Server Room" },
  { value: "meeting_room", label: "Meeting Room" },
  { value: "multi_purpose_room", label: "Multi-purpose Room" },
  { value: "gathering_area", label: "Gathering Area" },
  { value: "conference_room", label: "Conference Room" },
  { value: "canteen", label: "Canteen" },
  { value: "lobby", label: "Lobby" },
  { value: "ceo_office", label: "CEO Office" },
  { value: "manager_office", label: "Manager Office" },
  { value: "executive_office", label: "Executive Office" },
  { value: "office_area", label: "Office Area" },
  { value: "command_center", label: "Command Center" },
  { value: "parking_area", label: "Parking Area" },
  { value: "store_room", label: "Store Room" },
];

export const DEFAULT_LOCATION = "server_room";

export function getLocationLabel(locationKey) {
  return (
    LOCATION_OPTIONS.find((location) => location.value === locationKey)?.label ||
    locationKey
  );
}

export function isKnownLocation(locationKey) {
  return LOCATION_OPTIONS.some((location) => location.value === locationKey);
}
