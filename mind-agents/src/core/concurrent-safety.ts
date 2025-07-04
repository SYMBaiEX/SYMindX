/**
 * Concurrent Safety Manager for Agent Lifecycle Management
 * Provides safe concurrent operation handling with locks and deadlock detection
 */

import { Logger } from '../utils/logger.js'
import { EventEmitter } from 'events'

export interface OperationLock {
  id: string
  agentId: string
  operation: string
  acquiredAt: Date
  expiresAt: Date
  holderId: string
  metadata: any
}

export interface LockRequest {
  requestId: string
  agentId: string
  operation: string
  requesterId: string
  priority: number
  timeout: number
  metadata: any
}

export interface DeadlockDetection {
  detected: boolean
  cycle: string[]
  resolution: DeadlockResolution
}

export interface DeadlockResolution {
  strategy: 'abort_lowest_priority' | 'abort_oldest' | 'manual_intervention'
  affectedOperations: string[]
  reasoning: string
}

export enum OperationType {
  SHUTDOWN = 'shutdown',
  STARTUP = 'startup',
  CHECKPOINT = 'checkpoint',
  STATE_READ = 'state_read',
  STATE_WRITE = 'state_write',
  RESOURCE_CLEANUP = 'resource_cleanup',
  EXTENSION_OPERATION = 'extension_operation'
}

export interface ConcurrentSafetyConfig {
  maxConcurrentOperations: number
  defaultLockTimeout: number
  deadlockDetectionInterval: number
  maxQueueSize: number
  enablePriorityQueue: boolean
  enableDeadlockDetection: boolean
}

export class ConcurrentSafetyManager extends EventEmitter {
  private logger: Logger
  private config: ConcurrentSafetyConfig
  private locks: Map<string, OperationLock> = new Map()
  private lockQueue: Map<string, LockRequest[]> = new Map()
  private operationHistory: Map<string, string[]> = new Map()
  private deadlockTimer?: NodeJS.Timeout
  private requestCounter = 0

  constructor(config: ConcurrentSafetyConfig) {
    super()
    this.config = config
    this.logger = new Logger('ConcurrentSafetyManager')
    
    if (config.enableDeadlockDetection) {
      this.startDeadlockDetection()
    }
  }

