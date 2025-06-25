/**
 * MCP Client Extension
 * 
 * This extension provides a client interface for connecting to Model Context Protocol (MCP) servers.
 * It manages multiple server connections, handles protocol communication, and provides a unified
 * interface for accessing tools, resources, and prompts from connected MCP servers.
 */

import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { WebSocket } from 'ws'
import { EventSource } from 'eventsource'


import { Extension, ExtensionType, ExtensionStatus, ExtensionAction, ExtensionEventHandler, Agent } from '../../types/agent.js'
import {
  McpClientConfig,
  McpClientSettings,
  McpServerConfig,
  McpConnection,
  McpMessage,
  McpRequest,
  McpResponse,
  McpNotification,
  McpError,
  McpInitializeRequest,
  McpInitializeResponse,
  McpTool,
  McpToolCallRequest,
  McpToolCallResponse,
  McpToolListResponse,
  McpResource,
  McpResourceRequest,
  McpResourceResponse,
  McpResourceListResponse,
  McpPrompt,
  McpPromptRequest,
  McpPromptResponse,
  McpPromptListResponse,
  McpClientEvents,
  McpClientState,
  McpClientEventHandler,
  McpTransportType,
  McpConnectionStatus,
  McpErrorCode,
  PendingRequest
} from './types.js'

export class McpClientExtension implements Extension {
  private mcpClientConfig: McpClientSettings
  private state: McpClientState
  private eventEmitter: EventEmitter
  private reconnectTimers: Map<string, NodeJS.Timeout>
  private isShuttingDown: boolean
  private agent?: Agent

  id = 'mcp-client'
  name = 'MCP Client'
  version = '1.0.0'
  type = ExtensionType.COMMUNICATION
  enabled = true
  status = ExtensionStatus.DISABLED
  config: McpClientConfig
  actions: Record<string, ExtensionAction> = {}
  events: Record<string, ExtensionEventHandler> = {}

  constructor(config: McpClientConfig) {
    // Default settings
    const defaultSettings: McpClientSettings = {
      servers: [],
      autoConnect: true,
      reconnectAttempts: 3,
      reconnectDelay: 5000,
      timeout: 30000,
      enableLogging: false,
      maxConcurrentConnections: 10,
      defaultTransport: 'stdio',
      security: {
        sandboxed: true,
        maxMemoryUsage: 512 * 1024 * 1024, // 512MB
        maxExecutionTime: 30000, // 30 seconds
        allowNetworkAccess: false,
        allowFileSystemAccess: false
      }
    }

    this.config = {
      ...config,
      settings: { ...defaultSettings, ...config.settings }
    }

    this.mcpClientConfig = this.config.settings
    this.state = {
      connections: new Map(),
      globalStats: {
        totalConnections: 0,
        activeConnections: 0,
        totalMessages: 0,
        totalErrors: 0,
        uptime: 0,
        lastActivity: new Date()
      },
      eventHandlers: new Map()
    }
    this.eventEmitter = new EventEmitter()
    this.reconnectTimers = new Map()
    this.isShuttingDown = false
  }

  async init(agent: Agent): Promise<void> {
    this.agent = agent
    this.log('Initializing MCP Client Extension')
    
    // Initialize global stats
    this.state.globalStats.uptime = Date.now()
    
    // Auto-connect to enabled servers
    if (this.mcpClientConfig.autoConnect) {
      await this.connectToEnabledServers()
    }
    
    this.log('MCP Client Extension initialized successfully')
  }

  async tick(agent: Agent): Promise<void> {
    // Periodic tasks for MCP client extension
  }

  async shutdown(): Promise<void> {
    this.log('Shutting down MCP Client Extension')
    this.isShuttingDown = true
    
    // Clear all reconnect timers
    this.reconnectTimers.forEach((timer) => {
      clearTimeout(timer)
    })
    this.reconnectTimers.clear()
    
    // Disconnect from all servers
    const disconnectPromises = Array.from(this.state.connections.keys()).map(
      serverId => this.disconnectFromServer(serverId)
    )
    await Promise.allSettled(disconnectPromises)
    
    // Clear state
    this.state.connections.clear()
    this.eventEmitter.removeAllListeners()
    
    this.log('MCP Client Extension shut down successfully')
  }

