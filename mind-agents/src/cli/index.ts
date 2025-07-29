#!/usr/bin/env node

/**
 * SYMindX CLI - Awesome Interactive Interface
 * Make this look cool as fuck!
 */

import { Command } from 'commander';
import chalk from 'chalk';
import gradient from 'gradient-string';
import inquirer from 'inquirer';

import { SYMindXRuntime } from '../core/runtime';
import { createRuntimeClient, RuntimeClient, RuntimeClientConfig } from './services/runtimeClient';
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
  animateShutdown,
} from '../utils/cli-ui';

// CLI Context interface for commands
export interface CLIContext {
  runtime: SYMindXRuntime;
  config: CLIConfig;
  selectedAgent?: string;
}

// Cool gradients
const coolGradient = gradient(['#FF006E', '#8338EC', '#3A86FF']);
const neonGradient = gradient(['#00F5FF', '#FF00FF', '#FFFF00']);
const fireGradient = gradient(['#FF6B6B', '#FFA500', '#FFD700']);

export interface CLIConfig {
  apiUrl: string;
  autoConnect: boolean;
  defaultAgent?: string;
  colors: boolean;
  verbose: boolean;
  runtimeMode: 'direct' | 'api' | 'hybrid';
}

class AwesomeSYMindXCLI {
  private program: Command;
  private config: CLIConfig;
  private runtimeClient?: RuntimeClient;

  constructor() {
    this.program = new Command();
    this.config = this.getDefaultConfig();
    this.setupProgram();
    this.setupCommands();
  }

  private getDefaultConfig(): CLIConfig {
    const port = process.env["API_PORT"] || '8000';
    return {
      apiUrl: process.env["SYMINDX_API_URL"] || `http://localhost:${port}`,
      autoConnect: process.env["SYMINDX_AUTO_CONNECT"] === 'true',
      ...(process.env["SYMINDX_DEFAULT_AGENT"] && {
        defaultAgent: process.env["SYMINDX_DEFAULT_AGENT"],
      }),
      colors: process.env["NO_COLOR"] !== 'true',
      verbose: process.env["SYMINDX_VERBOSE"] === 'true',
      runtimeMode: (process.env["SYMINDX_RUNTIME_MODE"] as 'direct' | 'api' | 'hybrid') || 'hybrid',
    };
  }

  private setupProgram(): void {
    this.program
      .name('symindx')
      .description(
        chalk.cyan('🚀 SYMindX CLI - The coolest AI agent interface ever')
      )
      .version('1.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--no-colors', 'Disable colored output')
      .option('--api-url <url>', 'API server URL', this.config.apiUrl)
      .option('--agent <id>', 'Default agent to interact with')
      .option('--matrix', 'Show matrix rain animation on startup')
      .option('--mode <mode>', 'Runtime connection mode (direct/api/hybrid)', this.config.runtimeMode)
      .hook('preAction', (thisCommand) => {
        const opts = thisCommand.opts();
        this.config = { ...this.config, ...opts };

        if (!this.config.colors) {
          chalk.level = 0;
        }
      });
  }

