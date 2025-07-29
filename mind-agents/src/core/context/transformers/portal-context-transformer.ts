/**
 * Portal Context Transformer
 * 
 * Transforms unified context into AI portal-specific format,
 * optimizing for AI model consumption and response generation.
 */

import {
  ContextTransformer,
  UnifiedContext,
  TransformationResult,
  TransformationTarget,
  TransformationStrategy,
  TransformationConfig,
  ValidationResult,
  ValidationConfig,
  TransformerCapabilities,
  TransformationMetadata,
  TransformationPerformance
} from '../../../types/context/context-transformation.js';
import { PortalContext } from '../../../types/context.js';
import { runtimeLogger } from '../../../utils/logger.js';

/**
 * AI Portal-specific context format
 */
export interface EnhancedPortalContext extends PortalContext {
  // Core identification
  agentId: string;
  sessionId: string;
  contextId: string;
  
  // Content optimization
  optimizedContent: string;
  contentSummary: string;
  keyPoints: string[];
  
  // Conversation flow
  conversationPhase: 'greeting' | 'information_gathering' | 'processing' | 'response' | 'closing';
  messageHistory: OptimizedMessage[];
  conversationTone: 'formal' | 'casual' | 'professional' | 'friendly' | 'technical';
  
  // AI-specific context
  modelInstructions: ModelInstruction[];
  responseConstraints: ResponseConstraint[];
  outputFormat: OutputFormat;
  
  // Cognitive context for AI
  reasoningRequired: boolean;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert';
  domainContext: string[];
  
  // Memory and history
  relevantHistory: HistoryEntry[];
  contextualMemories: ContextualMemory[];
  
  // Performance optimization
  tokenOptimization: TokenOptimization;
  processingHints: ProcessingHint[];
  
  // Response guidance
  responseStyle: ResponseStyle;
  expectedLength: 'brief' | 'moderate' | 'detailed' | 'comprehensive';
  includeCitations: boolean;
  
  // Multi-modal support
  multiModalContext?: MultiModalContext;
  
  // Error handling
  fallbackInstructions: string[];
  errorRecovery: ErrorRecoveryStrategy;
}

export interface OptimizedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  importance: number; // 0-1
  summary?: string;
  emotions?: string[];
  intent?: MessageIntent;
  tokens?: number;
}

export interface MessageIntent {
  primary: string;
  secondary?: string;
  confidence: number;
  requires_response: boolean;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
}

export interface ModelInstruction {
  type: 'system' | 'behavior' | 'format' | 'constraint';
  instruction: string;
  priority: number; // 0-1
  condition?: string;
}

export interface ResponseConstraint {
  type: 'length' | 'format' | 'content' | 'tone' | 'accuracy';
  constraint: string;
  strictness: 'flexible' | 'preferred' | 'required';
  penalty: number; // Cost of violation
}

export interface OutputFormat {
  type: 'text' | 'json' | 'markdown' | 'html' | 'structured';
  schema?: Record<string, unknown>;
  template?: string;
  requirements: string[];
}

export interface HistoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  relevance: number; // 0-1
  category: 'conversation' | 'decision' | 'outcome' | 'context';
  impact: 'low' | 'medium' | 'high';
}

export interface ContextualMemory {
  id: string;
  content: string;
  type: 'fact' | 'preference' | 'pattern' | 'relationship';
  confidence: number; // 0-1
  lastAccessed: Date;
  accessCount: number;
  relevance: number; // 0-1
}

export interface TokenOptimization {
  maxTokens: number;
  reservedTokens: number;
  compressionLevel: 'none' | 'light' | 'moderate' | 'aggressive';
  priorityFields: string[];
  optionalFields: string[];
}

export interface ProcessingHint {
  hint: string;
  type: 'performance' | 'accuracy' | 'efficiency' | 'quality';
  applicability: string[]; // Model names or types
}

export interface ResponseStyle {
  personality: string[];
  tone: string;
  formality: number; // 0-1
  creativity: number; // 0-1
  verbosity: number; // 0-1
  technicalLevel: number; // 0-1
  empathy: number; // 0-1
}