  /**
   * Acquire a lock for an operation on an agent
   */
  async acquireLock(
    agentId: string,
    operation: string,
    requesterId: string,
    options: {
      timeout?: number
      priority?: number
      metadata?: any
    } = {}
  ): Promise<string> {
    const requestId = `req_${++this.requestCounter}_${Date.now()}`
    const timeout = options.timeout || this.config.defaultLockTimeout
    const priority = options.priority || 5
    
    this.logger.debug(`Lock request: ${requestId}`, { agentId, operation, requesterId })
    
    // Check if lock is immediately available
    const lockKey = this.getLockKey(agentId, operation)
    if (!this.locks.has(lockKey)) {
      return this.grantLock(agentId, operation, requesterId, requestId, options.metadata)
    }
    
    // Check concurrent operation limits
    const agentLocks = this.getAgentLocks(agentId)
    if (agentLocks.length >= this.config.maxConcurrentOperations) {
      throw new Error(`Maximum concurrent operations reached for agent ${agentId}`)
    }
    
    // Queue the request
    const request: LockRequest = {
      requestId,
      agentId,
      operation,
      requesterId,
      priority,
      timeout,
      metadata: options.metadata || {}
    }
    
    await this.queueLockRequest(request)
    
    // Wait for lock or timeout
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.removeLockRequest(requestId)
        reject(new Error(`Lock acquisition timeout for ${operation} on agent ${agentId}`))
      }, timeout)
      
      const onLockGranted = (grantedRequestId: string, lockId: string) => {
        if (grantedRequestId === requestId) {
          clearTimeout(timeoutHandle)
          this.off('lock_granted', onLockGranted)
          resolve(lockId)
        }
      }
      
      this.on('lock_granted', onLockGranted)
    })
  }

  /**
   * Release a lock
   */
  async releaseLock(lockId: string): Promise<void> {
    const lock = this.locks.get(lockId)
    if (!lock) {
      this.logger.warn(`Attempted to release non-existent lock: ${lockId}`)
      return
    }
    
    this.logger.debug(`Releasing lock: ${lockId}`, { agentId: lock.agentId, operation: lock.operation })
    
    this.locks.delete(lockId)
    
    // Update operation history
    this.addToOperationHistory(lock.agentId, `release:${lock.operation}`)
    
    this.emit('lock_released', { lockId, agentId: lock.agentId, operation: lock.operation })
    
    // Process queued requests
    await this.processLockQueue(lock.agentId, lock.operation)
  }

  /**
   * Force release locks for an agent (emergency cleanup)
   */
  async forceReleaseAgentLocks(agentId: string): Promise<string[]> {
    const agentLocks = this.getAgentLocks(agentId)
    const releasedLocks: string[] = []
    
    this.logger.warn(`Force releasing ${agentLocks.length} locks for agent ${agentId}`)
    
    for (const lock of agentLocks) {
      await this.releaseLock(lock.id)
      releasedLocks.push(lock.id)
    }
    
    // Clear queued requests for this agent
    this.clearAgentQueue(agentId)
    
    this.emit('agent_locks_force_released', { agentId, releasedLocks })
    
    return releasedLocks
  }

  /**
   * Check if operation is safe to execute (no conflicting operations)
   */
  isOperationSafe(agentId: string, operation: string): boolean {
    const conflictingOps = this.getConflictingOperations(operation)
    const agentLocks = this.getAgentLocks(agentId)
    
    return !agentLocks.some(lock => conflictingOps.includes(lock.operation))
  }

  /**
   * Get current lock status for an agent
   */
  getAgentLockStatus(agentId: string): AgentLockStatus {
    const locks = this.getAgentLocks(agentId)
    const queuedRequests = this.getAgentQueuedRequests(agentId)
    
    return {
      agentId,
      activeLocks: locks.length,
      queuedRequests: queuedRequests.length,
      locks: locks.map(lock => ({
        operation: lock.operation,
        acquiredAt: lock.acquiredAt,
        expiresAt: lock.expiresAt,
        holderId: lock.holderId
      })),
      queue: queuedRequests.map(req => ({
        operation: req.operation,
        requesterId: req.requesterId,
        priority: req.priority
      }))
    }
  }

  /**
   * Detect and resolve deadlocks
   */
  async detectDeadlocks(): Promise<DeadlockDetection[]> {
    const deadlocks: DeadlockDetection[] = []
    
    if (!this.config.enableDeadlockDetection) {
      return deadlocks
    }
    
    // Build dependency graph
    const dependencies = this.buildDependencyGraph()
    
    // Find cycles using DFS
    const cycles = this.findCycles(dependencies)
    
    for (const cycle of cycles) {
      const resolution = this.planDeadlockResolution(cycle)
      
      deadlocks.push({
        detected: true,
        cycle,
        resolution
      })
      
      this.logger.warn('Deadlock detected', { cycle, resolution })
      this.emit('deadlock_detected', { cycle, resolution })
    }
    
    return deadlocks
  }

  /**
   * Resolve deadlock using specified strategy
   */
  async resolveDeadlock(detection: DeadlockDetection): Promise<void> {
    this.logger.info(`Resolving deadlock using strategy: ${detection.resolution.strategy}`)
    
    switch (detection.resolution.strategy) {
      case 'abort_lowest_priority':
        await this.abortLowestPriorityOperations(detection.resolution.affectedOperations)
        break
        
      case 'abort_oldest':
        await this.abortOldestOperations(detection.resolution.affectedOperations)
        break
        
      case 'manual_intervention':
        this.emit('manual_intervention_required', { detection })
        break
    }
    
    this.emit('deadlock_resolved', { detection })
  }

  /**
   * Get comprehensive safety status
   */
  getSafetyStatus(): ConcurrentSafetyStatus {
    const totalLocks = this.locks.size
    const totalQueued = Array.from(this.lockQueue.values()).reduce((sum, queue) => sum + queue.length, 0)
    const agentCounts = new Map<string, number>()
    
    for (const lock of this.locks.values()) {
      agentCounts.set(lock.agentId, (agentCounts.get(lock.agentId) || 0) + 1)
    }
    
    const maxAgentLocks = Math.max(0, ...Array.from(agentCounts.values()))
    const avgLocksPerAgent = agentCounts.size > 0 ? totalLocks / agentCounts.size : 0
    
    return {
      totalActiveLocks: totalLocks,
      totalQueuedRequests: totalQueued,
      uniqueAgents: agentCounts.size,
      maxLocksPerAgent: maxAgentLocks,
      avgLocksPerAgent: Math.round(avgLocksPerAgent * 100) / 100,
      deadlockDetectionEnabled: this.config.enableDeadlockDetection,
      lastDeadlockCheck: new Date() // Simplified
    }
  }

  /**
   * Shutdown concurrent safety manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down concurrent safety manager...')
    
    if (this.deadlockTimer) {
      clearInterval(this.deadlockTimer)
      this.deadlockTimer = undefined
    }
    
    // Force release all locks
    const allLocks = Array.from(this.locks.keys())
    for (const lockId of allLocks) {
      await this.releaseLock(lockId)
    }
    
    // Clear all queues
    this.lockQueue.clear()
    this.operationHistory.clear()
    
    this.logger.info('Concurrent safety manager shutdown complete')
  }

  // Private methods

  private getLockKey(agentId: string, operation: string): string {
    return `${agentId}:${operation}`
  }

  private grantLock(
    agentId: string,
    operation: string,
    requesterId: string,
    requestId: string,
    metadata: any = {}
  ): string {
    const lockId = `lock_${agentId}_${operation}_${Date.now()}`
    const now = new Date()
    
    const lock: OperationLock = {
      id: lockId,
      agentId,
      operation,
      acquiredAt: now,
      expiresAt: new Date(now.getTime() + this.config.defaultLockTimeout),
      holderId: requesterId,
      metadata
    }
    
    this.locks.set(lockId, lock)
    
    // Update operation history
    this.addToOperationHistory(agentId, `acquire:${operation}`)
    
    this.logger.debug(`Lock granted: ${lockId}`, { agentId, operation, requesterId })
    this.emit('lock_granted', requestId, lockId)
    
    return lockId
  }

  private async queueLockRequest(request: LockRequest): Promise<void> {
    const key = this.getLockKey(request.agentId, request.operation)
    
    if (!this.lockQueue.has(key)) {
      this.lockQueue.set(key, [])
    }
    
    const queue = this.lockQueue.get(key)!
    
    if (queue.length >= this.config.maxQueueSize) {
      throw new Error(`Lock queue full for ${request.operation} on agent ${request.agentId}`)
    }
    
    // Insert based on priority if enabled
    if (this.config.enablePriorityQueue) {
      const insertIndex = queue.findIndex(req => req.priority < request.priority)
      if (insertIndex === -1) {
        queue.push(request)
      } else {
        queue.splice(insertIndex, 0, request)
      }
    } else {
      queue.push(request)
    }
    
    this.logger.debug(`Lock request queued: ${request.requestId}`, { 
      agentId: request.agentId, 
      operation: request.operation,
      queuePosition: queue.length
    })
  }

  private async processLockQueue(agentId: string, operation: string): Promise<void> {
    const key = this.getLockKey(agentId, operation)
    const queue = this.lockQueue.get(key)
    
    if (!queue || queue.length === 0) {
      return
    }
    
    const nextRequest = queue.shift()!
    
    // Check if request is still valid (not timed out)
    const now = Date.now()
    const requestAge = now - parseInt(nextRequest.requestId.split('_')[2])
    
    if (requestAge > nextRequest.timeout) {
      this.logger.debug(`Skipping expired lock request: ${nextRequest.requestId}`)
      // Process next request
      await this.processLockQueue(agentId, operation)
      return
    }
    
    // Grant the lock
    this.grantLock(
      nextRequest.agentId,
      nextRequest.operation,
      nextRequest.requesterId,
      nextRequest.requestId,
      nextRequest.metadata
    )
  }

  private getAgentLocks(agentId: string): OperationLock[] {
    return Array.from(this.locks.values()).filter(lock => lock.agentId === agentId)
  }

  private getAgentQueuedRequests(agentId: string): LockRequest[] {
    const requests: LockRequest[] = []
    
    for (const queue of this.lockQueue.values()) {
      requests.push(...queue.filter(req => req.agentId === agentId))
    }
    
    return requests
  }

  private removeLockRequest(requestId: string): void {
    for (const [key, queue] of this.lockQueue) {
      const index = queue.findIndex(req => req.requestId === requestId)
      if (index !== -1) {
        queue.splice(index, 1)
        if (queue.length === 0) {
          this.lockQueue.delete(key)
        }
        break
      }
    }
  }

  private clearAgentQueue(agentId: string): void {
    for (const [key, queue] of this.lockQueue) {
      const filtered = queue.filter(req => req.agentId !== agentId)
      if (filtered.length === 0) {
        this.lockQueue.delete(key)
      } else {
        this.lockQueue.set(key, filtered)
      }
    }
  }

  private getConflictingOperations(operation: string): string[] {
    // Define operation conflicts
    const conflicts: Record<string, string[]> = {
      [OperationType.SHUTDOWN]: [OperationType.STARTUP, OperationType.STATE_WRITE],
      [OperationType.STARTUP]: [OperationType.SHUTDOWN, OperationType.STATE_WRITE],
      [OperationType.STATE_WRITE]: [OperationType.SHUTDOWN, OperationType.STARTUP, OperationType.STATE_WRITE],
      [OperationType.CHECKPOINT]: [OperationType.STATE_WRITE],
      [OperationType.RESOURCE_CLEANUP]: [OperationType.STARTUP]
    }
    
    return conflicts[operation] || []
  }

  private addToOperationHistory(agentId: string, operation: string): void {
    if (!this.operationHistory.has(agentId)) {
      this.operationHistory.set(agentId, [])
    }
    
    const history = this.operationHistory.get(agentId)!
    history.push(operation)
    
    // Keep only last 10 operations
    if (history.length > 10) {
      history.shift()
    }
  }

  private startDeadlockDetection(): void {
    this.deadlockTimer = setInterval(async () => {
      try {
        const deadlocks = await this.detectDeadlocks()
        for (const deadlock of deadlocks) {
          await this.resolveDeadlock(deadlock)
        }
      } catch (error) {
        this.logger.error('Deadlock detection failed:', error)
      }
    }, this.config.deadlockDetectionInterval)
  }

  private buildDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>()
    
    // Build graph based on lock requests waiting for locks
    for (const [lockKey, queue] of this.lockQueue) {
      const [agentId, operation] = lockKey.split(':')
      const currentLock = this.locks.get(lockKey)
      
      if (currentLock && queue.length > 0) {
        const waitingRequester = queue[0].requesterId
        
        if (!graph.has(waitingRequester)) {
          graph.set(waitingRequester, [])
        }
        
        graph.get(waitingRequester)!.push(currentLock.holderId)
      }
    }
    
    return graph
  }

  private findCycles(graph: Map<string, string[]>): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // Found cycle
        const cycleStart = path.indexOf(node)
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart))
        }
        return
      }
      
      if (visited.has(node)) {
        return
      }
      
      visited.add(node)
      recursionStack.add(node)
      
      const dependencies = graph.get(node) || []
      for (const dependency of dependencies) {
        dfs(dependency, [...path, node])
      }
      
      recursionStack.delete(node)
    }
    
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }
    
    return cycles
  }

  private planDeadlockResolution(cycle: string[]): DeadlockResolution {
    // Simple strategy: abort lowest priority operation
    return {
      strategy: 'abort_lowest_priority',
      affectedOperations: cycle,
      reasoning: 'Aborting lowest priority operation to break deadlock cycle'
    }
  }

  private async abortLowestPriorityOperations(operationIds: string[]): Promise<void> {
    // Find and abort lowest priority operations
    // This is a simplified implementation
    this.logger.info('Aborting lowest priority operations to resolve deadlock')
  }

  private async abortOldestOperations(operationIds: string[]): Promise<void> {
    // Find and abort oldest operations
    // This is a simplified implementation
    this.logger.info('Aborting oldest operations to resolve deadlock')
  }
}

export interface AgentLockStatus {
  agentId: string
  activeLocks: number
  queuedRequests: number
  locks: Array<{
    operation: string
    acquiredAt: Date
    expiresAt: Date
    holderId: string
  }>
  queue: Array<{
    operation: string
    requesterId: string
    priority: number
  }>
}

export interface ConcurrentSafetyStatus {
  totalActiveLocks: number
  totalQueuedRequests: number
  uniqueAgents: number
  maxLocksPerAgent: number
  avgLocksPerAgent: number
  deadlockDetectionEnabled: boolean
  lastDeadlockCheck: Date
}