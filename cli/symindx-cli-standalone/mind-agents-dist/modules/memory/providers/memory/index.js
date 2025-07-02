import { MemoryDuration } from '../../../../types/agent.js';
import { BaseMemoryProvider } from '../../base-memory-provider.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
export class InMemoryProvider extends BaseMemoryProvider {
    storage = {};
    autoSaveTimer;
    cleanupTimer;
    constructor(config = {}) {
        const metadata = {
            id: 'memory',
            name: 'In-Memory Provider',
            description: 'A fast in-memory provider with vector search and optional persistence',
            version: '1.0.0',
            author: 'SYMindX Team',
            supportsVectorSearch: true,
            isPersistent: config.enablePersistence || false
        };
        super(config, metadata);
        this.config = {
            maxMemoriesPerAgent: 10000,
            enablePersistence: false,
            persistencePath: './data/memories.json',
            autoSaveInterval: 30000,
            enableAutoCleanup: true,
            cleanupInterval: 300000,
            ...config
        };
        this.initialize();
    }
    initialize() {
        if (this.config.enablePersistence) {
            this.loadFromDisk();
            if (this.config.autoSaveInterval) {
                this.autoSaveTimer = setInterval(() => {
                    this.saveToDisk();
                }, this.config.autoSaveInterval);
            }
        }
        if (this.config.enableAutoCleanup && this.config.cleanupInterval) {
            this.cleanupTimer = setInterval(() => {
                this.performAutoCleanup();
            }, this.config.cleanupInterval);
        }
        console.log('✅ In-memory memory provider initialized');
    }
    async store(agentId, memory) {
        if (!this.storage[agentId]) {
            this.storage[agentId] = {
                memories: new Map(),
                lastAccessed: Date.now()
            };
        }
        const agentStorage = this.storage[agentId];
        if (agentStorage.memories.size >= (this.config.maxMemoriesPerAgent || 10000)) {
            await this.evictOldMemories(agentId);
        }
        agentStorage.memories.set(memory.id, { ...memory });
        agentStorage.lastAccessed = Date.now();
        console.log(`💾 Stored ${memory.duration || 'long_term'} memory: ${memory.type} for agent ${agentId}`);
    }
    async retrieve(agentId, query, limit = 10) {
        const agentStorage = this.storage[agentId];
        if (!agentStorage) {
            return [];
        }
        agentStorage.lastAccessed = Date.now();
        const memories = Array.from(agentStorage.memories.values());
        const validMemories = memories.filter(memory => {
            if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
                return memory.expiresAt.getTime() > Date.now();
            }
            return true;
        });
        let results;
        if (query === 'recent') {
            results = validMemories
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, limit);
        }
        else if (query === 'important') {
            results = validMemories
                .sort((a, b) => b.importance - a.importance)
                .slice(0, limit);
        }
        else if (query === 'short_term') {
            results = validMemories
                .filter(m => m.duration === MemoryDuration.SHORT_TERM)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, limit);
        }
        else if (query === 'long_term') {
            results = validMemories
                .filter(m => m.duration === MemoryDuration.LONG_TERM)
                .sort((a, b) => b.importance - a.importance)
                .slice(0, limit);
        }
        else {
            const searchResults = validMemories
                .map(memory => ({
                memory,
                score: this.calculateTextSimilarity(query.toLowerCase(), memory.content.toLowerCase())
            }))
                .filter(result => result.score > 0)
                .sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance)
                .slice(0, limit);
            results = searchResults.map(result => result.memory);
        }
        return results.map(memory => ({ ...memory }));
    }
    async search(agentId, embedding, limit = 10) {
        const agentStorage = this.storage[agentId];
        if (!agentStorage) {
            return [];
        }
        agentStorage.lastAccessed = Date.now();
        const memories = Array.from(agentStorage.memories.values());
        const embeddedMemories = memories.filter(memory => {
            if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
                if (memory.expiresAt.getTime() <= Date.now())
                    return false;
            }
            return memory.embedding && memory.embedding.length > 0;
        });
        if (embeddedMemories.length === 0) {
            console.warn('⚠️ No memories with embeddings found, falling back to recent memories');
            return this.retrieve(agentId, 'recent', limit);
        }
        const similarities = embeddedMemories.map(memory => ({
            memory,
            similarity: this.calculateCosineSimilarity(embedding, memory.embedding)
        }));
        const results = similarities
            .filter(result => result.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(result => ({ ...result.memory }));
        return results;
    }
    async delete(agentId, memoryId) {
        const agentStorage = this.storage[agentId];
        if (!agentStorage) {
            throw new Error(`Agent ${agentId} not found`);
        }
        if (!agentStorage.memories.has(memoryId)) {
            throw new Error(`Memory ${memoryId} not found for agent ${agentId}`);
        }
        agentStorage.memories.delete(memoryId);
        agentStorage.lastAccessed = Date.now();
        console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
    }
    async clear(agentId) {
        const agentStorage = this.storage[agentId];
        if (!agentStorage) {
            return;
        }
        const count = agentStorage.memories.size;
        agentStorage.memories.clear();
        agentStorage.lastAccessed = Date.now();
        console.log(`🧹 Cleared ${count} memories for agent ${agentId}`);
    }
    async getStats(agentId) {
        const agentStorage = this.storage[agentId];
        if (!agentStorage) {
            return { total: 0, byType: {} };
        }
        const memories = Array.from(agentStorage.memories.values());
        const total = memories.length;
        const byType = {};
        memories.forEach(memory => {
            const type = memory.type;
            byType[type] = (byType[type] || 0) + 1;
        });
        return { total, byType };
    }
    async cleanup(agentId, retentionDays) {
        const agentStorage = this.storage[agentId];
        if (!agentStorage) {
            return;
        }
        const now = Date.now();
        const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000);
        let expiredCount = 0;
        let oldCount = 0;
        for (const [id, memory] of agentStorage.memories) {
            let shouldDelete = false;
            if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
                if (memory.expiresAt.getTime() <= now) {
                    shouldDelete = true;
                    expiredCount++;
                }
            }
            if (!shouldDelete && memory.timestamp.getTime() < cutoffTime) {
                shouldDelete = true;
                oldCount++;
            }
            if (shouldDelete) {
                agentStorage.memories.delete(id);
            }
        }
        agentStorage.lastAccessed = now;
        console.log(`🧹 Cleaned up ${expiredCount} expired and ${oldCount} old memories for agent ${agentId}`);
    }
    async exportMemories(agentId) {
        const exported = {};
        if (agentId) {
            const agentStorage = this.storage[agentId];
            if (agentStorage) {
                exported[agentId] = Array.from(agentStorage.memories.values());
            }
        }
        else {
            for (const [id, storage] of Object.entries(this.storage)) {
                exported[id] = Array.from(storage.memories.values());
            }
        }
        return exported;
    }
    async importMemories(data) {
        for (const [agentId, memories] of Object.entries(data)) {
            if (!this.storage[agentId]) {
                this.storage[agentId] = {
                    memories: new Map(),
                    lastAccessed: Date.now()
                };
            }
            for (const memory of memories) {
                this.storage[agentId].memories.set(memory.id, memory);
            }
        }
        console.log(`📥 Imported memories for ${Object.keys(data).length} agents`);
    }
    getProviderStats() {
        let totalMemories = 0;
        let oldestMemory;
        let newestMemory;
        for (const storage of Object.values(this.storage)) {
            totalMemories += storage.memories.size;
            for (const memory of storage.memories.values()) {
                if (!oldestMemory || memory.timestamp < oldestMemory) {
                    oldestMemory = memory.timestamp;
                }
                if (!newestMemory || memory.timestamp > newestMemory) {
                    newestMemory = memory.timestamp;
                }
            }
        }
        const memoryUsage = totalMemories * 1000;
        return {
            totalAgents: Object.keys(this.storage).length,
            totalMemories,
            memoryUsage,
            oldestMemory,
            newestMemory
        };
    }
    calculateCosineSimilarity(a, b) {
        if (a.length !== b.length) {
            return 0;
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
    calculateTextSimilarity(query, content) {
        const queryWords = query.split(/\s+/).filter(word => word.length > 2);
        const contentWords = content.split(/\s+/);
        if (queryWords.length === 0)
            return 0;
        let matches = 0;
        for (const queryWord of queryWords) {
            if (contentWords.some(word => word.includes(queryWord) || queryWord.includes(word))) {
                matches++;
            }
        }
        return matches / queryWords.length;
    }
    async evictOldMemories(agentId) {
        const agentStorage = this.storage[agentId];
        if (!agentStorage)
            return;
        const memories = Array.from(agentStorage.memories.entries());
        memories.sort(([, a], [, b]) => {
            if (a.importance !== b.importance) {
                return a.importance - b.importance;
            }
            return a.timestamp.getTime() - b.timestamp.getTime();
        });
        const toRemove = Math.floor(memories.length * 0.1);
        for (let i = 0; i < toRemove; i++) {
            agentStorage.memories.delete(memories[i][0]);
        }
        console.log(`🧹 Evicted ${toRemove} memories for agent ${agentId} due to limit`);
    }
    performAutoCleanup() {
        const now = Date.now();
        for (const [agentId, storage] of Object.entries(this.storage)) {
            let cleanedCount = 0;
            for (const [id, memory] of storage.memories) {
                if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
                    if (memory.expiresAt.getTime() <= now) {
                        storage.memories.delete(id);
                        cleanedCount++;
                    }
                }
            }
            if (cleanedCount > 0) {
                console.log(`🧹 Auto-cleaned ${cleanedCount} expired memories for agent ${agentId}`);
            }
        }
    }
    saveToDisk() {
        if (!this.config.enablePersistence || !this.config.persistencePath) {
            return;
        }
        try {
            const data = this.exportMemories();
            writeFileSync(this.config.persistencePath, JSON.stringify(data, null, 2));
            console.log(`💾 Saved memories to ${this.config.persistencePath}`);
        }
        catch (error) {
            console.error('❌ Failed to save memories to disk:', error);
        }
    }
    loadFromDisk() {
        if (!this.config.enablePersistence || !this.config.persistencePath) {
            return;
        }
        try {
            if (existsSync(this.config.persistencePath)) {
                const data = readFileSync(this.config.persistencePath, 'utf-8');
                const parsed = JSON.parse(data);
                for (const memories of Object.values(parsed)) {
                    for (const memory of memories) {
                        memory.timestamp = new Date(memory.timestamp);
                        if (memory.expiresAt) {
                            memory.expiresAt = new Date(memory.expiresAt);
                        }
                    }
                }
                this.importMemories(parsed);
                console.log(`📥 Loaded memories from ${this.config.persistencePath}`);
            }
        }
        catch (error) {
            console.error('❌ Failed to load memories from disk:', error);
        }
    }
    async disconnect() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        if (this.config.enablePersistence) {
            this.saveToDisk();
        }
        console.log('🔌 In-memory memory provider disconnected');
    }
}
export function createInMemoryProvider(config = {}) {
    return new InMemoryProvider(config);
}
export function createDefaultInMemoryProvider() {
    return new InMemoryProvider({
        maxMemoriesPerAgent: 1000,
        enablePersistence: false,
        enableAutoCleanup: true,
        cleanupInterval: 60000
    });
}
//# sourceMappingURL=index.js.map