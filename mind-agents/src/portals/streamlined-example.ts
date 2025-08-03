/**
 * Streamlined Portal Manager Usage Example
 * 
 * Demonstrates how to use the top 5 AI providers with automatic failover,
 * caching, and connection pooling.
 */

import { createStreamlinedPortalManager, StreamlinedProvider } from './streamlined-portal-manager';
import type { StreamlinedPortalConfig } from './streamlined-portal-manager';

// Example configuration for production use
const productionConfig: StreamlinedPortalConfig = {
  providers: {
    // Primary provider - OpenAI (highest priority)
    [StreamlinedProvider.OPENAI]: {
      enabled: true,
      priority: 1,
      apiKey: process.env.OPENAI_API_KEY,
      models: {
        chat: 'gpt-4o-mini',
        tool: 'gpt-4o-mini',
        embedding: 'text-embedding-3-small'
      },
      rateLimit: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000
      }
    },
    
    // Secondary provider - Anthropic (fallback)
    [StreamlinedProvider.ANTHROPIC]: {
      enabled: true,
      priority: 2,
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: {
        chat: 'claude-3-5-haiku-20241022',
        tool: 'claude-3-5-haiku-20241022'
      },
      rateLimit: {
        requestsPerMinute: 300,
        tokensPerMinute: 100000
      }
    },
    
    // Fast provider - Groq (for quick responses)
    [StreamlinedProvider.GROQ]: {
      enabled: true,
      priority: 3,
      apiKey: process.env.GROQ_API_KEY,
      models: {
        chat: 'llama-3.1-8b-instant',
        tool: 'llama-3.1-8b-instant'
      },
      rateLimit: {
        requestsPerMinute: 1000,
        tokensPerMinute: 200000
      }
    },
    
    // Google provider - Gemini (multimodal capabilities)
    [StreamlinedProvider.GOOGLE]: {
      enabled: true,
      priority: 4,
      apiKey: process.env.GOOGLE_API_KEY,
      models: {
        chat: 'gemini-1.5-flash',
        tool: 'gemini-1.5-flash'
      },
      rateLimit: {
        requestsPerMinute: 400,
        tokensPerMinute: 120000
      }
    },
    
    // Local provider - Ollama (privacy-focused)
    [StreamlinedProvider.OLLAMA]: {
      enabled: false, // Enable for local deployment
      priority: 5,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: {
        chat: 'llama3.2:3b',
        tool: 'llama3.2:3b'
      },
      rateLimit: {
        requestsPerMinute: 100,
        tokensPerMinute: 50000
      }
    }
  },
  
  // Automatic failover configuration
  failover: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000, // 1 second between retries
    circuitBreakerThreshold: 5, // Open circuit after 5 failures
    circuitBreakerTimeout: 30000 // 30 seconds before retry
  },
  
  // Response caching with TTL and invalidation
  caching: {
    enabled: true,
    ttl: 300, // 5 minutes cache TTL
    maxSize: 1000, // Maximum 1000 cached responses
    invalidationPatterns: [
      'user_context_changed',
      'model_updated',
      'character_modified'
    ]
  },
  
  // Connection pooling for efficient resource management
  connectionPool: {
    enabled: true,
    maxConnections: 10, // Maximum 10 connections per provider
    connectionTimeout: 5000, // 5 second connection timeout
    idleTimeout: 300000, // 5 minutes idle timeout
    keepAlive: true
  },
  
  // Load balancing strategy
  loadBalancing: {
    strategy: 'weighted', // Use provider priorities for load balancing
    healthCheckInterval: 30000, // Health check every 30 seconds
    healthCheckTimeout: 5000 // 5 second health check timeout
  }
};

/**
 * Example usage of the streamlined portal manager
 */
