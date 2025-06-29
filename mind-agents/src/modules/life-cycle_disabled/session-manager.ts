/**
 * Session Manager - Manages agent session lifecycle and state
 */

import { Agent, AgentEvent } from '../../types/agent.js'
import { Logger } from '../../utils/logger.js'

export interface SessionConfig {
  sessionTimeout: number // milliseconds
  maxConcurrentSessions: number
  sessionPersistence: boolean
  autoSave: boolean
  autoSaveInterval: number // milliseconds
  heartbeatInterval: number // milliseconds
}

export interface SessionState {
  id: string
  agentId: string
  startTime: Date
  lastActivity: Date
  status: 'active' | 'idle' | 'suspended' | 'terminated'
  data: Record<string, any>
  metadata: SessionMetadata
}

export interface SessionMetadata {
  clientInfo?: {
    platform: string
    version: string
    userAgent?: string
  }
  context: {
    sessionType: 'interactive' | 'autonomous' | 'batch' | 'api'
    priority: number
    tags: string[]
  }
  performance: {
    actionsExecuted: number
    averageResponseTime: number
    memoryUsage: number
    errors: number
  }
  checkpoints: string[]
}

export interface SessionEvent {
  type: 'session_start' | 'session_end' | 'session_suspend' | 'session_resume' | 'session_timeout' | 'session_error'
  sessionId: string
  timestamp: Date
  data?: Record<string, any>
}

