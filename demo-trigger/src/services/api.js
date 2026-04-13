const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

async function req(method, path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Check backend reachability or CORS.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  processAccessLog: (data) => req("POST", "/pipeline/access", data),
  manualTrigger: (data) => req("POST", "/pipeline/manual-event", data),
  resetDemoState: () => req("POST", "/demo/reset"),
};