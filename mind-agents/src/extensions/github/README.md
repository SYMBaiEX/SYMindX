# GitHub Extension for SYMindX

The GitHub Extension provides comprehensive integration with GitHub's API, enabling agents to interact with repositories, issues, pull requests, users, and more through a structured skills-based architecture.

## Features

### 🔧 **Issue Management**
- Create, read, update, and close issues
- Add comments and manage labels
- Assign and unassign users to issues
- List and filter issues by various criteria

### 📂 **Repository Management**
- Get repository information and statistics
- List and manage branches
- Access commit history and details
- List contributors and collaborators

### 👥 **User Management**
- Retrieve user and organization information
- Follow/unfollow users
- List user repositories and organizations
- Check following relationships

### 📁 **File Management**
- Read, create, update, and delete files
- List directory contents
- Move and upload files
- Handle binary and text content

### 🔄 **Workflow Management**
- Request approvals via GitHub issues
- Track tasks with automatic labeling
- Create milestones and project tracking
- Schedule tasks with reminders
- Update task status with visual indicators
- Create releases with proper versioning

## Configuration

```typescript
interface GitHubConfig {
  settings: {
    // Authentication (choose one)
    token?: string              // Personal Access Token
    appId?: string             // GitHub App ID
    privateKey?: string        // GitHub App Private Key
    
    // Basic Settings
    owner: string              // Repository owner/organization
    defaultRepo?: string       // Default repository name
    baseUrl?: string           // API base URL (for GitHub Enterprise)
    
    // Optional Settings
    webhookSecret?: string     // Webhook validation secret
    timeout?: number           // Request timeout in milliseconds
    userAgent?: string         // Custom user agent
    
    // Rate Limiting
    rateLimit?: {
      enabled: boolean
      maxRequests: number
      windowMs: number
    }
  }
}
```

## Usage Examples

### Creating an Issue
```typescript
const result = await agent.executeAction('create_issue', {
  repo: 'my-repository',
  title: 'Bug Report: Login fails',
  body: 'Users cannot log in with valid credentials',
  labels: ['bug', 'high-priority']
})
```

### Requesting Approval
```typescript
const result = await agent.executeAction('request_approval', {
  repo: 'my-repository',
  title: 'Deploy to Production',
  description: 'Ready to deploy version 2.1.0 to production environment',
  approvers: ['john-doe', 'jane-smith'],
  priority: 'high'
})
```

### Tracking a Task
```typescript
const result = await agent.executeAction('track_task', {
  repo: 'my-repository',
  task: 'Implement user authentication',
  assignee: 'developer-username',
  labels: ['feature', 'backend'],
  priority: 'medium',
  dueDate: '2025-01-15'
})
```

### Managing Files
```typescript
// Create a new file
const result = await agent.executeAction('create_file', {
  repo: 'my-repository',
  path: 'src/components/NewComponent.tsx',
  content: 'export const NewComponent = () => { return <div>Hello</div> }',
  message: 'Add new React component'
})

// Update task status
await agent.executeAction('update_task_status', {
  repo: 'my-repository',
  issueNumber: 123,
  status: 'in_review',
  comment: 'Code review completed, ready for testing'
})
```

## Skills Architecture

The GitHub extension is organized into specialized skills:

### 📋 **IssueManagementSkill**
- `create_issue` - Create new issues
- `get_issue` - Retrieve issue details
- `update_issue` - Modify existing issues
- `close_issue` - Close issues
- `reopen_issue` - Reopen closed issues
- `add_comment` - Add comments to issues
- `list_comments` - List issue comments
- `add_labels` - Add labels to issues
- `remove_labels` - Remove labels from issues
- `assign_issue` - Assign users to issues
- `unassign_issue` - Remove assignees from issues
- `list_issues` - List and filter issues

### 🏛️ **RepositoryManagementSkill**
- `get_repository` - Get repository information
- `list_branches` - List repository branches
- `get_branch` - Get specific branch details
- `create_branch` - Create new branches
- `list_commits` - List commit history
- `get_commit` - Get specific commit details
- `list_contributors` - List repository contributors
- `get_repository_stats` - Get repository statistics

### 👤 **UserManagementSkill**
- `get_user` - Get user information
- `get_organization` - Get organization details
- `follow_user` - Follow a user
- `unfollow_user` - Unfollow a user
- `list_user_repositories` - List user's repositories
- `list_user_organizations` - List user's organizations
- `check_following` - Check if following a user

### 📄 **FileManagementSkill**
- `get_file` - Read file contents
- `create_file` - Create new files
- `update_file` - Update existing files
- `delete_file` - Delete files
- `list_directory` - List directory contents
- `move_file` - Move/rename files
- `upload_file` - Upload binary files

### ⚡ **WorkflowSkill**
- `request_approval` - Request approval via issues
- `track_task` - Track tasks as issues
- `create_milestone` - Create project milestones
- `create_project` - Create project boards (using labels)
- `add_issue_to_project` - Add issues to projects
- `schedule_task` - Schedule tasks with reminders
- `check_approval_status` - Check approval status
- `update_task_status` - Update task status with emojis
- `create_release` - Create new releases

## Authentication

### Personal Access Token
```typescript
{
  settings: {
    token: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    owner: 'my-organization'
  }
}
```

### GitHub App
```typescript
{
  settings: {
    appId: '123456',
    privateKey: '-----BEGIN RSA PRIVATE KEY-----\n...',
    owner: 'my-organization'
  }
}
```

## Event Handling

The extension supports GitHub webhook events:

- `issue_comment` - Issue comment events
- `pull_request` - Pull request events  
- `push` - Push events

## Error Handling

All actions return standardized `ActionResult` objects:

```typescript
interface ActionResult {
  success: boolean
  type: ActionResultType
  result?: any
  error?: string
}
```

## Rate Limiting

The extension respects GitHub's rate limits and provides configurable rate limiting:

```typescript
rateLimit: {
  enabled: true,
  maxRequests: 5000,  // Requests per hour
  windowMs: 3600000   // 1 hour in milliseconds
}
```

## Best Practices

1. **Use specific repository names** in actions to avoid confusion
2. **Include meaningful descriptions** in issues and tasks
3. **Use appropriate labels** for better organization
4. **Set realistic due dates** for scheduled tasks
5. **Provide clear approval criteria** in approval requests
6. **Use status updates** to keep track of task progress

## Dependencies

- `@octokit/rest` - GitHub REST API client
- `@octokit/auth-app` - GitHub App authentication

## Type Safety

The extension includes comprehensive TypeScript types for all GitHub API responses and configuration options, ensuring type safety throughout the codebase.
