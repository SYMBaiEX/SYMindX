/**
 * Context-Aware Portal Usage Examples
 *
 * This file demonstrates how to use the enhanced portal system with context awareness
 */

import { createOpenAIPortal } from '../openai/index.js';
import { createAnthropicPortal } from '../anthropic/index.js';
import { ContextMigrationHelper } from '../context-helpers.js';
import {
  UnifiedContext,
  ContextScope,
  ContextPriority,
} from '../../types/context/unified-context.js';

/**
 * Example 1: Basic context-aware text generation
 */
export async function basicContextAwareGeneration() {
  // Create a portal instance
  const portal = createOpenAIPortal({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
  });

  // Create context with agent and communication preferences
  const context: UnifiedContext = {
    metadata: {
      id: 'example-context-1',
      scope: ContextScope.REQUEST,
      priority: ContextPriority.CONFIG,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      source: 'example',
      version: '1.0.0',
    },
    agent: {
      config: {
        personality: {
          traits: ['helpful', 'analytical'],
          tone: 'professional',
        },
      },
      emotions: {
        confidence: { intensity: 0.8 },
        curiosity: { intensity: 0.6 },
      },
      goals: ['Provide accurate information', 'Be concise'],
      capabilities: ['analysis', 'explanation'],
    },
    communication: {
      conversationHistory: [],
      style: {
        formality: 'professional',
        verbosity: 'concise',
        tone: 'helpful',
      } as any,
      language: {
        primary: 'en',
        region: 'US',
      },
    },
    temporal: {
      now: new Date().toISOString(),
      startTime: new Date().toISOString(),
    },
  };

  // Generate text with context awareness
  const result = await portal.generateTextWithContext?.(
    'What are the key benefits of TypeScript?',
    context,
    {
      temperature: 0.7, // This may be adjusted based on context
      maxOutputTokens: 200,
    }
  );

  console.log('Context-aware result:', result);
  return result;
}

/**
 * Example 2: Chat generation with conversation context
 */
export async function contextAwareChatGeneration() {
  const portal = createAnthropicPortal({
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key',
  });

  // Create context with conversation history
  const context: UnifiedContext = {
    metadata: {
      id: 'chat-context-1',
      scope: ContextScope.SESSION,
      priority: ContextPriority.SESSION,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      source: 'chat-system',
      version: '1.0.0',
    },
    communication: {
      conversationHistory: [
        {
          role: 'user',
          content: 'I need help with React hooks',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content:
            "I'd be happy to help you with React hooks. What specific aspect would you like to learn about?",
          timestamp: new Date().toISOString(),
        },
      ],
      style: {
        complexity: 'medium',
        creativity: 'low', // Will lower temperature
      } as any,
    },
    tools: {
      available: [
        {
          id: 'code-analyzer',
          name: 'analyzeCode',
          description: 'Analyze React code for best practices',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string' },
            },
          },
          provider: 'internal',
        },
      ],
      recent: [],
    },
  };

  const messages = [
    {
      role: 'user' as const,
      content: 'Can you analyze this useEffect hook and suggest improvements?',
      timestamp: new Date(),
    },
  ];

  const result = await portal.generateChatWithContext?.(messages, context, {
    maxOutputTokens: 500,
  });

  console.log('Context-aware chat result:', result);
  return result;
}

/**
 * Example 3: Migration from legacy usage
 */
export async function migrateFromLegacyUsage() {
  const portal = createOpenAIPortal({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
  });

  // Legacy options (existing code)
  const legacyOptions = {
    model: 'gpt-4o-mini',
    temperature: 0.5,
    maxOutputTokens: 300,
  };

  // Create minimal context for migration
  const context = ContextMigrationHelper.createMinimalContext(
    'agent-123',
    'session-456',
    {
      formality: 'casual',
      tone: 'friendly',
    } as any
  );

  // Migrate options to context-aware
  const migratedOptions = ContextMigrationHelper.migrateToContextAware(
    legacyOptions,
    context
  );

  // Use both old and new methods for comparison
  const legacyResult = await portal.generateText(
    'Explain async/await in JavaScript',
    legacyOptions
  );

  const contextAwareResult = await portal.generateTextWithContext?.(
    'Explain async/await in JavaScript',
    context,
    migratedOptions
  );

  console.log('Legacy result:', legacyResult);
  console.log('Context-aware result:', contextAwareResult);

  return { legacyResult, contextAwareResult };
}

