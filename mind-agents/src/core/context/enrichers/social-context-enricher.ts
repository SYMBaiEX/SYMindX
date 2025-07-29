/**
 * Social Context Enricher for SYMindX
 * 
 * This enricher adds social relationship data, interaction history,
 * and social dynamics information to help agents understand and
 * respond appropriately to social contexts.
 */

import { BaseContextEnricher } from './base-enricher';
import {
  EnrichmentRequest,
  SocialEnrichmentData,
  EnrichmentPriority,
  EnrichmentStage,
} from '../../../types/context/context-enrichment';
import { Context } from '../../../types/common';
import { MemoryProvider, MemoryRecord } from '../../../types/memory';
import { OperationResult } from '../../../types/helpers';

/**
 * Configuration specific to social enrichment
 */
export interface SocialEnricherConfig {
  includeRelationships: boolean;
  includeConversationContext: boolean;
  includeSocialMetrics: boolean;
  maxRelationships: number;
  maxConversationHistory: number;
  relationshipDecayDays: number; // Days after which relationships decay
  trustUpdateFactor: number; // Factor for updating trust scores (0-1)
}

/**
 * Relationship information for social context
 */
interface Relationship {
  entityId: string;
  entityType: 'user' | 'agent' | 'system';
  relationshipType: string;
  strength: number; // 0-1
  lastInteraction: Date;
  interactionCount: number;
  sentiment: number; // -1 to 1
  trustScore: number; // 0-1
  familiarity: number; // 0-1
  metadata?: Record<string, unknown>;
}

/**
 * Social Context Enricher
 * 
 * Enriches context with social relationship data, interaction patterns,
 * and social dynamics to enable socially aware agent behavior.
 */
export class SocialContextEnricher extends BaseContextEnricher {
  private memoryProvider: MemoryProvider | null = null;
  private enricherConfig: SocialEnricherConfig;
  private relationshipCache = new Map<string, Relationship[]>();
  private cacheExpiry = new Map<string, number>();

  constructor(
    memoryProvider: MemoryProvider,
    config: Partial<SocialEnricherConfig> = {}
  ) {
    super(
      'social-context-enricher',
      'Social Context Enricher',
      '1.0.0',
      {
        enabled: true,
        priority: EnrichmentPriority.MEDIUM,
        stage: EnrichmentStage.CORE_ENRICHMENT,
        timeout: 2500,
        maxRetries: 3,
        cacheEnabled: true,
        cacheTtl: 120, // 2 minute cache for social data
        dependsOn: [],
      }
    );

    this.memoryProvider = memoryProvider;
    
    // Default social enricher configuration
    this.enricherConfig = {
      includeRelationships: true,
      includeConversationContext: true,
      includeSocialMetrics: true,
      maxRelationships: 20,
      maxConversationHistory: 10,
      relationshipDecayDays: 30,
      trustUpdateFactor: 0.1,
      ...config,
    };
  }

  /**
   * Get the keys this enricher provides
   */
  getProvidedKeys(): string[] {
    return [
      'socialContext',
      'relationships',
      'conversationContext',
      'socialMetrics',
      'socialInsights',
    ];
  }

  /**
   * Get the keys this enricher requires
   */
  getRequiredKeys(): string[] {
    return []; // Social enricher doesn't depend on other enrichers
  }

