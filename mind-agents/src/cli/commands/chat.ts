/**
 * Interactive Chat Commands
 * 
 * Provides real-time chat interface with agents:
 * - Direct messaging
 * - Command execution
 * - Live conversation
 * - Multi-agent selection
 */

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { WebSocket } from 'ws'
import { CLIContext } from '../index.js'
import { Logger } from '../../utils/logger.js'

export class ChatCommand {
  private logger = new Logger('cli:chat')
  private chatActive = false
  private ws?: WebSocket

  constructor(private context: CLIContext) {}

  getCommand(): Command {
    const cmd = new Command('chat')
      .alias('c')
      .description('Interactive chat with agents')

    // Start chat session
    cmd.command('start [agentId]')
      .description('Start interactive chat with an agent')
      .option('-ws, --websocket', 'Use WebSocket for real-time communication')
      .action(async (agentId, options) => {
        await this.startChat(agentId, options)
      })

    // Send single message
    cmd.command('message <agentId> <message>')
      .alias('msg')
      .description('Send a single message to an agent')
      .option('-w, --wait', 'Wait for response')
      .action(async (agentId, message, options) => {
        await this.sendMessage(agentId, message, options)
      })

    // Send command
    cmd.command('command <agentId> <command>')
      .alias('cmd')
      .description('Send a command to an agent')
      .option('-p, --priority <level>', 'Command priority (low, normal, high, urgent)', 'normal')
      .option('-a, --async', 'Execute asynchronously')
      .action(async (agentId, command, options) => {
        await this.sendCommand(agentId, command, options)
      })

    // List conversations
    cmd.command('history [agentId]')
      .description('Show chat history')
      .option('-l, --limit <number>', 'Number of messages to show', '20')
      .action(async (agentId, options) => {
        await this.showHistory(agentId, options)
      })

    return cmd
  }

