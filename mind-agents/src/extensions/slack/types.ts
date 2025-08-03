/**
 * Slack Extension Type Definitions
 */

import { ExtensionConfig } from '../../types/common';
import { WebClient } from '@slack/web-api';
import type { SocketModeClient } from '@slack/socket-mode';

export interface SlackConfig extends ExtensionConfig {
  botToken?: string;
  appToken?: string;
  signingSecret?: string;
  socketMode?: boolean;
  channels?: string[];
  allowedWorkspaces?: string[];
  enableThreading?: boolean;
  enableReactions?: boolean;
  enableFileSharing?: boolean;
  enableAdminFeatures?: boolean;
  autoJoinChannels?: boolean;
  responseTimeout?: number;
  maxMessageLength?: number;
  rateLimitPerChannel?: number;
  rateLimitWindow?: number;
}

export interface SlackMessage {
  type: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  team?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  files?: SlackFile[];
  reactions?: SlackReaction[];
}

export interface SlackBlock {
  type: string;
  block_id?: string;
  text?: SlackText;
  elements?: SlackElement[];
  accessory?: SlackElement;
  fields?: SlackText[];
  image_url?: string;
  alt_text?: string;
  title?: SlackText;
}

export interface SlackText {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

export interface SlackElement {
  type: string;
  action_id?: string;
  text?: SlackText;
  url?: string;
  value?: string;
  style?: string;
  options?: SlackOption[];
  placeholder?: SlackText;
}

export interface SlackOption {
  text: SlackText;
  value: string;
  description?: SlackText;
  url?: string;
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackField[];
  actions?: SlackAction[];
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackAction {
  type: string;
  text: string;
  url?: string;
  value?: string;
  style?: string;
  name?: string;
  confirm?: SlackConfirm;
}

export interface SlackConfirm {
  title: string;
  text: string;
  ok_text?: string;
  dismiss_text?: string;
}

export interface SlackFile {
  id: string;
  name: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  size?: number;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
  preview?: string;
}

export interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel?: boolean;
  is_group?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
  is_private?: boolean;
  created?: number;
  creator?: string;
  is_archived?: boolean;
  is_general?: boolean;
  name_normalized?: string;
  is_shared?: boolean;
  is_org_shared?: boolean;
  is_member?: boolean;
  is_private_channel?: boolean;
  is_mpim_channel?: boolean;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
  num_members?: number;
}

export interface SlackUser {
  id: string;
  team_id?: string;
  name: string;
  deleted?: boolean;
  color?: string;
  real_name?: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile?: SlackUserProfile;
  is_admin?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  is_bot?: boolean;
  is_app_user?: boolean;
  updated?: number;
  has_2fa?: boolean;
}

export interface SlackUserProfile {
  title?: string;
  phone?: string;
  skype?: string;
  real_name?: string;
  real_name_normalized?: string;
  display_name?: string;
  display_name_normalized?: string;
  status_text?: string;
  status_emoji?: string;
  status_expiration?: number;
  avatar_hash?: string;
  image_original?: string;
  is_custom_image?: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  image_24?: string;
  image_32?: string;
  image_48?: string;
  image_72?: string;
  image_192?: string;
  image_512?: string;
  team?: string;
}

export interface SlackWorkspace {
  id: string;
  name: string;
  domain?: string;
  email_domain?: string;
  icon?: {
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
    image_default?: boolean;
  };
  enterprise_id?: string;
  enterprise_name?: string;
}

export interface SlackConversation {
  id: string;
  messages: SlackMessage[];
  channel: string;
  latest_reply?: string;
  reply_count?: number;
  reply_users?: string[];
  reply_users_count?: number;
  thread_ts?: string;
}

export interface SlackSkillConfig {
  name: string;
  description: string;
  enabled?: boolean;
  priority?: number;
}

export interface SlackSkillContext {
  client: WebClient;
  socketClient?: SocketModeClient;
  workspace?: SlackWorkspace;
  botUser?: SlackUser;
  config: SlackConfig;
}

export interface SlackEventContext {
  type: string;
  event: any;
  user?: string;
  channel?: string;
  text?: string;
  thread_ts?: string;
  message?: SlackMessage;
  say?: (text: string | any) => Promise<void>;
  respond?: (response: string | any) => Promise<void>;
}

export interface SlackCommandContext extends SlackEventContext {
  command: string;
  args: string[];
  ack?: () => Promise<void>;
}

export interface SlackActionContext extends SlackEventContext {
  action: SlackAction;
  block_id?: string;
  action_id?: string;
  value?: string;
  selected_option?: SlackOption;
  ack?: () => Promise<void>;
  update?: (message: any) => Promise<void>;
}

export interface SlackViewContext extends SlackEventContext {
  view: any;
  view_id: string;
  ack?: () => Promise<void>;
  close?: () => Promise<void>;
  update?: (view: any) => Promise<void>;
}

export interface SlackRateLimiter {
  channel: string;
  messageCount: number;
  windowStart: number;
}

export interface SlackThreadManager {
  threads: Map<string, SlackConversation>;
  activeThreads: Set<string>;
  maxThreads: number;
}

export interface SlackChannelState {
  channelId: string;
  lastMessageTs?: string;
  memberCount?: number;
  isJoined: boolean;
  isMuted: boolean;
  notificationLevel?: 'all' | 'mentions' | 'none';
}

export interface SlackWorkspaceState {
  workspaceId: string;
  channels: Map<string, SlackChannelState>;
  users: Map<string, SlackUser>;
  rateLimiters: Map<string, SlackRateLimiter>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export interface SlackMessageOptions {
  thread_ts?: string;
  reply_broadcast?: boolean;
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  as_user?: boolean;
  icon_emoji?: string;
  icon_url?: string;
  username?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  metadata?: any;
}

export interface SlackSearchOptions {
  query: string;
  sort?: 'score' | 'timestamp';
  sort_dir?: 'asc' | 'desc';
  highlight?: boolean;
  count?: number;
  page?: number;
}

export interface SlackAnalytics {
  messagesSent: number;
  messagesReceived: number;
  reactionsAdded: number;
  threadsCreated: number;
  filesShared: number;
  commandsProcessed: number;
  errorsEncountered: number;
  activeChannels: Set<string>;
  activeUsers: Set<string>;
  timestamp: number;
}

export interface SlackError {
  code: string;
  message: string;
  data?: any;
  retryable?: boolean;
  retryAfter?: number;
}

// Re-export types that are used in common
export type {
  SlackMessage as ISlackMessage,
  SlackChannel as ISlackChannel,
  SlackUser as ISlackUser,
  SlackWorkspace as ISlackWorkspace,
};