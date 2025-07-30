/**
 * Visual Debugger Manager
 * Central orchestrator for visual debugging features
 */

import { EventEmitter } from 'events';
import { AgentDebugState, VisualizationConfig } from '../types/index.js';
import { AgentInspector } from './agent-inspector.js';
import { EmotionVisualizer } from './emotion-visualizer.js';
import { MemoryExplorer } from './memory-explorer.js';
import { PerformanceProfiler } from './performance-profiler.js';
import { ConversationReplay } from './conversation-replay.js';
import { RealTimeDashboard } from './real-time-dashboard.js';

export class VisualDebuggerManager extends EventEmitter {
  private agentInspector: AgentInspector;
  private emotionVisualizer: EmotionVisualizer;
  private memoryExplorer: MemoryExplorer;
  private performanceProfiler: PerformanceProfiler;
  private conversationReplay: ConversationReplay;
  private realTimeDashboard: RealTimeDashboard;
  private initialized = false;
  private config: VisualizationConfig;

  constructor() {
    super();
    this.agentInspector = new AgentInspector();
    this.emotionVisualizer = new EmotionVisualizer();
    this.memoryExplorer = new MemoryExplorer();
    this.performanceProfiler = new PerformanceProfiler();
    this.conversationReplay = new ConversationReplay();
    this.realTimeDashboard = new RealTimeDashboard();

    this.config = {
      showEmotionGraph: true,
      showMemoryUsage: true,
      showPerformanceMetrics: true,
      showConversationReplay: true,
      refreshInterval: 1000,
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔍 Initializing Visual Debugger...');

    await Promise.all([
      this.agentInspector.initialize(),
      this.emotionVisualizer.initialize(),
      this.memoryExplorer.initialize(),
      this.performanceProfiler.initialize(),
      this.conversationReplay.initialize(),
      this.realTimeDashboard.initialize(),
    ]);

    this.setupEventHandlers();
    this.initialized = true;

    console.log('✅ Visual Debugger ready!');
  }

  private setupEventHandlers(): void {
    // Forward events from sub-components
    this.agentInspector.on('agent-state-updated', (data) => {
      this.emit('agent-state-updated', data);
    });

    this.emotionVisualizer.on('emotion-changed', (data) => {
      this.emit('emotion-changed', data);
    });

    this.memoryExplorer.on('memory-accessed', (data) => {
      this.emit('memory-accessed', data);
    });

    this.performanceProfiler.on('performance-data', (data) => {
      this.emit('performance-data', data);
    });
  }

  // Main debugging interface
  async openDebugger(agentId?: string): Promise<void> {
    if (!agentId) {
      return this.showAgentSelector();
    }

    console.clear();
    await this.showDebugInterface(agentId);
  }

  async showAgentSelector(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan('🔍 SYMindX Visual Debugger\n'));

    // This would normally connect to the runtime to get agents
    const mockAgents = [
      { id: 'nyx', name: 'NyX', status: 'active' },
      { id: 'aria', name: 'Aria', status: 'inactive' },
      { id: 'test-agent', name: 'Test Agent', status: 'active' },
    ];

    if (mockAgents.length === 0) {
      console.log(
        chalk.default.yellow('No agents found. Start some agents first.')
      );
      return;
    }

    const { agentId } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select an agent to debug:',
        choices: mockAgents.map((agent) => ({
          name: `${agent.status === 'active' ? '🟢' : '🔴'} ${agent.name} (${agent.id})`,
          value: agent.id,
        })),
      },
    ]);

    await this.showDebugInterface(agentId);
  }

  async showDebugInterface(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    while (true) {
      console.clear();
      console.log(chalk.default.cyan(`🔍 Debugging Agent: ${agentId}\n`));

      // Show real-time status
      await this.showQuickStatus(agentId);

      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to debug?',
          choices: [
            { name: '🤖 Agent State Inspector', value: 'inspector' },
            { name: '😊 Emotion Visualizer', value: 'emotions' },
            { name: '🧠 Memory Explorer', value: 'memory' },
            { name: '⚡ Performance Profiler', value: 'performance' },
            { name: '💬 Conversation Replay', value: 'replay' },
            { name: '📊 Real-time Dashboard', value: 'dashboard' },
            { name: '🔄 Auto-refresh View', value: 'auto' },
            { name: '⚙️  Configuration', value: 'config' },
            { name: '⬅️  Back to agent selection', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'inspector':
          await this.agentInspector.showInspector(agentId);
          break;
        case 'emotions':
          await this.emotionVisualizer.showVisualizer(agentId);
          break;
        case 'memory':
          await this.memoryExplorer.exploreMemory(agentId);
          break;
        case 'performance':
          await this.performanceProfiler.showProfiler(agentId);
          break;
        case 'replay':
          await this.conversationReplay.showReplay(agentId);
          break;
        case 'dashboard':
          await this.realTimeDashboard.showDashboard(agentId);
          break;
        case 'auto':
          await this.startAutoRefreshMode(agentId);
          break;
        case 'config':
          await this.showConfiguration();
          break;
        case 'back':
          return;
      }

      // Wait for user input before continuing
      await inquirer.default.prompt([
        {
          type: 'input',
          name: 'continue',
          message: chalk.default.gray('Press Enter to continue...'),
        },
      ]);
    }
  }

  private async showQuickStatus(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    // Mock agent state - in real implementation, this would fetch from runtime
    const mockState: AgentDebugState = {
      agentId,
      status: 'active',
      emotion: {
        current: 'curious',
        intensity: 0.7,
        history: [
          {
            emotion: 'neutral',
            intensity: 0.5,
            timestamp: new Date(Date.now() - 60000),
          },
          { emotion: 'curious', intensity: 0.7, timestamp: new Date() },
        ],
      },
      memory: {
        recent: [
          {
            id: '1',
            content: 'User asked about debugging',
            timestamp: new Date(),
            importance: 0.8,
          },
        ],
        stats: {
          totalRecords: 150,
          memoryUsage: 2.5,
        },
      },
      cognition: {
        currentThought: 'Processing debug request',
        planningState: 'active',
        recentActions: [
          {
            id: '1',
            type: 'message',
            description: 'Received debug request',
            timestamp: new Date(),
            result: 'processed',
          },
        ],
      },
      metrics: {
        responseTime: 250,
        tokensUsed: 150,
        errorRate: 0.05,
        uptime: 3600000,
      },
    };

    console.log(chalk.default.green('📊 Quick Status:'));
    console.log(
      `   Status: ${this.getStatusIcon(mockState.status)} ${mockState.status}`
    );
    console.log(
      `   Emotion: ${this.getEmotionEmoji(mockState.emotion.current)} ${mockState.emotion.current} (${(mockState.emotion.intensity * 100).toFixed(0)}%)`
    );
    console.log(
      `   Memory: ${mockState.memory.stats.totalRecords} records (${mockState.memory.stats.memoryUsage}MB)`
    );
    console.log(`   Response Time: ${mockState.metrics.responseTime}ms`);
    console.log(`   Uptime: ${this.formatUptime(mockState.metrics.uptime)}`);
    console.log();
  }

  private async startAutoRefreshMode(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🔄 Auto-refresh Mode - Agent: ${agentId}`));
    console.log(chalk.default.gray('Press Ctrl+C to exit\n'));

    const intervalId = setInterval(async () => {
      // Clear and redraw
      process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen
      console.log(
        chalk.default.cyan(`🔄 Auto-refresh Mode - Agent: ${agentId}`)
      );
      console.log(
        chalk.default.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`)
      );

      await this.showQuickStatus(agentId);

      // Show simplified dashboard
      if (this.config.showEmotionGraph) {
        await this.emotionVisualizer.showMiniGraph(agentId);
      }

      if (this.config.showMemoryUsage) {
        await this.memoryExplorer.showMemoryStats(agentId);
      }

      if (this.config.showPerformanceMetrics) {
        await this.performanceProfiler.showMiniMetrics(agentId);
      }
    }, this.config.refreshInterval);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.default.yellow('\n🔄 Auto-refresh stopped'));
      process.exit(0);
    });

    // Keep the process running
    await new Promise(() => {}); // Infinite promise
  }

  private async showConfiguration(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan('⚙️  Visual Debugger Configuration\n'));

    const newConfig = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'showEmotionGraph',
        message: 'Show emotion graphs?',
        default: this.config.showEmotionGraph,
      },
      {
        type: 'confirm',
        name: 'showMemoryUsage',
        message: 'Show memory usage?',
        default: this.config.showMemoryUsage,
      },
      {
        type: 'confirm',
        name: 'showPerformanceMetrics',
        message: 'Show performance metrics?',
        default: this.config.showPerformanceMetrics,
      },
      {
        type: 'confirm',
        name: 'showConversationReplay',
        message: 'Enable conversation replay?',
        default: this.config.showConversationReplay,
      },
      {
        type: 'number',
        name: 'refreshInterval',
        message: 'Refresh interval (ms):',
        default: this.config.refreshInterval,
        validate: (input) => input > 0 || 'Must be a positive number',
      },
    ]);

    this.config = { ...this.config, ...newConfig };
    console.log(chalk.default.green('\n✅ Configuration updated!'));
  }

  // Utility methods for debugging data
  async captureAgentSnapshot(agentId: string): Promise<AgentDebugState> {
    // In real implementation, this would fetch from the runtime
    return {
      agentId,
      status: 'active',
      emotion: {
        current: 'neutral',
        intensity: 0.5,
        history: [],
      },
      memory: {
        recent: [],
        stats: { totalRecords: 0, memoryUsage: 0 },
      },
      cognition: {
        currentThought: '',
        planningState: 'idle',
        recentActions: [],
      },
      metrics: {
        responseTime: 0,
        tokensUsed: 0,
        errorRate: 0,
        uptime: 0,
      },
    };
  }

  async exportDebugData(
    agentId: string,
    options?: {
      includeMemory?: boolean;
      includeEmotions?: boolean;
      includePerformance?: boolean;
      format?: 'json' | 'csv';
    }
  ): Promise<string> {
    const snapshot = await this.captureAgentSnapshot(agentId);
    const exportData: any = { agentId, timestamp: new Date(), snapshot };

    if (options?.includeMemory) {
      exportData.memoryData =
        await this.memoryExplorer.exportMemoryData(agentId);
    }

    if (options?.includeEmotions) {
      exportData.emotionHistory =
        await this.emotionVisualizer.exportEmotionHistory(agentId);
    }

    if (options?.includePerformance) {
      exportData.performanceMetrics =
        await this.performanceProfiler.exportMetrics(agentId);
    }

    const format = options?.format || 'json';

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      return this.convertToCSV(exportData);
    }
  }

  async compareAgentStates(
    agentId1: string,
    agentId2: string
  ): Promise<{
    differences: Array<{ field: string; agent1: any; agent2: any }>;
    similarities: string[];
    recommendations: string[];
  }> {
    const state1 = await this.captureAgentSnapshot(agentId1);
    const state2 = await this.captureAgentSnapshot(agentId2);

    const differences: Array<{ field: string; agent1: any; agent2: any }> = [];
    const similarities: string[] = [];

    // Compare basic fields
    if (state1.status !== state2.status) {
      differences.push({
        field: 'status',
        agent1: state1.status,
        agent2: state2.status,
      });
    } else {
      similarities.push('Both agents have the same status');
    }

    if (state1.emotion.current !== state2.emotion.current) {
      differences.push({
        field: 'emotion',
        agent1: state1.emotion.current,
        agent2: state2.emotion.current,
      });
    } else {
      similarities.push('Both agents have the same current emotion');
    }

    const recommendations: string[] = [];

    if (differences.length > 3) {
      recommendations.push(
        'Agents have significantly different states - consider investigating causes'
      );
    }

    if (similarities.length > 2) {
      recommendations.push(
        'Agents are behaving similarly - this might indicate correct coordination'
      );
    }

    return { differences, similarities, recommendations };
  }

  // Helper methods
  private getStatusIcon(status: string): string {
    const icons = {
      active: '🟢',
      inactive: '🔴',
      error: '❌',
      paused: '⏸️',
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
    };
    return emojis[emotion as keyof typeof emojis] || '😐';
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in a real implementation, this would be more sophisticated
    const headers = Object.keys(data);
    const values = headers.map((header) => JSON.stringify(data[header]));

    return headers.join(',') + '\n' + values.join(',');
  }

  // CLI Integration
  async startInteractiveDebugger(): Promise<void> {
    await this.showAgentSelector();
  }

  updateConfig(newConfig: Partial<VisualizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  getConfig(): VisualizationConfig {
    return { ...this.config };
  }
}
