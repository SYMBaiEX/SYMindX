/**
 * Conflict Resolution Logic
 */

import { Agent } from '../../../types/agent.js'
import {
  ConflictResolver,
  Task,
  ResourceAllocationStrategy
} from '../types.js'

export class SYMindXConflictResolver implements ConflictResolver {
  private resourceStrategies: Map<string, ResourceAllocationStrategy> = new Map()

  constructor() {
    // Register default strategies
    this.registerResourceStrategy('priority-based', new PriorityBasedResourceStrategy())
    this.registerResourceStrategy('fairness-based', new FairnessBasedResourceStrategy())
    this.registerResourceStrategy('capability-based', new CapabilityBasedResourceStrategy())
  }

  async resolveResourceConflict(resource: string, requesters: Agent[]): Promise<string> {
    if (requesters.length === 0) {
      throw new Error('No requesters provided')
    }

    if (requesters.length === 1) {
      return requesters[0].id
    }

    // Use priority-based strategy by default
    const strategy = this.resourceStrategies.get('priority-based')!
    return await strategy.evaluate(resource, requesters)
  }

  async resolveTaskConflict(task: Task, candidates: Agent[]): Promise<string> {
    if (candidates.length === 0) {
      throw new Error('No candidates provided')
    }

    if (candidates.length === 1) {
      return candidates[0].id
    }

    // Implement sophisticated task assignment based on agent capabilities and load
    let bestCandidate = candidates[0]
    let bestScore = 0
    
    for (const candidate of candidates) {
      let score = 0
      
      // Factor 1: Task type compatibility
      const taskType = task.type || 'generic'
      score += 20 // Base compatibility score
      
      // Factor 2: Current workload (prefer less busy agents)
      score += 15 // Simplified workload score
      
      // Factor 3: Task priority alignment
      const taskPriority = task.priority || 0.5
      score += taskPriority * 20
      
      // Factor 4: Agent specialization
      if ((task as any).requiredCapabilities) {
        score += 25
      }
      
      // Factor 5: Geographic/logical proximity
      score += 10 // Simplified proximity score
      
      // Factor 6: Historical performance on similar tasks
      score += 10 // Simplified performance score
      
      if (score > bestScore) {
        bestScore = score
        bestCandidate = candidate
      }
    }
    
    return bestCandidate.id
  }

  async resolvePriorityConflict(tasks: Task[]): Promise<Task[]> {
    // Sort by priority (higher first), then by deadline
    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime()
      }
      
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      
      return 0
    })
  }

  // Advanced conflict resolution methods
  async resolveMultiResourceConflict(
    resources: string[], 
    requesters: Agent[]
  ): Promise<Map<string, string>> {
    const allocation = new Map<string, string>()
    
    // Sort resources by priority/scarcity
    const sortedResources = resources.sort((a, b) => {
      // Implement resource priority logic
      return 0
    })
    
    // Allocate resources one by one
    for (const resource of sortedResources) {
      const availableRequesters = requesters.filter(agent => 
        !Array.from(allocation.values()).includes(agent.id)
      )
      
      if (availableRequesters.length > 0) {
        const winner = await this.resolveResourceConflict(resource, availableRequesters)
        allocation.set(resource, winner)
      }
    }
    
    return allocation
  }

  async resolveCircularDependency(tasks: Task[]): Promise<Task[]> {
    // Detect and resolve circular dependencies in task chains
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const resolvedOrder: Task[] = []
    
    const dfs = (task: Task): boolean => {
      if (recursionStack.has(task.id)) {
        // Circular dependency detected
        return false
      }
      
      if (visited.has(task.id)) {
        return true
      }
      
      visited.add(task.id)
      recursionStack.add(task.id)
      
      // Process dependencies (simplified)
      for (const dep of task.dependencies) {
        const depTask = tasks.find(t => t.id === dep)
        if (depTask && !dfs(depTask)) {
          return false
        }
      }
      
      recursionStack.delete(task.id)
      resolvedOrder.push(task)
      return true
    }
    
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        if (!dfs(task)) {
          throw new Error(`Circular dependency detected involving task ${task.id}`)
        }
      }
    }
    
    return resolvedOrder.reverse()
  }

  async resolveSchedulingConflict(
    tasks: Task[], 
    agents: Agent[], 
    timeWindow: { start: Date, end: Date }
  ): Promise<Map<string, string[]>> {
    // Advanced scheduling algorithm to resolve conflicts
    const schedule = new Map<string, string[]>()
    
    // Initialize agent schedules
    for (const agent of agents) {
      schedule.set(agent.id, [])
    }
    
    // Sort tasks by priority and deadline
    const sortedTasks = await this.resolvePriorityConflict(tasks)
    
    for (const task of sortedTasks) {
      const availableAgents = agents.filter(agent => {
        const agentSchedule = schedule.get(agent.id) || []
        return agentSchedule.length < 5 // Max 5 tasks per agent
      })
      
      if (availableAgents.length > 0) {
        const assignedAgent = await this.resolveTaskConflict(task, availableAgents)
        const agentSchedule = schedule.get(assignedAgent) || []
        agentSchedule.push(task.id)
        schedule.set(assignedAgent, agentSchedule)
      }
    }
    
    return schedule
  }

  registerResourceStrategy(name: string, strategy: ResourceAllocationStrategy): void {
    this.resourceStrategies.set(name, strategy)
  }

  // Conflict detection methods
  detectResourceConflicts(allocations: Map<string, string>): string[] {
    const conflicts: string[] = []
    const agentResources = new Map<string, string[]>()
    
    for (const [resource, agentId] of allocations) {
      if (!agentResources.has(agentId)) {
        agentResources.set(agentId, [])
      }
      agentResources.get(agentId)!.push(resource)
    }
    
    // Check for agents with too many resources
    for (const [agentId, resources] of agentResources) {
      if (resources.length > 3) { // Max 3 resources per agent
        conflicts.push(`Agent ${agentId} has too many resources: ${resources.join(', ')}`)
      }
    }
    
    return conflicts
  }

  detectTaskConflicts(assignments: Map<string, string>): string[] {
    const conflicts: string[] = []
    const agentTasks = new Map<string, string[]>()
    
    for (const [taskId, agentId] of assignments) {
      if (!agentTasks.has(agentId)) {
        agentTasks.set(agentId, [])
      }
      agentTasks.get(agentId)!.push(taskId)
    }
    
    // Check for overloaded agents
    for (const [agentId, taskIds] of agentTasks) {
      if (taskIds.length > 5) { // Max 5 tasks per agent
        conflicts.push(`Agent ${agentId} is overloaded with ${taskIds.length} tasks`)
      }
    }
    
    return conflicts
  }
}

