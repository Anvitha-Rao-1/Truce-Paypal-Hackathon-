
import test from 'node:test';
import assert from 'node:assert/strict';

import { createNegotiator } from '../src/negotiator.js';
import { createMockClient } from '../src/mockPaypal.js';
import { createStore } from '../src/store.js';

test('complete mock negotiation settles after buyer accepts an offer', async () => {
  const store = await createStore('');
  const pp = createMockClient();
  const events = [];

  const bus = {
    emit: (event, data) => events.push({ event, data }),
  };

  // Predictable agents make this test independent of an AI service.
  const agents = {
    async sellerPropose(req) {
      const amount = Math.min(
        req.limits.floor + (req.round - 1) * req.limits.step,
        req.limits.ceiling,
      );

      return {
        action: 'offer',
        offer_type: 'REFUND',
        amount,
        message: `We can offer a refund of ${amount} USD.`,
        source: 'rules',
      };
    },

    async buyerRespond(req) {
      const goal = req.dispute_amount * req.goal_pct / 100;

      return {
        action: req.offer_amount >= goal ? 'accept' : 'reject',
        message: req.offer_amount >= goal
          ? 'That works for me. Thank you.'
          : 'I would need a better offer.',
        source: 'rules',
      };
    },
  };

  const config = { mode: 'mock', maxRounds: 6 };
  const state = { kill: false };

  const negotiator = createNegotiator({
    store, pp, agents, bus, config, state,
  });

  // Create a $250 mock dispute.
  const created = pp.create(0);

  // Set the agreed scope and freelancer limits.
  const doc = await negotiator.ensureDoc(created.id);
  doc.scopeText = 'Logo design with three revisions';
  doc.limits = {
    floor_pct: 10,
    ceiling_pct: 50,
    step_pct: 10,
    allowed_types: ['REFUND'],
    auto_send: false,
  };
  await negotiator.save(doc, 'test_setup');

  // Run four rounds, approving each offer.
  const expectedOffers = [25, 50, 75, 100];

  for (const expectedAmount of expectedOffers) {
    const proposal = await negotiator.step(created.id);

    assert.equal(proposal.status, 'waiting_for_approval');
    assert.equal(proposal.doc.pending.amount, expectedAmount);

    const result = await negotiator.approve(created.id);
    assert.equal(result.status, 'sent');
  }

  // Confirm the buyer accepted and the dispute was resolved.
  const finalDoc = await store.get(created.id);

  assert.equal(finalDoc.dispute.resolved, true);
  assert.equal(finalDoc.dispute.outcome, 'MOCK_SETTLED_BY_OFFER');
  assert.equal(finalDoc.dispute.sellerOffer, 100);
  assert.equal(finalDoc.pending, null);

  const sellerRounds = finalDoc.rounds.filter(
    (round) => round.by === 'seller_agent' && round.sent,
  );

  const buyerRounds = finalDoc.rounds.filter(
    (round) => round.by === 'buyer',
  );

  assert.equal(sellerRounds.length, 4);
  assert.equal(buyerRounds.length, 4);
  assert.equal(buyerRounds.at(-1).decision, 'accept');
  assert.ok(events.length > 0);
});
