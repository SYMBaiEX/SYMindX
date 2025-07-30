/**
 * Error Explainer
 * Provides intelligent explanations and fixes for common errors
 */

import { EventEmitter } from 'events';

export class ErrorExplainer extends EventEmitter {
  private errorPatterns: Map<string, ErrorPattern>;
  private initialized = false;

  constructor() {
    super();
    this.errorPatterns = new Map();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('❓ Initializing Error Explainer...');

    this.loadErrorPatterns();
    this.initialized = true;
  }

  async explainError(
    error: Error | string,
    code?: string
  ): Promise<{
    explanation: string;
    suggestions: string[];
    category: string;
    severity: 'low' | 'medium' | 'high';
    commonCauses: string[];
  }> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' ? error.stack : undefined;

    // Find matching error pattern
    const pattern = this.findMatchingPattern(errorMessage);

    if (pattern) {
      const explanation = this.generateExplanation(pattern, errorMessage, code);
      this.emit('error-explained', {
        error: errorMessage,
        explanation,
        pattern: pattern.id,
      });
      return explanation;
    }

    // Generate generic explanation
    const genericExplanation = this.generateGenericExplanation(
      errorMessage,
      errorStack,
      code
    );
    this.emit('error-explained', {
      error: errorMessage,
      explanation: genericExplanation,
      pattern: 'generic',
    });

