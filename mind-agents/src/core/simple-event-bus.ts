/**
 * Simple Event Bus
 * Emergency cleanup - basic implementation only
 */

import { EventEmitter } from 'events'
import { AgentEvent, EventBus } from '../types/agent.js'

export class SimpleEventBus implements EventBus {
  private events: AgentEvent[] = []
  private subscriptions: Map<string, Set<string>> = new Map()
  private emitter = new EventEmitter()

  emit(event: AgentEvent): void {
    this.events.push(event)
    this.emitter.emit(event.type, event)
    this.emitter.emit('*', event) // Global event listener
  }

  on(eventType: string, handler: (event: AgentEvent) => void): void {
    this.emitter.on(eventType, handler)
  }

  off(eventType: string, handler: (event: AgentEvent) => void): void {
    this.emitter.off(eventType, handler)
  }

  subscribe(agentId: string, eventTypes: string[]): void {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set())
    }
    const agentSubs = this.subscriptions.get(agentId)!
    eventTypes.forEach(type => agentSubs.add(type))
  }

  unsubscribe(agentId: string, eventTypes: string[]): void {
    const agentSubs = this.subscriptions.get(agentId)
    if (agentSubs) {
      eventTypes.forEach(type => agentSubs.delete(type))
      if (agentSubs.size === 0) {
        this.subscriptions.delete(agentId)
      }
    }
  }

  getEvents(): AgentEvent[] {
    return [...this.events]
  }

  // Additional method used by runtime
  async publish(event: AgentEvent): Promise<void> {
    this.emit(event)
  }

  // Simple cleanup method
  clearEvents(): void {
    this.events = []
  }
}