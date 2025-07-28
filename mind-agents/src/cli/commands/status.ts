/**
 * Status Commands
 *
 * System and agent status information:
 * - Runtime status
 * - Agent health checks
 * - System metrics
 * - Capability overview
 */

import chalk from 'chalk';
import { Command } from 'commander';

import { AgentStatus } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';
import { CLIContext } from '../index';

export class StatusCommand {
  private logger = runtimeLogger;

  constructor(private context: CLIContext) {}

  getCommand(): Command {
    const cmd = new Command('status')
      .alias('s')
      .description('Show system and agent status');

    // System status
    cmd
      .command('system')
      .description('Show system status')
      .option('-v, --verbose', 'Show detailed information')
      .action(async (options) => {
        await this.showSystemStatus(options);
      });

    // Runtime status
    cmd
      .command('runtime')
      .description('Show runtime status')
      .action(async () => {
        await this.showRuntimeStatus();
      });

    // Agent status
    cmd
      .command('agent <agentId>')
      .description('Show specific agent status')
      .action(async (agentId) => {
        await this.showAgentStatus(agentId);
      });

    // Health check
    cmd
      .command('health')
      .description('Perform system health check')
      .option('-f, --fix', 'Attempt to fix issues')
      .action(async (options) => {
        await this.performHealthCheck(options);
      });

    // Capabilities overview
    cmd
      .command('capabilities')
      .alias('caps')
      .description('Show system capabilities')
      .action(async () => {
        await this.showCapabilities();
      });

    // Default action (show overview)
    cmd.action(async () => {
      await this.showOverview();
    });

    return cmd;
  }

  async showOverview(): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n🤖 SYMindX System Overview') + '\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      // Runtime status
      const stats = this.context.runtime.getStats() as {
        isRunning: boolean;
        agents: number;
        autonomousAgents: number;
        extensions?: { loaded?: number; failed?: number };
        autonomous?: {
          totalAutonomousAgents?: number;
          autonomousEngines?: number;
          decisionEngines?: number;
        };
        eventBus?: { events?: number };
      };
      const isRunning = stats.isRunning;

      process.stdout.write(
        `${chalk.cyan('Runtime:')} ${isRunning ? chalk.green('✅ Running') : chalk.red('❌ Stopped')}` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Agents:')} ${stats.agents} total (${stats.autonomousAgents} autonomous)` + '\n'
      );

      // Agent status summary
      const agents = Array.from(this.context.runtime.agents.values());
      const statusCounts = this.getStatusCounts(agents);

      if (agents.length > 0) {
        process.stdout.write(`${chalk.cyan('Agent Status:')}` + '\n');
        for (const [status, count] of Object.entries(statusCounts)) {
          const color = this.getStatusColor(status);
          process.stdout.write(`  ${color(status)}: ${count}` + '\n');
        }
      }

      // Command system status - not available in current implementation
      process.stdout.write(
        `${chalk.cyan('Commands:')} Command tracking not available` + '\n'
      );

      // System resources
      const memoryUsage = process.memoryUsage();
      process.stdout.write(
        `${chalk.cyan('Memory:')} ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB used` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Uptime:')} ${(process.uptime() / 60).toFixed(1)} minutes` + '\n'
      );

