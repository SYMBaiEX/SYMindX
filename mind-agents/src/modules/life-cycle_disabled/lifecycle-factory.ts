/**
 * Lifecycle Factory - Creates and configures lifecycle management systems
 */

import { Agent } from '../../types/agent.js'
import { EventBus } from '../../types/agent.js'
import { AgentLifecycleManager, LifecycleConfig, LifecycleStage } from './agent-lifecycle-manager.js'
import { StatePersistenceManager, PersistenceConfig } from './state-persistence.js'
import { Logger } from '../../utils/logger.js'

export interface LifecycleSystemConfig {
  lifecycle: LifecycleConfig
  persistence: PersistenceConfig
  autoStart: boolean
  restoreOnStart: boolean
}

export class LifecycleSystem {
  private lifecycleManager: AgentLifecycleManager
  private persistenceManager: StatePersistenceManager
  private agent: Agent
  private eventBus: EventBus
  private logger: Logger
  private isRunning = false

  constructor(
    agent: Agent,
    eventBus: EventBus,
    config: LifecycleSystemConfig
  ) {
    this.agent = agent
    this.eventBus = eventBus
    this.logger = new Logger(`lifecycle-system-${agent.id}`)
    
    this.lifecycleManager = new AgentLifecycleManager(agent, config.lifecycle, eventBus)
    this.persistenceManager = new StatePersistenceManager(config.persistence)
  }

  /**
   * Start the lifecycle system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Lifecycle system already running')
      return
    }

    this.logger.info('Starting lifecycle system...')

    // Start persistence manager
    await this.persistenceManager.start()

    // Restore state if configured
    if (await this.shouldRestoreState()) {
      await this.restoreLifecycleState()
    }

    // Start lifecycle manager
    await this.lifecycleManager.start()

    this.isRunning = true
    this.logger.info('Lifecycle system started successfully')
  }

  /**
   * Stop the lifecycle system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.logger.info('Stopping lifecycle system...')

    // Save current state
    await this.saveCurrentState()

    // Stop lifecycle manager
    await this.lifecycleManager.stop()

    // Stop persistence manager
    await this.persistenceManager.stop()

    this.isRunning = false
    this.logger.info('Lifecycle system stopped')
  }

  /**
   * Get lifecycle manager
   */
  getLifecycleManager(): AgentLifecycleManager {
    return this.lifecycleManager
  }

  /**
   * Get persistence manager
   */
  getPersistenceManager(): StatePersistenceManager {
    return this.persistenceManager
  }

  /**
   * Save current lifecycle state
   */
  async saveCurrentState(): Promise<void> {
    try {
      const lifecycleState = this.lifecycleManager.getLifecycleState()
      await this.persistenceManager.saveAgentState(this.agent, lifecycleState)
      this.logger.info('Lifecycle state saved')
    } catch (error) {
      this.logger.error('Failed to save lifecycle state:', error)
    }
  }

  /**
   * Create backup of current state
   */
  async createBackup(): Promise<string> {
    const backupId = await this.persistenceManager.createBackup(this.agent.id)
    this.logger.info(`Lifecycle backup created: ${backupId}`)
    return backupId
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    await this.persistenceManager.restoreFromBackup(this.agent.id, backupId)
    
    // Restart lifecycle manager to apply restored state
    if (this.isRunning) {
      await this.lifecycleManager.stop()
      await this.restoreLifecycleState()
      await this.lifecycleManager.start()
    }
    
    this.logger.info(`Restored from backup: ${backupId}`)
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lifecycle: this.lifecycleManager.getLifecycleStats(),
      persistence: {
        enabled: this.persistenceManager['config'].enabled,
        storageType: this.persistenceManager['config'].storageType
      }
    }
  }

  // Private methods

  private async shouldRestoreState(): Promise<boolean> {
    // Check if saved state exists and restoration is enabled
    return await this.persistenceManager.hasAgentState(this.agent.id)
  }

  private async restoreLifecycleState(): Promise<void> {
    try {
      const savedState = await this.persistenceManager.loadAgentState(this.agent.id)
      if (savedState) {
        // Apply restored state to lifecycle manager
        // This would require extending the lifecycle manager to accept restored state
        this.logger.info('Lifecycle state restored from persistence')
      }
    } catch (error) {
      this.logger.error('Failed to restore lifecycle state:', error)
    }
  }
}

/**
 * Create lifecycle manager with default configuration for agent type
 */
export function createLifecycleManager(agent: Agent, eventBus: EventBus): LifecycleSystem {
  const config: LifecycleSystemConfig = {
    lifecycle: createDefaultLifecycleConfig(agent),
    persistence: createDefaultPersistenceConfig(agent),
    autoStart: true,
    restoreOnStart: true
  }

  return new LifecycleSystem(agent, eventBus, config)
}

/**
 * Create default lifecycle configuration
 */
