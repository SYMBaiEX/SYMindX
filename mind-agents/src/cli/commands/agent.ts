/**
 * Agent Management Commands
 *
 * Handles CLI commands for agent lifecycle management:
 * - List agents
 * - Start/stop agents
 * - Create/remove agents
 * - Agent status and configuration
 */

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';

import {
  AgentConfig,
  AgentStatus,
  MemoryProviderType,
  CognitionModuleType,
  EmotionModuleType,
  Agent,
  Extension,
} from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';
import { CLIContext } from '../index';

export class AgentCommand {
  private logger = runtimeLogger;
  private spinner = ora();

  constructor(private context: CLIContext) {}

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

    // Create agent
    cmd
      .command('create')
      .description('Create a new agent interactively')
      .option('-f, --file <path>', 'Create from configuration file')
      .option(
        '-t, --template <name>',
        'Use template (basic, autonomous, social)'
      )
      .action(async (options) => {
        await this.createAgent(options);
      });

    // Remove agent
    cmd
      .command('remove <agentId>')
      .alias('rm')
      .description('Remove an agent')
      .option('-f, --force', 'Force removal without confirmation')
      .action(async (agentId, options) => {
        await this.removeAgent(agentId, options);
      });

    // Agent info
    cmd
      .command('info <agentId>')
      .description('Show detailed agent information')
      .action(async (agentId) => {
        await this.showAgentInfo(agentId);
      });

    // Agent config
    cmd
      .command('config <agentId>')
      .description('Show or edit agent configuration')
      .option('-e, --edit', 'Edit configuration')
      .option(
        '-s, --set <key=value>',
        'Set configuration value',
        this.collectKeyValue,
        {}
      )
      .action(async (agentId, options) => {
        await this.manageAgentConfig(agentId, options);
      });

