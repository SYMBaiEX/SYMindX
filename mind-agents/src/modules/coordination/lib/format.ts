/**
 * Coordination Module Formatting Utilities
 * 
 * Functions for formatting and displaying coordination-related data.
 */

import {
  Task,
  AgentRole,
  AgentHierarchy,
  ResourceStatus,
  CoherenceMetrics
} from '../types.js'
import { Agent } from '../../../types/agent.js'

// Task formatting
export class TaskFormatter {
  static formatTask(task: Task, includeDetails: boolean = false): string {
    const priority = this.formatPriority(task.priority)
    const status = this.formatTaskStatus(task.status)
    const deadline = task.deadline ? this.formatDeadline(task.deadline) : 'No deadline'
    
    let formatted = `[${task.id}] ${priority} ${status}`
    
    if (includeDetails) {
      formatted += `\n  Type: ${task.type || 'generic'}`
      formatted += `\n  Deadline: ${deadline}`
      formatted += `\n  Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`
      formatted += `\n  Assigned to: ${task.assignedTo || 'Unassigned'}`
    }
    
    return formatted
  }

  static formatTaskList(tasks: Task[], groupBy?: 'status' | 'priority' | 'agent'): string {
    if (tasks.length === 0) return 'No tasks'
    
    if (!groupBy) {
      return tasks.map(task => this.formatTask(task)).join('\n')
    }
    
    const grouped = this.groupTasks(tasks, groupBy)
    const sections: string[] = []
    
    for (const [group, groupTasks] of Object.entries(grouped)) {
      sections.push(`\n${group.toUpperCase()}:`)
      sections.push(groupTasks.map(task => `  ${this.formatTask(task)}`).join('\n'))
    }
    
    return sections.join('\n')
  }

  private static formatPriority(priority: number): string {
    if (priority >= 0.9) return '🔴 CRITICAL'
    if (priority >= 0.7) return '🟡 HIGH'
    if (priority >= 0.5) return '🟢 MEDIUM'
    if (priority >= 0.3) return '🔵 LOW'
    return '⚪ BACKGROUND'
  }

  private static formatTaskStatus(status: any): string {
    switch (status) {
      case 'pending': return '⏳ PENDING'
      case 'assigned': return '📋 ASSIGNED'
      case 'in_progress': return '⚡ IN PROGRESS'
      case 'completed': return '✅ COMPLETED'
      case 'failed': return '❌ FAILED'
      case 'cancelled': return '🚫 CANCELLED'
      default: return '❓ UNKNOWN'
    }
  }

  private static formatDeadline(deadline: Date): string {
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()
    
    if (diff < 0) return '🚨 OVERDUE'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours < 1) return `⏰ ${minutes}m`
    if (hours < 24) return `⏰ ${hours}h ${minutes}m`
    
    const days = Math.floor(hours / 24)
    return `📅 ${days}d ${hours % 24}h`
  }

  private static groupTasks(tasks: Task[], groupBy: string): Record<string, Task[]> {
    return tasks.reduce((groups, task) => {
      let key: string
      
      switch (groupBy) {
        case 'status':
          key = task.status || 'unknown'
          break
        case 'priority':
          key = this.getPriorityGroup(task.priority)
          break
        case 'agent':
          key = task.assignedTo || 'unassigned'
          break
        default:
          key = 'all'
      }
      
      if (!groups[key]) groups[key] = []
      groups[key].push(task)
      
      return groups
    }, {} as Record<string, Task[]>)
  }

  private static getPriorityGroup(priority: number): string {
    if (priority >= 0.9) return 'critical'
    if (priority >= 0.7) return 'high'
    if (priority >= 0.5) return 'medium'
    if (priority >= 0.3) return 'low'
    return 'background'
  }
}

// Agent formatting
export class AgentFormatter {
  static formatAgent(agent: Agent, role?: AgentRole, includeDetails: boolean = false): string {
    const status = this.formatAgentStatus(agent.status)
    const roleInfo = role ? `[${role.name}]` : '[No Role]'
    
    let formatted = `${agent.id} ${roleInfo} ${status}`
    
    if (includeDetails && role) {
      formatted += `\n  Priority: ${this.formatPriority(role.priority)}`
      formatted += `\n  Capabilities: ${role.capabilities.join(', ')}`
      formatted += `\n  Current Load: ${this.formatWorkload(agent)}`
    }
    
    return formatted
  }

  static formatAgentList(
    agents: Agent[],
    roles: Map<string, AgentRole>,
    groupBy?: 'role' | 'status' | 'workload'
  ): string {
    if (agents.length === 0) return 'No agents'
    
    if (!groupBy) {
      return agents.map(agent => 
        this.formatAgent(agent, roles.get(agent.id))
      ).join('\n')
    }
    
    const grouped = this.groupAgents(agents, roles, groupBy)
    const sections: string[] = []
    
    for (const [group, groupAgents] of Object.entries(grouped)) {
      sections.push(`\n${group.toUpperCase()}:`)
      sections.push(groupAgents.map(agent => 
        `  ${this.formatAgent(agent, roles.get(agent.id))}`
      ).join('\n'))
    }
    
    return sections.join('\n')
  }

