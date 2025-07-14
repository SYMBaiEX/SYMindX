/**
 * Interactive Chat Commands
 *
 * Provides real-time chat interface with agents:
 * - Direct messaging
 * - Command execution
 * - Live conversation
 * - Multi-agent selection
 */

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { WebSocket } from 'ws';

import { Logger } from '../../utils/logger';
import { CLIContext } from '../index';

export class ChatCommand {
  private logger = new Logger('cli:chat');
  private chatActive = false;
  private ws?: WebSocket;

  constructor(private context: CLIContext) {}

  getCommand(): Command {
    const cmd = new Command('chat')
      .alias('c')
      .description('Interactive chat with agents');

    // Start chat session
    cmd
      .command('start [agentId]')
      .description('Start interactive chat with an agent')
      .option('-ws, --websocket', 'Use WebSocket for real-time communication')
      .action(async (agentId, options) => {
        await this.startChat(agentId, options);
      });

    // Send single message
    cmd
      .command('message <agentId> <message>')
      .alias('msg')
      .description('Send a single message to an agent')
      .option('-w, --wait', 'Wait for response')
      .action(async (agentId, message, options) => {
        await this.sendMessage(agentId, message, options);
      });

    // Send command
    cmd
      .command('command <agentId> <command>')
      .alias('cmd')
      .description('Send a command to an agent')
      .option(
        '-p, --priority <level>',
        'Command priority (low, normal, high, urgent)',
        'normal'
      )
      .option('-a, --async', 'Execute asynchronously')
      .action(async (agentId, command, options) => {
        await this.sendCommand(agentId, command, options);
      });

    // List conversations
    cmd
      .command('history [agentId]')
      .description('Show chat history')
      .option('-l, --limit <number>', 'Number of messages to show', '20')
      .action(async (agentId, options) => {
        await this.showHistory(agentId, options);
      });

    return cmd;
  }

