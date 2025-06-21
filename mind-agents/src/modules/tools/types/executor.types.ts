import { ExecutionContext, ExecutionResult, ValidationResult, ToolSpec } from '../../../../extensions/mcp-client/types';

export interface ICodeExecutor {
  execute(code: string, context: ExecutionContext & { language?: string }): Promise<ExecutionResult>;
  validate(code: string, language: string): Promise<ValidationResult>;
  getCapabilities(): any; // Replace with specific type if available
  stopExecution(executionId: string): boolean;
  getActiveExecutions(): string[];
}

export interface ISandboxedExecutor {
  executeCode(code: string, language: string, context: ExecutionContext): Promise<ExecutionResult>;
  createSession(): Promise<string>;
  kill(processId: string, signal?: NodeJS.Signals): Promise<boolean>;
  listProcesses(sessionId?: string): Promise<any[]>; // Replace with specific type if available
  destroy(): void;
}

export interface IToolSystem {
  createTool(specification: ToolSpec): ToolSpec;
  validateInput(spec: ToolSpec, input: any): Promise<ValidationResult>;
  executeCodeTool(spec: ToolSpec, input: any): Promise<any>;
  executeTerminalTool(spec: ToolSpec, input: any): Promise<any>;
  executeHybridTool(spec: ToolSpec, input: any): Promise<any>;
  getCreatedTools(): ToolSpec[];
  getToolById(toolId: string): ToolSpec | undefined;
  removeTool(toolId: string): boolean;
  clearTools(): void;
}
