/**
 * Reinforcement Learning Integration for SYMindX Cognition
 * 
 * Implements Q-learning and policy gradient methods for adaptive
 * agent behavior and continuous learning from experience.
 */

import { 
  Agent, 
  ThoughtContext, 
  ThoughtResult, 
  Plan, 
  Decision,
  AgentAction,
  ActionCategory,
  ActionStatus,
  PlanStep,
  PlanStepStatus,
  MemoryRecord
} from '../../types/agent'
import { 
  CognitionModule,
  CognitionModuleMetadata,
  LearningCapability,
  ReasoningPerformance,
  HybridReasoningConfig,
  ReasoningParadigm
} from '../../types/cognition'
import { 
  Experience, 
  RewardSignal, 
  AgentStateVector,
  RewardSignalType
} from '../../types/autonomous'
import { BaseConfig } from '../../types/common'
import { MemoryType, MemoryDuration } from '../../types/enums'
import { runtimeLogger } from '../../utils/logger'

/**
 * Q-Learning implementation
 */
export class QLearningAgent {
  private qTable: Map<string, Map<string, number>> = new Map()
  private learningRate: number
  private discountFactor: number
  public explorationRate: number  // Make public so it can be accessed
  private minExplorationRate: number = 0.01
  private explorationDecay: number = 0.995
  
  constructor(learningRate: number = 0.1, discountFactor: number = 0.95, explorationRate: number = 0.1) {
    this.learningRate = learningRate
    this.discountFactor = discountFactor
    this.explorationRate = explorationRate
  }
  
  /**
   * Get Q-value for state-action pair
   */
  getQValue(state: string, action: string): number {
    const stateActions = this.qTable.get(state)
    if (!stateActions) {
      this.qTable.set(state, new Map())
      return 0
    }
    return stateActions.get(action) || 0
  }
  
  /**
   * Update Q-value using Q-learning update rule
   */
  updateQValue(state: string, action: string, reward: number, nextState: string, possibleActions: string[]): void {
    const currentQ = this.getQValue(state, action)
    const maxNextQ = Math.max(...possibleActions.map(a => this.getQValue(nextState, a)))
    
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ)
    
    const stateActions = this.qTable.get(state) || new Map()
    stateActions.set(action, newQ)
    this.qTable.set(state, stateActions)
  }
  
  /**
   * Select action using epsilon-greedy policy
   */
  selectAction(state: string, actions: string[]): string {
    if (Math.random() < this.explorationRate) {
      // Explore: random action
      return actions[Math.floor(Math.random() * actions.length)]
    } else {
      // Exploit: best known action
      const qValues = actions.map(action => ({ action, q: this.getQValue(state, action) }))
      const bestAction = qValues.reduce((best, current) => current.q > best.q ? current : best)
      return bestAction.action
    }
  }
  
  /**
   * Decay exploration rate
   */
  decayExploration(): void {
    this.explorationRate = Math.max(this.minExplorationRate, this.explorationRate * this.explorationDecay)
  }
  
  /**
   * Get current policy (best actions for each state)
   */
  getPolicy(): Map<string, string> {
    const policy = new Map<string, string>()
    
    for (const [state, actions] of this.qTable) {
      let bestAction = ''
      let bestQ = -Infinity
      
      for (const [action, q] of actions) {
        if (q > bestQ) {
          bestQ = q
          bestAction = action
        }
      }
      
      if (bestAction) {
        policy.set(state, bestAction)
      }
    }
    
    return policy
  }
}

/**
 * State representation for RL
 */
