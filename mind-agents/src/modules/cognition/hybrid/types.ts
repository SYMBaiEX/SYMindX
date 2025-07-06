import { BaseConfig } from '../../../types/common'

export interface HybridCognitionConfig extends BaseConfig {
  // Mode balancing
  reactiveWeight?: number  // 0-1, how much to favor reactive responses
  planningWeight?: number  // 0-1, how much to favor planning responses
  
  // Context switching
  complexityThreshold?: number  // When to switch from reactive to planning
  urgencyThreshold?: number     // When to prioritize reactive over planning
  
  // Performance tuning
  maxPlanningTime?: number     // Max time to spend planning
  fallbackToReactive?: boolean // Fallback if planning fails
  
  // Learning and adaptation
  enableAdaptation?: boolean   // Learn from successful approaches
  adaptationRate?: number      // How quickly to adapt weights
  
  // Context analysis
  contextAnalysisDepth?: 'shallow' | 'moderate' | 'deep'
  enableContextCaching?: boolean
}