  /**
   * Perform social enricher initialization
   */
  protected async doInitialize(): Promise<OperationResult> {
    try {
      if (!this.memoryProvider) {
        return {
          success: false,
          error: 'Memory provider is required for social enrichment',
        };
      }

      // Test memory provider connection
      const healthCheck = await this.memoryProvider.healthCheck?.() || { success: true };
      if (!healthCheck.success) {
        return {
          success: false,
          error: `Memory provider health check failed: ${healthCheck.error}`,
        };
      }

      this.log('info', 'Social context enricher initialized', {
        maxRelationships: this.enricherConfig.maxRelationships,
        maxConversationHistory: this.enricherConfig.maxConversationHistory,
        relationshipDecayDays: this.enricherConfig.relationshipDecayDays,
      });

      return {
        success: true,
        message: 'Social context enricher initialized successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform social-based context enrichment
   */
  protected async doEnrich(request: EnrichmentRequest): Promise<Record<string, unknown>> {
    if (!this.memoryProvider) {
      throw new Error('Memory provider not available');
    }

    const agentId = request.agentId;
    const context = request.context;
    
    // Extract social entities from context
    const socialEntities = this.extractSocialEntities(context);
    
    // Get relationship information
    const relationships = this.enricherConfig.includeRelationships
      ? await this.getRelationships(agentId, socialEntities)
      : [];

    // Build conversation context
    const conversationContext = this.enricherConfig.includeConversationContext
      ? await this.buildConversationContext(agentId, socialEntities)
      : {
          participantCount: 0,
          conversationLength: 0,
        };

    // Calculate social metrics
    const socialMetrics = this.enricherConfig.includeSocialMetrics
      ? this.calculateSocialMetrics(relationships, conversationContext)
      : {
          trustLevel: 0,
          familiarityLevel: 0,
          communicationStyle: 'unknown',
        };

    // Create comprehensive social enrichment data
    const socialData: SocialEnrichmentData = {
      relationships,
      conversationContext,
      socialMetrics,
    };

    // Generate social insights
    const socialInsights = this.generateSocialInsights(socialData, context);

    return {
      socialContext: socialData,
      relationships: relationships.map(this.sanitizeRelationshipForContext),
      conversationContext,
      socialMetrics,
      socialInsights,
    };
  }

  /**
   * Check if this enricher can process the given context
   */
  protected doCanEnrich(context: Context): boolean {
    // Social enricher can work when there are social entities or interaction data
    return this.memoryProvider !== null && this.hasSocialContext(context);
  }

  /**
   * Perform social enricher health check
   */
  protected async doHealthCheck(): Promise<OperationResult> {
    try {
      if (!this.memoryProvider) {
        return {
          success: false,
          error: 'Memory provider not available',
        };
      }

      // Check memory provider health
      const providerHealth = await this.memoryProvider.healthCheck?.() || { success: true };
      if (!providerHealth.success) {
        return {
          success: false,
          error: `Memory provider unhealthy: ${providerHealth.error}`,
        };
      }

      return {
        success: true,
        message: 'Social context enricher is healthy',
        metadata: {
          memoryProviderHealthy: true,
          cacheSize: this.relationshipCache.size,
          configuration: this.enricherConfig,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clean up social enricher resources
   */
  protected async doDispose(): Promise<OperationResult> {
    try {
      // Clear caches
      this.relationshipCache.clear();
      this.cacheExpiry.clear();
      this.memoryProvider = null;
      
      return {
        success: true,
        message: 'Social context enricher disposed successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Private helper methods

  /**
   * Check if context has social elements
   */
  private hasSocialContext(context: Context): boolean {
    return !!(
      context.userId ||
      context.sessionId ||
      context.participants ||
      context.sender ||
      context.recipient ||
      context.conversationId
    );
  }

  /**
   * Extract social entities from context
   */
  private extractSocialEntities(context: Context): Array<{
    id: string;
    type: 'user' | 'agent' | 'system';
    role?: string;
  }> {
    const entities: Array<{ id: string; type: 'user' | 'agent' | 'system'; role?: string }> = [];

    // Extract user ID
    if (context.userId && typeof context.userId === 'string') {
      entities.push({
        id: context.userId,
        type: 'user',
        role: 'primary',
      });
    }

    // Extract sender information
    if (context.sender && typeof context.sender === 'string') {
      entities.push({
        id: context.sender,
        type: 'user',
        role: 'sender',
      });
    }

    // Extract recipient information
    if (context.recipient && typeof context.recipient === 'string') {
      entities.push({
        id: context.recipient,
        type: 'agent',
        role: 'recipient',
      });
    }

    // Extract participants if available
    if (context.participants && Array.isArray(context.participants)) {
      for (const participant of context.participants) {
        if (typeof participant === 'string') {
          entities.push({
            id: participant,
            type: 'user',
            role: 'participant',
          });
        } else if (typeof participant === 'object' && participant !== null) {
          const p = participant as any;
          entities.push({
            id: p.id || p.userId || 'unknown',
            type: p.type || 'user',
            role: p.role || 'participant',
          });
        }
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.id}:${entity.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get relationship information for social entities
   */
  private async getRelationships(
    agentId: string,
    entities: Array<{ id: string; type: 'user' | 'agent' | 'system'; role?: string }>
  ): Promise<Relationship[]> {
    if (!this.memoryProvider) {
      return [];
    }

    const relationships: Relationship[] = [];
    
    for (const entity of entities) {
      try {
        // Check cache first
        const cacheKey = `${agentId}:${entity.id}`;
        const cached = this.getCachedRelationship(cacheKey);
        
        if (cached) {
          relationships.push(...cached);
          continue;
        }

        // Query memories for interaction history with this entity
        const interactionMemories = await this.getInteractionMemories(agentId, entity.id);
        
        // Build relationship from interaction history
        const relationship = await this.buildRelationshipFromMemories(
          entity,
          interactionMemories
        );
        
        if (relationship) {
          relationships.push(relationship);
          
          // Cache the relationship
          this.cacheRelationship(cacheKey, [relationship]);
        }
      } catch (error) {
        this.log('warn', 'Failed to get relationship data', {
          agentId,
          entityId: entity.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sort by relationship strength and limit results
    return relationships
      .sort((a, b) => b.strength - a.strength)
      .slice(0, this.enricherConfig.maxRelationships);
  }

  /**
   * Get interaction memories with a specific entity
   */
  private async getInteractionMemories(agentId: string, entityId: string): Promise<MemoryRecord[]> {
    if (!this.memoryProvider) {
      return [];
    }

    try {
      const searchResult = await this.memoryProvider.search(agentId, {
        query: `interaction with ${entityId}`,
        limit: 50,
        types: ['interaction', 'conversation', 'social'],
        since: new Date(Date.now() - this.enricherConfig.relationshipDecayDays * 24 * 60 * 60 * 1000),
      });

      if (!searchResult.success || !searchResult.memories) {
        return [];
      }

      // Filter memories that actually involve this entity
      return searchResult.memories.filter(memory => 
        memory.content?.includes(entityId) ||
        memory.metadata?.participants?.includes(entityId) ||
        memory.metadata?.userId === entityId ||
        memory.metadata?.senderId === entityId
      );
    } catch (error) {
      this.log('warn', 'Failed to search interaction memories', {
        agentId,
        entityId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Build relationship data from interaction memories
   */
  private async buildRelationshipFromMemories(
    entity: { id: string; type: 'user' | 'agent' | 'system'; role?: string },
    memories: MemoryRecord[]
  ): Promise<Relationship | null> {
    if (memories.length === 0) {
      return null;
    }

    // Calculate interaction metrics
    const interactionCount = memories.length;
    const sortedMemories = memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const lastInteraction = sortedMemories[0].timestamp;
    
    // Calculate relationship strength based on frequency and recency
    const daysSinceLastInteraction = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0, 1 - (daysSinceLastInteraction / this.enricherConfig.relationshipDecayDays));
    const frequencyFactor = Math.min(1, interactionCount / 10); // Cap at 10 interactions for full frequency score
    const strength = (recencyFactor * 0.6) + (frequencyFactor * 0.4);

    // Calculate sentiment from memories
    const sentiment = this.calculateSentimentFromMemories(memories);
    
    // Calculate trust score based on positive interactions and consistency
    const trustScore = this.calculateTrustScore(memories, sentiment);
    
    // Calculate familiarity based on interaction depth and variety
    const familiarity = this.calculateFamiliarity(memories);

    // Determine relationship type
    const relationshipType = this.determineRelationshipType(entity, memories);

    return {
      entityId: entity.id,
      entityType: entity.type,
      relationshipType,
      strength: Math.max(0, Math.min(1, strength)),
      lastInteraction,
      interactionCount,
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      trustScore: Math.max(0, Math.min(1, trustScore)),
      familiarity: Math.max(0, Math.min(1, familiarity)),
      metadata: {
        role: entity.role,
        daysSinceLastInteraction,
        oldestInteraction: sortedMemories[sortedMemories.length - 1].timestamp,
      },
    };
  }

  /**
   * Calculate sentiment from interaction memories
   */
  private calculateSentimentFromMemories(memories: MemoryRecord[]): number {
    let sentimentSum = 0;
    let sentimentCount = 0;

    for (const memory of memories) {
      // Look for sentiment in metadata
      if (memory.metadata?.sentiment && typeof memory.metadata.sentiment === 'number') {
        sentimentSum += memory.metadata.sentiment;
        sentimentCount++;
        continue;
      }

      // Analyze content for sentiment keywords
      const content = memory.content?.toLowerCase() || '';
      let memorySentiment = 0;

      // Positive keywords
      const positiveKeywords = ['good', 'great', 'excellent', 'positive', 'happy', 'satisfied', 'success'];
      const negativeKeywords = ['bad', 'terrible', 'negative', 'angry', 'frustrated', 'problem', 'error'];

      for (const keyword of positiveKeywords) {
        if (content.includes(keyword)) {
          memorySentiment += 0.2;
        }
      }

      for (const keyword of negativeKeywords) {
        if (content.includes(keyword)) {
          memorySentiment -= 0.2;
        }
      }

      sentimentSum += memorySentiment;
      sentimentCount++;
    }

    return sentimentCount > 0 ? sentimentSum / sentimentCount : 0;
  }

  /**
   * Calculate trust score based on interaction history
   */
  private calculateTrustScore(memories: MemoryRecord[], sentiment: number): number {
    let trustScore = 0.5; // Start with neutral trust

    // Positive sentiment increases trust
    trustScore += sentiment * 0.3;

    // Consistent interactions over time increase trust
    const timeSpan = memories.length > 1 
      ? (memories[0].timestamp.getTime() - memories[memories.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    
    if (timeSpan > 7) { // More than a week of interactions
      trustScore += 0.2;
    }

    // High interaction frequency increases trust
    const avgDailyInteractions = timeSpan > 0 ? memories.length / timeSpan : 0;
    if (avgDailyInteractions > 1) {
      trustScore += 0.1;
    }

    return Math.max(0, Math.min(1, trustScore));
  }

  /**
   * Calculate familiarity score based on interaction depth
   */
  private calculateFamiliarity(memories: MemoryRecord[]): number {
    let familiarityScore = 0;

    // More interactions = higher familiarity
    familiarityScore += Math.min(0.5, memories.length * 0.05);

    // Variety of interaction types increases familiarity
    const interactionTypes = new Set(memories.map(m => m.type || 'unknown'));
    familiarityScore += Math.min(0.3, interactionTypes.size * 0.1);

    // Longer conversations increase familiarity
    const avgContentLength = memories.reduce((sum, m) => sum + (m.content?.length || 0), 0) / memories.length;
    familiarityScore += Math.min(0.2, avgContentLength / 500); // Normalize by 500 characters

    return Math.max(0, Math.min(1, familiarityScore));
  }

  /**
   * Determine relationship type based on interaction patterns
   */
  private determineRelationshipType(
    entity: { id: string; type: 'user' | 'agent' | 'system'; role?: string },
    memories: MemoryRecord[]
  ): string {
    // Default relationship types
    if (entity.type === 'agent') {
      return 'colleague';
    }
    
    if (entity.type === 'system') {
      return 'system';
    }

    // Analyze interaction patterns for users
    const avgContentLength = memories.reduce((sum, m) => sum + (m.content?.length || 0), 0) / memories.length;
    const interactionFrequency = memories.length;

    // Determine relationship based on interaction patterns
    if (interactionFrequency > 20 && avgContentLength > 200) {
      return 'close_friend';
    } else if (interactionFrequency > 10) {
      return 'friend';
    } else if (interactionFrequency > 5) {
      return 'acquaintance';
    } else {
      return 'stranger';
    }
  }

  /**
   * Build conversation context
   */
  private async buildConversationContext(
    agentId: string,
    entities: Array<{ id: string; type: 'user' | 'agent' | 'system'; role?: string }>
  ): Promise<SocialEnrichmentData['conversationContext']> {
    if (!this.memoryProvider) {
      return {
        participantCount: 0,
        conversationLength: 0,
      };
    }

    try {
      // Get recent conversation memories
      const recentMemories = await this.memoryProvider.search(agentId, {
        query: 'conversation',
        limit: this.enricherConfig.maxConversationHistory,
        types: ['conversation', 'interaction'],
        since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      });

      if (!recentMemories.success || !recentMemories.memories) {
        return {
          participantCount: entities.length,
          conversationLength: 0,
        };
      }

      const memories = recentMemories.memories;
      
      // Analyze conversation
      const conversationLength = memories.length;
      const totalContent = memories.reduce((sum, m) => sum + (m.content?.length || 0), 0);
      
      // Analyze topics if available
      const topics = new Set<string>();
      let sentimentSum = 0;
      let sentimentCount = 0;

      for (const memory of memories) {
        // Extract topics
        if (memory.metadata?.topics && Array.isArray(memory.metadata.topics)) {
          memory.metadata.topics.forEach(topic => topics.add(topic));
        }

        // Extract sentiment
        if (memory.metadata?.sentiment && typeof memory.metadata.sentiment === 'number') {
          sentimentSum += memory.metadata.sentiment;
          sentimentCount++;
        }
      }

      const avgSentiment = sentimentCount > 0 ? sentimentSum / sentimentCount : 0;

      return {
        participantCount: entities.length,
        conversationLength,
        topicAnalysis: {
          primaryTopics: Array.from(topics).slice(0, 5),
          sentiment: avgSentiment,
        },
      };
    } catch (error) {
      this.log('warn', 'Failed to build conversation context', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      return {
        participantCount: entities.length,
        conversationLength: 0,
      };
    }
  }

  /**
   * Calculate social metrics from relationships and conversation context
   */
  private calculateSocialMetrics(
    relationships: Relationship[],
    conversationContext: SocialEnrichmentData['conversationContext']
  ): SocialEnrichmentData['socialMetrics'] {
    if (relationships.length === 0) {
      return {
        trustLevel: 0,
        familiarityLevel: 0,
        communicationStyle: 'formal',
      };
    }

    // Calculate average trust and familiarity
    const avgTrust = relationships.reduce((sum, r) => sum + r.trustScore, 0) / relationships.length;
    const avgFamiliarity = relationships.reduce((sum, r) => sum + r.familiarity, 0) / relationships.length;

    // Determine communication style
    let communicationStyle = 'formal';
    if (avgFamiliarity > 0.7) {
      communicationStyle = 'casual';
    } else if (avgFamiliarity > 0.4) {
      communicationStyle = 'friendly';
    }

    return {
      trustLevel: avgTrust,
      familiarityLevel: avgFamiliarity,
      communicationStyle,
    };
  }

  /**
   * Generate social insights
   */
  private generateSocialInsights(
    socialData: SocialEnrichmentData,
    context: Context
  ): Record<string, unknown> {
    const insights = {
      available: true,
      timestamp: new Date(),
      relationshipAnalysis: this.analyzeRelationships(socialData.relationships),
      conversationRecommendations: this.generateConversationRecommendations(socialData),
      socialDynamics: this.analyzeSocialDynamics(socialData),
    };

    return insights;
  }

  /**
   * Analyze relationships for insights
   */
  private analyzeRelationships(relationships: Relationship[]): Record<string, unknown> {
    if (relationships.length === 0) {
      return { hasRelationships: false };
    }

    const strongRelationships = relationships.filter(r => r.strength > 0.6);
    const trustedEntities = relationships.filter(r => r.trustScore > 0.7);
    const familiarEntities = relationships.filter(r => r.familiarity > 0.6);

    return {
      hasRelationships: true,
      totalRelationships: relationships.length,
      strongRelationships: strongRelationships.length,
      trustedEntities: trustedEntities.length,
      familiarEntities: familiarEntities.length,
      dominantRelationshipType: this.getDominantRelationshipType(relationships),
      avgTrustScore: relationships.reduce((sum, r) => sum + r.trustScore, 0) / relationships.length,
      avgFamiliarityScore: relationships.reduce((sum, r) => sum + r.familiarity, 0) / relationships.length,
    };
  }

  /**
   * Get dominant relationship type
   */
  private getDominantRelationshipType(relationships: Relationship[]): string {
    const typeCounts = new Map<string, number>();
    
    for (const relationship of relationships) {
      const count = typeCounts.get(relationship.relationshipType) || 0;
      typeCounts.set(relationship.relationshipType, count + 1);
    }

    let dominantType = 'unknown';
    let maxCount = 0;
    
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    return dominantType;
  }

  /**
   * Generate conversation recommendations
   */
  private generateConversationRecommendations(socialData: SocialEnrichmentData): Array<{
    type: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const recommendations = [];

    // High trust relationships - can be more direct
    if (socialData.socialMetrics.trustLevel > 0.7) {
      recommendations.push({
        type: 'communication_style',
        message: 'High trust relationship allows for direct, honest communication',
        priority: 'medium' as const,
      });
    }

    // Low familiarity - be more formal
    if (socialData.socialMetrics.familiarityLevel < 0.3) {
      recommendations.push({
        type: 'communication_style',
        message: 'Low familiarity suggests formal, respectful communication',
        priority: 'high' as const,
      });
    }

    // Multiple participants - consider group dynamics
    if (socialData.conversationContext.participantCount > 2) {
      recommendations.push({
        type: 'group_dynamics',
        message: 'Multiple participants require inclusive communication approach',
        priority: 'medium' as const,
      });
    }

    return recommendations;
  }

  /**
   * Analyze social dynamics
   */
  private analyzeSocialDynamics(socialData: SocialEnrichmentData): Record<string, unknown> {
    return {
      isGroupConversation: socialData.conversationContext.participantCount > 2,
      communicationStyle: socialData.socialMetrics.communicationStyle,
      socialComplexity: this.calculateSocialComplexity(socialData),
      recommendedApproach: this.recommendSocialApproach(socialData),
    };
  }

  /**
   * Calculate social complexity score
   */
  private calculateSocialComplexity(socialData: SocialEnrichmentData): number {
    let complexity = 0;

    // More participants = higher complexity
    complexity += Math.min(0.4, socialData.conversationContext.participantCount * 0.1);

    // More relationships = higher complexity
    complexity += Math.min(0.3, socialData.relationships.length * 0.05);

    // Mixed trust levels = higher complexity
    const trustVariance = this.calculateTrustVariance(socialData.relationships);
    complexity += Math.min(0.3, trustVariance);

    return Math.min(1, complexity);
  }

  /**
   * Calculate trust variance across relationships
   */
  private calculateTrustVariance(relationships: Relationship[]): number {
    if (relationships.length < 2) return 0;

    const avgTrust = relationships.reduce((sum, r) => sum + r.trustScore, 0) / relationships.length;
    const variance = relationships.reduce((sum, r) => sum + Math.pow(r.trustScore - avgTrust, 2), 0) / relationships.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Recommend social approach
   */
  private recommendSocialApproach(socialData: SocialEnrichmentData): string {
    const trustLevel = socialData.socialMetrics.trustLevel;
    const familiarityLevel = socialData.socialMetrics.familiarityLevel;
    const participantCount = socialData.conversationContext.participantCount;

    if (participantCount > 2) {
      return 'group_facilitator';
    } else if (trustLevel > 0.7 && familiarityLevel > 0.6) {
      return 'personal_friend';
    } else if (trustLevel > 0.5) {
      return 'trusted_advisor';
    } else if (familiarityLevel > 0.5) {
      return 'friendly_acquaintance';
    } else {
      return 'professional_assistant';
    }
  }

  /**
   * Get cached relationship data
   */
  private getCachedRelationship(cacheKey: string): Relationship[] | null {
    const expiry = this.cacheExpiry.get(cacheKey);
    if (!expiry || Date.now() > expiry) {
      this.relationshipCache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
      return null;
    }

    return this.relationshipCache.get(cacheKey) || null;
  }

  /**
   * Cache relationship data
   */
  private cacheRelationship(cacheKey: string, relationships: Relationship[]): void {
    this.relationshipCache.set(cacheKey, relationships);
    this.cacheExpiry.set(cacheKey, Date.now() + (this.config.cacheTtl! * 1000));
  }

  /**
   * Sanitize relationship for context inclusion
   */
  private sanitizeRelationshipForContext(relationship: Relationship): Record<string, unknown> {
    return {
      entityId: relationship.entityId,
      entityType: relationship.entityType,
      relationshipType: relationship.relationshipType,
      strength: relationship.strength,
      lastInteraction: relationship.lastInteraction,
      interactionCount: relationship.interactionCount,
      trustScore: relationship.trustScore,
      familiarity: relationship.familiarity,
    };
  }

  /**
   * Calculate confidence score for social enrichment
   */
  protected calculateConfidence(context: Context, enrichedData: Record<string, unknown>): number {
    const socialData = enrichedData.socialContext as SocialEnrichmentData;
    
    if (!socialData) {
      return 0.1;
    }

    let confidenceScore = 0.3; // Base confidence

    // Higher confidence with more relationships
    confidenceScore += Math.min(0.3, socialData.relationships.length * 0.05);

    // Higher confidence with conversation context
    if (socialData.conversationContext.conversationLength > 0) {
      confidenceScore += 0.2;
    }

    // Higher confidence with recent interactions
    const recentRelationships = socialData.relationships.filter(r => {
      const daysSince = (Date.now() - r.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7; // Within last week
    });
    
    if (recentRelationships.length > 0) {
      confidenceScore += 0.3;
    }

    return Math.min(0.95, Math.max(0.1, confidenceScore));
  }
}