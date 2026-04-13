const BASE = "http://localhost:8000/api";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Health / pipeline helpers
  getPipelineCameras: () => req("GET", "/pipeline/cameras"),
  getPipelineEvents: () => req("GET", "/pipeline/events"),

  // Pipeline endpoints
  processCctvDetection: (data) => req("POST", "/pipeline/cctv", data),
  processCctvFrame: (data) => req("POST", "/pipeline/cctv/frame", data),
  processAccessLog: (data) => req("POST", "/pipeline/access", data),

  // Incidents
  getIncidents:      () => req("GET", "/incidents"),
  createIncident:    (data) => req("POST", "/incidents", data),
  updateIncident:    (id, data) => req("PATCH", `/incidents/${id}`, data),

  // Officers
  getOfficers:       () => req("GET", "/officers"),
  updateOfficer:     (id, data) => req("PATCH", `/officers/${id}`, data),

  // Dispatches
  getDispatches:     () => req("GET", "/dispatches"),
  createDispatch:    (data) => req("POST", "/dispatches", data),
  updateDispatch:    (id, data) => req("PATCH", `/dispatches/${id}`, data),

  // AI analyze
  analyze:           (data) => req("POST", "/analyze", data),

  // GO reports
  getReports:        () => req("GET", "/reports"),
};
