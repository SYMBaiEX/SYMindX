/**
 * Ethics Engine - Comprehensive ethical constraint checking and safety controls
 */

import { Agent, AgentAction, AgentEvent } from '../types/agent.js'
import { DecisionContext, Constraint } from '../types/autonomous.js'
import { Logger } from '../utils/logger.js'

export interface EthicsConfig {
  enabled: boolean
  strictMode: boolean
  principles: EthicalPrinciple[]
  constraints: EthicalConstraint[]
  safetyLimits: SafetyLimits
  auditingEnabled: boolean
  interventionLevel: 'advisory' | 'blocking' | 'preventive'
}

export interface EthicalPrinciple {
  id: string
  name: string
  description: string
  weight: number // 0.0 to 1.0
  mandatory: boolean
  violations: ViolationType[]
}

export interface EthicalConstraint {
  id: string
  principle: string
  type: 'hard' | 'soft'
  condition: (action: AgentAction, context: DecisionContext) => boolean
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  remediation?: string
}

export interface SafetyLimits {
  maxActionsPerMinute: number
  maxResourceUsage: ResourceLimits
  prohibitedActions: string[]
  requiresApproval: string[]
  dangerousPatterns: DangerPattern[]
}

export interface ResourceLimits {
  memory: number // MB
  cpu: number // percentage
  network: number // KB/s
  storage: number // MB
}

export interface DangerPattern {
  id: string
  description: string
  pattern: string // regex or pattern description
  severity: 'warning' | 'danger' | 'critical'
  action: 'log' | 'block' | 'require_approval'
}

export interface ViolationType {
  type: string
  description: string
  examples: string[]
}

export interface EthicalEvaluation {
  allowed: boolean
  confidence: number
  reasoning: string[]
  violations: EthicalViolation[]
  recommendations: string[]
  requiredApprovals: string[]
  [key: string]: any // Allow additional properties for GenericData compatibility
}

export interface EthicalViolation {
  principle: string
  constraint: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence: string[]
  remediation?: string
}

export interface EthicsAuditRecord {
  id: string
  timestamp: Date
  agentId: string
  action: AgentAction
  evaluation: EthicalEvaluation
  decision: 'allowed' | 'blocked' | 'modified'
  justification: string
}

export class EthicsEngine {
  private config: EthicsConfig
  private logger: Logger
  private auditRecords: EthicsAuditRecord[] = []
  private actionCounts: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(config: EthicsConfig) {
    this.config = config
    this.logger = new Logger('ethics-engine')
    this.initializeDefaultPrinciples()
  }

  /**
   * Evaluate action against ethical constraints
   */
  async evaluateAction(
    agent: Agent, 
    action: AgentAction, 
    context: DecisionContext
  ): Promise<EthicalEvaluation> {
    if (!this.config.enabled) {
      return {
        allowed: true,
        confidence: 1.0,
        reasoning: ['Ethics engine disabled'],
        violations: [],
        recommendations: [],
        requiredApprovals: []
      }
    }

    this.logger.debug(`Evaluating action: ${action.action} for agent: ${agent.name}`)

    const violations: EthicalViolation[] = []
    const reasoning: string[] = []
    const recommendations: string[] = []
    const requiredApprovals: string[] = []

    // 1. Check safety limits
    const safetyCheck = await this.checkSafetyLimits(agent, action)
    if (safetyCheck.violations.length > 0) {
      violations.push(...safetyCheck.violations)
      reasoning.push(...safetyCheck.reasoning)
    }

    // 2. Check ethical constraints
    const constraintCheck = await this.checkEthicalConstraints(agent, action, context)
    if (constraintCheck.violations.length > 0) {
      violations.push(...constraintCheck.violations)
      reasoning.push(...constraintCheck.reasoning)
    }

    // 3. Check dangerous patterns
    const patternCheck = await this.checkDangerousPatterns(action)
    if (patternCheck.violations.length > 0) {
      violations.push(...patternCheck.violations)
      reasoning.push(...patternCheck.reasoning)
    }

    // 4. Check principle adherence
    const principleCheck = await this.checkPrincipleAdherence(agent, action, context)
    if (principleCheck.violations.length > 0) {
      violations.push(...principleCheck.violations)
      reasoning.push(...principleCheck.reasoning)
    }

    // 5. Generate recommendations
    recommendations.push(...this.generateRecommendations(violations, action))

    // 6. Check if approvals are required
    requiredApprovals.push(...this.checkRequiredApprovals(action, violations))

    // 7. Calculate overall assessment
    const { allowed, confidence } = this.calculateOverallAssessment(violations)

    const evaluation: EthicalEvaluation = {
      allowed,
      confidence,
      reasoning,
      violations,
      recommendations,
      requiredApprovals
    }

    // 8. Log audit record if enabled
    if (this.config.auditingEnabled) {
      await this.logAuditRecord(agent, action, evaluation, allowed ? 'allowed' : 'blocked')
    }

    return evaluation
  }

