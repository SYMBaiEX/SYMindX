/**
 * @module observability/integration-example
 * @description Complete integration example showing how to integrate
 * the observability system with existing SYMindX components
 */

import { ObservabilityManager } from './observability-manager.js';
import { 
  withObservability, 
  traceAgentOperation, 
  tracePortalOperation,
  traceExtensionOperation,
  traceMemoryOperation,
  createObservabilityLogContext,
  createPerformanceMiddleware,
  createSecurityMiddleware 
} from './utils.js';
import { DEFAULT_OBSERVABILITY_CONFIG } from './constants.js';
import { runtimeLogger } from '../../utils/logger.js';

/**
 * Enhanced Agent class with observability integration
 */
class ObservableAgent {
  constructor(
    public id: string,
    public name: string,
    private observability: ObservabilityManager
  ) {
    // Register agent health check
    this.registerHealthCheck();
  }

  /**
   * Agent thinking with full observability
   */
  @withObservability({
    operationName: 'agent.think',
    includeArgs: false, // Don't log sensitive thought context
    includeResult: false, // Don't log thought results
  })
  async think(context: any, parentContext?: any): Promise<any> {
    return traceAgentOperation(
      this.id,
      'think',
      async (traceContext) => {
        const startTime = performance.now();

        // Record thinking start event
        this.observability.recordEvent({
          type: 'agent',
          agentId: this.id,
          operation: 'think',
          status: 'started',
          metadata: {
            contextType: context.type || 'general',
            complexity: context.complexity || 'medium',
            agentName: this.name,
          },
        });

        try {
          // Simulate thinking process
          const thoughts = await this.performThinking(context, traceContext);
          const duration = performance.now() - startTime;

          // Record successful thinking
          this.observability.recordEvent({
            type: 'agent',
            agentId: this.id,
            operation: 'think',
            status: 'completed',
            duration,
            metadata: {
              thoughtCount: thoughts.length,
              confidence: thoughts.confidence || 0.8,
              tokensUsed: thoughts.tokensUsed || 0,
              agentName: this.name,
            },
          });

          // Enhanced logging with observability context
          runtimeLogger.info('Agent thinking completed', 
            createObservabilityLogContext(traceContext, {
              agentId: this.id,
              agentName: this.name,
              operation: 'think',
              duration,
              thoughtCount: thoughts.length,
              confidence: thoughts.confidence,
            })
          );

          return thoughts;
        } catch (error) {
          const duration = performance.now() - startTime;

          // Record thinking failure
          this.observability.recordEvent({
            type: 'agent',
            agentId: this.id,
            operation: 'think',
            status: 'failed',
            duration,
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              errorType: error instanceof Error ? error.constructor.name : 'Unknown',
              agentName: this.name,
            },
          });

          // Enhanced error logging
          runtimeLogger.error('Agent thinking failed', 
            error as Error,
            createObservabilityLogContext(traceContext, {
              agentId: this.id,
              agentName: this.name,
              operation: 'think',
              duration,
              failed: true,
            })
          );

          throw error;
        }
      },
      parentContext
    );
  }

  /**
   * Agent action execution with observability
   */
  @withObservability({
    operationName: 'agent.act',
    includeArgs: true,
    includeResult: true,
  })
  async act(action: any, parentContext?: any): Promise<any> {
    return traceAgentOperation(
      this.id,
      'act',
      async (traceContext) => {
        const startTime = performance.now();

        this.observability.recordEvent({
          type: 'agent',
          agentId: this.id,
          operation: 'act',
          status: 'started',
          metadata: {
            actionType: action.type,
            actionId: action.id,
            agentName: this.name,
          },
        });

        try {
          const result = await this.executeAction(action, traceContext);
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'agent',
            agentId: this.id,
            operation: 'act',
            status: 'completed',
            duration,
            metadata: {
              actionType: action.type,
              actionId: action.id,
              resultType: typeof result,
              success: true,
              agentName: this.name,
            },
          });

          return result;
        } catch (error) {
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'agent',
            agentId: this.id,
            operation: 'act',
            status: 'failed',
            duration,
            metadata: {
              actionType: action.type,
              actionId: action.id,
              error: error instanceof Error ? error.message : String(error),
              agentName: this.name,
            },
          });

          throw error;
        }
      },
      parentContext
    );
  }

  /**
   * Private methods
   */
  private async performThinking(context: any, traceContext: any): Promise<any> {
    // Simulate complex thinking with trace events
    this.observability.tracingSystem.addTraceEvent(traceContext, 'thinking.start', {
      contextAnalysis: 'completed',
    });

    // Simulate different thinking phases
    await this.analyzeContext(context, traceContext);
    await this.generateOptions(context, traceContext);
    const decision = await this.makeDecision(context, traceContext);

    this.observability.tracingSystem.addTraceEvent(traceContext, 'thinking.complete', {
      decision: decision.type,
      confidence: decision.confidence,
    });

    return {
      thoughts: ['analyzed context', 'generated options', 'made decision'],
      confidence: decision.confidence,
      tokensUsed: Math.floor(Math.random() * 100) + 50,
      length: 3,
    };
  }

  private async analyzeContext(context: any, traceContext: any): Promise<void> {
    // Simulate context analysis
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    this.observability.tracingSystem.addTraceEvent(traceContext, 'context.analyzed', {
      complexity: context.complexity || 'medium',
      elements: Math.floor(Math.random() * 10) + 1,
    });
  }

  private async generateOptions(context: any, traceContext: any): Promise<void> {
    // Simulate option generation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 75));
    
    this.observability.tracingSystem.addTraceEvent(traceContext, 'options.generated', {
      optionCount: Math.floor(Math.random() * 5) + 2,
    });
  }

  private async makeDecision(context: any, traceContext: any): Promise<any> {
    // Simulate decision making
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 25));
    
    const decision = {
      type: 'execute',
      confidence: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
    };

    this.observability.tracingSystem.addTraceEvent(traceContext, 'decision.made', {
      decisionType: decision.type,
      confidence: decision.confidence,
    });

    return decision;
  }

  private async executeAction(action: any, traceContext: any): Promise<any> {
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    this.observability.tracingSystem.addTraceEvent(traceContext, 'action.executed', {
      actionType: action.type,
      duration: Math.random() * 200 + 100,
    });

    // Randomly simulate failures for demonstration
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Action execution failed: ${action.type}`);
    }

    return {
      success: true,
      result: `Action ${action.type} completed successfully`,
      timestamp: new Date(),
    };
  }

  private registerHealthCheck(): void {
    // This would integrate with the existing health monitor
    console.log(`Health check registered for agent: ${this.id}`);
  }
}

/**
 * Enhanced Portal class with observability integration
 */
class ObservablePortal {
  constructor(
    public id: string,
    public name: string,
    public type: string,
    private observability: ObservabilityManager
  ) {}

  @withObservability({
    operationName: 'portal.generate_response',
    includeArgs: false, // Don't log message content
    includeResult: false, // Don't log response content
  })
  async generateResponse(
    messages: any[], 
    model?: string, 
    parentContext?: any
  ): Promise<any> {
    return tracePortalOperation(
      this.id,
      'generate_response',
      model,
      async (traceContext) => {
        const startTime = performance.now();

        this.observability.recordEvent({
          type: 'portal',
          portalId: this.id,
          operation: 'request',
          model,
          metadata: {
            messageCount: messages.length,
            portalType: this.type,
            portalName: this.name,
          },
        });

        try {
          const response = await this.callLLM(messages, model, traceContext);
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'portal',
            portalId: this.id,
            operation: 'response',
            model,
            tokens: response.usage?.totalTokens || 0,
            duration,
            metadata: {
              messageCount: messages.length,
              responseLength: response.content?.length || 0,
              tokensUsed: response.usage?.totalTokens || 0,
              portalType: this.type,
              portalName: this.name,
            },
          });

          runtimeLogger.info('Portal response generated',
            createObservabilityLogContext(traceContext, {
              portalId: this.id,
              portalName: this.name,
              portalType: this.type,
              model: model || 'default',
              duration,
              tokensUsed: response.usage?.totalTokens || 0,
              messageCount: messages.length,
            })
          );

          return response;
        } catch (error) {
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'portal',
            portalId: this.id,
            operation: 'error',
            model,
            duration,
            metadata: {
              error: error instanceof Error ? error.message : String(error),
              errorType: error instanceof Error ? error.constructor.name : 'Unknown',
              messageCount: messages.length,
              portalType: this.type,
              portalName: this.name,
            },
          });

          runtimeLogger.error('Portal request failed',
            error as Error,
            createObservabilityLogContext(traceContext, {
              portalId: this.id,
              portalName: this.name,
              portalType: this.type,
              model: model || 'default',
              duration,
              messageCount: messages.length,
              failed: true,
            })
          );

          throw error;
        }
      },
      parentContext
    );
  }

  private async callLLM(messages: any[], model?: string, traceContext?: any): Promise<any> {
    // Simulate LLM API call
    this.observability.tracingSystem.addTraceEvent(traceContext, 'llm.request_start', {
      model: model || 'default',
      messageCount: messages.length,
    });

    // Simulate network latency and processing time
    const processingTime = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Simulate random failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('LLM API request failed');
    }

    const response = {
      content: `Generated response for ${messages.length} messages`,
      usage: {
        promptTokens: Math.floor(Math.random() * 100) + 50,
        completionTokens: Math.floor(Math.random() * 200) + 100,
        totalTokens: 0,
      },
    };

    response.usage.totalTokens = response.usage.promptTokens + response.usage.completionTokens;

    this.observability.tracingSystem.addTraceEvent(traceContext, 'llm.response_received', {
      model: model || 'default',
      tokensUsed: response.usage.totalTokens,
      responseLength: response.content.length,
      processingTime,
    });

    return response;
  }
}

/**
 * Enhanced Extension class with observability integration
 */
class ObservableExtension {
  constructor(
    public id: string,
    public name: string,
    public type: string,
    private observability: ObservabilityManager
  ) {}

  @withObservability({
    operationName: 'extension.handle_message',
    includeArgs: true,
    includeResult: false,
  })
  async handleMessage(message: any, parentContext?: any): Promise<void> {
    return traceExtensionOperation(
      this.id,
      'handle_message',
      async (traceContext) => {
        const startTime = performance.now();

        this.observability.recordEvent({
          type: 'extension',
          extensionId: this.id,
          operation: 'message',
          status: 'started',
          metadata: {
            messageType: message.type,
            channel: message.channel,
            extensionType: this.type,
            extensionName: this.name,
          },
        });

        try {
          await this.processMessage(message, traceContext);
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'extension',
            extensionId: this.id,
            operation: 'message',
            status: 'completed',
            duration,
            metadata: {
              messageType: message.type,
              channel: message.channel,
              processed: true,
              extensionType: this.type,
              extensionName: this.name,
            },
          });

          runtimeLogger.info('Extension message processed',
            createObservabilityLogContext(traceContext, {
              extensionId: this.id,
              extensionName: this.name,
              extensionType: this.type,
              messageType: message.type,
              channel: message.channel,
              duration,
            })
          );
        } catch (error) {
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'extension',
            extensionId: this.id,
            operation: 'message',
            status: 'failed',
            duration,
            metadata: {
              messageType: message.type,
              channel: message.channel,
              error: error instanceof Error ? error.message : String(error),
              extensionType: this.type,
              extensionName: this.name,
            },
          });

          runtimeLogger.error('Extension message processing failed',
            error as Error,
            createObservabilityLogContext(traceContext, {
              extensionId: this.id,
              extensionName: this.name,
              extensionType: this.type,
              messageType: message.type,
              duration,
              failed: true,
            })
          );

          throw error;
        }
      },
      parentContext
    );
  }

  private async processMessage(message: any, traceContext: any): Promise<void> {
    // Simulate message processing
    this.observability.tracingSystem.addTraceEvent(traceContext, 'message.processing.start', {
      messageType: message.type,
      channel: message.channel,
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));

    // Simulate random failures
    if (Math.random() < 0.08) { // 8% failure rate
      throw new Error(`Failed to process ${message.type} message`);
    }

    this.observability.tracingSystem.addTraceEvent(traceContext, 'message.processing.complete', {
      messageType: message.type,
      processed: true,
    });
  }
}

/**
 * Enhanced Memory Provider class with observability integration
 */
class ObservableMemoryProvider {
  constructor(
    public id: string,
    public type: string,
    private observability: ObservabilityManager
  ) {}

  @withObservability({
    operationName: 'memory.store',
    includeArgs: false, // Don't log memory content
    includeResult: false,
  })
  async store(record: any, parentContext?: any): Promise<void> {
    return traceMemoryOperation(
      this.id,
      'store',
      async (traceContext) => {
        const startTime = performance.now();

        this.observability.recordEvent({
          type: 'memory',
          providerId: this.id,
          operation: 'store',
          metadata: {
            recordType: record.type,
            recordSize: JSON.stringify(record).length,
            providerType: this.type,
          },
        });

        try {
          await this.performStore(record, traceContext);
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'memory',
            providerId: this.id,
            operation: 'store',
            duration,
            metadata: {
              recordType: record.type,
              recordSize: JSON.stringify(record).length,
              success: true,
              providerType: this.type,
            },
          });

          runtimeLogger.info('Memory record stored',
            createObservabilityLogContext(traceContext, {
              providerId: this.id,
              providerType: this.type,
              operation: 'store',
              recordType: record.type,
              recordSize: JSON.stringify(record).length,
              duration,
            })
          );
        } catch (error) {
          const duration = performance.now() - startTime;

          this.observability.recordEvent({
            type: 'memory',
            providerId: this.id,
            operation: 'store',
            duration,
            metadata: {
              recordType: record.type,
              recordSize: JSON.stringify(record).length,
              error: error instanceof Error ? error.message : String(error),
              providerType: this.type,
            },
          });

          runtimeLogger.error('Memory store operation failed',
            error as Error,
            createObservabilityLogContext(traceContext, {
              providerId: this.id,
              providerType: this.type,
              operation: 'store',
              recordType: record.type,
              duration,
              failed: true,
            })
          );

          throw error;
        }
      },
      parentContext
    );
  }

  private async performStore(record: any, traceContext: any): Promise<void> {
    // Simulate database operation
    this.observability.tracingSystem.addTraceEvent(traceContext, 'db.connection.start', {
      provider: this.type,
    });

    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));

    // Simulate random failures
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error(`Database storage failed for ${this.type} provider`);
    }

    this.observability.tracingSystem.addTraceEvent(traceContext, 'db.record.stored', {
      recordType: record.type,
      provider: this.type,
    });
  }
}

/**
 * Complete integration example demonstrating the observability system
 */
export class ObservabilityIntegrationExample {
  private observability: ObservabilityManager;
  private agent: ObservableAgent;
  private portal: ObservablePortal;
  private extension: ObservableExtension;
  private memoryProvider: ObservableMemoryProvider;

  constructor() {
    // Initialize observability system with custom configuration
    this.observability = ObservabilityManager.getInstance({
      ...DEFAULT_OBSERVABILITY_CONFIG,
      tracing: {
        ...DEFAULT_OBSERVABILITY_CONFIG.tracing,
        sampleRate: 1.0, // 100% sampling for example
        enableSpanDebugging: true,
      },
      metrics: {
        ...DEFAULT_OBSERVABILITY_CONFIG.metrics,
        collectionIntervalMs: 1000, // 1 second for demo
      },
    });

    // Register middleware
    this.setupMiddleware();

    // Initialize components
    this.agent = new ObservableAgent('agent-001', 'Demo Agent', this.observability);
    this.portal = new ObservablePortal('portal-001', 'Demo Portal', 'openai', this.observability);
    this.extension = new ObservableExtension('ext-001', 'Demo Extension', 'slack', this.observability);
    this.memoryProvider = new ObservableMemoryProvider('memory-001', 'sqlite', this.observability);

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup middleware for cross-cutting concerns
   */
  private setupMiddleware(): void {
    // Performance monitoring middleware
    this.observability.registerMiddleware(createPerformanceMiddleware({
      slowRequestMs: 1000,
      memoryWarningMb: 50,
    }));

    // Security monitoring middleware
    this.observability.registerMiddleware(createSecurityMiddleware());
  }

  /**
   * Setup event handlers for observability events
   */
  private setupEventHandlers(): void {
    this.observability.on('eventRecorded', (data) => {
      console.log('📊 Event recorded:', data.event.type, data.event.operation);
    });

    this.observability.on('alertTriggered', (alert) => {
      console.log('🚨 Alert triggered:', alert.rule.name, alert.message);
    });

    this.observability.on('traceStarted', (data) => {
      console.log('🔍 Trace started:', data.context.metadata.operationName);
    });

    this.observability.on('traceFinished', (data) => {
      console.log('✅ Trace finished:', data.span.operationName, `${data.span.duration}ms`);
    });
  }

  /**
   * Run a complete example workflow
   */
  async runExample(): Promise<void> {
    console.log('🚀 Starting observability integration example...\n');

    try {
      // Start observability system
      this.observability.start();

      // Simulate a complete agent workflow
      await this.simulateAgentWorkflow();

      // Generate some metrics
      await this.generateMetrics();

      // Show dashboard data
      await this.showDashboardData();

      // Demonstrate error handling
      await this.demonstrateErrorHandling();

    } catch (error) {
      console.error('❌ Example failed:', error);
    } finally {
      console.log('\n📊 Final observability status:');
      console.log(JSON.stringify(this.observability.getStatus(), null, 2));
    }
  }

  /**
   * Simulate a complete agent workflow with full observability
   */
  private async simulateAgentWorkflow(): Promise<void> {
    console.log('🤖 Simulating agent workflow...');

    // Create a parent trace context for the entire workflow
    const workflowContext = await this.observability.traceOperation(
      'agent_workflow',
      async (context) => {
        // Step 1: Agent thinks about the problem
        const thoughtResult = await this.agent.think({
          type: 'problem_solving',
          complexity: 'high',
          context: 'User needs help with task automation',
        }, context);

        // Step 2: Agent queries portal for additional information
        const portalResponse = await this.portal.generateResponse([
          { role: 'user', content: 'How can I automate this task?' }
        ], 'gpt-4', context);

        // Step 3: Agent stores the interaction in memory
        await this.memoryProvider.store({
          type: 'interaction',
          timestamp: new Date(),
          agentId: this.agent.id,
          content: 'Problem solving session completed',
          metadata: {
            thoughtResult,
            portalResponse: portalResponse.content,
          },
        }, context);

        // Step 4: Agent executes action
        const actionResult = await this.agent.act({
          type: 'respond',
          id: 'action-001',
          content: 'Based on my analysis, here is how to automate your task...',
        }, context);

        // Step 5: Extension handles the response
        await this.extension.handleMessage({
          type: 'response',
          channel: 'general',
          content: actionResult.result,
          user: 'user-001',
        }, context);

        return {
          workflow: 'completed',
          stepsCompleted: 5,
          duration: performance.now(),
        };
      }
    );

    console.log('✅ Agent workflow completed successfully\n');
  }

  /**
   * Generate various metrics for demonstration
   */
  private async generateMetrics(): Promise<void> {
    console.log('📊 Generating metrics...');

    // Simulate various system activities
    for (let i = 0; i < 10; i++) {
      // Simulate agent actions
      this.observability.recordEvent({
        type: 'agent',
        agentId: this.agent.id,
        operation: 'think',
        status: 'completed',
        duration: Math.random() * 1000 + 200,
        metadata: {
          iteration: i,
          complexity: i % 3 === 0 ? 'high' : 'medium',
        },
      });

      // Simulate portal requests
      this.observability.recordEvent({
        type: 'portal',
        portalId: this.portal.id,
        operation: 'request',
        model: 'gpt-4',
        tokens: Math.floor(Math.random() * 1000) + 100,
        duration: Math.random() * 2000 + 500,
        metadata: {
          iteration: i,
        },
      });

      // Small delay to spread out metrics
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Metrics generation completed\n');
  }

  /**
   * Show current dashboard data
   */
  private async showDashboardData(): Promise<void> {
    console.log('📈 Current dashboard data:');

    const dashboardData = await this.observability.getDashboardData();
    
    console.log('Overall health:', dashboardData.healthSummary.overall);
    console.log('Active alerts:', dashboardData.alerts.length);
    console.log('System insights:', dashboardData.insights.length);
    
    if (dashboardData.insights.length > 0) {
      console.log('Top insights:');
      dashboardData.insights.slice(0, 3).forEach((insight, i) => {
        console.log(`  ${i + 1}. [${insight.severity}] ${insight.message}`);
      });
    }

    // Show metrics export
    console.log('\n📊 Metrics export (Prometheus format):');
    const prometheusMetrics = this.observability.exportMetrics('prometheus');
    console.log(prometheusMetrics.split('\n').slice(0, 10).join('\n')); // Show first 10 lines
    console.log('... (truncated)\n');
  }

  /**
   * Demonstrate error handling and alerting
   */
  private async demonstrateErrorHandling(): Promise<void> {
    console.log('🚨 Demonstrating error handling...');

    try {
      // Force some errors to trigger alerts
      await this.agent.think(null); // This will cause an error
    } catch (error) {
      console.log('Expected error caught:', error.message);
    }

    try {
      await this.portal.generateResponse([], 'invalid-model');
    } catch (error) {
      console.log('Expected error caught:', error.message);
    }

    // Check if any alerts were triggered
    const status = this.observability.getStatus();
    console.log('System status after errors:', status.subsystems.alerting.alerts, 'active alerts');
    console.log('✅ Error handling demonstration completed\n');
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up observability system...');
    await this.observability.stop();
    console.log('✅ Cleanup completed');
  }
}

/**
 * Run the complete integration example
 */
export async function runObservabilityExample(): Promise<void> {
  const example = new ObservabilityIntegrationExample();
  
  try {
    await example.runExample();
  } finally {
    await example.cleanup();
  }
}

// Export for use in other modules
export {
  ObservableAgent,
  ObservablePortal,
  ObservableExtension,
  ObservableMemoryProvider,
};