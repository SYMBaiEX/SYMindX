/**
 * Group Synchrony Skill
 * 
 * Manages group coordination, synchronization, and collective behavior patterns
 * for multi-agent systems.
 */

import { Agent } from '../../../types/agent.js'
import {
  AgentMessage,
  AgentFilter,
  CoordinationSkillConfig
} from '../types.js'
import { SYMindXOrchestrator } from '../logic/coordination-core.js'

export interface GroupSynchronySkill {
  synchronizeAgentActions(
    agentIds: string[],
    action: string,
    parameters?: any
  ): Promise<boolean>
  
  establishGroupRhythm(
    groupId: string,
    agentIds: string[],
    rhythm: SynchronyRhythm
  ): Promise<void>
  
  monitorGroupCoherence(groupId: string): Promise<CoherenceMetrics>
  
  handleGroupEmergentBehavior(
    groupId: string,
    behavior: EmergentBehavior
  ): Promise<void>
}

export interface SynchronyRhythm {
  pattern: 'sequential' | 'parallel' | 'wave' | 'heartbeat' | 'custom'
  interval: number // milliseconds
  phases?: Array<{
    name: string
    duration: number
    participants: string[]
    actions: string[]
  }>
  customPattern?: (agents: Agent[], tick: number) => Promise<void>
}

export interface CoherenceMetrics {
  groupId: string
  agentCount: number
  synchronizationRate: number // 0-1
  cohesionIndex: number // 0-1
  responseLatency: number // milliseconds
  conflictRate: number // 0-1
  emergentBehaviors: string[]
  lastUpdate: Date
}

export interface EmergentBehavior {
  type: string
  participants: string[]
  strength: number // 0-1
  duration: number
  characteristics: any
}

export class SYMindXGroupSynchronySkill implements GroupSynchronySkill {
  private orchestrator: SYMindXOrchestrator
  private config: CoordinationSkillConfig
  private activeGroups: Map<string, GroupState> = new Map()
  private synchronyPatterns: Map<string, SynchronyRhythm> = new Map()
  private behaviorTracking: Map<string, EmergentBehavior[]> = new Map()

  constructor(orchestrator: SYMindXOrchestrator, config: CoordinationSkillConfig = {
    enabled: true,
    priority: 4,
    timeout: 10000,
    retries: 2
  }) {
    this.orchestrator = orchestrator
    this.config = config
    
    this.initializeDefaultPatterns()
  }

  async synchronizeAgentActions(
    agentIds: string[],
    action: string,
    parameters?: any
  ): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      console.log(`🔄 Synchronizing action '${action}' across ${agentIds.length} agents`)
      
      // Validate agents exist
      const validAgents = agentIds.filter(id => this.orchestrator.agents.has(id))
      if (validAgents.length !== agentIds.length) {
        console.warn(`⚠️ Some agents not found: ${agentIds.length - validAgents.length} missing`)
      }
      
      // Create synchronization barrier
      const barrier = this.createSynchronizationBarrier(validAgents, action, parameters)
      
      // Send synchronization signal to all agents
      const syncMessage: AgentMessage = {
        id: `sync_${Date.now()}`,
        type: 'synchronization_signal',
        from: 'coordination_system',
        to: '', // Will be set for each agent
        content: {
          action,
          parameters,
          barrierId: barrier.id,
          participants: validAgents,
          timeout: this.config.timeout
        },
        timestamp: new Date()
      }
      
      // Broadcast to all participants
      const promises = validAgents.map(agentId => 
        this.orchestrator.interAgentCommunication.sendMessage(
          'coordination_system',
          agentId,
          { ...syncMessage, to: agentId }
        )
      )
      
      await Promise.all(promises)
      
      // Wait for synchronization completion
      const success = await this.waitForSynchronization(barrier)
      
      const duration = Date.now() - startTime
      console.log(`${success ? '✅' : '❌'} Synchronization ${success ? 'completed' : 'failed'} in ${duration}ms`)
      
