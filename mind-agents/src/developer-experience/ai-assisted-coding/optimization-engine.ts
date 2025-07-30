/**
 * Optimization Engine
 * Analyzes code for performance, maintainability, and best practice improvements
 */

import { EventEmitter } from 'events';
import { CodeOptimizationSuggestion } from '../types/index.js';

export class OptimizationEngine extends EventEmitter {
  private rules: Map<string, OptimizationRule>;
  private initialized = false;

  constructor() {
    super();
    this.rules = new Map();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('⚡ Initializing Optimization Engine...');

    this.loadOptimizationRules();
    this.initialized = true;
  }

  async optimizeCode(
    code: string,
    options?: {
      focusAreas?: string[];
      aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
    }
  ): Promise<CodeOptimizationSuggestion[]> {
    const suggestions: CodeOptimizationSuggestion[] = [];
    const lines = code.split('\n');

    const aggressiveness = options?.aggressiveness || 'moderate';
    const focusAreas = options?.focusAreas || [
      'performance',
      'maintainability',
      'best-practices',
    ];

    // Apply optimization rules
    for (const rule of this.rules.values()) {
      // Skip rules not in focus areas
      if (!focusAreas.some((area) => rule.categories.includes(area))) {
        continue;
      }

      // Skip aggressive rules if not in aggressive mode
      if (
        rule.aggressiveness === 'aggressive' &&
        aggressiveness !== 'aggressive'
      ) {
        continue;
      }

      const ruleSuggestions = await this.applyRule(rule, code, lines);
      suggestions.push(...ruleSuggestions);
    }

    // Sort by priority and line number
    const sortedSuggestions = this.prioritizeSuggestions(suggestions);

    this.emit('optimization-analyzed', {
      code,
      suggestions: sortedSuggestions,
    });

    return sortedSuggestions;
  }

  async analyzeCode(code: string): Promise<CodeOptimizationSuggestion[]> {
    return this.optimizeCode(code, { aggressiveness: 'conservative' });
  }

  private loadOptimizationRules(): void {
    // Performance optimizations
    this.rules.set('async-await-error-handling', {
      id: 'async-await-error-handling',
      name: 'Add Error Handling for Async Operations',
      categories: ['performance', 'reliability'],
      aggressiveness: 'conservative',
      pattern: /await\s+[^;]+(?!.*catch)/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        lines.forEach((line, index) => {
          if (line.includes('await') && !this.hasErrorHandling(lines, index)) {
            suggestions.push({
              id: `async-error-${index}`,
              line: index + 1,
              column: line.indexOf('await'),
              message: 'Consider adding error handling for async operation',
              severity: 'warning',
              aiExplanation:
                'Unhandled async operations can cause uncaught promise rejections. Adding try-catch blocks makes your code more robust.',
              fix: {
                description: 'Wrap in try-catch block',
                changes: [
                  {
                    range: {
                      start: { line: index, character: 0 },
                      end: { line: index + 1, character: 0 },
                    },
                    newText: `try {\n  ${line}\n} catch (error) {\n  console.error('Error:', error);\n}\n`,
                  },
                ],
              },
            });
          }
        });

        return suggestions;
      },
    });

