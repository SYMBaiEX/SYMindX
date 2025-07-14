# Cognition System Development Guide

The SYMindX cognition system provides intelligent thinking, planning, and decision-making capabilities for AI agents through modular, paradigm-based cognitive architectures.

## Overview

The cognition system features:

- **Multiple Paradigms**: Reactive, HTN Planning, Hybrid, Unified, Theory of Mind
- **Auto-discovery**: Cognition modules are automatically detected and registered
- **Dual-process Thinking**: System 1 (fast) and System 2 (deliberative) thinking
- **Metacognition**: Self-awareness and thinking about thinking
- **Goal Management**: Hierarchical goal tracking and planning

## Architecture

```
cognition/
├── cognition-discovery.ts   # Auto-discovery system
├── cognition.ts            # Legacy unified cognition
├── index.ts                # Module factory and registration
├── package.json            # Module metadata
└── [cognition-modules]/    # Individual cognition paradigms
    ├── reactive/           # Fast, stimulus-response
    ├── htn-planner/        # Hierarchical Task Network planning
    ├── hybrid/             # Combined reactive + planning
    ├── unified/            # Modern dual-process system
    └── theory-of-mind/     # Social cognition
```

## Cognition Paradigms

### Reactive

Fast, stimulus-response cognitive processing for immediate reactions.

**Best for**: Real-time interactions, chat responses, simple decisions

```typescript
class ReactiveCognition {
  // Pattern matching for quick responses
  // Minimal deliberation
  // High responsiveness
}
```

### HTN Planner

Hierarchical Task Network planning for complex goal decomposition.

**Best for**: Multi-step tasks, strategic planning, goal-oriented behavior

```typescript
class HTNPlannerCognition {
  // Goal decomposition
  // Task hierarchies
  // Plan optimization
}
```

### Hybrid

Combines reactive and planning approaches for balanced cognitive processing.

**Best for**: Mixed scenarios requiring both quick responses and planning

```typescript
class HybridCognition {
  // Reactive layer for immediate responses
  // Planning layer for complex goals
  // Dynamic switching between modes
}
```

### Unified

Modern dual-process system with System 1/System 2 thinking and metacognition.

**Best for**: General-purpose cognition with advanced capabilities

```typescript
class UnifiedCognition {
  // Dual-process thinking (System 1/2)
  // Metacognitive awareness
  // Goal tracking
  // Conditional thinking
}
```

### Theory of Mind

Social cognition for understanding and modeling other agents' mental states.

**Best for**: Multi-agent scenarios, social interactions, empathy modeling

```typescript
class TheoryOfMind {
  // Mental model tracking
  // Belief/desire/intention modeling
  // Empathy simulation
  // Social reasoning
}
```

## Creating a New Cognition Module

### 1. Module Structure

```
my-cognition/
├── package.json         # Package metadata with symindx.cognition config
├── index.ts            # Main cognition implementation
├── types.ts            # Cognition-specific types
└── README.md           # Documentation
```

### 2. Package Configuration

```json
{
  "name": "@symindx/cognition-my-cognition",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts",
  "symindx": {
    "cognition": {
      "name": "my-cognition",
      "displayName": "My Cognition",
      "description": "Custom cognitive architecture",
      "paradigm": "hybrid",
      "capabilities": ["planning", "reasoning", "learning"],
      "performance": {
        "speed": "medium",
        "depth": "deep",
        "accuracy": "high"
      },
      "configSchema": {
        "type": "object",
        "properties": {
          "thinkingDepth": {
            "type": "string",
            "enum": ["shallow", "normal", "deep"]
          }
        }
      }
    }
  }
}
```

### 3. Cognition Implementation

