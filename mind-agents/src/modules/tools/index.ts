/**
 * Dynamic Tool System Module
 * 
 * This module provides dynamic tool creation capabilities with code execution
 * and terminal access, similar to Agent Zero's innovative approach.
 */

import { spawn, ChildProcess } from 'child_process'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { EventEmitter } from 'events'
import {
  ToolSpec,
  ToolInput,
  ToolOutput,
  CodeExecutor,
  ExecutionContext,
  ExecutionResult,
  ValidationResult,
  SandboxedExecutor,
  ResourceUsage,
  TerminalInterface,
  TerminalOptions,
  TerminalResult,
  SpawnOptions,
  TerminalProcess
} from '../../extensions/mcp-client/types.js'
export interface DynamicToolSystem {
  createTool(specification: ToolSpec): ToolSpec
  codeExecution: CodeExecutor
  terminalAccess: TerminalInterface
}

export interface ExtendedTerminalProcess extends TerminalProcess {
  id: string
  command: string
  args: string[]
  startTime: Date
  status: 'running' | 'finished' | 'killed' | 'error'
  endTime?: Date
  childProcess?: ChildProcess
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

    this.codeExecution = new SYMindXCodeExecutor(this.config)
    this.terminalAccess = new SYMindXTerminalInterface(this.config)
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

