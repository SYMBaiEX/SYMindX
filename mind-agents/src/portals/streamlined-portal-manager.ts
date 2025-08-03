/**
 * Streamlined Portal Manager for SYMindX
 * 
 * Focuses on top 5 AI providers with enhanced features:
 * - OpenAI, Anthropic, Groq, Google, Ollama
 * - Automatic failover between providers
 * - Response caching with TTL and invalidation
 * - Connection pooling for efficient resource management
 * - Load balancing and circuit breaker patterns
 */

import { Portal, PortalConfig, ChatMessage, ChatGenerationOptions, ChatGenerationResult, TextGenerationOptions, TextGenerationResult, PortalCapability, PortalStatus } from '../types/portal';
import { runtimeLogger } from '../utils/logger';

// Top 5 Provider Types
export enum StreamlinedProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic', 
  GROQ = 'groq',
  GOOGLE = 'google',
  OLLAMA = 'ollama'
}

// Enhanced Portal Configuration
export interface StreamlinedPortalConfig extends PortalConfig {
  // Provider configuration
  providers: {
    [key in StreamlinedProvider]?: {
      enabled: boolean;
      priority: number; // 1-5, lower is higher priority
      apiKey?: string;
      baseUrl?: string;
      models: {
        chat: string;
        tool: string;
        embedding?: string;
      };
      rateLimit?: {
        requestsPerMinute: number;
        tokensPerMinute: number;
      };
    };
  };
  
  // Failover configuration
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number; // ms
    circuitBreakerThreshold: number; // failures before circuit opens
    circuitBreakerTimeout: number; // ms to wait before retry
  };
  
  // Caching configuration
  caching: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number; // max cached responses
    invalidationPatterns: string[]; // patterns that invalidate cache
  };
  
  // Connection pooling
  connectionPool: {
    enabled: boolean;
    maxConnections: number;
    connectionTimeout: number; // ms
    idleTimeout: number; // ms
    keepAlive: boolean;
  };
  
  // Load balancing
  loadBalancing: {
    strategy: 'round-robin' | 'weighted' | 'least-connections' | 'response-time';
    healthCheckInterval: number; // ms
    healthCheckTimeout: number; // ms
  };
}

// Response Cache Entry
interface CacheEntry {
  response: ChatGenerationResult | TextGenerationResult;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

// Connection Pool Entry
interface PooledConnection {
  provider: StreamlinedProvider;
  portal: Portal;
  inUse: boolean;
  created: number;
  lastUsed: number;
  requestCount: number;
}

// Circuit Breaker State
interface CircuitBreakerState {
  provider: StreamlinedProvider;
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextRetry: number;
}

// Provider Health Status
interface ProviderHealth {
  provider: StreamlinedProvider;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  successRate: number;
  lastCheck: number;
  errorCount: number;
}

// Load Balancer State
interface LoadBalancerState {
  currentIndex: number; // for round-robin
  connectionCounts: Map<StreamlinedProvider, number>;
  responseTimes: Map<StreamlinedProvider, number[]>;
}

/**
 * Streamlined Portal Manager
 * Manages the top 5 AI providers with advanced features
 */
export class StreamlinedPortalManager {
  private config: StreamlinedPortalConfig;
  private responseCache: Map<string, CacheEntry> = new Map();
  private connectionPool: Map<string, PooledConnection> = new Map();
  private circuitBreakers: Map<StreamlinedProvider, CircuitBreakerState> = new Map();
  private providerHealth: Map<StreamlinedProvider, ProviderHealth> = new Map();
  private loadBalancerState: LoadBalancerState;
  
  // Provider portals
  private portals: Map<StreamlinedProvider, Portal> = new Map();
  private availableProviders: StreamlinedProvider[] = [];
  
  // Monitoring
  private healthCheckInterval?: NodeJS.Timeout;
  private cacheCleanupInterval?: NodeJS.Timeout;
  
  constructor(config: StreamlinedPortalConfig) {
    this.config = {
      // Default configuration
      providers: {},
      failover: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 30000
      },
      caching: {
        enabled: true,
        ttl: 300, // 5 minutes
        maxSize: 1000,
        invalidationPatterns: ['user_context_changed', 'model_updated']
      },
      connectionPool: {
        enabled: true,
        maxConnections: 10,
        connectionTimeout: 5000,
        idleTimeout: 300000, // 5 minutes
        keepAlive: true
      },
      loadBalancing: {
        strategy: 'weighted',
        healthCheckInterval: 30000, // 30 seconds
        healthCheckTimeout: 5000
      },
      ...config
    };
    
