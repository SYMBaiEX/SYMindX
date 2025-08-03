/**
 * Economic Management Skill
 * Handles trading, market analysis, and wealth optimization
 */

import { v4 as uuidv4 } from 'uuid';
import { runtimeLogger } from '../../../utils/logger';
import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { ActionType, GameState, GrandExchangeOffer } from '../types';
import { BaseRuneLiteSkill, RuneLiteSkillConfig } from './base-runelite-skill';
import {
  EconomicManagementConfig,
  EconomicOpportunity,
  ActivityMetrics,
  AutonomousActivity,
  SkillName
} from './types';

export interface EconomicManagerConfig extends RuneLiteSkillConfig {
  strategy: 'trading' | 'flipping' | 'investing';
  budget: number;
  riskLevel: 'low' | 'medium' | 'high';
  targetProfit?: number; // percentage
  timeHorizon?: number; // in hours
  autoTrade: boolean;
  maxConcurrentTrades: number;
}

export interface MarketData {
  itemId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  volume: number;
  volatility: number;
  trend: 'rising' | 'falling' | 'stable';
  lastUpdated: number;
}

export interface TradeRecord {
  id: string;
  itemId: number;
  itemName: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: number;
  profit?: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export class EconomicManagerSkill extends BaseRuneLiteSkill {
  private gameState: GameState;
  protected override config: EconomicManagerConfig;
  private priceHistory = new Map<number, number[]>();
  private activeOffers = new Map<string, GrandExchangeOffer>();
  private tradeHistory: TradeRecord[] = [];

  constructor(config: EconomicManagerConfig, gameState: GameState) {
    super(config);
    this.config = config;
    this.gameState = gameState;
    this.initializePriceData();
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'startTrading',
        'Begin automated trading based on configured strategy',
        ActionCategory.AUTONOMOUS,
        {
          strategy: { type: 'string', description: 'Trading strategy: trading, flipping, or investing', optional: true },
          budget: { type: 'number', description: 'Budget allocation for trading', optional: true },
          timeLimit: { type: 'number', description: 'Time limit in minutes', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.startTradingSession(params.strategy, params.budget, params.timeLimit);
        }
      ),

      this.createAction(
        'getMarketPrices',
        'Get current market prices for specified items',
        ActionCategory.OBSERVATION,
        {
          itemIds: { type: 'array', description: 'Array of item IDs to check prices for', optional: true },
          itemNames: { type: 'array', description: 'Array of item names to check prices for', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.getMarketPrices(params.itemIds, params.itemNames);
        }
      ),

      this.createAction(
        'analyzeProfitability',
        'Analyze trading opportunities and profit potential',
        ActionCategory.OBSERVATION,
        {
          strategy: { type: 'string', description: 'Analysis strategy: flip, long-term, or arbitrage', optional: true },
          riskLevel: { type: 'string', description: 'Risk tolerance: low, medium, or high', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.analyzeProfitability(params.strategy, params.riskLevel);
        }
      ),

      this.createAction(
        'executeTrade',
        'Execute a specific buy or sell order',
        ActionCategory.AUTONOMOUS,
        {
          type: { type: 'string', description: 'Trade type: buy or sell' },
          itemId: { type: 'number', description: 'Item ID to trade' },
          quantity: { type: 'number', description: 'Quantity to trade' },
          price: { type: 'number', description: 'Price per item' },
          maxWait: { type: 'number', description: 'Maximum wait time in minutes', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.executeTrade(params.type, params.itemId, params.quantity, params.price, params.maxWait);
        }
      ),

      this.createAction(
        'manageMerchant',
        'Manage merchant operations and inventory',
        ActionCategory.AUTONOMOUS,
        {
          mode: { type: 'string', description: 'Management mode: restock, diversify, or liquidate' },
          targetItems: { type: 'array', description: 'Target items for management', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.manageMerchant(params.mode, params.targetItems);
        }
      ),

      this.createAction(
        'analyzeMarket',
        'Perform comprehensive market analysis',
        ActionCategory.OBSERVATION,
        {
          category: { type: 'string', description: 'Item category to analyze', optional: true },
          timeFrame: { type: 'number', description: 'Time frame for analysis in hours', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.analyzeMarket(params.category, params.timeFrame);
        }
      ),

      this.createAction(
        'getTradingStats',
        'Get trading performance statistics',
        ActionCategory.OBSERVATION,
        {
          period: { type: 'string', description: 'Time period: day, week, month, or all', optional: true }
        },
        async (agent: Agent, params: any) => {
          return this.getTradingStats(params.period);
        }
      ),

      this.createAction(
        'updateConfig',
        'Update economic manager configuration',
        ActionCategory.SYSTEM,
        {
          config: { type: 'object', description: 'Configuration updates' }
        },
        async (agent: Agent, params: any) => {
          this.updateConfiguration(params.config);
          return { success: true, message: 'Configuration updated successfully' };
        }
      )
    ];
  }

  private initializePriceData(): void {
    // Initialize with common trading items and their typical prices
    const commonItems = [
      { id: 554, name: 'Fire rune', price: 5 },
      { id: 555, name: 'Water rune', price: 5 },
      { id: 556, name: 'Air rune', price: 5 },
      { id: 557, name: 'Earth rune', price: 5 },
      { id: 1511, name: 'Logs', price: 50 },
      { id: 1513, name: 'Magic logs', price: 1000 },
      { id: 440, name: 'Iron ore', price: 150 },
      { id: 453, name: 'Coal', price: 180 },
      { id: 2357, name: 'Gold bar', price: 300 },
      { id: 371, name: 'Tuna', price: 100 },
      { id: 373, name: 'Swordfish', price: 300 },
      { id: 385, name: 'Shark', price: 800 }
    ];

    for (const item of commonItems) {
      // Initialize with some price history
      const basePrice = item.price;
      const history = [];
      for (let i = 0; i < 100; i++) {
        const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
        history.push(Math.floor(basePrice * (1 + variance)));
      }
      this.priceHistory.set(item.id, history);
    }

    runtimeLogger.info('💰 Economic price data initialized');
  }

  async startTradingSession(strategy?: string, budget?: number, timeLimit?: number): Promise<{ sessionId: string; message: string }> {
    const sessionId = uuidv4();
    const tradingStrategy = strategy || this.config.strategy;
    const tradingBudget = budget || this.config.budget;
    
    runtimeLogger.info(`💰 Starting trading session: ${tradingStrategy} with budget ${tradingBudget}gp`);

    // Start trading loop based on strategy
    this.executeTradingStrategy(sessionId, tradingStrategy, tradingBudget, timeLimit);

    return {
      sessionId,
      message: `Trading session started with ${tradingStrategy} strategy`
    };
  }

  async startEconomicManagement(config: EconomicManagementConfig): Promise<AutonomousActivity> {
    const sessionId = uuidv4();
    const session = await this.startTradingSession(config.strategy, config.budget, config.timeHorizon);
    
    const activity: AutonomousActivity = {
      id: sessionId,
      type: 'economic_management',
      status: 'running',
      config,
      startTime: Date.now(),
      progress: 0,
      metrics: {
        actionsPerformed: 0,
        experienceGained: {} as Record<SkillName, number>,
        goldEarned: 0,
        timeElapsed: 0,
        efficiency: 0,
        successRate: 0,
        itemsGained: {},
        itemsLost: {},
      },
      errors: [],
      checkpoints: [],
    };

    return activity;
  }

  private async executeTradingStrategy(sessionId: string, strategy: string, budget: number, timeLimit?: number): Promise<void> {
    const startTime = Date.now();
    
    while (true) {
      try {
        // Check time limit
        if (timeLimit && (Date.now() - startTime) > timeLimit * 60 * 1000) {
          runtimeLogger.info(`⏰ Trading session ${sessionId} completed (time limit reached)`);
          break;
        }

        // Execute strategy
        switch (strategy) {
          case 'trading':
            await this.executeLongTermTrading(budget);
            break;
          case 'flipping':
            await this.executeFlipping(budget);
            break;
          case 'investing':
            await this.executeInvesting(budget);
            break;
        }

        // Wait before next iteration
        await this.randomDelay(30000, 60000); // 30-60 seconds

      } catch (error) {
        runtimeLogger.error(`Trading strategy error: ${error}`);
        await this.randomDelay(10000, 15000);
      }
    }
  }

  private async executeLongTermTrading(budget: number): Promise<void> {
    const opportunities = this.findTradingOpportunities();
    
    for (const opportunity of opportunities.slice(0, 3)) {
      const investAmount = Math.min(budget * 0.3, opportunity.buyPrice * opportunity.volume);
      
      if (investAmount < opportunity.buyPrice) continue;

      const quantity = Math.floor(investAmount / opportunity.buyPrice);
      
      // Execute buy order
      await this.placeBuyOrder(opportunity.itemId, quantity, opportunity.buyPrice);
      
      // Wait and then sell
      await this.randomDelay(60000, 120000);
      await this.placeSellOrder(opportunity.itemId, quantity, opportunity.sellPrice);
    }
  }

  private async executeFlipping(budget: number): Promise<void> {
    const flippingItems = this.findFlippingOpportunities();
    
    for (const item of flippingItems.slice(0, 5)) {
      const currentPrice = this.getCurrentPrice(item.itemId);
      const avgPrice = this.getAveragePrice(item.itemId, 24);
      
      // Buy if price is below average
      if (currentPrice < avgPrice * 0.95) {
        const quantity = Math.floor((budget * 0.2) / currentPrice);
        await this.placeBuyOrder(item.itemId, quantity, currentPrice);
      }
      
      // Sell if we have the item and price is above average
      if (this.hasItem(item.itemId) && currentPrice > avgPrice * 1.05) {
        const quantity = this.getItemQuantity(item.itemId);
        await this.placeSellOrder(item.itemId, quantity, currentPrice);
      }
    }
  }

  private async executeInvesting(budget: number): Promise<void> {
    const investments = this.findInvestmentOpportunities();
    
    for (const investment of investments.slice(0, 2)) {
      const investAmount = budget * 0.4;
      const quantity = Math.floor(investAmount / investment.buyPrice);
      
      await this.placeBuyOrder(investment.itemId, quantity, investment.buyPrice);
      runtimeLogger.info(`💎 Long-term investment made: ${investment.itemName} x${quantity}`);
    }
  }

  private findTradingOpportunities(): EconomicOpportunity[] {
    const opportunities: EconomicOpportunity[] = [];
    
    for (const [itemId, priceHistory] of this.priceHistory.entries()) {
      if (priceHistory.length < 10) continue;

      const currentPrice = priceHistory[priceHistory.length - 1];
      if (!currentPrice) continue;
      
      const avgPrice = priceHistory.slice(-24).reduce((a, b) => a + b, 0) / 24;
      const volatility = this.calculateVolatility(priceHistory.slice(-24));
      
      const buyPrice = currentPrice;
      const sellPrice = avgPrice * 1.1;
      const profit = sellPrice - buyPrice;
      const profitMargin = (profit / buyPrice) * 100;
      
      if (profitMargin > 5) {
        opportunities.push({
          type: 'flip',
          itemId,
          itemName: this.getItemName(itemId),
          buyPrice,
          sellPrice,
          profit,
          profitMargin,
          volume: Math.floor(Math.random() * 1000) + 100,
          riskLevel: this.assessRisk(volatility),
          timeToComplete: 60,
          confidence: 0.8,
          marketTrend: 'stable'
        });
      }
    }

    return opportunities.sort((a, b) => b.profitMargin - a.profitMargin);
  }

  private findFlippingOpportunities(): EconomicOpportunity[] {
    return this.findTradingOpportunities().filter(opp => 
      opp.profitMargin > 3 && opp.profitMargin < 15
    );
  }

  private findInvestmentOpportunities(): EconomicOpportunity[] {
    const investments: EconomicOpportunity[] = [];
    
    for (const [itemId, priceHistory] of this.priceHistory.entries()) {
      if (priceHistory.length < 50) continue;

      const recentAvg = priceHistory.slice(-10).reduce((a, b) => a + b, 0) / 10;
      const oldAvg = priceHistory.slice(-50, -40).reduce((a, b) => a + b, 0) / 10;
      const growthRate = ((recentAvg - oldAvg) / oldAvg) * 100;
      
      if (growthRate > 2) {
        investments.push({
          type: 'buy',
          itemId,
          itemName: this.getItemName(itemId),
          buyPrice: recentAvg,
          sellPrice: recentAvg * 1.2,
          profit: recentAvg * 0.2,
          profitMargin: 20,
          volume: 500,
          riskLevel: this.assessRisk(growthRate),
          timeToComplete: 240,
          confidence: 0.7,
          marketTrend: 'rising'
        });
      }
    }

    return investments.sort((a, b) => b.profitMargin - a.profitMargin);
  }

  async getMarketPrices(itemIds?: number[], itemNames?: string[]): Promise<MarketData[]> {
    const marketData: MarketData[] = [];
    
    if (itemIds) {
      for (const itemId of itemIds) {
        const data = this.getMarketDataForItem(itemId);
        if (data) marketData.push(data);
      }
    }
    
    if (itemNames) {
      for (const itemName of itemNames) {
        const itemId = this.getItemIdByName(itemName);
        if (itemId) {
          const data = this.getMarketDataForItem(itemId);
          if (data) marketData.push(data);
        }
      }
    }
    
    // If no specific items requested, return top traded items
    if (!itemIds && !itemNames) {
      const topItems = [554, 555, 556, 557, 385, 1513, 440, 453];
      for (const itemId of topItems) {
        const data = this.getMarketDataForItem(itemId);
        if (data) marketData.push(data);
      }
    }
    
    return marketData;
  }

  private getMarketDataForItem(itemId: number): MarketData | null {
    const priceHistory = this.priceHistory.get(itemId);
    if (!priceHistory || priceHistory.length === 0) return null;

    const currentPrice = priceHistory[priceHistory.length - 1];
    if (!currentPrice) return null;
    
    const volatility = this.calculateVolatility(priceHistory.slice(-24));
    const trend = this.calculateTrend(priceHistory.slice(-10));

    return {
      itemId,
      itemName: this.getItemName(itemId),
      buyPrice: Math.floor(currentPrice * 0.95),
      sellPrice: Math.floor(currentPrice * 1.05),
      volume: Math.floor(Math.random() * 1000) + 100,
      volatility,
      trend,
      lastUpdated: Date.now()
    };
  }

  async analyzeProfitability(strategy?: string, riskLevel?: string): Promise<{ opportunities: EconomicOpportunity[]; analysis: any }> {
    const opportunities = this.findTradingOpportunities();
    const filteredOpportunities = opportunities.filter(opp => {
      if (riskLevel && opp.riskLevel !== riskLevel) return false;
      return true;
    });

    const analysis = {
      totalOpportunities: filteredOpportunities.length,
      averageProfitMargin: filteredOpportunities.reduce((sum, opp) => sum + opp.profitMargin, 0) / filteredOpportunities.length,
      highestProfit: Math.max(...filteredOpportunities.map(opp => opp.profit)),
      bestOpportunity: filteredOpportunities[0],
      riskDistribution: this.analyzeRiskDistribution(filteredOpportunities)
    };

    return { opportunities: filteredOpportunities.slice(0, 10), analysis };
  }

  async executeTrade(type: 'buy' | 'sell', itemId: number, quantity: number, price: number, maxWait?: number): Promise<TradeRecord> {
    const tradeId = uuidv4();
    const trade: TradeRecord = {
      id: tradeId,
      itemId,
      itemName: this.getItemName(itemId),
      type,
      quantity,
      price,
      timestamp: Date.now(),
      status: 'pending'
    };

    if (type === 'buy') {
      await this.placeBuyOrder(itemId, quantity, price);
    } else {
      await this.placeSellOrder(itemId, quantity, price);
    }

    this.tradeHistory.push(trade);
    
    // Simulate trade completion
    setTimeout(() => {
      trade.status = 'completed';
      if (type === 'sell') {
        trade.profit = (price - this.getAveragePrice(itemId, 10)) * quantity;
      }
    }, (maxWait || 5) * 60 * 1000);

    return trade;
  }

  async manageMerchant(mode: 'restock' | 'diversify' | 'liquidate', targetItems?: number[]): Promise<{ success: boolean; actions: string[] }> {
    const actions: string[] = [];
    
    switch (mode) {
      case 'restock':
        // Restock popular items
        const popularItems = [385, 373, 371]; // Food items
        for (const itemId of popularItems) {
          const currentStock = this.getItemQuantity(itemId);
          if (currentStock < 100) {
            await this.placeBuyOrder(itemId, 100 - currentStock, this.getCurrentPrice(itemId));
            actions.push(`Restocked ${this.getItemName(itemId)}`);
          }
        }
        break;

      case 'diversify':
        // Diversify inventory across different item categories
        const categories = [
          { name: 'Combat', items: [385, 373, 371] },
          { name: 'Skilling', items: [1511, 1513, 440] },
          { name: 'Runes', items: [554, 555, 556, 557] }
        ];
        
        for (const category of categories) {
          for (const itemId of category.items) {
            const targetQuantity = Math.floor(this.config.budget / (category.items.length * this.getCurrentPrice(itemId)));
            const currentQuantity = this.getItemQuantity(itemId);
            
            if (currentQuantity < targetQuantity) {
              await this.placeBuyOrder(itemId, targetQuantity - currentQuantity, this.getCurrentPrice(itemId));
              actions.push(`Diversified into ${this.getItemName(itemId)}`);
            }
          }
        }
        break;

      case 'liquidate':
        // Sell all inventory
        for (const item of this.gameState.inventory) {
          if (item.quantity > 0) {
            await this.placeSellOrder(item.id, item.quantity, this.getCurrentPrice(item.id));
            actions.push(`Liquidated ${item.name}`);
          }
        }
        break;
    }

    return { success: true, actions };
  }

  async analyzeMarket(category?: string, timeFrame?: number): Promise<any> {
    const analysis = {
      overview: {
        totalItems: this.priceHistory.size,
        avgVolatility: 0,
        marketTrend: 'stable' as const,
        lastUpdated: Date.now()
      },
      topGainers: [] as any[],
      topLosers: [] as any[],
      mostVolatile: [] as any[],
      recommendations: [] as string[]
    };

    // Calculate market metrics
    let totalVolatility = 0;
    const itemAnalysis = [];

    for (const [itemId, priceHistory] of this.priceHistory.entries()) {
      if (priceHistory.length < 10) continue;

      const volatility = this.calculateVolatility(priceHistory.slice(-24));
      const trend = this.calculateTrend(priceHistory.slice(-10));
      const currentPrice = priceHistory[priceHistory.length - 1];
      const oldPrice = priceHistory[priceHistory.length - 10];
      if (!currentPrice || !oldPrice) continue;
      const change = ((currentPrice - oldPrice) / oldPrice) * 100;

      itemAnalysis.push({
        itemId,
        itemName: this.getItemName(itemId),
        currentPrice,
        change,
        volatility,
        trend
      });

      totalVolatility += volatility;
    }

    analysis.overview.avgVolatility = totalVolatility / itemAnalysis.length;

    // Sort for top gainers/losers
    itemAnalysis.sort((a, b) => b.change - a.change);
    analysis.topGainers = itemAnalysis.slice(0, 5);
    analysis.topLosers = itemAnalysis.slice(-5).reverse();

    // Most volatile
    itemAnalysis.sort((a, b) => b.volatility - a.volatility);
    analysis.mostVolatile = itemAnalysis.slice(0, 5);

    // Generate recommendations
    analysis.recommendations = [
      "Consider flipping high-volatility items for quick profits",
      "Invest in trending items for long-term gains",
      "Diversify portfolio across different item categories",
      "Monitor market trends for optimal entry/exit points"
    ];

    return analysis;
  }

  async getTradingStats(period?: string): Promise<any> {
    const cutoffTime = this.getPeriodCutoff(period || 'all');
    const relevantTrades = this.tradeHistory.filter(trade => trade.timestamp >= cutoffTime);

    const stats = {
      totalTrades: relevantTrades.length,
      buyTrades: relevantTrades.filter(t => t.type === 'buy').length,
      sellTrades: relevantTrades.filter(t => t.type === 'sell').length,
      totalProfit: relevantTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0),
      averageProfit: 0,
      successRate: 0,
      mostProfitableItem: '',
      tradingVolume: relevantTrades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0)
    };

    if (stats.totalTrades > 0) {
      stats.averageProfit = stats.totalProfit / stats.totalTrades;
      stats.successRate = relevantTrades.filter(t => (t.profit || 0) > 0).length / stats.totalTrades;
    }

    return stats;
  }

  private async placeBuyOrder(itemId: number, quantity: number, price: number): Promise<void> {
    runtimeLogger.info(`📈 Placing buy order: ${this.getItemName(itemId)} x${quantity} @ ${price}gp`);
    // Integration point with game client
    await this.randomDelay(1000, 2000);
  }

  private async placeSellOrder(itemId: number, quantity: number, price: number): Promise<void> {
    runtimeLogger.info(`📉 Placing sell order: ${this.getItemName(itemId)} x${quantity} @ ${price}gp`);
    // Integration point with game client
    await this.randomDelay(1000, 2000);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(prices: number[]): 'rising' | 'falling' | 'stable' {
    if (prices.length < 2) return 'stable';
    
    const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
    const secondHalf = prices.slice(Math.floor(prices.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 2) return 'rising';
    if (change < -2) return 'falling';
    return 'stable';
  }

  private assessRisk(volatility: number): 'low' | 'medium' | 'high' {
    if (volatility < 10) return 'low';
    if (volatility < 25) return 'medium';
    return 'high';
  }

  private getCurrentPrice(itemId: number): number {
    const history = this.priceHistory.get(itemId);
    if (!history || history.length === 0) return 0;
    const lastPrice = history[history.length - 1];
    return lastPrice ?? 0;
  }

  private getAveragePrice(itemId: number, periods: number): number {
    const history = this.priceHistory.get(itemId);
    if (!history || history.length < periods) return 0;
    
    const recentPrices = history.slice(-periods);
    return recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  }

  private hasItem(itemId: number): boolean {
    return this.gameState.inventory.some(item => item.id === itemId);
  }

  private getItemQuantity(itemId: number): number {
    const item = this.gameState.inventory.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  }

  private getItemName(itemId: number): string {
    const itemNames: Record<number, string> = {
      554: 'Fire rune', 555: 'Water rune', 556: 'Air rune', 557: 'Earth rune',
      1511: 'Logs', 1513: 'Magic logs', 440: 'Iron ore', 453: 'Coal',
      2357: 'Gold bar', 371: 'Tuna', 373: 'Swordfish', 385: 'Shark'
    };
    
    return itemNames[itemId] || `Item ${itemId}`;
  }

  private getItemIdByName(itemName: string): number | null {
    const nameToId: Record<string, number> = {
      'fire rune': 554, 'water rune': 555, 'air rune': 556, 'earth rune': 557,
      'logs': 1511, 'magic logs': 1513, 'iron ore': 440, 'coal': 453,
      'gold bar': 2357, 'tuna': 371, 'swordfish': 373, 'shark': 385
    };
    
    return nameToId[itemName.toLowerCase()] || null;
  }

  private analyzeRiskDistribution(opportunities: EconomicOpportunity[]): Record<string, number> {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    for (const opp of opportunities) {
      distribution[opp.riskLevel]++;
    }
    
    return distribution;
  }

  private getPeriodCutoff(period: string): number {
    const now = Date.now();
    switch (period) {
      case 'day': return now - 24 * 60 * 60 * 1000;
      case 'week': return now - 7 * 24 * 60 * 60 * 1000;
      case 'month': return now - 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  updateConfiguration(updates: Partial<EconomicManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    runtimeLogger.info('💰 Economic manager configuration updated');
  }

  updateGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  updatePriceData(itemId: number, price: number): void {
    const history = this.priceHistory.get(itemId) || [];
    history.push(price);
    
    // Keep only last 1000 price points
    if (history.length > 1000) {
      history.shift();
    }
    
    this.priceHistory.set(itemId, history);
  }

  getAllActivities(): AutonomousActivity[] {
    return Array.from(this.activeOffers.keys()).map(offerId => ({
      id: offerId,
      type: 'economic_management',
      status: 'running',
      config: {} as EconomicManagementConfig,
      startTime: Date.now(),
      progress: 0,
      metrics: {
        actionsPerformed: 0,
        experienceGained: {} as Record<SkillName, number>,
        goldEarned: 0,
        timeElapsed: 0,
        efficiency: 0,
        successRate: 0,
        itemsGained: {},
        itemsLost: {},
      },
      errors: [],
      checkpoints: [],
    }));
  }

  stopActivity(activityId: string): boolean {
    const offer = this.activeOffers.get(activityId);
    if (offer) {
      this.activeOffers.delete(activityId);
      return true;
    }
    return false;
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}