/**
 * Predictive Cache Strategy
 * 
 * Uses machine learning-inspired algorithms to predict future cache
 * access patterns and pre-load data accordingly.
 */

import {
  CacheLevel,
  CacheStrategy,
  CacheEntry,
  CacheInvalidationCriteria,
  type CacheStrategyInterface,
} from '../../../../types/context/context-caching';
import type { OperationResult } from '../../../../types/helpers';
import type { Metadata } from '../../../../types/common';

/**
 * Configuration for predictive strategy
 */
interface PredictiveStrategyConfig {
  /** Learning rate for prediction model (0-1) */
  learningRate: number;
  
  /** Minimum confidence threshold for predictions */
  confidenceThreshold: number;
  
  /** Time horizon for predictions (ms) */
  predictionHorizon: number;
  
  /** Number of historical patterns to track */
  maxPatterns: number;
  
  /** Weight for temporal patterns */
  temporalWeight: number;
  
  /** Weight for contextual patterns */
  contextualWeight: number;
  
  /** Weight for sequential patterns */
  sequentialWeight: number;
}

/**
 * Access pattern for prediction
 */
interface AccessPattern {
  id: string;
  sequence: string[];
  timestamps: number[];
  context: Metadata[];
  frequency: number;
  lastSeen: number;
  confidence: number;
}

/**
 * Prediction result
 */
interface Prediction {
  key: string;
  confidence: number;
  timeframe: number;
  reason: string;
  patterns: string[];
}

/**
 * Temporal pattern (time-based access patterns)
 */
interface TemporalPattern {
  key: string;
  hourPattern: number[]; // 24 hours
  dayPattern: number[]; // 7 days
  seasonality: number;
  trend: number;
}

/**
 * Sequential pattern (access sequence patterns)
 */
interface SequentialPattern {
  sequence: string[];
  nextKeys: Map<string, number>;
  confidence: number;
  frequency: number;
}

/**
 * Predictive cache strategy implementation
 */
export class PredictiveStrategy implements CacheStrategyInterface {
  readonly name = CacheStrategy.PREDICTIVE;
  
  private config: PredictiveStrategyConfig;
  private accessPatterns = new Map<string, AccessPattern>();
  private temporalPatterns = new Map<string, TemporalPattern>();
  private sequentialPatterns: SequentialPattern[] = [];
  private recentAccesses: Array<{ key: string; timestamp: number; context: Metadata }> = [];
  private isInitialized = false;
  private learningInterval?: NodeJS.Timeout;
  
  constructor(config?: Partial<PredictiveStrategyConfig>) {
    this.config = {
      learningRate: 0.1,
      confidenceThreshold: 0.7,
      predictionHorizon: 3600000, // 1 hour
      maxPatterns: 1000,
      temporalWeight: 0.4,
      contextualWeight: 0.3,
      sequentialWeight: 0.3,
      ...config,
    };
  }
  
  /**
   * Initialize the predictive strategy
   */
  async initialize(config?: Partial<PredictiveStrategyConfig>): Promise<OperationResult> {
    const startTime = performance.now();
    
    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'Predictive strategy already initialized',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }
      
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      // Validate configuration
      const totalWeight = this.config.temporalWeight + 
                         this.config.contextualWeight + 
                         this.config.sequentialWeight;
      
      if (Math.abs(totalWeight - 1) > 0.001) {
        throw new Error('Pattern weights must sum to 1.0');
      }
      
      if (this.config.learningRate <= 0 || this.config.learningRate > 1) {
        throw new Error('Learning rate must be between 0 and 1');
      }
      
      // Start pattern learning
      this.startPatternLearning();
      
