/**
 * Tools Module
 * 
 * This module provides a comprehensive set of tools for code execution,
 * terminal access, and sandboxed operations in a secure and controlled manner.
 * 
 * The module follows a modular structure:
 * - logic/: Core implementations of the tool system components
 * - lib/: Utility functions and helpers
 * - skills/: Tool specifications and implementations
 * - types.ts: TypeScript type definitions and interfaces
 */

// Re-export all types
export * from './types';

// Core implementations
export { SYMindXDynamicToolSystem } from './logic/DynamicToolSystem';
export { SYMindXCodeExecutor } from './logic/CodeExecutor';
export { SYMindXTerminalInterface } from './logic/TerminalInterface';

// Utility functions
export * from './lib/processUtils';
export * from './lib/validation';

// Tool skills
export * from './skills/common.skills';

// Re-export commonly used types for convenience
export {
  ToolSpec,
  CodeExecutor,
  TerminalInterface,
  ExecutionContext,
  ExecutionResult,
  ValidationResult,
  TerminalResult,
  SpawnOptions,
  TerminalProcess,
  TerminalSessionOptions,
  TerminalSession
} from '../../extensions/mcp-client/types';

export interface DynamicToolSystem {
  createTool(specification: ToolSpec): ToolSpec
  codeExecution: CodeExecutor
  terminalAccess: TerminalInterface
}

export interface ExtendedTerminalProcess extends TerminalProcess {
export interface ExtendedTerminalProcess extends TerminalProcess {
  id: string
  command: string
  args: string[]
  startTime: Date
  status: 'running' | 'exited' | 'killed' | 'error'
  endTime?: Date
  childProcess?: ChildProcess
  wait: () => Promise<number | null>
  kill: (signal?: NodeJS.Signals) => boolean
}

export interface ToolSystemConfig {
  sandbox: {
    enabled: boolean
    allowedLanguages: string[]
    timeoutMs: number
    memoryLimitMB: number
    networkAccess: boolean
    fileSystemAccess: boolean
    maxProcesses: number
  }
  terminal: {
    enabled: boolean
    allowedCommands: string[]
    blockedCommands: string[]
    timeoutMs: number
    maxConcurrentProcesses: number
    workingDirectory: string
  }
  validation: {
    enabled: boolean
    strictMode: boolean
    allowDynamicImports: boolean
    maxCodeLength: number
  }
}

// Implementation
export class SYMindXDynamicToolSystem implements DynamicToolSystem {
  public codeExecution: CodeExecutor
  public terminalAccess: TerminalInterface
  private config: ToolSystemConfig
  private createdTools: Map<string, ToolSpec> = new Map()

  constructor(config: Partial<ToolSystemConfig> = {}) {
    this.config = {
      sandbox: {
        enabled: true,
        allowedLanguages: ['javascript', 'typescript', 'python', 'bash', 'shell'],
        timeoutMs: 30000,
        memoryLimitMB: 512,
        networkAccess: false,
        fileSystemAccess: true,
        maxProcesses: 5
      },
      terminal: {
        enabled: true,
        allowedCommands: ['ls', 'cat', 'echo', 'pwd', 'whoami', 'date', 'node', 'python', 'python3'],
        blockedCommands: ['rm', 'rmdir', 'del', 'format', 'fdisk', 'mkfs', 'dd', 'sudo', 'su'],
        timeoutMs: 60000,
        maxConcurrentProcesses: 3,
        workingDirectory: process.cwd()
      },
      validation: {
        enabled: true,
        strictMode: false,
        allowDynamicImports: false,
        maxCodeLength: 10000
      },
      ...config
    }

    this.terminalAccess = new SYMindXTerminalInterface(this.config)
    this.codeExecution = new SYMindXCodeExecutor(this.config, this.terminalAccess)
  }

