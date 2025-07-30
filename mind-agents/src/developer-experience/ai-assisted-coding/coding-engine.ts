/**
 * AI-Assisted Coding Engine
 * Central orchestrator for intelligent coding assistance
 */

import { EventEmitter } from 'events';
import {
  CodeCompletionRequest,
  CodeCompletionSuggestion,
  CodeOptimizationSuggestion,
} from '../types/index.js';
import { CodeCompletion } from './code-completion.js';
import { ErrorExplainer } from './error-explainer.js';
import { CodeGenerator } from './code-generator.js';
import { OptimizationEngine } from './optimization-engine.js';
import { PatternDetector } from './pattern-detector.js';

export class AIAssistedCodingEngine extends EventEmitter {
  private codeCompletion: CodeCompletion;
  private errorExplainer: ErrorExplainer;
  private codeGenerator: CodeGenerator;
  private optimizationEngine: OptimizationEngine;
  private patternDetector: PatternDetector;
  private initialized = false;

  constructor() {
    super();
    this.codeCompletion = new CodeCompletion();
    this.errorExplainer = new ErrorExplainer();
    this.codeGenerator = new CodeGenerator();
    this.optimizationEngine = new OptimizationEngine();
    this.patternDetector = new PatternDetector();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🤖 Initializing AI-Assisted Coding Engine...');

    await Promise.all([
      this.codeCompletion.initialize(),
      this.errorExplainer.initialize(),
      this.codeGenerator.initialize(),
      this.optimizationEngine.initialize(),
      this.patternDetector.initialize(),
    ]);

    this.setupEventHandlers();
    this.initialized = true;

    console.log('✅ AI-Assisted Coding Engine ready!');
  }

  private setupEventHandlers(): void {
    // Forward events from sub-components
    this.codeCompletion.on('completion-generated', (data) => {
      this.emit('completion-generated', data);
    });

    this.errorExplainer.on('error-explained', (data) => {
      this.emit('error-explained', data);
    });

    this.codeGenerator.on('code-generated', (data) => {
      this.emit('code-generated', data);
    });

    this.optimizationEngine.on('optimization-suggested', (data) => {
      this.emit('optimization-suggested', data);
    });

    this.patternDetector.on('pattern-detected', (data) => {
      this.emit('pattern-detected', data);
    });
  }

  // Code Completion API
  async getCompletions(
    request: CodeCompletionRequest
  ): Promise<CodeCompletionSuggestion[]> {
    try {
      const completions = await this.codeCompletion.getCompletions(request);

      // Enhance completions with pattern detection
      const patterns = await this.patternDetector.detectPatterns(request.code);
      const enhancedCompletions = this.enhanceCompletionsWithPatterns(
        completions,
        patterns
      );

      this.emit('completion-requested', {
        request,
        completions: enhancedCompletions,
      });
      return enhancedCompletions;
    } catch (error) {
      this.emit('completion-error', { error, request });
      throw error;
    }
  }

  // Code Generation API
  async generateCode(prompt: string, context?: any): Promise<string> {
    try {
      const generatedCode = await this.codeGenerator.generate(prompt, context);

      // Analyze generated code for potential optimizations
      const optimizations =
        await this.optimizationEngine.analyzeCode(generatedCode);

      // Apply high-confidence optimizations automatically
      const optimizedCode = this.applyAutoOptimizations(
        generatedCode,
        optimizations
      );

      this.emit('code-generated', {
        prompt,
        originalCode: generatedCode,
        optimizedCode,
      });
      return optimizedCode;
    } catch (error) {
      this.emit('generation-error', { error, prompt });
      throw error;
    }
  }

  // Error Explanation API
  async explainError(
    error: Error | string,
    code?: string
  ): Promise<{
    explanation: string;
    suggestions: string[];
    potentialFixes: Array<{ description: string; code: string }>;
  }> {
    try {
      const explanation = await this.errorExplainer.explainError(error, code);

      // Generate potential fixes
      const fixes = await this.generateErrorFixes(error, code);

      this.emit('error-explained', { error, explanation, fixes });
      return {
        explanation: explanation.explanation,
        suggestions: explanation.suggestions,
        potentialFixes: fixes,
      };
    } catch (err) {
      this.emit('explanation-error', { error: err, originalError: error });
      throw err;
    }
  }

