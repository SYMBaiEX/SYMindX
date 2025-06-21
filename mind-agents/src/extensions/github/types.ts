/**
 * GitHub Extension Types
 * 
 * Type definitions for the GitHub extension including configurations,
 * data structures, and API interfaces.
 */

import { ExtensionConfig } from '../../types/common'

/**
 * GitHub extension configuration
 */
export interface GitHubConfig extends ExtensionConfig {
  settings: {
    /** GitHub personal access token */
    token?: string
    /** GitHub App ID for app-based authentication */
    appId?: string
    /** GitHub App private key for app-based authentication */
    privateKey?: string
    /** Webhook secret for validating webhooks */
    webhookSecret?: string
    /** Default repository owner/organization */
    owner: string
    /** Default repository name */
    defaultRepo?: string
    /** API base URL (for GitHub Enterprise) */
    baseUrl?: string
    /** Request timeout in milliseconds */
    timeout?: number
    /** User agent string for API requests */
    userAgent?: string
    /** Rate limiting configuration */
    rateLimit?: {
      enabled: boolean
      maxRequests: number
      windowMs: number
    }
  }
}

/**
 * GitHub issue data structure
 */
export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  locked: boolean
  user: GitHubUser
  assignee: GitHubUser | null
  assignees: GitHubUser[]
  labels: GitHubLabel[]
  milestone: GitHubMilestone | null
  comments: number
  created_at: string
  updated_at: string
  closed_at: string | null
  html_url: string
  repository_url: string
}

/**
 * GitHub user data structure
 */
export interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  gravatar_id: string | null
  url: string
  html_url: string
  type: 'User' | 'Bot' | 'Organization'
  site_admin: boolean
  name?: string | null
  company?: string | null
  blog?: string | null
  location?: string | null
  email?: string | null
  bio?: string | null
  public_repos?: number
  public_gists?: number
  followers?: number
  following?: number
  created_at?: string
  updated_at?: string
}

/**
 * GitHub organization data structure
 */
export interface GitHubOrganization {
  id: number
  login: string
  url: string
  repos_url: string
  events_url: string
  hooks_url: string
  issues_url: string
  members_url: string
  public_members_url: string
  avatar_url: string
  description: string | null
  name?: string | null
  company?: string | null
  blog?: string | null
  location?: string | null
  email?: string | null
  has_organization_projects: boolean
  has_repository_projects: boolean
  public_repos: number
  public_gists: number
  followers: number
  following: number
  html_url: string
  created_at: string
  updated_at: string
  type: 'Organization'
}

/**
 * GitHub label data structure
 */
export interface GitHubLabel {
  id: number
  url: string
  name: string
  description: string | null
  color: string
  default: boolean
}

/**
 * GitHub milestone data structure
 */
export interface GitHubMilestone {
  id: number
  number: number
  title: string
  description: string | null
  creator: GitHubUser
  open_issues: number
  closed_issues: number
  state: 'open' | 'closed'
  created_at: string
  updated_at: string
  due_on: string | null
  closed_at: string | null
  html_url: string
}

/**
 * GitHub repository data structure
 */
export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  owner: GitHubUser
  private: boolean
  html_url: string
  description: string | null
  fork: boolean
  url: string
  created_at: string
  updated_at: string
  pushed_at: string
  git_url: string
  ssh_url: string
  clone_url: string
  size: number
  stargazers_count: number
  watchers_count: number
  language: string | null
  has_issues: boolean
  has_projects: boolean
  has_wiki: boolean
  has_pages: boolean
  forks_count: number
  archived: boolean
  disabled: boolean
  open_issues_count: number
  license: GitHubLicense | null
  default_branch: string
  permissions?: {
    admin: boolean
    push: boolean
    pull: boolean
  }
}

/**
 * GitHub license data structure
 */
export interface GitHubLicense {
  key: string
  name: string
  spdx_id: string
  url: string | null
}

/**
 * GitHub branch data structure
 */
export interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
  protection?: {
    enabled: boolean
    required_status_checks: {
      enforcement_level: string
      contexts: string[]
    }
  }
}

/**
 * GitHub commit data structure
 */
export interface GitHubCommit {
  sha: string
  url: string
  html_url: string
  author: GitHubUser | null
  committer: GitHubUser | null
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
    message: string
    tree: {
      sha: string
      url: string
    }
    url: string
    comment_count: number
  }
  parents: Array<{
    sha: string
    url: string
    html_url: string
  }>
}

/**
 * GitHub file content data structure
 */
export interface GitHubFileContent {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  content?: string
  encoding?: 'base64' | 'utf-8'
  target?: string
}

/**
 * GitHub release data structure
 */
export interface GitHubRelease {
  id: number
  tag_name: string
  target_commitish: string
  name: string | null
  body: string | null
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string | null
  author: GitHubUser
  assets: GitHubReleaseAsset[]
  tarball_url: string
  zipball_url: string
  html_url: string
}

/**
 * GitHub release asset data structure
 */
