/**
 * Style Adaptation Skill
 * Handles communication style adaptation based on context and participant preferences
 */

import { Agent, ExtensionAction, ActionCategory } from '../../../types/index';
import { runtimeLogger } from '../../../utils/logger';
import { BaseCommunicationSkill, CommunicationSkillConfig } from './base-communication-skill';
import { StyleAdapter, StyleAdapterConfig } from '../style-adapter';

export interface StyleAdaptationSkillConfig extends CommunicationSkillConfig {
  styleAdapter?: StyleAdapterConfig;
  enableAdaptiveFormality?: boolean;
  enableMoodMatching?: boolean;
  enablePersonalityAdaptation?: boolean;
}

export interface StyleAdaptationRequest {
  mood?: string;
  formality?: number;
  participantStyle?: string;
  topics?: string[];
  conversationPhase?: string;
  emotion?: string;
  context?: any;
}

export class StyleAdaptationSkill extends BaseCommunicationSkill {
  private styleAdapter: StyleAdapter;
  protected override config: StyleAdaptationSkillConfig;

  constructor(config: StyleAdaptationSkillConfig) {
    super({
      name: 'Style Adaptation',
      description: 'Adapts communication style based on context and participants',
      ...config
    });
    this.config = {
      enableAdaptiveFormality: true,
      enableMoodMatching: true,
      enablePersonalityAdaptation: true,
      ...config
    };

    this.styleAdapter = new StyleAdapter(this.config.styleAdapter || {});
  }

  override async initialize(agent: Agent): Promise<void> {
    await super.initialize(agent);
    await this.styleAdapter.initialize(agent);
  }

