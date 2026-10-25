// Spike 5. Send a real offer from the seller side, then read the dispute again.
import { seller, run, show } from './_client.js';

run(async () => {
  const [id, amount = '5.00'] = process.argv.slice(2);
  if (!id) throw new Error('Usage: node scripts/spike5_offer.js <DISPUTE_ID> [AMOUNT]');
  const res = await seller.makeOffer(id, { amount, currency: 'USD', offer_type: 'REFUND', note: 'Truce test offer: partial refund to settle this quickly.' });
  show('make-offer response', res || 'OK (empty body)');
  const raw = await seller.getDispute(id);
  show('Dispute after offer', { status: raw.status, stage: raw.dispute_life_cycle_stage, offer: raw.offer, links: (raw.links || []).map((l) => l.rel) });
});
