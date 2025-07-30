/**
 * AI Explainability Implementation
 *
 * Implements explainability requirements for AI Act compliance
 */

import {
  ExplainabilityConfig,
  ExplainabilityMethod,
  Explanation,
  ExplanationFactor,
  Visualization,
  Counterfactual,
  CounterfactualChange,
  ExplanationRequest,
  ExplanationResponse,
} from '../../../types/ai-act-compliance';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Base Explainer Interface
 */
interface Explainer {
  explain(decision: any, context: any): Promise<Explanation>;
}

/**
 * LIME (Local Interpretable Model-agnostic Explanations) Implementation
 */
class LIMEExplainer implements Explainer {
  async explain(decision: any, context: any): Promise<Explanation> {
    runtimeLogger.debug('Generating LIME explanation');

    const factors: ExplanationFactor[] = [];

    // Simulate LIME by perturbing inputs and measuring impact
    if (context.inputs) {
      for (const [feature, value] of Object.entries(context.inputs)) {
        // Simulate importance calculation
        const importance = Math.random() * 0.5 + 0.5; // 0.5-1.0
        const contribution = (decision.confidence || 0.5) * importance;

        factors.push({
          feature,
          importance,
          value,
          contribution,
          direction: contribution > 0 ? 'positive' : 'negative',
        });
      }
    }

    // Sort by importance
    factors.sort((a, b) => b.importance - a.importance);

    return {
      method: 'LIME',
      confidence: 0.85,
      factors: factors.slice(0, 5), // Top 5 factors
      naturalLanguage: this.generateNaturalLanguage(factors, decision),
    };
  }

  private generateNaturalLanguage(
    factors: ExplanationFactor[],
    decision: any
  ): string {
    const topFactors = factors.slice(0, 3);
    const factorDescriptions = topFactors
      .map(
        (f) => `${f.feature} (importance: ${(f.importance * 100).toFixed(1)}%)`
      )
      .join(', ');

    return (
      `The decision was primarily influenced by: ${factorDescriptions}. ` +
      `The model had ${(decision.confidence * 100).toFixed(1)}% confidence in this decision.`
    );
  }
}

/**
 * SHAP (SHapley Additive exPlanations) Implementation
 */
class SHAPExplainer implements Explainer {
  async explain(decision: any, context: any): Promise<Explanation> {
    runtimeLogger.debug('Generating SHAP explanation');

    const factors: ExplanationFactor[] = [];
    const baselineValue = 0.5; // Baseline prediction

    // Simulate SHAP values
    if (context.inputs) {
      let totalContribution = 0;

      for (const [feature, value] of Object.entries(context.inputs)) {
        // Simulate Shapley value calculation
        const shapValue = (Math.random() - 0.5) * 0.4;
        totalContribution += shapValue;

        factors.push({
          feature,
          importance: Math.abs(shapValue),
          value,
          contribution: shapValue,
          direction: shapValue > 0 ? 'positive' : 'negative',
        });
      }

      // Ensure contributions sum to difference from baseline
      const scale = (decision.value - baselineValue) / totalContribution;
      factors.forEach((f) => (f.contribution *= scale));
    }

    // Create waterfall visualization data
    const waterfall: Visualization = {
      type: 'chart',
      data: {
        type: 'waterfall',
        baseline: baselineValue,
        factors: factors.map((f) => ({
          name: f.feature,
          value: f.contribution,
        })),
        final: decision.value,
      },
      description: 'SHAP waterfall plot showing feature contributions',
    };

    return {
      method: 'SHAP',
      confidence: 0.9,
      factors,
      naturalLanguage: this.generateNaturalLanguage(
        factors,
        baselineValue,
        decision
      ),
      visualizations: [waterfall],
    };
  }

  private generateNaturalLanguage(
    factors: ExplanationFactor[],
    baseline: number,
    decision: any
  ): string {
    const positiveFactors = factors.filter((f) => f.direction === 'positive');
    const negativeFactors = factors.filter((f) => f.direction === 'negative');

    let explanation = `Starting from a baseline of ${baseline}, `;

    if (positiveFactors.length > 0) {
      explanation += `the following factors increased the prediction: ${positiveFactors
        .slice(0, 2)
        .map((f) => f.feature)
        .join(', ')}. `;
    }

    if (negativeFactors.length > 0) {
      explanation += `The following factors decreased the prediction: ${negativeFactors
        .slice(0, 2)
        .map((f) => f.feature)
        .join(', ')}. `;
    }

    explanation += `The final prediction was ${decision.value.toFixed(3)}.`;

    return explanation;
  }
}

/**
 * Attention Weights Explainer (for transformer models)
 */
