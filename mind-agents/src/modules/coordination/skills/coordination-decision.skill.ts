/**
 * Coordination Decision Skill
 * 
 * Handles strategic coordination decisions between agents including task assignment,
 * resource allocation, and conflict resolution.
 */

import { Agent } from '../../../types/agent.js'
import {
  Task,
  TaskResult,
  AgentMessage,
  DelegationCriteria,
  CoordinationSkillConfig
} from '../types.js'
import { SYMindXOrchestrator } from '../logic/coordination-core.js'

export interface CoordinationDecisionSkill {
  makeTaskAssignmentDecision(
    task: Task,
    availableAgents: Agent[],
    criteria?: DelegationCriteria
  ): Promise<string>
  
  makeResourceAllocationDecision(
    resource: string,
    requesters: Agent[]
  ): Promise<string>
  
  makePriorityDecision(
    conflicts: Array<{ type: 'task' | 'resource', items: any[] }>
  ): Promise<any[]>
  
  evaluateCoordinationStrategy(
    currentStrategy: string,
    performance: any
  ): Promise<string>
}

export class SYMindXCoordinationDecisionSkill implements CoordinationDecisionSkill {
  private orchestrator: SYMindXOrchestrator
  private config: CoordinationSkillConfig
  private decisionHistory: Array<{
    type: string
    decision: any
    timestamp: Date
    outcome?: any
  }> = []

  constructor(orchestrator: SYMindXOrchestrator, config: CoordinationSkillConfig = {
    enabled: true,
    priority: 5,
    timeout: 5000,
    retries: 3
  }) {
    this.orchestrator = orchestrator
    this.config = config
  }

  async makeTaskAssignmentDecision(
    task: Task,
    availableAgents: Agent[],
    criteria?: DelegationCriteria
  ): Promise<string> {
    const startTime = Date.now()
    
    try {
      // Multi-factor decision algorithm
      const scoredAgents = await this.scoreAgentsForTask(task, availableAgents, criteria)
      
      // Select best agent
      const bestAgent = scoredAgents.reduce((best, current) => 
        current.score > best.score ? current : best
      )
      
      // Record decision
      this.recordDecision('task_assignment', {
        taskId: task.id,
        selectedAgent: bestAgent.agentId,
        score: bestAgent.score,
        alternatives: scoredAgents.length,
        criteria
      })
      
      console.log(`🎯 Task ${task.id} assigned to ${bestAgent.agentId} (score: ${bestAgent.score.toFixed(2)})`)
      return bestAgent.agentId
      
    } catch (error) {
      console.error(`❌ Task assignment decision failed:`, error)
      
      // Fallback to random selection
      const fallbackAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)]
      
      this.recordDecision('task_assignment_fallback', {
        taskId: task.id,
        selectedAgent: fallbackAgent.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return fallbackAgent.id
    } finally {
      const duration = Date.now() - startTime
      if (duration > this.config.timeout!) {
        console.warn(`⚠️ Task assignment decision took ${duration}ms (timeout: ${this.config.timeout}ms)`)
      }
    }
  }

