// Spike 1. Do our apps get a token, and which scopes does it carry?
// Look for ".../disputes/read-seller", ".../disputes/update-seller" and ".../disputes/update-buyer".
import { seller, buyer, run, show } from './_client.js';
import { config } from '../src/config.js';

run(async () => {
  const res = await fetch(`${config.paypalBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${config.seller.id}:${config.seller.secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const json = await res.json();
  show('Seller app token response (status ' + res.status + ')', { scope: (json.scope || '').split(' '), app_id: json.app_id, expires_in: json.expires_in });
  const scopes = json.scope || '';
  console.log('\nHas disputes read-seller   :', /disputes\/read-seller/.test(scopes));
  console.log('Has disputes update-seller :', /disputes\/update-seller/.test(scopes));
  console.log('Has disputes update-buyer  :', /disputes\/update-buyer/.test(scopes));
  console.log('Has disputes/create        :', /disputes\/create/.test(scopes));
  if (buyer) { await buyer.getToken(); console.log('\nBuyer app token OK'); }
});
