/**
 * Code Generator
 * Generates SYMindX code from natural language descriptions
 */

import { EventEmitter } from 'events';

export class CodeGenerator extends EventEmitter {
  private templates: Map<string, CodeTemplate>;
  private initialized = false;

  constructor() {
    super();
    this.templates = new Map();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('✨ Initializing Code Generator...');

    this.loadCodeTemplates();
    this.initialized = true;
  }

  async generate(prompt: string, context?: any): Promise<string> {
    // Analyze the prompt to determine intent
    const intent = this.analyzeIntent(prompt);

    // Find appropriate template or generate from scratch
    const template = this.findBestTemplate(intent);

    if (template) {
      const code = this.generateFromTemplate(template, intent, context);
      this.emit('code-generated', { prompt, code, template: template.id });
      return code;
    }

    // Generate code from scratch using AI-like logic
    const generatedCode = this.generateFromScratch(intent, context);
    this.emit('code-generated', {
      prompt,
      code: generatedCode,
      template: 'custom',
    });

    return generatedCode;
  }

  private loadCodeTemplates(): void {
    // Basic agent creation template
    this.templates.set('create-agent', {
      id: 'create-agent',
      name: 'Create Agent',
      description: 'Creates a new SYMindX agent with configuration',
      keywords: ['create', 'agent', 'new agent', 'make agent'],
      parameters: ['agentId', 'agentName', 'personality', 'traits'],
      template: `import { SYMindXRuntime } from '@symindx/mind-agents';

const runtime = new SYMindXRuntime();
await runtime.initialize();

const {{agentId}} = await runtime.createAgent({
  id: "{{agentId}}",
  name: "{{agentName}}",
  personality: {
    traits: {{traits}},
    background: "{{background}}",
    goals: {{goals}}
  },
  memory: {
    provider: "{{memoryProvider}}",
    maxRecords: {{maxRecords}}
  },
  emotion: {
    type: "composite",
    sensitivity: {{sensitivity}}
  }
});

await runtime.startAgent("{{agentId}}");
console.log("Agent {{agentName}} created and started!");`,
      defaults: {
        agentId: 'my-agent',
        agentName: 'My Agent',
        traits: '["helpful", "curious"]',
        background: 'A helpful AI assistant',
        goals: '["Help users", "Learn continuously"]',
        memoryProvider: 'sqlite',
        maxRecords: '1000',
        sensitivity: '0.7',
      },
    });

    // Extension creation template
    this.templates.set('create-extension', {
      id: 'create-extension',
      name: 'Create Extension',
      description: 'Creates a new SYMindX extension',
      keywords: ['extension', 'plugin', 'create extension', 'new extension'],
      parameters: ['extensionName', 'extensionClass', 'actions'],
      template: `import { Extension, ExtensionAction, Agent } from '@symindx/mind-agents';

export class {{extensionClass}} implements Extension {
  name = "{{extensionName}}";
  
  actions: Record<string, ExtensionAction> = {
    {{actionName}}: {
      description: "{{actionDescription}}",
      parameters: {
        {{actionParams}}
      },
      handler: async (params) => {
        {{actionImplementation}}
      }
    }
  };

  async init(agent: Agent): Promise<void> {
    console.log(\`{{extensionClass}} loaded for agent \${agent.id}\`);
    {{initImplementation}}
  }

  async tick(agent: Agent): Promise<void> {
    {{tickImplementation}}
  }
}

export default {{extensionClass}};`,
      defaults: {
        extensionName: 'my-extension',
        extensionClass: 'MyExtension',
        actionName: 'myAction',
        actionDescription: 'Performs a custom action',
        actionParams: 'input: { type: "string", required: true }',
        actionImplementation: 'return `Processed: ${params.input}`;',
        initImplementation: '// Extension initialization code',
        tickImplementation: '// Extension tick logic (if needed)',
      },
    });

    // Memory setup template
    this.templates.set('setup-memory', {
      id: 'setup-memory',
      name: 'Setup Memory',
      description: 'Configures memory provider for agents',
      keywords: ['memory', 'database', 'storage', 'setup memory'],
      parameters: ['provider', 'configuration'],
      template: `// Memory provider configuration
const memoryConfig = {
  {{memoryConfig}}
};

// Update agent with memory configuration
await runtime.updateAgentConfig("{{agentId}}", {
  memory: memoryConfig
});

// Access memory provider directly
const memoryProvider = runtime.getAgentMemoryProvider("{{agentId}}");

// Store a custom memory
await memoryProvider.storeMemory({
  content: "{{memoryContent}}",
  importance: {{importance}},
  tags: {{tags}},
  timestamp: new Date()
});

// Search memories
const relevantMemories = await memoryProvider.searchMemories({
  query: "{{searchQuery}}",
  limit: {{searchLimit}},
  minImportance: {{minImportance}}
});

console.log("Found memories:", relevantMemories.length);`,
      defaults: {
        agentId: 'my-agent',
        memoryConfig:
          'provider: "sqlite",\n  path: "./data/memories.db",\n  maxRecords: 10000',
        memoryContent: 'Important information to remember',
        importance: '0.8',
        tags: '["preference", "user-info"]',
        searchQuery: 'user preferences',
        searchLimit: '5',
        minImportance: '0.5',
      },
    });

    // Chat interface template
    this.templates.set('chat-interface', {
      id: 'chat-interface',
      name: 'Chat Interface',
      description: 'Creates a simple chat interface for agents',
      keywords: ['chat', 'interface', 'conversation', 'talk to agent'],
      parameters: ['agentId'],
      template: `import { SYMindXRuntime } from '@symindx/mind-agents';
import * as readline from 'readline';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Start the agent
await runtime.startAgent("{{agentId}}");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Chat started! Type 'exit' to quit.\\n");

const chat = async () => {
  rl.question("You: ", async (message) => {
    if (message.toLowerCase() === 'exit') {
      console.log("Goodbye!");
      rl.close();
      return;
    }

    try {
      const response = await runtime.sendMessage("{{agentId}}", message);
      console.log(\`Agent: \${response.response || response.message}\`);
      
      // Show emotion if available
      const agentState = await runtime.getAgentState("{{agentId}}");
      if (agentState.emotion) {
        console.log(\`[Emotion: \${agentState.emotion.current}]\`);
      }
    } catch (error) {
      console.error("Error:", error.message);
    }

    console.log(); // Empty line for readability
    chat(); // Continue conversation
  });
};

chat();`,
      defaults: {
        agentId: 'my-agent',
      },
    });

    // Multi-agent setup template
    this.templates.set('multi-agent', {
      id: 'multi-agent',
      name: 'Multi-Agent Setup',
      description: 'Sets up multiple agents with coordination',
      keywords: [
        'multi-agent',
        'multiple agents',
        'agent team',
        'coordination',
      ],
      parameters: ['agents', 'workflow'],
      template: `import { SYMindXRuntime } from '@symindx/mind-agents';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Create multiple specialized agents
const agents = [
  {
    id: "{{agent1Id}}",
    name: "{{agent1Name}}",
    personality: { traits: {{agent1Traits}} },
    role: "{{agent1Role}}"
  },
  {
    id: "{{agent2Id}}",
    name: "{{agent2Name}}",
    personality: { traits: {{agent2Traits}} },
    role: "{{agent2Role}}"
  }
];

// Create and start all agents
for (const agentConfig of agents) {
  await runtime.createAgent(agentConfig);
  await runtime.startAgent(agentConfig.id);
  console.log(\`Agent \${agentConfig.name} (\${agentConfig.role}) started\`);
}

// Set up multi-agent coordination
const coordinator = runtime.getMultiAgentManager();

await coordinator.createWorkflow("{{workflowName}}", {
  steps: [
    {
      agent: "{{agent1Id}}",
      action: "{{action1}}",
      input: "{{input1}}"
    },
    {
      agent: "{{agent2Id}}",
      action: "{{action2}}",
      input: "{{input2}}"
    }
  ]
});

// Execute the workflow
const result = await coordinator.executeWorkflow("{{workflowName}}", {
  {{workflowParams}}
});

console.log("Workflow result:", result);`,
      defaults: {
        agent1Id: 'researcher',
        agent1Name: 'Research Agent',
        agent1Traits: '["analytical", "thorough"]',
        agent1Role: 'researcher',
        agent2Id: 'writer',
        agent2Name: 'Writing Agent',
        agent2Traits: '["creative", "articulate"]',
        agent2Role: 'writer',
        workflowName: 'research-and-write',
        action1: 'research',
        input1: 'topic',
        action2: 'write',
        input2: 'research_results',
        workflowParams: 'topic: "AI in education"',
      },
    });

    // Testing template
    this.templates.set('test-setup', {
      id: 'test-setup',
      name: 'Test Setup',
      description: 'Creates tests for SYMindX agents',
      keywords: ['test', 'testing', 'unit test', 'test agent'],
      parameters: ['testName', 'agentId'],
      template: `import { SYMindXRuntime } from '@symindx/mind-agents';
import { jest } from '@jest/globals';

describe('{{testName}}', () => {
  let runtime: SYMindXRuntime;
  let agentId: string;

  beforeAll(async () => {
    runtime = new SYMindXRuntime();
    await runtime.initialize();
    
    // Create test agent
    const agent = await runtime.createAgent({
      id: "{{agentId}}",
      name: "Test Agent",
      personality: {
        traits: ["helpful", "responsive"]
      },
      memory: {
        provider: "sqlite",
        path: ":memory:" // In-memory database for testing
      }
    });
    
    agentId = agent.id;
    await runtime.startAgent(agentId);
  });

  afterAll(async () => {
    if (runtime) {
      await runtime.shutdown();
    }
  });

  test('agent responds to messages', async () => {
    const response = await runtime.sendMessage(agentId, "Hello!");
    
    expect(response).toBeDefined();
    expect(response.response || response.message).toBeTruthy();
  });

  test('agent maintains emotional state', async () => {
    await runtime.sendMessage(agentId, "Great job!");
    const agentState = await runtime.getAgentState(agentId);
    
    expect(agentState.emotion).toBeDefined();
    expect(agentState.emotion.current).toBeTruthy();
  });

  test('agent stores memories', async () => {
    await runtime.sendMessage(agentId, "Remember this important fact");
    
    const memoryProvider = runtime.getAgentMemoryProvider(agentId);
    const memories = await memoryProvider.searchMemories({
      query: "important fact",
      limit: 1
    });
    
    expect(memories.length).toBeGreaterThan(0);
  });

  test('{{customTest}}', async () => {
    {{customTestImplementation}}
  });
});`,
      defaults: {
        testName: 'Agent Tests',
        agentId: 'test-agent',
        customTest: 'agent performs custom action',
        customTestImplementation:
          '// Add your custom test logic here\n    expect(true).toBe(true);',
      },
    });
  }