  // Connection Management
  async connectToServer(serverId: string): Promise<boolean> {
    const serverConfig = this.mcpClientConfig.servers.find(s => s.id === serverId)
    if (!serverConfig) {
      throw new Error(`Server configuration not found: ${serverId}`)
    }

    if (!serverConfig.enabled) {
      this.log(`Server ${serverId} is disabled, skipping connection`)
      return false
    }

    const existingConnection = this.state.connections.get(serverId)
    if (existingConnection && existingConnection.status === 'connected') {
      this.log(`Already connected to server: ${serverId}`)
      return true
    }

    this.log(`Connecting to MCP server: ${serverId}`)
    
    const connection: McpConnection = {
      id: `${serverId}-${Date.now()}`,
      serverId,
      status: 'connecting',
      transport: serverConfig.transport,
      reconnectAttempts: 0,
      messageId: 1,
      pendingRequests: new Map(),
      stats: {
        messagesReceived: 0,
        messagesSent: 0,
        errorsCount: 0,
        lastActivity: new Date(),
        uptime: 0,
        averageResponseTime: 0,
        toolCallsCount: 0,
        resourceReadsCount: 0,
        promptGetsCount: 0
      }
    }

    this.state.connections.set(serverId, connection)
    this.emit('connection:connecting', { serverId })

    try {
      switch (serverConfig.transport) {
        case 'stdio':
          await this.connectStdio(connection, serverConfig)
          break
        case 'sse':
          await this.connectSSE(connection, serverConfig)
          break
        case 'websocket':
          await this.connectWebSocket(connection, serverConfig)
          break
        default:
          throw new Error(`Unsupported transport: ${serverConfig.transport}`)
      }

      // Initialize the connection
      await this.initializeConnection(connection, serverConfig)
      
      connection.status = 'connected'
      connection.stats.uptime = Date.now()
      this.state.globalStats.activeConnections++
      this.state.globalStats.totalConnections++
      
      this.emit('connection:connected', { 
        serverId, 
        capabilities: connection.capabilities || {} 
      })
      
      this.log(`Successfully connected to MCP server: ${serverId}`)
      return true
      
    } catch (error) {
      connection.status = 'error'
      connection.lastError = error instanceof Error ? error.message : String(error)
      this.state.globalStats.totalErrors++
      
      this.emit('connection:error', { serverId, error: error as Error })
      this.log(`Failed to connect to MCP server ${serverId}: ${connection.lastError}`)
      
      // Schedule reconnection if enabled
      if (serverConfig.autoReconnect && !this.isShuttingDown) {
        this.scheduleReconnection(serverId)
      }
      
      return false
    }
  }

  async disconnectFromServer(serverId: string): Promise<void> {
    const connection = this.state.connections.get(serverId)
    if (!connection) {
      return
    }

    this.log(`Disconnecting from MCP server: ${serverId}`)
    
    // Clear reconnect timer
    const timer = this.reconnectTimers.get(serverId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(serverId)
    }
    
    // Reject all pending requests
    Array.from(connection.pendingRequests.entries()).forEach(([requestId, pendingRequest]) => {
      clearTimeout(pendingRequest.timeout)
      pendingRequest.reject(new Error('Connection closed'))
    })
    connection.pendingRequests.clear()
    
    // Close transport
    try {
      if (connection.process) {
        connection.process.kill('SIGTERM')
      }
      if (connection.client) {
        if (typeof connection.client.close === 'function') {
          connection.client.close()
        } else if (typeof connection.client.terminate === 'function') {
          connection.client.terminate()
        }
      }
    } catch (error) {
      this.log(`Error closing transport for ${serverId}: ${error}`)
    }
    
    if (connection.status === 'connected') {
      this.state.globalStats.activeConnections--
    }
    
    connection.status = 'disconnected'
    this.emit('connection:disconnected', { serverId })
    
    this.log(`Disconnected from MCP server: ${serverId}`)
  }

  private async connectStdio(connection: McpConnection, config: McpServerConfig): Promise<void> {
    const childProcess = spawn(config.command, config.args || [], {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    connection.process = childProcess
    
    // Handle process events
    childProcess.on('error', (error) => {
      connection.status = 'error'
      connection.lastError = error.message
      this.emit('connection:error', { serverId: connection.serverId, error })
    })
    
    childProcess.on('exit', (code) => {
      if (connection.status === 'connected') {
        this.emit('connection:disconnected', { 
          serverId: connection.serverId, 
          reason: `Process exited with code ${code}` 
        })
      }
    })
    
    // Set up message handling
    this.setupStdioMessageHandling(connection)
  }

  private async connectSSE(connection: McpConnection, config: McpServerConfig): Promise<void> {
    if (!config.url) {
      throw new Error('URL is required for SSE transport')
    }
    
    const eventSource = new EventSource(config.url)
    connection.client = eventSource
    
    eventSource.onopen = () => {
      this.log(`SSE connection opened for ${connection.serverId}`)
    }
    
    eventSource.onerror = (error) => {
      connection.status = 'error'
      connection.lastError = 'SSE connection error'
      this.emit('connection:error', { serverId: connection.serverId, error: new Error('SSE error') })
    }
    
    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(connection, message)
      } catch (error) {
        this.log(`Failed to parse SSE message: ${error}`)
      }
    }
  }

