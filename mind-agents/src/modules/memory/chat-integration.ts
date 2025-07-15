/**
 * Chat System Integration for SYMindX Memory Module
 *
 * Provides factory functions and integration points for all chat repository providers
 */

import {
  createNeonChatRepository,
  NeonChatConfig,
} from './providers/neon/chat-repository';
import {
  createPostgresChatRepository,
  PostgresChatConfig,
} from './providers/postgres/chat-repository';
import { createSQLiteChatRepository } from './providers/sqlite/chat-repository';
import {
  ChatRepository,
  ChatSystemConfig,
  ConversationStatus,
} from './providers/sqlite/chat-types';
import {
  createSupabaseChatRepository,
  SupabaseChatConfig,
} from './providers/supabase/chat-repository';

export type ChatProvider = 'sqlite' | 'supabase' | 'neon' | 'postgres';

export interface ChatFactoryConfig {
  provider: ChatProvider;
  config:
    | ChatSystemConfig
    | SupabaseChatConfig
    | NeonChatConfig
    | PostgresChatConfig;
}

/**
 * Main factory function for creating chat repositories
 */
export function createChatRepository(
  options: ChatFactoryConfig
): ChatRepository {
  switch (options.provider) {
    case 'sqlite':
      return createSQLiteChatRepository(options.config as ChatSystemConfig);

    case 'supabase':
      return createSupabaseChatRepository(options.config as SupabaseChatConfig);

    case 'neon':
      return createNeonChatRepository(options.config as NeonChatConfig);

    case 'postgres':
      return createPostgresChatRepository(options.config as PostgresChatConfig);

    default:
      throw new Error(`Unsupported chat provider: ${options.provider}`);
  }
}

/**
 * Auto-detect and create chat repository based on available configuration
 */
export function createChatRepositoryFromEnv(): ChatRepository | null {
  // Check for SQLite (default)
  if (process.env.CHAT_SQLITE_PATH) {
    return createChatRepository({
      provider: 'sqlite',
      config: {
        dbPath: process.env.CHAT_SQLITE_PATH,
        enableAnalytics: process.env.CHAT_ENABLE_ANALYTICS === 'true',
        enableFullTextSearch: process.env.CHAT_ENABLE_FTS !== 'false',
      },
    });
  }

  // Check for Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return createChatRepository({
      provider: 'supabase',
      config: {
        dbPath: '', // Not used for Supabase
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        schema: process.env.SUPABASE_SCHEMA || 'public',
        enableAnalytics: process.env.CHAT_ENABLE_ANALYTICS === 'true',
      },
    });
  }

  // Check for Neon
  if (process.env.NEON_DATABASE_URL) {
    return createChatRepository({
      provider: 'neon',
      config: {
        dbPath: '', // Not used for Neon
        connectionString: process.env.NEON_DATABASE_URL,
        ssl: process.env.NEON_SSL !== 'false',
        maxConnections: parseInt(process.env.NEON_MAX_CONNECTIONS || '10'),
        enableAnalytics: process.env.CHAT_ENABLE_ANALYTICS === 'true',
      },
    });
  }

  // Check for PostgreSQL
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (postgresUrl) {
    return createChatRepository({
      provider: 'postgres',
      config: {
        dbPath: '', // Not used for PostgreSQL
        connectionString: postgresUrl,
        ssl: process.env.POSTGRES_SSL !== 'false',
        maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
        enableAnalytics: process.env.CHAT_ENABLE_ANALYTICS === 'true',
      },
    });
  }

  return null;
}

/**
 * Chat system status and health check
 */
export async function getChatSystemStatus(repository: ChatRepository): Promise<{
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    canCreateConversation: boolean;
    canCreateMessage: boolean;
    canQueryMessages: boolean;
    error?: string;
  };
}> {
  const provider = getProviderName(repository);
  const details: {
    canCreateConversation: boolean;
    canCreateMessage: boolean;
    canQueryMessages: boolean;
    error?: string;
  } = {
    canCreateConversation: false,
    canCreateMessage: false,
    canQueryMessages: false,
  };

  try {
    // Test basic operations
    const testConversation = await repository.createConversation({
      agentId: 'test-agent',
      userId: 'test-user',
      title: 'Health Check',
      status: 'active' as ConversationStatus,
      messageCount: 0,
      metadata: { healthCheck: true },
    });
    details.canCreateConversation = true;

    await repository.createMessage({
      conversationId: testConversation.id,
      senderType: 'system' as any,
      senderId: 'system',
      content: 'Health check message',
      messageType: 'text' as any,
      metadata: {},
      memoryReferences: [],
      createdMemories: [],
      status: 'sent' as any,
    });
    details.canCreateMessage = true;

    const messages = await repository.listMessages({
      conversationId: testConversation.id,
      limit: 1,
    });
    details.canQueryMessages = messages.length > 0;

    // Cleanup test data
    await repository.deleteConversation(testConversation.id, 'health-check');

    const status =
      details.canCreateConversation &&
      details.canCreateMessage &&
      details.canQueryMessages
        ? 'healthy'
        : 'degraded';

    return { provider, status, details };
  } catch (error) {
    void error;
    details.error = error instanceof Error ? error.message : String(error);
    return { provider, status: 'unhealthy', details };
  }
}

/**
 * Get provider name from repository instance
 */
function getProviderName(repository: ChatRepository): string {
  const className = repository.constructor.name;
  if (className.includes('SQLite')) return 'sqlite';
  if (className.includes('Supabase')) return 'supabase';
  if (className.includes('Neon')) return 'neon';
  if (className.includes('Postgres')) return 'postgres';
  return 'unknown';
}

// Re-export types for convenience
export type {
  ChatRepository,
  ChatSystemConfig,
} from './providers/sqlite/chat-types';

export type { SupabaseChatConfig } from './providers/supabase/chat-repository';
export type { NeonChatConfig } from './providers/neon/chat-repository';
export type { PostgresChatConfig } from './providers/postgres/chat-repository';

export {
  ConversationStatus,
  MessageStatus,
  MessageType,
  SenderType,
} from './providers/sqlite/chat-types';
