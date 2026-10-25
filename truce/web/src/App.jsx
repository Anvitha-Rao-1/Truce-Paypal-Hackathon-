import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import AppHeader from './shell/AppHeader.jsx';
import DashboardOverview from './components/DashboardOverview.jsx';
import DisputesList from './components/DisputesList.jsx';
import DisputeDetail from './components/DisputeDetail.jsx';
import ApiLogPanel from './components/ApiLogPanel.jsx';
import { Banner, Spinner, EmptyState } from './components/ui';

export default function App() {
  const [health, setHealth] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');        // transient success message
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);      // false until first load finishes
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, d, l] = await Promise.all([api.health(), api.disputes(), api.log()]);
      setHealth(h); setDisputes(d); setLog(l);
      setSelected((cur) => cur ?? (d[0] ? d[0].id : null));
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { load(); return api.events(() => load()); }, [load]);

  // auto-clear a success notice after a few seconds
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const doc = disputes.find((d) => d.id === selected);

  // act(fn, success): run an action, reload data, show a success toast,
  // surface any error, and toggle the global busy flag.
  const act = (fn, success) => async () => {
    setBusy(true);
    try { await fn(); await load(); if (success) setNotice(success); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const createMock = (i) => act(async () => { const made = await api.mockDispute(i); setSelected(made.id); });

  return (
    <div className="app">
      <AppHeader health={health} busy={busy} onToggleKill={act(() => api.kill(!health?.kill))} />
      <div className="app-body container">
        {notice && <Banner tone="success" onClose={() => setNotice('')}>{notice}</Banner>}
        {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
        {health?.offline && !offlineDismissed && (
          <Banner tone="offline" onClose={() => setOfflineDismissed(true)}>
            Running on <b>demo data</b> — the backend isn’t connected, so changes aren’t saved.
          </Banner>
        )}

        {!loaded ? (
          <div className="app-loading"><Spinner large /><p className="muted">Connecting…</p></div>
        ) : (
          <>
            {disputes.length > 0 && <DashboardOverview disputes={disputes} onSelect={setSelected} />}
            <div className="layout">
              <aside>
                <DisputesList
                  disputes={disputes}
                  selected={selected}
                  onSelect={setSelected}
                  canMock={health?.mode === 'mock'}
                  onCreateMock={createMock}
                />
              </aside>
              <main>
                {doc
                  ? <DisputeDetail key={doc.id} doc={doc} act={act} busy={busy} />
                  : <EmptyState icon="⚖︎" title="No dispute selected" message="Pick a dispute from the list, or create a mock one." />}
              </main>
              <section className="logpanel">
                <ApiLogPanel log={log} />
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
