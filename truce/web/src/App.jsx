import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

const money = (n, c = 'USD') => (n == null ? '-' : `${Number(n).toFixed(2)} ${c}`);
const daysLeft = (iso) => (iso ? Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5)) : null);

export default function App() {
  const [health, setHealth] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, d, l] = await Promise.all([api.health(), api.disputes(), api.log()]);
      setHealth(h); setDisputes(d); setLog(l);
      setSelected((cur) => cur ?? (d[0] ? d[0].id : null));
      setError('');
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); return api.events(() => load()); }, [load]);

  const doc = disputes.find((d) => d.id === selected);
  const act = (fn) => async () => {
    setBusy(true);
    try { await fn(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="app">
      <header>
        <h1>Truce</h1>
        <span className={`pill ${health?.mode}`}>{health ? health.mode : '...'}</span>
        <span className="pill">{health?.agents?.llm ? 'AI agents' : 'rule agents'}</span>
        <button className={health?.kill ? 'danger on' : 'danger'} onClick={act(() => api.kill(!health?.kill))}>
          {health?.kill ? 'Kill switch ON (click to release)' : 'Kill switch'}
        </button>
      </header>
      {error && <div className="error">{error}</div>}
      <div className="layout">
        <aside>
          <h2>Disputes</h2>
          {health?.mode === 'mock' && (
            <div className="row">
              {[0, 1, 2].map((i) => <button key={i} onClick={act(async () => { const made = await api.mockDispute(i); setSelected(made.id); })}>+ Mock {i + 1}</button>)}
            </div>
          )}
          {disputes.length === 0 && <p className="muted">No disputes yet.</p>}
          {disputes.map((d) => (
            <div key={d.id} className={`item ${d.id === selected ? 'active' : ''}`} onClick={() => setSelected(d.id)}>
              <strong>{d.id}</strong>
              <span>{money(d.dispute.amount, d.dispute.currency)}</span>
              <span className="muted">{d.dispute.status}</span>
            </div>
          ))}
        </aside>
        <main>
          {doc ? <Detail key={doc.id} doc={doc} act={act} busy={busy} /> : <p className="muted">Pick or create a dispute.</p>}
        </main>
        <section className="logpanel">
          <h2>PayPal API log</h2>
          <div className="log">
            {[...log].reverse().map((l, i) => (
              <div key={i} className={`logline ${l.status >= 400 ? 'bad' : ''}`}>
                <code>{l.method} {l.path}</code> <b>{l.status}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Detail({ doc, act, busy }) {
  const d = doc.dispute;
  const [scope, setScope] = useState(doc.scopeText);
  const [lim, setLim] = useState(doc.limits);
  const left = daysLeft(d.dueAt);
  const amt = d.amount || 0;
  const pct = (p) => ((amt * p) / 100).toFixed(2);
  const save = act(() => api.settings(doc.id, { scopeText: scope, limits: lim }));

  return (
    <div>
      <h2>{doc.id} <small>{d.invoice}</small></h2>
      <div className="cards">
        <div className="card"><span>Disputed</span><b>{money(d.amount, d.currency)}</b></div>
        <div className="card"><span>Stage</span><b>{d.stage}</b></div>
        <div className="card"><span>Status</span><b>{d.status}</b></div>
        <div className={`card ${left !== null && left <= 3 ? 'warn' : ''}`}><span>Days to respond</span><b>{left ?? '-'}</b></div>
      </div>

      <h3>What was promised</h3>
      <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} placeholder="e.g. Logo design with 3 revisions, delivered 12 Oct" />

      <h3>Your limits</h3>
      <div className="limits">
        <label>Opening offer % <input type="number" value={lim.floor_pct} onChange={(e) => setLim({ ...lim, floor_pct: +e.target.value })} /> <em>{pct(lim.floor_pct)}</em></label>
        <label>Ceiling % <input type="number" value={lim.ceiling_pct} onChange={(e) => setLim({ ...lim, ceiling_pct: +e.target.value })} /> <em>{pct(lim.ceiling_pct)}</em></label>
        <label>Step % <input type="number" value={lim.step_pct} onChange={(e) => setLim({ ...lim, step_pct: +e.target.value })} /> <em>{pct(lim.step_pct)}</em></label>
        <label className="check"><input type="checkbox" checked={lim.auto_send} onChange={(e) => setLim({ ...lim, auto_send: e.target.checked })} /> Send without asking me</label>
      </div>
      <button onClick={save} disabled={busy}>Save</button>

      <h3>Negotiation</h3>
      <div className="row">
        <button className="primary" disabled={busy || d.resolved} onClick={act(() => api.step(doc.id))}>Run agent</button>
      </div>

      {doc.pending && (
        <div className="pending">
          <b>Offer waiting for you: {money(doc.pending.amount, doc.pending.currency)}</b>
          <p>{doc.pending.message}</p>
          <small>Guardrail: {doc.pending.verdict?.ok ? 'passed' : 'failed'} · written by {doc.pending.source}</small>
          <div className="row">
            <button className="primary" disabled={busy} onClick={act(() => api.approve(doc.id))}>Approve and send</button>
            <button disabled={busy} onClick={act(() => api.reject(doc.id))}>Reject</button>
          </div>
        </div>
      )}

      {d.resolved && <div className="done">Settled. Outcome: {d.outcome}</div>}

      <ol className="timeline">
        {d.messages.map((m, i) => <li key={`m${i}`} className={m.by?.toLowerCase()}><b>{m.by}</b> {m.text}</li>)}
        {doc.rounds.filter((r) => r.blocked).map((r, i) => (
          <li key={`b${i}`} className="blocked"><b>GUARDRAIL BLOCKED</b> {money(r.amount)}: {r.reasons.join('; ')}</li>
        ))}
      </ol>
    </div>
  );
}
