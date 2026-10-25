// ============================================================
// In-memory fake backend for DEMO / OFFLINE mode.
//
// api.js uses this automatically when the real backend can't be
// reached, so the whole app runs and demos with nothing else
// started. It mirrors the shapes Preksha's API returns (see
// api/src/store.js, normalize.js, mockPaypal.js) — do NOT change
// those field names here, the real UI reads the same keys.
// ============================================================

const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();
const round2 = (n) => Math.round(n * 100) / 100;

// Same scenarios the real mock PayPal uses, so demo feels consistent.
const SCENARIOS = [
  { title: 'Logo design, 3 revisions', amount: 250, invoice: 'INV-0042', buyer: 'Dana Client', goalPct: 40,
    complaint: 'The logo is not what I asked for. I wanted something more minimal.' },
  { title: 'Five-page website', amount: 600, invoice: 'INV-0051', buyer: 'Rohan Traders', goalPct: 45,
    complaint: 'The site is missing the booking page we discussed.' },
  { title: 'Social media pack, 12 posts', amount: 120, invoice: 'INV-0063', buyer: 'Maya Bakes', goalPct: 30,
    complaint: 'The posts do not match my brand colours.' },
];

const defaultLimits = () => ({
  floor_pct: 10, ceiling_pct: 50, step_pct: 10, allowed_types: ['REFUND'], auto_send: false,
});

// ---- mutable demo state (lives for the browser session) ----
const state = { docs: [], log: [], kill: false, counter: 2000, goals: {} };

function logEntry(method, path, status = 200) {
  state.log.push({ at: iso(Date.now()), method, path: `[demo] ${path}`, status, ms: 4 });
  if (state.log.length > 80) state.log.shift();
}

// Build a dispute document in the exact shape newDoc(normalize(...)) produces.
function makeDoc(index, { withScope = false } = {}) {
  const s = SCENARIOS[index % SCENARIOS.length];
  const id = `DEMO-${++state.counter}`;
  const now = Date.now();
  state.goals[id] = s.goalPct;
  return {
    id,
    createdAt: iso(now),
    scopeText: withScope ? `${s.title}. Delivered on time per the brief.` : '',
    limits: defaultLimits(),
    dispute: {
      id,
      status: 'WAITING_FOR_SELLER_RESPONSE',
      stage: 'INQUIRY',
      reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
      amount: s.amount,
      currency: 'USD',
      createdAt: iso(now),
      updatedAt: iso(now),
      dueAt: iso(now + 10 * DAY),
      messages: [{ by: 'BUYER', at: iso(now), text: s.complaint }],
      buyerMessages: [s.complaint],
      sellerOffer: null,
      buyerRequested: round2((s.amount * s.goalPct) / 100),
      offerType: null,
      canMakeOffer: true,
      resolved: false,
      outcome: null,
      invoice: s.invoice,
      buyerName: s.buyer,
    },
    rounds: [],
    pending: null,
  };
}

// Seed a few disputes in different states so the dashboard looks alive.
function seed() {
  if (state.docs.length) return;
  const fresh = makeDoc(0);                 // new, no scope yet
  const inProgress = makeDoc(1, { withScope: true });
  const settled = makeDoc(2, { withScope: true });

  // in-progress: one offer already sent, buyer countered, offer now pending
  const d = inProgress;
  const first = round2(d.dispute.amount * 0.1);
  d.dispute.messages.push({ by: 'SELLER', at: iso(Date.now()), text: `I can refund ${first.toFixed(2)} USD as a goodwill gesture.` });
  d.rounds.push({ at: iso(Date.now()), by: 'seller_agent', sent: true, offer_type: 'REFUND', amount: first, message: 'Goodwill refund offer.', source: 'rules' });
  d.dispute.messages.push({ by: 'BUYER', at: iso(Date.now()), text: 'That is too low, I expected more.' });
  d.rounds.push({ at: iso(Date.now()), by: 'buyer', decision: 'counter', message: 'That is too low, I expected more.' });
  const second = round2(d.dispute.amount * 0.2);
  d.pending = { offer_type: 'REFUND', amount: second, currency: 'USD', message: `Let's meet partway — ${second.toFixed(2)} USD refund.`, source: 'rules', verdict: { ok: true }, proposedAt: iso(Date.now()) };
  d.dispute.status = 'WAITING_FOR_SELLER_RESPONSE';

  // settled: resolved by an accepted offer
  const r = settled;
  const amt = round2(r.dispute.amount * 0.3);
  r.dispute.messages.push({ by: 'SELLER', at: iso(Date.now()), text: `Refund of ${amt.toFixed(2)} USD offered.` });
  r.dispute.messages.push({ by: 'BUYER', at: iso(Date.now()), text: 'Thanks, that works for me.' });
  r.rounds.push({ at: iso(Date.now()), by: 'seller_agent', sent: true, offer_type: 'REFUND', amount: amt, message: 'Refund offer.', source: 'rules' });
  r.rounds.push({ at: iso(Date.now()), by: 'buyer', decision: 'accept', message: 'Thanks, that works for me.' });
  r.dispute.status = 'RESOLVED';
  r.dispute.resolved = true;
  r.dispute.outcome = 'DEMO_SETTLED_BY_OFFER';
  r.dispute.sellerOffer = amt;
  r.dispute.canMakeOffer = false;

  state.docs = [fresh, inProgress, settled];
  logEntry('GET', '/v1/customer/disputes');
}

