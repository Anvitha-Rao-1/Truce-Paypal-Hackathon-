// PayPal has no webhook for offers or messages, so we check the list on a timer.
import { normalize } from './normalize.js';
import { newDoc } from './store.js';

export function startPoller({ pp, store, bus, seconds, onError }) {
  async function tick() {
    try {
      const list = await pp.listDisputes('page_size=20');
      for (const item of list.items || []) {
        const existing = await store.get(item.dispute_id);
        const changed = !existing || existing.dispute.status !== item.status || existing.dispute.updatedAt !== item.update_time;
        if (!changed) continue;
        const dispute = normalize(await pp.getDispute(item.dispute_id));
        const doc = existing || newDoc(dispute);
        doc.dispute = dispute;
        await store.save(doc);
        bus.emit('change', { id: doc.id, type: existing ? 'polled_update' : 'new_dispute' });
      }
    } catch (e) {
      onError(e);
    }
  }
  tick();
  return setInterval(tick, seconds * 1000);
}
