import { useEffect, useMemo, useState } from "react";
import { FLOOR_LAYOUT } from "../config/floorPlan";
import { C, font } from "../constants/colors";
import { TopBar } from "../components/TopBar";
import {
  asArray,
  buildRenderableFloors,
  formatTime,
  getIncidentTime,
  getIncidentType,
  getOfficerShortLabel,
  getPriorityTheme,
  getNearbyOfficersForLocation,
  isActiveDispatch,
  getDispatchIncidentId,
  getDispatchOfficerId,
  isOfficerAvailableForDispatch,
  getActiveOfficerDispatchMap,
  getOfficerVisualStatus,
} from "../services/locationUtils";

function humanizeKey(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Returns inline style tokens for an officer marker/card based on visual status
function officerMarkerStyle(visualStatus) {
  if (visualStatus === "responding") {
    return {
      background: "rgba(251,146,60,0.18)",
      border: "2px solid rgba(251,146,60,0.8)",
      color: "#fdba74",
      boxShadow: "0 0 0 5px rgba(251,146,60,0.10)",
    };
  }
  if (visualStatus === "offline" || visualStatus === "standby") {
    return {
      background: "rgba(100,116,139,0.18)",
      border: "2px solid rgba(100,116,139,0.5)",
      color: "#94a3b8",
      boxShadow: "0 0 0 5px rgba(100,116,139,0.06)",
    };
  }
  // available (default) = blue
  return {
    background: "rgba(56,189,248,0.16)",
    border: "2px solid rgba(56,189,248,0.6)",
    color: "#bae6fd",
    boxShadow: "0 0 0 5px rgba(56,189,248,0.08)",
  };
}

function getIncidentId(incident) {
  return incident?.id || incident?.incidentId || incident?.incident_id || null;
}

function getFloorIncidentCount(locations) {
  return locations.reduce(
    (sum, location) =>
      sum + (location.incidentCount ?? asArray(location.incidents).length),
    0
  );
}

function getFloorOfficerCount(locations) {
  return locations.reduce(
    (sum, location) =>
      sum + (location.officerCount ?? asArray(location.officers).length),
    0
  );
}

function getDetailedIncidents(floor, locations) {
  return locations.flatMap((location) => {
    const detailedIncidents = asArray(location.incidents);

    if (detailedIncidents.length > 0) {
      return detailedIncidents.map((incident, index) => {
        const incidentId = getIncidentId(incident);

        return {
          ...incident,
          id: incidentId,
          mapKey: incidentId || `${floor.key}-${location.key}-${index}`,
          mapFloorKey: floor.key,
          mapFloorLabel: floor.label,
          mapLocationKey: location.key,
          mapLocationLabel: location.label,
          mapPriority:
            incident.priority ||
            incident.flag ||
            incident.severity ||
            location.highestPriority ||
            "green",
        };
      });
    }

    if ((location.incidentCount ?? 0) > 0) {
      return [
        {
          id: null,
          mapKey: `summary-${floor.key}-${location.key}`,
          incidentType: "Incident reported",
          status: "open",
          summaryOnly: true,
          mapFloorKey: floor.key,
          mapFloorLabel: floor.label,
          mapLocationKey: location.key,
          mapLocationLabel: location.label,
          mapPriority: location.highestPriority || "green",
        },
      ];
    }

    return [];
  });
}

function getDetailedOfficers(locations) {
  return locations.flatMap((location) => asArray(location.officers));
}

function mergeLayoutOnlyLocations(renderableFloors) {
  return renderableFloors.map((floor) => {
    const layoutForFloor = FLOOR_LAYOUT[floor.key] || {};
    const existingKeys = new Set(asArray(floor.locations).map((loc) => loc.key));

    const layoutOnlyLocations = Object.entries(layoutForFloor)
      .filter(([locationKey]) => !existingKeys.has(locationKey))
      .map(([locationKey, visualArea]) => ({
        key: locationKey,
        label: visualArea.label || humanizeKey(locationKey),
        type: visualArea.type || "layout",
        visualArea,
        incidents: [],
        officers: [],
        cameras: [],
        incidentCount: 0,
        officerCount: 0,
        highestPriority: "green",
        priorityTheme: getPriorityTheme("green"),
        layoutOnly: true,
        raw: null,
      }));

    const locations = [...asArray(floor.locations), ...layoutOnlyLocations].sort(
      (a, b) => {
        const ay = a.visualArea?.y ?? 0;
        const by = b.visualArea?.y ?? 0;
        const ax = a.visualArea?.x ?? 0;
        const bx = b.visualArea?.x ?? 0;

        if (ay !== by) return ay - by;
        return ax - bx;
      }
    );

    return {
      ...floor,
      locations,
    };
  });
}

export function LocationMapPage({
  locationMap = { floors: [] },
  groundOfficers = [],
  dispatches = [],
  onNav,
  onDispatch,
}) {
  const renderableFloors = useMemo(() => {
    const built = buildRenderableFloors(locationMap);
    return mergeLayoutOnlyLocations(built);
  }, [locationMap]);

  const activeDispatchMap = useMemo(
    () => getActiveOfficerDispatchMap(dispatches),
    [dispatches]
  );

  const [selectedFloorKey, setSelectedFloorKey] = useState("");

  useEffect(() => {
    if (renderableFloors.length === 0) return;

    const selectedStillExists = renderableFloors.some(
      (floor) => floor.key === selectedFloorKey
    );

    if (!selectedFloorKey || !selectedStillExists) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFloorKey(renderableFloors[0].key);
    }
  }, [renderableFloors, selectedFloorKey]);

  const selectedFloor = useMemo(() => {
    return (
      renderableFloors.find((floor) => floor.key === selectedFloorKey) ||
      renderableFloors[0]
    );
  }, [renderableFloors, selectedFloorKey]);

  const selectedLocations = asArray(selectedFloor?.locations);

  const activeIncidents = selectedFloor
    ? getDetailedIncidents(selectedFloor, selectedLocations)
    : [];

  const officers = getDetailedOfficers(selectedLocations);
  const activeIncidentCount = getFloorIncidentCount(selectedLocations);
  const officerCount = getFloorOfficerCount(selectedLocations);

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: C.bg,
        color: C.textPrimary,
        fontFamily: font,
      }}
    >
      <TopBar
        title="Live Incident Location Map"
        subtitle="Backend-driven floors, locations, incidents and ground officers"
        criticalCount={activeIncidentCount}
      />

      <div style={{ padding: "24px 28px" }}>
        {renderableFloors.length === 0 ? (
          <EmptyLocationState />
        ) : (
          <>
            <FloorSelector
              floors={renderableFloors}
              selectedFloorKey={selectedFloorKey}
              onSelect={setSelectedFloorKey}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 360px",
                gap: 20,
                alignItems: "start",
              }}
            >
              <MapPanel
                floor={selectedFloor}
                locations={selectedLocations}
                activeDispatchMap={activeDispatchMap}
                onNav={onNav}
              />

              <SidePanel
                floor={selectedFloor}
                renderableFloors={renderableFloors}
                incidentCount={activeIncidentCount}
                incidents={activeIncidents}
                officerCount={officerCount}
                officers={officers}
                dispatches={dispatches}
                groundOfficers={groundOfficers}
                activeDispatchMap={activeDispatchMap}
                onNav={onNav}
                onDispatch={onDispatch}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyLocationState() {
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        background: C.surface,
        borderRadius: 18,
        padding: 22,
        color: C.textSecondary,
        lineHeight: 1.6,
      }}
    >
      Location map data is not available yet.
      <br />
      Waiting for backend endpoint:{" "}
      <code style={{ color: C.textPrimary }}>/api/command-center/map</code>
    </div>
  );
}

