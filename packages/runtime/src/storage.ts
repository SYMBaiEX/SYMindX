import { Database } from 'bun:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AgentState, Character, Message, ToolAudit } from './types.js';
import { SYMindXError } from './errors.js';
import { parseCharacter } from './characters.js';
import { decodeAgentState, decodeMessage, decodeToolAudit } from './validation.js';

const SCHEMA_VERSION = 1;
const APPLICATION_ID = 0x53594d58;
const MAX_QUERY_LIMIT = 1_000;
type StoredMessage = {
  id: string;
  agent_id: string;
  conversation_id: string;
  role: Message['role'];
  content: string;
  created_at: number;
  tool_call_id: string | null;
  tool_calls: string | null;
};
type StoredAudit = {
  id: string;
  agent_id: string;
  conversation_id: string;
  name: string;
  status: ToolAudit['status'];
  created_at: number;
  finished_at: number | null;
};

/** Durable, per-agent SQLite storage for the standalone runtime. */
export class SqliteStore {
  private readonly db: Database;
  private closed = false;

  constructor(dbPath: string) {
    if (!dbPath || dbPath === ':memory:')
      throw new Error('A file-backed database path is required');
    const filePath = resolve(dbPath);
    mkdirSync(dirname(filePath), { recursive: true });
    let db: Database | undefined;
    try {
      db = new Database(filePath, { create: true });
      this.inspectDatabase(db);
      if (process.platform !== 'win32') chmodSync(filePath, 0o600);
      db.exec(
        'PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;',
      );
      this.migrate(db);
      this.db = db;
    } catch (error) {
      try {
        db?.close();
      } catch {
        /* Preserve initialization error. */
      }
      throw error;
    }
  }

  upsertCharacter(character: Character): void {
    this.assertOpen();
    character = parseCharacter(character);
    this.db
      .prepare(
        `INSERT INTO characters(id, snapshot) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot`,
      )
      .run(character.id, JSON.stringify(character));
  }
  getCharacter(id: string): Character | undefined {
    this.assertOpen();
    const row = this.db.prepare('SELECT snapshot FROM characters WHERE id = ?').get(id) as {
      snapshot: string;
    } | null;
    return row ? parseCharacter(this.parseSnapshot(row.snapshot, 'character')) : undefined;
  }
  listCharacters(): Character[] {
    this.assertOpen();
    return (
      this.db.prepare('SELECT snapshot FROM characters ORDER BY id').all() as { snapshot: string }[]
    ).map(({ snapshot }) => parseCharacter(this.parseSnapshot(snapshot, 'character')));
  }
  getAgentState(id: string): AgentState | undefined {
    this.assertOpen();
    const row = this.db.prepare('SELECT snapshot FROM agent_states WHERE agent_id = ?').get(id) as {
      snapshot: string;
    } | null;
    if (!row) return undefined;
    return decodeAgentState(this.parseSnapshot(row.snapshot, 'agent state'));
  }
  getRecentMessages(agentId: string, conversationId: string, limit: number): Message[] {
    this.assertOpen();
    this.assertLimit(limit);
    const rows = this.db
      .prepare(
        `SELECT id, agent_id, conversation_id, role, content, created_at, tool_call_id, tool_calls
      FROM messages WHERE agent_id = ? AND conversation_id = ? ORDER BY seq DESC LIMIT ?`,
      )
      .all(agentId, conversationId, limit) as StoredMessage[];
    return rows.reverse().map((row) => {
      const decodedCalls =
        row.tool_calls === null
          ? undefined
          : this.parseSnapshot(row.tool_calls, 'message tool calls');
      return decodeMessage({
        id: row.id,
        agentId: row.agent_id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        ...(row.tool_call_id === null ? {} : { toolCallId: row.tool_call_id }),
        ...(decodedCalls === undefined ? {} : { toolCalls: decodedCalls }),
      });
    });
  }