export class StateRepresentation {
  /**
   * Convert agent context to state vector
   */
  static contextToState(agent: Agent, context: ThoughtContext): AgentStateVector {
    const features: Record<string, number> = {}
    
    // Agent features
    features['agent_status'] = this.encodeStatus(agent.status)
    features['has_goal'] = context.goal ? 1 : 0
    features['event_count'] = context.events.length
    features['memory_count'] = context.memories?.length || 0
    
    // Message features
    const messageEvents = context.events.filter(e => e.data?.message)
    features['has_message'] = messageEvents.length > 0 ? 1 : 0
    features['message_is_question'] = messageEvents.some(e => 
      typeof e.data?.message === 'string' && e.data.message.includes('?')
    ) ? 1 : 0
    features['message_length'] = messageEvents.length > 0 ? 
      (messageEvents[0].data?.message as string || '').length / 100 : 0
    
    // Emotional state features
    if (agent.emotion && agent.emotion.getCurrentState) {
      const emotionState = agent.emotion.getCurrentState()
      features['emotion_intensity'] = emotionState.intensity
    }
    
    // Time features
    const now = Date.now()
    features['time_of_day'] = (now % 86400000) / 86400000 // 0-1 for 24 hours
    features['recent_activity'] = context.events.filter(e => 
      now - e.timestamp.getTime() < 60000
    ).length
    
    return {
      id: `state_${Date.now()}`,
      agentId: agent.id,
      timestamp: new Date(),
      features,
      context: {
        goal: context.goal,
        eventTypes: context.events.map(e => e.type)
      }
    }
  }
  
  /**
   * Convert state vector to string key
   */
  static stateToKey(state: AgentStateVector): string {
    const discretizedFeatures: string[] = []
    
    for (const [key, value] of Object.entries(state.features)) {
      const discretized = Math.round(value * 10) / 10 // Round to 1 decimal
      discretizedFeatures.push(`${key}:${discretized}`)
    }
    
    return discretizedFeatures.join('|')
  }
  
  /**
   * Encode agent status as number
   */
  private static encodeStatus(status: string): number {
    const statusMap: Record<string, number> = {
      'active': 1.0,
      'idle': 0.5,
      'thinking': 0.8,
      'paused': 0.2,
      'error': 0.0
    }
    return statusMap[status] || 0.5
  }
}

/**
 * Reinforcement Learning Cognition Module
 */
export class ReinforcementLearningCognition implements CognitionModule {
  public id: string
  public type: string = 'reinforcement_learning'
  private config: HybridReasoningConfig
  private qLearner: QLearningAgent
  private experienceBuffer: Experience[] = []
  private performanceHistory: ReasoningPerformance[] = []
  private episodeCount: number = 0
  
  constructor(config: HybridReasoningConfig) {
    this.id = `rl_cognition_${Date.now()}`
    this.config = config
    
    const learningConfig = config.learning
    this.qLearner = new QLearningAgent(
      learningConfig?.learningRate || 0.1,
      0.95, // discount factor
      0.1   // initial exploration rate
    )
  }
  
  /**
   * Initialize the cognition module
   */
  initialize(config: BaseConfig): void {
    this.config = { ...this.config, ...config }
  }
  
  /**
   * Get module metadata
   */
  getMetadata(): CognitionModuleMetadata {
    return {
      id: this.id,
      name: 'Reinforcement Learning Cognition',
      version: '1.0.0',
      description: 'Q-learning based adaptive cognition with continuous learning',
      author: 'SYMindX',
      paradigms: [ReasoningParadigm.REINFORCEMENT_LEARNING],
      learningCapable: true
    }
  }
  