    this.loadBalancerState = {
      currentIndex: 0,
      connectionCounts: new Map(),
      responseTimes: new Map()
    };
    
    this.initializeProviders();
    this.startHealthChecks();
    this.startCacheCleanup();
    
    runtimeLogger.info('🚀 Streamlined Portal Manager initialized with top 5 providers');
  }
  
  /**
   * Initialize the top 5 providers
   */
  private async initializeProviders(): Promise<void> {
    const enabledProviders = Object.entries(this.config.providers)
      .filter(([_, config]) => config?.enabled)
      .sort(([_, a], [__, b]) => (a?.priority || 5) - (b?.priority || 5))
      .map(([provider]) => provider as StreamlinedProvider);
    
    for (const provider of enabledProviders) {
      try {
        const portal = await this.createProviderPortal(provider);
        this.portals.set(provider, portal);
        this.availableProviders.push(provider);
        
        // Initialize circuit breaker
        this.circuitBreakers.set(provider, {
          provider,
          failures: 0,
          lastFailure: 0,
          state: 'closed',
          nextRetry: 0
        });
        
        // Initialize health status
        this.providerHealth.set(provider, {
          provider,
          status: 'healthy',
          responseTime: 0,
          successRate: 1.0,
          lastCheck: Date.now(),
          errorCount: 0
        });
        
        // Initialize load balancer state
        this.loadBalancerState.connectionCounts.set(provider, 0);
        this.loadBalancerState.responseTimes.set(provider, []);
        
        runtimeLogger.info(`✅ Provider ${provider} initialized successfully`);
      } catch (error) {
        runtimeLogger.error(`❌ Failed to initialize provider ${provider}:`, error);
      }
    }
    
    if (this.availableProviders.length === 0) {
      throw new Error('No providers could be initialized');
    }
    
    runtimeLogger.info(`🎯 ${this.availableProviders.length} providers ready: ${this.availableProviders.join(', ')}`);  }

  
  /**
   * Create a portal for a specific provider
   */
  private async createProviderPortal(provider: StreamlinedProvider): Promise<Portal> {
    const providerConfig = this.config.providers[provider];
    if (!providerConfig) {
      throw new Error(`No configuration found for provider ${provider}`);
    }
    
    // Import and create the appropriate portal
    switch (provider) {
      case StreamlinedProvider.OPENAI: {
        const { createOpenAIPortal } = await import('./openai/index');
        return createOpenAIPortal({
          apiKey: providerConfig.apiKey || process.env.OPENAI_API_KEY,
          model: providerConfig.models.chat,
          toolModel: providerConfig.models.tool,
          ...this.config
        });
      }
      
      case StreamlinedProvider.ANTHROPIC: {
        const { createAnthropicPortal } = await import('./anthropic/index');
        return createAnthropicPortal({
          apiKey: providerConfig.apiKey || process.env.ANTHROPIC_API_KEY,
          model: providerConfig.models.chat,
          toolModel: providerConfig.models.tool,
          ...this.config
        });
      }
      
      case StreamlinedProvider.GROQ: {
        const { createGroqPortal } = await import('./groq/index');
        return createGroqPortal({
          apiKey: providerConfig.apiKey || process.env.GROQ_API_KEY,
          model: providerConfig.models.chat,
          toolModel: providerConfig.models.tool,
          ...this.config
        });
      }
      
      case StreamlinedProvider.GOOGLE: {
        const { createGoogleGenerativePortal } = await import('./google-generative/index');
        return createGoogleGenerativePortal({
          apiKey: providerConfig.apiKey || process.env.GOOGLE_API_KEY,
          model: providerConfig.models.chat,
          toolModel: providerConfig.models.tool,
          ...this.config
        });
      }
      
      case StreamlinedProvider.OLLAMA: {
        const { createOllamaPortal } = await import('./ollama/index');
        return createOllamaPortal({
          baseUrl: providerConfig.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: providerConfig.models.chat,
          toolModel: providerConfig.models.tool,
          ...this.config
        });
      }
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  /**
   * Generate chat response with automatic failover and caching
   */
  async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    const cacheKey = this.generateCacheKey('chat', messages, options);
    
    // Check cache first
    if (this.config.caching.enabled) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        runtimeLogger.debug('📦 Cache hit for chat request');
        return cached as ChatGenerationResult;
      }
    }
    