    // Check required parameters
    if (spec.inputs) {
      for (const inputSpec of spec.inputs) {
        const paramName = inputSpec.name
        
        if (inputSpec.required && !(paramName in input)) {
          errors.push(`Missing required parameter: ${paramName}`)
        }
        
        if (paramName in input) {
          const value = input[paramName]
          
          // Type validation
          if (inputSpec.type && typeof value !== inputSpec.type) {
            errors.push(`Parameter ${paramName} must be of type ${inputSpec.type}, got ${typeof value}`)
          }
          
          // Basic validation for common types
          if (inputSpec.type === 'string' && typeof value === 'string') {
            if (value.length === 0) {
              errors.push(`Parameter ${paramName} cannot be empty`)
            }
          }
          
          if (inputSpec.type === 'number' && typeof value === 'number') {
            if (isNaN(value)) {
              errors.push(`Parameter ${paramName} must be a valid number`)
            }
          }
        }
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
    const context: ExecutionContext = {
      language: spec.language || 'javascript',
      code: spec.code || '',
      input,
      environment: {
        NODE_ENV: 'sandbox',
        TOOL_NAME: spec.name
      },
      workingDirectory: this.config.terminal.workingDirectory,
      timeout: this.config.sandbox.timeoutMs
    }

    const result = await this.codeExecution.execute(context.code, context.language, context as any)
    
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
    
    if (result.exitCode !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`)
    }
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    }
  }

  private async executeHybridTool(spec: ToolSpec, input: any): Promise<any> {
    const results: any[] = []
    
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
      }
    }
  }
}

export class SYMindXCodeExecutor implements CodeExecutor {
  private config: ToolSystemConfig
  private activeExecutions: Map<string, ChildProcess> = new Map()

  constructor(config: ToolSystemConfig) {
    this.config = config
  }

  async execute(code: string, language: string, context: ExecutionContext): Promise<ExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      console.log(`💻 Executing ${language} code (${executionId})`)
      
      // Validate language
      if (!this.config.sandbox.allowedLanguages.includes(language)) {
        throw new Error(`Language ${language} not allowed`)
      }
      
      // Validate code length
      if (code.length > this.config.validation.maxCodeLength) {
        throw new Error(`Code too long: ${code.length} > ${this.config.validation.maxCodeLength}`)
      }
      
      // Create temporary file
      const tempDir = await fs.mkdtemp(join(tmpdir(), 'symindx-code-'))
      const extension = this.getFileExtension(language)
      const codeFile = join(tempDir, `code${extension}`)
      
      // Prepare code with input injection
      const preparedCode = this.prepareCode(code, language, context)
      await fs.writeFile(codeFile, preparedCode)
      
      // Execute code
      const result = await this.executeFile(codeFile, language, context, executionId)
      
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
      }
    }
  }
}

export class SYMindXTerminalInterface extends EventEmitter implements TerminalInterface {
  private config: ToolSystemConfig
  private activeProcesses: Map<string, ExtendedTerminalProcess> = new Map()

  constructor(config: ToolSystemConfig) {
    super()
    this.config = config
  }

  async execute(command: string, args: string[] = [], options: TerminalOptions = {}): Promise<TerminalResult> {
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
    
    console.log(`🖥️ Executing terminal command: ${command} ${args.join(' ')} (${processId})`)
    
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
        stdin: child.stdin,
        stdout: child.stdout,
        stderr: child.stderr,
        kill: (signal?: NodeJS.Signals) => child.kill(signal),
        wait: () => new Promise((resolve) => child.on('close', resolve)),
        startTime: new Date(),
        status: 'running',
        childProcess: child
      }
      
      this.activeProcesses.set(processId, terminalProcess)
      
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
          processId
        })
      }, options.timeout || this.config.terminal.timeoutMs)
      
      child.on('close', (code) => {
        clearTimeout(timeout)
        terminalProcess.status = 'finished'
        terminalProcess.endTime = new Date()
        this.activeProcesses.delete(processId)
        
        const result: TerminalResult = {
          stdout,
          stderr,
          exitCode: code || 0,
          duration: Date.now() - startTime,
          processId
        }
        
        console.log(`✅ Terminal command completed (${processId}): exit code ${code}`)
        this.emit('finished', processId, result)
        resolve(result)
      })
      
      child.on('error', (error) => {
        clearTimeout(timeout)
        terminalProcess.status = 'error'
        terminalProcess.endTime = new Date()
        this.activeProcesses.delete(processId)
        
        const result: TerminalResult = {
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: -1,
          duration: Date.now() - startTime,
          processId
        }
        
        console.error(`❌ Terminal command failed (${processId}):`, error)
        this.emit('error', processId, error)
        resolve(result)
      })
    })
  }

  async spawn(command: string, args: string[] = [], options: SpawnOptions = {}): Promise<ExtendedTerminalProcess> {
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
      stdin: child.stdin,
      stdout: child.stdout,
      stderr: child.stderr,
      kill: (signal?: NodeJS.Signals) => child.kill(signal),
      wait: () => new Promise((resolve) => child.on('exit', resolve)),
      startTime: new Date(),
      status: 'running',
      childProcess: child
    }
    
    this.activeProcesses.set(processId, terminalProcess)
    
    console.log(`🚀 Spawned process: ${command} ${args.join(' ')} (${processId}, PID: ${child.pid})`)
    
    return terminalProcess
  }

  killProcess(processId: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const process = this.activeProcesses.get(processId)
    if (process && process.childProcess) {
      process.childProcess.kill(signal)
      process.status = 'killed'
      process.endTime = new Date()
      this.activeProcesses.delete(processId)
      console.log(`🛑 Killed process ${processId} with signal ${signal}`)
      return true
    }
    return false
  }

  getActiveProcesses(): ExtendedTerminalProcess[] {
    return Array.from(this.activeProcesses.values());
  }

  getProcess(processId: string): ExtendedTerminalProcess | undefined {
    return this.activeProcesses.get(processId);
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
      name: 'file_reader',
      description: 'Read contents of a file',
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
      inputs: [
        {
          name: 'filePath',
          type: 'string',
          description: 'Path to the file to read',
          required: true
        }
      ],
      outputs: [
        {
          name: 'result',
          type: 'object',
          description: 'File read result with success status and content or error'
        }
      ],
      permissions: ['fs:read']
    },
    {
      name: 'directory_lister',
      description: 'List contents of a directory',
      code: `ls -la "$1"`,
      language: 'bash',
      inputs: [
        {
          name: 'dirPath',
          type: 'string',
          description: 'Path to the directory to list',
          required: true
        }
      ],
      outputs: [
        {
          name: 'listing',
          type: 'string',
          description: 'Directory listing output'
        }
      ],
      permissions: ['fs:read']
    },
    {
      name: 'text_processor',
      description: 'Process text with various operations',
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
      return text.split(/\\s+/).filter(word => word.length > 0).length;
    default:
      throw new Error('Unknown operation: ' + operation);
  }
}

const result = processText();
console.log(JSON.stringify({ result }));
`,
      language: 'javascript',
      inputs: [
        {
          name: 'text',
          type: 'string',
          description: 'Text to process',
          required: true
        },
        {
          name: 'operation',
          type: 'string',
          description: 'Operation to perform (uppercase, lowercase, reverse, wordcount)',
          required: true
        }
      ],
      outputs: [
        {
          name: 'result',
          type: 'string',
          description: 'Processed text result'
        }
      ],
      permissions: []
    }
  ]
}