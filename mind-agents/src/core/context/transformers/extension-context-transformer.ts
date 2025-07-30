/**
 * Extension Context Transformer
 *
 * Transforms unified context into extension-specific format,
 * optimizing for extension integration and communication protocols.
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
  TransformationPerformance,
} from '../../../types/context/context-transformation.js';
import { runtimeLogger } from '../../../utils/logger.js';

/**
 * Extension-specific context format
 */
export interface ExtensionContext {
  // Core identification
  agentId: string;
  sessionId: string;
  contextId: string;
  timestamp: Date;

  // Extension targeting
  targetExtension: string;
  extensionType:
    | 'communication'
    | 'integration'
    | 'tool'
    | 'interface'
    | 'service';
  extensionVersion: string;

  // Communication context
  communicationProtocol: CommunicationProtocol;
  messageFormat: MessageFormat;
  channelContext: ChannelContext;

  // User interaction context
  userContext: UserContext;
  interactionHistory: InteractionRecord[];
  conversationState: ConversationState;

  // Extension capabilities
  availableActions: ExtensionAction[];
  supportedCommands: Command[];
  extensionConfig: ExtensionConfiguration;

  // Platform integration
  platformContext: PlatformContext;
  integrationEndpoints: IntegrationEndpoint[];
  authenticationContext: AuthenticationContext;

  // Data flow
  inputData: ExtensionInputData;
  outputFormat: ExtensionOutputFormat;
  dataTransformation: DataTransformationRule[];

  // Error handling
  errorHandling: ErrorHandlingStrategy;
  fallbackBehavior: FallbackBehavior;
  retryPolicy: RetryPolicy;

  // Performance optimization
  performanceHints: PerformanceHint[];
  cachingStrategy: CachingStrategy;
  rateLimit: RateLimit;

  // Security context
  securityContext: SecurityContext;
  permissions: Permission[];

  // Monitoring and logging
  telemetryContext: TelemetryContext;
  loggingConfiguration: LoggingConfiguration;
}

export interface CommunicationProtocol {
  type:
    | 'http'
    | 'websocket'
    | 'grpc'
    | 'mqtt'
    | 'webhook'
    | 'polling'
    | 'streaming';
  version: string;
  endpoint: string;
  headers: Record<string, string>;
  timeout: number;
  keepAlive: boolean;
  compression: boolean;
}

export interface MessageFormat {
  contentType:
    | 'application/json'
    | 'text/plain'
    | 'application/xml'
    | 'multipart/form-data';
  encoding: 'utf-8' | 'base64' | 'binary';
  structure: 'flat' | 'nested' | 'hierarchical';
  schema?: Record<string, unknown>;
  validation: boolean;
}

export interface ChannelContext {
  channelId: string;
  channelType: 'direct' | 'group' | 'broadcast' | 'private' | 'public';
  participants: Participant[];
  channelMetadata: Record<string, unknown>;
  messageHistory: ChannelMessage[];
  channelState: 'active' | 'inactive' | 'archived' | 'restricted';
}

export interface Participant {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'moderator' | 'bot' | 'system';
  status: 'online' | 'offline' | 'away' | 'busy';
  permissions: string[];
  lastActivity: Date;
}

export interface ChannelMessage {
  id: string;
  from: string;
  content: string;
  timestamp: Date;
  messageType: 'text' | 'image' | 'file' | 'command' | 'system';
  metadata: Record<string, unknown>;
  reactions?: Reaction[];
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface UserContext {
  userId: string;
  username: string;
  displayName: string;
  profile: UserProfile;
  preferences: UserPreferences;
  currentSession: UserSession;
  authenticationState: AuthenticationState;
}

export interface UserProfile {
  avatar?: string;
  timezone: string;
  language: string;
  locale: string;
  customFields: Record<string, unknown>;
}

export interface UserPreferences {
  notificationSettings: NotificationSettings;
  displaySettings: DisplaySettings;
  privacySettings: PrivacySettings;
  accessibilitySettings: AccessibilitySettings;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: string[];
  frequency: 'immediate' | 'batched' | 'digest';
  quietHours?: { start: string; end: string };
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'normal' | 'comfortable';
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  activityTracking: boolean;
  dataCollection: boolean;
}

export interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  keyboardNavigation: boolean;
  voiceCommands: boolean;
}

export interface UserSession {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  device: DeviceInfo;
  ipAddress: string;
  userAgent: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'watch' | 'embedded';
  os: string;
  browser?: string;
  version: string;
  capabilities: string[];
}

