/**
 * Checkpoint System - Manages agent state checkpoints and recovery
 */

import { Agent, AgentEvent } from '../../types/agent.js'
import { Logger } from '../../utils/logger.js'

export interface CheckpointConfig {
  enabled: boolean
  autoCheckpointInterval: number // milliseconds
  maxCheckpoints: number
  compressionEnabled: boolean
  storageLocation: string
  retentionPeriod: number // milliseconds
  triggerEvents: CheckpointTriggerEvent[]
}

export interface CheckpointTriggerEvent {
  eventType: string
  priority: number // 0.0 to 1.0
  conditions?: Record<string, any>
}

export interface Checkpoint {
  id: string
  agentId: string
  timestamp: Date
  version: string
  triggerEvent?: string
  metadata: CheckpointMetadata
  state: CheckpointState
}

export interface CheckpointMetadata {
  size: number // bytes
  compressed: boolean
  hash: string
  description?: string
  tags: string[]
  priority: number
  parentCheckpointId?: string
  childCheckpointIds: string[]
}

export interface CheckpointState {
  agentConfig: any
  memorySnapshot: any
  emotionState: any
  cognitionState: any
  extensionStates: Record<string, any>
  pendingActions: any[]
  recentEvents: any[]
  learningProgress: any
  behaviorStates: Record<string, any>
  environmentContext: any
}

export interface CheckpointDiff {
  checkpointId: string
  baseCheckpointId: string
  changes: Array<{
    path: string
    operation: 'add' | 'remove' | 'update'
    oldValue?: any
    newValue?: any
  }>
  size: number
}

export interface RecoveryOptions {
  targetCheckpointId?: string
  recoverMemory: boolean
  recoverEmotions: boolean
  recoverCognition: boolean
  recoverExtensions: boolean
  recoverBehaviors: boolean
  preserveCurrentLearning: boolean
  validationRequired: boolean
}

export interface RecoveryResult {
  success: boolean
  checkpointId: string
  timestamp: Date
  restoredComponents: string[]
  errors: string[]
  validationResults?: ValidationResult[]
}

export interface ValidationResult {
  component: string
  valid: boolean
  issues: string[]
  confidence: number
}

export class CheckpointSystem {
  private config: CheckpointConfig
  private logger: Logger
  private checkpoints: Map<string, Checkpoint> = new Map()
  private autoCheckpointTimer?: NodeJS.Timeout
  private pendingCheckpoints: Set<string> = new Set()

  constructor(config: CheckpointConfig) {
    this.config = config
    this.logger = new Logger('checkpoint-system')
    
    if (config.enabled && config.autoCheckpointInterval > 0) {
      this.startAutoCheckpointing()
    }
  }

  /**
   * Create a checkpoint of the agent's current state
   */
  async createCheckpoint(
    agent: Agent, 
    triggerEvent?: string, 
    description?: string,
    priority: number = 0.5
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Checkpoint system is disabled')
    }

    const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.pendingCheckpoints.add(checkpointId)

