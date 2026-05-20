import { useState, useEffect, useCallback } from "react";
import { C } from "./constants/colors";
import { api } from "./services/api.js";
import { Sidebar }            from "./components/Sidebar";
import { DashboardPage }      from "./pages/DashboardPage";
import { CamerasPage }        from "./pages/CamerasPage";
import { IncidentsPage }      from "./pages/IncidentsPage";
import { ResultsPage }        from "./pages/ResultsPage";
import { GroundOfficersPage } from "./pages/GroundOfficersPage";
import { ShiftReportPage }    from "./pages/ShiftReportPage";
import { ReportPage }         from "./pages/ReportPage";
import { LoginPage }          from "./pages/LoginPage";
import { LocationMapPage }    from "./pages/LocationMapPage";

const EMPTY_LOCATION_MAP = { floors: [] };

function isActiveIncident(incident) {
  const status = String(incident?.status || "").toLowerCase();
  return !["resolved", "closed", "completed", "cancelled"].includes(status);
}

function isCriticalIncident(incident) {
  const severity = String(incident?.severity || "").toLowerCase();
  const flag = String(incident?.flag || "").toLowerCase();
  const priority = String(incident?.priority || "").toLowerCase();

  return severity === "critical" || flag === "red" || priority === "red";
}

export default function App() {
  const [loggedIn, setLoggedIn]               = useState(false);
  const [page, setPage]                       = useState("dashboard");
  const [analyses, setAnalyses]               = useState([]);
  const [incidents, setIncidents]             = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [groundOfficers, setGroundOfficers]   = useState([]);
  const [dispatches, setDispatches]           = useState([]);
  const [goReports, setGoReports]             = useState([]);
  const [locationMap, setLocationMap]         = useState(EMPTY_LOCATION_MAP);
  const [backendOnline, setBackendOnline]     = useState(null); // null=checking, true, false

  // Poll backend every 5s for shared state.
  // Location map endpoint is optional for now, so frontend will not break if backend has not added it yet.
  const syncFromBackend = useCallback(async () => {
    try {
      const [inc, off, dis, rpts] = await Promise.all([
        api.getIncidents(),
        api.getOfficers(),
        api.getDispatches(),
        api.getReports(),
      ]);

      setIncidents(Array.isArray(inc) ? inc : []);
      setGroundOfficers(Array.isArray(off) ? off : []);
      setDispatches(Array.isArray(dis) ? dis : []);
      setGoReports(Array.isArray(rpts) ? rpts : []);

      if (typeof api.getLocationMap === "function") {
        try {
          const loc = await api.getLocationMap();
          setLocationMap(
            loc && Array.isArray(loc.floors)
              ? loc
              : EMPTY_LOCATION_MAP
          );
        } catch (err) {
          console.warn("Location map endpoint not ready yet:", err.message);
          setLocationMap(EMPTY_LOCATION_MAP);
        }
      } else {
        setLocationMap(EMPTY_LOCATION_MAP);
      }

      setBackendOnline(true);
    } catch (err) {
      console.warn("Backend sync failed:", err.message);
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    syncFromBackend();
    const id = setInterval(syncFromBackend, 5_000);
    return () => clearInterval(id);
  }, [syncFromBackend]);

  const handleAnalysisComplete = async ({ videoUrl, filename, result }) => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const id = `ANA-${String(analyses.length + 1).padStart(4, "0")}`;
    const entry = { id, filename, time, videoUrl, result };

    setAnalyses((prev) => [...prev, entry]);
    setCurrentAnalysis(entry);

    try {
      await syncFromBackend();
    } catch (err) {
      console.warn("Could not sync incidents from backend:", err.message);
    }

    setPage("results");
  };

  const handleDispatch = async ({ officerId, instruction, priority, incidentId }) => {
    try {
      await api.createDispatch({ officerId, instruction, priority, incidentId });
      await syncFromBackend();
    } catch (err) {
      console.warn("Dispatch failed:", err.message);
    }
  };

  const handleBack = () => {
    setCurrentAnalysis(null);
    setPage("dashboard");
  };

  const activeIncidentList = incidents.filter(isActiveIncident);
  const activeIncidents = activeIncidentList.length;
  const criticalCount = activeIncidentList.filter(isCriticalIncident).length;

  const renderPage = () => {
    if (page === "results" && currentAnalysis) {
      return <ResultsPage analysis={currentAnalysis} onBack={handleBack} />;
    }

    if (page === "cameras") {
      return <CamerasPage criticalCount={activeIncidents} />;
    }

    if (page === "map") {
      return (
       <LocationMapPage
         incidents={incidents}
         groundOfficers={groundOfficers}
         locationMap={locationMap}
         onNav={setPage}
         onDispatch={handleDispatch}
        />
      );
    }

    if (page === "incidents") {
      return (
        <IncidentsPage
          incidents={incidents}
          groundOfficers={groundOfficers}
          locationMap={locationMap}
          analyses={analyses}
          onDispatch={handleDispatch}
          onNav={setPage}
        />
      );
    }

    if (page === "officers") {
      return (
        <GroundOfficersPage
          groundOfficers={groundOfficers}
          dispatches={dispatches}
          incidents={incidents}
          onDispatch={handleDispatch}
          criticalCount={criticalCount}
        />
      );
    }

    if (page === "report") {
      return (
        <ReportPage
          analyses={analyses}
          incidents={incidents}
          dispatches={dispatches}
          groundOfficers={groundOfficers}
          criticalCount={criticalCount}
          goReports={goReports}
        />
      );
    }

    if (page === "shift") {
      return (
        <ShiftReportPage
          analyses={analyses}
          incidents={incidents}
          dispatches={dispatches}
          goReports={goReports}
          criticalCount={criticalCount}
          onLogout={() => {
            setLoggedIn(false);
            setPage("dashboard");
          }}
        />
      );
    }

    return (
      <DashboardPage
        onNav={setPage}
        onAnalysisComplete={handleAnalysisComplete}
        analyses={analyses}
        incidents={incidents}
        groundOfficers={groundOfficers}
        dispatches={dispatches}
      />
    );
  };

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.bg }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3a3d42; border-radius: 3px; }
      `}</style>

      {backendOnline === false && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 999,
            background: "#e24b4a22",
            border: "1px solid #e24b4a66",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 12,
            color: "#e24b4a",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}
        >
          ⚠ Backend offline — running in local mode
        </div>
      )}

      <Sidebar
        active={page === "results" ? "dashboard" : page}
        onNav={setPage}
        incidentCount={activeIncidents}
      />

      {renderPage()}
    </div>
  );
}