  /**
   * Check safety limits
   */
  private async checkSafetyLimits(agent: Agent, action: AgentAction): Promise<{
    violations: EthicalViolation[]
    reasoning: string[]
  }> {
    const violations: EthicalViolation[] = []
    const reasoning: string[] = []

    // Check action rate limiting
    const rateLimitCheck = this.checkActionRateLimit(agent.id)
    if (!rateLimitCheck.allowed) {
      violations.push({
        principle: 'resource_protection',
        constraint: 'action_rate_limit',
        severity: 'high',
        description: 'Action rate limit exceeded',
        evidence: [`Rate: ${rateLimitCheck.currentRate}/min, Limit: ${this.config.safetyLimits.maxActionsPerMinute}/min`],
        remediation: 'Reduce action frequency or wait for rate limit reset'
      })
      reasoning.push(`Action rate limit exceeded: ${rateLimitCheck.currentRate}/${this.config.safetyLimits.maxActionsPerMinute} per minute`)
    }

    // Check prohibited actions
    if (this.config.safetyLimits.prohibitedActions.includes(action.action)) {
      violations.push({
        principle: 'harm_prevention',
        constraint: 'prohibited_action',
        severity: 'critical',
        description: 'Action is explicitly prohibited',
        evidence: [`Action '${action.action}' is in prohibited list`],
        remediation: 'Choose an alternative action that achieves similar goals'
      })
      reasoning.push(`Action '${action.action}' is explicitly prohibited`)
    }

    // Check if action requires approval
    if (this.config.safetyLimits.requiresApproval.includes(action.action)) {
      violations.push({
        principle: 'human_oversight',
        constraint: 'requires_approval',
        severity: 'medium',
        description: 'Action requires human approval',
        evidence: [`Action '${action.action}' requires approval`],
        remediation: 'Request human approval before proceeding'
      })
      reasoning.push(`Action '${action.action}' requires human approval`)
    }

    return { violations, reasoning }
  }

  /**
   * Check ethical constraints
   */
  private async checkEthicalConstraints(
    agent: Agent, 
    action: AgentAction, 
    context: DecisionContext
  ): Promise<{
    violations: EthicalViolation[]
    reasoning: string[]
  }> {
    const violations: EthicalViolation[] = []
    const reasoning: string[] = []

    for (const constraint of this.config.constraints) {
      try {
        if (constraint.condition(action, context)) {
          violations.push({
            principle: constraint.principle,
            constraint: constraint.id,
            severity: constraint.severity,
            description: constraint.description,
            evidence: [`Constraint condition met for: ${constraint.id}`],
            remediation: constraint.remediation
          })
          reasoning.push(`Ethical constraint violated: ${constraint.description}`)
        }
      } catch (error) {
        this.logger.error(`Error evaluating constraint ${constraint.id}:`, error)
      }
    }

    return { violations, reasoning }
  }

  /**
   * Check dangerous patterns
   */
  private async checkDangerousPatterns(action: AgentAction): Promise<{
    violations: EthicalViolation[]
    reasoning: string[]
  }> {
    const violations: EthicalViolation[] = []
    const reasoning: string[] = []

    for (const pattern of this.config.safetyLimits.dangerousPatterns) {
      if (this.matchesDangerousPattern(action, pattern)) {
        const severity = this.mapDangerSeverity(pattern.severity)
        
        violations.push({
          principle: 'harm_prevention',
          constraint: pattern.id,
          severity,
          description: pattern.description,
          evidence: [`Action matches dangerous pattern: ${pattern.pattern}`],
          remediation: `Action matches dangerous pattern and should be ${pattern.action}`
        })
        reasoning.push(`Dangerous pattern detected: ${pattern.description}`)
      }
    }

    return { violations, reasoning }
  }

