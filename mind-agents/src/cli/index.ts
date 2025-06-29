#!/usr/bin/env node

/**
 * SYMindX CLI - Interactive Command Line Interface for Agent Management
 * 
 * This CLI provides comprehensive tools for interacting with autonomous agents:
 * - Agent management (start, stop, status, list)
 * - Interactive chat with agents
 * - Real-time monitoring and logs
 * - Direct command execution
 * - Multiple agent selection and control
 */

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { WebSocket } from 'ws'
import { SYMindXRuntime } from '../core/runtime.js'
import { RuntimeConfig } from '../types/agent.js'
import { ChatCommand } from './commands/chat.js'
import { AgentCommand } from './commands/agent.js'
import { MonitorCommand } from './commands/monitor.js'
import { StatusCommand } from './commands/status.js'
import { ListCommand } from './commands/list.js'
import { CommandSystem } from '../core/command-system.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger('cli')

interface CLIContext {
  runtime: SYMindXRuntime
  commandSystem: CommandSystem
  selectedAgent?: string
  ws?: WebSocket
  config: CLIConfig
}

interface CLIConfig {
  apiUrl: string
  wsUrl: string
  autoConnect: boolean
  defaultAgent?: string
  colors: boolean
  verbose: boolean
}

class SYMindXCLI {
  private context: CLIContext
  private program: Command
  private spinner = ora()

  constructor() {
    this.program = new Command()
    this.context = {
      runtime: new SYMindXRuntime(this.getDefaultRuntimeConfig()),
      commandSystem: new CommandSystem(),
      config: this.getDefaultCLIConfig()
    }

    this.setupProgram()
    this.setupCommands()
  }

  private getDefaultRuntimeConfig(): RuntimeConfig {
    return {
      tickInterval: 5000,
      maxAgents: 10,
      logLevel: 'info' as any,
      persistence: {
        enabled: true,
        path: './data'
      },
      extensions: {
        autoLoad: true,
        paths: ['./extensions']
      },
      portals: {
        autoLoad: true,
        paths: ['./portals'],
        apiKeys: {}
      }
    }
  }

  private getDefaultCLIConfig(): CLIConfig {
    return {
      apiUrl: process.env.SYMINDX_API_URL || 'http://localhost:3000',
      wsUrl: process.env.SYMINDX_WS_URL || 'ws://localhost:3000/ws',
      autoConnect: process.env.SYMINDX_AUTO_CONNECT === 'true',
      defaultAgent: process.env.SYMINDX_DEFAULT_AGENT,
      colors: process.env.NO_COLOR !== 'true',
      verbose: process.env.SYMINDX_VERBOSE === 'true'
    }
  }