  createTool(specification: ToolSpec): ToolSpec {
    const toolId = `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const tool: ToolSpec = {
      ...specification,
      name: specification.name,
      description: specification.description
    }
    
    // Tool is just the specification - execution is handled separately

    this.createdTools.set(toolId, tool)
    console.log(`🔧 Created dynamic tool '${specification.name}' (${toolId})`)
    
    return tool
  }

  private async validateInput(spec: ToolSpec, input: any): Promise<ValidationResult> {
    if (!this.config.validation.enabled) {
      return { valid: true, errors: [], warnings: [], suggestions: [] }
    }

    const errors: string[] = []

async validateInput(spec: ToolSpec, input: any): Promise<ValidationResult> {
  if (!this.config.validation.enabled) {
    return { valid: true, errors: [], warnings: [], suggestions: [] }
  }

  // Validate inputs against the tool's parameters schema
  if (spec.parameters) {
    const { error } = spec.parameters.validate(input)
    if (error) {
      return {
        valid: false,
        errors: [error.message],
        warnings: [],
        suggestions: []
      }
    }
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: []
  }
}

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: []
    }
  }

  private async executeCodeTool(spec: ToolSpec, input: any): Promise<any> {
    // Create a properly typed context with all required and optional properties
    const context: ExecutionContext & { 
      language?: string; 
      code?: string;
      workingDirectory?: string;
      timeout?: number;
    } = {
      ...input,
      toolId: spec.id,
      language: spec.language,
      code: spec.code,
      workingDirectory: this.config.terminal.workingDirectory,
      timeout: this.config.sandbox.timeoutMs
    }

    // Ensure code and language are properly passed
    const code = spec.code || ''
    const language = spec.language || 'javascript'
    
    // Update context with language and code
    const executionContext: ExecutionContext = {
      ...context,
      environment: {
        ...(context.environment || {}),
        language,
        code
      }
    }
    
    const result = await this.codeExecution.execute(code, executionContext) as any
    
    if (!result.success) {
      throw new Error(result.error || 'Code execution failed')
    }
    
    return result.output
  }

  private async executeTerminalTool(spec: ToolSpec, input: any): Promise<any> {
    // Terminal tools would need additional properties in ToolSpec interface
    // For now, using basic execution
    const command = 'echo'
    const args = ['Terminal tool execution not yet implemented']
    
    // Replace placeholders in command and args with input values
    const processedCommand = this.replacePlaceholders(command, input)
    const processedArgs = args.map(arg => this.replacePlaceholders(arg, input))
    
    const options: TerminalOptions = {
      cwd: this.config.terminal.workingDirectory,
      timeout: this.config.terminal.timeoutMs,
      env: Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined) as [string, string][]
      )
    }

    const result = await this.terminalAccess.execute(processedCommand, processedArgs, options)
    
    // Handle terminal result with proper type checking
    if (result && typeof result === 'object' && 'stdout' in result) {
      const terminalResult = result as TerminalResult
      return {
        output: terminalResult.stdout,
        error: terminalResult.stderr || '',
        exitCode: terminalResult.exitCode || 0,
        ...(terminalResult.processId ? { processId: terminalResult.processId } : {})
      };
    } else {
      throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
    }
  }

  private async executeHybridTool(spec: ToolSpec, input: any): Promise<any> {
    const results: any[] = [];
    
    // Handle main code execution
    if (spec.code) {
      const codeResult = await this.executeCodeTool(spec, input)
      results.push(codeResult)
    }

    // Multi-step execution would require extending ToolSpec interface
    // For now, executing single code block
    
    return results
  }

  private replacePlaceholders(text: string, input: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return input[key] !== undefined ? String(input[key]) : match
    })
  }

  // Utility methods
  getCreatedTools(): ToolSpec[] {
    return Array.from(this.createdTools.values())
  }

  getToolById(toolId: string): ToolSpec | undefined {
    return this.createdTools.get(toolId)
  }

  removeTool(toolId: string): boolean {
    const removed = this.createdTools.delete(toolId)
    if (removed) {
      console.log(`🗑️ Removed dynamic tool ${toolId}`)
    }
    return removed
  }

  clearTools(): void {
    const count = this.createdTools.size
    this.createdTools.clear()
    console.log(`🗑️ Cleared ${count} dynamic tools`)
  }

  /**
   * Get memory usage of a child process
   * @param childProcess The child process to monitor
   * @returns Memory usage in bytes
   */
  private getProcessMemoryUsage(childProcess: any): number {
    try {
      // For Node.js child processes, we can't directly get memory usage
      // This is a simplified implementation that returns current process memory
      // In a production environment, you might want to use process monitoring tools
      const memUsage = process.memoryUsage()
      return memUsage.heapUsed
    } catch (error) {
      console.warn('Failed to get process memory usage:', error)
      return 0
    }
  }

  async validate(code: string, language: string): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Basic validation
    if (!code || code.trim().length === 0) {
      errors.push('Code cannot be empty')
    }

    if (!this.config.sandbox.allowedLanguages.includes(language)) {
      errors.push(`Language ${language} is not allowed`)
    }

    if (code.length > this.config.validation.maxCodeLength) {
      errors.push(`Code too long: ${code.length} > ${this.config.validation.maxCodeLength}`)
    }

    // Language-specific validation
    switch (language) {
      case 'javascript':
      case 'typescript':
        if (code.includes('eval(')) {
          warnings.push('Use of eval() is discouraged for security reasons')
        }
        break
      case 'python':
        if (code.includes('exec(') || code.includes('eval(')) {
          warnings.push('Use of exec() or eval() is discouraged for security reasons')
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  private createSandbox(): SandboxedExecutor {
    // Create a code executor instance for the sandbox
    const codeExecutor = new SYMindXCodeExecutor(
      this.config,
      new SYMindXTerminalInterface(this.config, new Logger('TerminalInterface'))
    )
    
    // Create terminal interface instance
    const terminalInterface = new SYMindXTerminalInterface(this.config, new Logger('TerminalInterface'))
    
    // Create sandbox instance with proper typing
    const sandboxImpl: SandboxedExecutor = {
      processes: new Map<string, TerminalProcess>(),
      sessions: new Map<string, string[]>(),
      config: this.config,
      logger: new Logger('Sandbox'),
      codeExecutor,
      terminalInterface,
      
      async executeCode(
        code: string,
        language: string = 'javascript',
        context: ExecutionContext = {}
      ): Promise<ExecutionResult> {
        const result = await this.executeInSandbox(code, { ...context, language })
        return {
          success: result.exitCode === 0,
          output: result.output,
          error: result.error,
          exitCode: result.exitCode
        }
      },
      
      async createSession(): Promise<string> {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        this.sessions.set(sessionId, [])
        return sessionId
      },
      
      async kill(processId: string, signal?: NodeJS.Signals): Promise<boolean> {
        const process = this.processes.get(processId)
        if (!process) return false
        
        try {
          if ('kill' in process) {
            return await process.kill(signal)
          }
          return false
        } catch (error) {
          this.logger.error(`Failed to kill process ${processId}:`, error)
          return false
        }
      },
      
      async listProcesses(sessionId?: string): Promise<TerminalProcess[]> {
        if (sessionId) {
          const processIds = this.sessions.get(sessionId) || []
          return processIds
            .map(id => this.processes.get(id))
            .filter((p): p is TerminalProcess => p !== undefined)
        }
        return Array.from(this.processes.values())
      },
      
      destroy(): void {
        // Cleanup all processes
        for (const [id, process] of this.processes.entries()) {
          try {
            if ('kill' in process) {
              process.kill('SIGTERM')
            }
          } catch (error) {
            this.logger.error(`Error cleaning up process ${id}:`, error)
          }
        }
        this.processes.clear()
        this.sessions.clear()
      }
    }
    
    return sandboxImpl
  }
      processes: new Map<string, any>(),
      sessions: new Map<string, string[]>(),
      config: this.config,
      logger: new Logger('Sandbox'),
      
      async executeCode(
        code: string,
        language: string = 'javascript',
        context: ExecutionContext = {}
      ): Promise<ExecutionResult> {
        const result = await this.executeInSandbox(code, { ...context, language })
        return {
          success: result.exitCode === 0,
          output: result.output,
          error: result.error,
          exitCode: result.exitCode
        }
      },
      
      async createSession(): Promise<string> {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        this.sessions.set(sessionId, [])
        return sessionId
      },
      
      async kill(processId: string, signal?: NodeJS.Signals): Promise<boolean> {
        const process = this.processes.get(processId)
        if (!process) return false
        
        try {
          if (process.childProcess) {
            process.childProcess.kill(signal || 'SIGTERM')
          }
          process.status = 'killed'
          process.endTime = new Date()
          return true
        } catch (error) {
          this.logger.error(`Failed to kill process ${processId}:`, error)
          return false
        }
      },
      
      async listProcesses(sessionId?: string): Promise<TerminalProcess[]> {
        if (sessionId) {
          const processIds = this.sessions.get(sessionId) || []
          return processIds
            .map(id => this.processes.get(id))
            .filter((p): p is TerminalProcess => p !== undefined)
        }
        return Array.from(this.processes.values())
      },
      
      destroy(): void {
        // Cleanup all processes
        for (const [id, process] of this.processes.entries()) {
          try {
            if (process.childProcess) {
              process.childProcess.kill('SIGTERM')
            }
          } catch (error) {
            this.logger.error(`Error cleaning up process ${id}:`, error)
          }
        }
        this.processes.clear()
        this.sessions.clear()
      },
      
      // Add the codeExecutor getter
      get codeExecutor() {
        return {
          execute: (code: string, context: ExecutionContext) => 
            this.executeCode(code, context.language, context)
        }
      }
    }
    
    return sandbox as unknown as SandboxedExecutor
  }
}

export class SYMindXCodeExecutor implements CodeExecutor {
  private sandbox: SandboxedExecutor
  private terminal: SYMindXTerminalInterface
  private config: ToolSystemConfig
  private logger: Logger
  private capabilities: CodeExecutorCapabilities

  constructor(config: ToolSystemConfig, terminal: SYMindXTerminalInterface) {
    this.config = config
    this.terminal = terminal
    this.logger = new Logger('SYMindXCodeExecutor')
    this.sandbox = this.createSandbox()
    this.capabilities = {
      languages: ['javascript', 'typescript', 'python', 'bash'],
      maxExecutionTime: this.config.sandbox?.timeout ?? 30000,
      maxMemory: this.config.sandbox?.memoryLimit ?? 256,
      supportsStreaming: true,
      supportedFeatures: ['code_execution', 'file_operations', 'network_access']
    }
  }

  getCapabilities(): CodeExecutorCapabilities {
    return this.capabilities
  }

  async execute(code: string, context: ExecutionContext & { language?: string } = {}): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      console.log(`💻 Executing ${context.language} code (${executionId})`)
      
      // Validate language
      if (!this.config.sandbox.allowedLanguages.includes(context.language)) {
        throw new Error(`Language ${context.language} not allowed`)
      }
      
      // Validate code length
      if (code.length > this.config.validation.maxCodeLength) {
        throw new Error(`Code too long: ${code.length} > ${this.config.validation.maxCodeLength}`)
      }
      
      // Create temporary file
      const tempDir = await fs.mkdtemp(join(tmpdir(), 'symindx-code-'))
      const extension = this.getFileExtension(context.language)
      const codeFile = join(tempDir, `code${extension}`)
      
      // Prepare code with input injection
      const preparedCode = this.prepareCode(code, context.language, context)
      await fs.writeFile(codeFile, preparedCode)
      
      // Execute code
      const result = await this.executeFile(codeFile, context.language, context, executionId)
      
      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true })
      
      return result
      
    } catch (error) {
      console.error(`❌ Code execution failed (${executionId}):`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        output: null,
        duration: 0,
        resourceUsage: {
          memory: 0,
          cpu: 0,
          network: 0,
          filesystem: 0
        }
      }
    }
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: '.js',
      typescript: '.ts',
      python: '.py',
      bash: '.sh',
      shell: '.sh'
    }
    return extensions[language] || '.txt'
  }

  private prepareCode(code: string, language: string, context: ExecutionContext): string {
    const inputJson = JSON.stringify(context.input, null, 2)
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return `
const input = ${inputJson};
const console = { log: (...args) => process.stdout.write(args.join(' ') + '\n') };

${code}
`
      
      case 'python':
        return `
import json
import sys

input_data = ${inputJson}

${code}
`
      
      case 'bash':
      case 'shell':
        return `#!/bin/bash
set -e

${code}
`
      
      default:
        return code
    }
  }

  private async executeFile(filePath: string, language: string, context: ExecutionContext, executionId: string): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    return new Promise((resolve) => {
      const command = this.getExecutionCommand(language)
      const args = this.getExecutionArgs(language, filePath)
      
      const child = spawn(command, args, {
        cwd: context.workingDirectory,
        env: {
          ...process.env,
          ...context.environment
        },
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      this.activeExecutions.set(executionId, child)
      
      let stdout = ''
      let stderr = ''
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })
      
      // Timeout handling
      const timeout = setTimeout(() => {
        child.kill('SIGKILL')
        resolve({
          success: false,
          error: 'Execution timed out',
          output: null,
          duration: Date.now() - startTime,
          resourceUsage: {
            memory: 0,
            cpu: 0,
            network: 0,
            filesystem: 0
          }
        })
      }, context.timeout || this.config.sandbox.timeoutMs)
      
      child.on('close', (code) => {
        clearTimeout(timeout)
        this.activeExecutions.delete(executionId)
        
        const executionTime = Date.now() - startTime
        
        if (code === 0) {
          // Try to parse output as JSON, fallback to string
          let output: any
          try {
            output = JSON.parse(stdout.trim())
          } catch {
            output = stdout.trim()
          }
          
          resolve({
            success: true,
            output,
            duration: executionTime,
            resourceUsage: {
              memory: this.getProcessMemoryUsage(child),
              cpu: executionTime,
              network: 0,
              filesystem: 0 // Disk usage requires additional monitoring
            }
          })
        } else {
          resolve({
            success: false,
            error: stderr || `Process exited with code ${code}`,
            output: stdout || null,
            duration: executionTime,
            resourceUsage: {
              memory: this.getProcessMemoryUsage(child),
              cpu: executionTime,
              network: 0,
              filesystem: 0
            }
          })
        }
      })
      
      child.on('error', (error) => {
        clearTimeout(timeout)
        this.activeExecutions.delete(executionId)
        
        resolve({
          success: false,
          error: error.message,
          output: null,
          duration: Date.now() - startTime,
          resourceUsage: {
            memory: 0,
            cpu: 0,
            network: 0,
            filesystem: 0
          }
        })
      })
    })
  }

  private getExecutionCommand(language: string): string {
    const commands: Record<string, string> = {
      javascript: 'node',
      typescript: 'ts-node',
      python: 'python3',
      bash: 'bash',
      shell: 'sh'
    }
    return commands[language] || 'node'
  }

  private getExecutionArgs(language: string, filePath: string): string[] {
    switch (language) {
      case 'bash':
      case 'shell':
        return [filePath]
      default:
        return [filePath]
    }
  }

  stopExecution(executionId: string): boolean {
    const child = this.activeExecutions.get(executionId)
    if (child) {
      child.kill('SIGTERM')
      this.activeExecutions.delete(executionId)
      console.log(`🛑 Stopped code execution ${executionId}`)
      return true
    }
    return false
  }

  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys())
  }

  /**
   * Get memory usage for a child process
   * @param childProcess The child process to monitor
   * @returns Memory usage in bytes
   */
  private getProcessMemoryUsage(childProcess: any): number {
    try {
      // For Node.js child processes, we can't directly get memory usage
      // This is a simplified implementation that returns current process memory
      // In a production environment, you might want to use process monitoring tools
      const memUsage = process.memoryUsage()
      return memUsage.heapUsed
    } catch (error) {
      console.warn('Failed to get process memory usage:', error)
      return 0
    }
  }

  async validate(code: string, language: string): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Basic validation
    if (!code || code.trim().length === 0) {
      errors.push('Code cannot be empty')
    }

    if (!this.config.sandbox.allowedLanguages.includes(language)) {
      errors.push(`Language ${language} is not allowed`)
    }

    if (code.length > this.config.validation.maxCodeLength) {
      errors.push(`Code too long: ${code.length} > ${this.config.validation.maxCodeLength}`)
    }

    // Language-specific validation
    switch (language) {
      case 'javascript':
      case 'typescript':
        if (code.includes('eval(')) {
          warnings.push('Use of eval() is discouraged for security reasons')
        }
        break
      case 'python':
        if (code.includes('exec(') || code.includes('eval(')) {
          warnings.push('Use of exec() or eval() is discouraged for security reasons')
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
  }

  async sandbox(code: string, permissions: string[]): Promise<SandboxedExecutor> {
    // This is a simplified sandbox implementation
    // In production, you would want a more robust sandboxing solution
    return {
      async execute(input: any): Promise<any> {
        // Execute code in a restricted environment
        // This is a placeholder implementation
        throw new Error('Sandboxed execution not yet implemented')
      },
      destroy(): void {
        // Cleanup sandbox resources
  private config: ToolSystemConfig
  private logger: Logger

  constructor(config: ToolSystemConfig) {
    this.config = config
    this.logger = new Logger('SYMindXTerminalInterface')
  }

  async createSession(): Promise<string> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.sessions.set(sessionId, [])
    return sessionId
  }

  async kill(processId: string, signal?: NodeJS.Signals): Promise<boolean> {
    const process = this.processes.get(processId)
    if (!process) return false
    
    try {
      if (process.childProcess) {
        process.childProcess.kill(signal || 'SIGTERM')
      }
      process.status = 'killed'
      process.endTime = new Date()
      return true
    } catch (error) {
      this.logger.error(`Failed to kill process ${processId}:`, error)
      return false
    }
  }

  async listProcesses(sessionId?: string): Promise<TerminalProcess[]> {
    if (sessionId) {
      const processIds = this.sessions.get(sessionId) || []
      return processIds
        .map(id => this.processes.get(id))
        .filter((p): p is TerminalProcess => p !== undefined)
    }
    return Array.from(this.processes.values())
  }

  async execute(
    command: string,
    args: string[] = [],
    options: SpawnOptions = {}
  ): Promise<TerminalResult> {
    // Implementation of execute method
    const process = await this.spawnProcess(command, args, options);
    return this.handleProcessOutput(process);
    // Implementation of execute method
    const process = await this.spawnProcess(command, args, options);
    return this.handleProcessOutput(process);
    if (!this.config.terminal.enabled) {
      throw new Error('Terminal access is disabled')
    }
    
    // Security check
    if (this.config.terminal.blockedCommands.includes(command)) {
      throw new Error(`Command '${command}' is blocked for security reasons`)
    }
    
    if (this.config.terminal.allowedCommands.length > 0 && !this.config.terminal.allowedCommands.includes(command)) {
      throw new Error(`Command '${command}' is not in the allowed list`)
    }
    
    const processId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(` Executing terminal command: ${command} ${args.join(' ')} (${processId})`)
    
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const child = spawn(command, args, {
        cwd: options.cwd || this.config.terminal.workingDirectory,
        env: options.env || process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      const terminalProcess: ExtendedTerminalProcess = {
        id: processId,
        command,
        args,
        pid: child.pid || 0,
        stdout: '',
        stderr: '',
        startTime: new Date(),
        status: 'running'
      }
      
      this.processes.set(processId, terminalProcess)
      
      let stdout = ''
      let stderr = ''
      
      child.stdout?.on('data', (data) => {
        const chunk = data.toString()
        stdout += chunk
        this.emit('stdout', processId, chunk)
      })
      
      child.stderr?.on('data', (data) => {
        const chunk = data.toString()
        stderr += chunk
        this.emit('stderr', processId, chunk)
      })
      
      // Timeout handling
      const timeout = setTimeout(() => {
        child.kill('SIGKILL')
        terminalProcess.status = 'killed'
        resolve({
          stdout,
          stderr: stderr + '\nProcess killed due to timeout',
          exitCode: -1,
          duration: Date.now() - startTime,
          killed: true
        })
      }, options.timeout || this.config.terminal.timeoutMs)
      
      child.on('close', (code) => {
        clearTimeout(timeout)
        terminalProcess.status = 'exited'
        terminalProcess.endTime = new Date()
        this.processes.delete(processId)
        
        const result: TerminalResult = {
          stdout,
          stderr,
          exitCode: code || 0,
          duration: Date.now() - startTime,
          killed: false
        }
        
        console.log(`✅ Terminal command completed (${processId}): exit code ${code}`)
        this.emit('exited', processId, result)
        resolve(result)
      })
      
      child.on('error', (error) => {
        clearTimeout(timeout)
        terminalProcess.status = 'error'
        terminalProcess.endTime = new Date()
        this.processes.delete(processId)
        
        const result: TerminalResult = {
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: -1,
          duration: Date.now() - startTime,
          killed: false
        }
        
        console.error(` Terminal command failed (${processId}):`, error)
        this.emit('error', processId, error)
        resolve(result)
      })
    })
  }

  async spawn(command: string, args: string[] = [], options: TerminalOptions = {}): Promise<TerminalProcess> {
    if (!this.config.terminal.enabled) {
      throw new Error('Terminal access is disabled')
    }
    
    const processId = `spawn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const child = spawn(command, args, {
      cwd: options.cwd || this.config.terminal.workingDirectory,
      env: options.env || process.env,
      stdio: options.stdio || 'pipe',
      detached: options.detached || false
    })
    
    const terminalProcess: ExtendedTerminalProcess = {
      id: processId,
      command,
      args,
      pid: child.pid || 0,

      stdout: '',
      stderr: '',
      startTime: new Date(),
      status: 'running'
    }
    
    this.processes.set(processId, terminalProcess)
    
    console.log(` Spawned process: ${command} ${args.join(' ')} (${processId}, PID: ${child.pid})`)
    
    return terminalProcess
  }

