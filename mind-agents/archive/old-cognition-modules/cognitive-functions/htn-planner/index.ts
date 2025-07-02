/**
 * HTN Planner Cognition Module for SYMindX
 * 
 * This module implements a Hierarchical Task Network planner for agent cognition
 */

import { Agent, ThoughtContext, ThoughtResult, Plan, Decision, PlanStep, AgentAction, PlanStepStatus, PlanStatus, ActionStatus } from '../../../../types/agent.js'
import { BaseCognitionModule } from '../../base-cognition-module.js'
import { CognitionModuleMetadata } from '../../../../types/cognition.js'
import { BaseConfig } from '../../../../types/common.js'

/**
 * Configuration for the HTN planner
 */
export interface HTNPlannerConfig extends BaseConfig {
  planningDepth: number
  memoryIntegration: boolean
  creativityLevel: number
}

/**
 * HTN Planner cognition module implementation
 */
export class HTNPlannerCognition extends BaseCognitionModule {
  private planningDepth: number
  private memoryIntegration: boolean
  private creativityLevel: number

  constructor(config: HTNPlannerConfig) {
    const metadata: CognitionModuleMetadata = {
      id: 'htn_planner',
      name: 'HTN Planner Cognition',
      description: 'A hierarchical task network planner for structured decision making',
      version: '1.0.0',
      author: 'SYMindX Team'
    }
    
    super(config, metadata)
    this.planningDepth = config.planningDepth || 3
    this.memoryIntegration = config.memoryIntegration !== false
    this.creativityLevel = config.creativityLevel || 0.5
  }

  /**
   * Process the current context and generate thoughts, emotions, and actions
   * @param agent The agent that is thinking
   * @param context The context for thinking
   * @returns The result of thinking
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // 1. Analyze the situation
    const situation = await this.analyzeSituation(agent, context)
    
    // 2. Retrieve relevant memories
    const relevantMemories = await this.retrieveRelevantMemories(agent, situation)
    
    // 3. Generate thoughts
    const thoughts = await this.generateThoughts(agent, situation, relevantMemories)
    
    // 4. Process emotional response
    const emotions = await this.processEmotionalResponse(agent, situation, thoughts)
    
    // 5. Plan actions
    const actions = await this.planActions(agent, situation, thoughts, emotions)
    
    // 6. Create new memories
    const memories = await this.createMemories(agent, situation, thoughts, emotions, actions)
    
    return {
      thoughts,
      emotions,
      actions,
      memories,
      confidence: this.calculateConfidence(thoughts, actions)
    }
  }

  /**
   * Create a plan to achieve a goal
   * @param agent The agent that is planning
   * @param goal The goal to plan for
   * @returns A plan to achieve the goal
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Create a new plan
    const plan: Plan = {
      id: this.generateId(),
      goal,
      steps: [],
      priority: 0.5,
      estimatedDuration: 0,
      dependencies: [],
      status: PlanStatus.PENDING
    }
    
    // Implement HTN planning algorithm
    // Decompose the goal into hierarchical tasks and methods
    const decomposedTasks = await this.decomposeGoal(goal, agent)
    
    // Build the plan from decomposed tasks
    for (const task of decomposedTasks) {
      const step: PlanStep = {
        id: this.generateId(),
        description: task.description,
        action: task.action,
        parameters: task.parameters,
        preconditions: task.preconditions,
        effects: task.effects,
        status: PlanStepStatus.PENDING
      }
      plan.steps.push(step)
      plan.estimatedDuration += task.estimatedDuration || 60000 // Default 1 minute
    }
    
    // Set plan priority based on goal complexity
    plan.priority = this.calculatePlanPriority(goal, decomposedTasks.length)
    
    return plan
  }

  /**
   * Make a decision between options
   * @param agent The agent that is deciding
   * @param options The options to decide between
   * @returns The selected decision
   */
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    if (options.length === 0) {
      throw new Error('No options provided for decision')
    }
    
    if (options.length === 1) {
      return options[0]
    }
    
    // Weight options by confidence and agent personality
    const weightedOptions = options.map(option => {
      // Base weight is the confidence
      let weight = option.confidence
      
      // Adjust based on agent personality traits
      // This is a simplified example - real implementation would be more complex
      const traits = agent.config.psyche.traits
      
      if (traits.includes('cautious') && option.consequences.some(c => c.includes('risk'))) {
        weight *= 0.8
      }
      
      if (traits.includes('curious') && option.consequences.some(c => c.includes('new'))) {
        weight *= 1.2
      }
      
      return { option, weight }
    })
    
