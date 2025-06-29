/**
 * Agent Management Commands
 * 
 * Handles CLI commands for agent lifecycle management:
 * - List agents
 * - Start/stop agents
 * - Create/remove agents
 * - Agent status and configuration
 */

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { CLIContext } from '../index.js'
import { AgentConfig, AgentStatus } from '../../types/agent.js'
import { Logger } from '../../utils/logger.js'

export class AgentCommand {
  private logger = new Logger('cli:agent')
  private spinner = ora()

  constructor(private context: CLIContext) {}

  getCommand(): Command {
    const cmd = new Command('agent')
      .alias('a')
      .description('Agent management commands')

    // List agents
    cmd.command('list')
      .alias('ls')
      .description('List all agents')
      .option('-v, --verbose', 'Show detailed information')
      .option('-s, --status <status>', 'Filter by status')
      .action(async (options) => {
        await this.listAgents(options)
      })

    // Start agent
    cmd.command('start <agentId>')
      .description('Start an agent')
      .option('-w, --wait', 'Wait for agent to be ready')
      .action(async (agentId, options) => {
        await this.startAgent(agentId, options)
      })

    // Stop agent
    cmd.command('stop <agentId>')
      .description('Stop an agent')
      .option('-f, --force', 'Force stop without graceful shutdown')
      .action(async (agentId, options) => {
        await this.stopAgent(agentId, options)
      })

    // Restart agent
    cmd.command('restart <agentId>')
      .description('Restart an agent')
      .option('-w, --wait', 'Wait for agent to be ready')
      .action(async (agentId, options) => {
        await this.restartAgent(agentId, options)
      })

    // Create agent
    cmd.command('create')
      .description('Create a new agent interactively')
      .option('-f, --file <path>', 'Create from configuration file')
      .option('-t, --template <name>', 'Use template (basic, autonomous, social)')
      .action(async (options) => {
        await this.createAgent(options)
      })

    // Remove agent
    cmd.command('remove <agentId>')
      .alias('rm')
      .description('Remove an agent')
      .option('-f, --force', 'Force removal without confirmation')
      .action(async (agentId, options) => {
        await this.removeAgent(agentId, options)
      })

    // Agent info
    cmd.command('info <agentId>')
      .description('Show detailed agent information')
      .action(async (agentId) => {
        await this.showAgentInfo(agentId)
      })

    // Agent config
    cmd.command('config <agentId>')
      .description('Show or edit agent configuration')
      .option('-e, --edit', 'Edit configuration')
      .option('-s, --set <key=value>', 'Set configuration value', this.collectKeyValue, {})
      .action(async (agentId, options) => {
        await this.manageAgentConfig(agentId, options)
      })

    return cmd
  }