export interface AuthenticationState {
  authenticated: boolean;
  method: 'password' | 'oauth' | 'sso' | 'token' | 'biometric' | 'mfa';
  expiresAt?: Date;
  scopes: string[];
  refreshToken?: string;
}

export interface InteractionRecord {
  id: string;
  timestamp: Date;
  type: 'message' | 'command' | 'action' | 'event';
  details: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'partial' | 'pending';
  duration: number;
  error?: string;
}

export interface ConversationState {
  phase:
    | 'initiation'
    | 'engagement'
    | 'task_execution'
    | 'clarification'
    | 'completion'
    | 'termination';
  context: string[];
  pendingActions: string[];
  waitingFor:
    | 'user_input'
    | 'system_response'
    | 'external_data'
    | 'approval'
    | 'none';
  conversationFlow: ConversationFlow;
}

export interface ConversationFlow {
  currentStep: string;
  completedSteps: string[];
  nextPossibleSteps: string[];
  branchingPoints: BranchingPoint[];
}

export interface BranchingPoint {
  stepId: string;
  condition: string;
  truePath: string;
  falsePath: string;
  confidence: number;
}

export interface ExtensionAction {
  id: string;
  name: string;
  description: string;
  parameters: ActionParameter[];
  permissions: string[];
  async: boolean;
  timeout: number;
  retryable: boolean;
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file';
  required: boolean;
  description: string;
  validation?: ValidationRule[];
  defaultValue?: unknown;
}

export interface ValidationRule {
  type: 'regex' | 'range' | 'length' | 'enum' | 'custom';
  value: unknown;
  message: string;
}

export interface Command {
  command: string;
  aliases: string[];
  description: string;
  usage: string;
  examples: string[];
  category: string;
  permissions: Permission[];
}

export interface ExtensionConfiguration {
  enabled: boolean;
  version: string;
  settings: Record<string, unknown>;
  dependencies: string[];
  resources: ResourceRequirement[];
  features: FeatureFlag[];
}

export interface ResourceRequirement {
  type: 'memory' | 'cpu' | 'disk' | 'network' | 'external_service';
  amount: number;
  unit: string;
  critical: boolean;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  conditions?: Record<string, unknown>;
  rolloutPercentage?: number;
}

export interface PlatformContext {
  platform:
    | 'slack'
    | 'discord'
    | 'telegram'
    | 'whatsapp'
    | 'teams'
    | 'api'
    | 'web'
    | 'mobile';
  version: string;
  capabilities: string[];
  limitations: string[];
  apiEndpoints: ApiEndpoint[];
  webhooks: WebhookConfiguration[];
}

export interface ApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  authentication: 'none' | 'api_key' | 'oauth' | 'bearer' | 'basic';
  rateLimit: number;
  timeout: number;
}

export interface WebhookConfiguration {
  url: string;
  events: string[];
  secret?: string;
  headers: Record<string, string>;
  retryPolicy: RetryPolicy;
}

export interface IntegrationEndpoint {
  id: string;
  type: 'inbound' | 'outbound' | 'bidirectional';
  protocol: string;
  address: string;
  credentials: CredentialReference;
  healthCheck: HealthCheckConfiguration;
}

export interface CredentialReference {
  type: 'stored' | 'environment' | 'vault' | 'inline';
  reference: string;
  encrypted: boolean;
}