export interface GitHubReleaseAsset {
  id: number
  name: string
  label: string | null
  content_type: string
  state: 'uploaded' | 'open'
  size: number
  download_count: number
  created_at: string
  updated_at: string
  browser_download_url: string
  uploader: GitHubUser
}

/**
 * GitHub comment data structure
 */
export interface GitHubComment {
  id: number
  url: string
  html_url: string
  body: string
  user: GitHubUser
  created_at: string
  updated_at: string
  author_association: 'COLLABORATOR' | 'CONTRIBUTOR' | 'FIRST_TIME_CONTRIBUTOR' | 'FIRST_TIMER' | 'MANNEQUIN' | 'MEMBER' | 'NONE' | 'OWNER'
}

/**
 * GitHub webhook event data structure
 */
export interface GitHubWebhookEvent {
  action: string
  sender: GitHubUser
  repository: GitHubRepository
  organization?: GitHubOrganization
  installation?: {
    id: number
    account: GitHubUser
  }
}

/**
 * GitHub issue webhook event
 */
export interface GitHubIssueEvent extends GitHubWebhookEvent {
  action: 'opened' | 'edited' | 'closed' | 'reopened' | 'assigned' | 'unassigned' | 'labeled' | 'unlabeled'
  issue: GitHubIssue
  assignee?: GitHubUser
  label?: GitHubLabel
}

/**
 * GitHub pull request webhook event
 */
export interface GitHubPullRequestEvent extends GitHubWebhookEvent {
  action: 'opened' | 'edited' | 'closed' | 'reopened' | 'assigned' | 'unassigned' | 'review_requested' | 'review_request_removed' | 'labeled' | 'unlabeled' | 'synchronize'
  number: number
  pull_request: GitHubPullRequest
}

/**
 * GitHub pull request data structure
 */
export interface GitHubPullRequest {
  id: number
  number: number
  state: 'open' | 'closed'
  locked: boolean
  title: string
  body: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  assignee: GitHubUser | null
  assignees: GitHubUser[]
  requested_reviewers: GitHubUser[]
  labels: GitHubLabel[]
  milestone: GitHubMilestone | null
  head: {
    label: string
    ref: string
    sha: string
    user: GitHubUser
    repo: GitHubRepository
  }
  base: {
    label: string
    ref: string
    sha: string
    user: GitHubUser
    repo: GitHubRepository
  }
  user: GitHubUser
  merge_commit_sha: string | null
  mergeable: boolean | null
  mergeable_state: string
  merged_by: GitHubUser | null
  comments: number
  review_comments: number
  commits: number
  additions: number
  deletions: number
  changed_files: number
  html_url: string
}

/**
 * GitHub push webhook event
 */
export interface GitHubPushEvent extends GitHubWebhookEvent {
  ref: string
  before: string
  after: string
  created: boolean
  deleted: boolean
  forced: boolean
  head_commit: GitHubCommit | null
  compare: string
  commits: GitHubCommit[]
  pusher: {
    name: string
    email: string
  }
}

/**
 * Approval request data structure
 */
export interface GitHubApprovalRequest {
  agent: string
  repo: string
  issueNumber: number
  approvers: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt: Date
  expiresAt?: Date
  requiredApprovals?: number
  currentApprovals?: number
  currentRejections?: number
}

/**
 * Task tracking data structure
 */
export interface GitHubTask {
  issueNumber: number
  repo: string
  title: string
  description: string
  assignee?: string
  labels: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked' | 'on_hold'
  dueDate?: Date
  scheduledDate?: Date
  reminderDays?: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * GitHub API error structure
 */
export interface GitHubAPIError {
  message: string
  errors?: Array<{
    resource: string
    field: string
    code: string
    message?: string
  }>
  documentation_url?: string
}

/**
 * GitHub rate limit information
 */
export interface GitHubRateLimit {
  limit: number
  remaining: number
  reset: number
  used: number
  resource: string
}

/**
 * GitHub search result structure
 */
export interface GitHubSearchResult<T> {
  total_count: number
  incomplete_results: boolean
  items: T[]
}

/**
 * GitHub repository statistics
 */
export interface GitHubRepositoryStats {
  repository: GitHubRepository
  statistics: {
    commits: number
    branches: number
    releases: number
    contributors: number
    issues: {
      open: number
      closed: number
      total: number
    }
    pullRequests: {
      open: number
      closed: number
      merged: number
      total: number
    }
    languages: Record<string, number>
    activity: {
      lastCommit: string
      lastIssue: string
      lastPullRequest: string
    }
  }
}

/**
 * GitHub extension action result types
 */
export type GitHubActionResult = 
  | { success: true; data: any; message?: string }
  | { success: false; error: string; code?: string }

/**
 * GitHub skill parameter validation
 */
export interface GitHubSkillValidation {
  required: string[]
  optional: string[]
  types: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>
}

/**
 * GitHub extension metrics
 */
export interface GitHubExtensionMetrics {
  apiCallsCount: number
  rateLimitRemaining: number
  rateLimitReset: Date
  successfulActions: number
  failedActions: number
  activeApprovals: number
  trackedTasks: number
  lastActivityAt: Date
  averageResponseTime: number
}
