import { Agent } from '../../src/types/agent';
import { EmotionState } from '../../src/types/emotion';
import { Message } from '../../src/types/message';
import { createAgent, createMessage } from '../utils/test-factories';

/**
 * Emotion Consistency Tests
 * Validates emotional responses and transitions
 */

export interface EmotionTransition {
  from: EmotionState;
  to: EmotionState;
  trigger: string;
  valid: boolean;
  confidence: number;
}

export interface EmotionConsistencyReport {
  agent: string;
  transitions: EmotionTransition[];
  consistency: number;
  anomalies: string[];
  dominantEmotions: Map<string, number>;
  emotionalStability: number;
}

export class EmotionConsistencyValidator {
  private emotionHistory: Map<string, EmotionState[]> = new Map();
  private transitionRules: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeTransitionRules();
  }

  private initializeTransitionRules(): void {
    // Define valid emotion transitions
    this.transitionRules.set('happy', new Set(['neutral', 'proud', 'empathetic', 'curious', 'confident']));
    this.transitionRules.set('sad', new Set(['neutral', 'empathetic', 'nostalgic', 'anxious']));
    this.transitionRules.set('angry', new Set(['neutral', 'anxious', 'sad', 'confused']));
    this.transitionRules.set('anxious', new Set(['neutral', 'confused', 'sad', 'angry']));
    this.transitionRules.set('confident', new Set(['happy', 'proud', 'neutral', 'empathetic']));
    this.transitionRules.set('nostalgic', new Set(['happy', 'sad', 'neutral', 'empathetic']));
    this.transitionRules.set('empathetic', new Set(['happy', 'sad', 'neutral', 'curious']));
    this.transitionRules.set('curious', new Set(['happy', 'confused', 'neutral', 'empathetic']));
    this.transitionRules.set('proud', new Set(['happy', 'confident', 'neutral']));
    this.transitionRules.set('confused', new Set(['anxious', 'curious', 'neutral', 'angry']));
    this.transitionRules.set('neutral', new Set(['happy', 'sad', 'angry', 'anxious', 'confident', 'nostalgic', 'empathetic', 'curious', 'proud', 'confused']));
  }

  public recordEmotionState(agentId: string, state: EmotionState): void {
    if (!this.emotionHistory.has(agentId)) {
      this.emotionHistory.set(agentId, []);
    }
    this.emotionHistory.get(agentId)!.push({ ...state });
  }

  public validateEmotionTransition(
    from: EmotionState,
    to: EmotionState,
    trigger: string
  ): EmotionTransition {
    const fromDominant = this.getDominantEmotion(from);
    const toDominant = this.getDominantEmotion(to);
    
    const validTransitions = this.transitionRules.get(fromDominant) || new Set();
    const isValid = validTransitions.has(toDominant) || fromDominant === toDominant;
    
    // Calculate transition smoothness
    const smoothness = this.calculateTransitionSmoothness(from, to);
    
    return {
      from,
      to,
      trigger,
      valid: isValid && smoothness > 0.3,
      confidence: isValid ? smoothness : 0,
    };
  }

  private getDominantEmotion(state: EmotionState): string {
    let maxIntensity = 0;
    let dominant = 'neutral';
    
    for (const [emotion, intensity] of Object.entries(state)) {
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        dominant = emotion;
      }
    }
    
    return dominant;
  }

  private calculateTransitionSmoothness(from: EmotionState, to: EmotionState): number {
    let totalChange = 0;
    let emotionCount = 0;
    
    for (const emotion in from) {
      const fromIntensity = from[emotion as keyof EmotionState];
      const toIntensity = to[emotion as keyof EmotionState];
      
      totalChange += Math.abs(toIntensity - fromIntensity);
      emotionCount++;
    }
    
    // Smoothness is inverse of average change
    const avgChange = totalChange / emotionCount;
    return Math.max(0, 1 - avgChange);
  }

  public analyzeEmotionalConsistency(agentId: string): EmotionConsistencyReport {
    const history = this.emotionHistory.get(agentId) || [];
    if (history.length < 2) {
      return {
        agent: agentId,
        transitions: [],
        consistency: 1,
        anomalies: [],
        dominantEmotions: new Map(),
        emotionalStability: 1,
      };
    }

    const transitions: EmotionTransition[] = [];
    const anomalies: string[] = [];
    const dominantEmotions = new Map<string, number>();
    
    // Analyze transitions
    for (let i = 1; i < history.length; i++) {
      const transition = this.validateEmotionTransition(
        history[i - 1],
        history[i],
        `step_${i}`
      );
      transitions.push(transition);
      
      if (!transition.valid) {
        anomalies.push(`Invalid transition at step ${i}: ${this.getDominantEmotion(history[i - 1])} → ${this.getDominantEmotion(history[i])}`);
      }
      
      // Track dominant emotions
      const dominant = this.getDominantEmotion(history[i]);
      dominantEmotions.set(dominant, (dominantEmotions.get(dominant) || 0) + 1);
    }
    
    // Calculate consistency
    const validTransitions = transitions.filter(t => t.valid).length;
    const consistency = transitions.length > 0 ? validTransitions / transitions.length : 1;
    
    // Calculate emotional stability
    const stability = this.calculateEmotionalStability(history);
    
    return {
      agent: agentId,
      transitions,
      consistency,
      anomalies,
      dominantEmotions,
      emotionalStability: stability,
    };
  }

  private calculateEmotionalStability(history: EmotionState[]): number {
    if (history.length < 2) return 1;
    
    let totalVariance = 0;
    let measurementCount = 0;
    
    // Calculate variance for each emotion across time
    const emotions = Object.keys(history[0]) as (keyof EmotionState)[];
    
    for (const emotion of emotions) {
      const values = history.map(state => state[emotion]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      totalVariance += variance;
      measurementCount++;
    }
    
    // Lower variance means higher stability
    const avgVariance = totalVariance / measurementCount;
    return Math.max(0, 1 - avgVariance);
  }

  public detectEmotionalAnomalies(
    agent: Agent,
    context: {
      recentMessages: Message[];
      expectedPattern?: string;
    }
  ): string[] {
    const anomalies: string[] = [];
    const agentId = agent.id;
    const history = this.emotionHistory.get(agentId) || [];
    
    if (history.length === 0) return anomalies;
    
    // Check for stuck emotions
    if (history.length > 5) {
      const recent = history.slice(-5);
      const dominantEmotions = recent.map(s => this.getDominantEmotion(s));
      
      if (new Set(dominantEmotions).size === 1) {
        anomalies.push(`Emotion stuck in ${dominantEmotions[0]} state for 5+ steps`);
      }
    }
    
    // Check for rapid oscillations
    if (history.length > 3) {
      const recent = history.slice(-4);
      const oscillating = this.detectOscillation(recent);
      
      if (oscillating) {
        anomalies.push('Rapid emotional oscillation detected');
      }
    }
    
    // Check for inappropriate emotional responses
    if (context.recentMessages.length > 0) {
      const lastMessage = context.recentMessages[context.recentMessages.length - 1];
      const currentEmotion = history[history.length - 1];
      
      const inappropriate = this.checkEmotionalAppropriateness(lastMessage, currentEmotion);
      if (inappropriate) {
        anomalies.push(`Inappropriate emotional response to: "${lastMessage.content.substring(0, 50)}..."`);
      }
    }
    
    // Check for emotional flatness
    const currentState = history[history.length - 1];
    const emotionalRange = this.calculateEmotionalRange(currentState);
    
    if (emotionalRange < 0.1) {
      anomalies.push('Emotional flatness detected - all emotions near zero');
    }
    
    return anomalies;
  }

  private detectOscillation(states: EmotionState[]): boolean {
    const dominants = states.map(s => this.getDominantEmotion(s));
    
    // Check for A-B-A-B pattern
    if (dominants.length >= 4) {
      return dominants[0] === dominants[2] && 
             dominants[1] === dominants[3] && 
             dominants[0] !== dominants[1];
    }
    
    return false;
  }

  private checkEmotionalAppropriateness(message: Message, emotion: EmotionState): boolean {
    const content = message.content.toLowerCase();
    const dominant = this.getDominantEmotion(emotion);
    
    // Simple rules for inappropriate responses
    const inappropriatePatterns = [
      { keywords: ['died', 'death', 'funeral', 'tragedy'], inappropriate: ['happy', 'proud'] },
      { keywords: ['congratulations', 'success', 'achievement'], inappropriate: ['sad', 'angry'] },
      { keywords: ['help', 'urgent', 'emergency'], inappropriate: ['nostalgic', 'proud'] },
      { keywords: ['joke', 'funny', 'laugh'], inappropriate: ['angry', 'sad'] },
    ];
    
    for (const pattern of inappropriatePatterns) {
      const hasKeyword = pattern.keywords.some(keyword => content.includes(keyword));
      if (hasKeyword && pattern.inappropriate.includes(dominant)) {
        return true;
      }
    }
    
    return false;
  }

  private calculateEmotionalRange(state: EmotionState): number {
    const values = Object.values(state);
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max - min;
  }
}

