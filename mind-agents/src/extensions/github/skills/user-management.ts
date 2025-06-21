/**
 * User Management Skill for GitHub Extension
 * 
 * Provides actions related to managing GitHub users, organizations, and teams.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent'
import { SkillParameters } from '../../../types/common'
import { GitHubExtension } from '../index'
import { GitHubUser, GitHubOrganization, GitHubRepository } from '../types'

export class UserManagementSkill {
  private extension: GitHubExtension

  constructor(extension: GitHubExtension) {
    this.extension = extension
  }

  /**
   * Get all user management related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_user: {
        name: 'get_user',
        description: 'Get information about a GitHub user',
        category: ActionCategory.OBSERVATION,
        parameters: {
          username: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getUser(agent, params.username as string)
        }
      },

      get_current_user: {
        name: 'get_current_user',
        description: 'Get information about the authenticated user',
        category: ActionCategory.OBSERVATION,
        parameters: {},
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getCurrentUser(agent)
        }
      },

      list_user_repos: {
        name: 'list_user_repos',
        description: 'List repositories for a user',
        category: ActionCategory.OBSERVATION,
        parameters: {
          username: 'string',
          type: 'string',
          sort: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.listUserRepos(agent, params.username as string, {
            type: params.type as string,
            sort: params.sort as string
          })
        }
      },

      follow_user: {
        name: 'follow_user',
        description: 'Follow a GitHub user',
        category: ActionCategory.SOCIAL,
        parameters: {
          username: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.followUser(agent, params.username as string)
        }
      },

      unfollow_user: {
        name: 'unfollow_user',
        description: 'Unfollow a GitHub user',
        category: ActionCategory.SOCIAL,
        parameters: {
          username: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.unfollowUser(agent, params.username as string)
        }
      },

      check_following: {
        name: 'check_following',
        description: 'Check if the authenticated user is following another user',
        category: ActionCategory.OBSERVATION,
        parameters: {
          username: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.checkFollowing(agent, params.username as string)
        }
      },

      list_followers: {
        name: 'list_followers',
        description: 'List followers of a user',
        category: ActionCategory.OBSERVATION,
        parameters: {
          username: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.listFollowers(agent, params.username as string)
        }
      },

      list_following: {
        name: 'list_following',
        description: 'List users that a user is following',
        category: ActionCategory.OBSERVATION,
        parameters: {
          username: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.listFollowing(agent, params.username as string)
        }
      },

      get_org: {
        name: 'get_org',
        description: 'Get information about an organization',
        category: ActionCategory.OBSERVATION,
        parameters: {
          org: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.getOrganization(agent, params.org as string)
        }
      },

      list_org_members: {
        name: 'list_org_members',
        description: 'List members of an organization',
        category: ActionCategory.OBSERVATION,
        parameters: {
          org: 'string',
          role: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.listOrgMembers(agent, params.org as string, params.role as string)
        }
      }
    }
  }

  private async getUser(agent: Agent, username: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].users.getByUsername({
        username
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          login: result.data.login,
          id: result.data.id,
          name: result.data.name,
          company: result.data.company,
          blog: result.data.blog,
          location: result.data.location,
          email: result.data.email,
          bio: result.data.bio,
          publicRepos: result.data.public_repos,
          publicGists: result.data.public_gists,
          followers: result.data.followers,
          following: result.data.following,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          avatarUrl: result.data.avatar_url,
          url: result.data.html_url,
          type: result.data.type
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get user: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getCurrentUser(agent: Agent): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].users.getAuthenticated()
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          login: result.data.login,
          id: result.data.id,
          name: result.data.name,
          company: result.data.company,
          blog: result.data.blog,
          location: result.data.location,
          email: result.data.email,
          bio: result.data.bio,
          publicRepos: result.data.public_repos,
          publicGists: result.data.public_gists,
          followers: result.data.followers,
          following: result.data.following,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          avatarUrl: result.data.avatar_url,
          url: result.data.html_url,
          type: result.data.type
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get current user: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async listUserRepos(agent: Agent, username: string, options?: {
    type?: string
    sort?: string
  }): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].repos.listForUser({
        username,
        type: (options?.type as 'all' | 'owner' | 'member') || 'owner',
        sort: (options?.sort as 'created' | 'updated' | 'pushed' | 'full_name') || 'updated',
        per_page: 50
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          repos: result.data.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            openIssues: repo.open_issues_count,
            defaultBranch: repo.default_branch,
            createdAt: repo.created_at,
            updatedAt: repo.updated_at,
            pushedAt: repo.pushed_at,
            url: repo.html_url
          })),
          totalCount: result.data.length
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list user repositories: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async followUser(agent: Agent, username: string): Promise<ActionResult> {
    try {
      await this.extension['octokit'].users.follow({
        username
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Successfully followed ${username}`,
          username
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to follow user: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async unfollowUser(agent: Agent, username: string): Promise<ActionResult> {
    try {
      await this.extension['octokit'].users.unfollow({
        username
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          message: `Successfully unfollowed ${username}`,
          username
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to unfollow user: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async checkFollowing(agent: Agent, username: string): Promise<ActionResult> {
    try {
      await this.extension['octokit'].users.checkPersonIsFollowedByAuthenticated({
        username
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          following: true,
          username
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: {
            following: false,
            username
          }
        }
      }
      
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to check following status: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async listFollowers(agent: Agent, username: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].users.listFollowersForUser({
        username,
        per_page: 100
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          followers: result.data.map(user => ({
            login: user.login,
            id: user.id,
            avatarUrl: user.avatar_url,
            url: user.html_url,
            type: user.type
          })),
          totalCount: result.data.length
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list followers: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async listFollowing(agent: Agent, username: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].users.listFollowingForUser({
        username,
        per_page: 100
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          following: result.data.map(user => ({
            login: user.login,
            id: user.id,
            avatarUrl: user.avatar_url,
            url: user.html_url,
            type: user.type
          })),
          totalCount: result.data.length
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list following: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async getOrganization(agent: Agent, org: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].orgs.get({
        org
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          login: result.data.login,
          id: result.data.id,
          name: result.data.name,
          company: result.data.company,
          blog: result.data.blog,
          location: result.data.location,
          email: result.data.email,
          description: result.data.description,
          publicRepos: result.data.public_repos,
          publicGists: result.data.public_gists,
          followers: result.data.followers,
          following: result.data.following,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          avatarUrl: result.data.avatar_url,
          url: result.data.html_url,
          type: result.data.type
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get organization: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  private async listOrgMembers(agent: Agent, org: string, role?: string): Promise<ActionResult> {
    try {
      const result = await this.extension['octokit'].orgs.listMembers({
        org,
        role: (role as 'all' | 'admin' | 'member') || 'all',
        per_page: 100
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          members: result.data.map(member => ({
            login: member.login,
            id: member.id,
            avatarUrl: member.avatar_url,
            url: member.html_url,
            type: member.type
          })),
          totalCount: result.data.length
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list organization members: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
