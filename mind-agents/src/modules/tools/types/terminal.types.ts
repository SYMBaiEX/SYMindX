import { ChildProcess } from 'child_process';
import { TerminalProcess, TerminalResult, SpawnOptions } from '../../../../extensions/mcp-client/types';

export interface IExtendedTerminalProcess extends TerminalProcess {
  childProcess?: ChildProcess;
  status: 'running' | 'exited' | 'killed' | 'error';
  wait: () => Promise<number | null>;
  kill: (signal?: NodeJS.Signals) => boolean;
}

export interface ITerminalInterface {
  execute(
    command: string,
    args?: string[],
    options?: SpawnOptions
  ): Promise<TerminalResult>;
  
  spawnProcess(
    command: string,
    args?: string[],
    options?: SpawnOptions
  ): Promise<IExtendedTerminalProcess>;
  
  kill(processId: string, signal?: NodeJS.Signals): Promise<boolean>;
  listProcesses(sessionId?: string): Promise<IExtendedTerminalProcess[]>;
  getProcess(processId: string): IExtendedTerminalProcess | undefined;
}

export interface ITerminalSession {
  id: string;
  processes: Map<string, IExtendedTerminalProcess>;
  startTime: Date;
  endTime?: Date;
  workingDirectory: string;
  environment: NodeJS.ProcessEnv;
}
