// A big-number tile for the dashboard overview.
// `label` on top, `value` large, optional `hint` below.
// `accent` colours the number blue instead of navy.
export default function StatTile({ label, value, hint, accent = false }) {
  return (
    <div className={`ui-stat ${accent ? 'ui-stat--accent' : ''}`}>
      <div className="ui-stat__label">{label}</div>
      <div className="ui-stat__value">{value}</div>
      {hint && <div className="ui-stat__hint">{hint}</div>}
    </div>
  );
}
