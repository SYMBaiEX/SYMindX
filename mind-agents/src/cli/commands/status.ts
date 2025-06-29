/**
 * Status Commands
 * 
 * System and agent status information:
 * - Runtime status
 * - Agent health checks
 * - System metrics
 * - Capability overview
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { CLIContext } from '../index.js'
import { Logger } from '../../utils/logger.js'
import { AgentStatus } from '../../types/agent.js'

export class StatusCommand {
  private logger = new Logger('cli:status')

  constructor(private context: CLIContext) {}

  getCommand(): Command {
    const cmd = new Command('status')
      .alias('s')
      .description('Show system and agent status')

    // System status
    cmd.command('system')
      .description('Show system status')
      .option('-v, --verbose', 'Show detailed information')
      .action(async (options) => {
        await this.showSystemStatus(options)
      })

    // Runtime status
    cmd.command('runtime')
      .description('Show runtime status')
      .action(async () => {
        await this.showRuntimeStatus()
      })

    // Agent status
    cmd.command('agent <agentId>')
      .description('Show specific agent status')
      .action(async (agentId) => {
        await this.showAgentStatus(agentId)
      })

    // Health check
    cmd.command('health')
      .description('Perform system health check')
      .option('-f, --fix', 'Attempt to fix issues')
      .action(async (options) => {
        await this.performHealthCheck(options)
      })

    // Capabilities overview
    cmd.command('capabilities')
      .alias('caps')
      .description('Show system capabilities')
      .action(async () => {
        await this.showCapabilities()
      })

    // Default action (show overview)
    cmd.action(async () => {
      await this.showOverview()
    })

    return cmd
  }

  async showOverview(): Promise<void> {
    try {
      console.log(chalk.blue.bold('\n🤖 SYMindX System Overview'))
      console.log(chalk.gray('─'.repeat(60)))

      // Runtime status
      const stats = this.context.runtime.getStats()
      const isRunning = stats.isRunning
      
      console.log(`${chalk.cyan('Runtime:')} ${isRunning ? chalk.green('✅ Running') : chalk.red('❌ Stopped')}`)
      console.log(`${chalk.cyan('Agents:')} ${stats.agents} total (${stats.autonomousAgents} autonomous)`)

      // Agent status summary
      const agents = Array.from(this.context.runtime.agents.values())
      const statusCounts = this.getStatusCounts(agents)

      if (agents.length > 0) {
        console.log(`${chalk.cyan('Agent Status:')}`)
        for (const [status, count] of Object.entries(statusCounts)) {
          const color = this.getStatusColor(status)
          console.log(`  ${color(status)}: ${count}`)
        }
      }

      // Command system status
      const commandStats = this.context.commandSystem.getStats()
      console.log(`${chalk.cyan('Commands:')} ${commandStats.totalCommands} total, ${commandStats.processingCommands} active`)

      // System resources
      const memoryUsage = process.memoryUsage()
      console.log(`${chalk.cyan('Memory:')} ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB used`)
      console.log(`${chalk.cyan('Uptime:')} ${(process.uptime() / 60).toFixed(1)} minutes`)

      // Quick health indicators
      const healthIssues = await this.getQuickHealthCheck()
      if (healthIssues.length > 0) {
        console.log(chalk.yellow('\n⚠️  Health Issues:'))
        for (const issue of healthIssues) {
          console.log(chalk.yellow(`  • ${issue}`))
        }
        console.log(chalk.gray('Run "symindx status health" for detailed health check'))
      } else {
        console.log(chalk.green('\n✅ All systems healthy'))
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to get system overview'))
      this.logger.error('Overview error:', error)
    }
  }

  async showSystemStatus(options: { verbose?: boolean }): Promise<void> {
    try {
      console.log(chalk.blue.bold('\n🖥️  System Status'))
      console.log(chalk.gray('─'.repeat(60)))

      // Process information
      console.log(chalk.cyan('Process Information:'))
      console.log(`  PID: ${process.pid}`)
      console.log(`  Node Version: ${process.version}`)
      console.log(`  Platform: ${process.platform} ${process.arch}`)
      console.log(`  Uptime: ${(process.uptime() / 60).toFixed(1)} minutes`)

      // Memory usage
      const memory = process.memoryUsage()
      console.log(chalk.cyan('\nMemory Usage:'))
      console.log(`  Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  External: ${(memory.external / 1024 / 1024).toFixed(2)} MB`)

      // CPU usage (if available)
      if (process.cpuUsage) {
        const cpuUsage = process.cpuUsage()
        console.log(chalk.cyan('\nCPU Usage:'))
        console.log(`  User: ${(cpuUsage.user / 1000).toFixed(2)}ms`)
        console.log(`  System: ${(cpuUsage.system / 1000).toFixed(2)}ms`)
      }

      // Environment
      if (options.verbose) {
        console.log(chalk.cyan('\nEnvironment:'))
        const envVars = [
          'NODE_ENV',
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'GROQ_API_KEY',
          'SLACK_BOT_TOKEN',
          'TELEGRAM_BOT_TOKEN'
        ]
        
        for (const envVar of envVars) {
          const value = process.env[envVar]
          const status = value ? '✅ Set' : '❌ Not set'
          console.log(`  ${envVar}: ${status}`)
        }
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to get system status'))
      this.logger.error('System status error:', error)
    }
  }

  async showRuntimeStatus(): Promise<void> {
    try {
      console.log(chalk.blue.bold('\n⚙️  Runtime Status'))
      console.log(chalk.gray('─'.repeat(60)))

      const stats = this.context.runtime.getStats()
      
      // Basic runtime info
      console.log(`${chalk.cyan('Status:')} ${stats.isRunning ? chalk.green('✅ Running') : chalk.red('❌ Stopped')}`)
      console.log(`${chalk.cyan('Total Agents:')} ${stats.agents}`)
      console.log(`${chalk.cyan('Autonomous Agents:')} ${stats.autonomousAgents}`)

      // Event bus status
      console.log(chalk.cyan('\nEvent Bus:'))
      console.log(`  Events: ${stats.eventBus.events}`)

      // Autonomous systems
      if (stats.autonomous && stats.autonomous.totalAutonomousAgents > 0) {
        console.log(chalk.cyan('\nAutonomous Systems:'))
        console.log(`  Engines: ${stats.autonomous.autonomousEngines}`)
        console.log(`  Decision Engines: ${stats.autonomous.decisionEngines}`)
        console.log(`  Behavior Systems: ${stats.autonomous.behaviorSystems}`)
        console.log(`  Lifecycle Systems: ${stats.autonomous.lifecycleSystems}`)
      }

      // Plugin information
      console.log(chalk.cyan('\nPlugins:'))
      console.log(`  Loaded: ${stats.plugins?.loaded || 0}`)
      console.log(`  Active: ${stats.plugins?.active || 0}`)

      // Runtime capabilities
      const capabilities = this.context.runtime.getRuntimeCapabilities()
      console.log(chalk.cyan('\nAvailable Modules:'))
      console.log(`  Memory Providers: ${capabilities.modules.memory.available.join(', ')}`)
      console.log(`  Emotion Modules: ${capabilities.modules.emotion.available.join(', ')}`)
      console.log(`  Cognition Modules: ${capabilities.modules.cognition.available.join(', ')}`)
      console.log(`  Portals: ${capabilities.modules.portals.available.join(', ')}`)

    } catch (error) {
      console.log(chalk.red('❌ Failed to get runtime status'))
      this.logger.error('Runtime status error:', error)
    }
  }

  async showAgentStatus(agentId: string): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      console.log(chalk.blue.bold(`\n🤖 Agent Status: ${agent.name}`))
      console.log(chalk.gray('─'.repeat(60)))

      // Basic info
      console.log(`${chalk.cyan('ID:')} ${agent.id}`)
      console.log(`${chalk.cyan('Name:')} ${agent.name}`)
      console.log(`${chalk.cyan('Status:')} ${this.getStatusColor(agent.status)(agent.status)}`)
      console.log(`${chalk.cyan('Last Update:')} ${agent.lastUpdate?.toLocaleString() || 'never'}`)

      // Emotion state
      if (agent.emotion) {
        console.log(chalk.cyan('\nEmotion State:'))
        console.log(`  Current: ${agent.emotion.current}`)
        console.log(`  Intensity: ${agent.emotion.intensity}`)
        const emotionState = agent.emotion.getCurrentState()
        if (emotionState.triggers && emotionState.triggers.length > 0) {
          console.log(`  Triggers: ${emotionState.triggers.join(', ')}`)
        }
      }

      // Extensions
      console.log(chalk.cyan('\nExtensions:'))
      for (const ext of agent.extensions) {
        const statusIcon = ext.enabled ? '✅' : '❌'
        console.log(`  ${statusIcon} ${ext.name} (${ext.id})`)
      }

      // Portal
      if (agent.portal) {
        console.log(chalk.cyan('\nPortal:'))
        console.log(`  Type: ${agent.portal.name || 'configured'}`)
        console.log(`  Enabled: ${agent.portal.enabled ? '✅' : '❌'}`)
      }

      // Autonomous status
      const autonomousStatus = this.context.runtime.getAutonomousStatus(agentId)
      if (autonomousStatus.autonomous) {
        console.log(chalk.cyan('\nAutonomous Capabilities:'))
        console.log(`  Autonomy Level: ${((autonomousStatus.engine?.autonomyLevel || 0) * 100).toFixed(0)}%`)
        console.log(`  Interruptible: ${autonomousStatus.engine?.interruptible ? '✅' : '❌'}`)
        console.log(`  Ethical Constraints: ${autonomousStatus.engine?.ethicalConstraints ? '✅' : '❌'}`)
        
        if (autonomousStatus.lifecycle) {
          console.log(`  Lifecycle State: ${autonomousStatus.lifecycle?.lifecycle?.stage || 'unknown'}`)
        }
      }

      // Command queue
      const agentCommands = this.context.commandSystem.getAgentQueue(agentId)
      console.log(chalk.cyan(`\nCommand Queue: ${agentCommands.length} pending`))
      if (agentCommands.length > 0) {
        for (const cmd of agentCommands.slice(0, 5)) {
          console.log(`  • ${cmd.instruction} (${cmd.priority})`)
        }
        if (agentCommands.length > 5) {
          console.log(`  ... and ${agentCommands.length - 5} more`)
        }
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to get agent status'))
      this.logger.error('Agent status error:', error)
    }
  }

  async performHealthCheck(options: { fix?: boolean }): Promise<void> {
    try {
      console.log(chalk.blue.bold('\n🏥 System Health Check'))
      console.log(chalk.gray('─'.repeat(60)))

      const issues: string[] = []
      const warnings: string[] = []

      // Check runtime
      console.log(chalk.cyan('🔍 Checking runtime...'))
      const stats = this.context.runtime.getStats()
      if (!stats.isRunning) {
        issues.push('Runtime is not running')
      } else {
        console.log(chalk.green('  ✅ Runtime is running'))
      }

      // Check agents
      console.log(chalk.cyan('🔍 Checking agents...'))
      const agents = Array.from(this.context.runtime.agents.values())
      if (agents.length === 0) {
        warnings.push('No agents loaded')
      } else {
        console.log(chalk.green(`  ✅ ${agents.length} agents loaded`))
        
        const errorAgents = agents.filter(agent => agent.status === AgentStatus.ERROR)
        if (errorAgents.length > 0) {
          issues.push(`${errorAgents.length} agents in error state`)
        }
      }

      // Check memory usage
      console.log(chalk.cyan('🔍 Checking memory usage...'))
      const memory = process.memoryUsage()
      const heapUsedMB = memory.heapUsed / 1024 / 1024
      if (heapUsedMB > 1000) { // > 1GB
        warnings.push(`High memory usage: ${heapUsedMB.toFixed(2)} MB`)
      } else {
        console.log(chalk.green('  ✅ Memory usage is normal'))
      }

      // Check API keys
      console.log(chalk.cyan('🔍 Checking API keys...'))
      const apiKeys = [
        { name: 'OpenAI', env: 'OPENAI_API_KEY' },
        { name: 'Anthropic', env: 'ANTHROPIC_API_KEY' },
        { name: 'Groq', env: 'GROQ_API_KEY' }
      ]
      
      let hasApiKey = false
      for (const apiKey of apiKeys) {
        if (process.env[apiKey.env]) {
          console.log(chalk.green(`  ✅ ${apiKey.name} API key configured`))
          hasApiKey = true
        }
      }
      
      if (!hasApiKey) {
        warnings.push('No AI portal API keys configured')
      }

      // Check extensions
      console.log(chalk.cyan('🔍 Checking extensions...'))
      const totalExtensions = agents.reduce((sum, agent) => sum + agent.extensions.length, 0)
      const enabledExtensions = agents.reduce((sum, agent) => 
        sum + agent.extensions.filter(ext => ext.enabled).length, 0)
      
      if (totalExtensions > 0) {
        console.log(chalk.green(`  ✅ ${enabledExtensions}/${totalExtensions} extensions enabled`))
      } else {
        warnings.push('No extensions loaded')
      }

      // Check command system
      console.log(chalk.cyan('🔍 Checking command system...'))
      const commandStats = this.context.commandSystem.getStats()
      if (commandStats.failedCommands > commandStats.completedCommands * 0.5) {
        warnings.push('High command failure rate')
      } else {
        console.log(chalk.green('  ✅ Command system is healthy'))
      }

      // Summary
      console.log(chalk.cyan('\n📋 Health Check Summary:'))
      
      if (issues.length === 0 && warnings.length === 0) {
        console.log(chalk.green('🎉 All systems healthy!'))
      } else {
        if (issues.length > 0) {
          console.log(chalk.red('\n❌ Issues found:'))
          for (const issue of issues) {
            console.log(chalk.red(`  • ${issue}`))
          }
        }
        
        if (warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'))
          for (const warning of warnings) {
            console.log(chalk.yellow(`  • ${warning}`))
          }
        }

        if (options.fix) {
          console.log(chalk.blue('\n🔧 Attempting to fix issues...'))
          await this.attemptFixes(issues, warnings)
        } else {
          console.log(chalk.gray('\nUse --fix to attempt automatic fixes'))
        }
      }

    } catch (error) {
      console.log(chalk.red('❌ Health check failed'))
      this.logger.error('Health check error:', error)
    }
  }

  async showCapabilities(): Promise<void> {
    try {
      console.log(chalk.blue.bold('\n🛠️  System Capabilities'))
      console.log(chalk.gray('─'.repeat(60)))

      const capabilities = this.context.runtime.getRuntimeCapabilities()

      // Runtime info
      console.log(chalk.cyan('Runtime:'))
      console.log(`  Version: ${capabilities.runtime.version}`)
      console.log(`  Running: ${capabilities.runtime.isRunning ? '✅' : '❌'}`)
      console.log(`  Tick Interval: ${capabilities.runtime.tickInterval}ms`)

      // Agents
      console.log(chalk.cyan('\nAgents:'))
      console.log(`  Total: ${capabilities.agents.count}`)
      if (capabilities.agents.list.length > 0) {
        console.log(`  IDs: ${capabilities.agents.list.join(', ')}`)
      }

      // Modules
      console.log(chalk.cyan('\nModules:'))
      console.log(`  Memory Providers: ${capabilities.modules.memory.available.join(', ')}`)
      console.log(`  Emotion Modules: ${capabilities.modules.emotion.available.join(', ')}`)
      console.log(`  Cognition Modules: ${capabilities.modules.cognition.available.join(', ')}`)
      
      console.log(chalk.cyan('\nPortals:'))
      console.log(`  Available: ${capabilities.modules.portals.available.join(', ')}`)
      console.log(`  Factories: ${capabilities.modules.portals.factories.join(', ')}`)

      // Extensions
      console.log(chalk.cyan('\nExtensions:'))
      console.log(`  Loaded: ${capabilities.extensions.loaded.join(', ') || 'none'}`)

      // Command system capabilities
      const commandStats = this.context.commandSystem.getStats()
      console.log(chalk.cyan('\nCommand System:'))
      console.log(`  Total Commands Processed: ${commandStats.totalCommands}`)
      console.log(`  Success Rate: ${commandStats.totalCommands > 0 ? 
        ((commandStats.completedCommands / commandStats.totalCommands) * 100).toFixed(1) : 0}%`)
      console.log(`  Average Execution Time: ${commandStats.averageExecutionTime.toFixed(2)}ms`)

    } catch (error) {
      console.log(chalk.red('❌ Failed to get capabilities'))
      this.logger.error('Capabilities error:', error)
    }
  }

  async showDetailedStatus(): Promise<void> {
    await this.showOverview()
    console.log('\n')
    await this.showSystemStatus({ verbose: false })
    console.log('\n')
    await this.showRuntimeStatus()
  }

  private getStatusCounts(agents: any[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const agent of agents) {
      const status = agent.status || 'unknown'
      counts[status] = (counts[status] || 0) + 1
    }
    return counts
  }

  private getStatusColor(status: string): (text: string) => string {
    switch (status.toLowerCase()) {
      case 'active':
        return chalk.green
      case 'thinking':
        return chalk.blue
      case 'idle':
        return chalk.gray
      case 'error':
        return chalk.red
      default:
        return chalk.yellow
    }
  }

  private async getQuickHealthCheck(): Promise<string[]> {
    const issues: string[] = []
    
    try {
      // Check if runtime is running
      const stats = this.context.runtime.getStats()
      if (!stats.isRunning) {
        issues.push('Runtime is stopped')
      }

      // Check for error agents
      const agents = Array.from(this.context.runtime.agents.values())
      const errorAgents = agents.filter(agent => agent.status === 'error')
      if (errorAgents.length > 0) {
        issues.push(`${errorAgents.length} agents in error state`)
      }

      // Check memory usage
      const memory = process.memoryUsage()
      if (memory.heapUsed / 1024 / 1024 > 1000) {
        issues.push('High memory usage')
      }

      // Check command failure rate
      const commandStats = this.context.commandSystem.getStats()
      if (commandStats.totalCommands > 0 && 
          commandStats.failedCommands / commandStats.totalCommands > 0.5) {
        issues.push('High command failure rate')
      }

    } catch (error) {
      issues.push('Health check failed')
    }

    return issues
  }

  private async attemptFixes(issues: string[], warnings: string[]): Promise<void> {
    // This would implement automatic fixes for common issues
    console.log(chalk.yellow('⚠️  Automatic fixes not yet implemented'))
    console.log(chalk.gray('Would attempt to fix:'))
    
    for (const issue of issues) {
      console.log(chalk.gray(`  • ${issue}`))
    }
    
    for (const warning of warnings) {
      console.log(chalk.gray(`  • ${warning}`))
    }
  }
}