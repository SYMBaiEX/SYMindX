import Database from 'better-sqlite3';
export class SQLiteMemoryProvider {
    constructor(dbPath, embeddingModel = 'text-embedding-ada-002') {
        this.db = new Database(dbPath);
        this.embeddingModel = embeddingModel;
        this.initializeDatabase();
    }
    initializeDatabase() {
        // Create memories table
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
        tags TEXT
      )
    `);
        // Create indexes for better performance
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    `);
        console.log('✅ SQLite memory database initialized');
    }
    async store(agentId, memory) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, agent_id, type, content, embedding, metadata, importance, timestamp, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const embeddingBuffer = memory.embedding ? Buffer.from(new Float32Array(memory.embedding).buffer) : null;
        const metadataJson = JSON.stringify(memory.metadata);
        const tagsJson = JSON.stringify(memory.tags);
        stmt.run(memory.id, agentId, memory.type, memory.content, embeddingBuffer, metadataJson, memory.importance, memory.timestamp.getTime(), tagsJson);
        console.log(`💾 Stored memory: ${memory.type} for agent ${agentId}`);
    }
    async retrieve(agentId, query, limit = 10) {
        let stmt;
        let params;
        if (query === 'recent') {
            // Get most recent memories
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE agent_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
            params = [agentId, limit];
        }
        else if (query === 'important') {
            // Get most important memories
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE agent_id = ? 
        ORDER BY importance DESC 
        LIMIT ?
      `);
            params = [agentId, limit];
        }
        else {
            // Text search in content
            stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE agent_id = ? AND content LIKE ? 
        ORDER BY importance DESC, timestamp DESC 
        LIMIT ?
      `);
            params = [agentId, `%${query}%`, limit];
        }
        const rows = stmt.all(...params);
        return rows.map(row => this.rowToMemoryRecord(row));
    }
    async search(agentId, embedding, limit = 10) {
        // For SQLite, we'll fall back to text-based search since vector similarity is complex
        // In a production system, you'd want to use a proper vector database or SQLite with vector extensions
        console.warn('⚠️ Vector search not implemented for SQLite, falling back to recent memories');
        return this.retrieve(agentId, 'recent', limit);
    }
    async delete(agentId, memoryId) {
        const stmt = this.db.prepare('DELETE FROM memories WHERE agent_id = ? AND id = ?');
        const result = stmt.run(agentId, memoryId);
        if (result.changes === 0) {
            throw new Error(`Memory ${memoryId} not found for agent ${agentId}`);
        }
        console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
    }
    async clear(agentId) {
        const stmt = this.db.prepare('DELETE FROM memories WHERE agent_id = ?');
        const result = stmt.run(agentId);
        console.log(`🧹 Cleared ${result.changes} memories for agent ${agentId}`);
    }
    rowToMemoryRecord(row) {
        let embedding;
        if (row.embedding) {
            const buffer = Buffer.from(row.embedding);
            embedding = Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4));
        }
        return {
            id: row.id,
            agentId: row.agent_id,
            type: row.type,
            content: row.content,
            embedding,
            metadata: JSON.parse(row.metadata || '{}'),
            importance: row.importance,
            timestamp: new Date(row.timestamp),
            tags: JSON.parse(row.tags || '[]')
        };
    }
    close() {
        this.db.close();
        console.log('🔒 SQLite memory database closed');
    }
    // Utility methods
    getStats(agentId) {
        const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM memories WHERE agent_id = ?');
        const total = totalStmt.get(agentId);
        const typeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM memories 
      WHERE agent_id = ? 
      GROUP BY type
    `);
        const typeRows = typeStmt.all(agentId);
        const byType = {};
        typeRows.forEach(row => {
            byType[row.type] = row.count;
        });
        return {
            total: total.count,
            byType
        };
    }
    cleanup(agentId, retentionDays) {
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ? AND timestamp < ? AND importance < 0.7
    `);
        const result = stmt.run(agentId, cutoffTime);
        console.log(`🧹 Cleaned up ${result.changes} old memories for agent ${agentId}`);
    }
}
