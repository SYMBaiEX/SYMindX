/**
 * Hybrid Cognition Demonstration for SYMindX
 * 
 * Shows how to use the new hybrid reasoning capabilities including
 * rule-based reasoning, PDDL planning, probabilistic inference,
 * reinforcement learning, and meta-reasoning.
 */

import { 
  Agent, 
  ThoughtContext, 
  AgentStatus,
  ActionCategory,
  ActionStatus
} from '../../types/agent.js'
import { 
  ReasoningParadigm,
  HybridReasoningConfig,
  createDefaultHybridConfig,
  createCognitionModule
} from './index.js'
import { 
  RewardSignal,
  RewardSignalType,
  Experience
} from '../../types/autonomous.js'
import { runtimeLogger } from '../../utils/logger.js'

/**
 * Demo configuration
 */
const DEMO_CONFIG: HybridReasoningConfig = {
  ...createDefaultHybridConfig(),
  learning: {
    enabled: true,
    algorithm: 'q_learning',
    experienceBufferSize: 100,
    learningRate: 0.2,
    explorationStrategy: 'epsilon_greedy'
  },
  metaReasoning: {
    enabled: true,
    paradigmSwitchThreshold: 0.5,
    performanceWindow: 20
  }
}

/**
 * Create demo agent
 */
function createDemoAgent(): Agent {
  return {
    id: 'demo_agent',
    name: 'Hybrid Reasoning Demo Agent',
    status: AgentStatus.ACTIVE,
    emotion: null as any, // Placeholder
    memory: null as any,  // Placeholder
    cognition: null as any, // Will be set
    extensions: [],
    config: {},
    lastUpdate: new Date()
  }
}

/**
 * Create demo contexts for different scenarios
 */
function createDemoContexts(): Record<string, ThoughtContext> {
  return {
    // Simple question - good for rule-based reasoning
    simple_question: {
      events: [{
        id: 'question_event',
        type: 'communication.message',
        source: 'user',
        timestamp: new Date(),
        data: {
          message: 'What is the weather like today?',
          fromUser: true
        }
      }],
      memories: []
    },
    
    // Complex planning task - good for PDDL planning
    complex_planning: {
      goal: 'Plan a multi-step project to develop a new feature',
      events: [{
        id: 'planning_request',
        type: 'task.planning',
        source: 'system',
        timestamp: new Date(),
        data: {
          complexity: 'high',
          resources: ['team', 'budget', 'timeline']
        }
      }],
      memories: []
    },
    
    // Uncertain situation - good for probabilistic reasoning
    uncertain_scenario: {
      events: [{
        id: 'uncertain_event',
        type: 'decision.uncertainty',
        source: 'system',
        timestamp: new Date(),
        data: {
          message: 'Maybe we should consider this option, but I\'m not sure...',
          confidence: 0.4
        }
      }],
      memories: []
    },
    
    // Learning scenario - good for reinforcement learning
    learning_scenario: {
      events: [{
        id: 'learning_event',
        type: 'task.novel',
        source: 'environment',
        timestamp: new Date(),
        data: {
          novelty: true,
          adaptationRequired: true
        }
      }],
      memories: []
    }
  }
}

/**
 * Demonstrate rule-based reasoning
 */
async function demonstrateRuleBasedReasoning(): Promise<void> {
  console.log('\n🔧 === Rule-Based Reasoning Demo ===')
  
  const agent = createDemoAgent()
  const cognition = createCognitionModule('rule_based', DEMO_CONFIG)
  agent.cognition = cognition
  
  const contexts = createDemoContexts()
  const result = await cognition.think(agent, contexts.simple_question)
  
  console.log('Rule-based thoughts:', result.thoughts)
  console.log('Actions generated:', result.actions.length)
  console.log('Confidence:', result.confidence.toFixed(3))
  
  // Test planning
  const plan = await cognition.plan(agent, 'Respond to user question')
  console.log('Plan steps:', plan.steps.length)
}

/**
 * Demonstrate PDDL planning
 */
