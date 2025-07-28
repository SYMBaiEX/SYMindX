#!/usr/bin/env node

/**
 * SYMindX CLI - API Client Version
 * 
 * This CLI connects to a running SYMindX runtime via the API extension.
 * It does not create its own runtime instance.
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { 
  displayBanner,
  createSpinner,
  displayError
} from '../utils/cli-ui.js';

import { AgentCommand } from './commands/agent-api.js';
import { runtimeClient } from './services/runtimeClient.js';

class SYMindXAPICLI {
  private program: Command;
  
  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.setupCommands();
  }
  
  private setupProgram(): void {
    this.program
      .name('symindx')
      .description(
        chalk.cyan('🚀 SYMindX CLI - Connect to and manage your AI agents')
      )
      .version('1.0.0')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--api-url <url>', 'API server URL', process.env['SYMINDX_API_URL'] || 'http://localhost:8000');
  }
  
  private setupCommands(): void {
    // Agent commands
    const agentCommand = new AgentCommand();
    this.program.addCommand(agentCommand.getCommand());
    
    // Status command
    this.program
      .command('status')
      .alias('s')
      .description('📊 Show runtime status')
      .action(async () => {
        await this.showStatus();
      });
    
    // Chat command
    this.program
      .command('chat <agentId>')
      .alias('c')
      .description('💬 Chat with an agent')
      .action(async (agentId) => {
        await this.chatWithAgent(agentId);
      });
    
    // List command (shortcut)
    this.program
      .command('list')
      .alias('ls')
      .description('📋 List all agents (shortcut for agent list)')
      .option('-v, --verbose', 'Show detailed information')
      .action(async (options) => {
        const agentCmd = new AgentCommand();
        await agentCmd.listAgents(options);
      });
  }
  
  async run(argv: string[]): Promise<void> {
    try {
      // Show banner for interactive commands
      if (argv.length <= 2 || argv[2] === '--help') {
        await displayBanner();
      }
      
      // Parse commands
      await this.program.parseAsync(argv);
    } catch (error) {
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
  
  private async showStatus(): Promise<void> {
    const spinner = createSpinner('Fetching runtime status...', 'dots');
    spinner.start();
    
    try {
      // Check connection
      const isAvailable = await runtimeClient.isRuntimeAvailable();
      if (!isAvailable) {
        spinner.fail('Cannot connect to SYMindX runtime');
        console.error(chalk.yellow('\nMake sure the runtime is running:'));
        console.error(chalk.gray('  cd mind-agents'));
        console.error(chalk.gray('  bun start'));
        process.exit(1);
      }
      
      // Fetch status data
      const [status, metrics, agents] = await Promise.all([
        runtimeClient.getRuntimeStatus(),
        runtimeClient.getSystemMetrics(),
        runtimeClient.getAgents()
      ]);
      
      spinner.stop();
      
      console.log(chalk.blue.bold('\n📊 SYMindX Runtime Status\n'));
      console.log(`${chalk.green('●')} Runtime: ${status.runtime.isRunning ? chalk.green('Running') : chalk.red('Stopped')}`);
      console.log(`   Agents: ${agents.length} loaded`);
      console.log(`   Active: ${agents.filter(a => a.status === 'active').length}`);
      console.log(`   Memory: ${(metrics.memory.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(metrics.memory.heapTotal / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   Uptime: ${this.formatUptime(metrics.uptime)}`);
      console.log(`   Extensions: ${status.extensions.loaded} loaded, ${status.extensions.active} active`);
      
      if (agents.length > 0) {
        console.log(chalk.blue.bold('\n🤖 Agents\n'));
        agents.forEach(agent => {
          const statusIcon = agent.status === 'active' ? '🟢' : '🔴';
          const ethicsIcon = agent.ethicsEnabled ? '🛡️' : '⚠️';
          console.log(`${statusIcon} ${chalk.cyan(agent.name.padEnd(20))} ${agent.id} ${ethicsIcon}`);
        });
      }
      
      console.log(); // Empty line
    } catch (error) {
      spinner.fail('Failed to fetch status');
      displayError(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }
  
  private async chatWithAgent(agentId: string): Promise<void> {
    console.log(chalk.yellow(`Chat functionality not yet implemented for agent: ${agentId}`));
    console.log(chalk.gray('This feature will be available in a future update.'));
  }
  
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Create and run CLI
const cli = new SYMindXAPICLI();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.gray('\n\n👋 Goodbye!'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.gray('\n\n👋 Goodbye!'));
  process.exit(0);
});

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.run(process.argv).catch((error) => {
    displayError(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
}

export { SYMindXAPICLI };