    // Select provider using load balancing
    const provider = this.selectProvider();
    
    try {
      const result = await this.executeWithFailover(
        async (selectedProvider: StreamlinedProvider) => {
          const portal = this.getPortalFromPool(selectedProvider);
          const startTime = Date.now();
          
          try {
            const response = await portal.generateChat(messages, options);
            
            // Record success metrics
            this.recordSuccess(selectedProvider, Date.now() - startTime);
            
            return response;
          } finally {
            this.returnPortalToPool(selectedProvider, portal);
          }
        },
        provider
      );
      
      // Cache the response
      if (this.config.caching.enabled) {
        this.cacheResponse(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      runtimeLogger.error('❌ Chat generation failed after all retries:', error);
      throw error;
    }
  }
  
  /**
   * Generate text response with automatic failover and caching
   */
  async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const cacheKey = this.generateCacheKey('text', prompt, options);
    
    // Check cache first
    if (this.config.caching.enabled) {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        runtimeLogger.debug('📦 Cache hit for text request');
        return cached as TextGenerationResult;
      }
    }
    
    // Select provider using load balancing
    const provider = this.selectProvider();
    
    try {
      const result = await this.executeWithFailover(
        async (selectedProvider: StreamlinedProvider) => {
          const portal = this.getPortalFromPool(selectedProvider);
          const startTime = Date.now();
          
          try {
            const response = await portal.generateText(prompt, options);
            
            // Record success metrics
            this.recordSuccess(selectedProvider, Date.now() - startTime);
            
            return response;
          } finally {
            this.returnPortalToPool(selectedProvider, portal);
          }
        },
        provider
      );
      
      // Cache the response
      if (this.config.caching.enabled) {
        this.cacheResponse(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      runtimeLogger.error('❌ Text generation failed after all retries:', error);
      throw error;
    }
  }
  
  /**
   * Execute request with automatic failover
   */
  private async executeWithFailover<T>(
    operation: (provider: StreamlinedProvider) => Promise<T>,
    initialProvider: StreamlinedProvider
  ): Promise<T> {
    if (!this.config.failover.enabled) {
      return operation(initialProvider);
    }
    
    let lastError: Error | null = null;
    const attemptedProviders = new Set<StreamlinedProvider>();
    let currentProvider = initialProvider;
    
    for (let attempt = 0; attempt < this.config.failover.maxRetries; attempt++) {
      // Skip if circuit breaker is open
      if (this.isCircuitBreakerOpen(currentProvider)) {
        runtimeLogger.warn(`⚡ Circuit breaker open for ${currentProvider}, trying next provider`);
        currentProvider = this.getNextProvider(attemptedProviders);
        if (!currentProvider) break;
        continue;
      }
      
      try {
        const result = await operation(currentProvider);
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(currentProvider);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        attemptedProviders.add(currentProvider);
        
        // Record failure
        this.recordFailure(currentProvider, lastError);
        
        runtimeLogger.warn(`⚠️ Provider ${currentProvider} failed (attempt ${attempt + 1}):`, error);
        
        // Try next provider
        currentProvider = this.getNextProvider(attemptedProviders);
        if (!currentProvider) break;
        
        // Wait before retry
        if (attempt < this.config.failover.maxRetries - 1) {
          await this.delay(this.config.failover.retryDelay);
        }
      }
    }
    
    throw lastError || new Error('All providers failed');
  }
  
  /**
   * Select provider using load balancing strategy
   */
  private selectProvider(): StreamlinedProvider {
    const healthyProviders = this.availableProviders.filter(provider => {
      const health = this.providerHealth.get(provider);
      return health?.status !== 'unhealthy' && !this.isCircuitBreakerOpen(provider);
    });
    
    if (healthyProviders.length === 0) {
      // Fallback to any available provider
      return this.availableProviders[0];
    }
    
    switch (this.config.loadBalancing.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(healthyProviders);
      
      case 'weighted':
        return this.selectWeighted(healthyProviders);
      
      case 'least-connections':
        return this.selectLeastConnections(healthyProviders);
      
      case 'response-time':
        return this.selectFastestResponseTime(healthyProviders);
      
      default:
        return healthyProviders[0];
    }
  }
  
  /**
   * Round-robin provider selection
   */
  private selectRoundRobin(providers: StreamlinedProvider[]): StreamlinedProvider {
    const provider = providers[this.loadBalancerState.currentIndex % providers.length];
    this.loadBalancerState.currentIndex = (this.loadBalancerState.currentIndex + 1) % providers.length;
    return provider;
  }
  
  /**
   * Weighted provider selection based on priority
   */
  private selectWeighted(providers: StreamlinedProvider[]): StreamlinedProvider {
    // Calculate weights based on priority (lower priority = higher weight)
    const weights = providers.map(provider => {
      const config = this.config.providers[provider];
      const priority = config?.priority || 5;
      return { provider, weight: 6 - priority }; // Invert priority to weight
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const { provider, weight } of weights) {
      currentWeight += weight;
      if (random <= currentWeight) {
        return provider;
      }
    }
    
    return providers[0];
  }
  
  /**
   * Select provider with least connections
   */
  private selectLeastConnections(providers: StreamlinedProvider[]): StreamlinedProvider {
    let minConnections = Infinity;
    let selectedProvider = providers[0];
    
    for (const provider of providers) {
      const connections = this.loadBalancerState.connectionCounts.get(provider) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedProvider = provider;
      }
    }
    
    return selectedProvider;
  }
  
  /**
   * Select provider with fastest average response time
   */
  private selectFastestResponseTime(providers: StreamlinedProvider[]): StreamlinedProvider {
    let fastestTime = Infinity;
    let selectedProvider = providers[0];
    
    for (const provider of providers) {
      const responseTimes = this.loadBalancerState.responseTimes.get(provider) || [];
      if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        if (avgTime < fastestTime) {
          fastestTime = avgTime;
          selectedProvider = provider;
        }
      }
    }
    
    return selectedProvider;
  }
  
