/**
 * Lifecycle Manager for Agent Lifecycle Management
 * Provides robust graceful shutdown and restart with enhanced phases
 */

import { Agent, LazyAgent, AgentStatus, LazyAgentState } from '../types/agent.js'
import { StateManager, AgentStateSnapshot, CheckpointType } from './state-manager.js'
import { ResourceManager, ResourceType } from './resource-manager.js'
import { Logger } from '../utils/logger.js'
import { EventEmitter } from 'events'

export enum LifecyclePhase {
  // Shutdown phases
  PREPARING_SHUTDOWN = 'preparing_shutdown',
  CREATING_CHECKPOINT = 'creating_checkpoint',
  CLEANUP_RESOURCES = 'cleanup_resources',
  FINALIZING_SHUTDOWN = 'finalizing_shutdown',
  STOPPED = 'stopped',
  
  // Startup phases
  INITIALIZING = 'initializing',
  LOADING_CHECKPOINT = 'loading_checkpoint',
  VALIDATING_STATE = 'validating_state',
  RESTORING_RESOURCES = 'restoring_resources',
  ACTIVATING = 'activating',
  READY = 'ready',
  
  // Error phases
  SHUTDOWN_FAILED = 'shutdown_failed',
  STARTUP_FAILED = 'startup_failed',
  ROLLBACK_IN_PROGRESS = 'rollback_in_progress'
}

export interface LifecycleOperation {
  id: string
  agentId: string
  type: 'shutdown' | 'startup' | 'restart'
  phase: LifecyclePhase
  startTime: Date
  lastUpdate: Date
  timeout?: number
  metadata: any
  errors: string[]
  rollbackData?: any
}

export interface LifecycleConfig {
  shutdownTimeoutMs: number
  startupTimeoutMs: number
  enableCheckpoints: boolean
  enableRollback: boolean
  maxRetries: number
  validateStateOnStartup: boolean
  cleanupOnShutdownFailure: boolean
}

export interface ShutdownOptions {
  createCheckpoint?: boolean
  checkpointType?: CheckpointType
  force?: boolean
  timeoutMs?: number
  saveMemories?: boolean
}

export interface StartupOptions {
  restoreFromCheckpoint?: boolean
  specificCheckpoint?: string
  validateState?: boolean
  timeoutMs?: number
  fallbackToDefaults?: boolean
}

export class LifecycleManager extends EventEmitter {
  private logger: Logger
  private config: LifecycleConfig
  private stateManager: StateManager
  private resourceManager: ResourceManager
  private activeOperations: Map<string, LifecycleOperation> = new Map()
  private operationCounter = 0

  constructor(
    config: LifecycleConfig,
    stateManager: StateManager,
    resourceManager: ResourceManager
  ) {
    super()
    this.config = config
    this.stateManager = stateManager
    this.resourceManager = resourceManager
    this.logger = new Logger('LifecycleManager')
  }

