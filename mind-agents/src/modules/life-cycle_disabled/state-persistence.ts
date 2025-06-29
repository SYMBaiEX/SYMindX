/**
 * State Persistence - Handles saving and loading agent state across sessions
 */

import { Agent } from '../../types/agent.js'
import { LifecycleState, GrowthMetrics, Achievement, Milestone } from './agent-lifecycle-manager.js'
import { Logger } from '../../utils/logger.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface PersistenceConfig {
  enabled: boolean
  storageType: 'file' | 'database' | 'memory'
  dataDirectory: string
  backupCount: number
  saveInterval: number // milliseconds
  compressionEnabled: boolean
  encryptionEnabled: boolean
}

export interface PersistedAgentState {
  agentId: string
  agentName: string
  version: string
  timestamp: Date
  lifecycleState: LifecycleState
  memorySnapshot: MemorySnapshot
  personalityEvolution: PersonalityEvolution
  relationshipData: RelationshipData
  knowledgeBase: KnowledgeSnapshot
  preferences: AgentPreferences
  sessionHistory: SessionRecord[]
}

export interface MemorySnapshot {
  episodicMemories: any[] // Recent episodic memories
  semanticMemories: any[] // Key semantic memories
  emotionalMemories: any[] // Significant emotional memories
  proceduralMemories: any[] // Learned procedures and skills
  lastMemoryId: string
  memoryCount: number
}

export interface PersonalityEvolution {
  originalTraits: Record<string, number>
  currentTraits: Record<string, number>
  evolutionHistory: TraitEvolution[]
  lastUpdate: Date
}

export interface TraitEvolution {
  trait: string
  oldValue: number
  newValue: number
  reason: string
  timestamp: Date
}

export interface RelationshipData {
  humanRelationships: HumanRelationship[]
  agentRelationships: AgentRelationship[]
  socialMetrics: SocialMetrics
}

export interface HumanRelationship {
  humanId: string
  name?: string
  relationshipType: 'friend' | 'mentor' | 'student' | 'collaborator' | 'stranger'
  trustLevel: number
  interactionCount: number
  lastInteraction: Date
  relationshipHistory: RelationshipEvent[]
}

export interface AgentRelationship {
  agentId: string
  agentName: string
  relationshipType: 'peer' | 'mentor' | 'student' | 'competitor' | 'collaborator'
  trustLevel: number
  sharedExperiences: string[]
  lastInteraction: Date
}

export interface RelationshipEvent {
  timestamp: Date
  type: 'meeting' | 'conversation' | 'collaboration' | 'conflict' | 'learning'
  sentiment: number // -1 to 1
  impact: number // 0 to 1
  description: string
}

export interface SocialMetrics {
  totalInteractions: number
  averageSentiment: number
  relationshipQuality: number
  socialConfidence: number
  lastUpdate: Date
}

export interface KnowledgeSnapshot {
  domains: KnowledgeDomain[]
  totalConcepts: number
  averageConfidence: number
  recentLearnings: RecentLearning[]
  expertiseAreas: string[]
}

export interface KnowledgeDomain {
  name: string
  conceptCount: number
  averageConfidence: number
  lastActivity: Date
  expertise: number
}

export interface RecentLearning {
  topic: string
  confidence: number
  timestamp: Date
  source: string
}

export interface AgentPreferences {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  interactionStyle: 'formal' | 'casual' | 'adaptive'
  curiosityLevel: number
  riskTolerance: number
  socialPreference: number
  creativityPreference: number
  autonomyPreference: number
  lastUpdate: Date
}

export interface SessionRecord {
  sessionId: string
  startTime: Date
  endTime?: Date
  duration?: number
  activities: string[]
  achievements: string[]
  interactionCount: number
  learningEvents: number
  emotionalHighlights: EmotionalHighlight[]
}

export interface EmotionalHighlight {
  emotion: string
  intensity: number
  trigger: string
  timestamp: Date
}

export class StatePersistenceManager {
  private config: PersistenceConfig
  private logger: Logger
  private saveTimer?: NodeJS.Timeout
  private isDirty = false

  constructor(config: PersistenceConfig) {
    this.config = config
    this.logger = new Logger('state-persistence')
  }