  /**
   * Main thinking method using RL
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now()
    const thoughts: string[] = []
    const actions: AgentAction[] = []
    const memories: MemoryRecord[] = []
    
    // Convert context to state
    const currentState = StateRepresentation.contextToState(agent, context)
    const stateKey = StateRepresentation.stateToKey(currentState)
    
    thoughts.push(`RL state: ${stateKey}`)
    
    // Define possible actions
    const possibleActions = this.getPossibleActions(context)
    thoughts.push(`Possible actions: ${possibleActions.join(', ')}`)
    
    // Select action using Q-learning
    const selectedAction = this.qLearner.selectAction(stateKey, possibleActions)
    thoughts.push(`Selected action: ${selectedAction} (ε=${this.qLearner.explorationRate.toFixed(3)})`)
    
    // Create agent action
    const agentAction = this.createAgentAction(agent, selectedAction, currentState)
    if (agentAction) {
      actions.push(agentAction)
    }
    
    // Store state for learning
    this.storeCurrentState(currentState, selectedAction)
    
    // Create learning memory
    const memory = this.createLearningMemory(agent, currentState, selectedAction)
    memories.push(memory)
    
    // Calculate performance
    const reasoningTime = Date.now() - startTime
    const confidence = this.calculateConfidence(stateKey, selectedAction)
    
    // Update episode count
    this.episodeCount++
    
    return {
      thoughts,
      actions,
      emotions: {
        current: confidence > 0.7 ? 'confident' : confidence > 0.4 ? 'curious' : 'exploring',
        intensity: confidence,
        triggers: ['reinforcement_learning'],
        history: [],
        timestamp: new Date()
      },
      memories,
      confidence
    }
  }
  
  /**
   * Plan using RL approach
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Create planning state
    const planningState = this.createPlanningState(agent, goal)
    const stateKey = StateRepresentation.stateToKey(planningState)
    
    // Generate plan using learned policy
    const policy = this.qLearner.getPolicy()
    const steps: PlanStep[] = []
    
    let currentStateKey = stateKey
    let stepCounter = 1
    const maxSteps = 10
    
    while (stepCounter <= maxSteps) {
      const action = policy.get(currentStateKey) || 'analyze'
      
      steps.push({
        id: `step_${stepCounter}`,
        action,
        description: this.getActionDescription(action),
        status: PlanStepStatus.PENDING,
        parameters: { 
          q_value: this.qLearner.getQValue(currentStateKey, action),
          step: stepCounter
        },
        preconditions: stepCounter > 1 ? [`step_${stepCounter - 1}`] : [],
        effects: [`${action}_completed`]
      })
      
      // Simulate next state (simplified)
      currentStateKey = this.simulateNextState(currentStateKey, action)
      stepCounter++
      
      // Break if goal likely achieved
      if (action === 'achieve_goal' || stepCounter > 5) break
    }
    
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: 0.7,
      estimatedDuration: steps.length * 30000, // 30 seconds per step
      dependencies: [],
      status: 'pending' as any
    }
  }
  
  /**
   * Decide using RL value estimates
   */
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    if (options.length === 0) {
      throw new Error('No options to decide between')
    }
    
    if (options.length === 1) {
      return options[0]
    }
    
    // Evaluate options using Q-values
    const currentState = StateRepresentation.contextToState(agent, { 
      events: [], 
      memories: [],
      currentState: { 
        stats: { decision_making: 1 },
        lastAction: 'decision_evaluation'
      },
      environment: {
        type: 'simulation' as any,
        time: new Date()
      }
    })
    const stateKey = StateRepresentation.stateToKey(currentState)
    
    const evaluatedOptions = options.map(option => {
      const actionKey = this.optionToActionKey(option)
      const qValue = this.qLearner.getQValue(stateKey, actionKey)
      
      return {
        option,
        qValue,
        score: qValue + (option.confidence || 0.5)
      }
    })
    
    // Select option with highest score
    const bestOption = evaluatedOptions.reduce((best, current) => 
      current.score > best.score ? current : best
    )
    