  /**
   * Check principle adherence
   */
  private async checkPrincipleAdherence(
    agent: Agent, 
    action: AgentAction, 
    context: DecisionContext
  ): Promise<{
    violations: EthicalViolation[]
    reasoning: string[]
  }> {
    const violations: EthicalViolation[] = []
    const reasoning: string[] = []

    for (const principle of this.config.principles) {
      const adherenceScore = await this.evaluatePrincipleAdherence(principle, action, context, agent)
      
      if (adherenceScore < (principle.mandatory ? 0.8 : 0.5)) {
        const severity = principle.mandatory ? 'high' : 'medium'
        
        violations.push({
          principle: principle.id,
          constraint: 'principle_adherence',
          severity,
          description: `Poor adherence to principle: ${principle.name}`,
          evidence: [`Adherence score: ${adherenceScore.toFixed(2)} (threshold: ${principle.mandatory ? 0.8 : 0.5})`],
          remediation: `Modify action to better align with principle: ${principle.description}`
        })
        reasoning.push(`Low adherence to principle '${principle.name}': ${adherenceScore.toFixed(2)}`)
      }
    }

    return { violations, reasoning }
  }

  /**
   * Evaluate adherence to a specific principle
   */
  private async evaluatePrincipleAdherence(
    principle: EthicalPrinciple,
    action: AgentAction,
    context: DecisionContext,
    agent: Agent
  ): Promise<number> {
    // This would implement specific logic for each principle
    // For now, we'll use a simplified heuristic approach
    
    switch (principle.id) {
      case 'do_no_harm':
        return this.evaluateHarmPotential(action, context)
      
      case 'respect_autonomy':
        return this.evaluateAutonomyRespect(action, context)
      
      case 'promote_wellbeing':
        return this.evaluateWellbeingPromotion(action, context)
      
      case 'be_truthful':
        return this.evaluateTruthfulness(action, context)
      
      case 'protect_privacy':
        return this.evaluatePrivacyProtection(action, context)
      
      case 'foster_growth':
        return this.evaluateGrowthFostering(action, context, agent)
      
      default:
        return 0.7 // Neutral score for unknown principles
    }
  }

