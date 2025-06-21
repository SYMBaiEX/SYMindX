import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../../../core/logger';
import { ToolSystemConfig } from '../types/config.types';
import { IExtendedTerminalProcess, ITerminalInterface, ITerminalSession } from '../types/terminal.types';
import { TerminalResult } from '../../../../extensions/mcp-client/types';

/**
 * SYMindXTerminalInterface provides a secure and managed way to execute terminal commands
 * and manage processes. It implements the ITerminalInterface and provides additional
 * functionality for process management and session handling.
 * 
 * @example
 * ```typescript
 * const terminal = new SYMindXTerminalInterface(config);
 * const result = await terminal.execute('ls', ['-la']);
 * console.log(result.output);
 * ```
 */
export class SYMindXTerminalInterface implements ITerminalInterface {
  private processes: Map<string, IExtendedTerminalProcess> = new Map();
  private sessions: Map<string, ITerminalSession> = new Map();
  private logger: Logger;

  /**
   * Creates a new instance of SYMindXTerminalInterface
   * 
   * @param {ToolSystemConfig} config - Configuration for the terminal interface
   * @param {Logger} [logger] - Optional logger instance. If not provided, a new one will be created.
   * 
   * @example
   * ```typescript
   * const config = {
   *   terminal: {
   *     // terminal-specific configuration
   *   },
   *   // ... other config
   * };
   * const terminal = new SYMindXTerminalInterface(config);
   * ```
   */
  constructor(
    private config: ToolSystemConfig,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('SYMindXTerminalInterface');
  }

  /**
   * Executes a terminal command and returns the result.
   * 
   * @param {string} command - The command to execute
   * @param {string[]} [args=[]] - Command line arguments
   * @param {Object} [options={}] - Execution options
   * @param {string} [options.cwd] - Current working directory
   * @param {NodeJS.ProcessEnv} [options.env] - Environment variables
   * @param {boolean} [options.shell] - Whether to use shell
   * @returns {Promise<TerminalResult>} The result of the command execution
   * 
   * @throws {Error} If command execution fails
   * 
   * @example
   * ```typescript
   * // Basic command execution
   * const result = await terminal.execute('ls', ['-la']);
   * console.log(result.output);
   * 
   * // With options
   * const result = await terminal.execute('pwd', [], { cwd: '/some/directory' });
   * ```
   */
  async execute(
    command: string,
    args: string[] = [],
    options: any = {}
  ): Promise<TerminalResult> {
    try {
      const process = await this.spawnProcess(command, args, options);
      return await this.waitForProcess(process);
    } catch (error) {
      this.logger.error(`Terminal execution failed: ${error}`);
      throw error;
    }
  }