  async startChat(
    agentId?: string,
    options?: { websocket?: boolean }
  ): Promise<void> {
    try {
      // Select agent if not provided
      if (!agentId) {
        // Fetch agents from API
        const response = await fetch(`${this.context.config.apiUrl}/agents`);
        const data = await response.json();
        const agents = data.agents || [];

        if (agents.length === 0) {
          process.stdout.write(chalk.yellow('⚠️  No agents available') + '\n');
          return;
        }

        if (agents.length === 1) {
          agentId = agents[0].id;
        } else {
          const { selectedAgent } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedAgent',
              message: 'Select an agent to chat with:',
              choices: agents.map((agent: { id: string; name: string; status: string }) => ({
                name: `${agent.name} (${agent.id}) - ${agent.status}${agent.status === 'error' ? ' ⚠️' : ''}`,
                value: agent.id,
              })),
            },
          ]);
          agentId = selectedAgent;
        }
      }

      // Verify agent exists via API
      const agentResponse = await fetch(`${this.context.config.apiUrl}/agents`);
      const agentData = await agentResponse.json();
      let agent = agentData.agents?.find((a: { id: string; name: string }) => a.id === agentId);

      // If not found by ID, try to find by name (case-insensitive)
      if (!agent && agentId) {
        agent = agentData.agents?.find(
          (a: { id: string; name: string }) => a.name.toLowerCase() === agentId!.toLowerCase()
        );
      }

      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      // Update agentId to the actual ID if we found by name
      agentId = agent.id;

      this.context.selectedAgent = agentId!;

      if (options?.websocket) {
        await this.startWebSocketChat(agentId!);
      } else {
        await this.startInteractiveChat();
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to start chat') + '\n');
      this.logger.error('Start chat error:', error);
    }
  }

  async startInteractiveChat(): Promise<void> {
    if (!this.context.selectedAgent) {
      process.stdout.write(chalk.red('❌ No agent selected') + '\n');
      return;
    }

    // Fetch agent info from API
    const response = await fetch(`${this.context.config.apiUrl}/agents`);
    const data = await response.json();
    const agent = data.agents?.find(
      (a: { id: string; name: string; status: string }) => a.id === this.context.selectedAgent
    );

    if (!agent) {
      process.stdout.write(
        chalk.red(`❌ Agent '${this.context.selectedAgent}' not found`) + '\n'
      );
      return;
    }

    // Check if agent is in error state and show helpful message
    if (agent.status === 'error') {
      process.stdout.write(
        chalk.yellow(
          `⚠️  Agent ${agent.name} is in error state. This may be due to missing API keys.`
        ) + '\n'
      );
      process.stdout.write(
        chalk.gray(
          '   You can still try to chat, but responses may not work properly.'
        ) + '\n'
      );
      process.stdout.write(
        chalk.gray(
          '   To fix: Add your API keys to .env file in the project root.'
        ) + '\n'
      );
    }

    process.stdout.write(chalk.blue.bold(`\n💬 Chat with ${agent.name}`) + '\n');
    process.stdout.write(
      chalk.gray(
        'Type your message and press Enter. Use "/help" for commands, "/exit" to quit.'
      ) + '\n'
    );
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    this.chatActive = true;

    while (this.chatActive) {
      try {
        const { message } = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: chalk.cyan('You:'),
            validate: (input: string): string | boolean => {
              if (!input.trim()) return 'Please enter a message';
              return true;
            },
          },
        ]);

        if (!this.chatActive) break;

        // Handle special commands
        if (await this.handleChatCommand(message.trim())) {
          continue;
        }

        // Send message to agent
        await this.processChatMessage(agent.id, message);
      } catch (error) {
        const err = error as { isTtyError?: boolean; name?: string };
        if (
          err.isTtyError ||
          err.name === 'ExitPromptError'
        ) {
          // User pressed Ctrl+C or similar
          break;
        }
        process.stdout.write(chalk.red('❌ Error in chat: ') + error + '\n');
      }
    }

    process.stdout.write(chalk.gray('\n👋 Chat ended') + '\n');
  }

  async startWebSocketChat(_agentId: string): Promise<void> {
    try {
      process.stdout.write(chalk.blue('🔌 Connecting to WebSocket...') + '\n');

      const port = process.env.API_PORT || '8000';
      const wsUrl = process.env.SYMINDX_WS_URL || `ws://localhost:${port}/ws`;
      this.ws = new WebSocket(wsUrl, [], {
        perMessageDeflate: false, // Disable compression to match server
      });

      this.ws.on('open', () => {
        process.stdout.write(chalk.green('✅ Connected to WebSocket') + '\n');
        this.context.commandSystem.addWebSocketConnection(this.ws!);

        // Start interactive chat with WebSocket support
        this.startInteractiveChat();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          this.logger.warn('Failed to parse WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        process.stdout.write(chalk.red('❌ WebSocket error: ') + error.message + '\n');
      });

      this.ws.on('close', () => {
        process.stdout.write(chalk.yellow('🔌 WebSocket disconnected') + '\n');
      });
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to connect to WebSocket') + '\n');
      this.logger.error('WebSocket connection error:', error);
    }
  }

  async sendMessage(
    agentId: string,
    message: string,
    options?: { wait?: boolean }
  ): Promise<void> {
    try {
      // Verify agent exists via API
      const agentResponse = await fetch(`${this.context.config.apiUrl}/agents`);
      const agentData = await agentResponse.json();
      let agent = agentData.agents?.find((a: { id: string; name: string }) => a.id === agentId);

      // If not found by ID, try to find by name (case-insensitive)
      if (!agent && agentId) {
        agent = agentData.agents?.find(
          (a: { id: string; name: string }) => a.name.toLowerCase() === agentId.toLowerCase()
        );
        // Update agentId to the actual ID if we found by name
        if (agent) {
          agentId = agent.id;
        }
      }

      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      if (options?.wait) {
        process.stdout.write(chalk.blue(`Sending message to ${agent.name}...`) + '\n');

        // Send message via API
        const response = await fetch(`${this.context.config.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId,
            message,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        process.stdout.write(chalk.green(`\n💬 ${agent.name}:`) + '\n');
        process.stdout.write(chalk.white(data.response) + '\n');
      } else {
        // For async messages, just use the chat endpoint without waiting for full response
        fetch(`${this.context.config.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId,
            message,
          }),
        })
          .then(() => {
            process.stdout.write(chalk.green(`✅ Message sent to ${agent.name}`) + '\n');
          })
          .catch(() => {
            process.stdout.write(chalk.red('❌ Failed to send message') + '\n');
          });
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to send message') + '\n');
      this.logger.error('Send message error:', error);
    }
  }

  async sendCommand(
    agentId: string,
    command: string,
    options: { priority?: string; async?: boolean }
  ): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      const priority = this.parsePriority(options.priority || 'normal');
      const cmd = await this.context.commandSystem.sendCommand(
        agentId,
        command,
        {
          priority,
          async: options.async,
        }
      );

      if (options.async) {
        process.stdout.write(
          chalk.green(`✅ Command queued for ${agent.name} (ID: ${cmd.id})`) + '\n'
        );
      } else {
        if (cmd.result?.success) {
          process.stdout.write(chalk.green(`✅ Command executed successfully`) + '\n');
          if (cmd.result.response) {
            process.stdout.write(chalk.white(cmd.result.response) + '\n');
          }
        } else {
          process.stdout.write(chalk.red(`❌ Command failed: ${cmd.result?.error}`) + '\n');
        }
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to send command') + '\n');
      this.logger.error('Send command error:', error);
    }
  }

  async showHistory(
    agentId?: string,
    options?: { limit?: string }
  ): Promise<void> {
    try {
      const targetAgent = agentId || this.context.selectedAgent;
      if (!targetAgent) {
        process.stdout.write(chalk.red('❌ No agent specified') + '\n');
        return;
      }

      const agent = this.context.runtime.agents.get(targetAgent);
      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${targetAgent}' not found`) + '\n');
        return;
      }

      const limit = parseInt(options?.limit || '20');

      // Get chat history from command system
      const commands = this.context.commandSystem
        .getAllCommands()
        .filter((cmd) => cmd.agentId === targetAgent)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(-limit);

      if (commands.length === 0) {
        process.stdout.write(
          chalk.yellow(`⚠️  No chat history found for ${agent.name}`) + '\n'
        );
        return;
      }

      process.stdout.write(
        chalk.blue.bold(
          `\n📝 Chat History with ${agent.name} (last ${commands.length} messages)`
        ) + '\n'
      );
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      for (const cmd of commands) {
        const timestamp = cmd.timestamp.toLocaleTimeString();
        process.stdout.write(chalk.gray(`[${timestamp}]`) + '\n');
        process.stdout.write(chalk.cyan('You: ') + cmd.instruction + '\n');

        if (cmd.result?.response) {
          process.stdout.write(chalk.green(`${agent.name}: `) + cmd.result.response + '\n');
        } else if (cmd.status === 'failed') {
          process.stdout.write(
            chalk.red(`${agent.name}: `) + (cmd.result?.error || 'Command failed') + '\n'
          );
        } else if (cmd.status === 'pending' || cmd.status === 'processing') {
          process.stdout.write(chalk.yellow(`${agent.name}: `) + 'Processing...' + '\n');
        }
        process.stdout.write('\n');
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to show chat history') + '\n');
      this.logger.error('Show history error:', error);
    }
  }

  private async handleChatCommand(message: string): Promise<boolean> {
    if (!message.startsWith('/')) return false;

    const [command, ...args] = message.slice(1).split(' ');

    if (!command) {
      process.stdout.write(
        chalk.yellow(
          '⚠️  Invalid command format. Type /help for available commands.'
        ) + '\n'
      );
      return true;
    }

    switch (command.toLowerCase()) {
      case 'help':
        this.showChatHelp();
        return true;

      case 'exit':
      case 'quit':
        this.chatActive = false;
        return true;

      case 'status':
        await this.showAgentStatus();
        return true;

      case 'switch':
        await this.switchAgent(args[0]);
        return true;

      case 'clear':
        process.stdout.write('\x1Bc'); // Clear screen
        process.stdout.write(
          chalk.blue.bold(
            `💬 Chat with ${this.context.runtime.agents.get(this.context.selectedAgent!)?.name}`
          ) + '\n'
        );
        process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');
        return true;

      case 'emotion':
        await this.showAgentEmotion();
        return true;

      case 'memory':
        if (args.length > 0) {
          await this.queryMemory(args.join(' '));
        } else {
          process.stdout.write(chalk.yellow('⚠️  Usage: /memory <query>') + '\n');
        }
        return true;

      case 'commands':
        this.showAvailableCommands();
        return true;

      default:
        process.stdout.write(
          chalk.yellow(
            `⚠️  Unknown command: /${command}. Type /help for available commands.`
          ) + '\n'
        );
        return true;
    }
  }

  private showChatHelp(): void {
    process.stdout.write(chalk.blue.bold('\n💡 Chat Commands') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(40)) + '\n');
    process.stdout.write(chalk.cyan('/help') + ' - Show this help message' + '\n');
    process.stdout.write(chalk.cyan('/exit') + ' - Exit chat' + '\n');
    process.stdout.write(chalk.cyan('/status') + ' - Show agent status' + '\n');
    process.stdout.write(chalk.cyan('/emotion') + ' - Show agent emotion' + '\n');
    process.stdout.write(
      chalk.cyan('/switch <agentId>') + ' - Switch to different agent' + '\n'
    );
    process.stdout.write(chalk.cyan('/clear') + ' - Clear screen' + '\n');
    process.stdout.write(chalk.cyan('/memory <query>') + ' - Query agent memory' + '\n');
    process.stdout.write(chalk.cyan('/commands') + ' - Show available agent commands' + '\n');
    process.stdout.write(chalk.gray('─'.repeat(40)) + '\n');
  }

  private async showAgentStatus(): Promise<void> {
    if (!this.context.selectedAgent) return;

    const agent = this.context.runtime.agents.get(this.context.selectedAgent);
    if (!agent) return;

    process.stdout.write(chalk.blue.bold('\n📊 Agent Status') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(30)) + '\n');
    process.stdout.write(`${chalk.cyan('Name:')} ${agent.name}` + '\n');
    process.stdout.write(`${chalk.cyan('Status:')} ${agent.status}` + '\n');
    process.stdout.write(
      `${chalk.cyan('Emotion:')} ${agent.emotion?.current || 'unknown'}` + '\n'
    );
    process.stdout.write(
      `${chalk.cyan('Last Update:')} ${agent.lastUpdate?.toLocaleString() || 'never'}` + '\n'
    );
    process.stdout.write(`${chalk.cyan('Extensions:')} ${agent.extensions.length}` + '\n');
    process.stdout.write(chalk.gray('─'.repeat(30)) + '\n');
  }

  private async showAgentEmotion(): Promise<void> {
    if (!this.context.selectedAgent) return;

    const agent = this.context.runtime.agents.get(this.context.selectedAgent);
    if (!agent || !agent.emotion) {
      process.stdout.write(chalk.yellow('⚠️  No emotion information available') + '\n');
      return;
    }

    process.stdout.write(chalk.blue.bold('\n😊 Agent Emotion') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(30)) + '\n');
    process.stdout.write(`${chalk.cyan('Current:')} ${agent.emotion.current}` + '\n');
    process.stdout.write(`${chalk.cyan('Intensity:')} ${agent.emotion.intensity}` + '\n');
    const emotionState = agent.emotion.getCurrentState();
    if (emotionState.triggers && emotionState.triggers.length > 0) {
      process.stdout.write(
        `${chalk.cyan('Triggers:')} ${emotionState.triggers.join(', ')}` + '\n'
      );
    }
    process.stdout.write(chalk.gray('─'.repeat(30)) + '\n');
  }

  private async switchAgent(agentId?: string): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values());

    if (!agentId) {
      if (agents.length <= 1) {
        process.stdout.write(chalk.yellow('⚠️  No other agents available') + '\n');
        return;
      }

      const { selectedAgent } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedAgent',
          message: 'Select agent to switch to:',
          choices: agents
            .filter((agent) => agent.id !== this.context.selectedAgent)
            .map((agent) => ({
              name: `${agent.name} (${agent.id}) - ${agent.status}`,
              value: agent.id,
            })),
        },
      ]);
      agentId = selectedAgent || '';
    }

    if (!agentId) {
      process.stdout.write(chalk.red('❌ No agent ID provided') + '\n');
      return;
    }

    const agent = this.context.runtime.agents.get(agentId);
    if (!agent) {
      process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
      return;
    }

    this.context.selectedAgent = agentId;
    process.stdout.write(chalk.green(`✅ Switched to ${agent.name}`) + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');
  }

  private async queryMemory(query: string): Promise<void> {
    if (!this.context.selectedAgent) return;

    try {
      const response = await this.context.commandSystem.sendMessage(
        this.context.selectedAgent,
        `/memory ${query}`
      );
      process.stdout.write(chalk.blue('🧠 Memory: ') + response + '\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      process.stdout.write(chalk.red('❌ Failed to query memory ') + errorMessage + '\n');
    }
  }

  private showAvailableCommands(): void {
    if (!this.context.selectedAgent) return;

    const agent = this.context.runtime.agents.get(this.context.selectedAgent);
    if (!agent) return;

    process.stdout.write(chalk.blue.bold('\n⚡ Available Commands') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(40)) + '\n');

    for (const extension of agent.extensions) {
      const actions = Object.keys(extension.actions);
      if (actions.length > 0) {
        process.stdout.write(chalk.cyan(`${extension.name}:`) + '\n');
        for (const action of actions) {
          process.stdout.write(`  /action ${action}` + '\n');
        }
      }
    }

    process.stdout.write(chalk.gray('─'.repeat(40)) + '\n');
    process.stdout.write(chalk.gray('Usage: /action <command> [parameters]') + '\n');
  }

  private async processChatMessage(
    agentId: string,
    message: string
  ): Promise<void> {
    try {
      // Send chat message via API
      const response = await fetch(`${this.context.config.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Get agent name from API
      const agentsResponse = await fetch(
        `${this.context.config.apiUrl}/agents`
      );
      const agentsData = await agentsResponse.json();
      const agent = agentsData.agents?.find((a: { id: string; name: string }) => a.id === agentId);

      process.stdout.write(chalk.green(`${agent?.name || agentId}: `) + data.response + '\n');
    } catch (error) {
      process.stdout.write(chalk.red('❌ Error: ') + (error as Error).message + '\n');
    }
  }

  private handleWebSocketMessage(message: { type: string; data: { agentId: string; status: string; result?: { response?: string } } }): void {
    if (message.type === 'command_update') {
      const { data } = message;
      if (
        data.agentId === this.context.selectedAgent &&
        data.status === 'completed'
      ) {
        if (data.result?.response) {
          const agent = this.context.runtime.agents.get(data.agentId);
          process.stdout.write(
            chalk.green(`\n${agent?.name || data.agentId}: `) + data.result.response + '\n'
          );
        }
      }
    }
  }

  private parsePriority(priority: string): number {
    const priorities: Record<string, number> = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4,
    };
    return priorities[priority.toLowerCase()] || 2;
  }

  stopChat(): void {
    this.chatActive = false;
    if (this.ws) {
      this.ws.close();
    }
  }
}