  async startChat(agentId?: string, options?: { websocket?: boolean }): Promise<void> {
    try {
      // Select agent if not provided
      if (!agentId) {
        // Fetch agents from API
        const response = await fetch(`${this.context.config.apiUrl}/agents`)
        const data = await response.json()
        const agents = data.agents || []
        
        if (agents.length === 0) {
          console.log(chalk.yellow('⚠️  No agents available'))
          return
        }

        if (agents.length === 1) {
          agentId = agents[0].id
        } else {
          const { selectedAgent } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedAgent',
              message: 'Select an agent to chat with:',
              choices: agents.map((agent: any) => ({
                name: `${agent.name} (${agent.id}) - ${agent.status}${agent.status === 'error' ? ' ⚠️' : ''}`,
                value: agent.id
              }))
            }
          ])
          agentId = selectedAgent
        }
      }

      // Verify agent exists via API
      const agentResponse = await fetch(`${this.context.config.apiUrl}/agents`)
      const agentData = await agentResponse.json()
      let agent = agentData.agents?.find((a: any) => a.id === agentId)
      
      // If not found by ID, try to find by name (case-insensitive)
      if (!agent && agentId) {
        agent = agentData.agents?.find((a: any) => 
          a.name.toLowerCase() === agentId!.toLowerCase()
        )
      }
      
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }
      
      // Update agentId to the actual ID if we found by name
      agentId = agent.id

      this.context.selectedAgent = agentId!

      if (options?.websocket) {
        await this.startWebSocketChat(agentId!)
      } else {
        await this.startInteractiveChat()
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to start chat'))
      this.logger.error('Start chat error:', error)
    }
  }

  async startInteractiveChat(): Promise<void> {
    if (!this.context.selectedAgent) {
      console.log(chalk.red('❌ No agent selected'))
      return
    }

    // Fetch agent info from API
    const response = await fetch(`${this.context.config.apiUrl}/agents`)
    const data = await response.json()
    const agent = data.agents?.find((a: any) => a.id === this.context.selectedAgent)
    
    if (!agent) {
      console.log(chalk.red(`❌ Agent '${this.context.selectedAgent}' not found`))
      return
    }
    
    // Check if agent is in error state and show helpful message
    if (agent.status === 'error') {
      console.log(chalk.yellow(`⚠️  Agent ${agent.name} is in error state. This may be due to missing API keys.`))
      console.log(chalk.gray('   You can still try to chat, but responses may not work properly.'))
      console.log(chalk.gray('   To fix: Add your API keys to .env file in the project root.'))
    }

    console.log(chalk.blue.bold(`\n💬 Chat with ${agent.name}`))
    console.log(chalk.gray('Type your message and press Enter. Use "/help" for commands, "/exit" to quit.'))
    console.log(chalk.gray('─'.repeat(60)))

    this.chatActive = true

    while (this.chatActive) {
      try {
        const { message } = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: chalk.cyan('You:'),
            validate: (input: string) => {
              if (!input.trim()) return 'Please enter a message'
              return true
            }
          }
        ])

        if (!this.chatActive) break

        // Handle special commands
        if (await this.handleChatCommand(message.trim())) {
          continue
        }

        // Send message to agent
        await this.processChatMessage(agent.id, message)

      } catch (error) {
        if ((error as any).isTtyError || (error as any).name === 'ExitPromptError') {
          // User pressed Ctrl+C or similar
          break
        }
        console.log(chalk.red('❌ Error in chat:'), error)
      }
    }

    console.log(chalk.gray('\n👋 Chat ended'))
  }

  async startWebSocketChat(agentId: string): Promise<void> {
    try {
      console.log(chalk.blue('🔌 Connecting to WebSocket...'))
      
      const wsUrl = this.context.config.wsUrl
      if (!wsUrl) {
        throw new Error('WebSocket URL not configured')
      }
      this.ws = new WebSocket(wsUrl, [], {
        perMessageDeflate: false  // Disable compression to match server
      })
      
      this.ws.on('open', () => {
        console.log(chalk.green('✅ Connected to WebSocket'))
        this.context.commandSystem.addWebSocketConnection(this.ws!)
        
        // Start interactive chat with WebSocket support
        this.startInteractiveChat()
      })

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleWebSocketMessage(message)
        } catch (error) {
          this.logger.warn('Failed to parse WebSocket message:', error)
        }
      })

      this.ws.on('error', (error) => {
        console.log(chalk.red('❌ WebSocket error:'), error.message)
      })

      this.ws.on('close', () => {
        console.log(chalk.yellow('🔌 WebSocket disconnected'))
      })

    } catch (error) {
      console.log(chalk.red('❌ Failed to connect to WebSocket'))
      this.logger.error('WebSocket connection error:', error)
    }
  }

  async sendMessage(agentId: string, message: string, options?: { wait?: boolean }): Promise<void> {
    try {
      // Verify agent exists via API
      const agentResponse = await fetch(`${this.context.config.apiUrl}/agents`)
      const agentData = await agentResponse.json()
      let agent = agentData.agents?.find((a: any) => a.id === agentId)
      
      // If not found by ID, try to find by name (case-insensitive)
      if (!agent && agentId) {
        agent = agentData.agents?.find((a: any) => 
          a.name.toLowerCase() === agentId.toLowerCase()
        )
        // Update agentId to the actual ID if we found by name
        if (agent) {
          agentId = agent.id
        }
      }
      
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      if (options?.wait) {
        console.log(chalk.blue(`Sending message to ${agent.name}...`))
        
        // Send message via API
        const response = await fetch(`${this.context.config.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agentId,
            message
          })
        })
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log(chalk.green(`\n💬 ${agent.name}:`))
        console.log(chalk.white(data.response))
      } else {
        // For async messages, just use the chat endpoint without waiting for full response
        fetch(`${this.context.config.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agentId,
            message
          })
        }).then(() => {
          console.log(chalk.green(`✅ Message sent to ${agent.name}`))
        }).catch(() => {
          console.log(chalk.red('❌ Failed to send message'))
        })
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to send message'))
      this.logger.error('Send message error:', error)
    }
  }

  async sendCommand(agentId: string, command: string, options: any): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${agentId}' not found`))
        return
      }

      const priority = this.parsePriority(options.priority)
      const cmd = await this.context.commandSystem.sendCommand(agentId, command, {
        priority,
        async: options.async
      })

      if (options.async) {
        console.log(chalk.green(`✅ Command queued for ${agent.name} (ID: ${cmd.id})`))
      } else {
        if (cmd.result?.success) {
          console.log(chalk.green(`✅ Command executed successfully`))
          if (cmd.result.response) {
            console.log(chalk.white(cmd.result.response))
          }
        } else {
          console.log(chalk.red(`❌ Command failed: ${cmd.result?.error}`))
        }
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to send command'))
      this.logger.error('Send command error:', error)
    }
  }

  async showHistory(agentId?: string, options?: { limit?: string }): Promise<void> {
    try {
      const targetAgent = agentId || this.context.selectedAgent
      if (!targetAgent) {
        console.log(chalk.red('❌ No agent specified'))
        return
      }

      const agent = this.context.runtime.agents.get(targetAgent)
      if (!agent) {
        console.log(chalk.red(`❌ Agent '${targetAgent}' not found`))
        return
      }

      const limit = parseInt(options?.limit || '20')
      
      // Get chat history from command system
      const commands = this.context.commandSystem.getAllCommands()
        .filter(cmd => cmd.agentId === targetAgent)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(-limit)

      if (commands.length === 0) {
        console.log(chalk.yellow(`⚠️  No chat history found for ${agent.name}`))
        return
      }

      console.log(chalk.blue.bold(`\n📝 Chat History with ${agent.name} (last ${commands.length} messages)`))
      console.log(chalk.gray('─'.repeat(60)))

      for (const cmd of commands) {
        const timestamp = cmd.timestamp.toLocaleTimeString()
        console.log(chalk.gray(`[${timestamp}]`))
        console.log(chalk.cyan('You:'), cmd.instruction)
        
        if (cmd.result?.response) {
          console.log(chalk.green(`${agent.name}:`), cmd.result.response)
        } else if (cmd.status === 'failed') {
          console.log(chalk.red(`${agent.name}:`), cmd.result?.error || 'Command failed')
        } else if (cmd.status === 'pending' || cmd.status === 'processing') {
          console.log(chalk.yellow(`${agent.name}:`), 'Processing...')
        }
        console.log()
      }

    } catch (error) {
      console.log(chalk.red('❌ Failed to show chat history'))
      this.logger.error('Show history error:', error)
    }
  }

  private async handleChatCommand(message: string): Promise<boolean> {
    if (!message.startsWith('/')) return false

    const [command, ...args] = message.slice(1).split(' ')

    switch (command.toLowerCase()) {
      case 'help':
        this.showChatHelp()
        return true

      case 'exit':
      case 'quit':
        this.chatActive = false
        return true

      case 'status':
        await this.showAgentStatus()
        return true

      case 'switch':
        await this.switchAgent(args[0])
        return true

      case 'clear':
        console.clear()
        console.log(chalk.blue.bold(`💬 Chat with ${this.context.runtime.agents.get(this.context.selectedAgent!)?.name}`))
        console.log(chalk.gray('─'.repeat(60)))
        return true

      case 'emotion':
        await this.showAgentEmotion()
        return true

      case 'memory':
        if (args.length > 0) {
          await this.queryMemory(args.join(' '))
        } else {
          console.log(chalk.yellow('⚠️  Usage: /memory <query>'))
        }
        return true

      case 'commands':
        this.showAvailableCommands()
        return true

      default:
        console.log(chalk.yellow(`⚠️  Unknown command: /${command}. Type /help for available commands.`))
        return true
    }
  }

  private showChatHelp(): void {
    console.log(chalk.blue.bold('\n💡 Chat Commands'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.cyan('/help') + ' - Show this help message')
    console.log(chalk.cyan('/exit') + ' - Exit chat')
    console.log(chalk.cyan('/status') + ' - Show agent status')
    console.log(chalk.cyan('/emotion') + ' - Show agent emotion')
    console.log(chalk.cyan('/switch <agentId>') + ' - Switch to different agent')
    console.log(chalk.cyan('/clear') + ' - Clear screen')
    console.log(chalk.cyan('/memory <query>') + ' - Query agent memory')
    console.log(chalk.cyan('/commands') + ' - Show available agent commands')
    console.log(chalk.gray('─'.repeat(40)))
  }

  private async showAgentStatus(): Promise<void> {
    if (!this.context.selectedAgent) return

    const agent = this.context.runtime.agents.get(this.context.selectedAgent)
    if (!agent) return

    console.log(chalk.blue.bold('\n📊 Agent Status'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`${chalk.cyan('Name:')} ${agent.name}`)
    console.log(`${chalk.cyan('Status:')} ${agent.status}`)
    console.log(`${chalk.cyan('Emotion:')} ${agent.emotion?.current || 'unknown'}`)
    console.log(`${chalk.cyan('Last Update:')} ${agent.lastUpdate?.toLocaleString() || 'never'}`)
    console.log(`${chalk.cyan('Extensions:')} ${agent.extensions.length}`)
    console.log(chalk.gray('─'.repeat(30)))
  }

  private async showAgentEmotion(): Promise<void> {
    if (!this.context.selectedAgent) return

    const agent = this.context.runtime.agents.get(this.context.selectedAgent)
    if (!agent || !agent.emotion) {
      console.log(chalk.yellow('⚠️  No emotion information available'))
      return
    }

    console.log(chalk.blue.bold('\n😊 Agent Emotion'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`${chalk.cyan('Current:')} ${agent.emotion.current}`)
    console.log(`${chalk.cyan('Intensity:')} ${agent.emotion.intensity}`)
    const emotionState = agent.emotion.getCurrentState()
    if (emotionState.triggers && emotionState.triggers.length > 0) {
      console.log(`${chalk.cyan('Triggers:')} ${emotionState.triggers.join(', ')}`)
    }
    console.log(chalk.gray('─'.repeat(30)))
  }

  private async switchAgent(agentId?: string): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values())
    
    if (!agentId) {
      if (agents.length <= 1) {
        console.log(chalk.yellow('⚠️  No other agents available'))
        return
      }

      const { selectedAgent } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedAgent',
          message: 'Select agent to switch to:',
          choices: agents
            .filter(agent => agent.id !== this.context.selectedAgent)
            .map(agent => ({
              name: `${agent.name} (${agent.id}) - ${agent.status}`,
              value: agent.id
            }))
        }
      ])
      agentId = selectedAgent || ''
    }

    if (!agentId) {
      console.log(chalk.red('❌ No agent ID provided'))
      return
    }

    const agent = this.context.runtime.agents.get(agentId)
    if (!agent) {
      console.log(chalk.red(`❌ Agent '${agentId}' not found`))
      return
    }

    this.context.selectedAgent = agentId
    console.log(chalk.green(`✅ Switched to ${agent.name}`))
    console.log(chalk.gray('─'.repeat(60)))
  }

  private async queryMemory(query: string): Promise<void> {
    if (!this.context.selectedAgent) return

    try {
      const response = await this.context.commandSystem.sendMessage(
        this.context.selectedAgent, 
        `/memory ${query}`
      )
      console.log(chalk.blue('🧠 Memory:'), response)
    } catch (error) {
      console.log(chalk.red('❌ Failed to query memory'))
    }
  }

  private showAvailableCommands(): void {
    if (!this.context.selectedAgent) return

    const agent = this.context.runtime.agents.get(this.context.selectedAgent)
    if (!agent) return

    console.log(chalk.blue.bold('\n⚡ Available Commands'))
    console.log(chalk.gray('─'.repeat(40)))
    
    for (const extension of agent.extensions) {
      const actions = Object.keys(extension.actions)
      if (actions.length > 0) {
        console.log(chalk.cyan(`${extension.name}:`))
        for (const action of actions) {
          console.log(`  /action ${action}`)
        }
      }
    }
    
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.gray('Usage: /action <command> [parameters]'))
  }

  private async processChatMessage(agentId: string, message: string): Promise<void> {
    try {
      // Send chat message via API
      const response = await fetch(`${this.context.config.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId,
          message
        })
      })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Get agent name from API
      const agentsResponse = await fetch(`${this.context.config.apiUrl}/agents`)
      const agentsData = await agentsResponse.json()
      const agent = agentsData.agents?.find((a: any) => a.id === agentId)
      
      console.log(chalk.green(`${agent?.name || agentId}:`), data.response)
      
    } catch (error) {
      console.log(chalk.red('❌ Error:'), (error as Error).message)
    }
  }

  private handleWebSocketMessage(message: any): void {
    if (message.type === 'command_update') {
      const { data } = message
      if (data.agentId === this.context.selectedAgent && data.status === 'completed') {
        if (data.result?.response) {
          const agent = this.context.runtime.agents.get(data.agentId)
          console.log(chalk.green(`\n${agent?.name || data.agentId}:`), data.result.response)
        }
      }
    }
  }

  private parsePriority(priority: string): any {
    const priorities: Record<string, any> = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4
    }
    return priorities[priority.toLowerCase()] || 2
  }

  stopChat(): void {
    this.chatActive = false
    if (this.ws) {
      this.ws.close()
    }
  }
}