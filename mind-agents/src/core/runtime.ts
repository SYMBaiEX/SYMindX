import { 
         Agent, 
         AgentConfig,
         AgentRuntime, 
         EventBus, 
         ModuleRegistry, 
         RuntimeConfig, 
         AgentEvent, 
         AgentAction, 
         ActionStatus, 
         ThoughtContext, 
         AgentState, 
         EnvironmentState, 
         MemoryProvider, 
         Extension, 
         ActionResult, 
         AgentStatus, 
         ActionResultType, 
         EnvironmentType,
         MemoryRecord
        } from '../types/agent.js'
import { EmotionModule, EmotionModuleFactory } from '../types/emotion.js'
import { CognitionModule, CognitionModuleFactory } from '../types/cognition.js'
import { Portal, PortalConfig, PortalRegistry } from '../types/portal.js'
import { ExtensionConfig } from '../types/common.js'
import { EventEmitter } from 'events'
import { PluginLoader, createPluginLoader } from './plugin-loader.js'
import { SYMindXEnhancedEventBus } from './enhanced-event-bus.js'
import { SYMindXModuleRegistry } from './registry.js'

export class SYMindXRuntime implements AgentRuntime {
  public agents: Map<string, Agent> = new Map()
  public eventBus: EventBus
  public registry: ModuleRegistry
  public pluginLoader: PluginLoader
  public config: RuntimeConfig
  private tickTimer?: NodeJS.Timeout
  private isRunning = false

  constructor(config: RuntimeConfig) {
    this.config = config
    this.eventBus = new SYMindXEnhancedEventBus({
      persistence: {
        enabled: true,
        storePath: './data/events',
        maxFileSize: 100 * 1024 * 1024,
        compressionEnabled: true,
        retentionDays: 30
      },
      performance: {
        maxSubscribers: 1000,
        eventBufferSize: 10000,
        batchSize: 100,
        flushIntervalMs: 5000
      },
      monitoring: {
        metricsEnabled: true,
        slowEventThresholdMs: 1000,
        errorRetryAttempts: 3
      }
    })
    this.registry = new SYMindXModuleRegistry()
    this.pluginLoader = createPluginLoader(this.registry)
  }

