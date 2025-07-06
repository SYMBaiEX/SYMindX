/**
 * State Recovery System for Agent Lifecycle Management
 * Provides comprehensive state validation and recovery procedures
 */

import { Agent, LazyAgent, AgentConfig } from '../types/agent'
import { StateManager, AgentStateSnapshot, StateValidationResult } from './state-manager'
import { ResourceManager } from './resource-manager'
import { Logger } from '../utils/logger'
import { EventEmitter } from 'events'

export interface RecoveryStrategy {
  name: string
  description: string
  priority: number
  canRecover: (corruption: StateCorruption) => boolean
  recover: (snapshot: AgentStateSnapshot, corruption: StateCorruption) => Promise<AgentStateSnapshot>
}

export interface StateCorruption {
  type: CorruptionType
  severity: CorruptionSeverity
  affectedComponents: string[]
  description: string
  recoverable: boolean
  metadata: any
}

export enum CorruptionType {
  SCHEMA_MISMATCH = 'schema_mismatch',
  MISSING_DATA = 'missing_data',
  INTEGRITY_FAILURE = 'integrity_failure',
  DEPENDENCY_MISSING = 'dependency_missing',
  TEMPORAL_INCONSISTENCY = 'temporal_inconsistency',
  RESOURCE_UNAVAILABLE = 'resource_unavailable',
  MEMORY_CORRUPTION = 'memory_corruption',
  EXTENSION_FAILURE = 'extension_failure'
}

export enum CorruptionSeverity {
  MINOR = 'minor',      // Can be automatically fixed
  MODERATE = 'moderate', // Requires user intervention but recoverable
  SEVERE = 'severe',     // Major data loss but agent can still function
  CRITICAL = 'critical'  // Complete state corruption, requires full reset
}

export interface RecoveryPlan {
  corruption: StateCorruption
  strategies: RecoveryStrategy[]
  estimatedDataLoss: number // 0-1 scale
  requiresUserConsent: boolean
  fallbackOptions: string[]
}

export interface RecoveryResult {
  success: boolean
  strategy: string
  recoveredSnapshot?: AgentStateSnapshot
  dataLoss: number
  warnings: string[]
  errors: string[]
}

export class StateRecoverySystem extends EventEmitter {
  private logger: Logger
  private stateManager: StateManager
  private resourceManager: ResourceManager
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()

  constructor(stateManager: StateManager, resourceManager: ResourceManager) {
    super()
    this.stateManager = stateManager
    this.resourceManager = resourceManager
    this.logger = new Logger('StateRecoverySystem')
    
    this.registerDefaultStrategies()
  }

  /**
   * Analyze state corruption and create recovery plan
   */
  async analyzeCorruption(snapshot: AgentStateSnapshot): Promise<RecoveryPlan> {
    const corruptions = await this.detectCorruptions(snapshot)
    
    if (corruptions.length === 0) {
      throw new Error('No corruption detected in snapshot')
    }
    
    // Use the most severe corruption as primary
    const primaryCorruption = corruptions.reduce((worst, current) => 
      this.getSeverityScore(current.severity) > this.getSeverityScore(worst.severity) 
        ? current 
        : worst
    )
    
    const applicableStrategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.canRecover(primaryCorruption))
      .sort((a, b) => b.priority - a.priority)
    
    const estimatedDataLoss = this.estimateDataLoss(primaryCorruption, snapshot)
    const requiresUserConsent = primaryCorruption.severity === CorruptionSeverity.SEVERE ||
                               primaryCorruption.severity === CorruptionSeverity.CRITICAL ||
                               estimatedDataLoss > 0.3
    
    const fallbackOptions = this.generateFallbackOptions(primaryCorruption)
    
    const plan: RecoveryPlan = {
      corruption: primaryCorruption,
      strategies: applicableStrategies,
      estimatedDataLoss,
      requiresUserConsent,
      fallbackOptions
    }
    
    this.logger.info(`Recovery plan created for agent ${snapshot.agentId}`, {
      corruption: primaryCorruption.type,
      severity: primaryCorruption.severity,
      strategies: applicableStrategies.length,
      dataLoss: estimatedDataLoss
    })
    
    this.emit('recovery_plan_created', { agentId: snapshot.agentId, plan })
    