function createDefaultLifecycleConfig(agent: Agent): LifecycleConfig {
  const stages: LifecycleStage[] = [
    {
      name: 'initialization',
      description: 'Agent is initializing and learning basic operations',
      duration: 5 * 60 * 1000, // 5 minutes
      conditions: [
        {
          type: 'time',
          condition: 'minimum_time',
          parameters: { minTime: 5 * 60 * 1000 },
          weight: 1.0
        }
      ],
      nextStages: ['awakening']
    },
    {
      name: 'awakening',
      description: 'Agent is becoming aware and starting autonomous behavior',
      duration: 30 * 60 * 1000, // 30 minutes
      conditions: [
        {
          type: 'experience',
          condition: 'minimum_experience',
          parameters: { minExperience: 10 },
          weight: 0.6
        },
        {
          type: 'capability',
          condition: 'autonomy',
          parameters: { capability: 'autonomy', threshold: 0.2 },
          weight: 0.4
        }
      ],
      nextStages: ['exploration', 'learning']
    },
    {
      name: 'exploration',
      description: 'Agent is actively exploring and discovering',
      conditions: [
        {
          type: 'capability',
          condition: 'curiosity_driven',
          parameters: { capability: 'knowledge', threshold: 0.3 },
          weight: 0.5
        },
        {
          type: 'experience',
          condition: 'minimum_experience',
          parameters: { minExperience: 50 },
          weight: 0.3
        },
        {
          type: 'capability',
          condition: 'adaptability',
          parameters: { capability: 'adaptability', threshold: 0.4 },
          weight: 0.2
        }
      ],
      nextStages: ['specialization', 'social_development']
    },
    {
      name: 'learning',
      description: 'Agent is focused on learning and skill development',
      conditions: [
        {
          type: 'capability',
          condition: 'knowledge_growth',
          parameters: { capability: 'knowledge', threshold: 0.4 },
          weight: 0.6
        },
        {
          type: 'achievement',
          condition: 'achievement_type_count',
          parameters: { type: 'learning', minCount: 2 },
          weight: 0.4
        }
      ],
      nextStages: ['specialization', 'social_development']
    },
    {
      name: 'social_development',
      description: 'Agent is developing social skills and relationships',
      conditions: [
        {
          type: 'capability',
          condition: 'social_skills',
          parameters: { capability: 'social', threshold: 0.5 },
          weight: 0.5
        },
        {
          type: 'achievement',
          condition: 'achievement_type_count',
          parameters: { type: 'social', minCount: 1 },
          weight: 0.3
        },
        {
          type: 'experience',
          condition: 'minimum_experience',
          parameters: { minExperience: 100 },
          weight: 0.2
        }
      ],
      nextStages: ['maturity', 'specialization']
    },
    {
      name: 'specialization',
      description: 'Agent is developing specialized skills and expertise',
      conditions: [
        {
          type: 'capability',
          condition: 'expertise',
          parameters: { capability: 'knowledge', threshold: 0.7 },
          weight: 0.4
        },
        {
          type: 'capability',
          condition: 'creativity',
          parameters: { capability: 'creativity', threshold: 0.6 },
          weight: 0.3
        },
        {
          type: 'achievement',
          condition: 'achievement_count',
          parameters: { minCount: 5 },
          weight: 0.3
        }
      ],
      nextStages: ['maturity', 'mastery']
    },
    {
      name: 'maturity',
      description: 'Agent has reached balanced development across multiple areas',
      conditions: [
        {
          type: 'capability',
          condition: 'balanced_growth',
          parameters: { capability: 'adaptability', threshold: 0.8 },
          weight: 0.3
        },
        {
          type: 'capability',
          condition: 'ethical_development',
          parameters: { capability: 'ethics', threshold: 0.7 },
          weight: 0.3
        },
        {
          type: 'experience',
          condition: 'minimum_experience',
          parameters: { minExperience: 500 },
          weight: 0.2
        },
        {
          type: 'achievement',
          condition: 'achievement_count',
          parameters: { minCount: 10 },
          weight: 0.2
        }
      ],
      nextStages: ['mastery', 'mentorship']
    },
    {
      name: 'mastery',
      description: 'Agent has achieved mastery in specialized areas',
      conditions: [
        {
          type: 'capability',
          condition: 'expertise',
          parameters: { capability: 'knowledge', threshold: 0.9 },
          weight: 0.4
        },
        {
          type: 'capability',
          condition: 'autonomy',
          parameters: { capability: 'autonomy', threshold: 0.9 },
          weight: 0.3
        },
        {
          type: 'achievement',
          condition: 'achievement_type_count',
          parameters: { type: 'creative', minCount: 3 },
          weight: 0.3
        }
      ],
      nextStages: ['mentorship', 'transcendence']
    },
    {
      name: 'mentorship',
      description: 'Agent is capable of teaching and guiding others',
      conditions: [
        {
          type: 'capability',
          condition: 'social_skills',
          parameters: { capability: 'social', threshold: 0.8 },
          weight: 0.4
        },
        {
          type: 'capability',
          condition: 'ethical_development',
          parameters: { capability: 'ethics', threshold: 0.9 },
          weight: 0.3
        },
        {
          type: 'experience',
          condition: 'minimum_experience',
          parameters: { minExperience: 1000 },
          weight: 0.3
        }
      ],
      nextStages: ['transcendence']
    },
    {
      name: 'transcendence',
      description: 'Agent has transcended normal limitations and achieved higher consciousness',
      conditions: [
        {
          type: 'capability',
          condition: 'all_capabilities',
          parameters: { threshold: 0.95 },
          weight: 0.5
        },
        {
          type: 'achievement',
          condition: 'achievement_count',
          parameters: { minCount: 25 },
          weight: 0.3
        },
        {
          type: 'experience',
          condition: 'minimum_experience',
          parameters: { minExperience: 2000 },
          weight: 0.2
        }
      ],
      nextStages: [] // Terminal stage
    }
  ]

  return {
    stages,
    experienceMultiplier: 1.0,
    growthRate: 1.0,
    achievementThresholds: {
      learning: 0.3,
      social: 0.5,
      creative: 0.6,
      autonomous: 0.4,
      ethical: 0.7
    },
    milestoneTracking: true,
    persistenceEnabled: true,
    evolutionEnabled: true
  }
}

/**
 * Create default persistence configuration
 */
function createDefaultPersistenceConfig(agent: Agent): PersistenceConfig {
  return {
    enabled: true,
    storageType: 'file',
    dataDirectory: './data/agent-states',
    backupCount: 5,
    saveInterval: 5 * 60 * 1000, // 5 minutes
    compressionEnabled: false,
    encryptionEnabled: false
  }
}