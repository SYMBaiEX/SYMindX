import { BaseConfig } from '../../../types/common'

export interface ReactiveCognitionConfig extends BaseConfig {
  // Reaction parameters
  reactionThreshold?: number
  quickResponseMode?: boolean
  maxResponseTime?: number
  
  // Stimulus filtering
  priorityStimuli?: string[]
  ignoredStimuli?: string[]
  
  // Learning parameters
  enableLearning?: boolean
  adaptationRate?: number
}