```typescript
import {
  Agent,
  ThoughtContext,
  ThoughtResult,
  Plan,
  Decision,
} from '../../types/agent.js';
import { CognitionModule } from '../../types/cognition.js';
import { MyCognitionConfig } from './types.js';

export class MyCognition implements CognitionModule {
  public id: string;
  public type: string = 'my-cognition';
  private config: MyCognitionConfig;

  constructor(config: MyCognitionConfig = {}) {
    this.id = `my-cognition_${Date.now()}`;
    this.config = {
      thinkingDepth: 'normal',
      enableMetacognition: true,
      ...config,
    };
  }

  async initialize(config: any): Promise<void> {
    // Initialize the cognition module
    this.config = { ...this.config, ...config };
  }

  getMetadata() {
    return {
      id: this.id,
      name: 'My Cognition',
      version: '1.0.0',
      description: 'Custom cognitive architecture',
      author: 'Your Name',
    };
  }

  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const thoughts: string[] = [];

    // Step 1: Analyze the situation
    const situation = this.analyzeSituation(context);
    thoughts.push(`Situation: ${situation.summary}`);

    // Step 2: Determine thinking approach
    const approach = this.selectThinkingApproach(situation);
    thoughts.push(`Using ${approach} thinking approach`);

    // Step 3: Process based on approach
    let result: ThoughtResult;

    switch (approach) {
      case 'fast':
        result = await this.fastThinking(agent, context);
        break;
      case 'deliberative':
        result = await this.deliberativeThinking(agent, context);
        break;
      default:
        result = await this.defaultThinking(agent, context);
    }

    // Step 4: Metacognitive reflection
    if (this.config.enableMetacognition) {
      const reflection = this.reflect(result, situation);
      thoughts.push(`Metacognition: ${reflection}`);
    }

    return {
      ...result,
      thoughts: [...thoughts, ...result.thoughts],
    };
  }

  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Create a plan for achieving the goal
    const steps = await this.decompose(goal);

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: this.calculatePriority(goal),
      estimatedDuration: steps.length * 60000, // 1 minute per step
      dependencies: [],
      status: 'pending',
    };
  }

  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    // Make a decision between options
    const scored = options.map((option) => ({
      ...option,
      score: this.scoreOption(option, agent),
    }));

    // Return highest-scored option
    return scored.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  // Private methods for implementation
  private analyzeSituation(context: ThoughtContext) {
    return {
      summary: 'Analyzing context',
      complexity: context.events.length,
      urgency: this.assessUrgency(context),
      type: this.categorizeContext(context),
    };
  }

  private selectThinkingApproach(situation: any): string {
    if (situation.urgency > 0.8) return 'fast';
    if (situation.complexity > 5) return 'deliberative';
    return 'balanced';
  }

  private async fastThinking(
    agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    // Quick, pattern-based thinking
    return {
      thoughts: ['Fast thinking applied'],
      actions: [],
      emotions: {
        current: 'focused',
        intensity: 0.6,
        triggers: [],
        history: [],
        timestamp: new Date(),
      },
      memories: [],
      confidence: 0.7,
    };
  }

  private async deliberativeThinking(
    agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    // Slow, analytical thinking
    return {
      thoughts: ['Deliberative analysis performed'],
      actions: [],
      emotions: {
        current: 'thoughtful',
        intensity: 0.8,
        triggers: [],
        history: [],
        timestamp: new Date(),
      },
      memories: [],
      confidence: 0.9,
    };
  }

  private async defaultThinking(
    agent: Agent,
    context: ThoughtContext
  ): Promise<ThoughtResult> {
    // Balanced thinking approach
    return {
      thoughts: ['Balanced thinking applied'],
      actions: [],
      emotions: {
        current: 'neutral',
        intensity: 0.5,
        triggers: [],
        history: [],
        timestamp: new Date(),
      },
      memories: [],
      confidence: 0.8,
    };
  }

  private reflect(result: ThoughtResult, situation: any): string {
    // Metacognitive reflection on the thinking process
    if (result.confidence < 0.5) {
      return 'Low confidence - may need more information';
    }
    if (situation.complexity > result.thoughts.length) {
      return 'Complex situation may require deeper analysis';
    }
    return 'Thinking process appears appropriate';
  }

  private async decompose(goal: string): Promise<any[]> {
    // Decompose goal into actionable steps
    return [
      {
        id: 'step_1',
        action: 'analyze_goal',
        description: `Analyze: ${goal}`,
        status: 'pending',
        parameters: {},
        preconditions: [],
        effects: [],
      },
      {
        id: 'step_2',
        action: 'execute_goal',
        description: `Execute: ${goal}`,
        status: 'pending',
        parameters: {},
        preconditions: ['step_1'],
        effects: [],
      },
    ];
  }

  private scoreOption(option: Decision, agent: Agent): number {
    // Score decision options
    let score = option.confidence || 0.5;

    // Add custom scoring logic
    if (option.reasoning?.includes('efficient')) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private assessUrgency(context: ThoughtContext): number {
    // Assess how urgent the situation is
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'now'];
    let urgency = 0;

    for (const event of context.events) {
      const message = event.data?.message?.toLowerCase() || '';
      urgency +=
        urgentKeywords.filter((keyword) => message.includes(keyword)).length *
        0.3;
    }

    return Math.min(1.0, urgency);
  }

  private categorizeContext(context: ThoughtContext): string {
    // Categorize the type of context
    if (context.events.some((e) => e.type.includes('social'))) {
      return 'social';
    }
    if (context.events.some((e) => e.type.includes('action'))) {
      return 'task';
    }
    return 'general';
  }

  private calculatePriority(goal: string): number {
    // Calculate goal priority
    const priorityKeywords = {
      critical: 1.0,
      important: 0.8,
      urgent: 0.9,
      minor: 0.3,
    };

    for (const [keyword, priority] of Object.entries(priorityKeywords)) {
      if (goal.toLowerCase().includes(keyword)) {
        return priority;
      }
    }

    return 0.5; // Default priority
  }
}

// Factory function for discovery system
export function createMyCognition(config: MyCognitionConfig = {}): MyCognition {
  return new MyCognition(config);
}

export default MyCognition;
```