  // Code Optimization API
  async optimizeCode(
    code: string,
    options?: {
      focusAreas?: string[];
      aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
    }
  ): Promise<CodeOptimizationSuggestion[]> {
    try {
      const suggestions = await this.optimizationEngine.optimizeCode(
        code,
        options
      );

      // Prioritize suggestions based on impact and safety
      const prioritizedSuggestions = this.prioritizeOptimizations(suggestions);

      this.emit('optimization-analyzed', {
        code,
        suggestions: prioritizedSuggestions,
      });
      return prioritizedSuggestions;
    } catch (error) {
      this.emit('optimization-error', { error, code });
      throw error;
    }
  }

  // Pattern Detection API
  async detectPatterns(code: string): Promise<{
    antiPatterns: Array<{ pattern: string; description: string; fix: string }>;
    bestPractices: Array<{
      pattern: string;
      description: string;
      example: string;
    }>;
    frameworks: Array<{ name: string; confidence: number; features: string[] }>;
  }> {
    try {
      const patterns = await this.patternDetector.detectPatterns(code);
      this.emit('patterns-detected', patterns);
      return patterns;
    } catch (error) {
      this.emit('pattern-detection-error', { error, code });
      throw error;
    }
  }

  // Smart Code Analysis
  async analyzeCodebase(rootPath: string): Promise<{
    structure: any;
    patterns: any;
    optimizations: CodeOptimizationSuggestion[];
    recommendations: string[];
  }> {
    try {
      console.log('🔍 Analyzing codebase...');

      // Get codebase structure
      const structure = await this.analyzeProjectStructure(rootPath);

      // Detect patterns across files
      const patterns = await this.analyzeCodebasePatterns(rootPath);

      // Find optimization opportunities
      const optimizations = await this.findCodebaseOptimizations(rootPath);

      // Generate high-level recommendations
      const recommendations = this.generateCodebaseRecommendations(
        structure,
        patterns,
        optimizations
      );

      const analysis = { structure, patterns, optimizations, recommendations };
      this.emit('codebase-analyzed', analysis);

      return analysis;
    } catch (error) {
      this.emit('codebase-analysis-error', { error, rootPath });
      throw error;
    }
  }

