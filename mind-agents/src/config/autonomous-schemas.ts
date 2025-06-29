/**
 * Configuration Schemas and Validation for Autonomous AI Modules
 * 
 * Provides JSON schema definitions and validation functions for all
 * autonomous AI module configurations.
 */

import {
  LearningConfig,
  SelfManagementConfig,
  GoalSystemConfig,
  AutonomousConfig
} from '../types/autonomous.js'
import { Logger } from '../utils/logger.js'

/**
 * JSON Schema for Learning Module Configuration
 */
export const LEARNING_CONFIG_SCHEMA = {
  type: 'object',
  required: ['algorithm', 'learningRate', 'discountFactor', 'explorationRate', 'experienceReplaySize', 'batchSize'],
  properties: {
    algorithm: {
      type: 'string',
      enum: ['q_learning', 'sarsa', 'deep_q', 'policy_gradient', 'actor_critic']
    },
    learningRate: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    discountFactor: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    explorationRate: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    experienceReplaySize: {
      type: 'number',
      minimum: 1
    },
    batchSize: {
      type: 'number',
      minimum: 1
    },
    targetUpdateFrequency: {
      type: 'number',
      minimum: 1
    },
    curiosityWeight: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    modelSavePath: {
      type: 'string'
    }
  },
  additionalProperties: false
}

/**
 * JSON Schema for Self-Management Configuration
 */
export const SELF_MANAGEMENT_CONFIG_SCHEMA = {
  type: 'object',
  required: ['adaptationEnabled', 'learningRate', 'performanceThreshold', 'adaptationTriggers', 'selfHealingEnabled', 'diagnosticsInterval'],
  properties: {
    adaptationEnabled: {
      type: 'boolean'
    },
    learningRate: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    performanceThreshold: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    adaptationTriggers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'condition', 'threshold', 'action'],
        properties: {
          type: {
            type: 'string',
            enum: ['performance', 'error_rate', 'resource_usage', 'external_signal']
          },
          condition: {
            type: 'string'
          },
          threshold: {
            type: 'number'
          },
          action: {
            type: 'object',
            required: ['type', 'parameters', 'description'],
            properties: {
              type: {
                type: 'string',
                enum: ['parameter_adjustment', 'strategy_change', 'resource_reallocation', 'capability_enhancement']
              },
              parameters: {
                type: 'object'
              },
              description: {
                type: 'string'
              }
            }
          }
        }
      }
    },
    selfHealingEnabled: {
      type: 'boolean'
    },
    diagnosticsInterval: {
      type: 'number',
      minimum: 1000
    }
  },
  additionalProperties: false
}

/**
 * JSON Schema for Goal System Configuration
 */
export const GOAL_SYSTEM_CONFIG_SCHEMA = {
  type: 'object',
  required: ['maxActiveGoals', 'goalGenerationInterval', 'curiosityThreshold', 'conflictResolutionStrategy', 'planningHorizon', 'adaptationRate', 'curiosityDrivers'],
  properties: {
    maxActiveGoals: {
      type: 'number',
      minimum: 1
    },
    goalGenerationInterval: {
      type: 'number',
      minimum: 1000
    },
    curiosityThreshold: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    conflictResolutionStrategy: {
      type: 'string',
      enum: ['priority', 'resource_sharing', 'temporal_scheduling', 'goal_modification', 'goal_abandonment']
    },
    planningHorizon: {
      type: 'number',
      minimum: 1
    },
    adaptationRate: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    curiosityDrivers: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'weight', 'threshold', 'enabled'],
        properties: {
          type: {
            type: 'string',
            enum: ['novelty', 'surprise', 'uncertainty', 'complexity', 'knowledge_gap']
          },
          weight: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          threshold: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          enabled: {
            type: 'boolean'
          }
        }
      }
    }
  },
  additionalProperties: false
}

/**
 * JSON Schema for complete Autonomous Configuration
 */
