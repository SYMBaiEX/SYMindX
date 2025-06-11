/**
 * Core Coordination Logic
 * 
 * Central orchestration system for multi-agent coordination, task delegation,
 * and inter-agent communication.
 */

import { EventEmitter } from 'events'
import { Agent } from '../../../types/agent.js'
import {
  CoordinationModule,
  AgentOrchestrator,
  DelegationCriteria,
  ConflictResolver,
  ResourceManager,
  CoordinationConfig
} from '../types.js'
import {
  Task,
  TaskResult,
  AgentMessage,
  AgentFilter,
  AgentRole,
  AgentHierarchy
} from '../types.js'
// Forward declarations - actual imports will be done dynamically to avoid circular dependencies

export class SYMindXOrchestrator implements AgentOrchestrator {
  agents: Map<string, Agent> = new Map()
  hierarchy: AgentHierarchy = {
    root: '',
    children: new Map(),
    parents: new Map(),
    roles: new Map()
  }
  taskDelegation: any
  interAgentCommunication: any
  
  private tasks: Map<string, Task> = new Map()
  private taskResults: Map<string, TaskResult> = new Map()
  private eventBus = new EventEmitter()
  private config: CoordinationConfig

  constructor(config: CoordinationConfig = {}) {
    this.config = {
      maxAgentsPerOrchestrator: 50,
      maxTasksPerAgent: 5,
      messageHistorySize: 1000,
      defaultTaskTimeout: 30000,
      resourceAllocationTimeout: 10000,
      ...config
    }
    
    // Dynamic imports to avoid circular dependencies
    this.initializeComponents()
  }

  private async initializeComponents() {
    // Dynamic imports to avoid circular dependency issues
    const { SYMindXTaskDelegation } = await import('./task-delegation.js')
    const { SYMindXCommunication } = await import('./communication.js')
    
    this.taskDelegation = new SYMindXTaskDelegation(this, this.config)
    this.interAgentCommunication = new SYMindXCommunication(this, this.config)
  }

  async addAgent(agent: Agent, role?: AgentRole): Promise<void> {
    if (this.agents.size >= this.config.maxAgentsPerOrchestrator!) {
      throw new Error(`Maximum agents limit reached: ${this.config.maxAgentsPerOrchestrator}`)
    }

    this.agents.set(agent.id, agent)
    
    if (role) {
      this.hierarchy.roles.set(agent.id, role)
    }

    // If this is the first agent, make it root
    if (this.agents.size === 1 && !this.hierarchy.root) {
      this.hierarchy.root = agent.id
    }

    console.log(`🤖 Agent ${agent.id} added to orchestrator`)
    this.eventBus.emit('agent.added', { agentId: agent.id, role })
  }

  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return

    // Remove from hierarchy
    this.hierarchy.roles.delete(agentId)
    this.hierarchy.parents.delete(agentId)
    
    const children = this.hierarchy.children.get(agentId)
    if (children) {
      // Reassign children to parent or root
      const parent = this.hierarchy.parents.get(agentId) || this.hierarchy.root
      for (const childId of children) {
        this.hierarchy.parents.set(childId, parent)
        const parentChildren = this.hierarchy.children.get(parent) || []
        parentChildren.push(childId)
        this.hierarchy.children.set(parent, parentChildren)
      }
      this.hierarchy.children.delete(agentId)
    }

    // If removing root, assign new root
    if (this.hierarchy.root === agentId) {
      const remainingAgents = Array.from(this.agents.keys()).filter(id => id !== agentId)
      this.hierarchy.root = remainingAgents[0] || ''
    }

    this.agents.delete(agentId)
    console.log(`🤖 Agent ${agentId} removed from orchestrator`)
    this.eventBus.emit('agent.removed', { agentId })
  }

  getAgentsByRole(role: string): Agent[] {
    const agentIds = Array.from(this.hierarchy.roles.entries())
      .filter(([_, agentRole]) => agentRole.name === role)
      .map(([agentId, _]) => agentId)
    
    return agentIds.map(id => this.agents.get(id)!).filter(Boolean)
  }

  getAgentsByCapability(capability: string): Agent[] {
    const agentIds = Array.from(this.hierarchy.roles.entries())
      .filter(([_, role]) => role.capabilities.includes(capability))
      .map(([agentId, _]) => agentId)
    
    return agentIds.map(id => this.agents.get(id)!).filter(Boolean)
  }

  async delegateTask(task: Task, criteria?: DelegationCriteria): Promise<TaskResult> {
    return await this.taskDelegation.delegate(task, '', criteria?.preferredRoles?.[0] || '')
  }

  async broadcastMessage(message: AgentMessage, filter?: AgentFilter): Promise<void> {
    await this.interAgentCommunication.broadcast(message.from, message, filter)
  }

  // Utility methods
  getHierarchyDepth(agentId: string): number {
    let depth = 0
    let currentId = agentId
    
    while (this.hierarchy.parents.has(currentId)) {
      currentId = this.hierarchy.parents.get(currentId)!
      depth++
      if (depth > 100) break // Prevent infinite loops
    }
    
    return depth
  }

  getAgentSubordinates(agentId: string): string[] {
    const subordinates: string[] = []
    const children = this.hierarchy.children.get(agentId) || []
    
    for (const childId of children) {
      subordinates.push(childId)
      subordinates.push(...this.getAgentSubordinates(childId))
    }
    
    return subordinates
  }

  canAgentDelegate(fromAgentId: string, toAgentId: string): boolean {
    const fromRole = this.hierarchy.roles.get(fromAgentId)
    const toRole = this.hierarchy.roles.get(toAgentId)
    
    if (!fromRole || !toRole) return false
    
    // Check if fromAgent has higher priority or is a parent
    const isParent = this.hierarchy.children.get(fromAgentId)?.includes(toAgentId)
    const hasHigherPriority = fromRole.priority > toRole.priority
    
    return isParent || hasHigherPriority
  }

  // Event system
  onAgentAdded(callback: (event: { agentId: string, role?: AgentRole }) => void): void {
    this.eventBus.on('agent.added', callback)
  }

  onAgentRemoved(callback: (event: { agentId: string }) => void): void {
    this.eventBus.on('agent.removed', callback)
  }

  onTaskDelegated(callback: (event: { taskId: string, fromAgent: string, toAgent: string }) => void): void {
    this.eventBus.on('task.delegated', callback)
  }

  onTaskCompleted(callback: (event: { taskId: string, agentId: string, result: TaskResult }) => void): void {
    this.eventBus.on('task.completed', callback)
  }

  // Metrics and monitoring
  getCoordinationMetrics() {
    return {
      totalAgents: this.agents.size,
      activeTasks: this.tasks.size,
      completedTasks: this.taskResults.size,
      messageHistory: this.interAgentCommunication.getMessageHistory().length,
      hierarchyDepth: Math.max(...Array.from(this.agents.keys()).map(id => this.getHierarchyDepth(id)))
    }
  }
}

// Factory function to create coordination module
export async function createCoordinationModule(config?: CoordinationConfig): Promise<CoordinationModule> {
  const orchestrator = new SYMindXOrchestrator(config)
  
  // Wait for components to initialize
  await orchestrator['initializeComponents']()
  
  const { SYMindXConflictResolver } = await import('./conflict-resolver.js')
  const { SYMindXResourceManager } = await import('./resource-manager.js')
  
  return {
    orchestrator,
    taskDelegation: orchestrator.taskDelegation,
    conflictResolution: new SYMindXConflictResolver(),
    resourceSharing: new SYMindXResourceManager(config)
  }
}