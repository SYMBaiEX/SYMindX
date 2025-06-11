/**
 * Coordination Utility Functions
 * 
 * Helper functions and utilities used throughout the coordination module.
 */

import { Agent } from '../../../types/agent.js'
import {
  Task,
  AgentRole,
  AgentHierarchy,
  DelegationCriteria,
  ResourceStatus
} from '../types.js'

// Agent hierarchy utilities
export class HierarchyUtils {
  static calculateDistance(
    hierarchy: AgentHierarchy,
    fromAgentId: string,
    toAgentId: string
  ): number {
    if (fromAgentId === toAgentId) return 0
    
    const fromPath = this.getPathToRoot(hierarchy, fromAgentId)
    const toPath = this.getPathToRoot(hierarchy, toAgentId)
    
    // Find common ancestor
    const commonAncestor = this.findCommonAncestor(fromPath, toPath)
    
    if (!commonAncestor) return -1 // No connection
    
    const fromDistance = fromPath.indexOf(commonAncestor)
    const toDistance = toPath.indexOf(commonAncestor)
    
    return fromDistance + toDistance
  }

  static getPathToRoot(hierarchy: AgentHierarchy, agentId: string): string[] {
    const path: string[] = [agentId]
    let currentId = agentId
    
    while (hierarchy.parents.has(currentId)) {
      currentId = hierarchy.parents.get(currentId)!
      path.push(currentId)
      
      // Prevent infinite loops
      if (path.length > 100) break
    }
    
    return path
  }

  static findCommonAncestor(path1: string[], path2: string[]): string | null {
    const set1 = new Set(path1)
    
    for (const node of path2) {
      if (set1.has(node)) {
        return node
      }
    }
    
    return null
  }

  static isAncestor(
    hierarchy: AgentHierarchy,
    ancestorId: string,
    descendantId: string
  ): boolean {
    const descendantPath = this.getPathToRoot(hierarchy, descendantId)
    return descendantPath.includes(ancestorId)
  }

  static getSubtree(hierarchy: AgentHierarchy, rootId: string): string[] {
    const subtree: string[] = [rootId]
    const children = hierarchy.children.get(rootId) || []
    
    for (const childId of children) {
      subtree.push(...this.getSubtree(hierarchy, childId))
    }
    
    return subtree
  }