class AttentionExplainer implements Explainer {
  async explain(decision: any, context: any): Promise<Explanation> {
    runtimeLogger.debug('Generating attention-based explanation');

    const factors: ExplanationFactor[] = [];

    // Simulate attention weights
    if (context.tokens) {
      const tokens = Array.isArray(context.tokens)
        ? context.tokens
        : [context.tokens];
      const attentionWeights = tokens.map(() => Math.random());
      const sum = attentionWeights.reduce((a, b) => a + b, 0);

      tokens.forEach((token, i) => {
        const weight = attentionWeights[i] / sum;
        factors.push({
          feature: `token_${i}`,
          importance: weight,
          value: token,
          contribution: weight * decision.confidence,
          direction: 'positive',
        });
      });
    }

    // Create attention heatmap
    const heatmap: Visualization = {
      type: 'heatmap',
      data: {
        values: factors.map((f) => f.importance),
        labels: factors.map((f) => f.value),
      },
      description: 'Attention weights heatmap',
    };

    return {
      method: 'attention-weights',
      confidence: 0.8,
      factors,
      visualizations: [heatmap],
      naturalLanguage: this.generateNaturalLanguage(factors),
    };
  }

  private generateNaturalLanguage(factors: ExplanationFactor[]): string {
    const topTokens = factors
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map((f) => `"${f.value}" (${(f.importance * 100).toFixed(1)}%)`);

    return `The model focused most on these tokens: ${topTokens.join(', ')}.`;
  }
}

/**
 * Counterfactual Explainer
 */
class CounterfactualExplainer {
  async generateCounterfactuals(
    decision: any,
    context: any,
    numCounterfactuals: number = 3
  ): Promise<Counterfactual[]> {
    runtimeLogger.debug('Generating counterfactual explanations');

    const counterfactuals: Counterfactual[] = [];
    const inputs = context.inputs || {};

    // Generate different counterfactual scenarios
    for (let i = 0; i < numCounterfactuals; i++) {
      const changes: CounterfactualChange[] = [];
      const modifiedInputs = { ...inputs };

      // Select features to change
      const features = Object.keys(inputs);
      const numChanges = Math.min(2 + i, features.length);
      const selectedFeatures = this.selectRandomFeatures(features, numChanges);

      for (const feature of selectedFeatures) {
        const originalValue = inputs[feature];
        const newValue = this.generateAlternativeValue(originalValue);

        modifiedInputs[feature] = newValue;

        changes.push({
          feature,
          from: originalValue,
          to: newValue,
          effort: this.estimateChangeEffort(feature, originalValue, newValue),
        });
      }

      // Simulate outcome with modified inputs
      const newOutcome = this.simulateOutcome(modifiedInputs, decision);

      counterfactuals.push({
        description: this.generateDescription(changes, newOutcome),
        changes,
        outcome: newOutcome,
        feasibility: this.calculateFeasibility(changes),
      });
    }

    return counterfactuals;
  }

