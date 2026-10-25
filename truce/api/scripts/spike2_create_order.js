// Spike 2, step A. Creates a USD 25 payment to the seller with NO shipping (like a service).
// Open the printed link, log in as the SANDBOX PERSONAL (buyer) account, and approve.
import { seller, run, show } from './_client.js';

run(async () => {
  const sellerEmail = process.env.SELLER_EMAIL;
  if (!sellerEmail) throw new Error('Set SELLER_EMAIL in .env (the sandbox business account email)');
  const order = await seller.createOrder({
    intent: 'CAPTURE',
    purchase_units: [{
      description: 'Logo design, 3 revisions (Truce test)',
      invoice_id: `TRUCE-${Date.now()}`,
      amount: { currency_code: 'USD', value: '25.00' },
      payee: { email_address: sellerEmail },
    }],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: 'http://localhost:4000/paid',
          cancel_url: 'http://localhost:4000/cancelled',
        },
      },
    },
  });
  show('Order created', { id: order.id, status: order.status });
  const link = (order.links || []).find((l) => ['payer-action', 'approve'].includes(l.rel));
  console.log('\n1) Open this link and approve as the BUYER sandbox account:\n', link && link.href);
  console.log('\n2) Then run:  node scripts/spike2_capture.js', order.id);
});