function FloorSelector({ floors, selectedFloorKey, onSelect }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        marginBottom: 18,
        flexWrap: "wrap",
      }}
    >
      {floors.map((floor) => {
        const isActive = selectedFloorKey === floor.key;

        return (
          <button
            key={floor.key}
            onClick={() => onSelect(floor.key)}
            style={{
              border: `1px solid ${isActive ? C.green : C.border}`,
              background: isActive ? C.greenDim : C.surface,
              color: isActive ? C.green : C.textSecondary,
              borderRadius: 999,
              padding: "9px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {floor.label}
          </button>
        );
      })}
    </div>
  );
}

function MapPanel({ floor, locations, activeDispatchMap, onNav }) {
  const incidentCount = getFloorIncidentCount(locations);
  const officerCount = getFloorOfficerCount(locations);

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          padding: "12px 16px",
          borderRadius: 16,
          border: `1px solid ${C.border}`,
          background: C.surface,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, color: C.textPrimary }}>{floor.label}</div>

        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: C.textSecondary,
          }}
        >
          {incidentCount} active incident{incidentCount === 1 ? "" : "s"} ·{" "}
          {officerCount} officer{officerCount === 1 ? "" : "s"}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: 650,
          overflow: "hidden",
          borderRadius: 24,
          border: `1px solid ${C.border}`,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), #111827",
          backgroundSize: "40px 40px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
        }}
      >
        {locations.map((location, index) => (
          <LocationArea
            key={location.key || index}
            location={location}
            activeDispatchMap={activeDispatchMap}
            onNav={onNav}
          />
        ))}
      </div>
    </div>
  );
}

