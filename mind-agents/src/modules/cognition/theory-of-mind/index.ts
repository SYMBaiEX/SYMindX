/**
 * Theory of Mind Module for SYMindX
 *
 * Enables agents to model and reason about the mental states of other agents,
 * including their beliefs, desires, intentions, and emotional states.
 */

import { Agent, EmotionState } from '../../../types/agent';
import { BaseConfig } from '../../../types/common';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Mental model of another agent
 */
export interface MentalModel {
  agentId: string;
  lastUpdated: Date;

  // Belief tracking
  beliefs: Map<string, { value: any; confidence: number }>;

  // Desire/goal tracking
  desires: Array<{ goal: string; priority: number }>;

  // Intention tracking
  intentions: Array<{ action: string; likelihood: number }>;

  // Emotional state model
  emotionalState: {
    current: string;
    intensity: number;
    history: Array<{ emotion: string; timestamp: Date }>;
  };

  // Communication style
  communicationStyle: {
    formality: number; // 0 = casual, 1 = formal
    verbosity: number; // 0 = terse, 1 = verbose
    directness: number; // 0 = indirect, 1 = direct
    emotionality: number; // 0 = logical, 1 = emotional
  };

  // Relationship quality
  relationship: {
    trust: number; // 0 = distrust, 1 = complete trust
    rapport: number; // 0 = hostile, 1 = friendly
    familiarity: number; // 0 = stranger, 1 = intimate
    influence: number; // 0 = no influence, 1 = high influence
  };

  // Prediction accuracy tracking
  predictions: Array<{
    predicted: string;
    actual?: string;
    accuracy?: number;
    timestamp: Date;
  }>;
}

/**
 * Theory of Mind configuration
 */
export interface TheoryOfMindConfig extends BaseConfig {
  // Model depth
  modelingDepth?: number; // How many levels deep (I think that you think that I think...)

  // Update frequency
  updateThreshold?: number; // Confidence change needed to update model

  // Prediction settings
  enablePrediction?: boolean; // Enable behavior prediction
  predictionHorizon?: number; // How far ahead to predict (ms)

  // Empathy settings
  empathyLevel?: number; // 0 = no empathy, 1 = high empathy
  emotionalContagion?: number; // How much others' emotions affect the agent
}

/**
 * Theory of Mind implementation
 */
export class TheoryOfMind {
  private models: Map<string, MentalModel> = new Map();
  private config: TheoryOfMindConfig;
  private selfModel?: MentalModel; // How the agent models itself

  constructor(config: TheoryOfMindConfig = {}) {
    this.config = {
      modelingDepth: 2,
      updateThreshold: 0.1,
      enablePrediction: true,
      predictionHorizon: 300000, // 5 minutes
      empathyLevel: 0.5,
      emotionalContagion: 0.3,
      ...config,
    };
  }

  /**
   * Initialize or get a mental model for an agent
   */
  getModel(agentId: string): MentalModel {
    if (!this.models.has(agentId)) {
      this.models.set(agentId, this.createInitialModel(agentId));
    }
    return this.models.get(agentId)!;
  }

  /**
   * Create initial mental model
   */
  private createInitialModel(agentId: string): MentalModel {
    return {
      agentId,
      lastUpdated: new Date(),
      beliefs: new Map(),
      desires: [],
      intentions: [],
      emotionalState: {
        current: 'neutral',
        intensity: 0.5,
        history: [],
      },
      communicationStyle: {
        formality: 0.5,
        verbosity: 0.5,
        directness: 0.5,
        emotionality: 0.5,
      },
      relationship: {
        trust: 0.5,
        rapport: 0.5,
        familiarity: 0,
        influence: 0.5,
      },
      predictions: [],
    };
  }

  /**
   * Update mental model based on observed behavior
   */
  updateModel(
    agentId: string,
    observation: {
      action?: string;
      message?: string;
      emotion?: EmotionState;
      context?: any;
    }
  ): void {
    const model = this.getModel(agentId);

    // Update beliefs based on statements
    if (observation.message) {
      this.updateBeliefs(model, observation.message);
      this.analyzeCommunicationStyle(model, observation.message);
    }

    // Update emotional model
    if (observation.emotion) {
      this.updateEmotionalModel(model, observation.emotion);
    }

    // Update intentions based on actions
    if (observation.action) {
      this.updateIntentions(model, observation.action, observation.context);
    }

    // Update relationship based on interaction
    this.updateRelationship(model, observation);

    model.lastUpdated = new Date();
    runtimeLogger.cognition(`Updated mental model for ${agentId}`);
  }

