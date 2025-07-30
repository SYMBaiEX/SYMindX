/**
 * Memory Explorer
 * Interactive exploration of agent memory system with search, analysis, and visualization
 */

import { EventEmitter } from 'events';
import { MemoryRecord, MemoryStats } from '../types/index.js';

export class MemoryExplorer extends EventEmitter {
  private initialized = false;
  private searchCache: Map<string, MemoryRecord[]> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🧠 Initializing Memory Explorer...');
    this.initialized = true;
  }

  async exploreMemory(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    while (true) {
      console.clear();
      console.log(chalk.default.cyan(`🧠 Memory Explorer - ${agentId}\n`));

      // Show memory overview
      await this.displayMemoryOverview(agentId);

      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to explore?',
          choices: [
            { name: '🔍 Search Memories', value: 'search' },
            { name: '📊 Memory Statistics', value: 'stats' },
            { name: '🕐 Recent Memories', value: 'recent' },
            { name: '⭐ Important Memories', value: 'important' },
            { name: '🏷️  Memory Categories', value: 'categories' },
            { name: '📈 Memory Usage Trends', value: 'trends' },
            { name: '🔗 Memory Connections', value: 'connections' },
            { name: '🧹 Memory Cleanup Analysis', value: 'cleanup' },
            { name: '💾 Export Memory Data', value: 'export' },
            { name: '⬅️  Back', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'search':
          await this.searchMemories(agentId);
          break;
        case 'stats':
          await this.showMemoryStatistics(agentId);
          break;
        case 'recent':
          await this.showRecentMemories(agentId);
          break;
        case 'important':
          await this.showImportantMemories(agentId);
          break;
        case 'categories':
          await this.showMemoryCategories(agentId);
          break;
        case 'trends':
          await this.showMemoryTrends(agentId);
          break;
        case 'connections':
          await this.showMemoryConnections(agentId);
          break;
        case 'cleanup':
          await this.analyzeMemoryCleanup(agentId);
          break;
        case 'export':
          await this.exportMemoryData(agentId);
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

  private async displayMemoryOverview(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const stats = await this.getMemoryStats(agentId);

    console.log(chalk.default.green('🧠 Memory Overview:'));
    console.log(`   Total Records: ${stats.totalRecords.toLocaleString()}`);
    console.log(`   Memory Usage: ${stats.memoryUsage.toFixed(2)} MB`);
    console.log(`   Provider: ${stats.provider}`);
    console.log(`   Last Cleanup: ${this.formatTimeAgo(stats.lastCleanup)}`);
    console.log(
      `   Health Score: ${this.createHealthBar(stats.healthScore)} ${stats.healthScore}/100`
    );
    console.log();
  }

  private async searchMemories(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🔍 Memory Search - ${agentId}\n`));

    const { searchType } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'searchType',
        message: 'Search type:',
        choices: [
          { name: '🔤 Text Search', value: 'text' },
          { name: '🏷️  Tag Search', value: 'tag' },
          { name: '📅 Date Range', value: 'date' },
          { name: '⭐ Importance Level', value: 'importance' },
          { name: '🔧 Advanced Query', value: 'advanced' },
        ],
      },
    ]);

    let results: MemoryRecord[] = [];

    switch (searchType) {
      case 'text':
        results = await this.performTextSearch(agentId);
        break;
      case 'tag':
        results = await this.performTagSearch(agentId);
        break;
      case 'date':
        results = await this.performDateRangeSearch(agentId);
        break;
      case 'importance':
        results = await this.performImportanceSearch(agentId);
        break;
      case 'advanced':
        results = await this.performAdvancedSearch(agentId);
        break;
    }

    await this.displaySearchResults(results, searchType);
  }

  private async performTextSearch(agentId: string): Promise<MemoryRecord[]> {
    const inquirer = await import('inquirer');

    const { query, caseSensitive } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter search text:',
        validate: (input) => input.length > 0 || 'Please enter a search query',
      },
      {
        type: 'confirm',
        name: 'caseSensitive',
        message: 'Case sensitive search?',
        default: false,
      },
    ]);

    // Check cache first
    const cacheKey = `text:${query}:${caseSensitive}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const memories = await this.getAllMemories(agentId);
    const results = memories.filter((memory) => {
      const content = caseSensitive
        ? memory.content
        : memory.content.toLowerCase();
      const searchQuery = caseSensitive ? query : query.toLowerCase();
      return content.includes(searchQuery);
    });

    this.searchCache.set(cacheKey, results);
    this.emit('memory-searched', {
      agentId,
      query,
      resultCount: results.length,
    });

    return results;
  }

  private async performTagSearch(agentId: string): Promise<MemoryRecord[]> {
    const inquirer = await import('inquirer');

    const availableTags = await this.getAvailableTags(agentId);

    if (availableTags.length === 0) {
      console.log('No tags found in memory records');
      return [];
    }

    const { selectedTags } = await inquirer.default.prompt([
      {
        type: 'checkbox',
        name: 'selectedTags',
        message: 'Select tags to search for:',
        choices: availableTags.map((tag) => ({
          name: `${tag.name} (${tag.count} records)`,
          value: tag.name,
        })),
        validate: (input) =>
          input.length > 0 || 'Please select at least one tag',
      },
    ]);

    const memories = await this.getAllMemories(agentId);
    return memories.filter(
      (memory) =>
        memory.tags && memory.tags.some((tag) => selectedTags.includes(tag))
    );
  }

  private async performDateRangeSearch(
    agentId: string
  ): Promise<MemoryRecord[]> {
    const inquirer = await import('inquirer');

    const { startDate, endDate } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'startDate',
        message: 'Start date (YYYY-MM-DD) or leave empty for no start limit:',
        validate: (input) => {
          if (!input) return true;
          const date = new Date(input);
          return !isNaN(date.getTime()) || 'Please enter a valid date';
        },
      },
      {
        type: 'input',
        name: 'endDate',
        message: 'End date (YYYY-MM-DD) or leave empty for no end limit:',
        validate: (input) => {
          if (!input) return true;
          const date = new Date(input);
          return !isNaN(date.getTime()) || 'Please enter a valid date';
        },
      },
    ]);

    const memories = await this.getAllMemories(agentId);
    return memories.filter((memory) => {
      const memoryDate = memory.timestamp;
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();

      return memoryDate >= start && memoryDate <= end;
    });
  }

  private async performImportanceSearch(
    agentId: string
  ): Promise<MemoryRecord[]> {
    const inquirer = await import('inquirer');

    const { minImportance, maxImportance } = await inquirer.default.prompt([
      {
        type: 'number',
        name: 'minImportance',
        message: 'Minimum importance (0.0 - 1.0):',
        default: 0.5,
        validate: (input) =>
          (input >= 0 && input <= 1) ||
          'Please enter a value between 0.0 and 1.0',
      },
      {
        type: 'number',
        name: 'maxImportance',
        message: 'Maximum importance (0.0 - 1.0):',
        default: 1.0,
        validate: (input) =>
          (input >= 0 && input <= 1) ||
          'Please enter a value between 0.0 and 1.0',
      },
    ]);

    const memories = await this.getAllMemories(agentId);
    return memories.filter(
      (memory) =>
        memory.importance >= minImportance && memory.importance <= maxImportance
    );
  }

  private async performAdvancedSearch(
    agentId: string
  ): Promise<MemoryRecord[]> {
    const inquirer = await import('inquirer');

    const { query } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Advanced query (JSON format):',
        default: '{"content": "user", "importance": {"$gte": 0.5}}',
        validate: (input) => {
          try {
            JSON.parse(input);
            return true;
          } catch {
            return 'Please enter valid JSON';
          }
        },
      },
    ]);

    const queryObj = JSON.parse(query);
    const memories = await this.getAllMemories(agentId);

    return memories.filter((memory) => this.matchesQuery(memory, queryObj));
  }

  private async displaySearchResults(
    results: MemoryRecord[],
    searchType: string
  ): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🔍 Search Results (${searchType})\n`));

    if (results.length === 0) {
      console.log(
        chalk.default.yellow('No memories found matching your criteria')
      );
      return;
    }

    console.log(
      chalk.default.blue(`Found ${results.length} matching memories:\n`)
    );

    const sortedResults = results.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    sortedResults.slice(0, 10).forEach((memory, index) => {
      const importance = '★'.repeat(Math.round(memory.importance * 5));
      const timeAgo = this.formatTimeAgo(memory.timestamp);

      console.log(
        `${index + 1}. ${chalk.default.bold(memory.content.substring(0, 80))}${memory.content.length > 80 ? '...' : ''}`
      );
      console.log(
        `   ${importance} | ${timeAgo} | ${memory.tags?.join(', ') || 'No tags'}`
      );
      console.log();
    });

    if (results.length > 10) {
      console.log(
        chalk.default.gray(`... and ${results.length - 10} more results`)
      );
    }

    // Show search insights
    console.log(chalk.default.magenta('Search Insights:'));
    const avgImportance =
      results.reduce((sum, m) => sum + m.importance, 0) / results.length;
    console.log(`   Average Importance: ${avgImportance.toFixed(2)}`);

    const dateRange = this.getDateRange(results);
    console.log(`   Date Range: ${dateRange}`);

    const commonTags = this.getCommonTags(results);
    if (commonTags.length > 0) {
      console.log(`   Common Tags: ${commonTags.slice(0, 5).join(', ')}`);
    }
  }

  private async showMemoryStatistics(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`📊 Memory Statistics - ${agentId}\n`));

    const stats = await this.getDetailedMemoryStats(agentId);

    // Basic statistics
    console.log(chalk.default.blue('📊 Basic Statistics:'));
    console.log(`   Total Records: ${stats.totalRecords.toLocaleString()}`);
    console.log(`   Total Size: ${stats.totalSize.toFixed(2)} MB`);
    console.log(
      `   Average Record Size: ${stats.averageSize.toFixed(0)} bytes`
    );
    console.log(`   Provider: ${stats.provider}`);
    console.log();

    // Importance distribution
    console.log(chalk.default.green('⭐ Importance Distribution:'));
    const importanceRanges = [
      'Very Low (0-0.2)',
      'Low (0.2-0.4)',
      'Medium (0.4-0.6)',
      'High (0.6-0.8)',
      'Very High (0.8-1.0)',
    ];
    stats.importanceDistribution.forEach((count, index) => {
      const percentage = ((count / stats.totalRecords) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round((count / stats.totalRecords) * 20));
      console.log(
        `   ${importanceRanges[index].padEnd(20)} ${bar} ${percentage}% (${count})`
      );
    });
    console.log();

    // Memory usage over time
    console.log(chalk.default.magenta('📈 Memory Growth:'));
    stats.growthHistory.forEach((point, index) => {
      const date = new Date(
        Date.now() - (stats.growthHistory.length - index - 1) * 86400000
      );
      const bar = this.createMemoryBar(point.records, stats.totalRecords);
      console.log(
        `   ${date.toDateString().substring(4)} ${bar} ${point.records.toLocaleString()} records`
      );
    });
    console.log();

    // Tag statistics
    if (stats.tagStats.length > 0) {
      console.log(chalk.default.yellow('🏷️  Top Tags:'));
      stats.tagStats.slice(0, 10).forEach((tag) => {
        const percentage = ((tag.count / stats.totalRecords) * 100).toFixed(1);
        console.log(
          `   ${tag.name.padEnd(15)} ${tag.count.toString().padStart(5)} records (${percentage}%)`
        );
      });
      console.log();
    }

    // Performance metrics
    console.log(chalk.default.cyan('⚡ Performance Metrics:'));
    console.log(`   Average Query Time: ${stats.avgQueryTime}ms`);
    console.log(`   Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(
      `   Index Efficiency: ${(stats.indexEfficiency * 100).toFixed(1)}%`
    );
    console.log(
      `   Memory Fragmentation: ${(stats.fragmentation * 100).toFixed(1)}%`
    );
  }

  private async showRecentMemories(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🕐 Recent Memories - ${agentId}\n`));

    const recentMemories = await this.getRecentMemories(agentId, 20);

    if (recentMemories.length === 0) {
      console.log(chalk.default.yellow('No recent memories found'));
      return;
    }

    console.log(
      chalk.default.blue(
        `Showing ${recentMemories.length} most recent memories:\n`
      )
    );

    recentMemories.forEach((memory, index) => {
      const importance = '★'.repeat(Math.round(memory.importance * 5));
      const timeAgo = this.formatTimeAgo(memory.timestamp);

      console.log(
        `${(index + 1).toString().padStart(2)}. ${chalk.default.bold(memory.content.substring(0, 100))}${memory.content.length > 100 ? '...' : ''}`
      );
      console.log(`    ${importance} | ${timeAgo}`);

      if (memory.tags && memory.tags.length > 0) {
        console.log(`    Tags: ${memory.tags.join(', ')}`);
      }

      if (memory.context) {
        console.log(
          `    Context: ${memory.context.substring(0, 80)}${memory.context.length > 80 ? '...' : ''}`
        );
      }

      console.log();
    });

    // Memory timeline
    console.log(chalk.default.magenta('📅 Timeline:'));
    const timeline = this.createMemoryTimeline(recentMemories);
    timeline.forEach((period) => {
      console.log(`   ${period.period}: ${period.count} memories`);
    });
  }

  private async showImportantMemories(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`⭐ Important Memories - ${agentId}\n`));

    const importantMemories = await this.getImportantMemories(agentId, 0.7, 15);

    if (importantMemories.length === 0) {
      console.log(chalk.default.yellow('No highly important memories found'));
      return;
    }

    console.log(
      chalk.default.blue(
        `Showing ${importantMemories.length} most important memories:\n`
      )
    );

    importantMemories.forEach((memory, index) => {
      const importance = '★'.repeat(Math.round(memory.importance * 5));
      const timeAgo = this.formatTimeAgo(memory.timestamp);

      console.log(
        `${(index + 1).toString().padStart(2)}. ${chalk.default.bold(memory.content)}`
      );
      console.log(
        `    ${importance} (${(memory.importance * 100).toFixed(0)}%) | ${timeAgo}`
      );

      if (memory.tags && memory.tags.length > 0) {
        console.log(`    Tags: ${memory.tags.join(', ')}`);
      }

      if (memory.context) {
        console.log(`    Context: ${memory.context}`);
      }

      console.log();
    });

    // Importance analysis
    console.log(chalk.default.magenta('📊 Importance Analysis:'));
    const analysis = this.analyzeImportance(importantMemories);
    analysis.forEach((insight) => {
      console.log(`   • ${insight}`);
    });
  }

  private async showMemoryCategories(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🏷️  Memory Categories - ${agentId}\n`));

    const categories = await this.getMemoryCategories(agentId);

    if (categories.length === 0) {
      console.log(chalk.default.yellow('No categories found'));
      return;
    }

    console.log(chalk.default.blue('Memory Categories:\n'));

    categories.forEach((category, index) => {
      const percentage = ((category.count / category.total) * 100).toFixed(1);
      const bar = '█'.repeat(
        Math.round((category.count / category.total) * 20)
      );

      console.log(
        `${(index + 1).toString().padStart(2)}. ${chalk.default.bold(category.name)}`
      );
      console.log(`    ${bar} ${category.count} memories (${percentage}%)`);
      console.log(`    Avg Importance: ${category.avgImportance.toFixed(2)}`);
      console.log(
        `    Recent Activity: ${this.formatTimeAgo(category.lastActivity)}`
      );
      console.log();
    });
  }

  private async showMemoryTrends(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`📈 Memory Usage Trends - ${agentId}\n`));

    const trends = await this.analyzeMemoryTrends(agentId);

    // Growth trend
    console.log(chalk.default.blue('📊 Memory Growth Trend:'));
    const growthIcon =
      trends.growthRate > 0 ? '📈' : trends.growthRate < 0 ? '📉' : '➡️';
    console.log(
      `   ${growthIcon} Growth Rate: ${(trends.growthRate * 100).toFixed(1)}% per day`
    );
    console.log(
      `   📅 Projected Full: ${trends.projectedFull || 'Never (negative growth)'}`
    );
    console.log();

    // Daily activity
    console.log(chalk.default.green('📅 Daily Activity (Last 7 days):'));
    trends.dailyActivity.forEach((day, index) => {
      const date = new Date(Date.now() - (6 - index) * 86400000);
      const bar = '█'.repeat(
        Math.round(
          (day.memories /
            Math.max(...trends.dailyActivity.map((d) => d.memories))) *
            20
        )
      );
      console.log(
        `   ${date.toDateString().substring(0, 10)} ${bar} ${day.memories} memories`
      );
    });
    console.log();

    // Importance trends
    console.log(chalk.default.magenta('⭐ Importance Trends:'));
    console.log(`   Average Importance: ${trends.avgImportance.toFixed(3)}`);
    console.log(
      `   Importance Trend: ${trends.importanceTrend > 0 ? '📈 Increasing' : trends.importanceTrend < 0 ? '📉 Decreasing' : '➡️ Stable'}`
    );
    console.log(
      `   High Importance Rate: ${(trends.highImportanceRate * 100).toFixed(1)}%`
    );
    console.log();

    // Usage patterns
    console.log(chalk.default.yellow('🕐 Usage Patterns:'));
    trends.hourlyActivity.forEach((hour, index) => {
      if (hour.count > 0) {
        const bar = '█'.repeat(
          Math.round(
            (hour.count /
              Math.max(...trends.hourlyActivity.map((h) => h.count))) *
              10
          )
        );
        console.log(
          `   ${index.toString().padStart(2)}:00 ${bar} ${hour.count} memories`
        );
      }
    });
  }

  private async showMemoryConnections(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan(`🔗 Memory Connections - ${agentId}\n`));

    const connections = await this.analyzeMemoryConnections(agentId);

    // Semantic clusters
    if (connections.clusters.length > 0) {
      console.log(chalk.default.blue('🧠 Semantic Clusters:'));
      connections.clusters.forEach((cluster, index) => {
        console.log(
          `   ${(index + 1).toString().padStart(2)}. ${chalk.default.bold(cluster.theme)} (${cluster.memories.length} memories)`
        );
        console.log(`       Keywords: ${cluster.keywords.join(', ')}`);
        console.log(
          `       Avg Importance: ${cluster.avgImportance.toFixed(2)}`
        );
        console.log();
      });
    }

    // Related memories
    if (connections.strongConnections.length > 0) {
      console.log(chalk.default.green('🔗 Strong Connections:'));
      connections.strongConnections.forEach((conn, index) => {
        console.log(
          `   ${(index + 1).toString().padStart(2)}. ${conn.memory1.content.substring(0, 40)}...`
        );
        console.log(`       ↔️  ${conn.memory2.content.substring(0, 40)}...`);
        console.log(
          `       Similarity: ${(conn.similarity * 100).toFixed(0)}%`
        );
        console.log();
      });
    }

    // Network analysis
    console.log(chalk.default.magenta('📊 Network Analysis:'));
    console.log(`   Total Nodes: ${connections.totalNodes}`);
    console.log(`   Total Connections: ${connections.totalConnections}`);
    console.log(
      `   Average Connections per Memory: ${connections.avgConnections.toFixed(1)}`
    );
    console.log(
      `   Most Connected: "${connections.mostConnected?.content.substring(0, 50)}..."`
    );
    console.log(`   Isolated Memories: ${connections.isolated}`);
  }

  private async analyzeMemoryCleanup(agentId: string): Promise<void> {
    const chalk = await import('chalk');

    console.clear();
    console.log(
      chalk.default.cyan(`🧹 Memory Cleanup Analysis - ${agentId}\n`)
    );

    const analysis = await this.performCleanupAnalysis(agentId);

    // Cleanup recommendations
    console.log(chalk.default.blue('🎯 Cleanup Recommendations:'));
    analysis.recommendations.forEach((rec, index) => {
      const impactIcon =
        rec.impact === 'high' ? '🔴' : rec.impact === 'medium' ? '🟡' : '🟢';
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${impactIcon} ${rec.description}`
      );
      console.log(
        `       Impact: ${rec.impact} | Space Saved: ${rec.spaceSaved.toFixed(1)} MB`
      );
      console.log(`       Records Affected: ${rec.recordsAffected}`);
      console.log();
    });

    // Duplicate analysis
    if (analysis.duplicates.length > 0) {
      console.log(chalk.default.yellow('🔄 Duplicate Analysis:'));
      console.log(`   Found ${analysis.duplicates.length} duplicate groups`);
      console.log(
        `   Total Duplicates: ${analysis.duplicates.reduce((sum, group) => sum + group.memories.length - 1, 0)}`
      );
      console.log(`   Space Wasted: ${analysis.duplicateSpace.toFixed(2)} MB`);
      console.log();
    }

    // Age analysis
    console.log(chalk.default.magenta('📅 Age Analysis:'));
    analysis.ageGroups.forEach((group) => {
      const percentage = ((group.count / analysis.totalRecords) * 100).toFixed(
        1
      );
      console.log(
        `   ${group.period}: ${group.count} memories (${percentage}%)`
      );
    });
    console.log();

    // Orphaned memories
    if (analysis.orphaned > 0) {
      console.log(chalk.default.red('🏝️  Orphaned Memories:'));
      console.log(`   Found ${analysis.orphaned} memories with no connections`);
      console.log(`   These might be candidates for removal`);
      console.log();
    }

    // Overall health
    console.log(chalk.default.cyan('💚 Memory Health Score:'));
    const healthBar = this.createHealthBar(analysis.healthScore);
    console.log(`   ${healthBar} ${analysis.healthScore}/100`);

    if (analysis.healthScore < 70) {
      console.log(chalk.default.red('   ⚠️  Memory system needs attention'));
    } else if (analysis.healthScore > 85) {
      console.log(chalk.default.green('   ✅ Memory system is healthy'));
    }
  }

  async showMemoryStats(agentId: string): Promise<void> {
    const chalk = await import('chalk');
    const stats = await this.getMemoryStats(agentId);

    console.log(chalk.default.blue('💾 Memory Quick Stats:'));
    console.log(`   Records: ${stats.totalRecords.toLocaleString()}`);
    console.log(`   Usage: ${stats.memoryUsage.toFixed(1)} MB`);
    console.log(
      `   Health: ${this.createHealthBar(stats.healthScore, 10)} ${stats.healthScore}/100`
    );
    console.log();
  }

  async exportMemoryData(agentId: string): Promise<string> {
    const memories = await this.getAllMemories(agentId);
    return JSON.stringify(
      {
        agentId,
        exportTime: new Date().toISOString(),
        totalRecords: memories.length,
        memories,
      },
      null,
      2
    );
  }

  private async exportMemoryData(agentId: string): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');
    const fs = await import('fs');

    const { format, filter, includeContent } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: [
          { name: 'JSON (complete)', value: 'json' },
          { name: 'CSV (spreadsheet)', value: 'csv' },
          { name: 'Text Summary', value: 'txt' },
          { name: 'Database Backup', value: 'backup' },
        ],
      },
      {
        type: 'list',
        name: 'filter',
        message: 'Export filter:',
        choices: [
          { name: 'All memories', value: 'all' },
          { name: 'Important only (>0.7)', value: 'important' },
          { name: 'Recent (last 30 days)', value: 'recent' },
          { name: 'Custom filter', value: 'custom' },
        ],
      },
      {
        type: 'confirm',
        name: 'includeContent',
        message: 'Include full content?',
        default: true,
      },
    ]);

    try {
      const data = await this.prepareExportData(
        agentId,
        filter,
        includeContent
      );
      let content: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          extension = '.json';
          break;
        case 'csv':
          content = this.convertMemoryToCSV(data);
          extension = '.csv';
          break;
        case 'txt':
          content = this.convertMemoryToText(data);
          extension = '.txt';
          break;
        case 'backup':
          content = this.createMemoryBackup(data);
          extension = '.backup';
          break;
        default:
          throw new Error('Unknown format');
      }

      const filename = `memory-export-${agentId}-${Date.now()}${extension}`;
      fs.writeFileSync(filename, content);

      console.log(
        chalk.default.green(`✅ Memory data exported to: ${filename}`)
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
  private async getMemoryStats(agentId: string): Promise<MemoryStats> {
    // Mock implementation - would fetch from actual memory provider
    return {
      totalRecords: 1247,
      memoryUsage: 8.3,
      provider: 'sqlite',
      lastCleanup: new Date(Date.now() - 172800000), // 2 days ago
      healthScore: 87,
    };
  }

  private async getAllMemories(agentId: string): Promise<MemoryRecord[]> {
    // Mock implementation - would fetch from actual memory provider
    const memories: MemoryRecord[] = [];
    const topics = [
      'user interaction',
      'system status',
      'learning event',
      'error occurred',
      'task completed',
    ];
    const tags = [
      'user',
      'system',
      'error',
      'success',
      'learning',
      'conversation',
    ];

    for (let i = 0; i < 50; i++) {
      memories.push({
        id: `mem-${i}`,
        content: `${topics[Math.floor(Math.random() * topics.length)]} - memory record ${i}`,
        timestamp: new Date(Date.now() - Math.random() * 2592000000), // Random within last 30 days
        importance: Math.random(),
        tags: [
          tags[Math.floor(Math.random() * tags.length)],
          tags[Math.floor(Math.random() * tags.length)],
        ],
        context: `Context information for memory ${i}`,
      });
    }

    return memories;
  }

  private matchesQuery(memory: MemoryRecord, query: any): boolean {
    // Simple query matching implementation
    for (const [key, value] of Object.entries(query)) {
      if (key === 'content') {
        if (
          !memory.content
            .toLowerCase()
            .includes((value as string).toLowerCase())
        ) {
          return false;
        }
      } else if (key === 'importance') {
        if (typeof value === 'object' && value !== null) {
          const importanceQuery = value as any;
          if (importanceQuery.$gte && memory.importance < importanceQuery.$gte)
            return false;
          if (importanceQuery.$lte && memory.importance > importanceQuery.$lte)
            return false;
        } else if (memory.importance !== value) {
          return false;
        }
      }
    }
    return true;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  private createHealthBar(score: number, length: number = 20): string {
    const filled = Math.round((score / 100) * length);
    const empty = length - filled;
    const color = score > 80 ? '🟢' : score > 60 ? '🟡' : '🔴';
    return color + '█'.repeat(filled) + '░'.repeat(empty);
  }

  private createMemoryBar(
    current: number,
    max: number,
    length: number = 20
  ): string {
    const filled = Math.round((current / max) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getDateRange(memories: MemoryRecord[]): string {
    if (memories.length === 0) return 'No memories';

    const dates = memories
      .map((m) => m.timestamp)
      .sort((a, b) => a.getTime() - b.getTime());
    const earliest = dates[0];
    const latest = dates[dates.length - 1];

    return `${earliest.toDateString()} - ${latest.toDateString()}`;
  }

  private getCommonTags(memories: MemoryRecord[]): string[] {
    const tagCounts: Record<string, number> = {};

    memories.forEach((memory) => {
      memory.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag]) => tag);
  }

  private async getAvailableTags(
    agentId: string
  ): Promise<Array<{ name: string; count: number }>> {
    const memories = await this.getAllMemories(agentId);
    const tagCounts: Record<string, number> = {};

    memories.forEach((memory) => {
      memory.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async getDetailedMemoryStats(agentId: string): Promise<any> {
    const memories = await this.getAllMemories(agentId);

    return {
      totalRecords: memories.length,
      totalSize: memories.length * 0.15, // Mock calculation
      averageSize: 150,
      provider: 'sqlite',
      importanceDistribution: [10, 15, 20, 35, 20], // Mock distribution
      growthHistory: Array(7)
        .fill(0)
        .map((_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000),
          records: Math.floor(memories.length * (0.7 + i * 0.05)),
        })),
      tagStats: await this.getAvailableTags(agentId),
      avgQueryTime: 25,
      cacheHitRate: 0.85,
      indexEfficiency: 0.93,
      fragmentation: 0.12,
    };
  }

  private async getRecentMemories(
    agentId: string,
    limit: number
  ): Promise<MemoryRecord[]> {
    const memories = await this.getAllMemories(agentId);
    return memories
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private async getImportantMemories(
    agentId: string,
    minImportance: number,
    limit: number
  ): Promise<MemoryRecord[]> {
    const memories = await this.getAllMemories(agentId);
    return memories
      .filter((m) => m.importance >= minImportance)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  private createMemoryTimeline(
    memories: MemoryRecord[]
  ): Array<{ period: string; count: number }> {
    const periods = [
      'Last hour',
      'Last 6 hours',
      'Last day',
      'Last week',
      'Older',
    ];
    const now = Date.now();
    const timeline = periods.map((period) => ({ period, count: 0 }));

    memories.forEach((memory) => {
      const age = now - memory.timestamp.getTime();
      if (age < 3600000)
        timeline[0].count++; // 1 hour
      else if (age < 21600000)
        timeline[1].count++; // 6 hours
      else if (age < 86400000)
        timeline[2].count++; // 1 day
      else if (age < 604800000)
        timeline[3].count++; // 1 week
      else timeline[4].count++;
    });

    return timeline;
  }

  private analyzeImportance(memories: MemoryRecord[]): string[] {
    const insights: string[] = [];
    const avgImportance =
      memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;

    insights.push(`Average importance: ${avgImportance.toFixed(2)}`);

    const highImportance = memories.filter((m) => m.importance > 0.8).length;
    insights.push(`${highImportance} memories are critically important`);

    const recentHigh = memories.filter((m) => {
      const isRecent = Date.now() - m.timestamp.getTime() < 86400000; // 24 hours
      return isRecent && m.importance > 0.7;
    }).length;

    if (recentHigh > 0) {
      insights.push(
        `${recentHigh} high-importance memories from last 24 hours`
      );
    }

    return insights;
  }

  private async getMemoryCategories(agentId: string): Promise<
    Array<{
      name: string;
      count: number;
      total: number;
      avgImportance: number;
      lastActivity: Date;
    }>
  > {
    const memories = await this.getAllMemories(agentId);
    const categories: Record<string, MemoryRecord[]> = {};

    // Group by first tag
    memories.forEach((memory) => {
      const category = memory.tags?.[0] || 'untagged';
      if (!categories[category]) categories[category] = [];
      categories[category].push(memory);
    });

    return Object.entries(categories)
      .map(([name, mems]) => ({
        name,
        count: mems.length,
        total: memories.length,
        avgImportance:
          mems.reduce((sum, m) => sum + m.importance, 0) / mems.length,
        lastActivity: new Date(
          Math.max(...mems.map((m) => m.timestamp.getTime()))
        ),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async analyzeMemoryTrends(agentId: string): Promise<any> {
    const memories = await this.getAllMemories(agentId);

    // Mock trend analysis
    return {
      growthRate: 0.05, // 5% per day
      projectedFull: 'Never',
      dailyActivity: Array(7)
        .fill(0)
        .map((_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000),
          memories: Math.floor(Math.random() * 20) + 5,
        })),
      avgImportance:
        memories.reduce((sum, m) => sum + m.importance, 0) / memories.length,
      importanceTrend: 0.02,
      highImportanceRate:
        memories.filter((m) => m.importance > 0.7).length / memories.length,
      hourlyActivity: Array(24)
        .fill(0)
        .map((_, hour) => ({
          hour,
          count: Math.floor(Math.random() * 10),
        })),
    };
  }

  private async analyzeMemoryConnections(agentId: string): Promise<any> {
    const memories = await this.getAllMemories(agentId);

    // Mock connection analysis
    return {
      clusters: [
        {
          theme: 'User Interactions',
          memories: memories.slice(0, 10),
          keywords: ['user', 'message', 'response'],
          avgImportance: 0.7,
        },
        {
          theme: 'System Events',
          memories: memories.slice(10, 20),
          keywords: ['system', 'event', 'status'],
          avgImportance: 0.5,
        },
      ],
      strongConnections: [
        {
          memory1: memories[0],
          memory2: memories[1],
          similarity: 0.85,
        },
      ],
      totalNodes: memories.length,
      totalConnections: Math.floor(memories.length * 1.5),
      avgConnections: 1.5,
      mostConnected: memories[0],
      isolated: Math.floor(memories.length * 0.1),
    };
  }

  private async performCleanupAnalysis(agentId: string): Promise<any> {
    const memories = await this.getAllMemories(agentId);

    return {
      recommendations: [
        {
          description: 'Remove low-importance memories older than 90 days',
          impact: 'low',
          spaceSaved: 1.2,
          recordsAffected: 15,
        },
        {
          description: 'Archive duplicate memories',
          impact: 'medium',
          spaceSaved: 0.8,
          recordsAffected: 8,
        },
      ],
      duplicates: [],
      duplicateSpace: 0.8,
      ageGroups: [
        { period: 'Last 24 hours', count: 5 },
        { period: 'Last week', count: 15 },
        { period: 'Last month', count: 20 },
        { period: 'Older', count: 10 },
      ],
      orphaned: 3,
      totalRecords: memories.length,
      healthScore: 87,
    };
  }

  private async prepareExportData(
    agentId: string,
    filter: string,
    includeContent: boolean
  ): Promise<any> {
    let memories = await this.getAllMemories(agentId);

    // Apply filter
    switch (filter) {
      case 'important':
        memories = memories.filter((m) => m.importance > 0.7);
        break;
      case 'recent':
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        memories = memories.filter((m) => m.timestamp > thirtyDaysAgo);
        break;
    }

    return {
      agentId,
      exportTime: new Date().toISOString(),
      filter,
      totalRecords: memories.length,
      memories: includeContent
        ? memories
        : memories.map((m) => ({
            id: m.id,
            timestamp: m.timestamp,
            importance: m.importance,
            tags: m.tags,
          })),
    };
  }

  private convertMemoryToCSV(data: any): string {
    const headers = ['ID', 'Timestamp', 'Content', 'Importance', 'Tags'];
    const lines = [headers.join(',')];

    data.memories.forEach((memory: MemoryRecord) => {
      lines.push(
        [
          memory.id,
          memory.timestamp.toISOString(),
          `"${memory.content?.replace(/"/g, '""') || ''}"`,
          memory.importance.toString(),
          `"${memory.tags?.join('; ') || ''}"`,
        ].join(',')
      );
    });

    return lines.join('\n');
  }

  private convertMemoryToText(data: any): string {
    const lines = [
      'Memory Export Report',
      `Agent: ${data.agentId}`,
      `Generated: ${data.exportTime}`,
      `Filter: ${data.filter}`,
      `Total Records: ${data.totalRecords}`,
      '',
      '=== Memories ===',
    ];

    data.memories.forEach((memory: MemoryRecord, index: number) => {
      lines.push(`${index + 1}. ${memory.content}`);
      lines.push(`   Time: ${memory.timestamp.toLocaleString()}`);
      lines.push(`   Importance: ${(memory.importance * 100).toFixed(0)}%`);
      if (memory.tags?.length) {
        lines.push(`   Tags: ${memory.tags.join(', ')}`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }

  private createMemoryBackup(data: any): string {
    return JSON.stringify(
      {
        version: '1.0',
        backupTime: new Date().toISOString(),
        ...data,
      },
      null,
      2
    );
  }
}