  /**
   * Start persistence manager
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('State persistence disabled')
      return
    }

    this.logger.info('Starting state persistence manager')

    // Ensure data directory exists
    await this.ensureDataDirectory()

    // Start periodic saves
    this.startPeriodicSaves()
  }

  /**
   * Stop persistence manager
   */
  async stop(): Promise<void> {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = undefined
    }

    // Save any pending changes
    if (this.isDirty) {
      this.logger.info('Saving final state changes before shutdown')
      // Final save would be implemented here
    }

    this.logger.info('State persistence manager stopped')
  }

  /**
   * Save agent state
   */
  async saveAgentState(agent: Agent, lifecycleState: LifecycleState): Promise<void> {
    if (!this.config.enabled) return

    try {
      const state = await this.createPersistedState(agent, lifecycleState)
      await this.writeStateToStorage(state)
      
      this.logger.info(`Saved state for agent: ${agent.name}`)
      this.isDirty = false

    } catch (error) {
      this.logger.error('Failed to save agent state:', error)
      throw error
    }
  }

  /**
   * Load agent state
   */
  async loadAgentState(agentId: string): Promise<PersistedAgentState | null> {
    if (!this.config.enabled) return null

    try {
      const state = await this.readStateFromStorage(agentId)
      
      if (state) {
        this.logger.info(`Loaded state for agent: ${agentId}`)
        return state
      } else {
        this.logger.info(`No saved state found for agent: ${agentId}`)
        return null
      }

    } catch (error) {
      this.logger.error('Failed to load agent state:', error)
      return null
    }
  }

  /**
   * Create backup of current state
   */
  async createBackup(agentId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `${agentId}_backup_${timestamp}`
    
    const currentState = await this.loadAgentState(agentId)
    if (currentState) {
      await this.writeStateToStorage(currentState, backupId)
      
      // Cleanup old backups
      await this.cleanupOldBackups(agentId)
      
      this.logger.info(`Created backup: ${backupId}`)
      return backupId
    }

    throw new Error('No current state to backup')
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(agentId: string, backupId: string): Promise<void> {
    const backupState = await this.readStateFromStorage(backupId)
    if (!backupState) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    await this.writeStateToStorage(backupState, agentId)
    this.logger.info(`Restored agent ${agentId} from backup ${backupId}`)
  }

  /**
   * List available backups for an agent
   */
  async listBackups(agentId: string): Promise<string[]> {
    if (this.config.storageType !== 'file') {
      throw new Error('Backup listing only supported for file storage')
    }

    try {
      const files = await fs.readdir(this.config.dataDirectory)
      const backupFiles = files.filter(file => 
        file.startsWith(`${agentId}_backup_`) && file.endsWith('.json')
      )
      
      return backupFiles.map(file => file.replace('.json', ''))
    } catch (error) {
      this.logger.error('Failed to list backups:', error)
      return []
    }
  }

  /**
   * Delete agent state
   */
  async deleteAgentState(agentId: string): Promise<void> {
    if (!this.config.enabled) return

    try {
      await this.deleteStateFromStorage(agentId)
      this.logger.info(`Deleted state for agent: ${agentId}`)
    } catch (error) {
      this.logger.error('Failed to delete agent state:', error)
      throw error
    }
  }

  /**
   * Check if agent state exists
   */
  async hasAgentState(agentId: string): Promise<boolean> {
    if (!this.config.enabled) return false

    try {
      const state = await this.readStateFromStorage(agentId)
      return state !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ totalAgents: number; totalSize: number; lastBackup?: Date }> {
    if (this.config.storageType !== 'file') {
      return { totalAgents: 0, totalSize: 0 }
    }

    try {
      const files = await fs.readdir(this.config.dataDirectory)
      const stateFiles = files.filter(file => file.endsWith('.json') && !file.includes('backup'))
      
      let totalSize = 0
      for (const file of files) {
        const filePath = path.join(this.config.dataDirectory, file)
        const stats = await fs.stat(filePath)
        totalSize += stats.size
      }

      return {
        totalAgents: stateFiles.length,
        totalSize,
        lastBackup: new Date() // Simplified - would track actual last backup time
      }
    } catch (error) {
      this.logger.error('Failed to get storage stats:', error)
      return { totalAgents: 0, totalSize: 0 }
    }
  }

  /**
   * Mark state as dirty (needs saving)
   */
  markDirty(): void {
    this.isDirty = true
  }

  // Private methods

  private async ensureDataDirectory(): Promise<void> {
    if (this.config.storageType === 'file') {
      try {
        await fs.mkdir(this.config.dataDirectory, { recursive: true })
      } catch (error) {
        this.logger.error('Failed to create data directory:', error)
        throw error
      }
    }
  }

  private startPeriodicSaves(): void {
    if (this.config.saveInterval > 0) {
      this.saveTimer = setInterval(() => {
        if (this.isDirty) {
          // In a real implementation, this would save all dirty agents
          this.logger.debug('Periodic save triggered')
        }
      }, this.config.saveInterval)
    }
  }

  private async createPersistedState(agent: Agent, lifecycleState: LifecycleState): Promise<PersistedAgentState> {
    // Create memory snapshot
    const memorySnapshot = await this.createMemorySnapshot(agent)
    
    // Create personality evolution data
    const personalityEvolution = this.createPersonalityEvolution(agent)
    
    // Create relationship data
    const relationshipData = await this.createRelationshipData(agent)
    
    // Create knowledge snapshot
    const knowledgeSnapshot = await this.createKnowledgeSnapshot(agent)
    
    // Create preferences
    const preferences = this.createAgentPreferences(agent)
    
    // Create session history
    const sessionHistory = await this.createSessionHistory(agent)

    return {
      agentId: agent.id,
      agentName: agent.name,
      version: '1.0.0',
      timestamp: new Date(),
      lifecycleState,
      memorySnapshot,
      personalityEvolution,
      relationshipData,
      knowledgeBase: knowledgeSnapshot,
      preferences,
      sessionHistory
    }
  }

  private async createMemorySnapshot(agent: Agent): Promise<MemorySnapshot> {
    // This would interface with the agent's memory system
    // Simplified implementation
    return {
      episodicMemories: [], // Would get recent episodic memories
      semanticMemories: [], // Would get key semantic memories
      emotionalMemories: [], // Would get emotional memories
      proceduralMemories: [], // Would get procedural memories
      lastMemoryId: 'last_id',
      memoryCount: 0
    }
  }

  private createPersonalityEvolution(agent: Agent): PersonalityEvolution {
    const currentTraits = agent.config.psyche?.traits || []
    
    return {
      originalTraits: { ...currentTraits }, // Would store original traits
      currentTraits,
      evolutionHistory: [], // Would track trait changes over time
      lastUpdate: new Date()
    }
  }

  private async createRelationshipData(agent: Agent): Promise<RelationshipData> {
    // This would interface with relationship tracking systems
    return {
      humanRelationships: [],
      agentRelationships: [],
      socialMetrics: {
        totalInteractions: 0,
        averageSentiment: 0,
        relationshipQuality: 0,
        socialConfidence: 0,
        lastUpdate: new Date()
      }
    }
  }

  private async createKnowledgeSnapshot(agent: Agent): Promise<KnowledgeSnapshot> {
    // This would interface with the agent's knowledge systems
    return {
      domains: [],
      totalConcepts: 0,
      averageConfidence: 0,
      recentLearnings: [],
      expertiseAreas: []
    }
  }

  private createAgentPreferences(agent: Agent): AgentPreferences {
    const personality = agent.config.psyche?.traits || []
    
    return {
      learningStyle: 'mixed',
      interactionStyle: 'adaptive',
      curiosityLevel: 0.5,
      riskTolerance: 0.5,
      socialPreference: 0.5,
      creativityPreference: 0.5,
      autonomyPreference: 0.5,
      lastUpdate: new Date()
    }
  }

  private async createSessionHistory(agent: Agent): Promise<SessionRecord[]> {
    // This would track session history
    return []
  }

  private async writeStateToStorage(state: PersistedAgentState, customId?: string): Promise<void> {
    const id = customId || state.agentId
    
    switch (this.config.storageType) {
      case 'file':
        await this.writeStateToFile(state, id)
        break
      case 'database':
        await this.writeStateToDatabase(state, id)
        break
      case 'memory':
        await this.writeStateToMemory(state, id)
        break
      default:
        throw new Error(`Unsupported storage type: ${this.config.storageType}`)
    }
  }

  private async readStateFromStorage(agentId: string): Promise<PersistedAgentState | null> {
    switch (this.config.storageType) {
      case 'file':
        return await this.readStateFromFile(agentId)
      case 'database':
        return await this.readStateFromDatabase(agentId)
      case 'memory':
        return await this.readStateFromMemory(agentId)
      default:
        throw new Error(`Unsupported storage type: ${this.config.storageType}`)
    }
  }

  private async deleteStateFromStorage(agentId: string): Promise<void> {
    switch (this.config.storageType) {
      case 'file':
        await this.deleteStateFromFile(agentId)
        break
      case 'database':
        await this.deleteStateFromDatabase(agentId)
        break
      case 'memory':
        await this.deleteStateFromMemory(agentId)
        break
      default:
        throw new Error(`Unsupported storage type: ${this.config.storageType}`)
    }
  }

  // File storage implementation
  private async writeStateToFile(state: PersistedAgentState, agentId: string): Promise<void> {
    const filePath = path.join(this.config.dataDirectory, `${agentId}.json`)
    const data = JSON.stringify(state, null, 2)
    
    // Optionally compress data
    const finalData = this.config.compressionEnabled ? await this.compressData(data) : data
    
    await fs.writeFile(filePath, finalData, 'utf8')
  }

  private async readStateFromFile(agentId: string): Promise<PersistedAgentState | null> {
    const filePath = path.join(this.config.dataDirectory, `${agentId}.json`)
    
    try {
      let data = await fs.readFile(filePath, 'utf8')
      
      // Optionally decompress data
      if (this.config.compressionEnabled) {
        data = await this.decompressData(data)
      }
      
      return JSON.parse(data)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null // File doesn't exist
      }
      throw error
    }
  }

  private async deleteStateFromFile(agentId: string): Promise<void> {
    const filePath = path.join(this.config.dataDirectory, `${agentId}.json`)
    
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  // Database storage stubs (would be implemented with actual database)
  private async writeStateToDatabase(state: PersistedAgentState, agentId: string): Promise<void> {
    // Database implementation would go here
    throw new Error('Database storage not implemented')
  }

  private async readStateFromDatabase(agentId: string): Promise<PersistedAgentState | null> {
    // Database implementation would go here
    throw new Error('Database storage not implemented')
  }

  private async deleteStateFromDatabase(agentId: string): Promise<void> {
    // Database implementation would go here
    throw new Error('Database storage not implemented')
  }

  // Memory storage (for testing)
  private memoryStorage = new Map<string, PersistedAgentState>()

  private async writeStateToMemory(state: PersistedAgentState, agentId: string): Promise<void> {
    this.memoryStorage.set(agentId, state)
  }

  private async readStateFromMemory(agentId: string): Promise<PersistedAgentState | null> {
    return this.memoryStorage.get(agentId) || null
  }

  private async deleteStateFromMemory(agentId: string): Promise<void> {
    this.memoryStorage.delete(agentId)
  }

  // Utility methods
  private async compressData(data: string): Promise<string> {
    // Compression implementation would go here
    return data
  }

  private async decompressData(data: string): Promise<string> {
    // Decompression implementation would go here
    return data
  }

  private async cleanupOldBackups(agentId: string): Promise<void> {
    if (this.config.storageType !== 'file') return

    try {
      const files = await fs.readdir(this.config.dataDirectory)
      const backupFiles = files
        .filter(file => file.startsWith(`${agentId}_backup_`) && file.endsWith('.json'))
        .sort()
        .reverse() // Most recent first

      // Keep only the configured number of backups
      const filesToDelete = backupFiles.slice(this.config.backupCount)
      
      for (const file of filesToDelete) {
        const filePath = path.join(this.config.dataDirectory, file)
        await fs.unlink(filePath)
      }

      if (filesToDelete.length > 0) {
        this.logger.info(`Cleaned up ${filesToDelete.length} old backups for agent ${agentId}`)
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error)
    }
  }
}