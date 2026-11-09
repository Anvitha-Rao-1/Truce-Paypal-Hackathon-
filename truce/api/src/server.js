import { validateSettings } from './settings.js';
import { EventEmitter } from 'node:events';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { createAgents } from './agents.js';
import { createMockClient } from './mockPaypal.js';
import { createNegotiator } from './negotiator.js';
import { createPayPalClient } from './paypal.js';
import { startPoller } from './poller.js';
import { createStore } from './store.js';
import { normalize } from './normalize.js';
import { newDoc } from './store.js';

const bus = new EventEmitter();
const state = { kill: false, apiLog: [], lastError: null };
const onLog = (entry) => { state.apiLog.push(entry); if (state.apiLog.length > 200) state.apiLog.shift(); bus.emit('change', { type: 'api_log' }); };

const pp = config.mode === 'mock'
  ? createMockClient({ onLog })
  : createPayPalClient({ base: config.paypalBase, id: config.seller.id, secret: config.seller.secret, onLog });
const store = await createStore(config.mongoUri);
const agents = createAgents(config.agentsUrl);
const negotiator = createNegotiator({ store, pp, agents, bus, config, state });

const app = express();
app.use(cors());
app.use(express.json());

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  state.lastError = e.message;
  console.error(e);
  res.status(e.status && e.status < 600 ? e.status : 500).json({ error: e.message, details: e.body || null });
});

app.get('/api/health', wrap(async (_req, res) => {
  res.json({ mode: config.mode, store: store.kind, kill: state.kill, agents: await agents.health(), lastError: state.lastError });
}));

app.get('/api/disputes', wrap(async (_req, res) => res.json(await store.list())));
app.get('/api/disputes/:id', wrap(async (req, res) => res.json(await negotiator.ensureDoc(req.params.id))));
app.get('/api/log', (_req, res) => res.json(state.apiLog.slice(-60)));

// Freelancer settings: what was promised + limits (percent of the disputed amount)
app.post('/api/disputes/:id/settings', wrap(async (req, res) => {
  const { scopeText, limits } = req.body;
    if (
    limits !== undefined &&
    (!limits || typeof limits !== 'object' || Array.isArray(limits))
  ) {
    return res.status(400).json({
      error: 'Invalid settings',
      details: ['Limits must be an object'],
    });
  }
  const doc = await negotiator.ensureDoc(req.params.id);

  const updatedLimits = limits === undefined
    ? doc.limits
    : { ...doc.limits, ...limits };

  const validation = validateSettings({
    scopeText,
    limits: limits === undefined ? undefined : updatedLimits,
  });

  if (!validation.ok) {
    return res.status(400).json({
      error: 'Invalid settings',
      details: validation.errors,
    });
  }

  if (scopeText !== undefined) {
    doc.scopeText = scopeText;
  }

  if (limits !== undefined) {
    doc.limits = updatedLimits;
  }

  res.json(await negotiator.save(doc, 'settings'));
}));

app.post('/api/disputes/:id/step', wrap(async (req, res) => res.json(await negotiator.step(req.params.id))));
app.post('/api/disputes/:id/approve', wrap(async (req, res) => res.json(await negotiator.approve(req.params.id))));
app.post('/api/disputes/:id/reject', wrap(async (req, res) => res.json(await negotiator.reject(req.params.id))));

app.post('/api/kill', (req, res) => { state.kill = Boolean(req.body.on); bus.emit('change', { type: 'kill' }); res.json({ kill: state.kill }); });

// Mock mode only: make a fake dispute to play with
app.post('/api/mock/disputes', wrap(async (req, res) => {
  if (!pp.mock) return res.status(400).json({ error: 'Only available when PAYPAL_MODE=mock' });
  const made = pp.create(Number(req.body.scenario || 0));
  const doc = newDoc(normalize(await pp.getDispute(made.id)));
  doc.scopeText = made.title;
  await store.save(doc);
  bus.emit('change', { id: doc.id, type: 'new_dispute' });
  res.json(doc);
}));

// Live updates to the browser
app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  bus.on('change', send);
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => { bus.off('change', send); clearInterval(ping); });
});

app.listen(config.port, () => {
  console.log(`Truce API on http://localhost:${config.port}  mode=${config.mode}  store=${store.kind}`);
  if (config.mode === 'sandbox') {
    startPoller({ pp, store, bus, seconds: config.pollSeconds, onError: (e) => { state.lastError = e.message; console.error('poll error:', e.message); } });
  }
});
