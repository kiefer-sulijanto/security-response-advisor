import { useState, useEffect, useCallback } from "react";
import { C } from "./constants/colors";
import { api } from "./services/api.js";
import { Sidebar }            from "./components/Sidebar";
import { DashboardPage }      from "./pages/DashboardPage";
import { CamerasPage }        from "./pages/CamerasPage";
import { UploadPage }         from "./pages/UploadPage";
import { IncidentsPage }      from "./pages/IncidentsPage";
import { ResultsPage }        from "./pages/ResultsPage";
import { GroundOfficersPage } from "./pages/GroundOfficersPage";
import { ShiftReportPage }    from "./pages/ShiftReportPage";
import { CAMERA_CONFIG } from "./config/cameras";
import { CameraProcessor } from "./components/CameraProcessor";

export default function App() {
  const [page, setPage]                       = useState("dashboard");
  const [analyses, setAnalyses]               = useState([]);
  const [incidents, setIncidents]             = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [groundOfficers, setGroundOfficers]   = useState([]);
  const [dispatches, setDispatches]           = useState([]);
  const [goReports, setGoReports]             = useState([]);
  const [backendOnline, setBackendOnline]     = useState(null);  // null=checking, true, false

  // Poll backend every 10s for shared state
  const syncFromBackend = useCallback(async () => {
    try {
      const [inc, off, dis, rpts] = await Promise.all([
        api.getIncidents(),
        api.getOfficers(),
        api.getDispatches(),
        api.getReports(),
      ]);
      setIncidents(inc);
      setGroundOfficers(off);
      setDispatches(dis);
      setGoReports(rpts);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    syncFromBackend();
    const id = setInterval(syncFromBackend, 10_000);
    return () => clearInterval(id);
  }, [syncFromBackend]);

  const handleAnalysisComplete = async ({ videoUrl, filename, result }) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const id = `ANA-${String(analyses.length + 1).padStart(4, "0")}`;
    const entry = { id, filename, time, videoUrl, result };

    setAnalyses(prev => [...prev, entry]);
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

  const handleBack = () => { setCurrentAnalysis(null); setPage("upload"); };
  const activeIncidents = incidents.filter(i => i.status !== "resolved").length;
  const criticalCount   = incidents.filter(i => i.status !== "resolved" && i.severity === "critical").length;

  const renderPage = () => {
    if (page === "results" && currentAnalysis)
      return <ResultsPage analysis={currentAnalysis} onBack={handleBack} />;
    if (page === "upload")
      return <UploadPage onAnalysisComplete={handleAnalysisComplete} />;
    if (page === "cameras")
      return <CamerasPage criticalCount={activeIncidents} />;
    if (page === "incidents")
      return <IncidentsPage incidents={incidents} groundOfficers={groundOfficers}
               analyses={analyses} onDispatch={handleDispatch} onNav={setPage} />;
    if (page === "officers")
      return <GroundOfficersPage groundOfficers={groundOfficers} dispatches={dispatches}
               incidents={incidents} onDispatch={handleDispatch} criticalCount={criticalCount} />;
    if (page === "shift")
      return <ShiftReportPage analyses={analyses} incidents={incidents} dispatches={dispatches}
               groundOfficers={groundOfficers} criticalCount={criticalCount} goReports={goReports} />;
    return <DashboardPage onNav={setPage} analyses={analyses} incidents={incidents}
             groundOfficers={groundOfficers} dispatches={dispatches} />;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3a3d42; border-radius: 3px; }
      `}</style>

      {/* Backend status indicator */}
      {backendOnline === false && (
        <div style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 999,
          background: "#e24b4a22", border: "1px solid #e24b4a66",
          borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#e24b4a",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
          ⚠ Backend offline — running in local mode
        </div>
      )}

            <div style={{ display: "none" }}>
        {CAMERA_CONFIG.map((cam) => (
          <CameraProcessor key={`processor-${cam.id}`} cam={cam} />
        ))}
      </div>

      <Sidebar
        active={page === "results" ? "upload" : page}
        onNav={setPage}
        incidentCount={activeIncidents}
      />
      {renderPage()}
    </div>
    
  );
}