  private analyzeIntent(prompt: string): CodeIntent {
    const lowercasePrompt = prompt.toLowerCase();

    const intent: CodeIntent = {
      action: 'unknown',
      entities: [],
      parameters: {},
      confidence: 0,
    };

    // Analyze action
    if (
      lowercasePrompt.includes('create') ||
      lowercasePrompt.includes('make') ||
      lowercasePrompt.includes('build')
    ) {
      intent.action = 'create';
      intent.confidence += 0.3;
    } else if (
      lowercasePrompt.includes('setup') ||
      lowercasePrompt.includes('configure') ||
      lowercasePrompt.includes('initialize')
    ) {
      intent.action = 'setup';
      intent.confidence += 0.3;
    } else if (
      lowercasePrompt.includes('test') ||
      lowercasePrompt.includes('testing')
    ) {
      intent.action = 'test';
      intent.confidence += 0.3;
    }

    // Analyze entities
    if (lowercasePrompt.includes('agent')) {
      intent.entities.push('agent');
      intent.confidence += 0.2;
    }
    if (
      lowercasePrompt.includes('extension') ||
      lowercasePrompt.includes('plugin')
    ) {
      intent.entities.push('extension');
      intent.confidence += 0.2;
    }
    if (
      lowercasePrompt.includes('memory') ||
      lowercasePrompt.includes('database')
    ) {
      intent.entities.push('memory');
      intent.confidence += 0.2;
    }
    if (
      lowercasePrompt.includes('chat') ||
      lowercasePrompt.includes('conversation')
    ) {
      intent.entities.push('chat');
      intent.confidence += 0.2;
    }
    if (
      lowercasePrompt.includes('multi') ||
      lowercasePrompt.includes('multiple')
    ) {
      intent.entities.push('multi-agent');
      intent.confidence += 0.2;
    }

    // Extract parameters
    const nameMatch =
      prompt.match(/named?\s+["']([^"']+)["']/i) ||
      prompt.match(/called\s+["']([^"']+)["']/i);
    if (nameMatch) {
      intent.parameters.name = nameMatch[1];
      intent.confidence += 0.1;
    }

    const idMatch = prompt.match(/id\s+["']([^"']+)["']/i);
    if (idMatch) {
      intent.parameters.id = idMatch[1];
      intent.confidence += 0.1;
    }

    return intent;
  }

