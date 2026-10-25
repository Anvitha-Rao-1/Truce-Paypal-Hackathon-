const money = (n, c = 'USD') => (n == null ? '—' : `${Number(n).toFixed(2)} ${c}`);

// A small bar chart of the offers sent so far, climbing toward the
// ceiling the freelancer set. Shows the pending offer as a tentative rung.
export default function OfferLadder({ doc }) {
  const d = doc.dispute;
  const cur = d.currency || 'USD';
  const ceiling = ((d.amount || 0) * (doc.limits.ceiling_pct || 0)) / 100;
  const offers = doc.rounds
    .filter((r) => r.by === 'seller_agent' && r.sent)
    .map((r, i) => ({ round: i + 1, amount: r.amount || 0 }));
  const pending = doc.pending ? { amount: doc.pending.amount } : null;

  if (offers.length === 0 && !pending) {
    return <p className="muted">No offers sent yet. Run the agent to make the first one.</p>;
  }

  // scale every bar against the biggest of ceiling / offers / pending
  const max = Math.max(ceiling, ...offers.map((o) => o.amount), pending ? pending.amount : 0) || 1;
  const width = (amt) => `${Math.min(100, (amt / max) * 100)}%`;

  return (
    <div className="dd-ladder">
      {offers.map((o) => (
        <div key={o.round} className="dd-rung">
          <div className="dd-rung__label">Round {o.round}</div>
          <div className="dd-rung__bar"><div className="dd-rung__fill" style={{ width: width(o.amount) }} /></div>
          <div className="dd-rung__amt">{money(o.amount, cur)}</div>
        </div>
      ))}
      {pending && (
        <div className="dd-rung dd-rung--pending">
          <div className="dd-rung__label">Pending</div>
          <div className="dd-rung__bar"><div className="dd-rung__fill" style={{ width: width(pending.amount) }} /></div>
          <div className="dd-rung__amt">{money(pending.amount, cur)}</div>
        </div>
      )}
      <div className="dd-ladder__ceiling">Your ceiling: {money(ceiling, cur)} ({doc.limits.ceiling_pct}%)</div>
    </div>
  );
}
