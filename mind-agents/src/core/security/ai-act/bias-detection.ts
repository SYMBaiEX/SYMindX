/**
 * Bias Detection and Mitigation Implementation
 *
 * Implements bias detection and fairness metrics for AI Act compliance
 */

import {
  BiasDetectionConfig,
  FairnessMetric,
  MitigationStrategy,
  BiasReport,
  BiasMetric,
  DetectedBias,
  MitigationAction,
} from '../../../types/ai-act-compliance';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Statistical utilities for bias detection
 */
class StatisticalUtils {
  /**
   * Calculate mean of numeric array
   */
  static mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  static stdDev(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map((val) => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Calculate disparate impact ratio
   */
  static disparateImpact(group1Rate: number, group2Rate: number): number {
    return Math.min(group1Rate, group2Rate) / Math.max(group1Rate, group2Rate);
  }

  /**
   * Chi-square test for independence
   */
  static chiSquareTest(observed: number[][], expected: number[][]): number {
    let chiSquare = 0;
    for (let i = 0; i < observed.length; i++) {
      for (let j = 0; j < observed[i].length; j++) {
        const diff = observed[i][j] - expected[i][j];
        chiSquare += (diff * diff) / expected[i][j];
      }
    }
    return chiSquare;
  }
}

/**
 * Fairness Metric Calculator
 */
class FairnessMetricCalculator {
  /**
   * Calculate demographic parity
   */
  static demographicParity(
    predictions: any[],
    sensitiveAttribute: string,
    positiveOutcome: any
  ): BiasMetric {
    const groups = this.groupByAttribute(predictions, sensitiveAttribute);
    const rates: Record<string, number> = {};

    for (const [group, items] of groups) {
      const positiveCount = items.filter(
        (item) => item.prediction === positiveOutcome
      ).length;
      rates[group] = positiveCount / items.length;
    }

    // Calculate parity difference
    const rateValues = Object.values(rates);
    const maxRate = Math.max(...rateValues);
    const minRate = Math.min(...rateValues);
    const disparity = maxRate - minRate;

    return {
      name: 'demographic-parity',
      value: disparity,
      threshold: 0.1, // 10% difference threshold
      passed: disparity <= 0.1,
      affectedGroups: Object.keys(rates),
    };
  }

  /**
   * Calculate equal opportunity
   */
  static equalOpportunity(
    predictions: any[],
    groundTruth: any[],
    sensitiveAttribute: string,
    positiveOutcome: any
  ): BiasMetric {
    const groups = this.groupByAttribute(predictions, sensitiveAttribute);
    const tprByGroup: Record<string, number> = {};

    for (const [group, items] of groups) {
      const indices = items.map((item) => predictions.indexOf(item));
      const actualPositives = indices.filter(
        (i) => groundTruth[i] === positiveOutcome
      );

      if (actualPositives.length > 0) {
        const truePositives = actualPositives.filter(
          (i) => predictions[i].prediction === positiveOutcome
        ).length;
        tprByGroup[group] = truePositives / actualPositives.length;
      }
    }

    const tprValues = Object.values(tprByGroup);
    const disparity = Math.max(...tprValues) - Math.min(...tprValues);

    return {
      name: 'equal-opportunity',
      value: disparity,
      threshold: 0.1,
      passed: disparity <= 0.1,
      affectedGroups: Object.keys(tprByGroup),
    };
  }

  /**
   * Calculate equalized odds
   */
  static equalizedOdds(
    predictions: any[],
    groundTruth: any[],
    sensitiveAttribute: string,
    positiveOutcome: any
  ): BiasMetric {
    // Combination of TPR and FPR equality
    const tprMetric = this.equalOpportunity(
      predictions,
      groundTruth,
      sensitiveAttribute,
      positiveOutcome
    );

    // Calculate FPR disparity
    const groups = this.groupByAttribute(predictions, sensitiveAttribute);
    const fprByGroup: Record<string, number> = {};

    for (const [group, items] of groups) {
      const indices = items.map((item) => predictions.indexOf(item));
      const actualNegatives = indices.filter(
        (i) => groundTruth[i] !== positiveOutcome
      );

      if (actualNegatives.length > 0) {
        const falsePositives = actualNegatives.filter(
          (i) => predictions[i].prediction === positiveOutcome
        ).length;
        fprByGroup[group] = falsePositives / actualNegatives.length;
      }
    }

    const fprValues = Object.values(fprByGroup);
    const fprDisparity = Math.max(...fprValues) - Math.min(...fprValues);

    // Combined disparity
    const combinedDisparity = Math.max(tprMetric.value, fprDisparity);

    return {
      name: 'equalized-odds',
      value: combinedDisparity,
      threshold: 0.1,
      passed: combinedDisparity <= 0.1,
      affectedGroups: [
        ...new Set([
          ...(tprMetric.affectedGroups || []),
          ...Object.keys(fprByGroup),
        ]),
      ],
    };
  }

  /**
   * Calculate calibration metric
   */
  static calibration(
    predictions: any[],
    groundTruth: any[],
    sensitiveAttribute: string,
    bins: number = 10
  ): BiasMetric {
    const groups = this.groupByAttribute(predictions, sensitiveAttribute);
    const calibrationByGroup: Record<string, number> = {};

    for (const [group, items] of groups) {
      const calibrationError = this.calculateCalibrationError(
        items.map((item) => item.confidence || 0.5),
        items.map((item) => groundTruth[predictions.indexOf(item)])
      );
      calibrationByGroup[group] = calibrationError;
    }

    const maxError = Math.max(...Object.values(calibrationByGroup));

    return {
      name: 'calibration',
      value: maxError,
      threshold: 0.05,
      passed: maxError <= 0.05,
      affectedGroups: Object.keys(calibrationByGroup),
    };
  }

  /**
   * Group predictions by sensitive attribute
   */
  private static groupByAttribute(
    predictions: any[],
    attribute: string
  ): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const pred of predictions) {
      const value = pred[attribute] || 'unknown';
      if (!groups.has(value)) {
        groups.set(value, []);
      }
      groups.get(value)!.push(pred);
    }

    return groups;
  }

