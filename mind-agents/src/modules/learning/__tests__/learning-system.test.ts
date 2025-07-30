/**
 * Learning System Integration Tests
 *
 * Tests for the SYMindX learning module system including all paradigms
 * and their integration with the agent system.
 */

import {
  createLearningModule,
  createHybridLearningSystem,
  suggestLearningParadigm,
  LearningParadigm,
  LearningExperience,
  OnlineLearningConfig,
  FewShotConfig,
  RLConfig,
  RLAlgorithm,
} from '../index';

describe('Learning System Integration', () => {
  describe('Module Creation', () => {
    test('creates online learning module', async () => {
      const config: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.01,
        forgettingRate: 0.001,
        replayBufferSize: 1000,
        consolidationInterval: 100,
      };

      const module = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );

      expect(module.paradigm).toBe(LearningParadigm.ONLINE_LEARNING);
      expect(module.id).toBe('online-learning');
    });

    test('creates few-shot adaptation module', async () => {
      const config: FewShotConfig = {
        paradigm: LearningParadigm.FEW_SHOT,
        supportSetSize: 5,
        querySetSize: 15,
        adaptationSteps: 10,
        metaLearningRate: 0.001,
        taskSimilarityThreshold: 0.7,
      };

      const module = await createLearningModule(
        LearningParadigm.FEW_SHOT,
        config
      );

      expect(module.paradigm).toBe(LearningParadigm.FEW_SHOT);
      expect(module.id).toBe('few-shot-adaptation');
    });

    test('throws error for unknown paradigm', async () => {
      const config = {
        paradigm: 'unknown' as any,
        learningRate: 0.01,
      };

      await expect(
        createLearningModule('unknown' as any, config)
      ).rejects.toThrow('Unknown learning paradigm: unknown');
    });
  });

  describe('Learning Operations', () => {
    test('online learning module learns from experience', async () => {
      const config: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.01,
        forgettingRate: 0.001,
        replayBufferSize: 1000,
        consolidationInterval: 100,
      };

      const module = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );

      const experience: LearningExperience = {
        id: 'exp_001',
        agentId: 'agent_123',
        timestamp: new Date(),
        input: { features: [0.1, 0.2, 0.3] },
        output: { prediction: 1 },
        feedback: { reward: 0.8 },
        importance: 0.9,
      };

      const update = await module.learn(experience);

      expect(update.paradigm).toBe(LearningParadigm.ONLINE_LEARNING);
      expect(update.metrics).toBeDefined();
      expect(update.changes).toBeDefined();
    });

    test('few-shot module adapts to new task', async () => {
      const config: FewShotConfig = {
        paradigm: LearningParadigm.FEW_SHOT,
        supportSetSize: 3,
        querySetSize: 5,
        adaptationSteps: 5,
        metaLearningRate: 0.01,
        taskSimilarityThreshold: 0.5,
      };

      const module = await createLearningModule(
        LearningParadigm.FEW_SHOT,
        config
      );

      const task = {
        id: 'task_001',
        name: 'Classification Task',
        description: 'Classify simple patterns',
        supportSet: [
          { input: { features: [1, 0] }, output: 1 },
          { input: { features: [0, 1] }, output: 0 },
          { input: { features: [1, 1] }, output: 1 },
        ],
        querySet: [
          { input: { features: [0, 0] }, output: 0 },
          { input: { features: [1, 0.5] }, output: 1 },
        ],
      };

      const result = await module.adapt({
        task,
        availableExamples: task.supportSet,
        performanceTarget: 0.8,
      });

      expect(result.adapted).toBe(true);
      expect(result.performance).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('module evaluates on test data', async () => {
      const config: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.01,
        forgettingRate: 0.001,
        replayBufferSize: 100,
        consolidationInterval: 10,
      };

      const module = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );

      // Train on some experiences first
      for (let i = 0; i < 5; i++) {
        const experience: LearningExperience = {
          id: `exp_${i}`,
          agentId: 'agent_123',
          timestamp: new Date(),
          input: { features: [Math.random(), Math.random()] },
          output: { prediction: Math.random() > 0.5 ? 1 : 0 },
          feedback: { reward: Math.random() },
          importance: 0.5,
        };

        await module.learn(experience);
      }

      const testData = {
        examples: [
          { input: { features: [0.1, 0.9] }, output: 1 },
          { input: { features: [0.9, 0.1] }, output: 0 },
        ],
      };

      const evaluation = await module.evaluate(testData);

      expect(evaluation.accuracy).toBeDefined();
      expect(evaluation.accuracy).toBeGreaterThanOrEqual(0);
      expect(evaluation.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('Hybrid Learning System', () => {
    test('creates hybrid system with multiple paradigms', async () => {
      const onlineConfig: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.01,
        forgettingRate: 0.001,
        replayBufferSize: 100,
        consolidationInterval: 10,
      };

      const rlConfig: RLConfig = {
        paradigm: LearningParadigm.REINFORCEMENT_LEARNING,
        algorithm: RLAlgorithm.DQN,
        discountFactor: 0.99,
        explorationStrategy: {
          type: 'epsilon_greedy',
          initialValue: 1.0,
          decayRate: 0.99,
          minValue: 0.1,
        },
      };

      const hybridSystem = await createHybridLearningSystem([
        {
          paradigm: LearningParadigm.ONLINE_LEARNING,
          config: onlineConfig,
          weight: 0.6,
        },
        {
          paradigm: LearningParadigm.REINFORCEMENT_LEARNING,
          config: rlConfig,
          weight: 0.4,
        },
      ]);

      expect(hybridSystem.modules.size).toBe(2);
      expect(hybridSystem.weights.size).toBe(2);
      expect(hybridSystem.coordinate).toBeDefined();

      // Test coordination
      const experience: LearningExperience = {
        id: 'exp_hybrid',
        agentId: 'agent_123',
        timestamp: new Date(),
        input: { features: [0.5, 0.5] },
        output: { prediction: 1 },
        feedback: {
          reward: 0.7,
          environmentFeedback: {
            stateChange: { x: 1, y: 1 },
            reward: 0.7,
            done: false,
          },
        },
        importance: 0.8,
      };

      const result = await hybridSystem.coordinate(experience);

      expect(result.paradigm).toBe('hybrid');
      expect(result.metrics).toBeDefined();
      expect(result.changes).toBeDefined();
    });
  });

  describe('Learning Paradigm Suggestion', () => {
    test('suggests appropriate paradigms for limited data', () => {
      const suggestions = suggestLearningParadigm({
        dataAvailability: 'limited',
        feedbackType: 'supervised',
        adaptationSpeed: 'immediate',
        taskVariability: 'static',
      });

      expect(suggestions).toContain(LearningParadigm.FEW_SHOT);
      expect(suggestions).toContain(LearningParadigm.TRANSFER_LEARNING);
    });

    test('suggests RL for reward-based feedback', () => {
      const suggestions = suggestLearningParadigm({
        dataAvailability: 'abundant',
        feedbackType: 'reward',
        adaptationSpeed: 'gradual',
        taskVariability: 'dynamic',
      });

      expect(suggestions).toContain(LearningParadigm.REINFORCEMENT_LEARNING);
    });

    test('suggests distillation for size constraints', () => {
      const suggestions = suggestLearningParadigm({
        dataAvailability: 'abundant',
        feedbackType: 'supervised',
        adaptationSpeed: 'fast',
        deploymentConstraints: 'size',
        taskVariability: 'static',
      });

      expect(suggestions).toContain(LearningParadigm.KNOWLEDGE_DISTILLATION);
    });

    test('suggests continual learning for evolving tasks', () => {
      const suggestions = suggestLearningParadigm({
        dataAvailability: 'limited',
        feedbackType: 'none',
        adaptationSpeed: 'gradual',
        taskVariability: 'evolving',
      });

      expect(suggestions).toContain(LearningParadigm.CONTINUAL_LEARNING);
      expect(suggestions).toContain(LearningParadigm.ONLINE_LEARNING);
    });
  });

  describe('Module State Management', () => {
    test('saves and restores module state', async () => {
      const config: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.01,
        forgettingRate: 0.001,
        replayBufferSize: 100,
        consolidationInterval: 10,
      };

      const module = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );

      // Learn from some experiences
      for (let i = 0; i < 3; i++) {
        const experience: LearningExperience = {
          id: `exp_${i}`,
          agentId: 'agent_123',
          timestamp: new Date(),
          input: { features: [i * 0.1, i * 0.2] },
          output: { prediction: i % 2 },
          feedback: { reward: i * 0.3 },
          importance: 0.5,
        };

        await module.learn(experience);
      }

      // Save state
      const state = module.getState();
      expect(state.paradigm).toBe(LearningParadigm.ONLINE_LEARNING);
      expect(state.statistics.totalExperiences).toBe(3);

      // Create new module and restore state
      const newModule = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );
      newModule.setState(state);

      const restoredState = newModule.getState();
      expect(restoredState.statistics.totalExperiences).toBe(3);
    });

    test('resets module state', async () => {
      const config: FewShotConfig = {
        paradigm: LearningParadigm.FEW_SHOT,
        supportSetSize: 3,
        querySetSize: 5,
        adaptationSteps: 5,
        metaLearningRate: 0.01,
        taskSimilarityThreshold: 0.5,
      };

      const module = await createLearningModule(
        LearningParadigm.FEW_SHOT,
        config
      );

      // Learn from an experience
      const experience: LearningExperience = {
        id: 'exp_reset',
        agentId: 'agent_123',
        timestamp: new Date(),
        input: { features: [0.1, 0.2] },
        output: { prediction: 1 },
        feedback: { reward: 0.8 },
        importance: 0.9,
      };

      await module.learn(experience);

      const stateBeforeReset = module.getState();
      expect(stateBeforeReset.statistics.totalExperiences).toBe(1);

      // Reset module
      module.reset();

      const stateAfterReset = module.getState();
      expect(stateAfterReset.statistics.totalExperiences).toBe(0);
    });
  });

  describe('Memory Integration', () => {
    test('creates learning memory records', async () => {
      const config: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.01,
        forgettingRate: 0.001,
        replayBufferSize: 100,
        consolidationInterval: 10,
      };

      const module = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );

      const memory = module.createLearningMemory(
        'agent_123',
        'milestone',
        'Achieved 90% accuracy on classification task',
        0.9
      );

      expect(memory.agentId).toBe('agent_123');
      expect(memory.type).toBe('learning');
      expect(memory.content).toContain('90% accuracy');
      expect(memory.importance).toBe(0.9);
      expect(memory.tags).toContain('learning');
      expect(memory.tags).toContain(LearningParadigm.ONLINE_LEARNING);
      expect(memory.duration).toBe('long_term');
    });
  });

  describe('Performance Monitoring', () => {
    test('tracks learning curves and milestones', async () => {
      const config: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.1, // Higher learning rate for faster convergence
        forgettingRate: 0.001,
        replayBufferSize: 100,
        consolidationInterval: 5,
      };

      const module = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );

      let milestoneReached = false;
      module.on('milestone', (milestone) => {
        milestoneReached = true;
        expect(milestone.name).toBeDefined();
        expect(milestone.achievement).toBeDefined();
        expect(milestone.timestamp).toBeInstanceOf(Date);
      });

      // Learn from experiences with increasing accuracy
      for (let i = 0; i < 20; i++) {
        const accuracy = Math.min(0.95, 0.5 + i * 0.03); // Gradually increase accuracy

        const experience: LearningExperience = {
          id: `exp_${i}`,
          agentId: 'agent_123',
          timestamp: new Date(),
          input: { features: [i * 0.01, (i + 1) * 0.01] },
          output: { prediction: i % 2 },
          feedback: { reward: accuracy },
          importance: 0.8,
        };

        await module.learn(experience);
      }

      const state = module.getState();
      expect(state.statistics.totalExperiences).toBe(20);
      expect(state.statistics.performanceHistory.length).toBeGreaterThan(0);

      // Check if learning curve is generated
      expect(state.statistics.learningCurve.points.length).toBeGreaterThan(0);
      expect(state.statistics.learningCurve.trend).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles invalid configuration gracefully', async () => {
      const invalidConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        // Missing required fields
      };

      await expect(
        createLearningModule(
          LearningParadigm.ONLINE_LEARNING,
          invalidConfig as any
        )
      ).rejects.toThrow();
    });

    test('handles learning from invalid experience', async () => {
      const config: OnlineLearningConfig = {
        paradigm: LearningParadigm.ONLINE_LEARNING,
        learningRate: 0.01,
        forgettingRate: 0.001,
        replayBufferSize: 100,
        consolidationInterval: 10,
      };

      const module = await createLearningModule(
        LearningParadigm.ONLINE_LEARNING,
        config
      );

      const invalidExperience = {
        id: 'invalid',
        agentId: 'agent_123',
        timestamp: new Date(),
        // Missing required fields
      } as any;

      // Should not throw, but handle gracefully
      const update = await module.learn(invalidExperience);
      expect(update.paradigm).toBe(LearningParadigm.ONLINE_LEARNING);
    });
  });
});