export class SessionManager {
  private config: SessionConfig
  private logger: Logger
  private activeSessions: Map<string, SessionState> = new Map()
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: SessionConfig) {
    this.config = config
    this.logger = new Logger('session-manager')
  }

  /**
   * Create a new session for an agent
   */
  async createSession(
    agentId: string, 
    sessionType: SessionMetadata['context']['sessionType'] = 'interactive',
    clientInfo?: SessionMetadata['clientInfo']
  ): Promise<string> {
    if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
      throw new Error(`Maximum concurrent sessions exceeded (${this.config.maxConcurrentSessions})`)
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    const session: SessionState = {
      id: sessionId,
      agentId,
      startTime: now,
      lastActivity: now,
      status: 'active',
      data: {},
      metadata: {
        clientInfo,
        context: {
          sessionType,
          priority: 1.0,
          tags: []
        },
        performance: {
          actionsExecuted: 0,
          averageResponseTime: 0,
          memoryUsage: 0,
          errors: 0
        },
        checkpoints: []
      }
    }

    this.activeSessions.set(sessionId, session)
    this.setupSessionTimeout(sessionId)
    this.setupHeartbeat(sessionId)

    this.logger.info(`Created session ${sessionId} for agent ${agentId} (type: ${sessionType})`)
    
    await this.emitSessionEvent({
      type: 'session_start',
      sessionId,
      timestamp: now,
      data: { agentId, sessionType }
    })

    return sessionId
  }

  /**
   * Get session state
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.activeSessions.get(sessionId)
  }

  /**
   * Update session activity
   */
  updateActivity(sessionId: string, data?: Record<string, any>): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.lastActivity = new Date()
    
    if (data) {
      session.data = { ...session.data, ...data }
    }

    // Reset timeout
    this.setupSessionTimeout(sessionId)
    
    return true
  }

  /**
   * Record action execution in session
   */
  recordAction(sessionId: string, responseTime: number, success: boolean): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.metadata.performance.actionsExecuted++
    
    // Update average response time
    const { actionsExecuted, averageResponseTime } = session.metadata.performance
    session.metadata.performance.averageResponseTime = 
      (averageResponseTime * (actionsExecuted - 1) + responseTime) / actionsExecuted

    if (!success) {
      session.metadata.performance.errors++
    }

    this.updateActivity(sessionId, { lastActionTime: new Date(), lastActionSuccess: success })
    
    return true
  }

  /**
   * Suspend a session
   */
  async suspendSession(sessionId: string, reason?: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.status = 'suspended'
    this.clearSessionTimeout(sessionId)
    this.clearHeartbeat(sessionId)

    this.logger.info(`Suspended session ${sessionId}${reason ? ` (${reason})` : ''}`)
    
    await this.emitSessionEvent({
      type: 'session_suspend',
      sessionId,
      timestamp: new Date(),
      data: { reason }
    })

    return true
  }

  /**
   * Resume a suspended session
   */
  async resumeSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session || session.status !== 'suspended') return false

    session.status = 'active'
    session.lastActivity = new Date()
    
    this.setupSessionTimeout(sessionId)
    this.setupHeartbeat(sessionId)

    this.logger.info(`Resumed session ${sessionId}`)
    
    await this.emitSessionEvent({
      type: 'session_resume',
      sessionId,
      timestamp: new Date()
    })

    return true
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string, reason?: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.status = 'terminated'
    
    // Clean up timers
    this.clearSessionTimeout(sessionId)
    this.clearHeartbeat(sessionId)

    // Remove from active sessions
    this.activeSessions.delete(sessionId)

    this.logger.info(`Terminated session ${sessionId}${reason ? ` (${reason})` : ''}`)
    
    await this.emitSessionEvent({
      type: 'session_end',
      sessionId,
      timestamp: new Date(),
      data: { 
        reason,
        duration: new Date().getTime() - session.startTime.getTime(),
        actionsExecuted: session.metadata.performance.actionsExecuted,
        errors: session.metadata.performance.errors
      }
    })

    return true
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionState[] {
    return Array.from(this.activeSessions.values())
  }

  /**
   * Get sessions for a specific agent
   */
  getAgentSessions(agentId: string): SessionState[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.agentId === agentId)
  }

  /**
   * Clean up idle sessions
   */
  async cleanupIdleSessions(): Promise<number> {
    const now = new Date().getTime()
    const idleThreshold = this.config.sessionTimeout
    const sessionsToTerminate: string[] = []

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const idleTime = now - session.lastActivity.getTime()
      
      if (idleTime > idleThreshold && session.status === 'active') {
        session.status = 'idle'
        sessionsToTerminate.push(sessionId)
      }
    }

    // Terminate idle sessions
    for (const sessionId of sessionsToTerminate) {
      await this.terminateSession(sessionId, 'idle_timeout')
    }

    if (sessionsToTerminate.length > 0) {
      this.logger.info(`Cleaned up ${sessionsToTerminate.length} idle sessions`)
    }

    return sessionsToTerminate.length
  }

  /**
   * Update session memory usage
   */
  updateMemoryUsage(sessionId: string, memoryUsage: number): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.metadata.performance.memoryUsage = memoryUsage
    return true
  }

  /**
   * Add checkpoint to session
   */
  addCheckpoint(sessionId: string, checkpointId: string): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.metadata.checkpoints.push(checkpointId)
    
    // Limit checkpoint history
    if (session.metadata.checkpoints.length > 10) {
      session.metadata.checkpoints = session.metadata.checkpoints.slice(-10)
    }

    return true
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    active: number;
    idle: number;
    suspended: number;
    byType: Record<string, number>;
    averageResponseTime: number;
    totalErrors: number;
  } {
    const sessions = Array.from(this.activeSessions.values())
    
    const stats = {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      idle: sessions.filter(s => s.status === 'idle').length,
      suspended: sessions.filter(s => s.status === 'suspended').length,
      byType: {} as Record<string, number>,
      averageResponseTime: 0,
      totalErrors: 0
    }

    // Calculate by type
    for (const session of sessions) {
      const type = session.metadata.context.sessionType
      stats.byType[type] = (stats.byType[type] || 0) + 1
    }

    // Calculate average response time and total errors
    if (sessions.length > 0) {
      const totalResponseTime = sessions.reduce((sum, s) => sum + s.metadata.performance.averageResponseTime, 0)
      stats.averageResponseTime = totalResponseTime / sessions.length
      stats.totalErrors = sessions.reduce((sum, s) => sum + s.metadata.performance.errors, 0)
    }

    return stats
  }

  /**
   * Set session priority
   */
  setSessionPriority(sessionId: string, priority: number): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.metadata.context.priority = Math.max(0, Math.min(1, priority))
    return true
  }

  /**
   * Add tags to session
   */
  addSessionTags(sessionId: string, tags: string[]): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.metadata.context.tags.push(...tags)
    // Remove duplicates
    session.metadata.context.tags = [...new Set(session.metadata.context.tags)]
    
    return true
  }

  /**
   * Get session duration
   */
  getSessionDuration(sessionId: string): number | null {
    const session = this.activeSessions.get(sessionId)
    if (!session) return null

    return new Date().getTime() - session.startTime.getTime()
  }

  private setupSessionTimeout(sessionId: string): void {
    this.clearSessionTimeout(sessionId)
    
    const timeout = setTimeout(async () => {
      await this.terminateSession(sessionId, 'timeout')
    }, this.config.sessionTimeout)

    this.sessionTimeouts.set(sessionId, timeout)
  }

  private clearSessionTimeout(sessionId: string): void {
    const timeout = this.sessionTimeouts.get(sessionId)
    if (timeout) {
      clearTimeout(timeout)
      this.sessionTimeouts.delete(sessionId)
    }
  }

  private setupHeartbeat(sessionId: string): void {
    if (!this.config.heartbeatInterval) return
    
    this.clearHeartbeat(sessionId)
    
    const heartbeat = setInterval(() => {
      const session = this.activeSessions.get(sessionId)
      if (!session || session.status !== 'active') {
        this.clearHeartbeat(sessionId)
        return
      }

      // Check if session is still responsive
      const idleTime = new Date().getTime() - session.lastActivity.getTime()
      if (idleTime > this.config.heartbeatInterval * 3) { // 3x heartbeat interval
        this.logger.warn(`Session ${sessionId} appears unresponsive`)
        session.status = 'idle'
      }
    }, this.config.heartbeatInterval)

    this.heartbeatIntervals.set(sessionId, heartbeat)
  }

  private clearHeartbeat(sessionId: string): void {
    const heartbeat = this.heartbeatIntervals.get(sessionId)
    if (heartbeat) {
      clearInterval(heartbeat)
      this.heartbeatIntervals.delete(sessionId)
    }
  }

  private async emitSessionEvent(event: SessionEvent): Promise<void> {
    // In a real implementation, this would emit to an event bus
    this.logger.debug(`Session event: ${event.type} for ${event.sessionId}`)
  }

  /**
   * Cleanup all sessions and timers
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down session manager')
    
    // Terminate all active sessions
    const sessionIds = Array.from(this.activeSessions.keys())
    for (const sessionId of sessionIds) {
      await this.terminateSession(sessionId, 'shutdown')
    }

    // Clear all timers
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout)
    }
    for (const heartbeat of this.heartbeatIntervals.values()) {
      clearInterval(heartbeat)
    }

    this.sessionTimeouts.clear()
    this.heartbeatIntervals.clear()
  }
}

/**
 * Factory function to create session manager
 */
export function createSessionManager(config: Partial<SessionConfig> = {}): SessionManager {
  const defaultConfig: SessionConfig = {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxConcurrentSessions: 100,
    sessionPersistence: true,
    autoSave: true,
    autoSaveInterval: 5 * 60 * 1000, // 5 minutes
    heartbeatInterval: 30 * 1000 // 30 seconds
  }

  return new SessionManager({ ...defaultConfig, ...config })
}