  private findBestTemplate(intent: CodeIntent): CodeTemplate | undefined {
    let bestTemplate: CodeTemplate | undefined;
    let bestScore = 0;

    for (const template of this.templates.values()) {
      let score = 0;

      // Check keyword matches
      for (const keyword of template.keywords) {
        const keywordParts = keyword.toLowerCase().split(' ');
        const intentString =
          `${intent.action} ${intent.entities.join(' ')}`.toLowerCase();

        if (keywordParts.every((part) => intentString.includes(part))) {
          score += 1;
        }
      }

      // Boost score based on entity matches
      if (intent.entities.includes('agent') && template.id.includes('agent')) {
        score += 0.5;
      }
      if (
        intent.entities.includes('extension') &&
        template.id.includes('extension')
      ) {
        score += 0.5;
      }
      if (
        intent.entities.includes('memory') &&
        template.id.includes('memory')
      ) {
        score += 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }

    return bestScore > 0.5 ? bestTemplate : undefined;
  }

  private generateFromTemplate(
    template: CodeTemplate,
    intent: CodeIntent,
    context?: any
  ): string {
    let code = template.template;
    const parameters = {
      ...template.defaults,
      ...intent.parameters,
      ...context,
    };

    // Replace template variables
    for (const [key, value] of Object.entries(parameters)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      code = code.replace(regex, String(value));
    }

    // Generate smart defaults for missing parameters
    code = this.generateSmartDefaults(code, intent);

    return code;
  }

  private generateFromScratch(intent: CodeIntent, context?: any): string {
    // Generate code from scratch based on intent
    let code = '// Generated SYMindX code\n\n';

    // Add imports
    code += 'import { SYMindXRuntime } from "@symindx/mind-agents";\n\n';

    // Add runtime initialization
    code += 'const runtime = new SYMindXRuntime();\n';
    code += 'await runtime.initialize();\n\n';

    // Generate based on intent
    if (intent.entities.includes('agent')) {
      const agentName = intent.parameters.name || 'MyAgent';
      const agentId =
        intent.parameters.id || agentName.toLowerCase().replace(/\s+/g, '-');

      code += `// Create ${agentName}\n`;
      code += `const agent = await runtime.createAgent({\n`;
      code += `  id: "${agentId}",\n`;
      code += `  name: "${agentName}",\n`;
      code += `  personality: {\n`;
      code += `    traits: ["helpful", "intelligent"]\n`;
      code += `  }\n`;
      code += `});\n\n`;

      code += `await runtime.startAgent("${agentId}");\n`;
      code += `console.log("${agentName} is ready!");\n`;
    }

    if (intent.entities.includes('extension')) {
      const extensionName = intent.parameters.name || 'MyExtension';
      const className = this.toPascalCase(extensionName);

      code += `\n// ${extensionName} Extension\n`;
      code += `class ${className} {\n`;
      code += `  name = "${extensionName.toLowerCase()}";\n`;
      code += `  \n`;
      code += `  actions = {\n`;
      code += `    exampleAction: {\n`;
      code += `      description: "Example action",\n`;
      code += `      handler: async (params) => {\n`;
      code += `        return "Action completed";\n`;
      code += `      }\n`;
      code += `    }\n`;
      code += `  };\n`;
      code += `}\n`;
    }

    return code;
  }

  private generateSmartDefaults(code: string, intent: CodeIntent): string {
    // Replace any remaining template variables with smart defaults

    // Agent names
    code = code.replace(/{{agentName}}/g, intent.parameters.name || 'My Agent');
    code = code.replace(/{{agentId}}/g, intent.parameters.id || 'my-agent');

    // Extension names
    if (intent.entities.includes('extension')) {
      const extensionName = intent.parameters.name || 'MyExtension';
      code = code.replace(/{{extensionName}}/g, extensionName.toLowerCase());
      code = code.replace(
        /{{extensionClass}}/g,
        this.toPascalCase(extensionName)
      );
    }

    // Common defaults
    code = code.replace(/{{traits}}/g, '["helpful", "intelligent"]');
    code = code.replace(/{{background}}/g, 'A helpful AI assistant');
    code = code.replace(/{{goals}}/g, '["Help users", "Learn continuously"]');
    code = code.replace(/{{memoryProvider}}/g, 'sqlite');
    code = code.replace(/{{maxRecords}}/g, '1000');
    code = code.replace(/{{sensitivity}}/g, '0.7');

    return code;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '');
  }