      return success
      
    } catch (error) {
      console.error(`❌ Synchronization failed:`, error)
      return false
    }
  }

  async establishGroupRhythm(
    groupId: string,
    agentIds: string[],
    rhythm: SynchronyRhythm
  ): Promise<void> {
    console.log(`🎵 Establishing rhythm '${rhythm.pattern}' for group ${groupId}`)
    
    // Create or update group state
    const groupState: GroupState = {
      id: groupId,
      members: agentIds,
      rhythm,
      active: true,
      currentPhase: 0,
      cycleCount: 0,
      startTime: Date.now(),
      lastSync: Date.now()
    }
    
    this.activeGroups.set(groupId, groupState)
    this.synchronyPatterns.set(groupId, rhythm)
    
    // Start rhythm execution
    this.executeRhythm(groupState)
    
    // Notify group members
    const rhythmMessage: AgentMessage = {
      id: `rhythm_${groupId}_${Date.now()}`,
      type: 'group_rhythm_established',
      from: 'coordination_system',
      to: '',
      content: {
        groupId,
        rhythm,
        members: agentIds,
        startTime: groupState.startTime
      },
      timestamp: new Date()
    }
    
    for (const agentId of agentIds) {
      await this.orchestrator.interAgentCommunication.sendMessage(
        'coordination_system',
        agentId,
        { ...rhythmMessage, to: agentId }
      )
    }
  }

  async monitorGroupCoherence(groupId: string): Promise<CoherenceMetrics> {
    const groupState = this.activeGroups.get(groupId)
    if (!groupState) {
      throw new Error(`Group ${groupId} not found`)
    }
    
    // Calculate coherence metrics
    const metrics = await this.calculateCoherenceMetrics(groupState)
    
    // Update group state with metrics
    groupState.lastMetrics = metrics
    groupState.lastMetricsUpdate = Date.now()
    
    console.log(`📊 Group ${groupId} coherence: ${(metrics.cohesionIndex * 100).toFixed(1)}%`)
    
    return metrics
  }

  async handleGroupEmergentBehavior(
    groupId: string,
    behavior: EmergentBehavior
  ): Promise<void> {
    console.log(`🌟 Emergent behavior detected in group ${groupId}: ${behavior.type}`)
    
    // Track behavior
    if (!this.behaviorTracking.has(groupId)) {
      this.behaviorTracking.set(groupId, [])
    }
    this.behaviorTracking.get(groupId)!.push(behavior)
    
    // Analyze behavior impact
    const impact = this.analyzeBehaviorImpact(behavior)
    
    // Decide on response
    if (impact.isDisruptive) {
      await this.mitigateDisruptiveBehavior(groupId, behavior)
    } else if (impact.isBeneficial) {
      await this.amplifyBeneficialBehavior(groupId, behavior)
    }
    
    // Notify interested agents
    const behaviorMessage: AgentMessage = {
      id: `behavior_${groupId}_${Date.now()}`,
      type: 'emergent_behavior_detected',
      from: 'coordination_system',
      to: '',
      content: {
        groupId,
        behavior,
        impact,
        response: impact.isDisruptive ? 'mitigate' : impact.isBeneficial ? 'amplify' : 'monitor'
      },
      timestamp: new Date()
    }
    
    // Send to group leaders or all members based on behavior type
    const recipients = impact.severity > 0.7 ? behavior.participants : [behavior.participants[0]]
    
    for (const agentId of recipients) {
      await this.orchestrator.interAgentCommunication.sendMessage(
        'coordination_system',
        agentId,
        { ...behaviorMessage, to: agentId }
      )
    }
  }

  // Private helper methods
  private initializeDefaultPatterns(): void {
    // Sequential pattern
    this.synchronyPatterns.set('sequential', {
      pattern: 'sequential',
      interval: 1000,
      phases: [
        { name: 'prepare', duration: 500, participants: [], actions: ['prepare'] },
        { name: 'execute', duration: 300, participants: [], actions: ['execute'] },
        { name: 'confirm', duration: 200, participants: [], actions: ['confirm'] }
      ]
    })
    
    // Parallel pattern
    this.synchronyPatterns.set('parallel', {
      pattern: 'parallel',
      interval: 500,
      phases: [
        { name: 'sync', duration: 100, participants: [], actions: ['sync'] },
        { name: 'execute_all', duration: 400, participants: [], actions: ['execute'] }
      ]
    })
    
    // Heartbeat pattern
    this.synchronyPatterns.set('heartbeat', {
      pattern: 'heartbeat',
      interval: 2000,
      phases: [
        { name: 'pulse', duration: 100, participants: [], actions: ['heartbeat'] },
        { name: 'rest', duration: 1900, participants: [], actions: ['wait'] }
      ]
    })
  }

  private createSynchronizationBarrier(
    agents: string[],
    action: string,
    parameters?: any
  ): SynchronizationBarrier {
    const barrier: SynchronizationBarrier = {
      id: `barrier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      parameters,
      participants: agents,
      arrived: new Set(),
      completed: new Set(),
      failed: new Set(),
      timeout: this.config.timeout || 10000,
      createdAt: Date.now()
    }
    
    return barrier
  }

  private async waitForSynchronization(barrier: SynchronizationBarrier): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const checkCompletion = () => {
        const elapsed = Date.now() - startTime
        
        // Check timeout
        if (elapsed > barrier.timeout) {
          resolve(false)
          return
        }
        
        // Check if all participants completed
        if (barrier.completed.size === barrier.participants.length) {
          resolve(true)
          return
        }
        
        // Check if any failed
        if (barrier.failed.size > 0) {
          resolve(false)
          return
        }
        
        // Continue waiting
        setTimeout(checkCompletion, 100)
      }
      
      checkCompletion()
    })
  }

  private async executeRhythm(groupState: GroupState): Promise<void> {
    if (!groupState.active) return
    
    const rhythm = groupState.rhythm
    
    switch (rhythm.pattern) {
      case 'sequential':
        await this.executeSequentialRhythm(groupState)
        break
      case 'parallel':
        await this.executeParallelRhythm(groupState)
        break
      case 'wave':
        await this.executeWaveRhythm(groupState)
        break
      case 'heartbeat':
        await this.executeHeartbeatRhythm(groupState)
        break
      case 'custom':
        if (rhythm.customPattern) {
          const agents = groupState.members.map(id => this.orchestrator.agents.get(id)!).filter(Boolean)
          await rhythm.customPattern(agents, groupState.cycleCount)
        }
        break
    }
    
    // Schedule next execution
    if (groupState.active) {
      setTimeout(() => this.executeRhythm(groupState), rhythm.interval)
      groupState.cycleCount++
      groupState.lastSync = Date.now()
    }
  }

  private async executeSequentialRhythm(groupState: GroupState): Promise<void> {
    const phases = groupState.rhythm.phases || []
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i]
      groupState.currentPhase = i
      
      // Execute phase for all participants or specific subset
      const participants = phase.participants.length > 0 ? phase.participants : groupState.members
      
      for (const action of phase.actions) {
        await this.synchronizeAgentActions(participants, action)
      }
      
      // Wait for phase duration
      if (phase.duration > 0) {
        await new Promise(resolve => setTimeout(resolve, phase.duration))
      }
    }
  }

  private async executeParallelRhythm(groupState: GroupState): Promise<void> {
    const phases = groupState.rhythm.phases || []
    
    // Execute all phases in parallel
    const phasePromises = phases.map(async (phase, index) => {
      groupState.currentPhase = index
      
      const participants = phase.participants.length > 0 ? phase.participants : groupState.members
      
      for (const action of phase.actions) {
        await this.synchronizeAgentActions(participants, action)
      }
    })
    
    await Promise.all(phasePromises)
  }

  private async executeWaveRhythm(groupState: GroupState): Promise<void> {
    // Create wave effect across agents
    const waveDelay = groupState.rhythm.interval / groupState.members.length
    
    for (let i = 0; i < groupState.members.length; i++) {
      const agentId = groupState.members[i]
      
      setTimeout(async () => {
        await this.synchronizeAgentActions([agentId], 'wave_action')
      }, i * waveDelay)
    }
  }

  private async executeHeartbeatRhythm(groupState: GroupState): Promise<void> {
    // All agents pulse together, then rest
    await this.synchronizeAgentActions(groupState.members, 'heartbeat_pulse')
    
    // Brief pause before next heartbeat
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  private async calculateCoherenceMetrics(groupState: GroupState): Promise<CoherenceMetrics> {
    const members = groupState.members
    const activeMembers = members.filter(id => this.orchestrator.agents.has(id))
    
    // Calculate synchronization rate
    const syncRate = this.calculateSynchronizationRate(groupState)
    
    // Calculate cohesion index
    const cohesion = this.calculateCohesionIndex(groupState)
    
    // Calculate response latency
    const latency = this.calculateResponseLatency(groupState)
    
    // Calculate conflict rate
    const conflictRate = this.calculateConflictRate(groupState)
    
    // Detect emergent behaviors
    const emergentBehaviors = this.detectEmergentBehaviors(groupState)
    
    return {
      groupId: groupState.id,
      agentCount: activeMembers.length,
      synchronizationRate: syncRate,
      cohesionIndex: cohesion,
      responseLatency: latency,
      conflictRate: conflictRate,
      emergentBehaviors,
      lastUpdate: new Date()
    }
  }

  private calculateSynchronizationRate(groupState: GroupState): number {
    // Simplified calculation - would use actual timing data
    const cycleAge = Date.now() - groupState.startTime
    const expectedCycles = Math.floor(cycleAge / groupState.rhythm.interval)
    const actualCycles = groupState.cycleCount
    
    return Math.min(1, actualCycles / Math.max(1, expectedCycles))
  }

  private calculateCohesionIndex(groupState: GroupState): number {
    // Simplified cohesion calculation
    const timeSinceLastSync = Date.now() - groupState.lastSync
    const syncTolerance = groupState.rhythm.interval * 0.1
    
    return Math.max(0, 1 - (timeSinceLastSync / syncTolerance))
  }

  private calculateResponseLatency(groupState: GroupState): number {
    // Simplified latency calculation
    return 150 // milliseconds - would calculate from actual response times
  }

  private calculateConflictRate(groupState: GroupState): number {
    // Simplified conflict rate calculation
    return 0.05 // 5% - would calculate from actual conflict data
  }

  private detectEmergentBehaviors(groupState: GroupState): string[] {
    const behaviors: string[] = []
    
    // Simple behavior detection patterns
    if (groupState.cycleCount > 10) {
      if (groupState.cycleCount % 5 === 0) {
        behaviors.push('rhythmic_synchronization')
      }
      
      if (this.calculateCohesionIndex(groupState) > 0.9) {
        behaviors.push('high_cohesion')
      }
    }
    
    return behaviors
  }

  private analyzeBehaviorImpact(behavior: EmergentBehavior): BehaviorImpact {
    return {
      isDisruptive: behavior.strength > 0.8 && behavior.type.includes('conflict'),
      isBeneficial: behavior.strength > 0.7 && behavior.type.includes('cooperation'),
      severity: behavior.strength,
      confidence: 0.8
    }
  }

  private async mitigateDisruptiveBehavior(groupId: string, behavior: EmergentBehavior): Promise<void> {
    console.log(`🛠️ Mitigating disruptive behavior: ${behavior.type}`)
    
    // Implement mitigation strategies
    const mitigationActions = this.getMitigationActions(behavior)
    
    for (const action of mitigationActions) {
      await this.synchronizeAgentActions(behavior.participants, action)
    }
  }

  private async amplifyBeneficialBehavior(groupId: string, behavior: EmergentBehavior): Promise<void> {
    console.log(`📈 Amplifying beneficial behavior: ${behavior.type}`)
    
    // Implement amplification strategies
    const amplificationActions = this.getAmplificationActions(behavior)
    
    for (const action of amplificationActions) {
      await this.synchronizeAgentActions(behavior.participants, action)
    }
  }

  private getMitigationActions(behavior: EmergentBehavior): string[] {
    const actions: string[] = []
    
    if (behavior.type.includes('conflict')) {
      actions.push('conflict_resolution', 'reset_coordination')
    }
    
    if (behavior.type.includes('desync')) {
      actions.push('resynchronize', 'rhythm_reset')
    }
    
    return actions.length > 0 ? actions : ['general_mitigation']
  }

  private getAmplificationActions(behavior: EmergentBehavior): string[] {
    const actions: string[] = []
    
    if (behavior.type.includes('cooperation')) {
      actions.push('reinforce_cooperation', 'increase_coordination')
    }
    
    if (behavior.type.includes('efficiency')) {
      actions.push('optimize_pattern', 'enhance_rhythm')
    }
    
    return actions.length > 0 ? actions : ['general_amplification']
  }

  // Public utility methods
  stopGroupRhythm(groupId: string): void {
    const groupState = this.activeGroups.get(groupId)
    if (groupState) {
      groupState.active = false
      console.log(`⏹️ Stopped rhythm for group ${groupId}`)
    }
  }

  getActiveGroups(): string[] {
    return Array.from(this.activeGroups.keys()).filter(groupId => 
      this.activeGroups.get(groupId)?.active
    )
  }

  getGroupState(groupId: string): GroupState | undefined {
    return this.activeGroups.get(groupId)
  }

  getGroupMetrics(groupId: string): CoherenceMetrics | undefined {
    return this.activeGroups.get(groupId)?.lastMetrics
  }
}

// Supporting interfaces
interface SynchronizationBarrier {
  id: string
  action: string
  parameters?: any
  participants: string[]
  arrived: Set<string>
  completed: Set<string>
  failed: Set<string>
  timeout: number
  createdAt: number
}

interface GroupState {
  id: string
  members: string[]
  rhythm: SynchronyRhythm
  active: boolean
  currentPhase: number
  cycleCount: number
  startTime: number
  lastSync: number
  lastMetrics?: CoherenceMetrics
  lastMetricsUpdate?: number
}

interface BehaviorImpact {
  isDisruptive: boolean
  isBeneficial: boolean
  severity: number
  confidence: number
}