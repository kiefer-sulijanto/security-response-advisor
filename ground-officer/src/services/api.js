const BASE = "http://localhost:8000/api";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dispatches for this officer (acts as "alerts" in GO app)
  getMyDispatches: (officerId)     => req("GET",   `/dispatches?officerId=${officerId}`),
  updateDispatch:  (id, status)    => req("PATCH",  `/dispatches/${id}`, { status }),

  // Update own officer status/location
  updateMyStatus:  (officerId, data) => req("PATCH", `/officers/${officerId}`, data),

  // Get all incidents (read-only, for context)
  getIncidents:    ()              => req("GET",   "/incidents"),

  // Field reports — GO → backend → CC
  createReport: (data) => req("POST", "/reports", data),

  // Reset demo state
  resetDemoState: () => req("POST", "/demo/reset"),
};
