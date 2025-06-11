/**
 * Resource Management Logic
 */

import {
  ResourceManager,
  ResourceStatus,
  CoordinationConfig
} from '../types.js'

export class SYMindXResourceManager implements ResourceManager {
  private allocations: Map<string, ResourceStatus> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private config: CoordinationConfig

  constructor(config?: CoordinationConfig) {
    this.config = config || {}
  }

  async allocateResource(resource: string, agentId: string, duration?: number): Promise<boolean> {
    const status = this.allocations.get(resource)
    
    if (!status) {
      // Resource not tracked yet, create new allocation
      const newStatus: ResourceStatus = {
        resource,
        allocated: true,
        allocatedTo: agentId,
        allocatedAt: new Date(),
        expiresAt: duration ? new Date(Date.now() + duration) : undefined,
        queue: []
      }
      
      this.allocations.set(resource, newStatus)
      
      if (duration) {
        const timer = setTimeout(() => {
          this.releaseResource(resource, agentId)
        }, duration)
        this.timers.set(`${resource}:${agentId}`, timer)
      }
      
      console.log(`🔒 Resource ${resource} allocated to ${agentId}`)
      return true
    }
    
    if (status.allocated) {
      // Resource already allocated, add to queue
      if (!status.queue.includes(agentId)) {
        status.queue.push(agentId)
        console.log(`⏳ Agent ${agentId} queued for resource ${resource}`)
      }
      return false
    }
    
    // Resource available, allocate it
    status.allocated = true
    status.allocatedTo = agentId
    status.allocatedAt = new Date()
    status.expiresAt = duration ? new Date(Date.now() + duration) : undefined
    
    if (duration) {
      const timer = setTimeout(() => {
        this.releaseResource(resource, agentId)
      }, duration)
      this.timers.set(`${resource}:${agentId}`, timer)
    }
    
    console.log(`🔒 Resource ${resource} allocated to ${agentId}`)
    return true
  }

  async releaseResource(resource: string, agentId: string): Promise<void> {
    const status = this.allocations.get(resource)
    if (!status || status.allocatedTo !== agentId) {
      return
    }
    
    // Clear timer
    const timerKey = `${resource}:${agentId}`
    const timer = this.timers.get(timerKey)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(timerKey)
    }
    
    // Release resource
    status.allocated = false
    status.allocatedTo = undefined
    status.allocatedAt = undefined
    status.expiresAt = undefined
    
    console.log(`🔓 Resource ${resource} released by ${agentId}`)
    