  /**
   * Perform graceful agent shutdown with comprehensive state preservation
   */
  async gracefulShutdown(agent: Agent, options: ShutdownOptions = {}): Promise<void> {
    const operationId = this.createOperation(agent.id, 'shutdown')
    const operation = this.activeOperations.get(operationId)!
    
    try {
      this.logger.info(`Starting graceful shutdown for agent ${agent.id}`)
      
      // Phase 1: Prepare shutdown
      await this.executePhase(operation, LifecyclePhase.PREPARING_SHUTDOWN, async () => {
        agent.status = AgentStatus.STOPPING
        
        // Notify extensions of impending shutdown
        for (const extension of agent.extensions) {
          if (typeof (extension as any).prepareShutdown === 'function') {
            await (extension as any).prepareShutdown()
          }
        }
        
        // Stop autonomous behaviors if present
        if ((agent as any).autonomousEngine) {
          await (agent as any).autonomousEngine.pause()
        }
        
        this.emit('shutdown_prepared', { agentId: agent.id })
      })
      
      // Phase 2: Create checkpoint (if enabled)
      if (options.createCheckpoint !== false && this.config.enableCheckpoints) {
        await this.executePhase(operation, LifecyclePhase.CREATING_CHECKPOINT, async () => {
          const checkpointType = options.checkpointType || CheckpointType.FULL
          const snapshot = await this.stateManager.createSnapshot(agent, checkpointType)
          await this.stateManager.saveSnapshot(snapshot)
          
          operation.metadata.checkpointCreated = true
          operation.metadata.checkpointPath = snapshot.agentId
          
          this.emit('checkpoint_created', { agentId: agent.id, checkpointType })
        })
      }
      
      // Phase 3: Cleanup resources
      await this.executePhase(operation, LifecyclePhase.CLEANUP_RESOURCES, async () => {
        // Cleanup agent-specific resources
        const cleanupResult = await this.resourceManager.cleanupAgentResources(agent.id)
        operation.metadata.resourceCleanup = cleanupResult
        
        // Cleanup extensions
        for (const extension of agent.extensions) {
          try {
            if (typeof (extension as any).cleanup === 'function') {
              await (extension as any).cleanup()
            }
          } catch (error) {
            this.logger.error(`Extension cleanup failed for ${extension.name}:`, error)
            operation.errors.push(`Extension cleanup failed: ${extension.name}`)
          }
        }
        
        // Cleanup portals
        if (agent.portals) {
          for (const portal of agent.portals) {
            try {
              if (typeof (portal as any).disconnect === 'function') {
                await (portal as any).disconnect()
              }
            } catch (error) {
              this.logger.error(`Portal disconnect failed:`, error)
              operation.errors.push('Portal disconnect failed')
            }
          }
        }
        
        this.emit('resources_cleaned', { agentId: agent.id })
      })
      
      // Phase 4: Finalize shutdown
      await this.executePhase(operation, LifecyclePhase.FINALIZING_SHUTDOWN, async () => {
        agent.status = AgentStatus.IDLE
        
        // Final memory sync if requested
        if (options.saveMemories !== false) {
          try {
            // Force any pending memory writes
            if (agent.memory && typeof (agent.memory as any).flush === 'function') {
              await (agent.memory as any).flush()
            }
          } catch (error) {
            this.logger.warn(`Memory flush failed during shutdown:`, error)
          }
        }
        
        this.emit('shutdown_finalized', { agentId: agent.id })
      })
      
      operation.phase = LifecyclePhase.STOPPED
      this.logger.info(`Graceful shutdown completed for agent ${agent.id}`)
      this.emit('shutdown_completed', { agentId: agent.id, operation })
      
    } catch (error) {
      operation.phase = LifecyclePhase.SHUTDOWN_FAILED
      operation.errors.push(`Shutdown failed: ${error}`)
      
      this.logger.error(`Graceful shutdown failed for agent ${agent.id}:`, error)
      
      // Attempt emergency cleanup if configured
      if (this.config.cleanupOnShutdownFailure) {
        await this.emergencyCleanup(agent, operation)
      }
      
      this.emit('shutdown_failed', { agentId: agent.id, error, operation })
      throw error
      
    } finally {
      this.activeOperations.delete(operationId)
    }
  }

