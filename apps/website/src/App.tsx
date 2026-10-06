import { useState, type FormEvent } from 'react';
import {
  labelAppraisal,
  type AppraisalState,
  type DriveKind,
  type Episode,
  type Fact,
  type Mind,
} from '../../../packages/agent/src/index.js';
import { ask, createDemoMind } from '../../cli/src/answer.js';
import { DEMO, queuedDemo, runDemo, type DemoRow } from '../../cli/src/demo.js';
import { EVALS, evalGroups, queuedRow, runEvals, type EvalGroup, type EvalRow } from '../../cli/src/evals.js';
import { OLLAMA_MODEL } from '../../cli/src/ollama.js';

const OLLAMA = '/ollama';

const GROUP_LABEL: Readonly<Record<EvalGroup, string>> = {
  instruction: 'Instruction',
  arithmetic: 'Arithmetic',
  tools: 'Tools',
  memory: 'Memory',
  session: 'Session',
};

interface View {
  readonly mood: string;
  readonly appraisal: AppraisalState;
  readonly drive: DriveKind;
  readonly reason: string;
  readonly intent: string;
  readonly regard: number;
  readonly trust: number;
  readonly guidance: string;
  readonly goal: string;
  readonly episodes: readonly Episode[];
  readonly facts: readonly Fact[];
}

function read(session: Mind): View {
  const snap = session.snapshot();
  const step = snap.lastStep;
  const belief = snap.beliefs.find((item) => item.agentId === 'user');
  return {
    mood: labelAppraisal(snap.appraisal),
    appraisal: snap.appraisal,
    drive: step?.drive.kind ?? 'rest',
    reason: step?.drive.reason ?? 'quiet',
    intent: step?.reaction.intent ?? 'defer',
    regard: belief?.regard ?? 0,
    trust: belief?.trust ?? 0.5,
    guidance: step?.voice.guidance ?? '',
    goal: snap.intention?.goal ?? '',
    episodes: snap.episodes,
    facts: session.facts(8),
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
  const [rows, setRows] = useState<readonly EvalRow[]>(() => EVALS.map(queuedRow));
  const [summary, setSummary] = useState('');
  const [demoRows, setDemoRows] = useState<readonly DemoRow[]>(() => DEMO.map(queuedDemo));
  const [demoSummary, setDemoSummary] = useState('');

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

  async function onDemo() {
    const session = createDemoMind(Date.now());
    session.step(Date.now());
    setMind(session);
    setView(read(session));
    setBusy(true);
    setError('');
    setDemoSummary('');
    const seen = new Map<string, DemoRow>();
    setDemoRows(DEMO.map(queuedDemo));
    try {
      const result = await runDemo(session, OLLAMA, AbortSignal.timeout(180_000), (row) => {
        seen.set(row.id, row);
        setDemoRows(DEMO.map((turn) => seen.get(turn.id) ?? queuedDemo(turn)));
        setView(read(session));
      });
      setDemoSummary(`${result.passed} passed, ${result.failed} failed`);
      setView(read(session));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The demo stopped.');
    } finally {
      setBusy(false);
    }
  }

  async function onEval() {
    setBusy(true);
    setError('');
    setSummary('');
    const seen = new Map<string, EvalRow>();
    setRows(EVALS.map(queuedRow));
    try {
      const result = await runEvals(OLLAMA, AbortSignal.timeout(300_000), (row) => {
        seen.set(row.id, row);
        setRows(EVALS.map((item) => seen.get(item.id) ?? queuedRow(item)));
        const done = [...seen.values()].filter((item) => item.status !== 'running').length;
        setSummary(`${done}/${EVALS.length}`);
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
    setDemoRows(DEMO.map(queuedDemo));
    setDemoSummary('');
  }

  return (
    <main className="shell">
      <header className="mast">
        <p className="eyebrow">SYMindX · {OLLAMA_MODEL} · thinking off</p>
        <h1>Demo</h1>
        <p className="lede">
          One local mind. Play demo walks a conversation through memory, a distractor, then clock, json-keys, and a correction. The eval suite runs each case on a fresh mind.
        </p>
      </header>
      <div className="layout">
        <section className="thread" aria-labelledby="thread-title">
          <h2 id="thread-title">Conversation</h2>
          <section className="state" aria-label="Mind state">
            <p><span>Mood</span>{view.mood}</p>
            <p><span>Drive</span>{view.drive}</p>
            <p><span>Intent</span>{view.intent}</p>
            <p><span>Regard</span>{view.regard.toFixed(2)}</p>
            <p><span>Trust</span>{view.trust.toFixed(2)}</p>
            <p><span>Valence</span>{view.appraisal.valence.toFixed(2)}</p>
            <p><span>Arousal</span>{view.appraisal.arousal.toFixed(2)}</p>
          </section>
          <p className="reason">{view.reason}</p>
          {view.goal.length > 0 ? <p className="reason">Goal · {view.goal}</p> : null}
          {view.guidance.length > 0 ? <p className="guidance">{view.guidance}</p> : null}
          <div className="row">
            <button type="button" onClick={onDemo} disabled={busy}>Play demo</button>
            {demoSummary.length > 0 ? <p className="reason">{demoSummary}</p> : null}
          </div>
          <ol className="beats">
            {demoRows.map((row) => (
              <li key={row.id} className={row.status}>
                <span>{row.status}</span>
                <strong>{row.id}</strong>
                <em>{row.status === 'queued' || (row.status === 'running' && row.ms === 0) ? '' : `${row.ms}ms`}</em>
                <p>{row.prompt}</p>
                {row.detail !== 'queued' && row.detail !== 'asking' ? <p>{row.detail}</p> : null}
              </li>
            ))}
          </ol>
          {view.episodes.length === 0 ? <p className="empty">No episodes yet.</p> : (
            <ol>
              {view.episodes.map((episode) => (
                <li key={episode.id}><span>{episode.source}</span>{episode.text}</li>
              ))}
            </ol>
          )}
          {view.facts.length > 0 ? (
            <ol className="facts">
              {view.facts.map((fact) => (
                <li key={fact.id}><span>{fact.kind}</span>{fact.summary}</li>
              ))}
            </ol>
          ) : null}
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
          <h2 id="eval-title">Eval suite</h2>
          <div className="row">
            <button type="button" onClick={onEval} disabled={busy}>Run {EVALS.length} evals</button>
            {summary.length > 0 ? <p className="reason">{summary}</p> : null}
          </div>
          {evalGroups().map((group) => (
            <section key={group} aria-labelledby={`group-${group}`}>
              <h3 id={`group-${group}`}>{GROUP_LABEL[group]}</h3>
              <ol className="evals" aria-live="polite">
                {rows.filter((row) => row.group === group).map((row) => (
                  <li key={row.id} className={row.status}>
                    <span>{row.status}</span>
                    <strong>{row.id}</strong>
                    <em>{row.status === 'queued' || (row.status === 'running' && row.ms === 0) ? '' : `${row.ms}ms`}</em>
                    <p>{row.prompt}</p>
                    {row.status === 'pass' || row.status === 'fail' ? <p>{row.detail}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
