/**
 * Command System for Agent Instruction Processing
 * 
 * Handles parsing, queuing, and execution of commands sent to agents.
 * Supports both synchronous and asynchronous operations with progress tracking.
 */

import { EventEmitter } from 'events'
import { Agent, AgentAction, ActionStatus, MemoryType, MemoryDuration } from '../types/agent.js'
import { ActionCategory, ActionResultType } from '../types/enums.js'
import { Logger } from '../utils/logger.js'
import { WebSocket } from 'ws'

export interface Command {
  id: string
  type: CommandType
  agentId: string
  instruction: string
  parameters?: Record<string, any>
  priority: CommandPriority
  async: boolean
  timeout?: number
  timestamp: Date
  status: CommandStatus
  result?: CommandResult
  progress?: CommandProgress
}

export interface CommandResult {
  success: boolean
  response?: string
  data?: any
  error?: string
  executionTime: number
}

export interface CommandProgress {
  percentage: number
  stage: string
  details?: string
}

export enum CommandType {
  CHAT = 'chat',
  ACTION = 'action',
  MEMORY_QUERY = 'memory_query',
  MEMORY_STORE = 'memory_store',
  STATUS = 'status',
  CONTROL = 'control',
  CUSTOM = 'custom'
}

export enum CommandPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

export enum CommandStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export interface CommandParser {
  canParse(input: string): boolean
  parse(input: string): Partial<Command>
}

export class CommandSystem extends EventEmitter {
  private logger = new Logger('command-system')
  private commands = new Map<string, Command>()
  private queues = new Map<string, Command[]>() // agentId -> commands
  private parsers: CommandParser[] = []
  private processing = new Set<string>() // commandIds being processed
  private agents = new Map<string, Agent>()
  private wsConnections = new Set<WebSocket>()

  constructor() {
    super()
    this.setupDefaultParsers()
    this.startProcessingLoop()
  }

  private setupDefaultParsers(): void {
    // Chat message parser
    this.parsers.push({
      canParse: (input: string) => {
        return !input.startsWith('/') && !input.startsWith('!')
      },
      parse: (input: string) => ({
        type: CommandType.CHAT,
        instruction: input,
        priority: CommandPriority.NORMAL,
        async: false
      })
    })

    // Action command parser (/action, !action)
    this.parsers.push({
      canParse: (input: string) => {
        return input.startsWith('/action ') || input.startsWith('!action ')
      },
      parse: (input: string) => {
        const parts = input.slice(8).trim().split(' ')
        const actionName = parts[0]
        const params = parts.slice(1).join(' ')
        
        return {
          type: CommandType.ACTION,
          instruction: actionName,
          parameters: params ? this.parseParameters(params) : {},
          priority: CommandPriority.HIGH,
          async: true
        }
      }
    })

    // Memory query parser (/memory, /remember)
    this.parsers.push({
      canParse: (input: string) => {
        return input.startsWith('/memory ') || input.startsWith('/remember ')
      },
      parse: (input: string) => {
        const query = input.startsWith('/memory ') 
          ? input.slice(8).trim()
          : input.slice(10).trim()
        
        return {
          type: CommandType.MEMORY_QUERY,
          instruction: query,
          priority: CommandPriority.NORMAL,
          async: false
        }
      }
    })

    // Status command parser (/status)
    this.parsers.push({
      canParse: (input: string) => {
        return input === '/status' || input === '/info'
      },
      parse: (input: string) => ({
        type: CommandType.STATUS,
        instruction: 'get_status',
        priority: CommandPriority.LOW,
        async: false
      })
    })

    // Control command parser (/pause, /resume, /stop)
    this.parsers.push({
      canParse: (input: string) => {
        return ['/pause', '/resume', '/stop', '/start'].includes(input)
      },
      parse: (input: string) => ({
        type: CommandType.CONTROL,
        instruction: input.slice(1),
        priority: CommandPriority.URGENT,
        async: false
      })
    })

    // Store memory parser (/store)
    this.parsers.push({
      canParse: (input: string) => {
        return input.startsWith('/store ')
      },
      parse: (input: string) => {
        const content = input.slice(7).trim()
        return {
          type: CommandType.MEMORY_STORE,
          instruction: content,
          priority: CommandPriority.NORMAL,
          async: false
        }
      }
    })
  }

  public addParser(parser: CommandParser): void {
    this.parsers.unshift(parser) // Add to beginning for priority
  }

