import { MemoryDuration, MemoryType } from '../../types/agent.js';
import { v4 as uuidv4 } from 'uuid';
export class BaseMemoryProvider {
    config;
    metadata;
    embeddingModel;
    constructor(config, metadata) {
        this.config = config;
        this.metadata = metadata;
        this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    }
    async storeShortTerm(agentId, memory, ttlMinutes = 60) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
        const shortTermMemory = {
            ...memory,
            duration: MemoryDuration.SHORT_TERM,
            expiresAt
        };
        return this.store(agentId, shortTermMemory);
    }
    async storeLongTerm(agentId, memory) {
        const longTermMemory = {
            ...memory,
            duration: MemoryDuration.LONG_TERM
        };
        return this.store(agentId, longTermMemory);
    }
    async retrieveShortTerm(agentId, query, limit = 10) {
        const memories = await this.retrieve(agentId, query, limit);
        const now = new Date();
        return memories.filter(memory => memory.duration === 'short_term' &&
            (!memory.expiresAt || memory.expiresAt > now));
    }
    async retrieveLongTerm(agentId, query, limit = 10) {
        const memories = await this.retrieve(agentId, query, limit);
        return memories.filter(memory => memory.duration === 'long_term');
    }
    getMetadata() {
        return this.metadata;
    }
    async getRecent(limit = 10) {
        return this.retrieve('default', 'recent', limit);
    }
    generateId() {
        return uuidv4();
    }
    formatMemoryForStorage(memory) {
        return {
            ...memory,
            timestamp: memory.timestamp instanceof Date ? memory.timestamp.toISOString() : memory.timestamp,
            metadata: typeof memory.metadata === 'object' ? JSON.stringify(memory.metadata) : memory.metadata,
            tags: Array.isArray(memory.tags) ? JSON.stringify(memory.tags) : memory.tags
        };
    }
    parseMemoryFromStorage(row) {
        return {
            id: row.id || row.memory_id || '',
            agentId: row.agent_id,
            type: row.type ? MemoryType[row.type.toUpperCase()] || MemoryType.EXPERIENCE : MemoryType.EXPERIENCE,
            content: row.content,
            embedding: Array.isArray(row.embedding) ? row.embedding : undefined,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
            importance: row.importance || 0.5,
            timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (Array.isArray(row.tags) ? row.tags : []),
            duration: (row.duration || MemoryDuration.LONG_TERM),
            expiresAt: row.expires_at ? (row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at)) : undefined
        };
    }
}
//# sourceMappingURL=base-memory-provider.js.map