async function exampleUsage() {
  // Create the portal manager
  const portalManager = createStreamlinedPortalManager(productionConfig);
  
  try {
    // Example 1: Generate chat response with automatic failover
    console.log('🚀 Generating chat response with automatic failover...');
    
    const chatMessages = [
      { role: 'user' as const, content: 'Hello! How are you today?' }
    ];
    
    // This will automatically:
    // 1. Select the best available provider based on priority
    // 2. Check cache for existing response
    // 3. Use connection pooling for efficient resource usage
    // 4. Automatically failover to next provider if primary fails
    // 5. Cache the response for future use
    const chatResponse = await portalManager.generateChat(chatMessages, {
      maxOutputTokens: 150,
      temperature: 0.7
    });
    
    console.log('✅ Chat Response:', chatResponse.text);
    
    // Example 2: Generate text with caching
    console.log('\\n🔄 Generating text (will use cache on second call)...');
    
    const prompt = 'Explain the benefits of AI in healthcare';
    
    // First call - will hit the API
    const textResponse1 = await portalManager.generateText(prompt, {
      maxOutputTokens: 200,
      temperature: 0.5
    });
    console.log('✅ First Response (from API):', textResponse1.text.substring(0, 100) + '...');
    
    // Second call - will use cache
    const textResponse2 = await portalManager.generateText(prompt, {
      maxOutputTokens: 200,
      temperature: 0.5
    });
    console.log('✅ Second Response (from cache):', textResponse2.text.substring(0, 100) + '...');
    
    // Example 3: Check provider statistics
    console.log('\\n📊 Provider Statistics:');
    const stats = portalManager.getProviderStats();
    
    Object.entries(stats).forEach(([provider, stat]) => {
      console.log(`  ${provider}:`);
      console.log(`    Health: ${stat.health}`);
      console.log(`    Response Time: ${stat.responseTime}ms`);
      console.log(`    Circuit Breaker: ${stat.circuitBreakerState}`);
      console.log(`    Active Connections: ${stat.activeConnections}`);
    });
    
    // Example 4: Check cache statistics
    console.log('\\n💾 Cache Statistics:');
    const cacheStats = portalManager.getCacheStats();
    console.log(`  Size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`  Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log(`  Total Requests: ${cacheStats.totalRequests}`);
    
    // Example 5: Cache invalidation
    console.log('\\n🗑️ Invalidating cache...');
    portalManager.invalidateCache('user_context_changed');
    
    const newCacheStats = portalManager.getCacheStats();
    console.log(`  Cache size after invalidation: ${newCacheStats.size}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Always shutdown cleanly
    console.log('\\n🛑 Shutting down portal manager...');
    portalManager.shutdown();
    console.log('✅ Shutdown complete');
  }
}

/**
 * Example of different load balancing strategies
 */
function loadBalancingExamples() {
  console.log('\\n🔄 Load Balancing Strategy Examples:');
  
  // Round-robin strategy
  const roundRobinConfig = {
    ...productionConfig,
    loadBalancing: {
      strategy: 'round-robin' as const,
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000
    }
  };
  
  // Weighted strategy (uses provider priorities)
  const weightedConfig = {
    ...productionConfig,
    loadBalancing: {
      strategy: 'weighted' as const,
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000
    }
  };
  
  // Least connections strategy
  const leastConnectionsConfig = {
    ...productionConfig,
    loadBalancing: {
      strategy: 'least-connections' as const,
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000
    }
  };
  
  // Response time strategy
  const responseTimeConfig = {
    ...productionConfig,
    loadBalancing: {
      strategy: 'response-time' as const,
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000
    }
  };
  
  console.log('  - Round-robin: Distributes requests evenly across providers');
  console.log('  - Weighted: Uses provider priorities for distribution');
  console.log('  - Least-connections: Routes to provider with fewest active connections');
  console.log('  - Response-time: Routes to provider with fastest average response time');
}

// Run the example if this file is executed directly
if (require.main === module) {
  console.log('🎯 Streamlined Portal Manager Example');
  console.log('=====================================\\n');
  
  loadBalancingExamples();
  
  // Note: Uncomment the line below to run the actual API example
  // (requires valid API keys in environment variables)
  // exampleUsage();
  
  console.log('\\n✅ Example completed successfully!');
  console.log('\\nTo run with real API calls, set environment variables:');
  console.log('  - OPENAI_API_KEY');
  console.log('  - ANTHROPIC_API_KEY');
  console.log('  - GROQ_API_KEY');
  console.log('  - GOOGLE_API_KEY');
  console.log('  - OLLAMA_BASE_URL (optional, defaults to localhost:11434)');
}

export { exampleUsage, loadBalancingExamples, productionConfig };