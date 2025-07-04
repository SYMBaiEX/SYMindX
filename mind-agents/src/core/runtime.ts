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
         EnvironmentType,
         MemoryRecord,
         LazyAgent,
         LazyAgentState,
         AgentFactory
        } from '../types/agent.js'
import { CharacterConfig } from '../types/character.js'
import { configResolver } from '../utils/config-resolver.js'
import { EmotionModule, EmotionModuleFactory } from '../types/emotion.js'
import { CognitionModule, CognitionModuleFactory } from '../types/cognition.js'
import { Portal, PortalConfig, PortalRegistry } from '../types/portal.js'
import { ExtensionConfig } from '../types/common.js'
import {
  ActionResultType,
  ActionCategory,
  RuntimeStatus,
  ModuleStatus,
  Result,
  ErrorResult,
  SuccessResult
} from '../types/enums.js'
import { EventEmitter } from 'events'
import { SimplePluginLoader, createPluginLoader } from './plugin-loader.js'
import { SimpleEventBus } from './event-bus.js'
import { SYMindXModuleRegistry } from './registry.js'
import { ExtensionContext } from '../types/extension.js'
import { Logger, runtimeLogger } from '../utils/logger.js'
// Autonomous system imports
import { AutonomousEngine, AutonomousEngineConfig } from './autonomous-engine.js'
import { DecisionEngine } from './decision-engine.js'
// Behaviors and lifecycle systems removed - functionality integrated into autonomous engine
import { AutonomousAgent, DecisionModuleType } from '../types/autonomous.js'
import { MultiAgentManager } from './multi-agent-manager.js'

export class SYMindXRuntime implements AgentRuntime {
  public agents: Map<string, Agent> = new Map()
  public lazyAgents: Map<string, LazyAgent> = new Map()
  public eventBus: EventBus
  public registry: ModuleRegistry
  public pluginLoader: SimplePluginLoader
  public config: RuntimeConfig
  private tickTimer?: NodeJS.Timeout
  private isRunning = false
  
  // Multi-Agent Manager
  public multiAgentManager?: MultiAgentManager
  
  // Autonomous system components
  private autonomousEngines: Map<string, AutonomousEngine> = new Map()
  private decisionEngines: Map<string, DecisionEngine> = new Map()
  // Behavior and lifecycle systems removed - functionality integrated into autonomous engine
  private autonomousAgents: Map<string, AutonomousAgent> = new Map()
  

  constructor(config: RuntimeConfig) {
    this.config = config
    this.eventBus = new SimpleEventBus()
    this.registry = new SYMindXModuleRegistry()
    
    // Create extension context for plugin loader
    const extensionContext: ExtensionContext = {
      logger: new Logger('plugin-loader'),
      config: {
        enabled: true,
        priority: 1,
        settings: {},
        dependencies: [],
        capabilities: []
      }
    }
    this.pluginLoader = createPluginLoader(extensionContext)
  }

  async initialize(): Promise<void> {
    runtimeLogger.start('Initializing SYMindX Runtime...')
    
    // Load environment variables from .env file if it exists
    try {
      const { configDotenv } = await import('dotenv')
      const path = await import('path')
      
      // Get the root directory path
      const __dirname = path.dirname(new URL(import.meta.url).pathname)
      const rootDir = path.resolve(__dirname, '../../..')
      const envPath = path.join(rootDir, '.env')
      
      // Try to load .env file
      configDotenv({ path: envPath })
      // Environment variables loaded - logged by UI
    } catch (error) {
      runtimeLogger.warn('⚠️ No .env file found or dotenv not available, using system environment variables')
    }
    
    // Try to load configuration from config/runtime.json
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Get the core directory path
      const __dirname = path.dirname(new URL(import.meta.url).pathname)
      const configPath = path.join(__dirname, 'config', 'runtime.json')
      
      // Check if the config file exists
      try {
        await fs.access(configPath)
        // Loading configuration - logged by UI
        
        // Read and parse the config file
        const configData = await fs.readFile(configPath, 'utf-8')
        const fileConfig = JSON.parse(configData) as Partial<RuntimeConfig>
        
        // Merge with default config and load API keys from environment
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
            // Ensure boolean values for autoLoad and proper array for paths
            autoLoad: fileConfig.portals?.autoLoad ?? this.config.portals?.autoLoad ?? true,
            paths: fileConfig.portals?.paths ?? this.config.portals?.paths ?? ['./portals'],
            apiKeys: {
              // Default API keys from environment variables
              openai: process.env.OPENAI_API_KEY || '',
              anthropic: process.env.ANTHROPIC_API_KEY || '',
              groq: process.env.GROQ_API_KEY || '',
              xai: process.env.XAI_API_KEY || '',
              google: process.env.GOOGLE_API_KEY || '',
              'openrouter': process.env.OPENROUTER_API_KEY || '',
              'kluster.ai': process.env.KLUSTER_AI_API_KEY || '',
              // Override with any explicit config values
              ...this.config.portals?.apiKeys,
              ...fileConfig.portals?.apiKeys
            }
          }
        }
        
