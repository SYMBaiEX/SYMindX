/**
 * Slack Extension Skills
 *
 * This module exports all the skills available in the Slack extension.
 * Each skill represents a group of related actions that the agent can perform
 * in Slack workspaces.
 *
 * Available Skills:
 * - MessagingSkill: Core messaging functionality
 * - ChannelManagementSkill: Channel operations and management
 * - ThreadManagementSkill: Thread operations and tracking
 * - ReactionManagementSkill: Emoji reactions and interaction
 * - WorkspaceManagementSkill: Workspace, user, and channel info
 */

import { BaseSlackSkill } from './base-slack-skill';
import { MessagingSkill, MessagingSkillConfig } from './messaging-skill';
import { ChannelManagementSkill, ChannelManagementSkillConfig } from './channel-management-skill';
import { ThreadManagementSkill, ThreadManagementSkillConfig } from './thread-management-skill';
import { ReactionManagementSkill, ReactionManagementSkillConfig } from './reaction-management-skill';
import { WorkspaceManagementSkill, WorkspaceManagementSkillConfig } from './workspace-management-skill';
import { DefaultSlackSkillManager, SlackSkillManagerConfig } from './skill-manager';

// Export all skill classes
export {
  BaseSlackSkill,
  MessagingSkill,
  ChannelManagementSkill,
  ThreadManagementSkill,
  ReactionManagementSkill,
  WorkspaceManagementSkill,
  DefaultSlackSkillManager,
};

// Export all skill config types
export type {
  MessagingSkillConfig,
  ChannelManagementSkillConfig,
  ThreadManagementSkillConfig,
  ReactionManagementSkillConfig,
  WorkspaceManagementSkillConfig,
  SlackSkillManagerConfig,
};

/**
 * Default skill configurations
 */
export const defaultSkillConfigs = {
  messaging: {
    name: 'Messaging',
    description: 'Core Slack messaging functionality',
    enabled: true,
    maxMessageLength: 4000,
    enableFormatting: true,
    enableAttachments: true,
    enableBlocks: true,
    rateLimitPerChannel: 10,
    rateLimitWindow: 60000, // 1 minute
  } as MessagingSkillConfig,

  channelManagement: {
    name: 'Channel Management',
    description: 'Channel operations and management',
    enabled: true,
    enableChannelCreation: true,
    enableChannelArchiving: false,
    enableInviteManagement: true,
    enableTopicManagement: true,
    maxChannelsToTrack: 100,
  } as ChannelManagementSkillConfig,

  threadManagement: {
    name: 'Thread Management',
    description: 'Thread operations and tracking',
    enabled: true,
    maxThreadHistory: 1000,
    enableThreadNotifications: true,
    autoSubscribeToThreads: false,
    threadTimeoutMs: 86400000, // 24 hours
    maxConcurrentThreads: 50,
  } as ThreadManagementSkillConfig,

  reactionManagement: {
    name: 'Reaction Management',
    description: 'Emoji reactions and interaction',
    enabled: true,
    enableReactionTracking: true,
    trackReactionHistory: true,
    maxReactionHistory: 5000,
    enableReactionNotifications: false,
    reactionCooldownMs: 1000,
  } as ReactionManagementSkillConfig,

  workspaceManagement: {
    name: 'Workspace Management',
    description: 'Workspace, user, and channel information',
    enabled: true,
    enableUserTracking: true,
    enableChannelTracking: true,
    enablePresenceTracking: false,
    cacheUserInfo: true,
    cacheChannelInfo: true,
    cacheTtlMs: 300000, // 5 minutes
    maxCachedUsers: 1000,
    maxCachedChannels: 500,
    enableWorkspaceAnalytics: true,
  } as WorkspaceManagementSkillConfig,
};

/**
 * Create a new skill instance with default configuration
 */
export function createSlackSkill<T extends BaseSlackSkill>(
  SkillClass: new (config: any) => T,
  userConfig: any = {}
): T {
  // Get default config based on skill type
  let defaultConfig;
  
  if (SkillClass === MessagingSkill) {
    defaultConfig = defaultSkillConfigs.messaging;
  } else if (SkillClass === ChannelManagementSkill) {
    defaultConfig = defaultSkillConfigs.channelManagement;
  } else if (SkillClass === ThreadManagementSkill) {
    defaultConfig = defaultSkillConfigs.threadManagement;
  } else if (SkillClass === ReactionManagementSkill) {
    defaultConfig = defaultSkillConfigs.reactionManagement;
  } else if (SkillClass === WorkspaceManagementSkill) {
    defaultConfig = defaultSkillConfigs.workspaceManagement;
  } else {
    defaultConfig = { name: 'Unknown Skill', description: 'Custom skill', enabled: true };
  }

  const config = { ...defaultConfig, ...userConfig };
  return new SkillClass(config);
}

