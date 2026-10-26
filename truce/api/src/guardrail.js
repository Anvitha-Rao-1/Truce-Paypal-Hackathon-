// The ONE place that decides if an offer may leave our system.
// It is a pure function (no network, no database) so it is easy to test.
// Everything an agent proposes goes through check() before any PayPal call.

const money = (x) => Math.round(Number(x) * 100) / 100;

export function resolveLimits(amount, limits) {
  return {
    floor: money((amount * limits.floor_pct) / 100),
    ceiling: money((amount * limits.ceiling_pct) / 100),
    step: money((amount * limits.step_pct) / 100),
    allowed_types: limits.allowed_types || ['REFUND'],
    auto_send: Boolean(limits.auto_send),
  };
}

// Every number written in a message, so we can catch a leaked ceiling.
function numbersIn(text) {
  const matches = String(text).match(/\d[\d,]*\d(?:\.\d+)?|\d(?:\.\d+)?/g) || [];

  return matches
    .filter((n) => /^\d+(\.\d+)?$/.test(n) || /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(n))
    .map((n) => money(n.replace(/,/g, '')));
}

/**
 * @param {object} p
 * @param {object} p.offer      { offer_type, amount, currency, message }
 * @param {object} p.limits     resolved limits (money, not percent)
 * @param {object} p.dispute    normalized dispute
 * @param {number} p.lastOffer  highest offer we already sent (0 if none)
 * @param {number} p.sentRounds offers already sent
 * @param {boolean} p.kill      kill switch
 * @param {number} p.maxRounds
 * @param {Date}  [p.now]
 * @returns {{ok: boolean, reasons: string[]}}
 */
export function check({ offer, limits, dispute, lastOffer = 0, sentRounds = 0, kill = false, maxRounds = 6, now = new Date() }) {
  const reasons = [];
  const amountIsNumber = typeof offer.amount === 'number';
  const amount = money(offer.amount);

  if (!amountIsNumber) reasons.push('Amount must be a number');

  if (kill) reasons.push('Kill switch is on');
  if (!Number.isFinite(amount) || amount <= 0) reasons.push('Amount must be a positive number');
  if (amount > limits.ceiling) reasons.push(`Amount ${amount} is above the ceiling`);
  if (amount > dispute.amount) reasons.push('Amount is more than the disputed amount');
  if (amount < lastOffer) reasons.push('Offer is lower than the previous offer');
  if (!limits.allowed_types.includes(offer.offer_type)) reasons.push(`Offer type ${offer.offer_type} is not allowed`);

  if (!offer.currency || !dispute.currency) {
    reasons.push('Offer and dispute currency are required');
  } else if (offer.currency !== dispute.currency) {
    reasons.push('Currency does not match the dispute');
  }

  if (dispute.stage !== 'INQUIRY') reasons.push(`Dispute is at stage ${dispute.stage}, offers only work at INQUIRY`);
  if (!dispute.canMakeOffer) reasons.push('PayPal is not offering a make-offer action on this dispute');
  if (dispute.resolved) reasons.push('Dispute is already resolved');
  if (sentRounds >= maxRounds) reasons.push('Maximum number of rounds reached');
  if (dispute.dueAt && new Date(dispute.dueAt) < now) reasons.push('Response deadline has passed');

  const message = offer.message || '';
  const numberTokens = message.match(/\d[\d,]*\d(?:\.\d+)?|\d(?:\.\d+)?/g) || [];
  const malformedNumber = numberTokens.some(
    (n) => n.includes(',') && !/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(n)
  );

  if (malformedNumber) {
    reasons.push('Message contains a malformed number');
  }
  // Leak check: the message may contain the offer amount, nothing else that looks like money.
  const allowed = new Set([amount]);
  for (const n of numbersIn(offer.message || '')) {
    if (!allowed.has(n) && (n === limits.ceiling || n === limits.floor)) {
      reasons.push('Message mentions a limit figure');
      break;
    }
  }
  if (/\b(ceiling|floor|budget|maximum i can|my limit)\b/i.test(offer.message || '')) {
    reasons.push('Message talks about internal limits');
  }

  return { ok: reasons.length === 0, reasons };
}