  private setupProgram(): void {
    this.program
      .name('symindx')
      .description('SYMindX CLI - Interactive interface for autonomous agents')
      .version('1.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--no-colors', 'Disable colored output')
      .option('--api-url <url>', 'API server URL', this.context.config.apiUrl)
      .option('--ws-url <url>', 'WebSocket server URL', this.context.config.wsUrl)
      .option('--agent <id>', 'Default agent to interact with')
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts()
        this.context.config = { ...this.context.config, ...opts }
        
        if (!this.context.config.colors) {
          chalk.level = 0
        }
      })
  }

  private setupCommands(): void {
    // Agent management commands
    const agentCmd = new AgentCommand(this.context)
    this.program.addCommand(agentCmd.getCommand())

    // Interactive chat command
    const chatCmd = new ChatCommand(this.context)
    this.program.addCommand(chatCmd.getCommand())

    // Monitoring command
    const monitorCmd = new MonitorCommand(this.context)
    this.program.addCommand(monitorCmd.getCommand())

    // Status command
    const statusCmd = new StatusCommand(this.context)
    this.program.addCommand(statusCmd.getCommand())

    // List command
    const listCmd = new ListCommand(this.context)
    this.program.addCommand(listCmd.getCommand())

    // Interactive mode command
    this.program
      .command('interactive')
      .alias('i')
      .description('Start interactive mode with menu-driven interface')
      .action(async () => {
        await this.startInteractiveMode()
      })

    // Runtime management commands
    this.program
      .command('start-runtime')
      .description('Start the SYMindX runtime')
      .option('--daemon', 'Run as daemon process')
      .action(async (options) => {
        await this.startRuntime(options.daemon)
      })

    this.program
      .command('stop-runtime')
      .description('Stop the SYMindX runtime')
      .action(async () => {
        await this.stopRuntime()
      })

    // Quick actions
    this.program
      .command('quick-chat <message>')
      .description('Send a quick message to the default agent')
      .option('-a, --agent <id>', 'Agent to send message to')
      .action(async (message, options) => {
        await this.quickChat(message, options.agent)
      })
  }

  async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv)
    } catch (error) {
      logger.error('CLI error:', error)
      process.exit(1)
    }
  }

  private async startInteractiveMode(): Promise<void> {
    console.log(chalk.blue.bold('🤖 Welcome to SYMindX Interactive CLI'))
    console.log(chalk.gray('Select an option to continue:\n'))

    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '💬 Chat with agents', value: 'chat' },
            { name: '🤖 Manage agents', value: 'agents' },
            { name: '📊 View status', value: 'status' },
            { name: '📋 Monitor activity', value: 'monitor' },
            { name: '⚙️  Runtime control', value: 'runtime' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ])

      switch (action) {
        case 'chat':
          await this.interactiveChat()
          break
        case 'agents':
          await this.interactiveAgentManagement()
          break
        case 'status':
          await this.showInteractiveStatus()
          break
        case 'monitor':
          await this.startInteractiveMonitoring()
          break
        case 'runtime':
          await this.interactiveRuntimeControl()
          break
        case 'exit':
          console.log(chalk.green('👋 Goodbye!'))
          return
      }
    }
  }

  private async interactiveChat(): Promise<void> {
    const agents = await this.getAvailableAgents()
    
    if (agents.length === 0) {
      console.log(chalk.yellow('⚠️  No agents available. Start some agents first.'))
      return
    }

    const { selectedAgent } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgent',
        message: 'Select an agent to chat with:',
        choices: agents.map(agent => ({
          name: `${agent.name} (${agent.id}) - ${agent.status}`,
          value: agent.id
        }))
      }
    ])

    this.context.selectedAgent = selectedAgent
    const chatCmd = new ChatCommand(this.context)
    await chatCmd.startInteractiveChat()
  }

  private async interactiveAgentManagement(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Agent management:',
        choices: [
          { name: '📋 List agents', value: 'list' },
          { name: '▶️  Start agent', value: 'start' },
          { name: '⏹️  Stop agent', value: 'stop' },
          { name: '🔄 Restart agent', value: 'restart' },
          { name: '➕ Create agent', value: 'create' },
          { name: '❌ Remove agent', value: 'remove' },
          { name: '⬅️  Back', value: 'back' }
        ]
      }
    ])

    const agentCmd = new AgentCommand(this.context)
    
    switch (action) {
      case 'list':
        await agentCmd.listAgents()
        break
      case 'start':
        await agentCmd.interactiveStart()
        break
      case 'stop':
        await agentCmd.interactiveStop()
        break
      case 'restart':
        await agentCmd.interactiveRestart()
        break
      case 'create':
        await agentCmd.interactiveCreate()
        break
      case 'remove':
        await agentCmd.interactiveRemove()
        break
      case 'back':
        return
    }
  }

  private async showInteractiveStatus(): Promise<void> {
    const statusCmd = new StatusCommand(this.context)
    await statusCmd.showDetailedStatus()
  }

  private async startInteractiveMonitoring(): Promise<void> {
    const monitorCmd = new MonitorCommand(this.context)
    await monitorCmd.startInteractiveMonitoring()
  }

  private async interactiveRuntimeControl(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Runtime control:',
        choices: [
          { name: '▶️  Start runtime', value: 'start' },
          { name: '⏹️  Stop runtime', value: 'stop' },
          { name: '🔄 Restart runtime', value: 'restart' },
          { name: '📊 Runtime stats', value: 'stats' },
          { name: '⬅️  Back', value: 'back' }
        ]
      }
    ])

    switch (action) {
      case 'start':
        await this.startRuntime(false)
        break
      case 'stop':
        await this.stopRuntime()
        break
      case 'restart':
        await this.stopRuntime()
        await this.startRuntime(false)
        break
      case 'stats':
        await this.showRuntimeStats()
        break
      case 'back':
        return
    }
  }

  private async startRuntime(daemon: boolean): Promise<void> {
    this.spinner.start('Starting SYMindX runtime...')
    
    try {
      await this.context.runtime.initialize()
      await this.context.runtime.start()
      
      if (daemon) {
        console.log(chalk.green('✅ Runtime started as daemon'))
        process.exit(0)
      } else {
        this.spinner.succeed('Runtime started successfully')
      }
    } catch (error) {
      this.spinner.fail('Failed to start runtime')
      logger.error('Runtime start error:', error)
    }
  }

  private async stopRuntime(): Promise<void> {
    this.spinner.start('Stopping SYMindX runtime...')
    
    try {
      await this.context.runtime.stop()
      this.spinner.succeed('Runtime stopped successfully')
    } catch (error) {
      this.spinner.fail('Failed to stop runtime')
      logger.error('Runtime stop error:', error)
    }
  }

  private async showRuntimeStats(): Promise<void> {
    try {
      const stats = this.context.runtime.getStats()
      
      console.log(chalk.blue.bold('\n📊 Runtime Statistics'))
      console.log(chalk.gray('─'.repeat(40)))
      console.log(`${chalk.cyan('Agents:')} ${stats.agents}`)
      console.log(`${chalk.cyan('Autonomous Agents:')} ${stats.autonomousAgents}`)
      console.log(`${chalk.cyan('Running:')} ${stats.isRunning ? '✅' : '❌'}`)
      console.log(`${chalk.cyan('Events:')} ${stats.eventBus.events}`)
      
      if (stats.autonomous) {
        console.log(chalk.blue('\n🤖 Autonomous Systems'))
        console.log(`${chalk.cyan('Engines:')} ${stats.autonomous.autonomousEngines}`)
        console.log(`${chalk.cyan('Decision Engines:')} ${stats.autonomous.decisionEngines}`)
        console.log(`${chalk.cyan('Behavior Systems:')} ${stats.autonomous.behaviorSystems}`)
        console.log(`${chalk.cyan('Lifecycle Systems:')} ${stats.autonomous.lifecycleSystems}`)
      }
    } catch (error) {
      console.log(chalk.red('❌ Failed to get runtime stats'))
      logger.error('Stats error:', error)
    }
  }

  private async quickChat(message: string, agentId?: string): Promise<void> {
    const targetAgent = agentId || this.context.config.defaultAgent || this.context.selectedAgent
    
    if (!targetAgent) {
      console.log(chalk.red('❌ No agent specified. Use --agent <id> or set a default agent'))
      return
    }

    try {
      this.spinner.start(`Sending message to ${targetAgent}...`)
      
      const response = await this.context.commandSystem.sendMessage(targetAgent, message)
      
      this.spinner.stop()
      console.log(chalk.green(`\n💬 ${targetAgent}:`))
      console.log(chalk.white(response))
    } catch (error) {
      this.spinner.fail('Failed to send message')
      logger.error('Quick chat error:', error)
    }
  }

  private async getAvailableAgents(): Promise<Array<{ id: string; name: string; status: string }>> {
    try {
      const agents = Array.from(this.context.runtime.agents.values())
      return agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status
      }))
    } catch (error) {
      logger.error('Failed to get agents:', error)
      return []
    }
  }

  async cleanup(): Promise<void> {
    if (this.context.ws) {
      this.context.ws.close()
    }
    
    try {
      await this.context.runtime.stop()
    } catch (error) {
      logger.error('Cleanup error:', error)
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n⏹️  Shutting down gracefully...'))
  await cli.cleanup()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n⏹️  Received SIGTERM, shutting down...'))
  await cli.cleanup()
  process.exit(0)
})

// Create and run CLI
const cli = new SYMindXCLI()

if (import.meta.url === `file://${process.argv[1]}`) {
  cli.run(process.argv).catch((error) => {
    console.error(chalk.red('❌ CLI Error:'), error)
    process.exit(1)
  })
}

export { SYMindXCLI }
export type { CLIContext, CLIConfig }