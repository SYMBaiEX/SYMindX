import { CodeExecutorCapabilities } from '../../../../extensions/mcp-client/types';

export interface SandboxConfig {
  enabled: boolean;
  allowedLanguages: string[];
  timeoutMs: number;
  memoryLimitMB: number;
  networkAccess: boolean;
  fileSystemAccess: boolean;
  maxProcesses: number;
}

export interface TerminalConfig {
  enabled: boolean;
  allowedCommands: string[];
  blockedCommands: string[];
  timeoutMs: number;
  maxConcurrentProcesses: number;
  workingDirectory: string;
}

export interface ValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  allowDynamicImports: boolean;
  maxCodeLength: number;
}

export interface ToolSystemConfig {
  sandbox: SandboxConfig;
  terminal: TerminalConfig;
  validation: ValidationConfig;
  [key: string]: any; // For additional config properties
}

export interface CodeExecutorConfig {
  capabilities: CodeExecutorCapabilities;
  // Add any additional config specific to code execution
}

export interface TerminalInterfaceConfig {
  // Add any terminal interface specific config
}
