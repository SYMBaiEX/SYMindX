/**
 * Coordination Module Types
 */

import { Agent } from '../../types/agent.js'
import {
  AgentHierarchy,
  AgentRole,
  TaskDelegationSystem,
  Task,
  TaskResult,
  TaskStatus,
  CommunicationProtocol,
  AgentMessage,
  AgentFilter,
  MessageHandler
} from '../../extensions/mcp-client/types.js'

export interface CoordinationModule {
  orchestrator: AgentOrchestrator
  taskDelegation: TaskDelegationSystem
  conflictResolution: ConflictResolver
  resourceSharing: ResourceManager
}

export interface AgentOrchestrator {
  agents: Map<string, Agent>
  hierarchy: AgentHierarchy
  taskDelegation: TaskDelegationSystem
  interAgentCommunication: CommunicationProtocol
  addAgent(agent: Agent, role?: AgentRole): Promise<void>
  removeAgent(agentId: string): Promise<void>
  getAgentsByRole(role: string): Agent[]
  getAgentsByCapability(capability: string): Agent[]
  delegateTask(task: Task, criteria?: DelegationCriteria): Promise<TaskResult>
  broadcastMessage(message: AgentMessage, filter?: AgentFilter): Promise<void>
}

export interface DelegationCriteria {
  requiredCapabilities?: string[]
  preferredRoles?: string[]
  excludeAgents?: string[]
  priority?: number
  deadline?: Date
}

export interface ConflictResolver {
  resolveResourceConflict(resource: string, requesters: Agent[]): Promise<string>
  resolveTaskConflict(task: Task, candidates: Agent[]): Promise<string>
  resolvePriorityConflict(tasks: Task[]): Promise<Task[]>
}

export interface ResourceManager {
  allocateResource(resource: string, agentId: string, duration?: number): Promise<boolean>
  releaseResource(resource: string, agentId: string): Promise<void>
  getResourceStatus(resource: string): ResourceStatus
  getAgentResources(agentId: string): string[]
}

export interface ResourceStatus {
  resource: string
  allocated: boolean
  allocatedTo?: string
  allocatedAt?: Date
  expiresAt?: Date
  queue: string[]
}

export interface CoordinationConfig {
  maxAgentsPerOrchestrator?: number
  maxTasksPerAgent?: number
  messageHistorySize?: number
  defaultTaskTimeout?: number
  resourceAllocationTimeout?: number
}

export interface CoordinationSkillConfig {
  enabled: boolean
  priority: number
  timeout?: number
  retries?: number
}

export interface TaskAssignmentStrategy {
  name: string
  evaluate(task: Task, candidates: Agent[]): Promise<string>
}

export interface ResourceAllocationStrategy {
  name: string
  evaluate(resource: string, requesters: Agent[]): Promise<string>
}

// Re-export types from MCP client for convenience
export {
  AgentHierarchy,
  AgentRole,
  TaskDelegationSystem,
  Task,
  TaskResult,
  TaskStatus,
  CommunicationProtocol,
  AgentMessage,
  AgentFilter,
  MessageHandler
}