        // Configuration loaded - logged by UI
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          runtimeLogger.warn('⚠️ No runtime.json found, using default configuration with environment variables')
          // Still load API keys from environment even without config file
          this.config = {
            ...this.config,
            portals: {
              autoLoad: this.config.portals?.autoLoad ?? true,
              paths: this.config.portals?.paths ?? ['./portals'],
              apiKeys: {
                // Default API keys from environment variables
                openai: process.env.OPENAI_API_KEY || '',
                anthropic: process.env.ANTHROPIC_API_KEY || '',
                groq: process.env.GROQ_API_KEY || '',
                xai: process.env.XAI_API_KEY || '',
                google: process.env.GOOGLE_API_KEY || '',
                'openrouter': process.env.OPENROUTER_API_KEY || '',
                'kluster.ai': process.env.KLUSTER_AI_API_KEY || '',
                // Override with any existing config values
                ...this.config.portals?.apiKeys
              }
            }
          }
        } else {
          throw err
        }
      }
    } catch (error) {
      runtimeLogger.error('❌ Error loading configuration:', error)
      runtimeLogger.warn('⚠️ Falling back to default configuration')
    }
    
    // Runtime initialized - logged by UI
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      runtimeLogger.warn('⚠️ Runtime is already running')
      return
    }

    // Quiet mode - UI handles display
    // runtimeLogger.start('🎯 Starting SYMindX Runtime...')
    
    // Register core modules
    await this.registerCoreModules()
    
    // Register default agent factory
    this.registerDefaultAgentFactory()
    
    // Load portals
    await this.loadPortals()
    
    // Load extensions (legacy method for built-in extensions)
    await this.loadExtensions()
    
    // Initialize Multi-Agent Manager
    this.multiAgentManager = new MultiAgentManager(
      this.registry as any, 
      this.eventBus, 
      this
    )
    // Multi-Agent Manager initialized - logged by UI
    
    // Initialize tool system
    await this.initializeToolSystem()
    
    // Discover and load dynamic plugins
    await this.loadDynamicPlugins()
    
    // Load agents (now through multi-agent manager for single agent compatibility)
    await this.loadAgents()
    
    this.isRunning = true
    
    // Start the main processing loop
    this.tickTimer = setInterval(() => {
      this.tick().catch(error => {
        runtimeLogger.error('❌ Runtime tick error:', error)
      })
    }, this.config.tickInterval)
    
    runtimeLogger.success('✅ SYMindX Runtime started successfully')
        runtimeLogger.info('📊 Plugin Stats:', this.pluginLoader.getStats())
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
    
    runtimeLogger.warn('🛑 Stopping SYMindX Runtime...')
    this.isRunning = false
    
    // Stop multi-agent manager first
    if (this.multiAgentManager) {
      await this.multiAgentManager.shutdown()
    }
    
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = undefined
    }
    
    // Gracefully shutdown all agents
    for (const agent of this.agents.values()) {
      await this.shutdownAgent(agent)
    }
    
    runtimeLogger.success('✅ SYMindX Runtime stopped')
  }

  async loadAgents(): Promise<void> {
    // Loading agents - logged by UI
    
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Get the characters directory path
      const __dirname = path.dirname(new URL(import.meta.url).pathname)
      // Look for characters in src/characters first, then dist/characters
      const srcCharactersDir = path.resolve(__dirname, '../../src/characters')
      const distCharactersDir = path.resolve(__dirname, '../characters')
      
      let charactersDir = srcCharactersDir
      try {
        await fs.access(srcCharactersDir)
      } catch {
        charactersDir = distCharactersDir
      }
      // Looking for characters - logged by UI
      
      // Check if the characters directory exists
      try {
        await fs.access(charactersDir)
        
        // Read all files in the characters directory
        const files = await fs.readdir(charactersDir)
        let jsonFiles = files.filter(file => file.endsWith('.json'))
        
        // Check if we should load only a specific agent
        const forceSingleAgent = process.env.FORCE_SINGLE_AGENT
        if (forceSingleAgent) {
          const singleAgentFile = `${forceSingleAgent}.json`
          if (jsonFiles.includes(singleAgentFile)) {
            jsonFiles = [singleAgentFile]
            runtimeLogger.agent(`🎯 Loading single agent: ${forceSingleAgent}`)
          } else {
            runtimeLogger.warn(`⚠️ Single agent ${forceSingleAgent} not found, loading all agents`)
          }
        }
        
        if (jsonFiles.length === 0) {
          runtimeLogger.warn('⚠️ No agent configuration files found in characters directory')
          return
        }
        
        // Count enabled vs disabled agents
        let enabledCount = 0
        let disabledCount = 0
        let errorCount = 0
        
        // Load each agent configuration
        for (const file of jsonFiles) {
          try {
            const configPath = path.join(charactersDir, file)
            const configData = await fs.readFile(configPath, 'utf-8')
            const rawConfig = JSON.parse(configData)
            
            // Check if agent is enabled
            if (rawConfig.enabled === false) {
              disabledCount++
              continue
            }
            
            let agentConfig: AgentConfig
            
            // Check if this is a new clean character config or old format
            if (this.isCleanCharacterConfig(rawConfig)) {
              // Validate environment variables
              const envValidation = configResolver.validateEnvironment()
              if (!envValidation.valid) {
                runtimeLogger.warn(`⚠️ Missing environment variables for ${rawConfig.name}:`, envValidation.missing)
              }
              
              // Transform clean config to runtime config
              agentConfig = configResolver.resolveCharacterConfig(rawConfig as CharacterConfig)
            } else {
              // Legacy format - use as-is but process environment variables
              agentConfig = this.processLegacyConfig(rawConfig)
            }
            
            // Create lazy agent instead of immediately loading
            const lazyAgent = this.createLazyAgent(agentConfig, rawConfig, rawConfig.id)
            this.lazyAgents.set(lazyAgent.id, lazyAgent)
            this.registry.registerLazyAgent(lazyAgent)
            
            // For backward compatibility, still load primary/high-priority agents immediately
            if (rawConfig.priority === 'high' || rawConfig.primary === true) {
              try {
                await this.activateAgent(lazyAgent.id)
              } catch (error) {
                runtimeLogger.error(`❌ Failed to activate priority agent ${lazyAgent.id}:`, error)
              }
            }
            
            enabledCount++
          } catch (error) {
            runtimeLogger.error(`❌ Error loading agent ${file}:`, error)
            errorCount++
          }
        }
        
        // Summary output
        const summary = []
        if (enabledCount > 0) summary.push(`${enabledCount} active`)
        if (disabledCount > 0) summary.push(`${disabledCount} disabled`)
        if (errorCount > 0) summary.push(`${errorCount} errors`)
        
        runtimeLogger.success(`✅ Agents: ${summary.join(', ')}`)
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

  private findPrimaryPortal(portals: any[]): any {
    if (!portals || portals.length === 0) return null
    // Find the portal marked as primary, or first enabled portal
    return portals.find(p => p.primary === true && p.enabled !== false) ||
           portals.find(p => p.enabled !== false) ||
           portals[0]
  }

  private findPortalByCapability(portals: any[], capability: string): any {
    if (!portals || portals.length === 0) return null
    // Find first enabled portal with the specified capability
    return portals.find(p => 
      p.enabled !== false && 
      p.capabilities && 
      p.capabilities.includes(capability)
    )
  }

  /**
   * Check if this is a clean character config (new TypeScript format)
   */
  private isCleanCharacterConfig(config: any): boolean {
    // Clean configs have specific fields and structure
    return config.personality && 
           config.autonomous &&
           config.memory &&
           config.emotion &&
           config.cognition &&
           config.communication &&
           config.capabilities &&
           config.portals &&
           Array.isArray(config.portals) &&
           // Old configs have psyche.defaults, new ones don't
           !config.psyche
  }

  /**
   * Process legacy character config (old format with ${} syntax)
   */
  private processLegacyConfig(config: any): any {
    // For legacy configs, process environment variables in the existing format
    return this.processEnvironmentVariables(config)
  }

  /**
   * Process environment variables in legacy format
   */
  private processEnvironmentVariables(obj: any): any {
    if (typeof obj === 'string') {
      // Handle ${ENV_VAR:default} syntax
      return obj.replace(/\$\{([^}:]+):?([^}]*)\}/g, (match, envVar, defaultValue) => {
        return process.env[envVar] || defaultValue || match
      })
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.processEnvironmentVariables(item))
    } else if (obj && typeof obj === 'object') {
      const processed: any = {}
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this.processEnvironmentVariables(value)
      }
      return processed
    }
    return obj
  }
  
  private transformCharacterConfig(characterConfig: any): AgentConfig {
    // Transform character config to expected AgentConfig format
    return {
      core: {
        name: characterConfig.name || 'Unknown Agent',
        tone: characterConfig.communication?.tone || 'neutral',
        personality: characterConfig.personality?.traits ? Object.keys(characterConfig.personality.traits) : []
      },
      lore: {
        origin: characterConfig.personality?.backstory || 'Unknown origin',
        motive: characterConfig.personality?.goals?.[0] || 'Unknown motive'
      },
      psyche: {
        traits: characterConfig.personality?.traits ? Object.keys(characterConfig.personality.traits) : [],
        defaults: {
          memory: characterConfig.memory?.type || 'memory',
          emotion: characterConfig.emotion?.type || 'composite',
          cognition: characterConfig.cognition?.type || 'hybrid',
          portal: this.findPrimaryPortal(characterConfig.portals)?.type || 'groq'
        }
      },
      modules: {
        extensions: characterConfig.extensions?.map((ext: any) => ext.name) || [],
        memory: characterConfig.memory?.config,
        emotion: characterConfig.emotion?.config,
        cognition: characterConfig.cognition?.config,
        portal: characterConfig.portals?.[0]?.config
      }
    }
  }

  async loadAgent(config: any, characterId?: string): Promise<Agent> {
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Transform character config to expected format
    const agentConfig = this.transformCharacterConfig(config)
    
    console.log(`🤖 Loading agent: ${agentConfig.core.name} (${agentId})`)
    
    // Create memory provider (try factory first, then fallback to registry)
    let memoryProvider = this.registry.getMemoryProvider(agentConfig.psyche.defaults.memory)
    if (!memoryProvider) {
      // Try to create using factory with agent-specific config
      const memoryConfig = {
        ...agentConfig.modules.memory,
        agentId: agentId,
        agentName: agentConfig.core.name
      }
      memoryProvider = this.registry.createMemoryProvider(agentConfig.psyche.defaults.memory, memoryConfig)
    }
    if (!memoryProvider) {
      throw new Error(`Memory provider '${agentConfig.psyche.defaults.memory}' not found and could not be created`)
    }
    
    // Create cognition module (try factory first, then fallback to registry)
    let cognitionModule = this.registry.getCognitionModule(agentConfig.psyche.defaults.cognition)
    if (!cognitionModule) {
      // Try to create using factory with agent-specific config
      const cognitionConfig = {
        ...agentConfig.modules.cognition,
        agentId: agentId,
        agentName: agentConfig.core.name
      }
      cognitionModule = this.registry.createCognitionModule(agentConfig.psyche.defaults.cognition, cognitionConfig)
    }
    if (!cognitionModule) {
      throw new Error(`Cognition module '${agentConfig.psyche.defaults.cognition}' not found and could not be created`)
    }
    
    // Create emotion module (try factory first, then fallback to registry)
    let emotionModule = this.registry.getEmotionModule(agentConfig.psyche.defaults.emotion)
    if (!emotionModule) {
      // Try to create using factory with agent-specific config
      const emotionConfig = {
        ...agentConfig.modules.emotion,
        agentId: agentId,
        agentName: agentConfig.core.name,
        personality: agentConfig.psyche.traits
      }
      emotionModule = this.registry.createEmotionModule(agentConfig.psyche.defaults.emotion, emotionConfig)
    }
    if (!emotionModule) {
      throw new Error(`Emotion module '${agentConfig.psyche.defaults.emotion}' not found and could not be created`)
    }
    
    // Load multiple portals from character config
    const portals: Portal[] = []
    let primaryPortal = undefined
    
    if (config.portals && Array.isArray(config.portals)) {
      for (const portalConfig of config.portals) {
        if (portalConfig.enabled === false) {
          console.log(`⏭️ Skipping disabled portal: ${portalConfig.name}`)
          continue
        }
        
        try {
          // Try to get existing portal or create new one
          let portal = this.registry.getPortal(portalConfig.type)
          if (!portal) {
            // Create portal using factory with portal-specific config
            const factoryConfig: PortalConfig = {
              ...portalConfig.config,
              ...this.config.portals?.apiKeys,
              capabilities: portalConfig.capabilities || []
            }
            portal = this.registry.createPortal(portalConfig.type, factoryConfig)
          }
          
          if (portal) {
            // Initialize the portal
            try {
              await portal.init({
                id: agentId,
                name: agentConfig.core.name,
                config: agentConfig
              } as Agent)
              
              portals.push(portal)
              console.log(`🔮 Loaded portal: ${portalConfig.name} (${portalConfig.type}) - Capabilities: ${portalConfig.capabilities?.join(', ') || 'default'}`)
              
              // Set primary portal
              if (portalConfig.primary === true) {
                primaryPortal = portal
              }
            } catch (error) {
              console.warn(`⚠️ Failed to initialize portal '${portalConfig.name}':`, error)
            }
          } else {
            console.warn(`⚠️ Portal '${portalConfig.name}' (${portalConfig.type}) not found and could not be created`)
          }
        } catch (error) {
          console.warn(`⚠️ Error loading portal '${portalConfig.name}':`, error)
        }
      }
    }
    
    // Fallback to primary portal if no primary was set
    if (!primaryPortal && portals.length > 0) {
      primaryPortal = portals[0]
      console.log(`🔮 Using first portal as primary: ${primaryPortal.constructor.name}`)
    }
    
    if (portals.length === 0) {
      console.warn(`⚠️ No portals loaded for agent, will run without AI capabilities`)
    }
    
    // Load extensions
    const extensions = []
    console.log(`🔍 Looking for extensions: ${agentConfig.modules.extensions.join(', ')}`)
    
    for (const extName of agentConfig.modules.extensions) {
      const extension = this.registry.getExtension(extName)
      if (extension) {
        extensions.push(extension)
        console.log(`✅ Found extension: ${extName}`)
      } else {
        console.warn(`⚠️ Extension '${extName}' not found in registry, skipping`)
      }
    }
    
    const agent: Agent = {
      id: agentId,
      character_id: characterId,
      name: agentConfig.core.name,
      status: AgentStatus.IDLE,
      emotion: emotionModule,
      memory: memoryProvider,
      cognition: cognitionModule,
      extensions,
      portal: primaryPortal, // Primary portal for backward compatibility
      portals: portals, // All available portals
      config: agentConfig,
      characterConfig: config, // Preserve original character configuration
      lastUpdate: new Date()
    }
    
    // Initialize extensions (skip API extension - it's shared at runtime level)
    for (const extension of extensions) {
      try {
        // Skip API extension initialization for individual agents - it's shared
        if (extension.id === 'api') {
          console.log(`🔗 API extension shared with agent: ${agent.name}`)
          // Register agent with the shared API extension's command system
          if ((extension as any).commandSystem) {
            (extension as any).commandSystem.registerAgent(agent)
            console.log(`📝 Registered agent ${agent.name} with command system`)
          }
          continue
        }
        
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
    
    // Add utility method to find portals by capability
    (agent as any).findPortalByCapability = (capability: string) => {
      if (!agent.portals) return agent.portal
      return agent.portals.find(p => {
        if (typeof p.hasCapability === 'function') {
          return p.hasCapability(capability as any)
        }
        // Fallback to checking config capabilities
        return (p as any).capabilities?.includes(capability)
      }) || agent.portal
    }
    
    // Initialize autonomous capabilities if enabled
    let finalAgent = agent
    // DISABLED: Autonomous behaviors - agents should only respond to messages
    // if (this.isAutonomousAgent(config)) {
    //   finalAgent = await this.initializeAutonomousAgent(agent, config)
    // }
    
    // TEMPORARILY DISABLED - Prompt and tool system initialization
    /*
    // Initialize prompt system for agent
    if (this.promptSystem) {
      const promptSystem = PromptIntegration.getPromptSystem(finalAgent)
      promptSystem.adaptToAgent(finalAgent)
      console.log(`💭 Initialized prompt system for agent ${finalAgent.name}`)
    }
    
    // Enable advanced tool capabilities through tool integration manager
    if (this.toolIntegrationManager && (config.modules?.tools?.enabled || agent.config.psyche.traits.includes('tool-aware'))) {
      this.toolIntegrationManager.enableToolsForAgent(finalAgent)
      console.log(`🛠️ Enabled advanced tool capabilities for agent ${finalAgent.name}`)
    }
    */
    
    this.agents.set(agentId, finalAgent)
    
    // Emit agent loaded event
    this.eventBus.emit({
      id: `event_${Date.now()}`,
      type: 'agent_loaded',
      source: 'runtime',
      data: { 
        agentId, 
        name: finalAgent.name,
        autonomyLevel: this.getAutonomyLevel(finalAgent)
      },
      timestamp: new Date(),
      processed: false
    })
    
    console.log(`✅ Agent loaded: ${finalAgent.name} (${agentId}) - Autonomy: ${this.getAutonomyLevel(finalAgent)}`)
    return finalAgent
  }

  getToolSystem(name: string): any {
    return this.registry.getToolSystem(name)
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

  private async initializeToolSystem(): Promise<void> {
    try {
      console.log('🔧 Initializing tool system...')
      
      // Simple tool system placeholder until full implementation
      // TODO: Implement proper tool system when classes are available
      
      console.log('✅ Tool system initialized (placeholder)')
    } catch (error) {
      console.error('❌ Failed to initialize tool system:', error)
    }
  }

  async tick(): Promise<void> {
    if (!this.isRunning) return
    
    const startTime = Date.now()
    
    // Check for lazy agents that need activation based on events
    await this.checkLazyAgentActivation()
    
    // Process each active agent
    for (const agent of this.agents.values()) {
      try {
        await this.processAgent(agent)
      } catch (error) {
        console.error(`❌ Error processing agent ${agent.name}:`, error)
        agent.status = AgentStatus.ERROR
      }
    }
    
    // Periodically clean up inactive agents (every 10 minutes)
    if (startTime % (10 * 60 * 1000) < this.config.tickInterval) {
      this.unloadInactiveAgents().catch(error => {
        runtimeLogger.error('❌ Error unloading inactive agents:', error)
      })
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
    
    // Skip processing if no AI capabilities available to prevent infinite loops
    if (!agent.portal && (!agent.portals || agent.portals.length === 0)) {
      console.log(`⏸️ Skipping agent ${agent.name} - no AI portals available`)
      agent.status = AgentStatus.IDLE
      return
    }
    
    // Check if there are any events to process
    const pendingEvents = this.getUnprocessedEvents(agent.id)
    if (pendingEvents.length === 0 && agent.status === AgentStatus.IDLE) {
      // No events to process and agent is idle, skip this tick
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
    
    // TEMPORARILY DISABLED - Enhanced thinking prompt generation
    /*
    // 1.5. Generate enhanced thinking prompt if prompt system is available
    if (this.promptSystem) {
      try {
        const enhancedThinkingPrompt = await PromptIntegration.generateThinkingPrompt(
          agent,
          {
            events: context.events,
            memories: context.memories,
            goal: agent.config.psyche.traits.includes('goal-oriented') 
              ? agent.characterConfig?.personality?.goals?.[0] 
              : undefined
          }
        )
        
        // Add enhanced prompt to context for cognition modules that support it
        ;(context as any).enhancedPrompt = enhancedThinkingPrompt
        ;(context as any).promptSystem = PromptIntegration.getPromptSystem(agent)
        
        // Extract available tools for tool-aware agents
        if (agent.config.psyche.traits.includes('tool-aware')) {
          (context as any).availableTools = PromptIntegration.extractToolDefinitions(agent)
        }
      } catch (error) {
        console.error(`Failed to generate thinking prompt for ${agent.name}:`, error)
      }
    }
    */
    
    // 2. Think and plan
    const thoughtResult = await agent.cognition.think(agent, context)
    
    // 2.5. Handle autonomous processing for autonomous agents
    if (this.autonomousAgents.has(agent.id)) {
      // For autonomous agents, the autonomous engine handles most processing
      // The regular cognition provides input to the autonomous decision making
      // We don't duplicate the processing here as the autonomous engine runs independently
    }
    
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
      // TEMPORARILY DISABLED - Decision prompt generation
      /*
      // Generate decision prompts for complex actions if prompt system is available
      if (this.promptSystem && action.type.includes('complex')) {
        try {
          const decisionPrompt = await PromptIntegration.generateDecisionPrompt(
            agent,
            [action],
            { 
              context: 'action_execution',
              currentEmotion: agent.emotion.current,
              energyLevel: agent.characterConfig?.stats?.energy
            }
          )
          // Store decision prompt for logging/debugging
          ;(action as any).decisionPrompt = decisionPrompt
        } catch (error) {
          console.error(`Failed to generate decision prompt for action:`, error)
        }
      }
      */
      
      await this.executeAction(agent, action)
    }
    
    // 6. Tick extensions
    for (const extension of agent.extensions) {
      if (extension.enabled) {
        try {
          // Prompt context removed - using lightweight PromptManager instead
          
          await extension.tick(agent)
          
          // Clean up temporary prompt context
          delete (agent as any).promptContext
        } catch (error) {
          console.error(`❌ Extension ${extension.name} tick error:`, error)
        }
      }
    }
    
    agent.status = AgentStatus.ACTIVE
  }

  private async executeAction(agent: Agent, action: AgentAction): Promise<void> {
    // TEMPORARILY DISABLED - Safety check prompt generation
    /*
    // Generate safety check prompt if available
    if (this.promptSystem && action.type !== 'safe_action') {
      try {
        const safetyPrompt = await PromptIntegration.generateSafetyPrompt(
          agent,
          action,
          { actionType: action.type, extension: action.extension }
        )
        // The safety check would be evaluated by the agent's cognition module
        // For now, we just log that a safety check was generated
        console.log(`🛡️ Generated safety check for action ${action.type}`)
      } catch (error) {
        console.error(`Failed to generate safety prompt for action:`, error)
      }
    }
    */
    
    // Tool actions are not currently supported
    
    // Check if this is an autonomous engine action (handled internally)
    if (action.extension === 'autonomous_engine') {
      // These actions are handled by the autonomous engine itself
      // Just mark as completed since the autonomous engine has already processed it
      action.status = ActionStatus.COMPLETED
      action.result = { success: true, type: ActionResultType.SUCCESS }
      return
    }
    
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
    // Stop autonomous systems first if this is an autonomous agent
    if (this.autonomousAgents.has(agent.id)) {
      await this.stopAutonomousSystems(agent.id)
    }
    
    // TEMPORARILY DISABLED - Clear prompt system for agent
    /*
    if (this.promptSystem) {
      PromptIntegration.clearPromptSystem(agent.id)
      console.log(`💭 Cleared prompt system for agent: ${agent.name}`)
    }
    */
    
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
      // Import factory functions from modules
      const { createEmotionModule, createCognitionModule } = await import('../modules/index.js')
      const { getEmotionModuleTypes } = await import('../modules/emotion/index.js')
      const { getCognitionModuleTypes } = await import('../modules/cognition/index.js')
      
      // Register core modules
      const { registerCoreModules } = await import('../modules/index.js')
      await registerCoreModules(this.registry)
      
      // Clean summary logging
      console.log(`✅ Core modules: ${this.registry.listEmotionModules().join(', ')}, ${this.registry.listCognitionModules().join(', ')}`)
    } catch (error) {
      console.error('❌ Failed to register core modules:', error)
    }
  }

  /**
   * Check if agent configuration indicates autonomous capabilities
   */
  private isAutonomousAgent(config: AgentConfig): boolean {
    return config.autonomous?.enabled === true || 
           config.autonomous_behaviors !== undefined
  }

  /**
   * Initialize autonomous agent capabilities
   */
  private async initializeAutonomousAgent(agent: Agent, config: AgentConfig): Promise<AutonomousAgent> {
    console.log(`🤖 Initializing autonomous capabilities for: ${agent.name}`)
    
    try {
      // Create autonomous agent
      const autonomousAgent: AutonomousAgent = {
        ...agent,
        autonomousConfig: this.createAutonomousConfig(config)
      }

      // Initialize decision engine
      const decisionEngine = new DecisionEngine(autonomousAgent, {
        type: DecisionModuleType.HYBRID,
        riskTolerance: config.autonomous?.decision_making?.autonomy_threshold || 0.7,
        decisionSpeed: 1.0,
        evaluationCriteria: ['goal_alignment', 'personality_fit', 'ethical_compliance']
      })
      this.decisionEngines.set(agent.id, decisionEngine)

      // Behavior and lifecycle systems removed - functionality in autonomous engine

      // Initialize autonomous engine
      const autonomousEngineConfig: AutonomousEngineConfig = {
        enabled: true,
        tickInterval: 30000, // 30 seconds
        autonomyLevel: config.autonomous?.independence_level || 0.8,
        interruptible: config.human_interaction?.interruption_tolerance !== 'low',
        ethicalConstraints: config.autonomous?.decision_making?.ethical_constraints !== false,
        performanceMonitoring: true,
        goalGenerationEnabled: config.autonomous?.life_simulation?.goal_pursuit !== false,
        curiosityWeight: config.autonomous_behaviors?.curiosity_driven?.exploration_rate || 0.3,
        maxConcurrentActions: 3,
        planningHorizon: 60 * 60 * 1000 // 1 hour
      }

      const autonomousEngine = new AutonomousEngine(
        autonomousAgent,
        autonomousEngineConfig,
        this.eventBus
      )
      this.autonomousEngines.set(agent.id, autonomousEngine)

      // Store autonomous agent
      this.autonomousAgents.set(agent.id, autonomousAgent)

      // Start autonomous systems
      await this.startAutonomousSystems(agent.id)

      console.log(`✅ Autonomous capabilities initialized for: ${agent.name}`)
      return autonomousAgent

    } catch (error) {
      console.error(`❌ Failed to initialize autonomous capabilities for ${agent.name}:`, error)
      return agent as AutonomousAgent
    }
  }

  /**
   * Start autonomous systems for an agent
   */
  private async startAutonomousSystems(agentId: string): Promise<void> {
    try {
      // Lifecycle system removed - functionality in autonomous engine

      // Start autonomous engine
      const autonomousEngine = this.autonomousEngines.get(agentId)
      if (autonomousEngine) {
        await autonomousEngine.start()
      }

      console.log(`🚀 Autonomous systems started for agent: ${agentId}`)
    } catch (error) {
      console.error(`❌ Failed to start autonomous systems for ${agentId}:`, error)
    }
  }

  /**
   * Stop autonomous systems for an agent
   */
  private async stopAutonomousSystems(agentId: string): Promise<void> {
    try {
      // Stop autonomous engine
      const autonomousEngine = this.autonomousEngines.get(agentId)
      if (autonomousEngine) {
        await autonomousEngine.stop()
        this.autonomousEngines.delete(agentId)
      }

      // Clean up other systems
      this.decisionEngines.delete(agentId)
      this.autonomousAgents.delete(agentId)

      console.log(`🛑 Autonomous systems stopped for agent: ${agentId}`)
    } catch (error) {
      console.error(`❌ Failed to stop autonomous systems for ${agentId}:`, error)
    }
  }

  /**
   * Create autonomous configuration from agent config
   */
  private createAutonomousConfig(config: AgentConfig): any {
    return {
      learning: {
        algorithm: 'hybrid' as const,
        learningRate: 0.1,
        discountFactor: 0.95,
        explorationRate: 0.3,
        experienceReplaySize: 1000,
        batchSize: 32,
        targetUpdateFrequency: 100,
        curiosityWeight: config.autonomous_behaviors?.curiosity_driven?.exploration_rate || 0.3
      },
      selfManagement: {
        adaptationEnabled: true,
        learningRate: 0.05,
        performanceThreshold: 0.7,
        adaptationTriggers: [],
        selfHealingEnabled: true,
        diagnosticsInterval: 300000 // 5 minutes
      },
      goalSystem: {
        maxActiveGoals: 5,
        goalGenerationInterval: 3600000, // 1 hour
        curiosityThreshold: 0.6,
        conflictResolutionStrategy: 'priority' as const,
        planningHorizon: 86400000, // 24 hours
        adaptationRate: 0.1,
        curiosityDrivers: []
      },
      resourceManagement: {
        enabled: true,
        monitoringInterval: 60000,
        allocationStrategy: 'dynamic' as const,
        optimizationGoals: ['efficiency', 'performance', 'stability']
      },
      metaCognition: {
        enabled: true,
        selfEvaluationInterval: 1800000, // 30 minutes
        strategyAdaptationEnabled: true,
        performanceMonitoringEnabled: true
      }
    }
  }

  /**
   * Get agent autonomy level
   */
  private getAutonomyLevel(agent: Agent): number {
    const autonomousAgent = this.autonomousAgents.get(agent.id)
    if (autonomousAgent) {
      return autonomousAgent.autonomousConfig?.learning?.explorationRate || 0.8
    }
    return 0
  }

  /**
   * Handle interruption for autonomous agent
   */
  public interruptAutonomousAgent(agentId: string, event: AgentEvent): void {
    const autonomousEngine = this.autonomousEngines.get(agentId)
    if (autonomousEngine) {
      autonomousEngine.queueInterruption(event)
      console.log(`📨 Queued interruption for autonomous agent: ${agentId}`)
    }
  }

  /**
   * Get autonomous agent status
   */
  public getAutonomousStatus(agentId: string) {
    const autonomousEngine = this.autonomousEngines.get(agentId)
    const decisionEngine = this.decisionEngines.get(agentId)

    if (!autonomousEngine) {
      return { autonomous: false }
    }

    return {
      autonomous: true,
      engine: autonomousEngine.getAutonomousState(),
      decisions: decisionEngine?.getDecisionStats()
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
      
      // API extension config (always enabled by default)
      extensionConfigs.api = {
        enabled: true,
        priority: 1,
        settings: {
          port: parseInt(process.env.API_PORT || '8000'),
          host: process.env.API_HOST || 'localhost',
          cors_enabled: true,
          rate_limiting: true,
          websocket_enabled: true,
          webui_enabled: true,
          auth_required: process.env.API_AUTH_REQUIRED === 'true',
          max_connections: parseInt(process.env.API_MAX_CONNECTIONS || '100')
        },
        dependencies: [],
        capabilities: ['http', 'websocket', 'webui', 'api']
      }
      
      // Slack extension config
      if (process.env.SLACK_BOT_TOKEN) {
        extensionConfigs.slack = {
          enabled: true,
          priority: 2,
          settings: {
            botToken: process.env.SLACK_BOT_TOKEN,
            signingSecret: process.env.SLACK_SIGNING_SECRET,
            appToken: process.env.SLACK_APP_TOKEN
          },
          dependencies: [],
          capabilities: ['messaging', 'channels']
        }
      }
      
      // RuneLite extension config
      if (process.env.RUNELITE_ENABLED === 'true') {
        extensionConfigs.runelite = {
          enabled: true,
          priority: 3,
          settings: {
            // RuneLite specific config
          },
          dependencies: [],
          capabilities: ['game-automation']
        }
      }
      
      // Twitter extension config
      if (process.env.TWITTER_API_KEY) {
        extensionConfigs.twitter = {
          enabled: true,
          priority: 4,
          settings: {
            apiKey: process.env.TWITTER_API_KEY,
            apiSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
          },
          dependencies: [],
          capabilities: ['social-media', 'posting']
        }
      }
      
      // Telegram extension config
      if (process.env.TELEGRAM_BOT_TOKEN) {
        extensionConfigs.telegram = {
          enabled: true,
          priority: 5,
          settings: {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
            webhookUrl: process.env.TELEGRAM_WEBHOOK_URL
          },
          dependencies: [],
          capabilities: ['messaging', 'webhook']
        }
      }
      
      // Create a temporary RuntimeConfig for extensions
      const tempConfig: RuntimeConfig = {
        ...this.config,
        extensions: {
          autoLoad: true,
          paths: [],
          ...extensionConfigs
        }
      }
      
      // Register available extensions
      const extensions = await extensionsModule.registerExtensions(tempConfig)
      
      // Register extensions in registry using their ID instead of name
      for (const extension of extensions) {
        this.registry.registerExtension(extension.id, extension)
        
        // If this is the API extension, connect it to the runtime and initialize it
        if (extension.id === 'api') {
          if ('setRuntime' in extension) {
            ;(extension as any).setRuntime(this)
          }
          // Initialize the API extension at runtime level with a dummy agent
          try {
            const dummyAgent = {
              id: 'runtime',
              name: 'Runtime',
              status: 'active',
              config: {}
            }
            await extension.init(dummyAgent as any)
            console.log('🚀 API extension initialized at runtime level')
          } catch (error) {
            console.error('❌ Failed to initialize API extension at runtime level:', error)
          }
        }
      }
      
      console.log('✅ Built-in extensions loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load built-in extensions:', error)
    }
  }

  /**
   * Load dynamic plugins (simplified for emergency cleanup)
   */
  private async loadDynamicPlugins(): Promise<void> {
    console.log('🔍 Dynamic plugin loading simplified for emergency cleanup')
    
    try {
      // Use simple extension loading only
      const extensions = await this.pluginLoader.loadExtensions()
      console.log(`✅ Plugins: ${extensions.length} loaded`)
      
      console.log('✅ Dynamic plugin loading completed (simplified)')
    } catch (error) {
      console.error('❌ Failed to load dynamic plugins:', error)
    }
  }

  /**
   * Get runtime statistics
   */
  getStats() {
    const autonomousAgentStats = Array.from(this.autonomousAgents.keys()).map(agentId => ({
      agentId,
      status: this.getAutonomousStatus(agentId)
    }))

    return {
      agents: this.agents.size,
      lazyAgents: this.lazyAgents.size,
      autonomousAgents: this.autonomousAgents.size,
      isRunning: this.isRunning,
      plugins: this.pluginLoader.getStats(),
      eventBus: {
        events: this.eventBus.getEvents().length
      },
      autonomous: {
        totalAutonomousAgents: this.autonomousAgents.size,
        autonomousEngines: this.autonomousEngines.size,
        decisionEngines: this.decisionEngines.size,
        agentStats: autonomousAgentStats
      },
      lazy: {
        totalLazyAgents: this.lazyAgents.size,
        activeAgents: this.agents.size,
        unloadedAgents: Array.from(this.lazyAgents.values()).filter(la => la.state === LazyAgentState.UNLOADED).length,
        loadedAgents: Array.from(this.lazyAgents.values()).filter(la => la.state === LazyAgentState.LOADED).length,
        errorAgents: Array.from(this.lazyAgents.values()).filter(la => la.state === LazyAgentState.ERROR).length
      }
    }
  }

  /**
   * Load a specific plugin by ID
   */
  async loadPlugin(pluginId: string, config?: ExtensionConfig): Promise<boolean> {
    console.log(`🔌 Plugin loading simplified for emergency cleanup: ${pluginId}`)
    return false // Plugins will be loaded via built-in extension system
  }

  /**
   * Unload a specific plugin by ID
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    console.log(`🔌 Plugin unloading simplified for emergency cleanup: ${pluginId}`)
    return false
  }

  /**
   * Reload a specific plugin by ID
   */
  async reloadPlugin(pluginId: string, config?: ExtensionConfig): Promise<boolean> {
    console.log(`🔌 Plugin reloading simplified for emergency cleanup: ${pluginId}`)
    return false
  }

  /**
   * Get list of available plugins
   */
  async getAvailablePlugins() {
    console.log('🔌 Plugin discovery simplified for emergency cleanup')
    return []
  }

  /**
   * Get list of loaded plugins
   */
  getLoadedPlugins(): Array<{ id: string; [key: string]: any }> {
    console.log('🔌 Plugin listing simplified for emergency cleanup')
    return []
  }

  /**
   * Subscribe to runtime events
   */
  subscribeToEvents(pattern: { type?: string; source?: string }, handler: (event: AgentEvent) => void) {
    // Simplified for emergency cleanup
    this.eventBus.on(pattern.type || '*', handler)
  }

  /**
   * Get event history
   */
  async getEventHistory(filter?: { type?: string; source?: string; limit?: number }): Promise<AgentEvent[]> {
    // Simplified for emergency cleanup
    const events = this.eventBus.getEvents()
    if (filter?.limit) {
      return events.slice(-filter.limit)
    }
    return events
  }

  /**
   * Get comprehensive runtime capabilities and module information
   */
  getRuntimeCapabilities() {
    return {
      agents: {
        active: this.agents.size,
        lazy: this.lazyAgents.size,
        total: this.agents.size + this.lazyAgents.size,
        activeList: Array.from(this.agents.keys()),
        lazyList: Array.from(this.lazyAgents.values()).map(la => ({
          id: la.id,
          name: la.name,
          state: la.state,
          priority: la.priority
        }))
      },
      modules: {
        emotion: {
          available: this.registry.listEmotionModules(),
          factorySupported: true
        },
        cognition: {
          available: this.registry.listCognitionModules(),
          factorySupported: true
        },
        memory: {
          available: ['memory', 'sqlite'], // TODO: make this dynamic
          factorySupported: false
        },
        portals: {
          available: this.registry.listPortals(),
          factories: this.registry.listPortalFactories(),
          factorySupported: true
        }
      },
      extensions: {
        loaded: this.getLoadedPlugins().map(p => p.id || 'unknown'),
        available: [] // TODO: get from plugin discovery
      },
      runtime: {
        isRunning: this.isRunning,
        tickInterval: this.config.tickInterval,
        version: '1.0.0' // TODO: get from package.json
      }
    }
  }

  /**
   * Create a new agent dynamically with the specified configuration
   */
  async createAgent(config: AgentConfig): Promise<string> {
    const agent = await this.loadAgent(config, undefined)
    console.log(`🤖 Dynamically created agent: ${agent.name} (${agent.id})`)
    return agent.id
  }

  /**
   * Remove an agent from the runtime
   */
  async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return false
    }
    
    await this.shutdownAgent(agent)
    this.agents.delete(agentId)
    console.log(`🗑️ Removed agent: ${agent.name} (${agentId})`)
    return true
  }

  private async loadPortals(): Promise<void> {
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
      
      // Register portal factories for dynamic creation
      try {
        const portalsModule = await import('../portals/index.js')
        if (portalsModule.getAvailablePortalTypes) {
          const portalTypes = portalsModule.getAvailablePortalTypes()
          for (const portalType of portalTypes) {
            if (portalsModule.createPortal) {
              const factory = (config: PortalConfig) => portalsModule.createPortal(portalType, config)
              this.registry.registerPortalFactory(portalType, factory)
            }
          }
          // Portal factories registered - logged by integration
        }
      } catch (factoryError) {
        console.warn('⚠️ Portal factories not available:', factoryError instanceof Error ? factoryError.message : String(factoryError))
      }
      
      // Portal information displayed by UI
    } catch (error) {
      console.error('❌ Failed to load portals:', error)
    }
  }


  async preloadAgent(agentId: string): Promise<void> {
    const lazyAgent = this.lazyAgents.get(agentId)
    if (!lazyAgent) {
      throw new Error(`Lazy agent '${agentId}' not found`)
    }

    if (lazyAgent.state === LazyAgentState.LOADED || lazyAgent.state === LazyAgentState.ACTIVE) {
      runtimeLogger.info(`✅ Agent ${agentId} already loaded`)
      return
    }

    runtimeLogger.info(`📦 Preloading agent: ${agentId}`)
    lazyAgent.state = LazyAgentState.LOADING

    try {
      // Just validate that the agent can be created without storing it
      const testAgent = await this.loadAgent(lazyAgent.config, lazyAgent.character_id)
      await this.shutdownAgent(testAgent)
      
      lazyAgent.state = LazyAgentState.LOADED
      runtimeLogger.info(`✅ Agent ${agentId} preloaded successfully`)
    } catch (error) {
      lazyAgent.state = LazyAgentState.ERROR
      lazyAgent.lazyMetrics.lastError = error instanceof Error ? error.message : String(error)
      runtimeLogger.error(`❌ Failed to preload agent ${agentId}:`, error)
      throw error
    }
  }

  async unloadInactiveAgents(): Promise<number> {
    runtimeLogger.info('🧹 Unloading inactive agents...')
    
    let unloadedCount = 0
    const cutoffTime = Date.now() - (30 * 60 * 1000) // 30 minutes

    for (const [agentId, lazyAgent] of this.lazyAgents) {
      // Skip agents that are already unloaded or currently loading
      if (lazyAgent.state === LazyAgentState.UNLOADED || lazyAgent.state === LazyAgentState.LOADING) {
        continue
      }

      // Check if agent is inactive
      const lastActive = lazyAgent.lastActivated?.getTime() || 0
      if (lastActive < cutoffTime && this.agents.has(agentId)) {
        try {
          await this.deactivateAgent(agentId)
          unloadedCount++
        } catch (error) {
          runtimeLogger.error(`❌ Failed to unload inactive agent ${agentId}:`, error)
        }
      }
    }

    runtimeLogger.info(`✅ Unloaded ${unloadedCount} inactive agents`)
    return unloadedCount
  }

  /**
   * Check if any lazy agents need activation based on pending events
   */
  private async checkLazyAgentActivation(): Promise<void> {
    const allEvents = this.eventBus.getEvents()
    const pendingEvents = allEvents.filter(event => !event.processed)
    
    if (pendingEvents.length === 0) return

    // Check each lazy agent to see if they should be activated
    for (const [agentId, lazyAgent] of this.lazyAgents) {
      // Skip if agent is already active or in error state
      if (lazyAgent.state === LazyAgentState.ACTIVE || lazyAgent.state === LazyAgentState.ERROR) {
        continue
      }

      // Check if any events are targeted at this agent
      const relevantEvents = pendingEvents.filter(event => 
        event.targetAgentId === agentId ||
        event.type.includes(lazyAgent.name.toLowerCase()) ||
        (event.data && event.data.agentId === agentId)
      )

      if (relevantEvents.length > 0) {
        try {
          runtimeLogger.info(`🔥 Activating lazy agent ${lazyAgent.name} due to ${relevantEvents.length} relevant events`)
          await this.activateAgent(agentId)
        } catch (error) {
          runtimeLogger.error(`❌ Failed to activate lazy agent ${agentId}:`, error)
        }
      }
    }
  }

  /**
   * Calculate agent priority based on configuration
   */
  private calculateAgentPriority(characterConfig: any): number {
    // Default priority
    let priority = 5

    // Check explicit priority setting
    if (characterConfig.priority) {
      if (typeof characterConfig.priority === 'string') {
        switch (characterConfig.priority.toLowerCase()) {
          case 'high': priority = 8; break
          case 'medium': priority = 5; break
          case 'low': priority = 2; break
          default: priority = 5
        }
      } else if (typeof characterConfig.priority === 'number') {
        priority = Math.max(1, Math.min(10, characterConfig.priority))
      }
    }

    // Boost priority for primary agents
    if (characterConfig.primary === true) {
      priority = Math.min(10, priority + 2)
    }

    // Boost priority for autonomous agents
    if (characterConfig.autonomous?.enabled === true) {
      priority = Math.min(10, priority + 1)
    }

    return priority
  }

  /**
   * Register a default agent factory for creating agents from configurations
   */
  private registerDefaultAgentFactory(): void {
    const defaultAgentFactory: AgentFactory = async (config: AgentConfig, characterConfig?: any) => {
      return this.loadAgent(config, characterConfig?.id)
    }
    
    this.registry.registerAgentFactory('default', defaultAgentFactory)
    // Agent factory registered - logged by UI
  }

  /**
   * Create a lazy agent from configuration
   */
  private createLazyAgent(agentConfig: AgentConfig, characterConfig: any, characterId?: string): LazyAgent {
    const agentId = characterId || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const lazyAgent: LazyAgent = {
      id: agentId,
      character_id: characterId,
      name: characterConfig.name || agentConfig.core?.name || 'Unknown Agent',
      state: LazyAgentState.UNLOADED,
      config: agentConfig,
      characterConfig: characterConfig,
      lastActivated: undefined,
      agent: undefined,
      priority: this.calculateAgentPriority(characterConfig),
      lazyMetrics: {
        activationCount: 0,
        lastActivationTime: undefined,
        averageActiveTime: 0,
        memoryUsage: 0,
        lastError: undefined
      }
    }
    
    return lazyAgent
  }

  /**
   * Activate a lazy agent
   */
  async activateAgent(agentId: string): Promise<Agent> {
    const lazyAgent = this.lazyAgents.get(agentId)
    if (!lazyAgent) {
      throw new Error(`Lazy agent ${agentId} not found`)
    }

    if (lazyAgent.state === LazyAgentState.ACTIVE && lazyAgent.agent) {
      return lazyAgent.agent // Already active
    }

    try {
      lazyAgent.state = LazyAgentState.LOADING
      
      // Create the full agent using existing loadAgent method
      const agent = await this.loadAgent(lazyAgent.config, lazyAgent.characterConfig?.id)
      
      // Update lazy agent state
      lazyAgent.state = LazyAgentState.ACTIVE
      lazyAgent.lazyMetrics.activationCount++
      lazyAgent.lazyMetrics.lastActivationTime = new Date()
      lazyAgent.lastActivated = new Date()
      lazyAgent.agent = agent
      
      // Store in active agents
      this.agents.set(agentId, agent)
      
      runtimeLogger.success(`✅ Activated agent: ${lazyAgent.name}`)
      return agent
    } catch (error) {
      lazyAgent.state = LazyAgentState.ERROR
      lazyAgent.lazyMetrics.lastError = (error as Error).message
      runtimeLogger.error(`❌ Failed to activate agent ${agentId}:`, error)
      throw error
    }
  }

  /**
   * Deactivate an agent and return it to lazy state
   */
  async deactivateAgent(agentId: string): Promise<void> {
    const lazyAgent = this.lazyAgents.get(agentId)
    const agent = this.agents.get(agentId)
    
    if (!lazyAgent || !agent) {
      return
    }

    try {
      lazyAgent.state = LazyAgentState.DEACTIVATING
      
      // Shutdown agent resources
      await this.shutdownAgent(agent)
      
      // Remove from active agents
      this.agents.delete(agentId)
      
      // Update lazy agent state
      lazyAgent.state = LazyAgentState.UNLOADED
      lazyAgent.agent = undefined
      
      runtimeLogger.info(`💤 Deactivated agent: ${lazyAgent.name}`)
    } catch (error) {
      lazyAgent.state = LazyAgentState.ERROR
      lazyAgent.lazyMetrics.lastError = (error as Error).message
      runtimeLogger.error(`❌ Failed to deactivate agent ${agentId}:`, error)
    }
  }

  /**
   * Check if an agent is currently active
   */
  isAgentActive(agentId: string): boolean {
    return this.agents.has(agentId)
  }

  /**
   * Get the state of a lazy agent
   */
  getAgentState(agentId: string): LazyAgentState | undefined {
    const lazyAgent = this.lazyAgents.get(agentId)
    return lazyAgent?.state
  }

  /**
   * Get a lazy agent by ID
   */
  getLazyAgent(agentId: string): LazyAgent | undefined {
    return this.lazyAgents.get(agentId)
  }

  /**
   * List all lazy agents
   */
  listLazyAgents(): LazyAgent[] {
    return Array.from(this.lazyAgents.values())
  }
}

// SYMindXEventBus removed - using SimpleEventBus instead