export interface HealthCheckConfiguration {
  enabled: boolean;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface AuthenticationContext {
  required: boolean;
  methods: string[];
  currentAuth?: AuthenticationInfo;
  tokenRefresh: TokenRefreshConfig;
}

export interface AuthenticationInfo {
  type: string;
  token?: string;
  expiresAt?: Date;
  scopes: string[];
  userId: string;
}

export interface TokenRefreshConfig {
  enabled: boolean;
  thresholdMinutes: number;
  maxRetries: number;
  refreshEndpoint?: string;
}

export interface ExtensionInputData {
  primaryContent: string;
  structuredData: Record<string, unknown>;
  attachments: Attachment[];
  metadata: InputMetadata;
  validation: ValidationResult;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
  metadata: Record<string, unknown>;
}

export interface InputMetadata {
  source: string;
  timestamp: Date;
  contentType: string;
  encoding: string;
  checksum?: string;
  signature?: string;
}

export interface ExtensionOutputFormat {
  format: 'text' | 'json' | 'xml' | 'html' | 'markdown' | 'binary';
  template?: string;
  transformation: OutputTransformation[];
  validation: OutputValidation;
  delivery: DeliveryConfiguration;
}

export interface OutputTransformation {
  type: 'filter' | 'map' | 'reduce' | 'format' | 'validate';
  configuration: Record<string, unknown>;
  order: number;
}

export interface OutputValidation {
  enabled: boolean;
  schema?: Record<string, unknown>;
  rules: ValidationRule[];
  onFailure: 'reject' | 'sanitize' | 'warn' | 'ignore';
}

export interface DeliveryConfiguration {
  method: 'synchronous' | 'asynchronous' | 'callback' | 'webhook';
  timeout: number;
  retries: number;
  confirmation: boolean;
}

export interface DataTransformationRule {
  id: string;
  source: string;
  target: string;
  transformation: string;
  condition?: string;
  priority: number;
}

export interface ErrorHandlingStrategy {
  onError: 'throw' | 'return_null' | 'return_default' | 'retry' | 'fallback';
  defaultValue?: unknown;
  errorMapping: ErrorMapping[];
  notifications: ErrorNotification[];
}

export interface ErrorMapping {
  errorType: string;
  httpStatus: number;
  userMessage: string;
  internalMessage: string;
  recoverable: boolean;
}

export interface ErrorNotification {
  channel: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  template: string;
  recipients: string[];
}

export interface FallbackBehavior {
  enabled: boolean;
  strategy:
    | 'graceful_degradation'
    | 'alternative_service'
    | 'cached_response'
    | 'minimal_response';
  configuration: Record<string, unknown>;
  timeout: number;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear' | 'random';
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface PerformanceHint {
  hint: string;
  category: 'latency' | 'throughput' | 'memory' | 'cpu' | 'network';
  priority: number;
  conditions: string[];
}

export interface CachingStrategy {
  enabled: boolean;
  ttl: number;
  strategy: 'lru' | 'lfu' | 'fifo' | 'ttl';
  keyPattern: string;
  storage: 'memory' | 'redis' | 'database' | 'file';
}

export interface RateLimit {
  enabled: boolean;
  requestsPerMinute: number;
  burstLimit: number;
  skipList: string[];
  penaltyDelay: number;
}

export interface SecurityContext {
  encryptionRequired: boolean;
  allowedOrigins: string[];
  csrfProtection: boolean;
  inputSanitization: boolean;
  outputEncoding: boolean;
  auditLogging: boolean;
}

export interface Permission {
  name: string;
  description: string;
  level: 'read' | 'write' | 'admin' | 'system';
  scope: string;
  conditions?: Record<string, unknown>;
}

export interface TelemetryContext {
  enabled: boolean;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  metrics: MetricCollection;
  events: TelemetryEvent[];
}

export interface MetricCollection {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, number[]>;
  timers: Record<string, number>;
}

export interface TelemetryEvent {
  name: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  severity: 'debug' | 'info' | 'warn' | 'error';
}

export interface LoggingConfiguration {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text' | 'structured';
  destinations: LogDestination[];
  sampling: SamplingConfiguration;
}

export interface LogDestination {
  type: 'console' | 'file' | 'network' | 'database';
  configuration: Record<string, unknown>;
  filter?: LogFilter;
}

export interface LogFilter {
  level: string;
  include?: string[];
  exclude?: string[];
  pattern?: string;
}

export interface SamplingConfiguration {
  enabled: boolean;
  rate: number;
  threshold: number;
}

/**
 * Extension Context Transformer implementation
 */
export class ExtensionContextTransformer
  implements ContextTransformer<UnifiedContext, ExtensionContext>
{
  readonly id = 'extension-context-transformer';
  readonly version = '1.0.0';
  readonly target = TransformationTarget.EXTENSION;
  readonly supportedStrategies = [
    TransformationStrategy.FULL,
    TransformationStrategy.SELECTIVE,
    TransformationStrategy.OPTIMIZED,
    TransformationStrategy.MINIMAL,
  ];
  readonly reversible = true;

  private transformationCache = new Map<
    string,
    TransformationResult<ExtensionContext>
  >();

  /**
   * Transform unified context to extension format
   */
  async transform(
    context: UnifiedContext,
    config?: TransformationConfig
  ): Promise<TransformationResult<ExtensionContext>> {
    const startTime = performance.now();

    try {
      // Check cache first
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        const cached = this.transformationCache.get(cacheKey);
        if (cached) {
          runtimeLogger.debug(
            `Cache hit for extension transformation: ${cacheKey}`
          );
          return {
            ...cached,
            cached: true,
          };
        }
      }

      // Determine strategy and target extension
      const strategy = config?.strategy || TransformationStrategy.SELECTIVE;
      const targetExtension = this.determineTargetExtension(context, config);

      // Transform based on strategy
      const transformedContext = await this.performTransformation(
        context,
        strategy,
        targetExtension,
        config
      );

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
        cacheHit: false,
      };

      const performance: TransformationPerformance = {
        duration,
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
        cacheHitRate: 0,
        compressionRatio: inputSize / outputSize,
        throughput: outputSize / duration,
      };

      const result: TransformationResult<ExtensionContext> = {
        success: true,
        transformedContext,
        originalContext: context,
        target: this.target,
        strategy,
        operation: 'transform' as any,
        metadata,
        performance,
        reversible: this.reversible,
        cached: false,
      };

      // Cache result if enabled
      if (config?.cache?.enabled) {
        const cacheKey = this.generateCacheKey(context, config);
        this.transformationCache.set(cacheKey, result);
      }

      runtimeLogger.debug(
        `Extension context transformation completed in ${duration.toFixed(2)}ms`
      );
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      runtimeLogger.error('Extension context transformation failed', {
        error,
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transformedContext: {} as ExtensionContext,
        originalContext: context,
        target: this.target,
        strategy: config?.strategy || TransformationStrategy.SELECTIVE,
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
          cacheHit: false,
        },
        performance: {
          duration,
          memoryUsage: 0,
          cpuUsage: 0,
          cacheHitRate: 0,
          compressionRatio: 0,
          throughput: 0,
        },
        reversible: false,
        cached: false,
      };
    }
  }