describe('Module Event System', () => {
  test('emits events during learning lifecycle', async () => {
    const config: OnlineLearningConfig = {
      paradigm: LearningParadigm.ONLINE_LEARNING,
      learningRate: 0.01,
      forgettingRate: 0.001,
      replayBufferSize: 100,
      consolidationInterval: 10,
    };

    const module = await createLearningModule(
      LearningParadigm.ONLINE_LEARNING,
      config
    );

    const events: string[] = [];

    module.on('initialized', () => events.push('initialized'));
    module.on('learned', () => events.push('learned'));
    module.on('adapted', () => events.push('adapted'));
    module.on('evaluated', () => events.push('evaluated'));
    module.on('milestone', () => events.push('milestone'));
    module.on('checkpoint', () => events.push('checkpoint'));
    module.on('reset', () => events.push('reset'));

    // Trigger events
    const experience: LearningExperience = {
      id: 'event_test',
      agentId: 'agent_123',
      timestamp: new Date(),
      input: { features: [0.5, 0.5] },
      output: { prediction: 1 },
      feedback: { reward: 0.9 },
      importance: 0.8,
    };

    await module.learn(experience);

    const testData = {
      examples: [{ input: { features: [0.1, 0.9] }, output: 1 }],
    };

    await module.evaluate(testData);

    module.reset();

    expect(events).toContain('learned');
    expect(events).toContain('evaluated');
    expect(events).toContain('reset');
  });
});
