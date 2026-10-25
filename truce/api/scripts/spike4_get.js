// Spike 4. The key test: is the dispute at INQUIRY and does PayPal give us a make-offer link?
import { seller, run, show } from './_client.js';
import { normalize } from '../src/normalize.js';

run(async () => {
  const id = process.argv[2];
  if (!id) throw new Error('Usage: node scripts/spike4_get.js <DISPUTE_ID>');
  const raw = await seller.getDispute(id);
  show('Normalized', normalize(raw));
  show('Link relations PayPal returned', (raw.links || []).map((l) => `${l.rel}  ${l.method}`));
  show('Raw offer block (may be empty)', raw.offer || 'none');
  const n = normalize(raw);
  console.log(`\nSTAGE = ${n.stage}   canMakeOffer = ${n.canMakeOffer}`);
  console.log(n.stage === 'INQUIRY' && n.canMakeOffer ? 'GO: Truce can negotiate this dispute.' : 'NO-GO for this case: write down what you see and tell me. Do not guess.');
});
