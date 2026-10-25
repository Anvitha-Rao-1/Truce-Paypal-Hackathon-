import { EmptyState } from './ui';

// The right-hand panel: a live feed of PayPal (or mock) API calls.
// Newest first; failed calls (status >= 400) show in red.
export default function ApiLogPanel({ log }) {
  return (
    <div className="alog">
      <div className="alog__head">
        <h2 className="alog__title">PayPal API log</h2>
        <span className="alog__count">{log.length}</span>
      </div>

      {log.length === 0 ? (
        <EmptyState icon="📡" title="No calls yet" message="API calls show up here as the agent works." />
      ) : (
        <ul className="alog__list">
          {[...log].reverse().map((l, i) => {
            const bad = l.status >= 400;
            return (
              <li key={i} className="alog__row">
                <span className={`alog__method alog__method--${(l.method || '').toLowerCase()}`}>{l.method}</span>
                <span className="alog__path" title={l.path}>{l.path}</span>
                <span className={`alog__status ${bad ? 'is-bad' : 'is-ok'}`}>{l.status}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
