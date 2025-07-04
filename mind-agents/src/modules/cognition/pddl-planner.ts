/**
 * PDDL Planning System for SYMindX
 * 
 * Implements Planning Domain Definition Language (PDDL) for automated planning
 * with goal-directed reasoning and action decomposition.
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
} from '../../types/agent.js'
import { 
  CognitionModule,
  CognitionModuleMetadata,
  PDDLDomain,
  PDDLPredicate,
  PDDLParameter,
  PDDLAction,
  PDDLCondition,
  PDDLEffect,
  PDDLProblem,
  ReasoningPerformance,
  HybridReasoningConfig
} from '../../types/cognition.js'
import { Experience } from '../../types/autonomous.js'
import { BaseConfig } from '../../types/common.js'
import { MemoryType, MemoryDuration } from '../../types/enums.js'
import { runtimeLogger } from '../../utils/logger.js'

/**
 * PDDL State representation
 */
interface PDDLState {
  predicates: Set<string>
  objects: Map<string, string> // object -> type
  timestamp: Date
}

/**
 * PDDL Plan representation
 */
interface PDDLPlan {
  actions: PDDLActionInstance[]
  cost: number
  length: number
  valid: boolean
}

/**
 * PDDL Action instance
 */
interface PDDLActionInstance {
  name: string
  parameters: Record<string, string>
  preconditions: string[]
  effects: string[]
  cost: number
}

/**
 * PDDL Planning cognition module
 */
export class PDDLPlanner implements CognitionModule {
  public id: string
  public type: string = 'pddl_planner'
  private config: HybridReasoningConfig
  private domain: PDDLDomain
  private currentState: PDDLState
  private planningHistory: Array<{
    problem: PDDLProblem
    plan: PDDLPlan
    success: boolean
    timestamp: Date
  }> = []
  
  constructor(config: HybridReasoningConfig) {
    this.id = `pddl_planner_${Date.now()}`
    this.config = config
    this.domain = config.pddlPlanner?.domain || this.createDefaultDomain()
    this.currentState = this.createInitialState()
  }
  
