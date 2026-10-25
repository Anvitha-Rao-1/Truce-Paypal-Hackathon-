import { useState } from 'react';
import { Badge, EmptyState } from './ui';

const money = (n, c = 'USD') => (n == null ? '—' : `${Number(n).toFixed(2)} ${c}`);
const daysLeft = (iso) => (iso ? Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5)) : null);

// PayPal reason codes are SHOUTY_SNAKE_CASE — make them readable.
const niceReason = (r) =>
  r ? r.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Dispute';

// Work out the one status badge to show for a dispute.
function statusInfo(doc) {
  if (doc.dispute.resolved) return { tone: 'success', label: 'Settled' };
  if (doc.pending) return { tone: 'warning', label: 'Needs approval' };
  if (doc.dispute.status === 'WAITING_FOR_BUYER_RESPONSE') return { tone: 'info', label: 'Offer sent' };
  return { tone: 'neutral', label: 'Your turn' };
}

export default function DisputesList({ disputes, selected, onSelect, canMock, onCreateMock }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Keep only the disputes that match the search box AND the status filter.
  const shown = disputes.filter((doc) => {
    const d = doc.dispute;
    const haystack = `${doc.id} ${d.buyerName || ''} ${d.invoice || ''} ${d.reason || ''}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (filter === 'open' && d.resolved) return false;
    if (filter === 'awaiting' && !doc.pending) return false;
    if (filter === 'settled' && !d.resolved) return false;
    return true;
  });

  return (
    <div className="dlist">
      <div className="dlist__head">
        <h2 className="dlist__title">Disputes</h2>
        <span className="dlist__count">{disputes.length}</span>
      </div>

      <div className="dlist__tools">
        <input
          className="ui-input"
          type="search"
          placeholder="Search id, buyer, reason…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="ui-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="awaiting">Awaiting approval</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      {canMock && (
        <div className="dlist__mock">
          {[0, 1, 2].map((i) => (
            <button key={i} className="ui-btn ui-btn--ghost" onClick={onCreateMock(i)}>+ Mock {i + 1}</button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={disputes.length === 0 ? 'No disputes yet' : 'No matches'}
          message={disputes.length === 0 ? 'Create a mock dispute to start.' : 'Try a different search or filter.'}
        />
      ) : (
        <ul className="dlist__items">
          {shown.map((doc) => {
            const d = doc.dispute;
            const s = statusInfo(doc);
            const left = daysLeft(d.dueAt);
            return (
              <li key={doc.id}>
                <button
                  className={`dlist__item ${doc.id === selected ? 'is-active' : ''}`}
                  onClick={() => onSelect(doc.id)}
                >
                  <div className="dlist__row1">
                    <strong>{doc.id}</strong>
                    <span className="dlist__amt">{money(d.amount, d.currency)}</span>
                  </div>
                  <div className="dlist__row2">
                    <Badge tone={s.tone} dot>{s.label}</Badge>
                  </div>
                  <div className="dlist__reason">{niceReason(d.reason)}</div>
                  <div className="dlist__meta">
                    {d.buyerName ? `${d.buyerName} · ` : ''}
                    {d.resolved ? 'Resolved' : left != null ? `${left}d to respond` : '—'}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
