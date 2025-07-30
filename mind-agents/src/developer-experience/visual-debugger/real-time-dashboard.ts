/**
 * Real-time Dashboard
 * Comprehensive real-time monitoring dashboard for SYMindX agents
 */

import { EventEmitter } from 'events';
import { DashboardConfig, DashboardWidget } from '../types/index.js';

export class RealTimeDashboard extends EventEmitter {
  private initialized = false;
  private dashboardConfig: DashboardConfig;
  private widgets: Map<string, DashboardWidget> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.dashboardConfig = {
      refreshRate: 1000,
      layout: 'grid',
      showPerformance: true,
      showEmotions: true,
      showMemory: true,
      showConversations: true,
      showAlerts: true,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('📊 Initializing Real-time Dashboard...');

    this.setupWidgets();
    this.initialized = true;
  }

  async showDashboard(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    while (true) {
      console.clear();
      console.log(chalk.default.cyan(`📊 Real-time Dashboard - ${agentId}\n`));

      // Show dashboard overview
      await this.displayDashboardOverview(agentId);

      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Dashboard Options:',
          choices: [
            { name: '📺 Start Live Dashboard', value: 'live' },
            { name: '⚙️  Configure Dashboard', value: 'configure' },
            { name: '📊 Custom Widget View', value: 'widgets' },
            { name: '🚨 Alert Monitor', value: 'alerts' },
            { name: '📈 Performance Monitor', value: 'performance' },
            { name: '🎭 Emotion Monitor', value: 'emotions' },
            { name: '🧠 Memory Monitor', value: 'memory' },
            { name: '💬 Conversation Monitor', value: 'conversations' },
            { name: '🔍 System Status', value: 'status' },
            { name: '📊 Multi-Agent View', value: 'multi' },
            { name: '💾 Export Dashboard Data', value: 'export' },
            { name: '⬅️  Back', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'live':
          await this.startLiveDashboard(agentId);
          break;
        case 'configure':
          await this.configureDashboard(agentId);
          break;
        case 'widgets':
          await this.showCustomWidgets(agentId);
          break;
        case 'alerts':
          await this.showAlertMonitor(agentId);
          break;
        case 'performance':
          await this.showPerformanceMonitor(agentId);
          break;
        case 'emotions':
          await this.showEmotionMonitor(agentId);
          break;
        case 'memory':
          await this.showMemoryMonitor(agentId);
          break;
        case 'conversations':
          await this.showConversationMonitor(agentId);
          break;
        case 'status':
          await this.showSystemStatus(agentId);
          break;
        case 'multi':
          await this.showMultiAgentView();
          break;
        case 'export':
          await this.exportDashboardData(agentId);
          break;
        case 'back':
          return;
      }

      // Wait for user input
      await inquirer.default.prompt([
        {
          type: 'input',
          name: 'continue',
          message: chalk.default.gray('Press Enter to continue...'),
        },
      ]);
    }
  }

  private async displayDashboardOverview(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const overview = await this.getDashboardOverview(agentId);

    console.log(chalk.default.green('📊 Dashboard Overview:'));
    console.log(
      `   Agent Status: ${this.getStatusIcon(overview.agentStatus)} ${overview.agentStatus}`
    );
    console.log(`   Active Widgets: ${overview.activeWidgets}`);
    console.log(`   Refresh Rate: ${overview.refreshRate}ms`);
    console.log(`   Uptime: ${this.formatUptime(overview.uptime)}`);
    console.log(`   Last Updated: ${overview.lastUpdate.toLocaleTimeString()}`);
    console.log();
  }

  private async startLiveDashboard(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`📺 Live Dashboard - ${agentId}`));
    console.log(chalk.default.gray('Press Ctrl+C to exit\n'));