  private setupCommands(): void {
    // Interactive mode (default)
    this.program
      .command('interactive', { isDefault: true })
      .alias('i')
      .description('🎮 Start interactive mode with awesome UI')
      .action(async () => {
        await this.startInteractiveMode();
      });

    // Modern React-based dashboard
    this.program
      .command('dashboard')
      .alias('ink')
      .description('📊 Start modern React-based CLI dashboard')
      .option('--view <view>', 'Initial view', 'dashboard')
      .action(async (options) => {
        await this.startInkCLI(options.view);
      });

    // Quick chat
    this.program
      .command('chat')
      .alias('c')
      .description('💬 Chat with an agent')
      .option('--agent <id>', 'Agent ID to chat with')
      .option('--message <message>', 'Quick message to send')
      .action(async (options) => {
        if (options.message) {
          await this.quickChat(options.message, options.agent);
        } else {
          await this.interactiveChatMenu();
        }
      });

    // Status
    this.program
      .command('status')
      .alias('s')
      .description('📊 Show system status')
      .option('--verbose', 'Show detailed status')
      .action(async (options) => {
        await this.showStatus(options.verbose);
      });

    // Agent management
    this.program
      .command('agent')
      .alias('a')
      .description('🤖 Manage agents')
      .option('--list', 'List all agents')
      .option('--start <id>', 'Start an agent')
      .option('--stop <id>', 'Stop an agent')
      .option('--create', 'Create a new agent')
      .action(async (options) => {
        if (options.list) {
          await this.listAgents();
        } else if (options.start) {
          await this.startAgent(options.start);
        } else if (options.stop) {
          await this.stopAgent(options.stop);
        } else if (options.create) {
          await this.createAgent();
        } else {
          await this.interactiveAgentMenu();
        }
      });

    // Matrix animation
    this.program
      .command('matrix')
      .description('🟢 Show matrix rain animation')
      .option('--duration <ms>', 'Animation duration in ms', '3000')
      .action(async (options) => {
        await matrixRain(parseInt(options.duration));
      });

    // Banner
    this.program
      .command('banner')
      .description('🎨 Show the awesome banner')
      .action(async () => {
        await displayBanner();
      });
  }