  private static formatAgentStatus(status: any): string {
    switch (status) {
      case 'idle': return '💤 IDLE'
      case 'busy': return '⚡ BUSY'
      case 'waiting': return '⏳ WAITING'
      case 'blocked': return '🚫 BLOCKED'
      case 'error': return '❌ ERROR'
      case 'offline': return '📴 OFFLINE'
      default: return '❓ UNKNOWN'
    }
  }

  private static formatPriority(priority: number): string {
    return `${(priority * 100).toFixed(0)}%`
  }

  private static formatWorkload(agent: Agent): string {
    const currentTasks = (agent as any).currentTasks?.length || 0
    const maxTasks = 5 // Configurable
    
    const percentage = Math.round((currentTasks / maxTasks) * 100)
    const bar = this.createProgressBar(percentage, 10)
    
    return `${currentTasks}/${maxTasks} ${bar} ${percentage}%`
  }

  private static createProgressBar(percentage: number, length: number): string {
    const filled = Math.round((percentage / 100) * length)
    const empty = length - filled
    
    return '█'.repeat(filled) + '░'.repeat(empty)
  }

  private static groupAgents(
    agents: Agent[],
    roles: Map<string, AgentRole>,
    groupBy: string
  ): Record<string, Agent[]> {
    return agents.reduce((groups, agent) => {
      let key: string
      
      switch (groupBy) {
        case 'role':
          key = roles.get(agent.id)?.name || 'no_role'
          break
        case 'status':
          key = agent.status || 'unknown'
          break
        case 'workload':
          key = this.getWorkloadGroup(agent)
          break
        default:
          key = 'all'
      }
      
      if (!groups[key]) groups[key] = []
      groups[key].push(agent)
      
      return groups
    }, {} as Record<string, Agent[]>)
  }

  private static getWorkloadGroup(agent: Agent): string {
    const currentTasks = (agent as any).currentTasks?.length || 0
    
    if (currentTasks === 0) return 'idle'
    if (currentTasks <= 2) return 'light'
    if (currentTasks <= 4) return 'moderate'
    return 'heavy'
  }
}

// Resource formatting
export class ResourceFormatter {
  static formatResource(resourceId: string, status: ResourceStatus): string {
    const statusIcon = status.allocated ? '🔒' : '🔓'
    const allocatedTo = status.allocatedTo ? ` → ${status.allocatedTo}` : ''
    const queue = status.queue.length > 0 ? ` (${status.queue.length} queued)` : ''
    
    return `${statusIcon} ${resourceId}${allocatedTo}${queue}`
  }

  static formatResourceList(resources: Map<string, ResourceStatus>): string {
    if (resources.size === 0) return 'No resources'
    
    const sections = {
      allocated: [] as string[],
      available: [] as string[]
    }
    
    for (const [resourceId, status] of resources) {
      const formatted = this.formatResource(resourceId, status)
      
      if (status.allocated) {
        sections.allocated.push(formatted)
      } else {
        sections.available.push(formatted)
      }
    }
    
    const output: string[] = []
    
    if (sections.allocated.length > 0) {
      output.push('ALLOCATED RESOURCES:')
      output.push(...sections.allocated.map(r => `  ${r}`))
    }
    
    if (sections.available.length > 0) {
      output.push('AVAILABLE RESOURCES:')
      output.push(...sections.available.map(r => `  ${r}`))
    }
    
    return output.join('\n')
  }

  static formatResourceMetrics(metrics: any): string {
    const total = metrics.totalResources || 0
    const allocated = metrics.allocatedResources || 0
    const available = metrics.availableResources || 0
    const queued = metrics.queuedRequests || 0
    const utilization = metrics.utilizationRate || 0
    
    const utilizationBar = AgentFormatter['createProgressBar'](utilization * 100, 10)
    
    return [
      'RESOURCE METRICS:',
      `  Total: ${total}`,
      `  Allocated: ${allocated}`,
      `  Available: ${available}`,
      `  Queued Requests: ${queued}`,
      `  Utilization: ${utilizationBar} ${(utilization * 100).toFixed(1)}%`
    ].join('\n')
  }
}

// Hierarchy formatting
export class HierarchyFormatter {
  static formatHierarchy(hierarchy: AgentHierarchy, agents: Map<string, Agent>): string {
    if (!hierarchy.root) return 'No hierarchy established'
    
    const tree = this.buildHierarchyTree(hierarchy, hierarchy.root, agents)
    return tree
  }