    // Sort by weight and select the highest
    weightedOptions.sort((a, b) => b.weight - a.weight)
    return weightedOptions[0].option
  }

  /**
   * Analyze the current situation
   * @param agent The agent
   * @param context The context
   * @returns Analysis of the situation
   */
  private async analyzeSituation(agent: Agent, context: ThoughtContext): Promise<any> {
    // Extract key information from context
    const events = context.events
    const environment = context.environment
    const agentState = context.currentState
    
    // Identify important events
    const importantEvents = events.filter(event => {
      // Filter logic would depend on agent personality and goals
      return true // For now, consider all events important
    })
    
    return {
      events: importantEvents,
      environment,
      agentState,
      timestamp: new Date()
    }
  }

  /**
   * Retrieve memories relevant to the current situation
   * @param agent The agent
   * @param situation The analyzed situation
   * @returns Relevant memories
   */
  private async retrieveRelevantMemories(agent: Agent, situation: any): Promise<any[]> {
    if (!this.memoryIntegration) {
      return []
    }
    
    // Create a query based on the situation
    const query = this.createMemoryQuery(situation)
    
    // Retrieve memories
    try {
      return await agent.memory.retrieve(agent.id, query, 5)
    } catch (error) {
      console.error('Failed to retrieve memories:', error)
      return []
    }
  }

  /**
   * Generate thoughts based on the situation and memories
   * @param agent The agent
   * @param situation The analyzed situation
   * @param memories Relevant memories
   * @returns Generated thoughts
   */
  private async generateThoughts(agent: Agent, situation: any, memories: any[]): Promise<string[]> {
    const thoughts: string[] = []
    
    // Basic situation assessment
    thoughts.push(`I am currently in ${situation.environment.location || 'an unknown location'}.`)
    
    // Process events
    if (situation.events.length > 0) {
      thoughts.push(`I notice ${situation.events.length} events happening around me.`)
      
      // Add specific thoughts about important events
      situation.events.forEach((event: any) => {
        thoughts.push(`There is a ${event.type} event from ${event.source}.`)
      })
    } else {
      thoughts.push('Nothing significant is happening at the moment.')
    }
    
    // Integrate memories if available
    if (memories.length > 0) {
      thoughts.push(`I recall ${memories.length} relevant memories.`)
      
      // Add specific thoughts about important memories
      memories.slice(0, 2).forEach((memory: any) => {
        thoughts.push(`I remember: ${memory.content}`)
      })
    }
    
    // Add creative thoughts based on creativity level
    if (Math.random() < this.creativityLevel) {
      const creativeThoughts = [
        'I wonder what would happen if...',
        'This reminds me of something I once imagined...',
        'There might be an interesting connection between these events...',
        'I could try a different approach to this situation...'
      ]
      
      thoughts.push(creativeThoughts[Math.floor(Math.random() * creativeThoughts.length)])
    }
    
    return thoughts
  }

  /**
   * Process emotional response to the situation
   * @param agent The agent
   * @param situation The analyzed situation
   * @param thoughts Generated thoughts
   * @returns Updated emotion state
   */
  private async processEmotionalResponse(agent: Agent, situation: any, thoughts: string[]): Promise<any> {
    // Extract emotional triggers from situation and thoughts
    const emotionalTriggers: string[] = []
    
    // Add triggers from events
    situation.events.forEach((event: any) => {
      emotionalTriggers.push(event.type)
    })
    
    // Add triggers from thoughts
    thoughts.forEach(thought => {
      if (thought.includes('danger') || thought.includes('threat')) {
        emotionalTriggers.push('danger')
      }
      if (thought.includes('success') || thought.includes('achievement')) {
        emotionalTriggers.push('achievement')
      }
      // Add more emotional trigger extraction logic
    })
    
    // Process the emotional response using the agent's emotion module
    const emotionContext = { thoughts, situation: situation }
    const dominantTrigger = emotionalTriggers.length > 0 ? 
      emotionalTriggers[0] : 'neutral'
    
    return agent.emotion.processEvent(dominantTrigger, emotionContext)
  }

  /**
   * Plan actions based on the situation, thoughts, and emotions
   * @param agent The agent
   * @param situation The analyzed situation
   * @param thoughts Generated thoughts
   * @param emotions Updated emotion state
   * @returns Planned actions
   */
  private async planActions(agent: Agent, situation: any, thoughts: string[], emotions: any): Promise<AgentAction[]> {
    const actions: AgentAction[] = []
    
    // Determine if any action is needed
    const needsAction = situation.events.length > 0 || Math.random() < 0.3
    
    if (needsAction) {
      // Find available extensions and their actions
      const availableExtensions = agent.extensions.filter(ext => ext.enabled)
      
      if (availableExtensions.length > 0) {
        // Select an extension (simplified logic)
        const selectedExtension = availableExtensions[0]
        
        // Select an action from the extension (simplified logic)
        const actionKeys = Object.keys(selectedExtension.actions)
        
        if (actionKeys.length > 0) {
          const actionKey = actionKeys[0]
          const actionDef = selectedExtension.actions[actionKey]
          
          // Create the action
          actions.push({
            id: this.generateId(),
            type: 'extension_action',
            extension: selectedExtension.id,
            action: actionKey,
            parameters: {},
            timestamp: new Date(),
            status: ActionStatus.PENDING
          })
        }
      }
    }
    
    return actions
  }

  /**
   * Create memories based on the thinking process
   * @param agent The agent
   * @param situation The analyzed situation
   * @param thoughts Generated thoughts
   * @param emotions Updated emotion state
   * @param actions Planned actions
   * @returns Created memories
   */
  private async createMemories(agent: Agent, situation: any, thoughts: string[], emotions: any, actions: AgentAction[]): Promise<any[]> {
    const memories = []
    
    // Create a memory of the current experience
    if (situation.events.length > 0 || thoughts.length > 0) {
      memories.push({
        id: this.generateId(),
        agentId: agent.id,
        type: 'experience',
        content: `I experienced ${situation.events.length} events and had ${thoughts.length} thoughts.`,
        metadata: {
          emotion: emotions.current,
          intensity: emotions.intensity,
          actions: actions.length
        },
        importance: this.calculateImportance(situation, thoughts, emotions),
        timestamp: new Date(),
        tags: ['experience', emotions.current]
      })
    }
    
    return memories
  }

  /**
   * Create a memory query based on the situation
   * @param situation The analyzed situation
   * @returns Query string
   */
  private createMemoryQuery(situation: any): string {
    // Simple query based on location and events
    const location = situation.environment.location || 'unknown'
    const eventTypes = situation.events.map((e: any) => e.type).join(' ')
    
    return `${location} ${eventTypes}`.trim() || 'recent'
  }

  /**
   * Calculate confidence in the thinking result
   * @param thoughts Generated thoughts
   * @param actions Planned actions
   * @returns Confidence value (0.0 to 1.0)
   */
  private calculateConfidence(thoughts: string[], actions: AgentAction[]): number {
    // Simple confidence calculation
    const baseConfidence = 0.5
    const thoughtFactor = Math.min(thoughts.length * 0.1, 0.3)
    const actionFactor = actions.length > 0 ? 0.2 : 0
    
    return Math.min(baseConfidence + thoughtFactor + actionFactor, 1.0)
  }

  /**
   * Calculate importance of a memory
   * @param situation The analyzed situation
   * @param thoughts Generated thoughts
   * @param emotions Updated emotion state
   * @returns Importance value (0.0 to 1.0)
   */
  private calculateImportance(situation: any, thoughts: string[], emotions: any): number {
    // Simple importance calculation
    const baseImportance = 0.3
    const eventFactor = Math.min(situation.events.length * 0.1, 0.3)
    const emotionFactor = emotions.intensity * 0.4
    
    return Math.min(baseImportance + eventFactor + emotionFactor, 1.0)
  }

  /**
   * Decompose a goal into hierarchical tasks using HTN planning
   * @param goal The goal to decompose
   * @param agent The agent context
   * @returns Array of decomposed tasks
   */
  private async decomposeGoal(goal: string, agent: Agent): Promise<any[]> {
    const tasks: any[] = []
    
    // Analyze goal complexity and type
    const goalType = this.classifyGoal(goal)
    
    switch (goalType) {
      case 'communication':
        tasks.push(
          {
            description: 'Analyze communication context',
            action: 'analyze_context',
            parameters: { goal, type: 'communication' },
            preconditions: [],
            effects: ['context_analyzed'],
            estimatedDuration: 30000
          },
          {
            description: 'Generate appropriate response',
            action: 'generate_response',
            parameters: { goal },
            preconditions: ['context_analyzed'],
            effects: ['response_generated'],
            estimatedDuration: 45000
          },
          {
            description: 'Deliver communication',
            action: 'deliver_message',
            parameters: { goal },
            preconditions: ['response_generated'],
            effects: [goal],
            estimatedDuration: 15000
          }
        )
        break
        
      case 'problem_solving':
        tasks.push(
          {
            description: 'Define problem parameters',
            action: 'define_problem',
            parameters: { goal },
            preconditions: [],
            effects: ['problem_defined'],
            estimatedDuration: 60000
          },
          {
            description: 'Generate solution alternatives',
            action: 'generate_solutions',
            parameters: { goal },
            preconditions: ['problem_defined'],
            effects: ['solutions_generated'],
            estimatedDuration: 120000
          },
          {
            description: 'Evaluate and select best solution',
            action: 'evaluate_solutions',
            parameters: { goal },
            preconditions: ['solutions_generated'],
            effects: ['solution_selected'],
            estimatedDuration: 90000
          },
          {
            description: 'Implement solution',
            action: 'implement_solution',
            parameters: { goal },
            preconditions: ['solution_selected'],
            effects: [goal],
            estimatedDuration: 180000
          }
        )
        break
        
      case 'information_gathering':
        tasks.push(
          {
            description: 'Identify information sources',
            action: 'identify_sources',
            parameters: { goal },
            preconditions: [],
            effects: ['sources_identified'],
            estimatedDuration: 45000
          },
          {
            description: 'Collect information',
            action: 'collect_information',
            parameters: { goal },
            preconditions: ['sources_identified'],
            effects: ['information_collected'],
            estimatedDuration: 120000
          },
          {
            description: 'Process and synthesize information',
            action: 'process_information',
            parameters: { goal },
            preconditions: ['information_collected'],
            effects: [goal],
            estimatedDuration: 90000
          }
        )
        break
        
      default:
        // Generic task decomposition
        tasks.push(
          {
            description: 'Analyze goal requirements',
            action: 'analyze_goal',
            parameters: { goal },
            preconditions: [],
            effects: ['goal_analyzed'],
            estimatedDuration: 60000
          },
          {
            description: 'Execute goal achievement',
            action: 'execute_goal',
            parameters: { goal },
            preconditions: ['goal_analyzed'],
            effects: [goal],
            estimatedDuration: 120000
          }
        )
    }
    
    return tasks
  }

  /**
   * Classify the type of goal for appropriate decomposition
   * @param goal The goal to classify
   * @returns Goal type classification
   */
  private classifyGoal(goal: string): string {
    const goalLower = goal.toLowerCase()
    
    if (goalLower.includes('respond') || goalLower.includes('reply') || goalLower.includes('communicate') || goalLower.includes('message')) {
      return 'communication'
    }
    
    if (goalLower.includes('solve') || goalLower.includes('fix') || goalLower.includes('resolve') || goalLower.includes('debug')) {
      return 'problem_solving'
    }
    
    if (goalLower.includes('find') || goalLower.includes('search') || goalLower.includes('research') || goalLower.includes('learn')) {
      return 'information_gathering'
    }
    
    return 'generic'
  }

  /**
   * Calculate plan priority based on goal and complexity
   * @param goal The goal string
   * @param taskCount Number of decomposed tasks
   * @returns Priority value (0.0 to 1.0)
   */
  private calculatePlanPriority(goal: string, taskCount: number): number {
    let priority = 0.5 // Base priority
    
    // Adjust based on urgency keywords
    const urgentKeywords = ['urgent', 'immediate', 'asap', 'critical', 'emergency']
    const importantKeywords = ['important', 'priority', 'key', 'essential']
    
    const goalLower = goal.toLowerCase()
    
    if (urgentKeywords.some(keyword => goalLower.includes(keyword))) {
      priority += 0.3
    }
    
    if (importantKeywords.some(keyword => goalLower.includes(keyword))) {
      priority += 0.2
    }
    
    // Adjust based on complexity (more tasks = higher priority for planning)
    priority += Math.min(taskCount * 0.05, 0.2)
    
    return Math.min(priority, 1.0)
  }
}

// Factory function to create an HTN planner cognition module
export function createHTNPlannerCognition(config: HTNPlannerConfig): HTNPlannerCognition {
  return new HTNPlannerCognition(config)
}