  // Public utility methods
  async generateAgentConfig(specifications: {
    name: string;
    id?: string;
    personality?: string[];
    capabilities?: string[];
    memoryType?: string;
  }): Promise<string> {
    const config = {
      id:
        specifications.id ||
        specifications.name.toLowerCase().replace(/\s+/g, '-'),
      name: specifications.name,
      personality: {
        traits: specifications.personality || ['helpful', 'intelligent'],
      },
      memory: {
        provider: specifications.memoryType || 'sqlite',
        maxRecords: 1000,
      },
      emotion: {
        type: 'composite',
        sensitivity: 0.7,
      },
    };

    return `const agentConfig = ${JSON.stringify(config, null, 2)};`;
  }

  async generateTestSuite(
    agentId: string,
    testCases: string[]
  ): Promise<string> {
    let testCode = `describe('Agent ${agentId} Tests', () => {\n`;
    testCode += `  let runtime;\n`;
    testCode += `  let agent;\n\n`;

    testCode += `  beforeAll(async () => {\n`;
    testCode += `    runtime = new SYMindXRuntime();\n`;
    testCode += `    await runtime.initialize();\n`;
    testCode += `    agent = await runtime.startAgent('${agentId}');\n`;
    testCode += `  });\n\n`;

    for (const testCase of testCases) {
      const testName = testCase.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      testCode += `  test('${testName}', async () => {\n`;
      testCode += `    // Test implementation for: ${testCase}\n`;
      testCode += `    const response = await runtime.sendMessage('${agentId}', '${testCase}');\n`;
      testCode += `    expect(response).toBeDefined();\n`;
      testCode += `  });\n\n`;
    }

    testCode += `});`;

    return testCode;
  }

  async explainGeneratedCode(code: string): Promise<string> {
    const lines = code.split('\n');
    let explanation = 'This generated code does the following:\n\n';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.includes('import')) {
        explanation += '• Imports necessary SYMindX modules\n';
      } else if (trimmed.includes('new SYMindXRuntime')) {
        explanation += '• Creates a new SYMindX runtime instance\n';
      } else if (trimmed.includes('initialize()')) {
        explanation += '• Initializes the runtime system\n';
      } else if (trimmed.includes('createAgent')) {
        explanation += '• Creates a new agent with specified configuration\n';
      } else if (trimmed.includes('startAgent')) {
        explanation += '• Starts the agent to make it active\n';
      } else if (trimmed.includes('sendMessage')) {
        explanation += '• Sends a message to the agent and gets a response\n';
      } else if (trimmed.includes('class') && trimmed.includes('Extension')) {
        explanation += '• Defines a new extension class\n';
      }
    }

    return explanation;
  }
}

// Supporting interfaces
interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  parameters: string[];
  template: string;
  defaults: Record<string, string>;
}

interface CodeIntent {
  action: string;
  entities: string[];
  parameters: Record<string, string>;
  confidence: number;
}
