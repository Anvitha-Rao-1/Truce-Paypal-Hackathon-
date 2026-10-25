// Spike 3. Does the seller app see the dispute? What stage is it at?
import { seller, run, show } from './_client.js';

run(async () => {
  const list = await seller.listDisputes('page_size=20');
  const items = (list.items || []).map((d) => ({ id: d.dispute_id, status: d.status, reason: d.reason, state: d.dispute_state, amount: d.dispute_amount }));
  show(`Disputes the seller can see (${items.length})`, items);
  if (!items.length) console.log('\nNone yet. Disputes can take a minute to appear. If still empty after 5 minutes, note it down: that is a finding.');
});
