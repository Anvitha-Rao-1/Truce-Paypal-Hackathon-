import test from 'node:test';
import assert from 'node:assert/strict';
import { check, resolveLimits } from '../src/guardrail.js';

const dispute = { amount: 250, currency: 'USD', stage: 'INQUIRY', canMakeOffer: true, resolved: false, dueAt: new Date(Date.now() + 5 * 864e5).toISOString() };
const limits = resolveLimits(250, { floor_pct: 10, ceiling_pct: 50, step_pct: 10, allowed_types: ['REFUND'] }); // 25 / 125 / 25
const good = { offer_type: 'REFUND', amount: 50, currency: 'USD', message: 'We can refund 50.00 USD today.' };
const run = (over = {}, ctx = {}) => check({ offer: { ...good, ...over }, limits, dispute, ...ctx });

test('a normal offer passes', () => assert.equal(run().ok, true));
test('blocks an amount above the ceiling', () => assert.equal(run({ amount: 126 }).ok, false));
test('allows exactly the ceiling', () => assert.equal(run({ amount: 125, message: 'Refund of 125 USD.' }).ok, true));
test('blocks zero and negative amounts', () => { assert.equal(run({ amount: 0 }).ok, false); assert.equal(run({ amount: -5 }).ok, false); });
test('blocks an offer lower than the last one', () => assert.equal(run({}, { lastOffer: 75 }).ok, false));
test('blocks a disallowed offer type', () => assert.equal(run({ offer_type: 'REFUND_WITH_RETURN' }).ok, false));
test('blocks the wrong currency', () => assert.equal(run({ currency: 'INR' }).ok, false));
test('blocks when the stage is not INQUIRY', () => assert.equal(check({ offer: good, limits, dispute: { ...dispute, stage: 'CHARGEBACK' } }).ok, false));
test('blocks when PayPal offers no make-offer link', () => assert.equal(check({ offer: good, limits, dispute: { ...dispute, canMakeOffer: false } }).ok, false));
test('blocks a resolved dispute', () => assert.equal(check({ offer: good, limits, dispute: { ...dispute, resolved: true } }).ok, false));
test('blocks after the deadline', () => assert.equal(check({ offer: good, limits, dispute: { ...dispute, dueAt: new Date(Date.now() - 1000).toISOString() } }).ok, false));
test('blocks after max rounds', () => assert.equal(run({}, { sentRounds: 6 }).ok, false));
test('kill switch blocks everything', () => assert.equal(run({}, { kill: true }).ok, false));
test('leak: message that reveals the ceiling is blocked', () => assert.equal(run({ message: 'My top is 125 so offer 50.' }).ok, false));
test('leak: talking about a budget is blocked', () => assert.equal(run({ message: 'That is my maximum I can do.' }).ok, false));
test('amount above disputed amount is blocked', () => assert.equal(run({ amount: 300 }, {}).ok, false));

test('blocks an amount written as a string instead of a number', () => assert.equal(run({ amount: '999' }).ok, false));
test('blocks when the offer currency is lowercase and mismatched', () => assert.equal(run({ currency: 'usd' }).ok, false));
test('leak: message that names the ceiling in words is blocked', () => assert.equal(run({ message: 'My ceiling is 125, but I will offer 50.' }).ok, false));

test('rejects a numeric string even when its value is within the ceiling', () => {
  assert.equal(run({ amount: '50' }).ok, false);
});

test('blocks an offer with missing currency', () => assert.equal(run({ currency: undefined }).ok, false));

test('blocks the ceiling when written with a thousands separator', () => {
  const largeLimits = resolveLimits(2500, {
    floor_pct: 10,
    ceiling_pct: 50,
    step_pct: 10,
    allowed_types: ['REFUND'],
  });

  const largeDispute = { ...dispute, amount: 2500 };

  const result = check({
    offer: {
      ...good,
      amount: 500,
      message: 'I can discuss 1,250, and offer 500.',
    },
    limits: largeLimits,
    dispute: largeDispute,
  });

  assert.equal(result.ok, false);
});
test('blocks malformed comma-separated money figures', () => {
  const largeLimits = resolveLimits(2500, {
    floor_pct: 10,
    ceiling_pct: 50,
    step_pct: 10,
    allowed_types: ['REFUND'],
  });

  const result = check({
    offer: {
      ...good,
      amount: 500,
      message: 'I can discuss 1,25, and offer 500.',
    },
    limits: largeLimits,
    dispute: { ...dispute, amount: 2500 },
  });
  assert.equal(result.ok, false);
});
test('allows a valid thousands-separated number below the ceiling', () => {
  const largeLimits = resolveLimits(5000, {
    floor_pct: 10,
    ceiling_pct: 50,
    step_pct: 10,
    allowed_types: ['REFUND'],
  });

  const result = check({
    offer: {
      ...good,
      amount: 500,
      message: 'The amount discussed is 1,250, and my offer is 500.',
    },
    limits: largeLimits,
    dispute: { ...dispute, amount: 5000 },
  });

  assert.equal(result.ok, true);
});
test('blocks multiple malformed comma groups', () => {
  const result = run({
    message: 'I can discuss 1,25,0 and offer 50.',
  });

  assert.equal(result.ok, false);
});