  /**
   * Spawns a new process with the given command and arguments.
   * 
   * @param {string} command - The command to execute
   * @param {string[]} [args=[]] - Command line arguments
   * @param {Object} [options={}] - Spawn options
   * @param {string} [options.cwd] - Current working directory
   * @param {NodeJS.ProcessEnv} [options.env] - Environment variables
   * @param {boolean} [options.shell] - Whether to use shell
   * @param {string} [options.sessionId] - Optional session ID to group processes
   * @returns {Promise<IExtendedTerminalProcess>} The spawned process with extended properties
   * 
   * @throws {Error} If terminal access is disabled or command is not allowed
   * 
   * @example
   * ```typescript
   * // Spawn a process
   * const process = await terminal.spawnProcess('node', ['app.js'], { 
   *   cwd: '/app',
   *   env: { NODE_ENV: 'development' }
   * });
   * 
   * // Monitor process output
   * process.stdout?.on('data', (data) => {
   *   console.log(`Output: ${data}`);
   * });
   * ```
   */
  async spawnProcess(
    command: string,
    args: string[] = [],
    options: any = {}
  ): Promise<IExtendedTerminalProcess> {
    if (!this.config.terminal.enabled) {
      throw new Error('Terminal access is disabled');
    }

    // Validate command against allowed/blocked lists
    this.validateCommand(command, args);

    const processId = `process-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    
    const childProcess = spawn(command, args, {
      ...options,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: options.cwd || this.config.terminal.workingDirectory,
      env: { ...process.env, ...(options.env || {}) }
    });

    const process: IExtendedTerminalProcess = {
      id: processId,
      command,
      args,
      startTime,
      status: 'running',
      output: [],
      error: [],
      exitCode: null,
      signal: null,
      childProcess,
      
      kill: (signal?: NodeJS.Signals) => {
        if (childProcess.killed || !childProcess.pid) return false;
        return childProcess.kill(signal || 'SIGTERM');
      },
      
      wait: () => {
        return new Promise<number | null>((resolve) => {
          if (childProcess.killed || !childProcess.pid) {
            resolve(process.exitCode);
            return;
          }
          
          childProcess.once('exit', (code, signal) => {
            process.exitCode = code;
            process.signal = signal;
            process.status = signal ? 'killed' : 'exited';
            resolve(code);
          });
        });
      }
    };

    // Capture output
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.output.push(output);
        // Emit output event if needed
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        const error = data.toString();
        process.error.push(error);
        // Emit error event if needed
      });
    }

    // Handle process exit
    childProcess.once('exit', (code, signal) => {
      process.exitCode = code;
      process.signal = signal;
      process.status = signal ? 'killed' : 'exited';
      process.endTime = new Date();
    });

    this.processes.set(processId, process);
    return process;
  }

  /**
   * Kills a running process by its ID.
   * 
   * @param {string} processId - The ID of the process to kill
   * @param {NodeJS.Signals} [signal='SIGTERM'] - Signal to send to the process
   * @returns {Promise<boolean>} True if the process was successfully killed, false otherwise
   * 
   * @example
   * ```typescript
   * // Kill a process with default SIGTERM signal
   * const success = await terminal.kill('process-123');
   * 
   * // Force kill a process with SIGKILL
   * const forceKilled = await terminal.kill('process-123', 'SIGKILL');
   * ```
   */
  async kill(processId: string, signal?: NodeJS.Signals): Promise<boolean> {
    const process = this.processes.get(processId);
    if (!process) return false;
    
    return process.kill(signal);
  }

  /**
   * Lists all active processes, optionally filtered by session ID.
   * 
   * @param {string} [sessionId] - Optional session ID to filter processes
   * @returns {Promise<IExtendedTerminalProcess[]>} Array of process objects
   * 
   * @example
   * ```typescript
   * // List all processes
   * const allProcesses = await terminal.listProcesses();
   * 
   * // List processes for a specific session
   * const sessionProcesses = await terminal.listProcesses('session-123');
   * 
   * // Display process information
   * allProcesses.forEach(proc => {
   *   console.log(`Process ${proc.id}: ${proc.command} (${proc.status})`);
   * });
   * ```
   */
  async listProcesses(sessionId?: string): Promise<IExtendedTerminalProcess[]> {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) return [];
      
      return session.processes.values() as unknown as IExtendedTerminalProcess[];
    }
    
    return Array.from(this.processes.values());
  }

  /**
   * Retrieves a process by its ID.
   * 
   * @param {string} processId - The ID of the process to retrieve
   * @returns {IExtendedTerminalProcess | undefined} The process object if found, undefined otherwise
   * 
   * @example
   * ```typescript
   * // Get a specific process
   * const process = terminal.getProcess('process-123');
   * if (process) {
   *   console.log(`Found process: ${process.command} (${process.status})`);
   * } else {
   *   console.log('Process not found');
   * }
   * ```
   */
  getProcess(processId: string): IExtendedTerminalProcess | undefined {
    return this.processes.get(processId);
  }

  /**
   * Validates if a command is allowed to be executed based on the security configuration.
   * 
   * @private
   * @param {string} command - The command to validate
   * @param {string[]} [args=[]] - Command line arguments
   * @throws {Error} If the command is blocked or not in the allowed list
   * 
   * @example
   * ```typescript
   * // This is called internally by execute() and spawnProcess()
   * // Example of blocked command:
   * try {
   *   terminal['validateCommand']('rm', ['-rf', '/']);
   * } catch (error) {
   *   console.error(error.message); // Command 'rm -rf /' is blocked by security policy
   * }
   * ```
   */
  private validateCommand(command: string, args: string[] = []): void {
    // Check blocked commands
    const fullCommand = [command, ...args].join(' ').toLowerCase();
    
    // Check against blocked commands
    const isBlocked = this.config.terminal.blockedCommands.some(blocked => 
      fullCommand.includes(blocked.toLowerCase())
    );
    
    if (isBlocked) {
      throw new Error(`Command '${fullCommand}' is blocked by security policy`);
    }
    
    // Check against allowed commands if the list is not empty
    if (this.config.terminal.allowedCommands.length > 0) {
      const isAllowed = this.config.terminal.allowedCommands.some(allowed => 
        command.toLowerCase() === allowed.toLowerCase()
      );
      
      if (!isAllowed) {
        throw new Error(`Command '${command}' is not in the allowed commands list`);
      }
    }
  }

  /**
   * Waits for a process to complete and collects its output.
   * 
   * @private
   * @param {IExtendedTerminalProcess} process - The process to wait for
   * @returns {Promise<TerminalResult>} The result of the process execution
   * @throws {Error} If the process fails or times out
   * 
   * @example
   * ```typescript
   * // This is called internally by execute()
   * const process = await terminal.spawnProcess('sleep', ['5']);
   * const result = await terminal['waitForProcess'](process);
   * console.log(`Process completed with code ${result.exitCode}`);
   * ```
   */
  private async waitForProcess(process: IExtendedTerminalProcess): Promise<TerminalResult> {
    try {
      const exitCode = await process.wait();
      
      return {
        success: exitCode === 0,
        stdout: process.output.join(''),
        stderr: process.error.join(''),
        exitCode: exitCode || 0,
        processId: process.id
      };
    } catch (error) {
      return {
        success: false,
        stdout: process.output.join(''),
        stderr: process.error.join('\n') + (error instanceof Error ? '\n' + error.message : ''),
        exitCode: 1,
        processId: process.id
      };
    }
  }
}