// Test suite for emotion consistency
describe('Emotion Consistency Tests', () => {
  let validator: EmotionConsistencyValidator;
  let agent: Agent;

  beforeEach(() => {
    validator = new EmotionConsistencyValidator();
    agent = createAgent();
  });

  describe('Emotion Transitions', () => {
    test('should validate smooth transitions', () => {
      const from: EmotionState = {
        happy: 0.7,
        sad: 0.0,
        angry: 0.0,
        anxious: 0.0,
        confident: 0.5,
        nostalgic: 0.0,
        empathetic: 0.3,
        curious: 0.2,
        proud: 0.0,
        confused: 0.0,
        neutral: 0.1,
      };

      const to: EmotionState = {
        happy: 0.6,
        sad: 0.0,
        angry: 0.0,
        anxious: 0.0,
        confident: 0.6,
        nostalgic: 0.0,
        empathetic: 0.4,
        curious: 0.3,
        proud: 0.2,
        confused: 0.0,
        neutral: 0.1,
      };

      const transition = validator.validateEmotionTransition(from, to, 'positive_feedback');
      
      expect(transition.valid).toBe(true);
      expect(transition.confidence).toBeGreaterThan(0.7);
    });

    test('should detect invalid transitions', () => {
      const from: EmotionState = {
        happy: 0.8,
        sad: 0.0,
        angry: 0.0,
        anxious: 0.0,
        confident: 0.5,
        nostalgic: 0.0,
        empathetic: 0.2,
        curious: 0.1,
        proud: 0.3,
        confused: 0.0,
        neutral: 0.0,
      };

      const to: EmotionState = {
        happy: 0.0,
        sad: 0.0,
        angry: 0.9,
        anxious: 0.0,
        confident: 0.0,
        nostalgic: 0.0,
        empathetic: 0.0,
        curious: 0.0,
        proud: 0.0,
        confused: 0.0,
        neutral: 0.0,
      };

      const transition = validator.validateEmotionTransition(from, to, 'sudden_change');
      
      expect(transition.valid).toBe(false);
      expect(transition.confidence).toBeLessThan(0.3);
    });
  });

  describe('Emotional Consistency Analysis', () => {
    test('should track emotional consistency over time', () => {
      const states: EmotionState[] = [
        {
          happy: 0.5, sad: 0.0, angry: 0.0, anxious: 0.2,
          confident: 0.4, nostalgic: 0.0, empathetic: 0.3,
          curious: 0.2, proud: 0.0, confused: 0.0, neutral: 0.3,
        },
        {
          happy: 0.6, sad: 0.0, angry: 0.0, anxious: 0.1,
          confident: 0.5, nostalgic: 0.0, empathetic: 0.3,
          curious: 0.3, proud: 0.1, confused: 0.0, neutral: 0.2,
        },
        {
          happy: 0.7, sad: 0.0, angry: 0.0, anxious: 0.0,
          confident: 0.6, nostalgic: 0.0, empathetic: 0.2,
          curious: 0.4, proud: 0.2, confused: 0.0, neutral: 0.1,
        },
      ];

      states.forEach(state => validator.recordEmotionState(agent.id, state));
      
      const report = validator.analyzeEmotionalConsistency(agent.id);
      
      expect(report.consistency).toBeGreaterThan(0.8);
      expect(report.anomalies).toHaveLength(0);
      expect(report.emotionalStability).toBeGreaterThan(0.7);
    });

    test('should detect emotional anomalies', () => {
      // Simulate stuck emotion
      const stuckState: EmotionState = {
        happy: 0.9, sad: 0.0, angry: 0.0, anxious: 0.0,
        confident: 0.8, nostalgic: 0.0, empathetic: 0.1,
        curious: 0.0, proud: 0.7, confused: 0.0, neutral: 0.0,
      };

      for (let i = 0; i < 6; i++) {
        validator.recordEmotionState(agent.id, stuckState);
      }

      const anomalies = validator.detectEmotionalAnomalies(agent, {
        recentMessages: [],
      });

      expect(anomalies).toContain('Emotion stuck in happy state for 5+ steps');
    });

    test('should detect inappropriate emotional responses', () => {
      const sadNews = createMessage({
        content: 'I just heard that my friend died in an accident.',
        from: 'user',
      });

      const inappropriateState: EmotionState = {
        happy: 0.8, sad: 0.0, angry: 0.0, anxious: 0.0,
        confident: 0.5, nostalgic: 0.0, empathetic: 0.1,
        curious: 0.0, proud: 0.6, confused: 0.0, neutral: 0.0,
      };

      validator.recordEmotionState(agent.id, inappropriateState);

      const anomalies = validator.detectEmotionalAnomalies(agent, {
        recentMessages: [sadNews],
      });

      expect(anomalies.some(a => a.includes('Inappropriate emotional response'))).toBe(true);
    });
  });

  describe('Emotional Stability', () => {
    test('should measure emotional stability', () => {
      // Stable emotional progression
      const stableStates: EmotionState[] = [
        {
          happy: 0.5, sad: 0.1, angry: 0.0, anxious: 0.1,
          confident: 0.4, nostalgic: 0.1, empathetic: 0.3,
          curious: 0.3, proud: 0.1, confused: 0.0, neutral: 0.3,
        },
        {
          happy: 0.5, sad: 0.1, angry: 0.0, anxious: 0.1,
          confident: 0.4, nostalgic: 0.1, empathetic: 0.3,
          curious: 0.3, proud: 0.1, confused: 0.0, neutral: 0.3,
        },
        {
          happy: 0.6, sad: 0.0, angry: 0.0, anxious: 0.1,
          confident: 0.5, nostalgic: 0.0, empathetic: 0.3,
          curious: 0.4, proud: 0.2, confused: 0.0, neutral: 0.2,
        },
      ];

      stableStates.forEach(state => validator.recordEmotionState('stable-agent', state));
      
      const report = validator.analyzeEmotionalConsistency('stable-agent');
      expect(report.emotionalStability).toBeGreaterThan(0.8);

      // Unstable emotional progression
      const unstableStates: EmotionState[] = [
        {
          happy: 0.9, sad: 0.0, angry: 0.0, anxious: 0.0,
          confident: 0.8, nostalgic: 0.0, empathetic: 0.0,
          curious: 0.0, proud: 0.8, confused: 0.0, neutral: 0.0,
        },
        {
          happy: 0.0, sad: 0.9, angry: 0.0, anxious: 0.8,
          confident: 0.0, nostalgic: 0.0, empathetic: 0.0,
          curious: 0.0, proud: 0.0, confused: 0.8, neutral: 0.0,
        },
        {
          happy: 0.8, sad: 0.0, angry: 0.0, anxious: 0.0,
          confident: 0.9, nostalgic: 0.0, empathetic: 0.0,
          curious: 0.0, proud: 0.9, confused: 0.0, neutral: 0.0,
        },
      ];

      unstableStates.forEach(state => validator.recordEmotionState('unstable-agent', state));
      
      const unstableReport = validator.analyzeEmotionalConsistency('unstable-agent');
      expect(unstableReport.emotionalStability).toBeLessThan(0.3);
    });
  });
});