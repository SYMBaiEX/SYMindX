/**
 * Code Completion Engine
 * Intelligent code completion for SYMindX APIs and patterns
 */

import { EventEmitter } from 'events';
import {
  CodeCompletionRequest,
  CodeCompletionSuggestion,
} from '../types/index.js';

export class CodeCompletion extends EventEmitter {
  private symindxPatterns: Map<string, CompletionPattern>;
  private contextCache = new Map<string, any>();
  private initialized = false;

  constructor() {
    super();
    this.symindxPatterns = new Map();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔧 Initializing Code Completion...');

    // Load SYMindX-specific completion patterns
    this.loadSYMindXPatterns();

    this.initialized = true;
  }

  async getCompletions(
    request: CodeCompletionRequest
  ): Promise<CodeCompletionSuggestion[]> {
    const completions: CodeCompletionSuggestion[] = [];

    // Analyze context around cursor
    const context = this.analyzeContext(request);

    // Get different types of completions
    const apiCompletions = await this.getAPICompletions(context);
    const patternCompletions = await this.getPatternCompletions(context);
    const snippetCompletions = await this.getSnippetCompletions(context);
    const typeCompletions = await this.getTypeCompletions(context);

    completions.push(
      ...apiCompletions,
      ...patternCompletions,
      ...snippetCompletions,
      ...typeCompletions
    );

    // Score and sort completions
    const scoredCompletions = this.scoreCompletions(completions, context);

    this.emit('completions-generated', {
      request,
      completions: scoredCompletions,
    });

    return scoredCompletions.slice(0, 10); // Return top 10
  }

