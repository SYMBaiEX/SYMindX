/**
 * Inter-Agent Communication Logic
 */

import {
  CommunicationProtocol,
  AgentMessage,
  AgentFilter,
  MessageHandler,
  CoordinationConfig
} from '../types.js'
import { SYMindXOrchestrator } from './coordination-core.js'

export class SYMindXCommunication implements CommunicationProtocol {
  private orchestrator: SYMindXOrchestrator
  private messageHandlers: Map<string, Map<string, MessageHandler[]>> = new Map()
  private messageHistory: AgentMessage[] = []
  private config: CoordinationConfig

  constructor(orchestrator: SYMindXOrchestrator, config: CoordinationConfig) {
    this.orchestrator = orchestrator
    this.config = config
  }

  async sendMessage(fromAgent: string, toAgent: string, message: AgentMessage): Promise<void> {
    if (!this.orchestrator.agents.has(fromAgent) || !this.orchestrator.agents.has(toAgent)) {
      throw new Error(`Invalid agent IDs: ${fromAgent} -> ${toAgent}`)
    }

    message.from = fromAgent
    message.to = toAgent
    message.timestamp = new Date()

    // Store in history
    this.addToHistory(message)

    // Deliver to target agent
    const handlers = this.messageHandlers.get(toAgent)?.get(message.type) || []
    for (const handler of handlers) {
      try {
        await handler(message)
      } catch (error) {
        console.error(`Error handling message ${message.id}:`, error)
      }
    }

    console.log(`💬 Message sent from ${fromAgent} to ${toAgent}: ${message.type}`)
  }

  async broadcast(fromAgent: string, message: AgentMessage, filter?: AgentFilter): Promise<void> {
    const targetAgents = this.getFilteredAgents(filter)
    
    message.from = fromAgent
    message.timestamp = new Date()
    
    // Store in history
    this.addToHistory(message)

    // Send to all target agents
    const promises = targetAgents.map(async (agentId) => {
      if (agentId === fromAgent) return // Don't send to self
      
      const handlers = this.messageHandlers.get(agentId)?.get(message.type) || []
      for (const handler of handlers) {
        try {
          await handler({ ...message, to: agentId })
        } catch (error) {
          console.error(`Error broadcasting message ${message.id} to ${agentId}:`, error)
        }
      }
    })

    await Promise.all(promises)
    console.log(`📢 Message broadcast from ${fromAgent} to ${targetAgents.length} agents: ${message.type}`)
  }

  subscribe(agentId: string, messageType: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, new Map())
    }
    
    const agentHandlers = this.messageHandlers.get(agentId)!
    if (!agentHandlers.has(messageType)) {
      agentHandlers.set(messageType, [])
    }
    
    agentHandlers.get(messageType)!.push(handler)
    console.log(`📝 Agent ${agentId} subscribed to message type: ${messageType}`)
  }

  unsubscribe(agentId: string, messageType: string, handler?: MessageHandler): void {
    const agentHandlers = this.messageHandlers.get(agentId)
    if (!agentHandlers) return

    const handlers = agentHandlers.get(messageType)
    if (!handlers) return

    if (handler) {
      const index = handlers.indexOf(handler)
      if (index >= 0) {
        handlers.splice(index, 1)
      }
    } else {
      // Remove all handlers for this message type
      handlers.length = 0
    }

    console.log(`📝 Agent ${agentId} unsubscribed from message type: ${messageType}`)
  }

  private getFilteredAgents(filter?: AgentFilter): string[] {
    let agents = Array.from(this.orchestrator.agents.keys())

    if (!filter) return agents

    if (filter.roles) {
      agents = agents.filter(agentId => {
        const role = this.orchestrator.hierarchy.roles.get(agentId)
        return role && filter.roles!.includes(role.name)
      })
    }

    if (filter.capabilities) {
      agents = agents.filter(agentId => {
        const role = this.orchestrator.hierarchy.roles.get(agentId)
        return role && filter.capabilities!.some(cap => role.capabilities.includes(cap))
      })
    }

    if (filter.status) {
      agents = agents.filter(agentId => {
        const agent = this.orchestrator.agents.get(agentId)
        return agent && filter.status!.includes(agent.status)
      })
    }

    if (filter.exclude) {
      agents = agents.filter(agentId => !filter.exclude!.includes(agentId))
    }

    return agents
  }

  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message)
    
    // Trim history if too large
    const maxSize = this.config.messageHistorySize || 1000
    if (this.messageHistory.length > maxSize) {
      this.messageHistory = this.messageHistory.slice(-maxSize)
    }
  }

  getMessageHistory(agentId?: string, messageType?: string, limit = 50): AgentMessage[] {
    let messages = this.messageHistory

    if (agentId) {
      messages = messages.filter(m => m.from === agentId || m.to === agentId)
    }

    if (messageType) {
      messages = messages.filter(m => m.type === messageType)
    }

    return messages.slice(-limit)
  }

  // Advanced communication features
  createMessageChannel(participants: string[], channelId: string): void {
    // Create a dedicated channel for a group of agents
    for (const participant of participants) {
      this.subscribe(participant, `channel:${channelId}`, async (message) => {
        // Relay message to all other participants in the channel
        const otherParticipants = participants.filter(id => id !== message.from)
        for (const recipient of otherParticipants) {
          await this.sendMessage(message.from, recipient, {
            ...message,
            type: `channel:${channelId}:relay`
          })
        }
      })
    }
  }

  destroyMessageChannel(participants: string[], channelId: string): void {
    for (const participant of participants) {
      this.unsubscribe(participant, `channel:${channelId}`)
    }
  }

  // Message routing and filtering
  addMessageFilter(agentId: string, filter: (message: AgentMessage) => boolean): void {
    // Add custom message filtering logic
    const originalHandlers = this.messageHandlers.get(agentId) || new Map()
    
    for (const [messageType, handlers] of originalHandlers) {
      const filteredHandlers = handlers.map(handler => async (message: AgentMessage) => {
        if (filter(message)) {
          await handler(message)
        }
      })
      originalHandlers.set(messageType, filteredHandlers)
    }
  }

  // Communication metrics
  getCommunicationMetrics(agentId?: string) {
    const messages = agentId 
      ? this.messageHistory.filter(m => m.from === agentId || m.to === agentId)
      : this.messageHistory

    return {
      totalMessages: messages.length,
      messagesByType: this.groupMessagesByType(messages),
      averageResponseTime: this.calculateAverageResponseTime(messages),
      mostActiveAgents: this.getMostActiveAgents(messages)
    }
  }

  private groupMessagesByType(messages: AgentMessage[]): Record<string, number> {
    return messages.reduce((acc, message) => {
      acc[message.type] = (acc[message.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private calculateAverageResponseTime(messages: AgentMessage[]): number {
    // Simplified calculation - would need more sophisticated pairing logic
    return 0
  }

  private getMostActiveAgents(messages: AgentMessage[]): Array<{ agentId: string, messageCount: number }> {
    const counts = messages.reduce((acc, message) => {
      acc[message.from] = (acc[message.from] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts)
      .map(([agentId, messageCount]) => ({ agentId, messageCount }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10)
  }
}