  async run(argv: string[]): Promise<void> {
    try {
      // Initialize runtime client
      await this.initializeRuntimeClient();

      // Show banner on startup for non-ink commands
      if (
        argv.length <= 2 ||
        (argv.includes('--matrix') &&
          !argv.includes('dashboard') &&
          !argv.includes('ink'))
      ) {
        await displayBanner();

        if (argv.includes('--matrix')) {
          await matrixRain(3000);
        }
      }

      // Parse commands
      await this.program.parseAsync(argv);
    } catch (error) {
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private async initializeRuntimeClient(): Promise<void> {
    const spinner = createSpinner('🔌 Connecting to SYMindX runtime...', 'dots');
    spinner.start();

    try {
      const runtimeConfig: RuntimeClientConfig = {
        mode: this.config.runtimeMode,
        apiUrl: this.config.apiUrl,
        autoConnect: true,
        retryAttempts: 3,
        retryDelay: 1000,
      };

      this.runtimeClient = createRuntimeClient(runtimeConfig);

      // Set up event listeners
      this.runtimeClient.on('connected', (data) => {
        spinner.succeed(`✅ Connected to runtime (${data.mode} mode)`);
        if (this.config.verbose) {
          console.log(chalk.gray(`   Mode: ${data.mode}`));
          console.log(chalk.gray(`   API URL: ${this.config.apiUrl}`));
        }
      });

      this.runtimeClient.on('error', (error) => {
        spinner.fail(`❌ Runtime connection failed: ${error.message}`);
        if (this.config.verbose) {
          console.error(chalk.red('   Error details:'), error);
        }
      });

      this.runtimeClient.on('agent:started', (data) => {
        if (this.config.verbose) {
          console.log(chalk.green(`🤖 Agent ${data.agentId} started`));
        }
      });

      this.runtimeClient.on('agent:stopped', (data) => {
        if (this.config.verbose) {
          console.log(chalk.yellow(`🤖 Agent ${data.agentId} stopped`));
        }
      });

      // Connect to runtime
      const connected = await this.runtimeClient.connect();
      if (!connected) {
        spinner.fail('❌ Failed to connect to runtime');
        throw new Error('Runtime connection failed');
      }
    } catch (error) {
      spinner.fail('❌ Runtime initialization failed');
      throw error;
    }
  }

  private async startInteractiveMode(): Promise<void> {
    console.clear();
    await displayBanner();

    console.log(coolGradient('\n✨ Welcome to SYMindX Interactive Mode ✨\n'));

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
            {
              name: chalk.rgb(255, 165, 0)('⚡ Modern Dashboard (React UI)'),
              value: 'ink',
            },
            { name: chalk.yellow('🎨 Cool Animations'), value: 'animations' },
            new inquirer.Separator(chalk.gray('─────────────────────')),
            { name: chalk.red('❌ Exit'), value: 'exit' },
          ],
          loop: false,
        },
      ]);

      switch (action) {
        case 'chat':
          await this.interactiveChatMenu();
          break;
        case 'agents':
          await this.interactiveAgentMenu();
          break;
        case 'status':
          await this.showStatus();
          await this.waitForEnter();
          break;
        case 'dashboard':
          await this.showDashboard();
          break;
        case 'ink':
          await this.startInkCLI('dashboard');
          break;
        case 'animations':
          await this.animationsMenu();
          break;
        case 'exit':
          await animateShutdown();
          process.exit(0);
      }
    }
  }

  private async interactiveChatMenu(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const agents = await this.runtimeClient.getAgents();

    if (agents.length === 0) {
      displayError('No agents available. Please start an agent first.');
      await this.waitForEnter();
      return;
    }

    const { selectedAgent } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgent',
        message: coolGradient('Select an agent to chat with:'),
        choices: agents.map((agent) => ({
          name: this.formatAgentChoice(agent),
          value: agent.id,
        })),
      },
    ]);

    await this.startChatMode(selectedAgent);
  }

  private formatAgentChoice(agent: any): string {
    const status = agent.status === 'active' ? '🟢' : '🔴';
    const emotion = agent.emotion ? this.getEmotionEmoji(agent.emotion) : '😐';
    return `${status} ${agent.name} ${emotion} (${agent.id})`;
  }

  private getEmotionEmoji(emotion: string): string {
    const emotionEmojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      anxious: '😰',
      confident: '😎',
      nostalgic: '🥺',
      empathetic: '🤗',
      curious: '🤔',
      proud: '😌',
      confused: '😕',
      neutral: '😐',
    };
    return emotionEmojis[emotion] || '😐';
  }

  private async startChatMode(agentId: string): Promise<void> {
    console.clear();
    console.log(coolGradient(`\n💬 Chatting with agent: ${agentId}\n`));
    console.log(chalk.gray('Type "exit" to quit, "help" for commands\n'));

    while (true) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: chalk.cyan('You:'),
        },
      ]);

      if (message.toLowerCase() === 'exit') {
        break;
      }

      if (message.toLowerCase() === 'help') {
        this.showChatHelp();
        continue;
      }

      try {
        const response = await this.runtimeClient!.sendMessage(agentId, message);
        displayChatMessage(agentId, response.response || response.message, true);
      } catch (error) {
        displayError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async sendChatMessage(
    agentId: string,
    message: string
  ): Promise<void> {
    const spinner = createSpinner('Sending message...', 'dots');
    spinner.start();

    try {
      const response = await this.runtimeClient!.sendMessage(agentId, message);
      spinner.succeed('Message sent successfully!');
      displayChatMessage(agentId, response.response || response.message, true);
    } catch (error) {
      spinner.fail('Failed to send message');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async interactiveAgentMenu(): Promise<void> {
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: coolGradient('Agent Management:'),
          choices: [
            { name: chalk.blue('📋 List Agents'), value: 'list' },
            { name: chalk.green('🚀 Start Agent'), value: 'start' },
            { name: chalk.red('⏹️ Stop Agent'), value: 'stop' },
            { name: chalk.yellow('🔄 Restart Agent'), value: 'restart' },
            { name: chalk.magenta('➕ Create Agent'), value: 'create' },
            { name: chalk.red('🗑️ Remove Agent'), value: 'remove' },
            { name: chalk.gray('⬅️ Back'), value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'list':
          await this.listAgents();
          await this.waitForEnter();
          break;
        case 'start':
          await this.interactiveStartAgent();
          break;
        case 'stop':
          await this.interactiveStopAgent();
          break;
        case 'restart':
          await this.interactiveRestartAgent();
          break;
        case 'create':
          await this.interactiveCreateAgent();
          break;
        case 'remove':
          await this.interactiveRemoveAgent();
          break;
        case 'back':
          return;
      }
    }
  }

  private async listAgents(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const spinner = createSpinner('Fetching agents...', 'dots');
    spinner.start();

    try {
      const agents = await this.runtimeClient.getAgents();
      spinner.succeed(`Found ${agents.length} agents`);

      if (agents.length === 0) {
        console.log(chalk.yellow('No agents found. Create one with "agent create"'));
        return;
      }

      console.log('\n' + chalk.cyan('🤖 Available Agents:'));
      agents.forEach((agent) => {
        const status = agent.status === 'active' ? '🟢' : '🔴';
        const emotion = agent.emotion ? this.getEmotionEmoji(agent.emotion) : '😐';
        console.log(`  ${status} ${agent.name} ${emotion} (${agent.id})`);
        if (agent.uptime) {
          console.log(`    Uptime: ${this.formatUptime(agent.uptime)}`);
        }
      });
    } catch (error) {
      spinner.fail('Failed to fetch agents');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async showStatus(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const spinner = createSpinner('Fetching system status...', 'dots');
    spinner.start();

    try {
      const metrics = await this.runtimeClient.getSystemMetrics();
      const status = this.runtimeClient.getConnectionStatus();
      
      spinner.succeed('System status retrieved');

      console.log('\n' + chalk.cyan('📊 SYMindX System Status:'));
      console.log(`  Connection: ${status.connected ? '🟢 Connected' : '🔴 Disconnected'}`);
      console.log(`  Mode: ${status.mode}`);
      console.log(`  Uptime: ${this.formatUptime(metrics.uptime)}`);
      console.log(`  Active Agents: ${metrics.agents.filter(a => a.status === 'active').length}`);
      console.log(`  Total Agents: ${metrics.agents.length}`);
      console.log(`  Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Event Count: ${metrics.eventCount}`);
    } catch (error) {
      spinner.fail('Failed to fetch system status');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private async showDashboard(): Promise<void> {
    console.clear();
    await displayBanner();

    console.log(coolGradient('\n📊 SYMindX Live Dashboard\n'));

    // This would be a more sophisticated dashboard with real-time updates
    console.log(chalk.yellow('Dashboard features coming soon...'));
    console.log(chalk.gray('Use "symindx ink" for the modern React dashboard'));
  }

  private async animationsMenu(): Promise<void> {
    const { animation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'animation',
        message: coolGradient('Select an animation:'),
        choices: [
          { name: '🟢 Matrix Rain', value: 'matrix' },
          { name: '🔥 Fire Effect', value: 'fire' },
          { name: '💧 Water Effect', value: 'water' },
          { name: '⚡ Lightning Effect', value: 'lightning' },
          { name: '💥 Explosion Effect', value: 'explosion' },
          { name: chalk.gray('⬅️ Back'), value: 'back' },
        ],
      },
    ]);

    if (animation === 'back') return;

    const { duration } = await inquirer.prompt([
      {
        type: 'input',
        name: 'duration',
        message: 'Animation duration (ms):',
        default: '3000',
      },
    ]);

    switch (animation) {
      case 'matrix':
        await matrixRain(parseInt(duration));
        break;
      // Add other animations here
    }
  }

  private async quickChat(message: string, agentId?: string): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    if (!agentId) {
      const agents = await this.runtimeClient.getAgents();
      if (agents.length === 0) {
        displayError('No agents available');
        return;
      }
      agentId = agents[0].id; // Use first available agent
    }

    const spinner = createSpinner(`Sending message to ${agentId}...`, 'dots');
    spinner.start();

    try {
      const response = await this.runtimeClient.sendMessage(agentId, message);
      spinner.succeed('Message sent successfully!');
      displayChatMessage(agentId, response.response || response.message, true);
    } catch (error) {
      spinner.fail('Failed to send message');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async startAgent(agentId: string): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const spinner = createSpinner(`Starting agent ${agentId}...`, 'dots');
    spinner.start();

    try {
      const success = await this.runtimeClient.startAgent(agentId);
      if (success) {
        spinner.succeed(`Agent ${agentId} started successfully!`);
      } else {
        spinner.fail(`Failed to start agent ${agentId}`);
      }
    } catch (error) {
      spinner.fail('Could not connect to runtime');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async stopAgent(agentId: string): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const spinner = createSpinner(`Stopping agent ${agentId}...`, 'dots');
    spinner.start();

    try {
      const success = await this.runtimeClient.stopAgent(agentId);
      if (success) {
        spinner.succeed(`Agent ${agentId} stopped successfully!`);
      } else {
        spinner.fail(`Failed to stop agent ${agentId}`);
      }
    } catch (error) {
      spinner.fail('Could not connect to runtime');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async createAgent(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        validate: (input) => input.length > 0 || 'Name is required',
      },
      {
        type: 'input',
        name: 'id',
        message: 'Agent ID:',
        default: (answers: any) =>
          answers.name.toLowerCase().replace(/\s+/g, '-'),
        validate: (input) =>
          /^[a-z0-9-]+$/.test(input) ||
          'ID must be lowercase alphanumeric with hyphens',
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
          { name: '🏴‍☠️ Unethical Hacker', value: 'hacker' },
        ],
      },
    ]);

    const spinner = createSpinner('Creating agent...', 'dots');
    spinner.start();

    try {
      const agentConfig = {
        id: answers.id,
        name: answers.name,
        type: 'autonomous',
        personality: answers.personality,
        enabled: false,
        core: {
          name: answers.name,
          tone: 'professional',
          personality: [answers.personality],
        },
        lore: {
          origin: 'CLI Creation',
          motive: 'To assist users',
          background: `Created as a ${answers.personality} agent`,
        },
        psyche: {
          traits: [answers.personality],
          defaults: {
            memory: 'sqlite',
            emotion: 'composite',
            cognition: 'reactive',
          },
        },
        modules: {
          extensions: [],
          memory: {
            provider: 'sqlite',
            maxRecords: 1000,
          },
          emotion: {
            type: 'composite',
            sensitivity: 0.5,
            decayRate: 0.1,
            transitionSpeed: 0.5,
          },
          cognition: {
            type: 'reactive',
            planningDepth: 3,
            memoryIntegration: true,
            creativityLevel: 0.5,
          },
        },
      };

      const agentId = await this.runtimeClient.createAgent(agentConfig);
      spinner.succeed(`Agent ${answers.name} created successfully!`);
      console.log(chalk.gray(`   ID: ${agentId}`));
    } catch (error) {
      spinner.fail('Failed to create agent');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async interactiveStartAgent(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const agents = await this.runtimeClient.getAgents();
    const inactiveAgents = agents.filter((a) => a.status !== 'active');

    if (inactiveAgents.length === 0) {
      console.log(chalk.yellow('No inactive agents to start'));
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to start:',
        choices: inactiveAgents.map((agent) => ({
          name: `${agent.name} (${agent.id})`,
          value: agent.id,
        })),
      },
    ]);

    await this.startAgent(agentId);
  }

  private async interactiveStopAgent(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const agents = await this.runtimeClient.getAgents();
    const activeAgents = agents.filter((a) => a.status === 'active');

    if (activeAgents.length === 0) {
      console.log(chalk.yellow('No active agents to stop'));
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to stop:',
        choices: activeAgents.map((agent) => ({
          name: `${agent.name} (${agent.id})`,
          value: agent.id,
        })),
      },
    ]);

    await this.stopAgent(agentId);
  }

  private async interactiveRestartAgent(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const agents = await this.runtimeClient.getAgents();

    if (agents.length === 0) {
      console.log(chalk.yellow('No agents available'));
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to restart:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.id}) - ${agent.status}`,
          value: agent.id,
        })),
      },
    ]);

    const spinner = createSpinner(`Restarting agent ${agentId}...`, 'dots');
    spinner.start();

    try {
      await this.runtimeClient.stopAgent(agentId);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a bit
      const success = await this.runtimeClient.startAgent(agentId);
      
      if (success) {
        spinner.succeed(`Agent ${agentId} restarted successfully!`);
      } else {
        spinner.fail(`Failed to restart agent ${agentId}`);
      }
    } catch (error) {
      spinner.fail('Failed to restart agent');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async interactiveCreateAgent(): Promise<void> {
    await this.createAgent();
  }

  private async interactiveRemoveAgent(): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const agents = await this.runtimeClient.getAgents();

    if (agents.length === 0) {
      console.log(chalk.yellow('No agents to remove'));
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to remove:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.id}) - ${agent.status}`,
          value: agent.id,
        })),
      },
    ]);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove agent ${agentId}?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Operation cancelled'));
      return;
    }

    const spinner = createSpinner(`Removing agent ${agentId}...`, 'dots');
    spinner.start();

    try {
      // Note: This would need to be implemented in the runtime
      spinner.fail('Agent removal not yet implemented');
      console.log(chalk.gray('   This feature is coming soon...'));
    } catch (error) {
      spinner.fail('Failed to remove agent');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async showAgentInfo(agentId: string): Promise<void> {
    if (!this.runtimeClient) {
      displayError('Runtime client not available');
      return;
    }

    const spinner = createSpinner(`Fetching agent info for ${agentId}...`, 'dots');
    spinner.start();

    try {
      const agents = await this.runtimeClient.getAgents();
      const agent = agents.find((a) => a.id === agentId);

      if (agent) {
        spinner.succeed(`Agent info retrieved`);
        console.log('\n' + chalk.cyan(`🤖 Agent: ${agent.name}`));
        console.log(`  ID: ${agent.id}`);
        console.log(`  Status: ${agent.status}`);
        console.log(`  Type: ${agent.type || 'unknown'}`);
        console.log(`  Emotion: ${agent.emotion || 'neutral'}`);
        console.log(`  Memory Provider: ${agent.memoryProvider || 'default'}`);
        console.log(`  Extensions: ${agent.extensions?.join(', ') || 'none'}`);
        if (agent.uptime) {
          console.log(`  Uptime: ${this.formatUptime(agent.uptime)}`);
        }
      } else {
        spinner.fail(`Agent '${agentId}' not found`);
      }
    } catch (error) {
      spinner.fail('Could not connect to runtime');
      displayError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async getAvailableAgents(): Promise<Array<any>> {
    if (!this.runtimeClient) {
      return [];
    }

    try {
      return await this.runtimeClient.getAgents();
    } catch (error) {
      void error; // Acknowledge error without using it
      return [];
    }
  }

  private async waitForEnter(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...'),
      },
    ]);
  }

  /**
   * Start the modern React-based Ink CLI interface
   */
  private async startInkCLI(initialView: string = 'dashboard'): Promise<void> {
    try {
      // Import React and Ink components dynamically
      const React = await import('react');
      const { render } = await import('ink');
      const { MainLayout } = await import('./layouts/index');

      // Clear the console and start the Ink app
      console.clear();

      // Render the Ink CLI app
      const app = render(
        React.createElement(MainLayout, {
          command: initialView,
          args: [],
        })
      );

      // Handle graceful shutdown
      const cleanup = () => {
        app.unmount();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Wait for the app to exit
      await app.waitUntilExit();
    } catch (error) {
      console.error(chalk.red('❌ Failed to start Ink CLI:'), error);
      console.error(chalk.yellow('💡 Falling back to interactive mode...'));
      await this.startInteractiveMode();
    }
  }

  private showChatHelp(): void {
    console.log(chalk.cyan('\n💬 Chat Commands:'));
    console.log(chalk.gray('  exit    - Exit chat mode'));
    console.log(chalk.gray('  help    - Show this help'));
    console.log(chalk.gray('  status  - Show agent status'));
    console.log(chalk.gray('  emotion - Show agent emotion'));
    console.log(chalk.gray('  memory  - Query agent memory'));
    console.log(chalk.gray('  switch  - Switch to different agent'));
    console.log('');
  }
}

// Create and run CLI
const cli = new AwesomeSYMindXCLI();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await animateShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await animateShutdown();
  process.exit(0);
});

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.run(process.argv).catch((error) => {
    displayError(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
}

export { AwesomeSYMindXCLI };
