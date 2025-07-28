/**
 * Command System for Agent Instruction Processing
 *
 * Handles parsing, queuing, and execution of commands sent to agents.
 * Supports both synchronous and asynchronous operations with progress tracking.
 */

import { EventEmitter } from 'events';

import { WebSocket } from 'ws';

import { PortalRouter } from '../portals/index';
import { Agent, MemoryType, MemoryDuration } from '../types/agent';
import { SkillParameters } from '../types/common';
import { Logger, runtimeLogger } from '../utils/logger';

export interface Command {
  id: string;
  type: CommandType;
  agentId: string;
  instruction: string;
  parameters?: Record<string, unknown>;
  priority: CommandPriority;
  async: boolean;
  timeout?: number;
  timestamp: Date;
  status: CommandStatus;
  result?: CommandResult;
  progress?: CommandProgress;
  extension?: string;
}

export interface CommandResult {
  success: boolean;
  response?: string;
  data?: unknown;
  error?: string;
  executionTime: number;
}

export interface CommandProgress {
  percentage: number;
  stage: string;
  details?: string;
}

export enum CommandType {
  CHAT = 'chat',
  ACTION = 'action',
  MEMORY_QUERY = 'memory_query',
  MEMORY_STORE = 'memory_store',
  STATUS = 'status',
  CONTROL = 'control',
  CUSTOM = 'custom',
}

export enum CommandPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
}

export enum CommandStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

export type CommandParseHandler = (input: string) => Partial<Command>;

export interface CommandParser {
  canParse(input: string): boolean;
  parse: CommandParseHandler;
}

export class CommandSystem extends EventEmitter {
  private logger = new Logger('command-system');
  private commands = new Map<string, Command>();
  private queues = new Map<string, Command[]>(); // agentId -> commands
  private parsers: CommandParser[] = [];
  private processing = new Set<string>(); // commandIds being processed
  private agents = new Map<string, Agent>();
  private wsConnections = new Set<WebSocket>();

  constructor() {
    super();
    this.setupDefaultParsers();
    this.startProcessingLoop();
  }

  private setupDefaultParsers(): void {
    // Chat message parser
    this.parsers.push({
      canParse: (input: string) => {
        return !input.startsWith('/') && !input.startsWith('!');
      },
      parse: (input: string) => ({
        type: CommandType.CHAT,
        instruction: input,
        priority: CommandPriority.NORMAL,
        async: false,
      }),
    });

    // Action command parser (/action, !action)
    this.parsers.push({
      canParse: (input: string) => {
        return input.startsWith('/action ') || input.startsWith('!action ');
      },
      parse: (input: string) => {
        const parts = input.slice(8).trim().split(' ');
        const actionName = parts[0];
        const params = parts.slice(1).join(' ');

        return {
          type: CommandType.ACTION,
          instruction: actionName || '',
          parameters: params ? this.parseParameters(params) : {},
          priority: CommandPriority.HIGH,
          async: true,
        };
      },
    });

    // Memory query parser (/memory, /remember)
    this.parsers.push({
      canParse: (input: string) => {
        return input.startsWith('/memory ') || input.startsWith('/remember ');
      },
      parse: (input: string) => {
        const query = input.startsWith('/memory ')
          ? input.slice(8).trim()
          : input.slice(10).trim();

        return {
          type: CommandType.MEMORY_QUERY,
          instruction: query,
          priority: CommandPriority.NORMAL,
          async: false,
        };
      },
    });

    // Status command parser (/status)
    this.parsers.push({
      canParse: (input: string) => {
        return input === '/status' || input === '/info';
      },
      parse: (_input: string) => ({
        type: CommandType.STATUS,
        instruction: 'get_status',
        priority: CommandPriority.LOW,
        async: false,
      }),
    });

    // Control command parser (/pause, /resume, /stop)
    this.parsers.push({
      canParse: (input: string) => {
        return ['/pause', '/resume', '/stop', '/start'].includes(input);
      },
      parse: (input: string) => ({
        type: CommandType.CONTROL,
        instruction: input.slice(1),
        priority: CommandPriority.URGENT,
        async: false,
      }),
    });

    // Store memory parser (/store)
    this.parsers.push({
      canParse: (input: string) => {
        return input.startsWith('/store ');
      },
      parse: (input: string) => {
        const content = input.slice(7).trim();
        return {
          type: CommandType.MEMORY_STORE,
          instruction: content,
          priority: CommandPriority.NORMAL,
          async: false,
        };
      },
    });
  }

  public addParser(parser: CommandParser): void {
    this.parsers.unshift(parser); // Add to beginning for priority
  }

  public registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    if (!this.queues.has(agent.id)) {
      this.queues.set(agent.id, []);
    }

    // Also register by character ID for easier lookup
    if (agent.character_id && agent.character_id !== agent.id) {
      this.agents.set(agent.character_id, agent);
      if (!this.queues.has(agent.character_id)) {
        this.queues.set(agent.character_id, []);
      }
    }