    return plan
  }

  /**
   * Execute recovery plan
   */
  async executeRecovery(plan: RecoveryPlan, snapshot: AgentStateSnapshot): Promise<RecoveryResult> {
    this.logger.info(`Executing recovery for agent ${snapshot.agentId}`, {
      corruption: plan.corruption.type,
      strategies: plan.strategies.length
    })
    
    for (const strategy of plan.strategies) {
      try {
        this.logger.debug(`Attempting recovery strategy: ${strategy.name}`)
        
        const recoveredSnapshot = await strategy.recover(snapshot, plan.corruption)
        
        // Validate recovered snapshot
        const validation = await this.stateManager.validateSnapshot(recoveredSnapshot)
        
        if (validation.result === StateValidationResult.VALID || 
            validation.result === StateValidationResult.RECOVERABLE) {
          
          const result: RecoveryResult = {
            success: true,
            strategy: strategy.name,
            recoveredSnapshot,
            dataLoss: this.calculateActualDataLoss(snapshot, recoveredSnapshot),
            warnings: validation.warnings,
            errors: []
          }
          
          this.logger.info(`Recovery successful using strategy: ${strategy.name}`)
          this.emit('recovery_completed', { agentId: snapshot.agentId, result })
          
          return result
        }
        
      } catch (error) {
        this.logger.warn(`Recovery strategy ${strategy.name} failed:`, error)
        continue
      }
    }
    
    // All strategies failed
    const result: RecoveryResult = {
      success: false,
      strategy: 'none',
      dataLoss: 1.0,
      warnings: [],
      errors: ['All recovery strategies failed']
    }
    
    this.logger.error(`Recovery failed for agent ${snapshot.agentId}`)
    this.emit('recovery_failed', { agentId: snapshot.agentId, result })
    
    return result
  }

  /**
   * Create emergency fallback agent state
   */
  async createFallbackState(agentId: string, originalConfig?: AgentConfig): Promise<AgentStateSnapshot> {
    this.logger.warn(`Creating fallback state for agent ${agentId}`)
    
    const now = new Date()
    
    const fallbackSnapshot: AgentStateSnapshot = {
      agentId,
      timestamp: now,
      version: '1.0.0',
      
      core: {
        name: `${agentId}_recovered`,
        status: 'idle' as any,
        characterConfig: originalConfig || {},
        agentConfig: originalConfig || {} as any,
        lastUpdate: now
      },
      
      cognitive: {
        emotionState: {
          current: 'neutral',
          intensity: 0.5,
          triggers: [],
          history: [],
          timestamp: now
        },
        recentMemories: [],
        currentThoughts: undefined,
        decisionContext: undefined
      },
      
      autonomous: undefined,
      
      communication: {
        activeConversations: [],
        extensionStates: {},
        portalStates: {}
      },
      
      resources: {
        memoryUsage: 0,
        connections: [],
        fileHandles: [],
        timers: []
      },
      
      metadata: {
        checkpointType: 'emergency' as any,
        integrity: '',
        dependencies: [],
        recoveryData: {
          reason: 'fallback_state_creation',
          originalAgent: agentId,
          dataLoss: 1.0
        }
      }
    }
    
    // Calculate integrity
    fallbackSnapshot.metadata.integrity = this.calculateIntegrity(fallbackSnapshot)
    
    this.logger.info(`Fallback state created for agent ${agentId}`)
    this.emit('fallback_state_created', { agentId, snapshot: fallbackSnapshot })
    
    return fallbackSnapshot
  }

  /**
   * Validate agent dependencies are available
   */
  async validateDependencies(snapshot: AgentStateSnapshot): Promise<DependencyValidation> {
    const validation: DependencyValidation = {
      valid: true,
      missing: [],
      warnings: []
    }
    
    // Check memory provider
    const memoryType = snapshot.core.agentConfig?.psyche?.defaults?.memory
    if (memoryType && !this.isMemoryProviderAvailable(memoryType)) {
      validation.valid = false
      validation.missing.push(`memory_provider:${memoryType}`)
    }
    
    // Check extensions
    const extensions = snapshot.communication.extensionStates
    for (const extensionId of Object.keys(extensions)) {
      if (!this.isExtensionAvailable(extensionId)) {
        validation.warnings.push(`extension:${extensionId}`)
      }
    }
    
    // Check portals
    const portals = snapshot.communication.portalStates
    for (const portalId of Object.keys(portals)) {
      if (!this.isPortalAvailable(portalId)) {
        validation.warnings.push(`portal:${portalId}`)
      }
    }
    
    return validation
  }

  /**
   * Register custom recovery strategy
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.name, strategy)
    this.logger.info(`Registered recovery strategy: ${strategy.name}`)
  }

  // Private methods

  private async detectCorruptions(snapshot: AgentStateSnapshot): Promise<StateCorruption[]> {
    const corruptions: StateCorruption[] = []
    
    // Schema validation
    if (!this.validateSchema(snapshot)) {
      corruptions.push({
        type: CorruptionType.SCHEMA_MISMATCH,
        severity: CorruptionSeverity.MODERATE,
        affectedComponents: ['schema'],
        description: 'Snapshot schema does not match expected format',
        recoverable: true,
        metadata: { version: snapshot.version }
      })
    }
    
    // Integrity check
    const expectedIntegrity = this.calculateIntegrity({
      ...snapshot,
      metadata: { ...snapshot.metadata, integrity: '' }
    })
    
    if (snapshot.metadata.integrity !== expectedIntegrity) {
      corruptions.push({
        type: CorruptionType.INTEGRITY_FAILURE,
        severity: CorruptionSeverity.SEVERE,
        affectedComponents: ['all'],
        description: 'State integrity check failed',
        recoverable: true,
        metadata: { expected: expectedIntegrity, actual: snapshot.metadata.integrity }
      })
    }
    
    // Missing data validation
    if (!snapshot.core || !snapshot.cognitive) {
      corruptions.push({
        type: CorruptionType.MISSING_DATA,
        severity: CorruptionSeverity.CRITICAL,
        affectedComponents: ['core', 'cognitive'],
        description: 'Essential data components missing',
        recoverable: false,
        metadata: {}
      })
    }
    
    // Dependency validation
    const depValidation = await this.validateDependencies(snapshot)
    if (!depValidation.valid) {
      corruptions.push({
        type: CorruptionType.DEPENDENCY_MISSING,
        severity: CorruptionSeverity.MODERATE,
        affectedComponents: ['dependencies'],
        description: 'Required dependencies not available',
        recoverable: true,
        metadata: { missing: depValidation.missing }
      })
    }
    
    // Temporal validation
    const age = Date.now() - new Date(snapshot.timestamp).getTime()
    if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days
      corruptions.push({
        type: CorruptionType.TEMPORAL_INCONSISTENCY,
        severity: CorruptionSeverity.MINOR,
        affectedComponents: ['timestamp'],
        description: 'Snapshot is very old',
        recoverable: true,
        metadata: { age: age / (24 * 60 * 60 * 1000) } // days
      })
    }
    
    return corruptions
  }

  private registerDefaultStrategies(): void {
    // Schema migration strategy
    this.registerRecoveryStrategy({
      name: 'schema_migration',
      description: 'Migrate snapshot to current schema version',
      priority: 10,
      canRecover: (corruption) => corruption.type === CorruptionType.SCHEMA_MISMATCH,
      recover: async (snapshot, corruption) => {
        // Implement schema migration logic
        return this.migrateSchema(snapshot)
      }
    })
    
    // Integrity repair strategy
    this.registerRecoveryStrategy({
      name: 'integrity_repair',
      description: 'Repair integrity by recalculating hash',
      priority: 8,
      canRecover: (corruption) => corruption.type === CorruptionType.INTEGRITY_FAILURE,
      recover: async (snapshot, corruption) => {
        const repaired = { ...snapshot }
        repaired.metadata.integrity = this.calculateIntegrity({
          ...repaired,
          metadata: { ...repaired.metadata, integrity: '' }
        })
        return repaired
      }
    })
    
    // Dependency substitution strategy
    this.registerRecoveryStrategy({
      name: 'dependency_substitution',
      description: 'Replace missing dependencies with available alternatives',
      priority: 6,
      canRecover: (corruption) => corruption.type === CorruptionType.DEPENDENCY_MISSING,
      recover: async (snapshot, corruption) => {
        return this.substituteDependencies(snapshot, corruption.metadata.missing)
      }
    })
    
    // Partial data recovery strategy
    this.registerRecoveryStrategy({
      name: 'partial_recovery',
      description: 'Recover valid components and reset corrupted ones',
      priority: 4,
      canRecover: (corruption) => corruption.type === CorruptionType.MISSING_DATA && corruption.severity !== CorruptionSeverity.CRITICAL,
      recover: async (snapshot, corruption) => {
        return this.recoverPartialData(snapshot)
      }
    })
    
    // Last resort strategy
    this.registerRecoveryStrategy({
      name: 'minimal_state',
      description: 'Create minimal functional state',
      priority: 1,
      canRecover: () => true, // Can always create minimal state
      recover: async (snapshot, corruption) => {
        return this.createMinimalState(snapshot)
      }
    })
  }

  private validateSchema(snapshot: AgentStateSnapshot): boolean {
    // Simplified schema validation
    return !!(snapshot.agentId && snapshot.timestamp && snapshot.core && snapshot.cognitive)
  }

  private calculateIntegrity(snapshot: any): string {
    // Same as StateManager implementation
    const crypto = require('crypto')
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(snapshot, Object.keys(snapshot).sort()))
    return hash.digest('hex')
  }

  private getSeverityScore(severity: CorruptionSeverity): number {
    switch (severity) {
      case CorruptionSeverity.MINOR: return 1
      case CorruptionSeverity.MODERATE: return 2
      case CorruptionSeverity.SEVERE: return 3
      case CorruptionSeverity.CRITICAL: return 4
      default: return 0
    }
  }

  private estimateDataLoss(corruption: StateCorruption, snapshot: AgentStateSnapshot): number {
    switch (corruption.severity) {
      case CorruptionSeverity.MINOR: return 0.1
      case CorruptionSeverity.MODERATE: return 0.3
      case CorruptionSeverity.SEVERE: return 0.7
      case CorruptionSeverity.CRITICAL: return 1.0
      default: return 0.5
    }
  }

  private calculateActualDataLoss(original: AgentStateSnapshot, recovered: AgentStateSnapshot): number {
    // Simplified calculation - compare key data structures
    let totalComponents = 0
    let lostComponents = 0
    
    // Check core data
    totalComponents++
    if (!recovered.core || JSON.stringify(recovered.core) !== JSON.stringify(original.core)) {
      lostComponents += 0.5
    }
    
    // Check memories
    totalComponents++
    if (recovered.cognitive.recentMemories.length < original.cognitive.recentMemories.length) {
      const memoryLoss = (original.cognitive.recentMemories.length - recovered.cognitive.recentMemories.length) / original.cognitive.recentMemories.length
      lostComponents += memoryLoss
    }
    
    // Check extensions
    totalComponents++
    const originalExtensions = Object.keys(original.communication.extensionStates).length
    const recoveredExtensions = Object.keys(recovered.communication.extensionStates).length
    if (recoveredExtensions < originalExtensions) {
      lostComponents += (originalExtensions - recoveredExtensions) / originalExtensions
    }
    
    return totalComponents > 0 ? lostComponents / totalComponents : 0
  }

  private generateFallbackOptions(corruption: StateCorruption): string[] {
    const options = ['create_new_agent', 'use_default_configuration']
    
    if (corruption.severity !== CorruptionSeverity.CRITICAL) {
      options.unshift('partial_recovery', 'manual_repair')
    }
    
    return options
  }

  private async migrateSchema(snapshot: AgentStateSnapshot): Promise<AgentStateSnapshot> {
    // Implement schema migration logic based on version
    return snapshot // Simplified for now
  }

  private async substituteDependencies(snapshot: AgentStateSnapshot, missing: string[]): Promise<AgentStateSnapshot> {
    const substituted = { ...snapshot }
    
    for (const dep of missing) {
      if (dep.startsWith('memory_provider:')) {
        // Substitute with default memory provider
        if (substituted.core.agentConfig?.psyche?.defaults) {
          substituted.core.agentConfig.psyche.defaults.memory = 'memory'
        }
      }
    }
    
    return substituted
  }

  private async recoverPartialData(snapshot: AgentStateSnapshot): Promise<AgentStateSnapshot> {
    const recovered = { ...snapshot }
    
    // Reset corrupted components to defaults
    if (!recovered.cognitive) {
      recovered.cognitive = {
        emotionState: {
          current: 'neutral',
          intensity: 0.5,
          triggers: [],
          history: [],
          timestamp: new Date()
        },
        recentMemories: []
      }
    }
    
    return recovered
  }

  private async createMinimalState(snapshot: AgentStateSnapshot): Promise<AgentStateSnapshot> {
    return this.createFallbackState(snapshot.agentId, snapshot.core?.agentConfig)
  }

  private isMemoryProviderAvailable(type: string): boolean {
    // Would check with registry
    return ['memory', 'sqlite'].includes(type)
  }

  private isExtensionAvailable(id: string): boolean {
    // Would check with registry
    return true // Simplified
  }

  private isPortalAvailable(id: string): boolean {
    // Would check with registry
    return true // Simplified
  }
}

export interface DependencyValidation {
  valid: boolean
  missing: string[]
  warnings: string[]
}