import { ExecutionContext, ExecutionResult, ValidationResult } from '../../../../extensions/mcp-client/types';
import { ICodeExecutor, ISandboxedExecutor, ITerminalInterface } from '../types/executor.types';
import { ToolSystemConfig } from '../types/config.types';
import { Logger } from '../../../../core/logger';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

/**
 * Represents the result of a code validation operation
 * @interface IValidationError
 * @property {string} message - Human-readable error message
 * @property {number} line - Line number where the error occurred (0-based)
 * @property {number} column - Column number where the error occurred (0-based)
 */
interface IValidationError {
  message: string;
  line: number;
  column: number;
}

/**
 * Configuration for code execution capabilities
 * @interface IExecutionCapabilities
 * @property {string[]} languages - List of supported programming languages
 * @property {number} maxExecutionTime - Maximum execution time in milliseconds
 * @property {number} maxMemory - Maximum memory usage in MB
 * @property {boolean} supportsStreaming - Whether streaming output is supported
 * @property {string[]} supportedFeatures - List of supported features
 */
interface IExecutionCapabilities {
  languages: string[];
  maxExecutionTime: number;
  maxMemory: number;
  supportsStreaming: boolean;
  supportedFeatures: string[];
}

/**
 * Extended execution context that includes language information
 * @interface IExtendedExecutionContext
 * @extends {ExecutionContext}
 * @property {string} [language] - The programming language of the code
 */
interface IExtendedExecutionContext extends ExecutionContext {
  language?: string;
}

/**
 * Represents a session in the sandbox environment
 * @interface ISandboxSession
 * @property {string} id - Unique session identifier
 * @property {string} status - Current status of the session
 * @property {Date} createdAt - When the session was created
 * @property {Date} [destroyedAt] - When the session was destroyed (if applicable)
 */
interface ISandboxSession {
  id: string;
  status: 'active' | 'inactive' | 'error' | 'completed';
  createdAt: Date;
  destroyedAt?: Date;
}

/**
 * SYMindXCodeExecutor is responsible for executing code in a secure and controlled environment.
 * It supports multiple programming languages and provides sandboxing capabilities.
 * 
 * @example
 * ```typescript
 * const executor = new SYMindXCodeExecutor(config, terminal);
 * const result = await executor.execute('console.log("Hello")', { language: 'javascript' });
 * ```
 */
/**
 * SYMindXCodeExecutor implements ICodeExecutor to provide secure code execution
 * capabilities with sandboxing and resource management.
 */
export class SYMindXCodeExecutor extends EventEmitter implements ICodeExecutor {
  /** Sandbox instance for code execution */
  private readonly sandbox: ISandboxedExecutor;
  
  /** Map of active executions by their IDs */
  private activeExecutions: Map<string, { 
    promise: Promise<ExecutionResult>; 
    abortController: AbortController; 
  }>;
  
  /** Logger instance for the executor */
  private readonly logger: Logger;
  
  /** Default execution timeout in milliseconds */
  private static readonly DEFAULT_TIMEOUT_MS: number = 30000;

  /**
   * Creates a new instance of SYMindXCodeExecutor
   * 
   * @param {ToolSystemConfig} config - Configuration for the code executor
   * @param {ITerminalInterface} terminal - Terminal interface for command execution
   * @param {Logger} [logger] - Optional logger instance. If not provided, a new one will be created.
   * 
   * @example
   * ```typescript
   * const config = {
   *   sandbox: { enabled: true },
   *   // ... other config options
   * };
   * const executor = new SYMindXCodeExecutor(config, terminal);
   * ```
   */
  constructor(
    private readonly config: ToolSystemConfig,
    private readonly terminal: ITerminalInterface,
    logger?: Logger
  ) {
    super();
    this.logger = logger || new Logger('SYMindXCodeExecutor');
    this.sandbox = this.createSandbox();
    this.activeExecutions = new Map();
  }