  public registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent)
    if (!this.queues.has(agent.id)) {
      this.queues.set(agent.id, [])
    }
    this.logger.info(`Registered agent: ${agent.name} (${agent.id})`)
  }

  public unregisterAgent(agentId: string): void {
    this.agents.delete(agentId)
    this.queues.delete(agentId)
    this.logger.info(`Unregistered agent: ${agentId}`)
  }

  public addWebSocketConnection(ws: WebSocket): void {
    this.wsConnections.add(ws)
    
    ws.on('close', () => {
      this.wsConnections.delete(ws)
    })
  }

  public async sendCommand(agentId: string, input: string, options?: {
    priority?: CommandPriority
    async?: boolean
    timeout?: number
  }): Promise<Command> {
    const command = this.parseCommand(agentId, input, options)
    
    if (!this.agents.has(agentId)) {
      command.status = CommandStatus.FAILED
      command.result = {
        success: false,
        error: `Agent ${agentId} not found`,
        executionTime: 0
      }
      return command
    }

    // Add to queue
    const queue = this.queues.get(agentId)!
    this.insertByPriority(queue, command)
    this.commands.set(command.id, command)

    this.logger.info(`Queued command ${command.id} for agent ${agentId}: ${command.instruction}`)
    this.emit('command_queued', command)
    this.broadcastUpdate(command)

    // If synchronous, wait for completion
    if (!command.async) {
      return this.waitForCompletion(command)
    }

    return command
  }

  public async sendMessage(agentId: string, message: string): Promise<string> {
    const command = await this.sendCommand(agentId, message, { 
      priority: CommandPriority.NORMAL,
      async: false 
    })

    if (command.result?.success) {
      return command.result.response || 'No response'
    } else {
      throw new Error(command.result?.error || 'Command failed')
    }
  }

  public getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId)
  }

  public getAgentQueue(agentId: string): Command[] {
    return this.queues.get(agentId) || []
  }

  public getAllCommands(): Command[] {
    return Array.from(this.commands.values())
  }

  public getActiveCommands(): Command[] {
    return Array.from(this.commands.values()).filter(
      cmd => cmd.status === CommandStatus.PROCESSING
    )
  }

  public cancelCommand(commandId: string): boolean {
    const command = this.commands.get(commandId)
    if (!command || command.status !== CommandStatus.PENDING) {
      return false
    }

    command.status = CommandStatus.CANCELLED
    this.emit('command_cancelled', command)
    this.broadcastUpdate(command)
    return true
  }

  private parseCommand(agentId: string, input: string, options?: {
    priority?: CommandPriority
    async?: boolean
    timeout?: number
  }): Command {
    const commandId = this.generateCommandId()
    
    // Find suitable parser
    let parsedCommand: Partial<Command> = {
      type: CommandType.CUSTOM,
      instruction: input,
      priority: CommandPriority.NORMAL,
      async: false
    }

    for (const parser of this.parsers) {
      if (parser.canParse(input)) {
        parsedCommand = parser.parse(input)
        break
      }
    }

    // Apply options overrides
    if (options) {
      if (options.priority !== undefined) parsedCommand.priority = options.priority
      if (options.async !== undefined) parsedCommand.async = options.async
      if (options.timeout !== undefined) parsedCommand.timeout = options.timeout
    }

    return {
      id: commandId,
      type: parsedCommand.type || CommandType.CUSTOM,
      agentId,
      instruction: parsedCommand.instruction || input,
      parameters: parsedCommand.parameters,
      priority: parsedCommand.priority || CommandPriority.NORMAL,
      async: parsedCommand.async || false,
      timeout: parsedCommand.timeout,
      timestamp: new Date(),
      status: CommandStatus.PENDING
    }
  }

  private parseParameters(paramString: string): Record<string, any> {
    try {
      // Try JSON first
      if (paramString.startsWith('{') && paramString.endsWith('}')) {
        return JSON.parse(paramString)
      }

      // Parse key=value pairs
      const params: Record<string, any> = {}
      const pairs = paramString.match(/(\w+)=([^\s]+)/g) || []
      
      for (const pair of pairs) {
        const [key, value] = pair.split('=')
        // Try to parse as number or boolean
        if (value === 'true') params[key] = true
        else if (value === 'false') params[key] = false
        else if (!isNaN(Number(value))) params[key] = Number(value)
        else params[key] = value
      }

      return params
    } catch (error) {
      this.logger.warn('Failed to parse parameters:', paramString, error)
      return { raw: paramString }
    }
  }

  private insertByPriority(queue: Command[], command: Command): void {
    const insertIndex = queue.findIndex(cmd => cmd.priority < command.priority)
    if (insertIndex === -1) {
      queue.push(command)
    } else {
      queue.splice(insertIndex, 0, command)
    }
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async waitForCompletion(command: Command): Promise<Command> {
    return new Promise((resolve, reject) => {
      const timeout = command.timeout || 30000 // 30 second default
      
      const timeoutId = setTimeout(() => {
        command.status = CommandStatus.TIMEOUT
        command.result = {
          success: false,
          error: 'Command timed out',
          executionTime: timeout
        }
        reject(new Error('Command timed out'))
      }, timeout)

      const checkCompletion = () => {
        if (command.status === CommandStatus.COMPLETED || command.status === CommandStatus.FAILED) {
          clearTimeout(timeoutId)
          resolve(command)
        }
      }

      // Check immediately in case it's already done
      checkCompletion()

      // Listen for updates
      this.on('command_completed', (completedCommand) => {
        if (completedCommand.id === command.id) {
          checkCompletion()
        }
      })
    })
  }

  private startProcessingLoop(): void {
    setInterval(async () => {
      await this.processQueues()
    }, 100) // Process every 100ms
  }

  private async processQueues(): Promise<void> {
    for (const [agentId, queue] of this.queues) {
      if (queue.length === 0) continue

      const command = queue[0]
      if (command.status !== CommandStatus.PENDING) continue
      if (this.processing.has(command.id)) continue

      // Start processing
      queue.shift() // Remove from queue
      this.processing.add(command.id)
      command.status = CommandStatus.PROCESSING
      
      this.emit('command_started', command)
      this.broadcastUpdate(command)

      // Process asynchronously
      this.processCommand(command).finally(() => {
        this.processing.delete(command.id)
      })
    }
  }

  private async processCommand(command: Command): Promise<void> {
    const startTime = Date.now()
    const agent = this.agents.get(command.agentId)

    if (!agent) {
      command.status = CommandStatus.FAILED
      command.result = {
        success: false,
        error: `Agent ${command.agentId} not found`,
        executionTime: Date.now() - startTime
      }
      this.emit('command_completed', command)
      this.broadcastUpdate(command)
      return
    }

    try {
      let result: CommandResult

      switch (command.type) {
        case CommandType.CHAT:
          result = await this.processChatCommand(agent, command)
          break
        case CommandType.ACTION:
          result = await this.processActionCommand(agent, command)
          break
        case CommandType.MEMORY_QUERY:
          result = await this.processMemoryQueryCommand(agent, command)
          break
        case CommandType.MEMORY_STORE:
          result = await this.processMemoryStoreCommand(agent, command)
          break
        case CommandType.STATUS:
          result = await this.processStatusCommand(agent, command)
          break
        case CommandType.CONTROL:
          result = await this.processControlCommand(agent, command)
          break
        default:
          result = await this.processCustomCommand(agent, command)
      }

      command.status = result.success ? CommandStatus.COMPLETED : CommandStatus.FAILED
      command.result = {
        ...result,
        executionTime: Date.now() - startTime
      }

    } catch (error) {
      this.logger.error(`Command ${command.id} failed:`, error)
      command.status = CommandStatus.FAILED
      command.result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      }
    }

    this.emit('command_completed', command)
    this.broadcastUpdate(command)
  }

  private async processChatCommand(agent: Agent, command: Command): Promise<CommandResult> {
    // Use agent's cognition to process the message
    if (!agent.cognition) {
      return {
        success: false,
        error: 'Agent has no cognition module',
        executionTime: 0
      }
    }

    // Create a context for the thought
    const context = {
      events: [],
      memories: [],
      currentState: { location: 'chat', inventory: {}, stats: {}, goals: [], context: {} },
      environment: { 
        type: 'virtual' as any, 
        time: new Date(), 
        weather: 'clear', 
        location: 'chat', 
        npcs: [], 
        objects: [], 
        events: [] 
      }
    }

    const thoughtResult = await agent.cognition.think(agent, context)
    
    // Look for communication actions in the response
    const communicationActions = thoughtResult.actions.filter(
      action => action.type === ActionCategory.COMMUNICATION
    )

    let response = 'I heard you, but I don\'t have anything to say right now.'
    
    if (communicationActions.length > 0) {
      const firstComm = communicationActions[0]
      response = String(firstComm.parameters?.message || firstComm.parameters?.text || response)
    }

    return {
      success: true,
      response,
      executionTime: 0
    }
  }

  private async processActionCommand(agent: Agent, command: Command): Promise<CommandResult> {
    // Find the extension that can handle this action
    const extension = agent.extensions.find(ext => 
      Object.keys(ext.actions).includes(command.instruction)
    )

    if (!extension) {
      return {
        success: false,
        error: `No extension found for action: ${command.instruction}`,
        executionTime: 0
      }
    }

    const action = extension.actions[command.instruction]
    const result = await action.execute(agent, command.parameters || {})

    return {
      success: result.success,
      response: result.result ? String(result.result) : undefined,
      data: result.result,
      error: result.error,
      executionTime: 0
    }
  }

  private async processMemoryQueryCommand(agent: Agent, command: Command): Promise<CommandResult> {
    if (!agent.memory) {
      return {
        success: false,
        error: 'Agent has no memory module',
        executionTime: 0
      }
    }

    const memories = await agent.memory.retrieve(agent.id, command.instruction, 10)
    
    return {
      success: true,
      response: `Found ${memories.length} memories related to: ${command.instruction}`,
      data: memories,
      executionTime: 0
    }
  }

  private async processMemoryStoreCommand(agent: Agent, command: Command): Promise<CommandResult> {
    if (!agent.memory) {
      return {
        success: false,
        error: 'Agent has no memory module',
        executionTime: 0
      }
    }

    await agent.memory.store(agent.id, {
      id: `cmd_${Date.now()}`,
      agentId: agent.id,
      content: command.instruction,
      type: 'interaction' as MemoryType,
      metadata: {
        source: 'command_system',
        timestamp: new Date()
      },
      importance: 0.5,
      timestamp: new Date(),
      tags: ['command', 'instruction'],
      duration: 'working' as MemoryDuration
    })

    return {
      success: true,
      response: 'Memory stored successfully',
      executionTime: 0
    }
  }

  private async processStatusCommand(agent: Agent, command: Command): Promise<CommandResult> {
    const status = {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      emotion: agent.emotion?.current || 'unknown',
      lastUpdate: agent.lastUpdate,
      extensions: agent.extensions.map(ext => ({
        id: ext.id,
        name: ext.name,
        enabled: ext.enabled,
        status: ext.status
      }))
    }

    return {
      success: true,
      response: `Agent ${agent.name} is ${agent.status} with emotion ${status.emotion}`,
      data: status,
      executionTime: 0
    }
  }

  private async processControlCommand(agent: Agent, command: Command): Promise<CommandResult> {
    // This would integrate with the runtime to control the agent
    const instruction = command.instruction.toLowerCase()
    
    switch (instruction) {
      case 'pause':
        // Set agent to paused state
        return {
          success: true,
          response: `Agent ${agent.name} paused`,
          executionTime: 0
        }
      case 'resume':
        // Resume agent
        return {
          success: true,
          response: `Agent ${agent.name} resumed`,
          executionTime: 0
        }
      default:
        return {
          success: false,
          error: `Unknown control command: ${instruction}`,
          executionTime: 0
        }
    }
  }

  private async processCustomCommand(agent: Agent, command: Command): Promise<CommandResult> {
    // Try to process as a chat command
    return this.processChatCommand(agent, command)
  }

  private broadcastUpdate(command: Command): void {
    const update = {
      type: 'command_update',
      data: {
        id: command.id,
        agentId: command.agentId,
        status: command.status,
        progress: command.progress,
        result: command.result
      },
      timestamp: new Date().toISOString()
    }

    // Broadcast to all WebSocket connections
    for (const ws of this.wsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(update))
        } catch (error) {
          this.logger.warn('Failed to send update to WebSocket:', error)
        }
      }
    }
  }

  public getStats(): {
    totalCommands: number
    pendingCommands: number
    processingCommands: number
    completedCommands: number
    failedCommands: number
    averageExecutionTime: number
  } {
    const commands = Array.from(this.commands.values())
    const completed = commands.filter(cmd => cmd.status === CommandStatus.COMPLETED)
    const totalExecutionTime = completed.reduce((sum, cmd) => 
      sum + (cmd.result?.executionTime || 0), 0
    )

    return {
      totalCommands: commands.length,
      pendingCommands: commands.filter(cmd => cmd.status === CommandStatus.PENDING).length,
      processingCommands: commands.filter(cmd => cmd.status === CommandStatus.PROCESSING).length,
      completedCommands: completed.length,
      failedCommands: commands.filter(cmd => cmd.status === CommandStatus.FAILED).length,
      averageExecutionTime: completed.length > 0 ? totalExecutionTime / completed.length : 0
    }
  }
}

export default CommandSystem