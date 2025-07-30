import { Portal, PortalResponse } from '../../src/types/portal';
import { Message } from '../../src/types/message';

/**
 * Hallucination Detection Tests for AI Responses
 * Detects and validates AI-generated content for accuracy and coherence
 */

export interface HallucinationCheck {
  type: 'factual' | 'logical' | 'consistency' | 'relevance' | 'temporal';
  confidence: number;
  issues: string[];
  passed: boolean;
}

export class HallucinationDetector {
  private knowledgeBase: Map<string, any> = new Map();
  private conversationHistory: Message[] = [];

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): void {
    // Initialize with known facts for testing
    this.knowledgeBase.set('agent_capabilities', [
      'text_generation',
      'conversation',
      'memory_storage',
      'emotion_simulation',
      'multi_agent_coordination',
    ]);

    this.knowledgeBase.set('system_constraints', {
      max_agents: 10000,
      max_memory_per_agent: '100MB',
      supported_languages: ['en', 'es', 'fr', 'de', 'ja'],
      api_version: '1.0.0',
    });

    this.knowledgeBase.set('temporal_facts', {
      system_start_date: new Date('2024-01-01'),
      current_version: '1.0.0',
      last_update: new Date(),
    });
  }

  public async detectHallucination(
    response: PortalResponse,
    context: {
      originalPrompt: string;
      conversationHistory?: Message[];
      expectedTopics?: string[];
      factualClaims?: string[];
    }
  ): Promise<HallucinationCheck[]> {
    const checks: HallucinationCheck[] = [];

    // Update conversation history if provided
    if (context.conversationHistory) {
      this.conversationHistory = context.conversationHistory;
    }

    // Run various hallucination checks
    checks.push(await this.checkFactualAccuracy(response, context.factualClaims));
    checks.push(await this.checkLogicalConsistency(response));
    checks.push(await this.checkConversationalConsistency(response));
    checks.push(await this.checkRelevance(response, context.originalPrompt));
    checks.push(await this.checkTemporalConsistency(response));

    return checks;
  }

  private async checkFactualAccuracy(
    response: PortalResponse,
    expectedFacts?: string[]
  ): Promise<HallucinationCheck> {
    const issues: string[] = [];
    const content = response.text.toLowerCase();

    // Check for contradictions with known facts
    for (const [category, facts] of this.knowledgeBase) {
      if (category === 'agent_capabilities') {
        const capabilities = facts as string[];
        
        // Check for claimed capabilities not in the system
        const claimedCapabilities = this.extractClaimedCapabilities(content);
        for (const claimed of claimedCapabilities) {
          if (!capabilities.some(cap => content.includes(cap))) {
            issues.push(`Claimed non-existent capability: ${claimed}`);
          }
        }
      }

      if (category === 'system_constraints') {
        const constraints = facts as any;
        
        // Check numerical claims
        const numbers = this.extractNumbers(content);
        for (const num of numbers) {
          if (content.includes('max') && content.includes('agents') && num > constraints.max_agents) {
            issues.push(`Claimed max agents ${num} exceeds actual limit ${constraints.max_agents}`);
          }
        }
      }
    }

    // Check against expected facts if provided
    if (expectedFacts) {
      for (const fact of expectedFacts) {
        if (!content.includes(fact.toLowerCase())) {
          issues.push(`Missing expected fact: ${fact}`);
        }
      }
    }

    return {
      type: 'factual',
      confidence: issues.length === 0 ? 1.0 : 0.5 - (issues.length * 0.1),
      issues,
      passed: issues.length === 0,
    };
  }

  private async checkLogicalConsistency(response: PortalResponse): Promise<HallucinationCheck> {
    const issues: string[] = [];
    const sentences = response.text.split(/[.!?]+/);

    // Check for contradictory statements
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        if (this.areContradictory(sentences[i], sentences[j])) {
          issues.push(`Contradictory statements: "${sentences[i].trim()}" vs "${sentences[j].trim()}"`);
        }
      }
    }

    // Check for impossible combinations
    const content = response.text.toLowerCase();
    const impossiblePatterns = [
      { pattern: /simultaneously.*(active|running).*and.*(inactive|stopped)/, issue: 'Impossible simultaneous states' },
      { pattern: /always.*never/, issue: 'Logical contradiction: always/never' },
      { pattern: /100%.*(fail|error)/, issue: 'Contradictory percentage claim' },
      { pattern: /guaranteed.*might/, issue: 'Contradictory certainty levels' },
    ];

    for (const { pattern, issue } of impossiblePatterns) {
      if (pattern.test(content)) {
        issues.push(issue);
      }
    }

    return {
      type: 'logical',
      confidence: issues.length === 0 ? 1.0 : 0.7 - (issues.length * 0.15),
      issues,
      passed: issues.length === 0,
    };
  }

  private async checkConversationalConsistency(response: PortalResponse): Promise<HallucinationCheck> {
    const issues: string[] = [];

    if (this.conversationHistory.length > 0) {
      const currentContent = response.text.toLowerCase();
      
      // Check for contradictions with previous messages
      for (const prevMsg of this.conversationHistory) {
        const prevContent = prevMsg.content.toLowerCase();
        
        // Extract key facts from previous messages
        const prevFacts = this.extractKeyFacts(prevContent);
        const currentFacts = this.extractKeyFacts(currentContent);
        
        for (const [key, prevValue] of prevFacts) {
          const currentValue = currentFacts.get(key);
          if (currentValue && currentValue !== prevValue) {
            issues.push(`Inconsistent fact "${key}": was "${prevValue}", now "${currentValue}"`);
          }
        }
      }

      // Check for sudden topic changes without transition
      const prevTopics = this.extractTopics(this.conversationHistory[this.conversationHistory.length - 1]?.content || '');
      const currentTopics = this.extractTopics(response.text);
      
      const topicOverlap = prevTopics.filter(t => currentTopics.includes(t)).length;
      if (prevTopics.length > 0 && topicOverlap === 0) {
        issues.push('Sudden topic change without connection to previous context');
      }
    }

    return {
      type: 'consistency',
      confidence: issues.length === 0 ? 1.0 : 0.8 - (issues.length * 0.1),
      issues,
      passed: issues.length === 0,
    };
  }

  private async checkRelevance(
    response: PortalResponse,
    originalPrompt: string
  ): Promise<HallucinationCheck> {
    const issues: string[] = [];
    
    const promptKeywords = this.extractKeywords(originalPrompt);
    const responseKeywords = this.extractKeywords(response.text);
    
    // Calculate keyword overlap
    const overlap = promptKeywords.filter(k => responseKeywords.includes(k)).length;
    const relevanceScore = promptKeywords.length > 0 ? overlap / promptKeywords.length : 0;
    
    if (relevanceScore < 0.3) {
      issues.push('Response has low relevance to the original prompt');
    }

    // Check if response addresses the question type
    const questionType = this.detectQuestionType(originalPrompt);
    const responseType = this.detectResponseType(response.text);
    
    if (questionType && responseType && !this.areCompatibleTypes(questionType, responseType)) {
      issues.push(`Response type "${responseType}" doesn't match question type "${questionType}"`);
    }

    // Check for off-topic tangents
    const tangents = this.detectTangents(response.text, promptKeywords);
    if (tangents.length > 0) {
      issues.push(`Off-topic tangents detected: ${tangents.join(', ')}`);
    }

    return {
      type: 'relevance',
      confidence: relevanceScore,
      issues,
      passed: issues.length === 0 && relevanceScore >= 0.5,
    };
  }

  private async checkTemporalConsistency(response: PortalResponse): Promise<HallucinationCheck> {
    const issues: string[] = [];
    const content = response.text.toLowerCase();

    // Extract temporal references
    const temporalRefs = this.extractTemporalReferences(content);
    const systemStart = this.knowledgeBase.get('temporal_facts').system_start_date;
    const now = new Date();

    for (const ref of temporalRefs) {
      // Check for impossible future claims
      if (ref.date > now && ref.certainty === 'definite') {
        issues.push(`Impossible future claim: ${ref.text}`);
      }

      // Check for claims before system existence
      if (ref.date < systemStart && ref.context === 'system') {
        issues.push(`Claim predates system existence: ${ref.text}`);
      }

      // Check for inconsistent temporal ordering
      if (ref.sequence) {
        const sequence = this.validateTemporalSequence(temporalRefs);
        if (!sequence.valid) {
          issues.push(`Temporal sequence error: ${sequence.error}`);
        }
      }
    }

    return {
      type: 'temporal',
      confidence: issues.length === 0 ? 1.0 : 0.7 - (issues.length * 0.1),
      issues,
      passed: issues.length === 0,
    };
  }

  // Helper methods
  private extractClaimedCapabilities(content: string): string[] {
    const capabilityPatterns = [
      /can\s+(\w+)/g,
      /able\s+to\s+(\w+)/g,
      /capability\s+to\s+(\w+)/g,
      /supports?\s+(\w+)/g,
    ];

    const capabilities: string[] = [];
    for (const pattern of capabilityPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        capabilities.push(match[1]);
      }
    }

    return [...new Set(capabilities)];
  }

  private extractNumbers(content: string): number[] {
    const numbers: number[] = [];
    const matches = content.matchAll(/\b\d+(\.\d+)?\b/g);
    
    for (const match of matches) {
      numbers.push(parseFloat(match[0]));
    }

    return numbers;
  }

  private areContradictory(sentence1: string, sentence2: string): boolean {
    const negations = ['not', 'never', 'no', "can't", "won't", "don't"];
    
    // Simple contradiction detection
    const words1 = sentence1.toLowerCase().split(/\s+/);
    const words2 = sentence2.toLowerCase().split(/\s+/);
    
    // Check if one sentence negates the other
    for (const negation of negations) {
      if (words1.includes(negation) && !words2.includes(negation)) {
        const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
        if (commonWords.length > 2) {
          return true;
        }
      }
    }

    return false;
  }

  private extractKeyFacts(content: string): Map<string, string> {
    const facts = new Map<string, string>();
    
    // Extract "is/are" statements
    const isStatements = content.matchAll(/(\w+)\s+(?:is|are)\s+([^.]+)/g);
    for (const match of isStatements) {
      facts.set(match[1], match[2].trim());
    }

    // Extract numerical facts
    const numFacts = content.matchAll(/(\w+):\s*(\d+)/g);
    for (const match of numFacts) {
      facts.set(match[1], match[2]);
    }

    return facts;
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction based on nouns and noun phrases
    const words = content.toLowerCase().split(/\s+/);
    const topics = words.filter(w => 
      w.length > 4 && 
      !['the', 'and', 'for', 'with', 'from', 'that', 'this'].includes(w)
    );
    
    return [...new Set(topics)];
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'to', 'of', 'for', 'with', 'in', 'by']);
    
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^a-z0-9]/g, ''))
      .filter(word => word.length > 0);
  }

  private detectQuestionType(prompt: string): string | null {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('how') || lower.includes('explain')) return 'explanation';
    if (lower.includes('what') || lower.includes('which')) return 'definition';
    if (lower.includes('why')) return 'reasoning';
    if (lower.includes('when')) return 'temporal';
    if (lower.includes('where')) return 'location';
    if (lower.includes('who')) return 'identity';
    if (lower.endsWith('?')) return 'question';
    
    return null;
  }

  private detectResponseType(response: string): string | null {
    const lower = response.toLowerCase();
    
    if (lower.includes('because') || lower.includes('due to')) return 'reasoning';
    if (lower.includes('steps') || lower.includes('first') || lower.includes('then')) return 'explanation';
    if (lower.match(/\b\d{4}\b/) || lower.includes('ago') || lower.includes('will')) return 'temporal';
    if (lower.includes('is defined as') || lower.includes('refers to')) return 'definition';
    
    return 'statement';
  }

  private areCompatibleTypes(questionType: string, responseType: string): boolean {
    const compatibility: Record<string, string[]> = {
      'explanation': ['explanation', 'reasoning', 'statement'],
      'definition': ['definition', 'statement'],
      'reasoning': ['reasoning', 'explanation'],
      'temporal': ['temporal', 'statement'],
      'location': ['statement'],
      'identity': ['statement', 'definition'],
      'question': ['statement', 'explanation', 'reasoning', 'definition', 'temporal'],
    };

    return compatibility[questionType]?.includes(responseType) ?? true;
  }

  private detectTangents(response: string, relevantKeywords: string[]): string[] {
    const sentences = response.split(/[.!?]+/);
    const tangents: string[] = [];

    for (const sentence of sentences) {
      const sentenceKeywords = this.extractKeywords(sentence);
      const overlap = sentenceKeywords.filter(k => relevantKeywords.includes(k)).length;
      
      if (sentenceKeywords.length > 5 && overlap === 0) {
        tangents.push(sentence.trim().substring(0, 50) + '...');
      }
    }

    return tangents;
  }

  private extractTemporalReferences(content: string): Array<{
    text: string;
    date: Date;
    certainty: 'definite' | 'approximate';
    context: 'system' | 'general';
    sequence?: number;
  }> {
    const references: any[] = [];
    
    // Extract year references
    const yearMatches = content.matchAll(/\b(19|20)\d{2}\b/g);
    for (const match of yearMatches) {
      references.push({
        text: match[0],
        date: new Date(parseInt(match[0]), 0, 1),
        certainty: 'approximate',
        context: 'general',
      });
    }

    // Extract relative time references
    const relativePatterns = [
      { pattern: /(\d+)\s+days?\s+ago/g, unit: 'day', direction: -1 },
      { pattern: /(\d+)\s+weeks?\s+ago/g, unit: 'week', direction: -1 },
      { pattern: /(\d+)\s+months?\s+ago/g, unit: 'month', direction: -1 },
      { pattern: /in\s+(\d+)\s+days?/g, unit: 'day', direction: 1 },
    ];

    for (const { pattern, unit, direction } of relativePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const amount = parseInt(match[1]) * direction;
        const date = new Date();
        
        switch (unit) {
          case 'day':
            date.setDate(date.getDate() + amount);
            break;
          case 'week':
            date.setDate(date.getDate() + (amount * 7));
            break;
          case 'month':
            date.setMonth(date.getMonth() + amount);
            break;
        }

        references.push({
          text: match[0],
          date,
          certainty: 'approximate',
          context: 'general',
        });
      }
    }

    return references;
  }

  private validateTemporalSequence(references: any[]): { valid: boolean; error?: string } {
    const sequenced = references.filter(r => r.sequence !== undefined).sort((a, b) => a.sequence - b.sequence);
    
    for (let i = 1; i < sequenced.length; i++) {
      if (sequenced[i].date < sequenced[i - 1].date) {
        return {
          valid: false,
          error: `Event "${sequenced[i].text}" cannot occur before "${sequenced[i - 1].text}"`,
        };
      }
    }

    return { valid: true };
  }
}

