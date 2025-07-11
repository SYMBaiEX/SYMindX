#!/usr/bin/env node

/**
 * SYMindX CLI - Awesome Interactive Interface
 * Make this look cool as fuck!
 */

import blessed from 'blessed'
import contrib from 'blessed-contrib'
import boxen from 'boxen'
import chalk from 'chalk'
import { Command } from 'commander'
import figlet from 'figlet'
import gradient from 'gradient-string'
import inquirer from 'inquirer'
import WebSocket from 'ws'

import { SYMindXRuntime } from '../core/runtime'
import { RuntimeConfig } from '../types/agent'
import { 
  displayBanner, 
  createSpinner, 
  displayAgentStatus, 
  displayChatMessage, 
  displayError, 
  displaySuccess, 
  createProgressBar,
  animateLoading,
  matrixRain,
  animateShutdown
} from '../utils/cli-ui'

import { CommandSystem } from '../core/command-system'

// CLI Context interface for commands
export interface CLIContext {
  runtime: SYMindXRuntime
  config: CLIConfig
  selectedAgent?: string
  commandSystem: CommandSystem
}

// Cool gradients
const coolGradient = gradient(['#FF006E', '#8338EC', '#3A86FF'])
const neonGradient = gradient(['#00F5FF', '#FF00FF', '#FFFF00'])
const fireGradient = gradient(['#FF6B6B', '#FFA500', '#FFD700'])

export interface CLIConfig {
  apiUrl: string
  wsUrl: string
  autoConnect: boolean
  defaultAgent?: string
  colors: boolean
  verbose: boolean
}

class AwesomeSYMindXCLI {
  private program: Command
  private config: CLIConfig
  private ws?: WebSocket
  
  constructor() {
    this.program = new Command()
    this.config = this.getDefaultConfig()
    this.setupProgram()
    this.setupCommands()
  }

  private getDefaultConfig(): CLIConfig {
    const port = process.env.API_PORT || '8000'
    return {
      apiUrl: process.env.SYMINDX_API_URL || `http://localhost:${port}`,
      wsUrl: process.env.SYMINDX_WS_URL || `ws://localhost:${port}/ws`,
      autoConnect: process.env.SYMINDX_AUTO_CONNECT === 'true',
      ...(process.env.SYMINDX_DEFAULT_AGENT && { defaultAgent: process.env.SYMINDX_DEFAULT_AGENT }),
      colors: process.env.NO_COLOR !== 'true',
      verbose: process.env.SYMINDX_VERBOSE === 'true'
    }
  }

