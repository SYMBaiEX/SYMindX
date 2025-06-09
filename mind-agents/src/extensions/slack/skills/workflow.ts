/**
 * Workflow Skill for Slack Extension
 * 
 * Provides actions related to workflows, approvals, and status updates in Slack.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent.js'
import { SlackExtension } from '../index.js'

export class WorkflowSkill {
  private extension: SlackExtension

  constructor(extension: SlackExtension) {
    this.extension = extension
  }

  /**
   * Get all workflow-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      request_approval: {
        name: 'request_approval',
        description: 'Request approval for an action from users',
        category: ActionCategory.COMMUNICATION,
        parameters: { action: 'object', channel: 'string', timeout: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.requestApproval(agent, params.action, params.channel, params.timeout)
        }
      },
      
      send_status: {
        name: 'send_status',
        description: 'Send agent status update',
        category: ActionCategory.COMMUNICATION,
        parameters: { channel: 'string', includeStats: 'boolean' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendAgentStatus(agent, params.channel, params.includeStats)
        }
      },
      
      create_poll: {
        name: 'create_poll',
        description: 'Create a poll for users to vote on',
        category: ActionCategory.SOCIAL,
        parameters: { channel: 'string', question: 'string', options: 'array', anonymous: 'boolean' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.createPoll(params.channel, params.question, params.options, params.anonymous)
        }
      },
      
      create_reminder: {
        name: 'create_reminder',
        description: 'Create a reminder in Slack',
        category: ActionCategory.SYSTEM,
        parameters: { text: 'string', time: 'string', user: 'string', channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.createReminder(params.text, params.time, params.user, params.channel)
        }
      },
      
      list_reminders: {
        name: 'list_reminders',
        description: 'List all reminders',
        category: ActionCategory.OBSERVATION,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.listReminders()
        }
      },
      
      delete_reminder: {
        name: 'delete_reminder',
        description: 'Delete a reminder',
        category: ActionCategory.SYSTEM,
        parameters: { reminder: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.deleteReminder(params.reminder)
        }
      },
      
      create_workflow: {
        name: 'create_workflow',
        description: 'Create a simple workflow',
        category: ActionCategory.SYSTEM,
        parameters: { name: 'string', steps: 'array', channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.createWorkflow(params.name, params.steps, params.channel)
        }
      },
      
      track_task: {
        name: 'track_task',
        description: 'Track a task or action item',
        category: ActionCategory.SYSTEM,
        parameters: { task: 'string', assignee: 'string', due_date: 'string', channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.trackTask(params.task, params.assignee, params.due_date, params.channel)
        }
      }
    }
  }

  /**
   * Request approval for an action from users
   */
  async requestApproval(agent: Agent, action: any, channel: string, timeout?: number): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.requestApproval(agent, action, channel, timeout)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to request approval: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Send agent status update
   */
  async sendAgentStatus(agent: Agent, channel: string, includeStats: boolean = false): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.sendAgentStatus(agent, channel, includeStats)
    } catch (error) {
      return {
        success: false,
        error: `Failed to send status: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Create a poll for users to vote on
   */
  async createPoll(channel: string, question: string, options: string[], anonymous: boolean = false): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.createPoll(channel, question, options, anonymous)
    } catch (error) {
      return {
        success: false,
        error: `Failed to create poll: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Create a reminder in Slack
   */
  async createReminder(text: string, time: string, user?: string, channel?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.createReminder(text, time, user, channel)
    } catch (error) {
      return {
        success: false,
        error: `Failed to create reminder: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * List all reminders
   */
  async listReminders(): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.listReminders()
    } catch (error) {
      return {
        success: false,
        error: `Failed to list reminders: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminder: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.deleteReminder(reminder)
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete reminder: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Create a simple workflow
   */
  async createWorkflow(name: string, steps: any[], channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.createWorkflow(name, steps, channel)
    } catch (error) {
      return {
        success: false,
        error: `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Track a task or action item
   */
  async trackTask(task: string, assignee: string, dueDate: string, channel: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.trackTask(task, assignee, dueDate, channel)
    } catch (error) {
      return {
        success: false,
        error: `Failed to track task: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}