// Test suite for hallucination detection
describe('Hallucination Detection Tests', () => {
  let detector: HallucinationDetector;

  beforeEach(() => {
    detector = new HallucinationDetector();
  });

  describe('Factual Accuracy Tests', () => {
    test('should detect claims about non-existent capabilities', async () => {
      const response: PortalResponse = {
        text: 'The agent can fly and teleport to other dimensions.',
        agentId: 'test-agent',
        timestamp: new Date(),
        metadata: {},
      };

      const checks = await detector.detectHallucination(response, {
        originalPrompt: 'What can the agent do?',
      });

      const factualCheck = checks.find(c => c.type === 'factual');
      expect(factualCheck?.passed).toBe(false);
      expect(factualCheck?.issues.length).toBeGreaterThan(0);
    });

    test('should validate numerical claims against constraints', async () => {
      const response: PortalResponse = {
        text: 'The system can handle up to 50000 agents simultaneously.',
        agentId: 'test-agent',
        timestamp: new Date(),
        metadata: {},
      };

      const checks = await detector.detectHallucination(response, {
        originalPrompt: 'What are the system limits?',
      });

      const factualCheck = checks.find(c => c.type === 'factual');
      expect(factualCheck?.passed).toBe(false);
      expect(factualCheck?.issues).toContain('Claimed max agents 50000 exceeds actual limit 10000');
    });
  });

  describe('Logical Consistency Tests', () => {
    test('should detect contradictory statements', async () => {
      const response: PortalResponse = {
        text: 'The agent is always active. The agent is never active when idle.',
        agentId: 'test-agent',
        timestamp: new Date(),
        metadata: {},
      };

      const checks = await detector.detectHallucination(response, {
        originalPrompt: 'Describe agent states',
      });

      const logicalCheck = checks.find(c => c.type === 'logical');
      expect(logicalCheck?.passed).toBe(false);
    });

    test('should detect impossible state combinations', async () => {
      const response: PortalResponse = {
        text: 'The agent is simultaneously running and stopped.',
        agentId: 'test-agent',
        timestamp: new Date(),
        metadata: {},
      };

      const checks = await detector.detectHallucination(response, {
        originalPrompt: 'What is the agent status?',
      });

      const logicalCheck = checks.find(c => c.type === 'logical');
      expect(logicalCheck?.passed).toBe(false);
      expect(logicalCheck?.issues).toContain('Impossible simultaneous states');
    });
  });

  describe('Relevance Tests', () => {
    test('should detect off-topic responses', async () => {
      const response: PortalResponse = {
        text: 'The weather today is sunny with a chance of rain.',
        agentId: 'test-agent',
        timestamp: new Date(),
        metadata: {},
      };

      const checks = await detector.detectHallucination(response, {
        originalPrompt: 'How do I configure the agent memory?',
      });

      const relevanceCheck = checks.find(c => c.type === 'relevance');
      expect(relevanceCheck?.passed).toBe(false);
      expect(relevanceCheck?.confidence).toBeLessThan(0.3);
    });

    test('should validate response type matches question type', async () => {
      const response: PortalResponse = {
        text: 'Paris.',
        agentId: 'test-agent',
        timestamp: new Date(),
        metadata: {},
      };

      const checks = await detector.detectHallucination(response, {
        originalPrompt: 'Why is the agent not responding?',
      });

      const relevanceCheck = checks.find(c => c.type === 'relevance');
      expect(relevanceCheck?.passed).toBe(false);
    });
  });

  describe('Temporal Consistency Tests', () => {
    test('should detect impossible future claims', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      
      const response: PortalResponse = {
        text: `The system will definitely have quantum capabilities by ${futureDate.getFullYear()}.`,
        agentId: 'test-agent',
        timestamp: new Date(),
        metadata: {},
      };

      const checks = await detector.detectHallucination(response, {
        originalPrompt: 'What are future plans?',
      });

      const temporalCheck = checks.find(c => c.type === 'temporal');
      expect(temporalCheck?.passed).toBe(false);
    });
  });
});