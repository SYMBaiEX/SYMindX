/**
 * Communication and Style Types for SYMindX
 */

/**
 * Communication style configuration
 */
export interface CommunicationStyle {
  formality: number; // 0-1, how formal the communication should be
  verbosity: number; // 0-1, how verbose responses should be
  emotionality: number; // 0-1, how much emotion to express
  directness: number; // 0-1, how direct/blunt to be
  humor: number; // 0-1, how much humor to include
  technicality: number; // 0-1, how technical language should be
  empathy: number; // 0-1, how empathetic responses should be
  responseSpeed: 'instant' | 'thoughtful' | 'deliberate'; // Response timing preference
  preferredLength: 'concise' | 'moderate' | 'detailed'; // Response length preference
  culturalContext?: string; // Cultural adaptation context
  personalityAdaptation?: number; // How much to adapt to user personality
  contextSensitivity?: number; // How much to adapt to conversation context
}

/**
 * Message context for style adaptation
 */
export interface MessageContext {
  originalMessage: string;
  adaptedMessage: string;
  style: CommunicationStyle;
  emotion?: string;
  mood?: string;
  urgency?: 'low' | 'medium' | 'high';
  conversationPhase?: string;
}

/**
 * Style adaptation configuration
 */
export interface StyleAdapterConfig {
  enableLearning: boolean;
  adaptationRate: number;
  contextSensitivity: number;
  emotionalInfluence: number;
  personalityWeight: number;
  moodInfluence: number;
  preservePersonality: boolean;
  defaultStyle?: Partial<CommunicationStyle>;
}

/**
 * Feedback for style learning
 */
export interface StyleFeedback {
  feedback: 'positive' | 'negative' | 'neutral';
  style: CommunicationStyle;
  timestamp: Date;
  context?: {
    originalLength: number;
    adaptedLength: number;
    styleUsed: CommunicationStyle;
  };
}

/**
 * Expression adaptation options
 */
export interface ExpressionOptions {
  preserveCore?: boolean;
  adaptationStrength?: number;
  emotionalIntensity?: number;
  contextualWeight?: number;
  styleConsistency?: number;
}

/**
 * Communication preferences
 */
export interface CommunicationPreferences {
  preferredStyle: CommunicationStyle;
  adaptationEnabled: boolean;
  learningEnabled: boolean;
  contextSensitive: boolean;
  emotionallyAware: boolean;
  culturalAdaptation: boolean;
}

/**
 * Expression engine configuration
 */
export interface ExpressionEngineConfig {
  emotionalInfluence: number;
  personalityAdaptation: number;
  contextAdaptation: boolean;
  styleConsistency: number;
  preserveCore: boolean;
  adaptationStrength: number;
}