    // Start live updates
    this.updateInterval = setInterval(async () => {
      await this.renderLiveDashboard(agentId);
    }, this.dashboardConfig.refreshRate);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      console.log(chalk.default.yellow('\n📺 Live dashboard stopped'));
      process.exit(0);
    });

    // Initial render
    await this.renderLiveDashboard(agentId);

    // Keep running
    await new Promise(() => {});
  }

  private async renderLiveDashboard(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    // Clear screen and reset cursor
    process.stdout.write('\x1B[2J\x1B[0f');

    // Header
    console.log(chalk.default.cyan(`📺 Live Dashboard - ${agentId}`));
    console.log(
      chalk.default.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`)
    );

    // Render widgets based on configuration
    if (this.dashboardConfig.showPerformance) {
      await this.renderPerformanceWidget(agentId);
    }

    if (this.dashboardConfig.showEmotions) {
      await this.renderEmotionWidget(agentId);
    }

    if (this.dashboardConfig.showMemory) {
      await this.renderMemoryWidget(agentId);
    }

    if (this.dashboardConfig.showConversations) {
      await this.renderConversationWidget(agentId);
    }

    if (this.dashboardConfig.showAlerts) {
      await this.renderAlertsWidget(agentId);
    }

    // System resources
    await this.renderSystemResourcesWidget();
  }

  private async renderPerformanceWidget(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const performance = await this.getPerformanceData(agentId);

    console.log(chalk.default.blue('⚡ Performance Monitor'));
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log(
      `│ Response Time: ${performance.responseTime.toString().padEnd(6)}ms ${this.getPerformanceBar(performance.responseTime, 500)} │`
    );
    console.log(
      `│ CPU Usage:     ${(performance.cpuUsage * 100).toFixed(1).padEnd(6)}% ${this.getCPUBar(performance.cpuUsage)} │`
    );
    console.log(
      `│ Memory:        ${performance.memoryUsage.toFixed(1).padEnd(6)}MB ${this.getMemoryBar(performance.memoryUsage)} │`
    );
    console.log(
      `│ Requests/sec:  ${performance.requestsPerSecond.toString().padEnd(9)} ${this.getRequestsBar(performance.requestsPerSecond)} │`
    );
    console.log(
      `│ Error Rate:    ${(performance.errorRate * 100).toFixed(2).padEnd(6)}% ${this.getErrorBar(performance.errorRate)} │`
    );
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log();
  }

  private async renderEmotionWidget(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const emotions = await this.getEmotionData(agentId);

    console.log(chalk.default.magenta('🎭 Emotion Monitor'));
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log(
      `│ Current: ${this.getEmotionEmoji(emotions.current)} ${emotions.current.padEnd(12)} Intensity: ${this.createIntensityBar(emotions.intensity)} │`
    );

    if (emotions.secondary && emotions.secondary.length > 0) {
      console.log(
        `│ Secondary: ${emotions.secondary
          .map((e) => `${this.getEmotionEmoji(e.emotion)} ${e.emotion}`)
          .join(', ')
          .padEnd(35)} │`
      );
    } else {
      console.log(`│ Secondary: None${' '.repeat(35)} │`);
    }

    console.log(
      `│ Duration: ${this.formatDuration(emotions.duration).padEnd(12)} Stability: ${this.getStabilityIndicator(emotions.stability).padEnd(15)} │`
    );
    console.log(
      `│ Changes: ${emotions.changesInLastHour.toString().padEnd(3)} in last hour  Trend: ${emotions.trend.padEnd(15)} │`
    );
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log();
  }

  private async renderMemoryWidget(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const memory = await this.getMemoryData(agentId);

    console.log(chalk.default.green('🧠 Memory Monitor'));
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log(
      `│ Total Records: ${memory.totalRecords.toString().padEnd(8)} Usage: ${memory.memoryUsage.toFixed(1)}MB     │`
    );
    console.log(
      `│ Recent Adds:   ${memory.recentAdds.toString().padEnd(8)} Growth: ${memory.growthRate.toFixed(1)}%/hr   │`
    );
    console.log(
      `│ Cache Hit:     ${(memory.cacheHitRate * 100).toFixed(1).padEnd(6)}% ${this.getCacheBar(memory.cacheHitRate)}  │`
    );
    console.log(
      `│ Health Score:  ${memory.healthScore.toString().padEnd(8)} ${this.createHealthBar(memory.healthScore)}  │`
    );
    console.log(
      `│ Provider:      ${memory.provider.padEnd(8)} Status: ${memory.status.padEnd(8)} │`
    );
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log();
  }

  private async renderConversationWidget(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const conversations = await this.getConversationData(agentId);

    console.log(chalk.default.yellow('💬 Conversation Monitor'));
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log(
      `│ Active Sessions: ${conversations.activeSessions.toString().padEnd(4)} Messages Today: ${conversations.messagesToday.toString().padEnd(8)} │`
    );
    console.log(
      `│ Avg Response:    ${conversations.avgResponseTime.toString().padEnd(6)}ms Queue: ${conversations.queueLength.toString().padEnd(8)}    │`
    );
    console.log(
      `│ Last Message:    ${this.formatTimeAgo(conversations.lastMessage).padEnd(12)}             │`
    );

    if (conversations.recentMessages.length > 0) {
      const recent = conversations.recentMessages[0];
      const preview =
        recent.content.length > 35
          ? recent.content.substring(0, 32) + '...'
          : recent.content;
      console.log(`│ Latest: "${preview.padEnd(38)}" │`);
    } else {
      console.log(`│ Latest: No recent messages${' '.repeat(25)} │`);
    }

    console.log('└─────────────────────────────────────────────────────────┘');
    console.log();
  }

  private async renderAlertsWidget(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const alerts = await this.getAlertsData(agentId);

    console.log(chalk.default.red('🚨 Alert Monitor'));
    console.log('┌─────────────────────────────────────────────────────────┐');

    if (alerts.length === 0) {
      console.log('│ No active alerts                                       │');
      console.log('│ System operating normally                              │');
    } else {
      alerts.slice(0, 3).forEach((alert) => {
        const severityIcon =
          alert.severity === 'critical'
            ? '🔴'
            : alert.severity === 'warning'
              ? '🟡'
              : '🟢';
        const message =
          alert.message.length > 45
            ? alert.message.substring(0, 42) + '...'
            : alert.message;
        console.log(`│ ${severityIcon} ${message.padEnd(52)} │`);
      });

      if (alerts.length > 3) {
        console.log(
          `│ ... and ${alerts.length - 3} more alerts${' '.repeat(25)} │`
        );
      }
    }

    console.log('└─────────────────────────────────────────────────────────┘');
    console.log();
  }

  private async renderSystemResourcesWidget(): Promise<void> {
    const chalk = await import('chalk');
    const resources = await this.getSystemResources();

    console.log(chalk.default.cyan('🖥️  System Resources'));
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log(
      `│ Node.js Memory: ${resources.nodeMemory.toFixed(1).padEnd(6)}MB ${this.getSystemBar(resources.nodeMemory, 100)} │`
    );
    console.log(
      `│ System Load:    ${resources.systemLoad.toFixed(2).padEnd(8)} ${this.getSystemBar(resources.systemLoad, 1)} │`
    );
    console.log(
      `│ Connections:    ${resources.activeConnections.toString().padEnd(8)} Open Files: ${resources.openFiles.toString().padEnd(8)} │`
    );
    console.log(
      `│ Uptime:         ${this.formatUptime(resources.uptime).padEnd(15)} │`
    );
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log();
  }

  private async configureDashboard(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`⚙️  Configure Dashboard - ${agentId}\n`));

    const newConfig = await inquirer.default.prompt([
      {
        type: 'number',
        name: 'refreshRate',
        message: 'Refresh rate (milliseconds):',
        default: this.dashboardConfig.refreshRate,
        validate: (input) => input >= 500 || 'Minimum refresh rate is 500ms',
      },
      {
        type: 'list',
        name: 'layout',
        message: 'Dashboard layout:',
        choices: [
          { name: 'Grid Layout', value: 'grid' },
          { name: 'Vertical Stack', value: 'vertical' },
          { name: 'Horizontal Layout', value: 'horizontal' },
          { name: 'Compact View', value: 'compact' },
        ],
        default: this.dashboardConfig.layout,
      },
      {
        type: 'checkbox',
        name: 'widgets',
        message: 'Select widgets to display:',
        choices: [
          {
            name: 'Performance Monitor',
            value: 'performance',
            checked: this.dashboardConfig.showPerformance,
          },
          {
            name: 'Emotion Monitor',
            value: 'emotions',
            checked: this.dashboardConfig.showEmotions,
          },
          {
            name: 'Memory Monitor',
            value: 'memory',
            checked: this.dashboardConfig.showMemory,
          },
          {
            name: 'Conversation Monitor',
            value: 'conversations',
            checked: this.dashboardConfig.showConversations,
          },
          {
            name: 'Alert Monitor',
            value: 'alerts',
            checked: this.dashboardConfig.showAlerts,
          },
        ],
        validate: (input) =>
          input.length > 0 || 'Please select at least one widget',
      },
    ]);

    // Update configuration
    this.dashboardConfig = {
      ...this.dashboardConfig,
      refreshRate: newConfig.refreshRate,
      layout: newConfig.layout,
      showPerformance: newConfig.widgets.includes('performance'),
      showEmotions: newConfig.widgets.includes('emotions'),
      showMemory: newConfig.widgets.includes('memory'),
      showConversations: newConfig.widgets.includes('conversations'),
      showAlerts: newConfig.widgets.includes('alerts'),
    };

    console.log(chalk.default.green('\n✅ Dashboard configuration updated!'));

    // Show configuration summary
    console.log('\n📊 Current Configuration:');
    console.log(`   Refresh Rate: ${this.dashboardConfig.refreshRate}ms`);
    console.log(`   Layout: ${this.dashboardConfig.layout}`);
    console.log(`   Active Widgets: ${newConfig.widgets.join(', ')}`);
  }

  private async showCustomWidgets(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`📊 Custom Widget View - ${agentId}\n`));

    const { widgetType } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'widgetType',
        message: 'Select widget to customize:',
        choices: [
          { name: '📊 Performance Metrics', value: 'performance' },
          { name: '🎭 Emotion Tracking', value: 'emotion' },
          { name: '🧠 Memory Analysis', value: 'memory' },
          { name: '💬 Conversation Flow', value: 'conversation' },
          { name: '🚨 Custom Alerts', value: 'alerts' },
          { name: '📈 Custom Charts', value: 'charts' },
        ],
      },
    ]);

    await this.renderCustomWidget(agentId, widgetType);
  }

  private async renderCustomWidget(
    agentId: string,
    widgetType: string
  ): Promise<void> {
    const chalk = await import('chalk');

    switch (widgetType) {
      case 'performance':
        await this.renderDetailedPerformanceWidget(agentId);
        break;
      case 'emotion':
        await this.renderDetailedEmotionWidget(agentId);
        break;
      case 'memory':
        await this.renderDetailedMemoryWidget(agentId);
        break;
      case 'conversation':
        await this.renderDetailedConversationWidget(agentId);
        break;
      case 'alerts':
        await this.renderDetailedAlertsWidget(agentId);
        break;
      case 'charts':
        await this.renderCustomCharts(agentId);
        break;
    }
  }

  private async showAlertMonitor(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.red(`🚨 Alert Monitor - ${agentId}\n`));

    const alerts = await this.getAllAlerts(agentId);

    if (alerts.length === 0) {
      console.log(
        chalk.default.green('✅ No alerts - System operating normally')
      );
      return;
    }

    console.log(chalk.default.blue(`Found ${alerts.length} alerts:\n`));

    alerts.forEach((alert, index) => {
      const severityColor =
        alert.severity === 'critical'
          ? 'red'
          : alert.severity === 'warning'
            ? 'yellow'
            : 'blue';
      const severityIcon =
        alert.severity === 'critical'
          ? '🔴'
          : alert.severity === 'warning'
            ? '🟡'
            : '🔵';

      console.log(
        `${index + 1}. ${severityIcon} ${chalk.default[severityColor](alert.message)}`
      );
      console.log(`   Time: ${alert.timestamp.toLocaleString()}`);
      console.log(`   Component: ${alert.component}`);
      console.log(`   Severity: ${alert.severity.toUpperCase()}`);

      if (alert.recommendation) {
        console.log(`   💡 Recommendation: ${alert.recommendation}`);
      }

      console.log();
    });

    // Alert statistics
    const criticalCount = alerts.filter(
      (a) => a.severity === 'critical'
    ).length;
    const warningCount = alerts.filter((a) => a.severity === 'warning').length;
    const infoCount = alerts.filter((a) => a.severity === 'info').length;

    console.log(chalk.default.magenta('📊 Alert Summary:'));
    console.log(`   🔴 Critical: ${criticalCount}`);
    console.log(`   🟡 Warning: ${warningCount}`);
    console.log(`   🔵 Info: ${infoCount}`);
  }

  private async showSystemStatus(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🔍 System Status - ${agentId}\n`));

    const status = await this.getSystemStatus(agentId);

    // Overall health
    console.log(chalk.default.blue('🏥 Overall Health:'));
    console.log(
      `   Status: ${this.getStatusIcon(status.overallStatus)} ${status.overallStatus}`
    );
    console.log(
      `   Health Score: ${status.healthScore}/100 ${this.createHealthBar(status.healthScore)}`
    );
    console.log(`   Uptime: ${this.formatUptime(status.uptime)}`);
    console.log(
      `   Last Check: ${status.lastHealthCheck.toLocaleTimeString()}`
    );
    console.log();

    // Component status
    console.log(chalk.default.green('🔧 Component Status:'));
    status.components.forEach((component) => {
      const statusIcon = this.getStatusIcon(component.status);
      console.log(
        `   ${statusIcon} ${component.name.padEnd(20)} ${component.status}`
      );
      if (component.message) {
        console.log(`     ${component.message}`);
      }
    });
    console.log();

    // Performance metrics
    console.log(chalk.default.magenta('⚡ Current Performance:'));
    console.log(`   Response Time: ${status.performance.responseTime}ms`);
    console.log(`   Memory Usage: ${status.performance.memoryUsage}MB`);
    console.log(
      `   CPU Usage: ${(status.performance.cpuUsage * 100).toFixed(1)}%`
    );
    console.log(
      `   Active Connections: ${status.performance.activeConnections}`
    );
    console.log();

    // Recent events
    if (status.recentEvents.length > 0) {
      console.log(chalk.default.yellow('📝 Recent Events:'));
      status.recentEvents.slice(0, 5).forEach((event) => {
        const timeAgo = this.formatTimeAgo(event.timestamp);
        console.log(`   ${event.type}: ${event.message} (${timeAgo})`);
      });
    }
  }

  private async showMultiAgentView(): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan('📊 Multi-Agent Dashboard\n'));

    const agents = await this.getAllAgents();

    if (agents.length === 0) {
      console.log(chalk.default.yellow('No agents found'));
      return;
    }

    console.log(chalk.default.blue(`Monitoring ${agents.length} agents:\n`));

    // Header
    console.log(
      'Agent'.padEnd(15) +
        'Status'.padEnd(10) +
        'Response'.padEnd(12) +
        'Memory'.padEnd(10) +
        'Emotion'.padEnd(15) +
        'Last Active'
    );
    console.log('─'.repeat(80));

    // Agent data
    for (const agent of agents) {
      const statusIcon = this.getStatusIcon(agent.status);
      const emotionEmoji = this.getEmotionEmoji(agent.currentEmotion);
      const lastActive = this.formatTimeAgo(agent.lastActive);

      console.log(
        agent.name.padEnd(15) +
          `${statusIcon} ${agent.status}`.padEnd(10) +
          `${agent.responseTime}ms`.padEnd(12) +
          `${agent.memoryUsage.toFixed(1)}MB`.padEnd(10) +
          `${emotionEmoji} ${agent.currentEmotion}`.padEnd(15) +
          lastActive
      );
    }

    console.log();

    // Summary statistics
    const activeAgents = agents.filter((a) => a.status === 'active').length;
    const avgResponseTime =
      agents.reduce((sum, a) => sum + a.responseTime, 0) / agents.length;
    const totalMemory = agents.reduce((sum, a) => sum + a.memoryUsage, 0);

    console.log(chalk.default.magenta('📊 Multi-Agent Summary:'));
    console.log(`   Active Agents: ${activeAgents}/${agents.length}`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Total Memory Usage: ${totalMemory.toFixed(1)}MB`);
  }

  // Widget setup and helper methods
  private setupWidgets(): void {
    this.widgets.set('performance', {
      id: 'performance',
      name: 'Performance Monitor',
      type: 'metrics',
      enabled: true,
      position: { x: 0, y: 0, width: 2, height: 1 },
    });

    this.widgets.set('emotion', {
      id: 'emotion',
      name: 'Emotion Monitor',
      type: 'status',
      enabled: true,
      position: { x: 2, y: 0, width: 2, height: 1 },
    });

    this.widgets.set('memory', {
      id: 'memory',
      name: 'Memory Monitor',
      type: 'metrics',
      enabled: true,
      position: { x: 0, y: 1, width: 2, height: 1 },
    });

    this.widgets.set('conversation', {
      id: 'conversation',
      name: 'Conversation Monitor',
      type: 'activity',
      enabled: true,
      position: { x: 2, y: 1, width: 2, height: 1 },
    });

    this.widgets.set('alerts', {
      id: 'alerts',
      name: 'Alert Monitor',
      type: 'alerts',
      enabled: true,
      position: { x: 0, y: 2, width: 4, height: 1 },
    });
  }

  // Helper methods for data visualization
  private getPerformanceBar(
    value: number,
    max: number,
    length: number = 15
  ): string {
    const percentage = Math.min(value / max, 1);
    const filled = Math.round(percentage * length);
    const empty = length - filled;

    const color = percentage > 0.8 ? '🔴' : percentage > 0.6 ? '🟡' : '🟢';
    return color + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getCPUBar(usage: number, length: number = 15): string {
    const filled = Math.round(usage * length);
    const empty = length - filled;
    const color = usage > 0.8 ? '🔴' : usage > 0.6 ? '🟡' : '🟢';
    return color + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getMemoryBar(usage: number, length: number = 15): string {
    const percentage = Math.min(usage / 16, 1); // Assume 16MB max
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    const color = percentage > 0.8 ? '🔴' : percentage > 0.6 ? '🟡' : '🟢';
    return color + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getRequestsBar(
    requests: number,
    max: number = 20,
    length: number = 15
  ): string {
    const percentage = Math.min(requests / max, 1);
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    return '🔵' + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getErrorBar(rate: number, length: number = 15): string {
    const percentage = Math.min(rate * 10, 1); // Scale error rate
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    const color = rate > 0.05 ? '🔴' : rate > 0.02 ? '🟡' : '🟢';
    return color + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getCacheBar(hitRate: number, length: number = 15): string {
    const filled = Math.round(hitRate * length);
    const empty = length - filled;
    const color = hitRate > 0.8 ? '🟢' : hitRate > 0.6 ? '🟡' : '🔴';
    return color + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getSystemBar(
    value: number,
    max: number,
    length: number = 15
  ): string {
    const percentage = Math.min(value / max, 1);
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    return '🔵' + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private createIntensityBar(intensity: number, length: number = 10): string {
    const filled = Math.round(intensity * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private createHealthBar(score: number, length: number = 15): string {
    const filled = Math.round((score / 100) * length);
    const empty = length - filled;
    const color = score > 80 ? '🟢' : score > 60 ? '🟡' : '🔴';
    return color + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getStatusIcon(status: string): string {
    const icons = {
      active: '🟢',
      inactive: '🔴',
      error: '❌',
      paused: '⏸️',
      healthy: '🟢',
      warning: '🟡',
      critical: '🔴',
    };
    return icons[status as keyof typeof icons] || '⚪';
  }

  private getEmotionEmoji(emotion: string): string {
    const emojis = {
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
      helpful: '🤝',
      excited: '🤩',
    };
    return emojis[emotion as keyof typeof emojis] || '😐';
  }

  private getStabilityIndicator(stability: number): string {
    if (stability > 0.8) return 'Very Stable';
    if (stability > 0.6) return 'Stable';
    if (stability > 0.4) return 'Unstable';
    return 'Very Unstable';
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

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  // Mock data methods - in real implementation these would fetch from runtime
  private async getDashboardOverview(agentId: string): Promise<any> {
    return {
      agentStatus: 'active',
      activeWidgets: 5,
      refreshRate: this.dashboardConfig.refreshRate,
      uptime: 7200000, // 2 hours
      lastUpdate: new Date(),
    };
  }

  private async getPerformanceData(agentId: string): Promise<any> {
    return {
      responseTime: 180 + Math.random() * 100,
      cpuUsage: 0.3 + Math.random() * 0.2,
      memoryUsage: 9 + Math.random() * 2,
      requestsPerSecond: Math.floor(Math.random() * 15) + 5,
      errorRate: Math.random() * 0.05,
    };
  }

  private async getEmotionData(agentId: string): Promise<any> {
    return {
      current: 'curious',
      intensity: 0.7,
      secondary: [{ emotion: 'happy', intensity: 0.3 }],
      duration: 180000, // 3 minutes
      stability: 0.8,
      changesInLastHour: 3,
      trend: 'stable',
    };
  }

  private async getMemoryData(agentId: string): Promise<any> {
    return {
      totalRecords: 1247,
      memoryUsage: 8.3,
      recentAdds: 15,
      growthRate: 2.1,
      cacheHitRate: 0.85,
      healthScore: 87,
      provider: 'sqlite',
      status: 'healthy',
    };
  }

  private async getConversationData(agentId: string): Promise<any> {
    return {
      activeSessions: 2,
      messagesToday: 34,
      avgResponseTime: 245,
      queueLength: 1,
      lastMessage: new Date(Date.now() - 300000), // 5 minutes ago
      recentMessages: [
        {
          content: 'How can I optimize the agent performance?',
          timestamp: new Date(),
        },
      ],
    };
  }

  private async getAlertsData(agentId: string): Promise<any[]> {
    return [
      {
        id: '1',
        message: 'High memory usage detected',
        severity: 'warning',
        timestamp: new Date(Date.now() - 600000),
        component: 'memory',
        recommendation: 'Consider running memory cleanup',
      },
    ];
  }

  private async getSystemResources(): Promise<any> {
    return {
      nodeMemory: 45.2,
      systemLoad: 0.65,
      activeConnections: 12,
      openFiles: 234,
      uptime: 7200000,
    };
  }

  // Additional mock implementations
  private async getAllAlerts(agentId: string): Promise<any[]> {
    return [];
  }
  private async getSystemStatus(agentId: string): Promise<any> {
    return {};
  }
  private async getAllAgents(): Promise<any[]> {
    return [];
  }
  private async renderDetailedPerformanceWidget(
    agentId: string
  ): Promise<void> {}
  private async renderDetailedEmotionWidget(agentId: string): Promise<void> {}
  private async renderDetailedMemoryWidget(agentId: string): Promise<void> {}
  private async renderDetailedConversationWidget(
    agentId: string
  ): Promise<void> {}
  private async renderDetailedAlertsWidget(agentId: string): Promise<void> {}
  private async renderCustomCharts(agentId: string): Promise<void> {}
  private async showPerformanceMonitor(agentId: string): Promise<void> {}
  private async showEmotionMonitor(agentId: string): Promise<void> {}
  private async showMemoryMonitor(agentId: string): Promise<void> {}
  private async showConversationMonitor(agentId: string): Promise<void> {}
  private async exportDashboardData(agentId: string): Promise<void> {}
}