export interface MultiModalContext {
  hasImages: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  imageDescriptions?: string[];
  audioTranscripts?: string[];
  videoSummaries?: string[];
}

export interface ErrorRecoveryStrategy {
  fallbackResponse: string;
  retryInstructions: string[];
  escalationPath: string[];
  userNotification: string;
}

/**
 * Portal Context Transformer implementation
 */
export class PortalContextTransformer implements ContextTransformer<UnifiedContext, EnhancedPortalContext> {
  readonly id = 'portal-context-transformer';
  readonly version = '1.0.0';
  readonly target = TransformationTarget.PORTAL;
  readonly supportedStrategies = [
    TransformationStrategy.FULL,
    TransformationStrategy.SELECTIVE,
    TransformationStrategy.OPTIMIZED,
    TransformationStrategy.CACHED,
    TransformationStrategy.STREAMING
  ];
  readonly reversible = true;

  private transformationCache = new Map<string, TransformationResult<EnhancedPortalContext>>();

  /**
   * Transform unified context to portal format
   */
  async transform(
    context: UnifiedContext,
    config?: TransformationConfig
  ): Promise<TransformationResult<EnhancedPortalContext>> {
    const startTime = performance.now();
    
    try {
      // Check cache first
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        const cached = this.transformationCache.get(cacheKey);
        if (cached) {
          runtimeLogger.debug(`Cache hit for portal transformation: ${cacheKey}`);
          return {
            ...cached,
            cached: true
          };
        }
      }

      // Determine strategy
      const strategy = config?.strategy || TransformationStrategy.OPTIMIZED;
      
      // Transform based on strategy
      const transformedContext = await this.performTransformation(context, strategy, config);
      
      // Calculate performance metrics
      const duration = performance.now() - startTime;
      const inputSize = JSON.stringify(context).length;
      const outputSize = JSON.stringify(transformedContext).length;
      
      const metadata: TransformationMetadata = {
        transformerId: this.id,
        transformerVersion: this.version,
        timestamp: new Date(),
        inputSize,
        outputSize,
        fieldsTransformed: this.getTransformedFields(strategy),
        fieldsDropped: this.getDroppedFields(strategy),
        fieldsAdded: this.getAddedFields(),
        validationPassed: true,
        cacheHit: false
      };

      const performance: TransformationPerformance = {
        duration,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        cacheHitRate: 0,
        compressionRatio: inputSize / outputSize,
        throughput: outputSize / duration
      };

      const result: TransformationResult<EnhancedPortalContext> = {
        success: true,
        transformedContext,
        originalContext: context,
        target: this.target,
        strategy,
        operation: 'transform' as any,
        metadata,
        performance,
        reversible: this.reversible,
        cached: false
      };

      // Cache result if enabled
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        this.transformationCache.set(cacheKey, result);
      }