  async listAgents(options?: { verbose?: boolean; status?: string }): Promise<void> {
    try {
      const agents = Array.from(this.context.runtime.agents.values())
      
      if (agents.length === 0) {
        console.log(chalk.yellow('No agents found'))
        return
      }

      // Filter by status if specified
      const filteredAgents = options?.status 
        ? agents.filter(agent => agent.status.toLowerCase() === options.status!.toLowerCase())
        : agents

      if (filteredAgents.length === 0) {
        console.log(chalk.yellow(`No agents found with status: ${options?.status}`))
        return
      }

      console.log(chalk.blue.bold(`\n🤖 Agents (${filteredAgents.length})`))
      console.log(chalk.gray('─'.repeat(80)))

      for (const agent of filteredAgents) {
        const statusColor = this.getStatusColor(agent.status)
        const autonomousStatus = this.context.runtime.getAutonomousStatus(agent.id)
        const isAutonomous = autonomousStatus.autonomous

        if (options?.verbose) {
          console.log('\n' + chalk.cyan(agent.name) + ' ' + chalk.gray('(' + agent.id + ')'))
          console.log('  ' + chalk.white('Status:') + ' ' + statusColor)
          console.log('  ' + chalk.white('Autonomous:') + ' ' + (isAutonomous ? '✅' : '❌'))
          console.log('  ' + chalk.white('Emotion:') + ' ' + (agent.emotion?.current || 'unknown'))
          console.log('  ' + chalk.white('Last Update:') + ' ' + (agent.lastUpdate?.toLocaleString() || 'never'))
          console.log('  ' + chalk.white('Extensions:') + ' ' + agent.extensions.length)
          
          if (isAutonomous && autonomousStatus.engine) {
            console.log('  ' + chalk.white('Autonomy Level:') + ' ' + (autonomousStatus.engine.autonomyLevel * 100).toFixed(0) + '%')
          }
        } else {
          const autonomyIndicator = isAutonomous ? '🤖' : '👤'
          console.log(autonomyIndicator + ' ' + chalk.cyan(agent.name.padEnd(20)) + ' ' + statusColor(agent.status.padEnd(10)) + ' ' + chalk.gray(agent.id))
        }
      }

      if (options?.verbose) {
        console.log(chalk.gray('\n' + '─'.repeat(80)))
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to list agents'))
      this.logger.error('List agents error:', error)
    }
  }

  async startAgent(agentId: string, options?: { wait?: boolean }): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      if (agent.status === AgentStatus.ACTIVE) {
        console.log(chalk.yellow(`⚠️  Agent '${agent.name}' is already active`))
        return
      }

      this.spinner.start(`Starting agent ${agent.name}...`)

      // Start agent by setting status and initializing extensions
      agent.status = AgentStatus.ACTIVE
      
      // Initialize any stopped extensions
      for (const extension of agent.extensions) {
        if (!extension.enabled) {
          try {
            await extension.init(agent)
            extension.enabled = true
          } catch (error) {
            this.logger.warn(`Failed to start extension ${extension.name}:`, error)
          }
        }
      }

      if (options?.wait) {
        // Wait a moment for agent to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      this.spinner.succeed(`Agent ${agent.name} started successfully`)

    } catch (error) {
      this.spinner.fail(`Failed to start agent`)
      this.logger.error('Start agent error:', error)
    }
  }

  async stopAgent(agentId: string, options?: { force?: boolean }): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      if (agent.status === AgentStatus.IDLE || agent.status === AgentStatus.ERROR) {
        console.log(chalk.yellow(`⚠️  Agent '${agent.name}' is already stopped`))
        return
      }

