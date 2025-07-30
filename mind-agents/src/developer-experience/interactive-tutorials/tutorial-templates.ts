/**
 * Built-in Tutorial Templates
 * Pre-defined tutorials for common SYMindX use cases
 */

import { Tutorial } from '../types/index.js';

export function getTutorialTemplates(): Tutorial[] {
  return [
    createGettingStartedTutorial(),
    createFirstAgentTutorial(),
    createEmotionSystemTutorial(),
    createMemorySystemTutorial(),
    createExtensionTutorial(),
    createMultiAgentTutorial(),
    createAdvancedPatternsTutorial(),
    createDebuggingTutorial(),
    createDeploymentTutorial(),
  ];
}

function createGettingStartedTutorial(): Tutorial {
  return {
    id: 'getting-started',
    title: 'Getting Started with SYMindX',
    description: 'Learn the basics of SYMindX and create your first AI agent',
    difficulty: 'beginner',
    estimatedTime: 15,
    prerequisites: [],
    completionReward: 'SYMindX Explorer Badge',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to SYMindX',
        description:
          "Let's explore what makes SYMindX special for AI agent development",
        aiExplanation:
          'SYMindX is a reactive AI agent framework that emphasizes emotional intelligence, memory systems, and extensible architecture.',
        validation: () => true,
      },
      {
        id: 'check-installation',
        title: 'Verify Installation',
        description:
          "Let's make sure SYMindX is properly installed and configured",
        code: `// Check if SYMindX is working
import { SYMindXRuntime } from '@symindx/mind-agents';

console.log('SYMindX Runtime loaded successfully!');`,
        expected: 'SYMindX Runtime loaded successfully!',
        validation: (input) =>
          input.includes('SYMindXRuntime') && input.includes('console.log'),
        hints: [
          'Import the SYMindXRuntime from the @symindx/mind-agents package',
          'Add a console.log to verify the import works',
        ],
      },
      {
        id: 'basic-concepts',
        title: 'Core Concepts',
        description:
          'Understand the fundamental concepts: Agents, Emotions, Memory, and Extensions',
        aiExplanation:
          'SYMindX agents are reactive by default, with pluggable emotion systems, persistent memory, and extensible behaviors through extensions.',
        validation: () => true,
      },
      {
        id: 'explore-cli',
        title: 'CLI Basics',
        description: 'Learn to use the SYMindX CLI for agent management',
        code: `// Basic CLI commands you should know:
// symindx interactive - Start interactive mode
// symindx agent --list - List all agents  
// symindx status - Show system status
// symindx chat - Chat with agents

console.log('Ready to use SYMindX CLI!');`,
        expected: 'Ready to use SYMindX CLI!',
        validation: (input) => input.includes('Ready to use SYMindX CLI'),
      },
    ],
  };
}

