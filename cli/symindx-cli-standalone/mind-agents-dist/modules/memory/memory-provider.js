/**
 * In-memory implementation of the MemoryProvider interface.
 * This provider stores all memories in RAM and is suitable for testing
 * and development purposes. Not recommended for production use as
 * memories will be lost when the process terminates.
 */
export class InMemoryProvider {
    constructor(embeddingModel = 'text-embedding-ada-002') {
        this.memories = new Map();
        this.embeddingModel = embeddingModel;
        console.log('✅ In-memory provider initialized');
    }
    async store(agentId, memory) {
        if (!this.memories.has(agentId)) {
            this.memories.set(agentId, new Map());
        }
        const agentMemories = this.memories.get(agentId);
        agentMemories.set(memory.id, { ...memory });
        console.log(`💾 Stored memory: ${memory.type} for agent ${agentId}`);
    }
    async retrieve(agentId, query, limit = 10) {
        const agentMemories = this.memories.get(agentId);
        if (!agentMemories)
            return [];
        const memories = Array.from(agentMemories.values());
        if (query === 'recent') {
            // Sort by timestamp, newest first
            return memories
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, limit);
        }
        else if (query === 'important') {
            // Sort by importance, highest first
            return memories
                .sort((a, b) => b.importance - a.importance)
                .slice(0, limit);
        }
        else {
            // Text search in content
            return memories
                .filter(memory => memory.content.toLowerCase().includes(query.toLowerCase()))
                .sort((a, b) => b.importance - a.importance)
                .slice(0, limit);
        }
    }
    async search(agentId, embedding, limit = 10) {
        console.warn('⚠️ Vector search not implemented for in-memory provider, falling back to recent memories');
        return this.retrieve(agentId, 'recent', limit);
    }
    async delete(agentId, memoryId) {
        const agentMemories = this.memories.get(agentId);
        if (!agentMemories) {
            throw new Error(`No memories found for agent ${agentId}`);
        }
        if (!agentMemories.has(memoryId)) {
            throw new Error(`Memory ${memoryId} not found for agent ${agentId}`);
        }
        agentMemories.delete(memoryId);
        console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
    }
    async clear(agentId) {
        const count = this.memories.get(agentId)?.size || 0;
        this.memories.delete(agentId);
        console.log(`🧹 Cleared ${count} memories for agent ${agentId}`);
    }
    // Utility methods
    getStats(agentId) {
        const agentMemories = this.memories.get(agentId);
        if (!agentMemories) {
            return { total: 0, byType: {} };
        }
        const memories = Array.from(agentMemories.values());
        const byType = {};
        memories.forEach(memory => {
            byType[memory.type] = (byType[memory.type] || 0) + 1;
        });
        return {
            total: memories.length,
            byType
        };
    }
    cleanup(agentId, retentionDays) {
        const agentMemories = this.memories.get(agentId);
        if (!agentMemories)
            return;
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        let removedCount = 0;
        for (const [id, memory] of agentMemories.entries()) {
            if (memory.timestamp.getTime() < cutoffTime && memory.importance < 0.7) {
                agentMemories.delete(id);
                removedCount++;
            }
        }
        console.log(`🧹 Cleaned up ${removedCount} old memories for agent ${agentId}`);
    }
    // Generate embedding using OpenAI (or other service)
    async generateEmbedding(text) {
        // This would typically call OpenAI's embedding API
        // For now, return a mock embedding
        console.warn('⚠️ Mock embedding generated - implement AI integration');
        return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
}