function LocationArea({ location, activeDispatchMap, onNav }) {
  const layout = location.visualArea;
  const incidents = asArray(location.incidents);
  const officers = asArray(location.officers);
  const cameras = asArray(location.cameras);

  const incidentCount = location.incidentCount ?? incidents.length;
  const officerCount = location.officerCount ?? officers.length;
  const priorityTheme =
    location.priorityTheme || getPriorityTheme(location.highestPriority);

  const hasIncident = incidentCount > 0;
  const hasAnyMarker = incidentCount > 0 || officerCount > 0;
  const markersDisabled = Boolean(layout.markerDisabled);

  return (
    <div
      style={{
        position: "absolute",
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: `${layout.w}%`,
        height: `${layout.h}%`,
        border: hasIncident
          ? `1px solid ${priorityTheme.border}`
          : `1px solid ${C.border}`,
        background: hasIncident
          ? priorityTheme.background
          : layout.variant === "soft"
            ? "rgba(34,197,94,0.05)"
            : "rgba(15,23,42,0.18)",
        borderRadius: layout.variant === "soft" ? 999 : 16,
        color: "rgba(203,213,225,0.45)",
        fontSize: layout.compact ? 11 : layout.w < 12 ? 11 : 13,
        fontWeight: 700,
        textAlign: "center",
        padding: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: markersDisabled ? "50%" : hasAnyMarker ? "73%" : "62%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          pointerEvents: "none",
          zIndex: 1,
          lineHeight: 1.25,
        }}
      >
        {location.label}
      </div>

      {hasIncident && (
        <button
          onClick={() => onNav && onNav("incidents")}
          title={`${incidentCount} active incident${incidentCount === 1 ? "" : "s"}`}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            width: 30,
            height: 30,
            borderRadius: 999,
            background: priorityTheme.background,
            border: `2px solid ${priorityTheme.border}`,
            color: priorityTheme.color,
            fontSize: 13,
            fontWeight: 900,
            cursor: "pointer",
            zIndex: 5,
            display: "grid",
            placeItems: "center",
            boxShadow: `0 0 0 5px ${priorityTheme.background}`,
          }}
        >
          {incidentCount}
        </button>
      )}

      {!markersDisabled && (
        <CenterMarkers
          officers={officers}
          officerCount={officerCount}
          activeDispatchMap={activeDispatchMap}
        />
      )}

      {markersDisabled && officerCount > 0 && (
        <SmallCountBadge
          side="right"
          text={`${officerCount}`}
          color="#bae6fd"
          border="rgba(56,189,248,0.4)"
          background="rgba(56,189,248,0.14)"
        />
      )}

      {cameras.length > 0 && (
        <CameraBadges cameras={cameras} hasIncident={hasIncident} />
      )}
    </div>
  );
}