  /** Atomically appends a complete turn and persists its resulting agent state. */
  commitTurn(input: {
    agentId: string;
    conversationId: string;
    messages: Message[];
    state: AgentState;
    expectedUpdatedAt?: number;
  }): void {
    this.assertOpen();
    this.validateScope(input.agentId, input.conversationId);
    if (!Array.isArray(input.messages) || input.messages.length > MAX_QUERY_LIMIT)
      throw new SYMindXError('VALIDATION', 'Turn must contain at most 1000 messages');
    this.validateState(input.state);
    if (input.expectedUpdatedAt !== undefined && !Number.isSafeInteger(input.expectedUpdatedAt))
      throw new SYMindXError('VALIDATION', 'Expected state timestamp must be a safe integer');
    for (const message of input.messages)
      this.validateMessage(message, input.agentId, input.conversationId);
    const insertConversation = this.db
      .prepare(`INSERT INTO conversations(agent_id, id) VALUES (?, ?)
      ON CONFLICT(agent_id, id) DO NOTHING`);
    const getCurrentUpdatedAt = this.db.prepare(
      'SELECT snapshot FROM agent_states WHERE agent_id = ?',
    );
    const insertMessage = this.db.prepare(`INSERT INTO messages
      (id, agent_id, conversation_id, role, content, created_at, tool_call_id, tool_calls) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const saveState = this.db.prepare(`INSERT INTO agent_states(agent_id, snapshot) VALUES (?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET snapshot = excluded.snapshot`);
    this.db
      .transaction(() => {
        const current = getCurrentUpdatedAt.get(input.agentId) as { snapshot: string } | null;
        const currentState = current
          ? decodeAgentState(this.parseSnapshot(current.snapshot, 'agent state'))
          : undefined;
        const currentUpdatedAt = currentState?.updatedAt ?? 0;
        if (input.expectedUpdatedAt !== undefined && input.expectedUpdatedAt !== currentUpdatedAt)
          throw new SYMindXError('CONFLICT', 'Agent state changed; retry the message');
        const nextState =
          input.state.updatedAt <= currentUpdatedAt
            ? { ...input.state, updatedAt: Math.max(Date.now(), currentUpdatedAt + 1) }
            : input.state;
        if (!Number.isSafeInteger(nextState.updatedAt))
          throw new SYMindXError('CONFLICT', 'Agent state timestamp cannot advance safely');
        insertConversation.run(input.agentId, input.conversationId);
        for (const message of input.messages) {
          if (message.agentId !== input.agentId || message.conversationId !== input.conversationId)
            throw new SYMindXError(
              'CONFLICT',
              'Turn message agent and conversation do not match the commit scope',
            );
          insertMessage.run(
            message.id,
            message.agentId,
            message.conversationId,
            message.role,
            message.content,
            message.createdAt,
            message.role === 'tool' ? message.toolCallId : null,
            message.role === 'assistant' && message.toolCalls
              ? JSON.stringify(message.toolCalls)
              : null,
          );
        }
        saveState.run(input.agentId, JSON.stringify(nextState));
      })
      .immediate();
  }

  /** Writes audit state without storing tool arguments or results. */
  recordToolAudit(audit: ToolAudit): void {
    this.assertOpen();
    audit = decodeToolAudit(audit);
    this.validateScope(audit.agentId, audit.conversationId);
    if (
      !audit.id ||
      !audit.name ||
      !['started', 'completed', 'denied', 'failed'].includes(audit.status) ||
      !Number.isSafeInteger(audit.createdAt) ||
      (audit.finishedAt !== undefined && !Number.isSafeInteger(audit.finishedAt))
    )
      throw new SYMindXError('VALIDATION', 'Tool audit fields are invalid');
    const transaction = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO conversations(agent_id, id) VALUES (?, ?)
        ON CONFLICT(agent_id, id) DO NOTHING`,
        )
        .run(audit.agentId, audit.conversationId);
      const result = this.db
        .prepare(
          `INSERT INTO tool_audit(id, agent_id, conversation_id, name, status, created_at, finished_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status, finished_at = excluded.finished_at
        WHERE tool_audit.agent_id = excluded.agent_id AND tool_audit.conversation_id = excluded.conversation_id
          AND tool_audit.name = excluded.name`,
        )
        .run(
          audit.id,
          audit.agentId,
          audit.conversationId,
          audit.name,
          audit.status,
          audit.createdAt,
          audit.finishedAt ?? null,
        );
      if (result.changes !== 1)
        throw new SYMindXError('CONFLICT', 'Tool audit ID is already used for a different scope');
    });
    transaction.immediate();
  }
  listToolAudit(agentId: string, conversationId: string, limit = 100): ToolAudit[] {
    this.assertOpen();
    this.assertLimit(limit);
    const rows = this.db
      .prepare(
        `SELECT id, agent_id, conversation_id, name, status, created_at, finished_at
      FROM tool_audit WHERE agent_id = ? AND conversation_id = ? ORDER BY seq DESC LIMIT ?`,
      )
      .all(agentId, conversationId, limit) as StoredAudit[];
    return rows.reverse().map((row) =>
      decodeToolAudit({
        id: row.id,
        agentId: row.agent_id,
        conversationId: row.conversation_id,
        name: row.name,
        status: row.status,
        createdAt: row.created_at,
        ...(row.finished_at === null ? {} : { finishedAt: row.finished_at }),
      }),
    );
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }
  private inspectDatabase(db: Database): void {
    let current: number;
    let applicationId: number;
    let objects: { name: string }[];
    try {
      current = Number(
        (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
      );
      applicationId = Number(
        (db.prepare('PRAGMA application_id').get() as { application_id: number }).application_id,
      );
      objects = db
        .prepare("SELECT name FROM sqlite_master WHERE substr(name, 1, 7) <> 'sqlite_'")
        .all() as { name: string }[];
    } catch (cause) {
      throw new SYMindXError(
        'CONFIGURATION',
        'Database file is not a valid SYMindX runtime database',
        { cause },
      );
    }
    if (!Number.isSafeInteger(current) || current < 0 || current > SCHEMA_VERSION)
      throw new SYMindXError('CONFIGURATION', `Unsupported SQLite schema version ${current}`);
    if (
      !Number.isSafeInteger(applicationId) ||
      (applicationId !== 0 && applicationId !== APPLICATION_ID)
    )
      throw new SYMindXError('CONFIGURATION', 'Database belongs to a different application');
    if (current === SCHEMA_VERSION && applicationId !== APPLICATION_ID)
      throw new SYMindXError(
        'CONFIGURATION',
        'Database schema is missing the SYMindX application identifier',
      );
    if (current === 0 && objects.length > 0)
      throw new SYMindXError(
        'CONFIGURATION',
        'Refusing to initialize a non-empty unowned SQLite database',
      );
  }

  private migrate(db: Database): void {
    db.transaction(() => {
      this.inspectDatabase(db);
      const current = Number(
        (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
      );
      if (current === SCHEMA_VERSION) return;
      db.exec(`CREATE TABLE characters (id TEXT PRIMARY KEY NOT NULL, snapshot TEXT NOT NULL);
      CREATE TABLE conversations (
        agent_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE, id TEXT NOT NULL, PRIMARY KEY(agent_id, id)
      ) WITHOUT ROWID;
      CREATE TABLE messages (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, agent_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user','assistant','tool')), content TEXT NOT NULL, created_at INTEGER NOT NULL,
        tool_call_id TEXT, tool_calls TEXT,
        FOREIGN KEY(agent_id, conversation_id) REFERENCES conversations(agent_id, id) ON DELETE CASCADE
      );
      CREATE INDEX messages_scope_seq ON messages(agent_id, conversation_id, seq DESC);
      CREATE TABLE agent_states (agent_id TEXT PRIMARY KEY NOT NULL REFERENCES characters(id) ON DELETE CASCADE, snapshot TEXT NOT NULL) WITHOUT ROWID;
      CREATE TABLE tool_audit (
        seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, agent_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
        name TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('started','completed','denied','failed')),
        created_at INTEGER NOT NULL, finished_at INTEGER,
        FOREIGN KEY(agent_id, conversation_id) REFERENCES conversations(agent_id, id) ON DELETE CASCADE
      );
      CREATE INDEX tool_audit_scope_seq ON tool_audit(agent_id, conversation_id, seq DESC);
      PRAGMA application_id = ${APPLICATION_ID};
      PRAGMA user_version = ${SCHEMA_VERSION};`);
    }).immediate();
  }
  private parseSnapshot(snapshot: string, description: string): unknown {
    try {
      return JSON.parse(snapshot) as unknown;
    } catch (cause) {
      throw new SYMindXError('CONFIGURATION', `Corrupt stored ${description}`, { cause });
    }
  }
  private validateScope(agentId: string, conversationId: string): void {
    if (
      typeof agentId !== 'string' ||
      agentId.length === 0 ||
      typeof conversationId !== 'string' ||
      conversationId.length === 0
    )
      throw new SYMindXError('VALIDATION', 'Agent and conversation IDs must be non-empty strings');
  }
  private validateState(state: AgentState): void {
    decodeAgentState(state);
  }
  private validateMessage(message: Message, agentId: string, conversationId: string): void {
    const decoded = decodeMessage(message);
    this.validateScope(decoded.agentId, decoded.conversationId);
    if (decoded.agentId !== agentId || decoded.conversationId !== conversationId)
      throw new SYMindXError(
        'CONFLICT',
        'Turn message agent and conversation do not match the commit scope',
      );
  }
  private assertOpen(): void {
    if (this.closed) throw new SYMindXError('CONFLICT', 'SQLite store is closed');
  }
  private assertLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT)
      throw new RangeError(`limit must be an integer between 1 and ${MAX_QUERY_LIMIT}`);
  }
}
