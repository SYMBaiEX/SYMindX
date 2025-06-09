import { ExtensionConfig, BaseConfig } from '../../types/common.js'

export interface SlackSettings extends BaseConfig {
  botToken: string
  signingSecret: string
  appToken?: string
  socketMode?: boolean
  port?: number
  approvalTimeout?: number
  maxMessageLength?: number
  allowedChannels?: string[]
  adminUsers?: string[]
  statusUpdates?: {
    enabled: boolean
    channel: string
    interval: number
    lastSent?: string
  }
}

export interface SlackConfig extends ExtensionConfig {
  settings: SlackSettings
}

export interface PendingApproval {
  id: string
  agentId: string
  action: any
  channel: string
  messageTs: string
  requestedAt: Date
  timeout: number
  status: 'pending' | 'approved' | 'rejected' | 'timeout'
  respondedBy?: string
  respondedAt?: Date
}

export interface ConversationContext {
  messages: Array<{ user: string; text: string; timestamp: Date }>
  participants: Set<string>
  lastActivity: Date
}

export interface UserPreferences {
  userId: string
  notifications: boolean
  approvalLevel: 'all' | 'important' | 'none'
  preferredChannels: string[]
}

export interface SlackMessage {
  channel: string
  text: string
  user?: string
  ts?: string
  thread_ts?: string
  blocks?: any[]
  attachments?: any[]
}

export interface SlackEvent {
  type: string
  user: string
  channel: string
  text: string
  ts: string
  thread_ts?: string
  event_ts: string
}

export interface SlackCommand {
  command: string
  text: string
  user_id: string
  user_name: string
  channel_id: string
  channel_name: string
  team_id: string
  team_domain: string
  response_url: string
  trigger_id: string
}

export interface SlackInteraction {
  type: string
  user: {
    id: string
    name: string
  }
  channel: {
    id: string
    name: string
  }
  message: {
    ts: string
    text: string
  }
  actions: Array<{
    action_id: string
    value: string
    type: string
  }>
  response_url: string
  trigger_id: string
}

export interface SlackResponse {
  ok: boolean
  channel?: string
  ts?: string
  message?: {
    text: string
    user: string
    ts: string
  }
  error?: string
}

export interface MessageBlock {
  type: 'section' | 'divider' | 'image' | 'actions' | 'context' | 'header'
  text?: {
    type: 'plain_text' | 'mrkdwn'
    text: string
    emoji?: boolean
  }
  accessory?: any
  fields?: any[]
  elements?: any[]
}

export interface ActionBlock {
  type: 'actions'
  elements: Array<{
    type: 'button' | 'select' | 'overflow' | 'datepicker'
    text: {
      type: 'plain_text'
      text: string
      emoji?: boolean
    }
    action_id: string
    value?: string
    style?: 'primary' | 'danger'
    confirm?: any
  }>
}

export interface SlackFile {
  id: string
  name: string
  title: string
  mimetype: string
  filetype: string
  size: number
  url_private: string
  url_private_download: string
  permalink: string
  permalink_public: string
  user: string
  timestamp: number
}

export interface SlackChannel {
  id: string
  name: string
  is_channel: boolean
  is_group: boolean
  is_im: boolean
  is_mpim: boolean
  is_private: boolean
  created: number
  creator: string
  is_archived: boolean
  is_general: boolean
  name_normalized: string
  is_shared: boolean
  is_org_shared: boolean
  is_member: boolean
  members?: string[]
  topic?: {
    value: string
    creator: string
    last_set: number
  }
  purpose?: {
    value: string
    creator: string
    last_set: number
  }
}

export interface SlackUser {
  id: string
  team_id: string
  name: string
  deleted: boolean
  color: string
  real_name: string
  tz: string
  tz_label: string
  tz_offset: number
  profile: {
    avatar_hash: string
    status_text: string
    status_emoji: string
    real_name: string
    display_name: string
    real_name_normalized: string
    display_name_normalized: string
    email?: string
    image_24: string
    image_32: string
    image_48: string
    image_72: string
    image_192: string
    image_512: string
    team: string
  }
  is_admin: boolean
  is_owner: boolean
  is_primary_owner: boolean
  is_restricted: boolean
  is_ultra_restricted: boolean
  is_bot: boolean
  updated: number
  is_app_user: boolean
}

export interface SlackTeam {
  id: string
  name: string
  domain: string
  email_domain: string
  icon: {
    image_34: string
    image_44: string
    image_68: string
    image_88: string
    image_102: string
    image_132: string
    image_230: string
    image_default: boolean
  }
  enterprise_id?: string
  enterprise_name?: string
}

export interface SlackReaction {
  name: string
  count: number
  users: string[]
}

export interface SlackMessageEvent {
  type: 'message'
  subtype?: string
  channel: string
  user: string
  text: string
  ts: string
  thread_ts?: string
  reply_count?: number
  replies?: Array<{
    user: string
    ts: string
  }>
  reactions?: SlackReaction[]
  files?: SlackFile[]
  upload?: boolean
  display_as_bot?: boolean
  bot_id?: string
  username?: string
  icons?: {
    emoji?: string
    image_64?: string
  }
}

export interface SlackAppMentionEvent {
  type: 'app_mention'
  user: string
  text: string
  ts: string
  channel: string
  event_ts: string
  thread_ts?: string
}

export interface SlackReactionEvent {
  type: 'reaction_added' | 'reaction_removed'
  user: string
  reaction: string
  item_user: string
  item: {
    type: 'message'
    channel: string
    ts: string
  }
  event_ts: string
}