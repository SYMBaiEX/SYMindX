/**
 * Task Delegation Logic
 */

import {
  TaskDelegationSystem,
  Task,
  TaskResult,
  TaskStatus,
  CoordinationConfig,
  TaskAssignmentStrategy
} from '../types.js'
import { SYMindXOrchestrator } from './coordination-core.js'

export class SYMindXTaskDelegation implements TaskDelegationSystem {
  private orchestrator: SYMindXOrchestrator
  private taskQueue: Map<string, Task[]> = new Map()
  private activeAssignments: Map<string, string> = new Map() // taskId -> agentId
  private config: CoordinationConfig
  private assignmentStrategies: Map<string, TaskAssignmentStrategy> = new Map()

  constructor(orchestrator: SYMindXOrchestrator, config: CoordinationConfig) {
    this.orchestrator = orchestrator
    this.config = config
    
    // Register default assignment strategies
    this.registerAssignmentStrategy('capability-based', new CapabilityBasedStrategy())
    this.registerAssignmentStrategy('load-balanced', new LoadBalancedStrategy())
    this.registerAssignmentStrategy('priority-based', new PriorityBasedStrategy())
  }

  async delegate(task: Task, fromAgent: string, toAgent: string): Promise<TaskResult> {
    // Find best agent if toAgent not specified
    if (!toAgent) {
      toAgent = await this.findBestAgent(task)
    }

    if (!this.canDelegate(task, fromAgent, toAgent)) {
      throw new Error(`Cannot delegate task ${task.id} from ${fromAgent} to ${toAgent}`)
    }

    // Assign task
    task.assignedTo = toAgent
    task.status = TaskStatus.ASSIGNED
    this.activeAssignments.set(task.id, toAgent)

    // Add to agent's queue
    const agentQueue = this.taskQueue.get(toAgent) || []
    agentQueue.push(task)
    this.taskQueue.set(toAgent, agentQueue)

    console.log(`📋 Task ${task.id} delegated from ${fromAgent} to ${toAgent}`)

    // Execute task (simplified - in reality this would be more complex)
    const startTime = Date.now()
    try {
      task.status = TaskStatus.IN_PROGRESS
      
      // Simulate task execution with timeout
      const timeout = this.config.defaultTaskTimeout || 30000
      await Promise.race([
        this.executeTask(task),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Task timeout')), timeout)
        )
      ])
      
      task.status = TaskStatus.COMPLETED
      const result: TaskResult = {
        taskId: task.id,
        success: true,
        result: `Task ${task.id} completed successfully`,
        duration: Date.now() - startTime,
        agentId: toAgent
      }

      // Remove from active assignments
      this.activeAssignments.delete(task.id)
      
      // Remove from queue
      this.removeFromQueue(toAgent, task.id)

      return result
    } catch (error) {
      task.status = TaskStatus.FAILED
      const result: TaskResult = {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        agentId: toAgent
      }

      this.activeAssignments.delete(task.id)
      this.removeFromQueue(toAgent, task.id)
      return result
    }
  }

  canDelegate(task: Task, fromAgent: string, toAgent: string): boolean {
    // Check if agents exist
    if (!this.orchestrator.agents.has(fromAgent) || !this.orchestrator.agents.has(toAgent)) {
      return false
    }

    // Check hierarchy permissions
    if (!this.orchestrator.canAgentDelegate(fromAgent, toAgent)) {
      return false
    }

    // Check if target agent has required capabilities
    const toRole = this.orchestrator.hierarchy.roles.get(toAgent)
    if (toRole && task.dependencies.length > 0) {
      const hasRequiredCapabilities = task.dependencies.every(dep => 
        toRole.capabilities.includes(dep)
      )
      if (!hasRequiredCapabilities) {
        return false
      }
    }

    // Check agent workload
    const agentQueue = this.taskQueue.get(toAgent) || []
    const maxTasks = this.config.maxTasksPerAgent || 5
    if (agentQueue.length >= maxTasks) {
      return false
    }

    return true
  }

  getAvailableAgents(task: Task): string[] {
    return Array.from(this.orchestrator.agents.keys()).filter(agentId => {
      const role = this.orchestrator.hierarchy.roles.get(agentId)
      if (!role) return false

      // Check capabilities
      const hasCapabilities = task.dependencies.every(dep => 
        role.capabilities.includes(dep)
      )

      // Check availability (not overloaded)
      const agentQueue = this.taskQueue.get(agentId) || []
      const maxTasks = this.config.maxTasksPerAgent || 5
      const isAvailable = agentQueue.length < maxTasks

      return hasCapabilities && isAvailable
    })
  }

  private async findBestAgent(task: Task): Promise<string> {
    const availableAgents = this.getAvailableAgents(task)
    
    if (availableAgents.length === 0) {
      throw new Error(`No available agents for task ${task.id}`)
    }

    // Use capability-based strategy by default
    const strategy = this.assignmentStrategies.get('capability-based')!
    const agents = availableAgents.map(id => this.orchestrator.agents.get(id)!)
    return await strategy.evaluate(task, agents)
  }

  private async executeTask(task: Task): Promise<void> {
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  private removeFromQueue(agentId: string, taskId: string): void {
    const queue = this.taskQueue.get(agentId) || []
    const index = queue.findIndex(t => t.id === taskId)
    if (index >= 0) {
      queue.splice(index, 1)
      this.taskQueue.set(agentId, queue)
    }
  }

  registerAssignmentStrategy(name: string, strategy: TaskAssignmentStrategy): void {
    this.assignmentStrategies.set(name, strategy)
  }

  getTaskQueueStatus(agentId: string): Task[] {
    return this.taskQueue.get(agentId) || []
  }

  getActiveAssignments(): Map<string, string> {
    return new Map(this.activeAssignments)
  }
}

// Assignment Strategies
class CapabilityBasedStrategy implements TaskAssignmentStrategy {
  name = 'capability-based'

  async evaluate(task: Task, candidates: any[]): Promise<string> {
    let bestCandidate = candidates[0]
    let bestScore = 0
    
    for (const candidate of candidates) {
      let score = 0
      
      // Base compatibility score
      score += 20
      
      // Bonus for exact capability match (would need actual capability checking)
      score += 25
      
      if (score > bestScore) {
        bestScore = score
        bestCandidate = candidate
      }
    }
    
    return bestCandidate.id
  }
}

class LoadBalancedStrategy implements TaskAssignmentStrategy {
  name = 'load-balanced'

  async evaluate(task: Task, candidates: any[]): Promise<string> {
    // Find agent with least current load
    let bestCandidate = candidates[0]
    let lowestLoad = Infinity
    
    for (const candidate of candidates) {
      const currentLoad = (candidate as any).currentTasks?.length || 0
      if (currentLoad < lowestLoad) {
        lowestLoad = currentLoad
        bestCandidate = candidate
      }
    }
    
    return bestCandidate.id
  }
}

class PriorityBasedStrategy implements TaskAssignmentStrategy {
  name = 'priority-based'

  async evaluate(task: Task, candidates: any[]): Promise<string> {
    // Find highest priority agent
    let bestCandidate = candidates[0]
    let highestPriority = 0
    
    for (const candidate of candidates) {
      const priority = (candidate as any).priority || 0.5
      if (priority > highestPriority) {
        highestPriority = priority
        bestCandidate = candidate
      }
    }
    
    return bestCandidate.id
  }
}