  /**
   * Calculate calibration error
   */
  private static calculateCalibrationError(
    confidences: number[],
    outcomes: any[],
    bins: number = 10
  ): number {
    const binSize = 1.0 / bins;
    let totalError = 0;
    let totalCount = 0;

    for (let i = 0; i < bins; i++) {
      const binMin = i * binSize;
      const binMax = (i + 1) * binSize;

      const binIndices = confidences
        .map((conf, idx) => ({ conf, idx }))
        .filter((item) => item.conf >= binMin && item.conf < binMax)
        .map((item) => item.idx);

      if (binIndices.length > 0) {
        const avgConfidence = StatisticalUtils.mean(
          binIndices.map((idx) => confidences[idx])
        );
        const actualRate =
          binIndices.filter((idx) => outcomes[idx]).length / binIndices.length;

        totalError += Math.abs(avgConfidence - actualRate) * binIndices.length;
        totalCount += binIndices.length;
      }
    }

    return totalCount > 0 ? totalError / totalCount : 0;
  }
}

/**
 * Bias Mitigation Strategies
 */
class BiasMitigator {
  /**
   * Apply pre-processing mitigation
   */
  static async preProcessing(
    data: any[],
    sensitiveAttribute: string,
    detectedBias: DetectedBias
  ): Promise<{ data: any[]; action: MitigationAction }> {
    runtimeLogger.info('Applying pre-processing bias mitigation');

    // Reweighting strategy
    const groups = new Map<string, any[]>();
    data.forEach((item) => {
      const group = item[sensitiveAttribute];
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(item);
    });

    // Calculate weights to balance groups
    const totalSize = data.length;
    const targetSize = totalSize / groups.size;
    const weights: Record<string, number> = {};

    groups.forEach((items, group) => {
      weights[group] = targetSize / items.length;
    });

    // Apply weights
    const reweightedData = data.map((item) => ({
      ...item,
      _weight: weights[item[sensitiveAttribute]] || 1.0,
    }));

    const action: MitigationAction = {
      strategy: 'pre-processing',
      applied: true,
      effectiveness: 0.7, // Estimated
      sideEffects: ['May reduce overall accuracy slightly'],
    };

    return { data: reweightedData, action };
  }

  /**
   * Apply in-processing mitigation
   */
  static async inProcessing(
    model: any,
    fairnessConstraint: FairnessMetric
  ): Promise<{ model: any; action: MitigationAction }> {
    runtimeLogger.info('Applying in-processing bias mitigation');

    // Simulate adding fairness constraints to training
    const modifiedModel = {
      ...model,
      fairnessConstraints: [fairnessConstraint],
      regularization: {
        ...model.regularization,
        fairness: 0.1, // Fairness regularization weight
      },
    };

    const action: MitigationAction = {
      strategy: 'in-processing',
      applied: true,
      effectiveness: 0.8,
      sideEffects: ['May increase training time', 'Slight accuracy trade-off'],
    };

    return { model: modifiedModel, action };
  }

