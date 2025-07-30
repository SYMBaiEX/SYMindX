/**
 * Emotion Visualizer
 * Real-time visualization of agent emotional states with graphs and trends
 */

import { EventEmitter } from 'events';
import { AgentDebugState, EmotionState } from '../types/index.js';

export class EmotionVisualizer extends EventEmitter {
  private initialized = false;
  private emotionHistory: Map<string, EmotionHistoryEntry[]> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('😊 Initializing Emotion Visualizer...');
    this.initialized = true;
  }

  async showVisualizer(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    while (true) {
      console.clear();
      console.log(chalk.default.cyan(`😊 Emotion Visualizer - ${agentId}\n`));

      // Show current emotional state
      await this.displayCurrentEmotion(agentId);

      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to visualize?',
          choices: [
            { name: '📊 Real-time Emotion Graph', value: 'graph' },
            { name: '📈 Emotion History Timeline', value: 'timeline' },
            { name: '🎭 Emotion Patterns Analysis', value: 'patterns' },
            { name: '🔍 Emotion Triggers', value: 'triggers' },
            { name: '📉 Intensity Trends', value: 'intensity' },
            { name: '⚖️  Emotion Balance Overview', value: 'balance' },
            { name: '🔄 Auto-refresh View', value: 'auto' },
            { name: '💾 Export Emotion Data', value: 'export' },
            { name: '⬅️  Back', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'graph':
          await this.showEmotionGraph(agentId);
          break;
        case 'timeline':
          await this.showEmotionTimeline(agentId);
          break;
        case 'patterns':
          await this.analyzeEmotionPatterns(agentId);
          break;
        case 'triggers':
          await this.showEmotionTriggers(agentId);
          break;
        case 'intensity':
          await this.showIntensityTrends(agentId);
          break;
        case 'balance':
          await this.showEmotionBalance(agentId);
          break;
        case 'auto':
          await this.startAutoRefresh(agentId);
          break;
        case 'export':
          await this.exportEmotionData(agentId);
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

  private async displayCurrentEmotion(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const emotion = await this.getCurrentEmotion(agentId);

    console.log(chalk.default.green('🎭 Current Emotional State:'));
    console.log(
      `   Primary: ${this.getEmotionEmoji(emotion.current)} ${emotion.current}`
    );
    console.log(
      `   Intensity: ${this.createIntensityBar(emotion.intensity)} ${(emotion.intensity * 100).toFixed(0)}%`
    );

    if (emotion.secondary && emotion.secondary.length > 0) {
      console.log(
        `   Secondary: ${emotion.secondary.map((e) => `${this.getEmotionEmoji(e.emotion)} ${e.emotion} (${(e.intensity * 100).toFixed(0)}%)`).join(', ')}`
      );
    }

    console.log(`   Duration: ${this.formatDuration(emotion.duration || 0)}`);
    console.log(
      `   Stability: ${this.getStabilityIndicator(emotion.stability || 0.5)}`
    );
    console.log();
  }

  private async showEmotionGraph(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(
      chalk.default.cyan(`📊 Real-time Emotion Graph - ${agentId}\n`)
    );

    const history = await this.getEmotionHistory(agentId);

    if (history.length === 0) {
      console.log(chalk.default.yellow('No emotion history available'));
      return;
    }

    // Create ASCII graph
    console.log(chalk.default.blue('Emotion Intensity Over Time:'));
    console.log();

    const maxPoints = 20;
    const recentHistory = history.slice(-maxPoints);
    const maxIntensity = Math.max(...recentHistory.map((h) => h.intensity));

    // Draw graph
    for (let level = 10; level >= 0; level--) {
      const threshold = level / 10;
      let line = `${(threshold * 100).toString().padStart(3)}% │`;

      for (const entry of recentHistory) {
        if (entry.intensity >= threshold) {
          line += this.getEmotionChar(entry.emotion);
        } else {
          line += ' ';
        }
      }

      console.log(line);
    }

    // Draw x-axis
    console.log('     └' + '─'.repeat(recentHistory.length));
    console.log(`      ${this.formatTimeLabels(recentHistory)}`);
    console.log();

    // Legend
    console.log(chalk.default.magenta('Legend:'));
    const uniqueEmotions = [...new Set(recentHistory.map((h) => h.emotion))];
    uniqueEmotions.forEach((emotion) => {
      console.log(
        `   ${this.getEmotionChar(emotion)} ${this.getEmotionEmoji(emotion)} ${emotion}`
      );
    });
    console.log();

    // Statistics
    const avgIntensity =
      recentHistory.reduce((sum, h) => sum + h.intensity, 0) /
      recentHistory.length;
    const mostCommon = this.getMostCommonEmotion(recentHistory);

    console.log(chalk.default.yellow('Statistics:'));
    console.log(`   Average Intensity: ${(avgIntensity * 100).toFixed(1)}%`);
    console.log(
      `   Most Common: ${this.getEmotionEmoji(mostCommon)} ${mostCommon}`
    );
    console.log(`   Emotional Range: ${(maxIntensity * 100).toFixed(0)}%`);
  }

  private async showEmotionTimeline(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`📈 Emotion Timeline - ${agentId}\n`));

    const history = await this.getEmotionHistory(agentId);

    if (history.length === 0) {
      console.log(chalk.default.yellow('No emotion history available'));
      return;
    }

    console.log(chalk.default.blue('Recent Emotional Journey:'));
    console.log();

    // Group by time periods
    const timeGroups = this.groupByTimeWindow(history, 300000); // 5-minute windows

    timeGroups.forEach((group, index) => {
      const startTime = new Date(group[0].timestamp);
      const endTime = new Date(group[group.length - 1].timestamp);
      const duration = endTime.getTime() - startTime.getTime();

      console.log(
        chalk.default.green(
          `⏰ ${this.formatTime(startTime)} - ${this.formatTime(endTime)} (${this.formatDuration(duration)})`
        )
      );

      // Show emotion changes in this period
      const emotionChanges = this.getEmotionChanges(group);
      emotionChanges.forEach((change) => {
        const arrow =
          change.direction === 'increase'
            ? '↗️'
            : change.direction === 'decrease'
              ? '↘️'
              : '→';
        console.log(
          `   ${arrow} ${this.getEmotionEmoji(change.emotion)} ${change.emotion} ${change.description}`
        );
      });

      console.log();
    });

    // Insights
    console.log(chalk.default.magenta('Timeline Insights:'));
    const insights = this.generateTimelineInsights(history);
    insights.forEach((insight) => {
      console.log(`   • ${insight}`);
    });
  }

  private async analyzeEmotionPatterns(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(
      chalk.default.cyan(`🎭 Emotion Patterns Analysis - ${agentId}\n`)
    );

    const history = await this.getEmotionHistory(agentId);

    if (history.length < 5) {
      console.log(
        chalk.default.yellow('Need more emotion history for pattern analysis')
      );
      return;
    }

    // Analyze patterns
    const patterns = await this.detectEmotionPatterns(history);

    console.log(chalk.default.blue('Detected Patterns:'));
    console.log();

    // Cyclical patterns
    if (patterns.cyclical.length > 0) {
      console.log(chalk.default.green('🔄 Cyclical Patterns:'));
      patterns.cyclical.forEach((pattern) => {
        console.log(
          `   • ${pattern.description} (occurs every ${this.formatDuration(pattern.interval)})`
        );
        console.log(
          `     Emotions: ${pattern.emotions.map((e) => `${this.getEmotionEmoji(e)} ${e}`).join(' → ')}`
        );
      });
      console.log();
    }

    // Trigger patterns
    if (patterns.triggers.length > 0) {
      console.log(chalk.default.yellow('⚡ Trigger Patterns:'));
      patterns.triggers.forEach((trigger) => {
        console.log(
          `   • ${trigger.event} → ${this.getEmotionEmoji(trigger.emotion)} ${trigger.emotion}`
        );
        console.log(
          `     Confidence: ${(trigger.confidence * 100).toFixed(0)}% | Occurrences: ${trigger.count}`
        );
      });
      console.log();
    }

    // Emotional transitions
    if (patterns.transitions.length > 0) {
      console.log(chalk.default.magenta('🔀 Common Transitions:'));
      patterns.transitions.forEach((transition) => {
        const strength = '█'.repeat(Math.round(transition.probability * 10));
        console.log(
          `   ${this.getEmotionEmoji(transition.from)} ${transition.from} → ${this.getEmotionEmoji(transition.to)} ${transition.to}`
        );
        console.log(
          `   ${strength} ${(transition.probability * 100).toFixed(0)}% (${transition.count} times)`
        );
      });
      console.log();
    }

    // Stability analysis
    console.log(chalk.default.cyan('📊 Stability Analysis:'));
    console.log(
      `   Overall Stability: ${this.getStabilityIndicator(patterns.stability.overall)}`
    );
    console.log(
      `   Most Stable Emotion: ${this.getEmotionEmoji(patterns.stability.mostStable)} ${patterns.stability.mostStable}`
    );
    console.log(
      `   Most Volatile Emotion: ${this.getEmotionEmoji(patterns.stability.mostVolatile)} ${patterns.stability.mostVolatile}`
    );
    console.log(
      `   Average Duration: ${this.formatDuration(patterns.stability.averageDuration)}`
    );
  }

  private async showEmotionTriggers(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🔍 Emotion Triggers - ${agentId}\n`));

    // Mock trigger analysis - in real implementation, this would analyze actual events
    const triggers = await this.analyzeTriggers(agentId);

    console.log(chalk.default.blue('Identified Triggers:'));
    console.log();

    // Positive triggers
    if (triggers.positive.length > 0) {
      console.log(chalk.default.green('✅ Positive Triggers:'));
      triggers.positive.forEach((trigger) => {
        console.log(`   • ${trigger.event}`);
        console.log(
          `     → ${this.getEmotionEmoji(trigger.resultEmotion)} ${trigger.resultEmotion} (${(trigger.intensity * 100).toFixed(0)}% intensity)`
        );
        console.log(
          `     Frequency: ${trigger.frequency} times | Reliability: ${(trigger.reliability * 100).toFixed(0)}%`
        );
        console.log();
      });
    }

    // Negative triggers
    if (triggers.negative.length > 0) {
      console.log(chalk.default.red('❌ Negative Triggers:'));
      triggers.negative.forEach((trigger) => {
        console.log(`   • ${trigger.event}`);
        console.log(
          `     → ${this.getEmotionEmoji(trigger.resultEmotion)} ${trigger.resultEmotion} (${(trigger.intensity * 100).toFixed(0)}% intensity)`
        );
        console.log(
          `     Frequency: ${trigger.frequency} times | Reliability: ${(trigger.reliability * 100).toFixed(0)}%`
        );
        console.log();
      });
    }

    // Neutral triggers
    if (triggers.neutral.length > 0) {
      console.log(chalk.default.yellow('⚪ Neutral Triggers:'));
      triggers.neutral.forEach((trigger) => {
        console.log(`   • ${trigger.event}`);
        console.log(
          `     → ${this.getEmotionEmoji(trigger.resultEmotion)} ${trigger.resultEmotion} (${(trigger.intensity * 100).toFixed(0)}% intensity)`
        );
        console.log(
          `     Frequency: ${trigger.frequency} times | Reliability: ${(trigger.reliability * 100).toFixed(0)}%`
        );
        console.log();
      });
    }

    // Recommendations
    console.log(chalk.default.magenta('💡 Recommendations:'));
    const recommendations = this.generateTriggerRecommendations(triggers);
    recommendations.forEach((rec) => {
      console.log(`   • ${rec}`);
    });
  }

  private async showIntensityTrends(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`📉 Intensity Trends - ${agentId}\n`));

    const history = await this.getEmotionHistory(agentId);

    if (history.length < 3) {
      console.log(chalk.default.yellow('Need more data for trend analysis'));
      return;
    }

    // Calculate trends
    const trends = this.calculateIntensityTrends(history);

    console.log(chalk.default.blue('Intensity Analysis:'));
    console.log();

    // Overall trend
    const trendIcon =
      trends.overall > 0 ? '📈' : trends.overall < 0 ? '📉' : '➡️';
    const trendDescription =
      trends.overall > 0
        ? 'increasing'
        : trends.overall < 0
          ? 'decreasing'
          : 'stable';

    console.log(
      `${trendIcon} Overall Trend: ${trendDescription} (${(trends.overall * 100).toFixed(1)}% change)`
    );
    console.log();

    // Per-emotion trends
    console.log(chalk.default.green('📊 Trends by Emotion:'));
    Object.entries(trends.byEmotion).forEach(([emotion, trend]) => {
      const trendBar = this.createTrendBar(trend);
      console.log(
        `   ${this.getEmotionEmoji(emotion)} ${emotion.padEnd(12)} ${trendBar} ${(trend * 100).toFixed(1)}%`
      );
    });
    console.log();

    // Intensity distribution
    console.log(chalk.default.magenta('📊 Intensity Distribution:'));
    const distribution = this.calculateIntensityDistribution(history);

    ['Low (0-33%)', 'Medium (34-66%)', 'High (67-100%)'].forEach(
      (range, index) => {
        const percentage = distribution[index];
        const bar = '█'.repeat(Math.round(percentage / 5));
        console.log(`   ${range.padEnd(15)} ${bar} ${percentage.toFixed(0)}%`);
      }
    );
    console.log();

    // Peak analysis
    console.log(chalk.default.yellow('⛰️  Peak Analysis:'));
    const peaks = this.findIntensityPeaks(history);

    if (peaks.length > 0) {
      console.log(
        `   Highest Peak: ${this.getEmotionEmoji(peaks[0].emotion)} ${peaks[0].emotion} at ${(peaks[0].intensity * 100).toFixed(0)}%`
      );
      console.log(`   Peak Count: ${peaks.length} peaks detected`);
      console.log(
        `   Average Peak: ${((peaks.reduce((sum, p) => sum + p.intensity, 0) / peaks.length) * 100).toFixed(0)}%`
      );
    } else {
      console.log(`   No significant peaks detected`);
    }
  }

  private async showEmotionBalance(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(
      chalk.default.cyan(`⚖️  Emotion Balance Overview - ${agentId}\n`)
    );

    const history = await this.getEmotionHistory(agentId);

    if (history.length === 0) {
      console.log(chalk.default.yellow('No emotion data available'));
      return;
    }

    const balance = this.calculateEmotionBalance(history);

    // Emotional spectrum
    console.log(chalk.default.blue('🌈 Emotional Spectrum:'));
    console.log();

    const categories = {
      Positive: ['happy', 'confident', 'proud', 'empathetic'],
      Negative: ['sad', 'angry', 'anxious', 'confused'],
      Neutral: ['neutral', 'curious', 'nostalgic'],
    };

    Object.entries(categories).forEach(([category, emotions]) => {
      const categoryScore = emotions.reduce((sum, emotion) => {
        return sum + (balance.distribution[emotion] || 0);
      }, 0);

      const color =
        category === 'Positive'
          ? 'green'
          : category === 'Negative'
            ? 'red'
            : 'yellow';
      const bar = '█'.repeat(Math.round(categoryScore / 5));

      console.log(
        chalk.default[color](
          `${category.padEnd(10)} ${bar} ${categoryScore.toFixed(1)}%`
        )
      );
    });
    console.log();

    // Balance metrics
    console.log(chalk.default.magenta('📊 Balance Metrics:'));
    console.log(
      `   Emotional Diversity: ${balance.diversity.toFixed(2)} (0-1 scale)`
    );
    console.log(
      `   Stability Index: ${balance.stability.toFixed(2)} (0-1 scale)`
    );
    console.log(
      `   Dominant Emotion: ${this.getEmotionEmoji(balance.dominant)} ${balance.dominant} (${balance.dominantPercentage.toFixed(1)}%)`
    );
    console.log(`   Balance Score: ${balance.score}/100`);
    console.log();

    // Recommendations
    console.log(chalk.default.cyan('💡 Balance Recommendations:'));
    const recommendations = this.generateBalanceRecommendations(balance);
    recommendations.forEach((rec) => {
      console.log(`   • ${rec}`);
    });
  }

  private async startAutoRefresh(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(
      chalk.default.cyan(`🔄 Auto-refresh Emotion View - ${agentId}`)
    );
    console.log(chalk.default.gray('Press Ctrl+C to exit\n'));

    const intervalId = setInterval(async () => {
      // Clear and redraw
      process.stdout.write('\x1B[2J\x1B[0f');
      console.log(
        chalk.default.cyan(`🔄 Auto-refresh Emotion View - ${agentId}`)
      );
      console.log(
        chalk.default.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`)
      );

      await this.displayCurrentEmotion(agentId);
      await this.showMiniGraph(agentId);
    }, 2000);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.default.yellow('\n🔄 Auto-refresh stopped'));
      process.exit(0);
    });

    // Keep running
    await new Promise(() => {});
  }

  async showMiniGraph(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const history = await this.getEmotionHistory(agentId);

    if (history.length < 5) return;

    const recent = history.slice(-10);
    console.log(chalk.default.blue('📊 Recent Trend:'));

    let line = '   ';
    recent.forEach((entry) => {
      line += this.getEmotionChar(entry.emotion);
    });

    console.log(line);
    console.log();
  }

  async exportEmotionHistory(agentId: string): Promise<string> {
    const history = await this.getEmotionHistory(agentId);
    return JSON.stringify(
      {
        agentId,
        exportTime: new Date().toISOString(),
        emotionCount: history.length,
        history,
      },
      null,
      2
    );
  }

  async exportEmotionData(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');
    const fs = await import('fs');

    const { format, includeAnalysis } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: 'JSON (detailed)', value: 'json' },
          { name: 'CSV (spreadsheet)', value: 'csv' },
          { name: 'Text Report', value: 'txt' },
        ],
      },
      {
        type: 'confirm',
        name: 'includeAnalysis',
        message: 'Include analysis and patterns?',
        default: true,
      },
    ]);

    try {
      const data = await this.prepareExportData(agentId, includeAnalysis);
      let content: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          extension = '.json';
          break;
        case 'csv':
          content = this.convertToCSV(data);
          extension = '.csv';
          break;
        case 'txt':
          content = this.convertToTextReport(data);
          extension = '.txt';
          break;
        default:
          throw new Error('Unknown format');
      }

      const filename = `emotion-export-${agentId}-${Date.now()}${extension}`;
      fs.writeFileSync(filename, content);

      console.log(
        chalk.default.green(`✅ Emotion data exported to: ${filename}`)
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
  private async getCurrentEmotion(
    agentId: string
  ): Promise<
    EmotionState & {
      secondary?: Array<{ emotion: string; intensity: number }>;
      duration?: number;
      stability?: number;
    }
  > {
    // Mock implementation - would fetch from runtime
    return {
      current: 'curious',
      intensity: 0.7,
      history: [],
      secondary: [
        { emotion: 'happy', intensity: 0.3 },
        { emotion: 'confident', intensity: 0.2 },
      ],
      duration: 120000, // 2 minutes
      stability: 0.8,
    };
  }

  private async getEmotionHistory(
    agentId: string
  ): Promise<EmotionHistoryEntry[]> {
    // Mock implementation - would fetch from runtime
    const emotions = [
      'happy',
      'sad',
      'curious',
      'confident',
      'neutral',
      'anxious',
    ];
    const history: EmotionHistoryEntry[] = [];

    for (let i = 0; i < 20; i++) {
      history.push({
        emotion: emotions[Math.floor(Math.random() * emotions.length)],
        intensity: 0.3 + Math.random() * 0.7,
        timestamp: new Date(Date.now() - (20 - i) * 300000), // 5 minutes apart
        duration: 60000 + Math.random() * 240000, // 1-5 minutes
        trigger:
          i % 3 === 0
            ? 'user_message'
            : i % 4 === 0
              ? 'system_event'
              : undefined,
      });
    }

    return history;
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

  private getEmotionChar(emotion: string): string {
    const chars = {
      happy: '♥',
      sad: '♦',
      angry: '♠',
      anxious: '♣',
      confident: '★',
      nostalgic: '♪',
      empathetic: '♡',
      curious: '?',
      proud: '!',
      confused: '~',
      neutral: '·',
    };
    return chars[emotion as keyof typeof chars] || '·';
  }

  private createIntensityBar(intensity: number, length: number = 20): string {
    const filled = Math.round(intensity * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private formatTimeLabels(history: EmotionHistoryEntry[]): string {
    const first = this.formatTime(history[0].timestamp);
    const last = this.formatTime(history[history.length - 1].timestamp);
    return `${first}${' '.repeat(Math.max(0, history.length - first.length - last.length))}${last}`;
  }

  private getStabilityIndicator(stability: number): string {
    if (stability > 0.8) return '🟢 Very Stable';
    if (stability > 0.6) return '🟡 Moderately Stable';
    if (stability > 0.4) return '🟠 Somewhat Unstable';
    return '🔴 Highly Volatile';
  }

  private getMostCommonEmotion(history: EmotionHistoryEntry[]): string {
    const counts = history.reduce(
      (acc, entry) => {
        acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts).reduce((a, b) =>
      counts[a[0]] > counts[b[0]] ? a : b
    )[0];
  }

  private groupByTimeWindow(
    history: EmotionHistoryEntry[],
    windowMs: number
  ): EmotionHistoryEntry[][] {
    const groups: EmotionHistoryEntry[][] = [];
    let currentGroup: EmotionHistoryEntry[] = [];
    let windowStart = 0;

    for (const entry of history) {
      if (windowStart === 0) {
        windowStart = entry.timestamp.getTime();
      }

      if (entry.timestamp.getTime() - windowStart <= windowMs) {
        currentGroup.push(entry);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [entry];
        windowStart = entry.timestamp.getTime();
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private getEmotionChanges(
    group: EmotionHistoryEntry[]
  ): Array<{ emotion: string; direction: string; description: string }> {
    if (group.length < 2) return [];

    const changes: Array<{
      emotion: string;
      direction: string;
      description: string;
    }> = [];

    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      const curr = group[i];

      if (prev.emotion !== curr.emotion) {
        changes.push({
          emotion: curr.emotion,
          direction:
            curr.intensity > prev.intensity
              ? 'increase'
              : curr.intensity < prev.intensity
                ? 'decrease'
                : 'same',
          description: `shifted from ${prev.emotion} to ${curr.emotion}`,
        });
      }
    }

    return changes;
  }

  private generateTimelineInsights(history: EmotionHistoryEntry[]): string[] {
    const insights: string[] = [];

    if (history.length === 0) return insights;

    // Most active period
    const hourCounts = history.reduce(
      (acc, entry) => {
        const hour = entry.timestamp.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const mostActiveHour = Object.entries(hourCounts).reduce((a, b) =>
      hourCounts[a[0]] > hourCounts[b[0]] ? a : b
    );
    insights.push(
      `Most emotionally active during ${mostActiveHour[0]}:00 hour`
    );

    // Longest emotion
    const emotionDurations = history.reduce(
      (acc, entry) => {
        acc[entry.emotion] = (acc[entry.emotion] || 0) + (entry.duration || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    const longestEmotion = Object.entries(emotionDurations).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );
    insights.push(`Spent most time in ${longestEmotion[0]} emotion`);

    return insights;
  }

  private async detectEmotionPatterns(history: EmotionHistoryEntry[]): Promise<{
    cyclical: Array<{
      description: string;
      interval: number;
      emotions: string[];
    }>;
    triggers: Array<{
      event: string;
      emotion: string;
      confidence: number;
      count: number;
    }>;
    transitions: Array<{
      from: string;
      to: string;
      probability: number;
      count: number;
    }>;
    stability: {
      overall: number;
      mostStable: string;
      mostVolatile: string;
      averageDuration: number;
    };
  }> {
    // Mock pattern analysis
    return {
      cyclical: [
        {
          description: 'Daily curiosity peak',
          interval: 86400000, // 24 hours
          emotions: ['neutral', 'curious', 'confident', 'neutral'],
        },
      ],
      triggers: [
        {
          event: 'user_message',
          emotion: 'curious',
          confidence: 0.8,
          count: 12,
        },
        {
          event: 'system_error',
          emotion: 'anxious',
          confidence: 0.9,
          count: 3,
        },
      ],
      transitions: [
        { from: 'neutral', to: 'curious', probability: 0.7, count: 8 },
        { from: 'curious', to: 'happy', probability: 0.6, count: 5 },
        { from: 'happy', to: 'confident', probability: 0.5, count: 4 },
      ],
      stability: {
        overall: 0.7,
        mostStable: 'neutral',
        mostVolatile: 'anxious',
        averageDuration: 180000, // 3 minutes
      },
    };
  }

  private async analyzeTriggers(agentId: string): Promise<{
    positive: Array<{
      event: string;
      resultEmotion: string;
      intensity: number;
      frequency: number;
      reliability: number;
    }>;
    negative: Array<{
      event: string;
      resultEmotion: string;
      intensity: number;
      frequency: number;
      reliability: number;
    }>;
    neutral: Array<{
      event: string;
      resultEmotion: string;
      intensity: number;
      frequency: number;
      reliability: number;
    }>;
  }> {
    // Mock trigger analysis
    return {
      positive: [
        {
          event: 'User praise',
          resultEmotion: 'happy',
          intensity: 0.8,
          frequency: 5,
          reliability: 0.9,
        },
        {
          event: 'Task completion',
          resultEmotion: 'proud',
          intensity: 0.7,
          frequency: 8,
          reliability: 0.85,
        },
      ],
      negative: [
        {
          event: 'System error',
          resultEmotion: 'anxious',
          intensity: 0.6,
          frequency: 3,
          reliability: 0.95,
        },
        {
          event: 'User frustration',
          resultEmotion: 'sad',
          intensity: 0.5,
          frequency: 2,
          reliability: 0.8,
        },
      ],
      neutral: [
        {
          event: 'Regular interaction',
          resultEmotion: 'curious',
          intensity: 0.4,
          frequency: 15,
          reliability: 0.7,
        },
        {
          event: 'Idle time',
          resultEmotion: 'neutral',
          intensity: 0.3,
          frequency: 20,
          reliability: 0.9,
        },
      ],
    };
  }

  private generateTriggerRecommendations(triggers: any): string[] {
    const recommendations: string[] = [];

    if (triggers.positive.length > 0) {
      recommendations.push(
        'Encourage positive triggers to maintain emotional well-being'
      );
    }

    if (triggers.negative.length > 2) {
      recommendations.push(
        'Monitor negative triggers and consider implementing coping mechanisms'
      );
    }

    recommendations.push(
      'Track trigger patterns to improve emotional responses'
    );

    return recommendations;
  }

  private calculateIntensityTrends(history: EmotionHistoryEntry[]): {
    overall: number;
    byEmotion: Record<string, number>;
  } {
    if (history.length < 2) return { overall: 0, byEmotion: {} };

    const firstHalf = history.slice(0, Math.floor(history.length / 2));
    const secondHalf = history.slice(Math.floor(history.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, h) => sum + h.intensity, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, h) => sum + h.intensity, 0) / secondHalf.length;

    const overall = (secondAvg - firstAvg) / firstAvg;

    const byEmotion: Record<string, number> = {};
    const emotions = [...new Set(history.map((h) => h.emotion))];

    emotions.forEach((emotion) => {
      const emotionHistory = history.filter((h) => h.emotion === emotion);
      if (emotionHistory.length >= 2) {
        const firstEmotionAvg =
          emotionHistory
            .slice(0, Math.ceil(emotionHistory.length / 2))
            .reduce((sum, h) => sum + h.intensity, 0) /
          Math.ceil(emotionHistory.length / 2);
        const secondEmotionAvg =
          emotionHistory
            .slice(Math.ceil(emotionHistory.length / 2))
            .reduce((sum, h) => sum + h.intensity, 0) /
          (emotionHistory.length - Math.ceil(emotionHistory.length / 2));

        byEmotion[emotion] =
          (secondEmotionAvg - firstEmotionAvg) / firstEmotionAvg;
      }
    });

    return { overall, byEmotion };
  }

  private createTrendBar(trend: number): string {
    const normalizedTrend = Math.max(-1, Math.min(1, trend));
    const position = Math.round((normalizedTrend + 1) * 10);

    let bar = '';
    for (let i = 0; i <= 20; i++) {
      if (i === 10) {
        bar += position === i ? '█' : '│';
      } else if (i === position) {
        bar += '█';
      } else {
        bar += '─';
      }
    }

    return bar;
  }

  private calculateIntensityDistribution(
    history: EmotionHistoryEntry[]
  ): number[] {
    const distribution = [0, 0, 0]; // low, medium, high

    history.forEach((entry) => {
      if (entry.intensity <= 0.33) {
        distribution[0]++;
      } else if (entry.intensity <= 0.66) {
        distribution[1]++;
      } else {
        distribution[2]++;
      }
    });

    const total = history.length;
    return distribution.map((count) => (count / total) * 100);
  }

  private findIntensityPeaks(
    history: EmotionHistoryEntry[]
  ): Array<{ emotion: string; intensity: number; timestamp: Date }> {
    const peaks: Array<{
      emotion: string;
      intensity: number;
      timestamp: Date;
    }> = [];
    const threshold = 0.7; // Consider 70%+ as peaks

    history.forEach((entry) => {
      if (entry.intensity >= threshold) {
        peaks.push({
          emotion: entry.emotion,
          intensity: entry.intensity,
          timestamp: entry.timestamp,
        });
      }
    });

    return peaks.sort((a, b) => b.intensity - a.intensity);
  }

  private calculateEmotionBalance(history: EmotionHistoryEntry[]): {
    distribution: Record<string, number>;
    diversity: number;
    stability: number;
    dominant: string;
    dominantPercentage: number;
    score: number;
  } {
    // Calculate emotion distribution
    const distribution: Record<string, number> = {};
    history.forEach((entry) => {
      distribution[entry.emotion] = (distribution[entry.emotion] || 0) + 1;
    });

    const total = history.length;
    Object.keys(distribution).forEach((emotion) => {
      distribution[emotion] = (distribution[emotion] / total) * 100;
    });

    // Calculate diversity (Shannon entropy)
    const diversity =
      -Object.values(distribution).reduce((sum, percentage) => {
        const p = percentage / 100;
        return sum + (p > 0 ? p * Math.log2(p) : 0);
      }, 0) / Math.log2(Object.keys(distribution).length);

    // Calculate stability
    const intensityVariance =
      history.reduce((sum, entry, index) => {
        if (index === 0) return 0;
        const diff = entry.intensity - history[index - 1].intensity;
        return sum + diff * diff;
      }, 0) /
      (history.length - 1);

    const stability = Math.max(0, 1 - Math.sqrt(intensityVariance));

    // Find dominant emotion
    const dominant = Object.entries(distribution).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );

    // Calculate balance score
    const score = Math.round(
      diversity * 50 + stability * 30 + (Math.min(dominant[1], 40) / 40) * 20
    );

    return {
      distribution,
      diversity,
      stability,
      dominant: dominant[0],
      dominantPercentage: dominant[1],
      score,
    };
  }

  private generateBalanceRecommendations(balance: any): string[] {
    const recommendations: string[] = [];

    if (balance.diversity < 0.5) {
      recommendations.push(
        'Consider exposing the agent to more varied experiences to increase emotional diversity'
      );
    }

    if (balance.stability < 0.4) {
      recommendations.push(
        'High emotional volatility detected - consider implementing stabilization mechanisms'
      );
    }

    if (balance.dominantPercentage > 60) {
      recommendations.push(
        `Agent spends too much time in ${balance.dominant} - encourage more emotional variety`
      );
    }

    if (balance.score > 80) {
      recommendations.push(
        'Excellent emotional balance! Current patterns are healthy and diverse'
      );
    } else if (balance.score < 40) {
      recommendations.push(
        'Emotional balance needs attention - consider adjusting agent parameters'
      );
    }

    return recommendations;
  }

  private async prepareExportData(
    agentId: string,
    includeAnalysis: boolean
  ): Promise<any> {
    const history = await this.getEmotionHistory(agentId);
    const data: any = {
      agentId,
      exportTime: new Date().toISOString(),
      history,
    };

    if (includeAnalysis) {
      data.patterns = await this.detectEmotionPatterns(history);
      data.balance = this.calculateEmotionBalance(history);
      data.trends = this.calculateIntensityTrends(history);
    }

    return data;
  }

  private convertToCSV(data: any): string {
    const lines = ['Timestamp,Emotion,Intensity,Duration,Trigger'];

    data.history.forEach((entry: EmotionHistoryEntry) => {
      lines.push(
        [
          entry.timestamp.toISOString(),
          entry.emotion,
          entry.intensity.toString(),
          (entry.duration || 0).toString(),
          entry.trigger || '',
        ].join(',')
      );
    });

    return lines.join('\n');
  }

  private convertToTextReport(data: any): string {
    const history = data.history as EmotionHistoryEntry[];
    const report = [
      'Emotion Analysis Report',
      `Agent: ${data.agentId}`,
      `Generated: ${data.exportTime}`,
      `Total Records: ${history.length}`,
      '',
      '=== Emotion Distribution ===',
    ];

    // Add distribution
    const distribution = this.calculateEmotionBalance(history).distribution;
    Object.entries(distribution).forEach(([emotion, percentage]) => {
      report.push(`${emotion}: ${percentage.toFixed(1)}%`);
    });

    report.push('', '=== Recent History ===');
    history.slice(-10).forEach((entry, index) => {
      report.push(
        `${index + 1}. ${entry.timestamp.toLocaleString()} - ${entry.emotion} (${(entry.intensity * 100).toFixed(0)}%)`
      );
    });

    return report.join('\n');
  }
}

// Supporting interfaces
interface EmotionHistoryEntry {
  emotion: string;
  intensity: number;
  timestamp: Date;
  duration?: number;
  trigger?: string;
}