  /**
   * Predict what another agent might do
   */
  predict(
    agentId: string,
    situation: string
  ): {
    action: string;
    confidence: number;
    reasoning: string;
  } {
    const model = this.getModel(agentId);

    // Simple prediction based on past patterns
    const relevantIntentions = model.intentions
      .filter((i) => i.likelihood > 0.5)
      .sort((a, b) => b.likelihood - a.likelihood);

    if (relevantIntentions.length === 0) {
      return {
        action: 'unknown',
        confidence: 0.1,
        reasoning: 'No established behavior patterns',
      };
    }

    // Consider emotional state
    const emotionalInfluence = this.calculateEmotionalInfluence(
      model,
      situation
    );

    // Make prediction
    const predicted = relevantIntentions[0];
    const confidence = predicted.likelihood * emotionalInfluence;

    // Store prediction for accuracy tracking
    model.predictions.push({
      predicted: predicted.action,
      timestamp: new Date(),
    });

    return {
      action: predicted.action,
      confidence,
      reasoning: `Based on ${model.predictions.length} past observations`,
    };
  }

  /**
   * Empathize with another agent's emotional state
   */
  empathize(agentId: string): {
    emotion: string;
    intensity: number;
    understanding: string;
  } {
    const model = this.getModel(agentId);

    // Apply empathy level
    const empathizedIntensity =
      model.emotionalState.intensity * this.config.empathyLevel!;

    // Generate understanding based on relationship
    let understanding = 'I sense their emotional state';
    if (model.relationship.familiarity > 0.7) {
      understanding = 'I understand how they feel based on our history';
    } else if (model.relationship.rapport > 0.7) {
      understanding = 'I feel connected to their emotional experience';
    }

    return {
      emotion: model.emotionalState.current,
      intensity: empathizedIntensity,
      understanding,
    };
  }

  /**
   * Model recursive beliefs (I think that you think that I think...)
   */
  modelRecursiveBelief(
    agentId: string,
    belief: string,
    depth: number = 1
  ): {
    belief: string;
    confidence: number;
    depth: number;
  } {
    if (depth > this.config.modelingDepth!) {
      return { belief: 'unknown', confidence: 0, depth };
    }

    const model = this.getModel(agentId);
    const baseBelief = model.beliefs.get(belief);

    if (!baseBelief) {
      return { belief: 'unknown', confidence: 0, depth };
    }

    // Confidence decreases with depth
    const confidence = baseBelief.confidence * Math.pow(0.8, depth - 1);

    return {
      belief: baseBelief.value,
      confidence,
      depth,
    };
  }

  /**
   * Update beliefs from communication
   */
  private updateBeliefs(model: MentalModel, message: string): void {
    const lower = message.toLowerCase();

    // Extract belief indicators
    if (lower.includes('i think') || lower.includes('i believe')) {
      const belief = message.split(/i think|i believe/i)[1]?.trim();
      if (belief) {
        model.beliefs.set('stated_belief', { value: belief, confidence: 0.8 });
      }
    }

    // Extract preferences
    if (lower.includes('i like') || lower.includes('i prefer')) {
      const preference = message.split(/i like|i prefer/i)[1]?.trim();
      if (preference) {
        model.beliefs.set('preference', { value: preference, confidence: 0.7 });
      }
    }
  }

  /**
   * Analyze communication style
   */
  private analyzeCommunicationStyle(model: MentalModel, message: string): void {
    // Formality analysis
    const formalIndicators = [
      'please',
      'thank you',
      'would you',
      'could you',
      'sir',
      'madam',
    ];
    const informalIndicators = [
      'hey',
      'yeah',
      'nah',
      'gonna',
      'wanna',
      'lol',
      'omg',
    ];

    const formalCount = formalIndicators.filter((i) =>
      message.toLowerCase().includes(i)
    ).length;
    const informalCount = informalIndicators.filter((i) =>
      message.toLowerCase().includes(i)
    ).length;

    // Update formality with momentum
    const formalityDelta = (formalCount - informalCount) * 0.1;
    model.communicationStyle.formality = Math.max(
      0,
      Math.min(1, model.communicationStyle.formality + formalityDelta)
    );

    // Verbosity analysis
    const wordCount = message.split(/\s+/).length;
    const verbosityDelta = wordCount > 20 ? 0.05 : -0.05;
    model.communicationStyle.verbosity = Math.max(
      0,
      Math.min(1, model.communicationStyle.verbosity + verbosityDelta)
    );

    // Directness analysis
    const directIndicators = ['want', 'need', 'must', 'will', 'do', "don't"];
    const directCount = directIndicators.filter((i) =>
      message.toLowerCase().includes(i)
    ).length;
    const directnessDelta = directCount * 0.05;
    model.communicationStyle.directness = Math.max(
      0,
      Math.min(1, model.communicationStyle.directness + directnessDelta)
    );
  }