// Resource allocation strategies
class PriorityBasedResourceStrategy implements ResourceAllocationStrategy {
  name = 'priority-based'

  async evaluate(resource: string, requesters: Agent[]): Promise<string> {
    let bestRequester = requesters[0]
    let bestScore = 0
    
    for (const requester of requesters) {
      let score = 0
      
      // Factor 1: Agent priority (higher is better)
      score += ((requester as any).priority || 0.5) * 30
      
      // Factor 2: Current workload (lower is better)
      const workload = (requester as any).currentTasks?.length || 0
      score += Math.max(0, 20 - workload * 2)
      
      // Factor 3: Capability match for the resource
      const capabilities = (requester as any).capabilities || []
      const resourceType = (resource as any).type || 'generic'
      if (capabilities.includes(resourceType)) {
        score += 25
      }
      
      // Factor 4: Recent success rate
      const successRate = (requester as any).metrics?.successRate || 0.5
      score += successRate * 15
      
      // Factor 5: Time since last resource access (fairness)
      const lastAccess = (requester as any).lastResourceAccess || 0
      const timeSinceAccess = Date.now() - lastAccess
      score += Math.min(timeSinceAccess / (1000 * 60), 10) // Max 10 points for 1+ minutes
      
      if (score > bestScore) {
        bestScore = score
        bestRequester = requester
      }
    }
    
    return bestRequester.id
  }
}

class FairnessBasedResourceStrategy implements ResourceAllocationStrategy {
  name = 'fairness-based'

  async evaluate(resource: string, requesters: Agent[]): Promise<string> {
    // Find agent that has used resources least recently
    let bestRequester = requesters[0]
    let oldestAccess = Date.now()
    
    for (const requester of requesters) {
      const lastAccess = (requester as any).lastResourceAccess || 0
      if (lastAccess < oldestAccess) {
        oldestAccess = lastAccess
        bestRequester = requester
      }
    }
    
    return bestRequester.id
  }
}

class CapabilityBasedResourceStrategy implements ResourceAllocationStrategy {
  name = 'capability-based'

  async evaluate(resource: string, requesters: Agent[]): Promise<string> {
    // Find agent with best capability match
    let bestRequester = requesters[0]
    let bestMatchScore = 0
    
    for (const requester of requesters) {
      const capabilities = (requester as any).capabilities || []
      const resourceType = (resource as any).type || 'generic'
      
      let matchScore = 0
      if (capabilities.includes(resourceType)) {
        matchScore += 50
      }
      
      // Bonus for specialized capabilities
      const specializations = capabilities.filter((cap: string) => cap.includes('advanced'))
      matchScore += specializations.length * 10
      
      if (matchScore > bestMatchScore) {
        bestMatchScore = matchScore
        bestRequester = requester
      }
    }
    
    return bestRequester.id
  }
}