    try {
      // Capture current state
      const state = await this.captureAgentState(agent)
      
      // Calculate size and hash
      const stateJson = JSON.stringify(state)
      const size = Buffer.byteLength(stateJson, 'utf8')
      const hash = this.calculateHash(stateJson)

      // Compress if enabled
      let finalState = state
      let compressed = false
      if (this.config.compressionEnabled && size > 1024 * 10) { // Compress if > 10KB
        finalState = await this.compressState(state)
        compressed = true
      }

      const checkpoint: Checkpoint = {
        id: checkpointId,
        agentId: agent.id,
        timestamp: new Date(),
        version: '1.0',
        triggerEvent,
        metadata: {
          size: compressed ? Buffer.byteLength(JSON.stringify(finalState), 'utf8') : size,
          compressed,
          hash,
          description,
          tags: this.generateCheckpointTags(agent, triggerEvent),
          priority,
          childCheckpointIds: []
        },
        state: finalState
      }

      // Set parent relationship
      const lastCheckpoint = this.getLatestCheckpoint(agent.id)
      if (lastCheckpoint) {
        checkpoint.metadata.parentCheckpointId = lastCheckpoint.id
        lastCheckpoint.metadata.childCheckpointIds.push(checkpointId)
      }

      // Store checkpoint
      this.checkpoints.set(checkpointId, checkpoint)
      
      // Clean up old checkpoints if necessary
      await this.cleanupOldCheckpoints(agent.id)

      this.logger.info(`Created checkpoint ${checkpointId} for agent ${agent.id} (${size} bytes${compressed ? ', compressed' : ''})`)
      
      return checkpointId
    } catch (error) {
      this.logger.error(`Failed to create checkpoint for agent ${agent.id}:`, error)
      throw error
    } finally {
      this.pendingCheckpoints.delete(checkpointId)
    }
  }

  /**
   * Restore agent from a checkpoint
   */
  async restoreFromCheckpoint(
    agent: Agent, 
    checkpointId: string, 
    options: RecoveryOptions = this.getDefaultRecoveryOptions()
  ): Promise<RecoveryResult> {
    const checkpoint = this.checkpoints.get(checkpointId)
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`)
    }

    if (checkpoint.agentId !== agent.id) {
      throw new Error(`Checkpoint ${checkpointId} does not belong to agent ${agent.id}`)
    }

    const result: RecoveryResult = {
      success: false,
      checkpointId,
      timestamp: new Date(),
      restoredComponents: [],
      errors: []
    }

    try {
      let state = checkpoint.state
      
      // Decompress if necessary
      if (checkpoint.metadata.compressed) {
        state = await this.decompressState(state)
      }

      // Validate checkpoint if required
      if (options.validationRequired) {
        result.validationResults = await this.validateCheckpoint(state)
        const hasErrors = result.validationResults.some(v => !v.valid)
        if (hasErrors) {
          result.errors.push('Checkpoint validation failed')
          return result
        }
      }

      // Restore components based on options
      const restoredComponents: string[] = []

      if (options.recoverMemory && state.memorySnapshot) {
        try {
          await this.restoreMemory(agent, state.memorySnapshot, options.preserveCurrentLearning)
          restoredComponents.push('memory')
        } catch (error) {
          result.errors.push(`Memory restoration failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (options.recoverEmotions && state.emotionState) {
        try {
          await this.restoreEmotions(agent, state.emotionState)
          restoredComponents.push('emotions')
        } catch (error) {
          result.errors.push(`Emotion restoration failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (options.recoverCognition && state.cognitionState) {
        try {
          await this.restoreCognition(agent, state.cognitionState)
          restoredComponents.push('cognition')
        } catch (error) {
          result.errors.push(`Cognition restoration failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (options.recoverExtensions && state.extensionStates) {
        try {
          await this.restoreExtensions(agent, state.extensionStates)
          restoredComponents.push('extensions')
        } catch (error) {
          result.errors.push(`Extensions restoration failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (options.recoverBehaviors && state.behaviorStates) {
        try {
          await this.restoreBehaviors(agent, state.behaviorStates)
          restoredComponents.push('behaviors')
        } catch (error) {
          result.errors.push(`Behaviors restoration failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      result.restoredComponents = restoredComponents
      result.success = restoredComponents.length > 0 && result.errors.length === 0

      this.logger.info(`Restored agent ${agent.id} from checkpoint ${checkpointId}. Components: ${restoredComponents.join(', ')}`)
      
      if (result.errors.length > 0) {
        this.logger.warn(`Restoration completed with errors: ${result.errors.join(', ')}`)
      }

    } catch (error) {
      result.errors.push(`Restoration failed: ${error instanceof Error ? error.message : String(error)}`)
      this.logger.error(`Failed to restore agent ${agent.id} from checkpoint ${checkpointId}:`, error)
    }

    return result
  }

  /**
   * Get available checkpoints for an agent
   */
  getCheckpoints(agentId: string): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .filter(checkpoint => checkpoint.agentId === agentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get a specific checkpoint
   */
  getCheckpoint(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId)
  }

  /**
   * Get the latest checkpoint for an agent
   */
  getLatestCheckpoint(agentId: string): Checkpoint | undefined {
    const checkpoints = this.getCheckpoints(agentId)
    return checkpoints.length > 0 ? checkpoints[0] : undefined
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(checkpointId)
    if (!checkpoint) return false

    // Update parent-child relationships
    if (checkpoint.metadata.parentCheckpointId) {
      const parent = this.checkpoints.get(checkpoint.metadata.parentCheckpointId)
      if (parent) {
        parent.metadata.childCheckpointIds = parent.metadata.childCheckpointIds
          .filter(id => id !== checkpointId)
      }
    }

    // Update children to point to parent
    for (const childId of checkpoint.metadata.childCheckpointIds) {
      const child = this.checkpoints.get(childId)
      if (child) {
        child.metadata.parentCheckpointId = checkpoint.metadata.parentCheckpointId
      }
    }

    this.checkpoints.delete(checkpointId)
    this.logger.info(`Deleted checkpoint ${checkpointId}`)
    
    return true
  }

  /**
   * Create a diff between two checkpoints
   */
  createCheckpointDiff(baseCheckpointId: string, targetCheckpointId: string): CheckpointDiff | null {
    const baseCheckpoint = this.checkpoints.get(baseCheckpointId)
    const targetCheckpoint = this.checkpoints.get(targetCheckpointId)
    
    if (!baseCheckpoint || !targetCheckpoint) return null

    const changes = this.compareStates(baseCheckpoint.state, targetCheckpoint.state)
    
    return {
      checkpointId: targetCheckpointId,
      baseCheckpointId,
      changes,
      size: Buffer.byteLength(JSON.stringify(changes), 'utf8')
    }
  }

  /**
   * Get checkpoint statistics
   */
  getCheckpointStats(): {
    total: number;
    byAgent: Record<string, number>;
    totalSize: number;
    averageSize: number;
    oldestCheckpoint?: Date;
    newestCheckpoint?: Date;
    compressionRatio: number;
  } {
    const checkpoints = Array.from(this.checkpoints.values())
    const totalSize = checkpoints.reduce((sum, cp) => sum + cp.metadata.size, 0)
    const compressedCheckpoints = checkpoints.filter(cp => cp.metadata.compressed)
    
    const stats = {
      total: checkpoints.length,
      byAgent: {} as Record<string, number>,
      totalSize,
      averageSize: checkpoints.length > 0 ? totalSize / checkpoints.length : 0,
      oldestCheckpoint: undefined as Date | undefined,
      newestCheckpoint: undefined as Date | undefined,
      compressionRatio: compressedCheckpoints.length / Math.max(1, checkpoints.length)
    }

    // Calculate by agent
    for (const checkpoint of checkpoints) {
      stats.byAgent[checkpoint.agentId] = (stats.byAgent[checkpoint.agentId] || 0) + 1
    }

    // Find oldest and newest
    if (checkpoints.length > 0) {
      const sortedByTime = checkpoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      stats.oldestCheckpoint = sortedByTime[0].timestamp
      stats.newestCheckpoint = sortedByTime[sortedByTime.length - 1].timestamp
    }

    return stats
  }

  private async captureAgentState(agent: Agent): Promise<CheckpointState> {
    // This is a simplified state capture. In a real implementation,
    // this would call into the actual agent modules to get their state
    return {
      agentConfig: agent.config,
      memorySnapshot: await this.captureMemoryState(agent),
      emotionState: await this.captureEmotionState(agent),
      cognitionState: await this.captureCognitionState(agent),
      extensionStates: await this.captureExtensionStates(agent),
      pendingActions: (agent as any).pendingActions || [],
      recentEvents: (agent.eventBus as any)?.recentEvents?.slice(-20) || [], // Last 20 events
      learningProgress: await this.captureLearningProgress(agent),
      behaviorStates: await this.captureBehaviorStates(agent),
      environmentContext: await this.captureEnvironmentContext(agent)
    }
  }

  private async captureMemoryState(agent: Agent): Promise<any> {
    // Placeholder - would capture memory state from memory module
    return {
      type: 'memory_snapshot',
      timestamp: new Date(),
      memories: [], // Would contain actual memories
      metadata: { version: '1.0' }
    }
  }

  private async captureEmotionState(agent: Agent): Promise<any> {
    // Placeholder - would capture emotion state from emotion module
    return {
      currentEmotions: (agent.emotion as any)?.currentState || {},
      emotionHistory: [],
      emotionModels: {},
      timestamp: new Date()
    }
  }

  private async captureCognitionState(agent: Agent): Promise<any> {
    // Placeholder - would capture cognition state
    return {
      activeGoals: (agent.cognition as any)?.activeGoals || [],
      planningState: {},
      reasoningModels: {},
      timestamp: new Date()
    }
  }

  private async captureExtensionStates(agent: Agent): Promise<Record<string, any>> {
    // Placeholder - would capture extension states
    return {}
  }

  private async captureLearningProgress(agent: Agent): Promise<any> {
    // Placeholder - would capture learning progress
    return {
      skills: {},
      knowledge: {},
      timestamp: new Date()
    }
  }

  private async captureBehaviorStates(agent: Agent): Promise<Record<string, any>> {
    // Placeholder - would capture behavior states
    return {}
  }

  private async captureEnvironmentContext(agent: Agent): Promise<any> {
    // Placeholder - would capture environment context
    return {
      timestamp: new Date(),
      context: {}
    }
  }

  private generateCheckpointTags(agent: Agent, triggerEvent?: string): string[] {
    const tags = ['auto-generated']
    
    if (triggerEvent) {
      tags.push(`trigger:${triggerEvent}`)
    }
    
    tags.push(`agent:${agent.id}`)
    
    return tags
  }

  private calculateHash(data: string): string {
    // Simple hash calculation - in production would use crypto
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  private async compressState(state: CheckpointState): Promise<CheckpointState> {
    // Placeholder compression - would use actual compression library
    return state
  }

  private async decompressState(state: CheckpointState): Promise<CheckpointState> {
    // Placeholder decompression - would use actual compression library
    return state
  }

  private compareStates(baseState: CheckpointState, targetState: CheckpointState): Array<{
    path: string;
    operation: 'add' | 'remove' | 'update';
    oldValue?: any;
    newValue?: any;
  }> {
    // Simplified state comparison - would use deep diff library
    return []
  }

  private async validateCheckpoint(state: CheckpointState): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Validate memory state
    results.push({
      component: 'memory',
      valid: state.memorySnapshot !== null,
      issues: state.memorySnapshot ? [] : ['Memory snapshot is null'],
      confidence: 0.9
    })

    // Validate emotion state
    results.push({
      component: 'emotions',
      valid: state.emotionState !== null,
      issues: state.emotionState ? [] : ['Emotion state is null'],
      confidence: 0.8
    })

    return results
  }

  private async restoreMemory(agent: Agent, memorySnapshot: any, preserveCurrentLearning: boolean): Promise<void> {
    // Placeholder - would restore memory from snapshot
    this.logger.debug(`Restoring memory for agent ${agent.id}`)
  }

  private async restoreEmotions(agent: Agent, emotionState: any): Promise<void> {
    // Placeholder - would restore emotion state
    this.logger.debug(`Restoring emotions for agent ${agent.id}`)
  }

  private async restoreCognition(agent: Agent, cognitionState: any): Promise<void> {
    // Placeholder - would restore cognition state
    this.logger.debug(`Restoring cognition for agent ${agent.id}`)
  }

  private async restoreExtensions(agent: Agent, extensionStates: Record<string, any>): Promise<void> {
    // Placeholder - would restore extension states
    this.logger.debug(`Restoring extensions for agent ${agent.id}`)
  }

  private async restoreBehaviors(agent: Agent, behaviorStates: Record<string, any>): Promise<void> {
    // Placeholder - would restore behavior states
    this.logger.debug(`Restoring behaviors for agent ${agent.id}`)
  }

  private getDefaultRecoveryOptions(): RecoveryOptions {
    return {
      recoverMemory: true,
      recoverEmotions: true,
      recoverCognition: true,
      recoverExtensions: true,
      recoverBehaviors: true,
      preserveCurrentLearning: true,
      validationRequired: true
    }
  }

  private async cleanupOldCheckpoints(agentId: string): Promise<void> {
    const checkpoints = this.getCheckpoints(agentId)
    
    // Remove old checkpoints if exceeding max count
    if (checkpoints.length > this.config.maxCheckpoints) {
      const toDelete = checkpoints.slice(this.config.maxCheckpoints)
      for (const checkpoint of toDelete) {
        await this.deleteCheckpoint(checkpoint.id)
      }
    }

    // Remove checkpoints older than retention period
    const cutoffTime = new Date().getTime() - this.config.retentionPeriod
    const expiredCheckpoints = checkpoints.filter(cp => cp.timestamp.getTime() < cutoffTime)
    for (const checkpoint of expiredCheckpoints) {
      await this.deleteCheckpoint(checkpoint.id)
    }
  }

  private startAutoCheckpointing(): void {
    this.autoCheckpointTimer = setInterval(() => {
      // This would trigger auto-checkpointing for all active agents
      this.logger.debug('Auto-checkpoint timer triggered')
    }, this.config.autoCheckpointInterval)
  }

  private stopAutoCheckpointing(): void {
    if (this.autoCheckpointTimer) {
      clearInterval(this.autoCheckpointTimer)
      this.autoCheckpointTimer = undefined
    }
  }

  /**
   * Shutdown the checkpoint system
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down checkpoint system')
    this.stopAutoCheckpointing()
  }
}

/**
 * Factory function to create checkpoint system
 */
export function createCheckpointSystem(config: Partial<CheckpointConfig> = {}): CheckpointSystem {
  const defaultConfig: CheckpointConfig = {
    enabled: true,
    autoCheckpointInterval: 10 * 60 * 1000, // 10 minutes
    maxCheckpoints: 50,
    compressionEnabled: true,
    storageLocation: './data/checkpoints',
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    triggerEvents: [
      { eventType: 'goal_achieved', priority: 0.9 },
      { eventType: 'learning_milestone', priority: 0.8 },
      { eventType: 'error_recovery', priority: 0.7 },
      { eventType: 'user_request', priority: 1.0 }
    ]
  }

  return new CheckpointSystem({ ...defaultConfig, ...config })
}