  /**
   * Update emotional model
   */
  private updateEmotionalModel(
    model: MentalModel,
    emotion: EmotionState
  ): void {
    // Update current state
    model.emotionalState.current = emotion.current;
    model.emotionalState.intensity = emotion.intensity;

    // Add to history
    model.emotionalState.history.push({
      emotion: emotion.current,
      timestamp: new Date(),
    });

    // Keep only recent history
    const oneHourAgo = Date.now() - 3600000;
    model.emotionalState.history = model.emotionalState.history.filter(
      (h) => h.timestamp.getTime() > oneHourAgo
    );
  }

  /**
   * Update intentions based on actions
   */
  private updateIntentions(
    model: MentalModel,
    action: string,
    context: any
  ): void {
    // Find existing intention
    const existing = model.intentions.find((i) => i.action === action);

    if (existing) {
      // Increase likelihood of repeated actions
      existing.likelihood = Math.min(1, existing.likelihood + 0.1);
    } else {
      // Add new intention
      model.intentions.push({
        action,
        likelihood: 0.5,
      });
    }

    // Decay other intentions
    model.intentions = model.intentions
      .map((i) =>
        i.action === action ? i : { ...i, likelihood: i.likelihood * 0.95 }
      )
      .filter((i) => i.likelihood > 0.1);
  }

  /**
   * Update relationship quality
   */
  private updateRelationship(model: MentalModel, observation: any): void {
    // Positive interactions increase rapport
    if (
      observation.message?.toLowerCase().includes('thank') ||
      observation.message?.toLowerCase().includes('appreciate')
    ) {
      model.relationship.rapport = Math.min(
        1,
        model.relationship.rapport + 0.05
      );
    }

    // Repeated interactions increase familiarity
    model.relationship.familiarity = Math.min(
      1,
      model.relationship.familiarity + 0.01
    );

    // Trust builds slowly over positive interactions
    if (
      observation.emotion?.current === 'happy' ||
      observation.emotion?.current === 'grateful'
    ) {
      model.relationship.trust = Math.min(1, model.relationship.trust + 0.02);
    }
  }

  /**
   * Calculate emotional influence on predictions
   */
  private calculateEmotionalInfluence(
    model: MentalModel,
    situation: string
  ): number {
    const emotionalState = model.emotionalState.current;
    const intensity = model.emotionalState.intensity;

    // Emotions affect decision-making
    if (emotionalState === 'angry' && situation.includes('conflict')) {
      return 0.8 * intensity; // Anger makes conflict more likely
    } else if (emotionalState === 'happy' && situation.includes('cooperate')) {
      return 1.2 * intensity; // Happiness makes cooperation more likely
    }

    return 1.0; // Neutral influence
  }

  /**
   * Get relationship summary
   */
  getRelationshipSummary(agentId: string): string {
    const model = this.getModel(agentId);
    const r = model.relationship;

    let summary = '';

    // Trust level
    if (r.trust > 0.8) summary += 'Highly trusted. ';
    else if (r.trust < 0.3) summary += 'Limited trust. ';

    // Rapport level
    if (r.rapport > 0.8) summary += 'Excellent rapport. ';
    else if (r.rapport < 0.3) summary += 'Poor rapport. ';

    // Familiarity
    if (r.familiarity > 0.8) summary += 'Very familiar. ';
    else if (r.familiarity < 0.2) summary += 'Still getting to know them. ';

    return summary || 'Neutral relationship.';
  }

  /**
   * Export mental models for persistence
   */
  exportModels(): Record<string, MentalModel> {
    const exported: Record<string, MentalModel> = {};
    for (const [id, model] of Array.from(this.models.entries())) {
      exported[id] = {
        ...model,
        beliefs: new Map(Array.from(model.beliefs.entries())),
      };
    }
    return exported;
  }

  /**
   * Import mental models
   */
  importModels(models: Record<string, any>): void {
    for (const [id, model] of Object.entries(models)) {
      const imported: MentalModel = {
        ...model,
        beliefs: new Map(model.beliefs),
        lastUpdated: new Date(model.lastUpdated),
      };
      this.models.set(id, imported);
    }
  }
}

// Factory function
export function createTheoryOfMind(config?: TheoryOfMindConfig): TheoryOfMind {
  return new TheoryOfMind(config);
}

// Export factory function for discovery system
export function createTheoryOfMindCognition(
  config: TheoryOfMindConfig = {}
): TheoryOfMind {
  return new TheoryOfMind(config);
}
