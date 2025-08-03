/// <reference path="../types/globals.d.ts" />

// Type imports - ordered alphabetically within groups
import {
  Agent,
  AgentConfig,
  AgentRuntime,
  EventBus,
  ModuleRegistry,
  AgentEvent,
  AgentAction,
  ActionStatus,
  ThoughtContext,
  AgentState,
  EnvironmentState,
  Extension,
  AgentStatus,
  EnvironmentType,
  MemoryRecord,
  LazyAgent,
  LazyAgentStatus,
  InitializationResult,
  CleanupResult,
  EventProcessingResult,
  CognitionModule,
  MemoryProvider,
  MemoryProviderType,
  EmotionModuleType,
  CognitionModuleType,
  MemoryConfig,
  EmotionConfig,
  CognitionConfig,
} from '../types/agent';
import { AutonomousAgent, DecisionModuleType } from '../types/autonomous';
import {
  CharacterConfig,
  ExtensionConfig as CharacterExtensionConfig,
} from '../types/character';
import { ExtensionConfig } from '../types/common';
import {
  RuntimeConfiguration as RuntimeConfig,
  RuntimeState,
  RuntimeStatus,
  RuntimeMetrics,
  RuntimeError,
} from '../types/core/runtime';
import type { EmotionModule } from '../types/emotion';
import { ActionResultType } from '../types/enums';
import { Timestamp, OperationResult, ExecutionResult } from '../types/helpers';
import { Portal, PortalConfig, PortalCapability } from '../types/portal';
import { AgentStateTransitionResult } from '../types/results';
import type {
  ConfigValue,
  ProcessedEnvironmentConfig,
  ModuleConfig,
  CharacterConfigWithModules,
} from '../types/runtime-config';
import { LogContext } from '../types/utils/logger';
// Utility imports
import { configResolver } from '../utils/config-resolver';
import { errorHandler } from '../utils/error-handler';
import { runtimeLogger } from '../utils/logger';
import {
  createRuntimeError,
  createConfigurationError,
  createAgentError,
  createExtensionError,
  safeAsync,
  formatError,
} from '../utils/standard-errors';
import {
  standardLoggers,
  createStandardLoggingPatterns,
  StandardLogContext,
} from '../utils/standard-logging.js';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { memoryManager } from '../utils/MemoryManager';
import { globalQueue } from '../utils/AsyncQueue';

// Core system imports
import { AutonomousEngine, AutonomousEngineConfig } from './autonomous-engine';
import { DecisionEngine } from './decision-engine';
import { SimpleEventBus } from './event-bus';
import { ExtensionLoader, createExtensionLoader } from './extension-loader';
import { MultiAgentManager } from './multi-agent-manager';
import { SYMindXModuleRegistry } from './registry';
// Behaviors and lifecycle systems removed - functionality integrated into autonomous engine

// Context system imports
import {
  ContextBootstrapper,
  ContextBootstrapperConfig,
  RuntimeContextAdapter,
  ContextManager,
  createContextBootstrapper,
} from './context/integration/index';
import {
  ContextService,
  createContextService,
  ContextEnhancementOptions,
} from './context-service';

// Compliance system imports
import {
  ComplianceIntegration,
  createComplianceIntegration,
} from './compliance-integration';

export class SYMindXRuntime implements AgentRuntime {
  public agents: Map<string, Agent> = new Map();
  public lazyAgents: Map<string, LazyAgent> = new Map();
  public eventBus: EventBus;
  public registry: ModuleRegistry;
  public extensionLoader: ExtensionLoader;
  public config: RuntimeConfig;
  private tickTimer?: ReturnType<typeof setInterval>;
  private tickTaskId?: string;
  private isRunning = false;
  private runtimeState: RuntimeState;

  // Standardized logging
  private logger = standardLoggers.runtime;
  private loggingPatterns = createStandardLoggingPatterns(this.logger);

  // Multi-Agent Manager
  public multiAgentManager?: MultiAgentManager;

  // Autonomous system components
  private autonomousEngines: Map<string, AutonomousEngine> = new Map();
  private decisionEngines: Map<string, DecisionEngine> = new Map();
  // Behavior and lifecycle systems removed - functionality integrated into autonomous engine
  private autonomousAgents: Map<string, AutonomousAgent> = new Map();

  // Context system components
  private contextBootstrapper?: ContextBootstrapper;
  private contextManager?: ContextManager;
  private runtimeAdapter?: RuntimeContextAdapter;
  private contextService: ContextService;

  // Compliance system
  private complianceIntegration?: ComplianceIntegration;

  constructor(config: RuntimeConfig) {
    this.config = config;

    // Use simple event bus for clean architecture
    this.eventBus = new SimpleEventBus();

    this.registry = new SYMindXModuleRegistry();

    // Create extension context for plugin loader
    // const _extensionContext: ExtensionContext = {
    //   logger: new Logger('plugin-loader'),
    //   config: {
    //     enabled: true,
    //     priority: 1,
    //     settings: {},
    //     dependencies: [],
    //     capabilities: [],
    //   },
    // };
    this.extensionLoader = createExtensionLoader();
    // extensionContext is available for future use

    // Initialize context service
    this.contextService = createContextService({
      enableCaching: true,
      enableValidation: true,
      enablePerformanceMonitoring: config.debug?.enabled || false,
      enableTracing: config.debug?.enabled || false,
    });

    // Initialize context system (async, but don't block constructor)
    this.initializeContextSystemAsync();

    // Initialize runtime state
    this.runtimeState = {
      status: RuntimeStatus.STOPPED,
      startTime: new Date(),
      uptime: 0,
      activeAgents: 0,
      totalAgents: 0,
      metrics: this.createEmptyMetrics(),
      errors: [],
      version: '1.0.0',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        hostname: 'localhost',
        pid: process.pid,
      },
    };

