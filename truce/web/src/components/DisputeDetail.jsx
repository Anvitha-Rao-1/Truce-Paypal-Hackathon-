import { useState } from 'react';
import { api } from '../api.js';
import { Badge, Button, Field } from './ui';
import OfferLadder from './OfferLadder.jsx';

const money = (n, c = 'USD') => (n == null ? '—' : `${Number(n).toFixed(2)} ${c}`);
const daysLeft = (iso) => (iso ? Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5)) : null);
const nice = (s) => (s ? s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—');

function statusInfo(doc) {
  if (doc.dispute.resolved) return { tone: 'success', label: 'Settled' };
  if (doc.pending) return { tone: 'warning', label: 'Needs approval' };
  if (doc.dispute.status === 'WAITING_FOR_BUYER_RESPONSE') return { tone: 'info', label: 'Offer sent' };
  return { tone: 'neutral', label: 'Your turn' };
}

// Build one chronological list mixing messages and guardrail blocks.
function timeline(doc) {
  const items = [
    ...doc.dispute.messages.map((m) => ({ kind: 'msg', at: m.at, by: m.by, text: m.text })),
    ...doc.rounds.filter((r) => r.blocked).map((r) => ({ kind: 'blocked', at: r.at, amount: r.amount, reasons: r.reasons })),
  ];
  return items.sort((a, b) => ((a.at || '') < (b.at || '') ? -1 : 1));
}

export default function DisputeDetail({ doc, act, busy }) {
  const d = doc.dispute;
  const cur = d.currency || 'USD';
  const [scope, setScope] = useState(doc.scopeText);
  const [lim, setLim] = useState(doc.limits);
  const [running, setRunning] = useState(''); // which button is working, for its spinner

  const left = daysLeft(d.dueAt);
  const amt = d.amount || 0;
  const pctMoney = (p) => money((amt * p) / 100, cur);
  const s = statusInfo(doc);
  const hasScope = (doc.scopeText || '').trim().length > 0;

  // run(label, fn, success): runs an action, spins only this button,
  // disables all via busy, and shows `success` as a toast when done.
  const run = (label, fn, success) => async () => {
    setRunning(label);
    try { await act(fn, success)(); } finally { setRunning(''); }
  };

  return (
    <div className="dd">
      <div className="dd-head">
        <div>
          <h2 className="dd-head__id">{doc.id}</h2>
          <div className="dd-head__sub">
            {d.invoice ? `Invoice ${d.invoice}` : 'No invoice'}{d.buyerName ? ` · ${d.buyerName}` : ''}
          </div>
        </div>
        <Badge tone={s.tone} dot>{s.label}</Badge>
      </div>

      <div className="dd-cards">
        <div className="dd-card"><span className="dd-card__k">Disputed</span><b className="dd-card__v">{money(d.amount, cur)}</b></div>
        <div className="dd-card"><span className="dd-card__k">Stage</span><b className="dd-card__v dd-card__v--sm">{nice(d.stage)}</b></div>
        <div className="dd-card"><span className="dd-card__k">Status</span><b className="dd-card__v dd-card__v--sm">{nice(d.status)}</b></div>
        <div className={`dd-card ${left != null && left <= 3 && !d.resolved ? 'dd-card--warn' : ''}`}>
          <span className="dd-card__k">Days to respond</span>
          <b className="dd-card__v">{d.resolved ? '—' : left ?? '—'}</b>
        </div>
      </div>

      <section className="dd-section">
        <h3>What was promised</h3>
        <textarea
          className="ui-textarea"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          rows={2}
          placeholder="e.g. Logo design with 3 revisions, delivered 12 Oct"
        />
      </section>

      <section className="dd-section">
        <h3>Your refund limits</h3>
        <div className="dd-limits">
          <Field label="Opening offer %" hint={`= ${pctMoney(lim.floor_pct)}`}>
            <input className="ui-input" type="number" value={lim.floor_pct}
              onChange={(e) => setLim({ ...lim, floor_pct: +e.target.value })} />
          </Field>
          <Field label="Ceiling %" hint={`= ${pctMoney(lim.ceiling_pct)}`}>
            <input className="ui-input" type="number" value={lim.ceiling_pct}
              onChange={(e) => setLim({ ...lim, ceiling_pct: +e.target.value })} />
          </Field>
          <Field label="Step % each round" hint={`= ${pctMoney(lim.step_pct)}`}>
            <input className="ui-input" type="number" value={lim.step_pct}
              onChange={(e) => setLim({ ...lim, step_pct: +e.target.value })} />
          </Field>
        </div>
        <label className="ui-check dd-autosend">
          <input type="checkbox" checked={lim.auto_send}
            onChange={(e) => setLim({ ...lim, auto_send: e.target.checked })} />
          Send offers without asking me first
        </label>
        <div>
          <Button variant="secondary" loading={running === 'save'} disabled={busy}
            onClick={run('save', () => api.settings(doc.id, { scopeText: scope, limits: lim }), 'Saved')}>
            Save
          </Button>
        </div>
      </section>

      <section className="dd-section">
        <h3>Negotiation</h3>
        <Button loading={running === 'step'} disabled={busy || d.resolved || !hasScope}
          onClick={run('step', () => api.step(doc.id))}>
          Run agent
        </Button>
        {!hasScope && !d.resolved && (
          <p className="dd-hint muted">Add what was promised and press Save before running the agent.</p>
        )}
      </section>

      {doc.pending && (
        <div className="dd-pending">
          <div className="dd-pending__head">
            <span className="dd-pending__title">Offer waiting for your approval</span>
            <Badge tone={doc.pending.verdict?.ok ? 'success' : 'danger'}>
              {doc.pending.verdict?.ok ? 'Guardrail passed' : 'Guardrail failed'}
            </Badge>
          </div>
          <div className="dd-pending__amt">{money(doc.pending.amount, doc.pending.currency)}</div>
          <p className="dd-pending__msg">“{doc.pending.message}”</p>
          <div className="dd-pending__meta">Written by {doc.pending.source}</div>
          <div className="dd-pending__actions">
            <Button loading={running === 'approve'} disabled={busy}
              onClick={run('approve', () => api.approve(doc.id), 'Offer sent to the buyer')}>Approve and send</Button>
            <Button variant="ghost" disabled={busy}
              onClick={run('reject', () => api.reject(doc.id), 'Offer rejected')}>Reject</Button>
          </div>
        </div>
      )}

      {d.resolved && (
        <div className="dd-done">✓ Settled — outcome: {nice(d.outcome)}</div>
      )}

      <section className="dd-section">
        <h3>Offer ladder</h3>
        <OfferLadder doc={doc} />
      </section>

      <section className="dd-section">
        <h3>Conversation</h3>
        <div className="dd-timeline">
          {timeline(doc).map((e, i) =>
            e.kind === 'blocked' ? (
              <div key={i} className="dd-note">Guardrail blocked {money(e.amount, cur)}: {e.reasons?.join('; ')}</div>
            ) : (
              <div key={i} className={`dd-msg ${e.by === 'SELLER' ? 'dd-msg--seller' : 'dd-msg--buyer'}`}>
                <span className="dd-msg__who">{e.by === 'SELLER' ? 'You (seller)' : 'Buyer'}</span>
                {e.text}
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