function CenterMarkers({
  officers,
  officerCount,
  activeDispatchMap,
}) {
  const visibleOfficerDots =
    officers.length > 0
      ? officers.slice(0, 4)
      : Array.from({ length: Math.min(officerCount, 4) }, (_, index) => ({
          id: `summary-officer-${index}`,
          name: "Officer",
          summaryOnly: true,
        }));

  const hiddenOfficerCount = Math.max(officerCount - visibleOfficerDots.length, 0);

  if (visibleOfficerDots.length === 0 && hiddenOfficerCount === 0) {
    return null;
  }

  const officerColumns = visibleOfficerDots.length <= 1 ? 1 : 2;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "36%",
        transform: "translateX(-50%)",
        zIndex: 4,
        display: "grid",
        gridTemplateColumns: `repeat(${officerColumns}, max-content)`,
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        maxWidth: "84%",
      }}
    >
      {visibleOfficerDots.map((officer, index) => {
        const visualStatus = getOfficerVisualStatus(officer, activeDispatchMap);
        const mStyle = officerMarkerStyle(visualStatus);
        return (
          <span
            key={officer.id || officer.badge || index}
            title={`${officer.name || "Officer"} · ${officer.status || "standby"}`}
            style={{
              minWidth: 42,
              height: 28,
              borderRadius: 999,
              padding: "0 9px",
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              fontWeight: 900,
              whiteSpace: "nowrap",
              ...mStyle,
            }}
          >
            {officer.summaryOnly ? "GO" : getOfficerShortLabel(officer, index)}
          </span>
        );
      })}

      {hiddenOfficerCount > 0 && (
        <span
          style={{
            minWidth: 42,
            height: 28,
            borderRadius: 999,
            padding: "0 9px",
            background: "rgba(56,189,248,0.16)",
            border: "2px solid rgba(56,189,248,0.6)",
            color: "#bae6fd",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          +{hiddenOfficerCount}
        </span>
      )}
    </div>
  );
}

function SmallCountBadge({ side, text, color, border, background }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: side === "right" ? 8 : "auto",
        left: side === "left" ? 8 : "auto",
        borderRadius: 999,
        padding: "4px 8px",
        background,
        border: `1px solid ${border}`,
        color,
        fontSize: 10,
        fontWeight: 900,
        zIndex: 5,
      }}
    >
      {text}
    </div>
  );
}

function CameraBadges({ cameras, hasIncident }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        left: 8,
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        zIndex: 5,
      }}
    >
      {cameras.slice(0, 3).map((camera, index) => (
        <span
          key={camera.id || camera.camera_id || index}
          title={camera.name || camera.camera_name || "Camera"}
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            border: hasIncident ? `2px solid ${C.red}` : "2px solid #22c55e",
            background: hasIncident ? C.redDim : "rgba(34,197,94,0.15)",
            color: hasIncident ? "#fca5a5" : "#86efac",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
        </span>
      ))}

      {cameras.length > 3 && (
        <span
          style={{
            height: 28,
            borderRadius: 10,
            padding: "0 8px",
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.75)",
            color: C.textSecondary,
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 900,
          }}
        >
          +{cameras.length - 3}
        </span>
      )}
    </div>
  );
}

