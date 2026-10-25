import { Badge, Button } from '../components/ui';

// The top bar: Truce wordmark on the left, status + controls on the right.
// `health` is the backend status object; `onToggleKill` flips the kill switch;
// `busy` disables the button while a request is in flight.
export default function AppHeader({ health, onToggleKill, busy }) {
  const mode = health?.mode;
  const killOn = health?.kill;

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">⚖︎</span>
          <div>
            <div className="app-header__name">Truce</div>
            <div className="app-header__tag">AI dispute resolution</div>
          </div>
        </div>

        <div className="app-header__status">
          {mode
            ? <Badge tone={mode === 'sandbox' ? 'info' : 'neutral'} dot>{mode}</Badge>
            : <Badge tone="neutral">…</Badge>}
          <Badge tone="neutral">{health?.agents?.llm ? 'AI agents' : 'rule agents'}</Badge>
          {health?.offline && <Badge tone="warning">Demo data</Badge>}

          <Button
            variant={killOn ? 'danger-solid' : 'danger'}
            onClick={onToggleKill}
            disabled={busy}
          >
            {killOn ? 'Kill switch ON — release' : 'Kill switch'}
          </Button>
        </div>
      </div>
    </header>
  );
}