    return cmd;
  }

  async listAgents(options?: {
    verbose?: boolean;
    status?: string;
  }): Promise<void> {
    try {
      const agents = Array.from(this.context.runtime.agents.values());

      if (agents.length === 0) {
        process.stdout.write(chalk.yellow('No agents found') + '\n');
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
        // Check if agent has autonomous status
        const autonomousStatus = this.context.runtime.getAutonomousStatus(agent.id);
        const isAutonomous = autonomousStatus.autonomous || false;

        if (options?.verbose) {
          process.stdout.write(
            '\n' +
              chalk.cyan(agent.name) +
              ' ' +
              chalk.gray('(' + agent.id + ')') + '\n'
          );
          process.stdout.write('  ' + chalk.white('Status:') + ' ' + statusColor + '\n');
          process.stdout.write(
            '  ' +
              chalk.white('Autonomous:') +
              ' ' +
              (isAutonomous ? '✅' : '❌') + '\n'
          );
          process.stdout.write(
            '  ' +
              chalk.white('Emotion:') +
              ' ' +
              (agent.emotion?.current || 'unknown') + '\n'
          );
          process.stdout.write(
            '  ' +
              chalk.white('Last Update:') +
              ' ' +
              (agent.lastUpdate?.toLocaleString() || 'never') + '\n'
          );
          process.stdout.write(
            '  ' + chalk.white('Extensions:') + ' ' + agent.extensions.length + '\n'
          );

          if (isAutonomous) {
            const autonomyLevel = autonomousStatus.engine?.autonomyLevel || 0;
            process.stdout.write(
              '  ' +
                chalk.white('Autonomy Level:') +
                ' ' +
                (autonomyLevel * 100).toFixed(0) +
                '%' + '\n'
            );
          }
        } else {
          const autonomyIndicator = isAutonomous ? '🤖' : '👤';
          process.stdout.write(
            autonomyIndicator +
              ' ' +
              chalk.cyan(agent.name.padEnd(20)) +
              ' ' +
              statusColor(agent.status.padEnd(10)) +
              ' ' +
              chalk.gray(agent.id) + '\n'
          );
        }
      }

      if (options?.verbose) {
        process.stdout.write(chalk.gray('\n' + '─'.repeat(80)) + '\n');
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list agents') + '\n');
      this.logger.error('List agents error:', error);
    }
  }

  async startAgent(
    agentId: string,
    options?: { wait?: boolean }
  ): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      if (agent.status === AgentStatus.ACTIVE) {
        process.stdout.write(
          chalk.yellow(`⚠️  Agent '${agent.name}' is already active`) + '\n'
        );
        return;
      }

      this.spinner.start(`Starting agent ${agent.name}...`);

      // Start agent by setting status and initializing extensions
      agent.status = AgentStatus.ACTIVE;

      // Initialize any stopped extensions
      for (const extension of agent.extensions) {
        try {
          if (typeof extension.init === 'function') {
            await extension.init(agent);
          }
        } catch (error) {
          this.logger.warn(`Failed to start extension ${extension.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (options?.wait) {
        // Wait a moment for agent to stabilize
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
      }

      this.spinner.succeed(`Agent ${agent.name} started successfully`);
    } catch (error) {
      this.spinner.fail(`Failed to start agent`);
      this.logger.error('Start agent error:', error);
    }
  }

  async stopAgent(
    agentId: string,
    options?: { force?: boolean }
  ): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      if (
        agent.status === AgentStatus.IDLE ||
        agent.status === AgentStatus.ERROR
      ) {
        process.stdout.write(
          chalk.yellow(`⚠️  Agent '${agent.name}' is already stopped`) + '\n'
        );
        return;
      }

      if (!options?.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to stop agent '${agent.name}'?`,
            default: false,
          },
        ]);

        if (!confirm) {
          process.stdout.write(chalk.gray('Operation cancelled') + '\n');
          return;
        }
      }

      this.spinner.start(`Stopping agent ${agent.name}...`);

      // Stop agent
      agent.status = AgentStatus.IDLE;

      // Stop autonomous systems if agent is autonomous
      try {
        if (this.context.runtime.getAutonomousStatus(agentId).autonomous) {
          await this.context.runtime.deactivateAgent(agentId);
        }
      } catch (error) {
        this.logger.warn(`Failed to stop autonomous systems: ${error instanceof Error ? error.message : String(error)}`);
      }

      this.spinner.succeed(`Agent ${agent.name} stopped successfully`);
    } catch (error) {
      this.spinner.fail(`Failed to stop agent`);
      this.logger.error('Stop agent error:', error);
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

  async createAgent(options?: {
    file?: string;
    template?: string;
  }): Promise<void> {
    try {
      let config: AgentConfig;

      if (options?.file) {
        // Load from file
        const fs = await import('fs/promises');
        const configData = await fs.readFile(options.file, 'utf-8');
        config = JSON.parse(configData);
      } else if (options?.template) {
        // Use template
        config = this.getAgentTemplate(options.template);
      } else {
        // Interactive creation
        config = await this.createAgentInteractively();
      }

      this.spinner.start('Creating agent...');

      const agentId = await this.context.runtime.createAgent(config);

      this.spinner.succeed(`Agent created successfully with ID: ${agentId}`);
      process.stdout.write(chalk.green(`✅ Agent '${config.core.name}' is ready`) + '\n');
    } catch (error) {
      this.spinner.fail('Failed to create agent');
      this.logger.error('Create agent error:', error);
    }
  }

  async removeAgent(
    agentId: string,
    options?: { force?: boolean }
  ): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      if (!options?.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to permanently remove agent '${agent.name}'?`,
            default: false,
          },
        ]);

        if (!confirm) {
          process.stdout.write(chalk.gray('Operation cancelled') + '\n');
          return;
        }
      }

      this.spinner.start(`Removing agent ${agent.name}...`);

      const success = await this.context.runtime.removeAgent(agentId);

      if (success) {
        this.spinner.succeed(`Agent ${agent.name} removed successfully`);
      } else {
        this.spinner.fail(`Failed to remove agent`);
      }
    } catch (error) {
      this.spinner.fail(`Failed to remove agent`);
      this.logger.error('Remove agent error:', error);
    }
  }

  async showAgentInfo(agentId: string): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      const autonomousStatus = this.context.runtime.getAutonomousStatus(agentId);
      const isAutonomous = autonomousStatus.autonomous || false;
      const statusColor = this.getStatusColor(agent.status);

      process.stdout.write(chalk.blue.bold(`\n🤖 Agent Information`) + '\n');
      process.stdout.write(chalk.gray('─'.repeat(50)) + '\n');
      process.stdout.write(`${chalk.cyan('Name:')} ${agent.name}` + '\n');
      process.stdout.write(`${chalk.cyan('ID:')} ${agent.id}` + '\n');
      process.stdout.write(`${chalk.cyan('Status:')} ${statusColor}` + '\n');
      process.stdout.write(
        `${chalk.cyan('Autonomous:')} ${isAutonomous ? '✅ Yes' : '❌ No'}` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Emotion:')} ${agent.emotion?.current || 'unknown'}` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Last Update:')} ${agent.lastUpdate?.toLocaleString() || 'never'}` + '\n'
      );

      if (agent.portal) {
        process.stdout.write(
          `${chalk.cyan('Portal:')} ${agent.portal.name || 'configured'}` + '\n'
        );
      }

      // Extensions
      process.stdout.write(chalk.blue('\n📦 Extensions') + '\n');
      process.stdout.write(chalk.gray('─'.repeat(50)) + '\n');
      for (const ext of agent.extensions) {
        const statusIcon = '✅'; // Extensions in the array are considered active
        process.stdout.write(`${statusIcon} ${ext.id}` + '\n');
      }

      // Autonomous information
      if (isAutonomous) {
        process.stdout.write(chalk.blue('\n🤖 Autonomous Status') + '\n');
        process.stdout.write(chalk.gray('─'.repeat(50)) + '\n');
        const autonomyLevel = autonomousStatus.engine?.autonomyLevel || 0;
        process.stdout.write(
          `${chalk.cyan('Autonomy Level:')} ${(autonomyLevel * 100).toFixed(0)}%` + '\n'
        );
        process.stdout.write(
          `${chalk.cyan('Enabled:')} ${isAutonomous ? '✅' : '❌'}` + '\n'
        );
        process.stdout.write(
          `${chalk.cyan('State:')} ${autonomousStatus.engine?.currentPhase || 'unknown'}` + '\n'
        );
        process.stdout.write(
          chalk.cyan('Lifecycle:') + ' Integrated into autonomous engine' + '\n'
        );
      }

      // Configuration summary
      if (agent.config) {
        process.stdout.write(chalk.blue('\n⚙️  Configuration') + '\n');
        process.stdout.write(chalk.gray('─'.repeat(50)) + '\n');
        process.stdout.write(
          `${chalk.cyan('Memory Provider:')} ${agent.config.psyche?.defaults?.memory || 'unknown'}` + '\n'
        );
        process.stdout.write(
          `${chalk.cyan('Cognition Module:')} ${agent.config.psyche?.defaults?.cognition || 'unknown'}` + '\n'
        );
        process.stdout.write(
          `${chalk.cyan('Emotion Module:')} ${agent.config.psyche?.defaults?.emotion || 'unknown'}` + '\n'
        );
        process.stdout.write(
          `${chalk.cyan('Portal:')} ${agent.config.psyche?.defaults?.portal || 'none'}` + '\n'
        );
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to get agent information') + '\n');
      this.logger.error('Agent info error:', error);
    }
  }

  async manageAgentConfig(agentId: string, options: unknown): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) {
        process.stdout.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      const opts = options as { edit?: boolean; set?: Record<string, unknown> };

      if (opts.edit) {
        process.stdout.write(
          chalk.yellow('⚠️  Configuration editing not yet implemented') + '\n'
        );
        return;
      }

      if (Object.keys(opts.set || {}).length > 0) {
        process.stdout.write(
          chalk.yellow('⚠️  Configuration setting not yet implemented') + '\n'
        );
        return;
      }

      // Show configuration
      process.stdout.write(chalk.blue.bold(`\n⚙️  Configuration for ${agent.name}`) + '\n');
      process.stdout.write(chalk.gray('─'.repeat(50)) + '\n');
      process.stdout.write(JSON.stringify(agent.config, null, 2) + '\n');
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to manage agent configuration') + '\n');
      this.logger.error('Agent config error:', error);
    }
  }

  // Interactive methods for use from the main CLI
  async interactiveStart(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values()).filter(
      (agent) => agent.status !== AgentStatus.ACTIVE
    );

    if (agents.length === 0) {
      process.stdout.write(chalk.yellow('⚠️  No stopped agents to start') + '\n');
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to start:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.status})`,
          value: agent.id,
        })),
      },
    ]);

    await this.startAgent(agentId, { wait: true });
  }

  async interactiveStop(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values()).filter(
      (agent) => agent.status === AgentStatus.ACTIVE
    );

    if (agents.length === 0) {
      process.stdout.write(chalk.yellow('⚠️  No running agents to stop') + '\n');
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to stop:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.status})`,
          value: agent.id,
        })),
      },
    ]);

    await this.stopAgent(agentId);
  }

  async interactiveRestart(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values());

    if (agents.length === 0) {
      process.stdout.write(chalk.yellow('⚠️  No agents to restart') + '\n');
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to restart:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.status})`,
          value: agent.id,
        })),
      },
    ]);

    await this.restartAgent(agentId, { wait: true });
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
          { name: '📁 Load from file', value: 'file' },
        ],
      },
    ]);

    switch (method) {
      case 'interactive':
        await this.createAgent();
        break;
      case 'template': {
        const { template } = await inquirer.prompt([
          {
            type: 'list',
            name: 'template',
            message: 'Select template:',
            choices: [
              { name: 'Basic Agent', value: 'basic' },
              { name: 'Autonomous Agent', value: 'autonomous' },
              { name: 'Social Agent', value: 'social' },
            ],
          },
        ]);
        await this.createAgent({ template });
        break;
      }
      case 'file': {
        const { file } = await inquirer.prompt([
          {
            type: 'input',
            name: 'file',
            message: 'Path to configuration file:',
            validate: (input: string): string | boolean =>
              input.trim().length > 0 || 'Please enter a file path',
          },
        ]);
        await this.createAgent({ file });
        break;
      }
    }
  }

  async interactiveRemove(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values());

    if (agents.length === 0) {
      process.stdout.write(chalk.yellow('⚠️  No agents to remove') + '\n');
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to remove:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.id})`,
          value: agent.id,
        })),
      },
    ]);

    await this.removeAgent(agentId);
  }

  private async createAgentInteractively(): Promise<AgentConfig> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        validate: (input: string): string | boolean => input.trim().length > 0 || 'Please enter a name',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Agent description:',
        default: 'A helpful AI agent',
      },
      {
        type: 'list',
        name: 'memory',
        message: 'Memory provider:',
        choices: ['sqlite', 'memory', 'supabase', 'neon'],
        default: 'sqlite',
      },
      {
        type: 'list',
        name: 'cognition',
        message: 'Cognition module:',
        choices: ['htn-planner', 'reactive', 'hybrid'],
        default: 'htn-planner',
      },
      {
        type: 'list',
        name: 'emotion',
        message: 'Emotion module:',
        choices: ['composite', 'complex-emotions', 'basic-emotions'],
        default: 'composite',
      },
      {
        type: 'confirm',
        name: 'autonomous',
        message: 'Enable autonomous capabilities?',
        default: false,
      },
    ]);

    return {
      core: {
        name: answers.name,
        tone: 'friendly',
        personality: ['helpful', 'curious', 'analytical'],
      },
      lore: {
        origin: 'Created by SYMindX CLI',
        motive: 'To assist and learn',
      },
      psyche: {
        defaults: {
          memory: answers.memory,
          cognition: answers.cognition,
          emotion: answers.emotion,
        },
        traits: ['analytical', 'curious', 'helpful', 'persistent'],
      },
      modules: {
        memory: {
          provider: MemoryProviderType.SQLITE,
          maxRecords: 1000,
        },
        cognition: {
          type: CognitionModuleType.REACTIVE,
          planningDepth: 3,
          memoryIntegration: true,
          creativityLevel: 0.7,
        },
        emotion: {
          type: EmotionModuleType.COMPOSITE,
          sensitivity: 0.6,
          decayRate: 0.1,
          transitionSpeed: 0.5,
        },
        extensions: ['api'],
      },
    };
  }

  private getAgentTemplate(template: string): AgentConfig {
    const baseConfig = {
      core: {
        name: `Agent-${Date.now()}`,
        tone: 'professional',
        personality: ['efficient', 'reliable', 'adaptable'],
      },
      lore: {
        origin: 'Template-generated agent',
        motive: 'To assist and complete tasks efficiently',
      },
      psyche: {
        defaults: {
          memory: 'sqlite',
          cognition: 'htn-planner',
          emotion: 'composite',
        },
        traits: ['analytical', 'curious', 'helpful', 'persistent'],
      },
      modules: {
        memory: {
          provider: MemoryProviderType.SQLITE,
          maxRecords: 1000,
        },
        cognition: {
          type: CognitionModuleType.REACTIVE,
          planningDepth: 3,
          memoryIntegration: true,
          creativityLevel: 0.7,
        },
        emotion: {
          type: EmotionModuleType.COMPOSITE,
          sensitivity: 0.6,
          decayRate: 0.1,
          transitionSpeed: 0.5,
        },
        extensions: ['api'],
      },
    };

    switch (template) {
      case 'autonomous':
        return {
          ...baseConfig,
          core: {
            ...baseConfig.core,
            name: `Autonomous-Agent-${Date.now()}`,
            tone: 'confident',
            personality: ['independent', 'decisive', 'analytical'],
          },
        };
      case 'social':
        return {
          ...baseConfig,
          core: {
            ...baseConfig.core,
            name: `Social-Agent-${Date.now()}`,
            tone: 'friendly',
            personality: ['empathetic', 'communicative', 'social'],
          },
          psyche: {
            ...baseConfig.psyche,
            traits: [
              'empathetic',
              'communicative',
              'social',
              'understanding',
              'expressive',
            ],
          },
          modules: {
            ...baseConfig.modules,
            extensions: ['api', 'slack', 'telegram'],
          },
        };
      default: // basic
        return baseConfig;
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

  private collectKeyValue(
    value: string,
    previous: Record<string, unknown>
  ): Record<string, unknown> {
    const [key, val] = value.split('=');
    if (key && val !== undefined) {
      previous[key] = val;
    }
    return previous;
  }
}