// ---- helpers used by step/approve ----
const limitsInMoney = (doc) => {
  const amt = doc.dispute.amount || 0;
  const l = doc.limits;
  return { floor: round2((amt * l.floor_pct) / 100), ceiling: round2((amt * l.ceiling_pct) / 100), step: round2((amt * l.step_pct) / 100) };
};
const sentOffers = (doc) => doc.rounds.filter((r) => r.by === 'seller_agent' && r.sent);
const find = (id) => state.docs.find((d) => d.id === id);

// ============================================================
// Public API — same method names the real `api` object exposes.
// ============================================================
export const mock = {
  health() {
    return { mode: 'mock', store: 'memory (demo)', kill: state.kill, agents: { llm: false }, lastError: null, offline: true };
  },
  disputes() { seed(); return state.docs.map((d) => structuredClone(d)); },
  log() { seed(); return state.log.slice(-60); },

  settings(id, body) {
    const doc = find(id);
    if (!doc) throw new Error('Demo dispute not found');
    if (typeof body.scopeText === 'string') doc.scopeText = body.scopeText;
    if (body.limits) doc.limits = { ...doc.limits, ...body.limits };
    logEntry('POST', `/disputes/${id}/settings`);
    return structuredClone(doc);
  },

  // Run one negotiation round: produce an offer and leave it pending for approval.
  step(id) {
    const doc = find(id);
    if (!doc) throw new Error('Demo dispute not found');
    if (doc.dispute.resolved) return { status: 'resolved', doc: structuredClone(doc) };
    if (doc.pending) return { status: 'waiting_for_approval', doc: structuredClone(doc) };
    if (state.kill) return { status: 'blocked', reasons: ['Kill switch is on'], doc: structuredClone(doc) };
    if (!doc.scopeText.trim()) return { status: 'needs_scope', doc: structuredClone(doc) };

    const { floor, ceiling, step } = limitsInMoney(doc);
    const n = sentOffers(doc).length;
    const amount = round2(Math.min(ceiling, floor + step * n));
    const msg = n === 0
      ? `I can offer a ${amount.toFixed(2)} USD refund to resolve this fairly.`
      : `I can raise my offer to ${amount.toFixed(2)} USD.`;
    doc.pending = { offer_type: 'REFUND', amount, currency: 'USD', message: msg, source: 'rules', verdict: { ok: true }, proposedAt: iso(Date.now()) };
    logEntry('POST', `/disputes/${id}/step`);
    return { status: 'waiting_for_approval', doc: structuredClone(doc) };
  },

  // Approve the pending offer: send it, then the demo buyer reacts.
  approve(id) {
    const doc = find(id);
    if (!doc || !doc.pending) return { status: 'nothing_pending', doc: doc && structuredClone(doc) };
    const offer = doc.pending;
    const now = iso(Date.now());
    doc.dispute.messages.push({ by: 'SELLER', at: now, text: offer.message });
    doc.rounds.push({ at: now, by: 'seller_agent', sent: true, offer_type: offer.offer_type, amount: offer.amount, message: offer.message, source: offer.source });
    doc.dispute.sellerOffer = offer.amount;
    doc.pending = null;
    logEntry('POST', `/v1/customer/disputes/${id}/make-offer`);

    // demo buyer: accept once the offer reaches their goal, else counter
    const goalAmt = round2((doc.dispute.amount * (state.goals[id] || 40)) / 100);
    if (offer.amount >= goalAmt) {
      doc.dispute.messages.push({ by: 'BUYER', at: now, text: 'That works for me, thank you.' });
      doc.rounds.push({ at: now, by: 'buyer', decision: 'accept', message: 'That works for me, thank you.' });
      doc.dispute.status = 'RESOLVED';
      doc.dispute.resolved = true;
      doc.dispute.outcome = 'DEMO_SETTLED_BY_OFFER';
      doc.dispute.canMakeOffer = false;
    } else {
      doc.dispute.messages.push({ by: 'BUYER', at: now, text: 'Still not enough, can you do better?' });
      doc.rounds.push({ at: now, by: 'buyer', decision: 'counter', message: 'Still not enough, can you do better?' });
      doc.dispute.status = 'WAITING_FOR_SELLER_RESPONSE';
    }
    return { status: 'sent', doc: structuredClone(doc) };
  },

  reject(id) {
    const doc = find(id);
    if (!doc) throw new Error('Demo dispute not found');
    doc.rounds.push({ at: iso(Date.now()), by: 'freelancer', rejectedOffer: true, amount: doc.pending && doc.pending.amount });
    doc.pending = null;
    logEntry('POST', `/disputes/${id}/reject`);
    return structuredClone(doc);
  },

  kill(on) { state.kill = Boolean(on); logEntry('POST', '/kill'); return { kill: state.kill }; },

  mockDispute(scenario) {
    seed();
    const doc = makeDoc(Number(scenario || 0));
    state.docs.push(doc);
    logEntry('POST', '/mock/disputes');
    return structuredClone(doc);
  },
};
