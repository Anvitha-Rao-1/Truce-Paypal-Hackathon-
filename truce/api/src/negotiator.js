// The loop: refresh dispute -> ask seller agent -> guardrail -> (approval) -> PayPal.
import { check, resolveLimits } from './guardrail.js';
import { normalize } from './normalize.js';
import { newDoc } from './store.js';

export function createNegotiator({ store, pp, agents, bus, config, state }) {
  const now = () => new Date().toISOString();

  async function ensureDoc(id) {
    let doc = await store.get(id);
    if (!doc) {
      const raw = await pp.getDispute(id);
      doc = newDoc(normalize(raw));
      await store.save(doc);
    }
    return doc;
  }

  async function refresh(doc) {
    const raw = await pp.getDispute(doc.id);
    doc.dispute = normalize(raw);
    return doc;
  }

  const sentRounds = (doc) => doc.rounds.filter((r) => r.by === 'seller_agent' && r.sent);
  const lastOffer = (doc) => Math.max(0, ...sentRounds(doc).map((r) => r.amount || 0));

  function gate(doc, offer) {
    return check({
      offer,
      limits: resolveLimits(doc.dispute.amount, doc.limits),
      dispute: doc.dispute,
      lastOffer: lastOffer(doc),
      sentRounds: sentRounds(doc).length,
      kill: state.kill,
      maxRounds: config.maxRounds,
    });
  }

  function history(doc) {
    return doc.rounds
      .filter((r) => r.sent || r.by === 'buyer')
      .map((r) => ({ by: r.by, type: r.offer_type || null, amount: r.amount ?? null, message: r.message || null }));
  }

  async function propose(doc, forceRules = false) {
    const lim = resolveLimits(doc.dispute.amount, doc.limits);
    const dueAt = doc.dispute.dueAt ? new Date(doc.dispute.dueAt) : null;
    return agents.sellerPropose({
      dispute: {
        id: doc.id,
        amount: doc.dispute.amount,
        currency: doc.dispute.currency || 'USD',
        reason: doc.dispute.reason,
        buyer_messages: doc.dispute.buyerMessages,
        days_left: dueAt ? (dueAt - Date.now()) / 86_400_000 : null,
      },
      scope_text: doc.scopeText,
      limits: { floor: lim.floor, ceiling: lim.ceiling, step: lim.step, currency: doc.dispute.currency || 'USD', allowed_types: lim.allowed_types },
      history: history(doc),
      round: sentRounds(doc).length + 1,
      force_rules: forceRules,
    });
  }

  async function save(doc, type = 'update') {
    await store.save(doc);
    bus.emit('change', { id: doc.id, type });
    return doc;
  }

  async function sendPending(doc) {
    const offer = doc.pending;
    if (!offer) return { status: 'nothing_pending' };
    await refresh(doc);
    const verdict = gate(doc, offer); // second check, right before the real call
    if (!verdict.ok) {
      doc.rounds.push({ at: now(), by: 'guardrail', blocked: true, reasons: verdict.reasons, amount: offer.amount });
      doc.pending = null;
      await save(doc, 'blocked');
      return { status: 'blocked', reasons: verdict.reasons };
    }
    await pp.makeOffer(doc.id, { amount: offer.amount, currency: offer.currency, offer_type: offer.offer_type, note: offer.message });
    doc.rounds.push({ at: now(), by: 'seller_agent', sent: true, offer_type: offer.offer_type, amount: offer.amount, message: offer.message, source: offer.source });
    doc.pending = null;
    await save(doc, 'offer_sent');
    if (config.mode === 'mock') await mockBuyerTurn(doc, offer);
    await refresh(doc);
    return { status: 'sent', doc: await save(doc, 'refreshed') };
  }

  async function mockBuyerTurn(doc, offer) {
    const profile = pp.buyerProfile(doc.id);
    const decision = await agents.buyerRespond({
      offer_amount: offer.amount,
      dispute_amount: doc.dispute.amount,
      goal_pct: profile.goal_pct,
      round: sentRounds(doc).length,
      seller_message: offer.message,
    });
    pp.applyBuyerDecision(doc.id, decision);
    doc.rounds.push({ at: now(), by: 'buyer', decision: decision.action, message: decision.message, source: decision.source });
  }

  async function step(id) {
    const doc = await ensureDoc(id);
    await refresh(doc);
    if (doc.dispute.resolved) { await save(doc, 'resolved'); return { status: 'resolved', doc }; }
    if (doc.pending) return { status: 'waiting_for_approval', doc };
    if (state.kill) return { status: 'blocked', reasons: ['Kill switch is on'], doc };
    if (!doc.scopeText.trim()) return { status: 'needs_scope', doc };

    let proposal = await propose(doc);
    if (proposal.action === 'wait') {
      doc.rounds.push({ at: now(), by: 'seller_agent', held: true, message: proposal.message });
      await save(doc, 'held');
      return { status: 'held', doc };
    }
    let offer = { offer_type: proposal.offer_type, amount: proposal.amount, currency: doc.dispute.currency || 'USD', message: proposal.message, source: proposal.source };
    let verdict = gate(doc, offer);

    if (!verdict.ok) {
      doc.rounds.push({ at: now(), by: 'guardrail', blocked: true, reasons: verdict.reasons, amount: offer.amount, source: offer.source });
      proposal = await propose(doc, true); // retry once on safe built-in rules
      offer = { offer_type: proposal.offer_type, amount: proposal.amount, currency: offer.currency, message: proposal.message, source: 'rules' };
      verdict = proposal.action === 'offer' ? gate(doc, offer) : { ok: false, reasons: ['Agent chose to wait'] };
      if (!verdict.ok) {
        await save(doc, 'blocked');
        return { status: 'blocked', reasons: verdict.reasons, doc };
      }
    }

    doc.pending = { ...offer, verdict, proposedAt: now() };
    await save(doc, 'pending');
    if (doc.limits.auto_send) return sendPending(doc);
    return { status: 'waiting_for_approval', doc };
  }

  return {
    ensureDoc, refresh, step, save, gate, resolveLimits,
    approve: async (id) => sendPending(await ensureDoc(id)),
    reject: async (id) => {
      const doc = await ensureDoc(id);
      doc.rounds.push({ at: now(), by: 'freelancer', rejectedOffer: true, amount: doc.pending && doc.pending.amount });
      doc.pending = null;
      return save(doc, 'rejected');
    },
  };
}
