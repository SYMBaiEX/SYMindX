#!/usr/bin/env node

/**
 * Standalone CLI for SYMindX
 * 
 * This CLI connects to a running SYMindX runtime via the API extension.
 * It does not create its own runtime instance.
 */

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';

import { runtimeClient } from './services/runtimeClient.js';

// Create the program
const program = new Command();

program
  .name('symindx-cli')
  .description('SYMindX CLI - Connect to and manage your AI agents')
  .version('1.0.0')
  .option('--api-url <url>', 'API URL', process.env["SYMINDX_API_URL"] || 'http://localhost:8000');

// Agent command
const agentCmd = program
  .command('agent')
  .alias('a')
  .description('Manage agents');

// List agents
agentCmd
  .command('list')
  .alias('ls')
  .description('List all agents')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    const spinner = ora('Fetching agents...').start();
    
    try {
      // Check if runtime is available
      const isAvailable = await runtimeClient.isRuntimeAvailable();
      if (!isAvailable) {
        spinner.fail('Cannot connect to SYMindX runtime');
        console.error(chalk.yellow('\nMake sure the runtime is running:'));
        console.error(chalk.gray('  cd mind-agents && bun start'));
        process.exit(1);
      }

      const agents = await runtimeClient.getAgents();
      spinner.stop();

      if (agents.length === 0) {
        console.log(chalk.yellow('No agents found'));
        console.log(chalk.gray('\nAgents may not be loaded yet. Check runtime logs.'));
        return;
      }

      console.log(chalk.blue.bold(`\n🤖 Agents (${agents.length})\n`));
      
      for (const agent of agents) {
        const statusIcon = agent.status === 'active' ? '🟢' : '🔴';
        const ethicsIcon = agent.ethicsEnabled ? '🛡️' : '⚠️';
        
        if (options.verbose) {
          console.log(`${statusIcon} ${chalk.cyan(agent.name)} ${chalk.gray(`(${agent.id})`)} ${ethicsIcon}`);
          console.log(`   Status: ${agent.status}`);
          console.log(`   Emotion: ${agent.emotion || 'neutral'}`);
          console.log(`   Extensions: ${agent.extensionCount}`);
          console.log(`   Portal: ${agent.hasPortal ? 'Connected' : 'None'}`);
          console.log();
        } else {
          console.log(`${statusIcon} ${chalk.cyan(agent.name.padEnd(20))} ${agent.status.padEnd(10)} ${chalk.gray(agent.id)} ${ethicsIcon}`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch agents');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// Start agent
agentCmd
  .command('start <id>')
  .description('Start an agent')
  .action(async (id) => {
    const spinner = ora(`Starting agent ${id}...`).start();
    
    try {
      const success = await runtimeClient.startAgent(id);
      if (success) {
        spinner.succeed(`Agent ${id} started`);
      } else {
        spinner.fail(`Failed to start agent ${id}`);
      }
    } catch (error) {
      spinner.fail('Failed to start agent');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

// Stop agent
agentCmd
  .command('stop <id>')
  .description('Stop an agent')
  .action(async (id) => {
    const spinner = ora(`Stopping agent ${id}...`).start();
    
    try {
      const success = await runtimeClient.stopAgent(id);
      if (success) {
        spinner.succeed(`Agent ${id} stopped`);
      } else {
        spinner.fail(`Failed to stop agent ${id}`);
      }
    } catch (error) {
      spinner.fail('Failed to stop agent');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  });

// Status command
program
  .command('status')
  .alias('s')
  .description('Show runtime status')
  .action(async () => {
    const spinner = ora('Fetching status...').start();
    
    try {
      const [status, metrics, agents] = await Promise.all([
        runtimeClient.getRuntimeStatus(),
        runtimeClient.getSystemMetrics(),
        runtimeClient.getAgents()
      ]);
      
      spinner.stop();
      
      console.log(chalk.blue.bold('\n📊 SYMindX Runtime Status\n'));
      console.log(`${chalk.green('●')} Runtime: ${status.runtime.isRunning ? chalk.green('Running') : chalk.red('Stopped')}`);
      console.log(`   Agents: ${agents.length} total, ${agents.filter(a => a.status === 'active').length} active`);
      console.log(`   Memory: ${(metrics.memory.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(metrics.memory.heapTotal / 1024 / 1024).toFixed(1)}MB`);
      console.log(`   Uptime: ${formatUptime(metrics.uptime)}`);
      console.log(`   Extensions: ${status.extensions.loaded} loaded, ${status.extensions.active} active`);
    } catch (error) {
      spinner.fail('Cannot connect to runtime');
      console.error(chalk.yellow('\nMake sure the runtime is running:'));
      console.error(chalk.gray('  cd mind-agents && bun start'));
    }
  });

// Helper functions
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}