    // Allocate to next in queue
    if (status.queue.length > 0) {
      const nextAgentId = status.queue.shift()!
      await this.allocateResource(resource, nextAgentId)
    }
  }

  getResourceStatus(resource: string): ResourceStatus {
    return this.allocations.get(resource) || {
      resource,
      allocated: false,
      queue: []
    }
  }

  getAgentResources(agentId: string): string[] {
    return Array.from(this.allocations.entries())
      .filter(([_, status]) => status.allocatedTo === agentId)
      .map(([resource, _]) => resource)
  }

  // Advanced resource management features
  async allocateResourcePool(resources: string[], agentId: string, duration?: number): Promise<string[]> {
    const allocatedResources: string[] = []
    const failedResources: string[] = []
    
    for (const resource of resources) {
      const success = await this.allocateResource(resource, agentId, duration)
      if (success) {
        allocatedResources.push(resource)
      } else {
        failedResources.push(resource)
      }
    }
    
    // If some allocations failed, optionally release successful ones
    if (failedResources.length > 0) {
      console.warn(`⚠️ Failed to allocate resources: ${failedResources.join(', ')}`)
    }
    
    return allocatedResources
  }

  async releaseAllAgentResources(agentId: string): Promise<void> {
    const agentResources = this.getAgentResources(agentId)
    
    for (const resource of agentResources) {
      await this.releaseResource(resource, agentId)
    }
    
    console.log(`🔓 All resources released for agent ${agentId}`)
  }

  async transferResource(resource: string, fromAgentId: string, toAgentId: string): Promise<boolean> {
    const status = this.allocations.get(resource)
    if (!status || status.allocatedTo !== fromAgentId) {
      return false
    }
    
    // Release from current agent
    await this.releaseResource(resource, fromAgentId)
    
    // Allocate to new agent (skip queue)
    status.allocated = true
    status.allocatedTo = toAgentId
    status.allocatedAt = new Date()
    
    console.log(`🔄 Resource ${resource} transferred from ${fromAgentId} to ${toAgentId}`)
    return true
  }

  async reserveResource(resource: string, agentId: string, reservationTime: number): Promise<boolean> {
    const status = this.allocations.get(resource)
    
    if (status && status.allocated) {
      // Add to queue with priority
      const index = status.queue.indexOf(agentId)
      if (index >= 0) {
        // Move to front of queue
        status.queue.splice(index, 1)
      }
      status.queue.unshift(agentId)
      
      // Set timeout for reservation
      setTimeout(() => {
        const currentStatus = this.allocations.get(resource)
        if (currentStatus) {
          const queueIndex = currentStatus.queue.indexOf(agentId)
          if (queueIndex >= 0) {
            currentStatus.queue.splice(queueIndex, 1)
            console.log(`⏰ Reservation expired for agent ${agentId} on resource ${resource}`)
          }
        }
      }, reservationTime)
      
      console.log(`📋 Resource ${resource} reserved for agent ${agentId}`)
      return true
    }
    
    // Resource is available, allocate immediately
    return await this.allocateResource(resource, agentId)
  }

  getResourceUtilization(): Map<string, number> {
    const utilization = new Map<string, number>()
    
    for (const [resource, status] of this.allocations) {
      if (status.allocatedAt) {
        const allocatedTime = Date.now() - status.allocatedAt.getTime()
        const totalTime = allocatedTime // Simplified calculation
        const utilizationRate = status.allocated ? 1.0 : 0.0
        utilization.set(resource, utilizationRate)
      }
    }
    
    return utilization
  }

  getResourceMetrics() {
    const totalResources = this.allocations.size
    const allocatedResources = Array.from(this.allocations.values())
      .filter(status => status.allocated).length
    const queuedRequests = Array.from(this.allocations.values())
      .reduce((total, status) => total + status.queue.length, 0)
    
    return {
      totalResources,
      allocatedResources,
      availableResources: totalResources - allocatedResources,
      queuedRequests,
      utilizationRate: totalResources > 0 ? allocatedResources / totalResources : 0
    }
  }

  // Resource lifecycle management
  createResource(resource: string, metadata?: any): void {
    if (!this.allocations.has(resource)) {
      this.allocations.set(resource, {
        resource,
        allocated: false,
        queue: []
      })
      console.log(`✨ Resource ${resource} created`)
    }
  }

  destroyResource(resource: string): void {
    const status = this.allocations.get(resource)
    if (status) {
      // Release if allocated
      if (status.allocated && status.allocatedTo) {
        this.releaseResource(resource, status.allocatedTo)
      }
      
      // Clear any timers
      const timerKey = `${resource}:${status.allocatedTo}`
      const timer = this.timers.get(timerKey)
      if (timer) {
        clearTimeout(timer)
        this.timers.delete(timerKey)
      }
      
      this.allocations.delete(resource)
      console.log(`🗑️ Resource ${resource} destroyed`)
    }
  }

  // Resource monitoring and alerts
  setupResourceMonitoring(resource: string, thresholds: {
    maxQueueLength?: number
    maxAllocationTime?: number
  }): void {
    const monitor = setInterval(() => {
      const status = this.allocations.get(resource)
      if (!status) {
        clearInterval(monitor)
        return
      }
      
      // Check queue length
      if (thresholds.maxQueueLength && status.queue.length > thresholds.maxQueueLength) {
        console.warn(`🚨 Resource ${resource} queue is too long: ${status.queue.length} agents waiting`)
      }
      
      // Check allocation time
      if (thresholds.maxAllocationTime && status.allocatedAt) {
        const allocationTime = Date.now() - status.allocatedAt.getTime()
        if (allocationTime > thresholds.maxAllocationTime) {
          console.warn(`🚨 Resource ${resource} has been allocated for too long: ${allocationTime}ms`)
        }
      }
    }, 5000) // Check every 5 seconds
  }

  // Resource access patterns
  getResourceAccessPattern(resource: string, timeWindow: number = 3600000): any {
    // This would track access patterns over time
    // For now, return simplified data
    const status = this.allocations.get(resource)
    if (!status) return null
    
    return {
      resource,
      currentlyAllocated: status.allocated,
      queueLength: status.queue.length,
      lastAccessTime: status.allocatedAt,
      accessFrequency: 'medium' // Would be calculated from historical data
    }
  }
}