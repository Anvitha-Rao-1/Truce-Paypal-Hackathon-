// Real PayPal client. One instance per app (seller app, optionally buyer app).
// - caches the access token
// - spaces calls out (PayPal sandbox allows about 50 requests a minute)
// - reports every call to onLog so the UI can show an API log

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createPayPalClient({ base, id, secret, onLog = () => {}, gapMs = 1300 }) {
  let token = null;
  let expiresAt = 0;
  let chain = Promise.resolve();
  let last = 0;

  function throttled(fn) {
    const run = chain.then(async () => {
      const wait = Math.max(0, last + gapMs - Date.now());
      if (wait) await sleep(wait);
      last = Date.now();
      return fn();
    });
    chain = run.catch(() => {});
    return run;
  }

  async function getToken() {
    if (token && Date.now() < expiresAt - 60_000) return token;
    const auth = Buffer.from(`${id}:${secret}`).toString('base64');
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(`PayPal token request failed (${res.status}). Check client id and secret.`);
      err.body = json;
      throw err;
    }
    token = json.access_token;
    expiresAt = Date.now() + json.expires_in * 1000;
    onLog({ at: new Date().toISOString(), method: 'POST', path: '/v1/oauth2/token', status: res.status, scope: json.scope });
    return token;
  }

  function call(method, path, body) {
    return throttled(async () => {
      const t = await getToken();
      const started = Date.now();
      const res = await fetch(`${base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = text; }
      onLog({ at: new Date().toISOString(), method, path, status: res.status, ms: Date.now() - started, request: body || null });
      if (!res.ok) {
        const err = new Error(`PayPal ${res.status} on ${method} ${path}: ${json && json.message ? json.message : ''}`);
        err.status = res.status;
        err.body = json;
        throw err;
      }
      return json;
    });
  }

  const amountObj = (value, currency) => ({ currency_code: currency, value: Number(value).toFixed(2) });

  return {
    call,
    getToken,
    listDisputes: (query = '') => call('GET', `/v1/customer/disputes${query ? `?${query}` : ''}`),
    getDispute: (id) => call('GET', `/v1/customer/disputes/${id}`),
    sendMessage: (id, message) => call('POST', `/v1/customer/disputes/${id}/send-message`, { message }),
    makeOffer: (id, { amount, currency, offer_type, note }) =>
      call('POST', `/v1/customer/disputes/${id}/make-offer`, { note, offer_amount: amountObj(amount, currency), offer_type }),
    acceptOffer: (id, note) => call('POST', `/v1/customer/disputes/${id}/accept-offer`, { note }),
    denyOffer: (id, note) => call('POST', `/v1/customer/disputes/${id}/deny-offer`, { note }),
    escalate: (id, note) => call('POST', `/v1/customer/disputes/${id}/escalate`, { note }),
    // used by spike scripts to create a test payment
    createOrder: (body) => call('POST', '/v2/checkout/orders', body),
    captureOrder: (orderId) => call('POST', `/v2/checkout/orders/${orderId}/capture`, {}),
  };
}