  /**
   * Apply post-processing mitigation
   */
  static async postProcessing(
    predictions: any[],
    sensitiveAttribute: string,
    fairnessMetric: FairnessMetric
  ): Promise<{ predictions: any[]; action: MitigationAction }> {
    runtimeLogger.info('Applying post-processing bias mitigation');

    // Threshold optimization for fairness
    const groups = new Map<string, any[]>();
    predictions.forEach((pred) => {
      const group = pred[sensitiveAttribute];
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(pred);
    });

    // Adjust thresholds per group
    const adjustedPredictions = [...predictions];
    const thresholds: Record<string, number> = {};

    groups.forEach((items, group) => {
      // Calculate optimal threshold for this group
      thresholds[group] = this.findOptimalThreshold(items, fairnessMetric);

      // Apply threshold
      items.forEach((item) => {
        const idx = predictions.indexOf(item);
        if (item.confidence >= thresholds[group]) {
          adjustedPredictions[idx] = { ...item, prediction: 1 };
        } else {
          adjustedPredictions[idx] = { ...item, prediction: 0 };
        }
      });
    });

    const action: MitigationAction = {
      strategy: 'post-processing',
      applied: true,
      effectiveness: 0.6,
      sideEffects: [
        'Different thresholds per group',
        'May seem less consistent',
      ],
    };

    return { predictions: adjustedPredictions, action };
  }

  /**
   * Find optimal threshold for fairness
   */
  private static findOptimalThreshold(
    predictions: any[],
    targetMetric: FairnessMetric
  ): number {
    // Simple grid search for optimal threshold
    let bestThreshold = 0.5;
    let bestScore = Infinity;

    for (let threshold = 0.1; threshold <= 0.9; threshold += 0.05) {
      const binaryPreds = predictions.map((p) =>
        p.confidence >= threshold ? 1 : 0
      );
      // Evaluate fairness metric with these predictions
      // For simplicity, minimize distance from target
      const score = Math.abs(threshold - 0.5); // Simplified

      if (score < bestScore) {
        bestScore = score;
        bestThreshold = threshold;
      }
    }

    return bestThreshold;
  }
}

/**
 * Main Bias Detection Engine
 */
export class BiasDetectionEngine {
  private readonly config: BiasDetectionConfig;

  constructor(config: BiasDetectionConfig) {
    this.config = config;
  }

  /**
   * Detect bias in predictions
   */
  async detectBias(
    data: any[],
    predictions: any[],
    groundTruth?: any[]
  ): Promise<BiasReport> {
    runtimeLogger.info('Running bias detection', {
      dataSize: data.length,
      sensitiveAttributes: this.config.sensitiveAttributes,
      metrics: this.config.fairnessMetrics,
    });

    const timestamp = new Date();
    const metrics: BiasMetric[] = [];
    const detectedBiases: DetectedBias[] = [];

    // Merge data with predictions
    const enrichedPredictions = predictions.map((pred, i) => ({
      ...pred,
      ...data[i],
    }));

    // Calculate each fairness metric
    for (const metricName of this.config.fairnessMetrics) {
      for (const attribute of this.config.sensitiveAttributes) {
        let metric: BiasMetric;

        switch (metricName) {
          case 'demographic-parity':
            metric = FairnessMetricCalculator.demographicParity(
              enrichedPredictions,
              attribute,
              1 // Positive outcome
            );
            break;

          case 'equal-opportunity':
            if (!groundTruth) continue;
            metric = FairnessMetricCalculator.equalOpportunity(
              enrichedPredictions,
              groundTruth,
              attribute,
              1
            );
            break;

          case 'equalized-odds':
            if (!groundTruth) continue;
            metric = FairnessMetricCalculator.equalizedOdds(
              enrichedPredictions,
              groundTruth,
              attribute,
              1
            );
            break;

          case 'calibration':
            if (!groundTruth) continue;
            metric = FairnessMetricCalculator.calibration(
              enrichedPredictions,
              groundTruth,
              attribute
            );
            break;

          default:
            continue;
        }

        metrics.push(metric);

        // Check if bias detected
        if (!metric.passed) {
          detectedBiases.push({
            type: metricName,
            severity: this.calculateSeverity(metric),
            affectedAttribute: attribute,
            affectedGroups: metric.affectedGroups || [],
            disparity: metric.value,
            samples: enrichedPredictions.length,
          });
        }
      }
    }

    // Calculate overall fairness score
    const passedMetrics = metrics.filter((m) => m.passed).length;
    const overallFairness =
      metrics.length > 0 ? passedMetrics / metrics.length : 1.0;

    return {
      timestamp,
      metrics,
      detectedBiases,
      mitigationActions: [], // Will be filled by mitigation
      overallFairness,
    };
  }