      runtimeLogger.debug(`Portal context transformation completed in ${duration.toFixed(2)}ms`);
      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeLogger.error('Portal context transformation failed', { error, duration });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transformedContext: {} as EnhancedPortalContext,
        originalContext: context,
        target: this.target,
        strategy: config?.strategy || TransformationStrategy.OPTIMIZED,
        operation: 'transform' as any,
        metadata: {
          transformerId: this.id,
          transformerVersion: this.version,
          timestamp: new Date(),
          inputSize: 0,
          outputSize: 0,
          fieldsTransformed: [],
          fieldsDropped: [],
          fieldsAdded: [],
          validationPassed: false,
          cacheHit: false
        },
        performance: {
          duration,
          memoryUsage: 0,
          cpuUsage: 0,
          cacheHitRate: 0,
          compressionRatio: 0,
          throughput: 0
        },
        reversible: false,
        cached: false
      };
    }
  }

  /**
   * Perform the actual transformation based on strategy
   */
  private async performTransformation(
    context: UnifiedContext,
    strategy: TransformationStrategy,
    config?: TransformationConfig
  ): Promise<EnhancedPortalContext> {
    const baseContext: EnhancedPortalContext = {
      // Legacy PortalContext fields
      sessionId: context.sessionId,
      userId: context.userId,
      timestamp: context.timestamp.toISOString(),
      systemPrompt: this.generateSystemPrompt(context),
      cognitiveContext: this.buildCognitiveContext(context),
      previousThoughts: this.extractPreviousThoughts(context),
      environment: {
        location: context.environment.location
      },
      events: this.extractEvents(context),

      // Enhanced fields
      agentId: context.agentId,
      contextId: context.contextId,
      optimizedContent: this.optimizeContent(context),
      contentSummary: this.generateContentSummary(context),
      keyPoints: this.extractKeyPoints(context),
      conversationPhase: this.determineConversationPhase(context),
      messageHistory: this.optimizeMessageHistory(context),
      conversationTone: this.determineConversationTone(context),
      modelInstructions: this.generateModelInstructions(context),
      responseConstraints: this.generateResponseConstraints(context),
      outputFormat: this.determineOutputFormat(context),
      reasoningRequired: this.determineReasoningRequired(context),
      complexityLevel: this.determineComplexityLevel(context),
      domainContext: this.extractDomainContext(context),
      relevantHistory: this.extractRelevantHistory(context),
      contextualMemories: this.extractContextualMemories(context),
      tokenOptimization: this.generateTokenOptimization(context),
      processingHints: this.generateProcessingHints(context),
      responseStyle: this.determineResponseStyle(context),
      expectedLength: this.determineExpectedLength(context),
      includeCitations: this.shouldIncludeCitations(context),
      multiModalContext: this.extractMultiModalContext(context),
      fallbackInstructions: this.generateFallbackInstructions(context),
      errorRecovery: this.generateErrorRecoveryStrategy(context)
    };

    // Apply strategy-specific optimizations
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return this.applyMinimalStrategy(baseContext);
      case TransformationStrategy.OPTIMIZED:
        return this.applyOptimizedStrategy(baseContext);
      case TransformationStrategy.STREAMING:
        return this.applyStreamingStrategy(baseContext);
      case TransformationStrategy.FULL:
        return this.applyFullStrategy(baseContext, context);
      default:
        return baseContext;
    }
  }

  /**
   * Generate system prompt from context
   */
  private generateSystemPrompt(context: UnifiedContext): string {
    const personality = context.extensionData?.['personality'] || 'helpful assistant';
    const constraints = context.environment.constraints || [];
    
    let prompt = `You are a ${personality}. `;
    
    if (constraints.length > 0) {
      prompt += `Please observe these constraints: ${constraints.join(', ')}. `;
    }
    
    prompt += `Current context: ${context.state.phase}. Engagement level: ${context.state.engagement}.`;
    
    return prompt;
  }

  /**
   * Build cognitive context for AI
   */
  private buildCognitiveContext(context: UnifiedContext): any {
    const cognitionData = context.cognitionData;
    
    return {
      thoughts: cognitionData?.thoughts || [],
      cognitiveConfidence: context.state.confidence
    };
  }

  /**
   * Extract previous thoughts
   */
  private extractPreviousThoughts(context: UnifiedContext): string {
    const thoughts = context.cognitionData?.thoughts || [];
    return thoughts.slice(-3).join(' → ');
  }

  /**
   * Extract events for portal context
   */
  private extractEvents(context: UnifiedContext): unknown[] {
    // Convert context events to portal-compatible format
    return [];
  }

  /**
   * Optimize content for AI consumption
   */
  private optimizeContent(context: UnifiedContext): string {
    let content = context.content;
    
    // Remove redundant information
    content = content.replace(/\s+/g, ' ').trim();
    
    // Add structure markers for AI parsing
    if (context.messages.length > 0) {
      const lastMessage = context.messages[context.messages.length - 1];
      content = `[Current Message] ${lastMessage.content}\n[Full Context] ${content}`;
    }
    
    return content;
  }

  /**
   * Generate content summary
   */
  private generateContentSummary(context: UnifiedContext): string {
    if (context.messages.length === 0) return context.content.slice(0, 200);
    
    const recentMessages = context.messages.slice(-3);
    return recentMessages.map(m => `${m.from}: ${m.content.slice(0, 50)}`).join('; ');
  }

  /**
   * Extract key points from context
   */
  private extractKeyPoints(context: UnifiedContext): string[] {
    const points: string[] = [];
    
    // Extract from current state
    if (context.state.phase !== 'initialization') {
      points.push(`Phase: ${context.state.phase}`);
    }
    
    // Extract from messages
    if (context.messages.length > 0) {
      const lastMessage = context.messages[context.messages.length - 1];
      if (lastMessage.intent) {
        points.push(`Intent: ${lastMessage.intent}`);
      }
    }
    
    // Extract from environment
    if (context.environment.capabilities?.length) {
      points.push(`Capabilities: ${context.environment.capabilities.slice(0, 3).join(', ')}`);
    }
    
    return points;
  }

  /**
   * Determine conversation phase
   */
  private determineConversationPhase(context: UnifiedContext): 'greeting' | 'information_gathering' | 'processing' | 'response' | 'closing' {
    const phase = context.state.phase;
    
    switch (phase) {
      case 'initialization':
        return 'greeting';
      case 'active':
        return context.messages.length < 3 ? 'information_gathering' : 'processing';
      case 'processing':
        return 'processing';
      case 'waiting':
        return 'response';
      case 'complete':
        return 'closing';
      default:
        return 'processing';
    }
  }

  /**
   * Optimize message history for AI consumption
   */
  private optimizeMessageHistory(context: UnifiedContext): OptimizedMessage[] {
    return context.messages.map((msg, index) => ({
      id: msg.id,
      role: msg.type === 'user' ? 'user' : msg.type === 'agent' ? 'assistant' : 'system',
      content: msg.content,
      timestamp: msg.timestamp,
      importance: this.calculateMessageImportance(msg, index, context.messages.length),
      summary: msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : undefined,
      emotions: msg.emotions,
      intent: msg.intent ? {
        primary: msg.intent,
        confidence: 0.8,
        requires_response: msg.content.includes('?'),
        urgency: 'normal' as const
      } : undefined,
      tokens: this.estimateTokens(msg.content)
    }));
  }

  /**
   * Calculate message importance
   */
  private calculateMessageImportance(message: any, index: number, total: number): number {
    let importance = 0.5;
    
    // Recent messages are more important
    const recency = (index + 1) / total;
    importance += recency * 0.3;
    
    // Messages with questions are important
    if (message.content.includes('?')) {
      importance += 0.2;
    }
    
    // Messages with emotions are important
    if (message.emotions?.length) {
      importance += 0.1;
    }
    
    return Math.min(importance, 1.0);
  }

  /**
   * Determine conversation tone
   */
  private determineConversationTone(context: UnifiedContext): 'formal' | 'casual' | 'professional' | 'friendly' | 'technical' {
    const emotionData = context.emotionData;
    const messages = context.messages;
    
    if (messages.some(m => m.content.includes('please') || m.content.includes('thank you'))) {
      return 'professional';
    }
    
    if (emotionData?.currentEmotions.some(e => e.emotion === 'happy')) {
      return 'friendly';
    }
    
    // Default based on domain context
    const technical_terms = ['API', 'database', 'algorithm', 'function', 'class'];
    const hastech = messages.some(m => 
      technical_terms.some(term => m.content.toLowerCase().includes(term.toLowerCase()))
    );
    
    return hastech ? 'technical' : 'casual';
  }

  /**
   * Generate model instructions
   */
  private generateModelInstructions(context: UnifiedContext): ModelInstruction[] {
    const instructions: ModelInstruction[] = [];
    
    // Base instruction
    instructions.push({
      type: 'system',
      instruction: 'Respond naturally and helpfully to the user',
      priority: 1.0
    });
    
    // Emotional context instructions
    if (context.emotionData?.currentEmotions.length) {
      const primaryEmotion = context.emotionData.currentEmotions[0];
      instructions.push({
        type: 'behavior',
        instruction: `Be aware that the user may be feeling ${primaryEmotion.emotion}`,
        priority: 0.8
      });
    }
    
    // Complexity-based instructions
    if (context.state.complexity > 0.7) {
      instructions.push({
        type: 'behavior',
        instruction: 'This is a complex topic. Break down your response into clear, digestible parts.',
        priority: 0.9
      });
    }
    
    return instructions;
  }

  /**
   * Generate response constraints
   */
  private generateResponseConstraints(context: UnifiedContext): ResponseConstraint[] {
    const constraints: ResponseConstraint[] = [];
    
    // Length constraint based on context
    if (context.messages.length > 10) {
      constraints.push({
        type: 'length',
        constraint: 'Keep responses concise due to long conversation',
        strictness: 'preferred',
        penalty: 0.2
      });
    }
    
    // Content constraints from environment
    if (context.environment.constraints?.length) {
      context.environment.constraints.forEach(constraint => {
        constraints.push({
          type: 'content',
          constraint: constraint,
          strictness: 'required',
          penalty: 1.0
        });
      });
    }
    
    return constraints;
  }

  /**
   * Determine output format
   */
  private determineOutputFormat(context: UnifiedContext): OutputFormat {
    // Check if structured output is requested
    const lastMessage = context.messages[context.messages.length - 1];
    if (lastMessage?.content.includes('JSON') || lastMessage?.content.includes('structured')) {
      return {
        type: 'json',
        requirements: ['valid JSON format'],
        schema: { type: 'object' }
      };
    }
    
    return {
      type: 'text',
      requirements: ['natural language', 'helpful tone']
    };
  }

  /**
   * Apply transformation strategies
   */
  private applyMinimalStrategy(context: EnhancedPortalContext): EnhancedPortalContext {
    return {
      ...context,
      messageHistory: context.messageHistory.slice(-5), // Keep only last 5 messages
      relevantHistory: context.relevantHistory.slice(-3), // Keep only last 3 history entries
      contextualMemories: context.contextualMemories
        .filter(m => m.relevance > 0.7)
        .slice(0, 5), // Keep only highly relevant memories
      processingHints: context.processingHints.slice(0, 3) // Keep top 3 hints
    };
  }

  private applyOptimizedStrategy(context: EnhancedPortalContext): EnhancedPortalContext {
    return {
      ...context,
      messageHistory: context.messageHistory
        .filter(m => m.importance > 0.6)
        .slice(-10), // Keep important recent messages
      contextualMemories: context.contextualMemories
        .filter(m => m.relevance > 0.5 && m.confidence > 0.6)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10),
      tokenOptimization: {
        ...context.tokenOptimization,
        compressionLevel: 'moderate'
      }
    };
  }

  private applyStreamingStrategy(context: EnhancedPortalContext): EnhancedPortalContext {
    return {
      ...context,
      tokenOptimization: {
        ...context.tokenOptimization,
        compressionLevel: 'aggressive',
        maxTokens: Math.floor(context.tokenOptimization.maxTokens * 0.8)
      },
      messageHistory: context.messageHistory.slice(-3), // Minimal history for streaming
      processingHints: [
        ...context.processingHints,
        {
          hint: 'Enable streaming response',
          type: 'performance',
          applicability: ['all']
        }
      ]
    };
  }

  private applyFullStrategy(context: EnhancedPortalContext, original: UnifiedContext): EnhancedPortalContext {
    // Include all available data with enrichments
    return {
      ...context,
      // Add comprehensive context enrichment here
    };
  }

  /**
   * Validation implementation
   */
  async validate(
    context: EnhancedPortalContext,
    config?: ValidationConfig
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate required fields
    if (!context.agentId) {
      errors.push({
        field: 'agentId',
        message: 'Agent ID is required',
        severity: 'critical',
        code: 'MISSING_AGENT_ID'
      });
    }

    if (!context.systemPrompt) {
      warnings.push({
        field: 'systemPrompt',
        message: 'System prompt is recommended',
        code: 'MISSING_SYSTEM_PROMPT'
      });
    }

    // Validate token optimization
    if (context.tokenOptimization.maxTokens <= 0) {
      errors.push({
        field: 'tokenOptimization.maxTokens',
        message: 'Max tokens must be positive',
        severity: 'high',
        code: 'INVALID_MAX_TOKENS'
      });
    }

    const score = errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.5;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
      timestamp: new Date()
    };
  }

  /**
   * Get transformer capabilities
   */
  getCapabilities(): TransformerCapabilities {
    return {
      target: this.target,
      strategies: this.supportedStrategies,
      reversible: this.reversible,
      cacheable: true,
      streamable: true,
      batchable: true,
      maxInputSize: 50 * 1024 * 1024, // 50MB
      minInputSize: 10, // 10 bytes
      supportedFormats: ['json', 'text'],
      dependencies: ['portal-integration'],
      performance: {
        averageDuration: 10, // ms
        memoryUsage: 1024 * 1024, // 1MB
        throughput: 2000 // contexts per second
      }
    };
  }

  /**
   * Helper methods
   */
  private generateCacheKey(context: UnifiedContext, config?: TransformationConfig): string {
    const keyData = {
      contextId: context.contextId,
      version: context.version,
      strategy: config?.strategy,
      messageCount: context.messages.length,
      timestamp: Math.floor(context.timestamp.getTime() / 60000)
    };
    return `portal_${JSON.stringify(keyData)}`;
  }

  private getTransformedFields(strategy: TransformationStrategy): string[] {
    const baseFields = [
      'agentId', 'systemPrompt', 'optimizedContent', 'messageHistory',
      'modelInstructions', 'responseConstraints', 'tokenOptimization'
    ];
    
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return baseFields.slice(0, 4);
      case TransformationStrategy.FULL:
        return [...baseFields, 'relevantHistory', 'contextualMemories', 'multiModalContext'];
      default:
        return baseFields;
    }
  }

  private getDroppedFields(strategy: TransformationStrategy): string[] {
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return ['relevantHistory', 'contextualMemories', 'processingHints'];
      case TransformationStrategy.STREAMING:
        return ['relevantHistory', 'multiModalContext'];
      default:
        return [];
    }
  }

  private getAddedFields(): string[] {
    return [
      'optimizedContent', 'contentSummary', 'keyPoints', 'conversationPhase',
      'modelInstructions', 'responseConstraints', 'tokenOptimization', 'processingHints'
    ];
  }

  // Additional helper methods for context extraction
  private determineReasoningRequired(context: UnifiedContext): boolean {
    return context.state.complexity > 0.6 || 
           (context.cognitionData?.reasoningChain?.length || 0) > 0;
  }

  private determineComplexityLevel(context: UnifiedContext): 'simple' | 'moderate' | 'complex' | 'expert' {
    const complexity = context.state.complexity;
    if (complexity < 0.3) return 'simple';
    if (complexity < 0.6) return 'moderate';
    if (complexity < 0.8) return 'complex';
    return 'expert';
  }

  private extractDomainContext(context: UnifiedContext): string[] {
    const domains: string[] = [];
    
    // Extract from capabilities
    if (context.environment.capabilities) {
      domains.push(...context.environment.capabilities);
    }
    
    // Extract from message content (simple keyword matching)
    const content = context.messages.map(m => m.content).join(' ').toLowerCase();
    const domainKeywords = {
      'technology': ['code', 'programming', 'software', 'api', 'database'],
      'health': ['medical', 'health', 'doctor', 'medicine', 'treatment'],
      'finance': ['money', 'investment', 'bank', 'financial', 'trading'],
      'education': ['learn', 'study', 'course', 'education', 'teaching']
    };
    
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword))) {
        domains.push(domain);
      }
    });
    
    return [...new Set(domains)]; // Remove duplicates
  }

  private extractRelevantHistory(context: UnifiedContext): HistoryEntry[] {
    return context.messages.slice(-10).map((msg, index) => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      relevance: this.calculateMessageImportance(msg, index, context.messages.length),
      category: 'conversation' as const,
      impact: msg.emotions?.length ? 'medium' : 'low' as const
    }));
  }

  private extractContextualMemories(context: UnifiedContext): ContextualMemory[] {
    const memoryData = context.memoryData;
    if (!memoryData?.relevantMemories) return [];
    
    return memoryData.relevantMemories.map(mem => ({
      id: mem.id,
      content: `Memory reference: ${mem.type}`,
      type: 'fact' as const,
      confidence: 0.8,
      lastAccessed: mem.lastAccessed,
      accessCount: 1,
      relevance: mem.relevance
    }));
  }

  private generateTokenOptimization(context: UnifiedContext): TokenOptimization {
    const contentLength = context.content.length + 
                         context.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    
    return {
      maxTokens: Math.min(4000, Math.max(500, contentLength * 0.75)),
      reservedTokens: 100,
      compressionLevel: contentLength > 2000 ? 'moderate' : 'light',
      priorityFields: ['systemPrompt', 'optimizedContent', 'messageHistory'],
      optionalFields: ['relevantHistory', 'contextualMemories', 'processingHints']
    };
  }

  private generateProcessingHints(context: UnifiedContext): ProcessingHint[] {
    const hints: ProcessingHint[] = [];
    
    if (context.state.complexity > 0.7) {
      hints.push({
        hint: 'Complex reasoning required - break down the problem',
        type: 'accuracy',
        applicability: ['all']
      });
    }
    
    if (context.messages.length > 10) {
      hints.push({
        hint: 'Long conversation - focus on recent context',
        type: 'efficiency',
        applicability: ['all']
      });
    }
    
    return hints;
  }

  private determineResponseStyle(context: UnifiedContext): ResponseStyle {
    const emotionData = context.emotionData;
    const complexity = context.state.complexity;
    
    return {
      personality: ['helpful', 'informative'],
      tone: this.determineConversationTone(context),
      formality: context.state.engagement > 0.7 ? 0.3 : 0.7,
      creativity: Math.min(0.8, context.state.engagement),
      verbosity: complexity > 0.6 ? 0.7 : 0.5,
      technicalLevel: complexity,
      empathy: emotionData?.currentEmotions?.length ? 0.8 : 0.5
    };
  }

  private determineExpectedLength(context: UnifiedContext): 'brief' | 'moderate' | 'detailed' | 'comprehensive' {
    const complexity = context.state.complexity;
    const messageLength = context.messages.length > 0 ? 
                         context.messages[context.messages.length - 1].content.length : 0;
    
    if (complexity > 0.8 || messageLength > 500) return 'comprehensive';
    if (complexity > 0.6 || messageLength > 200) return 'detailed';
    if (complexity > 0.3 || messageLength > 50) return 'moderate';
    return 'brief';
  }

  private shouldIncludeCitations(context: UnifiedContext): boolean {
    return context.state.complexity > 0.6 || 
           context.messages.some(m => m.content.toLowerCase().includes('source'));
  }

  private extractMultiModalContext(context: UnifiedContext): MultiModalContext | undefined {
    // Check if context contains multimodal elements
    const hasMultiModal = context.messages.some(m => 
      m.metadata && (m.metadata.images || m.metadata.audio || m.metadata.video)
    );
    
    if (!hasMultiModal) return undefined;
    
    return {
      hasImages: context.messages.some(m => m.metadata?.images),
      hasAudio: context.messages.some(m => m.metadata?.audio),
      hasVideo: context.messages.some(m => m.metadata?.video),
      imageDescriptions: [],
      audioTranscripts: [],
      videoSummaries: []
    };
  }

  private generateFallbackInstructions(context: UnifiedContext): string[] {
    return [
      'If unable to process the request, ask for clarification',
      'If context is unclear, summarize what you understand',
      'If technical issues arise, suggest alternative approaches'
    ];
  }

  private generateErrorRecoveryStrategy(context: UnifiedContext): ErrorRecoveryStrategy {
    return {
      fallbackResponse: 'I apologize, but I encountered an issue processing your request. Could you please rephrase or provide more context?',
      retryInstructions: [
        'Simplify the request',
        'Break down complex questions',
        'Provide more specific context'
      ],
      escalationPath: ['human-operator', 'technical-support'],
      userNotification: 'I\'m having trouble understanding. Let me try a different approach.'
    };
  }

  private estimateTokens(content: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(content.length / 4);
  }
}

/**
 * Factory function for creating portal context transformer
 */
export function createPortalContextTransformer(): PortalContextTransformer {
  return new PortalContextTransformer();
}