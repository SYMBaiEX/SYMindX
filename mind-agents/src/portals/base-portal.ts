import { Agent } from '../types/agent';
import {
  Portal,
  PortalConfig,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  PortalCapability,
  PortalType,
  PortalStatus,
  ModelType,
  ToolEvaluationOptions,
  ToolEvaluationResult,
} from '../types/portal';
import { UnifiedContext } from '../types/context/unified-context.js';
import { 
  standardLoggers, 
  createStandardLoggingPatterns,
  StandardLogContext 
} from '../utils/standard-logging.js';
import { buildObject } from '../utils/type-helpers';

/**
 * Base Portal Implementation
 *
 * This class provides a foundation for all AI provider portals.
 * It implements common functionality and defines the structure that
 * specific provider implementations should follow.
 */

export abstract class BasePortal implements Portal {
  id: string;
  name: string;
  version: string;
  abstract type: PortalType;
  enabled: boolean = true;
  status: PortalStatus = PortalStatus.INACTIVE;
  config: PortalConfig;
  abstract supportedModels: ModelType[];
  
  // Standardized logging
  protected logger = standardLoggers.portal;
  protected loggingPatterns = createStandardLoggingPatterns(this.logger);

  constructor(id: string, name: string, version: string, config: PortalConfig) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.config = {
      maxTokens: 1000, // Config property for backward compatibility
      temperature: 0.7,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Resolve model configuration with hierarchy: .env → character → defaults
   * This provides a unified way for all portals to handle model selection
   */
  protected resolveModel(
    type: 'chat' | 'tool' | 'embedding' | 'image' = 'chat',
    providerPrefix?: string
  ): string {
    const prefix = providerPrefix || this.type.toUpperCase();
    const config = this.config as any;

    switch (type) {
      case 'chat':
        return (
          process.env[`${prefix}_CHAT_MODEL`] ||
          config.chatModel ||
          config.model ||
          this.getDefaultModel('chat')
        );

      case 'tool':
        return (
          process.env[`${prefix}_TOOL_MODEL`] ||
          config.toolModel ||
          config.model ||
          this.getDefaultModel('tool')
        );

      case 'embedding':
        return (
          process.env[`${prefix}_EMBEDDING_MODEL`] ||
          config.embeddingModel ||
          this.getDefaultModel('embedding')
        );

      case 'image':
        return (
          process.env[`${prefix}_IMAGE_MODEL`] ||
          config.imageModel ||
          this.getDefaultModel('image')
        );

      default:
        return config.model || this.getDefaultModel('chat');
    }
  }

  /**
   * Get default model for each type - should be overridden by specific portals
   */
  protected getDefaultModel(
    type: 'chat' | 'tool' | 'embedding' | 'image'
  ): string {
    switch (type) {
      case 'chat':
        return 'gpt-4.1-mini';
      case 'tool':
        return 'gpt-4.1-mini';
      case 'embedding':
        return 'text-embedding-3-small';
      case 'image':
        return 'dall-e-3';
      default:
        return 'gpt-4.1-mini';
    }
  }

  /**
   * Initialize the portal with an agent
   * @param agent The agent to initialize with
   */
  async init(agent: Agent): Promise<void> {
    this.loggingPatterns.logInitialization(`${this.name} portal`, { 
      portalId: this.id,
      agentId: agent.id,
      agentName: agent.name 
    });

    try {
      await this.validateConfig();
      this.loggingPatterns.logInitializationSuccess(`${this.name} portal`, undefined, {
        portalId: this.id,
        agentId: agent.id,
        agentName: agent.name
      });
    } catch (error) {
      this.loggingPatterns.logInitializationFailure(`${this.name} portal`, error as Error, {
        portalId: this.id,
        agentId: agent.id,
        agentName: agent.name
      });
      throw error;
    }
  }

  /**
   * Validate the portal configuration
   */
  protected async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error(`API key is required for ${this.name} portal`);
    }
  }

  /**
   * Generate text from a prompt
   * @param prompt The prompt to generate text from
   * @param options Options for text generation
   */
  abstract generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult>;

  /**
   * Generate a chat response from messages
   * @param messages The chat messages to generate a response from
   * @param options Options for chat generation
   */
  abstract generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult>;

  /**
   * Generate text with context awareness
   * Enhanced version that uses context information to improve generation quality
   * @param prompt The prompt to generate text from
   * @param context Unified context information
   * @param options Additional options for text generation
   */
  async generateTextWithContext(
    prompt: string,
    context: UnifiedContext,
    options?: Omit<TextGenerationOptions, 'context'>
  ): Promise<TextGenerationResult> {
    // Enhance prompt with context information
    const enhancedPrompt = this.buildContextualPrompt(prompt, context);
    
    // Select optimal model based on context
    const contextualOptions = this.buildContextualOptions(context, options);
    
    // Use existing generateText method with enhanced prompt and options
    return this.generateText(enhancedPrompt, {
      ...contextualOptions,
      context
    });
  }

  /**
   * Generate chat with context awareness
   * Enhanced version that uses context information to improve generation quality
   * @param messages The chat messages to generate a response from
   * @param context Unified context information
   * @param options Additional options for chat generation
   */
  async generateChatWithContext(
    messages: ChatMessage[],
    context: UnifiedContext,
    options?: Omit<ChatGenerationOptions, 'context'>
  ): Promise<ChatGenerationResult> {
    // Enhance messages with context information
    const enhancedMessages = this.buildContextualMessages(messages, context);
    
    // Select optimal tools and model based on context
    const contextualOptions = this.buildContextualOptions(context, options);
    
    // Use existing generateChat method with enhanced messages and options
    return this.generateChat(enhancedMessages, {
      ...contextualOptions,
      context
    });
  }

  /**
   * Generate an embedding for text
   * @param text The text to generate an embedding for
   * @param options Options for embedding generation
   */
  abstract generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult>;

  /**
   * Generate an image from a prompt
   * @param prompt The prompt to generate an image from
   * @param options Options for image generation
   */
  async generateImage(
    _prompt: string,
    _options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    throw new Error(`Image generation not supported by ${this.name} portal`);
  }

  /**
   * Stream text generation for real-time responses
   * @param prompt The prompt to generate text from
   * @param options Options for text generation
   */
  // eslint-disable-next-line require-yield
  async *streamText(
    _prompt: string,
    _options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    throw new Error(`Text streaming not supported by ${this.name} portal`);
  }

  /**
   * Stream chat generation for real-time responses
   * @param messages The chat messages to generate a response from
   * @param options Options for chat generation
   */
  // eslint-disable-next-line require-yield
  async *streamChat(
    _messages: ChatMessage[],
    _options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    throw new Error(`Chat streaming not supported by ${this.name} portal`);
  }

  /**
   * Evaluate a task using the tool model (small, efficient model)
   * This is the core method for background processing and decision-making
   */
  async evaluateTask(
    options: ToolEvaluationOptions
  ): Promise<ToolEvaluationResult> {
    try {
      const startTime = Date.now();

      // Use tool model for evaluation (small, fast, cost-effective)
      const toolModel = this.resolveModel('tool');

      // Build evaluation prompt
      const evaluationPrompt = this.buildEvaluationPrompt(options);

      // Generate evaluation using tool model
      const result = await this.generateText(evaluationPrompt, {
        model: toolModel,
        maxOutputTokens: options.timeout
          ? Math.min(2000, options.timeout / 10)
          : 1000,
        temperature: 0.1, // Lower temperature for consistent evaluations
      });

      const processingTime = Date.now() - startTime;

      // Parse the evaluation result
      const evaluation = this.parseEvaluationResult(
        result.text,
        options.outputFormat
      );

      const evalResult = buildObject<ToolEvaluationResult>({
        analysis: evaluation.analysis,
        reasoning: evaluation.reasoning,
        metadata: {
          model: toolModel,
          processingTime,
        },
      })
        .addOptional('score', evaluation.score)
        .addOptional('confidence', evaluation.confidence)
        .addOptional('recommendations', evaluation.recommendations)
        .build();

      // Add optional metadata fields
      if (result.usage && evalResult.metadata)
        evalResult.metadata.tokenUsage = result.usage;
      if (options.criteria && evalResult.metadata)
        evalResult.metadata.evaluationCriteria = options.criteria;
      if (options.outputFormat && evalResult.metadata)
        evalResult.metadata.outputFormat = options.outputFormat;

      return evalResult;
    } catch (error) {
      void error;
      console.error(`${this.name} task evaluation error:`, error);
      throw new Error(`${this.name} task evaluation failed: ${error}`);
    }
  }

  /**
   * Build evaluation prompt based on task and criteria
   */
  protected buildEvaluationPrompt(options: ToolEvaluationOptions): string {
    let prompt = `You are an expert evaluator analyzing the following:\\n\\n`;
    prompt += `TASK: ${options.task}\\n\\n`;

    if (options.context) {
      prompt += `CONTEXT: ${options.context}\\n\\n`;
    }

    if (options.criteria && options.criteria.length > 0) {
      prompt += `EVALUATION CRITERIA:\\n`;
      options.criteria.forEach((criterion, index) => {
        prompt += `${index + 1}. ${criterion}\\n`;
      });
      prompt += '\\n';
    }

    prompt += `Provide a comprehensive evaluation including:\\n`;
    prompt += `1. Analysis: Detailed analysis of the task\\n`;
    prompt += `2. Score: Numerical score from 0-100 if applicable\\n`;
    prompt += `3. Confidence: Your confidence level (0-100)\\n`;
    prompt += `4. Reasoning: Step-by-step reasoning\\n`;
    prompt += `5. Recommendations: Specific actionable recommendations\\n\\n`;

    if (options.outputFormat === 'json') {
      prompt += `Format as JSON: {"analysis":"...","score":85,"confidence":90,"reasoning":"...","recommendations":["..."]}`;
    } else if (options.outputFormat === 'structured') {
      prompt += `Use clear sections: **ANALYSIS:**, **SCORE:**, **CONFIDENCE:**, **REASONING:**, **RECOMMENDATIONS:**`;
    }

    return prompt;
  }

  /**
   * Parse evaluation result based on output format
   */
  protected parseEvaluationResult(
    text: string,
    format?: string
  ): ToolEvaluationResult {
    if (format === 'json') {
      try {
        const parsed = JSON.parse(text);
        return {
          analysis: parsed.analysis || '',
          score: parsed.score,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning || '',
          recommendations: parsed.recommendations || [],
        };
      } catch {
        // Fallback to text parsing if JSON parsing fails
        return this.parseTextEvaluation(text);
      }
    } else {
      return this.parseTextEvaluation(text);
    }
  }

  /**
   * Parse evaluation from structured or unstructured text
   */
  protected parseTextEvaluation(text: string): ToolEvaluationResult {
    const lines = text.split('\\n');
    let analysis = '';
    let score: number | undefined;
    let confidence: number | undefined;
    let reasoning = '';
    const recommendations: string[] = [];

    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect sections
      if (
        trimmed.toLowerCase().includes('analysis:') ||
        trimmed.startsWith('**ANALYSIS:**')
      ) {
        currentSection = 'analysis';
        continue;
      } else if (
        trimmed.toLowerCase().includes('score:') ||
        trimmed.startsWith('**SCORE:**')
      ) {
        currentSection = 'score';
        const scoreMatch = trimmed.match(/(\\d+)/);
        if (scoreMatch && scoreMatch[1]) score = parseInt(scoreMatch[1]);
        continue;
      } else if (
        trimmed.toLowerCase().includes('confidence:') ||
        trimmed.startsWith('**CONFIDENCE:**')
      ) {
        currentSection = 'confidence';
        const confMatch = trimmed.match(/(\\d+)/);
        if (confMatch && confMatch[1]) confidence = parseInt(confMatch[1]);
        continue;
      } else if (
        trimmed.toLowerCase().includes('reasoning:') ||
        trimmed.startsWith('**REASONING:**')
      ) {
        currentSection = 'reasoning';
        continue;
      } else if (
        trimmed.toLowerCase().includes('recommendations:') ||
        trimmed.startsWith('**RECOMMENDATIONS:**')
      ) {
        currentSection = 'recommendations';
        continue;
      }

      // Add content to current section
      if (trimmed.length > 0) {
        switch (currentSection) {
          case 'analysis':
            analysis += (analysis ? '\\n' : '') + trimmed;
            break;
          case 'reasoning':
            reasoning += (reasoning ? '\\n' : '') + trimmed;
            break;
          case 'recommendations':
            if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
              recommendations.push(trimmed.substring(1).trim());
            } else if (trimmed.match(/^\\d+\\./)) {
              recommendations.push(trimmed.replace(/^\\d+\\./, '').trim());
            }
            break;
        }
      }
    }

    // If no structured sections found, use the entire text as analysis
    if (!analysis && !reasoning) {
      analysis = text.trim();
    }

    const result = buildObject<ToolEvaluationResult>({
      analysis: analysis || text.trim(),
      reasoning: reasoning || 'No specific reasoning provided',
    })
      .addOptional('score', score)
      .addOptional('confidence', confidence)
      .addOptional(
        'recommendations',
        recommendations.length > 0 ? recommendations : undefined
      )
      .build();

    return result;
  }

  /**
   * Determine if a request should use tool model vs chat model
   * This is the core routing logic for dual-model architecture
   */
  protected shouldUseToolModel(request: {
    type: 'chat' | 'action' | 'evaluation' | 'function_call';
    message?: string;
    hasTools?: boolean;
    complexity?: 'simple' | 'moderate' | 'complex';
    userFacing?: boolean;
  }): boolean {
    // Always use tool model for evaluations and background processing
    if (request.type === 'evaluation') return true;

    // Use tool model for function calls and actions
    if (request.type === 'action' || request.type === 'function_call')
      return true;

    // Use tool model if tools are involved
    if (request.hasTools) return true;

    // Use chat model for direct user-facing conversations
    if (request.type === 'chat' && request.userFacing !== false) return false;

    // For complex tasks, use chat model for better quality
    if (request.complexity === 'complex') return false;

    // Default to chat model for user interactions
    return false;
  }

  /**
   * Check if the portal supports a specific capability
   * @param capability The capability to check for
   */
  hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.EVALUATION: // Add evaluation as base capability
        return true;
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
      case PortalCapability.TOOL_USAGE:
        return false;
      default:
        return false;
    }
  }

  /**
   * Generate text with multi-step support (AI SDK v5 feature)
   * This is a placeholder that child classes can override to implement
   * multi-step generation with tools
   */
  async generateTextMultiStep(
    prompt: string,
    options?: TextGenerationOptions & {
      tools?: Record<string, any>;
      maxSteps?: number;
      onStepFinish?: (step: number, result: any) => void;
    }
  ): Promise<TextGenerationResult> {
    // Default implementation falls back to regular generation
    return this.generateText(prompt, options);
  }

  /**
   * Generate chat with multi-step support (AI SDK v5 feature)
   * This is a placeholder that child classes can override to implement
   * multi-step generation with tools
   */
  async generateChatMultiStep(
    messages: ChatMessage[],
    options?: ChatGenerationOptions & {
      tools?: Record<string, any>;
      maxSteps?: number;
      onStepFinish?: (step: number, result: any) => void;
    }
  ): Promise<ChatGenerationResult> {
    // Default implementation falls back to regular generation
    return this.generateChat(messages, options);
  }

  /**
   * Generate multiple embeddings in batch (AI SDK v5 feature)
   * This is a placeholder that child classes can override for optimized batch processing
   */
  async generateEmbeddingBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult[]> {
    // Default implementation processes sequentially
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      results.push(await this.generateEmbedding(text, options));
    }
    return results;
  }

  /**
   * Stream text with enhanced tool support (AI SDK v5 feature)
   * This is a placeholder that child classes can override
   */
  async *streamTextEnhanced(
    prompt: string,
    options?: TextGenerationOptions & {
      tools?: Record<string, any>;
      onToolCallStart?: (toolCallId: string, toolName: string) => void;
      onToolCallFinish?: (toolCallId: string, result: any) => void;
    }
  ): AsyncGenerator<string> {
    // Default implementation falls back to regular streaming
    yield* this.streamText(prompt, options);
  }

  /**
   * Stream chat with enhanced tool support (AI SDK v5 feature)
   * This is a placeholder that child classes can override
   */
  async *streamChatEnhanced(
    messages: ChatMessage[],
    options?: ChatGenerationOptions & {
      tools?: Record<string, any>;
      onToolCallStart?: (toolCallId: string, toolName: string) => void;
      onToolCallFinish?: (toolCallId: string, result: any) => void;
    }
  ): AsyncGenerator<string> {
    // Default implementation falls back to regular streaming
    yield* this.streamChat(messages, options);
  }

  /**
   * Get supported models for different use cases
   * This helps with model selection based on the task
   */
  getSupportedModelsForCapability(capability: PortalCapability): string[] {
    // Base implementation returns empty array
    // Child classes should override this
    return [];
  }

  /**
   * Get the optimal model for a specific capability
   * This helps with automatic model selection
   */
  getOptimalModelForCapability(capability: PortalCapability): string | null {
    const models = this.getSupportedModelsForCapability(capability);
    return models.length > 0 ? models[0] ?? null : null;
  }

  /**
   * Build contextual prompt by enhancing the original prompt with context information
   * @param prompt Original prompt
   * @param context Unified context information
   * @returns Enhanced prompt with context
   */
  protected buildContextualPrompt(prompt: string, context: UnifiedContext): string {
    let enhancedPrompt = prompt;

    // Add agent context if available
    if (context.agent) {
      const agentContext = this.buildAgentContextString(context.agent);
      if (agentContext) {
        enhancedPrompt = `${agentContext}\n\n${prompt}`;
      }
    }

    // Add memory context if available
    if (context.memory?.relevant && context.memory.relevant.length > 0) {
      const memoryContext = this.buildMemoryContextString(context.memory.relevant);
      if (memoryContext) {
        enhancedPrompt = `${memoryContext}\n\n${enhancedPrompt}`;
      }
    }

    // Add communication context if available
    if (context.communication?.style) {
      const styleContext = this.buildCommunicationStyleString(context.communication.style);
      if (styleContext) {
        enhancedPrompt = `${styleContext}\n\n${enhancedPrompt}`;
      }
    }

    // Add temporal context if relevant
    if (context.temporal) {
      const timeContext = this.buildTemporalContextString(context.temporal);
      if (timeContext) {
        enhancedPrompt = `${timeContext}\n\n${enhancedPrompt}`;
      }
    }

    return enhancedPrompt;
  }

  /**
   * Build contextual messages by enhancing chat messages with context information
   * @param messages Original chat messages
   * @param context Unified context information
   * @returns Enhanced messages with context
   */
  protected buildContextualMessages(messages: ChatMessage[], context: UnifiedContext): ChatMessage[] {
    const enhancedMessages = [...messages];

    // Build system message with context
    const systemMessage = this.buildSystemMessageWithContext(context);
    if (systemMessage) {
      // Check if first message is already a system message
      if (enhancedMessages.length > 0 && enhancedMessages[0]?.role === 'system') {
        // Enhance existing system message
        enhancedMessages[0] = {
          ...enhancedMessages[0],
          content: `${systemMessage.content}\n\n${enhancedMessages[0].content}`
        };
      } else {
        // Add new system message at the beginning
        enhancedMessages.unshift(systemMessage);
      }
    }

    return enhancedMessages;
  }

  /**
   * Build contextual options by selecting optimal settings based on context
   * @param context Unified context information
   * @param baseOptions Base generation options
   * @returns Enhanced options with context-based optimizations
   */
  protected buildContextualOptions(
    context: UnifiedContext, 
    baseOptions?: TextGenerationOptions | ChatGenerationOptions
  ): TextGenerationOptions | ChatGenerationOptions {
    const contextualOptions = { ...baseOptions };

    // Model selection based on context
    if (!contextualOptions.model) {
      contextualOptions.model = this.selectModelFromContext(context);
    }

    // Temperature adjustment based on context
    if (contextualOptions.temperature === undefined) {
      contextualOptions.temperature = this.selectTemperatureFromContext(context);
    }

    // Token limit adjustment based on context
    if (!contextualOptions.maxOutputTokens && !contextualOptions.maxTokens) {
      contextualOptions.maxOutputTokens = this.selectTokenLimitFromContext(context);
    }

    // Tool selection based on context
    if (!contextualOptions.tools && context.tools?.available) {
      contextualOptions.tools = this.selectToolsFromContext(context);
    }

    return contextualOptions;
  }

  /**
   * Build agent context string from agent context data
   */
  private buildAgentContextString(agentContext: any): string {
    const parts: string[] = [];

    if (agentContext.config?.personality) {
      parts.push(`Personality: ${JSON.stringify(agentContext.config.personality)}`);
    }

    if (agentContext.emotions) {
      const emotions = Object.entries(agentContext.emotions)
        .filter(([_, value]) => (value as any)?.intensity > 0)
        .map(([emotion, data]) => `${emotion}: ${(data as any).intensity}`)
        .join(', ');
      if (emotions) {
        parts.push(`Current emotions: ${emotions}`);
      }
    }

    if (agentContext.goals && agentContext.goals.length > 0) {
      parts.push(`Goals: ${agentContext.goals.join(', ')}`);
    }

    return parts.length > 0 ? `Agent Context:\n${parts.join('\n')}` : '';
  }

  /**
   * Build memory context string from relevant memories
   */
  private buildMemoryContextString(memories: any[]): string {
    if (!memories || memories.length === 0) return '';

    const relevantMemories = memories
      .slice(0, 5) // Limit to top 5 most relevant
      .map(memory => `- ${memory.content || memory.text || memory.description || 'Memory'}`)
      .join('\n');

    return `Relevant Context:\n${relevantMemories}`;
  }

  /**
   * Build communication style string
   */
  private buildCommunicationStyleString(style: any): string {
    const parts: string[] = [];

    if (style.tone) parts.push(`Tone: ${style.tone}`);
    if (style.formality) parts.push(`Formality: ${style.formality}`);
    if (style.verbosity) parts.push(`Verbosity: ${style.verbosity}`);

    return parts.length > 0 ? `Communication Style: ${parts.join(', ')}` : '';
  }

  /**
   * Build temporal context string
   */
  private buildTemporalContextString(temporal: any): string {
    const parts: string[] = [];

    if (temporal.now) {
      parts.push(`Current time: ${new Date(temporal.now).toISOString()}`);
    }

    if (temporal.timezone) {
      parts.push(`Timezone: ${temporal.timezone}`);
    }

    return parts.length > 0 ? `Time Context: ${parts.join(', ')}` : '';
  }

  /**
   * Build system message with context information
   */
  private buildSystemMessageWithContext(context: UnifiedContext): ChatMessage | null {
    const contextParts: string[] = [];

    // Add agent context
    if (context.agent) {
      const agentContext = this.buildAgentContextString(context.agent);
      if (agentContext) contextParts.push(agentContext);
    }

    // Add memory context
    if (context.memory?.relevant && context.memory.relevant.length > 0) {
      const memoryContext = this.buildMemoryContextString(context.memory.relevant);
      if (memoryContext) contextParts.push(memoryContext);
    }

    // Add communication context
    if (context.communication?.style) {
      const styleContext = this.buildCommunicationStyleString(context.communication.style);
      if (styleContext) contextParts.push(styleContext);
    }

    if (contextParts.length === 0) return null;

    return {
      role: 'system' as any,
      content: contextParts.join('\n\n'),
      timestamp: new Date()
    };
  }

  /**
   * Select model based on context requirements
   */
  protected selectModelFromContext(context: UnifiedContext): string | undefined {
    // Use tools model if tools are available
    if (context.tools?.available && context.tools.available.length > 0) {
      return this.resolveModel('tool');
    }

    // Use chat model for conversation contexts
    if (context.communication?.conversationHistory) {
      return this.resolveModel('chat');
    }

    // Default to chat model
    return this.resolveModel('chat');
  }

  /**
   * Select temperature based on context requirements
   */
  protected selectTemperatureFromContext(context: UnifiedContext): number {
    // Lower temperature for tool usage or precise tasks
    if (context.tools?.available && context.tools.available.length > 0) {
      return 0.1;
    }

    // Adjust based on communication style
    if (context.communication?.style) {
      const style = context.communication.style as any;
      if (style.creativity === 'high') return 0.8;
      if (style.creativity === 'low') return 0.3;
    }

    // Default temperature
    return this.config.temperature || 0.7;
  }

  /**
   * Select token limit based on context requirements
   */
  protected selectTokenLimitFromContext(context: UnifiedContext): number {
    // Higher token limit for complex conversations
    if (context.communication?.conversationHistory && 
        context.communication.conversationHistory.length > 10) {
      return Math.min(4000, (this.config.maxTokens || 1000) * 2);
    }

    // Lower token limit for simple tool calls
    if (context.tools?.available && context.tools.available.length > 0) {
      return Math.min(1000, this.config.maxTokens || 1000);
    }

    return this.config.maxTokens || 1000;
  }

  /**
   * Select tools based on context requirements
   */
  protected selectToolsFromContext(context: UnifiedContext): Record<string, any> | undefined {
    if (!context.tools?.available) return undefined;

    // Convert available tools to AI SDK format
    const tools: Record<string, any> = {};
    
    for (const tool of context.tools.available) {
      tools[tool.name] = {
        description: tool.description,
        parameters: tool.parameters
      };
    }

    return Object.keys(tools).length > 0 ? tools : undefined;
  }
}
