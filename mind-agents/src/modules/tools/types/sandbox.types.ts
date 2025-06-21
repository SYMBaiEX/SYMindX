import { ExecutionContext, ExecutionResult } from '../../../../extensions/mcp-client/types';

export interface ISandboxRuntime {
  // Core execution
  executeCode(code: string, context: ExecutionContext): Promise<ExecutionResult>;
  
  // Process management
  createProcess(command: string, args?: string[], options?: any): Promise<string>;
  terminateProcess(processId: string, signal?: NodeJS.Signals): Promise<boolean>;
  getProcessStatus(processId: string): Promise<any>; // Replace with specific type if available
  
  // Resource management
  getResourceUsage(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    activeProcesses: number;
  }>;
  
  // Security
  setSecurityPolicy(policy: SandboxSecurityPolicy): void;
  
  // Lifecycle
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface SandboxSecurityPolicy {
  allowNetworkAccess: boolean;
  allowFileSystemAccess: boolean;
  allowedDomains: string[];
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  environmentVariables: Record<string, string>;
}

export interface SandboxOptions {
  id?: string;
  timeout?: number;
  memoryLimitMB?: number;
  workingDirectory?: string;
  environment?: NodeJS.ProcessEnv;
  securityPolicy?: Partial<SandboxSecurityPolicy>;
}