    return genericExplanation;
  }

  private loadErrorPatterns(): void {
    // TypeScript/JavaScript common errors
    this.errorPatterns.set('cannot-find-module', {
      id: 'cannot-find-module',
      pattern: /Cannot find module ['"]([^'"]+)['"]/,
      category: 'Import/Module',
      severity: 'high',
      explanation:
        'This error occurs when Node.js or TypeScript cannot locate the specified module.',
      commonCauses: [
        'Module is not installed',
        'Incorrect module path or name',
        'Missing file extension in import',
        'Module is not in node_modules',
        'Case sensitivity issues',
      ],
      suggestions: [
        'Install the module with: npm install {module} or bun install {module}',
        'Check if the module name is spelled correctly',
        'Verify the import path is correct',
        'Check if the module supports your Node.js version',
        'Try clearing node_modules and reinstalling dependencies',
      ],
      fixes: [
        {
          description: 'Install missing module',
          command: 'npm install {module}',
        },
        {
          description: 'Fix import path',
          command: 'Update import statement with correct path',
        },
      ],
    });

    this.errorPatterns.set('is-not-defined', {
      id: 'is-not-defined',
      pattern: /(\w+) is not defined/,
      category: 'Variable/Reference',
      severity: 'high',
      explanation:
        "This error means you're trying to use a variable, function, or class that hasn't been declared or imported.",
      commonCauses: [
        'Variable not declared',
        'Missing import statement',
        'Typo in variable name',
        'Variable used before declaration',
        'Scope issues',
      ],
      suggestions: [
        'Import the missing identifier',
        'Declare the variable before using it',
        'Check for typos in the variable name',
        'Verify the variable is in the correct scope',
        'Add proper type annotations',
      ],
      fixes: [
        {
          description: 'Add import statement',
          command: 'import { {variable} } from "module";',
        },
        {
          description: 'Declare variable',
          command: 'const {variable} = value;',
        },
      ],
    });

    // SYMindX-specific errors
    this.errorPatterns.set('agent-not-found', {
      id: 'agent-not-found',
      pattern: /Agent.*not found|Cannot find agent/i,
      category: 'SYMindX Agent',
      severity: 'medium',
      explanation:
        'The specified agent ID does not exist in the runtime or has not been created yet.',
      commonCauses: [
        'Agent was never created',
        'Incorrect agent ID',
        'Agent was removed or stopped',
        'Runtime not initialized',
      ],
      suggestions: [
        'Create the agent first using runtime.createAgent()',
        'Check the agent ID spelling',
        'Verify the agent exists with runtime.getAgents()',
        'Initialize the runtime before creating agents',
      ],
      fixes: [
        {
          description: 'Create agent first',
          command:
            'await runtime.createAgent({ id: "agent-id", name: "Agent" });',
        },
        {
          description: 'List existing agents',
          command: 'const agents = await runtime.getAgents();',
        },
      ],
    });

    this.errorPatterns.set('runtime-not-initialized', {
      id: 'runtime-not-initialized',
      pattern: /Runtime.*not initialized|Cannot.*before.*initialize/i,
      category: 'SYMindX Runtime',
      severity: 'high',
      explanation:
        "You're trying to use SYMindX runtime methods before the runtime has been initialized.",
      commonCauses: [
        'Missing runtime.initialize() call',
        'Using runtime methods synchronously',
        'Runtime initialization failed',
      ],
      suggestions: [
        'Call await runtime.initialize() before using any runtime methods',
        'Make sure initialization is awaited',
        'Check for initialization errors',
        'Verify runtime configuration is correct',
      ],
      fixes: [
        {
          description: 'Initialize runtime',
          command: 'await runtime.initialize();',
        },
        {
          description: 'Check initialization',
          command: 'if (!runtime.initialized) await runtime.initialize();',
        },
      ],
    });

    this.errorPatterns.set('memory-provider-error', {
      id: 'memory-provider-error',
      pattern: /Memory provider.*error|Cannot connect.*database/i,
      category: 'SYMindX Memory',
      severity: 'medium',
      explanation:
        "There's an issue with the memory provider configuration or connection.",
      commonCauses: [
        'Invalid database connection string',
        'Database server not running',
        'Missing database file (SQLite)',
        'Incorrect memory provider configuration',
        'Missing database dependencies',
      ],
      suggestions: [
        'Check database connection string',
        'Verify database server is running',
        'Ensure database file exists (for SQLite)',
        'Install required database drivers',
        'Check memory provider configuration',
      ],
      fixes: [
        {
          description: 'Fix SQLite path',
          command: 'memory: { provider: "sqlite", path: "./data/memories.db" }',
        },
        {
          description: 'Check connection',
          command: 'Test database connection independently',
        },
      ],
    });

    this.errorPatterns.set('extension-load-error', {
      id: 'extension-load-error',
      pattern: /Extension.*failed.*load|Cannot.*extension/i,
      category: 'SYMindX Extension',
      severity: 'medium',
      explanation:
        'An extension failed to load properly, usually due to configuration or dependency issues.',
      commonCauses: [
        'Extension not found',
        'Missing extension dependencies',
        'Extension configuration error',
        'Extension initialization failed',
      ],
      suggestions: [
        'Check extension path and file existence',
        'Verify extension exports correct interface',
        'Install extension dependencies',
        'Check extension configuration',
        'Review extension initialization code',
      ],
      fixes: [
        {
          description: 'Check extension export',
          command:
            'export default class MyExtension implements Extension { ... }',
        },
        {
          description: 'Verify extension registration',
          command: 'runtime.registerExtension("name", MyExtension);',
        },
      ],
    });

    // TypeScript-specific errors
    this.errorPatterns.set('type-error', {
      id: 'type-error',
      pattern: /Type.*is not assignable|Property.*does not exist/,
      category: 'TypeScript',
      severity: 'medium',
      explanation: 'TypeScript detected a type mismatch or missing property.',
      commonCauses: [
        'Incorrect type annotation',
        'Missing property in interface',
        'Wrong type being passed',
        'Optional property treated as required',
      ],
      suggestions: [
        'Check type definitions and interfaces',
        'Add missing properties to objects',
        'Use correct types in function calls',
        'Add type assertions if types are correct',
        'Update interface definitions',
      ],
      fixes: [
        {
          description: 'Add type assertion',
          command: 'value as ExpectedType',
        },
        {
          description: 'Update interface',
          command: 'Add missing property to interface definition',
        },
      ],
    });

    // Network/API errors
    this.errorPatterns.set('network-error', {
      id: 'network-error',
      pattern: /ECONNREFUSED|ENOTFOUND|fetch.*failed|Network.*error/i,
      category: 'Network/API',
      severity: 'medium',
      explanation:
        'A network request failed, usually due to connectivity or server issues.',
      commonCauses: [
        'Server is not running',
        'Incorrect URL or endpoint',
        'Network connectivity issues',
        'CORS policy blocking request',
        'API key or authentication issues',
      ],
      suggestions: [
        'Check if the server/API is running',
        'Verify the URL and endpoint',
        'Test network connectivity',
        'Check CORS configuration',
        'Verify API credentials',
      ],
      fixes: [
        {
          description: 'Check server status',
          command: 'curl -I http://your-api-endpoint',
        },
        {
          description: 'Add error handling',
          command: 'try { ... } catch (error) { console.log(error); }',
        },
      ],
    });
  }

  private findMatchingPattern(errorMessage: string): ErrorPattern | undefined {
    for (const pattern of this.errorPatterns.values()) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern;
      }
    }
    return undefined;
  }

  private generateExplanation(
    pattern: ErrorPattern,
    errorMessage: string,
    code?: string
  ): {
    explanation: string;
    suggestions: string[];
    category: string;
    severity: 'low' | 'medium' | 'high';
    commonCauses: string[];
  } {
    // Extract specific details from error message
    const match = errorMessage.match(pattern.pattern);
    const extracted = match ? match[1] : '';

    // Customize suggestions based on extracted information
    const customizedSuggestions = pattern.suggestions.map((suggestion) =>
      suggestion.replace('{module}', extracted).replace('{variable}', extracted)
    );

    // Add context-specific suggestions based on code
    const contextSuggestions = this.getContextSpecificSuggestions(
      pattern,
      errorMessage,
      code
    );

    return {
      explanation: pattern.explanation,
      suggestions: [...customizedSuggestions, ...contextSuggestions],
      category: pattern.category,
      severity: pattern.severity,
      commonCauses: pattern.commonCauses,
    };
  }

  private generateGenericExplanation(
    errorMessage: string,
    errorStack?: string,
    code?: string
  ): {
    explanation: string;
    suggestions: string[];
    category: string;
    severity: 'low' | 'medium' | 'high';
    commonCauses: string[];
  } {
    // Analyze error message for common patterns
    let category = 'General';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let explanation = 'An error occurred during execution.';
    const suggestions: string[] = [];
    const commonCauses: string[] = [];

    // Basic error categorization
    if (errorMessage.includes('TypeError')) {
      category = 'Type Error';
      explanation =
        'A type-related error occurred, typically when trying to use a value in an incompatible way.';
      suggestions.push('Check the types of variables and function parameters');
      suggestions.push(
        'Verify that objects and arrays are properly initialized'
      );
      commonCauses.push('Trying to call a method on null or undefined');
      commonCauses.push('Incorrect data type being used');
    } else if (errorMessage.includes('ReferenceError')) {
      category = 'Reference Error';
      severity = 'high';
      explanation =
        "A reference error means you're trying to use something that doesn't exist.";
      suggestions.push('Check for typos in variable and function names');
      suggestions.push('Ensure variables are declared before use');
      commonCauses.push('Variable not declared');
      commonCauses.push('Typo in identifier name');
    } else if (errorMessage.includes('SyntaxError')) {
      category = 'Syntax Error';
      severity = 'high';
      explanation =
        "There's a syntax error in your code that prevents it from being parsed correctly.";
      suggestions.push(
        'Check for missing brackets, parentheses, or semicolons'
      );
      suggestions.push('Verify proper indentation and code structure');
      commonCauses.push('Missing or extra punctuation');
      commonCauses.push('Malformed code structure');
    }

    // Add generic suggestions
    suggestions.push('Check the error stack trace for the exact location');
    suggestions.push('Review recent code changes');
    suggestions.push('Search for similar errors online');

    return {
      explanation,
      suggestions,
      category,
      severity,
      commonCauses,
    };
  }

  private getContextSpecificSuggestions(
    pattern: ErrorPattern,
    errorMessage: string,
    code?: string
  ): string[] {
    const suggestions: string[] = [];

    if (!code) return suggestions;

    // Analyze code context for additional suggestions
    if (pattern.id === 'cannot-find-module') {
      if (code.includes('import') && !code.includes('from')) {
        suggestions.push(
          'Make sure your import statement includes the "from" keyword'
        );
      }

      if (code.includes('.js') || code.includes('.ts')) {
        suggestions.push('Try removing the file extension from your import');
      }
    }

    if (pattern.id === 'is-not-defined') {
      const lines = code.split('\n');
      const importLines = lines.filter((line) => line.includes('import'));

      if (importLines.length === 0) {
        suggestions.push(
          'Consider adding import statements at the top of your file'
        );
      }
    }

    if (pattern.id === 'agent-not-found') {
      if (!code.includes('createAgent')) {
        suggestions.push(
          'You may need to create the agent first using runtime.createAgent()'
        );
      }

      if (!code.includes('await')) {
        suggestions.push(
          'Make sure to use await when calling async runtime methods'
        );
      }
    }

    return suggestions;
  }

  // Public utility methods
  async analyzeCodeForPotentialErrors(code: string): Promise<
    Array<{
      line: number;
      message: string;
      severity: 'low' | 'medium' | 'high';
      type: string;
    }>
  > {
    const potentialErrors: Array<{
      line: number;
      message: string;
      severity: 'low' | 'medium' | 'high';
      type: string;
    }> = [];

    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for common issues
      if (line.includes('console.log') && !line.includes('//')) {
        potentialErrors.push({
          line: index + 1,
          message:
            'Console.log statement found - consider removing for production',
          severity: 'low',
          type: 'code-quality',
        });
      }

      if (line.includes('any') && line.includes(':')) {
        potentialErrors.push({
          line: index + 1,
          message: 'Usage of "any" type reduces type safety',
          severity: 'medium',
          type: 'typescript',
        });
      }

      if (line.includes('setTimeout') && !line.includes('clearTimeout')) {
        potentialErrors.push({
          line: index + 1,
          message: 'Consider clearing timeouts to prevent memory leaks',
          severity: 'medium',
          type: 'memory-leak',
        });
      }

      if (line.includes('await') && !line.includes('try')) {
        const nextLines = lines.slice(index, index + 3);
        const hasTryCatch = nextLines.some(
          (l) => l.includes('try') || l.includes('catch')
        );

        if (!hasTryCatch) {
          potentialErrors.push({
            line: index + 1,
            message: 'Consider adding error handling for async operations',
            severity: 'medium',
            type: 'error-handling',
          });
        }
      }
    });

    return potentialErrors;
  }

  async getSimilarErrors(errorMessage: string): Promise<
    Array<{
      pattern: string;
      similarity: number;
      description: string;
    }>
  > {
    const similar: Array<{
      pattern: string;
      similarity: number;
      description: string;
    }> = [];

    for (const pattern of this.errorPatterns.values()) {
      const similarity = this.calculateSimilarity(
        errorMessage,
        pattern.explanation
      );

      if (similarity > 0.3) {
        similar.push({
          pattern: pattern.id,
          similarity,
          description: pattern.explanation,
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return commonWords.length / totalWords;
  }
}

// Supporting interfaces
interface ErrorPattern {
  id: string;
  pattern: RegExp;
  category: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  commonCauses: string[];
  suggestions: string[];
  fixes: Array<{
    description: string;
    command: string;
  }>;
}