  getActions(): ExtensionAction[] {
    return [
      this.createAction(
        'adaptStyle',
        'Adapt communication style based on context',
        ActionCategory.COMMUNICATION,
        {
          mood: { type: 'string', description: 'Current conversation mood', optional: true },
          formality: { type: 'number', description: 'Formality level (0-1)', optional: true },
          participantStyle: { type: 'string', description: 'Participant communication style', optional: true },
          topics: { type: 'array', description: 'Conversation topics', optional: true },
          conversationPhase: { type: 'string', description: 'Current conversation phase', optional: true }
        },
        async (agent: Agent, params: any) => {
          const styleRequest: StyleAdaptationRequest = {
            mood: params.mood,
            formality: typeof params.formality === 'number' ? params.formality : 0.5,
            participantStyle: params.participantStyle,
            topics: Array.isArray(params.topics) ? params.topics : [],
            conversationPhase: params.conversationPhase
          };

          const adaptedStyle = await this.styleAdapter.adaptStyle(styleRequest);
          return {
            adaptedStyle,
            recommendations: this.generateStyleRecommendations(styleRequest, adaptedStyle),
            timestamp: new Date()
          };
        }
      ),

      this.createAction(
        'applyStyle',
        'Apply style adaptation to text',
        ActionCategory.COMMUNICATION,
        {
          text: { type: 'string', description: 'Text to style' },
          styleRequest: { type: 'object', description: 'Style adaptation parameters' }
        },
        async (agent: Agent, params: any) => {
          const styledText = await this.styleAdapter.applyStyle(
            params.text,
            params.styleRequest
          );

          return {
            originalText: params.text,
            styledText,
            styleChanges: this.analyzeStyleChanges(params.text, styledText),
            timestamp: new Date()
          };
        }
      ),

      this.createAction(
        'analyzeParticipantStyle',
        'Analyze participant communication style from messages',
        ActionCategory.COMMUNICATION,
        {
          messages: { type: 'array', description: 'Array of messages from participant' },
          participantId: { type: 'string', description: 'Participant ID' }
        },
        async (agent: Agent, params: any) => {
          const styleProfile = this.analyzeParticipantStyle(
            params.messages,
            params.participantId
          );

          return {
            participantId: params.participantId,
            styleProfile,
            recommendations: this.generateParticipantStyleRecommendations(styleProfile),
            confidence: this.calculateStyleConfidence(params.messages),
            timestamp: new Date()
          };
        }
      ),

      this.createAction(
        'detectMood',
        'Detect conversation mood from recent messages',
        ActionCategory.COMMUNICATION,
        {
          messages: { type: 'array', description: 'Recent conversation messages' },
          contextWindow: { type: 'number', description: 'Number of recent messages to analyze', optional: true }
        },
        async (agent: Agent, params: any) => {
          const contextWindow = params.contextWindow || 10;
          const recentMessages = Array.isArray(params.messages) 
            ? params.messages.slice(-contextWindow)
            : [];

          const moodAnalysis = this.detectConversationMood(recentMessages);

          return {
            mood: moodAnalysis.primary,
            confidence: moodAnalysis.confidence,
            moodDistribution: moodAnalysis.distribution,
            trends: moodAnalysis.trends,
            recommendations: this.generateMoodBasedRecommendations(moodAnalysis),
            timestamp: new Date()
          };
        }
      ),

      this.createAction(
        'suggestFormality',
        'Suggest appropriate formality level',
        ActionCategory.COMMUNICATION,
        {
          context: { type: 'object', description: 'Conversation context' },
          participantCount: { type: 'number', description: 'Number of participants', optional: true },
          relationship: { type: 'string', description: 'Relationship type', optional: true }
        },
        async (agent: Agent, params: any) => {
          const formalityLevel = this.suggestFormalityLevel(
            params.context,
            params.participantCount,
            params.relationship
          );

          return {
            suggestedFormality: formalityLevel.level,
            reasoning: formalityLevel.reasoning,
            adjustments: formalityLevel.adjustments,
            examples: this.generateFormalityExamples(formalityLevel.level),
            timestamp: new Date()
          };
        }
      ),

      this.createAction(
        'matchCommunicationStyle',
        'Match communication style to participant preferences',
        ActionCategory.COMMUNICATION,
        {
          participantId: { type: 'string', description: 'Participant ID' },
          baseMessage: { type: 'string', description: 'Base message to adapt' },
          matchingLevel: { type: 'string', description: 'Matching level: subtle, moderate, strong', optional: true }
        },
        async (agent: Agent, params: any) => {
          const matchingLevel = params.matchingLevel || 'moderate';
          const adaptedMessage = await this.matchParticipantStyle(
            params.baseMessage,
            params.participantId,
            matchingLevel
          );

          return {
            originalMessage: params.baseMessage,
            adaptedMessage,
            participantId: params.participantId,
            matchingLevel,
            styleChanges: this.analyzeStyleChanges(params.baseMessage, adaptedMessage),
            timestamp: new Date()
          };
        }
      ),

      this.createAction(
        'getStyleProfile',
        'Get comprehensive style profile for agent or participant',
        ActionCategory.COMMUNICATION,
        {
          targetId: { type: 'string', description: 'Agent or participant ID' },
          includeHistory: { type: 'boolean', description: 'Include historical style data', optional: true }
        },
        async (agent: Agent, params: any) => {
          const styleProfile = await this.getComprehensiveStyleProfile(
            params.targetId,
            params.includeHistory || false
          );

          return {
            targetId: params.targetId,
            styleProfile,
            lastUpdated: new Date(),
            dataPoints: styleProfile.dataPoints || 0
          };
        }
      ),

      this.createAction(
        'updateStylePreferences',
        'Update style adaptation preferences',
        ActionCategory.COMMUNICATION,
        {
          preferences: { type: 'object', description: 'Style preferences to update' }
        },
        async (agent: Agent, params: any) => {
          this.updateStylePreferences(params.preferences);

          return {
            success: true,
            updatedPreferences: params.preferences,
            message: 'Style preferences updated successfully',
            timestamp: new Date()
          };
        }
      )
    ];
  }