  /**
   * Calculate overall ethical assessment
   */
  private calculateOverallAssessment(violations: EthicalViolation[]): {
    allowed: boolean
    confidence: number
  } {
    if (violations.length === 0) {
      return { allowed: true, confidence: 1.0 }
    }

    // Check for critical violations
    const criticalViolations = violations.filter(v => v.severity === 'critical')
    if (criticalViolations.length > 0) {
      return { allowed: false, confidence: 1.0 }
    }

    // Check for high severity violations in strict mode
    if (this.config.strictMode) {
      const highViolations = violations.filter(v => v.severity === 'high')
      if (highViolations.length > 0) {
        return { allowed: false, confidence: 0.9 }
      }
    }

    // Calculate confidence based on violation severity and count
    let severityScore = 0
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical': severityScore += 1.0; break
        case 'high': severityScore += 0.7; break
        case 'medium': severityScore += 0.4; break
        case 'low': severityScore += 0.2; break
      }
    }

    const normalizedScore = Math.min(1.0, severityScore / violations.length)
    const confidence = 1.0 - normalizedScore
    
    // Allow if confidence is above threshold
    const allowed = confidence > 0.5

    return { allowed, confidence }
  }

  /**
   * Generate recommendations for addressing violations
   */
  private generateRecommendations(violations: EthicalViolation[], action: AgentAction): string[] {
    const recommendations: string[] = []

    // Group violations by principle
    const violationsByPrinciple = violations.reduce((acc, violation) => {
      if (!acc[violation.principle]) {
        acc[violation.principle] = []
      }
      acc[violation.principle].push(violation)
      return acc
    }, {} as Record<string, EthicalViolation[]>)

    for (const [principle, principleViolations] of Object.entries(violationsByPrinciple)) {
      if (principleViolations.length > 0) {
        const remediation = principleViolations[0].remediation
        if (remediation) {
          recommendations.push(remediation)
        } else {
          recommendations.push(`Address violations related to principle: ${principle}`)
        }
      }
    }

    // Add general recommendations
    if (violations.some(v => v.severity === 'critical' || v.severity === 'high')) {
      recommendations.push('Consider alternative actions with lower ethical risk')
      recommendations.push('Seek human guidance for complex ethical decisions')
    }

    return recommendations
  }

  /**
   * Check if action requires approvals
   */
  private checkRequiredApprovals(action: AgentAction, violations: EthicalViolation[]): string[] {
    const approvals: string[] = []

    // Check for actions that always require approval
    if (this.config.safetyLimits.requiresApproval.includes(action.action)) {
      approvals.push('human_oversight')
    }

    // Check for high-severity violations
    const highSeverityViolations = violations.filter(v => 
      v.severity === 'critical' || v.severity === 'high'
    )
    
    if (highSeverityViolations.length > 0) {
      approvals.push('ethics_review')
    }

    // Check for specific constraint types
    const privacyViolations = violations.filter(v => 
      v.principle === 'protect_privacy' || v.constraint.includes('privacy')
    )
    
    if (privacyViolations.length > 0) {
      approvals.push('privacy_officer')
    }

    return approvals
  }

  /**
   * Log audit record
   */
  private async logAuditRecord(
    agent: Agent,
    action: AgentAction,
    evaluation: EthicalEvaluation,
    decision: 'allowed' | 'blocked' | 'modified'
  ): Promise<void> {
    const auditRecord: EthicsAuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      agentId: agent.id,
      action,
      evaluation,
      decision,
      justification: evaluation.reasoning.join('; ')
    }

    this.auditRecords.push(auditRecord)

    // Limit audit history size
    if (this.auditRecords.length > 1000) {
      this.auditRecords.shift()
    }

    this.logger.info(`Ethics audit: ${decision} action '${action.action}' for agent ${agent.name}`)
  }

  // Utility methods for principle evaluation

  private evaluateHarmPotential(action: AgentAction, context: DecisionContext): number {
    // Evaluate potential for harm
    const harmIndicators = ['delete', 'remove', 'destroy', 'attack', 'damage', 'break']
    const actionStr = action.action.toLowerCase()
    
    for (const indicator of harmIndicators) {
      if (actionStr.includes(indicator)) {
        return 0.2 // Low adherence (high harm potential)
      }
    }
    
    return 0.9 // High adherence (low harm potential)
  }

  private evaluateAutonomyRespect(action: AgentAction, context: DecisionContext): number {
    // Evaluate respect for human autonomy
    const autonomyViolators = ['force', 'control', 'manipulate', 'coerce', 'override']
    const actionStr = action.action.toLowerCase()
    
    for (const violator of autonomyViolators) {
      if (actionStr.includes(violator)) {
        return 0.3
      }
    }
    
    return 0.8
  }

  private evaluateWellbeingPromotion(action: AgentAction, context: DecisionContext): number {
    // Evaluate contribution to wellbeing
    const wellbeingPromotors = ['help', 'assist', 'support', 'improve', 'heal', 'comfort']
    const actionStr = action.action.toLowerCase()
    
    for (const promotor of wellbeingPromotors) {
      if (actionStr.includes(promotor)) {
        return 0.9
      }
    }
    
    return 0.6 // Neutral
  }

  private evaluateTruthfulness(action: AgentAction, context: DecisionContext): number {
    // Evaluate truthfulness
    const deceptionIndicators = ['lie', 'deceive', 'mislead', 'fake', 'false']
    const actionStr = action.action.toLowerCase()
    
    for (const indicator of deceptionIndicators) {
      if (actionStr.includes(indicator)) {
        return 0.1
      }
    }
    
    return 0.9
  }

  private evaluatePrivacyProtection(action: AgentAction, context: DecisionContext): number {
    // Evaluate privacy protection
    const privacyViolators = ['spy', 'monitor', 'track', 'surveillance', 'collect_data', 'record']
    const actionStr = action.action.toLowerCase()
    
    for (const violator of privacyViolators) {
      if (actionStr.includes(violator)) {
        return 0.3
      }
    }
    
    return 0.8
  }

  private evaluateGrowthFostering(action: AgentAction, context: DecisionContext, agent: Agent): number {
    // Evaluate contribution to growth and learning
    const growthPromotors = ['learn', 'teach', 'develop', 'practice', 'explore', 'discover', 'create']
    const actionStr = action.action.toLowerCase()
    
    for (const promotor of growthPromotors) {
      if (actionStr.includes(promotor)) {
        return 0.9
      }
    }
    
    return 0.6
  }

  private checkActionRateLimit(agentId: string): { allowed: boolean; currentRate: number } {
    const now = Date.now()
    const oneMinute = 60 * 1000
    
    let agentActions = this.actionCounts.get(agentId)
    if (!agentActions || now - agentActions.resetTime > oneMinute) {
      agentActions = { count: 1, resetTime: now }
      this.actionCounts.set(agentId, agentActions)
      return { allowed: true, currentRate: 1 }
    }
    
    agentActions.count++
    const allowed = agentActions.count <= this.config.safetyLimits.maxActionsPerMinute
    
    return { allowed, currentRate: agentActions.count }
  }

  private matchesDangerousPattern(action: AgentAction, pattern: DangerPattern): boolean {
    try {
      const regex = new RegExp(pattern.pattern, 'i')
      return regex.test(action.action) || regex.test(JSON.stringify(action.parameters))
    } catch (error) {
      // If pattern is not a valid regex, do simple string matching
      const actionStr = (action.action + JSON.stringify(action.parameters)).toLowerCase()
      return actionStr.includes(pattern.pattern.toLowerCase())
    }
  }

  private mapDangerSeverity(severity: 'warning' | 'danger' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case 'warning': return 'low'
      case 'danger': return 'high'
      case 'critical': return 'critical'
      default: return 'medium'
    }
  }

  private initializeDefaultPrinciples(): void {
    if (this.config.principles.length === 0) {
      this.config.principles = [
        {
          id: 'do_no_harm',
          name: 'Do No Harm',
          description: 'Actions must not cause harm to humans, other agents, or systems',
          weight: 1.0,
          mandatory: true,
          violations: [
            {
              type: 'physical_harm',
              description: 'Actions that could cause physical harm',
              examples: ['destructive actions', 'dangerous commands', 'safety violations']
            },
            {
              type: 'psychological_harm',
              description: 'Actions that could cause psychological harm',
              examples: ['harassment', 'manipulation', 'emotional abuse']
            },
            {
              type: 'systemic_harm',
              description: 'Actions that could harm systems or infrastructure',
              examples: ['system attacks', 'data corruption', 'resource abuse']
            }
          ]
        },
        {
          id: 'respect_autonomy',
          name: 'Respect Autonomy',
          description: 'Respect the autonomy and decision-making capacity of humans',
          weight: 0.9,
          mandatory: true,
          violations: [
            {
              type: 'coercion',
              description: 'Forcing or pressuring humans into actions',
              examples: ['threats', 'ultimatums', 'manipulation']
            },
            {
              type: 'deception',
              description: 'Misleading humans about capabilities or intentions',
              examples: ['false claims', 'hidden capabilities', 'misrepresentation']
            }
          ]
        },
        {
          id: 'promote_wellbeing',
          name: 'Promote Wellbeing',
          description: 'Actions should contribute to human and societal wellbeing',
          weight: 0.8,
          mandatory: false,
          violations: [
            {
              type: 'wellbeing_reduction',
              description: 'Actions that reduce overall wellbeing',
              examples: ['counterproductive actions', 'harmful advice', 'negative impacts']
            }
          ]
        },
        {
          id: 'be_truthful',
          name: 'Be Truthful',
          description: 'Provide accurate information and avoid deception',
          weight: 0.9,
          mandatory: true,
          violations: [
            {
              type: 'false_information',
              description: 'Providing false or misleading information',
              examples: ['lies', 'misinformation', 'fabricated data']
            }
          ]
        },
        {
          id: 'protect_privacy',
          name: 'Protect Privacy',
          description: 'Respect and protect privacy and confidentiality',
          weight: 0.85,
          mandatory: true,
          violations: [
            {
              type: 'privacy_violation',
              description: 'Unauthorized access to or sharing of private information',
              examples: ['data theft', 'unauthorized monitoring', 'information leakage']
            }
          ]
        },
        {
          id: 'foster_growth',
          name: 'Foster Growth',
          description: 'Support learning, development, and positive growth',
          weight: 0.7,
          mandatory: false,
          violations: [
            {
              type: 'growth_inhibition',
              description: 'Actions that prevent learning or development',
              examples: ['discouraging exploration', 'limiting learning', 'stifling creativity']
            }
          ]
        }
      ]
    }
  }

  /**
   * Get ethics engine statistics
   */
  getEthicsStats() {
    const recentAudits = this.auditRecords.slice(-100) // Last 100 audits
    const totalEvaluations = this.auditRecords.length
    const allowedActions = this.auditRecords.filter(r => r.decision === 'allowed').length
    const blockedActions = this.auditRecords.filter(r => r.decision === 'blocked').length
    
    const violationsByPrinciple: Record<string, number> = {}
    for (const audit of recentAudits) {
      for (const violation of audit.evaluation.violations) {
        violationsByPrinciple[violation.principle] = (violationsByPrinciple[violation.principle] || 0) + 1
      }
    }

    return {
      enabled: this.config.enabled,
      strictMode: this.config.strictMode,
      totalEvaluations,
      allowedActions,
      blockedActions,
      allowanceRate: totalEvaluations > 0 ? allowedActions / totalEvaluations : 0,
      principles: this.config.principles.length,
      constraints: this.config.constraints.length,
      safetyLimits: this.config.safetyLimits,
      violationsByPrinciple,
      recentAudits: recentAudits.slice(-10) // Last 10 for display
    }
  }

  /**
   * Update ethics configuration
   */
  updateConfig(updates: Partial<EthicsConfig>): void {
    this.config = { ...this.config, ...updates }
    this.logger.info('Ethics configuration updated')
  }

  /**
   * Add custom constraint
   */
  addConstraint(constraint: EthicalConstraint): void {
    this.config.constraints.push(constraint)
    this.logger.info(`Added custom ethical constraint: ${constraint.id}`)
  }

  /**
   * Remove constraint
   */
  removeConstraint(constraintId: string): boolean {
    const index = this.config.constraints.findIndex(c => c.id === constraintId)
    if (index >= 0) {
      this.config.constraints.splice(index, 1)
      this.logger.info(`Removed ethical constraint: ${constraintId}`)
      return true
    }
    return false
  }

  /**
   * Get audit history
   */
  getAuditHistory(limit: number = 50): EthicsAuditRecord[] {
    return this.auditRecords.slice(-limit)
  }
}

