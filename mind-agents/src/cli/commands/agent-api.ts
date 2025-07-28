/**
 * Agent Management Commands - API Version
 *
 * This version uses the runtime client to connect to a running SYMindX instance
 * instead of creating its own runtime.
 */

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';

import { AgentStatus } from '../../types/agent.js';
import { runtimeClient } from '../services/runtimeClient.js';

export class AgentCommand {
  private spinner = ora();

  getCommand(): Command {
    const cmd = new Command('agent')
      .alias('a')
      .description('Agent management commands');

    // List agents
    cmd
      .command('list')
      .alias('ls')
      .description('List all agents')
      .option('-v, --verbose', 'Show detailed information')
      .option('-s, --status <status>', 'Filter by status')
      .action(async (options) => {
        await this.listAgents(options);
      });

    // Start agent
    cmd
      .command('start <agentId>')
      .description('Start an agent')
      .option('-w, --wait', 'Wait for agent to be ready')
      .action(async (agentId, options) => {
        await this.startAgent(agentId, options);
      });

    // Stop agent
    cmd
      .command('stop <agentId>')
      .description('Stop an agent')
      .option('-f, --force', 'Force stop without graceful shutdown')
      .action(async (agentId, options) => {
        await this.stopAgent(agentId, options);
      });

    // Restart agent
    cmd
      .command('restart <agentId>')
      .description('Restart an agent')
      .option('-w, --wait', 'Wait for agent to be ready')
      .action(async (agentId, options) => {
        await this.restartAgent(agentId, options);
      });

    // Agent info
    cmd
      .command('info <agentId>')
      .description('Show detailed agent information')
      .action(async (agentId) => {
        await this.showAgentInfo(agentId);
      });

    return cmd;
  }

