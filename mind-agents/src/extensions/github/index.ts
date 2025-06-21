import { Extension, ExtensionAction, ExtensionEventHandler, Agent, ActionResult, ActionResultType, ExtensionType, ExtensionStatus, ActionCategory } from '../../types/agent'
import { ExtensionConfig, SkillParameters } from '../../types/common'
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { initializeSkills } from './skills/index'
import { GitHubConfig, GitHubApprovalRequest } from './types'

export class GitHubExtension implements Extension {
  id = 'github'
  name = 'GitHub Integration'
  version = '1.0.0'
  enabled = true
  type = ExtensionType.COMMUNICATION
  status = ExtensionStatus.ENABLED
  config: GitHubConfig
  private octokit: Octokit
  private approvals: Map<string, GitHubApprovalRequest> = new Map()
  private userPreferences: Map<string, any> = new Map()
  private skills: Record<string, any> = {}

  constructor(config: GitHubConfig) {
    this.config = config
    
    // Initialize Octokit with either token or app auth
    if (config.settings.token) {
      this.octokit = new Octokit({ auth: config.settings.token })
    } else if (config.settings.appId && config.settings.privateKey) {
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: config.settings.appId,
          privateKey: config.settings.privateKey,
        }
      })
    } else {
      throw new Error('GitHub extension requires either token or app credentials')
    }
  }

  async init(agent: Agent): Promise<void> {
    console.log(`🐙 Initializing GitHub extension for agent ${agent.name}`)
    
    try {
      // Initialize skills
      this.skills = initializeSkills(this)
      
      console.log(`✅ GitHub extension initialized for ${agent.name}`)
    } catch (error) {
      console.error(`❌ Failed to initialize GitHub extension:`, error)
      throw error
    }
  }

  async tick(agent: Agent): Promise<void> {
    // Periodic tasks if needed
    // Could check for approval timeouts, scheduled tasks, etc.
  }

  get actions(): Record<string, ExtensionAction> {
    const allActions: Record<string, ExtensionAction> = {}
    
    // Aggregate actions from all skills
    Object.values(this.skills).forEach(skill => {
      if (skill && typeof skill.getActions === 'function') {
        const skillActions = skill.getActions()
        Object.assign(allActions, skillActions)
      }
    })
    
    return allActions
  }

  get events(): Record<string, ExtensionEventHandler> {
    return {
      issue_comment: {
        event: 'issue_comment',
        description: 'Handle GitHub issue comment events',
        handler: async (agent: Agent, event: any) => {
          console.log('GitHub issue comment event:', event)
        }
      },
      pull_request: {
        event: 'pull_request', 
        description: 'Handle GitHub pull request events',
        handler: async (agent: Agent, event: any) => {
          console.log('GitHub pull request event:', event)
        }
      },
      push: {
        event: 'push',
        description: 'Handle GitHub push events', 
        handler: async (agent: Agent, event: any) => {
          console.log('GitHub push event:', event)
        }
      }
    }
  }

  // Expose octokit for skills to use
  getOctokit(): Octokit {
    return this.octokit
  }

  // Expose config for skills to use
  getConfig(): GitHubConfig {
    return this.config
  }

  // Utility methods for backward compatibility and shared functionality
  async setUserPreferences(userId: string, preferences: any): Promise<ActionResult> {
    this.userPreferences.set(userId, preferences)
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, preferences }
    }
  }

  async getUserPreferences(userId: string): Promise<ActionResult> {
    const preferences = this.userPreferences.get(userId) || {}
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: preferences
    }
  }

  // Approval management methods
  setApproval(approvalId: string, approval: GitHubApprovalRequest): void {
    this.approvals.set(approvalId, approval)
  }

  getApproval(approvalId: string): GitHubApprovalRequest | undefined {
    return this.approvals.get(approvalId)
  }

  removeApproval(approvalId: string): boolean {
    return this.approvals.delete(approvalId)
  }
}

export default GitHubExtension