function createFirstAgentTutorial(): Tutorial {
  return {
    id: 'first-agent',
    title: 'Create Your First Agent',
    description:
      'Build a simple AI agent from scratch with personality and memory',
    difficulty: 'beginner',
    estimatedTime: 20,
    prerequisites: ['getting-started'],
    completionReward: 'Agent Creator Badge',
    steps: [
      {
        id: 'agent-config',
        title: 'Agent Configuration',
        description: 'Create a character configuration file for your agent',
        code: `{
  "id": "my-first-agent",
  "name": "Alex Assistant",
  "type": "autonomous",
  "personality": {
    "traits": ["helpful", "curious", "friendly"],
    "background": "A helpful AI assistant eager to learn",
    "goals": ["Help users", "Learn continuously"]
  },
  "memory": {
    "provider": "sqlite",
    "maxRecords": 1000
  },
  "emotion": {
    "type": "composite",
    "sensitivity": 0.7
  }
}`,
        validation: (input) => {
          try {
            const config = JSON.parse(input);
            return config.id && config.name && config.personality;
          } catch {
            return false;
          }
        },
        hints: [
          'Make sure your JSON is valid',
          'Include required fields: id, name, and personality',
          "Choose personality traits that reflect your agent's purpose",
        ],
      },
      {
        id: 'create-agent',
        title: 'Initialize the Agent',
        description: 'Use the SYMindX runtime to create your agent',
        code: `import { SYMindXRuntime } from '@symindx/mind-agents';

const runtime = new SYMindXRuntime();
await runtime.initialize();

const agentConfig = {
  // Your configuration from previous step
};

const agent = await runtime.createAgent(agentConfig);
console.log('Agent created:', agent.id);`,
        validation: (input) =>
          input.includes('createAgent') && input.includes('runtime'),
        hints: [
          'Import SYMindXRuntime from the main package',
          'Initialize the runtime before creating agents',
          'Use the createAgent method with your configuration',
        ],
      },
      {
        id: 'start-agent',
        title: 'Start Your Agent',
        description: 'Activate your agent and send it a message',
        code: `// Start the agent
await runtime.startAgent('my-first-agent');

// Send a greeting message
const response = await runtime.sendMessage('my-first-agent', 'Hello! Nice to meet you.');
console.log('Agent response:', response);`,
        validation: (input) =>
          input.includes('startAgent') && input.includes('sendMessage'),
        hints: [
          "Use startAgent with your agent's ID",
          'Send a message using sendMessage method',
          'The agent should respond based on its personality',
        ],
      },
    ],
  };
}

function createEmotionSystemTutorial(): Tutorial {
  return {
    id: 'emotion-system',
    title: 'Understanding Emotion Systems',
    description:
      'Learn how emotions work in SYMindX and how they affect agent behavior',
    difficulty: 'intermediate',
    estimatedTime: 25,
    prerequisites: ['first-agent'],
    completionReward: 'Emotion Expert Badge',
    steps: [
      {
        id: 'emotion-basics',
        title: 'Emotion Fundamentals',
        description:
          'Understand how emotions are triggered and managed in SYMindX',
        aiExplanation:
          'SYMindX uses a composite emotion system where multiple emotions can be active simultaneously, each with their own intensity and decay rates.',
        validation: () => true,
      },
      {
        id: 'configure-emotions',
        title: 'Configure Emotion Settings',
        description:
          'Customize emotion sensitivity and behavior for your agent',
        code: `const emotionConfig = {
  type: 'composite',
  sensitivity: 0.8,
  decayRate: 0.1,
  transitionSpeed: 0.5,
  enabledEmotions: [
    'happy', 'sad', 'curious', 'confident', 'empathetic'
  ]
};

// Update agent emotion configuration
await runtime.updateAgentConfig('my-first-agent', {
  emotion: emotionConfig
});`,
        validation: (input) =>
          input.includes('sensitivity') && input.includes('enabledEmotions'),
        hints: [
          'Higher sensitivity means emotions trigger more easily',
          'DecayRate controls how quickly emotions fade',
          "Choose emotions that fit your agent's personality",
        ],
      },
      {
        id: 'trigger-emotions',
        title: 'Triggering Emotions',
        description: 'Learn how different messages trigger different emotions',
        code: `// Send different types of messages to trigger emotions
await runtime.sendMessage('my-first-agent', 'Great job! You did amazing!'); // Should trigger happy/proud
await runtime.sendMessage('my-first-agent', 'I\'m having trouble with this...'); // Should trigger empathetic
await runtime.sendMessage('my-first-agent', 'How does quantum computing work?'); // Should trigger curious

// Check current emotion state
const agentState = await runtime.getAgentState('my-first-agent');
console.log('Current emotions:', agentState.emotion);`,
        validation: (input) =>
          input.includes('getAgentState') && input.includes('emotion'),
        hints: [
          'Different message types trigger different emotions',
          'Use getAgentState to check current emotional state',
          'Praise triggers positive emotions, questions trigger curiosity',
        ],
      },
    ],
  };
}

