/**
 * Issue Management Skill for GitHub Extension
 * 
 * Provides actions related to creating, managing, and commenting on GitHub issues.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent'
import { SkillParameters } from '../../../types/common'
import { GitHubExtension } from '../index'
import { GitHubIssue, GitHubComment, GitHubLabel } from '../types'

export class IssueManagementSkill {
  private extension: GitHubExtension

  constructor(extension: GitHubExtension) {
    this.extension = extension
  }

  /**
   * Get all issue management related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      create_issue: {
        name: 'create_issue',
        description: 'Create a new GitHub issue',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          repo: 'string',
          title: 'string',
          body: 'string',
          labels: 'array',
          assignees: 'array',
          milestone: 'number'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.createIssue(agent, params.repo as string, params.title as string, params.body as string, {
            labels: params.labels as string[],
            assignees: params.assignees as string[],
            milestone: params.milestone as number
          })
        }
      },

      comment_on_issue: {
        name: 'comment_on_issue',
        description: 'Add a comment to an existing GitHub issue',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          repo: 'string',
          issueNumber: 'number',
          comment: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.commentOnIssue(agent, params.repo as string, params.issueNumber as number, params.comment as string)
        }
      },

      close_issue: {
        name: 'close_issue',
        description: 'Close a GitHub issue',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          issueNumber: 'number',
          reason: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.closeIssue(agent, params.repo as string, params.issueNumber as number, params.reason as string)
        }
      },

      reopen_issue: {
        name: 'reopen_issue',
        description: 'Reopen a closed GitHub issue',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          issueNumber: 'number'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.reopenIssue(agent, params.repo as string, params.issueNumber as number)
        }
      },

      add_labels: {
        name: 'add_labels',
        description: 'Add labels to a GitHub issue',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          issueNumber: 'number',
          labels: 'array'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.addLabels(agent, params.repo as string, params.issueNumber as number, params.labels as string[])
        }
      },

      remove_labels: {
        name: 'remove_labels',
        description: 'Remove labels from a GitHub issue',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          issueNumber: 'number',
          labels: 'array'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.removeLabels(agent, params.repo as string, params.issueNumber as number, params.labels as string[])
        }
      },

      assign_issue: {
        name: 'assign_issue',
        description: 'Assign users to a GitHub issue',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          issueNumber: 'number',
          assignees: 'array'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.assignIssue(agent, params.repo as string, params.issueNumber as number, params.assignees as string[])
        }
      },

      get_issue: {
        name: 'get_issue',
        description: 'Get details of a specific GitHub issue',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          issueNumber: 'number'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getIssue(agent, params.repo as string, params.issueNumber as number)
        }
      },

      list_issues: {
        name: 'list_issues',
        description: 'List GitHub issues with filters',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          state: 'string',
          labels: 'array',
          assignee: 'string',
          sort: 'string',
          direction: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.listIssues(agent, params.repo as string, {
            state: params.state as string,
            labels: params.labels as string[],
            assignee: params.assignee as string,
            sort: params.sort as string,
            direction: params.direction as string
          })
        }
      }
    }
  }

  private async createIssue(agent: Agent, repo: string, title: string, body: string, options?: {
    labels?: string[]
    assignees?: string[]
    milestone?: number
  }): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.create({
        owner: this.extension.config.settings.owner,
        repo,
        title,
        body,
        labels: options?.labels,
        assignees: options?.assignees,
        milestone: options?.milestone
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          issueNumber: result.data.number, 
          url: result.data.html_url,
          id: result.data.id,
          state: result.data.state
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create issue: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async commentOnIssue(agent: Agent, repo: string, issueNumber: number, comment: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.createComment({
        owner: this.extension.config.settings.owner,
        repo,
        issue_number: issueNumber,
        body: comment
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          commentId: result.data.id, 
          url: result.data.html_url,
          createdAt: result.data.created_at
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to comment on issue: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async closeIssue(agent: Agent, repo: string, issueNumber: number, reason?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.update({
        owner: this.extension.config.settings.owner,
        repo,
        issue_number: issueNumber,
        state: 'closed',
        state_reason: reason === 'not_planned' ? 'not_planned' : 'completed'
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          issueNumber: result.data.number,
          state: result.data.state,
          closedAt: result.data.closed_at
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to close issue: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async reopenIssue(agent: Agent, repo: string, issueNumber: number): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.update({
        owner: this.extension.config.settings.owner,
        repo,
        issue_number: issueNumber,
        state: 'open'
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          issueNumber: result.data.number,
          state: result.data.state
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to reopen issue: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async addLabels(agent: Agent, repo: string, issueNumber: number, labels: string[]): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.addLabels({
        owner: this.extension.config.settings.owner,
        repo,
        issue_number: issueNumber,
        labels
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          issueNumber,
          labels: result.data.map(label => label.name)
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to add labels: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async removeLabels(agent: Agent, repo: string, issueNumber: number, labels: string[]): Promise<ActionResult> {
    try {
      for (const label of labels) {
        await this.extension['octokit'].issues.removeLabel({
          owner: this.extension.config.settings.owner,
          repo,
          issue_number: issueNumber,
          name: label
        })
      }
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          issueNumber,
          removedLabels: labels
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to remove labels: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async assignIssue(agent: Agent, repo: string, issueNumber: number, assignees: string[]): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.addAssignees({
        owner: this.extension.config.settings.owner,
        repo,
        issue_number: issueNumber,
        assignees
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          issueNumber,
          assignees: result.data.assignees?.map(a => a.login) || []
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to assign issue: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getIssue(agent: Agent, repo: string, issueNumber: number): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.get({
        owner: this.extension.config.settings.owner,
        repo,
        issue_number: issueNumber
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          number: result.data.number,
          title: result.data.title,
          body: result.data.body,
          state: result.data.state,
          labels: result.data.labels.map((label: any) => typeof label === 'string' ? label : label.name),
          assignees: result.data.assignees?.map(a => a.login) || [],
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          url: result.data.html_url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get issue: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async listIssues(agent: Agent, repo: string, options?: {
    state?: string
    labels?: string[]
    assignee?: string
    sort?: string
    direction?: string
  }): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].issues.listForRepo({
        owner: this.extension.config.settings.owner,
        repo,
        state: (options?.state as 'open' | 'closed' | 'all') || 'open',
        labels: options?.labels?.join(','),
        assignee: options?.assignee,
        sort: (options?.sort as 'created' | 'updated' | 'comments') || 'created',
        direction: (options?.direction as 'asc' | 'desc') || 'desc',
        per_page: 30
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          issues: result.data.map(issue => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            labels: issue.labels.map((label: any) => typeof label === 'string' ? label : label.name),
            assignees: issue.assignees?.map(a => a.login) || [],
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            url: issue.html_url
          })),
          totalCount: result.data.length
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list issues: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