  private selectRandomFeatures(features: string[], count: number): string[] {
    const shuffled = [...features].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private generateAlternativeValue(original: any): any {
    if (typeof original === 'number') {
      // Increase or decrease by 10-50%
      const change =
        (Math.random() * 0.4 + 0.1) * (Math.random() > 0.5 ? 1 : -1);
      return original * (1 + change);
    } else if (typeof original === 'boolean') {
      return !original;
    } else if (typeof original === 'string') {
      // Simple string alternatives
      const alternatives = ['low', 'medium', 'high'];
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    return original;
  }

  private estimateChangeEffort(
    feature: string,
    from: any,
    to: any
  ): 'low' | 'medium' | 'high' {
    // Simulate effort estimation based on feature type and change magnitude
    if (typeof from === 'boolean') {
      return 'low';
    } else if (typeof from === 'number') {
      const change = Math.abs(to - from) / Math.abs(from);
      if (change < 0.1) return 'low';
      if (change < 0.3) return 'medium';
      return 'high';
    }
    return 'medium';
  }

  private simulateOutcome(inputs: any, originalDecision: any): any {
    // Simulate how the decision would change with new inputs
    const changeImpact = Object.keys(inputs).length * 0.1 * Math.random();
    return {
      ...originalDecision,
      value:
        originalDecision.value + changeImpact * (Math.random() > 0.5 ? 1 : -1),
      confidence: originalDecision.confidence * (0.8 + Math.random() * 0.2),
    };
  }

  private generateDescription(
    changes: CounterfactualChange[],
    outcome: any
  ): string {
    const changeDescriptions = changes
      .map((c) => `change ${c.feature} from ${c.from} to ${c.to}`)
      .join(', ');

    return `If you ${changeDescriptions}, the outcome would be ${JSON.stringify(outcome.value)}.`;
  }

  private calculateFeasibility(changes: CounterfactualChange[]): number {
    // Calculate overall feasibility based on effort levels
    const effortScores = {
      low: 1.0,
      medium: 0.6,
      high: 0.3,
    };

    const totalScore = changes.reduce(
      (sum, change) => sum + effortScores[change.effort],
      0
    );

    return totalScore / changes.length;
  }
}

/**
 * Main Explainability Engine
 */
export class ExplainabilityEngine {
  private readonly config: ExplainabilityConfig;
  private readonly explainers: Map<ExplainabilityMethod, Explainer>;
  private readonly counterfactualExplainer: CounterfactualExplainer;

  constructor(config: ExplainabilityConfig) {
    this.config = config;
    this.explainers = new Map();
    this.counterfactualExplainer = new CounterfactualExplainer();

    // Initialize explainers based on config
    if (config.methods.includes('LIME')) {
      this.explainers.set('LIME', new LIMEExplainer());
    }
    if (config.methods.includes('SHAP')) {
      this.explainers.set('SHAP', new SHAPExplainer());
    }
    if (config.methods.includes('attention-weights')) {
      this.explainers.set('attention-weights', new AttentionExplainer());
    }
  }

  /**
   * Generate explanation for a decision
   */
  async generateExplanation(decision: any, context: any): Promise<Explanation> {
    runtimeLogger.info('Generating AI explanation', {
      methods: this.config.methods,
      detailLevel: this.config.detailLevel,
    });

    // Use the first available method
    const method = this.config.methods[0];
    const explainer = this.explainers.get(method);

    if (!explainer) {
      throw new Error(`No explainer available for method: ${method}`);
    }

    const explanation = await explainer.explain(decision, context);

    // Add counterfactuals if requested
    if (this.config.methods.includes('counterfactual')) {
      explanation.counterfactuals =
        await this.counterfactualExplainer.generateCounterfactuals(
          decision,
          context
        );
    }

    // Adjust detail level
    return this.adjustDetailLevel(explanation);
  }

  /**
   * Handle explanation request from user
   */
  async handleExplanationRequest(
    request: ExplanationRequest
  ): Promise<ExplanationResponse> {
    runtimeLogger.info(`Handling explanation request ${request.id}`);

    // Retrieve decision data (in production, from storage)
    const decision = { value: 0.85, confidence: 0.9 }; // Simulated
    const context = { inputs: { feature1: 10, feature2: 'high' } }; // Simulated

    // Generate explanation
    const explanation = await this.generateExplanation(decision, context);

    // Format response based on request
    const response: ExplanationResponse = {
      requestId: request.id,
      providedAt: new Date(),
      decision,
      explanation: {
        summary: explanation.naturalLanguage || '',
        keyFactors: explanation.factors.slice(0, 5),
        reasoning: this.generateReasoning(explanation),
        alternatives: explanation.counterfactuals,
        confidence: explanation.confidence,
        limitations: this.identifyLimitations(explanation),
      },
      format: request.detailLevel === 'simple' ? 'text' : 'structured',
      language: request.language,
    };

    // Translate if needed
    if (request.language !== 'en') {
      response.explanation.summary = await this.translate(
        response.explanation.summary,
        request.language
      );
    }

    return response;
  }

  /**
   * Adjust explanation detail level
   */
  private adjustDetailLevel(explanation: Explanation): Explanation {
    switch (this.config.detailLevel) {
      case 'basic':
        // Keep only top 3 factors and simple language
        return {
          ...explanation,
          factors: explanation.factors.slice(0, 3),
          visualizations: undefined,
          counterfactuals: explanation.counterfactuals?.slice(0, 1),
        };

      case 'intermediate':
        // Keep top 5 factors and basic visualizations
        return {
          ...explanation,
          factors: explanation.factors.slice(0, 5),
          counterfactuals: explanation.counterfactuals?.slice(0, 2),
        };

      case 'detailed':
      case 'technical':
        // Keep all information
        return explanation;

      default:
        return explanation;
    }
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(explanation: Explanation): string {
    const method = explanation.method;
    const topFactors = explanation.factors.slice(0, 3);

    let reasoning = `Using ${method} analysis, we identified ${explanation.factors.length} factors influencing the decision. `;

    reasoning += `The most important factors were: ${topFactors
      .map((f) => `${f.feature} (${f.direction} impact)`)
      .join(', ')}. `;

    if (explanation.counterfactuals && explanation.counterfactuals.length > 0) {
      reasoning += `We also identified ${explanation.counterfactuals.length} alternative scenarios that could lead to different outcomes. `;
    }

    reasoning += `The explanation has ${(explanation.confidence * 100).toFixed(0)}% confidence.`;

    return reasoning;
  }

  /**
   * Identify limitations in the explanation
   */
  private identifyLimitations(explanation: Explanation): string[] {
    const limitations: string[] = [];

    // Method-specific limitations
    switch (explanation.method) {
      case 'LIME':
        limitations.push(
          'Explanations are local and may not represent global model behavior'
        );
        break;
      case 'SHAP':
        limitations.push(
          'Assumes feature independence which may not hold in practice'
        );
        break;
      case 'attention-weights':
        limitations.push(
          'Attention weights may not directly correspond to importance'
        );
        break;
    }

    // General limitations
    if (explanation.confidence < 0.7) {
      limitations.push('Lower confidence in explanation accuracy');
    }

    if (explanation.factors.length < 3) {
      limitations.push('Limited number of explanatory factors available');
    }

    return limitations;
  }

  /**
   * Translate text (simulated)
   */
  private async translate(text: string, language: string): Promise<string> {
    // In production, use actual translation service
    const translations: Record<string, string> = {
      es: '[ES] ' + text,
      fr: '[FR] ' + text,
      de: '[DE] ' + text,
    };

    return translations[language] || text;
  }
}

/**
 * Create explainability engine
 */
export function createExplainabilityEngine(
  config: ExplainabilityConfig
): ExplainabilityEngine {
  return new ExplainabilityEngine(config);
}
