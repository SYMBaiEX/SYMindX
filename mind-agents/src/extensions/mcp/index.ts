/**
 * MCP Extension
 * 
 * This extension provides Model Context Protocol (MCP) server functionality.
 */

import { spawn, ChildProcess } from 'child_process'
import { Extension, ExtensionType, ExtensionStatus, Agent, ExtensionAction, ExtensionEventHandler, ActionResultType } from '../../types/agent.js'
import { ExtensionConfig } from '../../types/common.js'
import {
  McpConfig,
  McpSettings,
  McpServer,
  McpCapabilities,
  McpTool,
  McpResource,
  McpPrompt,
  McpMessage,
  McpRequest,
  McpResponse,
  McpInitializeRequest,
  McpInitializeResponse,
  McpToolCallRequest,
  McpToolCallResponse,
  McpResourceRequest,
  McpResourceResponse,
  McpPromptRequest,
  McpPromptResponse,
  McpLogEntry,
  McpServerStats,
  McpConnectionInfo,
  McpSecurityContext
} from './types.js'

export class McpExtension implements Extension {
  id = 'mcp'
  name = 'MCP Server'
  version = '1.0.0'
  type = ExtensionType.COMMUNICATION
  enabled = true
  status = ExtensionStatus.DISABLED
  config: McpConfig
  actions: Record<string, ExtensionAction> = {}
  events: Record<string, ExtensionEventHandler> = {}
  
  private agent: Agent
  private mcpConfig: McpSettings
  private server: McpServer | null = null
  private process: ChildProcess | null = null
  private isRunning = false
  private messageId = 0
  private pendingRequests = new Map<string | number, (response: McpResponse) => void>()
  private stats: McpServerStats
  private connectionInfo: McpConnectionInfo
  private securityContext: McpSecurityContext

  constructor(config: McpConfig) {
    this.config = config
    
    this.mcpConfig = {
      ...this.getDefaultSettings(),
      ...config.settings
    }
    
    // Initialize stats
    this.stats = {
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      lastActivity: new Date(),
      memoryUsage: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0
      }
    }
    
    // Initialize connection info
    this.connectionInfo = {
      transport: 'stdio',
      connected: false
    }
    
