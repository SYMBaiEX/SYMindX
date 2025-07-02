/**
 * PostgreSQL Memory Provider Example
 * 
 * This example demonstrates how to use the PostgreSQL memory provider
 * with automatic schema deployment.
 */

import { createPostgresMemoryProvider, createDefaultPostgresProvider } from './index.js'
import { MemoryType, MemoryDuration } from '../../../../types/agent.js'

async function basicExample() {
  console.log('🐘 PostgreSQL Memory Provider Example')
  
  // Simple setup - just provide a connection string
  // The schema will be automatically deployed on first use
  const provider = createDefaultPostgresProvider(
    'postgresql://user:password@localhost:5432/symindx'
  )

  const agentId = 'example-agent'

  try {
    // Check database health
    const health = await provider.healthCheck()
    console.log('📊 Database Health:', health)

    // Store some memories
    await provider.store(agentId, {
      id: 'memory-1',
      agentId: agentId,
      type: MemoryType.EXPERIENCE,
      content: 'User asked about the weather in San Francisco',
      importance: 0.8,
      timestamp: new Date(),
      metadata: { location: 'San Francisco', topic: 'weather' },
      tags: ['weather', 'user-query'],
      duration: MemoryDuration.LONG_TERM
    })

    await provider.store(agentId, {
      id: 'memory-2',
      agentId: agentId,
      type: MemoryType.KNOWLEDGE,
      content: 'San Francisco has a Mediterranean climate with cool, wet winters and dry summers',
      importance: 0.9,
      timestamp: new Date(),
      metadata: { location: 'San Francisco', type: 'climate-info' },
      tags: ['weather', 'knowledge', 'climate'],
      duration: MemoryDuration.LONG_TERM
    })

    // Retrieve recent memories
    const recentMemories = await provider.retrieve(agentId, 'recent', 5)
    console.log('📝 Recent memories:', recentMemories.length)

    // Search for weather-related memories
    const weatherMemories = await provider.retrieve(agentId, 'weather', 10)
    console.log('🌤️ Weather memories:', weatherMemories.length)

    // Get statistics
    const stats = await provider.getStats(agentId)
    console.log('📊 Memory stats:', stats)

    // Get schema information
    const schema = await provider.getSchemaInfo()
    console.log('🏗️ Schema info:', schema)

    // Check connection pool status
    const poolStatus = provider.getPoolStatus()
    console.log('🏊 Pool status:', poolStatus)

    console.log('✅ Example completed successfully!')

  } catch (error) {
    console.error('❌ Example failed:', error)
  } finally {
    // Clean up
    await provider.disconnect()
  }
}

async function advancedExample() {
  console.log('🚀 Advanced PostgreSQL Memory Provider Example')

  // Advanced configuration
  const provider = createPostgresMemoryProvider({
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/symindx',
    maxConnections: 30,
    tableName: 'agent_memories',
    autoDeploySchema: true,
    ssl: process.env.NODE_ENV === 'production',
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 60000
  })

  const agentId = 'advanced-agent'

  try {
    // Store memory with vector embedding (simulated)
    const embedding = Array.from({ length: 1536 }, () => Math.random())
    
    await provider.store(agentId, {
      id: 'memory-with-embedding',
      agentId: agentId,
      type: MemoryType.EXPERIENCE,
      content: 'Complex interaction about machine learning algorithms',
      embedding: embedding,
      importance: 0.95,
      timestamp: new Date(),
      metadata: { 
        topic: 'machine-learning',
        complexity: 'high',
        duration_minutes: 15
      },
      tags: ['ai', 'algorithms', 'technical'],
      duration: MemoryDuration.LONG_TERM
    })

    // Perform vector search (if pgvector is available)
    const queryEmbedding = Array.from({ length: 1536 }, () => Math.random())
    const similarMemories = await provider.search(agentId, queryEmbedding, 5)
    console.log('🔍 Similar memories found:', similarMemories.length)

    // Cleanup old memories (demo with 0 days to show the function works)
    await provider.cleanup(agentId, 0)

    console.log('✅ Advanced example completed!')

  } catch (error) {
    console.error('❌ Advanced example failed:', error)
  } finally {
    await provider.disconnect()
  }
}

async function migrationExample() {
  console.log('🔄 Migration Example - Moving from SQLite to PostgreSQL')

  // This example shows how you might migrate from SQLite to PostgreSQL
  try {
    // Simulate SQLite data (in real scenario, you'd load from SQLite)
    const sqliteData = {
      'agent-1': [
        {
          id: 'sqlite-memory-1',
          agentId: 'agent-1',
          type: MemoryType.EXPERIENCE,
          content: 'Original SQLite memory',
          importance: 0.7,
          timestamp: new Date(),
          metadata: { source: 'sqlite' },
          tags: ['migration'],
          duration: MemoryDuration.LONG_TERM
        }
      ]
    }

    // Create PostgreSQL provider
    const postgresProvider = createDefaultPostgresProvider(
      'postgresql://user:password@localhost:5432/symindx'
    )

    // Migrate data
    for (const [agentId, memories] of Object.entries(sqliteData)) {
      for (const memory of memories) {
        await postgresProvider.store(agentId, memory)
        console.log(`✅ Migrated memory ${memory.id} for agent ${agentId}`)
      }
    }

    // Verify migration
    const migratedMemories = await postgresProvider.retrieve('agent-1', 'recent', 10)
    console.log('📋 Migrated memories:', migratedMemories.length)

    await postgresProvider.disconnect()
    console.log('✅ Migration example completed!')

  } catch (error) {
    console.error('❌ Migration example failed:', error)
  }
}

// Production deployment example
async function productionExample() {
  console.log('🏭 Production Deployment Example')

  // Production-ready configuration
  const provider = createPostgresMemoryProvider({
    connectionString: process.env.DATABASE_URL!,
    maxConnections: 50,
    ssl: true,
    autoDeploySchema: true,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    tableName: 'production_memories'
  })

  try {
    // Health monitoring
    const health = await provider.healthCheck()
    if (!health.healthy) {
      throw new Error('Database health check failed')
    }
    
    console.log(`✅ Database healthy (${health.latency}ms latency)`)
    console.log(`📦 PostgreSQL version: ${health.version}`)

    // Performance monitoring
    setInterval(async () => {
      const poolStatus = provider.getPoolStatus()
      console.log(`🏊 Pool: ${poolStatus.total} total, ${poolStatus.idle} idle, ${poolStatus.waiting} waiting`)
    }, 30000)

    console.log('🚀 Production system ready!')

  } catch (error) {
    console.error('❌ Production setup failed:', error)
    process.exit(1)
  }
}

// Run examples based on command line argument
const example = process.argv[2] || 'basic'

switch (example) {
  case 'basic':
    basicExample()
    break
  case 'advanced':
    advancedExample()
    break
  case 'migration':
    migrationExample()
    break
  case 'production':
    productionExample()
    break
  default:
    console.log('Available examples: basic, advanced, migration, production')
}