  /**
   * Get next available provider for failover
   */
  private getNextProvider(attempted: Set<StreamlinedProvider>): StreamlinedProvider | null {
    for (const provider of this.availableProviders) {
      if (!attempted.has(provider) && !this.isCircuitBreakerOpen(provider)) {
        return provider;
      }
    }
    return null;
  }
  
  /**
   * Get portal from connection pool
   */
  private getPortalFromPool(provider: StreamlinedProvider): Portal {
    if (!this.config.connectionPool.enabled) {
      return this.portals.get(provider)!;
    }
    
    // Find available connection
    const poolKey = `${provider}_${Date.now()}`;
    const existingConnection = Array.from(this.connectionPool.values())
      .find(conn => conn.provider === provider && !conn.inUse);
    
    if (existingConnection) {
      existingConnection.inUse = true;
      existingConnection.lastUsed = Date.now();
      existingConnection.requestCount++;
      
      // Update connection count
      const currentCount = this.loadBalancerState.connectionCounts.get(provider) || 0;
      this.loadBalancerState.connectionCounts.set(provider, currentCount + 1);
      
      return existingConnection.portal;
    }
    
    // Create new connection if under limit
    const activeConnections = Array.from(this.connectionPool.values())
      .filter(conn => conn.provider === provider).length;
    
    if (activeConnections < this.config.connectionPool.maxConnections) {
      const portal = this.portals.get(provider)!;
      const connection: PooledConnection = {
        provider,
        portal,
        inUse: true,
        created: Date.now(),
        lastUsed: Date.now(),
        requestCount: 1
      };
      
      this.connectionPool.set(poolKey, connection);
      
      // Update connection count
      const currentCount = this.loadBalancerState.connectionCounts.get(provider) || 0;
      this.loadBalancerState.connectionCounts.set(provider, currentCount + 1);
      
      return portal;
    }
    
    // Fallback to direct portal access
    return this.portals.get(provider)!;
  }
  
  /**
   * Return portal to connection pool
   */
  private returnPortalToPool(provider: StreamlinedProvider, portal: Portal): void {
    if (!this.config.connectionPool.enabled) return;
    
    // Find and release the connection
    for (const [key, connection] of this.connectionPool.entries()) {
      if (connection.provider === provider && connection.portal === portal && connection.inUse) {
        connection.inUse = false;
        connection.lastUsed = Date.now();
        
        // Update connection count
        const currentCount = this.loadBalancerState.connectionCounts.get(provider) || 0;
        this.loadBalancerState.connectionCounts.set(provider, Math.max(0, currentCount - 1));
        
        break;
      }
    }
  }
  