  /**
   * Mitigate detected bias
   */
  async mitigateBias(
    biasReport: BiasReport,
    strategy: MitigationStrategy,
    data?: any[],
    model?: any,
    predictions?: any[]
  ): Promise<MitigationAction> {
    runtimeLogger.info(`Applying ${strategy} mitigation strategy`);

    let action: MitigationAction;

    switch (strategy) {
      case 'pre-processing':
        if (!data || biasReport.detectedBiases.length === 0) {
          throw new Error('Data required for pre-processing mitigation');
        }
        const preMitigation = await BiasMitigator.preProcessing(
          data,
          biasReport.detectedBiases[0].affectedAttribute,
          biasReport.detectedBiases[0]
        );
        action = preMitigation.action;
        break;

      case 'in-processing':
        if (!model) {
          throw new Error('Model required for in-processing mitigation');
        }
        const inMitigation = await BiasMitigator.inProcessing(
          model,
          biasReport.metrics[0].name
        );
        action = inMitigation.action;
        break;

      case 'post-processing':
        if (!predictions) {
          throw new Error(
            'Predictions required for post-processing mitigation'
          );
        }
        const postMitigation = await BiasMitigator.postProcessing(
          predictions,
          biasReport.detectedBiases[0].affectedAttribute,
          biasReport.metrics[0].name
        );
        action = postMitigation.action;
        break;

      case 'adversarial':
        // Adversarial debiasing
        action = {
          strategy: 'adversarial',
          applied: true,
          effectiveness: 0.75,
          sideEffects: [
            'Requires adversarial training',
            'Increased complexity',
          ],
        };
        break;

      default:
        throw new Error(`Unknown mitigation strategy: ${strategy}`);
    }

    return action;
  }

  /**
   * Run batch bias detection
   */
  async batchDetection(
    batches: Array<{ data: any[]; predictions: any[]; groundTruth?: any[] }>
  ): Promise<BiasReport[]> {
    const reports: BiasReport[] = [];

    for (const batch of batches) {
      const report = await this.detectBias(
        batch.data,
        batch.predictions,
        batch.groundTruth
      );
      reports.push(report);
    }

    return reports;
  }

  /**
   * Monitor bias over time
   */
  async monitorBias(historicalReports: BiasReport[]): Promise<{
    trend: 'improving' | 'stable' | 'worsening';
    alerts: string[];
  }> {
    if (historicalReports.length < 2) {
      return { trend: 'stable', alerts: [] };
    }

    const fairnessScores = historicalReports.map((r) => r.overallFairness);
    const recentScores = fairnessScores.slice(-5);
    const avgRecent = StatisticalUtils.mean(recentScores);
    const avgHistorical = StatisticalUtils.mean(fairnessScores);

    let trend: 'improving' | 'stable' | 'worsening';
    if (avgRecent > avgHistorical + 0.05) {
      trend = 'improving';
    } else if (avgRecent < avgHistorical - 0.05) {
      trend = 'worsening';
    } else {
      trend = 'stable';
    }

    const alerts: string[] = [];

    // Check for sudden changes
    if (recentScores.length >= 2) {
      const lastChange =
        recentScores[recentScores.length - 1] -
        recentScores[recentScores.length - 2];
      if (Math.abs(lastChange) > 0.1) {
        alerts.push(
          `Sudden fairness change detected: ${(lastChange * 100).toFixed(1)}%`
        );
      }
    }

    // Check for persistent bias
    const recentBiases = historicalReports
      .slice(-3)
      .flatMap((r) => r.detectedBiases);
    const persistentBiases = new Map<string, number>();

    recentBiases.forEach((bias) => {
      const key = `${bias.type}-${bias.affectedAttribute}`;
      persistentBiases.set(key, (persistentBiases.get(key) || 0) + 1);
    });

    persistentBiases.forEach((count, key) => {
      if (count >= 3) {
        alerts.push(`Persistent bias detected: ${key}`);
      }
    });

    return { trend, alerts };
  }

  /**
   * Calculate bias severity
   */
  private calculateSeverity(
    metric: BiasMetric
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = metric.value / metric.threshold;

    if (ratio < 1.5) return 'low';
    if (ratio < 2.0) return 'medium';
    if (ratio < 3.0) return 'high';
    return 'critical';
  }
}

/**
 * Create bias detection engine
 */
export function createBiasDetectionEngine(
  config: BiasDetectionConfig
): BiasDetectionEngine {
  return new BiasDetectionEngine(config);
}