    // Initialize runtime metrics
  }

  async initialize(): Promise<void> {
    this.logger.start('Initializing SYMindX Runtime...');

    // Load environment variables from .env file if it exists
    try {
      const { configDotenv } = await import('dotenv');
      const path = await import('path');

      // Get the root directory path
      const __dirname = path.dirname(new URL(import.meta.url).pathname);
      const rootDir = path.resolve(__dirname, '../../..');
      const envPath = path.join(rootDir, '.env');

      // Try to load .env file
      configDotenv({ path: envPath });
      // Environment variables loaded - logged by UI
    } catch {
      this.logger.warn(
        '⚠️ No .env file found or dotenv not available, using system environment variables'
      );
    }

    // Try to load configuration from config/runtime.json
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Get the project root directory
      const __dirname = path.dirname(new URL(import.meta.url).pathname);

      // Determine project root based on where we're running from
      let projectRoot: string;
      if (__dirname.endsWith('/dist')) {
        // Running from bundled dist/index.js
        projectRoot = path.resolve(__dirname, '..');
      } else if (__dirname.includes('/dist/core')) {
        // Running from dist/core/runtime.js
        projectRoot = path.resolve(__dirname, '..', '..');
      } else if (__dirname.includes('/src/core')) {
        // Running from src/core/runtime.ts
        projectRoot = path.resolve(__dirname, '..', '..');
      } else {
        // Fallback
        projectRoot = path.resolve(__dirname, '..', '..');
      }

      this.logger.debug('Resolving config paths', {
        __dirname,
        projectRoot,
      });

      // Try multiple paths for runtime.json
      const configPaths = [
        // When running from bundled dist/index.js
        path.join(projectRoot, 'dist', 'core', 'config', 'runtime.json'),
        // When running from src
        path.join(projectRoot, 'src', 'core', 'config', 'runtime.json'),
        // Legacy paths
        path.join(__dirname, 'config', 'runtime.json'),
        path.join(__dirname, 'core', 'config', 'runtime.json'),
      ];

      let configPath = '';
      let configFound = false;

      // Try each path until we find the config
      for (const testPath of configPaths) {
        this.logger.debug('Checking config path', { path: testPath });
        try {
          await fs.access(testPath);
          configPath = testPath;
          configFound = true;
          this.logger.config('Found configuration file', { path: configPath });
          break;
        } catch (e) {
          this.logger.debug('Config not found at path', { path: testPath });
          // Continue to next path
        }
      }

      // Check if the config file exists
      try {
        if (!configFound) {
          throw new Error('Config file not found in any expected location');
        }
        // Loading configuration - logged by UI

        // Read and parse the config file
        const configData = await fs.readFile(configPath, 'utf-8');
        const fileConfig = JSON.parse(configData) as Partial<RuntimeConfig>;

        // Merge with default config and load API keys from environment
        this.config = {
          ...this.config,
          ...fileConfig,
          persistence: {
            ...this.config.persistence,
            ...fileConfig.persistence,
          },
          extensions: {
            ...this.config.extensions,
            ...fileConfig.extensions,
          },
          agents: (() => {
            const agentsConfig: {
              enabled: boolean;
              paths?: string[];
              defaultEnabled?: boolean;
              charactersPath?: string;
            } = {
              enabled:
                fileConfig.agents?.enabled ??
                this.config.agents?.enabled ??
                true,
            };

            const paths = fileConfig.agents?.paths ?? this.config.agents?.paths;
            if (paths) agentsConfig.paths = paths;

            const defaultEnabled =
              fileConfig.agents?.defaultEnabled ??
              this.config.agents?.defaultEnabled;
            if (defaultEnabled !== undefined)
              agentsConfig.defaultEnabled = defaultEnabled;

            const charactersPath =
              fileConfig.agents?.charactersPath ??
              this.config.agents?.charactersPath;
            if (charactersPath) agentsConfig.charactersPath = charactersPath;

            return agentsConfig;
          })(),
          portals: {
            // Ensure boolean values for autoLoad and proper array for paths
            autoLoad:
              fileConfig.portals?.autoLoad ??
              this.config.portals?.autoLoad ??
              true,
            paths: fileConfig.portals?.paths ??
              this.config.portals?.paths ?? ['./portals'],
            apiKeys: {
              // Default API keys from environment variables
              openai: process.env['OPENAI_API_KEY'] || '',
              anthropic: process.env['ANTHROPIC_API_KEY'] || '',
              groq: process.env['GROQ_API_KEY'] || '',
              xai: process.env['XAI_API_KEY'] || '',
              google: process.env['GOOGLE_API_KEY'] || '',
              openrouter: process.env['OPENROUTER_API_KEY'] || '',
              'kluster.ai': process.env['KLUSTER_AI_API_KEY'] || '',
              // Override with any explicit config values
              ...this.config.portals?.apiKeys,
              ...fileConfig.portals?.apiKeys,
            },
          },
        };

        // Configuration loaded - logged by UI
      } catch (err) {
        if ((err as { code?: string }).code === 'ENOENT') {
          runtimeLogger.warn(
            '⚠️ No runtime.json found, using default configuration with environment variables'
          );
          // Still load API keys from environment even without config file
          this.config = {
            ...this.config,
            portals: {
              autoLoad: this.config.portals?.autoLoad ?? true,
              paths: this.config.portals?.paths ?? ['./portals'],
              apiKeys: {
                // Default API keys from environment variables
                openai: process.env['OPENAI_API_KEY'] || '',
                anthropic: process.env['ANTHROPIC_API_KEY'] || '',
                groq: process.env['GROQ_API_KEY'] || '',
                xai: process.env['XAI_API_KEY'] || '',
                google: process.env['GOOGLE_API_KEY'] || '',
                openrouter: process.env['OPENROUTER_API_KEY'] || '',
                'kluster.ai': process.env['KLUSTER_AI_API_KEY'] || '',
                // Override with any existing config values
                ...this.config.portals?.apiKeys,
              },
            },
          };
        } else {
          throw err;
        }
      }
    } catch (error) {
      const configError = createConfigurationError(
        'Failed to load runtime configuration',
        this.configPath,
        'unknown',
        'CONFIG_LOAD_ERROR',
        {
          configPath: this.configPath,
          fallbackToDefaults: true,
        },
        error instanceof Error ? error : new Error(String(error))
      );

      runtimeLogger.error(formatError(configError));
      runtimeLogger.warn('⚠️ Falling back to default configuration');
    }

    // Initialize compliance system if enabled
    await this.initializeComplianceSystem();

    // Runtime initialized - logged by UI
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      runtimeLogger.warn('⚠️ Runtime is already running');
      return;
    }

    try {
      this.runtimeState.status = RuntimeStatus.STARTING;
      // Phase 1: Registration - Register all factories
      runtimeLogger.info('📦 Registering core modules...');

      // Register module factories
      await this.registerCoreModules();

      // Register agent factory
      this.registerDefaultAgentFactory();

      // Phase 2: Loading - Load configurations and initialize services
      runtimeLogger.info('🔌 Loading system components...');

      // Load AI portals
      await this.loadPortals();

      // Load extensions
      await this.loadExtensions();

      // Phase 3: Initialization - Initialize runtime services
      runtimeLogger.info('⚙️ Initializing runtime services...');

      // Initialize performance monitoring
      if (this.config.performance?.enableMonitoring !== false) {
        runtimeLogger.info('📊 Starting performance monitoring...');
        performanceMonitor.start();
        memoryManager.start();

        // Register runtime for automatic cleanup
        memoryManager.registerResource(
          'runtime',
          this,
          () => this.cleanup(),
          { ttl: undefined } // No TTL for runtime
        );
      }

      // Initialize Multi-Agent Manager
      this.multiAgentManager = new MultiAgentManager(
        this.registry as SYMindXModuleRegistry,
        this.eventBus,
        this
      );

      // Initialize tool system
      await this.initializeToolSystem();

      // Load any dynamic plugins (currently a no-op but kept for compatibility)
      await this._loadDynamicPlugins();

      // Phase 4: Agent Loading
      runtimeLogger.info('🤖 Loading agents...');
      await this.loadAgents();

      // Phase 5: Start runtime loop
      this.isRunning = true;
      this.runtimeState.status = RuntimeStatus.RUNNING;
      this.runtimeState.startTime = new Date();
      // Use optimized async queue for ticking if enabled
      if (this.config.performance?.useAsyncQueue !== false) {
        this.tickTaskId = globalQueue.addRecurring(
          () => {
            return this.tick().catch((error) => {
              runtimeLogger.error(
                '❌ Runtime tick error:',
                error as Error,
                {} as LogContext
              );
              this.runtimeState.errors.push(
                new RuntimeError('Runtime tick error', 'TICK_ERROR', {
                  error: error instanceof Error ? error.message : String(error),
                })
              );
            });
          },
          this.config.tickInterval,
          {
            priority: 10, // High priority for runtime tick
            tags: { component: 'runtime', operation: 'tick' },
          }
        );
      } else {
        this.tickTimer = setInterval(() => {
          this.tick().catch((error) => {
            runtimeLogger.error(
              '❌ Runtime tick error:',
              error as Error,
              {} as LogContext
            );
            this.runtimeState.errors.push(
              new RuntimeError('Runtime tick error', 'TICK_ERROR', {
                error: error instanceof Error ? error.message : String(error),
              })
            );
          });
        }, this.config.tickInterval);
      }

      // Phase 6: Final status report
      this.logStartupSummary();

      await this.eventBus.publish({
        id: `event_${Date.now()}`,
        type: 'runtime_started',
        source: 'runtime',
        data: { timestamp: new Date() },
        timestamp: new Date(),
        processed: false,
      });

      runtimeLogger.success('✅ SYMindX Runtime started successfully');
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Failed to start runtime:',
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    runtimeLogger.warn('🛑 Stopping SYMindX Runtime...');
    this.isRunning = false;
    this.runtimeState.status = RuntimeStatus.STOPPING;

    // Stop multi-agent manager first
    if (this.multiAgentManager) {
      await this.multiAgentManager.shutdown();
    }

    if (this.tickTaskId) {
      globalQueue.remove(this.tickTaskId);
      this.tickTaskId = undefined;
    } else if (this.tickTimer) {
      clearInterval(this.tickTimer);
      delete this.tickTimer;
    }

    // Gracefully shutdown all agents
    for (const agent of this.agents.values()) {
      await this.shutdownAgent(agent);
    }

    // Shutdown context service
    this.shutdownContextService();

    // Shutdown performance monitoring
    if (this.config.performance?.enableMonitoring !== false) {
      runtimeLogger.info('📊 Stopping performance monitoring...');
      performanceMonitor.stop();
      memoryManager.stop();
      await globalQueue.shutdown(5000);
    }

    // Shutdown compliance system
    if (this.complianceIntegration) {
      try {
        await this.complianceIntegration.shutdown();
        runtimeLogger.info('🔒 Compliance system shutdown completed');
      } catch (error) {
        runtimeLogger.error(
          '❌ Failed to shutdown compliance system cleanly',
          error as Error
        );
      }
    }

    // Shutdown context system
    if (this.contextBootstrapper) {
      try {
        await this.contextBootstrapper.shutdown();
        runtimeLogger.info('Context system shutdown completed');
      } catch (error) {
        runtimeLogger.error(
          'Failed to shutdown context system cleanly',
          error as Error
        );
      }
    }

    this.runtimeState.status = RuntimeStatus.STOPPED;
    runtimeLogger.success('✅ SYMindX Runtime stopped');
  }

  async loadAgents(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Get the characters directory path from config or use defaults
      const __dirname = path.dirname(new URL(import.meta.url).pathname);

      // Determine project root based on where we're running from
      let projectRoot: string;
      if (__dirname.endsWith('/dist')) {
        // Running from bundled dist/index.js
        projectRoot = path.resolve(__dirname, '..');
      } else if (__dirname.includes('/dist/core')) {
        // Running from dist/core/runtime.js
        projectRoot = path.resolve(__dirname, '..', '..');
      } else if (__dirname.includes('/src/core')) {
        // Running from src/core/runtime.ts
        projectRoot = path.resolve(__dirname, '..', '..');
      } else {
        // Fallback
        projectRoot = path.resolve(__dirname, '..', '..');
      }

      let charactersDir: string;

      // Use configured path if available
      if (this.config.agents?.charactersPath) {
        // Resolve relative to project root
        charactersDir = path.resolve(
          projectRoot,
          this.config.agents.charactersPath
        );
        runtimeLogger.debug(
          `Using configured characters path: ${charactersDir}`
        );
      } else {
        // Fall back to checking src/characters first, then dist/characters
        const srcCharactersDir = path.resolve(projectRoot, 'src', 'characters');
        const distCharactersDir = path.resolve(
          projectRoot,
          'dist',
          'characters'
        );

        charactersDir = srcCharactersDir;
        try {
          await fs.access(srcCharactersDir);
        } catch {
          charactersDir = distCharactersDir;
        }
      }

      // Check if the characters directory exists
      this.logger.debug('Loading characters', {
        charactersDir,
        enabled: this.config.agents?.enabled,
        configuredPath: this.config.agents?.charactersPath,
      });

      try {
        await fs.access(charactersDir);

        // Read all files in the characters directory
        const files = await fs.readdir(charactersDir);
        let jsonFiles = files.filter((file) => file.endsWith('.json'));

        // Check if we should load only a specific agent
        const forceSingleAgent = process.env['FORCE_SINGLE_AGENT'];
        if (forceSingleAgent) {
          const singleAgentFile = `${forceSingleAgent}.json`;
          if (jsonFiles.includes(singleAgentFile)) {
            jsonFiles = [singleAgentFile];
            runtimeLogger.agent(`🎯 Loading single agent: ${forceSingleAgent}`);
          } else {
            runtimeLogger.warn(
              `⚠️ Single agent ${forceSingleAgent} not found, loading all agents`
            );
          }
        }

        if (jsonFiles.length === 0) {
          runtimeLogger.warn(
            '⚠️ No agent configuration files found in characters directory'
          );
          return;
        }

        // Count enabled vs disabled agents
        let enabledCount = 0;
        let disabledCount = 0;
        let errorCount = 0;

        // Load each agent configuration
        for (const file of jsonFiles) {
          try {
            const configPath = path.join(charactersDir, file);
            const configData = await fs.readFile(configPath, 'utf-8');
            let rawConfig = JSON.parse(configData);

            // Check if agent is enabled
            if (rawConfig.enabled === false) {
              // Disabled agents become lazy agents (can be enabled via management)
              let agentConfig: AgentConfig;

              // Process config regardless of format
              if (this.isCleanCharacterConfig(rawConfig)) {
                const resolvedConfig = configResolver.resolveCharacterConfig(
                  rawConfig as CharacterConfig
                );
                // Transform resolved CharacterConfig to AgentConfig
                agentConfig = this.transformCharacterConfig(
                  resolvedConfig as unknown as CharacterConfig
                );
              } else {
                const charConfig = this.processLegacyConfig(rawConfig);
                const resolvedConfig =
                  configResolver.resolveCharacterConfig(charConfig);
                // Transform resolved CharacterConfig to AgentConfig
                agentConfig = this.transformCharacterConfig(
                  resolvedConfig as unknown as CharacterConfig
                );
              }

              const lazyAgent = this.createLazyAgent(
                agentConfig,
                rawConfig,
                rawConfig.id
              );
              this.lazyAgents.set(lazyAgent.id, lazyAgent);
              // Create a loader function that returns the lazy agent when loaded
              const loader = async () => {
                // This would normally load the agent, but for now just return a placeholder
                return lazyAgent as unknown as Agent;
              };
              this.registry.registerLazyAgent(lazyAgent.id, loader);

              runtimeLogger.info(
                `🏭 💤 Registered disabled agent as lazy: ${rawConfig.name}`
              );
              disabledCount++;
              continue;
            }

            // Check if this is a new clean character config or old format
            if (this.isCleanCharacterConfig(rawConfig)) {
              // Validate environment variables
              const envValidation = configResolver.validateEnvironment();
              if (!envValidation.valid) {
                runtimeLogger.warn(
                  `⚠️ Missing environment variables for ${rawConfig.name}:`,
                  { metadata: { missing: envValidation.missing } } as LogContext
                );
              }

              // Transform clean config to runtime config
              const resolvedConfig = configResolver.resolveCharacterConfig(
                rawConfig as CharacterConfig
              );
              // Store resolved config for later use
              rawConfig = resolvedConfig;
            } else {
              // Legacy format - use as-is but process environment variables
              const processedConfig = this.processLegacyConfig(rawConfig);
              rawConfig = processedConfig;
            }

            // Enabled agents should load immediately, not be lazy
            try {
              // Load agent with proper config
              const agent = await this.loadAgent(
                rawConfig as CharacterConfig,
                rawConfig.id
              );
              runtimeLogger.info(`🏭 🤖 Loaded enabled agent: ${agent.name}`);
            } catch (error) {
              void error;
              runtimeLogger.error(
                `❌ Failed to load enabled agent ${rawConfig.id}:`,
                error as Error,
                {} as LogContext
              );
              errorCount++;
              continue;
            }

            enabledCount++;
          } catch (error) {
            void error;
            runtimeLogger.error(
              `❌ Error loading agent ${file}:`,
              error as Error,
              {} as LogContext
            );
            errorCount++;
          }
        }

        // Summary output
        const summary = [];
        if (enabledCount > 0) summary.push(`${enabledCount} active`);
        if (disabledCount > 0) summary.push(`${disabledCount} disabled`);
        if (errorCount > 0) summary.push(`${errorCount} errors`);

        runtimeLogger.success(`✅ Agents: ${summary.join(', ')}`);
      } catch (err) {
        if ((err as { code?: string }).code === 'ENOENT') {
          runtimeLogger.warn(
            '⚠️ Characters directory not found, no agents loaded'
          );
          // Create the characters directory
          await fs.mkdir(charactersDir, { recursive: true });
          runtimeLogger.info('📁 Created characters directory');
        } else {
          throw err;
        }
      }
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Error loading agents:',
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  private _findPortalByCapability(
    portals: Portal[],
    capability: string
  ): Portal | undefined {
    if (!portals || portals.length === 0) return undefined;
    // Find first enabled portal with the specified capability using hasCapability method
    return portals.find(
      (p) =>
        p.enabled !== false &&
        p.hasCapability &&
        p.hasCapability(capability as PortalCapability)
    );
  }

  /**
   * Check if this is a clean character config (new TypeScript format)
   */
  private isCleanCharacterConfig(config: Record<string, unknown>): boolean {
    // Clean configs have specific fields and structure
    return Boolean(
      config['personality'] &&
        config['autonomous'] &&
        config['memory'] &&
        config['emotion'] &&
        config['cognition'] &&
        config['communication'] &&
        config['capabilities'] &&
        config['portals'] &&
        Array.isArray(config['portals']) &&
        // Old configs have psyche.defaults, new ones don't
        !config['psyche']
    ) as boolean;
  }

  /**
   * Process legacy character config (old format with ${} syntax)
   */
  private processLegacyConfig(
    config: Record<string, unknown>
  ): CharacterConfig {
    // For legacy configs, process environment variables in the existing format
    return this.processEnvironmentVariables(
      config
    ) as unknown as CharacterConfig;
  }

  /**
   * Process environment variables in legacy format
   */
  private processEnvironmentVariables(
    obj: ConfigValue
  ): ProcessedEnvironmentConfig {
    if (typeof obj === 'string') {
      // Handle ${ENV_VAR:default} syntax
      return obj.replace(
        /\$\{([^}:]+):?([^}]*)\}/g,
        (match: string, envVar: string, defaultValue: string) => {
          return process.env[envVar] || defaultValue || match;
        }
      );
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.processEnvironmentVariables(item));
    } else if (obj && typeof obj === 'object') {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this.processEnvironmentVariables(value);
      }
      return processed;
    }
    return obj;
  }

  private transformCharacterConfig(
    characterConfig: CharacterConfig | AgentConfig
  ): AgentConfig {
    // If already AgentConfig, return as-is
    if (
      'core' in characterConfig &&
      'lore' in characterConfig &&
      'psyche' in characterConfig &&
      'modules' in characterConfig
    ) {
      return characterConfig as AgentConfig;
    }

    // Transform CharacterConfig to AgentConfig
    const charConfig = characterConfig as CharacterConfig;

    // Transform character config to expected AgentConfig format
    return {
      core: {
        name: charConfig.name || 'Unknown Agent',
        tone: charConfig.communication?.tone || 'neutral',
        personality: charConfig.personality?.traits
          ? Object.keys(charConfig.personality.traits)
          : [],
      },
      lore: {
        origin: charConfig.personality?.backstory || 'Unknown origin',
        motive: charConfig.personality?.goals?.[0] || 'Unknown motive',
      },
      psyche: {
        traits: charConfig.personality?.traits
          ? Object.keys(charConfig.personality.traits)
          : [],
        defaults: {
          memory: charConfig.memory?.type || 'memory',
          emotion: charConfig.emotion?.type || 'composite',
          cognition: charConfig.cognition?.type || 'hybrid',
          portal:
            charConfig.portals?.find((p) => p.primary)?.type ||
            charConfig.portals?.[0]?.type ||
            'groq',
        },
      },
      modules: (() => {
        const modulesConfig: {
          extensions: string[];
          memory?: MemoryConfig;
          emotion?: EmotionConfig;
          cognition?: CognitionConfig;
          portal?: Record<string, ConfigValue>;
          tools?: Record<string, ConfigValue>;
        } = {
          extensions:
            charConfig.extensions?.map(
              (ext: CharacterExtensionConfig) => ext.name
            ) || [],
        };

        if (charConfig.memory) {
          modulesConfig.memory = {
            provider: charConfig.memory.type as MemoryProviderType,
            maxRecords: 1000,
            ...charConfig.memory.config,
          } as MemoryConfig;
        }

        if (charConfig.emotion) {
          modulesConfig.emotion = {
            type: charConfig.emotion.type as EmotionModuleType,
            sensitivity: 0.7,
            decayRate: 0.1,
            transitionSpeed: 0.3,
            ...charConfig.emotion.config,
          } as EmotionConfig;
        }

        if (charConfig.cognition) {
          modulesConfig.cognition = {
            type: charConfig.cognition.type as CognitionModuleType,
            planningDepth: 5,
            memoryIntegration: true,
            creativityLevel: 0.7,
            ...charConfig.cognition.config,
          } as CognitionConfig;
        }

        if (charConfig.portals?.[0]?.config) {
          modulesConfig.portal = charConfig.portals[0].config as Record<
            string,
            ConfigValue
          >;
        }

        const tools = (charConfig as CharacterConfigWithModules).modules?.tools;
        if (tools) {
          modulesConfig.tools = tools;
        }

        return modulesConfig;
      })(),
      ...(charConfig.autonomous && {
        autonomous: {
          enabled: charConfig.autonomous.enabled,
          independence_level: charConfig.autonomous.independence_level,
          decision_making: charConfig.autonomous.decision_making,
          life_simulation: charConfig.autonomous.life_simulation,
        },
      }),
      ...(charConfig.human_interaction && {
        human_interaction: {
          enabled: true,
          mode: charConfig.human_interaction.response_style,
          interruption_tolerance:
            charConfig.human_interaction.interruption_tolerance,
        },
      }),
    };
  }

  async loadAgent(
    config: AgentConfig | CharacterConfig,
    characterId?: string
  ): Promise<Agent> {
    const agentId =
      characterId ||
      `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Store original character config for extension creation
    const characterConfig = config;

    // Transform character config to expected format
    const agentConfig = this.transformCharacterConfig(characterConfig);

    runtimeLogger.info(`🤖 Loading agent: ${agentConfig.core.name}`);

    // Create memory provider (try factory first, then fallback to registry)
    let memoryProvider = this.registry.getMemoryProvider(
      agentConfig.psyche.defaults.memory
    );
    if (!memoryProvider) {
      // Try to create using factory with agent-specific config
      const memoryConfig = {
        ...agentConfig.modules.memory,
        agentId: agentId,
        agentName: agentConfig.core.name,
      };
      memoryProvider = this.registry.createMemoryProvider(
        agentConfig.psyche.defaults.memory,
        memoryConfig
      );
    }
    if (!memoryProvider) {
      throw new Error(
        `Memory provider '${agentConfig.psyche.defaults.memory}' not found and could not be created`
      );
    }

    // Create cognition module (try factory first, then fallback to registry)
    let cognitionModule = this.registry.getCognitionModule(
      agentConfig.psyche.defaults.cognition
    );
    if (!cognitionModule) {
      // Try to create using factory with agent-specific config
      const cognitionConfig = {
        ...agentConfig.modules.cognition,
        agentId: agentId,
        agentName: agentConfig.core.name,
      };
      cognitionModule = await this.registry.createCognitionModule(
        agentConfig.psyche.defaults.cognition,
        cognitionConfig
      );
    }
    if (!cognitionModule) {
      throw new Error(
        `Cognition module '${agentConfig.psyche.defaults.cognition}' not found and could not be created`
      );
    }

    // Create emotion module (try factory first, then fallback to registry)
    let emotionModule = this.registry.getEmotionModule(
      agentConfig.psyche.defaults.emotion
    );
    if (!emotionModule) {
      // Try to create using factory with agent-specific config
      const emotionConfig = {
        ...agentConfig.modules.emotion,
        agentId: agentId,
        agentName: agentConfig.core.name,
        personality: agentConfig.psyche.traits,
      };
      emotionModule = this.registry.createEmotionModule(
        agentConfig.psyche.defaults.emotion,
        emotionConfig
      );
    }
    if (!emotionModule) {
      throw new Error(
        `Emotion module '${agentConfig.psyche.defaults.emotion}' not found and could not be created`
      );
    }

    // Load multiple portals from character config
    const portals: Portal[] = [];
    let primaryPortal = undefined;

    // Check if this is a CharacterConfig (has portals property)
    if (
      'portals' in config &&
      config.portals &&
      Array.isArray(config.portals)
    ) {
      for (const portalConfig of config.portals) {
        if (portalConfig.enabled === false) {
          // Skip disabled portals silently
          continue;
        }

        try {
          // Try to get existing portal or create new one
          let portal = this.registry.getPortal(portalConfig.type);
          if (!portal) {
            // Create portal using factory with portal-specific config
            const factoryConfig: PortalConfig = {
              ...portalConfig.config,
              ...this.config.portals?.apiKeys,
            };
            portal = this.registry.createPortal(
              portalConfig.type,
              factoryConfig
            );
          }

          if (portal) {
            // Initialize the portal
            try {
              await portal.init({
                id: agentId,
                name: agentConfig.core.name,
                config: agentConfig,
              } as Agent);

              portals.push(portal);
              // Portal loaded - details in startup summary

              // Set primary portal
              if (portalConfig.primary === true) {
                primaryPortal = portal;
              }
            } catch (error) {
              void error;
              runtimeLogger.warn(
                `⚠️ Failed to initialize portal '${portalConfig.name}':`,
                {
                  error:
                    error instanceof Error
                      ? {
                          code: 'PORTAL_INIT_ERROR',
                          message: error.message,
                          stack: error.stack || '',
                        }
                      : {
                          code: 'UNKNOWN_ERROR',
                          message: String(error),
                          stack: '',
                        },
                } as LogContext
              );
            }
          } else {
            runtimeLogger.warn(
              `⚠️ Portal '${portalConfig.name}' (${portalConfig.type}) not found and could not be created`
            );
          }
        } catch (error) {
          void error;
          runtimeLogger.warn(
            `⚠️ Error loading portal '${portalConfig.name}':`,
            {
              error:
                error instanceof Error
                  ? {
                      code: 'PORTAL_LOAD_ERROR',
                      message: error.message,
                      stack: error.stack || '',
                    }
                  : {
                      code: 'UNKNOWN_ERROR',
                      message: String(error),
                      stack: '',
                    },
            } as LogContext
          );
        }
      }
    }

    // Fallback to primary portal if no primary was set
    if (!primaryPortal && portals.length > 0) {
      primaryPortal = portals[0];
      runtimeLogger.portal(
        `Using first portal as primary: ${primaryPortal?.constructor.name ?? 'Unknown'}`
      );
    }

    if (portals.length === 0) {
      runtimeLogger.warn(
        'No portals loaded for agent, will run without AI capabilities'
      );
    }

    // Load extensions
    const extensions = [];
    runtimeLogger.extension(
      `Looking for extensions: ${agentConfig.modules.extensions.join(', ')}`
    );

    for (const extName of agentConfig.modules.extensions) {
      let extension = this.registry.getExtension(extName);

      if (!extension) {
        // Try to create extension dynamically if it has a factory and configuration
        const extensionConfig = (
          'extensions' in characterConfig ? characterConfig.extensions : []
        )?.find((ext: CharacterExtensionConfig) => ext.name === extName);
        if (extensionConfig) {
          runtimeLogger.extension(
            `Attempting to create extension '${extName}' with config`,
            {
              metadata: {
                config: JSON.stringify(extensionConfig.config),
              },
            }
          );
          // Pass the full extension config including enabled flag
          const fullConfig = {
            enabled: extensionConfig.enabled,
            ...extensionConfig.config,
          };
          extension = this.registry.createExtension(extName, fullConfig);
          if (extension) {
            // Note: Don't register character-specific extensions globally
            runtimeLogger.success(`Created extension: ${extName}`);
          } else {
            runtimeLogger.error(
              `Failed to create extension: ${extName} - factory might not be registered`
            );
          }
        }
      }

      if (extension) {
        extensions.push(extension);
        runtimeLogger.success(`Found extension: ${extName}`);
      } else {
        runtimeLogger.warn(
          `Extension '${extName}' not found in registry and could not be created, skipping`
        );
      }
    }

    // Create agent with all required methods
    const agent: Agent = {
      id: agentId,
      name: agentConfig.core.name,
      status: AgentStatus.IDLE,
      emotion: emotionModule,
      memory: memoryProvider,
      cognition: cognitionModule,
      extensions,
      ...(primaryPortal && { portal: primaryPortal }), // Primary portal for backward compatibility
      ...(portals.length > 0 && { portals: portals }), // All available portals
      config: agentConfig,
      ...(config && {
        characterConfig: config as unknown as Record<string, unknown>,
      }), // Preserve original character configuration
      lastUpdate: new Date(),

      // Implement required methods
      async initialize(_config: AgentConfig): Promise<InitializationResult> {
        return {
          success: true,
          message: `Agent ${agentId} initialized`,
          timestamp: new Date(),
          resourcesInitialized: ['memory', 'emotion', 'cognition'],
        };
      },

      async cleanup(): Promise<CleanupResult> {
        return {
          success: true,
          message: `Agent ${agentId} cleaned up`,
          timestamp: new Date(),
          resourcesReleased: ['memory', 'emotion', 'cognition'],
        };
      },

      async tick(): Promise<OperationResult> {
        return {
          success: true,
          timestamp: new Date(),
        };
      },

      async updateState(
        _newState: Partial<AgentState>
      ): Promise<AgentStateTransitionResult> {
        return {
          success: true,
          message: `State updated for agent ${agentId}`,
          timestamp: new Date(),
          agentId: agentId,
          transition: {
            from: 'unknown',
            to: 'unknown',
            trigger: 'manual',
            duration: 0,
          },
        };
      },

      async processEvent(event: AgentEvent): Promise<EventProcessingResult> {
        return {
          success: true,
          message: `Event ${event.id} processed`,
          timestamp: new Date(),
          eventProcessed: true,
        };
      },

      async executeAction(action: AgentAction): Promise<ExecutionResult> {
        return {
          success: true,
          data: { actionId: action.id, result: 'executed' },
          timestamp: new Date(),
          duration: 0,
        };
      },
    };

    if (characterId) {
      agent.character_id = characterId;
    }

    // Initialize extensions (skip API extension - it's shared at runtime level)
    for (const extension of extensions) {
      try {
        // Skip API extension initialization for individual agents - it's shared
        if (extension.id === 'api') {
          runtimeLogger.extension(
            `API extension shared with agent: ${agent.name}`
          );
          // Register agent with the shared API extension's command system
          const apiExtension = extension as Extension & {
            commandSystem?: { registerAgent(agent: Agent): void };
          };
          if (apiExtension.commandSystem) {
            apiExtension.commandSystem.registerAgent(agent);
            runtimeLogger.info(
              `📝 Registered agent ${agent.name} with command system`
            );
          }
          continue;
        }

        // Call appropriate initialization method based on extension type
        if (extension.id === 'mcp-client') {
          // MCP Client Extension has a different initialize method
          const mcpExtension = extension as Extension & {
            initialize(agent: Agent): Promise<void>;
          };

          // Add timeout wrapper to prevent hanging
          const initPromise = mcpExtension.initialize(agent);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error('MCP extension initialization timeout')),
              60000
            );
          });

          await Promise.race([initPromise, timeoutPromise]);
        } else {
          // Standard extensions use init method
          const standardExtension = extension as Extension & {
            init(agent: Agent): Promise<void>;
          };
          // Add timeout wrapper to prevent hanging
          const initPromise = standardExtension.init(agent);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Extension ${extension.name} initialization timeout`
                  )
                ),
              30000 // 30 second timeout
            );
          });
          await Promise.race([initPromise, timeoutPromise]);
        }
        runtimeLogger.info(`✅ Initialized extension: ${extension.name}`);
      } catch (error) {
        void error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        runtimeLogger.error(
          `❌ Failed to initialize extension ${extension.name}: ${errorMessage}`
        );
        if (error instanceof Error && error.stack) {
          runtimeLogger.debug(
            `Extension ${extension.name} error stack: ${error.stack}`
          );
        }
      }
    }

    // MCP tools are now automatically integrated by the MCP Client Extension
    runtimeLogger.info(
      `🔧 MCP tools integration handled by MCP Client Extension`
    );

    // Add utility method to find portals by capability
    const agentWithUtility = agent as Agent & {
      findPortalByCapability(capability: string): Portal | undefined;
    };
    agentWithUtility.findPortalByCapability = (
      capability: string
    ): Portal | undefined => {
      // Use the private method to find portal by capability
      if (!agent.portals || agent.portals.length === 0) {
        return agent.portal;
      }

      // Use the private method to find portal by capability
      const foundPortalConfig = this._findPortalByCapability(
        agent.portals,
        capability
      );
      return foundPortalConfig || agent.portal;
    };

    // Initialize autonomous capabilities if enabled
    let finalAgent = agent;

    // Check if autonomous capabilities should be enabled
    if (this._isAutonomousAgent(agentConfig)) {
      runtimeLogger.info(
        `🤖 Agent ${agent.name} has autonomous capabilities defined`
      );
      // Log warning that autonomous features are currently disabled by design
      runtimeLogger.warn(
        `⚠️ Autonomous behaviors for ${agent.name} are disabled - agents should only respond to messages`
      );
      // Still initialize the autonomous agent structure for future use
      try {
        finalAgent = await this._initializeAutonomousAgent(agent, agentConfig);
      } catch (error) {
        void error;
        runtimeLogger.error(
          `❌ Failed to initialize autonomous structure for ${agent.name}:`,
          error as Error,
          {} as LogContext
        );
        // Continue with non-autonomous agent
        finalAgent = agent;
      }
    }

    // TEMPORARILY DISABLED - Prompt and tool system initialization
    /*
    // Initialize prompt system for agent
    if (this.promptSystem) {
      const promptSystem = PromptIntegration.getPromptSystem(finalAgent)
      promptSystem.adaptToAgent(finalAgent)
      runtimeLogger.info(`💭 Initialized prompt system for agent ${finalAgent.name}`)
    }
    
    // Enable advanced tool capabilities through tool integration manager
    if (this.toolIntegrationManager && (config.modules?.tools?.enabled || agent.config.psyche.traits.includes('tool-aware'))) {
      this.toolIntegrationManager.enableToolsForAgent(finalAgent)
      runtimeLogger.info(`🛠️ Enabled advanced tool capabilities for agent ${finalAgent.name}`)
    }
    */

    this.agents.set(agentId, finalAgent);

    // Register agent with context system
    await this.registerAgentWithContext(finalAgent);

    // Inject context into agent lifecycle
    await this.injectContextIntoLifecycle(finalAgent);

    // Emit agent loaded event
    this.eventBus.emit({
      id: `event_${Date.now()}`,
      type: 'agent_loaded',
      source: 'runtime',
      data: {
        agentId,
        name: finalAgent.name,
        autonomyLevel: this.getAutonomyLevel(finalAgent),
      },
      timestamp: new Date(),
      processed: false,
    });

    // Agent loaded - details shown in startup summary
    return finalAgent;
  }

  getToolSystem(name: string): unknown {
    return this.registry.getToolSystem(name);
  }

  async unloadAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    runtimeLogger.info(`🗑️ Unloading agent: ${agent.name}`);

    await this.shutdownAgent(agent);
    this.agents.delete(agentId);

    // Clear context cache for unloaded agent
    this.contextService.clearContextCache(agentId);

    // Unregister agent from context system
    await this.unregisterAgentFromContext(agentId);

    // Emit agent unloaded event
    this.eventBus.emit({
      id: `event_${Date.now()}`,
      type: 'agent_unloaded',
      source: 'runtime',
      data: { agentId, name: agent.name },
      timestamp: new Date(),
      processed: false,
    });

    runtimeLogger.info(`✅ Agent unloaded: ${agent.name}`);
  }

  private async initializeToolSystem(): Promise<void> {
    try {
      // Direct MCP tool integration - no separate tool system needed
      runtimeLogger.info('🛠️ Tool system: Direct MCP integration ready');
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Failed to initialize tool system:',
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  async tick(): Promise<void> {
    if (!this.isRunning) return;

    // Use performance monitoring for tick timing
    const timer = performanceMonitor.createTimer('runtime.tick');
    const startTime = Date.now();

    // Check for lazy agents that need activation based on events
    await this.checkLazyAgentActivation();

    // Process each active agent
    for (const agent of this.agents.values()) {
      try {
        await this.processAgent(agent);
      } catch (error) {
        void error;
        runtimeLogger.error(
          `❌ Error processing agent ${agent.name}:`,
          error as Error,
          {} as LogContext
        );
        agent.status = AgentStatus.ERROR;
      }
    }

    // Periodically clean up inactive agents (every 10 minutes)
    if (startTime % (10 * 60 * 1000) < this.config.tickInterval) {
      this.unloadInactiveAgents().catch((error) => {
        runtimeLogger.error(
          '❌ Error unloading inactive agents:',
          error as Error,
          {} as LogContext
        );
      });
    }

    // Periodically clear context cache for inactive agents (every 5 minutes)
    if (startTime % (5 * 60 * 1000) < this.config.tickInterval) {
      this.cleanupContextCache();
    }

    const duration = Date.now() - startTime;
    timer.end();

    // Record tick performance metrics
    performanceMonitor.recordMetric(
      'runtime.tick.agents_processed',
      this.agents.size
    );
    performanceMonitor.recordMetric(
      'runtime.tick.lazy_agents',
      this.lazyAgents.size
    );

    if (duration > this.config.tickInterval * 0.8) {
      runtimeLogger.warn(
        `⚠️ Tick took ${duration}ms (${this.config.tickInterval}ms interval)`
      );
      performanceMonitor.recordMetric('runtime.tick.slow', 1);
    }
  }

  private async processAgent(agent: Agent): Promise<void> {
    // Skip processing if agent is not active
    if (agent.status === AgentStatus.ERROR) {
      return;
    }

    // Skip processing if no AI capabilities available to prevent infinite loops
    if (!agent.portal && (!agent.portals || agent.portals.length === 0)) {
      runtimeLogger.info(
        `⏸️ Skipping agent ${agent.name} - no AI portals available`
      );
      agent.status = AgentStatus.IDLE;
      return;
    }

    // Check if there are any events to process
    const pendingEvents = this.getUnprocessedEvents(agent.id);
    if (pendingEvents.length === 0 && agent.status === AgentStatus.IDLE) {
      // No events to process and agent is idle, skip this tick
      return;
    }

    agent.status = AgentStatus.THINKING;
    agent.lastUpdate = new Date() as Timestamp;

    // Initialize portal if available and not already initialized
    if (agent.portal && !agent.portal.enabled) {
      try {
        const { initializePortal } = await import('../portals/integration');
        await initializePortal(agent.portal, agent);
      } catch (error) {
        void error;
        runtimeLogger.error(
          `❌ Failed to initialize portal for ${agent.name}:`,
          error as Error,
          {} as LogContext
        );
      }
    }

    // 1. Gather context using enhanced context system
    const context: ThoughtContext = await this.createAgentContext(agent);

    // 1.5. Enrich context with real-time data and tracing
    if (this.config.debug?.enabled) {
      // Add context tracing for debugging
      const contextTrace = {
        agentId: agent.id,
        agentName: agent.name,
        contextCreatedAt: new Date(),
        eventCount: context.events.length,
        memoryCount: context.memories.length,
        hasGoal: !!context.goal,
        environmentType: context.environment.type,
      };

      runtimeLogger.debug('Context created for thought process', contextTrace);

      // Add performance monitoring for context usage
      const contextStartTime = performance.now();
      (context as any).__contextMetrics = {
        startTime: contextStartTime,
        trace: contextTrace,
      };
    }

    // 1.6. Add social and emotional context enrichment
    try {
      // Enrich context with emotional state
      if (agent.emotion) {
        const emotionalContext = {
          currentEmotion: agent.emotion.current,
          emotionIntensity: agent.emotion.intensity,
          emotionHistory: agent.emotion.history?.slice(-5) || [], // Last 5 emotions
          emotionalTriggers: agent.emotion.triggers || [],
        };
        (context as any).emotional = emotionalContext;

        runtimeLogger.debug(`Emotional context added for ${agent.name}`, {
          emotion: emotionalContext.currentEmotion,
          intensity: emotionalContext.emotionIntensity,
        });
      }

      // Enrich context with social data (other agents, recent interactions)
      const socialContext = {
        activeAgents: Array.from(this.agents.keys()).filter(
          (id) => id !== agent.id
        ),
        recentInteractions: context.events
          .filter(
            (event) =>
              event.type.includes('interaction') ||
              event.type.includes('message')
          )
          .slice(-3), // Last 3 interactions
        collaborativeGoals: context.goal ? [context.goal] : [],
      };
      (context as any).social = socialContext;
    } catch (error) {
      runtimeLogger.warn(`Failed to enrich context for ${agent.name}`, {
        error: (error as Error).message,
      });
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
    void error;
        this.logger.error(`Failed to generate thinking prompt for ${agent.name}:`, error)
      }
    }
    */

    // 2. Think and plan with enhanced context
    const thinkingStartTime = performance.now();
    const thoughtResult = await agent.cognition.think(agent, context);
    const thinkingDuration = performance.now() - thinkingStartTime;

    // 2.1. Add thought result metrics and validation
    if (this.config.debug?.enabled) {
      const contextMetrics = (context as any).__contextMetrics;
      if (contextMetrics) {
        const totalContextDuration =
          performance.now() - contextMetrics.startTime;

        runtimeLogger.debug(`Thought process completed for ${agent.name}`, {
          thinkingDuration: `${thinkingDuration.toFixed(2)}ms`,
          totalContextDuration: `${totalContextDuration.toFixed(2)}ms`,
          thoughtsGenerated: thoughtResult.thoughts.length,
          actionsPlanned: thoughtResult.actions.length,
          memoriesFormed: thoughtResult.memories.length,
          confidence: thoughtResult.confidence,
        });
      }

      // Validate thought result structure
      if (!thoughtResult.thoughts || !Array.isArray(thoughtResult.thoughts)) {
        runtimeLogger.warn(`Invalid thoughts array for agent ${agent.name}`);
      }
      if (!thoughtResult.actions || !Array.isArray(thoughtResult.actions)) {
        runtimeLogger.warn(`Invalid actions array for agent ${agent.name}`);
      }
      if (
        typeof thoughtResult.confidence !== 'number' ||
        thoughtResult.confidence < 0 ||
        thoughtResult.confidence > 1
      ) {
        runtimeLogger.warn(
          `Invalid confidence value for agent ${agent.name}: ${thoughtResult.confidence}`
        );
      }
    }

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
      );
    }

    // 4. Store new memories
    for (const memory of thoughtResult.memories) {
      await agent.memory.store(agent.id, memory);
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
    void error;
          this.logger.error(`Failed to generate decision prompt for action:`, error)
        }
      }
      */

      await this.executeAction(agent, action);
    }

    // 6. Tick extensions
    for (const extension of agent.extensions) {
      if (extension.enabled) {
        try {
          // Prompt context removed - using lightweight PromptManager instead

          await extension.tick(agent);

          // Clean up temporary prompt context
          delete (agent as { promptContext?: unknown }).promptContext;
        } catch (error) {
          void error;
          runtimeLogger.error(
            `❌ Extension ${extension.name} tick error:`,
            error as Error,
            {} as LogContext
          );
        }
      }
    }

    agent.status = AgentStatus.ACTIVE;
  }

  private async executeAction(
    agent: Agent,
    action: AgentAction
  ): Promise<void> {
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
        this.logger.info(`🛡️ Generated safety check for action ${action.type}`)
      } catch (error) {
    void error;
        this.logger.error(`Failed to generate safety prompt for action:`, error)
      }
    }
    */

    // Tool actions are not currently supported

    // Check if this is an autonomous engine action (handled internally)
    if (action.extension === 'autonomous_engine') {
      // These actions are handled by the autonomous engine itself
      // Just mark as completed since the autonomous engine has already processed it
      action.status = ActionStatus.COMPLETED;
      action.result = { success: true, type: ActionResultType.SUCCESS };
      return;
    }

    const extension = agent.extensions.find(
      (ext) => ext.id === action.extension
    );
    if (!extension) {
      runtimeLogger.error(
        `❌ Extension '${action.extension}' not found for action '${action.action}'`
      );
      return;
    }

    const extensionAction = extension.actions[action.action];
    if (!extensionAction) {
      runtimeLogger.error(
        `❌ Action '${action.action}' not found in extension '${extension.name}'`
      );
      return;
    }

    try {
      action.status = ActionStatus.EXECUTING;
      const result = await extensionAction.execute(agent, action.parameters);
      action.result = result;
      action.status = result.success
        ? ActionStatus.COMPLETED
        : ActionStatus.FAILED;

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
          error: result.error,
        },
        timestamp: new Date(),
        processed: false,
      });
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Action execution error:`,
        error as Error,
        {} as LogContext
      );
      action.status = ActionStatus.FAILED;
      action.result = {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Initialize the compliance system if enabled
   */
  private async initializeComplianceSystem(): Promise<void> {
    if (!this.config.compliance?.enabled) {
      runtimeLogger.info('🔒 Compliance system disabled');
      return;
    }

    try {
      runtimeLogger.info('🔒 Initializing compliance system...');

      // Get memory provider from the registry
      const memoryProvider =
        this.registry.getMemoryProvider('sqlite') ||
        this.registry.getMemoryProvider('postgres') ||
        this.registry.getMemoryProvider('supabase') ||
        this.registry.getMemoryProvider('neon');

      if (!memoryProvider) {
        runtimeLogger.warn(
          '⚠️ No memory provider available for compliance system'
        );
        return;
      }

      // Create compliance integration
      this.complianceIntegration = createComplianceIntegration(
        memoryProvider,
        this.eventBus,
        {
          enabled: true,
          gdpr: this.config.compliance.gdpr,
          hipaa: this.config.compliance.hipaa,
          sox: this.config.compliance.sox,
          strictMode: this.config.compliance.strictMode || false,
          autoClassifyData: this.config.compliance.autoClassifyData || false,
          enableRealTimeMonitoring:
            this.config.compliance.enableRealTimeMonitoring || false,
        }
      );

      // Initialize the compliance integration
      await this.complianceIntegration.initialize();

      runtimeLogger.success('🔒 Compliance system initialized');
    } catch (error) {
      runtimeLogger.error(
        '❌ Failed to initialize compliance system',
        error as Error,
        {}
      );

      // In strict mode, throw the error to prevent startup
      if (this.config.compliance?.strictMode) {
        throw error;
      }
    }
  }

  /**
   * Initialize the context system asynchronously
   */
  private async initializeContextSystemAsync(): Promise<void> {
    try {
      // Create context bootstrapper with configuration
      const contextConfig: Partial<ContextBootstrapperConfig> = {
        enableUnifiedContext: true,
        enableMigration: true,
        enableBackwardCompatibility: true,
        autoMigrateOnStartup: false, // Start conservative
        migrationBatchSize: 3,
        enableHealthChecks: true,
        enablePerformanceMonitoring: true,
      };

      this.contextBootstrapper = createContextBootstrapper(contextConfig);

      // Initialize the context system
      const initResult = await this.contextBootstrapper.initialize(this.config);

      if (!initResult.success) {
        runtimeLogger.warn(
          `Context system initialization had issues: ${initResult.message}`,
          {
            warnings: initResult.warnings,
            errors: initResult.components_failed,
          }
        );
      } else {
        runtimeLogger.info(
          `Context system initialized successfully in ${initResult.duration_ms}ms`,
          { components: initResult.components_initialized }
        );
      }

      // Get context system components
      const contextSystem = this.contextBootstrapper.getContextSystem();
      if (contextSystem) {
        this.contextManager = contextSystem.contextManager;
        this.runtimeAdapter = contextSystem.runtimeAdapter;
      }
    } catch (error) {
      runtimeLogger.error(
        'Failed to initialize context system - falling back to legacy mode',
        error as Error
      );
      // Context system initialization failure is not fatal
      // The runtime will continue to work in legacy mode
    }
  }

  /**
   * Create enhanced context for agent processing
   */
  private async createAgentContext(agent: Agent): Promise<ThoughtContext> {
    // Create basic legacy context
    const basicContext: ThoughtContext = {
      events: this.getUnprocessedEvents(agent.id),
      memories: await this.getRecentMemories(agent),
      currentState: this.getCurrentState(agent),
      environment: this.getEnvironmentState(),
    };

    // Enhance context using the context service
    try {
      const enhancementOptions: ContextEnhancementOptions = {
        includeMemory: true,
        includeEmotions: true,
        includeTemporal: true,
        includePerformance: this.config.debug?.enabled,
        cache: true,
        cacheTtl: 300000, // 5 minutes
      };

      const enhancedContext = await this.contextService.enhanceThoughtContext(
        agent,
        basicContext,
        enhancementOptions
      );

      // Add context validation if enabled
      if (this.config.debug?.enabled) {
        await this.validateContextForAgent(agent, enhancedContext);
      }

      return enhancedContext;
    } catch (error) {
      runtimeLogger.warn(
        `Failed to enhance context for agent ${agent.name}, using basic context`,
        { error: (error as Error).message }
      );
    }

    // If unified context system is available, try legacy enhancement
    if (this.runtimeAdapter && this.contextManager) {
      try {
        // Get or create unified context
        const unifiedContext = this.runtimeAdapter.getOrCreateUnifiedContext(
          agent,
          basicContext
        );

        // Otherwise, extract legacy context from unified context
        return this.runtimeAdapter.extractThoughtContext(unifiedContext);
      } catch (error) {
        runtimeLogger.warn(
          `Failed to create unified context for agent ${agent.name}, using legacy context`,
          { error: (error as Error).message }
        );
      }
    }

    // Fallback to basic context
    return basicContext;
  }

  /**
   * Register agent with context system
   */
  private async registerAgentWithContext(agent: Agent): Promise<void> {
    if (this.contextBootstrapper) {
      try {
        await this.contextBootstrapper.registerAgent(agent);
        runtimeLogger.debug(
          `Agent ${agent.name} registered with context system`
        );
      } catch (error) {
        runtimeLogger.warn(
          `Failed to register agent ${agent.name} with context system`,
          { error: (error as Error).message }
        );
      }
    }
  }

  /**
   * Unregister agent from context system
   */
  private async unregisterAgentFromContext(agentId: string): Promise<void> {
    if (this.contextBootstrapper) {
      try {
        await this.contextBootstrapper.unregisterAgent(agentId);
        runtimeLogger.debug(
          `Agent ${agentId} unregistered from context system`
        );
      } catch (error) {
        runtimeLogger.warn(
          `Failed to unregister agent ${agentId} from context system`,
          { error: (error as Error).message }
        );
      }
    }
  }

  private getUnprocessedEvents(agentId: string): AgentEvent[] {
    // Implement event filtering for agent
    const allEvents = this.eventBus.getEvents();

    // Filter events relevant to this agent
    return allEvents
      .filter((event) => {
        // Include events targeted at this agent
        if (event.targetAgentId === agentId) return true;

        // Include global events that all agents should process
        if (
          event.type.startsWith('system.') ||
          event.type.startsWith('global.')
        )
          return true;

        // Include events from extensions this agent uses
        const agent = this.agents.get(agentId);
        if (agent && event.source) {
          const hasExtension = agent.extensions.some(
            (ext) => ext.id === event.source
          );
          if (hasExtension) return true;
        }

        // Filter out already processed events
        return !event.processed;
      })
      .slice(0, 50); // Limit to 50 most recent events
  }

  private async getRecentMemories(agent: Agent): Promise<MemoryRecord[]> {
    try {
      return await agent.memory.retrieve(agent.id, 'recent', 10);
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to retrieve memories for ${agent.name}:`,
        error as Error,
        {} as LogContext
      );
      return [];
    }
  }

  private getCurrentState(_agent: Agent): AgentState {
    return {
      location: 'unknown',
      inventory: {},
      stats: {},
      goals: [],
      context: {},
    };
  }

  private getEnvironmentState(): EnvironmentState {
    return {
      type: EnvironmentType.VIRTUAL_WORLD,
      time: new Date(),
      weather: 'clear',
      location: 'virtual',
      npcs: [],
      objects: [],
      events: [],
    };
  }

  private async shutdownAgent(agent: Agent): Promise<void> {
    // Stop autonomous systems first if this is an autonomous agent
    if (this.autonomousAgents.has(agent.id)) {
      await this.stopAutonomousSystems(agent.id);
    }

    // TEMPORARILY DISABLED - Clear prompt system for agent
    /*
    if (this.promptSystem) {
      PromptIntegration.clearPromptSystem(agent.id)
      this.logger.info(`💭 Cleared prompt system for agent: ${agent.name}`)
    }
    */

    // Cleanup agent resources
    for (const extension of agent.extensions) {
      try {
        // Call cleanup method if extension supports it
        if ('cleanup' in extension && typeof extension.cleanup === 'function') {
          await extension.cleanup();
        }
        runtimeLogger.info(`🧹 Cleaned up extension: ${extension.name}`);
      } catch (error) {
        void error;
        runtimeLogger.error(
          `❌ Extension cleanup error for ${extension.name}:`,
          error as Error,
          {} as LogContext
        );
      }
    }
  }

  private async registerCoreModules(): Promise<void> {
    try {
      // Import factory functions from modules
      await import('../modules/index');

      // Register core modules
      const { registerCoreModules } = await import('../modules/index');
      await registerCoreModules(this.registry);

      // Log successful registration summary
      const memoryProviders = this.registry.listMemoryProviders();
      const emotionModules = this.registry.listEmotionModules();
      const cognitionModules = this.registry.listCognitionModules();

      runtimeLogger.info(
        `📝 Memory providers: ${memoryProviders.length} registered`
      );
      runtimeLogger.info(
        `🎭 Emotion modules: ${emotionModules.length} registered`
      );
      runtimeLogger.info(
        `🧠 Cognition modules: ${cognitionModules.length} registered`
      );
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Failed to register core modules:',
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  /**
   * Check if agent configuration indicates autonomous capabilities
   */
  private _isAutonomousAgent(config: AgentConfig): boolean {
    return (
      config.autonomous?.enabled === true ||
      config.autonomous_behaviors !== undefined
    );
  }

  /**
   * Initialize autonomous agent capabilities
   */
  private async _initializeAutonomousAgent(
    agent: Agent,
    config: AgentConfig
  ): Promise<AutonomousAgent> {
    runtimeLogger.info(
      `🤖 Initializing autonomous capabilities for: ${agent.name}`
    );

    try {
      // Create autonomous agent
      const autonomousAgent: AutonomousAgent = {
        ...agent,
        autonomousConfig: {
          learning: {
            algorithm: 'q_learning',
            learningRate: 0.1,
            discountFactor: 0.95,
            explorationRate: config.autonomous?.independence_level || 0.8,
            experienceReplaySize: 1000,
            batchSize: 32,
            targetUpdateFrequency: 100,
            curiosityWeight:
              (config['autonomous_behaviors']?.['curiosity_driven'] as any)
                ?.exploration_rate || 0.3,
          },
          selfManagement: {
            adaptationEnabled: true,
            learningRate: 0.1,
            performanceThreshold: 0.7,
            adaptationTriggers: [],
            selfHealingEnabled: true,
            diagnosticsInterval: 60000,
          },
          goalSystem: {
            maxActiveGoals: 5,
            goalGenerationInterval: 30000,
            curiosityThreshold: 0.5,
            conflictResolutionStrategy: 'priority',
            planningHorizon: 60 * 60 * 1000,
            adaptationRate: 0.1,
            curiosityDrivers: [],
          },
          resourceManagement: {
            enabled: true,
            monitoringInterval: 30000,
            allocationStrategy: 'dynamic',
            optimizationGoals: ['efficiency', 'performance'],
          },
          metaCognition: {
            enabled: true,
            selfEvaluationInterval: 300000,
            strategyAdaptationEnabled: true,
            performanceMonitoringEnabled: true,
          },
        },
      };

      // Initialize decision engine
      const decisionEngine = new DecisionEngine(autonomousAgent, {
        type: DecisionModuleType.HYBRID,
        riskTolerance:
          config.autonomous?.decision_making?.autonomy_threshold || 0.7,
        decisionSpeed: 1.0,
        evaluationCriteria: [
          'goal_alignment',
          'personality_fit',
          'ethical_compliance',
        ],
      });
      this.decisionEngines.set(agent.id, decisionEngine);

      // Behavior and lifecycle systems removed - functionality in autonomous engine

      // Initialize autonomous engine
      const autonomousEngineConfig: AutonomousEngineConfig = {
        enabled: true,
        tickInterval: 30000, // 30 seconds
        autonomyLevel: config.autonomous?.independence_level || 0.8,
        interruptible:
          config.human_interaction?.interruption_tolerance !== 'low',
        ethicalConstraints:
          config.autonomous?.decision_making?.ethical_constraints !== false,
        performanceMonitoring: true,
        goalGenerationEnabled:
          config.autonomous?.life_simulation?.goal_pursuit !== false,
        curiosityWeight:
          (config['autonomous_behaviors']?.['curiosity_driven'] as any)
            ?.exploration_rate || 0.3,
        maxConcurrentActions: 3,
        planningHorizon: 60 * 60 * 1000, // 1 hour
      };

      const autonomousEngine = new AutonomousEngine(
        autonomousAgent,
        autonomousEngineConfig,
        this.eventBus
      );
      this.autonomousEngines.set(agent.id, autonomousEngine);

      // Store autonomous agent
      this.autonomousAgents.set(agent.id, autonomousAgent);

      // Start autonomous systems
      await this.startAutonomousSystems(agent.id);

      runtimeLogger.info(
        `✅ Autonomous capabilities initialized for: ${agent.name}`
      );
      return autonomousAgent;
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to initialize autonomous capabilities for ${agent.name}:`,
        error as Error,
        {} as LogContext
      );
      return agent as AutonomousAgent;
    }
  }

  /**
   * Start autonomous systems for an agent
   */
  private async startAutonomousSystems(agentId: string): Promise<void> {
    try {
      // Lifecycle system removed - functionality in autonomous engine

      // Start autonomous engine
      const autonomousEngine = this.autonomousEngines.get(agentId);
      if (autonomousEngine) {
        await autonomousEngine.start();
      }

      runtimeLogger.info(`🚀 Autonomous systems started for agent: ${agentId}`);
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to start autonomous systems for ${agentId}:`,
        error as Error,
        {} as LogContext
      );
    }
  }

  /**
   * Stop autonomous systems for an agent
   */
  private async stopAutonomousSystems(agentId: string): Promise<void> {
    try {
      // Stop autonomous engine
      const autonomousEngine = this.autonomousEngines.get(agentId);
      if (autonomousEngine) {
        await autonomousEngine.stop();
        this.autonomousEngines.delete(agentId);
      }

      // Clean up other systems
      this.decisionEngines.delete(agentId);
      this.autonomousAgents.delete(agentId);

      runtimeLogger.info(`🛑 Autonomous systems stopped for agent: ${agentId}`);
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to stop autonomous systems for ${agentId}:`,
        error as Error,
        {} as LogContext
      );
    }
  }

  /**
   * Get agent autonomy level
   */
  private getAutonomyLevel(agent: Agent): number {
    const autonomousAgent = this.autonomousAgents.get(agent.id);
    if (autonomousAgent) {
      return autonomousAgent.autonomousConfig?.learning?.explorationRate || 0.8;
    }
    return 0;
  }

  /**
   * Handle interruption for autonomous agent
   */
  public interruptAutonomousAgent(agentId: string, event: AgentEvent): void {
    const autonomousEngine = this.autonomousEngines.get(agentId);
    if (autonomousEngine) {
      autonomousEngine.queueInterruption(event);
      runtimeLogger.info(
        `📨 Queued interruption for autonomous agent: ${agentId}`
      );
    }
  }

  /**
   * Get autonomous agent status
   */
  public getAutonomousStatus(agentId: string): Record<string, unknown> {
    const autonomousEngine = this.autonomousEngines.get(agentId);
    const decisionEngine = this.decisionEngines.get(agentId);

    if (!autonomousEngine) {
      return { autonomous: false };
    }

    return {
      autonomous: true,
      engine: autonomousEngine.getAutonomousState(),
      decisions: decisionEngine?.getDecisionStats(),
    };
  }

  /**
   * Load and register extensions
   */
  private async loadExtensions(): Promise<void> {
    try {
      // Import the extensions module
      const extensionsModule = await import('../extensions/index');

      // Create extension configs from environment variables
      const extensionConfigs: Record<string, ExtensionConfig> = {};

      // API extension config (always enabled by default)
      extensionConfigs['api'] = {
        enabled: true,
        priority: 1,
        settings: {
          port: parseInt(process.env['API_PORT'] || '8000'),
          host: process.env['API_HOST'] || 'localhost',
          cors_enabled: true,
          rate_limiting: true,
          websocket_enabled: true,
          webui_enabled: true,
          auth_required: process.env['API_AUTH_REQUIRED'] === 'true',
          max_connections: parseInt(
            process.env['API_MAX_CONNECTIONS'] || '100'
          ),
        },
        dependencies: [],
        capabilities: ['http', 'websocket', 'webui', 'api'],
      };

      // Slack extension config
      if (process.env['SLACK_BOT_TOKEN']) {
        extensionConfigs['slack'] = {
          enabled: true,
          priority: 2,
          settings: {
            botToken: process.env['SLACK_BOT_TOKEN'],
            signingSecret: process.env['SLACK_SIGNING_SECRET'],
            appToken: process.env['SLACK_APP_TOKEN'],
          },
          dependencies: [],
          capabilities: ['messaging', 'channels'],
        };
      }

      // RuneLite extension config
      if (process.env['RUNELITE_ENABLED'] === 'true') {
        extensionConfigs['runelite'] = {
          enabled: true,
          priority: 3,
          settings: {
            // RuneLite specific config
          },
          dependencies: [],
          capabilities: ['game-automation'],
        };
      }

      // Twitter extension config
      if (process.env['TWITTER_API_KEY']) {
        extensionConfigs['twitter'] = {
          enabled: true,
          priority: 4,
          settings: {
            apiKey: process.env['TWITTER_API_KEY'],
            apiSecret: process.env['TWITTER_API_SECRET'],
            accessToken: process.env['TWITTER_ACCESS_TOKEN'],
            accessTokenSecret: process.env['TWITTER_ACCESS_TOKEN_SECRET'],
          },
          dependencies: [],
          capabilities: ['social-media', 'posting'],
        };
      }

      // Telegram extension config
      if (process.env['TELEGRAM_BOT_TOKEN']) {
        extensionConfigs['telegram'] = {
          enabled: true,
          priority: 5,
          settings: {
            botToken: process.env['TELEGRAM_BOT_TOKEN'],
            webhookUrl: process.env['TELEGRAM_WEBHOOK_URL'],
          },
          dependencies: [],
          capabilities: ['messaging', 'webhook'],
        };
      }

      // Create a temporary RuntimeConfig for extensions
      const tempConfig: RuntimeConfig = {
        ...this.config,
        extensions: {
          autoLoad: true,
          paths: [],
          ...extensionConfigs,
        },
      };

      // Register available extensions
      const extensions = await extensionsModule.registerExtensions(tempConfig);

      // Register extensions in registry using their ID instead of name
      const loadedExtensions: string[] = [];
      for (const extension of extensions) {
        this.registry.registerExtension(extension.id, extension);
        loadedExtensions.push(extension.id);

        // If this is the API extension, connect it to the runtime and initialize it
        if (extension.id === 'api') {
          if ('setRuntime' in extension) {
            (
              extension as { setRuntime(runtime: SYMindXRuntime): void }
            ).setRuntime(this);
          }
          // Initialize the API extension at runtime level with a dummy agent
          try {
            const dummyAgent = {
              id: 'runtime',
              name: 'Runtime',
              status: 'active',
              config: {},
            };
            // Add timeout to prevent hanging
            const initPromise = extension.init(dummyAgent as Agent);
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(
                () => reject(new Error('API extension initialization timeout')),
                10000
              );
            });

            await Promise.race([initPromise, timeoutPromise]);
            runtimeLogger.info(
              '🌐 API extension: Initialized on runtime level'
            );
          } catch (error) {
            void error;
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            runtimeLogger.error(
              `❌ Failed to initialize API extension at runtime level: ${errorMessage}`
            );
            if (error instanceof Error && error.stack) {
              runtimeLogger.debug(`API extension error stack: ${error.stack}`);
            }
            // Don't fail the entire runtime if API extension fails
            // Just log the error and continue
          }
        }
      }

      runtimeLogger.info(
        `🔌 Extensions: ${loadedExtensions.length} loaded (${loadedExtensions.join(', ')})`
      );
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Failed to load built-in extensions:',
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  /**
   * Load dynamic plugins (simplified for emergency cleanup)
   */
  private async _loadDynamicPlugins(): Promise<void> {
    // This method is kept for backward compatibility but does nothing
    // Extensions are loaded in the loadExtensions() method
  }

  /**
   * Log a clean startup summary
   */
  private logStartupSummary(): void {
    const stats = this.getStats();

    runtimeLogger.info(
      '═══════════════════════════════════════════════════════'
    );
    runtimeLogger.info('📊 Runtime Status Summary');
    runtimeLogger.info(
      '═══════════════════════════════════════════════════════'
    );

    // Memory Providers
    const memoryProviders = this.registry.listMemoryProviders();
    runtimeLogger.info(
      `📝 Memory Providers: ${memoryProviders.length} registered`
    );
    runtimeLogger.info(`   └─ Available: ${memoryProviders.join(', ')}`);

    // Emotion Modules
    const emotionModules = this.registry.listEmotionModules();
    runtimeLogger.info(
      `🎭 Emotion Modules: ${emotionModules.length} registered`
    );
    runtimeLogger.info(`   └─ Available: ${emotionModules.join(', ')}`);

    // Cognition Modules
    const cognitionModules = this.registry.listCognitionModules();
    runtimeLogger.info(
      `🧠 Cognition Modules: ${cognitionModules.length} registered`
    );
    runtimeLogger.info(`   └─ Available: ${cognitionModules.join(', ')}`);

    // Portals
    const availablePortals = this.registry.listPortals();
    const activePortals = availablePortals.filter((p) => {
      const portal = this.registry.getPortal(p);
      return portal && portal.enabled;
    });
    runtimeLogger.info(
      `🌐 AI Portals: ${activePortals.length} active / ${availablePortals.length} available`
    );
    runtimeLogger.info(`   └─ Active: ${activePortals.join(', ')}`);

    // Extensions
    const loadedExtensions = this.registry.listExtensions();
    runtimeLogger.info(`🔌 Extensions: ${loadedExtensions.length} loaded`);
    runtimeLogger.info(`   └─ Active: ${loadedExtensions.join(', ')}`);

    // Agents
    runtimeLogger.info(
      `🤖 Agents: ${stats['agents']} active / ${stats['lazyAgents']} registered`
    );

    // Tool System - MCP Integration
    let totalMCPTools = 0;
    const mcpServers: string[] = [];

    // Check all agents for MCP tools
    for (const agent of this.agents.values()) {
      if (agent.toolSystem && Object.keys(agent.toolSystem).length > 0) {
        totalMCPTools += Object.keys(agent.toolSystem).length;

        // Extract unique server names from tool keys (format: "server:toolname")
        for (const toolKey of Object.keys(agent.toolSystem)) {
          const serverParts = toolKey.split(':');
          const serverName = serverParts[0] ?? '';
          if (serverName && !mcpServers.includes(serverName)) {
            mcpServers.push(serverName);
          }
        }
      }
    }

    if (totalMCPTools > 0) {
      runtimeLogger.info(`🛠️ MCP Tools: ${totalMCPTools} available`);
      runtimeLogger.info(`   └─ Servers: ${mcpServers.join(', ')}`);
    } else {
      runtimeLogger.info(`🛠️ MCP Tools: No tools loaded`);
    }

    runtimeLogger.info(
      '═══════════════════════════════════════════════════════'
    );
  }

  /**
   * Get runtime statistics
   */
  getStats(): Record<string, unknown> {
    const autonomousAgentStats = Array.from(this.autonomousAgents.keys()).map(
      (agentId) => ({
        agentId,
        status: this.getAutonomousStatus(agentId),
      })
    );

    return {
      agents: this.agents.size,
      lazyAgents: this.lazyAgents.size,
      autonomousAgents: this.autonomousAgents.size,
      isRunning: this.isRunning,
      extensions: this.extensionLoader.getStats(),
      eventBus: {
        events: this.eventBus.getEvents().length,
      },
      autonomous: {
        totalAutonomousAgents: this.autonomousAgents.size,
        autonomousEngines: this.autonomousEngines.size,
        decisionEngines: this.decisionEngines.size,
        agentStats: autonomousAgentStats,
      },
      lazy: {
        totalLazyAgents: this.lazyAgents.size,
        activeAgents: this.agents.size,
        unloadedAgents: Array.from(this.lazyAgents.values()).filter(
          (la) => la.status === LazyAgentStatus.UNLOADED
        ).length,
        loadedAgents: Array.from(this.lazyAgents.values()).filter(
          (la) => la.status === LazyAgentStatus.LOADED
        ).length,
        errorAgents: Array.from(this.lazyAgents.values()).filter(
          (la) => la.status === LazyAgentStatus.ERROR
        ).length,
      },
    };
  }

  /**
   * Load a specific plugin by ID
   */
  async loadPlugin(
    pluginId: string,
    _config?: ExtensionConfig
  ): Promise<boolean> {
    runtimeLogger.info(
      `🔌 Plugin loading simplified for emergency cleanup: ${pluginId}`
    );
    return false; // Plugins will be loaded via built-in extension system
  }

  /**
   * Unload a specific plugin by ID
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    runtimeLogger.info(
      `🔌 Plugin unloading simplified for emergency cleanup: ${pluginId}`
    );
    return false;
  }

  /**
   * Reload a specific plugin by ID
   */
  async reloadPlugin(
    pluginId: string,
    _config?: ExtensionConfig
  ): Promise<boolean> {
    runtimeLogger.info(
      `🔌 Plugin reloading simplified for emergency cleanup: ${pluginId}`
    );
    return false;
  }

  /**
   * Get list of available plugins
   */
  async getAvailablePlugins(): Promise<string[]> {
    runtimeLogger.info('🔌 Plugin discovery simplified for emergency cleanup');
    return [];
  }

  /**
   * Get list of loaded plugins
   */
  getLoadedPlugins(): Array<{ id: string; [key: string]: unknown }> {
    runtimeLogger.info('🔌 Plugin listing simplified for emergency cleanup');
    return [];
  }

  /**
   * Subscribe to runtime events
   */
  subscribeToEvents(
    pattern: { type?: string; source?: string },
    handler: (event: AgentEvent) => void
  ): void {
    // Simplified for emergency cleanup
    this.eventBus.on(pattern.type || '*', handler);
  }

  /**
   * Get event history
   */
  async getEventHistory(filter?: {
    type?: string;
    source?: string;
    limit?: number;
  }): Promise<AgentEvent[]> {
    // Simplified for emergency cleanup
    const events = this.eventBus.getEvents();
    if (filter?.limit) {
      return events.slice(-filter.limit);
    }
    return events;
  }

  /**
   * Get comprehensive runtime capabilities and module information
   */
  getRuntimeCapabilities(): Record<string, unknown> {
    return {
      agents: {
        active: this.agents.size,
        lazy: this.lazyAgents.size,
        total: this.agents.size + this.lazyAgents.size,
        activeList: Array.from(this.agents.keys()),
        lazyList: Array.from(this.lazyAgents.values()).map((la) => ({
          id: la.id,
          name: la.name,
          state: la.status,
          priority: la.priority,
        })),
      },
      modules: {
        emotion: {
          available: this.registry.listEmotionModules(),
          factorySupported: true,
        },
        cognition: {
          available: this.registry.listCognitionModules(),
          factorySupported: true,
        },
        memory: {
          available: this.registry.listMemoryProviders(),
          factorySupported: true,
        },
        portals: {
          available: this.registry.listPortals(),
          factories: this.registry.listPortalFactories(),
          factorySupported: true,
        },
      },
      extensions: {
        loaded: this.registry.listExtensions(),
        available: this.registry.listExtensions(), // Same as loaded for now
      },
      runtime: {
        isRunning: this.isRunning,
        tickInterval: this.config.tickInterval,
        version: '1.0.0', // TODO: get from package.json
      },
    };
  }

  /**
   * Create a new agent dynamically with the specified configuration
   */
  async createAgent(config: AgentConfig): Promise<string> {
    const agent = await this.loadAgent(config, undefined);
    runtimeLogger.info(
      `🤖 Dynamically created agent: ${agent.name} (${agent.id})`
    );
    return agent.id;
  }

  /**
   * Remove an agent from the runtime
   */
  async removeAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    await this.shutdownAgent(agent);
    this.agents.delete(agentId);
    runtimeLogger.info(`🗑️ Removed agent: ${agent.name} (${agentId})`);
    return true;
  }

  private async loadPortals(): Promise<void> {
    try {
      // Use the new portal integration module
      const { registerPortals } = await import('../portals/integration');

      // Load API keys with proper hierarchy: characters -> .env -> config
      const apiKeys = await this.loadApiKeys();

      // Register all available portals
      await registerPortals(this.registry, apiKeys);

      // Register portal factories for dynamic creation
      try {
        const portalsModule = await import('../portals/index');
        if (portalsModule.getAvailablePortalTypes) {
          const portalTypes = portalsModule.getAvailablePortalTypes();
          for (const portalType of portalTypes) {
            if (portalsModule.createPortal) {
              const factory = (config: unknown): Portal =>
                portalsModule.createPortal(portalType, config as PortalConfig);
              this.registry.registerPortalFactory(portalType, factory);
            }
          }
          // Portal factories registered - logged by integration
        }
      } catch (factoryError) {
        runtimeLogger.warn('⚠️ Portal factories not available:', {
          metadata: {
            error:
              factoryError instanceof Error
                ? factoryError.message
                : String(factoryError),
          },
        } as LogContext);
      }

      // Portal information displayed by UI
    } catch (error) {
      void error;
      runtimeLogger.error(
        '❌ Failed to load portals:',
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  async preloadAgent(agentId: string): Promise<void> {
    const lazyAgent = this.lazyAgents.get(agentId);
    if (!lazyAgent) {
      throw new Error(`Lazy agent '${agentId}' not found`);
    }

    if (
      lazyAgent.status === LazyAgentStatus.LOADED ||
      lazyAgent.status === LazyAgentStatus.LOADING
    ) {
      runtimeLogger.info(`✅ Agent ${agentId} already loaded`);
      return;
    }

    runtimeLogger.info(`📦 Preloading agent: ${agentId}`);
    lazyAgent.status = LazyAgentStatus.LOADING;

    try {
      // Just validate that the agent can be created without storing it
      const testAgent = await this.loadAgent(
        lazyAgent.config,
        lazyAgent.character_id
      );
      await this.shutdownAgent(testAgent);

      lazyAgent.status = LazyAgentStatus.LOADED;
      runtimeLogger.info(`✅ Agent ${agentId} preloaded successfully`);
    } catch (error) {
      void error;
      lazyAgent.status = LazyAgentStatus.ERROR;
      if (lazyAgent.lazyMetrics) {
        (lazyAgent.lazyMetrics as { lastError?: string }).lastError =
          error instanceof Error ? error.message : String(error);
      }
      runtimeLogger.error(
        `❌ Failed to preload agent ${agentId}:`,
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  async unloadInactiveAgents(): Promise<number> {
    runtimeLogger.info('🧹 Unloading inactive agents...');

    let unloadedCount = 0;
    const cutoffTime = Date.now() - 30 * 60 * 1000; // 30 minutes

    for (const [agentId, lazyAgent] of this.lazyAgents) {
      // Skip agents that are already unloaded or currently loading
      if (
        lazyAgent.status === LazyAgentStatus.UNLOADED ||
        lazyAgent.status === LazyAgentStatus.LOADING
      ) {
        continue;
      }

      // Check if agent is inactive
      const lastActive = lazyAgent.lastActivated?.getTime() || 0;
      if (lastActive < cutoffTime && this.agents.has(agentId)) {
        try {
          await this.deactivateAgent(agentId);
          unloadedCount++;
        } catch (error) {
          void error;
          runtimeLogger.error(
            `❌ Failed to unload inactive agent ${agentId}:`,
            error as Error,
            {} as LogContext
          );
        }
      }
    }

    runtimeLogger.info(`✅ Unloaded ${unloadedCount} inactive agents`);
    return unloadedCount;
  }

  /**
   * Check if any lazy agents need activation based on pending events
   */
  private async checkLazyAgentActivation(): Promise<void> {
    const allEvents = this.eventBus.getEvents();
    const pendingEvents = allEvents.filter((event) => !event.processed);

    if (pendingEvents.length === 0) return;

    // Check each lazy agent to see if they should be activated
    for (const [agentId, lazyAgent] of this.lazyAgents) {
      // Skip if agent is already active or in error state
      if (
        lazyAgent.status === LazyAgentStatus.LOADED ||
        lazyAgent.status === LazyAgentStatus.ERROR
      ) {
        continue;
      }

      // Check if any events are targeted at this agent
      const relevantEvents = pendingEvents.filter(
        (event) =>
          event.targetAgentId === agentId ||
          event.type.includes(lazyAgent.name.toLowerCase()) ||
          (event.data && event.data['agentId'] === agentId)
      );

      if (relevantEvents.length > 0) {
        try {
          runtimeLogger.info(
            `🔥 Activating lazy agent ${lazyAgent.name} due to ${relevantEvents.length} relevant events`
          );
          await this.activateAgent(agentId);
        } catch (error) {
          void error;
          runtimeLogger.error(
            `❌ Failed to activate lazy agent ${agentId}:`,
            error as Error,
            {} as LogContext
          );
        }
      }
    }
  }

  /**
   * Calculate agent priority based on configuration
   */
  private calculateAgentPriority(characterConfig: CharacterConfig): number {
    // Default priority
    let priority = 5;

    // Check explicit priority setting
    if ('priority' in characterConfig && characterConfig.priority) {
      if (typeof characterConfig.priority === 'string') {
        switch (characterConfig.priority.toLowerCase()) {
          case 'high':
            priority = 8;
            break;
          case 'medium':
            priority = 5;
            break;
          case 'low':
            priority = 2;
            break;
          default:
            priority = 5;
        }
      } else if (typeof characterConfig.priority === 'number') {
        priority = Math.max(1, Math.min(10, characterConfig.priority));
      }
    }

    // Boost priority for primary agents
    if ('primary' in characterConfig && characterConfig.primary === true) {
      priority = Math.min(10, priority + 2);
    }

    // Boost priority for autonomous agents
    if (characterConfig.autonomous?.enabled === true) {
      priority = Math.min(10, priority + 1);
    }

    return priority;
  }

  /**
   * Register a default agent factory for creating agents from configurations
   */
  private registerDefaultAgentFactory(): void {
    const defaultAgentFactory = (_config: unknown): Agent => {
      // For now, return a dummy agent since the actual loading is async
      // The registry should handle async factories differently
      return {} as Agent;
    };

    this.registry.registerAgentFactory('default', defaultAgentFactory);
    // Agent factory registered - logged by UI
  }

  /**
   * Create a lazy agent from configuration
   */
  private createLazyAgent(
    agentConfig: AgentConfig,
    characterConfig: CharacterConfig,
    characterId?: string
  ): LazyAgent {
    const agentId =
      characterId ||
      `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const lazyAgent: LazyAgent = {
      id: agentId,
      ...(characterId && { character_id: characterId }),
      name: characterConfig.name || agentConfig.core?.name || 'Unknown Agent',
      status: LazyAgentStatus.UNLOADED,
      config: agentConfig,
      characterConfig: characterConfig as unknown as Record<string, unknown>,
      priority: this.calculateAgentPriority(characterConfig),
      lazyMetrics: {
        loadCount: 0,
        errorCount: 0,
      },
      // LazyAgent specific properties
      state: {
        emotionState: {
          current: 'neutral',
          intensity: 0.5,
          triggers: [],
          history: [],
          timestamp: new Date(),
        },
        recentMemories: [],
        lazy: true,
        hibernationLevel: 1,
      },
      isLazy: true,
      hibernationLevel: 1,
      lastAccessTime: new Date(),
      // Required Agent properties (stubs until loaded)
      emotion: null as unknown as EmotionModule,
      memory: null as unknown as MemoryProvider,
      cognition: null as unknown as CognitionModule,
      extensions: [],
      lastUpdate: new Date(),
      // Agent methods (stubs that will load the real agent)
      initialize: async (config: AgentConfig) => {
        const agent = await this.activateAgent(agentId);
        return agent.initialize(config);
      },
      cleanup: async () => {
        const currentLazyAgent = this.lazyAgents.get(agentId);
        if (currentLazyAgent?.agent) {
          return await currentLazyAgent.agent.cleanup();
        }
        return {
          success: true,
          message: 'Lazy agent cleanup',
          timestamp: new Date(),
          resourcesReleased: [],
        };
      },
      tick: async () => {
        const agent = await this.activateAgent(agentId);
        return agent.tick();
      },
      updateState: async (newState: Partial<AgentState>) => {
        const agent = await this.activateAgent(agentId);
        return agent.updateState(newState);
      },
      processEvent: async (event: AgentEvent) => {
        const agent = await this.activateAgent(agentId);
        return agent.processEvent(event);
      },
      executeAction: async (action: AgentAction) => {
        const agent = await this.activateAgent(agentId);
        return agent.executeAction(action);
      },
    };

    return lazyAgent;
  }

  /**
   * Activate a lazy agent
   */
  async activateAgent(agentId: string): Promise<Agent> {
    const lazyAgent = this.lazyAgents.get(agentId);
    if (!lazyAgent) {
      throw new Error(`Lazy agent ${agentId} not found`);
    }

    if (lazyAgent.status === LazyAgentStatus.LOADED && lazyAgent.agent) {
      return lazyAgent.agent; // Already active
    }

    try {
      lazyAgent.status = LazyAgentStatus.LOADING;

      // Create the full agent using existing loadAgent method
      const agent = await this.loadAgent(
        lazyAgent.config,
        lazyAgent.character_id
      );

      // Update lazy agent state
      lazyAgent.status = LazyAgentStatus.LOADED;
      if (lazyAgent.lazyMetrics) {
        lazyAgent.lazyMetrics.loadCount =
          (lazyAgent.lazyMetrics.loadCount || 0) + 1;
        lazyAgent.lazyMetrics.lastLoadTime = new Date();
      }
      lazyAgent.lastActivated = new Date();
      lazyAgent.agent = agent;

      // Remove from lazy agents map since it's now active
      this.lazyAgents.delete(agentId);

      // Note: No need to call this.agents.set() here as loadAgent already does it

      runtimeLogger.success(`✅ Activated agent: ${lazyAgent.name}`);
      return agent;
    } catch (error) {
      void error;
      lazyAgent.status = LazyAgentStatus.ERROR;
      if (lazyAgent.lazyMetrics) {
        lazyAgent.lazyMetrics.errorCount =
          (lazyAgent.lazyMetrics.errorCount || 0) + 1;
        (lazyAgent.lazyMetrics as { lastError?: string }).lastError = (
          error as Error
        ).message;
      }
      runtimeLogger.error(
        `❌ Failed to activate agent ${agentId}:`,
        error as Error,
        {} as LogContext
      );
      throw error;
    }
  }

  /**
   * Deactivate an agent and return it to lazy state
   */
  async deactivateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      return;
    }

    try {
      // Shutdown agent resources
      await this.shutdownAgent(agent);

      // Remove from active agents
      this.agents.delete(agentId);

      // Unregister agent from context system
      await this.unregisterAgentFromContext(agentId);

      // Create lazy agent entry for future activation
      const lazyAgent = this.createLazyAgent(
        agent.config,
        (agent.characterConfig || {}) as unknown as CharacterConfig,
        agentId
      );
      this.lazyAgents.set(agentId, lazyAgent);
      // Create a loader function for the lazy agent
      const loader = async () => {
        return lazyAgent as unknown as Agent;
      };
      this.registry.registerLazyAgent(lazyAgent.id, loader);

      runtimeLogger.info(`💤 Deactivated agent: ${agent.name}`);
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to deactivate agent ${agentId}:`,
        error as Error,
        {} as LogContext
      );
    }
  }

  /**
   * Check if an agent is currently active
   */
  isAgentActive(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get the state of a lazy agent
   */
  getAgentState(agentId: string): LazyAgentStatus | undefined {
    const lazyAgent = this.lazyAgents.get(agentId);
    return lazyAgent?.status;
  }

  /**
   * Get a lazy agent by ID
   */
  getLazyAgent(agentId: string): LazyAgent | undefined {
    return this.lazyAgents.get(agentId);
  }

  /**
   * List all lazy agents
   */
  listLazyAgents(): LazyAgent[] {
    return Array.from(this.lazyAgents.values());
  }

  /**
   * Create empty runtime metrics
   */
  private createEmptyMetrics(): RuntimeMetrics {
    return {
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        arrayBuffers: 0,
      },
      cpu: {
        usage: 0,
        user: 0,
        system: 0,
        idle: 0,
        loadAverage: [0, 0, 0],
      },
      uptime: 0,
      tickRate: 0,
      eventRate: 0,
      agentMetrics: {
        total: 0,
        active: 0,
        idle: 0,
        error: 0,
        lazy: 0,
        averageThinkTime: 0,
        averageResponseTime: 0,
      },
      extensionMetrics: {
        total: 0,
        active: 0,
        error: 0,
        messagesSent: 0,
        messagesReceived: 0,
        averageProcessingTime: 0,
      },
      timestamp: new Date(),
    };
  }

  private async loadApiKeys(): Promise<Record<string, string>> {
    const apiKeys: Record<string, string> = {};

    // 1. Start with config defaults
    if (this.config.portals?.apiKeys) {
      Object.assign(apiKeys, this.config.portals.apiKeys);
    }

    // 2. Override with environment variables
    const envKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GROQ_API_KEY',
      'XAI_API_KEY',
      'OPENROUTER_API_KEY',
      'KLUSTERAI_API_KEY',
      'GOOGLE_API_KEY',
      'MISTRAL_API_KEY',
      'COHERE_API_KEY',
      'AZURE_OPENAI_API_KEY',
    ];

    for (const envKey of envKeys) {
      const value = process.env[envKey];
      if (value && value.trim()) {
        // Convert env key to portal key format
        const portalKey = envKey.toLowerCase().replace('_api_key', '');
        apiKeys[portalKey] = value;
      }
    }

    // 3. Override with character-specific keys (if any characters are loaded)
    try {
      const characters = await this.loadCharacterApiKeys();
      Object.assign(apiKeys, characters);
    } catch (error) {
      this.logger.debug('No character API keys found', {
        error: String(error),
      });
    }

    this.logger.info('API Keys loaded', {
      availableKeys: Object.keys(apiKeys).filter(
        (key) => apiKeys[key] && apiKeys[key].trim()
      ),
      totalKeys: Object.keys(apiKeys).length,
    });

    return apiKeys;
  }

  private async loadCharacterApiKeys(): Promise<Record<string, string>> {
    const characterKeys: Record<string, string> = {};

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Look for character files that might contain API keys
      const characterPaths = [
        path.join(process.cwd(), 'dist', 'characters'),
        path.join(process.cwd(), 'src', 'characters'),
        path.join(process.cwd(), 'characters'),
      ];

      for (const charPath of characterPaths) {
        try {
          const files = await fs.readdir(charPath);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const charConfig = JSON.parse(
                await fs.readFile(path.join(charPath, file), 'utf-8')
              );
              if (
                charConfig.apiKeys &&
                typeof charConfig.apiKeys === 'object'
              ) {
                Object.assign(characterKeys, charConfig.apiKeys);
              }
            }
          }
        } catch (e) {
          // Character path doesn't exist, continue
        }
      }
    } catch (error) {
      this.logger.debug('Error loading character API keys', {
        error: String(error),
      });
    }

    return characterKeys;
  }

  /**
   * Context Management Helper Methods
   */

  /**
   * Validate context for agent processing
   */
  private async validateContextForAgent(
    agent: Agent,
    context: ThoughtContext
  ): Promise<void> {
    try {
      // Convert ThoughtContext to UnifiedContext for validation
      // This is a simplified validation - the context service handles full validation
      if (!context.events || !Array.isArray(context.events)) {
        runtimeLogger.warn(`Invalid context events for agent ${agent.name}`);
      }

      if (!context.memories || !Array.isArray(context.memories)) {
        runtimeLogger.warn(`Invalid context memories for agent ${agent.name}`);
      }

      if (!context.currentState) {
        runtimeLogger.warn(`Missing current state for agent ${agent.name}`);
      }

      if (!context.environment) {
        runtimeLogger.warn(`Missing environment state for agent ${agent.name}`);
      }

      runtimeLogger.debug(`Context validated for agent ${agent.name}`, {
        events: context.events.length,
        memories: context.memories.length,
        hasState: !!context.currentState,
        hasEnvironment: !!context.environment,
      });
    } catch (error) {
      runtimeLogger.error(
        `Context validation failed for agent ${agent.name}`,
        error as Error,
        {} as LogContext
      );
    }
  }

  /**
   * Clean up context cache for inactive agents
   */
  private cleanupContextCache(): void {
    try {
      const activeAgentIds = new Set(this.agents.keys());

      // Clear cache for agents that are no longer active
      for (const agentId of this.agents.keys()) {
        if (!activeAgentIds.has(agentId)) {
          this.contextService.clearContextCache(agentId);
        }
      }

      runtimeLogger.debug('Context cache cleanup completed');
    } catch (error) {
      runtimeLogger.error(
        'Context cache cleanup failed',
        error as Error,
        {} as LogContext
      );
    }
  }

  /**
   * Inject context into agent lifecycle
   *
   * This method integrates context lifecycle with agent activation and deactivation
   */
  private async injectContextIntoLifecycle(agent: Agent): Promise<void> {
    try {
      // Clear any existing context cache when agent is reactivated
      this.contextService.clearContextCache(agent.id);

      // Pre-warm context cache if agent has recent activity
      const hasRecentActivity = this.getUnprocessedEvents(agent.id).length > 0;
      if (hasRecentActivity) {
        const basicContext: ThoughtContext = {
          events: this.getUnprocessedEvents(agent.id),
          memories: await this.getRecentMemories(agent),
          currentState: this.getCurrentState(agent),
          environment: this.getEnvironmentState(),
        };

        // Pre-warm cache with enhanced context
        await this.contextService.enhanceThoughtContext(agent, basicContext, {
          cache: true,
          cacheTtl: 600000, // 10 minutes for pre-warmed cache
        });

        runtimeLogger.debug(`Context cache pre-warmed for agent ${agent.name}`);
      }
    } catch (error) {
      runtimeLogger.warn(
        `Failed to inject context into lifecycle for agent ${agent.name}`,
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Get context performance metrics
   */
  getContextPerformanceMetrics(): Record<
    string,
    { avg: number; min: number; max: number; count: number }
  > {
    return this.contextService.getPerformanceStats();
  }

  /**
   * Get compliance integration instance
   */
  getComplianceIntegration(): ComplianceIntegration | undefined {
    return this.complianceIntegration;
  }

  /**
   * Check if compliance is enabled
   */
  isComplianceEnabled(): boolean {
    return this.config.compliance?.enabled === true;
  }

  /**
   * Shutdown context service
   */
  private shutdownContextService(): void {
    try {
      this.contextService.shutdown();
      runtimeLogger.info('Context service shutdown completed');
    } catch (error) {
      runtimeLogger.error(
        'Context service shutdown failed',
        error as Error,
        {} as LogContext
      );
    }
  }
}

// SYMindXEventBus removed - using SimpleEventBus instead