function createMemorySystemTutorial(): Tutorial {
  return {
    id: 'memory-system',
    title: 'Working with Agent Memory',
    description:
      'Learn how agents store and retrieve memories for context-aware conversations',
    difficulty: 'intermediate',
    estimatedTime: 30,
    prerequisites: ['first-agent'],
    completionReward: 'Memory Master Badge',
    steps: [
      {
        id: 'memory-providers',
        title: 'Choose Memory Provider',
        description: 'Configure different memory backends for your agent',
        code: `// Memory provider options
const memoryConfigs = {
  sqlite: {
    provider: 'sqlite',
    path: './agent-memories.db',
    maxRecords: 10000
  },
  postgres: {
    provider: 'postgres',
    connectionString: process.env.POSTGRES_URL,
    maxRecords: 50000
  },
  supabase: {
    provider: 'supabase',
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    maxRecords: 100000
  }
};

// Choose sqlite for this tutorial
const memoryConfig = memoryConfigs.sqlite;`,
        validation: (input) =>
          input.includes('provider') && input.includes('sqlite'),
        hints: [
          'SQLite is good for local development',
          'PostgreSQL/Supabase for production',
          'Configure maxRecords to control memory usage',
        ],
      },
      {
        id: 'memory-storage',
        title: 'Store Memories',
        description:
          'Learn how agents automatically store conversation context',
        code: `// Agents automatically store memories, but you can also store custom ones
const memoryProvider = runtime.getAgentMemoryProvider('my-first-agent');

await memoryProvider.storeMemory({
  content: 'User prefers casual conversation style',
  importance: 0.8,
  tags: ['preference', 'communication'],
  timestamp: new Date()
});

console.log('Custom memory stored!');`,
        validation: (input) =>
          input.includes('storeMemory') && input.includes('importance'),
        hints: [
          'Memories have importance scores (0-1)',
          'Use tags to categorize memories',
          'Higher importance memories persist longer',
        ],
      },
      {
        id: 'memory-retrieval',
        title: 'Retrieve Relevant Memories',
        description: 'Query memories to provide context for responses',
        code: `// Retrieve memories related to current conversation
const relevantMemories = await memoryProvider.searchMemories({
  query: 'conversation preferences',
  limit: 5,
  minImportance: 0.5
});

console.log('Found memories:', relevantMemories.length);
relevantMemories.forEach(memory => {
  console.log('-', memory.content);
});`,
        validation: (input) =>
          input.includes('searchMemories') && input.includes('query'),
        hints: [
          'Use searchMemories to find relevant context',
          'Set minImportance to filter low-quality memories',
          'Limit results to avoid overwhelming the agent',
        ],
      },
    ],
  };
}

function createExtensionTutorial(): Tutorial {
  return {
    id: 'extensions',
    title: 'Building Agent Extensions',
    description:
      'Create custom extensions to add new capabilities to your agents',
    difficulty: 'advanced',
    estimatedTime: 35,
    prerequisites: ['first-agent', 'memory-system'],
    completionReward: 'Extension Developer Badge',
    steps: [
      {
        id: 'extension-structure',
        title: 'Extension Architecture',
        description:
          'Understand how extensions integrate with the agent system',
        aiExplanation:
          'Extensions in SYMindX follow a plugin architecture where they can hook into agent lifecycle events and provide new actions.',
        validation: () => true,
      },
      {
        id: 'create-extension',
        title: 'Create a Weather Extension',
        description: 'Build a simple weather lookup extension',
        code: `import { Extension, ExtensionAction } from '@symindx/mind-agents';

class WeatherExtension implements Extension {
  name = 'weather';
  
  actions: Record<string, ExtensionAction> = {
    getWeather: {
      description: 'Get current weather for a location',
      parameters: {
        location: { type: 'string', required: true }
      },
      handler: async (params) => {
        // Simulate weather API call
        return \`The weather in \${params.location} is sunny, 72°F\`;
      }
    }
  };

  async init(agent: any): Promise<void> {
    console.log(\`Weather extension loaded for \${agent.id}\`);
  }
}

export default WeatherExtension;`,
        validation: (input) =>
          input.includes('Extension') && input.includes('actions'),
        hints: [
          'Extensions implement the Extension interface',
          'Actions define what your extension can do',
          'Use the init method for setup tasks',
        ],
      },
      {
        id: 'register-extension',
        title: 'Register Extension with Agent',
        description: 'Add your extension to an agent configuration',
        code: `// Register the extension
runtime.registerExtension('weather', WeatherExtension);

// Add to agent configuration
await runtime.updateAgentConfig('my-first-agent', {
  extensions: ['weather']
});

// Test the extension
const weatherResponse = await runtime.sendMessage(
  'my-first-agent', 
  'What\'s the weather like in San Francisco?'
);
console.log(weatherResponse);`,
        validation: (input) =>
          input.includes('registerExtension') && input.includes('extensions'),
        hints: [
          'Register extensions with the runtime first',
          'Add extension names to agent configuration',
          'Agents can automatically use registered extensions',
        ],
      },
    ],
  };
}