async function demonstratePDDLPlanning(): Promise<void> {
  console.log('\n📋 === PDDL Planning Demo ===')
  
  const agent = createDemoAgent()
  const cognition = createCognitionModule('pddl_planner', DEMO_CONFIG)
  agent.cognition = cognition
  
  const contexts = createDemoContexts()
  const result = await cognition.think(agent, contexts.complex_planning)
  
  console.log('PDDL thoughts:', result.thoughts)
  console.log('Actions generated:', result.actions.length)
  console.log('Confidence:', result.confidence.toFixed(3))
  
  // Test complex planning
  const plan = await cognition.plan(agent, 'Develop new feature with team coordination')
  console.log('Plan steps:', plan.steps.length)
  console.log('Estimated duration:', plan.estimatedDuration / 1000, 'seconds')
}

/**
 * Demonstrate probabilistic reasoning
 */
async function demonstrateProbabilisticReasoning(): Promise<void> {
  console.log('\n🎲 === Probabilistic Reasoning Demo ===')
  
  const agent = createDemoAgent()
  const cognition = createCognitionModule('probabilistic', DEMO_CONFIG)
  agent.cognition = cognition
  
  const contexts = createDemoContexts()
  const result = await cognition.think(agent, contexts.uncertain_scenario)
  
  console.log('Probabilistic thoughts:', result.thoughts)
  console.log('Actions generated:', result.actions.length)
  console.log('Confidence:', result.confidence.toFixed(3))
  
  // Test decision making under uncertainty
  const options = [
    { id: 'option1', action: 'wait_for_more_info', confidence: 0.6 },
    { id: 'option2', action: 'proceed_cautiously', confidence: 0.4 },
    { id: 'option3', action: 'seek_expert_advice', confidence: 0.8 }
  ]
  
  const decision = await cognition.decide(agent, options)
  console.log('Selected decision:', decision.action)
}

/**
 * Demonstrate reinforcement learning
 */
async function demonstrateReinforcementLearning(): Promise<void> {
  console.log('\n🧠 === Reinforcement Learning Demo ===')
  
  const agent = createDemoAgent()
  const cognition = createCognitionModule('reinforcement_learning', DEMO_CONFIG)
  agent.cognition = cognition
  
  const contexts = createDemoContexts()
  
  // Initial thinking
  const result1 = await cognition.think(agent, contexts.learning_scenario)
  console.log('Initial RL thoughts:', result1.thoughts)
  console.log('Initial confidence:', result1.confidence.toFixed(3))
  
  // Simulate learning through experiences
  for (let i = 0; i < 5; i++) {
    const experience: Experience = {
      id: `exp_${i}`,
      agentId: agent.id,
      state: {
        id: `state_${i}`,
        agentId: agent.id,
        timestamp: new Date(),
        features: {
          context_clarity: Math.random(),
          task_complexity: Math.random(),
          time_pressure: Math.random()
        },
        context: { episode: i }
      },
      action: {
        id: `action_${i}`,
        agentId: agent.id,
        type: ActionCategory.PROCESSING,
        action: i % 2 === 0 ? 'explore' : 'exploit',
        parameters: {},
        priority: 0.5,
        status: ActionStatus.COMPLETED,
        extension: 'rl_demo',
        timestamp: new Date()
      },
      reward: {
        id: `reward_${i}`,
        type: RewardSignalType.POSITIVE,
        value: Math.random() > 0.5 ? 0.8 : -0.3, // Mixed rewards
        source: 'environment',
        context: {},
        timestamp: new Date(),
        agentId: agent.id
      },
      nextState: {
        id: `next_state_${i}`,
        agentId: agent.id,
        timestamp: new Date(),
        features: {
          context_clarity: Math.random(),
          task_complexity: Math.random(),
          time_pressure: Math.random()
        },
        context: { episode: i + 1 }
      },
      done: false,
      timestamp: new Date(),
      importance: 0.5,
      tags: ['demo', 'learning']
    }
    
    if (cognition.learn) {
      await cognition.learn(agent, experience)
    }
  }
  
  // Test thinking after learning
  const result2 = await cognition.think(agent, contexts.learning_scenario)
  console.log('Post-learning thoughts:', result2.thoughts)
  console.log('Post-learning confidence:', result2.confidence.toFixed(3))
  
  // Show learning statistics if available
  if ((cognition as any).getStats) {
    const stats = (cognition as any).getStats()
    console.log('Learning stats:', stats)
  }
}

