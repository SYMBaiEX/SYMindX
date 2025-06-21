/**
 * GitHub Extension Skills
 * 
 * This module exports all the skills available in the GitHub extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

import { IssueManagementSkill } from './issue-management'
import { RepositoryManagementSkill } from './repository-management'
import { UserManagementSkill } from './user-management'
import { FileManagementSkill } from './file-management'
import { WorkflowSkill } from './workflow'
import { GitHubExtension } from '../index'

export {
  IssueManagementSkill,
  RepositoryManagementSkill,
  UserManagementSkill,
  FileManagementSkill,
  WorkflowSkill
}

/**
 * Initialize all skills with the GitHub extension instance
 */
export function initializeSkills(extension: GitHubExtension) {
  return {
    issueManagement: new IssueManagementSkill(extension),
    repositoryManagement: new RepositoryManagementSkill(extension),
    userManagement: new UserManagementSkill(extension),
    fileManagement: new FileManagementSkill(extension),
    workflow: new WorkflowSkill(extension)
  }
}