      this.isInitialized = true;
      
      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: { config: this.config },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }
  
  /**
   * Determine cache level based on predictions
   */
  determineCacheLevel(key: string, data: unknown, metadata: Metadata): CacheLevel {
    // Record access for learning
    this.recordAccess(key, metadata);
    
    // Get prediction confidence
    const prediction = this.predictAccess(key, metadata);
    
    if (prediction > 0.8) {
      return CacheLevel.L1; // High confidence prediction
    }
    
    if (prediction > 0.5) {
      return CacheLevel.L2; // Medium confidence prediction
    }
    
    return CacheLevel.L3; // Low confidence or new data
  }
  
  /**
   * Calculate priority based on prediction confidence
   */
  calculatePriority(entry: CacheEntry): number {
    const prediction = this.predictAccess(entry.id, entry.metadata);
    const basePriority = entry.priority || 1;
    
    // Boost priority based on prediction confidence
    const predictivePriority = prediction * 10;
    
    // Combine with base priority (weighted average)
    const combinedPriority = (basePriority + predictivePriority * 2) / 3;
    
    return Math.max(1, Math.min(10, Math.round(combinedPriority)));
  }
  
  /**
   * Predict access probability for a key
   */
  predictAccess(key: string, context: Metadata): number {
    let totalPrediction = 0;
    let totalWeight = 0;
    
    // Temporal prediction
    const temporalPrediction = this.predictTemporalAccess(key);
    if (temporalPrediction > 0) {
      totalPrediction += temporalPrediction * this.config.temporalWeight;
      totalWeight += this.config.temporalWeight;
    }
    
    // Contextual prediction
    const contextualPrediction = this.predictContextualAccess(key, context);
    if (contextualPrediction > 0) {
      totalPrediction += contextualPrediction * this.config.contextualWeight;
      totalWeight += this.config.contextualWeight;
    }
    
    // Sequential prediction
    const sequentialPrediction = this.predictSequentialAccess(key);
    if (sequentialPrediction > 0) {
      totalPrediction += sequentialPrediction * this.config.sequentialWeight;
      totalWeight += this.config.sequentialWeight;
    }
    
    return totalWeight > 0 ? totalPrediction / totalWeight : 0.1;
  }
  
  /**
   * Recommend warming based on predictions
   */
  recommendWarming(context: Metadata): string[] {
    const predictions: Prediction[] = [];
    const now = Date.now();
    
    // Generate predictions for all known keys
    const allKeys = new Set([
      ...this.accessPatterns.keys(),
      ...this.temporalPatterns.keys()
    ]);
    
    for (const key of allKeys) {
      const confidence = this.predictAccess(key, context);
      
      if (confidence > this.config.confidenceThreshold) {
        predictions.push({
          key,
          confidence,
          timeframe: this.estimateAccessTime(key),
          reason: this.explainPrediction(key, context),
          patterns: this.getMatchingPatterns(key),
        });
      }
    }
    
    // Sort by confidence and timeframe (sooner predictions first)
    return predictions
      .sort((a, b) => {
        const scoreA = a.confidence * (1 / Math.max(1, a.timeframe / 60000)); // Prefer sooner access
        const scoreB = b.confidence * (1 / Math.max(1, b.timeframe / 60000));
        return scoreB - scoreA;
      })
      .slice(0, 30)
      .map(p => p.key);
  }
  
  /**
   * Handle memory pressure with predictive insights
   */
  handleMemoryPressure(currentUsage: number, threshold: number): CacheInvalidationCriteria[] {
    const criteria: CacheInvalidationCriteria[] = [];
    const now = Date.now();
    
    // Remove items with low future access probability
    criteria.push({
      filter: (entry) => {
        const prediction = this.predictAccess(entry.id, entry.metadata);
        return prediction < 0.2; // Very low probability of future access
      },
    });
    
    // Remove items that patterns suggest won't be accessed soon
    criteria.push({
      filter: (entry) => {
        const estimatedAccessTime = this.estimateAccessTime(entry.id);
        const timeSinceLastAccess = now - entry.lastAccessedAt;
        
        // Remove if estimated next access is far in the future
        // and it hasn't been accessed recently
        return estimatedAccessTime > this.config.predictionHorizon * 2 &&
               timeSinceLastAccess > this.config.predictionHorizon;
      },
    });
    
    return criteria;
  }
  
  /**
   * Record access for pattern learning
   */
  private recordAccess(key: string, context: Metadata): void {
    const now = Date.now();
    
    // Add to recent accesses
    this.recentAccesses.push({ key, timestamp: now, context });
    
    // Keep only recent accesses for pattern detection
    const cutoff = now - this.config.predictionHorizon * 2;
    this.recentAccesses = this.recentAccesses.filter(access => access.timestamp > cutoff);
    
    // Update temporal patterns
    this.updateTemporalPattern(key, now);
    
    // Update sequential patterns
    this.updateSequentialPatterns(key);
    
    // Limit pattern storage
    if (this.accessPatterns.size > this.config.maxPatterns) {
      this.pruneOldPatterns();
    }
  }
  
  /**
   * Predict temporal access (time-based patterns)
   */
  private predictTemporalAccess(key: string): number {
    const pattern = this.temporalPatterns.get(key);
    if (!pattern) return 0;
    
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Get hour and day probabilities
    const hourProb = pattern.hourPattern[hour] || 0;
    const dayProb = pattern.dayPattern[day] || 0;
    
    // Apply trend and seasonality
    let prediction = (hourProb + dayProb) / 2;
    prediction *= (1 + pattern.trend);
    prediction *= (1 + pattern.seasonality);
    
    return Math.max(0, Math.min(1, prediction));
  }
  
  /**
   * Predict contextual access (context-based patterns)
   */
  private predictContextualAccess(key: string, context: Metadata): number {
    let maxProbability = 0;
    
    for (const [patternKey, pattern] of this.accessPatterns) {
      if (patternKey === key) continue;
      
      // Calculate context similarity
      const similarity = this.calculateContextSimilarity(context, pattern.context);
      
      if (similarity > 0.5) {
        // Check if this pattern often leads to accessing the target key
        const coOccurrence = this.calculateCoOccurrenceProbability(patternKey, key);
        const probability = similarity * coOccurrence * pattern.confidence;
        maxProbability = Math.max(maxProbability, probability);
      }
    }
    
    return maxProbability;
  }
  
  /**
   * Predict sequential access (sequence-based patterns)
   */
  private predictSequentialAccess(key: string): number {
    const recentKeys = this.recentAccesses
      .slice(-10)
      .map(access => access.key);
    
    let maxProbability = 0;
    
    for (const pattern of this.sequentialPatterns) {
      const matchLength = this.findSequenceMatch(recentKeys, pattern.sequence);
      
      if (matchLength > 0) {
        const nextKeyProb = pattern.nextKeys.get(key) || 0;
        const probability = (matchLength / pattern.sequence.length) * nextKeyProb * pattern.confidence;
        maxProbability = Math.max(maxProbability, probability);
      }
    }
    
    return maxProbability;
  }
  
  /**
   * Update temporal pattern for a key
   */
  private updateTemporalPattern(key: string, timestamp: number): void {
    let pattern = this.temporalPatterns.get(key);
    
    if (!pattern) {
      pattern = {
        key,
        hourPattern: new Array(24).fill(0),
        dayPattern: new Array(7).fill(0),
        seasonality: 0,
        trend: 0,
      };
      this.temporalPatterns.set(key, pattern);
    }
    
    const date = new Date(timestamp);
    const hour = date.getHours();
    const day = date.getDay();
    
    // Update hour pattern with learning rate
    pattern.hourPattern[hour] = pattern.hourPattern[hour] * (1 - this.config.learningRate) + 
                                this.config.learningRate;
    
    // Update day pattern with learning rate
    pattern.dayPattern[day] = pattern.dayPattern[day] * (1 - this.config.learningRate) + 
                              this.config.learningRate;
    
    // Simple trend calculation (would be more sophisticated in practice)
    const recentAccesses = this.recentAccesses
      .filter(access => access.key === key)
      .slice(-10);
    
    if (recentAccesses.length >= 3) {
      const oldAccesses = recentAccesses.slice(0, Math.floor(recentAccesses.length / 2));
      const newAccesses = recentAccesses.slice(Math.floor(recentAccesses.length / 2));
      
      const oldRate = oldAccesses.length / ((oldAccesses[oldAccesses.length - 1]?.timestamp || 0) - (oldAccesses[0]?.timestamp || 0));
      const newRate = newAccesses.length / ((newAccesses[newAccesses.length - 1]?.timestamp || 0) - (newAccesses[0]?.timestamp || 0));
      
      pattern.trend = (newRate / Math.max(oldRate, 0.001)) - 1;
    }
  }
  
  /**
   * Update sequential patterns
   */
  private updateSequentialPatterns(currentKey: string): void {
    const sequenceLength = 5;
    const recentKeys = this.recentAccesses
      .slice(-sequenceLength - 1)
      .map(access => access.key);
    
    if (recentKeys.length < sequenceLength + 1) return;
    
    const sequence = recentKeys.slice(0, sequenceLength);
    const nextKey = recentKeys[sequenceLength];
    
    // Find existing pattern or create new one
    let existingPattern = this.sequentialPatterns.find(p => 
      p.sequence.length === sequence.length &&
      p.sequence.every((key, index) => key === sequence[index])
    );
    
    if (!existingPattern) {
      existingPattern = {
        sequence: [...sequence],
        nextKeys: new Map(),
        confidence: 0,
        frequency: 0,
      };
      this.sequentialPatterns.push(existingPattern);
    }
    
    // Update next key probability
    const currentCount = existingPattern.nextKeys.get(nextKey) || 0;
    existingPattern.nextKeys.set(nextKey, currentCount + 1);
    existingPattern.frequency++;
    
    // Update confidence (could be more sophisticated)
    const totalNext = Array.from(existingPattern.nextKeys.values()).reduce((sum, count) => sum + count, 0);
    const maxNext = Math.max(...Array.from(existingPattern.nextKeys.values()));
    existingPattern.confidence = maxNext / totalNext;
    
    // Normalize probabilities
    for (const [key, count] of existingPattern.nextKeys) {
      existingPattern.nextKeys.set(key, count / totalNext);
    }
    
    // Limit number of patterns
    if (this.sequentialPatterns.length > this.config.maxPatterns / 10) {
      this.sequentialPatterns.sort((a, b) => b.frequency - a.frequency);
      this.sequentialPatterns = this.sequentialPatterns.slice(0, this.config.maxPatterns / 10);
    }
  }
  
  /**
   * Calculate context similarity between two contexts
   */
  private calculateContextSimilarity(context1: Metadata, context2: Metadata[]): number {
    if (!context1 || context2.length === 0) return 0;
    
    let totalSimilarity = 0;
    
    for (const ctx of context2) {
      let similarity = 0;
      let comparisons = 0;
      
      for (const [key, value] of Object.entries(context1)) {
        if (key in ctx) {
          comparisons++;
          if (ctx[key] === value) {
            similarity++;
          } else if (typeof value === 'string' && typeof ctx[key] === 'string') {
            // Simple string similarity (could use more sophisticated methods)
            const longer = value.length > ctx[key].length ? value : ctx[key];
            const shorter = value.length > ctx[key].length ? ctx[key] : value;
            const editDistance = this.calculateEditDistance(longer, shorter);
            similarity += 1 - (editDistance / longer.length);
          }
        }
      }
      
      if (comparisons > 0) {
        totalSimilarity = Math.max(totalSimilarity, similarity / comparisons);
      }
    }
    
    return totalSimilarity;
  }
  
  /**
   * Calculate co-occurrence probability between two keys
   */
  private calculateCoOccurrenceProbability(key1: string, key2: string): number {
    const windowSize = 300000; // 5 minutes
    let coOccurrences = 0;
    let key1Occurrences = 0;
    
    const key1Accesses = this.recentAccesses.filter(access => access.key === key1);
    
    for (const access1 of key1Accesses) {
      key1Occurrences++;
      
      // Check if key2 was accessed within the window
      const hasKey2 = this.recentAccesses.some(access2 => 
        access2.key === key2 &&
        Math.abs(access2.timestamp - access1.timestamp) <= windowSize
      );
      
      if (hasKey2) {
        coOccurrences++;
      }
    }
    
    return key1Occurrences > 0 ? coOccurrences / key1Occurrences : 0;
  }
  
  /**
   * Find longest matching subsequence
   */
  private findSequenceMatch(recent: string[], pattern: string[]): number {
    if (recent.length < pattern.length) return 0;
    
    let maxMatch = 0;
    
    for (let i = 0; i <= recent.length - pattern.length; i++) {
      let match = 0;
      for (let j = 0; j < pattern.length; j++) {
        if (recent[i + j] === pattern[j]) {
          match++;
        } else {
          break;
        }
      }
      maxMatch = Math.max(maxMatch, match);
    }
    
    return maxMatch;
  }
  
  /**
   * Simple edit distance calculation
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Estimate when a key will next be accessed
   */
  private estimateAccessTime(key: string): number {
    const temporal = this.temporalPatterns.get(key);
    if (!temporal) return this.config.predictionHorizon;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find the next hour with high probability
    for (let i = 1; i <= 24; i++) {
      const hour = (currentHour + i) % 24;
      if (temporal.hourPattern[hour] > 0.5) {
        return i * 3600000; // Convert hours to milliseconds
      }
    }
    
    return this.config.predictionHorizon; // Default if no pattern found
  }
  
  /**
   * Explain why a prediction was made
   */
  private explainPrediction(key: string, context: Metadata): string {
    const reasons: string[] = [];
    
    const temporal = this.predictTemporalAccess(key);
    if (temporal > 0.5) {
      reasons.push(`temporal pattern (${(temporal * 100).toFixed(1)}%)`);
    }
    
    const contextual = this.predictContextualAccess(key, context);
    if (contextual > 0.5) {
      reasons.push(`contextual similarity (${(contextual * 100).toFixed(1)}%)`);
    }
    
    const sequential = this.predictSequentialAccess(key);
    if (sequential > 0.5) {
      reasons.push(`access sequence (${(sequential * 100).toFixed(1)}%)`);
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'low confidence prediction';
  }
  
  /**
   * Get matching pattern IDs for a key
   */
  private getMatchingPatterns(key: string): string[] {
    const patterns: string[] = [];
    
    if (this.temporalPatterns.has(key)) {
      patterns.push('temporal');
    }
    
    if (this.accessPatterns.has(key)) {
      patterns.push('contextual');
    }
    
    const hasSequential = this.sequentialPatterns.some(pattern => 
      pattern.nextKeys.has(key)
    );
    if (hasSequential) {
      patterns.push('sequential');
    }
    
    return patterns;
  }
  
  /**
   * Prune old patterns to manage memory
   */
  private pruneOldPatterns(): void {
    const now = Date.now();
    const maxAge = this.config.predictionHorizon * 4;
    
    // Remove old access patterns
    for (const [key, pattern] of this.accessPatterns) {
      if (now - pattern.lastSeen > maxAge) {
        this.accessPatterns.delete(key);
      }
    }
    
    // Remove low-confidence sequential patterns
    this.sequentialPatterns = this.sequentialPatterns
      .filter(pattern => pattern.confidence > 0.1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, this.config.maxPatterns / 2);
  }
  
  /**
   * Start pattern learning process
   */
  private startPatternLearning(): void {
    this.learningInterval = setInterval(() => {
      this.pruneOldPatterns();
    }, this.config.predictionHorizon / 4); // Run every quarter of prediction horizon
  }
  
  /**
   * Shutdown strategy
   */
  async shutdown(): Promise<void> {
    if (this.learningInterval) {
      clearInterval(this.learningInterval);
      this.learningInterval = undefined;
    }
    
    this.accessPatterns.clear();
    this.temporalPatterns.clear();
    this.sequentialPatterns = [];
    this.recentAccesses = [];
    this.isInitialized = false;
  }
  
  /**
   * Get strategy statistics
   */
  getStats(): {
    accessPatterns: number;
    temporalPatterns: number;
    sequentialPatterns: number;
    recentAccesses: number;
    config: PredictiveStrategyConfig;
  } {
    return {
      accessPatterns: this.accessPatterns.size,
      temporalPatterns: this.temporalPatterns.size,
      sequentialPatterns: this.sequentialPatterns.length,
      recentAccesses: this.recentAccesses.length,
      config: this.config,
    };
  }
}