function createMultiAgentTutorial(): Tutorial {
  return {
    id: 'multi-agent',
    title: 'Multi-Agent Coordination',
    description:
      'Learn how to create and coordinate multiple agents working together',
    difficulty: 'advanced',
    estimatedTime: 40,
    prerequisites: ['extensions'],
    completionReward: 'Multi-Agent Orchestrator Badge',
    steps: [
      {
        id: 'multi-agent-concepts',
        title: 'Multi-Agent Patterns',
        description: 'Understand different patterns for agent coordination',
        aiExplanation:
          'SYMindX supports various multi-agent patterns: leader-follower, peer-to-peer, and hierarchical coordination.',
        validation: () => true,
      },
      {
        id: 'create-agent-team',
        title: 'Create Specialized Agents',
        description: 'Create a team of agents with different specializations',
        code: `// Create specialized agents
const researcherConfig = {
  id: 'researcher',
  name: 'Research Agent',
  personality: { traits: ['analytical', 'curious', 'thorough'] },
  cognition: { type: 'htn_planner' }
};

const writerConfig = {
  id: 'writer', 
  name: 'Writing Agent',
  personality: { traits: ['creative', 'articulate', 'helpful'] },
  cognition: { type: 'reactive' }
};

await runtime.createAgent(researcherConfig);
await runtime.createAgent(writerConfig);
await runtime.startAgent('researcher');
await runtime.startAgent('writer');`,
        validation: (input) =>
          input.includes('researcher') && input.includes('writer'),
        hints: [
          'Give each agent specialized traits and capabilities',
          'Use different cognition types for different tasks',
          'Start all agents before coordination',
        ],
      },
      {
        id: 'agent-coordination',
        title: 'Coordinate Agent Interaction',
        description: 'Set up communication between agents',
        code: `// Create coordination manager
const coordinator = runtime.getMultiAgentManager();

// Set up research-to-writing workflow
await coordinator.createWorkflow('research-workflow', {
  steps: [
    {
      agent: 'researcher',
      action: 'research',
      input: 'topic'
    },
    {
      agent: 'writer',
      action: 'write',
      input: 'research_results'
    }
  ]
});

// Execute the workflow
const result = await coordinator.executeWorkflow('research-workflow', {
  topic: 'Benefits of AI in education'
});

console.log('Collaborative result:', result);`,
        validation: (input) =>
          input.includes('MultiAgentManager') && input.includes('workflow'),
        hints: [
          'Use MultiAgentManager for coordination',
          'Define workflows with sequential steps',
          'Pass data between agents through workflow steps',
        ],
      },
    ],
  };
}