  async listAgents(options?: {
    verbose?: boolean;
    status?: string;
  }): Promise<void> {
    this.spinner.start('Fetching agents from runtime...');
    
    try {
      // Check if runtime is available
      const isAvailable = await runtimeClient.isRuntimeAvailable();
      if (!isAvailable) {
        this.spinner.fail('Cannot connect to SYMindX runtime');
        console.error(chalk.yellow('\nMake sure the runtime is running:'));
        console.error(chalk.gray('  cd mind-agents'));
        console.error(chalk.gray('  bun start'));
        process.exit(1);
      }

      const agents = await runtimeClient.getAgents();
      this.spinner.stop();

      if (agents.length === 0) {
        process.stdout.write(chalk.yellow('No agents found') + '\n');
        process.stdout.write(chalk.gray('\nAgents are configured to load lazily by default.') + '\n');
        process.stdout.write(chalk.gray('Only NyX is enabled by default. Check runtime logs for details.') + '\n');
        return;
      }

      // Filter by status if specified
      const filteredAgents = options?.status
        ? agents.filter(
            (agent) =>
              agent.status.toLowerCase() === options.status!.toLowerCase()
          )
        : agents;

      if (filteredAgents.length === 0) {
        process.stdout.write(
          chalk.yellow(`No agents found with status: ${options?.status}`) + '\n'
        );
        return;
      }

      process.stdout.write(chalk.blue.bold(`\n🤖 Agents (${filteredAgents.length})`) + '\n');
      process.stdout.write(chalk.gray('─'.repeat(80)) + '\n');

      for (const agent of filteredAgents) {
        const statusColor = this.getStatusColor(agent.status);
        const ethicsIcon = agent.ethicsEnabled ? '🛡️' : '⚠️';

        if (options?.verbose) {
          process.stdout.write(
            '\n' +
              chalk.cyan(agent.name) +
              ' ' +
              chalk.gray('(' + agent.id + ')') + '\n'
          );
          process.stdout.write('  ' + chalk.white('Status:') + ' ' + statusColor(agent.status) + '\n');
          process.stdout.write(
            '  ' + chalk.white('Ethics:') + ' ' + ethicsIcon + ' ' + 
            (agent.ethicsEnabled ? 'Enabled' : 'Disabled') + '\n'
          );
          process.stdout.write(
            '  ' +
              chalk.white('Emotion:') +
              ' ' +
              (agent.emotion || 'neutral') + '\n'
          );
          process.stdout.write(
            '  ' +
              chalk.white('Extensions:') +
              ' ' +
              agent.extensionCount + '\n'
          );
          process.stdout.write(
            '  ' +
              chalk.white('Portal:') +
              ' ' +
              (agent.hasPortal ? 'Connected' : 'None') + '\n'
          );
          if (agent.lastUpdate) {
            process.stdout.write(
              '  ' +
                chalk.white('Last Update:') +
                ' ' +
                agent.lastUpdate + '\n'
            );
          }
        } else {
          const statusIcon = agent.status === 'active' ? '🟢' : '🔴';
          process.stdout.write(
            statusIcon +
              ' ' +
              chalk.cyan(agent.name.padEnd(20)) +
              ' ' +
              statusColor(agent.status.padEnd(10)) +
              ' ' +
              chalk.gray(agent.id) + 
              ' ' +
              ethicsIcon + '\n'
          );
        }
      }

      if (options?.verbose) {
        process.stdout.write(chalk.gray('\n' + '─'.repeat(80)) + '\n');
      }
    } catch (error) {
      this.spinner.fail('Failed to fetch agents');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  }

  async startAgent(
    agentId: string,
    options?: { wait?: boolean }
  ): Promise<void> {
    this.spinner.start(`Starting agent ${agentId}...`);

    try {
      const success = await runtimeClient.startAgent(agentId);

      if (success) {
        if (options?.wait) {
          // Wait a moment for agent to stabilize
          await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        }
        this.spinner.succeed(`Agent ${agentId} started successfully`);
      } else {
        this.spinner.fail(`Failed to start agent ${agentId}`);
      }
    } catch (error) {
      this.spinner.fail(`Failed to start agent`);
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  }

  async stopAgent(
    agentId: string,
    options?: { force?: boolean }
  ): Promise<void> {
    if (!options?.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to stop agent '${agentId}'?`,
          default: false,
        },
      ]);

      if (!confirm) {
        process.stdout.write(chalk.gray('Operation cancelled') + '\n');
        return;
      }
    }

    this.spinner.start(`Stopping agent ${agentId}...`);

    try {
      const success = await runtimeClient.stopAgent(agentId);

      if (success) {
        this.spinner.succeed(`Agent ${agentId} stopped successfully`);
      } else {
        this.spinner.fail(`Failed to stop agent ${agentId}`);
      }
    } catch (error) {
      this.spinner.fail(`Failed to stop agent`);
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async restartAgent(
    agentId: string,
    options?: { wait?: boolean }
  ): Promise<void> {
    await this.stopAgent(agentId, { force: true });
    await new Promise<void>((resolve) => setTimeout(resolve, 1000)); // Brief pause
    await this.startAgent(agentId, options);
  }

  async showAgentInfo(agentId: string): Promise<void> {
    this.spinner.start(`Fetching information for agent ${agentId}...`);

    try {
      const agent = await runtimeClient.getAgent(agentId);
      
      if (!agent) {
        this.spinner.fail(`Agent '${agentId}' not found`);
        return;
      }

      this.spinner.stop();

      const statusColor = this.getStatusColor(agent.status);
      const ethicsIcon = agent.ethicsEnabled ? '🛡️' : '⚠️';

      process.stdout.write(chalk.blue.bold(`\n🤖 Agent Information`) + '\n');
      process.stdout.write(chalk.gray('─'.repeat(50)) + '\n');
      process.stdout.write(`${chalk.cyan('Name:')} ${agent.name}` + '\n');
      process.stdout.write(`${chalk.cyan('ID:')} ${agent.id}` + '\n');
      process.stdout.write(`${chalk.cyan('Status:')} ${statusColor(agent.status)}` + '\n');
      process.stdout.write(
        `${chalk.cyan('Ethics:')} ${ethicsIcon} ${agent.ethicsEnabled ? 'Enabled' : 'Disabled'}` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Emotion:')} ${agent.emotion || 'neutral'}` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Extensions:')} ${agent.extensionCount || 0}` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Portal:')} ${agent.hasPortal ? 'Connected' : 'None'}` + '\n'
      );
      if (agent.lastUpdate) {
        process.stdout.write(
          `${chalk.cyan('Last Update:')} ${agent.lastUpdate}` + '\n'
        );
      }
    } catch (error) {
      this.spinner.fail('Failed to get agent information');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private getStatusColor(status: string): (text: string) => string {
    switch (status.toLowerCase()) {
      case 'active':
        return chalk.green;
      case 'thinking':
        return chalk.blue;
      case 'idle':
        return chalk.gray;
      case 'error':
        return chalk.red;
      default:
        return chalk.yellow;
    }
  }
}