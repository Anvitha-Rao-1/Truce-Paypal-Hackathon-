const base = import.meta.env.VITE_API_URL || '';

async function req(method, path, body) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export const api = {
  health: () => req('GET', '/health'),
  disputes: () => req('GET', '/disputes'),
  log: () => req('GET', '/log'),
  settings: (id, body) => req('POST', `/disputes/${id}/settings`, body),
  step: (id) => req('POST', `/disputes/${id}/step`),
  approve: (id) => req('POST', `/disputes/${id}/approve`),
  reject: (id) => req('POST', `/disputes/${id}/reject`),
  kill: (on) => req('POST', '/kill', { on }),
  mockDispute: (scenario) => req('POST', '/mock/disputes', { scenario }),
  events: (onEvent) => {
    const es = new EventSource(`${base}/api/events`);
    es.onmessage = (e) => onEvent(JSON.parse(e.data));
    return () => es.close();
  },
};