  /**
   * Perform robust agent startup with state restoration
   */
  async robustStartup(lazyAgent: LazyAgent, options: StartupOptions = {}): Promise<Agent> {
    const operationId = this.createOperation(lazyAgent.id, 'startup')
    const operation = this.activeOperations.get(operationId)!
    let snapshot: any = null // Initialize snapshot variable
    
    try {
      this.logger.info(`Starting robust startup for agent ${lazyAgent.id}`)
      
      // Phase 1: Initialize
      await this.executePhase(operation, LifecyclePhase.INITIALIZING, async () => {
        lazyAgent.state = LazyAgentState.LOADING
        this.emit('startup_initialized', { agentId: lazyAgent.id })
      })
      
      // Phase 2: Load checkpoint (if available and requested)
      let snapshot: AgentStateSnapshot | null = null
      if (options.restoreFromCheckpoint !== false) {
        await this.executePhase(operation, LifecyclePhase.LOADING_CHECKPOINT, async () => {
          snapshot = await this.stateManager.loadSnapshot(lazyAgent.id, options.specificCheckpoint)
          operation.metadata.checkpointLoaded = !!snapshot
          operation.metadata.checkpointTimestamp = snapshot?.timestamp
          
          this.emit('checkpoint_loaded', { agentId: lazyAgent.id, hasSnapshot: !!snapshot })
        })
      }
      
      // Phase 3: Validate state (if snapshot loaded)
      if (snapshot && (options.validateState !== false || this.config.validateStateOnStartup)) {
        await this.executePhase(operation, LifecyclePhase.VALIDATING_STATE, async () => {
          const validation = await this.stateManager.validateSnapshot(snapshot!)
          operation.metadata.validation = validation
          
          if (validation.result === 'corrupted' && !options.fallbackToDefaults) {
            throw new Error(`State validation failed: ${validation.errors.join(', ')}`)
          }
          
          this.emit('state_validated', { agentId: lazyAgent.id, validation })
        })
      }
      
      // Phase 4: Restore resources and create agent
      let agent: Agent
      await this.executePhase(operation, LifecyclePhase.RESTORING_RESOURCES, async () => {
        // Create agent with configuration
        const config = snapshot?.core.agentConfig || lazyAgent.config
        const characterConfig = snapshot?.core.characterConfig || lazyAgent.characterConfig
        
        // This would typically call the existing loadAgent method
        // For now, we'll create a simplified agent structure
        agent = await this.createAgentFromConfig(config, characterConfig, lazyAgent.id)
        
        // Restore state if available
        if (snapshot) {
          await this.restoreAgentState(agent, snapshot)
        }
        
        this.emit('resources_restored', { agentId: lazyAgent.id })
      })
      
      // Phase 5: Activate agent
      await this.executePhase(operation, LifecyclePhase.ACTIVATING, async () => {
        agent!.status = AgentStatus.ACTIVE
        lazyAgent.state = LazyAgentState.ACTIVE
        lazyAgent.agent = agent
        lazyAgent.lastActivated = new Date()
        
        // Initialize extensions
        for (const extension of agent!.extensions) {
          try {
            await extension.init(agent!)
          } catch (error) {
            this.logger.error(`Extension init failed for ${extension.name}:`, error)
            operation.errors.push(`Extension init failed: ${extension.name}`)
          }
        }
        
        this.emit('agent_activated', { agentId: lazyAgent.id })
      })
      
      operation.phase = LifecyclePhase.READY
      this.logger.info(`Robust startup completed for agent ${lazyAgent.id}`)
      this.emit('startup_completed', { agentId: lazyAgent.id, operation })
      
      return agent!
      
    } catch (error) {
      operation.phase = LifecyclePhase.STARTUP_FAILED
      operation.errors.push(`Startup failed: ${error}`)
      
      this.logger.error(`Robust startup failed for agent ${lazyAgent.id}:`, error)
      
      // Attempt rollback if configured
      if (this.config.enableRollback && snapshot) {
        await this.attemptRollback(lazyAgent, operation, snapshot)
      }
      
      this.emit('startup_failed', { agentId: lazyAgent.id, error, operation })
      throw error
      
    } finally {
      this.activeOperations.delete(operationId)
    }
  }

  /**
   * Restart agent with full shutdown/startup cycle
   */
  async restartAgent(agent: Agent, shutdownOptions: ShutdownOptions = {}, startupOptions: StartupOptions = {}): Promise<Agent> {
    const operationId = this.createOperation(agent.id, 'restart')
    
    try {
      this.logger.info(`Restarting agent ${agent.id}`)
      
      // Create lazy agent from current agent
      const lazyAgent: LazyAgent = {
        id: agent.id,
        character_id: agent.character_id,
        name: agent.name,
        state: LazyAgentState.ACTIVE,
        config: agent.config,
        characterConfig: agent.characterConfig,
        lastActivated: new Date(),
        agent: agent,
        priority: 5,
        lazyMetrics: {
          activationCount: 1,
          lastActivationTime: new Date(),
          averageActiveTime: 0,
          memoryUsage: 0
        }
      }
      
      // Graceful shutdown
      await this.gracefulShutdown(agent, {
        ...shutdownOptions,
        createCheckpoint: true,
        checkpointType: CheckpointType.FULL
      })
      
      // Robust startup
      const newAgent = await this.robustStartup(lazyAgent, {
        ...startupOptions,
        restoreFromCheckpoint: true
      })
      
      this.logger.info(`Agent restart completed for ${agent.id}`)
      this.emit('restart_completed', { agentId: agent.id })
      
      return newAgent
      
    } catch (error) {
      this.logger.error(`Agent restart failed for ${agent.id}:`, error)
      this.emit('restart_failed', { agentId: agent.id, error })
      throw error
      
    } finally {
      this.activeOperations.delete(operationId)
    }
  }

