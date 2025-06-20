/**
 * Workflow Skill for GitHub Extension
 * 
 * Provides actions related to GitHub workflows, approvals, and task management.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent'
import { SkillParameters } from '../../../types/common'
import { GitHubExtension } from '../index'
import { GitHubApprovalRequest } from '../types'

export class WorkflowSkill {
  private extension: GitHubExtension

  constructor(extension: GitHubExtension) {
    this.extension = extension
  }

  /**
   * Get all workflow related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      request_approval: {
        name: 'request_approval',
        description: 'Request approval via GitHub issue',
        category: ActionCategory.SOCIAL,
        parameters: {
          repo: 'string',
          title: 'string',
          description: 'string',
          approvers: 'array',
          priority: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.requestApproval(agent, params.repo as string, params.title as string, params.description as string, params.approvers as string[], params.priority as string)
        }
      },

      track_task: {
        name: 'track_task',
        description: 'Track a task as a GitHub issue',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          task: 'string',
          assignee: 'string',
          labels: 'array',
          priority: 'string',
          dueDate: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.trackTask(agent, params.repo as string, params.task as string, {
            assignee: params.assignee as string,
            labels: params.labels as string[],
            priority: params.priority as string,
            dueDate: params.dueDate as string
          })
        }
      },

      create_milestone: {
        name: 'create_milestone',
        description: 'Create a project milestone',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          title: 'string',
          description: 'string',
          dueDate: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.createMilestone(agent, params.repo as string, params.title as string, params.description as string, params.dueDate as string)
        }
      },

      create_project: {
        name: 'create_project',
        description: 'Create a project board in the repository',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          name: 'string',
          description: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.createProject(agent, params.repo as string, params.name as string, params.description as string)
        }
      },

      add_issue_to_project: {
        name: 'add_issue_to_project',
        description: 'Add an issue to a project board',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          issueNumber: 'number',
          projectId: 'number',
          columnId: 'number'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.addIssueToProject(agent, params.repo as string, params.issueNumber as number, params.projectId as number, params.columnId as number)
        }
      },

      schedule_task: {
        name: 'schedule_task',
        description: 'Schedule a task with reminders',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          task: 'string',
          scheduledDate: 'string',
          assignee: 'string',
          reminderDays: 'number'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.scheduleTask(agent, params.repo as string, params.task as string, params.scheduledDate as string, params.assignee as string, params.reminderDays as number)
        }
      },

      check_approval_status: {
        name: 'check_approval_status',
        description: 'Check the status of an approval request',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          issueNumber: 'number'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.checkApprovalStatus(agent, params.repo as string, params.issueNumber as number)
        }
      },

      update_task_status: {
        name: 'update_task_status',
        description: 'Update the status of a tracked task',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          issueNumber: 'number',
          status: 'string',
          comment: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.updateTaskStatus(agent, params.repo as string, params.issueNumber as number, params.status as string, params.comment as string)
        }
      },

      create_release: {
        name: 'create_release',
        description: 'Create a new release',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          tagName: 'string',
          name: 'string',
          body: 'string',
          draft: 'boolean',
          prerelease: 'boolean'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.createRelease(agent, params.repo as string, params.tagName as string, params.name as string, params.body as string, params.draft as boolean, params.prerelease as boolean)
        }
      }
    }
  }

  private async requestApproval(agent: Agent, repo: string, title: string, description: string, approvers: string[], priority?: string): Promise<ActionResult> {
    try {
      const priorityLabel = priority ? `priority:${priority}` : 'priority:medium'
      const issueBody = `**Approval Request from ${agent.name}**

${description}

**Approvers:** ${approvers.map(a => `@${a}`).join(', ')}
**Priority:** ${priority || 'Medium'}

---
**Instructions:**
- React with 👍 to approve
- React with 👎 to reject
- Comment with your feedback

**Required Approvals:** ${Math.ceil(approvers.length / 2)} out of ${approvers.length}`
      
      const issue = await this.extension.getOctokit().issues.create({
        owner: this.extension.getConfig().settings.owner,
        repo,
        title: `[APPROVAL] ${title}`,
        body: issueBody,
        labels: ['approval-request', priorityLabel],
        assignees: approvers
      })

      const approvalId = `${repo}-${issue.data.number}`
      this.extension.setApproval(approvalId, {
        agent: agent.id,
        repo,
        issueNumber: issue.data.number,
        approvers,
        priority: (priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        status: 'pending',
        createdAt: new Date()
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          approvalId, 
          issueNumber: issue.data.number,
          issueUrl: issue.data.html_url,
          approvers,
          priority: priority || 'medium'
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to request approval: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async trackTask(agent: Agent, repo: string, task: string, options?: {
    assignee?: string
    labels?: string[]
    priority?: string
    dueDate?: string
  }): Promise<ActionResult> {
    try {
      const labels = ['task-tracking']
      if (options?.priority) {
        labels.push(`priority:${options.priority}`)
      }
      if (options?.labels) {
        labels.push(...options.labels)
      }

      let taskBody = `Task tracked by ${agent.name}

**Description:** ${task}`

      if (options?.dueDate) {
        taskBody += `\n**Due Date:** ${options.dueDate}`
      }

      taskBody += `\n**Status:** 🔄 In Progress`

      const result = await this.extension.getOctokit().issues.create({
        owner: this.extension.getConfig().settings.owner,
        repo,
        title: `[TASK] ${task}`,
        body: taskBody,
        labels,
        assignee: options?.assignee
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          taskId: result.data.number, 
          url: result.data.html_url,
          assignee: options?.assignee,
          priority: options?.priority || 'medium',
          dueDate: options?.dueDate
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to track task: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async createMilestone(agent: Agent, repo: string, title: string, description: string, dueDate?: string): Promise<ActionResult> {
    try {
      const milestoneData: any = {
        owner: this.extension.getConfig().settings.owner,
        repo,
        title,
        description
      }

      if (dueDate) {
        milestoneData.due_on = new Date(dueDate).toISOString()
      }

      const result = await this.extension.getOctokit().issues.createMilestone(milestoneData)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          milestoneId: result.data.number,
          title: result.data.title,
          description: result.data.description,
          dueOn: result.data.due_on,
          url: result.data.html_url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create milestone: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async createProject(agent: Agent, repo: string, name: string, description: string): Promise<ActionResult> {
    try {
      // Note: Classic Projects API is deprecated, using Issues API instead
      // For full project management, consider using GraphQL API
      const result = await this.extension.getOctokit().issues.create({
        owner: this.extension.getConfig().settings.owner,
        repo,
        title: `[PROJECT] ${name}`,
        body: description || `Project created by ${agent.name}`,
        labels: ['project']
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          projectId: result.data.number,
          name: result.data.title,
          description: result.data.body,
          url: result.data.html_url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async addIssueToProject(agent: Agent, repo: string, issueNumber: number, projectId: number, columnId: number): Promise<ActionResult> {
    try {
      // Get the issue first
      const issue = await this.extension.getOctokit().issues.get({
        owner: this.extension.getConfig().settings.owner,
        repo,
        issue_number: issueNumber
      })

      // Note: Classic Projects API is deprecated, using labels instead
      // For full project management, consider using GraphQL API v2
      await this.extension.getOctokit().issues.addLabels({
        owner: this.extension.getConfig().settings.owner,
        repo,
        issue_number: issueNumber,
        labels: [`project-${projectId}`, `column-${columnId}`]
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          issueNumber,
          projectId,
          columnId,
          url: issue.data.html_url,
          message: 'Issue labeled with project information'
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to add issue to project: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async scheduleTask(agent: Agent, repo: string, task: string, scheduledDate: string, assignee?: string, reminderDays?: number): Promise<ActionResult> {
    try {
      const dueDate = new Date(scheduledDate)
      const labels = ['task-tracking', 'scheduled']

      let taskBody = `Scheduled task by ${agent.name}

**Description:** ${task}
**Scheduled Date:** ${dueDate.toDateString()}
**Status:** ⏳ Scheduled`

      if (reminderDays) {
        const reminderDate = new Date(dueDate)
        reminderDate.setDate(reminderDate.getDate() - reminderDays)
        taskBody += `\n**Reminder Date:** ${reminderDate.toDateString()}`
      }

      const result = await this.extension.getOctokit().issues.create({
        owner: this.extension.getConfig().settings.owner,
        repo,
        title: `[SCHEDULED] ${task}`,
        body: taskBody,
        labels,
        assignee
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { 
          taskId: result.data.number, 
          url: result.data.html_url,
          scheduledDate,
          assignee,
          reminderDays
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to schedule task: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async checkApprovalStatus(agent: Agent, repo: string, issueNumber: number): Promise<ActionResult> {
    try {
      const issue = await this.extension.getOctokit().issues.get({
        owner: this.extension.getConfig().settings.owner,
        repo,
        issue_number: issueNumber
      })

      // Get reactions to determine approval status
      const reactions = await this.extension.getOctokit().reactions.listForIssue({
        owner: this.extension.getConfig().settings.owner,
        repo,
        issue_number: issueNumber
      })

      const approvals = reactions.data.filter(r => r.content === '+1').length
      const rejections = reactions.data.filter(r => r.content === '-1').length
      
      let status = 'pending'
      if (approvals > rejections && approvals >= 1) {
        status = 'approved'
      } else if (rejections > 0) {
        status = 'rejected'
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          issueNumber,
          title: issue.data.title,
          status,
          approvals,
          rejections,
          state: issue.data.state,
          url: issue.data.html_url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to check approval status: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async updateTaskStatus(agent: Agent, repo: string, issueNumber: number, status: string, comment?: string): Promise<ActionResult> {
    try {
      const statusEmojis: Record<string, string> = {
        'todo': '📋',
        'in_progress': '🔄',
        'in_review': '👀',
        'done': '✅',
        'blocked': '🚫',
        'on_hold': '⏸️'
      }

      const emoji = statusEmojis[status] || '📋'
      const statusText = status.replace('_', ' ').toUpperCase()

      let updateComment = `**Status Update by ${agent.name}**

Status changed to: ${emoji} ${statusText}`

      if (comment) {
        updateComment += `\n\n**Note:** ${comment}`
      }

      // Add comment with status update
      await this.extension.getOctokit().issues.createComment({
        owner: this.extension.getConfig().settings.owner,
        repo,
        issue_number: issueNumber,
        body: updateComment
      })

      // Update labels
      const statusLabel = `status:${status}`
      await this.extension.getOctokit().issues.addLabels({
        owner: this.extension.getConfig().settings.owner,
        repo,
        issue_number: issueNumber,
        labels: [statusLabel]
      })

      // Close issue if status is done
      if (status === 'done') {
        await this.extension.getOctokit().issues.update({
          owner: this.extension.getConfig().settings.owner,
          repo,
          issue_number: issueNumber,
          state: 'closed',
          state_reason: 'completed'
        })
      }
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          issueNumber,
          status,
          statusEmoji: emoji,
          closed: status === 'done'
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to update task status: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async createRelease(agent: Agent, repo: string, tagName: string, name: string, body: string, draft: boolean = false, prerelease: boolean = false): Promise<ActionResult> {
    try {
      const result = await this.extension.getOctokit().repos.createRelease({
        owner: this.extension.getConfig().settings.owner,
        repo,
        tag_name: tagName,
        name,
        body,
        draft,
        prerelease
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          releaseId: result.data.id,
          tagName: result.data.tag_name,
          name: result.data.name,
          draft: result.data.draft,
          prerelease: result.data.prerelease,
          url: result.data.html_url,
          publishedAt: result.data.published_at
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create release: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
