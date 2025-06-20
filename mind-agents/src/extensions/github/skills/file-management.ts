/**
 * File Management Skill for GitHub Extension
 * 
 * Provides actions related to managing files in GitHub repositories.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent'
import { SkillParameters } from '../../../types/common'
import { GitHubExtension } from '../index'
import { GitHubFileContent } from '../types'

export class FileManagementSkill {
  private extension: GitHubExtension

  constructor(extension: GitHubExtension) {
    this.extension = extension
  }

  /**
   * Get all file management related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      create_file: {
        name: 'create_file',
        description: 'Create a new file in the repository',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          path: 'string',
          content: 'string',
          message: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.createFile(agent, params.repo as string, params.path as string, params.content as string, params.message as string, params.branch as string)
        }
      },

      update_file: {
        name: 'update_file',
        description: 'Update an existing file in the repository',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          path: 'string',
          content: 'string',
          message: 'string',
          sha: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.updateFile(agent, params.repo as string, params.path as string, params.content as string, params.message as string, params.sha as string, params.branch as string)
        }
      },

      delete_file: {
        name: 'delete_file',
        description: 'Delete a file from the repository',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          path: 'string',
          message: 'string',
          sha: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.deleteFile(agent, params.repo as string, params.path as string, params.message as string, params.sha as string, params.branch as string)
        }
      },

      read_file: {
        name: 'read_file',
        description: 'Read content of a file from the repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          path: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.readFile(agent, params.repo as string, params.path as string, params.branch as string)
        }
      },

      list_directory: {
        name: 'list_directory',
        description: 'List contents of a directory in the repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          path: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.listDirectory(agent, params.repo as string, params.path as string, params.branch as string)
        }
      },

      get_file_info: {
        name: 'get_file_info',
        description: 'Get information about a file without reading its content',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          path: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getFileInfo(agent, params.repo as string, params.path as string, params.branch as string)
        }
      },

      upload_file: {
        name: 'upload_file',
        description: 'Upload a binary file to the repository',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          path: 'string',
          fileData: 'string',
          message: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.uploadFile(agent, params.repo as string, params.path as string, params.fileData as string, params.message as string, params.branch as string)
        }
      },

      move_file: {
        name: 'move_file',
        description: 'Move/rename a file in the repository',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          oldPath: 'string',
          newPath: 'string',
          message: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.moveFile(agent, params.repo as string, params.oldPath as string, params.newPath as string, params.message as string, params.branch as string)
        }
      }
    }
  }

  private async createFile(agent: Agent, repo: string, path: string, content: string, message: string, branch?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.createOrUpdateFileContents({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          path,
          sha: result.data.content?.sha,
          size: result.data.content?.size,
          url: result.data.content?.html_url,
          commit: {
            sha: result.data.commit.sha,
            url: result.data.commit.html_url
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async updateFile(agent: Agent, repo: string, path: string, content: string, message: string, sha: string, branch?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.createOrUpdateFileContents({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          path,
          sha: result.data.content?.sha,
          size: result.data.content?.size,
          url: result.data.content?.html_url,
          commit: {
            sha: result.data.commit.sha,
            url: result.data.commit.html_url
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to update file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async deleteFile(agent: Agent, repo: string, path: string, message: string, sha: string, branch?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.deleteFile({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        message,
        sha,
        branch
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          path,
          commit: {
            sha: result.data.commit.sha,
            url: result.data.commit.html_url
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async readFile(agent: Agent, repo: string, path: string, branch?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.getContent({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        ref: branch
      })
      
      if (Array.isArray(result.data)) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Path is a directory, not a file'
        }
      }

      const content = result.data.type === 'file' && result.data.content
        ? Buffer.from(result.data.content, 'base64').toString('utf-8')
        : null

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          name: result.data.name,
          path: result.data.path,
          content,
          size: result.data.size,
          sha: result.data.sha,
          url: result.data.html_url,
          downloadUrl: result.data.download_url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async listDirectory(agent: Agent, repo: string, path: string = '', branch?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.getContent({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        ref: branch
      })
      
      if (!Array.isArray(result.data)) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Path is a file, not a directory'
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          path,
          contents: result.data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            sha: item.sha,
            url: item.html_url,
            downloadUrl: item.download_url
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getFileInfo(agent: Agent, repo: string, path: string, branch?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.getContent({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        ref: branch
      })
      
      if (Array.isArray(result.data)) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Path is a directory, not a file'
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          name: result.data.name,
          path: result.data.path,
          type: result.data.type,
          size: result.data.size,
          sha: result.data.sha,
          url: result.data.html_url,
          downloadUrl: result.data.download_url,
          encoding: result.data.type === 'file' ? (result.data as any).encoding : undefined
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get file info: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async uploadFile(agent: Agent, repo: string, path: string, fileData: string, message: string, branch?: string): Promise<ActionResult> {
    try {
      // Assume fileData is base64 encoded already for binary files
      const result = await this.extension['octokit'].repos.createOrUpdateFileContents({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        message,
        content: fileData,
        branch
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          path,
          sha: result.data.content?.sha,
          size: result.data.content?.size,
          url: result.data.content?.html_url,
          commit: {
            sha: result.data.commit.sha,
            url: result.data.commit.html_url
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async moveFile(agent: Agent, repo: string, oldPath: string, newPath: string, message: string, branch?: string): Promise<ActionResult> {
    try {
      // First, get the current file content
      const getResult = await this.extension['octokit'].repos.getContent({
        owner: this.extension.config.settings.owner,
        repo,
        path: oldPath,
        ref: branch
      })

      if (Array.isArray(getResult.data)) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Cannot move a directory'
        }
      }

      const fileContent = getResult.data.type === 'file' ? (getResult.data as any).content || '' : ''
      
      // Create the file at the new location
      const createResult = await this.extension['octokit'].repos.createOrUpdateFileContents({
        owner: this.extension.config.settings.owner,
        repo,
        path: newPath,
        message,
        content: fileContent,
        branch
      })

      // Delete the file from the old location
      await this.extension['octokit'].repos.deleteFile({
        owner: this.extension.config.settings.owner,
        repo,
        path: oldPath,
        message: `Move ${oldPath} to ${newPath}`,
        sha: getResult.data.sha,
        branch
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          oldPath,
          newPath,
          sha: createResult.data.content?.sha,
          url: createResult.data.content?.html_url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to move file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