/**
 * Create default ethics configuration
 */
export function createDefaultEthicsConfig(): EthicsConfig {
  return {
    enabled: true,
    strictMode: false,
    principles: [], // Will be initialized by the engine
    constraints: [
      {
        id: 'no_system_modification',
        principle: 'do_no_harm',
        type: 'hard',
        condition: (action) => action.action.includes('modify_system') || action.action.includes('change_code'),
        description: 'Prevent system modification actions',
        severity: 'critical',
        remediation: 'Use safe, sandboxed alternatives'
      },
      {
        id: 'no_data_deletion',
        principle: 'do_no_harm',
        type: 'hard',
        condition: (action) => action.action.includes('delete') && action.parameters.permanent === true,
        description: 'Prevent permanent data deletion',
        severity: 'high',
        remediation: 'Use soft deletion or move to trash'
      },
      {
        id: 'privacy_protection',
        principle: 'protect_privacy',
        type: 'hard',
        condition: (action) => action.action.includes('share_data') && !action.parameters.consent,
        description: 'Prevent sharing data without consent',
        severity: 'high',
        remediation: 'Obtain explicit consent before sharing'
      }
    ],
    safetyLimits: {
      maxActionsPerMinute: 30,
      maxResourceUsage: {
        memory: 512, // MB
        cpu: 25, // percentage
        network: 1024, // KB/s
        storage: 100 // MB
      },
      prohibitedActions: [
        'delete_system_files',
        'modify_security_settings',
        'access_other_agents',
        'execute_arbitrary_code',
        'bypass_safety_controls'
      ],
      requiresApproval: [
        'send_email',
        'make_purchase',
        'share_personal_data',
        'access_external_systems',
        'modify_agent_behavior'
      ],
      dangerousPatterns: [
        {
          id: 'admin_escalation',
          description: 'Attempts to gain administrative privileges',
          pattern: 'sudo|admin|root|escalate',
          severity: 'critical',
          action: 'block'
        },
        {
          id: 'data_exfiltration',
          description: 'Attempts to extract or copy large amounts of data',
          pattern: 'copy.*all|download.*database|export.*users',
          severity: 'danger',
          action: 'require_approval'
        },
        {
          id: 'system_commands',
          description: 'System-level command execution',
          pattern: 'rm -rf|format|shutdown|reboot',
          severity: 'critical',
          action: 'block'
        }
      ]
    },
    auditingEnabled: true,
    interventionLevel: 'blocking'
  }
}