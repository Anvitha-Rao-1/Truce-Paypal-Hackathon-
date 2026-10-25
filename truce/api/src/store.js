// Saves one document per dispute. Memory by default, MongoDB when MONGODB_URI is set.
import { MongoClient } from 'mongodb';

export async function createStore(mongoUri) {
  if (!mongoUri) {
    const map = new Map();
    return {
      kind: 'memory',
      async get(id) { return map.has(id) ? structuredClone(map.get(id)) : null; },
      async save(doc) { map.set(doc.id, structuredClone(doc)); return doc; },
      async list() { return [...map.values()].map((d) => structuredClone(d)); },
    };
  }
  const client = new MongoClient(mongoUri);
  await client.connect();
  const col = client.db('truce').collection('disputes');
  return {
    kind: 'mongodb',
    async get(id) { const d = await col.findOne({ _id: id }); if (!d) return null; const { _id, ...rest } = d; return rest; },
    async save(doc) { await col.replaceOne({ _id: doc.id }, { _id: doc.id, ...doc }, { upsert: true }); return doc; },
    async list() { return (await col.find({}).sort({ createdAt: -1 }).toArray()).map(({ _id, ...rest }) => rest); },
  };
}

export const defaultLimits = () => ({
  floor_pct: 10,     // first offer, as % of the disputed amount
  ceiling_pct: 50,   // the most we will ever refund
  step_pct: 10,      // added each round
  allowed_types: ['REFUND'],
  auto_send: false,  // false = freelancer approves every offer
});

export function newDoc(dispute) {
  return {
    id: dispute.id,
    createdAt: new Date().toISOString(),
    scopeText: '',
    limits: defaultLimits(),
    dispute,
    rounds: [],     // everything that happened, newest last
    pending: null,  // an offer waiting for approval
  };
}