export const AUTONOMOUS_CONFIG_SCHEMA = {
  type: 'object',
  required: ['learning', 'selfManagement', 'goalSystem', 'resourceManagement', 'metaCognition'],
  properties: {
    learning: LEARNING_CONFIG_SCHEMA,
    selfManagement: SELF_MANAGEMENT_CONFIG_SCHEMA,
    goalSystem: GOAL_SYSTEM_CONFIG_SCHEMA,
    resourceManagement: {
      type: 'object',
      required: ['enabled', 'monitoringInterval', 'allocationStrategy', 'optimizationGoals'],
      properties: {
        enabled: {
          type: 'boolean'
        },
        monitoringInterval: {
          type: 'number',
          minimum: 1000
        },
        allocationStrategy: {
          type: 'string',
          enum: ['static', 'dynamic', 'predictive']
        },
        optimizationGoals: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    },
    metaCognition: {
      type: 'object',
      required: ['enabled', 'selfEvaluationInterval', 'strategyAdaptationEnabled', 'performanceMonitoringEnabled'],
      properties: {
        enabled: {
          type: 'boolean'
        },
        selfEvaluationInterval: {
          type: 'number',
          minimum: 1000
        },
        strategyAdaptationEnabled: {
          type: 'boolean'
        },
        performanceMonitoringEnabled: {
          type: 'boolean'
        }
      }
    }
  },
  additionalProperties: false
}

/**
 * Validation functions
 */
export class AutonomousConfigValidator {
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /**
   * Validate learning configuration
   */
  validateLearningConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.algorithm) {
      errors.push('Algorithm is required')
    } else if (!['q_learning', 'sarsa', 'deep_q', 'policy_gradient', 'actor_critic'].includes(config.algorithm)) {
      errors.push('Invalid algorithm')
    }

    if (typeof config.learningRate !== 'number' || config.learningRate < 0 || config.learningRate > 1) {
      errors.push('Learning rate must be between 0 and 1')
    }

    if (typeof config.discountFactor !== 'number' || config.discountFactor < 0 || config.discountFactor > 1) {
      errors.push('Discount factor must be between 0 and 1')
    }

    if (typeof config.explorationRate !== 'number' || config.explorationRate < 0 || config.explorationRate > 1) {
      errors.push('Exploration rate must be between 0 and 1')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate self-management configuration
   */
  validateSelfManagementConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (typeof config.adaptationEnabled !== 'boolean') {
      errors.push('Adaptation enabled must be boolean')
    }

    if (typeof config.learningRate !== 'number' || config.learningRate < 0 || config.learningRate > 1) {
      errors.push('Learning rate must be between 0 and 1')
    }

    if (typeof config.performanceThreshold !== 'number' || config.performanceThreshold < 0 || config.performanceThreshold > 1) {
      errors.push('Performance threshold must be between 0 and 1')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate goal system configuration
   */
  validateGoalSystemConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (typeof config.maxActiveGoals !== 'number' || config.maxActiveGoals < 1) {
      errors.push('Max active goals must be a positive number')
    }

    if (typeof config.goalGenerationInterval !== 'number' || config.goalGenerationInterval < 1000) {
      errors.push('Goal generation interval must be at least 1000ms')
    }

    if (typeof config.curiosityThreshold !== 'number' || config.curiosityThreshold < 0 || config.curiosityThreshold > 1) {
      errors.push('Curiosity threshold must be between 0 and 1')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validate complete autonomous configuration
   */
  validateAutonomousConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate learning config
    if (!config.learning) {
      errors.push('Learning configuration is required')
    } else {
      const learningResult = this.validateLearningConfig(config.learning)
      errors.push(...learningResult.errors.map(e => `Learning: ${e}`))
    }

    // Validate self-management config
    if (!config.selfManagement) {
      errors.push('Self-management configuration is required')
    } else {
      const selfMgmtResult = this.validateSelfManagementConfig(config.selfManagement)
      errors.push(...selfMgmtResult.errors.map(e => `Self-management: ${e}`))
    }

    // Validate goal system config
    if (!config.goalSystem) {
      errors.push('Goal system configuration is required')
    } else {
      const goalResult = this.validateGoalSystemConfig(config.goalSystem)
      errors.push(...goalResult.errors.map(e => `Goal system: ${e}`))
    }

    return { valid: errors.length === 0, errors }
  }
}

/**
 * Default configurations
 */
export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  algorithm: 'actor_critic',
  learningRate: 0.001,
  discountFactor: 0.99,
  explorationRate: 0.1,
  experienceReplaySize: 10000,
  batchSize: 32,
  targetUpdateFrequency: 1000,
  curiosityWeight: 0.1
}

export const DEFAULT_SELF_MANAGEMENT_CONFIG: SelfManagementConfig = {
  adaptationEnabled: true,
  learningRate: 0.01,
  performanceThreshold: 0.8,
  adaptationTriggers: [
    {
      type: 'performance',
      condition: 'accuracy < threshold',
      threshold: 0.7,
      action: {
        type: 'parameter_adjustment',
        parameters: { learningRate: 1.1 },
        description: 'Increase learning rate'
      }
    }
  ],
  selfHealingEnabled: true,
  diagnosticsInterval: 60000
}

export const DEFAULT_GOAL_SYSTEM_CONFIG: GoalSystemConfig = {
  maxActiveGoals: 5,
  goalGenerationInterval: 30000,
  curiosityThreshold: 0.6,
  conflictResolutionStrategy: 'priority',
  planningHorizon: 10,
  adaptationRate: 0.1,
  curiosityDrivers: [
    {
      type: 'novelty',
      weight: 0.3,
      threshold: 0.5,
      enabled: true
    },
    {
      type: 'surprise',
      weight: 0.2,
      threshold: 0.6,
      enabled: true
    },
    {
      type: 'uncertainty',
      weight: 0.2,
      threshold: 0.4,
      enabled: true
    },
    {
      type: 'complexity',
      weight: 0.15,
      threshold: 0.5,
      enabled: true
    },
    {
      type: 'knowledge_gap',
      weight: 0.15,
      threshold: 0.3,
      enabled: true
    }
  ]
}

export const DEFAULT_AUTONOMOUS_CONFIG: AutonomousConfig = {
  learning: DEFAULT_LEARNING_CONFIG,
  selfManagement: DEFAULT_SELF_MANAGEMENT_CONFIG,
  goalSystem: DEFAULT_GOAL_SYSTEM_CONFIG,
  resourceManagement: {
    enabled: true,
    monitoringInterval: 5000,
    allocationStrategy: 'dynamic',
    optimizationGoals: ['performance', 'efficiency', 'reliability']
  },
  metaCognition: {
    enabled: true,
    selfEvaluationInterval: 60000,
    strategyAdaptationEnabled: true,
    performanceMonitoringEnabled: true
  }
}