  async initialize(): Promise<void> {
    console.log('🔄 Initializing SYMindX Runtime...')
    
    // Try to load configuration from config/runtime.json
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Get the root directory path
      const __dirname = path.dirname(new URL(import.meta.url).pathname)
      const rootDir = path.resolve(__dirname, '../../..')
      const configPath = path.join(rootDir, 'config', 'runtime.json')
      
      // Check if the config file exists
      try {
        await fs.access(configPath)
        console.log(`📄 Loading configuration from ${configPath}`)
        
        // Read and parse the config file
        const configData = await fs.readFile(configPath, 'utf-8')
        const fileConfig = JSON.parse(configData) as Partial<RuntimeConfig>
        
        // Merge with default config
        this.config = {
          ...this.config,
          ...fileConfig,
          persistence: {
            ...this.config.persistence,
            ...fileConfig.persistence
          },
          extensions: {
            ...this.config.extensions,
            ...fileConfig.extensions
          },
          portals: {
            autoLoad: this.config.portals?.autoLoad ?? true,
            paths: this.config.portals?.paths ?? ['./portals'],
            ...fileConfig.portals,
            apiKeys: {
              ...this.config.portals?.apiKeys,
              ...fileConfig.portals?.apiKeys
            }
          }
        }
        
        console.log('✅ Configuration loaded successfully')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('⚠️ No runtime.json found, using default configuration')
        } else {
          throw err
        }
      }
    } catch (error) {
      console.error('❌ Error loading configuration:', error)
      console.log('⚠️ Falling back to default configuration')
    }
    
    console.log('✅ SYMindX Runtime initialized')
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Runtime is already running')
      return
    }

    console.log('🎯 Starting SYMindX Runtime...')
    
    // Register core modules
    await this.registerCoreModules()
    
    // Load portals
    await this.loadPortals()
    
    // Load extensions (legacy method for built-in extensions)
    await this.loadExtensions()
    
    // Discover and load dynamic plugins
    await this.loadDynamicPlugins()
    
    // Load agents
    await this.loadAgents()
    
    this.isRunning = true
    
    // Start the main processing loop
    this.tickTimer = setInterval(() => {
      this.tick().catch(error => {
        console.error('❌ Runtime tick error:', error)
      })
    }, this.config.tickInterval)
    
    console.log('✅ SYMindX Runtime started successfully')
        console.log('📊 Plugin Stats:', this.pluginLoader.getStats())
        await this.eventBus.publish({
          id: `event_${Date.now()}`,
          type: 'runtime_started',
          source: 'runtime',
          data: { timestamp: new Date() },
          timestamp: new Date(),
          processed: false
        })
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return
    
    console.log('🛑 Stopping SYMindX Runtime...')
    this.isRunning = false
    
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = undefined
    }
    
    // Gracefully shutdown all agents
    for (const agent of this.agents.values()) {
      await this.shutdownAgent(agent)
    }
    
    console.log('✅ SYMindX Runtime stopped')
  }

  async loadAgents(): Promise<void> {
    console.log('🔍 Loading agents from characters directory...')
    
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Get the characters directory path
      const __dirname = path.dirname(new URL(import.meta.url).pathname)
      const charactersDir = path.resolve(__dirname, '../characters')
      
      // Check if the characters directory exists
      try {
        await fs.access(charactersDir)
        
        // Read all files in the characters directory
        const files = await fs.readdir(charactersDir)
        const jsonFiles = files.filter(file => file.endsWith('.json'))
        
        if (jsonFiles.length === 0) {
          console.log('⚠️ No agent configuration files found in characters directory')
          return
        }
        
        // Load each agent configuration
        for (const file of jsonFiles) {
          try {
            const configPath = path.join(charactersDir, file)
            const configData = await fs.readFile(configPath, 'utf-8')
            const agentConfig = JSON.parse(configData) as AgentConfig
            
            // Load the agent
            await this.loadAgent(agentConfig)
          } catch (error) {
            console.error(`❌ Error loading agent from ${file}:`, error)
          }
        }
        
        console.log(`✅ Loaded ${this.agents.size} agents`)
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log('⚠️ Characters directory not found, no agents loaded')
          // Create the characters directory
          await fs.mkdir(charactersDir, { recursive: true })
          console.log('📁 Created characters directory')
        } else {
          throw err
        }
      }
    } catch (error) {
      console.error('❌ Error loading agents:', error)
    }
  }
  
  async loadAgent(config: AgentConfig): Promise<Agent> {
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`🤖 Loading agent: ${config.core.name} (${agentId})`)
    
    // Create memory provider
    const memoryProvider = this.registry.getMemoryProvider(config.psyche.defaults.memory)
    if (!memoryProvider) {
      throw new Error(`Memory provider '${config.psyche.defaults.memory}' not found`)
    }
    
    // Create cognition module
    const cognitionModule = this.registry.getCognitionModule(config.psyche.defaults.cognition)
    if (!cognitionModule) {
      throw new Error(`Cognition module '${config.psyche.defaults.cognition}' not found`)
    }
    
    // Create emotion module
    const emotionModule = this.registry.getEmotionModule(config.psyche.defaults.emotion)
    if (!emotionModule) {
      throw new Error(`Emotion module '${config.psyche.defaults.emotion}' not found`)
    }
    
    // Load portal if specified
    let portal = undefined
    if (config.psyche.defaults.portal) {
      portal = this.registry.getPortal(config.psyche.defaults.portal)
      if (!portal) {
        console.warn(`⚠️ Portal '${config.psyche.defaults.portal}' not found, agent will run without AI capabilities`)
      } else {
        console.log(`🔮 Using portal: ${config.psyche.defaults.portal}`)
      }
    }
    
    // Load extensions
    const extensions = []
    for (const extName of config.modules.extensions) {
      const extension = this.registry.getExtension(extName)
      if (extension) {
        extensions.push(extension)
      } else {
        console.warn(`⚠️ Extension '${extName}' not found, skipping`)
      }
    }
    
    const agent: Agent = {
      id: agentId,
      name: config.core.name,
      status: AgentStatus.IDLE,
      emotion: emotionModule,
      memory: memoryProvider,
      cognition: cognitionModule,
      extensions,
      portal,
      config,
      lastUpdate: new Date()
    }
    
    // Initialize extensions
    for (const extension of extensions) {
      try {
        await extension.init(agent)
        console.log(`✅ Initialized extension: ${extension.name}`)
      } catch (error) {
        console.error(`❌ Failed to initialize extension ${extension.name}:`, error)
      }
    }
    
    // Initialize tools system if configured
    if (config.modules?.tools?.enabled) {
      try {
        const toolSystemName = config.modules.tools.system || 'dynamic'
        const toolSystem = this.getToolSystem(toolSystemName)
        if (toolSystem) {
          // Add tools system to agent (extend Agent interface as needed)
          agent.toolSystem = toolSystem
          console.log(`🔧 Initialized tool system: ${toolSystemName}`)
        } else {
          console.warn(`⚠️ Tool system '${toolSystemName}' not found`)
        }
      } catch (error) {
        console.error(`❌ Failed to initialize tool system:`, error)
      }
    }
    
    this.agents.set(agentId, agent)
    
    // Emit agent loaded event
    this.eventBus.emit({
      id: `event_${Date.now()}`,
      type: 'agent_loaded',
      source: 'runtime',
      data: { agentId, name: agent.name },
      timestamp: new Date(),
      processed: false
    })
    
    console.log(`✅ Agent loaded: ${agent.name} (${agentId})`)
    return agent
  }

  async unloadAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`)
    }
    
    console.log(`🗑️ Unloading agent: ${agent.name} (${agentId})`)
    
    await this.shutdownAgent(agent)
    this.agents.delete(agentId)
    
    // Emit agent unloaded event
    this.eventBus.emit({
      id: `event_${Date.now()}`,
      type: 'agent_unloaded',
      source: 'runtime',
      data: { agentId, name: agent.name },
      timestamp: new Date(),
      processed: false
    })
    
    console.log(`✅ Agent unloaded: ${agent.name}`)
  }

  async tick(): Promise<void> {
    if (!this.isRunning) return
    
    const startTime = Date.now()
    
    // Process each agent
    for (const agent of this.agents.values()) {
      try {
        await this.processAgent(agent)
      } catch (error) {
        console.error(`❌ Error processing agent ${agent.name}:`, error)
        agent.status = AgentStatus.ERROR
      }
    }
    
    const duration = Date.now() - startTime
    if (duration > this.config.tickInterval * 0.8) {
      console.warn(`⚠️ Tick took ${duration}ms (${this.config.tickInterval}ms interval)`)
    }
  }

  private async processAgent(agent: Agent): Promise<void> {
    // Skip processing if agent is not active
    if (agent.status === AgentStatus.ERROR) {
      return
    }
    
    agent.status = AgentStatus.THINKING
    agent.lastUpdate = new Date()
    
    // Initialize portal if available and not already initialized
    if (agent.portal && !agent.portal.enabled) {
      try {
        const { initializePortal } = await import('../portals/integration.js')
        await initializePortal(agent.portal, agent)
      } catch (error) {
        console.error(`❌ Failed to initialize portal for ${agent.name}:`, error)
      }
    }
    
    // 1. Gather context
    const context: ThoughtContext = {
      events: this.getUnprocessedEvents(agent.id),
      memories: await this.getRecentMemories(agent),
      currentState: this.getCurrentState(agent),
      environment: this.getEnvironmentState()
    }
    
    // 2. Think and plan
    const thoughtResult = await agent.cognition.think(agent, context)
    
    // 3. Update emotion based on thoughts
    if (thoughtResult.emotions.current !== agent.emotion.current) {
      agent.emotion.setEmotion(
        thoughtResult.emotions.current,
        thoughtResult.emotions.intensity,
        thoughtResult.emotions.triggers
      )
    }
    
    // 4. Store new memories
    for (const memory of thoughtResult.memories) {
      await agent.memory.store(agent.id, memory)
    }
    
    // 5. Execute actions
    for (const action of thoughtResult.actions) {
      await this.executeAction(agent, action)
    }
    
    // 6. Tick extensions
    for (const extension of agent.extensions) {
      if (extension.enabled) {
        try {
          await extension.tick(agent)
        } catch (error) {
          console.error(`❌ Extension ${extension.name} tick error:`, error)
        }
      }
    }
    
    agent.status = AgentStatus.ACTIVE
  }

  private async executeAction(agent: Agent, action: AgentAction): Promise<void> {
    const extension = agent.extensions.find(ext => ext.id === action.extension)
    if (!extension) {
      console.error(`❌ Extension '${action.extension}' not found for action '${action.action}'`)
      return
    }
    
    const extensionAction = extension.actions[action.action]
    if (!extensionAction) {
      console.error(`❌ Action '${action.action}' not found in extension '${extension.name}'`)
      return
    }
    
    try {
      action.status = ActionStatus.EXECUTING
      const result = await extensionAction.execute(agent, action.parameters)
      action.result = result
      action.status = result.success ? ActionStatus.COMPLETED : ActionStatus.FAILED
      
      // Emit action completed event
      this.eventBus.emit({
        id: `event_${Date.now()}`,
        type: 'action_completed',
        source: extension.id,
        data: { 
          agentId: agent.id, 
          actionId: action.id,
          actionType: action.type,
          actionExtension: action.extension,
          actionName: action.action,
          success: result.success,
          resultType: result.type,
          resultData: result.result,
          error: result.error
        },
        timestamp: new Date(),
        processed: false
      })
    } catch (error) {
      console.error(`❌ Action execution error:`, error)
      action.status = ActionStatus.FAILED
      action.result = { success: false, type: ActionResultType.FAILURE, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private getUnprocessedEvents(agentId: string): AgentEvent[] {
    // Implement event filtering for agent
    const allEvents = this.eventBus.getEvents()
    
    // Filter events relevant to this agent
    return allEvents.filter(event => {
      // Include events targeted at this agent
      if (event.targetAgentId === agentId) return true
      
      // Include global events that all agents should process
      if (event.type.startsWith('system.') || event.type.startsWith('global.')) return true
      
      // Include events from extensions this agent uses
      const agent = this.agents.get(agentId)
      if (agent && event.source) {
        const hasExtension = agent.extensions.some(ext => ext.id === event.source)
        if (hasExtension) return true
      }
      
      // Filter out already processed events
      return !event.processed
    }).slice(0, 50) // Limit to 50 most recent events
  }

  private async getRecentMemories(agent: Agent): Promise<MemoryRecord[]> {
    try {
      return await agent.memory.retrieve(agent.id, 'recent', 10)
    } catch (error) {
      console.error(`❌ Failed to retrieve memories for ${agent.name}:`, error)
      return []
    }
  }

  private getCurrentState(agent: Agent): AgentState {
    return {
      location: 'unknown',
      inventory: {},
      stats: {},
      goals: [],
      context: {}
    }
  }

  private getEnvironmentState(): EnvironmentState {
    return {
      type: EnvironmentType.VIRTUAL_WORLD,
      time: new Date(),
      weather: 'clear',
      location: 'virtual',
      npcs: [],
      objects: [],
      events: []
    }
  }

  private async shutdownAgent(agent: Agent): Promise<void> {
    // Cleanup agent resources
    for (const extension of agent.extensions) {
      try {
        // Call cleanup method if extension supports it
        if ('cleanup' in extension && typeof extension.cleanup === 'function') {
          await extension.cleanup()
        }
        console.log(`🧹 Cleaned up extension: ${extension.name}`)
      } catch (error) {
        console.error(`❌ Extension cleanup error for ${extension.name}:`, error)
      }
    }
  }

  private async registerCoreModules(): Promise<void> {
    try {
      // Use the core modules registration
      const { registerCoreModules } = await import('../modules/index.js')
      await registerCoreModules(this.registry)
    } catch (error) {
      console.error('❌ Failed to register core modules:', error)
    }
  }

  /**
   * Load and register extensions
   */
  private async loadExtensions(): Promise<void> {
    console.log('🔌 Loading built-in extensions...')
    
    try {
      // Import the extensions module
      const extensionsModule = await import('../extensions/index.js')
      
      // Create extension configs from environment variables
      const extensionConfigs: Record<string, ExtensionConfig> = {}
      
      // Slack extension config
      if (process.env.SLACK_BOT_TOKEN) {
        extensionConfigs.slack = {
          enabled: true,
          config: {
            botToken: process.env.SLACK_BOT_TOKEN,
            signingSecret: process.env.SLACK_SIGNING_SECRET,
            appToken: process.env.SLACK_APP_TOKEN
          }
        }
      }
      
      // RuneLite extension config
      if (process.env.RUNELITE_ENABLED === 'true') {
        extensionConfigs.runelite = {
          enabled: true,
          config: {
            // RuneLite specific config
          }
        }
      }
      
      // Twitter extension config
      if (process.env.TWITTER_API_KEY) {
        extensionConfigs.twitter = {
          enabled: true,
          config: {
            apiKey: process.env.TWITTER_API_KEY,
            apiSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
          }
        }
      }
      
      // Telegram extension config
      if (process.env.TELEGRAM_BOT_TOKEN) {
        extensionConfigs.telegram = {
          enabled: true,
          config: {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            webhookUrl: process.env.TELEGRAM_WEBHOOK_URL
          }
        }
      }
      
      // Create a temporary RuntimeConfig for extensions
      const tempConfig: RuntimeConfig = {
        ...this.config,
        extensions: extensionConfigs
      }
      
      // Register available extensions
      await extensionsModule.registerExtensions(this.registry, tempConfig)
      
      console.log('✅ Built-in extensions loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load built-in extensions:', error)
    }
  }

  /**
   * Load dynamic plugins using the plugin loader
   */
  private async loadDynamicPlugins(): Promise<void> {
    console.log('🔍 Discovering dynamic plugins...')
    
    try {
      // Discover available plugins
      const manifests = await this.pluginLoader.discoverPlugins()
      console.log(`📦 Found ${manifests.length} plugin(s)`)
      
      if (manifests.length > 0) {
        console.log('📋 Available plugins:')
        manifests.forEach(manifest => {
          const status = manifest.enabled ? '✅' : '❌'
          console.log(`  ${status} ${manifest.name} (${manifest.id}) - ${manifest.description}`)
        })
      }
      
      // Load all enabled plugins
      const extensionConfigs = this.config.extensions || {}
      const loadedPlugins = await this.pluginLoader.loadAllPlugins(extensionConfigs)
      
      console.log(`✅ Loaded ${loadedPlugins.length} dynamic plugin(s)`)
      
      // Emit plugin loaded events
       for (const plugin of loadedPlugins) {
         await this.eventBus.publish({
           id: `plugin_loaded_${Date.now()}_${plugin.manifest.id}`,
           type: 'plugin_loaded',
           source: 'runtime',
           data: {
             pluginId: plugin.manifest.id,
             pluginName: plugin.manifest.name,
             pluginType: plugin.manifest.type,
             loadTime: plugin.loadTime
           },
           timestamp: new Date(),
           processed: false
         })
       }
      
    } catch (error) {
      console.error('❌ Failed to load dynamic plugins:', error)
    }
  }

  /**
   * Get runtime statistics
   */
  getStats() {
    return {
      agents: this.agents.size,
      isRunning: this.isRunning,
      plugins: this.pluginLoader.getStats(),
      eventBus: this.eventBus instanceof SYMindXEnhancedEventBus ? 
               (this.eventBus as any).getMetrics?.() : null
    }
  }

  /**
   * Load a specific plugin by ID
   */
  async loadPlugin(pluginId: string, config?: ExtensionConfig): Promise<boolean> {
    try {
      const plugin = await this.pluginLoader.loadPlugin(pluginId, config)
      if (plugin) {
        await this.eventBus.publish({
          id: `plugin_loaded_${Date.now()}_${pluginId}`,
          type: 'plugin_loaded',
          source: 'runtime',
          data: {
            pluginId: plugin.manifest.id,
            pluginName: plugin.manifest.name,
            pluginType: plugin.manifest.type,
            loadTime: plugin.loadTime
          },
          timestamp: new Date(),
          processed: false
        })
        return true
      }
      return false
    } catch (error) {
      console.error(`❌ Failed to load plugin '${pluginId}':`, error)
      return false
    }
  }

  /**
   * Unload a specific plugin by ID
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const success = await this.pluginLoader.unloadPlugin(pluginId)
      if (success) {
        await this.eventBus.publish({
          id: `plugin_unloaded_${Date.now()}_${pluginId}`,
          type: 'plugin_unloaded',
          source: 'runtime',
          data: { pluginId },
          timestamp: new Date(),
          processed: false
        })
      }
      return success
    } catch (error) {
      console.error(`❌ Failed to unload plugin '${pluginId}':`, error)
      return false
    }
  }

  /**
   * Reload a specific plugin by ID
   */
  async reloadPlugin(pluginId: string, config?: ExtensionConfig): Promise<boolean> {
    try {
      const plugin = await this.pluginLoader.reloadPlugin(pluginId, config)
      if (plugin) {
        await this.eventBus.publish({
          id: `plugin_reloaded_${Date.now()}_${pluginId}`,
          type: 'plugin_reloaded',
          source: 'runtime',
          data: {
            pluginId: plugin.manifest.id,
            pluginName: plugin.manifest.name,
            pluginType: plugin.manifest.type,
            loadTime: plugin.loadTime
          },
          timestamp: new Date(),
          processed: false
        })
        return true
      }
      return false
    } catch (error) {
      console.error(`❌ Failed to reload plugin '${pluginId}':`, error)
      return false
    }
  }

  /**
   * Get list of available plugins
   */
  async getAvailablePlugins() {
    return this.pluginLoader.discoverPlugins()
  }

  /**
   * Get list of loaded plugins
   */
  getLoadedPlugins() {
    return this.pluginLoader.getLoadedPlugins()
  }

  /**
   * Subscribe to runtime events
   */
  subscribeToEvents(pattern: any, handler: any) {
    if (this.eventBus instanceof SYMindXEnhancedEventBus) {
      return this.eventBus.subscribe(pattern, handler)
    } else {
      // Fallback for basic event bus
      return this.eventBus.subscribe(pattern.type || '*', handler)
    }
  }

  /**
   * Get event history
   */
  async getEventHistory(filter?: any) {
    if (this.eventBus instanceof SYMindXEnhancedEventBus) {
      const eventBus = this.eventBus as any
      if (eventBus.replay) {
        return eventBus.replay(filter)
      }
    }
    return []
  }

  private async loadPortals(): Promise<void> {
    console.log('🔮 Loading portals...')
    
    try {
      // Use the new portal integration module
      const { registerPortals } = await import('../portals/integration.js')
      
      // Get API keys from environment variables or config
      const apiKeys: Record<string, string> = {}
      if (this.config.portals && this.config.portals.apiKeys) {
        Object.assign(apiKeys, this.config.portals.apiKeys)
      }
      
      // Register all available portals
      await registerPortals(this.registry, apiKeys)
    } catch (error) {
      console.error('❌ Failed to load portals:', error)
    }
  }
}

class SYMindXEventBus implements EventBus {
  private emitter = new EventEmitter()
  private subscriptions = new Map<string, Set<string>>()

  emit(event: AgentEvent): void {
    this.emitter.emit(event.type, event)
    this.emitter.emit('*', event)
  }

  on(eventType: string, handler: (event: AgentEvent) => void): void {
    this.emitter.on(eventType, handler)
  }

  off(eventType: string, handler: (event: AgentEvent) => void): void {
    this.emitter.off(eventType, handler)
  }

  subscribe(agentId: string, eventTypes: string[]): void {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set())
    }
    const agentSubs = this.subscriptions.get(agentId)!
    eventTypes.forEach(type => agentSubs.add(type))
  }

  unsubscribe(agentId: string, eventTypes: string[]): void {
    const agentSubs = this.subscriptions.get(agentId)
    if (agentSubs) {
      eventTypes.forEach(type => agentSubs.delete(type))
    }
  }

  getEvents(): AgentEvent[] {
    // This implementation doesn't store events, so we return an empty array
    // In a real implementation, this would need to be connected to event storage
    return []
  }
}

