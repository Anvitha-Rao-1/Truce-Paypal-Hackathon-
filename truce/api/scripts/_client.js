import { config } from '../src/config.js';
import { createPayPalClient } from '../src/paypal.js';

export const seller = createPayPalClient({ base: config.paypalBase, id: config.seller.id, secret: config.seller.secret });
export const buyer = config.buyer.id
  ? createPayPalClient({ base: config.paypalBase, id: config.buyer.id, secret: config.buyer.secret })
  : null;

export function show(title, obj) {
  console.log(`\n=== ${title} ===`);
  console.log(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
}

export async function run(fn) {
  try { await fn(); } catch (e) {
    console.error('\nFAILED:', e.message);
    if (e.body) console.error(JSON.stringify(e.body, null, 2));
    process.exit(1);
  }
}