  static validateHierarchy(hierarchy: AgentHierarchy): HierarchyValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check for cycles
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) {
        errors.push(`Cycle detected involving node ${nodeId}`)
        return true
      }
      
      if (visited.has(nodeId)) return false
      
      visited.add(nodeId)
      recursionStack.add(nodeId)
      
      const children = hierarchy.children.get(nodeId) || []
      for (const childId of children) {
        if (hasCycle(childId)) return true
      }
      
      recursionStack.delete(nodeId)
      return false
    }
    
    if (hierarchy.root) {
      hasCycle(hierarchy.root)
    }
    
    // Check parent-child consistency
    for (const [parentId, children] of hierarchy.children) {
      for (const childId of children) {
        const childParent = hierarchy.parents.get(childId)
        if (childParent !== parentId) {
          errors.push(`Inconsistent parent-child relationship: ${parentId} -> ${childId}`)
        }
      }
    }
    
    // Check for orphaned nodes
    for (const [childId, parentId] of hierarchy.parents) {
      const parentChildren = hierarchy.children.get(parentId) || []
      if (!parentChildren.includes(childId)) {
        errors.push(`Orphaned node: ${childId} has parent ${parentId} but not in parent's children`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// Task utilities
export class TaskUtils {
  static calculateTaskComplexity(task: Task): number {
    let complexity = 1
    
    // Factor in dependencies
    complexity += task.dependencies.length * 0.5
    
    // Factor in priority (higher priority = higher complexity)
    complexity += task.priority * 0.3
    
    // Factor in deadline pressure
    if (task.deadline) {
      const timeToDeadline = task.deadline.getTime() - Date.now()
      const urgency = Math.max(0, 1 - (timeToDeadline / (24 * 60 * 60 * 1000))) // Normalize to days
      complexity += urgency * 0.4
    }
    
    return Math.min(5, complexity) // Cap at 5
  }

  static estimateTaskDuration(task: Task, agentCapabilities?: string[]): number {
    const baseTime = 5000 // 5 seconds base
    const complexity = this.calculateTaskComplexity(task)
    
    let duration = baseTime * complexity
    
    // Adjust for agent capabilities
    if (agentCapabilities) {
      const matchingCapabilities = task.dependencies.filter(dep => 
        agentCapabilities.includes(dep)
      )
      const capabilityRatio = matchingCapabilities.length / Math.max(1, task.dependencies.length)
      
      // Agents with better capabilities complete tasks faster
      duration *= (1 - capabilityRatio * 0.3)
    }
    
    return Math.max(1000, duration) // Minimum 1 second
  }

  static prioritizeTasks(tasks: Task[], criteria?: DelegationCriteria): Task[] {
    return tasks.sort((a, b) => {
      // Primary sort: explicit priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      
      // Secondary sort: deadline urgency
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime()
      }
      
      if (a.deadline && !b.deadline) return -1
      if (!a.deadline && b.deadline) return 1
      
      // Tertiary sort: complexity (simpler tasks first for quick wins)
      const aComplexity = this.calculateTaskComplexity(a)
      const bComplexity = this.calculateTaskComplexity(b)
      
      return aComplexity - bComplexity
    })
  }

  static checkTaskCompatibility(task: Task, agent: Agent, role?: AgentRole): CompatibilityResult {
    const result: CompatibilityResult = {
      compatible: true,
      score: 0,
      issues: []
    }
    
    if (!role) {
      result.compatible = false
      result.issues.push('No role information available')
      return result
    }
    
    // Check capability requirements
    const requiredCapabilities = task.dependencies
    const agentCapabilities = role.capabilities
    const missingCapabilities = requiredCapabilities.filter(cap => 
      !agentCapabilities.includes(cap)
    )
    
    if (missingCapabilities.length > 0) {
      result.compatible = false
      result.issues.push(`Missing capabilities: ${missingCapabilities.join(', ')}`)
    } else {
      result.score += 30 // Base compatibility score
    }
    
    // Check workload capacity
    const currentLoad = (agent as any).currentTasks?.length || 0
    const maxLoad = 5 // Configurable
    
    if (currentLoad >= maxLoad) {
      result.compatible = false
      result.issues.push(`Agent at maximum capacity: ${currentLoad}/${maxLoad}`)
    } else {
      const loadScore = (maxLoad - currentLoad) / maxLoad * 20
      result.score += loadScore
    }
    
    // Check priority alignment
    const agentPriority = role.priority
    const taskPriority = task.priority
    
    if (taskPriority > agentPriority + 0.3) {
      result.issues.push('Task priority higher than agent capability')
      result.score -= 10
    } else {
      result.score += taskPriority * 10
    }
    
    return result
  }
}

// Resource utilities
export class ResourceUtils {
  static calculateResourceValue(resource: string, context?: any): number {
    // Base value
    let value = 1.0
    
    // Factor in scarcity (fewer available = higher value)
    const scarcity = (context?.scarcity || 0.5)
    value += scarcity * 0.5
    
    // Factor in demand (more requesters = higher value)
    const demand = (context?.demand || 0.5)
    value += demand * 0.3
    
    // Factor in utility (how useful the resource is)
    const utility = (context?.utility || 0.5)
    value += utility * 0.4
    
    return Math.max(0.1, Math.min(2.0, value))
  }

  static optimizeResourceAllocation(
    resources: string[],
    agents: Agent[],
    constraints?: ResourceConstraints
  ): ResourceAllocationPlan {
    const plan: ResourceAllocationPlan = {
      allocations: new Map(),
      efficiency: 0,
      conflicts: [],
      unallocated: []
    }
    
    // Simple greedy allocation algorithm
    const availableResources = [...resources]
    const agentPriorities = agents.map(agent => ({
      agent,
      priority: (agent as any).priority || 0.5,
      currentResources: (agent as any).currentResources?.length || 0
    })).sort((a, b) => b.priority - a.priority)
    
    for (const { agent } of agentPriorities) {
      if (availableResources.length === 0) break
      
      const maxResourcesPerAgent = constraints?.maxResourcesPerAgent || 2
      const agentCurrentResources = plan.allocations.get(agent.id) || []
      
      if (agentCurrentResources.length < maxResourcesPerAgent) {
        const resource = availableResources.shift()!
        
        if (!plan.allocations.has(agent.id)) {
          plan.allocations.set(agent.id, [])
        }
        plan.allocations.get(agent.id)!.push(resource)
      }
    }
    
    // Calculate efficiency
    const totalResources = resources.length
    const allocatedResources = Array.from(plan.allocations.values())
      .reduce((sum, list) => sum + list.length, 0)
    
    plan.efficiency = totalResources > 0 ? allocatedResources / totalResources : 0
    plan.unallocated = availableResources
    
    return plan
  }

  static detectResourceConflicts(
    allocations: Map<string, string[]>,
    constraints?: ResourceConstraints
  ): ResourceConflict[] {
    const conflicts: ResourceConflict[] = []
    
    // Check for over-allocation
    const maxResourcesPerAgent = constraints?.maxResourcesPerAgent || 3
    
    for (const [agentId, resources] of allocations) {
      if (resources.length > maxResourcesPerAgent) {
        conflicts.push({
          type: 'over_allocation',
          agentId,
          resources,
          severity: (resources.length - maxResourcesPerAgent) / maxResourcesPerAgent,
          description: `Agent ${agentId} has ${resources.length} resources (max: ${maxResourcesPerAgent})`
        })
      }
    }
    
    // Check for resource contention (same resource allocated to multiple agents)
    const resourceToAgents = new Map<string, string[]>()
    
    for (const [agentId, resources] of allocations) {
      for (const resource of resources) {
        if (!resourceToAgents.has(resource)) {
          resourceToAgents.set(resource, [])
        }
        resourceToAgents.get(resource)!.push(agentId)
      }
    }
    
    for (const [resource, agents] of resourceToAgents) {
      if (agents.length > 1) {
        conflicts.push({
          type: 'contention',
          resource,
          agents,
          severity: (agents.length - 1) * 0.5,
          description: `Resource ${resource} allocated to multiple agents: ${agents.join(', ')}`
        })
      }
    }
    
    return conflicts
  }
}

// Performance utilities
export class PerformanceUtils {
  static calculateAgentEfficiency(
    agent: Agent,
    timeWindow: number = 3600000 // 1 hour
  ): AgentEfficiencyMetrics {
    const metrics = (agent as any).metrics || {}
    
    return {
      taskCompletionRate: metrics.taskCompletionRate || 0.7,
      averageTaskTime: metrics.averageTaskTime || 5000,
      resourceUtilization: metrics.resourceUtilization || 0.6,
      collaborationScore: metrics.collaborationScore || 0.8,
      errorRate: metrics.errorRate || 0.1,
      overallEfficiency: this.calculateOverallEfficiency(metrics)
    }
  }

  static calculateOverallEfficiency(metrics: any): number {
    const weights = {
      taskCompletionRate: 0.4,
      resourceUtilization: 0.3,
      collaborationScore: 0.2,
      errorRate: -0.1 // Negative weight for errors
    }
    
    let efficiency = 0
    efficiency += (metrics.taskCompletionRate || 0.7) * weights.taskCompletionRate
    efficiency += (metrics.resourceUtilization || 0.6) * weights.resourceUtilization
    efficiency += (metrics.collaborationScore || 0.8) * weights.collaborationScore
    efficiency += (1 - (metrics.errorRate || 0.1)) * Math.abs(weights.errorRate)
    
    return Math.max(0, Math.min(1, efficiency))
  }

  static benchmarkCoordinationPerformance(
    orchestratorMetrics: any,
    baseline?: any
  ): CoordinationBenchmark {
    const current = {
      throughput: orchestratorMetrics.tasksPerSecond || 0.1,
      latency: orchestratorMetrics.averageResponseTime || 1000,
      efficiency: orchestratorMetrics.resourceUtilization || 0.6,
      conflictRate: orchestratorMetrics.conflictRate || 0.05
    }
    
    const base = baseline || {
      throughput: 0.08,
      latency: 1200,
      efficiency: 0.5,
      conflictRate: 0.1
    }
    
    return {
      throughputImprovement: (current.throughput - base.throughput) / base.throughput,
      latencyImprovement: (base.latency - current.latency) / base.latency,
      efficiencyImprovement: (current.efficiency - base.efficiency) / base.efficiency,
      conflictReduction: (base.conflictRate - current.conflictRate) / base.conflictRate,
      overallScore: this.calculateBenchmarkScore(current, base)
    }
  }

  private static calculateBenchmarkScore(current: any, baseline: any): number {
    const improvements = [
      (current.throughput - baseline.throughput) / baseline.throughput,
      (baseline.latency - current.latency) / baseline.latency,
      (current.efficiency - baseline.efficiency) / baseline.efficiency,
      (baseline.conflictRate - current.conflictRate) / baseline.conflictRate
    ]
    
    const average = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
    return Math.max(-1, Math.min(1, average))
  }
}

// Utility types and interfaces
export interface HierarchyValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface CompatibilityResult {
  compatible: boolean
  score: number
  issues: string[]
}

export interface ResourceConstraints {
  maxResourcesPerAgent?: number
  maxAgentsPerResource?: number
  priorityThreshold?: number
}

export interface ResourceAllocationPlan {
  allocations: Map<string, string[]>
  efficiency: number
  conflicts: ResourceConflict[]
  unallocated: string[]
}

export interface ResourceConflict {
  type: 'over_allocation' | 'contention' | 'starvation'
  agentId?: string
  resource?: string
  agents?: string[]
  resources?: string[]
  severity: number
  description: string
}

export interface AgentEfficiencyMetrics {
  taskCompletionRate: number
  averageTaskTime: number
  resourceUtilization: number
  collaborationScore: number
  errorRate: number
  overallEfficiency: number
}

export interface CoordinationBenchmark {
  throughputImprovement: number
  latencyImprovement: number
  efficiencyImprovement: number
  conflictReduction: number
  overallScore: number
}