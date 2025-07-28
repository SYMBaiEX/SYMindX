/**
 * List Commands
 *
 * Comprehensive listing commands for system resources:
 * - Agents and their details
 * - Available modules and extensions
 * - Commands and their history
 * - System resources and capabilities
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { runtimeLogger } from '../../utils/logger';
import { CLIContext } from '../index';

// Interfaces for runtime capabilities
interface RuntimeCapabilities {
  runtime?: {
    version?: string;
    isRunning?: boolean;
    tickInterval?: number;
  };
  agents?: {
    total?: number;
    activeList?: string[];
  };
  modules?: {
    memory?: { available?: string[] };
    emotion?: { available?: string[] };
    cognition?: { available?: string[] };
    portals?: { available?: string[]; factories?: string[] };
  };
  extensions?: {
    loaded?: string[];
    available?: string[];
  };
}

interface RuntimeStats {
  agents?: number;
  autonomousAgents?: number;
  isRunning?: boolean;
  eventBus?: { events?: number };
  autonomous?: { autonomousEngines?: number };
}

interface CommandStats {
  totalCommands: number;
  pendingCommands: number;
  processingCommands: number;
  completedCommands: number;
  failedCommands: number;
  averageExecutionTime: number;
}

export class ListCommand {
  private logger = runtimeLogger;

  constructor(private context: CLIContext) {}

  getCommand(): Command {
    const cmd = new Command('list')
      .alias('ls')
      .description('List system resources and information');

    // List agents
    cmd
      .command('agents')
      .alias('a')
      .description('List all agents')
      .option('-s, --status <status>', 'Filter by status')
      .option('-t, --type <type>', 'Filter by type (autonomous, standard)')
      .option('-v, --verbose', 'Show detailed information')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        await this.listAgents(options);
      });

    // List modules
    cmd
      .command('modules')
      .alias('m')
      .description('List available modules')
      .option(
        '-t, --type <type>',
        'Filter by type (emotion, cognition, memory, portal)'
      )
      .option('--available', 'Show only available modules')
      .option('--loaded', 'Show only loaded modules')
      .action(async (options) => {
        await this.listModules(options);
      });

    // List extensions
    cmd
      .command('extensions')
      .alias('ext')
      .description('List extensions and plugins')
      .option('-e, --enabled', 'Show only enabled extensions')
      .option('-a, --agent <agentId>', 'Show extensions for specific agent')
      .action(async (options) => {
        await this.listExtensions(options);
      });

    // List commands
    cmd
      .command('commands')
      .alias('cmd')
      .description('List recent commands')
      .option('-a, --agent <agentId>', 'Filter by agent')
      .option('-s, --status <status>', 'Filter by status')
      .option('-l, --limit <number>', 'Number of commands to show', '20')
      .option('--active', 'Show only active commands')
      .action(async (options) => {
        await this.listCommands(options);
      });

    // List portals
    cmd
      .command('portals')
      .alias('p')
      .description('List AI portals and providers')
      .option('-a, --available', 'Show only available portals')
      .option('-c, --configured', 'Show only configured portals')
      .action(async (options) => {
        await this.listPortals(options);
      });

    // List events
    cmd
      .command('events')
      .alias('e')
      .description('List recent events')
      .option('-t, --type <type>', 'Filter by event type')
      .option('-s, --source <source>', 'Filter by event source')
      .option('-l, --limit <number>', 'Number of events to show', '20')
      .action(async (options) => {
        await this.listEvents(options);
      });

    // List capabilities
    cmd
      .command('capabilities')
      .alias('caps')
      .description('List system capabilities')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        await this.listCapabilities(options);
      });

    return cmd;
  }

  async listAgents(options: any): Promise<void> {
    try {
      // Fetch agents from API server
      const response = await fetch(`${this.context.config.apiUrl}/agents`);
      if (!response.ok) {
        process.stdout.write(
          chalk.yellow(
            '⚠️  Could not connect to API server. Is the runtime running?'
          )
        );
        return;
      }

      const data = await response.json();
      let agents = data.agents || [];

      // Apply filters
      if (options.status) {
        agents = agents.filter(
          (agent: any) =>
            agent.status.toLowerCase() === options.status.toLowerCase()
        );
      }

      if (options.type) {
        // For API-fetched agents, we might not have autonomy information
        // This would need to be enhanced to call a separate API endpoint for autonomy status
        process.stdout.write(
          chalk.yellow('⚠️  Type filtering not available via API yet')
        );
      }

      if (options.json) {
        process.stdout.write(JSON.stringify(agents, null, 2));
        return;
      }

      if (agents.length === 0) {
        process.stdout.write(chalk.yellow('No agents found matching criteria') + '\n');
        return;
      }

      // Show warning if any agents are in error state
      const errorAgents = agents.filter(
        (agent: any) => agent.status === 'error'
      );
      if (errorAgents.length > 0) {
        process.stdout.write(
          chalk.red(
            `⚠️  ${errorAgents.length} agent(s) are in error state. Check API keys and configuration.`
          )
        );
      }

      process.stdout.write(chalk.blue.bold(`\n🤖 Agents (${agents.length})`));
      process.stdout.write(chalk.gray('─'.repeat(80)));

      if (options.verbose) {
        for (const agent of agents) {
          await this.displayAgentDetailed(agent);
        }
      } else {
        process.stdout.write(
          chalk.cyan(
            'TYPE  NAME                    STATUS      EMOTION     EXTENSIONS  ID'
          )
        );
        process.stdout.write(chalk.gray('─'.repeat(80)));

        for (const agent of agents) {
          const typeIcon = '🤖'; // Default to bot icon for API-fetched agents
          const statusColor = this.getStatusColor(agent.status);

          const name = agent.name.padEnd(20).substring(0, 20);
          const status = statusColor(agent.status.padEnd(10));
          const emotion = (agent.emotion ?? 'unknown').padEnd(10);
          const extensions = (agent.extensionCount ?? 0).toString().padEnd(10);
          const id = chalk.gray(agent.id.substring(0, 12) + '...');

          process.stdout.write(
            `${typeIcon}    ${chalk.cyan(name)} ${status} ${emotion} ${extensions} ${id}`
          );
        }
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list agents'));
      this.logger.error('List agents error:', error);
    }
  }

  async listModules(options: any): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n🧩 Available Modules'));
      process.stdout.write(chalk.gray('─'.repeat(60)));

      const capabilities = this.context.runtime.getRuntimeCapabilities() as RuntimeCapabilities;
      
      // Type guard to ensure capabilities.modules exists and has the expected structure
      const modules = capabilities.modules ?? {};

      // Memory modules
      if (!options.type || options.type === 'memory') {
        process.stdout.write(chalk.cyan('\n💾 Memory Providers:'));
        const memoryProviders = modules.memory?.available ?? [];
        for (const provider of memoryProviders) {
          process.stdout.write(`  • ${provider}`);
        }
      }

      // Emotion modules
      if (!options.type || options.type === 'emotion') {
        process.stdout.write(chalk.cyan('\n😊 Emotion Modules:'));
        const emotionModules = modules.emotion?.available ?? [];
        for (const module of emotionModules) {
          process.stdout.write(`  • ${module}`);
        }
      }

      // Cognition modules
      if (!options.type || options.type === 'cognition') {
        process.stdout.write(chalk.cyan('\n🧠 Cognition Modules:'));
        const cognitionModules = modules.cognition?.available ?? [];
        for (const module of cognitionModules) {
          process.stdout.write(`  • ${module}`);
        }
      }

      // Portal modules
      if (!options.type || options.type === 'portal') {
        process.stdout.write(chalk.cyan('\n🔮 Portals:'));
        const portalModules = modules.portals?.available ?? [];
        for (const portal of portalModules) {
          process.stdout.write(`  • ${portal}`);
        }

        const portalFactories = modules.portals?.factories ?? [];
        if (portalFactories.length > 0) {
          process.stdout.write(chalk.gray('\n  Portal Factories:'));
          for (const factory of portalFactories) {
            process.stdout.write(chalk.gray(`    • ${factory}`));
          }
        }
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list modules'));
      this.logger.error('List modules error:', error);
    }
  }

  async listExtensions(options: any): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n📦 Extensions'));
      process.stdout.write(chalk.gray('─'.repeat(60)));

      if (options.agent) {
        // Show extensions for specific agent
        const agent = this.context.runtime.agents.get(options.agent);
        if (!agent) {
          process.stdout.write(chalk.red(`❌ Agent '${options.agent}' not found`));
          return;
        }

        process.stdout.write(chalk.cyan(`Extensions for ${agent.name}:`));
        for (const ext of agent.extensions) {
          if (options.enabled && !ext.enabled) continue;

          const statusIcon = ext.enabled ? '✅' : '❌';
          process.stdout.write(`${statusIcon} ${ext.name} (${ext.id})`);

          if (ext.version) {
            process.stdout.write(chalk.gray(`    Version: ${ext.version}`));
          }

          const actions = Object.keys(ext.actions || {});
          if (actions.length > 0) {
            process.stdout.write(chalk.gray(`    Actions: ${actions.join(', ')}`));
          }
        }
      } else {
        // Show all extensions across all agents
        const allExtensions = new Map<
          string,
          { extension: any; agents: string[] }
        >();

        // Use Array.from to get all agents
        const agents = Array.from(this.context.runtime.agents.values());
        for (const agent of agents) {
          for (const ext of agent.extensions) {
            if (options.enabled && !ext.enabled) continue;

            if (allExtensions.has(ext.id)) {
              allExtensions.get(ext.id)!.agents.push(agent.name);
            } else {
              allExtensions.set(ext.id, {
                extension: ext,
                agents: [agent.name],
              });
            }
          }
        }

        if (allExtensions.size === 0) {
          process.stdout.write(chalk.yellow('No extensions found'));
          return;
        }

        for (const [extId, data] of allExtensions) {
          const statusIcon = data.extension.enabled ? '✅' : '❌';
          process.stdout.write(
            `${statusIcon} ${chalk.cyan(data.extension.name)} (${extId})`
          );
          process.stdout.write(chalk.gray(`    Used by: ${data.agents.join(', ')}`));

          if (data.extension.version) {
            process.stdout.write(chalk.gray(`    Version: ${data.extension.version}`));
          }

          const actions = Object.keys(data.extension.actions || {});
          if (actions.length > 0) {
            process.stdout.write(chalk.gray(`    Actions: ${actions.join(', ')}`));
          }
          process.stdout.write('\n');
        }
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list extensions'));
      this.logger.error('List extensions error:', error);
    }
  }

  async listCommands(options: any): Promise<void> {
    try {
      // Command system is no longer available, show message
      process.stdout.write(chalk.yellow('⚠️  Command history feature not available in current implementation') + '\n');
      process.stdout.write(chalk.gray('   Command tracking would need to be implemented in the API extension') + '\n');
      
      if (options.agent) {
        process.stdout.write(chalk.gray(`   Requested agent filter: ${options.agent}`) + '\n');
      }
      if (options.status) {
        process.stdout.write(chalk.gray(`   Requested status filter: ${options.status}`) + '\n');
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list commands') + '\n');
      this.logger.error('List commands error:', error);
    }
  }

  async listPortals(_options: any): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n🔮 AI Portals'));
      process.stdout.write(chalk.gray('─'.repeat(60)));

      const capabilities = this.context.runtime.getRuntimeCapabilities() as RuntimeCapabilities;
      const modules = capabilities.modules ?? {};
      const availablePortals = modules.portals?.available ?? [];
      const factories = modules.portals?.factories ?? [];

      process.stdout.write(chalk.cyan('Available Portals:'));
      for (const portal of availablePortals) {
        const isConfigured = this.isPortalConfigured(portal);
        const statusIcon = isConfigured ? '✅' : '❌';
        process.stdout.write(`${statusIcon} ${portal}`);
      }

      if (factories.length > 0) {
        process.stdout.write(chalk.cyan('\nPortal Factories:'));
        for (const factory of factories) {
          process.stdout.write(`  🏭 ${factory}`);
        }
      }

      // Show which agents are using which portals
      process.stdout.write(chalk.cyan('\nPortal Usage:'));
      const portalUsage = new Map<string, string[]>();

      for (const agent of this.context.runtime.agents.values()) {
        if (agent.portal && agent.portal.name) {
          const portalName = agent.portal.name;
          if (portalUsage.has(portalName)) {
            portalUsage.get(portalName)!.push(agent.name);
          } else {
            portalUsage.set(portalName, [agent.name]);
          }
        }
      }

      if (portalUsage.size === 0) {
        process.stdout.write(chalk.gray('  No portals currently in use'));
      } else {
        for (const [portal, agents] of portalUsage) {
          process.stdout.write(`  ${portal}: ${agents.join(', ')}`);
        }
      }

      // Show API key status
      process.stdout.write(chalk.cyan('\nAPI Key Status:'));
      const apiKeys = [
        { name: 'OpenAI', env: 'OPENAI_API_KEY' },
        { name: 'Anthropic', env: 'ANTHROPIC_API_KEY' },
        { name: 'Groq', env: 'GROQ_API_KEY' },
        { name: 'xAI', env: 'XAI_API_KEY' },
        { name: 'Google', env: 'GOOGLE_API_KEY' },
      ];

      for (const apiKey of apiKeys) {
        const isSet = !!process.env[apiKey.env];
        const statusIcon = isSet ? '✅' : '❌';
        process.stdout.write(`${statusIcon} ${apiKey.name}`);
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list portals'));
      this.logger.error('List portals error:', error);
    }
  }

  async listEvents(options: any): Promise<void> {
    try {
      const events = await this.context.runtime.getEventHistory({
        type: options.type,
        source: options.source,
        limit: parseInt(options.limit),
      });

      if (events.length === 0) {
        process.stdout.write(chalk.yellow('No events found matching criteria'));
        return;
      }

      process.stdout.write(chalk.blue.bold(`\n📡 Events (${events.length})`));
      process.stdout.write(chalk.gray('─'.repeat(80)));
      process.stdout.write(
        chalk.cyan('TIME     TYPE               SOURCE          DATA')
      );
      process.stdout.write(chalk.gray('─'.repeat(80)));

      for (const event of events) {
        const time = new Date(event.timestamp).toLocaleTimeString().padEnd(8);
        const typeColor = this.getEventTypeColor(event.type);
        const type = typeColor(event.type.padEnd(17));
        const source = (event.source || 'system').padEnd(14).substring(0, 14);
        const data = event.data
          ? JSON.stringify(event.data).substring(0, 30)
          : '';

        process.stdout.write(
          `${chalk.gray(time)} ${type} ${chalk.cyan(source)} ${chalk.gray(data)}`
        );
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list events'));
      this.logger.error('List events error:', error);
    }
  }

  async listCapabilities(options: any): Promise<void> {
    try {
      const capabilities = this.context.runtime.getRuntimeCapabilities() as RuntimeCapabilities;
      const stats = this.context.runtime.getStats() as RuntimeStats;
      // Command system stats not available in current implementation
      const commandStats = {
        totalCommands: 0,
        pendingCommands: 0,
        processingCommands: 0,
        completedCommands: 0,
        failedCommands: 0,
        averageExecutionTime: 0,
      } as CommandStats;

      // Extract typed properties with defaults
      const runtime = capabilities.runtime ?? {};
      const agents = capabilities.agents ?? {};
      const modules = capabilities.modules ?? {};
      const extensions = capabilities.extensions ?? {};

      const capabilityData = {
        runtime: {
          version: runtime.version ?? '1.0.0',
          isRunning: runtime.isRunning ?? false,
          tickInterval: runtime.tickInterval ?? 1000,
          uptime: process.uptime(),
        },
        agents: {
          total: agents.total ?? 0,
          autonomous: stats.autonomousAgents ?? 0,
          list: agents.activeList ?? [],
        },
        modules: {
          memory: modules.memory ?? { available: [] },
          emotion: modules.emotion ?? { available: [] },
          cognition: modules.cognition ?? { available: [] },
          portals: modules.portals ?? { available: [], factories: [] },
        },
        extensions: extensions ?? { loaded: [], available: [] },
        commands: {
          total: commandStats.totalCommands,
          pending: commandStats.pendingCommands,
          processing: commandStats.processingCommands,
          completed: commandStats.completedCommands,
          failed: commandStats.failedCommands,
          averageExecutionTime: commandStats.averageExecutionTime,
        },
        system: {
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal,
          },
          platform: process.platform,
          nodeVersion: process.version,
        },
      };

      if (options.json) {
        process.stdout.write(JSON.stringify(capabilityData, null, 2));
      } else {
        process.stdout.write(chalk.blue.bold('\n🛠️  System Capabilities'));
        process.stdout.write(chalk.gray('─'.repeat(60)));

        process.stdout.write(chalk.cyan('Runtime:'));
        process.stdout.write(`  Version: ${capabilityData.runtime.version}`);
        process.stdout.write(
          `  Status: ${capabilityData.runtime.isRunning ? '✅ Running' : '❌ Stopped'}`
        );
        process.stdout.write(
          `  Uptime: ${(capabilityData.runtime.uptime / 60).toFixed(1)} minutes`
        );

        process.stdout.write(chalk.cyan('\nAgents:'));
        process.stdout.write(`  Total: ${capabilityData.agents.total}`);
        process.stdout.write(`  Autonomous: ${capabilityData.agents.autonomous}`);

        process.stdout.write(chalk.cyan('\nModules:'));
        process.stdout.write(
          `  Memory: ${capabilityData.modules.memory.available?.join(', ') ?? 'none'}`
        );
        process.stdout.write(
          `  Emotion: ${capabilityData.modules.emotion.available?.join(', ') ?? 'none'}`
        );
        process.stdout.write(
          `  Cognition: ${capabilityData.modules.cognition.available?.join(', ') ?? 'none'}`
        );
        process.stdout.write(
          `  Portals: ${capabilityData.modules.portals.available?.join(', ') ?? 'none'}`
        );

        process.stdout.write(chalk.cyan('\nCommands:'));
        process.stdout.write(`  Total Processed: ${capabilityData.commands.total}`);
        process.stdout.write(
          `  Success Rate: ${
            capabilityData.commands.total > 0
              ? (
                  (capabilityData.commands.completed /
                    capabilityData.commands.total) *
                  100
                ).toFixed(1)
              : 0
          }%`
        );
        process.stdout.write(
          `  Average Execution: ${capabilityData.commands.averageExecutionTime.toFixed(2)}ms`
        );
      }
    } catch (error) {
      process.stdout.write(chalk.red('❌ Failed to list capabilities'));
      this.logger.error('List capabilities error:', error);
    }
  }

  private async displayAgentDetailed(agent: any): Promise<void> {
    const typeIcon = '🤖'; // Default to bot icon for API-fetched agents
    const statusColor = this.getStatusColor(agent.status);

    process.stdout.write(
      '\n' +
        typeIcon +
        ' ' +
        chalk.cyan.bold(agent.name) +
        ' ' +
        chalk.gray('(' + agent.id + ')')
    );
    process.stdout.write('  Status: ' + statusColor(agent.status));
    process.stdout.write('  Emotion: ' + (agent.emotion ?? 'unknown'));
    process.stdout.write('  Last Update: ' + (agent.lastUpdate ?? 'never'));
    process.stdout.write('  Extensions: ' + (agent.extensionCount ?? 0));

    if (agent.hasPortal) {
      process.stdout.write('  Portal: configured');
    }

    // Show ethics status if available
    if (agent.ethicsEnabled !== undefined) {
      const ethicsStatus = agent.ethicsEnabled
        ? chalk.green('✅ Enabled')
        : chalk.yellow('⚠️ Disabled');
      process.stdout.write('  Ethics: ' + ethicsStatus);
    }
  }

  private getAgentName(agentId: string): string {
    const agent = this.context.runtime.agents.get(agentId);
    return agent ? agent.name : agentId.substring(0, 12);
  }

  private isPortalConfigured(portalName: string): boolean {
    // Simple check for common portal configurations
    const portalEnvMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      groq: 'GROQ_API_KEY',
      xai: 'XAI_API_KEY',
      google: 'GOOGLE_API_KEY',
    };

    const envVar = portalEnvMap[portalName.toLowerCase()];
    return envVar ? !!process.env[envVar] : false;
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

  private getCommandStatusColor(status: string): (text: string) => string {
    switch (status.toLowerCase()) {
      case 'completed':
        return chalk.green;
      case 'failed':
        return chalk.red;
      case 'processing':
        return chalk.yellow;
      case 'pending':
        return chalk.blue;
      case 'cancelled':
        return chalk.gray;
      default:
        return chalk.gray;
    }
  }

  private getEventTypeColor(type: string): (text: string) => string {
    if (type.includes('error') || type.includes('failed')) return chalk.red;
    if (type.includes('warn')) return chalk.yellow;
    if (type.includes('success') || type.includes('completed'))
      return chalk.green;
    if (type.includes('started')) return chalk.blue;
    return chalk.gray;
  }
}
