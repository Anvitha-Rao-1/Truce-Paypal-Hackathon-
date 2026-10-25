// Spike 6. Can the BUYER app accept the offer through the API?
// Needs PAYPAL_BUYER_CLIENT_ID/SECRET and the update-buyer scope. A 403 here is an expected, useful answer.
import { buyer, run, show } from './_client.js';

run(async () => {
  if (!buyer) throw new Error('No buyer app configured. Fill PAYPAL_BUYER_CLIENT_ID and PAYPAL_BUYER_CLIENT_SECRET.');
  const id = process.argv[2];
  if (!id) throw new Error('Usage: node scripts/spike6_accept_as_buyer.js <DISPUTE_ID>');
  const res = await buyer.acceptOffer(id, 'Accepting the offer, thanks.');
  show('accept-offer response', res || 'OK (empty body)');
});