function SidePanel({
  floor,
  renderableFloors,
  incidentCount,
  incidents,
  officerCount,
  officers,
  dispatches,
  groundOfficers,
  activeDispatchMap,
  onNav,
  onDispatch,
}) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: `1px solid ${C.border}`,
        background: C.surface,
        padding: 20,
        boxShadow: "0 18px 44px rgba(0,0,0,0.22)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.textPrimary }}>
        {floor.label}
      </h2>

      <p
        style={{
          margin: "8px 0 18px",
          color: C.textSecondary,
          fontSize: 13,
        }}
      >
        Synced from backend location map.
      </p>

      <IncidentList
        incidentCount={incidentCount}
        incidents={incidents}
        renderableFloors={renderableFloors}
        dispatches={dispatches}
        groundOfficers={groundOfficers}
        onNav={onNav}
        onDispatch={onDispatch}
      />

      <OfficerList officerCount={officerCount} officers={officers} activeDispatchMap={activeDispatchMap} />

      <Legend />
    </div>
  );
}

function IncidentList({
  incidentCount,
  incidents,
  renderableFloors,
  dispatches,
  groundOfficers,
  onNav,
  onDispatch,
}) {
  return (
    <>
      <h3 style={{ fontSize: 14, margin: "0 0 10px", color: C.textPrimary }}>Active Incidents</h3>

      {incidentCount === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.25)",
            color: "#bbf7d0",
            fontSize: 13,
          }}
        >
          No active incidents on this floor.
        </div>
      ) : incidents.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "rgba(250,204,21,0.10)",
            border: "1px solid rgba(250,204,21,0.35)",
            color: "#fde68a",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {incidentCount} active incident{incidentCount === 1 ? "" : "s"} reported,
          but incident details are not included in this map response.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {incidents.map((incident, index) => (
            <IncidentDispatchCard
              key={incident.mapKey || incident.id || index}
              incident={incident}
              renderableFloors={renderableFloors}
              dispatches={dispatches}
              groundOfficers={groundOfficers}
              onNav={onNav}
              onDispatch={onDispatch}
            />
          ))}
        </div>
      )}
    </>
  );
}