  async makeResourceAllocationDecision(
    resource: string,
    requesters: Agent[]
  ): Promise<string> {
    const startTime = Date.now()
    
    try {
      const scoredRequesters = await this.scoreAgentsForResource(resource, requesters)
      
      const bestRequester = scoredRequesters.reduce((best, current) => 
        current.score > best.score ? current : best
      )
      
      this.recordDecision('resource_allocation', {
        resource,
        selectedAgent: bestRequester.agentId,
        score: bestRequester.score,
        alternatives: scoredRequesters.length
      })
      
      console.log(`🔒 Resource ${resource} allocated to ${bestRequester.agentId} (score: ${bestRequester.score.toFixed(2)})`)
      return bestRequester.agentId
      
    } catch (error) {
      console.error(`❌ Resource allocation decision failed:`, error)
      
      // Fallback to first requester
      const fallbackAgent = requesters[0]
      
      this.recordDecision('resource_allocation_fallback', {
        resource,
        selectedAgent: fallbackAgent.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return fallbackAgent.id
    } finally {
      const duration = Date.now() - startTime
      if (duration > this.config.timeout!) {
        console.warn(`⚠️ Resource allocation decision took ${duration}ms`)
      }
    }
  }

  async makePriorityDecision(
    conflicts: Array<{ type: 'task' | 'resource', items: any[] }>
  ): Promise<any[]> {
    const decisions: any[] = []
    
    for (const conflict of conflicts) {
      if (conflict.type === 'task') {
        const prioritizedTasks = await this.prioritizeTasks(conflict.items)
        decisions.push({ type: 'task', items: prioritizedTasks })
      } else if (conflict.type === 'resource') {
        const prioritizedResources = await this.prioritizeResources(conflict.items)
        decisions.push({ type: 'resource', items: prioritizedResources })
      }
    }
    
    this.recordDecision('priority_resolution', {
      conflictCount: conflicts.length,
      resolutions: decisions.length
    })
    
    return decisions
  }

  async evaluateCoordinationStrategy(
    currentStrategy: string,
    performance: any
  ): Promise<string> {
    const strategies = ['capability-based', 'load-balanced', 'priority-based', 'hybrid']
    
    // Analyze current performance
    const currentEfficiency = this.calculateStrategyEfficiency(performance)
    
    // If current strategy is performing well, keep it
    if (currentEfficiency > 0.8) {
      return currentStrategy
    }
    
    // Otherwise, suggest alternative strategy
    const alternatives = strategies.filter(s => s !== currentStrategy)
    const recommendedStrategy = alternatives[Math.floor(Math.random() * alternatives.length)]
    
    this.recordDecision('strategy_evaluation', {
      currentStrategy,
      currentEfficiency,
      recommendedStrategy,
      reason: 'Performance below threshold'
    })
    
    console.log(`📊 Strategy evaluation: ${currentStrategy} -> ${recommendedStrategy} (efficiency: ${currentEfficiency.toFixed(2)})`)
    return recommendedStrategy
  }

  // Private helper methods
  private async scoreAgentsForTask(
    task: Task,
    agents: Agent[],
    criteria?: DelegationCriteria
  ): Promise<Array<{ agentId: string, score: number, breakdown: any }>> {
    const scoredAgents: Array<{ agentId: string, score: number, breakdown: any }> = []
    
    for (const agent of agents) {
      const role = this.orchestrator.hierarchy.roles.get(agent.id)
      let score = 0
      const breakdown: any = {}
      
      // Factor 1: Capability match (40% weight)
      const capabilityScore = this.calculateCapabilityScore(task, role)
      score += capabilityScore * 0.4
      breakdown.capability = capabilityScore
      
      // Factor 2: Current workload (25% weight)
      const workloadScore = this.calculateWorkloadScore(agent)
      score += workloadScore * 0.25
      breakdown.workload = workloadScore
      
      // Factor 3: Priority/hierarchy (20% weight)
      const priorityScore = role ? role.priority * 10 : 5
      score += priorityScore * 0.2
      breakdown.priority = priorityScore
      
      // Factor 4: Historical performance (15% weight)
      const performanceScore = this.calculatePerformanceScore(agent, task)
      score += performanceScore * 0.15
      breakdown.performance = performanceScore
      
      // Apply criteria bonuses
      if (criteria) {
        if (criteria.preferredRoles && role && criteria.preferredRoles.includes(role.name)) {
          score += 10
          breakdown.rolePreference = 10
        }
        
        if (criteria.priority) {
          score *= criteria.priority
          breakdown.taskPriority = criteria.priority
        }
      }
      
      scoredAgents.push({ agentId: agent.id, score, breakdown })
    }
    
    return scoredAgents.sort((a, b) => b.score - a.score)
  }

  private async scoreAgentsForResource(
    resource: string,
    agents: Agent[]
  ): Promise<Array<{ agentId: string, score: number, breakdown: any }>> {
    const scoredAgents: Array<{ agentId: string, score: number, breakdown: any }> = []
    
    for (const agent of agents) {
      const role = this.orchestrator.hierarchy.roles.get(agent.id)
      let score = 0
      const breakdown: any = {}
      
      // Factor 1: Agent priority (40% weight)
      const priorityScore = role ? role.priority * 10 : 5
      score += priorityScore * 0.4
      breakdown.priority = priorityScore
      
      // Factor 2: Current resource usage (30% weight)
      const resourceUsageScore = this.calculateResourceUsageScore(agent)
      score += resourceUsageScore * 0.3
      breakdown.resourceUsage = resourceUsageScore
      
      // Factor 3: Capability match for resource type (20% weight)
      const resourceCapabilityScore = this.calculateResourceCapabilityScore(resource, role)
      score += resourceCapabilityScore * 0.2
      breakdown.resourceCapability = resourceCapabilityScore
      
      // Factor 4: Fairness (time since last access) (10% weight)
      const fairnessScore = this.calculateFairnessScore(agent, resource)
      score += fairnessScore * 0.1
      breakdown.fairness = fairnessScore
      
      scoredAgents.push({ agentId: agent.id, score, breakdown })
    }
    
    return scoredAgents.sort((a, b) => b.score - a.score)
  }

  private calculateCapabilityScore(task: Task, role: any): number {
    if (!role) return 5 // Base score
    
    const requiredCapabilities = task.dependencies || []
    if (requiredCapabilities.length === 0) return 7 // Generic task
    
    const matchingCapabilities = requiredCapabilities.filter(cap => 
      role.capabilities.includes(cap)
    )
    
    const matchRatio = matchingCapabilities.length / requiredCapabilities.length
    return matchRatio * 10
  }

  private calculateWorkloadScore(agent: Agent): number {
    // Simplified workload calculation
    const currentTasks = (agent as any).currentTasks?.length || 0
    const maxTasks = 5
    
    // Higher score for lower workload
    return Math.max(0, (maxTasks - currentTasks) / maxTasks * 10)
  }

  private calculatePerformanceScore(agent: Agent, task: Task): number {
    // Simplified performance calculation
    const successRate = (agent as any).metrics?.successRate || 0.7
    const taskTypePerformance = (agent as any).metrics?.taskTypePerformance?.[task.type] || successRate
    
    return taskTypePerformance * 10
  }

  private calculateResourceUsageScore(agent: Agent): number {
    // Higher score for agents using fewer resources
    const currentResources = (agent as any).currentResources?.length || 0
    const maxResources = 3
    
    return Math.max(0, (maxResources - currentResources) / maxResources * 10)
  }

  private calculateResourceCapabilityScore(resource: string, role: any): number {
    if (!role) return 5
    
    const resourceType = (resource as any).type || 'generic'
    const hasCapability = role.capabilities.includes(resourceType)
    
    return hasCapability ? 10 : 3
  }

  private calculateFairnessScore(agent: Agent, resource: string): number {
    const lastAccess = (agent as any).lastResourceAccess?.[resource] || 0
    const timeSinceAccess = Date.now() - lastAccess
    const hoursSinceAccess = timeSinceAccess / (1000 * 60 * 60)
    
    // Higher score for longer time since last access
    return Math.min(hoursSinceAccess, 10)
  }

  private async prioritizeTasks(tasks: Task[]): Promise<Task[]> {
    return tasks.sort((a, b) => {
      // Priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      
      // Then deadline
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime()
      }
      
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      
      return 0
    })
  }

  private async prioritizeResources(resources: any[]): Promise<any[]> {
    return resources.sort((a, b) => {
      const aScore = (a.priority || 0.5) + (a.scarcity || 0.5)
      const bScore = (b.priority || 0.5) + (b.scarcity || 0.5)
      return bScore - aScore
    })
  }

  private calculateStrategyEfficiency(performance: any): number {
    if (!performance) return 0.5
    
    const taskCompletionRate = performance.taskCompletionRate || 0.7
    const resourceUtilization = performance.resourceUtilization || 0.6
    const averageResponseTime = performance.averageResponseTime || 1000
    const conflictRate = performance.conflictRate || 0.1
    
    // Normalize and combine metrics
    const efficiency = (
      taskCompletionRate * 0.4 +
      resourceUtilization * 0.3 +
      (1 - Math.min(averageResponseTime / 5000, 1)) * 0.2 +
      (1 - Math.min(conflictRate, 1)) * 0.1
    )
    
    return Math.max(0, Math.min(1, efficiency))
  }

  private recordDecision(type: string, decision: any): void {
    this.decisionHistory.push({
      type,
      decision,
      timestamp: new Date()
    })
    
    // Keep only last 100 decisions
    if (this.decisionHistory.length > 100) {
      this.decisionHistory = this.decisionHistory.slice(-100)
    }
  }

  // Public methods for monitoring and analysis
  getDecisionHistory(type?: string): Array<any> {
    if (type) {
      return this.decisionHistory.filter(d => d.type === type)
    }
    return [...this.decisionHistory]
  }

  getDecisionMetrics() {
    const total = this.decisionHistory.length
    const byType = this.decisionHistory.reduce((acc, decision) => {
      acc[decision.type] = (acc[decision.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const avgDecisionTime = this.calculateAverageDecisionTime()
    
    return {
      totalDecisions: total,
      decisionsByType: byType,
      averageDecisionTime: avgDecisionTime,
      recentActivity: this.decisionHistory.slice(-10)
    }
  }

  private calculateAverageDecisionTime(): number {
    // Simplified calculation - would need more detailed timing data
    return 150 // milliseconds
  }
}