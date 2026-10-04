import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  apiRequest,
  checkRuntime,
  decodeAgents,
  decodeHistory,
  decodeTurnMessage,
  type AgentSummary,
  type ConversationMessage,
} from './lib/operator-api';

const conversationPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function App() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [conversationId, setConversationId] = useState('default');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selected = agents.find((agent) => agent.id === selectedAgent);
  const validConversation = conversationPattern.test(conversationId);

  const requestEpoch = useRef(0);
  const requestControllers = useRef(new Set<AbortController>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestEpoch.current += 1;
      for (const controller of requestControllers.current) controller.abort();
      requestControllers.current.clear();
    };
  }, []);

  function cancelScopedRequests() {
    requestEpoch.current += 1;
    for (const controller of requestControllers.current) controller.abort();
    requestControllers.current.clear();
    setWorking(false);
  }

  function beginRequest() {
    const epoch = requestEpoch.current;
    const controller = new AbortController();
    requestControllers.current.add(controller);
    setWorking(true);
    return {
      controller,
      isCurrent: () => mounted.current && requestEpoch.current === epoch,
      finish: () => {
        requestControllers.current.delete(controller);
        if (mounted.current && requestEpoch.current === epoch) setWorking(false);
      },
    };
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = tokenInput.trim();
    if (
      new TextEncoder().encode(candidate).byteLength < 32 ||
      [...candidate].some((character) => character.trim() === '')
    ) {
      setError('Enter the runtime bearer token (at least 32 non-whitespace bytes).');
      return;
    }
    cancelScopedRequests();
    const request = beginRequest();
    setError('');
    setNotice('');
    try {
      await checkRuntime(request.controller.signal);
      const list = decodeAgents(
        await apiRequest(candidate, '/agents', {}, request.controller.signal),
      );
      if (!request.isCurrent()) return;
      setToken(candidate);
      setTokenInput('');
      setAgents(list);
      setSelectedAgent('');
      setMessages([]);
      setNotice('Connected to the local runtime. Choose an agent and load a conversation.');
    } catch (cause) {
      if (!request.isCurrent()) return;
      setToken(null);
      setAgents([]);
      setSelectedAgent('');
      setMessages([]);
      setError(cause instanceof Error ? cause.message : 'Could not connect to the runtime.');
    } finally {
      request.finish();
    }
  }

  function disconnect() {
    cancelScopedRequests();
    setToken(null);
    setTokenInput('');
    setAgents([]);
    setSelectedAgent('');
    setMessages([]);
    setDraft('');
    setError('');
    setNotice('Disconnected. The bearer token was cleared from this page.');
  }

  async function refreshAgents() {
    if (!token) return;
    const requestToken = token;
    const request = beginRequest();
    setError('');
    setNotice('');
    try {
      const list = decodeAgents(
        await apiRequest(requestToken, '/agents', {}, request.controller.signal),
      );
      if (!request.isCurrent()) return;
      setAgents(list);
      if (!list.some((agent) => agent.id === selectedAgent)) {
        setSelectedAgent('');
        setMessages([]);
      }
      setNotice('Loaded ' + list.length + ' agent' + (list.length === 1 ? '' : 's') + '.');
    } catch (cause) {
      if (!request.isCurrent()) return;
      setError(cause instanceof Error ? cause.message : 'Could not refresh agents.');
    } finally {
      request.finish();
    }
  }

  async function loadHistory() {
    if (!token || !selectedAgent || !validConversation) return;
    const requestToken = token;
    const requestAgent = selectedAgent;
    const requestConversation = conversationId;
    const request = beginRequest();
    setError('');
    setNotice('');
    try {
      const query = new URLSearchParams({ conversationId: requestConversation, limit: '100' });
      const history = decodeHistory(
        await apiRequest(
          requestToken,
          '/agents/' + encodeURIComponent(requestAgent) + '/history?' + query.toString(),
          {},
          request.controller.signal,
        ),
      );
      if (
        history.some(
          (message) =>
            message.agentId !== requestAgent || message.conversationId !== requestConversation,
        )
      ) {
        throw new Error('The API returned history outside the selected scope.');
      }
      if (!request.isCurrent()) return;
      setMessages(history);
      setNotice(
        'Loaded ' +
          history.length +
          ' messages for ' +
          requestAgent +
          '/' +
          requestConversation +
          '.',
      );
    } catch (cause) {
      if (!request.isCurrent()) return;
      setError(cause instanceof Error ? cause.message : 'Could not load conversation history.');
    } finally {
      request.finish();
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!token || !selectedAgent || !validConversation || !text || working) return;
    const requestToken = token;
    const requestAgent = selectedAgent;
    const requestConversation = conversationId;
    const request = beginRequest();
    setError('');
    setNotice('');
    try {
      const response = await apiRequest(
        requestToken,
        '/agents/' + encodeURIComponent(requestAgent) + '/chat',
        {
          method: 'POST',
          body: JSON.stringify({ text, conversationId: requestConversation }),
        },
        request.controller.signal,
      );
      const assistant = decodeTurnMessage(response, requestAgent, requestConversation);
      if (!request.isCurrent()) return;
      const userMessage: ConversationMessage = {
        id: 'local-' + crypto.randomUUID(),
        agentId: requestAgent,
        conversationId: requestConversation,
        role: 'user',
        content: text,
        createdAt: Date.now(),
      };
      setMessages((current) => [...current, userMessage, assistant]);
      setDraft('');
      setNotice('Turn completed and saved by the runtime.');
    } catch (cause) {
      if (!request.isCurrent()) return;
      setError(cause instanceof Error ? cause.message : 'The message could not be sent.');
    } finally {
      request.finish();
    }
  }

  function chooseAgent(agentId: string) {
    cancelScopedRequests();
    setSelectedAgent(agentId);
    setMessages([]);
    setError('');
    setNotice('Agent selected. Load its conversation when you are ready.');
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          S
        </div>
        <div className="brand-copy">
          <p className="eyebrow">SYMindX · v0.1</p>
          <h1>Local operator console</h1>
        </div>
        <div className="topbar-status">
          <span className={`status-dot ${token ? 'is-ready' : ''}`} aria-hidden="true" />
          <span>{token ? 'Runtime connected' : 'Not connected'}</span>
        </div>
      </header>

      <section className="connection-panel" aria-labelledby="connection-title">
        <div className="connection-copy">
          <p className="eyebrow">Private local session</p>
          <h2 id="connection-title">Connect to your runtime</h2>
          <p>
            The bearer token stays in this page’s memory and is cleared when you disconnect or
            reload. API calls use the same-origin development proxy.
          </p>
        </div>
        {token ? (
          <div className="connection-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={refreshAgents}
              disabled={working}
            >
              Refresh agents
            </button>
            <button className="button button-quiet" type="button" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <form className="connect-form" onSubmit={connect}>
            <label className="sr-only" htmlFor="api-token">
              Runtime bearer token
            </label>
            <input
              id="api-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste local runtime token"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              disabled={working}
            />
            <button className="button button-primary" type="submit" disabled={working}>
              {working ? 'Connecting…' : 'Connect'}
            </button>
            {working && (
              <button
                className="button button-quiet"
                type="button"
                onClick={() => {
                  cancelScopedRequests();
                  setNotice('Connection cancelled.');
                }}
              >
                Cancel connection
              </button>
            )}
          </form>
        )}
      </section>

      {(error || notice) && (
        <div
          className={`feedback ${error ? 'feedback-error' : ''}`}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
        </div>
      )}

      <div className="workspace-grid">
        <aside className="panel agent-panel" aria-labelledby="agents-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Runtime inventory</p>
              <h2 id="agents-title">
                Agents <span className="count-pill">{agents.length}</span>
              </h2>
            </div>
          </div>
          {!token ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                ⌁
              </span>
              <p>Connect to load agents.</p>
              <span>The list is requested only after you connect.</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                ○
              </span>
              <p>No agents are registered.</p>
              <span>Register a character with the runtime, then refresh this list.</span>
            </div>
          ) : (
            <ul className="agent-list">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <button
                    className={`agent-option ${agent.id === selectedAgent ? 'agent-option-selected' : ''}`}
                    type="button"
                    onClick={() => chooseAgent(agent.id)}
                    aria-pressed={agent.id === selectedAgent}
                  >
                    <span className="agent-option-top">
                      <span className="agent-name">{agent.name}</span>
                      <span
                        className={`agent-state ${agent.status === 'busy' ? 'state-busy' : ''}`}
                      >
                        {agent.status}
                      </span>
                    </span>
                    <span className="agent-meta">
                      {agent.id} · {agent.provider}
                    </span>
                    <span className="emotion-meter">
                      <span>Valence</span>
                      <strong>{agent.emotion.valence.toFixed(2)}</strong>
                      <span className="meter-track">
                        <span style={{ width: `${((agent.emotion.valence + 1) / 2) * 100}%` }} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="panel conversation-panel" aria-labelledby="conversation-title">
          <div className="conversation-heading">
            <div>
              <p className="eyebrow">Scoped history and chat</p>
              <h2 id="conversation-title">{selected?.name ?? 'Choose an agent'}</h2>
              <p className="muted-copy">
                {selected
                  ? `Conversation ${conversationId}`
                  : 'Select an agent to view its saved conversation.'}
              </p>
            </div>
            <form
              className="scope-form"
              onSubmit={(event) => {
                event.preventDefault();
                void loadHistory();
              }}
            >
              <label htmlFor="conversation-id">Conversation ID</label>
              <div className="scope-controls">
                <input
                  id="conversation-id"
                  value={conversationId}
                  maxLength={64}
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,63}"
                  onChange={(event) => {
                    cancelScopedRequests();
                    setConversationId(event.target.value);
                    setMessages([]);
                  }}
                />
                <button
                  className="button button-secondary"
                  type="submit"
                  disabled={!token || !selected || !validConversation || working}
                >
                  Load history
                </button>
              </div>
            </form>
          </div>

          <div className="message-list" aria-live="polite" aria-label="Conversation messages">
            {!selected ? (
              <div className="empty-state conversation-empty">
                <span className="empty-icon" aria-hidden="true">
                  ↳
                </span>
                <p>No agent selected.</p>
                <span>Choose one from the inventory, then load history or send a message.</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state conversation-empty">
                <span className="empty-icon" aria-hidden="true">
                  ◇
                </span>
                <p>No messages loaded.</p>
                <span>History loads only after you select “Load history.”</span>
              </div>
            ) : (
              messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <div className="message-label">
                    <span>
                      {message.role === 'tool'
                        ? `Tool result · ${message.toolCallId}`
                        : message.role}
                    </span>
                    <time dateTime={new Date(message.createdAt).toISOString()}>
                      {new Date(message.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p>{message.content}</p>
                </article>
              ))
            )}
          </div>

          <form className="composer" onSubmit={sendMessage}>
            <label htmlFor="message-input">Send a message</label>
            <textarea
              id="message-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={selected ? `Message ${selected.name}…` : 'Select an agent first'}
              maxLength={16_000}
              rows={3}
              disabled={!token || !selected || working}
            />
            <div className="composer-footer">
              <span>Messages are sent only when you press Send.</span>
              <button
                className="button button-primary"
                type="submit"
                disabled={!token || !selected || !draft.trim() || !validConversation || working}
              >
                {working ? 'Working…' : 'Send message'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <footer className="footer-note">
        <span>Local development console</span>
        <span>Runtime API is loopback-only; production static output has no API ingress.</span>
      </footer>
    </main>
  );
}

export default App;
