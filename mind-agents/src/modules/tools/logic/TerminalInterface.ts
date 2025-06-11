import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../../../core/logger';
import { ToolSystemConfig } from '../types/config.types';
import { IExtendedTerminalProcess, ITerminalInterface, ITerminalSession } from '../types/terminal.types';
import { TerminalResult } from '../../../../extensions/mcp-client/types';

export class SYMindXTerminalInterface implements ITerminalInterface {
  private processes: Map<string, IExtendedTerminalProcess> = new Map();
  private sessions: Map<string, ITerminalSession> = new Map();
  private logger: Logger;

  constructor(
    private config: ToolSystemConfig,
    logger?: Logger
  ) {
    this.logger = logger || new Logger('SYMindXTerminalInterface');
  }

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

  async kill(processId: string, signal?: NodeJS.Signals): Promise<boolean> {
    const process = this.processes.get(processId);
    if (!process) return false;
    
    return process.kill(signal);
  }

  async listProcesses(sessionId?: string): Promise<IExtendedTerminalProcess[]> {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (!session) return [];
      
      return session.processes.values() as unknown as IExtendedTerminalProcess[];
    }
    
    return Array.from(this.processes.values());
  }

  getProcess(processId: string): IExtendedTerminalProcess | undefined {
    return this.processes.get(processId);
  }

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