    return bestOption.option
  }
  
  /**
   * Learn from experience
   */
  async learn(agent: Agent, experience: Experience): Promise<void> {
    const { state, action, reward, nextState } = experience
    
    // Add to experience buffer
    this.experienceBuffer.push(experience)
    
    // Limit buffer size
    const maxBufferSize = (this.config.learning as any)?.experienceBufferSize || 1000
    if (this.experienceBuffer.length > maxBufferSize) {
      this.experienceBuffer.shift()
    }
    
    // Convert to RL format
    const stateKey = StateRepresentation.stateToKey(state)
    const nextStateKey = StateRepresentation.stateToKey(nextState)
    const actionKey = this.experienceActionToKey(action)
    const rewardValue = this.processReward(reward)
    
    // Update Q-table
    const possibleActions = this.getPossibleActionsFromState(nextState)
    this.qLearner.updateQValue(stateKey, actionKey, rewardValue, nextStateKey, possibleActions)
    
    // Decay exploration
    this.qLearner.decayExploration()
    
    // Update performance tracking
    this.updatePerformance(experience)
    
    runtimeLogger.cognition(`RL learned: Q(${stateKey}, ${actionKey}) = ${this.qLearner.getQValue(stateKey, actionKey).toFixed(3)}`)
  }
  
  /**
   * Get possible actions for current context
   */
  private getPossibleActions(context: ThoughtContext): string[] {
    const actions = ['respond', 'analyze', 'plan', 'wait']
    
    // Add context-specific actions
    if (context.goal) {
      actions.push('work_on_goal')
    }
    
    if (context.events.some(e => e.data?.message)) {
      actions.push('process_message')
    }
    
    return actions
  }
  
  /**
   * Create agent action from RL decision
   */
  private createAgentAction(agent: Agent, action: string, state: AgentStateVector): AgentAction | null {
    const actionMap: Record<string, { type: ActionCategory; action: string }> = {
      'respond': { type: ActionCategory.COMMUNICATION, action: 'rl_response' },
      'analyze': { type: ActionCategory.PROCESSING, action: 'rl_analysis' },
      'plan': { type: ActionCategory.PROCESSING, action: 'rl_planning' },
      'work_on_goal': { type: ActionCategory.PROCESSING, action: 'rl_goal_work' },
      'process_message': { type: ActionCategory.COMMUNICATION, action: 'rl_message_processing' },
      'wait': { type: ActionCategory.PROCESSING, action: 'rl_wait' }
    }
    
    const actionConfig = actionMap[action]
    if (!actionConfig) return null
    
    return {
      id: `action_${Date.now()}`,
      agentId: agent.id,
      type: actionConfig.type,
      action: actionConfig.action,
      parameters: {
        rl_action: action,
        state_features: state.features,
        episode: this.episodeCount
      },
      priority: this.qLearner.getQValue(StateRepresentation.stateToKey(state), action),
      status: ActionStatus.PENDING,
      extension: 'reinforcement_learning',
      timestamp: new Date()
    }
  }
  
  /**
   * Store current state for learning
   */
  private storeCurrentState(state: AgentStateVector, action: string): void {
    // Store for next learning update
    // This would be used when we receive reward/next state
  }
  
  /**
   * Create learning memory
   */
  private createLearningMemory(agent: Agent, state: AgentStateVector, action: string): MemoryRecord {
    const content = `RL decision: ${action} from state with ${Object.keys(state.features).length} features`
    
    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.REASONING,
      content,
      metadata: {
        reasoning_type: 'reinforcement_learning',
        state_features: state.features,
        selected_action: action,
        episode: this.episodeCount,
        q_value: this.qLearner.getQValue(StateRepresentation.stateToKey(state), action),
        timestamp: new Date()
      },
      importance: 0.7,
      timestamp: new Date(),
      tags: ['reasoning', 'reinforcement_learning', 'q_learning'],
      duration: MemoryDuration.LONG_TERM
    }
  }
  
  /**
   * Calculate confidence in action selection
   */
  private calculateConfidence(stateKey: string, action: string): number {
    const qValue = this.qLearner.getQValue(stateKey, action)
    const possibleActions = this.getPossibleActionsFromState({ features: {} } as AgentStateVector)
    const allQValues = possibleActions.map(a => this.qLearner.getQValue(stateKey, a))
    
    const maxQ = Math.max(...allQValues)
    const minQ = Math.min(...allQValues)
    
    // Normalize Q-value to 0-1 range
    if (maxQ === minQ) return 0.5
    return (qValue - minQ) / (maxQ - minQ)
  }
  
  /**
   * Create planning state
   */
  private createPlanningState(agent: Agent, goal: string): AgentStateVector {
    return {
      id: `planning_state_${Date.now()}`,
      agentId: agent.id,
      timestamp: new Date(),
      features: {
        has_goal: 1,
        goal_complexity: goal.split(' ').length / 10,
        agent_status: 1.0,
        planning_mode: 1
      },
      context: { goal }
    }
  }
  
  /**
   * Get action description
   */
  private getActionDescription(action: string): string {
    const descriptions: Record<string, string> = {
      'respond': 'Generate a response',
      'analyze': 'Analyze the situation',
      'plan': 'Create a detailed plan',
      'work_on_goal': 'Work towards the goal',
      'process_message': 'Process incoming message',
      'wait': 'Wait for more information',
      'achieve_goal': 'Execute goal achievement'
    }
    
    return descriptions[action] || `Execute ${action}`
  }
  
  /**
   * Simulate next state
   */
  private simulateNextState(currentStateKey: string, action: string): string {
    // Simple state transition simulation
    const transitions: Record<string, string> = {
      'analyze': 'analyzed',
      'plan': 'planned',
      'respond': 'responded',
      'work_on_goal': 'achieve_goal'
    }
    
    return transitions[action] || currentStateKey
  }
  
  /**
   * Convert option to action key
   */
  private optionToActionKey(option: Decision): string {
    if (option.id) return option.id
    if (typeof option.action === 'string') return option.action
    if (option.action && typeof option.action === 'object') {
      return (option.action as any).id || (option.action as any).action || 'unknown_option'
    }
    return 'unknown_option'
  }
  
  /**
   * Convert experience action to key
   */
  private experienceActionToKey(action: any): string {
    if (typeof action === 'string') return action
    if (action && typeof action === 'object') {
      return action.action || action.type || 'unknown_action'
    }
    return 'unknown_action'
  }
  
  /**
   * Process reward signal
   */
  private processReward(reward: RewardSignal): number {
    // Normalize reward to -1 to +1 range
    let normalizedReward = reward.value
    
    // Apply reward shaping based on type
    switch (reward.type) {
      case RewardSignalType.POSITIVE:
        normalizedReward = Math.abs(normalizedReward)
        break
      case RewardSignalType.NEGATIVE:
        normalizedReward = -Math.abs(normalizedReward)
        break
      case RewardSignalType.CURIOSITY:
        normalizedReward = normalizedReward * 0.5 // Smaller curiosity rewards
        break
      case RewardSignalType.ACHIEVEMENT:
        normalizedReward = Math.abs(normalizedReward) * 1.5 // Boost achievement rewards
        break
    }
    
    return Math.max(-1, Math.min(1, normalizedReward))
  }
  
  /**
   * Get possible actions from state
   */
  private getPossibleActionsFromState(state: AgentStateVector): string[] {
    const baseActions = ['respond', 'analyze', 'plan', 'wait']
    
    // Add state-dependent actions
    if (state.features.has_goal > 0) {
      baseActions.push('work_on_goal')
    }
    
    if (state.features.has_message > 0) {
      baseActions.push('process_message')
    }
    
    return baseActions
  }
  
  /**
   * Update performance tracking
   */
  private updatePerformance(experience: Experience): void {
    const performance: ReasoningPerformance = {
      accuracy: experience.reward.value > 0 ? 1 : 0,
      efficiency: 1 / Math.max(1, this.episodeCount / 100), // Decreases over time
      confidence: this.calculateConfidence(
        StateRepresentation.stateToKey(experience.state),
        this.experienceActionToKey(experience.action)
      ),
      adaptability: this.qLearner.explorationRate,
      reasoningTime: 100, // Placeholder
      memoryUsage: this.experienceBuffer.length,
      timestamp: new Date()
    }
    
    this.performanceHistory.push(performance)
    
    // Keep only recent performance data
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift()
    }
  }
  
  /**
   * Get learning statistics
   */
  getStats(): {
    episodeCount: number
    explorationRate: number
    averageReward: number
    qTableSize: number
  } {
    const recentRewards = this.experienceBuffer
      .slice(-50)
      .map(e => e.reward.value)
    
    const averageReward = recentRewards.length > 0 
      ? recentRewards.reduce((sum, r) => sum + r, 0) / recentRewards.length
      : 0
    
    return {
      episodeCount: this.episodeCount,
      explorationRate: this.qLearner.explorationRate,
      averageReward,
      qTableSize: this.qLearner['qTable'].size
    }
  }
}

/**
 * Factory function for creating RL cognition module
 */
export function createReinforcementLearningCognition(config: HybridReasoningConfig): ReinforcementLearningCognition {
  return new ReinforcementLearningCognition(config)
}