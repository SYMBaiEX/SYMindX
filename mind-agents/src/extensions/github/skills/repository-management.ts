/**
 * Repository Management Skill for GitHub Extension
 * 
 * Provides actions related to managing GitHub repositories, branches, and commits.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent'
import { SkillParameters } from '../../../types/common'
import { GitHubExtension } from '../index'
import { GitHubRepository, GitHubBranch, GitHubCommit, GitHubRepositoryStats } from '../types'

export class RepositoryManagementSkill {
  private extension: GitHubExtension

  constructor(extension: GitHubExtension) {
    this.extension = extension
  }

  /**
   * Get all repository management related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_repo_info: {
        name: 'get_repo_info',
        description: 'Get information about a GitHub repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getRepoInfo(agent, params.repo as string)
        }
      },

      list_branches: {
        name: 'list_branches',
        description: 'List all branches in a repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.listBranches(agent, params.repo as string)
        }
      },

      create_branch: {
        name: 'create_branch',
        description: 'Create a new branch in the repository',
        category: ActionCategory.SYSTEM,
        parameters: {
          repo: 'string',
          branchName: 'string',
          fromBranch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.createBranch(agent, params.repo as string, params.branchName as string, params.fromBranch as string)
        }
      },

      get_commits: {
        name: 'get_commits',
        description: 'Get recent commits from a repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          branch: 'string',
          limit: 'number'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getCommits(agent, params.repo as string, params.branch as string, params.limit as number)
        }
      },

      get_content: {
        name: 'get_content',
        description: 'Get content of a file or directory from the repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          path: 'string',
          branch: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getContent(agent, params.repo as string, params.path as string, params.branch as string)
        }
      },

      search_code: {
        name: 'search_code',
        description: 'Search for code in the repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string',
          query: 'string',
          language: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.searchCode(agent, params.repo as string, params.query as string, params.language as string)
        }
      },

      get_languages: {
        name: 'get_languages',
        description: 'Get programming languages used in the repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getLanguages(agent, params.repo as string)
        }
      },

      get_contributors: {
        name: 'get_contributors',
        description: 'Get list of contributors to the repository',
        category: ActionCategory.OBSERVATION,
        parameters: {
          repo: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getContributors(agent, params.repo as string)
        }
      }
    }
  }

  private async getRepoInfo(agent: Agent, repo: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.get({
        owner: this.extension.config.settings.owner,
        repo
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          name: result.data.name,
          fullName: result.data.full_name,
          description: result.data.description,
          private: result.data.private,
          language: result.data.language,
          stars: result.data.stargazers_count,
          forks: result.data.forks_count,
          openIssues: result.data.open_issues_count,
          defaultBranch: result.data.default_branch,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          url: result.data.html_url,
          cloneUrl: result.data.clone_url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get repository info: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async listBranches(agent: Agent, repo: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.listBranches({
        owner: this.extension.config.settings.owner,
        repo,
        per_page: 100
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          branches: result.data.map(branch => ({
            name: branch.name,
            protected: branch.protected,
            commit: {
              sha: branch.commit.sha,
              url: branch.commit.url
            }
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list branches: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async createBranch(agent: Agent, repo: string, branchName: string, fromBranch: string = 'main'): Promise<ActionResult> {
    try {
      // Get the SHA of the source branch
      const sourceRef = await this.extension['octokit'].git.getRef({
        owner: this.extension.config.settings.owner,
        repo,
        ref: `heads/${fromBranch}`
      })

      // Create the new branch
      const result = await this.extension['octokit'].git.createRef({
        owner: this.extension.config.settings.owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: sourceRef.data.object.sha
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          branchName,
          sha: result.data.object.sha,
          url: result.data.url
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getCommits(agent: Agent, repo: string, branch: string = 'main', limit: number = 10): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.listCommits({
        owner: this.extension.config.settings.owner,
        repo,
        sha: branch,
        per_page: Math.min(limit, 100)
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          commits: result.data.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
              name: commit.commit.author?.name,
              email: commit.commit.author?.email,
              date: commit.commit.author?.date
            },
            committer: {
              name: commit.commit.committer?.name,
              email: commit.commit.committer?.email,
              date: commit.commit.committer?.date
            },
            url: commit.html_url
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get commits: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getContent(agent: Agent, repo: string, path: string, branch?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.getContent({
        owner: this.extension.config.settings.owner,
        repo,
        path,
        ref: branch
      })
      
      if (Array.isArray(result.data)) {
        // Directory listing
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            type: 'directory',
            contents: result.data.map(item => ({
              name: item.name,
              path: item.path,
              type: item.type,
              size: item.size,
              url: item.html_url
            }))
          }
        }
      } else {
        // File content
        const content = result.data.type === 'file' && result.data.content 
          ? Buffer.from(result.data.content, 'base64').toString('utf-8')
          : null

        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            type: 'file',
            name: result.data.name,
            path: result.data.path,
            size: result.data.size,
            content,
            sha: result.data.sha,
            url: result.data.html_url
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get content: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async searchCode(agent: Agent, repo: string, query: string, language?: string): Promise<ActionResult> {
    try {
      let searchQuery = `${query} repo:${this.extension.config.settings.owner}/${repo}`
      if (language) {
        searchQuery += ` language:${language}`
      }

      const result = await this.extension['octokit'].search.code({
        q: searchQuery,
        per_page: 30
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          totalCount: result.data.total_count,
          items: result.data.items.map(item => ({
            name: item.name,
            path: item.path,
            sha: item.sha,
            url: item.html_url,
            repository: item.repository.full_name
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to search code: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getLanguages(agent: Agent, repo: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.listLanguages({
        owner: this.extension.config.settings.owner,
        repo
      })
      
      const total = Object.values(result.data).reduce((sum: number, bytes: any) => sum + bytes, 0)
      const languages = Object.entries(result.data).map(([language, bytes]) => ({
        language,
        bytes: bytes as number,
        percentage: ((bytes as number / total) * 100).toFixed(2)
      }))
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          languages,
          totalBytes: total
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get languages: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getContributors(agent: Agent, repo: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.listContributors({
        owner: this.extension.config.settings.owner,
        repo,
        per_page: 100
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          contributors: result.data.map(contributor => ({
            login: contributor.login,
            contributions: contributor.contributions,
            avatarUrl: contributor.avatar_url,
            url: contributor.html_url,
            type: contributor.type
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get contributors: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
