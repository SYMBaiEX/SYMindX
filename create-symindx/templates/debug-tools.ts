/**
 * Real-time agent state inspection and debugging tools
 */

import chalk from 'chalk';
import { Agent, AgentDebugState, PerformanceMetrics, LogEntry, EventType } from './types.js';

export interface DebuggerConfig {
  enableRealTimeUpdates: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogEntries: number;
  performanceThresholds: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export class AgentDebugger {
  private agent: Agent;
  private config: DebuggerConfig;
  private eventLog: LogEntry[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(agent: Agent, config: Partial<DebuggerConfig> = {}) {
    this.agent = agent;
    this.config = {
      enableRealTimeUpdates: config.enableRealTimeUpdates ?? true,
      logLevel: config.logLevel ?? 'info',
      maxLogEntries: config.maxLogEntries ?? 1000,
      performanceThresholds: {
        responseTime: config.performanceThresholds?.responseTime ?? 1000,
        memoryUsage: config.performanceThresholds?.memoryUsage ?? 100 * 1024 * 1024, // 100MB
        cpuUsage: config.performanceThresholds?.cpuUsage ?? 80,
        ...config.performanceThresholds
      }
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen to all agent events
    const eventTypes: EventType[] = [
      'message_received', 'message_sent', 'emotion_changed',
      'plan_created', 'plan_executed', 'goal_achieved',
      'memory_stored', 'memory_retrieved', 'error_occurred'
    ];

    eventTypes.forEach(eventType => {
      this.agent.on(eventType, (data) => {
        this.logEvent(eventType, data);
      });
    });
  }

  private logEvent(eventType: EventType, data: any): void {
    const logEntry: LogEntry = {
      level: this.getLogLevelForEvent(eventType),
      timestamp: new Date(),
      message: `Event: ${eventType}`,
      context: { eventType, data }
    };

    this.eventLog.push(logEntry);
    
    // Trim log if it exceeds max entries
    if (this.eventLog.length > this.config.maxLogEntries) {
      this.eventLog = this.eventLog.slice(-this.config.maxLogEntries);
    }

    if (this.config.enableRealTimeUpdates) {
      this.displayEvent(logEntry);
    }
  }

  private getLogLevelForEvent(eventType: EventType): 'debug' | 'info' | 'warn' | 'error' {
    const errorEvents: EventType[] = ['error_occurred'];
    const warnEvents: EventType[] = ['plan_executed'];
    const infoEvents: EventType[] = ['message_received', 'message_sent', 'emotion_changed'];
    
    if (errorEvents.includes(eventType)) return 'error';
    if (warnEvents.includes(eventType)) return 'warn';
    if (infoEvents.includes(eventType)) return 'info';
    return 'debug';
  }

  private displayEvent(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString().substring(11, 23);
    const level = logEntry.level.toUpperCase().padEnd(5);
    
    let color = chalk.gray;
    switch (logEntry.level) {
      case 'error': color = chalk.red; break;
      case 'warn': color = chalk.yellow; break;
      case 'info': color = chalk.blue; break;
      case 'debug': color = chalk.gray; break;
    }

    console.log(color(`[${timestamp}] ${level} ${logEntry.message}`));
    
    if (logEntry.context && this.config.logLevel === 'debug') {
      console.log(chalk.gray('  Context:'), JSON.stringify(logEntry.context, null, 2));
    }
  }

  public startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.log(chalk.yellow('⚠️  Monitoring already active'));
      return;
    }

    this.isMonitoring = true;
    console.log(chalk.green(`🔍 Starting agent monitoring (${intervalMs}ms intervals)`));

    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceMetrics();
      this.checkThresholds();
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log(chalk.yellow('⚠️  Monitoring not active'));
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log(chalk.green('🛑 Agent monitoring stopped'));
  }

  private collectPerformanceMetrics(): void {
    const debugInfo = this.agent.getDebugInfo();
    this.performanceHistory.push(debugInfo.performance);

    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  private checkThresholds(): void {
    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    if (!latest) return;

    const { performanceThresholds } = this.config;

    if (latest.responseTime.average > performanceThresholds.responseTime) {
      console.log(chalk.red(`⚠️  High response time: ${latest.responseTime.average}ms`));
    }

    if (latest.memoryUsage.current > performanceThresholds.memoryUsage) {
      const mb = (latest.memoryUsage.current / 1024 / 1024).toFixed(2);
      console.log(chalk.red(`⚠️  High memory usage: ${mb}MB`));
    }

    if (latest.cpuUsage.current > performanceThresholds.cpuUsage) {
      console.log(chalk.red(`⚠️  High CPU usage: ${latest.cpuUsage.current}%`));
    }
  }

  public displayCurrentState(): void {
    const state = this.agent.getState();
    const metrics = this.agent.getMetrics();

    console.log(chalk.cyan('\n🤖 Agent State Inspection\n'));
    
    // Basic Info
    console.log(chalk.bold('📋 Basic Information:'));
    console.log(`  Agent ID: ${this.agent.id}`);
    console.log(`  Name: ${this.agent.name}`);
    console.log(`  Uptime: ${this.formatUptime(metrics.uptime)}`);
    console.log(`  Status: ${chalk.green('Active')}`);

    // Current Emotion
    console.log(chalk.bold('\n😊 Current Emotion:'));
    console.log(`  Type: ${state.currentEmotion.current}`);
    console.log(`  Intensity: ${state.currentEmotion.intensity.toFixed(2)}`);
    console.log(`  Duration: ${state.currentEmotion.duration}ms`);

    // Memory Stats
    console.log(chalk.bold('\n🧠 Memory Statistics:'));
    console.log(`  Total Records: ${state.memoryStats.totalRecords}`);
    console.log(`  Recent Access: ${state.memoryStats.recentAccess}`);
    console.log(`  Average Importance: ${state.memoryStats.averageImportance.toFixed(2)}`);
    console.log(`  Storage Size: ${this.formatBytes(state.memoryStats.storageSize)}`);

    // Cognition State
    console.log(chalk.bold('\n🧠 Cognition State:'));
    console.log(`  Active Goals: ${state.cognitionState.goals.length}`);
    console.log(`  Current Beliefs: ${state.cognitionState.beliefs.length}`);
    console.log(`  Pending Intentions: ${state.cognitionState.intentions.length}`);
    if (state.cognitionState.currentPlan) {
      console.log(`  Current Plan: ${state.cognitionState.currentPlan.goal}`);
      console.log(`  Plan Status: ${state.cognitionState.currentPlan.status}`);
    }

    // Performance Metrics
    console.log(chalk.bold('\n⚡ Performance Metrics:'));
    console.log(`  Messages Processed: ${metrics.messageCount}`);
    console.log(`  Avg Response Time: ${metrics.averageResponseTime}ms`);
    console.log(`  Memory Usage: ${this.formatBytes(metrics.memoryUsage)}`);
    console.log(`  Emotion Changes: ${metrics.emotionChanges}`);
    console.log(`  Plan Executions: ${metrics.planExecutions}`);
    console.log(`  Error Count: ${metrics.errorCount}`);

    // Active Extensions
    console.log(chalk.bold('\n🔌 Active Extensions:'));
    state.activeExtensions.forEach(ext => {
      console.log(`  • ${ext}`);
    });

    // Recent Messages
    console.log(chalk.bold('\n💬 Recent Messages:'));
    state.lastMessages.slice(-5).forEach(msg => {
      const time = msg.timestamp.toLocaleTimeString();
      console.log(`  [${time}] ${msg.sender}: ${msg.content.substring(0, 50)}...`);
    });
  }

  public displayPerformanceChart(): void {
    if (this.performanceHistory.length === 0) {
      console.log(chalk.yellow('⚠️  No performance data available'));
      return;
    }

    console.log(chalk.cyan('\n📊 Performance Chart (Last 20 samples)\n'));

    const recent = this.performanceHistory.slice(-20);
    const maxResponseTime = Math.max(...recent.map(p => p.responseTime.average));
    const maxMemory = Math.max(...recent.map(p => p.memoryUsage.current));

    console.log(chalk.bold('Response Time (ms):'));
    recent.forEach((perf, i) => {
      const bar = this.createBar(perf.responseTime.average, maxResponseTime, 30);
      console.log(`${i.toString().padStart(2)}: ${bar} ${perf.responseTime.average.toFixed(0)}ms`);
    });

    console.log(chalk.bold('\nMemory Usage (MB):'));
    recent.forEach((perf, i) => {
      const memoryMB = perf.memoryUsage.current / 1024 / 1024;
      const maxMemoryMB = maxMemory / 1024 / 1024;
      const bar = this.createBar(memoryMB, maxMemoryMB, 30);
      console.log(`${i.toString().padStart(2)}: ${bar} ${memoryMB.toFixed(1)}MB`);
    });
  }

  private createBar(value: number, max: number, width: number): string {
    const filled = Math.round((value / max) * width);
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  public displayEventFlow(): void {
    console.log(chalk.cyan('\n🔄 Event Flow Visualization\n'));

    const recentEvents = this.eventLog.slice(-20);
    const eventCounts = new Map<EventType, number>();

    recentEvents.forEach(log => {
      if (log.context?.eventType) {
        const count = eventCounts.get(log.context.eventType) || 0;
        eventCounts.set(log.context.eventType, count + 1);
      }
    });

    console.log(chalk.bold('Event Frequency (Last 20 events):'));
    Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([eventType, count]) => {
        const bar = '█'.repeat(count);
        console.log(`  ${eventType.padEnd(20)}: ${chalk.blue(bar)} (${count})`);
      });

    console.log(chalk.bold('\nRecent Event Timeline:'));
    recentEvents.slice(-10).forEach(log => {
      const time = log.timestamp.toLocaleTimeString();
      const eventType = log.context?.eventType || 'unknown';
      let color = chalk.gray;
      
      switch (log.level) {
        case 'error': color = chalk.red; break;
        case 'warn': color = chalk.yellow; break;
        case 'info': color = chalk.blue; break;
      }

      console.log(`  ${time} ${color('●')} ${eventType}`);
    });
  }

  public exportDebugReport(): string {
    const state = this.agent.getState();
    const metrics = this.agent.getMetrics();
    const debugInfo = this.agent.getDebugInfo();

    const report = {
      timestamp: new Date().toISOString(),
      agent: {
        id: this.agent.id,
        name: this.agent.name,
        uptime: metrics.uptime
      },
      state,
      metrics,
      performance: debugInfo.performance,
      recentEvents: this.eventLog.slice(-50),
      performanceHistory: this.performanceHistory.slice(-20)
    };

    return JSON.stringify(report, null, 2);
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

  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// CLI Debug Interface
export class DebugCLI {
  private debugger: AgentDebugger;

  constructor(agent: Agent) {
    this.debugger = new AgentDebugger(agent);
  }

  async start(): Promise<void> {
    console.log(chalk.cyan('🔍 SYMindX Agent Debugger\n'));
    console.log('Available commands:');
    console.log('  state    - Show current agent state');
    console.log('  perf     - Show performance chart');
    console.log('  events   - Show event flow');
    console.log('  monitor  - Start/stop monitoring');
    console.log('  export   - Export debug report');
    console.log('  help     - Show this help');
    console.log('  exit     - Exit debugger\n');

    // Start monitoring by default
    this.debugger.startMonitoring();

    // Simple command loop (in a real implementation, you'd use a proper CLI library)
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      const command = data.toString().trim();
      this.handleCommand(command);
    });
  }

  private handleCommand(command: string): void {
    switch (command) {
      case 'state':
        this.debugger.displayCurrentState();
        break;
      case 'perf':
        this.debugger.displayPerformanceChart();
        break;
      case 'events':
        this.debugger.displayEventFlow();
        break;
      case 'monitor':
        // Toggle monitoring
        break;
      case 'export':
        const report = this.debugger.exportDebugReport();
        console.log('Debug report exported:');
        console.log(report);
        break;
      case 'help':
        this.start();
        break;
      case 'exit':
        this.debugger.stopMonitoring();
        process.exit(0);
        break;
      default:
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log('Type "help" for available commands');
    }
  }
}