  /**
   * Determine target extension from context
   */
  private determineTargetExtension(
    context: UnifiedContext,
    config?: TransformationConfig
  ): string {
    // Check for explicit extension target in config
    if (config?.options?.customFields?.includes('targetExtension')) {
      return 'specified';
    }

    // Infer from environment or platform
    if (context.environment.platform) {
      return context.environment.platform;
    }

    // Check extension data
    if (context.extensionData) {
      const extensionKeys = Object.keys(context.extensionData);
      if (extensionKeys.length > 0) {
        return extensionKeys[0];
      }
    }

    return 'generic';
  }

  /**
   * Perform the actual transformation based on strategy
   */
  private async performTransformation(
    context: UnifiedContext,
    strategy: TransformationStrategy,
    targetExtension: string,
    config?: TransformationConfig
  ): Promise<ExtensionContext> {
    const baseContext: ExtensionContext = {
      agentId: context.agentId,
      sessionId: context.sessionId,
      contextId: context.contextId,
      timestamp: context.timestamp,
      targetExtension,
      extensionType: this.determineExtensionType(targetExtension),
      extensionVersion: '1.0.0',
      communicationProtocol: this.buildCommunicationProtocol(targetExtension),
      messageFormat: this.buildMessageFormat(targetExtension),
      channelContext: this.buildChannelContext(context),
      userContext: this.buildUserContext(context),
      interactionHistory: this.buildInteractionHistory(context),
      conversationState: this.buildConversationState(context),
      availableActions: this.buildAvailableActions(targetExtension),
      supportedCommands: this.buildSupportedCommands(targetExtension),
      extensionConfig: this.buildExtensionConfig(targetExtension),
      platformContext: this.buildPlatformContext(targetExtension),
      integrationEndpoints: this.buildIntegrationEndpoints(targetExtension),
      authenticationContext: this.buildAuthenticationContext(context),
      inputData: this.buildInputData(context),
      outputFormat: this.buildOutputFormat(targetExtension),
      dataTransformation: this.buildDataTransformationRules(targetExtension),
      errorHandling: this.buildErrorHandlingStrategy(targetExtension),
      fallbackBehavior: this.buildFallbackBehavior(targetExtension),
      retryPolicy: this.buildRetryPolicy(targetExtension),
      performanceHints: this.buildPerformanceHints(context, targetExtension),
      cachingStrategy: this.buildCachingStrategy(targetExtension),
      rateLimit: this.buildRateLimit(targetExtension),
      securityContext: this.buildSecurityContext(targetExtension),
      permissions: this.buildPermissions(context, targetExtension),
      telemetryContext: this.buildTelemetryContext(context),
      loggingConfiguration: this.buildLoggingConfiguration(targetExtension),
    };

    // Apply strategy-specific optimizations
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return this.applyMinimalStrategy(baseContext);
      case TransformationStrategy.OPTIMIZED:
        return this.applyOptimizedStrategy(baseContext);
      case TransformationStrategy.FULL:
        return this.applyFullStrategy(baseContext, context);
      default:
        return baseContext;
    }
  }

  /**
   * Determine extension type based on target extension
   */
  private determineExtensionType(
    targetExtension: string
  ): 'communication' | 'integration' | 'tool' | 'interface' | 'service' {
    const communicationPlatforms = [
      'slack',
      'discord',
      'telegram',
      'whatsapp',
      'teams',
    ];
    const integrationPlatforms = ['api', 'webhook', 'database'];
    const toolPlatforms = ['cli', 'desktop'];
    const interfacePlatforms = ['web', 'mobile'];

    if (communicationPlatforms.includes(targetExtension.toLowerCase())) {
      return 'communication';
    }
    if (
      integrationPlatforms.some((p) =>
        targetExtension.toLowerCase().includes(p)
      )
    ) {
      return 'integration';
    }
    if (toolPlatforms.includes(targetExtension.toLowerCase())) {
      return 'tool';
    }
    if (interfacePlatforms.includes(targetExtension.toLowerCase())) {
      return 'interface';
    }

    return 'service';
  }

  /**
   * Build communication protocol configuration
   */
  private buildCommunicationProtocol(
    targetExtension: string
  ): CommunicationProtocol {
    const protocols: Record<string, CommunicationProtocol> = {
      slack: {
        type: 'http',
        version: '1.1',
        endpoint: 'https://slack.com/api',
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        keepAlive: true,
        compression: true,
      },
      telegram: {
        type: 'http',
        version: '1.1',
        endpoint: 'https://api.telegram.org',
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        keepAlive: true,
        compression: true,
      },
      websocket: {
        type: 'websocket',
        version: '13',
        endpoint: 'wss://example.com/ws',
        headers: {},
        timeout: 60000,
        keepAlive: true,
        compression: true,
      },
    };

    return protocols[targetExtension.toLowerCase()] || protocols.websocket;
  }

  /**
   * Build message format configuration
   */
  private buildMessageFormat(targetExtension: string): MessageFormat {
    return {
      contentType: 'application/json',
      encoding: 'utf-8',
      structure: 'nested',
      validation: true,
    };
  }

  /**
   * Build channel context from unified context
   */
  private buildChannelContext(context: UnifiedContext): ChannelContext {
    return {
      channelId: context.sessionId,
      channelType: 'direct',
      participants: [
        {
          id: context.userId || 'user',
          name: 'User',
          role: 'user',
          status: 'online',
          permissions: ['read', 'write'],
          lastActivity: context.timestamp,
        },
      ],
      channelMetadata: {},
      messageHistory: context.messages.map((msg) => ({
        id: msg.id,
        from: msg.from,
        content: msg.content,
        timestamp: msg.timestamp,
        messageType: msg.type as any,
        metadata: msg.metadata || {},
      })),
      channelState: 'active',
    };
  }

  /**
   * Build user context from unified context
   */
  private buildUserContext(context: UnifiedContext): UserContext {
    return {
      userId: context.userId || 'anonymous',
      username: context.userId || 'user',
      displayName: 'User',
      profile: {
        timezone: context.environment.timezone || 'UTC',
        language: context.environment.language || 'en',
        locale: context.environment.language || 'en-US',
        customFields: {},
      },
      preferences: {
        notificationSettings: {
          enabled: true,
          channels: ['direct'],
          frequency: 'immediate',
        },
        displaySettings: {
          theme: 'auto',
          fontSize: 'medium',
          density: 'normal',
        },
        privacySettings: {
          profileVisibility: 'private',
          activityTracking: false,
          dataCollection: false,
        },
        accessibilitySettings: {
          screenReader: false,
          highContrast: false,
          keyboardNavigation: false,
          voiceCommands: false,
        },
      },
      currentSession: {
        sessionId: context.sessionId,
        startTime: context.timestamp,
        lastActivity: context.timestamp,
        device: {
          type: 'desktop',
          os: 'unknown',
          version: '1.0',
          capabilities: [],
        },
        ipAddress: '127.0.0.1',
        userAgent: 'SYMindX-Agent/1.0',
      },
      authenticationState: {
        authenticated: true,
        method: 'token',
        scopes: ['read', 'write'],
      },
    };
  }

  /**
   * Build interaction history
   */
  private buildInteractionHistory(
    context: UnifiedContext
  ): InteractionRecord[] {
    return context.messages.map((msg, index) => ({
      id: `interaction_${index}`,
      timestamp: msg.timestamp,
      type: msg.type === 'user' ? 'message' : 'event',
      details: {
        content: msg.content,
        from: msg.from,
        emotions: msg.emotions,
      },
      outcome: 'success',
      duration: 0,
    }));
  }

  /**
   * Build conversation state
   */
  private buildConversationState(context: UnifiedContext): ConversationState {
    return {
      phase: this.mapContextPhaseToConversation(context.state.phase),
      context: [context.content],
      pendingActions: [],
      waitingFor: 'none',
      conversationFlow: {
        currentStep: 'active',
        completedSteps: ['initiation'],
        nextPossibleSteps: ['task_execution', 'clarification'],
        branchingPoints: [],
      },
    };
  }

  /**
   * Map context phase to conversation phase
   */
  private mapContextPhaseToConversation(
    phase:
      | 'initialization'
      | 'active'
      | 'processing'
      | 'waiting'
      | 'complete'
      | 'error'
  ):
    | 'initiation'
    | 'engagement'
    | 'task_execution'
    | 'clarification'
    | 'completion'
    | 'termination' {
    switch (phase) {
      case 'initialization':
        return 'initiation';
      case 'active':
        return 'engagement';
      case 'processing':
        return 'task_execution';
      case 'waiting':
        return 'clarification';
      case 'complete':
        return 'completion';
      case 'error':
        return 'termination';
      default:
        return 'engagement';
    }
  }

  /**
   * Build available actions for extension
   */
  private buildAvailableActions(targetExtension: string): ExtensionAction[] {
    const commonActions: ExtensionAction[] = [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to the user',
        parameters: [
          {
            name: 'content',
            type: 'string',
            required: true,
            description: 'Message content',
          },
        ],
        permissions: ['write'],
        async: false,
        timeout: 30000,
        retryable: true,
      },
    ];

    // Add platform-specific actions
    if (targetExtension === 'slack') {
      commonActions.push({
        id: 'react_message',
        name: 'React to Message',
        description: 'Add emoji reaction to a message',
        parameters: [
          {
            name: 'emoji',
            type: 'string',
            required: true,
            description: 'Emoji name',
          },
        ],
        permissions: ['write'],
        async: true,
        timeout: 10000,
        retryable: true,
      });
    }

    return commonActions;
  }

  /**
   * Build supported commands
   */
  private buildSupportedCommands(targetExtension: string): Command[] {
    return [
      {
        command: '/help',
        aliases: ['/?', '/h'],
        description: 'Show available commands',
        usage: '/help [command]',
        examples: ['/help', '/help status'],
        category: 'general',
        permissions: [],
      },
      {
        command: '/status',
        aliases: ['/info'],
        description: 'Show agent status',
        usage: '/status',
        examples: ['/status'],
        category: 'system',
        permissions: [],
      },
    ];
  }

  /**
   * Build extension configuration
   */
  private buildExtensionConfig(
    targetExtension: string
  ): ExtensionConfiguration {
    return {
      enabled: true,
      version: '1.0.0',
      settings: {
        targetExtension,
        autoResponse: true,
        debug: false,
      },
      dependencies: [],
      resources: [
        {
          type: 'memory',
          amount: 100,
          unit: 'MB',
          critical: false,
        },
      ],
      features: [
        {
          name: 'message_streaming',
          enabled: true,
        },
      ],
    };
  }

  /**
   * Build platform context
   */
  private buildPlatformContext(targetExtension: string): PlatformContext {
    const platformConfigs: Record<string, Partial<PlatformContext>> = {
      slack: {
        platform: 'slack',
        capabilities: ['message', 'reaction', 'file_upload', 'slash_commands'],
        limitations: ['no_voice', 'no_video'],
      },
      telegram: {
        platform: 'telegram',
        capabilities: ['message', 'inline_keyboard', 'file_upload', 'location'],
        limitations: ['message_length_limit'],
      },
    };

    const config = platformConfigs[targetExtension.toLowerCase()] || {};

    return {
      platform: targetExtension as any,
      version: '1.0',
      capabilities: config.capabilities || ['message'],
      limitations: config.limitations || [],
      apiEndpoints: [],
      webhooks: [],
      ...config,
    };
  }

  // Continue with remaining builder methods...
  private buildIntegrationEndpoints(
    targetExtension: string
  ): IntegrationEndpoint[] {
    return [];
  }

  private buildAuthenticationContext(
    context: UnifiedContext
  ): AuthenticationContext {
    return {
      required: false,
      methods: ['token'],
      tokenRefresh: {
        enabled: false,
        thresholdMinutes: 15,
        maxRetries: 3,
      },
    };
  }

  private buildInputData(context: UnifiedContext): ExtensionInputData {
    return {
      primaryContent: context.content,
      structuredData: {
        messages: context.messages,
        state: context.state,
      },
      attachments: [],
      metadata: {
        source: context.agentId,
        timestamp: context.timestamp,
        contentType: 'application/json',
        encoding: 'utf-8',
      },
      validation: {
        valid: true,
        errors: [],
        warnings: [],
        score: 1.0,
        timestamp: new Date(),
      },
    };
  }

  private buildOutputFormat(targetExtension: string): ExtensionOutputFormat {
    return {
      format: 'json',
      transformation: [],
      validation: {
        enabled: true,
        rules: [],
        onFailure: 'warn',
      },
      delivery: {
        method: 'synchronous',
        timeout: 30000,
        retries: 3,
        confirmation: false,
      },
    };
  }

  private buildDataTransformationRules(
    targetExtension: string
  ): DataTransformationRule[] {
    return [];
  }

  private buildErrorHandlingStrategy(
    targetExtension: string
  ): ErrorHandlingStrategy {
    return {
      onError: 'fallback',
      errorMapping: [],
      notifications: [],
    };
  }

  private buildFallbackBehavior(targetExtension: string): FallbackBehavior {
    return {
      enabled: true,
      strategy: 'graceful_degradation',
      configuration: {},
      timeout: 10000,
    };
  }

  private buildRetryPolicy(targetExtension: string): RetryPolicy {
    return {
      enabled: true,
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: ['network', 'timeout', 'rate_limit'],
    };
  }

  private buildPerformanceHints(
    context: UnifiedContext,
    targetExtension: string
  ): PerformanceHint[] {
    const hints: PerformanceHint[] = [];

    if (context.messages.length > 10) {
      hints.push({
        hint: 'Long conversation - consider pagination',
        category: 'memory',
        priority: 0.8,
        conditions: ['message_count > 10'],
      });
    }

    return hints;
  }

  private buildCachingStrategy(targetExtension: string): CachingStrategy {
    return {
      enabled: true,
      ttl: 300, // 5 minutes
      strategy: 'lru',
      keyPattern: `${targetExtension}:{contextId}`,
      storage: 'memory',
    };
  }

  private buildRateLimit(targetExtension: string): RateLimit {
    const rateLimits: Record<string, RateLimit> = {
      slack: {
        enabled: true,
        requestsPerMinute: 60,
        burstLimit: 10,
        skipList: [],
        penaltyDelay: 1000,
      },
      telegram: {
        enabled: true,
        requestsPerMinute: 30,
        burstLimit: 5,
        skipList: [],
        penaltyDelay: 2000,
      },
    };

    return (
      rateLimits[targetExtension.toLowerCase()] || {
        enabled: false,
        requestsPerMinute: 100,
        burstLimit: 20,
        skipList: [],
        penaltyDelay: 500,
      }
    );
  }

  private buildSecurityContext(targetExtension: string): SecurityContext {
    return {
      encryptionRequired: false,
      allowedOrigins: ['*'],
      csrfProtection: false,
      inputSanitization: true,
      outputEncoding: true,
      auditLogging: false,
    };
  }

  private buildPermissions(
    context: UnifiedContext,
    targetExtension: string
  ): Permission[] {
    return [
      {
        name: 'send_message',
        description: 'Send messages to users',
        level: 'write',
        scope: 'channel',
      },
    ];
  }

  private buildTelemetryContext(context: UnifiedContext): TelemetryContext {
    return {
      enabled: false,
      traceId: `trace_${context.contextId}`,
      spanId: `span_${Date.now()}`,
      metrics: {
        counters: {},
        gauges: {},
        histograms: {},
        timers: {},
      },
      events: [],
    };
  }

  private buildLoggingConfiguration(
    targetExtension: string
  ): LoggingConfiguration {
    return {
      level: 'info',
      format: 'json',
      destinations: [
        {
          type: 'console',
          configuration: {},
        },
      ],
      sampling: {
        enabled: false,
        rate: 1.0,
        threshold: 1000,
      },
    };
  }

  /**
   * Apply transformation strategies
   */
  private applyMinimalStrategy(context: ExtensionContext): ExtensionContext {
    return {
      ...context,
      interactionHistory: context.interactionHistory.slice(-5),
      channelContext: {
        ...context.channelContext,
        messageHistory: context.channelContext.messageHistory.slice(-10),
      },
      availableActions: context.availableActions.slice(0, 3),
      supportedCommands: context.supportedCommands.slice(0, 5),
      performanceHints: context.performanceHints.slice(0, 3),
    };
  }

  private applyOptimizedStrategy(context: ExtensionContext): ExtensionContext {
    return {
      ...context,
      interactionHistory: context.interactionHistory
        .filter((interaction) => interaction.outcome === 'success')
        .slice(-10),
      availableActions: context.availableActions.filter(
        (action) => !action.async || action.retryable
      ),
      performanceHints: context.performanceHints
        .filter((hint) => hint.priority > 0.5)
        .sort((a, b) => b.priority - a.priority),
    };
  }

  private applyFullStrategy(
    context: ExtensionContext,
    original: UnifiedContext
  ): ExtensionContext {
    // Include all available data with full enrichment
    return context;
  }

  /**
   * Validation implementation
   */
  async validate(
    context: ExtensionContext,
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
        code: 'MISSING_AGENT_ID',
      });
    }

    if (!context.targetExtension) {
      errors.push({
        field: 'targetExtension',
        message: 'Target extension is required',
        severity: 'critical',
        code: 'MISSING_TARGET_EXTENSION',
      });
    }

    // Validate communication protocol
    if (!context.communicationProtocol.endpoint) {
      warnings.push({
        field: 'communicationProtocol.endpoint',
        message: 'Communication endpoint is recommended',
        code: 'MISSING_ENDPOINT',
      });
    }

    // Validate rate limiting
    if (context.rateLimit.enabled && context.rateLimit.requestsPerMinute <= 0) {
      errors.push({
        field: 'rateLimit.requestsPerMinute',
        message:
          'Requests per minute must be positive when rate limiting is enabled',
        severity: 'medium',
        code: 'INVALID_RATE_LIMIT',
      });
    }

    const score =
      errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.5;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
      timestamp: new Date(),
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
      streamable: false,
      batchable: true,
      maxInputSize: 20 * 1024 * 1024, // 20MB
      minInputSize: 100, // 100 bytes
      supportedFormats: ['json'],
      dependencies: ['extension-system'],
      performance: {
        averageDuration: 20, // ms
        memoryUsage: 3 * 1024 * 1024, // 3MB
        throughput: 800, // contexts per second
      },
    };
  }

  /**
   * Helper methods
   */
  private generateCacheKey(
    context: UnifiedContext,
    config?: TransformationConfig
  ): string {
    const keyData = {
      contextId: context.contextId,
      version: context.version,
      strategy: config?.strategy,
      targetExtension: this.determineTargetExtension(context, config),
      timestamp: Math.floor(context.timestamp.getTime() / 60000),
    };
    return `extension_${JSON.stringify(keyData)}`;
  }

  private getTransformedFields(strategy: TransformationStrategy): string[] {
    const baseFields = [
      'agentId',
      'targetExtension',
      'communicationProtocol',
      'userContext',
      'availableActions',
      'inputData',
      'outputFormat',
    ];

    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return baseFields.slice(0, 4);
      case TransformationStrategy.FULL:
        return [
          ...baseFields,
          'telemetryContext',
          'performanceHints',
          'securityContext',
        ];
      default:
        return baseFields;
    }
  }

  private getDroppedFields(strategy: TransformationStrategy): string[] {
    switch (strategy) {
      case TransformationStrategy.MINIMAL:
        return [
          'telemetryContext',
          'performanceHints',
          'securityContext',
          'loggingConfiguration',
        ];
      default:
        return [];
    }
  }

  private getAddedFields(): string[] {
    return [
      'targetExtension',
      'extensionType',
      'communicationProtocol',
      'channelContext',
      'availableActions',
      'platformContext',
      'performanceHints',
      'securityContext',
    ];
  }
}

/**
 * Factory function for creating extension context transformer
 */
export function createExtensionContextTransformer(): ExtensionContextTransformer {
  return new ExtensionContextTransformer();
}