  /**
   * Generate cache key for request
   */
  private generateCacheKey(
    type: 'chat' | 'text',
    content: ChatMessage[] | string,
    options?: any
  ): string {
    const contentHash = this.hashContent(content);
    const optionsHash = this.hashContent(options || {});
    return `${type}_${contentHash}_${optionsHash}`;
  }
  
  /**
   * Simple hash function for content
   */
  private hashContent(content: any): string {
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Get cached response
   */
  private getCachedResponse(key: string): ChatGenerationResult | TextGenerationResult | null {
    const entry = this.responseCache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.responseCache.delete(key);
      return null;
    }
    
    // Update access info
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.response;
  }
  
  /**
   * Cache response
   */
  private cacheResponse(key: string, response: ChatGenerationResult | TextGenerationResult): void {
    // Check cache size limit
    if (this.responseCache.size >= this.config.caching.maxSize) {
      this.evictOldestCacheEntry();
    }
    
    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      ttl: this.config.caching.ttl,
      accessCount: 1,
      lastAccessed: Date.now()
    };
    
    this.responseCache.set(key, entry);
  }
  
  /**
   * Evict oldest cache entry
   */
  private evictOldestCacheEntry(): void {
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.responseCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.responseCache.delete(oldestKey);
    }
  }
  
  /**
   * Invalidate cache based on patterns
   */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.responseCache.clear();
      runtimeLogger.info('🗑️ Cache cleared completely');
      return;
    }
    
    const keysToDelete: string[] = [];
    for (const key of this.responseCache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.responseCache.delete(key);
    }
    
    runtimeLogger.info(`🗑️ Cache invalidated for pattern: ${pattern} (${keysToDelete.length} entries)`);
  }
  
  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(provider: StreamlinedProvider): boolean {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      if (Date.now() > breaker.nextRetry) {
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Record provider failure
   */
  private recordFailure(provider: StreamlinedProvider, error: Error): void {
    const breaker = this.circuitBreakers.get(provider);
    if (!breaker) return;
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    // Open circuit breaker if threshold reached
    if (breaker.failures >= this.config.failover.circuitBreakerThreshold) {
      breaker.state = 'open';
      breaker.nextRetry = Date.now() + this.config.failover.circuitBreakerTimeout;
      runtimeLogger.warn(`⚡ Circuit breaker opened for ${provider} after ${breaker.failures} failures`);
    }
    
    // Update health status
    const health = this.providerHealth.get(provider);
    if (health) {
      health.errorCount++;
      health.status = health.errorCount > 5 ? 'unhealthy' : 'degraded';
    }
  }
  
  /**
   * Record provider success
   */
  private recordSuccess(provider: StreamlinedProvider, responseTime: number): void {
    // Update response times
    const responseTimes = this.loadBalancerState.responseTimes.get(provider) || [];
    responseTimes.push(responseTime);
    
    // Keep only last 10 response times
    if (responseTimes.length > 10) {
      responseTimes.shift();
    }
    
    this.loadBalancerState.responseTimes.set(provider, responseTimes);
    
    // Update health status
    const health = this.providerHealth.get(provider);
    if (health) {
      health.responseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      health.status = 'healthy';
      health.errorCount = Math.max(0, health.errorCount - 1);
      health.lastCheck = Date.now();
    }
  }
  
  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(provider: StreamlinedProvider): void {
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      breaker.nextRetry = 0;
    }
  }
  
  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.loadBalancing.healthCheckInterval);
  }
  
  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.availableProviders.map(async (provider) => {
      try {
        const startTime = Date.now();
        const portal = this.portals.get(provider);
        
        if (!portal) return;
        
        // Simple health check - generate a short text
        await portal.generateText('Health check', {
          maxOutputTokens: 10,
          temperature: 0
        });
        
        const responseTime = Date.now() - startTime;
        
        // Update health status
        const health = this.providerHealth.get(provider);
        if (health) {
          health.status = 'healthy';
          health.responseTime = responseTime;
          health.lastCheck = Date.now();
        }
        
      } catch (error) {
        // Update health status on failure
        const health = this.providerHealth.get(provider);
        if (health) {
          health.status = 'unhealthy';
          health.errorCount++;
          health.lastCheck = Date.now();
        }
        
        runtimeLogger.warn(`🏥 Health check failed for ${provider}:`, error);
      }
    });
    
    await Promise.allSettled(healthCheckPromises);
  }
  
  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
      this.cleanupIdleConnections();
    }, 60000); // Every minute
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.responseCache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.responseCache.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      runtimeLogger.debug(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
  
  /**
   * Clean up idle connections
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const idleKeys: string[] = [];
    
    for (const [key, connection] of this.connectionPool.entries()) {
      if (!connection.inUse && now - connection.lastUsed > this.config.connectionPool.idleTimeout) {
        idleKeys.push(key);
      }
    }
    
    for (const key of idleKeys) {
      this.connectionPool.delete(key);
    }
    
    if (idleKeys.length > 0) {
      runtimeLogger.debug(`🧹 Cleaned up ${idleKeys.length} idle connections`);
    }
  }
  
  /**
   * Get provider statistics
   */
  getProviderStats(): Record<StreamlinedProvider, any> {
    const stats: Record<string, any> = {};
    
    for (const provider of this.availableProviders) {
      const health = this.providerHealth.get(provider);
      const breaker = this.circuitBreakers.get(provider);
      const connections = this.loadBalancerState.connectionCounts.get(provider) || 0;
      const responseTimes = this.loadBalancerState.responseTimes.get(provider) || [];
      
      stats[provider] = {
        health: health?.status || 'unknown',
        responseTime: health?.responseTime || 0,
        errorCount: health?.errorCount || 0,
        successRate: health?.successRate || 0,
        circuitBreakerState: breaker?.state || 'closed',
        activeConnections: connections,
        averageResponseTime: responseTimes.length > 0 
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
          : 0,
        requestCount: Array.from(this.connectionPool.values())
          .filter(conn => conn.provider === provider)
          .reduce((sum, conn) => sum + conn.requestCount, 0)
      };
    }
    
    return stats;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
  } {
    let totalRequests = 0;
    let totalHits = 0;
    
    for (const entry of this.responseCache.values()) {
      totalRequests += entry.accessCount;
      if (entry.accessCount > 1) {
        totalHits += entry.accessCount - 1;
      }
    }
    
    return {
      size: this.responseCache.size,
      maxSize: this.config.caching.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalRequests,
      totalHits
    };
  }
  
  /**
   * Shutdown the portal manager
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    this.responseCache.clear();
    this.connectionPool.clear();
    
    runtimeLogger.info('🛑 Streamlined Portal Manager shutdown complete');
  }
  
  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create streamlined portal manager
 */
export function createStreamlinedPortalManager(config: StreamlinedPortalConfig): StreamlinedPortalManager {
  return new StreamlinedPortalManager(config);
}

/**
 * Default configuration for top 5 providers
 */
export const defaultStreamlinedConfig: Partial<StreamlinedPortalConfig> = {
  providers: {
    [StreamlinedProvider.OPENAI]: {
      enabled: true,
      priority: 1,
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
    [StreamlinedProvider.ANTHROPIC]: {
      enabled: true,
      priority: 2,
      models: {
        chat: 'claude-3-5-haiku-20241022',
        tool: 'claude-3-5-haiku-20241022'
      },
      rateLimit: {
        requestsPerMinute: 300,
        tokensPerMinute: 100000
      }
    },
    [StreamlinedProvider.GROQ]: {
      enabled: true,
      priority: 3,
      models: {
        chat: 'llama-3.1-8b-instant',
        tool: 'llama-3.1-8b-instant'
      },
      rateLimit: {
        requestsPerMinute: 1000,
        tokensPerMinute: 200000
      }
    },
    [StreamlinedProvider.GOOGLE]: {
      enabled: true,
      priority: 4,
      models: {
        chat: 'gemini-1.5-flash',
        tool: 'gemini-1.5-flash'
      },
      rateLimit: {
        requestsPerMinute: 400,
        tokensPerMinute: 120000
      }
    },
    [StreamlinedProvider.OLLAMA]: {
      enabled: false, // Disabled by default, enable for local usage
      priority: 5,
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
  
  // Failover configuration
  failover: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 30000
  },
  
  // Caching configuration
  caching: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 1000,
    invalidationPatterns: ['user_context_changed', 'model_updated']
  },
  
  // Connection pooling
  connectionPool: {
    enabled: true,
    maxConnections: 10,
    connectionTimeout: 5000,
    idleTimeout: 300000, // 5 minutes
    keepAlive: true
  },
  
  // Load balancing
  loadBalancing: {
    strategy: 'weighted',
    healthCheckInterval: 30000, // 30 seconds
    healthCheckTimeout: 5000
  }
};