/**
 * Example 4: Performance optimization with context
 */
export async function performanceOptimizedGeneration() {
  const portal = createOpenAIPortal({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
  });

  // Context indicating performance-critical scenario
  const context: UnifiedContext = {
    metadata: {
      id: 'perf-context-1',
      scope: ContextScope.REQUEST,
      priority: ContextPriority.REQUEST,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      source: 'performance-test',
      version: '1.0.0',
    },
    execution: {
      mode: 'production',
      environment: process.env,
      version: {
        runtime: '1.0.0',
      },
      limits: {
        timeout: 5000, // 5 second timeout
        memory: 100 * 1024 * 1024, // 100MB limit
      },
    },
    performance: {
      startTime: new Date().toISOString(),
      memoryUsage: 50 * 1024 * 1024, // 50MB current usage
      requestRate: 100, // 100 requests per second
    },
    tools: {
      available: [
        {
          id: 'quick-calculator',
          name: 'calculate',
          description: 'Quick mathematical calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: { type: 'string' },
            },
          },
          provider: 'internal',
        },
      ],
      recent: [
        {
          id: 'quick-calculator',
          timestamp: new Date().toISOString(),
          duration: 50,
          success: true,
        },
      ],
    },
  };

  // The context will automatically:
  // - Select faster model (gpt-4o-mini for tools)
  // - Lower token limit due to memory pressure
  // - Lower temperature for precise tool usage
  // - Enable streaming if supported
  const result = await portal.generateTextWithContext?.(
    'Calculate the compound interest for $1000 at 5% for 3 years',
    context
  );

  console.log('Performance-optimized result:', result);
  return result;
}

/**
 * Example 5: Streaming with context awareness
 */
export async function contextAwareStreaming() {
  const portal = createAnthropicPortal({
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key',
  });

  const context: UnifiedContext = {
    metadata: {
      id: 'stream-context-1',
      scope: ContextScope.REQUEST,
      priority: ContextPriority.REQUEST,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      source: 'streaming-example',
      version: '1.0.0',
    },
    communication: {
      conversationHistory: [],
      channel: {
        type: 'text',
        capabilities: ['streaming'],
        platform: 'web',
      },
    },
    temporal: {
      now: new Date().toISOString(),
      startTime: new Date().toISOString(),
      constraints: {
        deadline: new Date(Date.now() + 10000).toISOString(), // 10 seconds
      },
    },
  };

  // Stream with context (will automatically optimize for real-time)
  const stream = portal.streamTextWithContext?.(
    'Write a detailed explanation of how neural networks work',
    context
  );

  if (stream) {
    console.log('Starting context-aware stream...');
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    console.log('\nStream completed.');
  }
}

// Export all examples for easy testing
export const examples = {
  basicContextAwareGeneration,
  contextAwareChatGeneration,
  migrateFromLegacyUsage,
  performanceOptimizedGeneration,
  contextAwareStreaming,
};

// Example usage
if (require.main === module) {
  (async () => {
    try {
      console.log('Running context-aware portal examples...\n');

      await basicContextAwareGeneration();
      console.log('\n---\n');

      await contextAwareChatGeneration();
      console.log('\n---\n');

      await migrateFromLegacyUsage();
      console.log('\n---\n');

      await performanceOptimizedGeneration();
      console.log('\n---\n');

      await contextAwareStreaming();
    } catch (error) {
      console.error('Example failed:', error);
    }
  })();
}