      if (!options?.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to stop agent '${agent.name}'?`,
            default: false
          }
        ])

        if (!confirm) {
          console.log(chalk.gray('Operation cancelled'))
          return
        }
      }

      this.spinner.start(`Stopping agent ${agent.name}...`)

      // Stop agent
      agent.status = AgentStatus.IDLE

      // Stop extensions gracefully
      for (const extension of agent.extensions) {
        if (extension.enabled) {
          try {
            if ('stop' in extension && typeof extension.stop === 'function') {
              await extension.stop()
            }
            extension.enabled = false
          } catch (error) {
            this.logger.warn(`Failed to stop extension ${extension.name}:`, error)
          }
        }
      }

      this.spinner.succeed(`Agent ${agent.name} stopped successfully`)

    } catch (error) {
      this.spinner.fail(`Failed to stop agent`)
      this.logger.error('Stop agent error:', error)
    }
  }

  async restartAgent(agentId: string, options?: { wait?: boolean }): Promise<void> {
    await this.stopAgent(agentId, { force: true })
    await new Promise(resolve => setTimeout(resolve, 1000)) // Brief pause
    await this.startAgent(agentId, options)
  }

  async createAgent(options?: { file?: string; template?: string }): Promise<void> {
    try {
      let config: AgentConfig

      if (options?.file) {
        // Load from file
        const fs = await import('fs/promises')
        const configData = await fs.readFile(options.file, 'utf-8')
        config = JSON.parse(configData)
      } else if (options?.template) {
        // Use template
        config = this.getAgentTemplate(options.template)
      } else {
        // Interactive creation
        config = await this.createAgentInteractively()
      }

      this.spinner.start('Creating agent...')

      const agentId = await this.context.runtime.createAgent(config)
      
      this.spinner.succeed(`Agent created successfully with ID: ${agentId}`)
      console.log(chalk.green(`✅ Agent '${config.core.name}' is ready`))

    } catch (error) {
      this.spinner.fail('Failed to create agent')
      this.logger.error('Create agent error:', error)
    }
  }

  async removeAgent(agentId: string, options?: { force?: boolean }): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      if (!options?.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to permanently remove agent '${agent.name}'?`,
            default: false
          }
        ])

        if (!confirm) {
          console.log(chalk.gray('Operation cancelled'))
          return
        }
      }

      this.spinner.start(`Removing agent ${agent.name}...`)

      const success = await this.context.runtime.removeAgent(agentId)
      
      if (success) {
        this.spinner.succeed(`Agent ${agent.name} removed successfully`)
      } else {
        this.spinner.fail(`Failed to remove agent`)
      }

    } catch (error) {
      this.spinner.fail(`Failed to remove agent`)
      this.logger.error('Remove agent error:', error)
    }
  }

  async showAgentInfo(agentId: string): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      const autonomousStatus = this.context.runtime.getAutonomousStatus(agentId)
      const statusColor = this.getStatusColor(agent.status)

      console.log(chalk.blue.bold(`\n🤖 Agent Information`))
      console.log(chalk.gray('─'.repeat(50)))
      console.log(`${chalk.cyan('Name:')} ${agent.name}`)
      console.log(`${chalk.cyan('ID:')} ${agent.id}`)
      console.log(`${chalk.cyan('Status:')} ${statusColor}`)
      console.log(`${chalk.cyan('Autonomous:')} ${autonomousStatus.autonomous ? '✅ Yes' : '❌ No'}`)
      console.log(`${chalk.cyan('Emotion:')} ${agent.emotion?.current || 'unknown'}`)
      console.log(`${chalk.cyan('Last Update:')} ${agent.lastUpdate?.toLocaleString() || 'never'}`)

      if (agent.portal) {
        console.log(`${chalk.cyan('Portal:')} ${agent.portal.name || 'configured'}`)
      }

      // Extensions
      console.log(chalk.blue('\n📦 Extensions'))
      console.log(chalk.gray('─'.repeat(50)))
      for (const ext of agent.extensions) {
        const statusIcon = ext.enabled ? '✅' : '❌'
        console.log(`${statusIcon} ${ext.name} (${ext.id})`)
      }

      // Autonomous information
      if (autonomousStatus.autonomous && autonomousStatus.engine) {
        console.log(chalk.blue('\n🤖 Autonomous Status'))
        console.log(chalk.gray('─'.repeat(50)))
        console.log(`${chalk.cyan('Autonomy Level:')} ${(autonomousStatus.engine.autonomyLevel * 100).toFixed(0)}%`)
        console.log(`${chalk.cyan('Interruptible:')} ${autonomousStatus.engine.interruptible ? '✅' : '❌'}`)
        console.log(`${chalk.cyan('Ethical Constraints:')} ${autonomousStatus.engine.ethicalConstraints ? '✅' : '❌'}`)
        
        if (autonomousStatus.lifecycle) {
          console.log(chalk.cyan('Lifecycle State:') + ' ' + (autonomousStatus.lifecycle?.lifecycle?.stage || 'unknown'))
        }
      }

      // Configuration summary
      if (agent.config) {
        console.log(chalk.blue('\n⚙️  Configuration'))
        console.log(chalk.gray('─'.repeat(50)))
        console.log(`${chalk.cyan('Memory Provider:')} ${agent.config.psyche?.defaults?.memory || 'unknown'}`)
        console.log(`${chalk.cyan('Cognition Module:')} ${agent.config.psyche?.defaults?.cognition || 'unknown'}`)
        console.log(`${chalk.cyan('Emotion Module:')} ${agent.config.psyche?.defaults?.emotion || 'unknown'}`)
        console.log(`${chalk.cyan('Portal:')} ${agent.config.psyche?.defaults?.portal || 'none'}`)
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to get agent information'))
      this.logger.error('Agent info error:', error)
    }
  }

  async manageAgentConfig(agentId: string, options: any): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      if (options.edit) {
        console.log(chalk.yellow('⚠️  Configuration editing not yet implemented'))
        return
      }

      if (Object.keys(options.set || {}).length > 0) {
        console.log(chalk.yellow('⚠️  Configuration setting not yet implemented'))
        return
      }

      // Show configuration
      console.log(chalk.blue.bold(`\n⚙️  Configuration for ${agent.name}`))
      console.log(chalk.gray('─'.repeat(50)))
      console.log(JSON.stringify(agent.config, null, 2))

    } catch (error) {
      console.log(chalk.red('❌ Failed to manage agent configuration'))
      this.logger.error('Agent config error:', error)
    }
  }

  // Interactive methods for use from the main CLI
  async interactiveStart(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values())
      .filter(agent => agent.status !== AgentStatus.ACTIVE)

    if (agents.length === 0) {
      console.log(chalk.yellow('⚠️  No stopped agents to start'))
      return
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to start:',
        choices: agents.map(agent => ({
          name: `${agent.name} (${agent.status})`,
          value: agent.id
        }))
      }
    ])

    await this.startAgent(agentId, { wait: true })
  }

  async interactiveStop(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values())
      .filter(agent => agent.status === AgentStatus.ACTIVE)

    if (agents.length === 0) {
      console.log(chalk.yellow('⚠️  No running agents to stop'))
      return
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to stop:',
        choices: agents.map(agent => ({
          name: `${agent.name} (${agent.status})`,
          value: agent.id
        }))
      }
    ])

    await this.stopAgent(agentId)
  }

  async interactiveRestart(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values())

    if (agents.length === 0) {
      console.log(chalk.yellow('⚠️  No agents to restart'))
      return
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to restart:',
        choices: agents.map(agent => ({
          name: `${agent.name} (${agent.status})`,
          value: agent.id
        }))
      }
    ])

    await this.restartAgent(agentId, { wait: true })
  }

  async interactiveCreate(): Promise<void> {
    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'How would you like to create the agent?',
        choices: [
          { name: '🎨 Interactive setup', value: 'interactive' },
          { name: '📋 Use template', value: 'template' },
          { name: '📁 Load from file', value: 'file' }
        ]
      }
    ])

    switch (method) {
      case 'interactive':
        await this.createAgent()
        break
      case 'template':
        const { template } = await inquirer.prompt([
          {
            type: 'list',
            name: 'template',
            message: 'Select template:',
            choices: [
              { name: 'Basic Agent', value: 'basic' },
              { name: 'Autonomous Agent', value: 'autonomous' },
              { name: 'Social Agent', value: 'social' }
            ]
          }
        ])
        await this.createAgent({ template })
        break
      case 'file':
        const { file } = await inquirer.prompt([
          {
            type: 'input',
            name: 'file',
            message: 'Path to configuration file:',
            validate: (input) => input.trim().length > 0 || 'Please enter a file path'
          }
        ])
        await this.createAgent({ file })
        break
    }
  }

  async interactiveRemove(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values())

    if (agents.length === 0) {
      console.log(chalk.yellow('⚠️  No agents to remove'))
      return
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to remove:',
        choices: agents.map(agent => ({
          name: `${agent.name} (${agent.id})`,
          value: agent.id
        }))
      }
    ])

    await this.removeAgent(agentId)
  }

  private async createAgentInteractively(): Promise<AgentConfig> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        validate: (input) => input.trim().length > 0 || 'Please enter a name'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Agent description:',
        default: 'A helpful AI agent'
      },
      {
        type: 'list',
        name: 'memory',
        message: 'Memory provider:',
        choices: ['sqlite', 'memory', 'supabase', 'neon'],
        default: 'sqlite'
      },
      {
        type: 'list',
        name: 'cognition',
        message: 'Cognition module:',
        choices: ['htn-planner', 'reactive', 'hybrid'],
        default: 'htn-planner'
      },
      {
        type: 'list',
        name: 'emotion',
        message: 'Emotion module:',
        choices: ['rune-emotion-stack'],
        default: 'rune-emotion-stack'
      },
      {
        type: 'confirm',
        name: 'autonomous',
        message: 'Enable autonomous capabilities?',
        default: false
      }
    ])

    return {
      core: {
        name: answers.name,
        tone: 'friendly',
        personality: ['helpful', 'curious', 'analytical']
      },
      lore: {
        origin: 'Created by SYMindX CLI',
        motive: 'To assist and learn'
      },
      psyche: {
        defaults: {
          memory: answers.memory,
          cognition: answers.cognition,
          emotion: answers.emotion
        },
        traits: ['analytical', 'curious', 'helpful', 'persistent']
      },
      modules: {
        memory: {
          provider: 'sqlite' as any,
          maxRecords: 1000
        },
        cognition: {
          type: 'reactive' as any,
          planningDepth: 3,
          memoryIntegration: true,
          creativityLevel: 0.7
        },
        emotion: {
          type: 'rune_emotion_stack' as any,
          sensitivity: 0.6,
          decayRate: 0.1,
          transitionSpeed: 0.5
        },
        extensions: ['api']
      }
    }
  }

  private getAgentTemplate(template: string): AgentConfig {
    const baseConfig = {
      core: {
        name: `Agent-${Date.now()}`,
        tone: 'professional',
        personality: ['efficient', 'reliable', 'adaptable']
      },
      lore: {
        origin: 'Template-generated agent',
        motive: 'To assist and complete tasks efficiently'
      },
      psyche: {
        defaults: {
          memory: 'sqlite',
          cognition: 'htn-planner',
          emotion: 'rune-emotion-stack'
        },
        traits: ['analytical', 'curious', 'helpful', 'persistent']
      },
      modules: {
        memory: {
          provider: 'sqlite' as any,
          maxRecords: 1000
        },
        cognition: {
          type: 'reactive' as any,
          planningDepth: 3,
          memoryIntegration: true,
          creativityLevel: 0.7
        },
        emotion: {
          type: 'rune_emotion_stack' as any,
          sensitivity: 0.6,
          decayRate: 0.1,
          transitionSpeed: 0.5
        },
        extensions: ['api']
      }
    }

    switch (template) {
      case 'autonomous':
        return {
          ...baseConfig,
          core: {
            ...baseConfig.core,
            name: `Autonomous-Agent-${Date.now()}`,
            tone: 'confident',
            personality: ['independent', 'decisive', 'analytical']
          }
        }
      case 'social':
        return {
          ...baseConfig,
          core: {
            ...baseConfig.core,
            name: `Social-Agent-${Date.now()}`,
            tone: 'friendly',
            personality: ['empathetic', 'communicative', 'social']
          },
          psyche: {
            ...baseConfig.psyche,
            traits: ['empathetic', 'communicative', 'social', 'understanding', 'expressive']
          },
          modules: {
            ...baseConfig.modules,
            extensions: ['api', 'slack', 'telegram']
          }
        }
      default: // basic
        return baseConfig
    }
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

  private collectKeyValue(value: string, previous: Record<string, any>): Record<string, any> {
    const [key, val] = value.split('=')
    if (key && val !== undefined) {
      previous[key] = val
    }
    return previous
  }
}