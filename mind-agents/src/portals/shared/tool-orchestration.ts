/**
 * Enhanced Tool Orchestration Framework
 *
 * Advanced tool execution patterns including chaining, parallelization, conditional logic,
 * and intelligent orchestration for AI SDK 7 tools across all portal implementations.
 */

import {
  tool,
  type LanguageModel,
  type ModelMessage,
  type ToolExecutionOptions,
  type Tool,
  generateId,
} from 'ai';
import { z } from 'zod';
import { runtimeLogger } from '../../utils/logger';

// === TOOL EXECUTION TYPES ===

export interface ToolExecutionContext {
  toolCallId: string;
  stepNumber: number;
  previousResults: ToolExecutionResult[];
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
  metadata: Record<string, unknown>;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

interface ToolOrchestrationSDKContext {
  stepNumber: number;
  metadata: Record<string, unknown>;
}

function getToolOrchestrationSDKContext(
  value: unknown
): ToolOrchestrationSDKContext {
  if (typeof value !== 'object' || value === null) {
    return { stepNumber: 1, metadata: {} };
  }

  const context = value as Record<string, unknown>;
  const metadata = context['metadata'];
  return {
    stepNumber:
      typeof context['stepNumber'] === 'number' ? context['stepNumber'] : 1,
    metadata:
      typeof metadata === 'object' && metadata !== null
        ? (metadata as Record<string, unknown>)
        : {},
  };
}

export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  input: unknown;
  output: unknown;
  executionTime: number;
  success: boolean;
  error?: Error;
  metadata: Record<string, unknown>;
}

/** A locally trusted executable tool with an explicit input-validation boundary. */
export interface ExecutableTool<Input = unknown, Output = unknown> {
  parseInput(input: unknown): Input;
  execute(
    input: Input,
    options: ToolExecutionOptions<unknown>
  ): Output | PromiseLike<Output>;
}

export interface ConditionalRule {
  condition: (
    context: ToolExecutionContext,
    results: ToolExecutionResult[]
  ) => boolean;
  action: 'execute' | 'skip' | 'abort' | 'retry';
  maxRetries?: number;
  retryDelay?: number;
}

export interface ToolChainStep {
  toolName: string;
  inputMapper?: (
    previousResults: ToolExecutionResult[],
    context: ToolExecutionContext
  ) => unknown;
  conditionalRules?: ConditionalRule[];
  parallelWith?: string[]; // Tool names to execute in parallel
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
    retryCondition?: (error: Error) => boolean;
  };
}

// === TOOL CHAIN ORCHESTRATOR ===

export class ToolChainOrchestrator {
  private tools = new Map<
    string,
    {
      execute(
        input: unknown,
        options: ToolExecutionOptions<unknown>
      ): unknown | PromiseLike<unknown>;
    }
  >();
  private executionHistory: ToolExecutionResult[] = [];
  constructor(
    _model: LanguageModel,
    private globalTimeout = 30000
  ) {}

  registerTool<Input, Output>(
    name: string,
    toolDefinition: ExecutableTool<Input, Output>
  ): void {
    this.tools.set(name, {
      execute: (input, options) =>
        toolDefinition.execute(toolDefinition.parseInput(input), options),
    });
  }

  registerTools(tools: Record<string, ExecutableTool<unknown, unknown>>): void {
    for (const [name, toolDef] of Object.entries(tools))
      this.registerTool(name, toolDef);
  }

