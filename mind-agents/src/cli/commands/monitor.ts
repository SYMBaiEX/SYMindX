/**
 * Monitoring Commands
 *
 * Real-time monitoring and logging for agents:
 * - Live activity streams
 * - Performance metrics
 * - Event monitoring
 * - Log tailing
 */

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { WebSocket } from 'ws';

import { AgentEvent } from '../../types/agent';
import { CLIContext } from '../index';

export class MonitorCommand {
  private monitoring = false;
  private ws?: WebSocket;
  private eventSubscriptions = new Set<string>();

  constructor(private context: CLIContext) {}

  getCommand(): Command {
    const cmd = new Command('monitor')
      .alias('m')
      .description('Real-time monitoring and logging');

    // Monitor agent activity
    cmd
      .command('agent <agentId>')
      .description('Monitor specific agent activity')
      .option('-e, --events', 'Show events only')
      .option('-l, --logs', 'Show logs only')
      .option('-p, --performance', 'Show performance metrics')
      .action(async (agentId, options) => {
        await this.monitorAgent(agentId, options);
      });

    // Monitor all agents
    cmd
      .command('all')
      .description('Monitor all agent activity')
      .option('-f, --filter <type>', 'Filter by event type')
      .option('-v, --verbose', 'Verbose output')
      .action(async (options) => {
        await this.monitorAll(options);
      });

    // Monitor events
    cmd
      .command('events')
      .description('Monitor system events')
      .option('-t, --type <type>', 'Filter by event type')
      .option('-s, --source <source>', 'Filter by event source')
      .option('-l, --limit <number>', 'Number of events to show', '50')
      .action(async (options) => {
        await this.monitorEvents(options);
      });

    // Performance monitoring
    cmd
      .command('performance')
      .alias('perf')
      .description('Monitor system performance')
      .option('-i, --interval <ms>', 'Update interval in milliseconds', '5000')
      .option('-a, --agent <agentId>', 'Monitor specific agent')
      .action(async (options) => {
        await this.monitorPerformance(options);
      });

    // Commands monitoring
    cmd
      .command('commands')
      .description('Monitor command execution')
      .option('-a, --agent <agentId>', 'Filter by agent')
      .option('-s, --status <status>', 'Filter by status')
      .action(async (options) => {
        await this.monitorCommands(options);
      });

    // Tail logs
    cmd
      .command('logs')
      .description('Tail application logs')
      .option('-l, --lines <number>', 'Number of lines to show', '20')
      .option('-f, --follow', 'Follow log output')
      .action(async (options) => {
        await this.tailLogs(options);
      });

    return cmd;
  }