  private static buildHierarchyTree(
    hierarchy: AgentHierarchy,
    nodeId: string,
    agents: Map<string, Agent>,
    prefix: string = '',
    isLast: boolean = true
  ): string {
    const agent = agents.get(nodeId)
    const role = hierarchy.roles.get(nodeId)
    
    const nodeSymbol = isLast ? '└── ' : '├── '
    const agentInfo = agent ? `${agent.id} [${role?.name || 'No Role'}]` : `${nodeId} [Missing]`
    
    let result = prefix + nodeSymbol + agentInfo + '\n'
    
    const children = hierarchy.children.get(nodeId) || []
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const isLastChild = i === children.length - 1
      const childPrefix = prefix + (isLast ? '    ' : '│   ')
      
      result += this.buildHierarchyTree(hierarchy, child, agents, childPrefix, isLastChild)
    }
    
    return result
  }

  static formatHierarchyStats(hierarchy: AgentHierarchy): string {
    const totalAgents = hierarchy.roles.size
    const depth = this.calculateMaxDepth(hierarchy)
    const roleDistribution = this.getRoleDistribution(hierarchy)
    
    const roleStats = Object.entries(roleDistribution)
      .map(([role, count]) => `  ${role}: ${count}`)
      .join('\n')
    
    return [
      'HIERARCHY STATISTICS:',
      `  Total Agents: ${totalAgents}`,
      `  Max Depth: ${depth}`,
      `  Root: ${hierarchy.root || 'None'}`,
      'ROLE DISTRIBUTION:',
      roleStats
    ].join('\n')
  }

  private static calculateMaxDepth(hierarchy: AgentHierarchy): number {
    if (!hierarchy.root) return 0
    
    const calculateDepth = (nodeId: string): number => {
      const children = hierarchy.children.get(nodeId) || []
      if (children.length === 0) return 1
      
      return 1 + Math.max(...children.map(childId => calculateDepth(childId)))
    }
    
    return calculateDepth(hierarchy.root)
  }

  private static getRoleDistribution(hierarchy: AgentHierarchy): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    for (const role of hierarchy.roles.values()) {
      distribution[role.name] = (distribution[role.name] || 0) + 1
    }
    
    return distribution
  }
}

// Metrics formatting
export class MetricsFormatter {
  static formatCoherenceMetrics(metrics: CoherenceMetrics): string {
    const syncRate = (metrics.synchronizationRate * 100).toFixed(1)
    const cohesion = (metrics.cohesionIndex * 100).toFixed(1)
    const conflictRate = (metrics.conflictRate * 100).toFixed(1)
    
    const syncBar = AgentFormatter['createProgressBar'](metrics.synchronizationRate * 100, 10)
    const cohesionBar = AgentFormatter['createProgressBar'](metrics.cohesionIndex * 100, 10)
    
    return [
      `GROUP COHERENCE METRICS (${metrics.groupId}):`,
      `  Agents: ${metrics.agentCount}`,
      `  Synchronization: ${syncBar} ${syncRate}%`,
      `  Cohesion: ${cohesionBar} ${cohesion}%`,
      `  Response Latency: ${metrics.responseLatency}ms`,
      `  Conflict Rate: ${conflictRate}%`,
      `  Emergent Behaviors: ${metrics.emergentBehaviors.join(', ') || 'None'}`,
      `  Last Updated: ${metrics.lastUpdate.toLocaleTimeString()}`
    ].join('\n')
  }

  static formatPerformanceMetrics(metrics: any): string {
    const efficiency = (metrics.overallEfficiency * 100).toFixed(1)
    const completionRate = (metrics.taskCompletionRate * 100).toFixed(1)
    const utilization = (metrics.resourceUtilization * 100).toFixed(1)
    const collaboration = (metrics.collaborationScore * 100).toFixed(1)
    const errorRate = (metrics.errorRate * 100).toFixed(1)
    
    const efficiencyBar = AgentFormatter['createProgressBar'](metrics.overallEfficiency * 100, 10)
    
    return [
      'PERFORMANCE METRICS:',
      `  Overall Efficiency: ${efficiencyBar} ${efficiency}%`,
      `  Task Completion Rate: ${completionRate}%`,
      `  Resource Utilization: ${utilization}%`,
      `  Collaboration Score: ${collaboration}%`,
      `  Error Rate: ${errorRate}%`,
      `  Average Task Time: ${metrics.averageTaskTime}ms`
    ].join('\n')
  }
}

// Utility functions for general formatting
export class GeneralFormatter {
  static formatTimestamp(timestamp: Date, format?: 'short' | 'long' | 'relative'): string {
    switch (format) {
      case 'short':
        return timestamp.toLocaleTimeString()
      case 'long':
        return timestamp.toLocaleString()
      case 'relative':
        return this.formatRelativeTime(timestamp)
      default:
        return timestamp.toISOString()
    }
  }

  private static formatRelativeTime(timestamp: Date): string {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  static truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str
    return str.substring(0, maxLength - 3) + '...'
  }
}