    this.logger.info(`Registered agent: ${agent.name} (${agent.id})`);
  }

  public unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.queues.delete(agentId);
    this.logger.info(`Unregistered agent: ${agentId}`);
  }

  public addWebSocketConnection(ws: WebSocket): void {
    this.wsConnections.add(ws);

    ws.on('close', () => {
      this.wsConnections.delete(ws);
    });
  }

  public async sendCommand(
    agentId: string,
    input: string,
    options?: {
      priority?: CommandPriority;
      async?: boolean;
      timeout?: number;
    }
  ): Promise<Command> {
    const command = this.parseCommand(agentId, input, options);

    if (!this.agents.has(agentId)) {
      command.status = CommandStatus.FAILED;
      command.result = {
        success: false,
        error: `Agent ${agentId} not found`,
        executionTime: 0,
      };
      return command;
    }

    // Add to queue
    const queue = this.queues.get(agentId)!;
    this.insertByPriority(queue, command);
    this.commands.set(command.id, command);

    this.logger.info(
      `Queued command ${command.id} for agent ${agentId}: ${command.instruction}`
    );
    this.emit('command_queued', command);
    this.broadcastUpdate(command);

    // If synchronous, wait for completion
    if (!command.async) {
      return this.waitForCompletion(command);
    }

    return command;
  }

  public async sendMessage(agentId: string, message: string): Promise<string> {
    const command = await this.sendCommand(agentId, message, {
      priority: CommandPriority.NORMAL,
      async: false,
    });

    if (command.result?.success) {
      return command.result.response || 'No response';
    } else {
      throw new Error(command.result?.error || 'Command failed');
    }
  }

  public getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  public getAgentQueue(agentId: string): Command[] {
    return this.queues.get(agentId) || [];
  }

  public listAgents(): Agent[] {
    // Return unique agents (avoid duplicates from character_id aliases)
    const uniqueAgents = new Map<string, Agent>();
    for (const agent of this.agents.values()) {
      uniqueAgents.set(agent.id, agent);
    }
    return Array.from(uniqueAgents.values());
  }

  public getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  public getActiveCommands(): Command[] {
    return Array.from(this.commands.values()).filter(
      (cmd) => cmd.status === CommandStatus.PROCESSING
    );
  }

  public cancelCommand(commandId: string): boolean {
    const command = this.commands.get(commandId);
    if (!command || command.status !== CommandStatus.PENDING) {
      return false;
    }

    command.status = CommandStatus.CANCELLED;
    this.emit('command_cancelled', command);
    this.broadcastUpdate(command);
    return true;
  }

  private parseCommand(
    agentId: string,
    input: string,
    options?: {
      priority?: CommandPriority;
      async?: boolean;
      timeout?: number;
    }
  ): Command {
    const commandId = this.generateCommandId();

    // Find suitable parser
    let parsedCommand: Partial<Command> = {
      type: CommandType.CUSTOM,
      instruction: input,
      priority: CommandPriority.NORMAL,
      async: false,
    };

    for (const parser of this.parsers) {
      if (parser.canParse(input)) {
        parsedCommand = parser.parse(input);
        break;
      }
    }

    // Apply options overrides
    if (options) {
      if (options.priority !== undefined)
        parsedCommand.priority = options.priority;
      if (options.async !== undefined) parsedCommand.async = options.async;
      if (options.timeout !== undefined)
        parsedCommand.timeout = options.timeout;
    }

    const command: Command = {
      id: commandId,
      type: parsedCommand.type || CommandType.CUSTOM,
      agentId,
      instruction: parsedCommand.instruction || input,
      priority: parsedCommand.priority || CommandPriority.NORMAL,
      async: parsedCommand.async || false,
      timestamp: new Date(),
      status: CommandStatus.PENDING,
    };

    if (parsedCommand.parameters) {
      command.parameters = parsedCommand.parameters;
    }

    if (parsedCommand.timeout) {
      command.timeout = parsedCommand.timeout;
    }

    return command;
  }

  private parseParameters(paramString: string): Record<string, unknown> {
    try {
      // Try JSON first
      if (paramString.startsWith('{') && paramString.endsWith('}')) {
        return JSON.parse(paramString);
      }

      // Parse key=value pairs
      const params: Record<string, unknown> = {};
      const pairs = paramString.match(/(\w+)=([^\s]+)/g) || [];

      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value !== undefined) {
          // Try to parse as number or boolean
          if (value === 'true') params[key] = true;
          else if (value === 'false') params[key] = false;
          else if (!isNaN(Number(value))) params[key] = Number(value);
          else params[key] = value;
        }
      }

      return params;
    } catch (error) {
      void error;
      this.logger.warn(`Failed to parse parameters: ${paramString} - ${error}`);
      return { raw: paramString };
    }
  }

  private insertByPriority(queue: Command[], command: Command): void {
    const insertIndex = queue.findIndex(
      (cmd) => cmd.priority < command.priority
    );
    if (insertIndex === -1) {
      queue.push(command);
    } else {
      queue.splice(insertIndex, 0, command);
    }
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async waitForCompletion(command: Command): Promise<Command> {
    return new Promise((resolve, reject) => {
      const timeout = command.timeout || 30000; // 30 second default

      const timeoutId = setTimeout(() => {
        command.status = CommandStatus.TIMEOUT;
        command.result = {
          success: false,
          error: 'Command timed out',
          executionTime: timeout,
        };
        reject(new Error('Command timed out'));
      }, timeout);

      const checkCompletion = (): void => {
        if (
          command.status === CommandStatus.COMPLETED ||
          command.status === CommandStatus.FAILED
        ) {
          clearTimeout(timeoutId);
          resolve(command);
        }
      };

      // Check immediately in case it's already done
      checkCompletion();

      // Listen for updates
      this.on('command_completed', (completedCommand) => {
        if (completedCommand.id === command.id) {
          checkCompletion();
        }
      });
    });
  }

  private startProcessingLoop(): void {
    setInterval(async () => {
      await this.processQueues();
    }, 100); // Process every 100ms
  }

  private async processQueues(): Promise<void> {
    for (const [, queue] of this.queues) {
      if (queue.length === 0) continue;

      const command = queue[0];
      if (!command || command.status !== CommandStatus.PENDING) continue;
      if (this.processing.has(command.id)) continue;

      // Start processing
      queue.shift(); // Remove from queue
      this.processing.add(command.id);
      command.status = CommandStatus.PROCESSING;

      this.emit('command_started', command);
      this.broadcastUpdate(command);

      // Process asynchronously
      this.processCommand(command).finally(() => {
        this.processing.delete(command.id);
      });
    }
  }

  private async processCommand(command: Command): Promise<void> {
    const startTime = Date.now();
    const agent = this.agents.get(command.agentId);

    if (!agent) {
      command.status = CommandStatus.FAILED;
      command.result = {
        success: false,
        error: `Agent ${command.agentId} not found`,
        executionTime: Date.now() - startTime,
      };
      this.emit('command_completed', command);
      this.broadcastUpdate(command);
      return;
    }

    try {
      let result: CommandResult;

      switch (command.type) {
        case CommandType.CHAT:
          result = await this.processChatCommand(agent, command);
          break;
        case CommandType.ACTION:
          result = await this.processActionCommand(agent, command);
          break;
        case CommandType.MEMORY_QUERY:
          result = await this.processMemoryQueryCommand(agent, command);
          break;
        case CommandType.MEMORY_STORE:
          result = await this.processMemoryStoreCommand(agent, command);
          break;
        case CommandType.STATUS:
          result = await this.processStatusCommand(agent, command);
          break;
        case CommandType.CONTROL:
          result = await this.processControlCommand(agent, command);
          break;
        default:
          result = await this.processCustomCommand(agent, command);
      }

      command.status = result.success
        ? CommandStatus.COMPLETED
        : CommandStatus.FAILED;
      command.result = {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      void error;
      this.logger.error(`Command ${command.id} failed:`, error);
      command.status = CommandStatus.FAILED;
      command.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }

    this.emit('command_completed', command);
    this.broadcastUpdate(command);
  }

  private async processChatCommand(
    agent: Agent,
    command: Command
  ): Promise<CommandResult> {
    // Import types for memory operations
    const { MemoryType, MemoryDuration, ActionCategory } = await import(
      '../types/enums'
    );

    // Import portal integration helper
    const { PortalIntegration } = await import('./portal-integration');

    const startTime = Date.now();

    // Step 0: Process incoming message for emotional triggers and update agent emotion
    let emotionalContext: {
      currentEmotion?: string;
      emotionIntensity?: number;
      emotionModifiers?: Record<string, number>;
      emotionColor?: string;
      postResponseEmotion?: string;
      postResponseIntensity?: number;
    } = {};
    let emotionTriggered = false;

    if (agent.emotion) {
      try {
        // Analyze the incoming message for emotional triggers
        const messageEmotion = this.analyzeMessageEmotion(command.instruction);

        // Process the emotional event
        const emotionResult = agent.emotion.processEvent('chat_message', {
          message: command.instruction,
          messageType: messageEmotion.type,
          sentiment: messageEmotion.sentiment,
          intensity: messageEmotion.intensity,
          ...messageEmotion.context,
        });

        emotionalContext = {
          currentEmotion: emotionResult.state.current,
          emotionIntensity: emotionResult.state.intensity,
          emotionModifiers: (agent.emotion as any).getEmotionModifier
            ? (agent.emotion as any).getEmotionModifier()
            : {},
          emotionColor: (agent.emotion as any).getEmotionColor
            ? (agent.emotion as any).getEmotionColor()
            : '#9E9E9E',
        };

        emotionTriggered = true;
        this.logger.debug(
          `Agent ${agent.name} emotion updated to ${emotionResult.state.current} (${emotionResult.state.intensity.toFixed(2)}) from message: ${command.instruction}`
        );
      } catch (error) {
        void error;
        this.logger.warn('Failed to process emotion for incoming message:', {
          error: {
            code: 'EMOTION_PROCESSING_ERROR',
            message: error instanceof Error ? error.message : String(error),
            ...(error instanceof Error && error.stack
              ? { stack: error.stack }
              : {}),
            cause: error,
          },
        });
      }
    }

    // Step 1: Retrieve recent conversation memories for context
    let conversationContext = '';
    let recentMemories: any[] = [];

    try {
      if (agent.memory) {
        try {
          // Get recent conversation memories
          recentMemories = await agent.memory.retrieve(
            agent.id,
            'conversation chat message',
            10 // Last 10 conversation exchanges
          );

          // Also get recent memories by tags
          const chatMemories = await agent.memory.getRecent(agent.id, 5);
          const conversationMemories = chatMemories.filter(
            (mem) =>
              mem.tags.includes('conversation') ||
              mem.tags.includes('chat') ||
              mem.type === MemoryType.INTERACTION
          );

          // Combine and deduplicate
          const allMemories = [...recentMemories, ...conversationMemories];
          const uniqueMemories = allMemories.filter(
            (mem, index, arr) => arr.findIndex((m) => m.id === mem.id) === index
          );

          // Sort by timestamp (most recent first)
          uniqueMemories.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          // Build context string from recent memories
          if (uniqueMemories.length > 0) {
            conversationContext = uniqueMemories
              .slice(0, 5) // Last 5 memories for context
              .map(
                (mem) =>
                  `[${new Date(mem.timestamp).toLocaleTimeString()}] ${mem.content}`
              )
              .join('\n');
          }
        } catch (error) {
          void error;
          this.logger.warn('Failed to retrieve conversation memories:', {
            error: {
              code: 'MEMORY_RETRIEVAL_ERROR',
              message: error instanceof Error ? error.message : String(error),
              ...(error instanceof Error && error.stack
                ? { stack: error.stack }
                : {}),
              cause: error,
            },
          });
        }
      }

      // Step 1.5: COGNITIVE PROCESSING - Think before responding
      let cognitiveContext: any = {};
      let thoughtResult: any = null;

      // Check if cognitive processing is enabled (default: true)
      const cognitiveProcessingEnabled =
        agent.config?.modules?.cognition?.enableCognitiveProcessing !== false;

      if (agent.cognition && cognitiveProcessingEnabled) {
        try {
          this.logger.debug(
            `Agent ${agent.name} is thinking about the message...`
          );

          // Create a context for cognitive processing
          const thinkingContext = {
            events: [
              {
                id: `chat_${Date.now()}`,
                type: 'communication_received',
                source: 'user',
                timestamp: new Date(),
                processed: false,
                data: {
                  message: command.instruction,
                  emotion: emotionalContext,
                  sender: 'user',
                  isSimpleChat: true, // Flag for unified cognition
                },
              },
            ],
            memories: recentMemories || [],
            currentState: {
              location: 'chat',
              inventory: {},
              stats: {},
              goals: [`respond_to: "${command.instruction}"`],
              context: { conversationContext, emotionalContext },
            },
            environment: {
              type: 'virtual' as any,
              time: new Date(),
              weather: 'clear',
              location: 'chat_interface',
              npcs: [],
              objects: [],
              events: [],
            },
            goal: `Thoughtfully respond to user message: "${command.instruction}"`,
          };

          // Let the agent think about the situation
          thoughtResult = await agent.cognition.think(agent, thinkingContext);

          if (thoughtResult) {
            cognitiveContext = {
              thoughts: thoughtResult.thoughts || [],
              cognitiveActions: thoughtResult.actions || [],
              cognitiveEmotions: thoughtResult.emotions || [],
              cognitiveConfidence: thoughtResult.confidence || 0.5,
              cognitiveMemories: thoughtResult.memories || [],
            };

            this.logger.debug(
              `Agent ${agent.name} cognitive processing complete: ${cognitiveContext.thoughts.length} thoughts, ${cognitiveContext.cognitiveActions.length} actions, confidence ${cognitiveContext.cognitiveConfidence}`
            );
          }
        } catch (error) {
          void error;
          this.logger.warn(
            'Failed to process cognitive thinking for message:',
            {
              error: {
                code: 'EMOTION_PROCESSING_ERROR',
                message: error instanceof Error ? error.message : String(error),
                ...(error instanceof Error && error.stack
                  ? { stack: error.stack }
                  : {}),
                cause: error,
              },
            }
          );
          // Continue without cognitive context if thinking fails
        }
      } else if (!cognitiveProcessingEnabled) {
        this.logger.debug(
          `Agent ${agent.name} has cognitive processing disabled`
        );
      } else {
        this.logger.debug(
          `Agent ${agent.name} has no cognition module available`
        );
      }

      // Step 2: Determine routing for this request
      const routingDecision = PortalRouter.getModelType(agent, {
        type: 'chat',
        message: command.instruction,
        hasTools: false,
        userFacing: true,
      });

      this.logger.debug(
        `🚦 Routing chat to ${routingDecision.modelType} model: ${routingDecision.reasoning}`
      );

      // Step 3: Generate AI response using modern dual-model architecture
      const enhancedPrompt = this.buildEnhancedSystemPrompt(
        agent,
        command.instruction,
        emotionalContext,
        conversationContext,
        cognitiveContext
      );

      const response = await PortalIntegration.generateResponse(
        agent,
        command.instruction,
        {
          systemPrompt: enhancedPrompt,
          previousThoughts:
            conversationContext || 'This appears to be a new conversation.',
          emotionalContext,
          cognitiveContext,
        }
      );

      // Step 3: Store both user message and agent response as memories
      if (agent.memory) {
        try {
          const timestamp = new Date();

          // Store user message with emotional and cognitive context
          const userMemory = {
            id: `memory_${Date.now()}_user`,
            agentId: agent.id,
            type: MemoryType.INTERACTION,
            content: `User said: "${command.instruction}"`,
            metadata: {
              source: 'chat_command',
              messageType: 'user_input',
              command_id: command.id,
              emotionalContext: emotionalContext,
              emotionTriggered: emotionTriggered,
              cognitiveContext: cognitiveContext,
              hadCognitiveProcessing: !!thoughtResult,
            },
            importance: emotionTriggered ? 0.8 : 0.7, // Emotional messages are more important
            timestamp,
            tags: [
              'conversation',
              'chat',
              'user_input',
              ...(emotionTriggered ? ['emotional'] : []),
              ...(thoughtResult ? ['cognitive'] : []),
            ],
            duration: MemoryDuration.LONG_TERM,
          };

          await agent.memory.store(agent.id, userMemory);

          // Process emotional response to our own reply
          let responseEmotionalContext = emotionalContext;
          if (agent.emotion && emotionTriggered) {
            try {
              // Analyze our response for emotional impact
              const responseEmotion = this.analyzeMessageEmotion(
                response,
                true
              );
              const responseEmotionResult = agent.emotion.processEvent(
                'agent_response',
                {
                  response: response,
                  originalMessage: command.instruction,
                  responseType: responseEmotion.type,
                  sentiment: responseEmotion.sentiment,
                  ...responseEmotion.context,
                }
              );

              responseEmotionalContext = {
                ...emotionalContext,
                postResponseEmotion: responseEmotionResult.state.current,
                postResponseIntensity: responseEmotionResult.state.intensity,
              };
            } catch (error) {
              void error;
              this.logger.warn(
                'Failed to process emotion for agent response:',
                {
                  error: {
                    code: 'EMOTION_PROCESSING_ERROR',
                    message:
                      error instanceof Error ? error.message : String(error),
                    ...(error instanceof Error && error.stack
                      ? { stack: error.stack }
                      : {}),
                    cause: error,
                  },
                }
              );
            }
          }

          // Store agent response with emotional and cognitive context
          const agentMemory = {
            id: `memory_${Date.now()}_agent`,
            agentId: agent.id,
            type: MemoryType.INTERACTION,
            content: `I responded: "${response}"`,
            metadata: {
              source: 'chat_command',
              messageType: 'agent_response',
              command_id: command.id,
              response_to: command.instruction,
              emotionalContext: responseEmotionalContext,
              emotionTriggered: emotionTriggered,
              cognitiveContext: cognitiveContext,
              hadCognitiveProcessing: !!thoughtResult,
            },
            importance: emotionTriggered ? 0.7 : 0.6,
            timestamp: new Date(timestamp.getTime() + 1), // Slight delay to ensure order
            tags: [
              'conversation',
              'chat',
              'agent_response',
              ...(emotionTriggered ? ['emotional'] : []),
              ...(thoughtResult ? ['cognitive'] : []),
            ],
            duration: MemoryDuration.LONG_TERM,
          };

          await agent.memory.store(agent.id, agentMemory);

          // Store separate emotional memory only for SIGNIFICANT emotional events
          if (
            emotionTriggered &&
            (emotionalContext.emotionIntensity || 0) > 0.7
          ) {
            const emotionalMemory = {
              id: `emotion_memory_${Date.now()}`,
              agentId: agent.id,
              type: MemoryType.EXPERIENCE,
              content: `Emotional interaction: ${emotionalContext.currentEmotion} (${((emotionalContext.emotionIntensity || 0) * 100).toFixed(0)}%) triggered by: "${command.instruction}"`,
              metadata: {
                source: 'emotion_system',
                emotionType: emotionalContext.currentEmotion,
                intensity: emotionalContext.emotionIntensity || 0,
                trigger: command.instruction,
                response: response,
                command_id: command.id,
              },
              importance: emotionalContext.emotionIntensity || 0.5, // Importance based on intensity
              timestamp: new Date(timestamp.getTime() + 2),
              tags: [
                'emotion',
                'emotional_memory',
                emotionalContext.currentEmotion || 'unknown',
                'chat',
              ],
              duration: MemoryDuration.LONG_TERM,
            };

            await agent.memory.store(agent.id, emotionalMemory);
            this.logger.debug(
              `Stored emotional memory for ${agent.name}: ${emotionalContext.currentEmotion}`
            );
          }

          // Store cognitive insights as separate memory only for significant insights
          if (
            thoughtResult &&
            cognitiveContext.thoughts.length > 2 &&
            cognitiveContext.cognitiveConfidence > 0.7
          ) {
            const cognitiveMemory = {
              id: `cognitive_memory_${Date.now()}`,
              agentId: agent.id,
              type: MemoryType.EXPERIENCE,
              content: `Cognitive analysis: ${cognitiveContext.thoughts.join('. ')}. Confidence: ${(cognitiveContext.cognitiveConfidence * 100).toFixed(0)}%`,
              metadata: {
                source: 'cognition_system',
                cognitiveType:
                  (agent.cognition as any)?.getMetadata?.()?.id || 'unknown',
                confidence: cognitiveContext.cognitiveConfidence,
                thoughts: cognitiveContext.thoughts,
                actions: cognitiveContext.cognitiveActions,
                emotions: cognitiveContext.cognitiveEmotions,
                trigger: command.instruction,
                response: response,
                command_id: command.id,
              },
              importance: cognitiveContext.cognitiveConfidence || 0.6, // Importance based on confidence
              timestamp: new Date(timestamp.getTime() + 3),
              tags: [
                'cognition',
                'cognitive_memory',
                'thinking',
                'chat',
                (agent.cognition as any)?.getMetadata?.()?.id ||
                  'unknown_cognition',
              ],
              duration: MemoryDuration.LONG_TERM,
            };

            await agent.memory.store(agent.id, cognitiveMemory);
            this.logger.debug(
              `Stored cognitive memory for ${agent.name}: ${cognitiveContext.thoughts.length} thoughts, confidence ${(cognitiveContext.cognitiveConfidence * 100).toFixed(0)}%`
            );
          }

          this.logger.debug(`Stored conversation memories for ${agent.name}`);
        } catch (error) {
          void error;
          this.logger.warn('Failed to store conversation memories:', {
            error: {
              code: 'MEMORY_STORAGE_ERROR',
              message: error instanceof Error ? error.message : String(error),
              ...(error instanceof Error && error.stack
                ? { stack: error.stack }
                : {}),
              cause: error,
            },
          });
        }
      }

      return {
        success: true,
        response,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      void error;
      this.logger.warn('Portal generation failed, falling back to cognition:', {
        error: {
          code: 'PORTAL_GENERATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          ...(error instanceof Error && error.stack
            ? { stack: error.stack }
            : {}),
          cause: error,
        },
      });

      // Fallback to cognition module if portal fails
      if (!agent.cognition) {
        return {
          success: false,
          error: 'Agent has no cognition module',
          executionTime: Date.now() - startTime,
        };
      }

      // Create a context for the thought with retrieved memories
      const context = {
        events: [],
        memories: recentMemories || [],
        currentState: {
          location: 'chat',
          inventory: {},
          stats: {},
          goals: [],
          context: {},
        },
        environment: {
          type: 'virtual' as any,
          time: new Date(),
          weather: 'clear',
          location: 'chat',
          npcs: [],
          objects: [],
          events: [],
        },
      };

      const thoughtResult = await agent.cognition.think(agent, context);

      // Look for communication actions in the response
      const communicationActions = thoughtResult.actions.filter(
        (action) => action.type === ActionCategory.COMMUNICATION
      );

      let response = "I heard you, but I don't have anything to say right now.";

      if (communicationActions.length > 0) {
        const firstComm = communicationActions[0];
        response = String(
          firstComm?.parameters?.['message'] ||
            firstComm?.parameters?.['text'] ||
            response
        );
      }

      // Store the conversation even with fallback response
      if (agent.memory) {
        try {
          const timestamp = new Date();

          const userMemory = {
            id: `memory_${Date.now()}_user_fallback`,
            agentId: agent.id,
            type: MemoryType.INTERACTION,
            content: `User said: "${command.instruction}"`,
            metadata: {
              source: 'chat_command_fallback',
              messageType: 'user_input',
              command_id: command.id,
              emotionalContext: emotionalContext,
              emotionTriggered: emotionTriggered,
            },
            importance: emotionTriggered ? 0.7 : 0.6,
            timestamp,
            tags: [
              'conversation',
              'chat',
              'user_input',
              'fallback',
              ...(emotionTriggered ? ['emotional'] : []),
            ],
            duration: MemoryDuration.LONG_TERM,
          };

          await agent.memory.store(agent.id, userMemory);

          const agentMemory = {
            id: `memory_${Date.now()}_agent_fallback`,
            agentId: agent.id,
            type: MemoryType.INTERACTION,
            content: `I responded (via cognition): "${response}"`,
            metadata: {
              source: 'chat_command_fallback',
              messageType: 'agent_response',
              command_id: command.id,
              response_to: command.instruction,
              method: 'cognition_fallback',
              emotionalContext: emotionalContext,
              emotionTriggered: emotionTriggered,
            },
            importance: emotionTriggered ? 0.6 : 0.5,
            timestamp: new Date(timestamp.getTime() + 1),
            tags: [
              'conversation',
              'chat',
              'agent_response',
              'fallback',
              ...(emotionTriggered ? ['emotional'] : []),
            ],
            duration: MemoryDuration.LONG_TERM,
          };

          await agent.memory.store(agent.id, agentMemory);
        } catch (memError) {
          this.logger.warn('Failed to store fallback conversation memories:', {
            error: {
              code: 'FALLBACK_MEMORY_ERROR',
              message:
                memError instanceof Error ? memError.message : String(memError),
              ...(memError instanceof Error && memError.stack
                ? { stack: memError.stack }
                : {}),
              cause: memError,
            },
          });
        }
      }

      return {
        success: true,
        response,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async processActionCommand(
    agent: Agent,
    command: Command
  ): Promise<CommandResult> {
    // Determine routing for action commands
    const routingDecision = PortalRouter.getModelType(agent, {
      type: 'action',
      message: command.instruction,
      hasTools: true,
      userFacing: false,
    });

    this.logger.debug(
      `🚦 Routing action to ${routingDecision.modelType} model: ${routingDecision.reasoning}`
    );

    // Find the extension that can handle this action
    const extension = agent.extensions.find((ext) =>
      Object.keys(ext.actions).includes(command.instruction)
    );

    if (!extension) {
      const errorResult: CommandResult = {
        success: false,
        executionTime: 0,
      };
      errorResult.error = `No extension found for action: ${command.instruction}`;
      return errorResult;
    }

    const action = extension.actions[command.instruction];
    if (!action) {
      throw new Error(
        `Action '${command.instruction}' not found in extension '${command.extension}'`
      );
    }
    const result = await action.execute(
      agent,
      (command.parameters || {}) as SkillParameters
    );

    const commandResult: CommandResult = {
      success: result.success,
      executionTime: 0,
    };

    if (result.result) {
      commandResult.response = String(result.result);
      commandResult.data = result.result;
    }

    if (result.error) {
      commandResult.error = result.error;
    }

    return commandResult;
  }

  private async processMemoryQueryCommand(
    agent: Agent,
    command: Command
  ): Promise<CommandResult> {
    if (!agent.memory) {
      return {
        success: false,
        error: 'Agent has no memory module',
        executionTime: 0,
      };
    }

    // Check if embeddings are enabled from agent config
    const memoryConfig = (agent.config?.modules?.memory as any) || {};
    const useEmbeddings =
      memoryConfig.enable_embeddings === 'true' ||
      memoryConfig.enable_embeddings === true ||
      process.env["ENABLE_OPENAI_EMBEDDINGS"] === 'true';

    let memories;
    if (useEmbeddings) {
      // Find embedding-capable portal
      const embeddingPortal = (agent as any).findPortalByCapability
        ? (agent as any).findPortalByCapability('embedding_generation')
        : agent.portal;

      if (
        embeddingPortal &&
        typeof embeddingPortal.generateEmbedding === 'function'
      ) {
        runtimeLogger.memory(
          '🔍 Using embeddings for enhanced memory retrieval'
        );
        try {
          const embeddingResult = await embeddingPortal.generateEmbedding(
            command.instruction
          );
          const queryEmbedding = embeddingResult.embedding;

          // Use vector search for more relevant memories
          if (
            agent.memory.search &&
            typeof agent.memory.search === 'function'
          ) {
            memories = await agent.memory.search(agent.id, queryEmbedding, 10);
          } else {
            // Fallback to regular retrieval
            memories = await agent.memory.retrieve(
              agent.id,
              command.instruction,
              10
            );
          }
        } catch (error) {
          void error;
          this.logger.warn(
            '⚠️ Failed to generate embedding, falling back to text search:',
            {
              error: {
                code: 'EMBEDDING_ERROR',
                message: error instanceof Error ? error.message : String(error),
                ...(error instanceof Error && error.stack
                  ? { stack: error.stack }
                  : {}),
                cause: error,
              },
            }
          );
          memories = await agent.memory.retrieve(
            agent.id,
            command.instruction,
            10
          );
        }
      } else {
        runtimeLogger.memory(
          '📝 No embedding portal available, using text search'
        );
        memories = await agent.memory.retrieve(
          agent.id,
          command.instruction,
          10
        );
      }
    } else {
      memories = await agent.memory.retrieve(agent.id, command.instruction, 10);
    }

    return {
      success: true,
      response: `Found ${memories.length} memories related to: ${command.instruction}`,
      data: memories,
      executionTime: 0,
    };
  }

  private async processMemoryStoreCommand(
    agent: Agent,
    command: Command
  ): Promise<CommandResult> {
    if (!agent.memory) {
      return {
        success: false,
        error: 'Agent has no memory module',
        executionTime: 0,
      };
    }

    await agent.memory.store(agent.id, {
      id: `cmd_${Date.now()}`,
      agentId: agent.id,
      content: command.instruction,
      type: 'interaction' as MemoryType,
      metadata: {
        source: 'command_system',
        timestamp: new Date(),
      },
      importance: 0.5,
      timestamp: new Date(),
      tags: ['command', 'instruction'],
      duration: 'working' as MemoryDuration,
    });

    return {
      success: true,
      response: 'Memory stored successfully',
      executionTime: 0,
    };
  }

  private async processStatusCommand(
    agent: Agent,
    _command: Command
  ): Promise<CommandResult> {
    const status = {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      emotion: agent.emotion?.current || 'unknown',
      lastUpdate: agent.lastUpdate,
      extensions: agent.extensions.map((ext) => ({
        id: ext.id,
        name: ext.name,
        enabled: ext.enabled,
        status: ext.status,
      })),
    };

    return {
      success: true,
      response: `Agent ${agent.name} is ${agent.status} with emotion ${status.emotion}`,
      data: status,
      executionTime: 0,
    };
  }

  private async processControlCommand(
    agent: Agent,
    command: Command
  ): Promise<CommandResult> {
    // This would integrate with the runtime to control the agent
    const instruction = command.instruction.toLowerCase();

    switch (instruction) {
      case 'pause':
        // Set agent to paused state
        return {
          success: true,
          response: `Agent ${agent.name} paused`,
          executionTime: 0,
        };
      case 'resume':
        // Resume agent
        return {
          success: true,
          response: `Agent ${agent.name} resumed`,
          executionTime: 0,
        };
      default:
        return {
          success: false,
          error: `Unknown control command: ${instruction}`,
          executionTime: 0,
        };
    }
  }

  private async processCustomCommand(
    agent: Agent,
    command: Command
  ): Promise<CommandResult> {
    // Try to process as a chat command
    return this.processChatCommand(agent, command);
  }

  private broadcastUpdate(command: Command): void {
    const update = {
      type: 'command_update',
      data: {
        id: command.id,
        agentId: command.agentId,
        status: command.status,
        progress: command.progress,
        result: command.result,
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all WebSocket connections
    for (const ws of this.wsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(update));
        } catch (error) {
          void error;
          this.logger.warn('Failed to send update to WebSocket:', {
            error: {
              code: 'WEBSOCKET_SEND_ERROR',
              message: error instanceof Error ? error.message : String(error),
              ...(error instanceof Error && error.stack
                ? { stack: error.stack }
                : {}),
              cause: error,
            },
          });
        }
      }
    }
  }

  /**
   * Analyze a message for emotional triggers and sentiment
   */
  private analyzeMessageEmotion(
    message: string,
    isAgentResponse = false
  ): {
    type: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    intensity: number;
    context: Record<string, any>;
  } {
    const lowerMessage = message.toLowerCase();

    // Emotional trigger patterns
    const emotionalPatterns = {
      // Positive triggers
      excited: [
        'amazing',
        'awesome',
        'incredible',
        'fantastic',
        'wow',
        '!',
        'great job',
        'excellent',
        'perfect',
      ],
      happy: [
        'happy',
        'joy',
        'pleased',
        'good',
        'nice',
        'wonderful',
        'love',
        'like',
      ],
      proud: [
        'proud',
        'accomplished',
        'achieved',
        'success',
        'won',
        'victory',
        'best',
      ],
      friendly: [
        'hello',
        'hi',
        'thanks',
        'thank you',
        'please',
        'welcome',
        'nice to meet',
      ],

      // Negative triggers
      frustrated: [
        'frustrated',
        'annoying',
        'stupid',
        'dumb',
        'hate',
        'angry',
        'mad',
        'ugh',
      ],
      sad: [
        'sad',
        'disappointed',
        'sorry',
        'unfortunate',
        'bad',
        'terrible',
        'awful',
      ],
      confused: [
        'confused',
        "don't understand",
        'what',
        '?',
        'how',
        'unclear',
        'help',
      ],

      // Neutral/contextual
      curious: [
        'why',
        'how',
        'what if',
        'interesting',
        'tell me',
        'explain',
        'curious',
      ],
      cautious: ['careful', 'sure', 'certain', 'risk', 'danger', 'safe'],
      determined: [
        'will',
        'must',
        'need to',
        'going to',
        'determined',
        'focus',
      ],
    };

    let dominantEmotion = 'neutral';
    let maxScore = 0;
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let intensity = 0.3; // Base intensity

    // Check for emotional patterns
    for (const [emotion, patterns] of Object.entries(emotionalPatterns)) {
      const score = patterns.reduce((acc, pattern) => {
        // Escape special regex characters to treat pattern as literal text
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = (
          lowerMessage.match(new RegExp(escapedPattern, 'g')) || []
        ).length;
        return acc + matches;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
        intensity = Math.min(1.0, 0.3 + score * 0.2);
      }
    }

    // Determine sentiment
    const positiveEmotions = [
      'excited',
      'happy',
      'proud',
      'friendly',
      'curious',
    ];
    const negativeEmotions = ['frustrated', 'sad', 'confused'];

    if (positiveEmotions.includes(dominantEmotion)) {
      sentiment = 'positive';
    } else if (negativeEmotions.includes(dominantEmotion)) {
      sentiment = 'negative';
    }

    // Adjust intensity based on punctuation and caps
    const exclamationCount = (message.match(/!/g) || []).length;
    const questionCount = (message.match(/\?/g) || []).length;
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;

    intensity += exclamationCount * 0.1;
    intensity += questionCount * 0.05;
    intensity += capsRatio * 0.3;
    intensity = Math.min(1.0, intensity);

    return {
      type: dominantEmotion,
      sentiment,
      intensity,
      context: {
        isAgentResponse,
        exclamationCount,
        questionCount,
        capsRatio,
        messageLength: message.length,
        emotionalScore: maxScore,
      },
    };
  }

  /**
   * Build system prompt that includes emotional state
   * @deprecated Use PromptIntegration for sophisticated prompting
   */
  // private _buildEmotionalSystemPrompt(
  //   _agent: Agent,
  //   emotionalContext: {
  //     currentEmotion?: string;
  //     emotionIntensity?: number;
  //     emotionModifiers?: Record<string, number>;
  //     emotionColor?: string;
  //     postResponseEmotion?: string;
  //     postResponseIntensity?: number;
  //   },
  //   conversationContext?: string
  // ): string {
  //   // Legacy implementation preserved for backward compatibility
  //   let prompt = `You are in a chat conversation. Respond naturally and helpfully.`;

  //   // Add emotional state context
  //   if (
  //     emotionalContext.currentEmotion &&
  //     emotionalContext.currentEmotion !== 'neutral'
  //   ) {
  //     const intensity = emotionalContext.emotionIntensity || 0;
  //     prompt += `\n\nYour current emotional state: ${emotionalContext.currentEmotion} (intensity: ${(intensity * 100).toFixed(0)}%)`;

  //     // Add emotional modifiers guidance
  //     if (
  //       emotionalContext.emotionModifiers &&
  //       Object.keys(emotionalContext.emotionModifiers).length > 0
  //     ) {
  //       prompt += `\nEmotional influences on your behavior:`;
  //       for (const [modifier, value] of Object.entries(
  //         emotionalContext.emotionModifiers
  //       )) {
  //         if (typeof value === 'number' && value !== 1.0) {
  //           const change = value > 1.0 ? 'increased' : 'decreased';
  //           const percentage = Math.abs((value - 1.0) * 100).toFixed(0);
  //           prompt += `\n- ${modifier}: ${change} by ${percentage}%`;
  //         }
  //       }
  //     }

  //     // Add emotional guidance
  //     prompt += `\n\nRespond in a way that reflects your ${emotionalContext.currentEmotion} emotional state. `;
  //     prompt += this.getEmotionalGuidance(
  //       emotionalContext.currentEmotion,
  //       intensity
  //     );
  //   }

  //   // Add conversation context
  //   if (conversationContext) {
  //     prompt += `\n\nRecent conversation context:\n${conversationContext}`;
  //   }

  //   return prompt;
  // }

  /**
   * Get behavioral guidance based on emotional state
   * @deprecated - Method removed as it's not used
   */
  // Method removed - was not being used and causing build errors

  /**
   * Build enhanced system prompt that includes emotional AND cognitive context
   */
  private buildEnhancedSystemPrompt(
    agent: Agent,
    message: string,
    emotionalContext: {
      currentEmotion?: string;
      emotionIntensity?: number;
      emotionModifiers?: Record<string, number>;
      emotionColor?: string;
      postResponseEmotion?: string;
      postResponseIntensity?: number;
    },
    conversationContext?: string,
    _cognitiveContext?: {
      thoughts?: string[];
      cognitiveActions?: any[];
      cognitiveEmotions?: any[];
      cognitiveConfidence?: number;
      cognitiveMemories?: any[];
    }
  ): string {
    // Build system prompt manually for now
    const emotionString = emotionalContext?.currentEmotion
      ? `\nCurrent emotion: ${emotionalContext.currentEmotion} (${Math.round((emotionalContext.emotionIntensity || 0) * 100)}%)`
      : '';
    const conversationString = conversationContext
      ? `\nConversation context:\n${conversationContext}`
      : '';

    // Access character config properties safely
    const characterConfig = agent.characterConfig || agent.config;
    const backstory = (characterConfig as any).personality?.backstory || '';
    const guidelines = (characterConfig as any).communication?.guidelines || [];

    return `You are ${agent.name}. ${backstory}

${guidelines.join('\n')}${emotionString}${conversationString}

Respond naturally to: "${message}"`;
  }

  public getStats(): {
    totalCommands: number;
    pendingCommands: number;
    processingCommands: number;
    completedCommands: number;
    failedCommands: number;
    averageExecutionTime: number;
  } {
    const commands = Array.from(this.commands.values());
    const completed = commands.filter(
      (cmd) => cmd.status === CommandStatus.COMPLETED
    );
    const totalExecutionTime = completed.reduce(
      (sum, cmd) => sum + (cmd.result?.executionTime || 0),
      0
    );

    return {
      totalCommands: commands.length,
      pendingCommands: commands.filter(
        (cmd) => cmd.status === CommandStatus.PENDING
      ).length,
      processingCommands: commands.filter(
        (cmd) => cmd.status === CommandStatus.PROCESSING
      ).length,
      completedCommands: completed.length,
      failedCommands: commands.filter(
        (cmd) => cmd.status === CommandStatus.FAILED
      ).length,
      averageExecutionTime:
        completed.length > 0 ? totalExecutionTime / completed.length : 0,
    };
  }
}

export default CommandSystem;