  /**
   * Get the style adapter instance
   */
  getStyleAdapter(): StyleAdapter {
    return this.styleAdapter;
  }

  /**
   * Analyze participant communication style from messages
   */
  private analyzeParticipantStyle(messages: any[], participantId: string): any {
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        formality: 0.5,
        verbosity: 0.5,
        emotiveness: 0.5,
        directness: 0.5,
        politeness: 0.5,
        confidence: 0
      };
    }

    const participantMessages = messages.filter(m => m.senderId === participantId);
    
    if (participantMessages.length === 0) {
      return {
        formality: 0.5,
        verbosity: 0.5,
        emotiveness: 0.5,
        directness: 0.5,
        politeness: 0.5,
        confidence: 0
      };
    }

    return {
      formality: this.analyzeFormalityLevel(participantMessages),
      verbosity: this.analyzeVerbosityLevel(participantMessages),
      emotiveness: this.analyzeEmotivenessLevel(participantMessages),
      directness: this.analyzeDirectnessLevel(participantMessages),
      politeness: this.analyzePolitenessLevel(participantMessages),
      confidence: Math.min(participantMessages.length / 10, 1),
      patterns: this.identifyStylePatterns(participantMessages)
    };
  }

  /**
   * Detect conversation mood from messages
   */
  private detectConversationMood(messages: any[]): any {
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        primary: 'neutral',
        confidence: 0,
        distribution: { neutral: 1 },
        trends: 'stable'
      };
    }

    const moodIndicators = this.extractMoodIndicators(messages);
    const moodDistribution = this.calculateMoodDistribution(moodIndicators);
    
    const primaryMood = Object.entries(moodDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];

    return {
      primary: primaryMood,
      confidence: moodDistribution[primaryMood],
      distribution: moodDistribution,
      trends: this.analyzeMoodTrends(messages),
      indicators: moodIndicators
    };
  }

  /**
   * Suggest appropriate formality level
   */
  private suggestFormalityLevel(context: any, participantCount?: number, relationship?: string): any {
    let baseFormality = 0.5;
    const adjustments: string[] = [];

    // Adjust based on participant count
    if (participantCount && participantCount > 2) {
      baseFormality += 0.2;
      adjustments.push('Increased formality for group conversation');
    }

    // Adjust based on relationship
    if (relationship) {
      switch (relationship.toLowerCase()) {
        case 'professional':
        case 'business':
          baseFormality += 0.3;
          adjustments.push('Professional relationship requires higher formality');
          break;
        case 'friend':
        case 'casual':
          baseFormality -= 0.2;
          adjustments.push('Casual relationship allows lower formality');
          break;
        case 'family':
          baseFormality -= 0.1;
          adjustments.push('Family relationship allows relaxed formality');
          break;
      }
    }

    // Adjust based on context topics
    if (context.topics) {
      const professionalTopics = ['business', 'work', 'meeting', 'project'];
      const casualTopics = ['hobby', 'fun', 'game', 'chat'];
      
      const hasProfessionalTopics = context.topics.some((topic: string) => 
        professionalTopics.some(pt => topic.toLowerCase().includes(pt))
      );
      const hasCasualTopics = context.topics.some((topic: string) => 
        casualTopics.some(ct => topic.toLowerCase().includes(ct))
      );

      if (hasProfessionalTopics) {
        baseFormality += 0.15;
        adjustments.push('Professional topics detected');
      }
      if (hasCasualTopics) {
        baseFormality -= 0.1;
        adjustments.push('Casual topics detected');
      }
    }

    baseFormality = Math.max(0, Math.min(1, baseFormality));

    return {
      level: baseFormality,
      reasoning: this.generateFormalityReasoning(baseFormality),
      adjustments
    };
  }

  /**
   * Match communication style to participant
   */
  private async matchParticipantStyle(
    baseMessage: string,
    participantId: string,
    matchingLevel: string
  ): Promise<string> {
    // This would typically use the stored style profile for the participant
    // For now, return the base message with basic adaptations
    let adaptedMessage = baseMessage;

    switch (matchingLevel) {
      case 'subtle':
        // Minor adjustments
        adaptedMessage = this.applySubtleStyleMatching(baseMessage);
        break;
      case 'moderate':
        // Noticeable but not dramatic changes
        adaptedMessage = this.applyModerateStyleMatching(baseMessage);
        break;
      case 'strong':
        // Significant style adaptation
        adaptedMessage = this.applyStrongStyleMatching(baseMessage);
        break;
    }

    return adaptedMessage;
  }

  /**
   * Get comprehensive style profile
   */
  private async getComprehensiveStyleProfile(targetId: string, includeHistory: boolean): Promise<any> {
    // This would typically retrieve stored profile data
    return {
      targetId,
      formality: 0.5,
      verbosity: 0.5,
      emotiveness: 0.5,
      directness: 0.5,
      politeness: 0.5,
      preferredTopics: [],
      avoidedTopics: [],
      communicationPatterns: {},
      dataPoints: 0,
      lastAnalyzed: new Date(),
      includeHistory
    };
  }

  /**
   * Update style preferences
   */
  private updateStylePreferences(preferences: any): void {
    this.config = { ...this.config, ...preferences };
    // This would typically persist the preferences
  }

  // Analysis helper methods
  private analyzeFormalityLevel(messages: any[]): number {
    let formalityScore = 0;
    const formalMarkers = ['please', 'thank you', 'would you', 'could you', 'may i'];
    const informalMarkers = ['hey', 'gonna', 'wanna', 'yeah', 'ok'];

    for (const message of messages) {
      const content = message.content.toLowerCase();
      const formalCount = formalMarkers.filter(marker => content.includes(marker)).length;
      const informalCount = informalMarkers.filter(marker => content.includes(marker)).length;
      
      formalityScore += (formalCount - informalCount) / Math.max(formalMarkers.length, 1);
    }

    return Math.max(0, Math.min(1, 0.5 + (formalityScore / messages.length)));
  }

  private analyzeVerbosityLevel(messages: any[]): number {
    const totalWords = messages.reduce((sum, msg) => sum + msg.content.split(' ').length, 0);
    const averageWordsPerMessage = totalWords / messages.length;
    
    // Normalize based on typical message lengths (5-50 words)
    return Math.max(0, Math.min(1, (averageWordsPerMessage - 5) / 45));
  }

  private analyzeEmotivenessLevel(messages: any[]): number {
    let emotionScore = 0;
    const emotionalMarkers = ['!', '?', '...', '😊', '😢', '😡', '❤️', 'love', 'hate', 'amazing', 'terrible'];

    for (const message of messages) {
      const content = message.content.toLowerCase();
      const emotionCount = emotionalMarkers.filter(marker => content.includes(marker)).length;
      emotionScore += emotionCount;
    }

    return Math.max(0, Math.min(1, emotionScore / (messages.length * 2)));
  }

  private analyzeDirectnessLevel(messages: any[]): number {
    let directnessScore = 0;
    const directMarkers = ['please', 'need', 'want', 'should', 'must', 'now'];
    const indirectMarkers = ['maybe', 'perhaps', 'might', 'could', 'possibly'];

    for (const message of messages) {
      const content = message.content.toLowerCase();
      const directCount = directMarkers.filter(marker => content.includes(marker)).length;
      const indirectCount = indirectMarkers.filter(marker => content.includes(marker)).length;
      
      directnessScore += (directCount - indirectCount);
    }

    return Math.max(0, Math.min(1, 0.5 + (directnessScore / (messages.length * 2))));
  }

  private analyzePolitenessLevel(messages: any[]): number {
    let politenessScore = 0;
    const politeMarkers = ['please', 'thank you', 'sorry', 'excuse me', 'pardon'];
    const impoliteMarkers = ['shut up', 'stupid', 'idiot', 'whatever'];

    for (const message of messages) {
      const content = message.content.toLowerCase();
      const politeCount = politeMarkers.filter(marker => content.includes(marker)).length;
      const impoliteCount = impoliteMarkers.filter(marker => content.includes(marker)).length;
      
      politenessScore += (politeCount - impoliteCount * 2);
    }

    return Math.max(0, Math.min(1, 0.7 + (politenessScore / (messages.length * 2))));
  }

  private identifyStylePatterns(messages: any[]): string[] {
    const patterns: string[] = [];
    
    const questionCount = messages.filter(m => m.content.includes('?')).length;
    if (questionCount / messages.length > 0.3) {
      patterns.push('inquisitive');
    }

    const exclamationCount = messages.filter(m => m.content.includes('!')).length;
    if (exclamationCount / messages.length > 0.2) {
      patterns.push('expressive');
    }

    return patterns;
  }

  private extractMoodIndicators(messages: any[]): any {
    const indicators = {
      positive: 0,
      negative: 0,
      neutral: 0,
      excited: 0,
      calm: 0
    };

    const positiveWords = ['good', 'great', 'awesome', 'love', 'happy', 'excited'];
    const negativeWords = ['bad', 'terrible', 'hate', 'sad', 'angry', 'frustrated'];
    const excitedWords = ['amazing', 'incredible', 'wow', '!'];
    const calmWords = ['okay', 'fine', 'sure', 'alright'];

    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      indicators.positive += positiveWords.filter(word => content.includes(word)).length;
      indicators.negative += negativeWords.filter(word => content.includes(word)).length;
      indicators.excited += excitedWords.filter(word => content.includes(word)).length;
      indicators.calm += calmWords.filter(word => content.includes(word)).length;
    }

    indicators.neutral = messages.length - indicators.positive - indicators.negative;

    return indicators;
  }

  private calculateMoodDistribution(indicators: any): Record<string, number> {
    const total = Object.values(indicators).reduce((sum: number, val: any) => sum + val, 0);
    
    if (total === 0) {
      return { neutral: 1 };
    }

    const distribution: Record<string, number> = {};
    for (const [mood, count] of Object.entries(indicators)) {
      distribution[mood] = (count as number) / total;
    }

    return distribution;
  }

  private analyzeMoodTrends(messages: any[]): string {
    if (messages.length < 3) return 'stable';

    const recentMood = this.calculateMoodScore(messages.slice(-3));
    const earlierMood = this.calculateMoodScore(messages.slice(0, 3));

    if (recentMood > earlierMood + 0.2) return 'improving';
    if (recentMood < earlierMood - 0.2) return 'declining';
    return 'stable';
  }

  private calculateMoodScore(messages: any[]): number {
    const positiveWords = ['good', 'great', 'awesome', 'love', 'happy'];
    const negativeWords = ['bad', 'terrible', 'hate', 'sad', 'angry'];
    
    let score = 0;
    for (const message of messages) {
      const content = message.content.toLowerCase();
      score += positiveWords.filter(word => content.includes(word)).length;
      score -= negativeWords.filter(word => content.includes(word)).length;
    }

    return score / messages.length;
  }

  private generateStyleRecommendations(request: StyleAdaptationRequest, adaptedStyle: any): string[] {
    const recommendations: string[] = [];

    if (request.formality && request.formality < 0.3) {
      recommendations.push('Consider increasing formality for professional contexts');
    }

    if (request.mood === 'negative') {
      recommendations.push('Use empathetic language and supportive tone');
    }

    if (request.conversationPhase === 'greeting') {
      recommendations.push('Include welcoming elements and set positive tone');
    }

    return recommendations;
  }

  private generateParticipantStyleRecommendations(styleProfile: any): string[] {
    const recommendations: string[] = [];

    if (styleProfile.formality > 0.7) {
      recommendations.push('Maintain formal communication style');
    } else if (styleProfile.formality < 0.3) {
      recommendations.push('Use casual, relaxed communication style');
    }

    if (styleProfile.verbosity > 0.7) {
      recommendations.push('Provide detailed, comprehensive responses');
    } else if (styleProfile.verbosity < 0.3) {
      recommendations.push('Keep responses concise and to the point');
    }

    return recommendations;
  }

  private generateMoodBasedRecommendations(moodAnalysis: any): string[] {
    const recommendations: string[] = [];

    switch (moodAnalysis.primary) {
      case 'positive':
        recommendations.push('Maintain positive energy and enthusiasm');
        break;
      case 'negative':
        recommendations.push('Use empathetic tone and offer support');
        break;
      case 'excited':
        recommendations.push('Match energy level and show enthusiasm');
        break;
      case 'calm':
        recommendations.push('Maintain steady, measured communication');
        break;
    }

    return recommendations;
  }

  private generateFormalityReasoning(level: number): string {
    if (level > 0.7) return 'High formality recommended for professional context';
    if (level > 0.4) return 'Moderate formality appropriate for balanced communication';
    return 'Casual tone suitable for informal interaction';
  }

  private generateFormalityExamples(level: number): string[] {
    if (level > 0.7) {
      return [
        'I would be pleased to assist you with this matter.',
        'Please allow me to provide you with the requested information.',
        'Thank you for bringing this to my attention.'
      ];
    } else if (level > 0.4) {
      return [
        'I\'d be happy to help with that.',
        'Sure, let me get that information for you.',
        'Thanks for letting me know.'
      ];
    } else {
      return [
        'No problem, I can help!',
        'Sure thing, here you go.',
        'Got it, thanks!'
      ];
    }
  }

  private analyzeStyleChanges(original: string, styled: string): any {
    return {
      lengthChange: styled.length - original.length,
      wordCount: styled.split(' ').length - original.split(' ').length,
      formalityAdjustment: this.detectFormalityChanges(original, styled),
      toneAdjustment: this.detectToneChanges(original, styled)
    };
  }

  private detectFormalityChanges(original: string, styled: string): string {
    const formalMarkers = ['please', 'would', 'could', 'thank you'];
    const originalFormal = formalMarkers.filter(marker => original.toLowerCase().includes(marker)).length;
    const styledFormal = formalMarkers.filter(marker => styled.toLowerCase().includes(marker)).length;

    if (styledFormal > originalFormal) return 'increased';
    if (styledFormal < originalFormal) return 'decreased';
    return 'unchanged';
  }

  private detectToneChanges(original: string, styled: string): string {
    // Simple tone detection based on punctuation and word choice
    const originalExclamations = (original.match(/!/g) || []).length;
    const styledExclamations = (styled.match(/!/g) || []).length;

    if (styledExclamations > originalExclamations) return 'more_enthusiastic';
    if (styledExclamations < originalExclamations) return 'less_enthusiastic';
    return 'unchanged';
  }

  // Style matching implementations
  private applySubtleStyleMatching(message: string): string {
    // Minor punctuation or word choice adjustments
    return message.replace(/\./g, '.').replace(/!/g, '.');
  }

  private applyModerateStyleMatching(message: string): string {
    // More noticeable changes in formality or tone
    let adapted = message;
    adapted = adapted.replace(/can't/g, 'cannot');
    adapted = adapted.replace(/won't/g, 'will not');
    return adapted;
  }

  private applyStrongStyleMatching(message: string): string {
    // Significant restructuring while preserving meaning
    let adapted = message;
    adapted = adapted.replace(/hey/gi, 'hello');
    adapted = adapted.replace(/yeah/gi, 'yes');
    adapted = adapted.replace(/ok/gi, 'alright');
    return adapted;
  }
}