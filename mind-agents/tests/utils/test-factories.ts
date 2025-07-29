// Test factories for creating mock objects
import { Agent, AgentConfig, AgentAction, EmotionState, MemoryRecord, Plan, PlanStatus, PlanStep, ActionStatus } from '../../src/types';
import { UnifiedContext } from '../../src/types/context/unified-context';

export class TestFactories {
  static createAgent(overrides: Partial<Agent> = {}): Agent {
    return {
      id: 'test-agent-1',
      name: 'Test Agent',
      status: 'inactive',
      config: TestFactories.createAgentConfig(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  static createAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
    return {
      personality: {
        traits: ['curious', 'helpful'],
        backstory: 'A test agent for testing purposes',
        goals: ['Learn', 'Help'],
        values: ['Accuracy', 'Helpfulness'],
      },
      autonomous: {
        enabled: false,
        ethics: { enabled: true },
        decisionMaking: { threshold: 0.8 },
      },
      memory: {
        provider: 'sqlite',
        config: { dbPath: ':memory:' },
      },
      emotion: {
        composite: {
          emotions: ['happy', 'curious', 'confident'],
          decayRate: 0.1,
          intensityThreshold: 0.5,
        },
      },
      cognition: {
        type: 'reactive',
        config: {},
      },
      communication: {
        style: 'casual',
        tone: 'friendly',
        guidelines: ['Be helpful', 'Be accurate'],
      },
      extensions: [],
      portals: [],
      context: {
        enabled: true,
        enrichment: {
          enabled: true,
          steps: ['memory_enrichment'],
        },
      },
      ...overrides,
    };
  }
  
  static createAgentAction(overrides: Partial<AgentAction> = {}): AgentAction {
    return {
      id: 'action-1',
      type: 'message',
      extension: 'api',
      action: 'send_message',
      parameters: { message: 'Hello, world!' },
      timestamp: new Date(),
      status: 'pending' as ActionStatus,
      ...overrides,
    };
  }
  
  static createEmotionState(overrides: Partial<EmotionState> = {}): EmotionState {
    return {
      primary: 'neutral',
      emotions: {
        happy: 0.5,
        sad: 0.1,
        angry: 0.0,
        anxious: 0.2,
        confident: 0.7,
        curious: 0.6,
      },
      intensity: 0.5,
      lastUpdate: new Date(),
      history: [],
      ...overrides,
    };
  }
  
  static createMemoryRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
    return {
      id: 'memory-1',
      agentId: 'test-agent-1',
      type: 'conversation',
      content: 'Test memory content',
      metadata: {
        importance: 0.8,
        tags: ['test'],
        emotions: TestFactories.createEmotionState(),
      },
      timestamp: new Date(),
      ...overrides,
    };
  }
  
  static createPlan(overrides: Partial<Plan> = {}): Plan {
    return {
      id: 'plan-1',
      goal: 'Complete test task',
      steps: [TestFactories.createPlanStep()],
      priority: 1,
      estimatedDuration: 5000,
      dependencies: [],
      status: 'pending' as PlanStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  static createPlanStep(overrides: Partial<PlanStep> = {}): PlanStep {
    return {
      id: 'step-1',
      action: 'test_action',
      description: 'Perform test action',
      status: 'pending' as ActionStatus,
      parameters: {},
      preconditions: [],
      effects: [],
      estimatedDuration: 1000,
      ...overrides,
    };
  }
  
  static createUnifiedContext(overrides: Partial<UnifiedContext> = {}): UnifiedContext {
    return {
      id: 'context-1',
      agentId: 'test-agent-1',
      requestId: 'request-1',
      timestamp: new Date(),
      ttl: 3600000,
      metadata: {
        source: 'test',
        priority: 1,
      },
      enrichment: {
        enabled: true,
        completedSteps: [],
        availableEnrichers: ['memory_enrichment'],
      },
      memory: {
        relevantMemories: [],
        searchQuery: 'test query',
        confidence: 0.8,
      },
      emotional: {
        currentState: TestFactories.createEmotionState(),
        triggers: [],
        history: [],
      },
      social: {
        relationships: new Map(),
        contextualFactors: [],
        interactionHistory: [],
      },
      temporal: {
        chronologicalMarkers: [],
        timeBasedPatterns: [],
        sessionDuration: 1000,
      },
      environment: {
        systemMetrics: {
          cpuUsage: 50,
          memoryUsage: 512,
          networkStatus: 'connected',
        },
        runtimeInfo: {
          version: '1.0.0',
          uptime: 10000,
          activeAgents: 1,
        },
      },
      ...overrides,
    };
  }
  
  // Helper methods for creating collections
  static createAgents(count: number): Agent[] {
    return Array.from({ length: count }, (_, i) =>
      TestFactories.createAgent({ id: `test-agent-${i + 1}`, name: `Test Agent ${i + 1}` })
    );
  }
  
  static createMemoryRecords(agentId: string, count: number): MemoryRecord[] {
    return Array.from({ length: count }, (_, i) =>
      TestFactories.createMemoryRecord({
        id: `memory-${i + 1}`,
        agentId,
        content: `Test memory content ${i + 1}`,
      })
    );
  }
  
  static createAgentActions(count: number): AgentAction[] {
    return Array.from({ length: count }, (_, i) =>
      TestFactories.createAgentAction({ id: `action-${i + 1}` })
    );
  }
}