  getActiveProcesses(): ExtendedTerminalProcess[] {
    return Array.from(this.processes.values());
  }

  getProcess(processId: string): TerminalProcess | null {
<<<<<<< Updated upstream
    return this.activeProcesses.get(processId) || null;
  }

  async kill(processId: string, signal?: string): Promise<boolean> {
    const terminalProcess = this.activeProcesses.get(processId);
    if (!terminalProcess || !terminalProcess.pid) {
      return false;
    }
    
    try {
      process.kill(terminalProcess.pid, signal as NodeJS.Signals || 'SIGTERM');
      terminalProcess.status = 'killed';
      this.activeProcesses.delete(processId);
      return true;
    } catch (error) {
      return false;
    }
  }

  listProcesses(): TerminalProcess[] {
    return Array.from(this.activeProcesses.values());
  }

  async createSession(options?: TerminalSessionOptions): Promise<TerminalSession> {
    throw new Error('Terminal sessions not implemented yet');
=======
    return this.processes.get(processId) || null;
>>>>>>> Stashed changes
  }

  getShell(): string {
    return process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
  }
  setWorkingDirectory(path: string): void {
    this.config.terminal.workingDirectory = path;
  }
}

// Factory function to create dynamic tool system
export function createDynamicToolSystem(config?: Partial<ToolSystemConfig>): DynamicToolSystem {
  return new SYMindXDynamicToolSystem(config)
}

// Utility function to create common tool specifications
export function createCommonToolSpecs(): ToolSpec[] {
  return [
    {
      id: 'file_reader',
      name: 'file_reader',
      description: 'Read contents of a file',
<<<<<<< Updated upstream
      category: 'filesystem',
=======
      category: 'file_operations',
      parameters: {
        filePath: {
          type: 'string',
          description: 'Path to the file to read',
          required: true
        }
      },
>>>>>>> Stashed changes
      code: `
const fs = require('fs').promises;

async function readFile() {
  try {
    const content = await fs.readFile(input.filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

readFile().then(result => console.log(JSON.stringify(result)));
`,
      language: 'javascript',
      permissions: ['fs:read'],
      version: '1.0.0',
      tags: ['file', 'read', 'utility']
    },
    {
      id: 'directory_lister',
      name: 'directory_lister',
      description: 'List contents of a directory',
<<<<<<< Updated upstream
      category: 'filesystem',
      code: `ls -la "$1"`,
      language: 'bash',
=======
      category: 'file_operations',
>>>>>>> Stashed changes
      parameters: {
        dirPath: {
          type: 'string',
          description: 'Path to the directory to list',
          required: true
        }
      },
      code: 'ls -la "$1"',
      language: 'bash',
      permissions: ['fs:read'],
      version: '1.0.0',
      tags: ['directory', 'list', 'utility'],
      validation: {
        input: {
          type: 'object',
          properties: {
            dirPath: { type: 'string' }
          },
          required: ['dirPath']
        }
      }
    },
    {
      id: 'text_processor',
      name: 'text_processor',
      description: 'Process text with various operations',
<<<<<<< Updated upstream
      category: 'text',
=======
      category: 'text_processing',
      parameters: {
        text: {
          type: 'string',
          description: 'Text to process',
          required: true
        },
        operation: {
          type: 'string',
          description: 'Operation to perform (uppercase, lowercase, reverse, wordcount)',
          required: true,
          enum: ['uppercase', 'lowercase', 'reverse', 'wordcount']
        }
      },
>>>>>>> Stashed changes
      code: `
function processText() {
  const { text, operation } = input;
  
  switch (operation) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'reverse':
      return text.split('').reverse().join('');
    case 'wordcount':
      return text.split(/\s+/).filter(word => word.length > 0).length;
    default:
      throw new Error('Unknown operation: ' + operation);
  }
}

const result = processText();
console.log(JSON.stringify({ result }));
`,
      language: 'javascript',
      permissions: [],
      version: '1.0.0',
      tags: ['text', 'processing', 'utility'],
      validation: {
        input: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            operation: { 
              type: 'string',
              enum: ['uppercase', 'lowercase', 'reverse', 'wordcount']
            }
          },
          required: ['text', 'operation']
        }
      }
    }
  ]
}