    this.rules.set('console-log-removal', {
      id: 'console-log-removal',
      name: 'Remove Console.log Statements',
      categories: ['best-practices', 'production-ready'],
      aggressiveness: 'moderate',
      pattern: /console\.log/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        lines.forEach((line, index) => {
          if (line.includes('console.log') && !line.includes('//')) {
            suggestions.push({
              id: `console-log-${index}`,
              line: index + 1,
              column: line.indexOf('console.log'),
              message: 'Remove console.log statement for production',
              severity: 'hint',
              aiExplanation:
                'Console.log statements should be removed or replaced with proper logging in production code.',
              fix: {
                description: 'Remove console.log statement',
                changes: [
                  {
                    range: {
                      start: { line: index, character: 0 },
                      end: { line: index + 1, character: 0 },
                    },
                    newText: '',
                  },
                ],
              },
            });
          }
        });

        return suggestions;
      },
    });

    this.rules.set('typescript-any-usage', {
      id: 'typescript-any-usage',
      name: 'Avoid Using "any" Type',
      categories: ['type-safety', 'maintainability'],
      aggressiveness: 'conservative',
      pattern: /:\s*any/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        lines.forEach((line, index) => {
          const anyMatch = line.match(/:\s*any/);
          if (anyMatch) {
            suggestions.push({
              id: `any-type-${index}`,
              line: index + 1,
              column: anyMatch.index || 0,
              message: 'Avoid using "any" type, use specific types instead',
              severity: 'warning',
              aiExplanation:
                'The "any" type defeats the purpose of TypeScript\'s type system. Consider using specific types, unions, or generics for better type safety.',
              fix: {
                description: 'Replace with specific type',
                changes: [
                  {
                    range: {
                      start: { line: index, character: anyMatch.index || 0 },
                      end: {
                        line: index,
                        character: (anyMatch.index || 0) + anyMatch[0].length,
                      },
                    },
                    newText: ': unknown',
                  },
                ],
              },
            });
          }
        });

        return suggestions;
      },
    });

    this.rules.set('inefficient-loops', {
      id: 'inefficient-loops',
      name: 'Optimize Loop Performance',
      categories: ['performance'],
      aggressiveness: 'moderate',
      pattern: /for\s*\(.*\.length.*\)/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        lines.forEach((line, index) => {
          const loopMatch = line.match(/for\s*\([^;]*;\s*[^;]*\.length/);
          if (loopMatch) {
            suggestions.push({
              id: `inefficient-loop-${index}`,
              line: index + 1,
              column: loopMatch.index || 0,
              message: 'Cache array length for better performance',
              severity: 'info',
              aiExplanation:
                'Accessing .length property in each iteration can be inefficient for large arrays. Cache the length value outside the loop.',
              fix: {
                description: 'Cache array length',
                changes: [
                  {
                    range: {
                      start: { line: index, character: 0 },
                      end: { line: index, character: line.length },
                    },
                    newText: line.replace(
                      /for\s*\(([^;]*);([^;]*)(\.length[^;]*);([^)]*)\)/,
                      'const length = $2.length;\nfor ($1; $2 < length; $4)'
                    ),
                  },
                ],
              },
            });
          }
        });

        return suggestions;
      },
    });

    this.rules.set('memory-leaks', {
      id: 'memory-leaks',
      name: 'Prevent Memory Leaks',
      categories: ['performance', 'memory'],
      aggressiveness: 'conservative',
      pattern: /setTimeout|setInterval/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        lines.forEach((line, index) => {
          if (line.includes('setTimeout') && !code.includes('clearTimeout')) {
            suggestions.push({
              id: `memory-leak-timeout-${index}`,
              line: index + 1,
              column: line.indexOf('setTimeout'),
              message: 'Consider clearing timeout to prevent memory leaks',
              severity: 'warning',
              aiExplanation:
                'Timeouts should be cleared when no longer needed to prevent memory leaks, especially in components that can be unmounted.',
            });
          }

          if (line.includes('setInterval') && !code.includes('clearInterval')) {
            suggestions.push({
              id: `memory-leak-interval-${index}`,
              line: index + 1,
              column: line.indexOf('setInterval'),
              message: 'Consider clearing interval to prevent memory leaks',
              severity: 'warning',
              aiExplanation:
                'Intervals should be cleared when no longer needed to prevent memory leaks and unwanted repeated execution.',
            });
          }
        });

        return suggestions;
      },
    });

    // SYMindX-specific optimizations
    this.rules.set('symindx-agent-creation', {
      id: 'symindx-agent-creation',
      name: 'Optimize SYMindX Agent Creation',
      categories: ['symindx', 'performance'],
      aggressiveness: 'moderate',
      pattern: /createAgent.*await.*createAgent/s,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        // Check for sequential agent creation that could be parallelized
        const createAgentMatches = [
          ...code.matchAll(/await runtime\.createAgent/g),
        ];
        if (createAgentMatches.length > 1) {
          suggestions.push({
            id: 'parallel-agent-creation',
            line: 1,
            column: 0,
            message: 'Consider creating multiple agents in parallel',
            severity: 'info',
            aiExplanation:
              'Creating multiple agents sequentially is slower than creating them in parallel using Promise.all().',
            fix: {
              description: 'Use Promise.all for parallel creation',
              changes: [
                {
                  range: {
                    start: { line: 0, character: 0 },
                    end: { line: lines.length, character: 0 },
                  },
                  newText:
                    '// Consider using Promise.all() for parallel agent creation\n' +
                    code,
                },
              ],
            },
          });
        }

        return suggestions;
      },
    });

    this.rules.set('symindx-memory-config', {
      id: 'symindx-memory-config',
      name: 'Optimize Memory Provider Configuration',
      categories: ['symindx', 'performance'],
      aggressiveness: 'moderate',
      pattern: /memory.*provider.*sqlite/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        lines.forEach((line, index) => {
          if (
            line.includes('provider: "sqlite"') &&
            !line.includes('maxRecords')
          ) {
            suggestions.push({
              id: `memory-config-${index}`,
              line: index + 1,
              column: 0,
              message: 'Consider setting maxRecords for memory provider',
              severity: 'info',
              aiExplanation:
                'Setting maxRecords helps prevent unlimited memory growth and improves performance.',
              fix: {
                description: 'Add maxRecords configuration',
                changes: [
                  {
                    range: {
                      start: { line: index, character: line.length },
                      end: { line: index, character: line.length },
                    },
                    newText: ',\n  maxRecords: 10000',
                  },
                ],
              },
            });
          }
        });

        return suggestions;
      },
    });

    this.rules.set('symindx-error-handling', {
      id: 'symindx-error-handling',
      name: 'Add SYMindX-specific Error Handling',
      categories: ['symindx', 'reliability'],
      aggressiveness: 'conservative',
      pattern: /runtime\.(createAgent|startAgent|sendMessage)/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        lines.forEach((line, index) => {
          const runtimeMethods = ['createAgent', 'startAgent', 'sendMessage'];

          for (const method of runtimeMethods) {
            if (
              line.includes(`runtime.${method}`) &&
              !this.hasErrorHandling(lines, index)
            ) {
              suggestions.push({
                id: `symindx-error-${method}-${index}`,
                line: index + 1,
                column: line.indexOf(`runtime.${method}`),
                message: `Add error handling for runtime.${method}()`,
                severity: 'warning',
                aiExplanation: `SYMindX runtime methods can throw specific errors. Adding proper error handling improves reliability.`,
                fix: {
                  description:
                    'Add try-catch with SYMindX-specific error handling',
                  changes: [
                    {
                      range: {
                        start: { line: index, character: 0 },
                        end: { line: index + 1, character: 0 },
                      },
                      newText: `try {\n  ${line}\n} catch (error) {\n  if (error.message.includes('Agent not found')) {\n    console.error('Agent does not exist:', error);\n  } else {\n    console.error('Runtime error:', error);\n  }\n}\n`,
                    },
                  ],
                },
              });
            }
          }
        });

        return suggestions;
      },
    });

    // Code style and best practices
    this.rules.set('unused-imports', {
      id: 'unused-imports',
      name: 'Remove Unused Imports',
      categories: ['best-practices', 'maintainability'],
      aggressiveness: 'conservative',
      pattern: /import.*from/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];
        const imports: Array<{
          line: number;
          imports: string[];
          module: string;
        }> = [];

        // Find all imports
        lines.forEach((line, index) => {
          const importMatch = line.match(
            /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/
          );
          if (importMatch) {
            const importedItems = importMatch[1]
              .split(',')
              .map((item) => item.trim());
            imports.push({
              line: index,
              imports: importedItems,
              module: importMatch[2],
            });
          }
        });

        // Check if imports are used
        for (const importInfo of imports) {
          const unusedImports = importInfo.imports.filter((importItem) => {
            const usage = new RegExp(
              `\\b${importItem.replace(/\s+as\s+\w+/, '')}\\b`
            );
            return !usage.test(
              code.substring(
                code.indexOf('\n', code.indexOf(importInfo.module))
              )
            );
          });

          if (unusedImports.length > 0) {
            suggestions.push({
              id: `unused-import-${importInfo.line}`,
              line: importInfo.line + 1,
              column: 0,
              message: `Unused imports: ${unusedImports.join(', ')}`,
              severity: 'hint',
              aiExplanation:
                'Unused imports increase bundle size and clutter the code. Remove them for cleaner code.',
              fix: {
                description: 'Remove unused imports',
                changes: [
                  {
                    range: {
                      start: { line: importInfo.line, character: 0 },
                      end: {
                        line: importInfo.line,
                        character: lines[importInfo.line].length,
                      },
                    },
                    newText: lines[importInfo.line].replace(
                      new RegExp(`\\b${unusedImports.join('|')}\\b,?\\s*`, 'g'),
                      ''
                    ),
                  },
                ],
              },
            });
          }
        }

        return suggestions;
      },
    });

    this.rules.set('function-complexity', {
      id: 'function-complexity',
      name: 'Reduce Function Complexity',
      categories: ['maintainability', 'readability'],
      aggressiveness: 'aggressive',
      pattern: /function|=>/,
      check: (code: string, lines: string[]) => {
        const suggestions: CodeOptimizationSuggestion[] = [];

        // Simple heuristic for function complexity
        let functionStart = -1;
        let braceCount = 0;
        let complexity = 0;

        lines.forEach((line, index) => {
          if (
            (line.includes('function') || line.includes('=>')) &&
            functionStart === -1
          ) {
            functionStart = index;
            complexity = 0;
          }

          if (functionStart !== -1) {
            // Count complexity indicators
            complexity += (
              line.match(/if|else|for|while|switch|case|catch|\?\?|\|\||&&/g) ||
              []
            ).length;

            // Track braces
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;

            // Function ended
            if (braceCount === 0 && functionStart !== -1) {
              if (complexity > 10) {
                suggestions.push({
                  id: `complex-function-${functionStart}`,
                  line: functionStart + 1,
                  column: 0,
                  message: `Function has high complexity (${complexity}). Consider breaking it down.`,
                  severity: 'info',
                  aiExplanation:
                    'Functions with high cyclomatic complexity are harder to understand, test, and maintain. Consider extracting smaller functions.',
                });
              }
              functionStart = -1;
            }
          }
        });

        return suggestions;
      },
    });
  }

  private async applyRule(
    rule: OptimizationRule,
    code: string,
    lines: string[]
  ): Promise<CodeOptimizationSuggestion[]> {
    try {
      return rule.check(code, lines);
    } catch (error) {
      console.warn(`Error applying optimization rule ${rule.id}:`, error);
      return [];
    }
  }

  private hasErrorHandling(lines: string[], currentIndex: number): boolean {
    // Look for try-catch blocks around the current line
    const searchRange = 5; // Check 5 lines above and below
    const start = Math.max(0, currentIndex - searchRange);
    const end = Math.min(lines.length, currentIndex + searchRange);

    const contextLines = lines.slice(start, end).join('\n');
    return contextLines.includes('try') && contextLines.includes('catch');
  }

  private prioritizeSuggestions(
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

  // Public utility methods
  async generateOptimizationReport(code: string): Promise<{
    summary: {
      totalSuggestions: number;
      byCategory: Record<string, number>;
      bySeverity: Record<string, number>;
    };
    suggestions: CodeOptimizationSuggestion[];
    recommendations: string[];
  }> {
    const suggestions = await this.optimizeCode(code);

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    suggestions.forEach((suggestion) => {
      // Count by severity
      bySeverity[suggestion.severity] =
        (bySeverity[suggestion.severity] || 0) + 1;

      // Count by category (extract from suggestion ID or aiExplanation)
      const category = this.extractCategory(suggestion);
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    const recommendations = this.generateRecommendations(suggestions);

    return {
      summary: {
        totalSuggestions: suggestions.length,
        byCategory,
        bySeverity,
      },
      suggestions,
      recommendations,
    };
  }

  async validateOptimization(
    originalCode: string,
    optimizedCode: string
  ): Promise<{
    isValid: boolean;
    improvements: string[];
    regressions: string[];
    score: number;
  }> {
    const originalSuggestions = await this.optimizeCode(originalCode);
    const optimizedSuggestions = await this.optimizeCode(optimizedCode);

    const improvements: string[] = [];
    const regressions: string[] = [];

    // Calculate improvement score
    const originalIssues = originalSuggestions.length;
    const optimizedIssues = optimizedSuggestions.length;
    const improvement = originalIssues - optimizedIssues;

    if (improvement > 0) {
      improvements.push(`Resolved ${improvement} optimization issues`);
    } else if (improvement < 0) {
      regressions.push(`Introduced ${Math.abs(improvement)} new issues`);
    }

    // Check for specific improvements
    const originalErrors = originalSuggestions.filter(
      (s) => s.severity === 'error'
    ).length;
    const optimizedErrors = optimizedSuggestions.filter(
      (s) => s.severity === 'error'
    ).length;

    if (optimizedErrors < originalErrors) {
      improvements.push(`Fixed ${originalErrors - optimizedErrors} errors`);
    }

    const score = Math.max(0, Math.min(100, 50 + improvement * 10));

    return {
      isValid: optimizedIssues <= originalIssues,
      improvements,
      regressions,
      score,
    };
  }

  private extractCategory(suggestion: CodeOptimizationSuggestion): string {
    if (suggestion.id.includes('symindx')) return 'SYMindX';
    if (suggestion.id.includes('performance')) return 'Performance';
    if (suggestion.id.includes('memory')) return 'Memory';
    if (suggestion.id.includes('type')) return 'TypeScript';
    if (suggestion.id.includes('error')) return 'Error Handling';
    return 'General';
  }

  private generateRecommendations(
    suggestions: CodeOptimizationSuggestion[]
  ): string[] {
    const recommendations: string[] = [];

    const errorCount = suggestions.filter((s) => s.severity === 'error').length;
    const warningCount = suggestions.filter(
      (s) => s.severity === 'warning'
    ).length;

    if (errorCount > 0) {
      recommendations.push(`Address ${errorCount} critical errors first`);
    }

    if (warningCount > 3) {
      recommendations.push(
        'Consider addressing warnings to improve code quality'
      );
    }

    const symindxIssues = suggestions.filter((s) =>
      s.id.includes('symindx')
    ).length;
    if (symindxIssues > 0) {
      recommendations.push(
        'Review SYMindX-specific optimizations for better performance'
      );
    }

    if (suggestions.length > 10) {
      recommendations.push(
        'Consider refactoring to address multiple optimization opportunities'
      );
    } else if (suggestions.length === 0) {
      recommendations.push(
        'Great! Your code follows optimization best practices'
      );
    }

    return recommendations;
  }
}

// Supporting interfaces
interface OptimizationRule {
  id: string;
  name: string;
  categories: string[];
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  pattern: RegExp;
  check: (code: string, lines: string[]) => CodeOptimizationSuggestion[];
}
