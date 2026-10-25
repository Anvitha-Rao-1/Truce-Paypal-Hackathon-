// Calls the Python agent service.
async function post(base, path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Agent service ${path} returned ${res.status}: ${await res.text()}`);
  return res.json();
}

export function createAgents(base) {
  return {
    health: async () => {
      try { return await (await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) })).json(); }
      catch { return { ok: false }; }
    },
    sellerPropose: (payload) => post(base, '/seller/propose', payload),
    buyerRespond: (payload) => post(base, '/buyer/respond', payload),
  };
}
