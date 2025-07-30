/**
 * Pattern Detector
 * Detects code patterns, anti-patterns, and framework usage
 */

import { EventEmitter } from 'events';

export class PatternDetector extends EventEmitter {
  private patterns: Map<string, PatternDefinition>;
  private antiPatterns: Map<string, AntiPatternDefinition>;
  private frameworks: Map<string, FrameworkPattern>;
  private initialized = false;

  constructor() {
    super();
    this.patterns = new Map();
    this.antiPatterns = new Map();
    this.frameworks = new Map();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔍 Initializing Pattern Detector...');

    this.loadPatterns();
    this.loadAntiPatterns();
    this.loadFrameworkPatterns();

    this.initialized = true;
  }

  async detectPatterns(code: string): Promise<{
    antiPatterns: Array<{ pattern: string; description: string; fix: string }>;
    bestPractices: Array<{
      pattern: string;
      description: string;
      example: string;
    }>;
    frameworks: Array<{ name: string; confidence: number; features: string[] }>;
  }> {
    const results = {
      antiPatterns: await this.detectAntiPatterns(code),
      bestPractices: await this.detectBestPractices(code),
      frameworks: await this.detectFrameworks(code),
    };

    this.emit('patterns-detected', results);
    return results;
  }

  private loadPatterns(): void {
    // Design Patterns
    this.patterns.set('factory-pattern', {
      id: 'factory-pattern',
      name: 'Factory Pattern',
      category: 'creational',
      description: 'Uses factory functions to create objects',
      indicators: [
        /function\s+create\w+/,
        /const\s+create\w+\s*=/,
        /export.*create\w+/,
      ],
      benefits: [
        'Encapsulates object creation',
        'Easier testing',
        'Flexible instantiation',
      ],
      example: `function createAgent(config) {
  return new Agent(config);
}`,
    });

    this.patterns.set('observer-pattern', {
      id: 'observer-pattern',
      name: 'Observer Pattern',
      category: 'behavioral',
      description: 'Uses event-driven architecture',
      indicators: [/\.on\(/, /\.emit\(/, /EventEmitter/, /addEventListener/],
      benefits: [
        'Loose coupling',
        'Event-driven architecture',
        'Reactive programming',
      ],
      example: `agent.on('message', (data) => {
  console.log('Received:', data);
});`,
    });

    this.patterns.set('singleton-pattern', {
      id: 'singleton-pattern',
      name: 'Singleton Pattern',
      category: 'creational',
      description: 'Ensures single instance of a class',
      indicators: [
        /private\s+static\s+instance/,
        /getInstance\(\)/,
        /if\s*\(.*instance.*null\)/,
      ],
      benefits: ['Controlled access', 'Global state management'],
      example: `class Runtime {
  private static instance: Runtime;
  static getInstance() {
    if (!this.instance) {
      this.instance = new Runtime();
    }
    return this.instance;
  }
}`,
    });

    this.patterns.set('async-await-pattern', {
      id: 'async-await-pattern',
      name: 'Async/Await Pattern',
      category: 'asynchronous',
      description: 'Modern asynchronous programming',
      indicators: [/async\s+function/, /async\s*\(/, /await\s+/],
      benefits: [
        'Readable async code',
        'Better error handling',
        'Sequential-looking code',
      ],
      example: `async function processMessage(message) {
  const result = await agent.think(message);
  return result;
}`,
    });

    this.patterns.set('dependency-injection', {
      id: 'dependency-injection',
      name: 'Dependency Injection',
      category: 'structural',
      description: 'Injects dependencies rather than creating them',
      indicators: [/constructor\([^)]*\w+:\s*\w+/, /inject\(/, /provide\(/],
      benefits: ['Testability', 'Loose coupling', 'Flexibility'],
      example: `class Agent {
  constructor(private memory: MemoryProvider) {}
}`,
    });
  }

  private loadAntiPatterns(): void {
    this.antiPatterns.set('god-object', {
      id: 'god-object',
      name: 'God Object',
      category: 'structural',
      description: 'Class that knows too much or does too much',
      indicators: [
        { pattern: /class\s+\w+[\s\S]{1000,}/, weight: 0.3 },
        { pattern: /constructor[\s\S]{500,}/, weight: 0.2 },
      ],
      problems: [
        'Hard to maintain',
        'Difficult to test',
        'Violates single responsibility principle',
      ],
      fix: 'Break down into smaller, focused classes',
      severity: 'high',
    });

    this.antiPatterns.set('callback-hell', {
      id: 'callback-hell',
      name: 'Callback Hell',
      category: 'asynchronous',
      description: 'Deeply nested callbacks',
      indicators: [
        { pattern: /\w+\([^{]*{\s*\w+\([^{]*{\s*\w+\([^{]*{/, weight: 0.8 },
        { pattern: /function[^}]*function[^}]*function/, weight: 0.6 },
      ],
      problems: [
        'Difficult to read',
        'Hard to handle errors',
        'Maintenance nightmare',
      ],
      fix: 'Use Promises or async/await',
      severity: 'medium',
    });

    this.antiPatterns.set('magic-numbers', {
      id: 'magic-numbers',
      name: 'Magic Numbers',
      category: 'maintainability',
      description: 'Hard-coded numeric values without explanation',
      indicators: [
        { pattern: /[^.\w]\d{2,}[^.\w]/, weight: 0.1 },
        { pattern: /setTimeout\([^,]*,\s*\d{3,}/, weight: 0.5 },
      ],
      problems: ['Unclear meaning', 'Hard to maintain', 'Error-prone changes'],
      fix: 'Use named constants',
      severity: 'low',
    });

    this.antiPatterns.set('long-methods', {
      id: 'long-methods',
      name: 'Long Methods',
      category: 'maintainability',
      description: 'Methods that are too long',
      indicators: [
        { pattern: /function[^}]{1000,}/, weight: 0.5 },
        { pattern: /=>[^}]{500,}/, weight: 0.3 },
      ],
      problems: [
        'Hard to understand',
        'Difficult to test',
        'Multiple responsibilities',
      ],
      fix: 'Extract smaller methods',
      severity: 'medium',
    });

    this.antiPatterns.set('copy-paste-programming', {
      id: 'copy-paste-programming',
      name: 'Copy-Paste Programming',
      category: 'maintainability',
      description: 'Duplicated code blocks',
      indicators: [
        { pattern: /identical code blocks/, weight: 0.7 }, // This would need more sophisticated detection
      ],
      problems: [
        'Code duplication',
        'Maintenance burden',
        'Inconsistent changes',
      ],
      fix: 'Extract common functions or use inheritance',
      severity: 'medium',
    });

    this.antiPatterns.set('premature-optimization', {
      id: 'premature-optimization',
      name: 'Premature Optimization',
      category: 'performance',
      description: 'Over-optimizing before measuring performance',
      indicators: [
        { pattern: /micro.*optimization/i, weight: 0.3 },
        { pattern: /\+\+\w+\s*<.*\.length/, weight: 0.2 },
      ],
      problems: [
        'Reduced readability',
        'Unnecessary complexity',
        'May not improve performance',
      ],
      fix: 'Profile first, then optimize bottlenecks',
      severity: 'low',
    });
  }

  private loadFrameworkPatterns(): void {
    // SYMindX Framework Detection
    this.frameworks.set('symindx', {
      id: 'symindx',
      name: 'SYMindX',
      indicators: [
        { pattern: /from\s+['"]@symindx\/mind-agents['"]/, weight: 0.9 },
        { pattern: /SYMindXRuntime/, weight: 0.8 },
        { pattern: /createAgent|startAgent/, weight: 0.6 },
        { pattern: /Extension.*interface/, weight: 0.5 },
        { pattern: /EmotionModule|CognitionModule/, weight: 0.7 },
      ],
      features: [
        { pattern: /emotion.*config/, name: 'emotion-system' },
        { pattern: /memory.*provider/, name: 'memory-system' },
        { pattern: /extension.*actions/, name: 'extension-system' },
        { pattern: /multi.*agent/, name: 'multi-agent' },
        { pattern: /autonomous.*engine/, name: 'autonomous-behavior' },
      ],
    });

    // React Framework Detection
    this.frameworks.set('react', {
      id: 'react',
      name: 'React',
      indicators: [
        { pattern: /from\s+['"]react['"]/, weight: 0.9 },
        { pattern: /useState|useEffect|useContext/, weight: 0.8 },
        { pattern: /JSX\.Element|React\.FC/, weight: 0.7 },
        { pattern: /<\w+[^>]*>.*<\/\w+>/, weight: 0.5 },
      ],
      features: [
        { pattern: /useState/, name: 'hooks' },
        { pattern: /useEffect/, name: 'effects' },
        { pattern: /useContext/, name: 'context' },
        { pattern: /React\.memo/, name: 'memoization' },
      ],
    });

    // Node.js Detection
    this.frameworks.set('nodejs', {
      id: 'nodejs',
      name: 'Node.js',
      indicators: [
        { pattern: /require\(['"][\w\/.-]+['"]\)/, weight: 0.7 },
        { pattern: /process\.env/, weight: 0.6 },
        { pattern: /module\.exports/, weight: 0.8 },
        { pattern: /__dirname|__filename/, weight: 0.5 },
      ],
      features: [
        { pattern: /fs\./, name: 'filesystem' },
        { pattern: /http\./, name: 'http-server' },
        { pattern: /path\./, name: 'path-utils' },
        { pattern: /process\./, name: 'process-management' },
      ],
    });

    // Express.js Detection
    this.frameworks.set('express', {
      id: 'express',
      name: 'Express.js',
      indicators: [
        { pattern: /from\s+['"]express['"]/, weight: 0.9 },
        { pattern: /app\.get|app\.post|app\.put/, weight: 0.8 },
        { pattern: /req\.|res\./, weight: 0.6 },
        { pattern: /app\.listen/, weight: 0.7 },
      ],
      features: [
        { pattern: /middleware/, name: 'middleware' },
        { pattern: /router/, name: 'routing' },
        { pattern: /cors/, name: 'cors' },
        { pattern: /helmet/, name: 'security' },
      ],
    });

    // TypeScript Detection
    this.frameworks.set('typescript', {
      id: 'typescript',
      name: 'TypeScript',
      indicators: [
        { pattern: /:\s*\w+\s*[=;]/, weight: 0.6 },
        { pattern: /interface\s+\w+/, weight: 0.8 },
        { pattern: /type\s+\w+\s*=/, weight: 0.7 },
        { pattern: /as\s+\w+/, weight: 0.5 },
      ],
      features: [
        { pattern: /interface/, name: 'interfaces' },
        { pattern: /type.*=/, name: 'type-aliases' },
        { pattern: /generic.*<.*>/, name: 'generics' },
        { pattern: /enum/, name: 'enums' },
      ],
    });
  }

  private async detectAntiPatterns(
    code: string
  ): Promise<Array<{ pattern: string; description: string; fix: string }>> {
    const detected: Array<{
      pattern: string;
      description: string;
      fix: string;
    }> = [];

    for (const antiPattern of this.antiPatterns.values()) {
      let score = 0;

      for (const indicator of antiPattern.indicators) {
        if (indicator.pattern.test(code)) {
          score += indicator.weight;
        }
      }

      // Threshold for detection
      if (score > 0.5) {
        detected.push({
          pattern: antiPattern.name,
          description: antiPattern.description,
          fix: antiPattern.fix,
        });
      }
    }

    return detected;
  }

  private async detectBestPractices(
    code: string
  ): Promise<Array<{ pattern: string; description: string; example: string }>> {
    const detected: Array<{
      pattern: string;
      description: string;
      example: string;
    }> = [];

    for (const pattern of this.patterns.values()) {
      let matches = 0;

      for (const indicator of pattern.indicators) {
        if (indicator.test(code)) {
          matches++;
        }
      }

      // If at least one indicator matches
      if (matches > 0) {
        detected.push({
          pattern: pattern.name,
          description: pattern.description,
          example: pattern.example,
        });
      }
    }

    return detected;
  }

  private async detectFrameworks(
    code: string
  ): Promise<Array<{ name: string; confidence: number; features: string[] }>> {
    const detected: Array<{
      name: string;
      confidence: number;
      features: string[];
    }> = [];

    for (const framework of this.frameworks.values()) {
      let score = 0;

      // Check main indicators
      for (const indicator of framework.indicators) {
        if (indicator.pattern.test(code)) {
          score += indicator.weight;
        }
      }

      if (score > 0.3) {
        // Detect specific features
        const features: string[] = [];
        for (const feature of framework.features) {
          if (feature.pattern.test(code)) {
            features.push(feature.name);
          }
        }

        detected.push({
          name: framework.name,
          confidence: Math.min(1, score),
          features,
        });
      }
    }

    return detected.sort((a, b) => b.confidence - a.confidence);
  }

  // Advanced pattern detection methods
  async detectDesignPatterns(code: string): Promise<
    Array<{
      pattern: string;
      confidence: number;
      examples: string[];
      benefits: string[];
    }>
  > {
    const detectedPatterns: Array<{
      pattern: string;
      confidence: number;
      examples: string[];
      benefits: string[];
    }> = [];

    for (const pattern of this.patterns.values()) {
      let confidence = 0;
      const examples: string[] = [];

      // Count matches
      for (const indicator of pattern.indicators) {
        const matches = code.match(indicator);
        if (matches) {
          confidence += 0.2;
          examples.push(...matches.slice(0, 2)); // Add up to 2 examples
        }
      }

      if (confidence > 0.3) {
        detectedPatterns.push({
          pattern: pattern.name,
          confidence: Math.min(1, confidence),
          examples,
          benefits: pattern.benefits,
        });
      }
    }

    return detectedPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  async detectCodeSmells(code: string): Promise<
    Array<{
      smell: string;
      severity: 'low' | 'medium' | 'high';
      locations: number[];
      description: string;
      refactoringTips: string[];
    }>
  > {
    const smells: Array<{
      smell: string;
      severity: 'low' | 'medium' | 'high';
      locations: number[];
      description: string;
      refactoringTips: string[];
    }> = [];

    const lines = code.split('\n');

    // Long methods
    let methodStart = -1;
    let braceCount = 0;

    lines.forEach((line, index) => {
      if (
        (line.includes('function') || line.includes('=>')) &&
        methodStart === -1
      ) {
        methodStart = index;
      }

      if (methodStart !== -1) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0) {
          const methodLength = index - methodStart;
          if (methodLength > 30) {
            smells.push({
              smell: 'Long Method',
              severity: methodLength > 50 ? 'high' : 'medium',
              locations: [methodStart + 1],
              description: `Method spans ${methodLength} lines, making it hard to understand and maintain`,
              refactoringTips: [
                'Extract smaller methods',
                'Use the Single Responsibility Principle',
                'Consider breaking into multiple classes',
              ],
            });
          }
          methodStart = -1;
        }
      }
    });

    // Duplicate code detection (simplified)
    const duplicateThreshold = 5;
    const codeBlocks = new Map<string, number[]>();

    for (let i = 0; i < lines.length - duplicateThreshold; i++) {
      const block = lines
        .slice(i, i + duplicateThreshold)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n');

      if (block.length > 50) {
        // Only consider substantial blocks
        if (codeBlocks.has(block)) {
          codeBlocks.get(block)!.push(i + 1);
        } else {
          codeBlocks.set(block, [i + 1]);
        }
      }
    }

    for (const [block, locations] of codeBlocks) {
      if (locations.length > 1) {
        smells.push({
          smell: 'Duplicate Code',
          severity: 'medium',
          locations,
          description:
            'Identical or very similar code blocks found in multiple locations',
          refactoringTips: [
            'Extract common functionality into shared functions',
            'Use inheritance or composition',
            'Consider using higher-order functions',
          ],
        });
      }
    }

    return smells;
  }

  async analyzeComplexity(code: string): Promise<{
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    maintainabilityIndex: number;
    recommendations: string[];
  }> {
    let cyclomaticComplexity = 1; // Base complexity
    let cognitiveComplexity = 0;
    let nestingLevel = 0;

    const lines = code.split('\n');

    lines.forEach((line) => {
      const trimmed = line.trim();

      // Cyclomatic complexity
      const complexityKeywords = [
        'if',
        'else',
        'for',
        'while',
        'case',
        'catch',
        '&&',
        '||',
        '?',
      ];
      complexityKeywords.forEach((keyword) => {
        if (trimmed.includes(keyword)) {
          cyclomaticComplexity++;
        }
      });

      // Cognitive complexity (simplified)
      if (
        trimmed.includes('if') ||
        trimmed.includes('for') ||
        trimmed.includes('while')
      ) {
        cognitiveComplexity += 1 + nestingLevel;
      }

      // Track nesting
      if (trimmed.includes('{')) nestingLevel++;
      if (trimmed.includes('}')) nestingLevel = Math.max(0, nestingLevel - 1);
    });

    // Maintainability index (simplified calculation)
    const linesOfCode = lines.filter((line) => line.trim().length > 0).length;
    const maintainabilityIndex = Math.max(
      0,
      171 - 5.2 * Math.log(linesOfCode) - 0.23 * cyclomaticComplexity
    );

    const recommendations: string[] = [];

    if (cyclomaticComplexity > 10) {
      recommendations.push(
        'Reduce cyclomatic complexity by extracting methods'
      );
    }

    if (cognitiveComplexity > 15) {
      recommendations.push('Simplify nested logic structures');
    }

    if (maintainabilityIndex < 20) {
      recommendations.push('Consider refactoring to improve maintainability');
    }

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      recommendations,
    };
  }
}

// Supporting interfaces
interface PatternDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  indicators: RegExp[];
  benefits: string[];
  example: string;
}

interface AntiPatternDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  indicators: Array<{ pattern: RegExp; weight: number }>;
  problems: string[];
  fix: string;
  severity: 'low' | 'medium' | 'high';
}

interface FrameworkPattern {
  id: string;
  name: string;
  indicators: Array<{ pattern: RegExp; weight: number }>;
  features: Array<{ pattern: RegExp; name: string }>;
}