### 4. Type Definitions

```typescript
import { BaseConfig } from '../../types/common.js';

export interface MyCognitionConfig extends BaseConfig {
  thinkingDepth?: 'shallow' | 'normal' | 'deep';
  enableMetacognition?: boolean;
  priorityWeighting?: number;
  adaptiveLearning?: boolean;
  customParameters?: {
    [key: string]: any;
  };
}

export interface SituationAnalysis {
  summary: string;
  complexity: number;
  urgency: number;
  type: string;
  requiresPlanning?: boolean;
}
```

## Cognition Categories by Paradigm

### Deductive

Logic-based reasoning from general principles to specific conclusions.

### Inductive

Pattern-based reasoning from specific observations to general principles.

### Abductive

Best-explanation reasoning for hypothesis generation.

### Reinforcement Learning

Learning through trial and error with reward signals.

### PDDL Planning

Classical AI planning using Planning Domain Definition Language.

## Discovery System

Cognition modules are automatically discovered:

```typescript
import { CognitionDiscovery } from '@symindx/mind-agents';

const discovery = new CognitionDiscovery(projectRoot);
const cognitions = await discovery.discoverCognitions();

// Cognitions are categorized by paradigm
cognitions.forEach((cognition) => {
  console.log(`Found: ${cognition.name} (${cognition.paradigm})`);
});
```

## Configuration

### Character Level

```json
{
  "cognition": {
    "type": "unified",
    "config": {
      "thinkForActions": true,
      "thinkForMentions": true,
      "analysisDepth": "deep",
      "enableMetacognition": true,
      "enableTheoryOfMind": true
    }
  }
}
```

### Runtime Level

```json
{
  "cognition": {
    "defaultParadigm": "unified",
    "thinkingTimeout": 5000,
    "enableCaching": true
  }
}
```

## Thinking Patterns

### Conditional Thinking

The unified cognition implements conditional thinking:

```typescript
// Think only when necessary
shouldSkipThinking(context) {
  // Skip for casual conversation
  if (quickResponseMode && !hasActionEvent && !hasMention) {
    return true
  }
  return false
}
```

### Dual-Process System

System 1 (fast) and System 2 (slow) thinking:

```typescript
async think(agent, context) {
  // Try System 1 first
  const system1Result = await this.system1Think(agent, context)

  if (system1Result.confidence >= threshold) {
    return system1Result
  }

  // Engage System 2 for complex analysis
  return this.system2Think(agent, context, system1Result)
}
```

### Metacognition

Self-awareness and reflection on thinking:

```typescript
private reflect(result, situation) {
  if (result.confidence < 0.5) {
    return 'Low confidence - gather more information'
  }
  if (disagreement > 0.3) {
    return 'System 1/2 disagreement - investigate further'
  }
  return 'Thinking process appears sound'
}
```

## Testing Cognition Modules

```typescript
import { describe, it, expect } from '@jest/globals';
import { MyCognition } from '../index.js';

describe('MyCognition', () => {
  it('should think appropriately for simple contexts', async () => {
    const cognition = new MyCognition();

    const context = {
      events: [
        {
          type: 'message',
          data: { message: 'Hello' },
          timestamp: new Date(),
        },
      ],
      goal: '',
      memories: [],
    };

    const result = await cognition.think({} as any, context);
    expect(result.thoughts.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should create plans for goals', async () => {
    const cognition = new MyCognition();

    const plan = await cognition.plan({} as any, 'test goal');
    expect(plan.goal).toBe('test goal');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('should make decisions between options', async () => {
    const cognition = new MyCognition();

    const options = [
      { id: '1', confidence: 0.6, reasoning: 'Option 1' },
      { id: '2', confidence: 0.8, reasoning: 'Option 2' },
    ];

    const decision = await cognition.decide({} as any, options);
    expect(decision.id).toBe('2'); // Higher confidence
  });
});
```

## Performance Considerations

### Speed vs Depth

- **Reactive**: Fastest, minimal analysis
- **Unified**: Balanced, conditional thinking
- **HTN Planner**: Slower, deep analysis
- **Theory of Mind**: Moderate, social focus

### Memory Usage

- Cache frequently used patterns
- Clean up old reasoning traces
- Limit active goal tracking

### Scalability

- Use async operations for complex thinking
- Implement timeouts for long operations
- Consider parallel processing for multiple goals

## Best Practices

### Thinking Depth

Match thinking depth to context complexity:

- Simple greetings → Fast/reactive
- Complex planning → Deep/deliberative
- Social interactions → Theory of mind

### Error Handling

```typescript
async think(agent, context) {
  try {
    return await this.actualThinking(agent, context)
  } catch (error) {
    this.logger.error('Thinking failed:', error)
    return this.getFallbackResponse()
  }
}
```

### Configuration Management

- Provide sensible defaults
- Allow runtime configuration updates
- Validate configuration parameters

### Integration

- Implement all required CognitionModule methods
- Handle different agent types gracefully
- Provide meaningful metadata

## Existing Modules Reference

Study existing implementations:

- **Unified**: Modern dual-process with metacognition
- **Reactive**: Simple stimulus-response patterns
- **HTN Planner**: Hierarchical goal decomposition
- **Theory of Mind**: Social cognition and empathy
- **Hybrid**: Combined reactive and planning approaches

## Troubleshooting

### Module Not Found

- Check package.json symindx.cognition configuration
- Verify factory function is exported
- Ensure discovery system can find the module

### Performance Issues

- Implement thinking timeouts
- Cache expensive computations
- Use appropriate thinking depth for context

### Integration Problems

- Ensure CognitionModule interface compliance
- Check type definitions are correct
- Verify async/await usage

For more examples and advanced patterns, see the existing cognition implementations in the `mind-agents/src/modules/cognition/` directory.