      // Quick health indicators
      const healthIssues = await this.getQuickHealthCheck();
      if (healthIssues.length > 0) {
        process.stdout.write(chalk.yellow('\n⚠️  Health Issues:') + '\n');
        for (const issue of healthIssues) {
          process.stdout.write(chalk.yellow(`  • ${issue}`) + '\n');
        }
        process.stdout.write(
          chalk.gray('Run "symindx status health" for detailed health check') + '\n'
        );
      } else {
        process.stdout.write(chalk.green('\n✅ All systems healthy') + '\n');
      }
    } catch (error) {
      process.stderr.write(chalk.red('❌ Failed to get system overview') + '\n');
      this.logger.error('Overview error:', error);
    }
  }

  async showSystemStatus(options: { verbose?: boolean }): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n🖥️  System Status') + '\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      // Process information
      process.stdout.write(chalk.cyan('Process Information:') + '\n');
      process.stdout.write(`  PID: ${process.pid}` + '\n');
      process.stdout.write(`  Node Version: ${process.version}` + '\n');
      process.stdout.write(`  Platform: ${process.platform} ${process.arch}` + '\n');
      process.stdout.write(`  Uptime: ${(process.uptime() / 60).toFixed(1)} minutes` + '\n');

      // Memory usage
      const memory = process.memoryUsage();
      process.stdout.write(chalk.cyan('\nMemory Usage:') + '\n');
      process.stdout.write(
        `  Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB` + '\n'
      );
      process.stdout.write(
        `  Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB` + '\n'
      );
      process.stdout.write(`  RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB` + '\n');
      process.stdout.write(
        `  External: ${(memory.external / 1024 / 1024).toFixed(2)} MB` + '\n'
      );

      // CPU usage (if available)
      if (process.cpuUsage) {
        const cpuUsage = process.cpuUsage();
        process.stdout.write(chalk.cyan('\nCPU Usage:') + '\n');
        process.stdout.write(`  User: ${(cpuUsage.user / 1000).toFixed(2)}ms` + '\n');
        process.stdout.write(`  System: ${(cpuUsage.system / 1000).toFixed(2)}ms` + '\n');
      }

      // Environment
      if (options.verbose) {
        process.stdout.write(chalk.cyan('\nEnvironment:') + '\n');
        const envVars = [
          'NODE_ENV',
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'GROQ_API_KEY',
          'SLACK_BOT_TOKEN',
          'TELEGRAM_BOT_TOKEN',
        ];

        for (const envVar of envVars) {
          const value = process.env[envVar];
          const status = value ? '✅ Set' : '❌ Not set';
          process.stdout.write(`  ${envVar}: ${status}` + '\n');
        }
      }
    } catch (error) {
      process.stderr.write(chalk.red('❌ Failed to get system status') + '\n');
      this.logger.error('System status error:', error);
    }
  }

  async showRuntimeStatus(): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n⚙️  Runtime Status') + '\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      const stats = this.context.runtime.getStats() as {
        isRunning: boolean;
        agents: number;
        autonomousAgents: number;
        extensions?: { loaded?: number; failed?: number };
        autonomous?: {
          totalAutonomousAgents?: number;
          autonomousEngines?: number;
          decisionEngines?: number;
        };
        eventBus?: { events?: number };
      };

      // Basic runtime info
      process.stdout.write(
        `${chalk.cyan('Status:')} ${stats.isRunning ? chalk.green('✅ Running') : chalk.red('❌ Stopped')}` + '\n'
      );
      process.stdout.write(`${chalk.cyan('Total Agents:')} ${stats.agents}` + '\n');
      process.stdout.write(
        `${chalk.cyan('Autonomous Agents:')} ${stats.autonomousAgents}` + '\n'
      );

      // Event bus status
      process.stdout.write(chalk.cyan('\nEvent Bus:') + '\n');
      process.stdout.write(`  Events: ${stats.eventBus?.events || 0}` + '\n');

      // Autonomous systems
      if (stats.autonomous && (stats.autonomous.totalAutonomousAgents || 0) > 0) {
        process.stdout.write(chalk.cyan('\nAutonomous Systems:') + '\n');
        process.stdout.write(`  Engines: ${stats.autonomous.autonomousEngines || 0}` + '\n');
        process.stdout.write(`  Decision Engines: ${stats.autonomous.decisionEngines || 0}` + '\n');
        process.stdout.write(`  Behaviors: Integrated into autonomous engines` + '\n');
        process.stdout.write(`  Lifecycle: Integrated into autonomous engines` + '\n');
      }

      // Extension information
      process.stdout.write(chalk.cyan('\nExtensions:') + '\n');
      process.stdout.write(`  Loaded: ${stats.extensions?.loaded || 0}` + '\n');
      process.stdout.write(`  Failed: ${stats.extensions?.failed || 0}` + '\n');

      // Runtime capabilities
      const capabilities = this.context.runtime.getRuntimeCapabilities() as {
        modules: {
          memory: { available: string[] };
          emotion: { available: string[] };
          cognition: { available: string[] };
          portals: { available: string[]; factories: string[] };
        };
      };
      process.stdout.write(chalk.cyan('\nAvailable Modules:') + '\n');
      process.stdout.write(
        `  Memory Providers: ${capabilities.modules.memory.available.join(', ')}` + '\n'
      );
      process.stdout.write(
        `  Emotion Modules: ${capabilities.modules.emotion.available.join(', ')}` + '\n'
      );
      process.stdout.write(
        `  Cognition Modules: ${capabilities.modules.cognition.available.join(', ')}` + '\n'
      );
      process.stdout.write(
        `  Portals: ${capabilities.modules.portals.available.join(', ')}` + '\n'
      );
    } catch (error) {
      process.stderr.write(chalk.red('❌ Failed to get runtime status') + '\n');
      this.logger.error('Runtime status error:', error);
    }
  }

  async showAgentStatus(agentId: string): Promise<void> {
    try {
      const agent = this.context.runtime.agents.get(agentId);
      if (!agent) {
        process.stderr.write(chalk.red(`❌ Agent '${agentId}' not found`) + '\n');
        return;
      }

      process.stdout.write(chalk.blue.bold(`\n🤖 Agent Status: ${agent.name}`) + '\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      // Basic info
      process.stdout.write(`${chalk.cyan('ID:')} ${agent.id}` + '\n');
      process.stdout.write(`${chalk.cyan('Name:')} ${agent.name}` + '\n');
      process.stdout.write(
        `${chalk.cyan('Status:')} ${this.getStatusColor(agent.status)(agent.status)}` + '\n'
      );
      process.stdout.write(
        `${chalk.cyan('Last Update:')} ${agent.lastUpdate?.toLocaleString() || 'never'}` + '\n'
      );

      // Emotion state
      if (agent.emotion) {
        process.stdout.write(chalk.cyan('\nEmotion State:') + '\n');
        process.stdout.write(`  Current: ${agent.emotion.current}` + '\n');
        process.stdout.write(`  Intensity: ${agent.emotion.intensity}` + '\n');
        const emotionState = agent.emotion.getCurrentState();
        if (emotionState.triggers && emotionState.triggers.length > 0) {
          process.stdout.write(`  Triggers: ${emotionState.triggers.join(', ')}` + '\n');
        }
      }

      // Extensions
      process.stdout.write(chalk.cyan('\nExtensions:') + '\n');
      for (const ext of agent.extensions) {
        const statusIcon = ext.enabled ? '✅' : '❌';
        process.stdout.write(`  ${statusIcon} ${ext.name} (${ext.id})` + '\n');
      }

      // Portal
      if (agent.portal) {
        process.stdout.write(chalk.cyan('\nPortal:') + '\n');
        process.stdout.write(`  Type: ${agent.portal.name || 'configured'}` + '\n');
        process.stdout.write(`  Enabled: ${agent.portal.enabled ? '✅' : '❌'}` + '\n');
      }

      // Autonomous status
      const autonomousStatus = this.context.runtime.getAutonomousStatus(agentId);
      const isAutonomous = autonomousStatus['autonomous'] || false;
      if (isAutonomous) {
        process.stdout.write(chalk.cyan('\nAutonomous Capabilities:') + '\n');
        const engine = autonomousStatus['engine'] as { autonomyLevel?: number } | undefined;
        const autonomyLevel = engine?.autonomyLevel || 0;
        process.stdout.write(
          `  Autonomy Level: ${(autonomyLevel * 100).toFixed(0)}%` + '\n'
        );
        process.stdout.write(
          `  Enabled: ${isAutonomous ? '✅' : '❌'}` + '\n'
        );
        process.stdout.write(`  Lifecycle: Integrated into autonomous engine` + '\n');
      }

      // Command queue - not available in current implementation
      process.stdout.write(
        chalk.cyan(`\nCommand Queue: Not available in current implementation`) + '\n'
      );
    } catch (error) {
      process.stderr.write(chalk.red('❌ Failed to get agent status') + '\n');
      this.logger.error('Agent status error:', error);
    }
  }

  async performHealthCheck(options: { fix?: boolean }): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n🏥 System Health Check') + '\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      const issues: string[] = [];
      const warnings: string[] = [];

      // Check runtime
      process.stdout.write(chalk.cyan('🔍 Checking runtime...') + '\n');
      const stats = this.context.runtime.getStats() as {
        isRunning: boolean;
        agents: number;
        autonomousAgents: number;
        extensions?: { loaded?: number; failed?: number };
        autonomous?: {
          totalAutonomousAgents?: number;
          autonomousEngines?: number;
          decisionEngines?: number;
        };
        eventBus?: { events?: number };
      };
      if (!stats.isRunning) {
        issues.push('Runtime is not running');
      } else {
        process.stdout.write(chalk.green('  ✅ Runtime is running') + '\n');
      }

      // Check agents
      process.stdout.write(chalk.cyan('🔍 Checking agents...') + '\n');
      const agents = Array.from(this.context.runtime.agents.values());
      if (agents.length === 0) {
        warnings.push('No agents loaded');
      } else {
        process.stdout.write(chalk.green(`  ✅ ${agents.length} agents loaded`) + '\n');

        const errorAgents = agents.filter(
          (agent) => agent.status === AgentStatus.ERROR
        );
        if (errorAgents.length > 0) {
          issues.push(`${errorAgents.length} agents in error state`);
        }
      }

      // Check memory usage
      process.stdout.write(chalk.cyan('🔍 Checking memory usage...') + '\n');
      const memory = process.memoryUsage();
      const heapUsedMB = memory.heapUsed / 1024 / 1024;
      if (heapUsedMB > 1000) {
        // > 1GB
        warnings.push(`High memory usage: ${heapUsedMB.toFixed(2)} MB`);
      } else {
        process.stdout.write(chalk.green('  ✅ Memory usage is normal') + '\n');
      }

      // Check API keys
      process.stdout.write(chalk.cyan('🔍 Checking API keys...') + '\n');
      const apiKeys = [
        { name: 'OpenAI', env: 'OPENAI_API_KEY' },
        { name: 'Anthropic', env: 'ANTHROPIC_API_KEY' },
        { name: 'Groq', env: 'GROQ_API_KEY' },
      ];

      let hasApiKey = false;
      for (const apiKey of apiKeys) {
        if (process.env[apiKey.env]) {
          process.stdout.write(chalk.green(`  ✅ ${apiKey.name} API key configured`) + '\n');
          hasApiKey = true;
        }
      }

      if (!hasApiKey) {
        warnings.push('No AI portal API keys configured');
      }

      // Check extensions
      process.stdout.write(chalk.cyan('🔍 Checking extensions...') + '\n');
      const totalExtensions = agents.reduce(
        (sum, agent) => sum + agent.extensions.length,
        0
      );
      const enabledExtensions = agents.reduce(
        (sum, agent) =>
          sum + agent.extensions.filter((ext) => ext.enabled).length,
        0
      );

      if (totalExtensions > 0) {
        process.stdout.write(
          chalk.green(
            `  ✅ ${enabledExtensions}/${totalExtensions} extensions enabled`
          ) + '\n'
        );
      } else {
        warnings.push('No extensions loaded');
      }

      // Check command system - not available in current implementation
      process.stdout.write(chalk.cyan('🔍 Checking command system...') + '\n');
      process.stdout.write(chalk.gray('  ⚠️  Command system not available in current implementation') + '\n');

      // Summary
      process.stdout.write(chalk.cyan('\n📋 Health Check Summary:') + '\n');

      if (issues.length === 0 && warnings.length === 0) {
        process.stdout.write(chalk.green('🎉 All systems healthy!') + '\n');
      } else {
        if (issues.length > 0) {
          process.stdout.write(chalk.red('\n❌ Issues found:') + '\n');
          for (const issue of issues) {
            process.stdout.write(chalk.red(`  • ${issue}`) + '\n');
          }
        }

        if (warnings.length > 0) {
          process.stdout.write(chalk.yellow('\n⚠️  Warnings:') + '\n');
          for (const warning of warnings) {
            process.stdout.write(chalk.yellow(`  • ${warning}`) + '\n');
          }
        }

        if (options.fix) {
          process.stdout.write(chalk.blue('\n🔧 Attempting to fix issues...') + '\n');
          await this.attemptFixes(issues, warnings);
        } else {
          process.stdout.write(chalk.gray('\nUse --fix to attempt automatic fixes') + '\n');
        }
      }
    } catch (error) {
      process.stderr.write(chalk.red('❌ Health check failed') + '\n');
      this.logger.error('Health check error:', error);
    }
  }

  async showCapabilities(): Promise<void> {
    try {
      process.stdout.write(chalk.blue.bold('\n🛠️  System Capabilities') + '\n');
      process.stdout.write(chalk.gray('─'.repeat(60)) + '\n');

      const capabilities = this.context.runtime.getRuntimeCapabilities() as {
        runtime: { version: string; isRunning: boolean; tickInterval: number };
        agents: { active: number; lazy: number; total: number; activeList: string[] };
        modules: {
          memory: { available: string[] };
          emotion: { available: string[] };
          cognition: { available: string[] };
          portals: { available: string[]; factories: string[] };
        };
        extensions: { loaded: string[] };
      };

      // Runtime info
      process.stdout.write(chalk.cyan('Runtime:') + '\n');
      process.stdout.write(`  Version: ${capabilities.runtime.version}` + '\n');
      process.stdout.write(`  Running: ${capabilities.runtime.isRunning ? '✅' : '❌'}` + '\n');
      process.stdout.write(`  Tick Interval: ${capabilities.runtime.tickInterval}ms` + '\n');

      // Agents
      process.stdout.write(chalk.cyan('\nAgents:') + '\n');
      process.stdout.write(`  Active: ${capabilities.agents.active}` + '\n');
      process.stdout.write(`  Lazy: ${capabilities.agents.lazy}` + '\n');
      process.stdout.write(`  Total: ${capabilities.agents.total}` + '\n');
      if (capabilities.agents.activeList.length > 0) {
        process.stdout.write(
          `  Active IDs: ${capabilities.agents.activeList.join(', ')}` + '\n'
        );
      }

      // Modules
      process.stdout.write(chalk.cyan('\nModules:') + '\n');
      process.stdout.write(
        `  Memory Providers: ${capabilities.modules.memory.available.join(', ')}` + '\n'
      );
      process.stdout.write(
        `  Emotion Modules: ${capabilities.modules.emotion.available.join(', ')}` + '\n'
      );
      process.stdout.write(
        `  Cognition Modules: ${capabilities.modules.cognition.available.join(', ')}` + '\n'
      );

      process.stdout.write(chalk.cyan('\nPortals:') + '\n');
      process.stdout.write(
        `  Available: ${capabilities.modules.portals.available.join(', ')}` + '\n'
      );
      process.stdout.write(
        `  Factories: ${capabilities.modules.portals.factories.join(', ')}` + '\n'
      );

      // Extensions
      process.stdout.write(chalk.cyan('\nExtensions:') + '\n');
      process.stdout.write(
        `  Loaded: ${capabilities.extensions.loaded.join(', ') || 'none'}` + '\n'
      );

      // Command system capabilities - not available in current implementation
      process.stdout.write(chalk.cyan('\nCommand System:') + '\n');
      process.stdout.write(`  Status: Not available in current implementation` + '\n');
    } catch (error) {
      process.stderr.write(chalk.red('❌ Failed to get capabilities') + '\n');
      this.logger.error('Capabilities error:', error);
    }
  }

  async showDetailedStatus(): Promise<void> {
    await this.showOverview();
    process.stdout.write('\n');
    await this.showSystemStatus({ verbose: false });
    process.stdout.write('\n');
    await this.showRuntimeStatus();
  }

  private getStatusCounts(agents: { status?: string }[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const agent of agents) {
      const status = agent.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
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

  private async getQuickHealthCheck(): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check if runtime is running
      const stats = this.context.runtime.getStats() as {
        isRunning: boolean;
        agents: number;
        autonomousAgents: number;
        extensions?: { loaded?: number; failed?: number };
        autonomous?: {
          totalAutonomousAgents?: number;
          autonomousEngines?: number;
          decisionEngines?: number;
        };
        eventBus?: { events?: number };
      };
      if (!stats.isRunning) {
        issues.push('Runtime is stopped');
      }

      // Check for error agents
      const agents = Array.from(this.context.runtime.agents.values());
      const errorAgents = agents.filter((agent) => agent.status === 'error');
      if (errorAgents.length > 0) {
        issues.push(`${errorAgents.length} agents in error state`);
      }

      // Check memory usage
      const memory = process.memoryUsage();
      if (memory.heapUsed / 1024 / 1024 > 1000) {
        issues.push('High memory usage');
      }

      // Command system not available in current implementation
      // No command failure rate check available
    } catch (error) {
      this.logger.error('Health check failed', error instanceof Error ? error : new Error('Unknown error'));
      issues.push('Health check failed');
    }

    return issues;
  }

  private async attemptFixes(
    issues: string[],
    warnings: string[]
  ): Promise<void> {
    // This would implement automatic fixes for common issues
    process.stdout.write(chalk.yellow('⚠️  Automatic fixes not yet implemented') + '\n');
    process.stdout.write(chalk.gray('Would attempt to fix:') + '\n');

    for (const issue of issues) {
      process.stdout.write(chalk.gray(`  • ${issue}`) + '\n');
    }

    for (const warning of warnings) {
      process.stdout.write(chalk.gray(`  • ${warning}`) + '\n');
    }
  }
}