  private loadSYMindXPatterns(): void {
    // SYMindX Runtime patterns
    this.symindxPatterns.set('runtime-creation', {
      trigger: /new SYMindXRuntime|SYMindXRuntime\(\)/,
      completions: [
        {
          text: 'const runtime = new SYMindXRuntime();\nawait runtime.initialize();',
          displayText: 'Initialize SYMindX Runtime',
          insertText:
            'const runtime = new SYMindXRuntime();\nawait runtime.initialize();',
          confidence: 0.9,
          category: 'api',
          description: 'Create and initialize a new SYMindX runtime instance',
          documentation:
            'The SYMindXRuntime is the main orchestrator for managing agents',
        },
      ],
    });

    // Agent creation patterns
    this.symindxPatterns.set('agent-creation', {
      trigger: /createAgent|\.createAgent\(/,
      completions: [
        {
          text: 'await runtime.createAgent({\n  id: "agent-id",\n  name: "Agent Name",\n  personality: {\n    traits: ["helpful", "curious"]\n  }\n});',
          displayText: 'Create Agent Configuration',
          insertText:
            'await runtime.createAgent({\n  id: "${1:agent-id}",\n  name: "${2:Agent Name}",\n  personality: {\n    traits: [${3:"helpful", "curious"}]\n  }\n});',
          confidence: 0.95,
          category: 'api',
          description: 'Create a new agent with basic configuration',
          documentation:
            'Agents require an id, name, and personality configuration',
        },
        {
          text: 'await runtime.createAgent(agentConfig);',
          displayText: 'Create Agent from Config',
          insertText: 'await runtime.createAgent(${1:agentConfig});',
          confidence: 0.8,
          category: 'api',
          description: 'Create agent using existing configuration object',
        },
      ],
    });

    // Memory configuration patterns
    this.symindxPatterns.set('memory-config', {
      trigger: /memory.*provider|memoryProvider/,
      completions: [
        {
          text: 'memory: {\n  provider: "sqlite",\n  maxRecords: 1000\n}',
          displayText: 'SQLite Memory Configuration',
          insertText:
            'memory: {\n  provider: "sqlite",\n  maxRecords: ${1:1000}\n}',
          confidence: 0.9,
          category: 'pattern',
          description: 'Configure SQLite memory provider',
        },
        {
          text: 'memory: {\n  provider: "postgres",\n  connectionString: process.env.POSTGRES_URL,\n  maxRecords: 10000\n}',
          displayText: 'PostgreSQL Memory Configuration',
          insertText:
            'memory: {\n  provider: "postgres",\n  connectionString: process.env.POSTGRES_URL,\n  maxRecords: ${1:10000}\n}',
          confidence: 0.85,
          category: 'pattern',
          description: 'Configure PostgreSQL memory provider',
        },
      ],
    });

    // Emotion configuration patterns
    this.symindxPatterns.set('emotion-config', {
      trigger: /emotion.*config|emotionConfig/,
      completions: [
        {
          text: 'emotion: {\n  type: "composite",\n  sensitivity: 0.7,\n  decayRate: 0.1\n}',
          displayText: 'Composite Emotion Configuration',
          insertText:
            'emotion: {\n  type: "composite",\n  sensitivity: ${1:0.7},\n  decayRate: ${2:0.1}\n}',
          confidence: 0.9,
          category: 'pattern',
          description: 'Configure composite emotion system',
        },
      ],
    });

    // Extension patterns
    this.symindxPatterns.set('extension-creation', {
      trigger: /class.*Extension|implements Extension/,
      completions: [
        {
          text: 'class MyExtension implements Extension {\n  name = "my-extension";\n  \n  actions: Record<string, ExtensionAction> = {\n    myAction: {\n      description: "My custom action",\n      handler: async (params) => {\n        return "Action result";\n      }\n    }\n  };\n  \n  async init(agent: Agent): Promise<void> {\n    console.log(`Extension loaded for ${agent.id}`);\n  }\n}',
          displayText: 'Extension Class Template',
          insertText:
            'class ${1:MyExtension} implements Extension {\n  name = "${2:my-extension}";\n  \n  actions: Record<string, ExtensionAction> = {\n    ${3:myAction}: {\n      description: "${4:My custom action}",\n      handler: async (params) => {\n        ${5:return "Action result";}\n      }\n    }\n  };\n  \n  async init(agent: Agent): Promise<void> {\n    console.log(`Extension loaded for ${agent.id}`);\n  }\n}',
          confidence: 0.95,
          category: 'pattern',
          description: 'Complete extension class template',
        },
      ],
    });

    // Import patterns
    this.symindxPatterns.set('imports', {
      trigger: /import.*from.*symindx/,
      completions: [
        {
          text: 'import { SYMindXRuntime } from "@symindx/mind-agents";',
          displayText: 'Import SYMindXRuntime',
          insertText: 'import { SYMindXRuntime } from "@symindx/mind-agents";',
          confidence: 0.9,
          category: 'api',
          description: 'Import the main runtime class',
        },
        {
          text: 'import { Agent, Extension, ExtensionAction } from "@symindx/mind-agents";',
          displayText: 'Import Agent Types',
          insertText:
            'import { Agent, Extension, ExtensionAction } from "@symindx/mind-agents";',
          confidence: 0.85,
          category: 'api',
          description: 'Import agent and extension types',
        },
      ],
    });
  }

  private analyzeContext(request: CodeCompletionRequest): CompletionContext {
    const { code, cursor } = request;

    // Get the line at cursor position
    const lines = code.split('\n');
    const cursorLine = Math.floor(cursor / 100); // Simplified cursor calculation
    const currentLine = lines[cursorLine] || '';
    const beforeCursor = currentLine.substring(0, cursor % 100);

    // Analyze what's being typed
    const context: CompletionContext = {
      currentLine,
      beforeCursor,
      afterCursor: currentLine.substring(cursor % 100),
      indentLevel: this.getIndentLevel(currentLine),
      inFunction: this.isInFunction(code, cursor),
      inClass: this.isInClass(code, cursor),
      nearbyImports: this.findNearbyImports(lines),
      variables: this.extractVariables(code),
      expectedTypes: this.inferExpectedTypes(beforeCursor),
    };

    return context;
  }

  private async getAPICompletions(
    context: CompletionContext
  ): Promise<CodeCompletionSuggestion[]> {
    const completions: CodeCompletionSuggestion[] = [];

    // Check for SYMindX API patterns
    for (const [patternName, pattern] of this.symindxPatterns) {
      if (pattern.trigger.test(context.beforeCursor)) {
        completions.push(...pattern.completions);
      }
    }

    // Runtime method completions
    if (context.beforeCursor.includes('runtime.')) {
      completions.push(...this.getRuntimeMethodCompletions());
    }

    // Agent method completions
    if (context.beforeCursor.includes('agent.')) {
      completions.push(...this.getAgentMethodCompletions());
    }

    return completions;
  }

  private async getPatternCompletions(
    context: CompletionContext
  ): Promise<CodeCompletionSuggestion[]> {
    const completions: CodeCompletionSuggestion[] = [];

    // Configuration object patterns
    if (
      context.beforeCursor.includes('{') &&
      context.beforeCursor.includes('config')
    ) {
      completions.push(...this.getConfigurationPatterns());
    }

    // Async/await patterns
    if (
      context.beforeCursor.includes('await') ||
      context.beforeCursor.includes('async')
    ) {
      completions.push(...this.getAsyncPatterns());
    }

    return completions;
  }

  private async getSnippetCompletions(
    context: CompletionContext
  ): Promise<CodeCompletionSuggestion[]> {
    const completions: CodeCompletionSuggestion[] = [];

    // Common SYMindX snippets
    if (context.beforeCursor.length < 10) {
      // Trigger on short prefixes
      completions.push(
        {
          text: 'const agent = await runtime.createAgent({\n  id: "my-agent",\n  name: "My Agent",\n  personality: { traits: ["helpful"] }\n});',
          displayText: 'Quick Agent Creation',
          insertText:
            'const ${1:agent} = await runtime.createAgent({\n  id: "${2:my-agent}",\n  name: "${3:My Agent}",\n  personality: { traits: [${4:"helpful"}] }\n});',
          confidence: 0.7,
          category: 'completion',
          description: 'Quick agent creation snippet',
        },
        {
          text: 'await runtime.startAgent("agent-id");\nconst response = await runtime.sendMessage("agent-id", "Hello!");',
          displayText: 'Start and Message Agent',
          insertText:
            'await runtime.startAgent("${1:agent-id}");\nconst response = await runtime.sendMessage("${1:agent-id}", "${2:Hello!}");',
          confidence: 0.7,
          category: 'completion',
          description: 'Start agent and send message',
        }
      );
    }

    return completions;
  }

  private async getTypeCompletions(
    context: CompletionContext
  ): Promise<CodeCompletionSuggestion[]> {
    const completions: CodeCompletionSuggestion[] = [];

    // Type annotations
    if (context.beforeCursor.includes(': ')) {
      const expectedTypes = context.expectedTypes;

      if (expectedTypes.includes('Agent')) {
        completions.push({
          text: 'Agent',
          displayText: 'Agent',
          insertText: 'Agent',
          confidence: 0.8,
          category: 'api',
          description: 'SYMindX Agent type',
        });
      }

      if (expectedTypes.includes('Extension')) {
        completions.push({
          text: 'Extension',
          displayText: 'Extension',
          insertText: 'Extension',
          confidence: 0.8,
          category: 'api',
          description: 'SYMindX Extension interface',
        });
      }
    }

    return completions;
  }

  private scoreCompletions(
    completions: CodeCompletionSuggestion[],
    context: CompletionContext
  ): CodeCompletionSuggestion[] {
    return completions
      .map((completion) => {
        let score = completion.confidence;

        // Boost score based on context relevance
        if (
          context.beforeCursor.includes('runtime') &&
          completion.text.includes('runtime')
        ) {
          score += 0.1;
        }

        if (
          context.beforeCursor.includes('agent') &&
          completion.text.includes('agent')
        ) {
          score += 0.1;
        }

        if (
          context.beforeCursor.includes('await') &&
          completion.text.includes('await')
        ) {
          score += 0.05;
        }

        // Boost completions that match import context
        if (
          context.nearbyImports.some((imp) => completion.text.includes(imp))
        ) {
          score += 0.1;
        }

        return { ...completion, confidence: Math.min(1, score) };
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  private getRuntimeMethodCompletions(): CodeCompletionSuggestion[] {
    return [
      {
        text: 'initialize()',
        displayText: 'initialize()',
        insertText: 'initialize()',
        confidence: 0.9,
        category: 'api',
        description: 'Initialize the runtime',
      },
      {
        text: 'createAgent(config)',
        displayText: 'createAgent(config)',
        insertText: 'createAgent(${1:config})',
        confidence: 0.95,
        category: 'api',
        description: 'Create a new agent',
      },
      {
        text: 'startAgent(agentId)',
        displayText: 'startAgent(agentId)',
        insertText: 'startAgent("${1:agent-id}")',
        confidence: 0.9,
        category: 'api',
        description: 'Start an agent',
      },
      {
        text: 'sendMessage(agentId, message)',
        displayText: 'sendMessage(agentId, message)',
        insertText: 'sendMessage("${1:agent-id}", "${2:message}")',
        confidence: 0.9,
        category: 'api',
        description: 'Send message to agent',
      },
      {
        text: 'getAgents()',
        displayText: 'getAgents()',
        insertText: 'getAgents()',
        confidence: 0.8,
        category: 'api',
        description: 'Get all agents',
      },
    ];
  }

  private getAgentMethodCompletions(): CodeCompletionSuggestion[] {
    return [
      {
        text: 'start()',
        displayText: 'start()',
        insertText: 'start()',
        confidence: 0.9,
        category: 'api',
        description: 'Start the agent',
      },
      {
        text: 'stop()',
        displayText: 'stop()',
        insertText: 'stop()',
        confidence: 0.9,
        category: 'api',
        description: 'Stop the agent',
      },
      {
        text: 'sendMessage(message)',
        displayText: 'sendMessage(message)',
        insertText: 'sendMessage("${1:message}")',
        confidence: 0.9,
        category: 'api',
        description: 'Send message to agent',
      },
    ];
  }

  private getConfigurationPatterns(): CodeCompletionSuggestion[] {
    return [
      {
        text: 'id: "agent-id",\nname: "Agent Name",\npersonality: {\n  traits: ["helpful"]\n}',
        displayText: 'Basic Agent Config',
        insertText:
          'id: "${1:agent-id}",\nname: "${2:Agent Name}",\npersonality: {\n  traits: [${3:"helpful"}]\n}',
        confidence: 0.8,
        category: 'pattern',
        description: 'Basic agent configuration',
      },
    ];
  }

  private getAsyncPatterns(): CodeCompletionSuggestion[] {
    return [
      {
        text: 'try {\n  // async operation\n} catch (error) {\n  console.error("Error:", error);\n}',
        displayText: 'Try-Catch Block',
        insertText:
          'try {\n  ${1:// async operation}\n} catch (error) {\n  console.error("Error:", error);\n}',
        confidence: 0.7,
        category: 'pattern',
        description: 'Async error handling pattern',
      },
    ];
  }

  // Helper methods for context analysis
  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  private isInFunction(code: string, cursor: number): boolean {
    const beforeCursor = code.substring(0, cursor);
    const functionMatches = beforeCursor.match(/function|=>/g);
    const braceMatches = beforeCursor.match(/[{}]/g);

    if (!functionMatches) return false;

    let braceCount = 0;
    let inFunction = false;

    for (const match of braceMatches || []) {
      if (match === '{') {
        braceCount++;
        inFunction = true;
      } else {
        braceCount--;
        if (braceCount === 0) inFunction = false;
      }
    }

    return inFunction;
  }

  private isInClass(code: string, cursor: number): boolean {
    const beforeCursor = code.substring(0, cursor);
    return /class\s+\w+/.test(beforeCursor);
  }

  private findNearbyImports(lines: string[]): string[] {
    const imports: string[] = [];

    for (const line of lines.slice(0, 20)) {
      // Check first 20 lines
      const importMatch = line.match(/import\s+{([^}]+)}/);
      if (importMatch) {
        const namedImports = importMatch[1]
          .split(',')
          .map((imp) => imp.trim())
          .filter((imp) => imp.length > 0);
        imports.push(...namedImports);
      }
    }

    return imports;
  }

  private extractVariables(code: string): string[] {
    const variables: string[] = [];

    // Simple variable extraction
    const variableMatches = code.match(/(?:const|let|var)\s+(\w+)/g);
    if (variableMatches) {
      for (const match of variableMatches) {
        const varName = match.split(/\s+/)[1];
        if (varName) variables.push(varName);
      }
    }

    return variables;
  }

  private inferExpectedTypes(beforeCursor: string): string[] {
    const types: string[] = [];

    if (beforeCursor.includes(': ')) {
      // Look for type hints in context
      if (beforeCursor.includes('agent')) types.push('Agent');
      if (beforeCursor.includes('extension')) types.push('Extension');
      if (beforeCursor.includes('config')) types.push('AgentConfig');
    }

    return types;
  }
}

// Supporting interfaces
interface CompletionPattern {
  trigger: RegExp;
  completions: CodeCompletionSuggestion[];
}

interface CompletionContext {
  currentLine: string;
  beforeCursor: string;
  afterCursor: string;
  indentLevel: number;
  inFunction: boolean;
  inClass: boolean;
  nearbyImports: string[];
  variables: string[];
  expectedTypes: string[];
}