  async monitorAgent(agentId: string, options: { events?: boolean; logs?: boolean; performance?: boolean }): Promise<void> {
    const agent = this.context.runtime.agents.get(agentId);
    if (!agent) {
      process.stderr.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
      return;
    }

    process.stdout.write(chalk.blue.bold(`\n📊 Monitoring Agent: ${agent.name}`) + '\n');
    process.stdout.write(chalk.gray('Press Ctrl+C to stop monitoring') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    this.monitoring = true;

    // Setup event listeners
    if (!options.logs && !options.performance) {
      // Default: show events
      options.events = true;
    }

    if (options.events) {
      this.subscribeToAgentEvents(agentId);
    }

    if (options.performance) {
      this.monitorAgentPerformance(agentId);
    }

    if (options.logs) {
      // Monitor logs specific to this agent
      process.stdout.write(
        chalk.yellow('⚠️  Agent-specific log monitoring not yet implemented') + '\n'
      );
    }

    // Keep monitoring until interrupted
    await this.waitForInterrupt();
    this.stopMonitoring();
  }

  async monitorAll(options: { filter?: string; verbose?: boolean }): Promise<void> {
    process.stdout.write(chalk.blue.bold('\n📊 Monitoring All Agents') + '\n');
    process.stdout.write(chalk.gray('Press Ctrl+C to stop monitoring') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    this.monitoring = true;

    // Subscribe to global events
    this.context.runtime.subscribeToEvents({ type: options.filter }, (event) =>
      this.displayEvent(event, options.verbose)
    );

    // Show initial status
    this.displaySystemStatus();

    // Update status periodically
    const statusInterval = setInterval(() => {
      if (!this.monitoring) {
        clearInterval(statusInterval);
        return;
      }
      process.stdout.write(chalk.gray('\n' + '─'.repeat(60)) + '\n');
      this.displaySystemStatus();
    }, 10000); // Every 10 seconds

    await this.waitForInterrupt();
    clearInterval(statusInterval);
    this.stopMonitoring();
  }

  async monitorEvents(options: { type?: string; source?: string; limit?: string }): Promise<void> {
    process.stdout.write(chalk.blue.bold('\n📡 Event Monitor') + '\n');
    process.stdout.write(chalk.gray('Press Ctrl+C to stop monitoring') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    this.monitoring = true;

    // Show recent events first
    const recentEvents = await this.context.runtime.getEventHistory({
      type: options.type,
      source: options.source,
      limit: parseInt(options.limit),
    });

    process.stdout.write(chalk.cyan(`\n📜 Recent Events (${recentEvents.length}):`) + '\n');
    for (const event of recentEvents) {
      this.displayEvent(event, true);
    }

    process.stdout.write(chalk.cyan('\n🔴 Live Events:') + '\n');

    // Subscribe to new events
    this.context.runtime.subscribeToEvents(
      { type: options.type, source: options.source },
      (event) => this.displayEvent(event, true)
    );

    await this.waitForInterrupt();
    this.stopMonitoring();
  }

  async monitorPerformance(options: { interval?: string; agent?: string }): Promise<void> {
    process.stdout.write(chalk.blue.bold('\n⚡ Performance Monitor') + '\n');
    process.stdout.write(chalk.gray('Press Ctrl+C to stop monitoring') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    this.monitoring = true;
    const interval = parseInt(options.interval);

    const performanceInterval = setInterval(async () => {
      if (!this.monitoring) {
        clearInterval(performanceInterval);
        return;
      }

      process.stdout.write('\x1Bc'); // Clear screen
      process.stdout.write(chalk.blue.bold('⚡ Performance Monitor') + '\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      await this.displayPerformanceMetrics(options.agent);
    }, interval);

    await this.waitForInterrupt();
    clearInterval(performanceInterval);
    this.stopMonitoring();
  }

  async monitorCommands(options: { agent?: string; status?: string }): Promise<void> {
    process.stdout.write(chalk.blue.bold('\n⚡ Command Monitor') + '\n');
    process.stdout.write(chalk.gray('Press Ctrl+C to stop monitoring') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    this.monitoring = true;

    // Show recent commands
    const commands = this.context.commandSystem.getAllCommands();
    let filteredCommands = commands;

    if (options.agent) {
      filteredCommands = filteredCommands.filter(
        (cmd) => cmd.agentId === options.agent
      );
    }

    if (options.status) {
      filteredCommands = filteredCommands.filter(
        (cmd) => cmd.status === options.status
      );
    }

    process.stdout.write(
      chalk.cyan(`\n📜 Recent Commands (${filteredCommands.length}):`) + '\n'
    );
    for (const command of filteredCommands.slice(-10)) {
      this.displayCommand(command);
    }

    // Monitor new command updates
    this.context.commandSystem.on('command_queued', (command) => {
      if (this.shouldDisplayCommand(command, options)) {
        process.stdout.write(chalk.blue('📥 QUEUED:') + '\n');
        this.displayCommand(command);
      }
    });

    this.context.commandSystem.on('command_started', (command) => {
      if (this.shouldDisplayCommand(command, options)) {
        process.stdout.write(chalk.yellow('🔄 STARTED:') + '\n');
        this.displayCommand(command);
      }
    });

    this.context.commandSystem.on('command_completed', (command) => {
      if (this.shouldDisplayCommand(command, options)) {
        const color = command.result?.success ? chalk.green : chalk.red;
        process.stdout.write(color('✅ COMPLETED:') + '\n');
        this.displayCommand(command);
      }
    });

    await this.waitForInterrupt();
    this.stopMonitoring();
  }

  async tailLogs(options: { lines?: string; follow?: boolean }): Promise<void> {
    process.stdout.write(chalk.blue.bold('\n📄 Log Monitor') + '\n');
    process.stdout.write(chalk.gray('Press Ctrl+C to stop monitoring') + '\n');
    process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

    // This would integrate with the actual logging system
    process.stdout.write(chalk.yellow('⚠️  Log tailing not yet implemented') + '\n');
    process.stdout.write(chalk.gray('Would display real-time application logs here') + '\n');

    if (options.follow) {
      this.monitoring = true;
      await this.waitForInterrupt();
      this.stopMonitoring();
    }
  }

  async startInteractiveMonitoring(): Promise<void> {
    const { monitorType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'monitorType',
        message: 'What would you like to monitor?',
        choices: [
          { name: '🤖 Specific agent', value: 'agent' },
          { name: '🌐 All agents', value: 'all' },
          { name: '📡 System events', value: 'events' },
          { name: '⚡ Performance metrics', value: 'performance' },
          { name: '🎯 Command execution', value: 'commands' },
          { name: '📄 Application logs', value: 'logs' },
          { name: '⬅️  Back', value: 'back' },
        ],
      },
    ]);

    switch (monitorType) {
      case 'agent':
        await this.selectAndMonitorAgent();
        break;
      case 'all':
        await this.monitorAll({});
        break;
      case 'events':
        await this.monitorEvents({});
        break;
      case 'performance':
        await this.monitorPerformance({ interval: '5000' });
        break;
      case 'commands':
        await this.monitorCommands({});
        break;
      case 'logs':
        await this.tailLogs({ follow: true });
        break;
      case 'back':
        return;
    }
  }

  private async selectAndMonitorAgent(): Promise<void> {
    const agents = Array.from(this.context.runtime.agents.values());

    if (agents.length === 0) {
      process.stdout.write(chalk.yellow('⚠️  No agents available to monitor') + '\n');
      return;
    }

    const { agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select agent to monitor:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.id}) - ${agent.status}`,
          value: agent.id,
        })),
      },
    ]);

    const { monitorOptions } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'monitorOptions',
        message: 'What to monitor:',
        choices: [
          { name: 'Events', value: 'events', checked: true },
          { name: 'Performance', value: 'performance' },
          { name: 'Logs', value: 'logs' },
        ],
      },
    ]);

    const options: any = {};
    if (monitorOptions.includes('events')) options.events = true;
    if (monitorOptions.includes('performance')) options.performance = true;
    if (monitorOptions.includes('logs')) options.logs = true;

    await this.monitorAgent(agentId, options);
  }

  private subscribeToAgentEvents(agentId: string): void {
    this.context.runtime.subscribeToEvents({ source: agentId }, (event) => {
      if (event.source === agentId || event.targetAgentId === agentId) {
        this.displayEvent(event, false);
      }
    });
  }

  private monitorAgentPerformance(agentId: string): void {
    const performanceInterval = setInterval(async () => {
      if (!this.monitoring) {
        clearInterval(performanceInterval);
        return;
      }

      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) return;

      const autonomousStatus =
        this.context.runtime.getAutonomousStatus(agentId);

      process.stdout.write(chalk.cyan('\n🔍 Performance Snapshot:') + '\n');
      process.stdout.write(`  Status: ${agent.status}` + '\n');
      process.stdout.write(`  Emotion: ${agent.emotion?.current || 'unknown'}` + '\n');
      process.stdout.write(
        `  Extensions: ${agent.extensions.filter((e) => e.enabled).length}/${agent.extensions.length} active` + '\n'
      );

      if (autonomousStatus.autonomous) {
        process.stdout.write(
          `  Autonomy: ${((autonomousStatus.engine?.autonomyLevel || 0) * 100).toFixed(0)}%` + '\n'
        );
      }
    }, 5000); // Every 5 seconds
  }

  private displaySystemStatus(): void {
    const stats = this.context.runtime.getStats();

    process.stdout.write(chalk.cyan('\n📊 System Status:') + '\n');
    process.stdout.write(
      `  Agents: ${stats.agents} (${stats.autonomousAgents} autonomous)` + '\n'
    );
    process.stdout.write(`  Running: ${stats.isRunning ? '✅' : '❌'}` + '\n');
    process.stdout.write(`  Events: ${stats.eventBus.events}` + '\n');

    if (stats.autonomous) {
      process.stdout.write(
        `  Autonomous Engines: ${stats.autonomous.autonomousEngines}` + '\n'
      );
    }
  }

  private displayEvent(event: AgentEvent, verbose: boolean): void {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const typeColor = this.getEventTypeColor(event.type);

    if (verbose) {
      process.stdout.write(
        `[${chalk.gray(timestamp)}] ${typeColor(event.type)} ${chalk.cyan(event.source || 'system')}` + '\n'
      );
      if (event.data) {
        process.stdout.write(
          chalk.gray(`  Data: ${JSON.stringify(event.data, null, 2)}`) + '\n'
        );
      }
    } else {
      process.stdout.write(
        `[${chalk.gray(timestamp)}] ${typeColor(event.type)} ${chalk.gray(event.source || 'system')}` + '\n'
      );
    }
  }

  private displayCommand(command: { timestamp: Date; status: string; agentId: string; instruction: string; result?: { error?: string } }): void {
    const timestamp = command.timestamp.toLocaleTimeString();
    const statusColor = this.getCommandStatusColor(command.status);

    process.stdout.write(
      `[${chalk.gray(timestamp)}] ${statusColor(command.status)} ${chalk.cyan(command.agentId)} ${command.instruction}` + '\n'
    );
    if (command.result?.error) {
      process.stdout.write(chalk.red(`  Error: ${command.result.error}`) + '\n');
    }
  }

  private async displayPerformanceMetrics(agentId?: string): Promise<void> {
    const stats = this.context.runtime.getStats();
    const commandStats = this.context.commandSystem.getStats();

    process.stdout.write(chalk.cyan('🖥️  System Metrics:') + '\n');
    process.stdout.write(
      `  Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB` + '\n'
    );
    process.stdout.write(`  Uptime: ${(process.uptime() / 60).toFixed(1)} minutes` + '\n');

    process.stdout.write(chalk.cyan('\n🤖 Agent Metrics:') + '\n');
    process.stdout.write(`  Total Agents: ${stats.agents}` + '\n');
    process.stdout.write(`  Autonomous Agents: ${stats.autonomousAgents}` + '\n');
    process.stdout.write(
      `  Runtime Status: ${stats.isRunning ? '✅ Running' : '❌ Stopped'}` + '\n'
    );

    process.stdout.write(chalk.cyan('\n⚡ Command Metrics:') + '\n');
    process.stdout.write(`  Total Commands: ${commandStats.totalCommands}` + '\n');
    process.stdout.write(`  Pending: ${commandStats.pendingCommands}` + '\n');
    process.stdout.write(`  Processing: ${commandStats.processingCommands}` + '\n');
    process.stdout.write(`  Completed: ${commandStats.completedCommands}` + '\n');
    process.stdout.write(`  Failed: ${commandStats.failedCommands}` + '\n');
    process.stdout.write(
      `  Avg Execution Time: ${commandStats.averageExecutionTime.toFixed(2)}ms` + '\n'
    );

    if (agentId) {
      const agent = this.context.runtime.agents.get(agentId);
      if (agent) {
        process.stdout.write(chalk.cyan(`\n🎯 Agent ${agent.name} Metrics:`) + '\n');
        process.stdout.write(`  Status: ${agent.status}` + '\n');
        process.stdout.write(
          `  Last Update: ${agent.lastUpdate?.toLocaleString() || 'never'}` + '\n'
        );

        const autonomousStatus =
          this.context.runtime.getAutonomousStatus(agentId);
        if (autonomousStatus.autonomous) {
          process.stdout.write(
            `  Autonomy Level: ${((autonomousStatus.engine?.autonomyLevel || 0) * 100).toFixed(0)}%` + '\n'
          );
        }
      }
    }
  }

  private shouldDisplayCommand(command: { agentId: string; status: string }, options: { agent?: string; status?: string }): boolean {
    if (options.agent && command.agentId !== options.agent) {
      return false;
    }
    if (options.status && command.status !== options.status) {
      return false;
    }
    return true;
  }

  private getEventTypeColor(type: string): (text: string) => string {
    if (type.includes('error') || type.includes('failed')) return chalk.red;
    if (type.includes('warn')) return chalk.yellow;
    if (type.includes('success') || type.includes('completed'))
      return chalk.green;
    if (type.includes('started') || type.includes('begin')) return chalk.blue;
    return chalk.gray;
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
      case 'timeout':
        return chalk.magenta;
      default:
        return chalk.gray;
    }
  }

  private async waitForInterrupt(): Promise<void> {
    return new Promise((resolve) => {
      const handleInterrupt = (): void => {
        process.stdout.write(chalk.yellow('\n⏹️  Monitoring stopped') + '\n');
        process.removeListener('SIGINT', handleInterrupt);
        resolve();
      };

      process.on('SIGINT', handleInterrupt);
    });
  }

  private stopMonitoring(): void {
    this.monitoring = false;
    if (this.ws) {
      this.ws.close();
    }
    this.eventSubscriptions.clear();
  }
}
