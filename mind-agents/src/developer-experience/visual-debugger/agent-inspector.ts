/**
 * Agent Inspector
 * Detailed inspection of agent internal state
 */

import { EventEmitter } from 'events';
import { AgentDebugState } from '../types/index.js';

export class AgentInspector extends EventEmitter {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🤖 Initializing Agent Inspector...');
    this.initialized = true;
  }

  async showInspector(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    while (true) {
      console.clear();
      console.log(chalk.default.cyan(`🤖 Agent Inspector - ${agentId}\n`));

      // Show current state
      await this.displayAgentState(agentId);

      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to inspect?',
          choices: [
            { name: '📊 Full State Overview', value: 'overview' },
            { name: '🧠 Cognition Details', value: 'cognition' },
            { name: '📋 Configuration', value: 'config' },
            { name: '🔗 Extensions', value: 'extensions' },
            { name: '📈 Metrics History', value: 'metrics' },
            { name: '🔄 Refresh State', value: 'refresh' },
            { name: '💾 Export State', value: 'export' },
            { name: '⬅️  Back', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'overview':
          await this.showFullOverview(agentId);
          break;
        case 'cognition':
          await this.showCognitionDetails(agentId);
          break;
        case 'config':
          await this.showConfiguration(agentId);
          break;
        case 'extensions':
          await this.showExtensions(agentId);
          break;
        case 'metrics':
          await this.showMetricsHistory(agentId);
          break;
        case 'refresh':
          // State will be refreshed on next loop iteration
          continue;
        case 'export':
          await this.exportAgentState(agentId);
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

  private async displayAgentState(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const state = await this.getAgentState(agentId);

    console.log(chalk.default.green('🔍 Current State:'));
    console.log(`   ID: ${state.agentId}`);
    console.log(`   Status: ${this.getStatusDisplay(state.status)}`);
    console.log(`   Uptime: ${this.formatUptime(state.metrics.uptime)}`);
    console.log();

    console.log(chalk.default.blue('😊 Emotional State:'));
    console.log(
      `   Current: ${this.getEmotionEmoji(state.emotion.current)} ${state.emotion.current}`
    );
    console.log(
      `   Intensity: ${this.createProgressBar(state.emotion.intensity)} ${(state.emotion.intensity * 100).toFixed(0)}%`
    );
    console.log();

    console.log(chalk.default.magenta('🧠 Cognition:'));
    console.log(
      `   Current Thought: ${state.cognition.currentThought || 'None'}`
    );
    console.log(`   Planning State: ${state.cognition.planningState}`);
    console.log(`   Recent Actions: ${state.cognition.recentActions.length}`);
    console.log();

    console.log(chalk.default.yellow('📊 Performance:'));
    console.log(`   Response Time: ${state.metrics.responseTime}ms`);
    console.log(`   Tokens Used: ${state.metrics.tokensUsed}`);
    console.log(
      `   Error Rate: ${(state.metrics.errorRate * 100).toFixed(2)}%`
    );
    console.log();
  }

  private async showFullOverview(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const state = await this.getAgentState(agentId);

    console.clear();
    console.log(chalk.default.cyan(`📊 Full State Overview - ${agentId}\n`));

    // Basic Information
    console.log(chalk.default.green('📋 Basic Information:'));
    console.log(`   Agent ID: ${state.agentId}`);
    console.log(`   Status: ${this.getStatusDisplay(state.status)}`);
    console.log(`   Uptime: ${this.formatUptime(state.metrics.uptime)}`);
    console.log();

    // Detailed Emotional State
    console.log(chalk.default.blue('😊 Emotional Analysis:'));
    console.log(
      `   Current Emotion: ${this.getEmotionEmoji(state.emotion.current)} ${state.emotion.current}`
    );
    console.log(
      `   Intensity: ${this.createProgressBar(state.emotion.intensity)} ${(state.emotion.intensity * 100).toFixed(0)}%`
    );

    if (state.emotion.history.length > 0) {
      console.log('   Recent History:');
      state.emotion.history.slice(-3).forEach((entry, index) => {
        const timeAgo = this.getTimeAgo(entry.timestamp);
        console.log(
          `     ${index + 1}. ${this.getEmotionEmoji(entry.emotion)} ${entry.emotion} (${(entry.intensity * 100).toFixed(0)}%) - ${timeAgo}`
        );
      });
    }
    console.log();

    // Memory Information
    console.log(chalk.default.magenta('🧠 Memory System:'));
    console.log(
      `   Total Records: ${state.memory.stats.totalRecords.toLocaleString()}`
    );
    console.log(
      `   Memory Usage: ${state.memory.stats.memoryUsage.toFixed(2)} MB`
    );

    if (state.memory.recent.length > 0) {
      console.log('   Recent Memories:');
      state.memory.recent.slice(0, 3).forEach((memory, index) => {
        const timeAgo = this.getTimeAgo(memory.timestamp);
        const importance = '★'.repeat(Math.round(memory.importance * 5));
        console.log(
          `     ${index + 1}. ${memory.content.substring(0, 50)}... (${importance}) - ${timeAgo}`
        );
      });
    }
    console.log();

    // Cognition Details
    console.log(chalk.default.cyan('🎯 Cognitive State:'));
    console.log(
      `   Current Thought: ${state.cognition.currentThought || 'None'}`
    );
    console.log(`   Planning State: ${state.cognition.planningState}`);

    if (state.cognition.recentActions.length > 0) {
      console.log('   Recent Actions:');
      state.cognition.recentActions.slice(-3).forEach((action, index) => {
        const timeAgo = this.getTimeAgo(action.timestamp);
        const status = action.result ? '✅' : action.error ? '❌' : '⏳';
        console.log(
          `     ${index + 1}. ${status} ${action.description} - ${timeAgo}`
        );
      });
    }
    console.log();

    // Performance Metrics
    console.log(chalk.default.yellow('⚡ Performance Metrics:'));
    console.log(`   Average Response Time: ${state.metrics.responseTime}ms`);
    console.log(
      `   Total Tokens Used: ${state.metrics.tokensUsed.toLocaleString()}`
    );
    console.log(
      `   Error Rate: ${(state.metrics.errorRate * 100).toFixed(2)}%`
    );
    console.log(`   Health Score: ${this.calculateHealthScore(state)}/100`);
    console.log();
  }

  private async showCognitionDetails(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const state = await this.getAgentState(agentId);

    console.clear();
    console.log(chalk.default.cyan(`🧠 Cognition Details - ${agentId}\n`));

    console.log(chalk.default.blue('🎯 Current Processing:'));
    console.log(
      `   Thought: ${state.cognition.currentThought || 'No active thought'}`
    );
    console.log(`   Planning State: ${state.cognition.planningState}`);
    console.log();

    console.log(chalk.default.green('📋 Action History:'));
    if (state.cognition.recentActions.length === 0) {
      console.log('   No recent actions');
    } else {
      state.cognition.recentActions.forEach((action, index) => {
        const timeAgo = this.getTimeAgo(action.timestamp);
        const status = action.result
          ? '✅ Success'
          : action.error
            ? '❌ Error'
            : '⏳ Pending';

        console.log(
          `   ${index + 1}. ${action.type.toUpperCase()}: ${action.description}`
        );
        console.log(`      Status: ${status}`);
        console.log(`      Time: ${timeAgo}`);

        if (action.result) {
          console.log(
            `      Result: ${action.result.substring(0, 100)}${action.result.length > 100 ? '...' : ''}`
          );
        }

        if (action.error) {
          console.log(`      Error: ${chalk.default.red(action.error)}`);
        }
        console.log();
      });
    }

    // Show thinking patterns
    console.log(chalk.default.magenta('🧩 Thinking Patterns:'));
    const patterns = this.analyzeThinkingPatterns(
      state.cognition.recentActions
    );
    patterns.forEach((pattern, index) => {
      console.log(`   ${index + 1}. ${pattern}`);
    });
  }

  private async showConfiguration(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`⚙️  Agent Configuration - ${agentId}\n`));

    // Mock configuration - in real implementation, this would fetch from runtime
    const config = {
      personality: {
        traits: ['curious', 'helpful', 'analytical'],
        background: 'A debugging-focused AI assistant',
        goals: ['Help developers debug efficiently', 'Provide insights'],
      },
      memory: {
        provider: 'sqlite',
        maxRecords: 10000,
        path: './data/agent-memories.db',
      },
      emotion: {
        type: 'composite',
        sensitivity: 0.7,
        decayRate: 0.1,
        transitionSpeed: 0.5,
      },
      cognition: {
        type: 'reactive',
        planningDepth: 3,
        memoryIntegration: true,
        creativityLevel: 0.5,
      },
      extensions: ['api', 'debugging-tools'],
    };

    console.log(chalk.default.green('🎭 Personality:'));
    console.log(`   Traits: ${config.personality.traits.join(', ')}`);
    console.log(`   Background: ${config.personality.background}`);
    console.log(`   Goals: ${config.personality.goals.join(', ')}`);
    console.log();

    console.log(chalk.default.blue('🧠 Memory Configuration:'));
    console.log(`   Provider: ${config.memory.provider}`);
    console.log(`   Max Records: ${config.memory.maxRecords.toLocaleString()}`);
    console.log(`   Storage Path: ${config.memory.path}`);
    console.log();

    console.log(chalk.default.magenta('😊 Emotion Configuration:'));
    console.log(`   Type: ${config.emotion.type}`);
    console.log(
      `   Sensitivity: ${(config.emotion.sensitivity * 100).toFixed(0)}%`
    );
    console.log(
      `   Decay Rate: ${(config.emotion.decayRate * 100).toFixed(0)}%`
    );
    console.log(
      `   Transition Speed: ${(config.emotion.transitionSpeed * 100).toFixed(0)}%`
    );
    console.log();

    console.log(chalk.default.cyan('🎯 Cognition Configuration:'));
    console.log(`   Type: ${config.cognition.type}`);
    console.log(`   Planning Depth: ${config.cognition.planningDepth}`);
    console.log(
      `   Memory Integration: ${config.cognition.memoryIntegration ? 'Enabled' : 'Disabled'}`
    );
    console.log(
      `   Creativity Level: ${(config.cognition.creativityLevel * 100).toFixed(0)}%`
    );
    console.log();

    console.log(chalk.default.yellow('🔌 Extensions:'));
    config.extensions.forEach((ext, index) => {
      console.log(`   ${index + 1}. ${ext}`);
    });
  }

  private async showExtensions(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🔌 Extensions - ${agentId}\n`));

    // Mock extensions - in real implementation, this would fetch from runtime
    const extensions = [
      {
        name: 'api',
        status: 'active',
        version: '1.0.0',
        actions: ['get', 'post', 'put', 'delete'],
        lastUsed: new Date(Date.now() - 30000),
      },
      {
        name: 'debugging-tools',
        status: 'active',
        version: '1.2.0',
        actions: ['inspect', 'trace', 'profile'],
        lastUsed: new Date(),
      },
      {
        name: 'file-system',
        status: 'inactive',
        version: '0.8.0',
        actions: ['read', 'write', 'list'],
        lastUsed: new Date(Date.now() - 300000),
      },
    ];

    extensions.forEach((ext, index) => {
      const statusIcon = ext.status === 'active' ? '🟢' : '🔴';
      const lastUsed = this.getTimeAgo(ext.lastUsed);

      console.log(
        `${index + 1}. ${statusIcon} ${chalk.default.bold(ext.name)} v${ext.version}`
      );
      console.log(`   Status: ${ext.status}`);
      console.log(`   Actions: ${ext.actions.join(', ')}`);
      console.log(`   Last Used: ${lastUsed}`);
      console.log();
    });

    if (extensions.length === 0) {
      console.log(chalk.default.gray('No extensions loaded'));
    }
  }

  private async showMetricsHistory(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`📈 Metrics History - ${agentId}\n`));

    // Mock historical data
    const history = this.generateMockMetricsHistory();

    console.log(
      chalk.default.green('📊 Performance Trends (Last 10 measurements):')
    );
    console.log();

    // Response Time Chart
    console.log(chalk.default.blue('⚡ Response Time (ms):'));
    history.responseTime.forEach((time, index) => {
      const bar = this.createChart(time, 500);
      console.log(`   ${(index + 1).toString().padStart(2)}: ${bar} ${time}ms`);
    });
    console.log();

    // Tokens Used Chart
    console.log(chalk.default.magenta('🔤 Tokens Used:'));
    history.tokensUsed.forEach((tokens, index) => {
      const bar = this.createChart(tokens, 200);
      console.log(`   ${(index + 1).toString().padStart(2)}: ${bar} ${tokens}`);
    });
    console.log();

    // Error Rate Chart
    console.log(chalk.default.red('❌ Error Rate (%):'));
    history.errorRate.forEach((rate, index) => {
      const percentage = (rate * 100).toFixed(1);
      const bar = this.createChart(rate, 0.1);
      console.log(
        `   ${(index + 1).toString().padStart(2)}: ${bar} ${percentage}%`
      );
    });
    console.log();

    // Summary Statistics
    const avgResponseTime =
      history.responseTime.reduce((a, b) => a + b, 0) /
      history.responseTime.length;
    const avgTokens =
      history.tokensUsed.reduce((a, b) => a + b, 0) / history.tokensUsed.length;
    const avgErrorRate =
      history.errorRate.reduce((a, b) => a + b, 0) / history.errorRate.length;

    console.log(chalk.default.yellow('📊 Summary Statistics:'));
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Average Tokens Used: ${avgTokens.toFixed(0)}`);
    console.log(`   Average Error Rate: ${(avgErrorRate * 100).toFixed(2)}%`);
  }

  private async exportAgentState(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');
    const fs = await import('fs');

    const { format, filename } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: 'JSON (detailed)', value: 'json' },
          { name: 'CSV (metrics only)', value: 'csv' },
          { name: 'Text (readable)', value: 'txt' },
        ],
      },
      {
        type: 'input',
        name: 'filename',
        message: 'Export filename:',
        default: `agent-${agentId}-${Date.now()}`,
      },
    ]);

    try {
      const state = await this.getAgentState(agentId);
      let content: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(state, null, 2);
          extension = '.json';
          break;
        case 'csv':
          content = this.convertToCSV(state);
          extension = '.csv';
          break;
        case 'txt':
          content = this.convertToText(state);
          extension = '.txt';
          break;
        default:
          throw new Error('Unknown format');
      }

      const fullFilename = filename + extension;
      fs.writeFileSync(fullFilename, content);

      console.log(
        chalk.default.green(`✅ Agent state exported to: ${fullFilename}`)
      );
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  // Helper methods
  private async getAgentState(agentId: string): Promise<AgentDebugState> {
    // Mock implementation - in real version, this would fetch from runtime
    return {
      agentId,
      status: 'active',
      emotion: {
        current: 'curious',
        intensity: 0.7,
        history: [
          {
            emotion: 'neutral',
            intensity: 0.5,
            timestamp: new Date(Date.now() - 120000),
          },
          {
            emotion: 'happy',
            intensity: 0.8,
            timestamp: new Date(Date.now() - 60000),
          },
          { emotion: 'curious', intensity: 0.7, timestamp: new Date() },
        ],
      },
      memory: {
        recent: [
          {
            id: '1',
            content: 'User requested debugging assistance',
            timestamp: new Date(Date.now() - 30000),
            importance: 0.8,
          },
          {
            id: '2',
            content: 'Successfully analyzed agent state',
            timestamp: new Date(Date.now() - 15000),
            importance: 0.6,
          },
          {
            id: '3',
            content: 'Generated detailed inspection report',
            timestamp: new Date(),
            importance: 0.9,
          },
        ],
        stats: {
          totalRecords: 247,
          memoryUsage: 3.2,
        },
      },
      cognition: {
        currentThought: 'Analyzing debugging patterns for optimization',
        planningState: 'active',
        recentActions: [
          {
            id: '1',
            type: 'analysis',
            description: 'Inspected agent memory usage',
            timestamp: new Date(Date.now() - 45000),
            result: 'Memory usage within normal parameters',
          },
          {
            id: '2',
            type: 'processing',
            description: 'Generated performance report',
            timestamp: new Date(Date.now() - 30000),
            result: 'Report completed successfully',
          },
          {
            id: '3',
            type: 'optimization',
            description: 'Applied response time improvements',
            timestamp: new Date(Date.now() - 15000),
            result: '15% improvement achieved',
          },
        ],
      },
      metrics: {
        responseTime: 185,
        tokensUsed: 1247,
        errorRate: 0.02,
        uptime: 7200000, // 2 hours
      },
    };
  }

  private getStatusDisplay(status: string): string {
    const displays = {
      active: '🟢 Active',
      inactive: '🔴 Inactive',
      error: '❌ Error',
      paused: '⏸️ Paused',
    };
    return displays[status as keyof typeof displays] || '⚪ Unknown';
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
    };
    return emojis[emotion as keyof typeof emojis] || '😐';
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

  private createProgressBar(value: number, length: number = 20): string {
    const filled = Math.round(value * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  private calculateHealthScore(state: AgentDebugState): number {
    let score = 100;

    // Deduct for high error rate
    score -= state.metrics.errorRate * 100 * 2;

    // Deduct for slow response time
    if (state.metrics.responseTime > 500) {
      score -= Math.min(20, (state.metrics.responseTime - 500) / 50);
    }

    // Bonus for recent activity
    if (state.cognition.recentActions.length > 0) {
      score += 5;
    }

    return Math.max(0, Math.round(score));
  }

  private analyzeThinkingPatterns(actions: any[]): string[] {
    const patterns: string[] = [];

    if (actions.length === 0) {
      patterns.push('No recent thinking patterns detected');
      return patterns;
    }

    // Analyze action types
    const actionTypes = actions.map((a) => a.type);
    const uniqueTypes = [...new Set(actionTypes)];

    if (uniqueTypes.length > 3) {
      patterns.push(
        'Shows diverse thinking - processes multiple types of tasks'
      );
    }

    // Check for sequential patterns
    const hasSequentialProcessing = actionTypes.some(
      (type, index) =>
        index > 0 &&
        actionTypes[index - 1] === 'analysis' &&
        type === 'processing'
    );

    if (hasSequentialProcessing) {
      patterns.push(
        'Follows analysis → processing pattern (good logical flow)'
      );
    }

    // Check success rate
    const successRate =
      actions.filter((a) => a.result && !a.error).length / actions.length;
    if (successRate > 0.8) {
      patterns.push('High success rate in task execution');
    } else if (successRate < 0.5) {
      patterns.push('Low success rate - may need debugging attention');
    }

    if (patterns.length === 0) {
      patterns.push('Standard thinking patterns observed');
    }

    return patterns;
  }

  private generateMockMetricsHistory(): {
    responseTime: number[];
    tokensUsed: number[];
    errorRate: number[];
  } {
    const history = {
      responseTime: [] as number[],
      tokensUsed: [] as number[],
      errorRate: [] as number[],
    };

    for (let i = 0; i < 10; i++) {
      history.responseTime.push(Math.floor(150 + Math.random() * 200));
      history.tokensUsed.push(Math.floor(80 + Math.random() * 120));
      history.errorRate.push(Math.random() * 0.05);
    }

    return history;
  }

  private createChart(
    value: number,
    maxValue: number,
    length: number = 20
  ): string {
    const normalized = Math.min(1, value / maxValue);
    const filled = Math.round(normalized * length);
    const empty = length - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  private convertToCSV(state: AgentDebugState): string {
    const lines = [
      'Field,Value',
      `Agent ID,${state.agentId}`,
      `Status,${state.status}`,
      `Current Emotion,${state.emotion.current}`,
      `Emotion Intensity,${state.emotion.intensity}`,
      `Response Time,${state.metrics.responseTime}`,
      `Tokens Used,${state.metrics.tokensUsed}`,
      `Error Rate,${state.metrics.errorRate}`,
      `Uptime,${state.metrics.uptime}`,
      `Memory Records,${state.memory.stats.totalRecords}`,
      `Memory Usage,${state.memory.stats.memoryUsage}`,
    ];

    return lines.join('\n');
  }

  private convertToText(state: AgentDebugState): string {
    return `
Agent State Report
Generated: ${new Date().toISOString()}

=== Basic Information ===
Agent ID: ${state.agentId}
Status: ${state.status}
Uptime: ${this.formatUptime(state.metrics.uptime)}

=== Emotional State ===
Current Emotion: ${state.emotion.current}
Intensity: ${(state.emotion.intensity * 100).toFixed(0)}%

=== Memory System ===
Total Records: ${state.memory.stats.totalRecords}
Memory Usage: ${state.memory.stats.memoryUsage} MB

=== Performance Metrics ===
Response Time: ${state.metrics.responseTime}ms
Tokens Used: ${state.metrics.tokensUsed}
Error Rate: ${(state.metrics.errorRate * 100).toFixed(2)}%
Health Score: ${this.calculateHealthScore(state)}/100

=== Recent Actions ===
${state.cognition.recentActions
  .map(
    (action, index) =>
      `${index + 1}. ${action.type}: ${action.description} (${this.getTimeAgo(action.timestamp)})`
  )
  .join('\n')}
    `.trim();
  }
}