  /**
   * Get current lifecycle operations
   */
  getActiveOperations(): LifecycleOperation[] {
    return Array.from(this.activeOperations.values())
  }

  /**
   * Get operation status for specific agent
   */
  getAgentOperation(agentId: string): LifecycleOperation | undefined {
    return Array.from(this.activeOperations.values()).find(op => op.agentId === agentId)
  }

  // Private helper methods

  private createOperation(agentId: string, type: 'shutdown' | 'startup' | 'restart'): string {
    const operationId = `${type}_${agentId}_${++this.operationCounter}_${Date.now()}`
    
    const operation: LifecycleOperation = {
      id: operationId,
      agentId,
      type,
      phase: type === 'shutdown' ? LifecyclePhase.PREPARING_SHUTDOWN : LifecyclePhase.INITIALIZING,
      startTime: new Date(),
      lastUpdate: new Date(),
      timeout: type === 'shutdown' ? this.config.shutdownTimeoutMs : this.config.startupTimeoutMs,
      metadata: {},
      errors: []
    }
    
    this.activeOperations.set(operationId, operation)
    return operationId
  }

  private async executePhase(
    operation: LifecycleOperation,
    phase: LifecyclePhase,
    execution: () => Promise<void>
  ): Promise<void> {
    operation.phase = phase
    operation.lastUpdate = new Date()
    
    this.logger.debug(`Executing phase ${phase} for agent ${operation.agentId}`)
    this.emit('phase_started', { operation, phase })
    
    try {
      await execution()
      this.emit('phase_completed', { operation, phase })
    } catch (error) {
      this.emit('phase_failed', { operation, phase, error })
      throw error
    }
  }

  private async emergencyCleanup(agent: Agent, operation: LifecycleOperation): Promise<void> {
    this.logger.warn(`Performing emergency cleanup for agent ${agent.id}`)
    
    try {
      // Force resource cleanup
      await this.resourceManager.cleanupAgentResources(agent.id)
      
      // Create emergency checkpoint if possible
      if (this.config.enableCheckpoints) {
        try {
          const snapshot = await this.stateManager.createSnapshot(agent, CheckpointType.EMERGENCY)
          await this.stateManager.saveSnapshot(snapshot)
        } catch (error) {
          this.logger.error('Emergency checkpoint failed:', error)
        }
      }
      
      operation.metadata.emergencyCleanup = true
      
    } catch (error) {
      this.logger.error('Emergency cleanup failed:', error)
    }
  }

  private async createAgentFromConfig(config: any, characterConfig: any, agentId: string): Promise<Agent> {
    // This is a simplified implementation
    // In practice, this would call the existing runtime.loadAgent method
    throw new Error('createAgentFromConfig not implemented - should call runtime.loadAgent')
  }

  private async restoreAgentState(agent: Agent, snapshot: AgentStateSnapshot): Promise<void> {
    // Restore emotion state
    if (snapshot.cognitive.emotionState) {
      agent.emotion.setEmotion(
        snapshot.cognitive.emotionState.current,
        snapshot.cognitive.emotionState.intensity,
        snapshot.cognitive.emotionState.triggers
      )
    }
    
    // Restore memories would be handled by the memory provider
    // Extension states would be restored by calling extension.restoreState() if available
    
    this.logger.info(`State restored for agent ${agent.id}`)
  }

  private async attemptRollback(
    lazyAgent: LazyAgent,
    operation: LifecycleOperation,
    snapshot: AgentStateSnapshot
  ): Promise<void> {
    operation.phase = LifecyclePhase.ROLLBACK_IN_PROGRESS
    
    try {
      this.logger.warn(`Attempting rollback for agent ${lazyAgent.id}`)
      
      // Rollback logic would depend on what failed
      // Could involve restoring from an earlier checkpoint
      
      this.emit('rollback_attempted', { agentId: lazyAgent.id })
      
    } catch (error) {
      this.logger.error(`Rollback failed for agent ${lazyAgent.id}:`, error)
      this.emit('rollback_failed', { agentId: lazyAgent.id, error })
    }
  }
}