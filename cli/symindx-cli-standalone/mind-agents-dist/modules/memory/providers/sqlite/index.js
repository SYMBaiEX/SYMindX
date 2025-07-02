import { MemoryType, MemoryDuration } from '../../../../types/agent.js';
import { BaseMemoryProvider } from '../../base-memory-provider.js';
export class SQLiteMemoryProvider extends BaseMemoryProvider {
    db;
    constructor(config) {
        const metadata = {
            id: 'sqlite',
            name: 'SQLite Memory Provider',
            description: 'A memory provider that stores memories in a local SQLite database',
            version: '1.0.0',
            author: 'SYMindX Team',
            supportsVectorSearch: true,
            isPersistent: true
        };
        super(config, metadata);
        const Database = require('better-sqlite3');
        this.db = new Database(config.dbPath);
        if (config.createTables !== false) {
            this.initializeDatabase();
        }
    }
    initializeDatabase() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        importance REAL NOT NULL DEFAULT 0.5,
        timestamp INTEGER NOT NULL,
        tags TEXT,
        duration TEXT NOT NULL DEFAULT 'long_term',
        expires_at TEXT
      )
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);
      CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at);
    `);
        console.log('✅ SQLite memory database initialized');
    }
    async store(agentId, memory) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, agent_id, type, content, embedding, metadata, importance, timestamp, tags, duration, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const embeddingBuffer = memory.embedding ? Buffer.from(new Float32Array(memory.embedding).buffer) : null;
        const metadataJson = JSON.stringify(memory.metadata);
        const tagsJson = JSON.stringify(memory.tags);
        stmt.run(memory.id, agentId, memory.type, memory.content, embeddingBuffer, metadataJson, memory.importance, memory.timestamp.getTime(), tagsJson, memory.duration || 'long_term', memory.expiresAt ? memory.expiresAt.getTime() : null);
        console.log(`💾 Stored ${memory.duration || 'long_term'} memory: ${memory.type} for agent ${agentId}`);
    }
    async retrieve(agentId, query, limit = 10) {
        let stmt;
        let params;
        const now = Date.now();
        const baseCondition = `agent_id = ? AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > ${now})`;
        if (query === 'recent') {
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE ${baseCondition} 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
            params = [agentId, limit];
        }
        else if (query === 'important') {
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE ${baseCondition} 
        ORDER BY importance DESC 
        LIMIT ?
      `);
            params = [agentId, limit];
        }
        else if (query === 'short_term') {
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE agent_id = ? AND duration = 'short_term' AND (expires_at IS NULL OR expires_at > ${now})
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
            params = [agentId, limit];
        }
        else if (query === 'long_term') {
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE agent_id = ? AND duration = 'long_term'
        ORDER BY importance DESC 
        LIMIT ?
      `);
            params = [agentId, limit];
        }
        else {
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE ${baseCondition} AND content LIKE ? 
        ORDER BY importance DESC, timestamp DESC 
        LIMIT ?
      `);
            params = [agentId, `%${query}%`, limit];
        }
        const rows = stmt.all(...params);
        return rows.map(row => this.rowToMemoryRecord(row));
    }
    async search(agentId, embedding, limit = 10) {
        console.warn('⚠️ Vector search not fully implemented for SQLite provider, falling back to recent memories');
        return this.retrieve(agentId, 'recent', limit);
    }
    async delete(agentId, memoryId) {
        const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ? AND id = ?
    `);
        const result = stmt.run(agentId, memoryId);
        if (result.changes === 0) {
            throw new Error(`Memory ${memoryId} not found for agent ${agentId}`);
        }
        console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
    }
    async clear(agentId) {
        const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ?
    `);
        const result = stmt.run(agentId);
        console.log(`🧹 Cleared ${result.changes} memories for agent ${agentId}`);
    }
    async getStats(agentId) {
        const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM memories 
      WHERE agent_id = ?
    `);
        const typeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM memories 
      WHERE agent_id = ? 
      GROUP BY type
    `);
        const totalResult = totalStmt.get(agentId);
        const total = totalResult?.count || 0;
        const typeRows = typeStmt.all(agentId);
        const byType = {};
        typeRows.forEach((row) => {
            byType[row.type] = row.count;
        });
        return { total, byType };
    }
    async cleanup(agentId, retentionDays) {
        const now = Date.now();
        const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000);
        const expiredStmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ? AND duration = 'short_term' AND expires_at IS NOT NULL AND expires_at < ?
    `);
        const expiredResult = expiredStmt.run(agentId, now);
        console.log(`🧹 Cleaned up ${expiredResult.changes} expired short-term memories for agent ${agentId}`);
        const oldStmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ? AND timestamp < ?
    `);
        const oldResult = oldStmt.run(agentId, cutoffTime);
        console.log(`🧹 Cleaned up ${oldResult.changes} old memories for agent ${agentId}`);
    }
    rowToMemoryRecord(row) {
        let embedding = undefined;
        if (row.embedding) {
            const buffer = row.embedding;
            const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
            embedding = Array.from(floatArray);
        }
        return {
            id: row.id,
            agentId: row.agent_id,
            type: row.type ? MemoryType[row.type.toUpperCase()] || MemoryType.EXPERIENCE : MemoryType.EXPERIENCE,
            content: row.content,
            embedding,
            metadata: JSON.parse(row.metadata || '{}'),
            importance: row.importance,
            timestamp: new Date(row.timestamp),
            tags: JSON.parse(row.tags || '[]'),
            duration: (row.duration && typeof row.duration === 'string') ? MemoryDuration[row.duration.toUpperCase()] || MemoryDuration.LONG_TERM : MemoryDuration.LONG_TERM,
            expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
        };
    }
}
export function createSQLiteMemoryProvider(config) {
    return new SQLiteMemoryProvider(config);
}
//# sourceMappingURL=index.js.map