function createAdvancedPatternsTutorial(): Tutorial {
  return {
    id: 'advanced-patterns',
    title: 'Advanced Development Patterns',
    description:
      'Master advanced techniques for building sophisticated AI agents',
    difficulty: 'advanced',
    estimatedTime: 45,
    prerequisites: ['multi-agent'],
    completionReward: 'SYMindX Expert Badge',
    steps: [
      {
        id: 'context-integration',
        title: 'Context-Aware Agents',
        description:
          'Implement advanced context integration for smarter agents',
        code: `// Enable context integration
const contextConfig = {
  enableEnrichment: true,
  enrichers: ['memory', 'emotional', 'social', 'temporal'],
  caching: {
    enabled: true,
    strategy: 'predictive'
  }
};

await runtime.updateAgentConfig('my-first-agent', {
  context: contextConfig
});`,
        validation: (input) =>
          input.includes('enrichers') && input.includes('contextConfig'),
      },
      {
        id: 'performance-optimization',
        title: 'Performance Optimization',
        description: 'Optimize agent performance for production use',
        code: `// Configure performance settings
const perfConfig = {
  memoryManagement: {
    gcInterval: 60000,
    maxMemoryUsage: '500MB'
  },
  responseOptimization: {
    enableCaching: true,
    maxResponseTime: 2000
  },
  concurrency: {
    maxConcurrentRequests: 10
  }
};

await runtime.configure(perfConfig);`,
        validation: (input) =>
          input.includes('performance') || input.includes('optimization'),
      },
    ],
  };
}

function createDebuggingTutorial(): Tutorial {
  return {
    id: 'debugging-agents',
    title: 'Debugging AI Agents',
    description:
      'Learn effective techniques for debugging and troubleshooting agents',
    difficulty: 'intermediate',
    estimatedTime: 25,
    prerequisites: ['first-agent'],
    completionReward: 'Debug Master Badge',
    steps: [
      {
        id: 'debug-tools',
        title: 'Debug Tools Overview',
        description: 'Explore built-in debugging tools and techniques',
        aiExplanation:
          'SYMindX provides comprehensive debugging tools including state inspection, conversation replay, and performance profiling.',
        validation: () => true,
      },
      {
        id: 'inspect-state',
        title: 'Agent State Inspection',
        description: 'Learn to inspect agent internal state for debugging',
        code: `// Get detailed agent state
const debugState = await runtime.getAgentDebugState('my-first-agent');

console.log('Agent Status:', debugState.status);
console.log('Current Emotion:', debugState.emotion.current);
console.log('Memory Usage:', debugState.memory.stats.memoryUsage);
console.log('Recent Actions:', debugState.cognition.recentActions);
console.log('Performance Metrics:', debugState.metrics);`,
        validation: (input) =>
          input.includes('getAgentDebugState') && input.includes('debugState'),
        hints: [
          'Use getAgentDebugState for comprehensive debugging info',
          'Check emotion state, memory usage, and recent actions',
          'Monitor performance metrics for optimization',
        ],
      },
    ],
  };
}

function createDeploymentTutorial(): Tutorial {
  return {
    id: 'deployment',
    title: 'Deploying SYMindX Agents',
    description: 'Learn how to deploy your agents to production environments',
    difficulty: 'advanced',
    estimatedTime: 30,
    prerequisites: ['advanced-patterns'],
    completionReward: 'Deployment Expert Badge',
    steps: [
      {
        id: 'production-config',
        title: 'Production Configuration',
        description: 'Configure agents for production deployment',
        code: `// Production configuration
const prodConfig = {
  environment: 'production',
  logging: {
    level: 'info',
    structured: true
  },
  security: {
    enableAuth: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  },
  monitoring: {
    enableMetrics: true,
    healthCheck: true
  }
};

await runtime.configure(prodConfig);`,
        validation: (input) =>
          input.includes('production') && input.includes('security'),
        hints: [
          'Enable structured logging for production',
          'Configure security and rate limiting',
          'Set up monitoring and health checks',
        ],
      },
    ],
  };
}