  private async connectWebSocket(connection: McpConnection, config: McpServerConfig): Promise<void> {
    if (!config.url) {
      throw new Error('URL is required for WebSocket transport')
    }
    
    const ws = new WebSocket(config.url)
    connection.client = ws
    
    ws.on('open', () => {
      this.log(`WebSocket connection opened for ${connection.serverId}`)
    })
    
    ws.on('error', (error) => {
      connection.status = 'error'
      connection.lastError = error.message
      this.emit('connection:error', { serverId: connection.serverId, error })
    })
    
    ws.on('close', () => {
      if (connection.status === 'connected') {
        this.emit('connection:disconnected', { serverId: connection.serverId })
      }
    })
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(connection, message)
      } catch (error) {
        this.log(`Failed to parse WebSocket message: ${error}`)
      }
    })
  }

  private setupStdioMessageHandling(connection: McpConnection): void {
    if (!connection.process?.stdout) {
      throw new Error('Process stdout not available')
    }
    
    let buffer = ''
    
    connection.process.stdout.on('data', (data) => {
      buffer += data.toString()
      
      // Process complete JSON messages
      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        
        if (line) {
          try {
            const message = JSON.parse(line)
            this.handleMessage(connection, message)
          } catch (error) {
            this.log(`Failed to parse stdio message: ${error}`)
          }
        }
      }
    })
  }

  private async initializeConnection(connection: McpConnection, config: McpServerConfig): Promise<void> {
    const initRequest: McpInitializeRequest = {
      protocolVersion: '2024-11-05',
      capabilities: config.capabilities || {
        tools: true,
        resources: true,
        prompts: true,
        logging: this.mcpClientConfig.enableLogging || false
      },
      clientInfo: {
        name: 'SYMindX MCP Client',
        version: '1.0.0'
      }
    }
    
    const response = await this.sendRequest(connection, 'initialize', initRequest)
    const initResponse = response.result as McpInitializeResponse
    
    connection.capabilities = initResponse.capabilities
    
    // Send initialized notification
    await this.sendNotification(connection, 'notifications/initialized', {})
  }

  private handleMessage(connection: McpConnection, message: McpMessage): void {
    connection.stats.messagesReceived++
    connection.stats.lastActivity = new Date()
    this.state.globalStats.totalMessages++
    this.state.globalStats.lastActivity = new Date()
    
    if (message.id !== undefined) {
      // This is a response to a request
      const pendingRequest = connection.pendingRequests.get(message.id)
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout)
        connection.pendingRequests.delete(message.id)
        
        if (message.error) {
          pendingRequest.reject(new Error(message.error.message))
        } else {
          pendingRequest.resolve(message as McpResponse)
        }
      }
    } else if (message.method) {
      // This is a notification or request from the server
      this.handleServerMessage(connection, message as McpNotification)
    }
  }

  private handleServerMessage(connection: McpConnection, message: McpNotification): void {
    switch (message.method) {
      case 'notifications/resources/updated':
        this.emit('resource:updated', {
          serverId: connection.serverId,
          uri: message.params?.uri
        })
        break
      case 'notifications/tools/list_changed':
        // Refresh tool list
        break
      case 'notifications/prompts/list_changed':
        // Refresh prompt list
        break
      case 'notifications/progress':
        this.emit('progress:update', {
          serverId: connection.serverId,
          progress: message.params
        })
        break
      default:
        this.log(`Unhandled server message: ${message.method}`)
    }
  }

  private async sendRequest(connection: McpConnection, method: string, params?: any): Promise<McpResponse> {
    const requestId = connection.messageId++
    const request: McpRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.pendingRequests.delete(requestId)
        reject(new Error(`Request timeout: ${method}`))
      }, this.mcpClientConfig.timeout || 30000)
      
      const pendingRequest: PendingRequest = {
        resolve,
        reject,
        timeout,
        method,
        timestamp: new Date()
      }
      
      connection.pendingRequests.set(requestId, pendingRequest)
      this.sendMessage(connection, request)
    })
  }

  private async sendNotification(connection: McpConnection, method: string, params?: any): Promise<void> {
    const notification: McpNotification = {
      jsonrpc: '2.0',
      method,
      params
    }
    
    this.sendMessage(connection, notification)
  }

  private sendMessage(connection: McpConnection, message: McpMessage): void {
    connection.stats.messagesSent++
    
    const messageStr = JSON.stringify(message)
    
    try {
      switch (connection.transport) {
        case 'stdio':
          if (connection.process?.stdin) {
            connection.process.stdin.write(messageStr + '\n')
          }
          break
        case 'websocket':
          if (connection.client && connection.client.readyState === WebSocket.OPEN) {
            connection.client.send(messageStr)
          }
          break
        case 'sse':
          // SSE is typically one-way, server to client
          throw new Error('Cannot send messages over SSE transport')
        default:
          throw new Error(`Unsupported transport: ${connection.transport}`)
      }
    } catch (error) {
      this.log(`Failed to send message: ${error}`)
      throw error
    }
  }

  private scheduleReconnection(serverId: string): void {
    const connection = this.state.connections.get(serverId)
    const serverConfig = this.mcpClientConfig.servers.find(s => s.id === serverId)
    
    if (!connection || !serverConfig || this.isShuttingDown) {
      return
    }
    
    const maxAttempts = serverConfig.maxReconnectAttempts || this.mcpClientConfig.reconnectAttempts || 3
    if (connection.reconnectAttempts >= maxAttempts) {
      this.log(`Max reconnection attempts reached for ${serverId}`)
      return
    }
    
    const delay = serverConfig.reconnectDelay || this.mcpClientConfig.reconnectDelay || 5000
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(serverId)
      connection.reconnectAttempts++
      connection.status = 'reconnecting'
      
      this.emit('connection:reconnecting', { 
        serverId, 
        attempt: connection.reconnectAttempts 
      })
      
      await this.connectToServer(serverId)
    }, delay)
    
    this.reconnectTimers.set(serverId, timer)
  }

  private async connectToEnabledServers(): Promise<void> {
    const enabledServers = this.mcpClientConfig.servers.filter(s => s.enabled !== false)
    const connectionPromises = enabledServers.map(server => 
      this.connectToServer(server.id).catch(error => {
        this.log(`Failed to connect to ${server.id}: ${error.message}`)
        return false
      })
    )
    
    await Promise.allSettled(connectionPromises)
  }

  // Public API Methods
  async callTool(serverId: string, toolName: string, arguments_?: Record<string, any>): Promise<McpToolCallResponse> {
    const connection = this.state.connections.get(serverId)
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Not connected to server: ${serverId}`)
    }
    
    const request: McpToolCallRequest = {
      name: toolName,
      arguments: arguments_
    }
    
    connection.stats.toolCallsCount++
    this.emit('tool:called', { serverId, toolName, arguments: arguments_ })
    
    const response = await this.sendRequest(connection, 'tools/call', request)
    return response.result as McpToolCallResponse
  }

  async listTools(options: any): Promise<McpTool[]> {
    const { serverId } = options
    const connection = this.state.connections.get(serverId)
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Not connected to server: ${serverId}`)
    }
    
    const response = await this.sendRequest(connection, 'tools/list', {})
    const result = response.result as McpToolListResponse
    return result.tools
  }

  async readResource(serverId: string, uri: string): Promise<McpResourceResponse> {
    const connection = this.state.connections.get(serverId)
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Not connected to server: ${serverId}`)
    }
    
    const request: McpResourceRequest = { uri }
    
    connection.stats.resourceReadsCount++
    this.emit('resource:read', { serverId, uri })
    
    const response = await this.sendRequest(connection, 'resources/read', request)
    return response.result as McpResourceResponse
  }

  async listResources(options: any): Promise<McpResource[]> {
    const { serverId } = options
    const connection = this.state.connections.get(serverId)
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Not connected to server: ${serverId}`)
    }
    
    const response = await this.sendRequest(connection, 'resources/list', {})
    const result = response.result as McpResourceListResponse
    return result.resources
  }

  async getPrompt(serverId: string, promptName: string, arguments_?: Record<string, any>): Promise<McpPromptResponse> {
    const connection = this.state.connections.get(serverId)
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Not connected to server: ${serverId}`)
    }
    
    const request: McpPromptRequest = {
      name: promptName,
      arguments: arguments_
    }
    
    connection.stats.promptGetsCount++
    this.emit('prompt:get', { serverId, promptName, arguments: arguments_ })
    
    const response = await this.sendRequest(connection, 'prompts/get', request)
    return response.result as McpPromptResponse
  }

  async listPrompts(serverId: string): Promise<McpPrompt[]> {
    const connection = this.state.connections.get(serverId)
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Not connected to server: ${serverId}`)
    }
    
    const response = await this.sendRequest(connection, 'prompts/list', {})
    const result = response.result as McpPromptListResponse
    return result.prompts
  }

  // Event Management
  on<T extends keyof McpClientEvents>(event: T, handler: McpClientEventHandler<T>): void {
    const handlers = this.state.eventHandlers.get(event) || []
    handlers.push(handler)
    this.state.eventHandlers.set(event, handlers)
  }

  off<T extends keyof McpClientEvents>(event: T, handler: McpClientEventHandler<T>): void {
    const handlers = this.state.eventHandlers.get(event) || []
    const index = handlers.indexOf(handler)
    if (index !== -1) {
      handlers.splice(index, 1)
      this.state.eventHandlers.set(event, handlers)
    }
  }

  private emit<T extends keyof McpClientEvents>(event: T, data: McpClientEvents[T]): void {
    const handlers = this.state.eventHandlers.get(event) || []
    for (const handler of handlers) {
      try {
        handler(data)
      } catch (error) {
        this.log(`Error in event handler for ${event}: ${error}`)
      }
    }
  }

  // Status and Monitoring
  getConnectionStatus(serverId: string): McpConnectionStatus | undefined {
    const connection = this.state.connections.get(serverId)
    return connection?.status
  }

  getConnectedServers(): string[] {
    return Array.from(this.state.connections.entries())
      .filter(([_, connection]) => connection.status === 'connected')
      .map(([serverId, _]) => serverId)
  }

  getServerStats(serverId: string) {
    const connection = this.state.connections.get(serverId)
    return connection?.stats
  }

  getGlobalStats() {
    return {
      ...this.state.globalStats,
      uptime: Date.now() - this.state.globalStats.uptime
    }
  }

  // Configuration Management
  async addServer(serverConfig: McpServerConfig): Promise<void> {
    // Check if server already exists
    const existingIndex = this.mcpClientConfig.servers.findIndex(s => s.id === serverConfig.id)
    if (existingIndex !== -1) {
      throw new Error(`Server with ID ${serverConfig.id} already exists`)
    }
    
    this.mcpClientConfig.servers.push(serverConfig)
    
    // Auto-connect if enabled
    if (this.mcpClientConfig.autoConnect && serverConfig.enabled !== false) {
      await this.connectToServer(serverConfig.id)
    }
  }

  async removeServer(serverId: string): Promise<void> {
    // Disconnect if connected
    await this.disconnectFromServer(serverId)
    
    // Remove from configuration
    const index = this.mcpClientConfig.servers.findIndex(s => s.id === serverId)
    if (index !== -1) {
      this.mcpClientConfig.servers.splice(index, 1)
    }
  }

  async updateServer(serverId: string, updates: Partial<McpServerConfig>): Promise<void> {
    const index = this.mcpClientConfig.servers.findIndex(s => s.id === serverId)
    if (index === -1) {
      throw new Error(`Server not found: ${serverId}`)
    }
    
    // Disconnect if connected
    await this.disconnectFromServer(serverId)
    
    // Update configuration
    this.mcpClientConfig.servers[index] = {
      ...this.mcpClientConfig.servers[index],
      ...updates
    }
    
    // Reconnect if enabled
    const updatedConfig = this.mcpClientConfig.servers[index]
    if (this.mcpClientConfig.autoConnect && updatedConfig.enabled !== false) {
      await this.connectToServer(serverId)
    }
  }

  private log(message: string): void {
    if (this.mcpClientConfig.enableLogging) {
      console.log(`[MCP Client] ${message}`)
    }
  }

  // Additional methods called by skills - stub implementations
  isServerRunning(): boolean {
    return this.getConnectedServers().length > 0
  }

  async startServer(config: any): Promise<void> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async stopServer(): Promise<void> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  getServerCapabilities(): any {
    // Implementation needed
    return {}
  }

  getServerUptime(): number {
    // Implementation needed
    return 0
  }

  updateConfig(config: any): void {
    // Implementation needed
  }

  async createSession(config: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async getSession(sessionId: string, options?: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async listSessions(options?: any): Promise<any[]> {
    // Implementation needed
    return []
  }

  async updateSession(sessionId: string, config: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async extendSession(sessionId: string, duration: number): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async closeSession(sessionId: string, reason?: string): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async getSessionMetrics(options?: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async cleanupSessions(options?: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async saveSessionState(options: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async restoreSessionState(options: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  getAvailablePrompts(): any[] {
    // Implementation needed
    return []
  }

  validatePromptArguments(name: string, args: any): any {
    // Implementation needed
    return { valid: true }
  }

  async executePrompt(name: string, args: any, context?: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  logPromptExecution(data: any): void {
    // Implementation needed
  }

  getPromptExecutionHistory(name: string): any[] {
    // Implementation needed
    return []
  }

  async createPromptTemplate(template: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async updatePromptTemplate(name: string, template: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async deletePromptTemplate(name: string): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async discoverServers(options: any): Promise<any[]> {
    // Implementation needed
    return []
  }

  async registerServer(config: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async unregisterServer(serverId: string): Promise<void> {
    // Implementation needed
  }

  getRegisteredServers(options?: any): any[] {
    // Implementation needed
    return []
  }

  async getServerInfo(serverId: string, options?: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async scanNetwork(options: any): Promise<any[]> {
    // Implementation needed
    return []
  }

  async validateServerConfig(config: any): Promise<any> {
    // Implementation needed
    return { valid: true }
  }

  async importServerConfig(source: any, format: string): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async exportServerConfig(options: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async updateServerConfig(serverId: string, config: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  getAvailableResources(): any[] {
    // Implementation needed
    return []
  }

  validateResourceUri(params: any): any {
    // Implementation needed
    return { valid: true }
  }

  getResourceAccessHistory(uri: string): any[] {
    // Implementation needed
    return []
  }

  async subscribeToResource(options: any): Promise<any> {
    // Implementation needed
    return { subscriptionId: 'sub-' + Date.now(), success: true }
  }

  async unsubscribeFromResource(options: any): Promise<any> {
    // Implementation needed
    return { success: true }
  }

  async searchResources(options: any): Promise<any> {
    // Implementation needed
    return {
      resources: [],
      total: 0,
      hasMore: false,
      searchTime: 0,
      suggestions: []
    }
  }

  getResourceTemplates(serverId?: string): any[] {
    // Implementation needed
    return []
  }

  async downloadResource(options: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async batchGetResources(options: any): Promise<any> {
    // Implementation needed
    return {
      batchId: 'batch-' + Date.now(),
      results: [],
      totalRetrievalTime: 0
    }
  }

  async getResource(options: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async getResourceInfo(serverId: string, uri: string): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  getAllConnectionStatuses(): any {
    // Implementation needed
    return {}
  }

  listConnections(includeInactive?: boolean): any[] {
    // Implementation needed
    return []
  }

  async reconnectToServer(serverId: string, timeout?: number): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async testConnection(serverId: string, timeout?: number): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async configureConnection(serverId: string, config: any): Promise<void> {
    // Implementation needed
  }

  getConnectionMetrics(serverId: string, timeRange?: any): any {
    // Implementation needed
    return {}
  }

  async resetConnection(serverId: string, clearCache?: boolean): Promise<void> {
    // Implementation needed
  }

  async setConnectionTimeout(serverId: string, timeout: number): Promise<void> {
    // Implementation needed
  }

  async invokeTool(options: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }



  async getToolInfo(serverId: string, toolName: string, options?: any): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async validateToolArguments(options: any): Promise<any> {
    // Implementation needed
    return { valid: true }
  }

  async batchInvokeTools(options: any): Promise<any> {
    // Implementation needed
    return {
      batchId: 'batch-' + Date.now(),
      results: [],
      totalExecutionTime: 0,
      completed: true
    }
  }

  async getInvocationHistory(options: any): Promise<any> {
    // Implementation needed
    return {
      invocations: [],
      total: 0,
      hasMore: false,
      statistics: {
        totalInvocations: 0,
        successfulInvocations: 0,
        failedInvocations: 0,
        averageExecutionTime: 0,
        mostUsedTools: [],
        mostActiveServers: []
      }
    }
  }

  async cancelInvocation(invocationId: string): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async getInvocationStatus(invocationId: string): Promise<any> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async createToolAlias(options: any): Promise<void> {
    // Implementation needed
  }

  async removeToolAlias(alias: string): Promise<void> {
    // Implementation needed
  }

}

export default McpClientExtension
export * from './types.js'