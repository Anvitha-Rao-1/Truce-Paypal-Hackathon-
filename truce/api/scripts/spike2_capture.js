// Spike 2, step B. Captures the approved order so the money actually moves in the sandbox.
import { seller, run, show } from './_client.js';

run(async () => {
  const orderId = process.argv[2];
  if (!orderId) throw new Error('Usage: node scripts/spike2_capture.js <ORDER_ID>');
  const done = await seller.captureOrder(orderId);
  const cap = done.purchase_units[0].payments.captures[0];
  show('Captured', { status: done.status, capture_id: cap.id, amount: cap.amount });
  console.log('\nNext: log in to https://www.sandbox.paypal.com as the BUYER, open the payment in Activity,');
  console.log('choose "Report a problem" and write down EVERY option you are offered. Pick the one closest to');
  console.log('"item not as described". Then run: node scripts/spike3_list.js');
});
