import { useState, type FormEvent } from 'react';
import {
  createMind,
  labelAppraisal,
  parseCharacter,
  type AppraisalState,
  type DriveKind,
  type Episode,
  type Mind,
} from '../../../packages/agent/src/index.js';

const character = parseCharacter({
  schemaVersion: 1,
  id: 'demo',
  name: 'Demo',
  systemPrompt: 'You are Demo, a local SYMindX mind. Keep replies to one short sentence.',
  provider: { type: 'echo', model: 'echo' },
  tools: ['word-count', 'clock'],
  memory: { recentMessages: 20 },
  emotion: { enabled: true, decay: 0.85 },
});

interface View {
  readonly mood: string;
  readonly appraisal: AppraisalState;
  readonly drive: DriveKind;
  readonly reason: string;
  readonly guidance: string;
  readonly episodes: readonly Episode[];
}

function boot(): Mind {
  const now = Date.now();
  const session = createMind(character, now);
  session.step(now);
  return session;
}

function read(session: Mind): View {
  const snap = session.snapshot();
  const step = snap.lastStep;
  return {
    mood: labelAppraisal(snap.appraisal),
    appraisal: snap.appraisal,
    drive: step?.drive.kind ?? 'rest',
    reason: step?.drive.reason ?? 'quiet',
    guidance: step?.voice.guidance ?? '',
    episodes: snap.episodes,
  };
}

export default function App() {
  const [mind] = useState(boot);
  const [view, setView] = useState(() => read(mind));
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text.length === 0) {
      setError('Enter a message.');
      return;
    }
    const now = Date.now();
    try {
      mind.hear({ channel: 'local', sender: 'user', text }, now);
      const turn = mind.step(now);
      const spoken = turn.drive.kind === 'reply' ? text : turn.drive.reason;
      mind.say(spoken, now);
      setDraft('');
      setError('');
      setView(read(mind));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The mind could not take this turn.';
      setError(message);
    }
  }

  return (
    <main className="shell">
      <header className="mast">
        <p className="eyebrow">SYMindX</p>
        <h1>{character.name}</h1>
        <p className="lede">
          This page runs the in-memory mind in your browser. A reply echoes your message. Nothing is sent to a model.
        </p>
      </header>

      <section className="state" aria-label="Mind state">
        <p>
          <span>Mood</span>
          {view.mood}
        </p>
        <p>
          <span>Drive</span>
          {view.drive}
        </p>
        <p>
          <span>Valence</span>
          {view.appraisal.valence.toFixed(2)}
        </p>
        <p>
          <span>Arousal</span>
          {view.appraisal.arousal.toFixed(2)}
        </p>
        <p>
          <span>Dominance</span>
          {view.appraisal.dominance.toFixed(2)}
        </p>
      </section>
      <p className="reason">{view.reason}</p>
      {view.guidance.length > 0 ? <p className="guidance">{view.guidance}</p> : null}

      <section className="thread" aria-labelledby="thread-title">
        <h2 id="thread-title">Conversation</h2>
        {view.episodes.length === 0 ? (
          <p className="empty">No episodes yet.</p>
        ) : (
          <ol>
            {view.episodes.map((episode) => (
              <li key={episode.id}>
                <span>{episode.source}</span>
                {episode.text}
              </li>
            ))}
          </ol>
        )}
        <form onSubmit={onSubmit}>
          <label htmlFor="message">Message</label>
          <div className="row">
            <input
              id="message"
              name="message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoComplete="off"
              maxLength={16000}
            />
            <button type="submit">Send</button>
          </div>
          {error.length > 0 ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