function IncidentDispatchCard({
  incident,
  renderableFloors,
  dispatches,
  groundOfficers,
  onNav,
  onDispatch,
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [priority, setPriority] = useState("");
  const [instruction, setInstruction] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [assignedNotice, setAssignedNotice] = useState("");
  const [dispatchError, setDispatchError] = useState("");

  // Active dispatches for this specific incident
  const incidentDispatches = useMemo(() => {
    if (!incident.id) return [];
    return asArray(dispatches).filter(
      (d) => isActiveDispatch(d) && getDispatchIncidentId(d) === incident.id
    );
  }, [dispatches, incident.id]);

  // Officers assigned to this incident (matched to groundOfficers for fresh status)
  const assignedOfficers = useMemo(() => {
    return incidentDispatches.map((d) => {
      const officerId = getDispatchOfficerId(d);
      const officer = asArray(groundOfficers).find((o) => o.id === officerId) || null;
      return { dispatch: d, officer };
    });
  }, [incidentDispatches, groundOfficers]);

  // All IDs to exclude from the nearest-officers list:
  //   - officers with any active dispatch (already deployed somewhere)
  //   - officers not in "patrolling" status (unavailable by status)
  const excludeFromNearest = useMemo(() => {
    const busyByDispatch = asArray(dispatches)
      .filter(isActiveDispatch)
      .map(getDispatchOfficerId)
      .filter(Boolean);

    const busyByStatus = asArray(groundOfficers)
      .filter((o) => !isOfficerAvailableForDispatch(o))
      .map((o) => o.id)
      .filter(Boolean);

    return [...new Set([...busyByDispatch, ...busyByStatus])];
  }, [dispatches, groundOfficers]);

  const nearestOfficers = useMemo(() => {
    return getNearbyOfficersForLocation(
      renderableFloors,
      incident.mapFloorKey,
      incident.mapLocationKey,
      3,
      { excludeOfficerIds: excludeFromNearest }
    );
  }, [renderableFloors, incident.mapFloorKey, incident.mapLocationKey, excludeFromNearest]);

  const theme = getPriorityTheme(incident.mapPriority || "red");
  const selectedOfficer = nearestOfficers.find(
    (officer) => officer.id === selectedOfficerId
  );

  const canSend =
    selectedOfficerId &&
    priority &&
    instruction.trim() &&
    typeof onDispatch === "function" &&
    !incident.summaryOnly;

  function resetForm() {
    setSelectedOfficerId("");
    setPriority("");
    setInstruction("");
  }

  async function handleSend() {
    if (!canSend) return;

    setIsSending(true);
    setDispatchError("");

    try {
      await onDispatch({
        officerId: selectedOfficerId,
        incidentId: incident.id,
        priority,
        instruction: instruction.trim(),
      });

      const assignedName = selectedOfficer?.name || "officer";
      setAssignedNotice(`Assigned ${assignedName}`);
      resetForm();
      setIsAssigning(false);
      setTimeout(() => setAssignedNotice(""), 3500);
    } catch (err) {
      const message = String(err?.message || "");
      if (message.includes("409") || /unavailable|already|conflict/i.test(message)) {
        setDispatchError(
          "Officer is no longer available. Please choose another officer."
        );
      } else {
        setDispatchError(message || "Dispatch failed. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.background,
        borderRadius: 16,
        padding: 14,
        color: C.textPrimary,
      }}
    >
      {/* Assigned officers section */}
      {assignedOfficers.length > 0 && (
        <div
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#86efac",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 7,
            }}
          >
            Assigned Officer{assignedOfficers.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {assignedOfficers.map(({ dispatch, officer }, index) => (
              <AssignedOfficerBadge
                key={dispatch?.id || index}
                dispatch={dispatch}
                officer={officer}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: 12,
          alignItems: "start",
        }}
      >
        <button
          onClick={() => onNav && onNav("incidents")}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "transparent",
            color: C.textPrimary,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <strong style={{ color: theme.color, fontSize: 15 }}>
            {getIncidentType(incident)}
          </strong>

          <div style={{ color: C.textSecondary, fontSize: 12, marginTop: 4 }}>
            Location:{" "}
            <strong style={{ color: C.textPrimary }}>
              {incident.mapLocationLabel}
            </strong>
            <br />
            Status: {incident.status || "open"}
            <br />
            Time: {formatTime(getIncidentTime(incident))}
          </div>
        </button>

        <button
          onClick={() => {
            setIsAssigning((value) => !value);
            setAssignedNotice("");
            setDispatchError("");
          }}
          disabled={
            incident.summaryOnly ||
            (!isAssigning && nearestOfficers.length === 0)
          }
          title={
            incident.summaryOnly
              ? "Incident ID is required before dispatching"
              : !isAssigning && nearestOfficers.length === 0
                ? "No available officers"
                : "Assign officer"
          }
          style={{
            border: `1px solid ${theme.border}`,
            background: isAssigning ? theme.background : "rgba(255,255,255,0.06)",
            color: theme.color,
            borderRadius: 10,
            padding: "8px 10px",
            fontSize: 12,
            fontWeight: 900,
            cursor:
              incident.summaryOnly || (!isAssigning && nearestOfficers.length === 0)
                ? "not-allowed"
                : "pointer",
            whiteSpace: "nowrap",
            opacity:
              incident.summaryOnly || (!isAssigning && nearestOfficers.length === 0)
                ? 0.55
                : 1,
          }}
        >
          {isAssigning
            ? "Cancel"
            : assignedOfficers.length > 0
              ? "Assign another"
              : "Assign"}
        </button>
      </div>

      {/* No-officers inline message when form is closed */}
      {!incident.summaryOnly && !isAssigning && nearestOfficers.length === 0 && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(100,116,139,0.10)",
            border: "1px solid rgba(100,116,139,0.28)",
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <strong
            style={{ color: C.textSecondary, display: "block", marginBottom: 2 }}
          >
            No available officers
          </strong>
          All officers are currently assigned, offline, or not patrolling.
        </div>
      )}

      {assignedNotice && !isAssigning && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.28)",
            color: "#bbf7d0",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {assignedNotice}
        </div>
      )}

      {incident.summaryOnly && (
        <div
          style={{
            marginTop: 12,
            color: "#fde68a",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          Dispatch is disabled because this map response only contains incident
          count, not the incident ID.
        </div>
      )}

      {isAssigning && !incident.summaryOnly && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8, color: C.textPrimary }}>
            Top 3 Nearest Available Officers
          </div>

          {nearestOfficers.length === 0 ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(100,116,139,0.10)",
                border: "1px solid rgba(100,116,139,0.28)",
                color: "#94a3b8",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <strong
                style={{ color: C.textSecondary, display: "block", marginBottom: 2 }}
              >
                No available officers
              </strong>
              All officers are currently assigned, offline, or not patrolling.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8 }}>
                {nearestOfficers.map((officer, index) => {
                  const isSelected = selectedOfficerId === officer.id;

                  return (
                    <button
                      key={officer.id || index}
                      onClick={() => {
                        setSelectedOfficerId(officer.id);
                        setDispatchError("");
                      }}
                      style={{
                        textAlign: "left",
                        border: `1px solid ${
                          isSelected ? "#38bdf8" : "rgba(56,189,248,0.35)"
                        }`,
                        background: isSelected
                          ? "rgba(56,189,248,0.18)"
                          : "rgba(56,189,248,0.08)",
                        color: C.textPrimary,
                        borderRadius: 12,
                        padding: 10,
                        cursor: "pointer",
                      }}
                    >
                      <strong>
                        {getOfficerShortLabel(officer, index)} ·{" "}
                        {officer.name || "Ground Officer"}
                      </strong>

                      {officer.badge && (
                        <span style={{ color: C.textSecondary }}>
                          {" "}
                          · {officer.badge}
                        </span>
                      )}

                      <br />

                      <span style={{ color: C.textSecondary, fontSize: 12 }}>
                        {officer.currentLocationLabel}
                        {officer.sameFloor ? " · same floor" : " · different floor"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 12 }}>
                <label
                  style={{
                    display: "block",
                    color: C.textSecondary,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  disabled={!selectedOfficerId}
                  style={{
                    width: "100%",
                    border: `1px solid ${C.border}`,
                    background: "#111318",
                    color: C.textPrimary,
                    borderRadius: 10,
                    padding: "10px 12px",
                    opacity: selectedOfficerId ? 1 : 0.55,
                  }}
                >
                  <option value="">Select priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <label
                  style={{
                    display: "block",
                    color: C.textSecondary,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Instruction
                </label>

                <textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  disabled={!priority}
                  placeholder="e.g. Proceed to Server Room and assess the situation..."
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    border: `1px solid ${C.border}`,
                    background: "#111318",
                    color: C.textPrimary,
                    borderRadius: 10,
                    padding: "10px 12px",
                    opacity: priority ? 1 : 0.55,
                    fontFamily: font,
                  }}
                />
              </div>

              {dispatchError && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    color: "#fca5a5",
                    fontSize: 13,
                  }}
                >
                  {dispatchError}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={!canSend || isSending}
                style={{
                  marginTop: 12,
                  width: "100%",
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 12px",
                  background: canSend ? "#f97316" : "rgba(148,163,184,0.18)",
                  color: canSend ? "#fff7ed" : C.textMuted,
                  fontWeight: 900,
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                {isSending
                  ? "Sending..."
                  : selectedOfficer
                    ? `Assign ${selectedOfficer.name || "officer"}`
                    : "Send Instruction"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AssignedOfficerBadge({ dispatch, officer, index }) {
  const goLabel = officer ? getOfficerShortLabel(officer, index) : "GO_?";
  const name = officer?.name || "Ground Officer";
  const badge = officer?.badge;
  const status = officer?.status || "responding";
  const priority = dispatch?.priority;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 10,
        background: "rgba(34,197,94,0.10)",
        border: "1px solid rgba(34,197,94,0.28)",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: "#86efac",
          background: "rgba(34,197,94,0.18)",
          border: "1px solid rgba(34,197,94,0.4)",
          borderRadius: 6,
          padding: "2px 6px",
          whiteSpace: "nowrap",
        }}
      >
        {goLabel}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#bbf7d0" }}>
          {name}
          {badge && (
            <span style={{ color: C.textSecondary, fontWeight: 400 }}>
              {" "}
              · {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary }}>
          {humanizeKey(status)}
          {priority && (
            <span style={{ color: "#fde68a" }}>
              {" "}
              · {humanizeKey(priority)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OfficerList({ officerCount, officers, activeDispatchMap }) {
  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 16,
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <h3 style={{ fontSize: 14, margin: "0 0 10px", color: C.textPrimary }}>Officers</h3>

      {officerCount === 0 ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.border}`,
            color: C.textSecondary,
            fontSize: 13,
          }}
        >
          No officers shown on this floor.
        </div>
      ) : officers.length === 0 ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.35)",
            color: "#bae6fd",
            fontSize: 13,
          }}
        >
          {officerCount} officer{officerCount === 1 ? "" : "s"} reported on this
          floor, but officer details are not included in this map response.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {officers.map((officer, index) => {
            const goId = getOfficerShortLabel(officer, index);
            const visualStatus = getOfficerVisualStatus(officer, activeDispatchMap);
            const isResponding = visualStatus === "responding";
            const isOffline = visualStatus === "offline" || visualStatus === "standby";
            const cardBorder = isResponding
              ? "1px solid rgba(251,146,60,0.45)"
              : isOffline
                ? "1px solid rgba(100,116,139,0.35)"
                : "1px solid rgba(56,189,248,0.35)";
            const cardBg = isResponding
              ? "rgba(251,146,60,0.08)"
              : isOffline
                ? "rgba(100,116,139,0.06)"
                : "rgba(56,189,248,0.08)";
            const goIdColor = isResponding
              ? "#fdba74"
              : isOffline
                ? "#94a3b8"
                : "#bae6fd";
            const statusColor = isResponding
              ? "#fdba74"
              : isOffline
                ? "#94a3b8"
                : "#bae6fd";

            return (
              <div
                key={officer.id || officer.badge || index}
                style={{
                  border: cardBorder,
                  background: cardBg,
                  color: C.textPrimary,
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <strong>{officer.name || "Ground Officer"}</strong>

                <span style={{ color: goIdColor, fontWeight: 900 }}>
                  {" "}
                  · {goId}
                </span>

                {officer.badge && (
                  <span style={{ color: C.textSecondary }}>
                    {" "}
                    · {officer.badge}
                  </span>
                )}

                <br />

                <span style={{ color: statusColor, fontSize: 12 }}>
                  Status: {officer.status || "standby"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 16,
        borderTop: `1px solid ${C.border}`,
        display: "grid",
        gap: 8,
        fontSize: 13,
      }}
    >
      <div style={{ color: "#fca5a5" }}>Red dot = Critical incident</div>
      <div style={{ color: "#fde68a" }}>Yellow dot = Warning incident</div>
      <div style={{ color: "#bae6fd" }}>Blue dot = Available officer</div>
      <div style={{ color: "#fdba74" }}>Orange dot = Responding officer</div>
      <div style={{ color: "#94a3b8" }}>Gray dot = Offline / standby officer</div>
      <div style={{ color: "#86efac", display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        Green = Normal camera
      </div>
      <div style={{ color: "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        Red = Incident camera
      </div>
    </div>
  );
}