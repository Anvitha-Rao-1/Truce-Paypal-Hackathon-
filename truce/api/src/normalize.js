// Turns PayPal's dispute JSON into the small shape the rest of our code uses.
// Field names come from PayPal's Disputes API docs. Spike 3 and 6 confirm them on real data.

const num = (v) => (v === undefined || v === null ? null : Number(v));

export function normalize(d) {
  const links = d.links || [];
  const tx = (d.disputed_transactions && d.disputed_transactions[0]) || {};
  const messages = (d.messages || []).map((m) => ({
    by: m.posted_by,
    at: m.time_posted,
    text: m.content,
  }));
  return {
    id: d.dispute_id,
    status: d.status,
    stage: d.dispute_life_cycle_stage,
    reason: d.reason,
    amount: num(d.dispute_amount && d.dispute_amount.value),
    currency: d.dispute_amount && d.dispute_amount.currency_code,
    createdAt: d.create_time,
    updatedAt: d.update_time,
    dueAt: d.seller_response_due_date || null,
    messages,
    buyerMessages: messages.filter((m) => m.by === 'BUYER').map((m) => m.text),
    sellerOffer: num(d.offer && d.offer.seller_offered_amount && d.offer.seller_offered_amount.value),
    buyerRequested: num(d.offer && d.offer.buyer_requested_amount && d.offer.buyer_requested_amount.value),
    offerType: d.offer && d.offer.offer_type,
    canMakeOffer: links.some((l) => /make[_-]offer/i.test(l.rel || '')),
    resolved: d.status === 'RESOLVED',
    outcome: d.dispute_outcome && d.dispute_outcome.outcome_code,
    invoice: tx.invoice_number || null,
    buyerName: (tx.buyer && tx.buyer.name) || null,
  };
}