  private setupProgram(): void {
    this.program
      .name('symindx')
      .description(chalk.cyan('🚀 SYMindX CLI - The coolest AI agent interface ever'))
      .version('1.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--no-colors', 'Disable colored output')
      .option('--api-url <url>', 'API server URL', this.config.apiUrl)
      .option('--ws-url <url>', 'WebSocket server URL (default: "ws://localhost:8000/ws")', this.config.wsUrl)
      .option('--agent <id>', 'Default agent to interact with')
      .option('--matrix', 'Show matrix rain animation on startup')
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts()
        this.config = { ...this.config, ...opts }
        
        if (!this.config.colors) {
          chalk.level = 0
        }
      })
  }

  private setupCommands(): void {
    // Interactive mode (default)
    this.program
      .command('interactive', { isDefault: true })
      .alias('i')
      .description('🎮 Start interactive mode with awesome UI')
      .action(async () => {
        await this.startInteractiveMode()
      })

    // Ink CLI mode - modern React-based CLI interface
    this.program
      .command('dashboard')
      .alias('ink')
      .description('📊 Start modern React-based CLI dashboard')
      .option('--view <view>', 'Initial view (dashboard, agents, status)', 'dashboard')
      .action(async (options) => {
        await this.startInkCLI(options.view)
      })

    // Chat command
    this.program
      .command('chat')
      .alias('c')
      .description('💬 Chat with an agent')
      .option('-a, --agent <id>', 'Agent to chat with')
      .option('-m, --message <text>', 'Message to send')
      .action(async (options) => {
        if (options.message) {
          await this.quickChat(options.message, options.agent)
        } else {
          await this.startChatMode(options.agent)
        }
      })

    // Status command
    this.program
      .command('status')
      .alias('s')
      .description('📊 Show system status')
      .option('--dashboard', 'Show live dashboard')
      .action(async (options) => {
        if (options.dashboard) {
          await this.showDashboard()
        } else {
          await this.showStatus()
        }
      })

    // Agent commands
    const agent = this.program
      .command('agent')
      .alias('a')
      .description('🤖 Manage agents')

    agent
      .command('list')
      .alias('ls')
      .description('List all agents')
      .action(async () => {
        await this.listAgents()
      })

    agent
      .command('start <id>')
      .description('Start an agent')
      .action(async (id) => {
        await this.startAgent(id)
      })

    agent
      .command('stop <id>')
      .description('Stop an agent')
      .action(async (id) => {
        await this.stopAgent(id)
      })

    agent
      .command('info <id>')
      .description('Show detailed agent information')
      .action(async (id) => {
        await this.showAgentInfo(id)
      })

    agent
      .command('create')
      .description('Create a new agent')
      .action(async () => {
        await this.createAgent()
      })

    // Fun commands
    this.program
      .command('matrix')
      .description('🟢 Show matrix rain animation')
      .option('-d, --duration <ms>', 'Duration in milliseconds', '5000')
      .action(async (options) => {
        await matrixRain(parseInt(options.duration))
      })

    this.program
      .command('banner')
      .description('🎨 Show the awesome banner')
      .action(async () => {
        await displayBanner()
      })
  }

  async run(argv: string[]): Promise<void> {
    try {
      // Show banner on startup for non-ink commands
      if (argv.length <= 2 || (argv.includes('--matrix') && !argv.includes('dashboard') && !argv.includes('ink'))) {
        await displayBanner()
        
        if (argv.includes('--matrix')) {
          await matrixRain(3000)
        }
      }

      // Parse commands
      await this.program.parseAsync(argv)
    } catch (error) {
      displayError(error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  }

  private async startInteractiveMode(): Promise<void> {
    console.clear()
    await displayBanner()
    
    console.log(coolGradient('\n✨ Welcome to SYMindX Interactive Mode ✨\n'))
    
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: coolGradient('What would you like to do?'),
          choices: [
            new inquirer.Separator(chalk.gray('─────────────────────')),
            { name: chalk.cyan('💬 Chat with AI Agents'), value: 'chat' },
            { name: chalk.magenta('🤖 Manage Agents'), value: 'agents' },
            { name: chalk.blue('📊 System Status'), value: 'status' },
            { name: chalk.green('🎯 Live Dashboard'), value: 'dashboard' },
            { name: chalk.rgb(255, 165, 0)('⚡ Modern Dashboard (React UI)'), value: 'ink' },
            { name: chalk.yellow('🎨 Cool Animations'), value: 'animations' },
            new inquirer.Separator(chalk.gray('─────────────────────')),
            { name: chalk.red('❌ Exit'), value: 'exit' }
          ],
          loop: false
        }
      ])

      switch (action) {
        case 'chat':
          await this.interactiveChatMenu()
          break
        case 'agents':
          await this.interactiveAgentMenu()
          break
        case 'status':
          await this.showStatus()
          await this.waitForEnter()
          break
        case 'dashboard':
          await this.showDashboard()
          break
        case 'ink':
          await this.startInkCLI('dashboard')
          break
        case 'animations':
          await this.animationsMenu()
          break
        case 'exit':
          await animateShutdown()
          process.exit(0)
      }
    }
  }

  private async interactiveChatMenu(): Promise<void> {
    const agents = await this.getAvailableAgents()
    
    if (agents.length === 0) {
      displayError('No agents available. Please start an agent first.')
      await this.waitForEnter()
      return
    }

    const { selectedAgent } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgent',
        message: neonGradient('Select an agent to chat with:'),
        choices: agents.map(agent => ({
          name: this.formatAgentChoice(agent),
          value: agent.id
        }))
      }
    ])

    await this.startChatMode(selectedAgent)
  }

  private formatAgentChoice(agent: any): string {
    const statusEmoji = agent.status === 'active' ? '🟢' : '🔴'
    const emotion = agent.emotion?.current || 'neutral'
    const emotionEmoji = this.getEmotionEmoji(emotion)
    
    return `${statusEmoji} ${chalk.bold(agent.name)} ${chalk.gray(`(${agent.id})`)} ${emotionEmoji} ${chalk.dim(emotion)}`
  }

  private getEmotionEmoji(emotion: string): string {
    const emojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      anxious: '😰',
      confident: '😎',
      neutral: '😐',
      curious: '🤔',
      proud: '😤',
      confused: '😕'
    }
    return emojis[emotion] || '🤖'
  }

  private async startChatMode(agentId: string): Promise<void> {
    console.clear()
    const chatGradient = gradient(['#00F5FF', '#FF00FF'])
    console.log(chatGradient.multiline(figlet.textSync('Chat Mode', { font: 'Small' })))
    console.log(chalk.gray('\nType your message and press Enter. Type "exit" to leave.\n'))

    while (true) {
      const { message } = await inquirer.prompt([{
        type: 'input',
        name: 'message',
        message: chalk.yellow('You:')
      }])

      if (message.toLowerCase() === 'exit') {
        break
      }

      if (message.trim()) {
        await this.sendChatMessage(agentId, message)
      }
    }
  }

  private async sendChatMessage(agentId: string, message: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, message })
      })

      if (response.ok) {
        const data = await response.json()
        console.log(chalk.green(`${agentId}:`), data.response)
      } else {
        console.log(chalk.red('❌ Failed to send message'))
      }
    } catch (error) {
      console.log(chalk.red('❌ Could not connect to agent'))
    }
  }

  private async interactiveAgentMenu(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: fireGradient('Agent Management'),
        choices: [
          { name: '📋 List all agents', value: 'list' },
          { name: '▶️  Start an agent', value: 'start' },
          { name: '⏹️  Stop an agent', value: 'stop' },
          { name: '🔄 Restart an agent', value: 'restart' },
          { name: '➕ Create new agent', value: 'create' },
          { name: '🗑️  Remove an agent', value: 'remove' },
          { name: '⬅️  Back to main menu', value: 'back' }
        ]
      }
    ])

    switch (action) {
      case 'list':
        await this.listAgents()
        await this.waitForEnter()
        break
      case 'start':
        await this.interactiveStartAgent()
        break
      case 'stop':
        await this.interactiveStopAgent()
        break
      case 'restart':
        await this.interactiveRestartAgent()
        break
      case 'create':
        await this.createAgent()
        break
      case 'remove':
        await this.interactiveRemoveAgent()
        break
      case 'back':
        return
    }
  }

  private async listAgents(): Promise<void> {
    const spinner = createSpinner('Fetching agents...', 'dots')
    spinner.start()

    try {
      const agents = await this.getAvailableAgents()
      spinner.stop()
      
      console.log(chalk.cyan.bold('\n🤖 Available Agents\n'))
      
      if (agents.length === 0) {
        console.log(chalk.yellow('No agents found.'))
      } else {
        displayAgentStatus(agents)
      }
    } catch (error) {
      spinner.fail('Failed to fetch agents')
      displayError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async showStatus(): Promise<void> {
    const spinner = createSpinner('Fetching system status...', 'star')
    spinner.start()

    try {
      // Fetch both status and metrics
      const [statusResponse, metricsResponse, agentsResponse] = await Promise.all([
        fetch(`${this.config.apiUrl}/status`),
        fetch(`${this.config.apiUrl}/api/metrics`),
        fetch(`${this.config.apiUrl}/agents`)
      ])
      
      const status = await statusResponse.json()
      const metrics = await metricsResponse.json()
      const agentsData = await agentsResponse.json()
      
      spinner.stop()
      
      console.log(chalk.cyan.bold('\n📊 System Status\n'))
      
      // Runtime info
      const runtimeBox = boxen(
        `${chalk.green('●')} Status: ${status.agent.status === 'active' ? chalk.green('Active') : chalk.red('Inactive')}\n` +
        `${chalk.blue('◆')} Agents: ${agentsData.agents.length} (${metrics.activeAgents} active)\n` +
        `${chalk.yellow('⚡')} Uptime: ${this.formatUptime(metrics.uptime)}\n` +
        `${chalk.magenta('🔌')} Extensions: ${status.extensions.loaded} loaded (${status.extensions.active} active)\n` +
        `${chalk.cyan('💾')} Memory: ${(status.memory.used / 1024 / 1024).toFixed(2)} MB / ${(status.memory.total / 1024 / 1024).toFixed(2)} MB`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'cyan'
        }
      )
      
      console.log(runtimeBox)
      
      // Agents list
      if (agentsData.agents.length > 0) {
        console.log(chalk.cyan.bold('\n🤖 Agents\n'))
        agentsData.agents.forEach((agent: any) => {
          const statusIcon = agent.status === 'active' ? chalk.green('●') : chalk.red('●')
          const ethicsIcon = agent.ethicsEnabled ? '🛡️' : '⚠️'
          console.log(`${statusIcon} ${chalk.bold(agent.name)} (${agent.id}) ${ethicsIcon}`)
          console.log(`   ${chalk.gray(`Emotion: ${agent.emotion || 'neutral'} | Extensions: ${agent.extensionCount}`)}`)
        })
      }
    } catch (error) {
      spinner.fail('Failed to fetch status')
      displayError('Could not connect to runtime')
    }
  }
  
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  private async showDashboard(): Promise<void> {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'SYMindX Dashboard'
    })

    // Create grid
    const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen })

    // CPU Line Chart
    const cpuLine = grid.set(0, 0, 4, 6, contrib.line, {
      style: { line: "yellow", text: "green", baseline: "black" },
      label: 'CPU Usage (%)',
      showLegend: true
    })

    // Memory Gauge
    const memoryGauge = grid.set(0, 6, 2, 3, contrib.gauge, {
      label: 'Memory Usage',
      stroke: 'green',
      fill: 'white'
    })

    // Agent Table
    const agentTable = grid.set(4, 0, 4, 12, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: true,
      label: 'Active Agents',
      width: '100%',
      height: '100%',
      border: { type: "line", fg: "cyan" },
      columnSpacing: 3,
      columnWidth: [20, 15, 20, 15, 30]
    })

    // Log Display
    const log = grid.set(8, 0, 4, 12, contrib.log, {
      fg: "green",
      selectedFg: "green",
      label: 'System Logs'
    })

    // Track CPU history
    const cpuHistory: number[] = Array(60).fill(0)
    const startTime = Date.now()
    
    // Update data periodically
    const updateInterval = setInterval(async () => {
      try {
        // Fetch real metrics
        const [metricsResponse, agentsResponse] = await Promise.all([
          fetch(`${this.config.apiUrl}/api/metrics`),
          fetch(`${this.config.apiUrl}/agents`)
        ])
        
        const metrics = await metricsResponse.json()
        const agentsData = await agentsResponse.json()
        
        // Update CPU chart with real memory usage as proxy for CPU
        const cpuUsage = Math.min(100, (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
        cpuHistory.shift()
        cpuHistory.push(cpuUsage)
        
        const cpuData = {
          title: 'Memory Usage %',
          x: Array.from({ length: 60 }, (_, i) => (i - 59).toString()),
          y: cpuHistory
        }
        cpuLine.setData([cpuData])

        // Update memory gauge
        const memPercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100
        memoryGauge.setPercent(Math.round(memPercent))

        // Update agent table
        const tableData = {
          headers: ['Name', 'Status', 'Emotion', 'Portal', 'Extensions'],
          data: agentsData.agents.map((agent: any) => [
            agent.name,
            agent.status,
            agent.emotion || 'neutral',
            agent.hasPortal ? 'Connected' : 'None',
            agent.extensionCount.toString()
          ])
        }
        agentTable.setData(tableData)

        // Add metrics log
        const runtime = Date.now() - startTime
        log.log(`[${new Date().toLocaleTimeString()}] Agents: ${metrics.activeAgents}/${metrics.totalAgents} | Mem: ${(metrics.memory.heapUsed/1024/1024).toFixed(1)}MB | Uptime: ${Math.floor(runtime/1000)}s`)

        screen.render()
      } catch (error) {
        log.log(`[ERROR] Failed to fetch metrics: ${error}`)
      }
    }, 1000)

    // Quit on Escape, q, or Control-C
    screen.key(['escape', 'q', 'C-c'], () => {
      clearInterval(updateInterval)
      return process.exit(0)
    })

    screen.render()
  }

  private async animationsMenu(): Promise<void> {
    const { animation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'animation',
        message: gradient(['#FF006E', '#8338EC'])('Choose an animation:'),
        choices: [
          { name: '🟢 Matrix Rain', value: 'matrix' },
          { name: '🎨 Banner Art', value: 'banner' },
          { name: '🔄 Loading Demo', value: 'loading' },
          { name: '⬅️  Back', value: 'back' }
        ]
      }
    ])

    switch (animation) {
      case 'matrix':
        await matrixRain(5000)
        break
      case 'banner':
        console.clear()
        await displayBanner()
        await this.waitForEnter()
        break
      case 'loading':
        await animateLoading('🚀 Launching rockets', 1000)
        await animateLoading('🌟 Catching stars', 1500)
        await animateLoading('🎯 Calibrating awesomeness', 2000)
        displaySuccess('Animation complete!')
        await this.waitForEnter()
        break
    }
  }

  private async quickChat(message: string, agentId?: string): Promise<void> {
    const targetAgent = agentId || this.config.defaultAgent

    if (!targetAgent) {
      displayError('No agent specified. Use --agent <id> or set a default agent')
      return
    }

    const spinner = createSpinner(`Sending message to ${targetAgent}...`, 'dots')
    spinner.start()

    try {
      const response = await fetch(`${this.config.apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: targetAgent, message })
      })

      if (response.ok) {
        const data = await response.json()
        spinner.stop()
        displayChatMessage('You', message, false)
        displayChatMessage(targetAgent, data.response, true)
      } else {
        spinner.fail('Failed to send message')
      }
    } catch (error) {
      spinner.fail('Could not connect to agent')
      displayError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async startAgent(agentId: string): Promise<void> {
    const spinner = createSpinner(`Starting agent ${agentId}...`, 'dots')
    spinner.start()

    try {
      const response = await fetch(`${this.config.apiUrl}/api/agents/${agentId}/start`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        spinner.succeed(`Agent ${agentId} started successfully!`)
        if (data.message) {
          console.log(chalk.gray(`  → ${data.message}`))
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        spinner.fail(`Failed to start agent ${agentId}: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      spinner.fail('Could not connect to runtime')
      displayError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async stopAgent(agentId: string): Promise<void> {
    const spinner = createSpinner(`Stopping agent ${agentId}...`, 'dots')
    spinner.start()

    try {
      const response = await fetch(`${this.config.apiUrl}/api/agents/${agentId}/stop`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        spinner.succeed(`Agent ${agentId} stopped successfully!`)
        if (data.message) {
          console.log(chalk.gray(`  → ${data.message}`))
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        spinner.fail(`Failed to stop agent ${agentId}: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      spinner.fail('Could not connect to runtime')
      displayError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async createAgent(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        validate: (input) => input.length > 0 || 'Name is required'
      },
      {
        type: 'input',
        name: 'id',
        message: 'Agent ID:',
        default: (answers: any) => answers.name.toLowerCase().replace(/\s+/g, '-'),
        validate: (input) => /^[a-z0-9-]+$/.test(input) || 'ID must be lowercase alphanumeric with hyphens'
      },
      {
        type: 'list',
        name: 'personality',
        message: 'Personality type:',
        choices: [
          { name: '🤖 Technical Expert', value: 'technical' },
          { name: '🎨 Creative Artist', value: 'creative' },
          { name: '🧠 Strategic Thinker', value: 'strategic' },
          { name: '💚 Empathetic Counselor', value: 'empathetic' },
          { name: '🏴‍☠️ Unethical Hacker', value: 'hacker' }
        ]
      },
      {
        type: 'confirm',
        name: 'enableEthics',
        message: 'Enable ethics engine?',
        default: true
      },
      {
        type: 'list',
        name: 'portal',
        message: 'AI Portal:',
        choices: [
          { name: '⚡ Groq (Fast)', value: 'groq' },
          { name: '🧠 OpenAI GPT', value: 'openai' },
          { name: '🤖 Anthropic Claude', value: 'anthropic' },
          { name: '🚀 xAI Grok', value: 'xai' },
          { name: '💻 Local Ollama', value: 'ollama' }
        ]
      }
    ])

    const progressBar = createProgressBar('Creating agent', 5)
    
    progressBar.update(1)
    await new Promise(r => setTimeout(r, 500))
    
    progressBar.update(2)
    await new Promise(r => setTimeout(r, 500))
    
    progressBar.update(3)
    await new Promise(r => setTimeout(r, 500))
    
    progressBar.update(4)
    await new Promise(r => setTimeout(r, 500))
    
    progressBar.update(5)
    
    displaySuccess(`Agent ${answers.name} created successfully!`)
    await this.waitForEnter()
  }

  private async interactiveStartAgent(): Promise<void> {
    const agents = await this.getAvailableAgents()
    const stoppedAgents = agents.filter(a => a.status !== 'active')

    if (stoppedAgents.length === 0) {
      displayError('All agents are already running')
      await this.waitForEnter()
      return
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to start:',
        choices: stoppedAgents.map(agent => ({
          name: this.formatAgentChoice(agent),
          value: agent.id
        }))
      }
    ])

    await this.startAgent(agentId)
    await this.waitForEnter()
  }

  private async interactiveStopAgent(): Promise<void> {
    const agents = await this.getAvailableAgents()
    const runningAgents = agents.filter(a => a.status === 'active')

    if (runningAgents.length === 0) {
      displayError('No agents are running')
      await this.waitForEnter()
      return
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to stop:',
        choices: runningAgents.map(agent => ({
          name: this.formatAgentChoice(agent),
          value: agent.id
        }))
      }
    ])

    await this.stopAgent(agentId)
    await this.waitForEnter()
  }

  private async interactiveRestartAgent(): Promise<void> {
    const agents = await this.getAvailableAgents()

    if (agents.length === 0) {
      displayError('No agents available')
      await this.waitForEnter()
      return
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to restart:',
        choices: agents.map(agent => ({
          name: this.formatAgentChoice(agent),
          value: agent.id
        }))
      }
    ])

    await this.stopAgent(agentId)
    await new Promise(r => setTimeout(r, 1000))
    await this.startAgent(agentId)
    await this.waitForEnter()
  }

  private async interactiveRemoveAgent(): Promise<void> {
    const agents = await this.getAvailableAgents()

    if (agents.length === 0) {
      displayError('No agents available')
      await this.waitForEnter()
      return
    }

    const { agentId, confirm } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to remove:',
        choices: agents.map(agent => ({
          name: this.formatAgentChoice(agent),
          value: agent.id
        }))
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: (answers) => chalk.red(`Are you sure you want to remove ${answers.agentId}?`),
        default: false
      }
    ])

    if (confirm) {
      const spinner = createSpinner(`Removing agent ${agentId}...`, 'dots')
      spinner.start()
      await new Promise(r => setTimeout(r, 2000))
      spinner.succeed(`Agent ${agentId} removed!`)
    }
    
    await this.waitForEnter()
  }

  private async showAgentInfo(agentId: string): Promise<void> {
    const spinner = createSpinner(`Fetching agent info for ${agentId}...`, 'dots')
    spinner.start()

    try {
      const response = await fetch(`${this.config.apiUrl}/api/agent/${agentId}`)
      
      if (response.ok) {
        const agent = await response.json()
        spinner.stop()
        
        console.log(chalk.blue.bold(`\n🤖 Agent Information: ${agent.name || agentId}`))
        console.log(chalk.gray('─'.repeat(50)))
        console.log(`${chalk.cyan('ID:')} ${agent.id}`)
        console.log(`${chalk.cyan('Name:')} ${agent.name}`)
        console.log(`${chalk.cyan('Status:')} ${agent.status === 'active' ? chalk.green('● Active') : chalk.gray('○ Inactive')}`)
        console.log(`${chalk.cyan('Emotion:')} ${agent.emotion || 'neutral'}`)
        console.log(`${chalk.cyan('Extensions:')} ${agent.extensionCount || 0}`)
        console.log(`${chalk.cyan('Portal:')} ${agent.hasPortal ? chalk.green('Connected') : chalk.gray('None')}`)
        console.log(`${chalk.cyan('Ethics:')} ${agent.ethicsEnabled ? '🛡️ Enabled' : '⚠️ Disabled'}`)
        if (agent.lastUpdate) {
          console.log(`${chalk.cyan('Last Update:')} ${new Date(agent.lastUpdate).toLocaleString()}`)
        }
        console.log()
      } else if (response.status === 404) {
        spinner.fail(`Agent '${agentId}' not found`)
      } else {
        spinner.fail(`Failed to fetch agent info`)
      }
    } catch (error) {
      spinner.fail('Could not connect to runtime')
      displayError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async getAvailableAgents(): Promise<Array<any>> {
    try {
      const response = await fetch(`${this.config.apiUrl}/agents`)
      if (!response.ok) {
        return []
      }
      const data = await response.json()
      return data.agents || []
    } catch (error) {
      return []
    }
  }

  private async waitForEnter(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...')
      }
    ])
  }

  /**
   * Start the modern React-based Ink CLI interface
   */
  private async startInkCLI(initialView: string = 'dashboard'): Promise<void> {
    try {
      // Import React and Ink components dynamically
      const React = await import('react')
      const { render } = await import('ink')
      const { MainLayout } = await import('./layouts/index')
      
      // Clear the console and start the Ink app
      console.clear()
      
      // Render the Ink CLI app
      const app = render(React.createElement(MainLayout, { 
        command: initialView, 
        args: [] 
      }))
      
      // Handle graceful shutdown
      const cleanup = () => {
        app.unmount()
        process.exit(0)
      }
      
      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)
      
      // Wait for the app to exit
      await app.waitUntilExit()
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start Ink CLI:'), error)
      console.error(chalk.yellow('💡 Falling back to interactive mode...'))
      await this.startInteractiveMode()
    }
  }
}

// Create and run CLI
const cli = new AwesomeSYMindXCLI()

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await animateShutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await animateShutdown()
  process.exit(0)
})

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.run(process.argv).catch((error) => {
    displayError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  })
}

export { AwesomeSYMindXCLI }