/**
 * Initialize all default Slack skills with a skill manager
 */
export function initializeDefaultSkills(
  manager: DefaultSlackSkillManager,
  skillConfigs: Partial<{
    messaging: Partial<MessagingSkillConfig>;
    channelManagement: Partial<ChannelManagementSkillConfig>;
    threadManagement: Partial<ThreadManagementSkillConfig>;
    reactionManagement: Partial<ReactionManagementSkillConfig>;
    workspaceManagement: Partial<WorkspaceManagementSkillConfig>;
  }> = {}
): Promise<void> {
  const skills = [
    createSlackSkill(MessagingSkill, skillConfigs.messaging),
    createSlackSkill(ChannelManagementSkill, skillConfigs.channelManagement),
    createSlackSkill(ThreadManagementSkill, skillConfigs.threadManagement),
    createSlackSkill(ReactionManagementSkill, skillConfigs.reactionManagement),
    createSlackSkill(WorkspaceManagementSkill, skillConfigs.workspaceManagement),
  ];

  const registrationPromises = skills.map(skill => manager.registerSkill(skill));
  await Promise.all(registrationPromises);
}

/**
 * Create a configured skill manager with all default skills
 */
export async function createConfiguredSkillManager(
  managerConfig?: SlackSkillManagerConfig,
  skillConfigs?: Parameters<typeof initializeDefaultSkills>[1]
): Promise<DefaultSlackSkillManager> {
  const manager = new DefaultSlackSkillManager(managerConfig);
  await initializeDefaultSkills(manager, skillConfigs);
  return manager;
}

/**
 * Skill registry for dynamic skill discovery
 */
export const skillRegistry = {
  'messaging': MessagingSkill,
  'channel-management': ChannelManagementSkill,
  'thread-management': ThreadManagementSkill,
  'reaction-management': ReactionManagementSkill,
  'workspace-management': WorkspaceManagementSkill,
} as const;

export type SkillName = keyof typeof skillRegistry;

/**
 * Create a skill by name from the registry
 */
export function createSkillByName(
  skillName: SkillName,
  config: any = {}
): BaseSlackSkill {
  const SkillClass = skillRegistry[skillName];
  if (!SkillClass) {
    throw new Error(`Unknown skill: ${skillName}. Available skills: ${Object.keys(skillRegistry).join(', ')}`);
  }
  
  return createSlackSkill(SkillClass, config);
}

/**
 * Get all available skill names
 */
export function getAvailableSkills(): SkillName[] {
  return Object.keys(skillRegistry) as SkillName[];
}

/**
 * Get skill information without instantiating
 */
export function getSkillInfo(skillName: SkillName): {
  name: string;
  description: string;
  defaultConfig: any;
} {
  const configs = {
    'messaging': defaultSkillConfigs.messaging,
    'channel-management': defaultSkillConfigs.channelManagement,
    'thread-management': defaultSkillConfigs.threadManagement,
    'reaction-management': defaultSkillConfigs.reactionManagement,
    'workspace-management': defaultSkillConfigs.workspaceManagement,
  };

  return {
    name: configs[skillName].name,
    description: configs[skillName].description,
    defaultConfig: configs[skillName],
  };
}

/**
 * Factory functions for creating individual skills
 */
export function createMessagingSkill(config?: Partial<MessagingSkillConfig>): MessagingSkill {
  return new MessagingSkill({ ...defaultSkillConfigs.messaging, ...config });
}

export function createChannelManagementSkill(config?: Partial<ChannelManagementSkillConfig>): ChannelManagementSkill {
  return new ChannelManagementSkill({ ...defaultSkillConfigs.channelManagement, ...config });
}

export function createThreadManagementSkill(config?: Partial<ThreadManagementSkillConfig>): ThreadManagementSkill {
  return new ThreadManagementSkill({ ...defaultSkillConfigs.threadManagement, ...config });
}

export function createReactionManagementSkill(config?: Partial<ReactionManagementSkillConfig>): ReactionManagementSkill {
  return new ReactionManagementSkill({ ...defaultSkillConfigs.reactionManagement, ...config });
}

export function createWorkspaceManagementSkill(config?: Partial<WorkspaceManagementSkillConfig>): WorkspaceManagementSkill {
  return new WorkspaceManagementSkill({ ...defaultSkillConfigs.workspaceManagement, ...config });
}

export function createSlackSkillManager(config?: SlackSkillManagerConfig): DefaultSlackSkillManager {
  return new DefaultSlackSkillManager(config);
}