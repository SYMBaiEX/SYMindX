import { useState, type FormEvent } from 'react';
import { labelAppraisal, type AppraisalState, type DriveKind, type Episode, type Mind } from '../../../packages/agent/src/index.js';
import { ask, createDemoMind } from '../../cli/src/answer.js';
import { EVALS, runEvals, type EvalRow } from '../../cli/src/evals.js';
import { OLLAMA_MODEL } from '../../cli/src/ollama.js';

const OLLAMA = '/ollama';

interface View {
  readonly mood: string;
  readonly appraisal: AppraisalState;
  readonly drive: DriveKind;
  readonly reason: string;
  readonly episodes: readonly Episode[];
}

function read(session: Mind): View {
  const snap = session.snapshot();
  const step = snap.lastStep;
  return {
    mood: labelAppraisal(snap.appraisal),
    appraisal: snap.appraisal,
    drive: step?.drive.kind ?? 'rest',
    reason: step?.drive.reason ?? 'quiet',
    episodes: snap.episodes,
  };
}

export default function App() {
  const [mind, setMind] = useState(() => {
    const session = createDemoMind(Date.now());
    session.step(Date.now());
    return session;
  });
  const [view, setView] = useState<View>(() => read(mind));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<readonly EvalRow[]>([]);
  const [summary, setSummary] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text.length === 0) {
      setError('Enter a message.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const answer = await ask(mind, OLLAMA, AbortSignal.timeout(60_000), text);
      setDraft('');
      setView(read(mind));
      if (answer.text.length === 0) {
        setError('The model returned no reply.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The mind could not take this turn.');
    } finally {
      setBusy(false);
    }
  }

  async function onEval() {
    setBusy(true);
    setError('');
    setSummary('');
    setRows(EVALS.map((item) => ({ id: item.id, status: 'running' as const, ms: 0, text: '', tools: [], detail: 'queued' })));
    const seen = new Map<string, EvalRow>();
    try {
      const result = await runEvals('/ollama', AbortSignal.timeout(180_000), (row) => {
        seen.set(row.id, row);
        setRows(EVALS.map((item) => seen.get(item.id) ?? { id: item.id, status: 'running', ms: 0, text: '', tools: [], detail: 'queued' }));
      });
      setSummary(`${result.passed} passed, ${result.failed} failed`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The eval run stopped.');
    } finally {
      setBusy(false);
    }
  }

  function onReset() {
    const session = createDemoMind(Date.now());
    session.step(Date.now());
    setMind(session);
    setView(read(session));
    setDraft('');
    setError('');
  }

  return (
    <main className="shell">
      <header className="mast">
        <p className="eyebrow">SYMindX · {OLLAMA_MODEL} · thinking off</p>
        <h1>Demo</h1>
        <p className="lede">Local Ollama on this machine. Each send steps the mind, then asks qwen3.5:9b with reasoning disabled.</p>
      </header>
      <div className="layout">
        <section className="thread" aria-labelledby="thread-title">
          <h2 id="thread-title">Conversation</h2>
          <section className="state" aria-label="Mind state">
            <p><span>Mood</span>{view.mood}</p>
            <p><span>Drive</span>{view.drive}</p>
            <p><span>Valence</span>{view.appraisal.valence.toFixed(2)}</p>
            <p><span>Arousal</span>{view.appraisal.arousal.toFixed(2)}</p>
          </section>
          <p className="reason">{view.reason}</p>
          {view.episodes.length === 0 ? <p className="empty">No episodes yet.</p> : (
            <ol>
              {view.episodes.map((episode) => (
                <li key={episode.id}><span>{episode.source}</span>{episode.text}</li>
              ))}
            </ol>
          )}
          <form onSubmit={onSubmit}>
            <label htmlFor="message">Message</label>
            <div className="row">
              <input id="message" name="message" value={draft} onChange={(event) => setDraft(event.target.value)} autoComplete="off" maxLength={16000} disabled={busy} />
              <button type="submit" disabled={busy}>Send</button>
              <button type="button" onClick={onReset} disabled={busy}>Reset</button>
            </div>
            {error.length > 0 ? <p className="error" role="alert">{error}</p> : null}
          </form>
        </section>
        <section className="thread" aria-labelledby="eval-title">
          <h2 id="eval-title">Live evals</h2>
          <div className="row">
            <button type="button" onClick={onEval} disabled={busy}>Run {EVALS.length} evals</button>
            {summary.length > 0 ? <p className="reason">{summary}</p> : null}
          </div>
          <ol className="evals" aria-live="polite">
            {rows.map((row) => (
              <li key={row.id} className={row.status}>
                <span>{row.status}</span>
                <strong>{row.id}</strong>
                <em>{row.status === 'running' && row.detail === 'queued' ? '' : `${row.ms}ms`}</em>
                <p>{row.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
