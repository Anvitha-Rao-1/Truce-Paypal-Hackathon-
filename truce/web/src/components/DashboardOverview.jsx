import { StatTile, Card, Badge, EmptyState } from './ui';

const money = (n, c = 'USD') => (n == null ? '—' : `${Number(n).toFixed(2)} ${c}`);
const sentOffers = (doc) => doc.rounds.filter((r) => r.by === 'seller_agent' && r.sent);

// Turn a dispute's rounds into flat activity events (newest first),
// tagged with a label and a badge tone for the recent-activity list.
function activityFrom(disputes) {
  const events = [];
  for (const doc of disputes) {
    for (const r of doc.rounds) {
      let label, tone = 'neutral';
      if (r.by === 'seller_agent' && r.sent) { label = `Offer sent · ${money(r.amount, doc.dispute.currency)}`; tone = 'info'; }
      else if (r.by === 'seller_agent' && r.held) { label = 'Agent held — waiting'; tone = 'neutral'; }
      else if (r.by === 'buyer' && r.decision === 'accept') { label = 'Buyer accepted'; tone = 'success'; }
      else if (r.by === 'buyer') { label = 'Buyer countered'; tone = 'warning'; }
      else if (r.by === 'guardrail' && r.blocked) { label = 'Guardrail blocked an offer'; tone = 'danger'; }
      else if (r.by === 'freelancer' && r.rejectedOffer) { label = 'You rejected an offer'; tone = 'neutral'; }
      else continue;
      events.push({ id: doc.id, at: r.at, label, tone });
    }
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
}

export default function DashboardOverview({ disputes, onSelect }) {
  const active = disputes.filter((d) => !d.dispute.resolved).length;
  const inProgress = disputes.filter((d) => !d.dispute.resolved && sentOffers(d).length > 0).length;
  const awaiting = disputes.filter((d) => d.pending).length;
  const settled = disputes.filter((d) => d.dispute.resolved).length;
  const events = activityFrom(disputes);

  return (
    <div className="dash">
      <h1 className="dash__title">Overview</h1>

      <div className="dash__stats">
        <StatTile label="Active disputes" value={active} hint="Not yet resolved" accent />
        <StatTile label="Negotiations in progress" value={inProgress} hint="At least one offer sent" />
        <StatTile label="Awaiting your approval" value={awaiting} hint="Offers you need to review" />
        <StatTile label="Settled" value={settled} hint="Resolved by an offer" />
      </div>

      <Card title="Recent activity" className="dash__recent">
        {events.length === 0 ? (
          <EmptyState icon="🗒️" title="Nothing yet" message="Run the agent on a dispute to see activity here." />
        ) : (
          <ul className="dash-act">
            {events.map((e, i) => (
              <li key={i} className="dash-act__row" onClick={() => onSelect(e.id)}>
                <Badge tone={e.tone} dot>{e.label}</Badge>
                <span className="dash-act__id">{e.id}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