/**
 * Demonstrate meta-reasoning
 */
async function demonstrateMetaReasoning(): Promise<void> {
  console.log('\n🎯 === Meta-Reasoning Demo ===')
  
  const agent = createDemoAgent()
  const cognition = createCognitionModule('meta_reasoner', DEMO_CONFIG)
  agent.cognition = cognition
  
  const contexts = createDemoContexts()
  
  // Test each scenario type
  for (const [scenarioName, context] of Object.entries(contexts)) {
    console.log(`\n--- Testing ${scenarioName} ---`)
    
    const result = await cognition.think(agent, context)
    console.log('Meta-reasoner thoughts:', result.thoughts)
    console.log('Selected paradigm from thoughts:', 
      result.thoughts.find(t => t.includes('Selected paradigm:'))?.split(': ')[1] || 'unknown')
    console.log('Confidence:', result.confidence.toFixed(3))
  }
  
  // Show meta-reasoning statistics if available
  if ((cognition as any).getStats) {
    const stats = (cognition as any).getStats()
    console.log('\nMeta-reasoning stats:')
    console.log('Paradigm usage:', stats.paradigmUsage)
    console.log('Paradigm performance:', stats.paradigmPerformance)
    console.log('Average selection confidence:', stats.averageSelectionConfidence?.toFixed(3))
  }
}

/**
 * Demonstrate learning persistence
 */
async function demonstrateLearningPersistence(): Promise<void> {
  console.log('\n💾 === Learning Persistence Demo ===')
  
  const { learningPersistence } = await import('./learning-persistence.js')
  
  // Get storage statistics
  const stats = await learningPersistence.getStorageStats()
  console.log('Storage stats:', stats)
  
  // Test saving and loading a simple learning state
  const agent = createDemoAgent()
  const testState = {
    qTable: { 'state1': { 'action1': 0.5, 'action2': 0.3 } },
    explorationRate: 0.1,
    episodeCount: 10
  }
  
  await learningPersistence.saveLearningState(
    agent, 
    ReasoningParadigm.REINFORCEMENT_LEARNING, 
    testState
  )
  
  const loadedState = await learningPersistence.loadLearningState(
    agent.id, 
    ReasoningParadigm.REINFORCEMENT_LEARNING
  )
  
  console.log('Saved and loaded state successfully:', !!loadedState)
  console.log('Q-table preserved:', !!loadedState?.qTable)
}

/**
 * Performance comparison between paradigms
 */
async function performanceComparison(): Promise<void> {
  console.log('\n⚡ === Performance Comparison ===')
  
  const agent = createDemoAgent()
  const contexts = createDemoContexts()
  const paradigms = ['rule_based', 'pddl_planner', 'probabilistic', 'reinforcement_learning']
  
  for (const paradigm of paradigms) {
    const startTime = Date.now()
    const cognition = createCognitionModule(paradigm, DEMO_CONFIG)
    agent.cognition = cognition
    
    const result = await cognition.think(agent, contexts.simple_question)
    const endTime = Date.now()
    
    console.log(`${paradigm}:`, {
      time: `${endTime - startTime}ms`,
      confidence: result.confidence.toFixed(3),
      actions: result.actions.length,
      thoughts: result.thoughts.length
    })
  }
}

/**
 * Run comprehensive demo
 */
export async function runHybridCognitionDemo(): Promise<void> {
  console.log('🚀 Starting Hybrid Cognition Demonstration')
  console.log('================================================')
  
  try {
    await demonstrateRuleBasedReasoning()
    await demonstratePDDLPlanning()
    await demonstrateProbabilisticReasoning()
    await demonstrateReinforcementLearning()
    await demonstrateMetaReasoning()
    await demonstrateLearningPersistence()
    await performanceComparison()
    
    console.log('\n✅ === Demo Completed Successfully ===')
    console.log('All hybrid reasoning paradigms demonstrated!')
    
  } catch (error) {
    console.error('❌ Demo failed:', error)
    runtimeLogger.cognition(`Demo error: ${error}`)
  }
}

/**
 * Run demo if called directly
 */
if (require.main === module) {
  runHybridCognitionDemo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Demo execution failed:', error)
      process.exit(1)
    })
}

export default runHybridCognitionDemo