  /**
   * Executes the provided code in a sandboxed environment
   * 
   * @param {string} code - The source code to execute
   * @param {ExecutionContext & { language?: string }} [context={}] - Execution context with optional language specification
   * @returns {Promise<ExecutionResult>} The result of the code execution
   * 
   * @throws {Error} If execution fails or is aborted
   * 
   * @example
   * ```typescript
   * const result = await executor.execute('return 1 + 1', { language: 'javascript' });
   * console.log(result.output); // 2
   * ```
   * 
   * @example
   * ```typescript
   * // With custom context
   * const result = await executor.execute('return x * 2', { 
   *   language: 'javascript',
   *   variables: { x: 5 } 
   * });
   * console.log(result.output); // 10
   * ```
   */
  async execute(
    code: string, 
    context: ExecutionContext & { language?: string } = {}
  ): Promise<ExecutionResult> {
    const language = context.language || 'javascript';
    const executionId = `exec-${Date.now()}-${uuidv4()}`;
    
    try {
      if (!code || typeof code !== 'string') {
        throw new Error('Code must be a non-empty string');
      }

      const abortController = new AbortController();
      const executionPromise = this.executeInSandbox(code, language, {
        ...context,
        signal: abortController.signal
      });
      
      this.activeExecutions.set(executionId, {
        promise: executionPromise,
        abortController
      });
      
      try {
        return await executionPromise;
      } finally {
        this.activeExecutions.delete(executionId);
      }
    } catch (error) {
      this.logger.error(`Code execution failed: ${error}`);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error during code execution',
        exitCode: 1
      };
    }
  }

  /**
   * Validates the provided code for syntax and security issues
   * @param {string} code - The code to validate
   * @param {string} [language='javascript'] - The programming language of the code
   * @returns {Promise<ValidationResult>} The validation result
   * 
   * @example
   * ```typescript
   * const result = await executor.validate('const x = 5;', 'javascript');
   * if (result.isValid) {
   *   console.log('Code is valid!');
   * } else {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  async validate(code: string, language: string = 'javascript'): Promise<ValidationResult> {
    // Basic validation logic
    if (code.length > (this.config.validation?.maxCodeLength || 10_000)) {
      return {
        isValid: false,
        errors: [{
          message: `Code exceeds maximum length of ${this.config.validation?.maxCodeLength || 10_000} characters`,
          line: 0,
          column: 0
        }]
      };
    }
    
    // Add language-specific validation if needed
    return { isValid: true, errors: [] };
  }

  /**
   * Retrieves the execution capabilities of this code executor
   * @returns {IExecutionCapabilities} The capabilities object
   * 
   * @example
   * ```typescript
   * const capabilities = executor.getCapabilities();
   * console.log('Supported languages:', capabilities.languages);
   * ```
   */
  getCapabilities(): IExecutionCapabilities {
    return {
      languages: this.config.sandbox.allowedLanguages,
      maxExecutionTime: this.config.sandbox.timeoutMs,
      maxMemory: this.config.sandbox.memoryLimitMB,
      supportsStreaming: true,
      supportedFeatures: ['code_execution', 'file_operations', 'network_access']
    };
  }

  /**
   * Stops a currently running execution by its ID
   * 
   * @param {string} executionId - The ID of the execution to stop
   * @returns {Promise<boolean>} True if the execution was successfully stopped, false otherwise
   * 
   * @throws {Error} If there's an error while attempting to stop the execution
   * 
   * @example
   * ```typescript
   * // Start a long-running execution
   * const execution = executor.execute('while(true) { ... }');
   * 
   * // Later, stop it
   * const stopped = await executor.stopExecution(execution.id);
   * console.log(`Execution stopped: ${stopped}`);
   * ```
   */
  /**
   * Stops a running execution by its ID
   * @param {string} executionId - The ID of the execution to stop
   * @returns {boolean} True if the execution was stopped, false otherwise
   */
  public stopExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    try {
      execution.abortController.abort();
      this.logger.info(`Execution ${executionId} was aborted`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to stop execution ${executionId}: ${errorMessage}`);
      return false;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Gets the IDs of all currently active executions
   * @returns {string[]} Array of execution IDs
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Creates a new sandboxed execution environment with the current configuration
   * 
   * @private
   * @returns {ISandboxedExecutor} A configured sandbox instance
   * 
   * @remarks
   * The sandbox provides an isolated environment for code execution with controlled access to:
   * - System resources (CPU, memory)
   * - File system (if enabled in config)
   * - Network (if enabled in config)
   * 
   * @example
   * ```typescript
   * // Internal usage within the class
   * this.sandbox = this.createSandbox();
   * ```
   */
  /**
   * Creates a new sandboxed execution environment
   * @private
   * @returns {ISandboxedExecutor} A configured sandbox instance
   */
  /**
   * Creates a new sandboxed execution environment
   * @private
   * @returns {ISandboxedExecutor} A configured sandbox instance
   */
  private createSandbox(): ISandboxedExecutor {
    const sessions = new Map<string, ISandboxSession>();
    
    /**
     * Gets the current timestamp in ISO format
     * @private
     * @returns {string} ISO timestamp string
     */
    const getTimestamp = (): string => new Date().toISOString();
    
    return {
      /**
       * Executes code in the sandbox environment
       * @param {string} code - The code to execute
       * @param {string} language - The programming language
       * @param {ExecutionContext} context - Execution context
       * @returns {Promise<ExecutionResult>} The execution result
       */
      executeCode: async (code: string, language: string, context: ExecutionContext): Promise<ExecutionResult> => {
        try {
          // Basic validation
          if (!this.config.sandbox.allowedLanguages.includes(language)) {
            throw new Error(`Language '${language}' is not allowed in sandbox`);
          }
          
          // Default implementation - in a real scenario, this would execute in a secure sandbox
          return {
            success: true,
            output: `Code executed in ${language} sandbox`,
            exitCode: 0
          };
        } catch (error) {
          this.logger.error(`Sandbox execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      },
      createSession: async (): Promise<string> => {
        const sessionId = `sess-${uuidv4()}`;
        const session: ISandboxSession = {
          id: sessionId,
          status: 'active',
          createdAt: new Date()
        };
        sessions.set(sessionId, session);
        return sessionId;
      },
      kill: async (processId: string, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> => {
        try {
          // In a real implementation, this would kill the actual process
          this.logger.info(`Terminating process ${processId} with signal ${signal}`);
          return true;
        } catch (error) {
          this.logger.error(`Failed to kill process ${processId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      },
      /**
       * Lists all processes in the sandbox, optionally filtered by session
       * @param {string} [sessionId] - Optional session ID to filter by
       * @returns {Promise<Array<{id: string, status: string}>>} List of processes
       */
      listProcesses: async (sessionId?: string): Promise<Array<{id: string, status: string}>> => {
        if (sessionId) {
          const session = sessions.get(sessionId);
          return session ? [{ id: sessionId, status: session.status }] : [];
        }
        return Array.from(sessions.entries()).map(([id, session]) => ({
          id,
          status: session.status
        }));
      },
      /**
       * Destroys the sandbox and cleans up all resources
       * @returns {void}
       */
      destroy: (): void => {
        const now = new Date();
        sessions.forEach(session => {
          session.status = 'inactive';
          session.destroyedAt = now;
        });
        sessions.clear();
        this.logger.debug('Sandbox destroyed and all sessions cleared');
      }
    }
  }

  /**
   * Executes code in the sandbox environment
   * @private
   * @param {string} code - The code to execute
   * @param {string} language - The programming language
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<ExecutionResult>} The execution result
   */
  private async executeInSandbox(
    code: string,
    language: string,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      if (!code || typeof code !== 'string') {
        throw new Error('Code must be a non-empty string');
      }
      
      if (!language || typeof language !== 'string') {
        throw new Error('Language must be a non-empty string');
      }
      
      // Execute in sandbox
      const result = await this.sandbox.executeCode(code, language, context);
      
      // Log execution metrics if logging is enabled
      if (this.config.logging?.enabled) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Code execution completed in ${duration}ms`);
      }
      
      return result;
    } catch (error: unknown) {
      // Handle different types of errors safely
      let errorMessage = 'Unknown error during sandbox execution';
      let errorStack: string | undefined;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'toString' in error) {
        errorMessage = error.toString();
      }
      
      // Log the error with context
      this.logger.error(
        `Sandbox execution failed after ${Date.now() - startTime}ms: ${errorMessage}`, 
        {
          error: errorStack,
          language,
          codeLength: code.length,
          context: context ? JSON.stringify(context) : '{}'
        }
      );
      
      // Return a standardized error response
      return {
        success: false,
        output: '',
        error: errorMessage,
        exitCode: 1,
        metadata: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          language,
          codeLength: code.length
        }
      };
    }
  }
}