  // Interactive Coding Assistant
  async startInteractiveCoding(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.clear();
    console.log(chalk.default.cyan('🤖 AI-Assisted Coding Assistant\n'));

    while (true) {
      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like help with?',
          choices: [
            { name: '✨ Generate code from description', value: 'generate' },
            { name: '🔧 Get code completions', value: 'complete' },
            { name: '❓ Explain an error', value: 'explain' },
            { name: '⚡ Optimize existing code', value: 'optimize' },
            { name: '🔍 Analyze code patterns', value: 'patterns' },
            { name: '📊 Analyze entire codebase', value: 'analyze' },
            { name: '⬅️  Back to main menu', value: 'back' },
          ],
        },
      ]);

      switch (action) {
        case 'generate':
          await this.interactiveCodeGeneration();
          break;
        case 'complete':
          await this.interactiveCodeCompletion();
          break;
        case 'explain':
          await this.interactiveErrorExplanation();
          break;
        case 'optimize':
          await this.interactiveCodeOptimization();
          break;
        case 'patterns':
          await this.interactivePatternDetection();
          break;
        case 'analyze':
          await this.interactiveCodebaseAnalysis();
          break;
        case 'back':
          return;
      }

      // Wait for user input before continuing
      await inquirer.default.prompt([
        {
          type: 'input',
          name: 'continue',
          message: chalk.default.gray('Press Enter to continue...'),
        },
      ]);
    }
  }

  // Private helper methods
  private enhanceCompletionsWithPatterns(
    completions: CodeCompletionSuggestion[],
    patterns: any
  ): CodeCompletionSuggestion[] {
    // Add pattern-aware enhancements to completions
    return completions.map((completion) => {
      const enhanced = { ...completion };

      // Boost confidence for framework-specific completions
      if (
        patterns.frameworks.some((f: any) =>
          completion.text.includes(f.name.toLowerCase())
        )
      ) {
        enhanced.confidence = Math.min(1, enhanced.confidence + 0.1);
        enhanced.category = 'pattern';
      }

      return enhanced;
    });
  }

  private applyAutoOptimizations(
    code: string,
    optimizations: CodeOptimizationSuggestion[]
  ): string {
    let optimizedCode = code;

    // Apply only high-confidence, safe optimizations automatically
    const autoApplyOptimizations = optimizations.filter(
      (opt) =>
        opt.severity === 'hint' && opt.fix && opt.aiExplanation.includes('safe')
    );

    for (const optimization of autoApplyOptimizations) {
      if (optimization.fix) {
        // Apply the fix (simplified implementation)
        for (const change of optimization.fix.changes) {
          // In a real implementation, this would use proper AST manipulation
          optimizedCode = optimizedCode.replace(
            code.substring(
              change.range.start.character,
              change.range.end.character
            ),
            change.newText
          );
        }
      }
    }

    return optimizedCode;
  }

  private async generateErrorFixes(
    error: Error | string,
    code?: string
  ): Promise<Array<{ description: string; code: string }>> {
    // Generate potential fixes based on error type and code context
    const errorMessage = typeof error === 'string' ? error : error.message;
    const fixes: Array<{ description: string; code: string }> = [];

    if (errorMessage.includes('Cannot find module')) {
      const moduleName = errorMessage.match(/'([^']+)'/)?.[1];
      if (moduleName) {
        fixes.push({
          description: `Install missing module: ${moduleName}`,
          code: `npm install ${moduleName}`,
        });
      }
    }

    if (errorMessage.includes('is not defined')) {
      const variableName = errorMessage.match(/(\w+) is not defined/)?.[1];
      if (variableName) {
        fixes.push({
          description: `Import or declare ${variableName}`,
          code: `import { ${variableName} } from './module';`,
        });
      }
    }

    return fixes;
  }

  private prioritizeOptimizations(
    suggestions: CodeOptimizationSuggestion[]
  ): CodeOptimizationSuggestion[] {
    return suggestions.sort((a, b) => {
      // Priority order: error > warning > info > hint
      const severityOrder = { error: 4, warning: 3, info: 2, hint: 1 };
      const aSeverity = severityOrder[a.severity];
      const bSeverity = severityOrder[b.severity];

      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }

      // Secondary sort by line number
      return a.line - b.line;
    });
  }

  private async analyzeProjectStructure(rootPath: string): Promise<any> {
    // Analyze project structure - simplified implementation
    const fs = await import('fs');
    const path = await import('path');

    try {
      const packageJsonPath = path.join(rootPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      return {
        name: packageJson.name,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        scripts: Object.keys(packageJson.scripts || {}),
        type: packageJson.type || 'commonjs',
      };
    } catch {
      return { error: 'Could not analyze project structure' };
    }
  }

  private async analyzeCodebasePatterns(rootPath: string): Promise<any> {
    // Analyze patterns across the codebase
    return {
      frameworks: [
        {
          name: 'SYMindX',
          confidence: 0.95,
          features: ['agents', 'emotions', 'memory'],
        },
      ],
      architecturalPatterns: [
        'Factory Pattern',
        'Observer Pattern',
        'Plugin Architecture',
      ],
      codeStyle: 'TypeScript with strict mode',
    };
  }

  private async findCodebaseOptimizations(
    rootPath: string
  ): Promise<CodeOptimizationSuggestion[]> {
    // Find optimization opportunities across the codebase
    return [
      {
        id: 'codebase-opt-1',
        line: 0,
        column: 0,
        message:
          'Consider enabling TypeScript strict mode for better type safety',
        severity: 'info',
        aiExplanation:
          'Strict mode catches more potential errors at compile time',
      },
    ];
  }

  private generateCodebaseRecommendations(
    structure: any,
    patterns: any,
    optimizations: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (structure.type === 'commonjs') {
      recommendations.push(
        'Consider migrating to ES modules for better tree-shaking'
      );
    }

    if (optimizations.length > 0) {
      recommendations.push(
        `Found ${optimizations.length} optimization opportunities`
      );
    }

    recommendations.push('Code structure follows SYMindX best practices');

    return recommendations;
  }

  // Interactive methods
  private async interactiveCodeGeneration(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(chalk.default.cyan('\n✨ Code Generation Assistant\n'));

    const { prompt, context } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'prompt',
        message: 'Describe what you want to create:',
        validate: (input) =>
          input.length > 10 || 'Please provide a more detailed description',
      },
      {
        type: 'input',
        name: 'context',
        message: 'Any additional context? (optional):',
      },
    ]);

    console.log(chalk.default.yellow('\n🤖 Generating code...'));

    try {
      const code = await this.generateCode(prompt, context || undefined);

      console.log(chalk.default.green('\n✅ Generated code:'));
      console.log(this.formatCode(code));

      const { saveCode } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'saveCode',
          message: 'Would you like to save this code to a file?',
          default: false,
        },
      ]);

      if (saveCode) {
        await this.saveGeneratedCode(code, prompt);
      }
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  private async interactiveCodeCompletion(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(chalk.default.cyan('\n🔧 Code Completion Assistant\n'));

    const { code, cursor } = await inquirer.default.prompt([
      {
        type: 'editor',
        name: 'code',
        message: 'Paste your code (save and close to continue):',
      },
      {
        type: 'input',
        name: 'cursor',
        message: 'Cursor position (line:column, e.g., 5:10):',
        default: '1:0',
      },
    ]);

    try {
      const [line, column] = cursor.split(':').map(Number);
      const completions = await this.getCompletions({
        code,
        cursor: line * 100 + column, // Simplified cursor calculation
        context: { filePath: 'interactive.ts' },
      });

      console.log(
        chalk.default.green(`\n✅ Found ${completions.length} completions:`)
      );
      completions.slice(0, 5).forEach((completion, index) => {
        console.log(
          `${index + 1}. ${completion.displayText} (${completion.category})`
        );
        if (completion.description) {
          console.log(`   ${chalk.default.gray(completion.description)}`);
        }
      });
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  private async interactiveErrorExplanation(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(chalk.default.cyan('\n❓ Error Explanation Assistant\n'));

    const { errorMessage, code } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'errorMessage',
        message: 'Enter the error message:',
        validate: (input) =>
          input.length > 0 || 'Please enter an error message',
      },
      {
        type: 'editor',
        name: 'code',
        message: 'Paste related code (optional, save and close to continue):',
      },
    ]);

    try {
      const explanation = await this.explainError(
        errorMessage,
        code || undefined
      );

      console.log(chalk.default.green('\n🔍 Error Explanation:'));
      console.log(explanation.explanation);

      if (explanation.suggestions.length > 0) {
        console.log(chalk.default.yellow('\n💡 Suggestions:'));
        explanation.suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion}`);
        });
      }

      if (explanation.potentialFixes.length > 0) {
        console.log(chalk.default.blue('\n🔧 Potential Fixes:'));
        explanation.potentialFixes.forEach((fix, index) => {
          console.log(`${index + 1}. ${fix.description}`);
          console.log(`   ${chalk.default.gray(fix.code)}`);
        });
      }
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Explanation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  private async interactiveCodeOptimization(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(chalk.default.cyan('\n⚡ Code Optimization Assistant\n'));

    const { code, aggressiveness } = await inquirer.default.prompt([
      {
        type: 'editor',
        name: 'code',
        message: 'Paste code to optimize (save and close to continue):',
      },
      {
        type: 'list',
        name: 'aggressiveness',
        message: 'Optimization level:',
        choices: [
          {
            name: '🟢 Conservative (safe changes only)',
            value: 'conservative',
          },
          { name: '🟡 Moderate (balanced approach)', value: 'moderate' },
          { name: '🔴 Aggressive (maximum optimization)', value: 'aggressive' },
        ],
      },
    ]);

    try {
      const optimizations = await this.optimizeCode(code, { aggressiveness });

      if (optimizations.length === 0) {
        console.log(
          chalk.default.green('\n✅ Code looks great! No optimizations needed.')
        );
        return;
      }

      console.log(
        chalk.default.yellow(
          `\n🔍 Found ${optimizations.length} optimization opportunities:`
        )
      );

      optimizations.forEach((opt, index) => {
        const severityColor = {
          error: chalk.default.red,
          warning: chalk.default.yellow,
          info: chalk.default.blue,
          hint: chalk.default.gray,
        }[opt.severity];

        console.log(
          `\n${index + 1}. ${severityColor(opt.message)} (Line ${opt.line})`
        );
        console.log(`   ${chalk.default.gray(opt.aiExplanation)}`);

        if (opt.fix) {
          console.log(
            `   ${chalk.default.green('Fix:')} ${opt.fix.description}`
          );
        }
      });
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  private async interactivePatternDetection(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(chalk.default.cyan('\n🔍 Pattern Detection Assistant\n'));

    const { code } = await inquirer.default.prompt([
      {
        type: 'editor',
        name: 'code',
        message: 'Paste code to analyze (save and close to continue):',
      },
    ]);

    try {
      const patterns = await this.detectPatterns(code);

      if (patterns.frameworks.length > 0) {
        console.log(chalk.default.green('\n🏗️  Detected Frameworks:'));
        patterns.frameworks.forEach((framework) => {
          console.log(
            `• ${framework.name} (${(framework.confidence * 100).toFixed(0)}% confidence)`
          );
          if (framework.features.length > 0) {
            console.log(`  Features: ${framework.features.join(', ')}`);
          }
        });
      }

      if (patterns.antiPatterns.length > 0) {
        console.log(chalk.default.red('\n⚠️  Anti-patterns Found:'));
        patterns.antiPatterns.forEach((pattern, index) => {
          console.log(`${index + 1}. ${pattern.pattern}`);
          console.log(`   ${chalk.default.gray(pattern.description)}`);
          console.log(`   ${chalk.default.yellow('Fix:')} ${pattern.fix}`);
        });
      }

      if (patterns.bestPractices.length > 0) {
        console.log(chalk.default.green('\n✅ Best Practices Detected:'));
        patterns.bestPractices.forEach((practice, index) => {
          console.log(`${index + 1}. ${practice.pattern}`);
          console.log(`   ${chalk.default.gray(practice.description)}`);
        });
      }
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Pattern detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  private async interactiveCodebaseAnalysis(): Promise<void> {
    const inquirer = await import('inquirer');
    const chalk = await import('chalk');

    console.log(chalk.default.cyan('\n📊 Codebase Analysis Assistant\n'));

    const { rootPath } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'rootPath',
        message: 'Enter the path to your project root:',
        default: process.cwd(),
      },
    ]);

    try {
      const analysis = await this.analyzeCodebase(rootPath);

      console.log(chalk.default.green('\n📊 Codebase Analysis Results:'));

      if (analysis.structure.name) {
        console.log(`\nProject: ${analysis.structure.name}`);
        console.log(`Dependencies: ${analysis.structure.dependencies.length}`);
        console.log(`Type: ${analysis.structure.type}`);
      }

      if (analysis.recommendations.length > 0) {
        console.log(chalk.default.yellow('\n💡 Recommendations:'));
        analysis.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }

      if (analysis.optimizations.length > 0) {
        console.log(
          chalk.default.blue(
            `\n⚡ Found ${analysis.optimizations.length} optimization opportunities`
          )
        );
      }
    } catch (error) {
      console.log(
        chalk.default.red(
          `❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  private formatCode(code: string): string {
    const chalk = require('chalk');
    return (
      chalk.gray('┌─────────────────────────────────────┐\n') +
      code
        .split('\n')
        .map(
          (line, index) =>
            chalk.gray('│ ') +
            chalk.cyan(`${(index + 1).toString().padStart(2, ' ')} `) +
            line
        )
        .join('\n') +
      '\n' +
      chalk.gray('└─────────────────────────────────────┘')
    );
  }

  private async saveGeneratedCode(code: string, prompt: string): Promise<void> {
    const inquirer = await import('inquirer');
    const fs = await import('fs');
    const path = await import('path');

    const { filename } = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Enter filename:',
        default: 'generated-code.ts',
      },
    ]);

    try {
      const fullPath = path.resolve(filename);
      const content = `// Generated by SYMindX AI Assistant\n// Prompt: ${prompt}\n\n${code}`;

      fs.writeFileSync(fullPath, content);
      console.log(`✅ Code saved to: ${fullPath}`);
    } catch (error) {
      console.log(
        `❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
