// A pretend PayPal that lives in memory. Same method names as paypal.js.
// Lets you build and demo the whole app on Day 1 with no PayPal account.
// If you use it in the final video, say so on screen.

const day = 24 * 60 * 60 * 1000;

const SCENARIOS = [
  { title: 'Logo design, 3 revisions', amount: 250, invoice: 'INV-0042', buyer: 'Dana Client', goal_pct: 40,
    complaint: 'The logo is not what I asked for. I wanted something more minimal.' },
  { title: 'Five-page website', amount: 600, invoice: 'INV-0051', buyer: 'Rohan Traders', goal_pct: 45,
    complaint: 'The site is missing the booking page we discussed.' },
  { title: 'Social media pack, 12 posts', amount: 120, invoice: 'INV-0063', buyer: 'Maya Bakes', goal_pct: 30,
    complaint: 'The posts do not match my brand colours.' },
];

export function createMockClient({ onLog = () => {} } = {}) {
  const disputes = new Map();
  let counter = 1000;

  const log = (method, path, status = 200, request = null) =>
    onLog({ at: new Date().toISOString(), method, path: `[mock] ${path}`, status, ms: 5, request });

  const links = (id, canOffer) =>
    canOffer ? [{ rel: 'make_offer', href: `/v1/customer/disputes/${id}/make-offer`, method: 'POST' }] : [];

  function create(index = 0) {
    const s = SCENARIOS[index % SCENARIOS.length];
    const id = `MOCK-${++counter}`;
    const now = Date.now();
    disputes.set(id, {
      _goal_pct: s.goal_pct,
      _title: s.title,
      dispute_id: id,
      reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
      status: 'WAITING_FOR_SELLER_RESPONSE',
      dispute_life_cycle_stage: 'INQUIRY',
      dispute_amount: { currency_code: 'USD', value: s.amount.toFixed(2) },
      create_time: new Date(now).toISOString(),
      update_time: new Date(now).toISOString(),
      seller_response_due_date: new Date(now + 10 * day).toISOString(),
      messages: [{ posted_by: 'BUYER', time_posted: new Date(now).toISOString(), content: s.complaint }],
      disputed_transactions: [{ seller_transaction_id: `TX-${counter}`, invoice_number: s.invoice, buyer: { name: s.buyer } }],
      links: links(id, true),
    });
    return { id, title: s.title, invoice: s.invoice, amount: s.amount };
  }

  const need = (id) => {
    const d = disputes.get(id);
    if (!d) throw Object.assign(new Error(`Mock dispute ${id} not found`), { status: 404 });
    return d;
  };
  const touch = (d) => { d.update_time = new Date().toISOString(); };

  return {
    mock: true,
    scenarios: SCENARIOS,
    create,
    async getToken() { return 'mock-token'; },
    async listDisputes() {
      log('GET', '/v1/customer/disputes');
      return { items: [...disputes.values()].map((d) => ({ dispute_id: d.dispute_id, status: d.status, update_time: d.update_time })) };
    },
    async getDispute(id) { log('GET', `/v1/customer/disputes/${id}`); return structuredClone(need(id)); },
    async sendMessage(id, message) {
      log('POST', `/v1/customer/disputes/${id}/send-message`, 200, { message });
      const d = need(id);
      d.messages.push({ posted_by: 'SELLER', time_posted: new Date().toISOString(), content: message });
      touch(d);
      return {};
    },
    async makeOffer(id, { amount, currency, offer_type, note }) {
      log('POST', `/v1/customer/disputes/${id}/make-offer`, 200, { amount, currency, offer_type, note });
      const d = need(id);
      if (d.dispute_life_cycle_stage !== 'INQUIRY' || d.status === 'RESOLVED') {
        throw Object.assign(new Error('Mock PayPal: offers only work at INQUIRY'), { status: 422 });
      }
      d.offer = { offer_type, seller_offered_amount: { currency_code: currency, value: Number(amount).toFixed(2) } };
      d.messages.push({ posted_by: 'SELLER', time_posted: new Date().toISOString(), content: note });
      d.status = 'WAITING_FOR_BUYER_RESPONSE';
      touch(d);
      return {};
    },
    // Used only in mock mode, by the negotiator, to play the buyer.
    buyerProfile(id) { const d = need(id); return { goal_pct: d._goal_pct }; },
    applyBuyerDecision(id, { action, message }) {
      log('POST', `[buyer] ${action}-offer ${id}`, 200, { message });
      const d = need(id);
      d.messages.push({ posted_by: 'BUYER', time_posted: new Date().toISOString(), content: message });
      if (action === 'accept') {
        d.status = 'RESOLVED';
        d.dispute_outcome = { outcome_code: 'MOCK_SETTLED_BY_OFFER' };
        d.links = [];
      } else {
        d.status = 'WAITING_FOR_SELLER_RESPONSE';
        d.dispute_life_cycle_stage = 'INQUIRY';
        d.links = links(id, true);
      }
      touch(d);
    },
  };
}