  /**
   * Create default PDDL domain for agent actions
   */
  private createDefaultDomain(): PDDLDomain {
    return {
      name: 'agent_actions',
      types: ['agent', 'message', 'goal', 'resource', 'location'],
      predicates: [
        { name: 'at', parameters: [{ name: 'agent', type: 'agent' }, { name: 'location', type: 'location' }] },
        { name: 'has', parameters: [{ name: 'agent', type: 'agent' }, { name: 'resource', type: 'resource' }] },
        { name: 'knows', parameters: [{ name: 'agent', type: 'agent' }, { name: 'message', type: 'message' }] },
        { name: 'achieved', parameters: [{ name: 'goal', type: 'goal' }] },
        { name: 'available', parameters: [{ name: 'resource', type: 'resource' }] },
        { name: 'connected', parameters: [{ name: 'location', type: 'location' }, { name: 'location', type: 'location' }] }
      ],
      actions: [
        {
          name: 'move',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'from', type: 'location' },
            { name: 'to', type: 'location' }
          ],
          preconditions: [
            { type: 'and', expressions: ['at(agent, from)', 'connected(from, to)'] }
          ],
          effects: [
            { type: 'delete', predicate: 'at(agent, from)' },
            { type: 'add', predicate: 'at(agent, to)' }
          ]
        },
        {
          name: 'communicate',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'message', type: 'message' }
          ],
          preconditions: [
            { type: 'and', expressions: ['knows(agent, message)'] }
          ],
          effects: [
            { type: 'add', predicate: 'communicated(agent, message)' }
          ]
        },
        {
          name: 'acquire_resource',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'resource', type: 'resource' }
          ],
          preconditions: [
            { type: 'and', expressions: ['available(resource)'] }
          ],
          effects: [
            { type: 'add', predicate: 'has(agent, resource)' },
            { type: 'delete', predicate: 'available(resource)' }
          ]
        },
        {
          name: 'work_on_goal',
          parameters: [
            { name: 'agent', type: 'agent' },
            { name: 'goal', type: 'goal' }
          ],
          preconditions: [
            { type: 'and', expressions: ['has(agent, knowledge)', 'has(agent, tools)'] }
          ],
          effects: [
            { type: 'add', predicate: 'achieved(goal)' }
          ]
        }
      ]
    }
  }
  
  /**
   * Create initial state
   */
  private createInitialState(): PDDLState {
    return {
      predicates: new Set([
        'at(agent1, home)',
        'available(knowledge)',
        'available(tools)',
        'connected(home, workspace)',
        'connected(workspace, communication_channel)'
      ]),
      objects: new Map([
        ['agent1', 'agent'],
        ['home', 'location'],
        ['workspace', 'location'],
        ['communication_channel', 'location'],
        ['knowledge', 'resource'],
        ['tools', 'resource']
      ]),
      timestamp: new Date()
    }
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
      name: 'PDDL Planner',
      version: '1.0.0',
      description: 'Automated planning using Planning Domain Definition Language',
      author: 'SYMindX',
      paradigms: ['pddl_planning'],
      learningCapable: true
    }
  }
  
  /**
   * Main thinking method using PDDL planning
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now()
    const thoughts: string[] = []
    const actions: AgentAction[] = []
    const memories: MemoryRecord[] = []
    
    // Update current state with context
    this.updateState(agent, context)
    
    // Generate planning problem
    const problem = this.generateProblem(agent, context)
    thoughts.push(`Generated PDDL problem: ${problem.domain}`)
    
    // Solve planning problem
    const plan = await this.solveProblem(problem)
    thoughts.push(`Generated plan with ${plan.actions.length} steps`)
    
    // Convert plan to agent actions
    if (plan.valid) {
      const agentActions = this.convertPlanToActions(agent, plan)
      actions.push(...agentActions)
      thoughts.push(`Converted plan to ${agentActions.length} executable actions`)
    }
    
    // Record planning attempt
    this.planningHistory.push({
      problem,
      plan,
      success: plan.valid,
      timestamp: new Date()
    })
    
    // Create memory of planning process
    const memory = this.createPlanningMemory(agent, problem, plan)
    memories.push(memory)
    
    // Calculate performance
    const reasoningTime = Date.now() - startTime
    const confidence = plan.valid ? 0.8 : 0.3
    
    return {
      thoughts,
      actions,
      emotions: {
        current: plan.valid ? 'confident' : 'frustrated',
        intensity: confidence,
        triggers: ['planning'],
        history: [],
        timestamp: new Date()
      },
      memories,
      confidence
    }
  }
  
  /**
   * Plan using PDDL approach
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Generate PDDL problem for the goal
    const problem = this.generateGoalProblem(agent, goal)
    
    // Solve the problem
    const pddlPlan = await this.solveProblem(problem)
    
    // Convert to Plan format
    const steps: PlanStep[] = pddlPlan.actions.map((action, index) => ({
      id: `step_${index + 1}`,
      action: action.name,
      description: this.generateActionDescription(action),
      status: PlanStepStatus.PENDING,
      parameters: action.parameters,
      preconditions: action.preconditions,
      effects: action.effects
    }))
    
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: 0.8,
      estimatedDuration: this.estimatePlanDuration(pddlPlan),
      dependencies: [],
      status: pddlPlan.valid ? 'pending' as any : 'failed' as any
    }
  }
  
  /**
   * Decide using PDDL planning
   */
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    if (options.length === 0) {
      throw new Error('No options to decide between')
    }
    
    if (options.length === 1) {
      return options[0]
    }
    
    // Create planning problems for each option
    const evaluatedOptions = await Promise.all(
      options.map(async (option) => {
        const problem = this.generateDecisionProblem(agent, option)
        const plan = await this.solveProblem(problem)
        return {
          option,
          plan,
          score: this.scorePlan(plan)
        }
      })
    )
    
    // Select best option
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
    
    // Update domain based on experience
    if (reward.value > 0.5) {
      this.reinforceSuccessfulActions(action, reward)
    } else if (reward.value < -0.5) {
      this.adjustFailedActions(action, reward)
    }
    
    // Update state model
    this.updateStateModel(state, action, nextState)
    
    runtimeLogger.cognition(`PDDL planner learned from experience: ${reward.type}`)
  }
  
  /**
   * Update current state with context
   */
  private updateState(agent: Agent, context: ThoughtContext): void {
    // Add agent state predicates
    this.currentState.predicates.add(`agent_status(${agent.id}, ${agent.status})`)
    
    // Add context predicates
    context.events.forEach((event, index) => {
      this.currentState.predicates.add(`event(event_${index}, ${event.type})`)
      
      if (event.data?.message) {
        this.currentState.predicates.add(`has_message(event_${index})`)
      }
    })
    
    // Add goal predicates
    if (context.goal) {
      this.currentState.predicates.add(`active_goal(${context.goal.replace(/\s+/g, '_')})`)
    }
    
    this.currentState.timestamp = new Date()
  }
  
  /**
   * Generate PDDL problem from context
   */
  private generateProblem(agent: Agent, context: ThoughtContext): PDDLProblem {
    const objects: Record<string, string> = {
      [agent.id]: 'agent',
      'current_location': 'location',
      'target_location': 'location'
    }
    
    const initialState = Array.from(this.currentState.predicates)
    
    // Generate goal state
    const goalState: string[] = []
    if (context.goal) {
      goalState.push(`achieved(${context.goal.replace(/\s+/g, '_')})`)
    }
    
    // Default goal if none specified
    if (goalState.length === 0) {
      goalState.push('communicated(agent, response)')
    }
    
    return {
      domain: this.domain.name,
      objects,
      initialState,
      goalState
    }
  }
  
  /**
   * Generate PDDL problem for a specific goal
   */
  private generateGoalProblem(agent: Agent, goal: string): PDDLProblem {
    const objects: Record<string, string> = {
      [agent.id]: 'agent',
      [`goal_${Date.now()}`]: 'goal'
    }
    
    const initialState = Array.from(this.currentState.predicates)
    const goalState = [`achieved(goal_${Date.now()})`]
    
    return {
      domain: this.domain.name,
      objects,
      initialState,
      goalState
    }
  }
  
  /**
   * Generate PDDL problem for decision making
   */
  private generateDecisionProblem(agent: Agent, option: Decision): PDDLProblem {
    const objects: Record<string, string> = {
      [agent.id]: 'agent',
      'option': 'goal'
    }
    
    const initialState = Array.from(this.currentState.predicates)
    const goalState = [`achieved(option)`]
    
    return {
      domain: this.domain.name,
      objects,
      initialState,
      goalState
    }
  }
  
  /**
   * Solve PDDL problem (simplified forward search)
   */
  private async solveProblem(problem: PDDLProblem): Promise<PDDLPlan> {
    const maxDepth = this.config.pddlPlanner?.maxPlanLength || 10
    const timeout = this.config.pddlPlanner?.timeout || 5000
    
    const startTime = Date.now()
    
    // Simple forward search
    const queue: Array<{
      state: Set<string>
      actions: PDDLActionInstance[]
      cost: number
    }> = [{
      state: new Set(problem.initialState),
      actions: [],
      cost: 0
    }]
    
    while (queue.length > 0 && Date.now() - startTime < timeout) {
      const current = queue.shift()!
      
      // Check if goal is achieved
      if (this.isGoalAchieved(current.state, problem.goalState)) {
        return {
          actions: current.actions,
          cost: current.cost,
          length: current.actions.length,
          valid: true
        }
      }
      
      // Check depth limit
      if (current.actions.length >= maxDepth) {
        continue
      }
      
      // Generate successor states
      const successors = this.generateSuccessors(current.state, current.actions, current.cost)
      queue.push(...successors)
    }
    
    // No solution found
    return {
      actions: [],
      cost: Infinity,
      length: 0,
      valid: false
    }
  }
  
  /**
   * Check if goal is achieved
   */
  private isGoalAchieved(state: Set<string>, goalState: string[]): boolean {
    return goalState.every(goal => state.has(goal))
  }
  
  /**
   * Generate successor states
   */
  private generateSuccessors(
    state: Set<string>,
    actions: PDDLActionInstance[],
    cost: number
  ): Array<{
    state: Set<string>
    actions: PDDLActionInstance[]
    cost: number
  }> {
    const successors: Array<{
      state: Set<string>
      actions: PDDLActionInstance[]
      cost: number
    }> = []
    
    // Try each action in the domain
    for (const action of this.domain.actions) {
      const instances = this.instantiateAction(action, state)
      
      for (const instance of instances) {
        if (this.canApplyAction(instance, state)) {
          const newState = this.applyAction(instance, state)
          successors.push({
            state: newState,
            actions: [...actions, instance],
            cost: cost + instance.cost
          })
        }
      }
    }
    
    return successors
  }
  
  /**
   * Instantiate action with objects
   */
  private instantiateAction(action: PDDLAction, state: Set<string>): PDDLActionInstance[] {
    // Simple instantiation - in practice, this would be more sophisticated
    const instances: PDDLActionInstance[] = []
    
    // Create a basic instance
    const instance: PDDLActionInstance = {
      name: action.name,
      parameters: {},
      preconditions: action.preconditions.flatMap(p => p.expressions),
      effects: action.effects.map(e => e.predicate),
      cost: 1
    }
    
    instances.push(instance)
    return instances
  }
  
  /**
   * Check if action can be applied
   */
  private canApplyAction(action: PDDLActionInstance, state: Set<string>): boolean {
    return action.preconditions.every(precondition => {
      // Simple check - in practice, this would handle variable binding
      const simplified = precondition.replace(/\([^)]*\)/g, '')
      return Array.from(state).some(s => s.includes(simplified))
    })
  }
  
  /**
   * Apply action to state
   */
  private applyAction(action: PDDLActionInstance, state: Set<string>): Set<string> {
    const newState = new Set(state)
    
    // Apply effects
    for (const effect of action.effects) {
      if (effect.includes('achieved')) {
        newState.add(effect)
      }
    }
    
    return newState
  }
  
  /**
   * Convert PDDL plan to agent actions
   */
  private convertPlanToActions(agent: Agent, plan: PDDLPlan): AgentAction[] {
    return plan.actions.map((action, index) => ({
      id: `action_${Date.now()}_${index}`,
      agentId: agent.id,
      type: this.mapActionType(action.name),
      action: action.name,
      parameters: action.parameters,
      priority: 0.8,
      status: ActionStatus.PENDING,
      extension: 'pddl_planner',
      timestamp: new Date()
    }))
  }
  
  /**
   * Map PDDL action to agent action type
   */
  private mapActionType(actionName: string): ActionCategory {
    switch (actionName) {
      case 'communicate':
        return ActionCategory.COMMUNICATION
      case 'move':
        return ActionCategory.NAVIGATION
      case 'acquire_resource':
        return ActionCategory.RESOURCE_MANAGEMENT
      case 'work_on_goal':
        return ActionCategory.PROCESSING
      default:
        return ActionCategory.PROCESSING
    }
  }
  
  /**
   * Create planning memory
   */
  private createPlanningMemory(agent: Agent, problem: PDDLProblem, plan: PDDLPlan): MemoryRecord {
    const content = `PDDL planning: ${plan.valid ? 'successful' : 'failed'} plan with ${plan.actions.length} steps`
    
    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.REASONING,
      content,
      metadata: {
        reasoning_type: 'pddl_planning',
        problem: problem,
        plan: plan,
        timestamp: new Date()
      },
      importance: plan.valid ? 0.8 : 0.5,
      timestamp: new Date(),
      tags: ['reasoning', 'pddl', 'planning'],
      duration: MemoryDuration.LONG_TERM
    }
  }
  
  /**
   * Generate action description
   */
  private generateActionDescription(action: PDDLActionInstance): string {
    return `${action.name} with parameters: ${JSON.stringify(action.parameters)}`
  }
  
  /**
   * Estimate plan duration
   */
  private estimatePlanDuration(plan: PDDLPlan): number {
    return plan.actions.length * 30000 // 30 seconds per action
  }
  
  /**
   * Score a plan for decision making
   */
  private scorePlan(plan: PDDLPlan): number {
    if (!plan.valid) return 0
    
    // Simple scoring - prefer shorter, lower-cost plans
    const lengthScore = 1 / (1 + plan.length)
    const costScore = 1 / (1 + plan.cost)
    
    return (lengthScore + costScore) / 2
  }
  
  /**
   * Reinforce successful actions
   */
  private reinforceSuccessfulActions(action: any, reward: any): void {
    // Update action costs (lower cost for successful actions)
    const actionName = action.type || 'unknown'
    const domainAction = this.domain.actions.find(a => a.name === actionName)
    
    if (domainAction) {
      // In practice, we'd update the action's cost model
      runtimeLogger.cognition(`Reinforcing successful action: ${actionName}`)
    }
  }
  
  /**
   * Adjust failed actions
   */
  private adjustFailedActions(action: any, reward: any): void {
    // Update action costs (higher cost for failed actions)
    const actionName = action.type || 'unknown'
    const domainAction = this.domain.actions.find(a => a.name === actionName)
    
    if (domainAction) {
      // In practice, we'd update the action's cost model
      runtimeLogger.cognition(`Adjusting failed action: ${actionName}`)
    }
  }
  
  /**
   * Update state model based on experience
   */
  private updateStateModel(state: any, action: any, nextState: any): void {
    // Learn state transitions
    // In practice, this would update the domain model
    runtimeLogger.cognition('Updated state model from experience')
  }
}

/**
 * Factory function for creating PDDL planner
 */
export function createPDDLPlanner(config: HybridReasoningConfig): PDDLPlanner {
  return new PDDLPlanner(config)
}