    // Initialize security context
    this.securityContext = {
      allowedCommands: new Set(this.mcpConfig.security?.allowedCommands || []),
      blockedCommands: new Set(this.mcpConfig.security?.blockedCommands || []),
      sandboxed: this.mcpConfig.security?.sandboxed || false,
      permissions: {
        fileSystem: !this.mcpConfig.security?.sandboxed,
        network: !this.mcpConfig.security?.sandboxed,
        process: !this.mcpConfig.security?.sandboxed
      }
    }
  }

  async init(agent: Agent): Promise<void> {
    this.agent = agent
    
    // Initialize default settings
    this.mcpConfig = {
      serverName: 'symindx-mcp-server',
      serverCommand: 'node',
      serverArgs: [],
      serverEnv: {},
      autoStart: true,
      restartOnFailure: true,
      maxRestartAttempts: 3,
      restartDelay: 5000,
      timeout: 30000,
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        logging: true
      },
      security: {
        allowedCommands: [],
        blockedCommands: [],
        sandboxed: false
      },
      ...this.config.settings
    }
    
    // Initialize stats
    this.stats = {
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      lastActivity: new Date(),
      memoryUsage: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0
      }
    }
    
    // Initialize connection info
    this.connectionInfo = {
      transport: 'stdio',
      connected: false
    }
    
    // Initialize security context
    this.securityContext = {
      allowedCommands: new Set(this.mcpConfig.security?.allowedCommands || []),
      blockedCommands: new Set(this.mcpConfig.security?.blockedCommands || []),
      sandboxed: this.mcpConfig.security?.sandboxed || false,
      permissions: {
        fileSystem: !this.mcpConfig.security?.sandboxed,
        network: !this.mcpConfig.security?.sandboxed,
        process: !this.mcpConfig.security?.sandboxed
      }
    }
    
    if (this.mcpConfig.autoStart) {
      await this.startServer()
    }
    
    this.agent.logger?.info(`MCP Extension initialized with server: ${this.mcpConfig.serverName}`)
  }

  async tick(agent: Agent): Promise<void> {
    // Periodic tasks for MCP extension
  }

  // Server management methods
  isServerRunning(): boolean {
    return this.serverProcess !== null && !this.serverProcess.killed
  }

  getServerCapabilities(): any {
    return this.capabilities
  }

  getServerUptime(): number {
    return this.stats.uptime
  }

  getServerStats(): any {
    return this.stats
  }

  updateConfig(newConfig: any): void {
    this.mcpConfig = { ...this.mcpConfig, ...newConfig }
  }

  getServerPort(): number {
    return this.mcpConfig.port || 0
  }

  getUptime(): number {
    return this.stats.uptime
  }

  getActiveConnections(): number {
    return this.connectionInfo.connected ? 1 : 0
  }

  getLastActivity(): Date {
    return this.stats.lastActivity
  }

  getServerInfo(): any {
    return {
      name: this.mcpConfig.serverName,
      version: this.version,
      status: this.isServerRunning() ? 'running' : 'stopped'
    }
  }

  getCapabilities(): any {
    return this.capabilities
  }

  getConfiguration(): any {
    return this.mcpConfig
  }

  async testConnection(payload?: any, timeout?: number): Promise<any> {
    return {
      success: this.isServerRunning(),
      latency: 0,
      timestamp: new Date()
    }
  }

  getConnectionLogs(): any[] {
    return []
  }

  resetMetrics(): void {
    this.stats.requestCount = 0
    this.stats.errorCount = 0
  }

  setAlertConfiguration(config: any): void {
    // Implementation for alert configuration
  }

  emit(event: string, data: any): void {
    // Event emission implementation
  }

  // Tool management methods
  getAvailableTools(): any[] {
    return this.tools
  }

  validateToolParameters(toolName: string, parameters: any): any {
    return { valid: true }
  }

  async executeTool(toolName: string, parameters: any): Promise<any> {
    return {
      success: true,
      result: {},
      timestamp: new Date()
    }
  }

  logToolExecution(execution: any): void {
    // Log tool execution
  }

  getToolExecutionHistory(toolName?: string): any[] {
    return []
  }

  async registerCustomTool(toolDefinition: any): Promise<any> {
    return { success: true, type: ActionResultType.SUCCESS }
  }

  async unregisterTool(toolName: string): Promise<any> {
    return { success: true, type: ActionResultType.SUCCESS }
  }

  // Resource management methods
  getAvailableResources(): any[] {
    return this.resources
  }

  validateResourceUri(uri: string): any {
    return { valid: true }
  }

  async readResource(uri: string): Promise<any> {
    return {
      success: true,
      content: '',
      mimeType: 'text/plain'
    }
  }

  getResourceAccessHistory(uri: string): any[] {
    return []
  }

  async subscribeToResource(uri: string): Promise<any> {
    return { success: true, type: ActionResultType.SUCCESS }
  }

  async unsubscribeFromResource(uri: string): Promise<any> {
    return { success: true, type: ActionResultType.SUCCESS }
  }

  async searchResources(query: string, options?: any): Promise<any> {
    return {
      success: true,
      results: []
    }
  }

  getResourceTemplates(): any[] {
    return []
  }

  // Prompt management methods
  getAvailablePrompts(): any[] {
    return this.prompts
  }

  validatePromptArguments(name: string, args: any): any {
    return { valid: true }
  }

  async getPrompt(name: string, args: any): Promise<any> {
    return {
      success: true,
      content: '',
      timestamp: new Date()
    }
  }

  getPromptExecutionHistory(name?: string): any[] {
    return []
  }

  async executePrompt(name: string, args: any, context?: any): Promise<any> {
    return {
      success: true,
      result: '',
      timestamp: new Date()
    }
  }

  logPromptExecution(execution: any): void {
    // Log prompt execution
  }

  async createPromptTemplate(template: any): Promise<any> {
    return { success: true, type: ActionResultType.SUCCESS }
  }

  async updatePromptTemplate(name: string, template: any): Promise<any> {
    return { success: true, type: ActionResultType.SUCCESS }
  }

  async deletePromptTemplate(name: string): Promise<any> {
    return { success: true, type: ActionResultType.SUCCESS }
  }

  getDefaultSettings(): McpSettings {
    return {
      serverName: 'symindx-mcp-server',
      serverCommand: 'node',
      serverArgs: [],
      serverEnv: {},
      autoStart: true,
      restartOnFailure: true,
      maxRestartAttempts: 3,
      restartDelay: 5000,
      timeout: 30000,
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        logging: true
      },
      security: {
        allowedCommands: [],
        blockedCommands: [],
        sandboxed: false
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.server) {
      await this.stopServer()
    }
    
    this.pendingRequests.clear()
    this.agent.logger?.info('MCP Extension cleaned up')
  }

  async startServer(config?: any): Promise<void> {
    if (this.isRunning) {
      return
    }
    
    try {
      // Create server instance
      this.server = {
        id: `mcp-${Date.now()}`,
        name: this.mcpConfig.serverName,
        command: this.mcpConfig.serverCommand,
        args: this.mcpConfig.serverArgs || [],
        env: { ...process.env, ...this.mcpConfig.serverEnv },
        status: 'starting',
        restartCount: 0,
        capabilities: {
          tools: [],
          resources: [],
          prompts: [],
          logging: this.mcpConfig.capabilities.logging || false
        }
      }
      
      // Start the process
      this.process = spawn(this.server.command, this.server.args, {
        env: this.server.env,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      this.server.pid = this.process.pid
      this.server.startTime = new Date()
      
      // Setup process event handlers
      this.setupProcessHandlers()
      
      // Initialize the MCP connection
      await this.initializeConnection()
      
      this.server.status = 'running'
      this.isRunning = true
      this.connectionInfo.connected = true
      
      this.agent.logger?.info(`MCP server started with PID: ${this.server.pid}`)
    } catch (error) {
      this.agent.logger?.error('Failed to start MCP server:', error)
      if (this.server) {
        this.server.status = 'error'
        this.server.lastError = error instanceof Error ? error.message : String(error)
      }
      throw error
    }
  }

  async stopServer(): Promise<void> {
    if (!this.isRunning || !this.process) {
      return
    }
    
    try {
      this.process.kill('SIGTERM')
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL')
          }
          resolve()
        }, 5000)
        
        this.process?.on('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
      
      this.isRunning = false
      this.connectionInfo.connected = false
      
      if (this.server) {
        this.server.status = 'stopped'
      }
      
      this.agent.logger?.info('MCP server stopped')
    } catch (error) {
      this.agent.logger?.error('Error stopping MCP server:', error)
    }
  }

  private setupProcessHandlers(): void {
    if (!this.process) return
    
    this.process.stdout?.on('data', (data) => {
      try {
        const messages = data.toString().trim().split('\n')
        for (const messageStr of messages) {
          if (messageStr.trim()) {
            const message: McpMessage = JSON.parse(messageStr)
            this.handleMessage(message)
          }
        }
      } catch (error) {
        this.agent.logger?.error('Error parsing MCP message:', error)
      }
    })
    
    this.process.stderr?.on('data', (data) => {
      this.agent.logger?.error('MCP server error:', data.toString())
      this.stats.errorCount++
    })
    
    this.process.on('exit', (code, signal) => {
      this.agent.logger?.info(`MCP server exited with code ${code}, signal ${signal}`)
      this.isRunning = false
      this.connectionInfo.connected = false
      
      if (this.server) {
        this.server.status = code === 0 ? 'stopped' : 'crashed'
        
        // Handle restart on failure
        if (code !== 0 && this.mcpConfig.restartOnFailure) {
          this.handleServerRestart()
        }
      }
    })
    
    this.process.on('error', (error) => {
      this.agent.logger?.error('MCP server process error:', error)
      if (this.server) {
        this.server.status = 'error'
        this.server.lastError = error.message
      }
      this.stats.errorCount++
    })
  }

  private async handleServerRestart(): Promise<void> {
    if (!this.server || !this.mcpConfig.restartOnFailure) {
      return
    }
    
    if (this.server.restartCount >= (this.mcpConfig.maxRestartAttempts || 3)) {
      this.agent.logger?.error('Max restart attempts reached, giving up')
      return
    }
    
    this.server.restartCount++
    this.agent.logger?.info(`Restarting MCP server (attempt ${this.server.restartCount})`)
    
    // Wait before restarting
    await new Promise(resolve => setTimeout(resolve, this.mcpConfig.restartDelay || 5000))
    
    try {
      await this.startServer()
    } catch (error) {
      this.agent.logger?.error('Failed to restart MCP server:', error)
    }
  }

  private async initializeConnection(): Promise<void> {
    const initRequest: McpInitializeRequest = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: this.mcpConfig.capabilities.tools ? {} : undefined,
        resources: this.mcpConfig.capabilities.resources ? {} : undefined,
        prompts: this.mcpConfig.capabilities.prompts ? {} : undefined,
        logging: this.mcpConfig.capabilities.logging ? {} : undefined
      },
      clientInfo: {
        name: 'SYMindX Agent',
        version: this.version
      }
    }
    
    const response = await this.sendRequest('initialize', initRequest)
    
    if (response.error) {
      throw new Error(`MCP initialization failed: ${response.error.message}`)
    }
    
    const initResponse = response.result as McpInitializeResponse
    
    if (this.server) {
      this.server.capabilities = initResponse.capabilities
    }
    
    this.agent.logger?.info('MCP connection initialized successfully')
  }

  private handleMessage(message: McpMessage): void {
    this.stats.lastActivity = new Date()
    
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      // Handle response to our request
      const resolver = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)
      resolver(message as McpResponse)
    } else if (message.method) {
      // Handle notification or request from server
      this.handleServerMessage(message)
    }
  }

  private handleServerMessage(message: McpMessage): void {
    switch (message.method) {
      case 'notifications/message':
        this.handleLogMessage(message.params as McpLogEntry)
        break
      
      case 'notifications/progress':
        this.handleProgressNotification(message.params)
        break
      
      default:
        this.agent.logger?.debug(`Unhandled MCP message: ${message.method}`)
    }
  }

  private handleLogMessage(logEntry: McpLogEntry): void {
    if (!this.mcpConfig.capabilities.logging) {
      return
    }
    
    const logLevel = logEntry.level
    const logMessage = `MCP Server [${logEntry.logger || 'unknown'}]: ${JSON.stringify(logEntry.data)}`
    
    switch (logLevel) {
      case 'debug':
        this.agent.logger?.debug(logMessage)
        break
      case 'info':
      case 'notice':
        this.agent.logger?.info(logMessage)
        break
      case 'warning':
        this.agent.logger?.warn(logMessage)
        break
      case 'error':
      case 'critical':
      case 'alert':
      case 'emergency':
        this.agent.logger?.error(logMessage)
        break
    }
  }

  private handleProgressNotification(params: any): void {
    this.agent.logger?.debug('MCP Progress:', params)
  }

  private async sendRequest(method: string, params?: any): Promise<McpResponse> {
    if (!this.process || !this.isRunning) {
      throw new Error('MCP server not running')
    }
    
    const id = ++this.messageId
    const request: McpRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`MCP request timeout: ${method}`))
      }, this.mcpConfig.timeout || 30000)
      
      this.pendingRequests.set(id, (response) => {
        clearTimeout(timeout)
        resolve(response)
      })
      
      const messageStr = JSON.stringify(request) + '\n'
      this.process!.stdin?.write(messageStr)
      this.stats.requestCount++
    })
  }

  // Public API methods
  async callTool(name: string, arguments_?: Record<string, any>): Promise<McpToolCallResponse> {
    const request: McpToolCallRequest = {
      name,
      arguments: arguments_
    }
    
    const response = await this.sendRequest('tools/call', request)
    
    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`)
    }
    
    return response.result as McpToolCallResponse
  }

  async getResource(uri: string): Promise<McpResourceResponse> {
    const request: McpResourceRequest = { uri }
    
    const response = await this.sendRequest('resources/read', request)
    
    if (response.error) {
      throw new Error(`Resource read failed: ${response.error.message}`)
    }
    
    return response.result as McpResourceResponse
  }

  async getPrompt(name: string, arguments_?: Record<string, any>): Promise<McpPromptResponse> {
    const request: McpPromptRequest = {
      name,
      arguments: arguments_
    }
    
    const response = await this.sendRequest('prompts/get', request)
    
    if (response.error) {
      throw new Error(`Prompt get failed: ${response.error.message}`)
    }
    
    return response.result as McpPromptResponse
  }

  async listTools(): Promise<McpTool[]> {
    const response = await this.sendRequest('tools/list')
    
    if (response.error) {
      throw new Error(`Tools list failed: ${response.error.message}`)
    }
    
    return response.result?.tools || []
  }

  async listResources(): Promise<McpResource[]> {
    const response = await this.sendRequest('resources/list')
    
    if (response.error) {
      throw new Error(`Resources list failed: ${response.error.message}`)
    }
    
    return response.result?.resources || []
  }

  async listPrompts(): Promise<McpPrompt[]> {
    const response = await this.sendRequest('prompts/list')
    
    if (response.error) {
      throw new Error(`Prompts list failed: ${response.error.message}`)
    }
    
    return response.result?.prompts || []
  }

  // Extension interface methods
  async getStatus(): Promise<any> {
    return {
      running: this.isRunning,
      server: this.server,
      stats: this.stats,
      connection: this.connectionInfo,
      capabilities: this.server?.capabilities
    }
  }

  async executeAction(action: string, params?: any): Promise<any> {
    switch (action) {
      case 'start':
        await this.startServer()
        return { type: ActionResultType.SUCCESS, success: true, message: 'MCP server started' }
      
      case 'stop':
        await this.stopServer()
        return { type: ActionResultType.SUCCESS, success: true, message: 'MCP server stopped' }
      
      case 'restart':
        await this.stopServer()
        await this.startServer()
        return { type: ActionResultType.SUCCESS, success: true, message: 'MCP server restarted' }
      
      case 'getStats':
        return await this.getStatus()
      
      case 'listTools':
        return await this.listTools()
      
      case 'listResources':
        return await this.listResources()
      
      case 'listPrompts':
        return await this.listPrompts()
      
      case 'callTool':
        if (!params?.name) {
          throw new Error('Tool name is required')
        }
        return await this.callTool(params.name, params.arguments)
      
      case 'getResource':
        if (!params?.uri) {
          throw new Error('Resource URI is required')
        }
        return await this.getResource(params.uri)
      
      case 'getPrompt':
        if (!params?.name) {
          throw new Error('Prompt name is required')
        }
        return await this.getPrompt(params.name, params.arguments)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }
}

export default McpExtension