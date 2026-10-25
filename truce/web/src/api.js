import { mock } from './mockData.js';

const base = import.meta.env.VITE_API_URL || '';

// --- offline awareness ---------------------------------------
// `offline` flips to true when a backend call can't reach the
// network at all (server not running). The UI can subscribe with
// onOffline() to show a "Demo data" marker.
let offline = false;
const listeners = new Set();
const setOffline = (v) => {
  if (offline === v) return;
  offline = v;
  listeners.forEach((fn) => fn(offline));
};
export const isOffline = () => offline;
export const onOffline = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

async function req(method, path, body) {
  let res;
  try {
    res = await fetch(`${base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch itself threw => the backend is unreachable (not an HTTP error)
    const err = new Error('Backend unreachable');
    err.network = true;
    throw err;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Our backend always sends `{ error: ... }` on a real failure.
    // A failed response with NO json error = the dev proxy couldn't
    // reach the backend (it's not running) => treat as unreachable.
    if (!json.error) {
      const err = new Error('Backend unreachable');
      err.network = true;
      throw err;
    }
    throw new Error(json.error);
  }
  return json;
}

// Try the real backend; only a NETWORK failure falls back to mock.
// A real HTTP error (4xx/5xx) still throws, exactly as before.
async function withFallback(real, mockFn) {
  try {
    const out = await real();
    setOffline(false);
    return out;
  } catch (e) {
    if (e.network) { setOffline(true); return mockFn(); }
    throw e;
  }
}

export const api = {
  health: () => withFallback(() => req('GET', '/health'), () => mock.health()),
  disputes: () => withFallback(() => req('GET', '/disputes'), () => mock.disputes()),
  log: () => withFallback(() => req('GET', '/log'), () => mock.log()),
  settings: (id, body) => withFallback(() => req('POST', `/disputes/${id}/settings`, body), () => mock.settings(id, body)),
  step: (id) => withFallback(() => req('POST', `/disputes/${id}/step`), () => mock.step(id)),
  approve: (id) => withFallback(() => req('POST', `/disputes/${id}/approve`), () => mock.approve(id)),
  reject: (id) => withFallback(() => req('POST', `/disputes/${id}/reject`), () => mock.reject(id)),
  kill: (on) => withFallback(() => req('POST', '/kill', { on }), () => mock.kill(on)),
  mockDispute: (scenario) => withFallback(() => req('POST', '/mock/disputes', { scenario }), () => mock.mockDispute(scenario)),

  // Live updates. When the backend is up this is the real SSE stream.
  // When offline we don't open a socket (the app reloads after each
  // action anyway), so there's no console spam against a dead server.
  events: (onEvent) => {
    let es;
    try {
      es = new EventSource(`${base}/api/events`);
      es.onmessage = (e) => onEvent(JSON.parse(e.data));
      es.onerror = () => { if (offline) es.close(); }; // stop retrying once we know we're offline
    } catch {
      return () => {};
    }
    return () => es && es.close();
  },
};