  /**
   * Execute a chain of tools with intelligent orchestration
   */
  async executeChain(
    chain: ToolChainStep[],
    initialContext: Partial<ToolExecutionContext> = {}
  ): Promise<ToolExecutionResult[]> {
    const context: ToolExecutionContext = {
      toolCallId: generateId(),
      stepNumber: 0,
      previousResults: [],
      messages: [],
      metadata: {},
      ...initialContext,
    };

    const results: ToolExecutionResult[] = [];
    const executionPlan = this.buildExecutionPlan(chain);

    try {
      for (const executionGroup of executionPlan) {
        context.stepNumber++;
        context.previousResults = results;

        // Execute tools in parallel within the group
        const groupPromises = executionGroup.map((step) =>
          this.executeStep(step, context)
        );

        const groupResults = await Promise.allSettled(groupPromises);

        for (let i = 0; i < groupResults.length; i++) {
          const result = groupResults[i];
          const step = executionGroup[i];
          if (!result || !step) continue;

          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // Handle execution failure
            const failureResult: ToolExecutionResult = {
              toolCallId: context.toolCallId,
              toolName: step.toolName,
              input: null,
              output: null,
              executionTime: 0,
              success: false,
              error: asError(result.reason),
              metadata: { failedInChain: true },
            };
            results.push(failureResult);

            // Check if this failure should abort the chain
            const reason = asError(result.reason);
            if (this.shouldAbortChain(step, reason, context)) {
              throw new Error(
                'Tool chain aborted due to failure in ' +
                  step.toolName +
                  ': ' +
                  reason.message
              );
            }
          }
        }
      }

      this.executionHistory.push(...results);
      return results;
    } catch (error) {
      runtimeLogger.error('Tool chain execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute tools in parallel with intelligent coordination
   */
  async executeParallel(
    tools: Array<{ name: string; input: unknown; timeout?: number }>,
    options: {
      failFast?: boolean;
      maxConcurrency?: number;
      retryFailures?: boolean;
      messages?: ModelMessage[];
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<ToolExecutionResult[]> {
    const {
      failFast = false,
      maxConcurrency = 5,
      retryFailures = true,
    } = options;

    // Group tools into batches based on max concurrency
    const batches = this.createBatches(tools, maxConcurrency);
    const allResults: ToolExecutionResult[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map(async (toolSpec) => {
        const startTime = Date.now();
        const toolCallId = generateId();

        const toolDef = this.tools.get(toolSpec.name);
        if (!toolDef) {
          throw new Error('Tool not found: ' + toolSpec.name);
        }

        try {
          // Execute with timeout
          const timeoutMs = toolSpec.timeout || this.globalTimeout;
          const result = await this.executeWithTimeout(
            Promise.resolve(
              toolDef.execute(
                toolSpec.input,
                this.sdkExecutionOptions(
                  toolCallId,
                  options.messages ?? [],
                  options.abortSignal,
                  {}
                )
              )
            ),
            timeoutMs
          );

          return {
            toolCallId,
            toolName: toolSpec.name,
            input: toolSpec.input,
            output: result,
            executionTime: Date.now() - startTime,
            success: true,
            metadata: { parallel: true },
          } as ToolExecutionResult;
        } catch (error) {
          const failureResult: ToolExecutionResult = {
            toolCallId,
            toolName: toolSpec.name,
            input: toolSpec.input,
            output: null,
            executionTime: Date.now() - startTime,
            success: false,
            error: asError(error),
            metadata: { parallel: true },
          };

          if (retryFailures && this.shouldRetry(asError(error))) {
            // Implement exponential backoff retry
            try {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const retryResult = await toolDef.execute(
                toolSpec.input,
                this.sdkExecutionOptions(
                  toolCallId,
                  options.messages ?? [],
                  options.abortSignal,
                  {}
                )
              );
              return {
                ...failureResult,
                output: retryResult,
                success: true,
                executionTime: Date.now() - startTime,
                metadata: { parallel: true, retried: true },
              };
            } catch (retryError) {
              failureResult.error = asError(retryError);
              failureResult.metadata['retryFailed'] = true;
            }
          }

          if (failFast) {
            throw error;
          }

          return failureResult;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allResults.push(result.value);
        } else if (failFast) {
          throw result.reason;
        }
      }
    }

    this.executionHistory.push(...allResults);
    return allResults;
  }

  /**
   * Execute tools with conditional logic and dynamic routing
   */
  async executeConditional(
    toolSpecs: Array<{
      name: string;
      input: unknown;
      condition?: (
        context: ToolExecutionContext,
        results: ToolExecutionResult[]
      ) => boolean;
      priority?: number;
    }>,
    context: Partial<ToolExecutionContext> = {}
  ): Promise<ToolExecutionResult[]> {
    const fullContext: ToolExecutionContext = {
      toolCallId: generateId(),
      stepNumber: 0,
      previousResults: this.executionHistory,
      messages: context.messages ?? [],
      metadata: {},
      ...context,
    };

    // Sort by priority (higher first)
    const sortedSpecs = toolSpecs
      .filter(
        (spec) =>
          !spec.condition ||
          spec.condition(fullContext, fullContext.previousResults)
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const results: ToolExecutionResult[] = [];

    for (const spec of sortedSpecs) {
      const result = await this.executeStep(
        {
          toolName: spec.name,
          inputMapper: () => spec.input,
        },
        fullContext
      );

      results.push(result);
      fullContext.previousResults = [...fullContext.previousResults, result];
      fullContext.stepNumber++;

      // Re-evaluate conditions for remaining tools
      const remainingSpecs = sortedSpecs.slice(sortedSpecs.indexOf(spec) + 1);
      const validSpecs = remainingSpecs.filter(
        (remainingSpec) =>
          !remainingSpec.condition ||
          remainingSpec.condition(fullContext, fullContext.previousResults)
      );

      if (validSpecs.length === 0) {
        break; // No more valid tools to execute
      }
    }

    this.executionHistory.push(...results);
    return results;
  }

  /**
   * Execute a single step in the tool chain
   */
  private async executeStep(
    step: ToolChainStep,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const toolCallId = generateId();

    try {
      // Check conditional rules
      if (step.conditionalRules) {
        for (const rule of step.conditionalRules) {
          if (rule.condition(context, context.previousResults)) {
            switch (rule.action) {
              case 'skip':
                return {
                  toolCallId,
                  toolName: step.toolName,
                  input: null,
                  output: null,
                  executionTime: 0,
                  success: true,
                  metadata: { skipped: true },
                };
              case 'abort':
                throw new Error(`Tool execution aborted by conditional rule`);
            }
          }
        }
      }

      const toolDef = this.tools.get(step.toolName);
      if (!toolDef) {
        throw new Error(`Tool '${step.toolName}' not found`);
      }

      // Prepare input using mapper if provided
      const input = step.inputMapper
        ? step.inputMapper(context.previousResults, context)
        : {};

      // Execute with retry logic if configured
      let result: unknown;
      let retryCount = 0;
      const maxRetries = step.retryConfig?.maxRetries || 0;

      while (retryCount <= maxRetries) {
        try {
          const timeoutMs = step.timeout || this.globalTimeout;
          result = await this.executeWithTimeout(
            Promise.resolve(
              toolDef.execute(
                input,
                this.sdkExecutionOptions(
                  toolCallId,
                  context.messages,
                  context.abortSignal,
                  context.metadata,
                  context.stepNumber
                )
              )
            ),
            timeoutMs
          );
          break; // Success, exit retry loop
        } catch (error) {
          if (
            retryCount < maxRetries &&
            (!step.retryConfig?.retryCondition ||
              step.retryConfig.retryCondition(asError(error)))
          ) {
            retryCount++;
            const delay =
              step.retryConfig?.backoffMs || 1000 * Math.pow(2, retryCount - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
            runtimeLogger.warn(
              `Retrying ${step.toolName} (attempt ${retryCount}/${maxRetries})`
            );
          } else {
            throw error;
          }
        }
      }

      return {
        toolCallId,
        toolName: step.toolName,
        input,
        output: result,
        executionTime: Date.now() - startTime,
        success: true,
        metadata: { retries: retryCount },
      };
    } catch (error) {
      return {
        toolCallId,
        toolName: step.toolName,
        input: null,
        output: null,
        executionTime: Date.now() - startTime,
        success: false,
        error: asError(error),
        metadata: {},
      };
    }
  }

  /**
   * Build execution plan grouping parallel tools
   */
  private buildExecutionPlan(chain: ToolChainStep[]): ToolChainStep[][] {
    const plan: ToolChainStep[][] = [];
    const processed = new Set<string>();

    for (const step of chain) {
      if (processed.has(step.toolName)) continue;

      const group: ToolChainStep[] = [step];
      processed.add(step.toolName);

      // Find tools that should execute in parallel with this one
      if (step.parallelWith) {
        for (const parallelToolName of step.parallelWith) {
          const parallelStep = chain.find(
            (s) => s.toolName === parallelToolName
          );
          if (parallelStep && !processed.has(parallelToolName)) {
            group.push(parallelStep);
            processed.add(parallelToolName);
          }
        }
      }

      plan.push(group);
    }

    return plan;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private sdkExecutionOptions(
    toolCallId: string,
    messages: ModelMessage[],
    abortSignal: AbortSignal | undefined,
    context: unknown,
    stepNumber = 1
  ): ToolExecutionOptions<unknown> {
    return {
      toolCallId,
      messages,
      context: {
        stepNumber,
        metadata:
          typeof context === 'object' && context !== null
            ? (context as Record<string, unknown>)
            : {},
      } satisfies ToolOrchestrationSDKContext,
      ...(abortSignal ? { abortSignal } : {}),
    };
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Tool execution timeout after ${timeoutMs}ms`)),
        timeoutMs
      );
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private shouldAbortChain(
    step: ToolChainStep,
    error: Error,
    context: ToolExecutionContext
  ): boolean {
    void error;
    // Check if any conditional rules specify abort behavior
    if (step.conditionalRules) {
      for (const rule of step.conditionalRules) {
        if (
          rule.action === 'abort' &&
          rule.condition(context, context.previousResults)
        ) {
          return true;
        }
      }
    }

    // Default: don't abort on single tool failure
    return false;
  }

  private shouldRetry(error: Error): boolean {
    // Common retryable conditions
    const retryableMessages = [
      'timeout',
      'network error',
      'temporary failure',
      'rate limit',
      'service unavailable',
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some((msg) => errorMessage.includes(msg));
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    toolUsageStats: Record<
      string,
      { count: number; avgTime: number; successRate: number }
    >;
  } {
    const stats = {
      totalExecutions: this.executionHistory.length,
      successfulExecutions: this.executionHistory.filter((r) => r.success)
        .length,
      failedExecutions: this.executionHistory.filter((r) => !r.success).length,
      averageExecutionTime: 0,
      toolUsageStats: {} as Record<
        string,
        { count: number; avgTime: number; successRate: number }
      >,
    };

    if (this.executionHistory.length > 0) {
      stats.averageExecutionTime =
        this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0) /
        this.executionHistory.length;
    }

    // Calculate per-tool statistics
    const toolStats = new Map<
      string,
      { times: number[]; successes: number; total: number }
    >();

    for (const result of this.executionHistory) {
      if (!toolStats.has(result.toolName)) {
        toolStats.set(result.toolName, { times: [], successes: 0, total: 0 });
      }

      const toolStat = toolStats.get(result.toolName)!;
      toolStat.times.push(result.executionTime);
      toolStat.total++;
      if (result.success) toolStat.successes++;
    }

    for (const [toolName, stat] of toolStats) {
      stats.toolUsageStats[toolName] = {
        count: stat.total,
        avgTime:
          stat.times.reduce((sum, time) => sum + time, 0) / stat.times.length,
        successRate: stat.successes / stat.total,
      };
    }

    return stats;
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }
}

// === ADVANCED TOOL PATTERNS ===

export interface StreamingToolOutput {
  results: unknown[];
  totalChunks: number;
  streaming: true;
}

/**
 * Create a tool that automatically chains with other tools
 */
export function createChainableTool<T extends z.ZodType>(config: {
  name: string;
  description: string;
  inputSchema: T;
  execute: (
    input: z.infer<T>,
    context: ToolExecutionContext
  ) => Promise<unknown>;
  chainWith?: string[];
  conditionalChains?: Array<{
    condition: (result: unknown, context: ToolExecutionContext) => boolean;
    tools: string[];
  }>;
}): Tool<z.infer<T>, unknown> {
  return tool({
    description: config.description,
    inputSchema: config.inputSchema,
    execute: async (
      input: z.infer<T>,
      executeContext: ToolExecutionOptions<unknown>
    ) => {
      const context: ToolExecutionContext = {
        toolCallId: executeContext.toolCallId || generateId(),
        stepNumber: getToolOrchestrationSDKContext(executeContext.context)
          .stepNumber,
        previousResults: [],
        messages: executeContext.messages,
        ...(executeContext.abortSignal
          ? { abortSignal: executeContext.abortSignal }
          : {}),
        metadata: {},
      };

      try {
        const result = await config.execute(input, context);

        // Store result for potential chaining
        context.metadata['lastResult'] = result;
        context.metadata['chainable'] = true;
        context.metadata['chainWith'] = config.chainWith;
        context.metadata['conditionalChains'] = config.conditionalChains;

        return result;
      } catch (error) {
        runtimeLogger.error(`Chainable tool ${config.name} failed:`, error);
        throw error;
      }
    },
  });
}

/**
 * Create a tool with built-in retry logic
 */
export function createResilientTool<T extends z.ZodType>(config: {
  name: string;
  description: string;
  inputSchema: T;
  execute: (
    input: z.infer<T>,
    context: ToolExecutionContext
  ) => Promise<unknown>;
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: Error) => boolean;
}): Tool<z.infer<T>, unknown> {
  return tool({
    description: config.description,
    inputSchema: config.inputSchema,
    execute: async (
      input: z.infer<T>,
      executeContext: ToolExecutionOptions<unknown>
    ) => {
      const maxRetries = config.maxRetries || 3;
      const retryDelay = config.retryDelay || 1000;
      const orchestrationContext = getToolOrchestrationSDKContext(
        executeContext.context
      );

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const context: ToolExecutionContext = {
            toolCallId: executeContext.toolCallId || generateId(),
            stepNumber: orchestrationContext.stepNumber,
            previousResults: [],
            messages: executeContext.messages,
            ...(executeContext.abortSignal
              ? { abortSignal: executeContext.abortSignal }
              : {}),
            metadata: {
              ...orchestrationContext.metadata,
              attempt,
              maxRetries,
            },
          };

          return await config.execute(input, context);
        } catch (error) {
          lastError = asError(error);

          if (attempt < maxRetries) {
            // Check if we should retry this error
            if (config.retryCondition && !config.retryCondition(lastError)) {
              break;
            }

            // Wait before retry with exponential backoff
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));

            runtimeLogger.warn(
              `Tool ${config.name} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`
            );
          }
        }
      }

      throw lastError;
    },
  });
}

/**
 * Create a tool that can execute in streaming mode
 */
export function createStreamingTool<T extends z.ZodType>(config: {
  name: string;
  description: string;
  inputSchema: T;
  execute: (
    input: z.infer<T>,
    context: ToolExecutionContext
  ) => AsyncGenerator<unknown>;
  bufferSize?: number;
}): Tool<z.infer<T>, StreamingToolOutput> {
  return tool({
    description: config.description,
    inputSchema: config.inputSchema,
    execute: async (
      input: z.infer<T>,
      executeContext: ToolExecutionOptions<unknown>
    ) => {
      const context: ToolExecutionContext = {
        toolCallId: executeContext.toolCallId || generateId(),
        stepNumber: getToolOrchestrationSDKContext(executeContext.context)
          .stepNumber,
        previousResults: [],
        messages: executeContext.messages,
        ...(executeContext.abortSignal
          ? { abortSignal: executeContext.abortSignal }
          : {}),
        metadata: {},
      };

      const results: unknown[] = [];
      const bufferSize = config.bufferSize || 100;

      try {
        const stream = config.execute(input, context);

        for await (const chunk of stream) {
          results.push(chunk);

          // Implement buffering to avoid memory issues
          if (results.length > bufferSize) {
            // Could implement streaming to consumer here
            // For now, just log a warning
            runtimeLogger.warn(
              `Streaming tool ${config.name} buffer size exceeded`
            );
          }
        }

        return {
          results,
          totalChunks: results.length,
          streaming: true,
        };
      } catch (error) {
        runtimeLogger.error(`Streaming tool ${config.name} failed:`, error);
        throw error;
      }
    },
  });
}

// === UTILITY FUNCTIONS ===

/**
 * Create input mapper for chaining tools
 */
export function mapPreviousResult(
  toolName: string,
  propertyPath?: string
): (results: ToolExecutionResult[]) => unknown {
  return (results: ToolExecutionResult[]) => {
    const targetResult = results.find((r) => r.toolName === toolName);
    if (!targetResult || !targetResult.success) {
      throw new Error(
        `Required tool result from '${toolName}' not found or failed`
      );
    }

    if (propertyPath) {
      const keys = propertyPath.split('.');
      let value: unknown = targetResult.output;
      for (const key of keys) {
        if (Array.isArray(value)) {
          const index = Number(key);
          value = Number.isInteger(index) ? value[index] : undefined;
        } else if (typeof value === 'object' && value !== null) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return value;
    }

    return targetResult.output;
  };
}

/**
 * Create conditional rule for tool execution
 */
export function createConditionalRule(
  condition: (
    context: ToolExecutionContext,
    results: ToolExecutionResult[]
  ) => boolean,
  action: ConditionalRule['action'],
  options?: { maxRetries?: number; retryDelay?: number }
): ConditionalRule {
  return {
    condition,
    action,
    ...options,
  };
}

/**
 * Export singleton orchestrator for global use
 */
export let globalOrchestrator: ToolChainOrchestrator | null = null;

export function initializeGlobalOrchestrator(
  model: LanguageModel
): ToolChainOrchestrator {
  globalOrchestrator = new ToolChainOrchestrator(model);
  return globalOrchestrator;
}

export function getGlobalOrchestrator(): ToolChainOrchestrator {
  if (!globalOrchestrator) {
    throw new Error(
      'Global orchestrator not initialized. Call initializeGlobalOrchestrator first.'
    );
  }
  return globalOrchestrator;
}
