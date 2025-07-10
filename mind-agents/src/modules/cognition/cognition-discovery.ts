/**
 * Cognition Discovery System for SYMindX
 *
 * This module provides automatic discovery and registration of cognition modules,
 * making it easy for users to add new reasoning approaches without modifying core files.
 */

import * as fs from 'fs';
import * as path from 'path';

import { ModuleRegistry } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';

export interface CognitionPackage {
  name: string;
  version: string;
  main: string;
  symindx?: {
    cognition: {
      type: string;
      factory: string;
      autoRegister?: boolean;
      paradigms?: string[];
      category?: 'basic' | 'advanced' | 'specialized' | 'experimental';
    };
  };
}

export interface DiscoveredCognition {
  name: string;
  path: string;
  factory: string;
  type: string;
  category: string;
  paradigms: string[];
  packageInfo: CognitionPackage;
}

/**
 * Cognition Discovery Manager
 */
export class CognitionDiscovery {
  private cognitionDir: string;
  private nodeModulesDir: string;

  constructor(projectRoot: string) {
    this.cognitionDir = path.join(projectRoot, 'src', 'modules', 'cognition');
    this.nodeModulesDir = path.join(projectRoot, 'node_modules');
  }

  /**
   * Discover all available cognition modules
   */
  async discoverCognitions(): Promise<DiscoveredCognition[]> {
    const cognitions: DiscoveredCognition[] = [];

    // 1. Discover built-in cognition modules (in src/modules/cognition/)
    const builtInCognitions = await this.discoverBuiltInCognitions();
    cognitions.push(...builtInCognitions);

    // 2. Discover node_modules cognition modules (packages with symindx.cognition config)
    const nodeModuleCognitions = await this.discoverNodeModuleCognitions();
    cognitions.push(...nodeModuleCognitions);

    // 3. Discover local cognition packages (in cognitions/ directory if it exists)
    const localCognitions = await this.discoverLocalCognitions();
    cognitions.push(...localCognitions);

    runtimeLogger.info(`🔍 Discovered ${cognitions.length} cognition modules`);
    return cognitions;
  }

  /**
   * Discover built-in cognition modules in src/modules/cognition/
   */
  private async discoverBuiltInCognitions(): Promise<DiscoveredCognition[]> {
    const cognitions: DiscoveredCognition[] = [];

    try {
      if (!fs.existsSync(this.cognitionDir)) {
        return cognitions;
      }

      const entries = fs.readdirSync(this.cognitionDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory() && !this.isSystemFile(entry.name)) {
          const cognitionPath = path.join(this.cognitionDir, entry.name);
          const indexPath = path.join(cognitionPath, 'index.ts');
          const packageJsonPath = path.join(cognitionPath, 'package.json');

          if (fs.existsSync(indexPath)) {
            let packageInfo: CognitionPackage = {
              name: entry.name,
              version: '1.0.0',
              main: 'index.ts',
            };

            // Try to load package.json if it exists
            if (fs.existsSync(packageJsonPath)) {
              try {
                const packageContent = fs.readFileSync(
                  packageJsonPath,
                  'utf-8'
                );
                packageInfo = JSON.parse(packageContent);
              } catch (error) {
                runtimeLogger.warn(
                  `⚠️ Failed to parse package.json for ${entry.name}:`,
                  error
                );
              }
            }

            cognitions.push({
              name: entry.name,
              path: cognitionPath,
              factory: `create${this.toPascalCase(entry.name)}Cognition`,
              type: 'built-in',
              category: this.inferCognitionCategory(entry.name),
              paradigms: this.getDefaultParadigms(entry.name),
              packageInfo,
            });
          }
        }
      }
    } catch (error) {
      runtimeLogger.warn(
        '⚠️ Failed to discover built-in cognition modules:',
        error
      );
    }

    return cognitions;
  }

  /**
   * Discover cognition modules in node_modules (packages with symindx.cognition config)
   */
  private async discoverNodeModuleCognitions(): Promise<DiscoveredCognition[]> {
    const cognitions: DiscoveredCognition[] = [];

    try {
      if (!fs.existsSync(this.nodeModulesDir)) {
        return cognitions;
      }

      const entries = fs.readdirSync(this.nodeModulesDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packagePath = path.join(this.nodeModulesDir, entry.name);
          const packageJsonPath = path.join(packagePath, 'package.json');

          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
              const packageInfo: CognitionPackage = JSON.parse(packageContent);

              // Check if this is a SYMindX cognition module
              if (packageInfo.symindx?.cognition) {
                const cognitionConfig = packageInfo.symindx.cognition;

                cognitions.push({
                  name: packageInfo.name,
                  path: packagePath,
                  factory: cognitionConfig.factory,
                  type: cognitionConfig.type,
                  category: cognitionConfig.category || 'basic',
                  paradigms: cognitionConfig.paradigms || [],
                  packageInfo,
                });
              }
            } catch (error) {
              // Ignore packages with invalid package.json
            }
          }
        }
      }
    } catch (error) {
      runtimeLogger.warn(
        '⚠️ Failed to discover node_modules cognition modules:',
        error
      );
    }

    return cognitions;
  }

  /**
   * Discover local cognition packages (in project cognitions/ directory)
   */
  private async discoverLocalCognitions(): Promise<DiscoveredCognition[]> {
    const cognitions: DiscoveredCognition[] = [];
    const localCognitionsDir = path.join(
      path.dirname(this.cognitionDir),
      '..',
      '..',
      'cognitions'
    );

    try {
      if (!fs.existsSync(localCognitionsDir)) {
        return cognitions;
      }

      const entries = fs.readdirSync(localCognitionsDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const cognitionPath = path.join(localCognitionsDir, entry.name);
          const packageJsonPath = path.join(cognitionPath, 'package.json');

          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
              const packageInfo: CognitionPackage = JSON.parse(packageContent);

              if (packageInfo.symindx?.cognition) {
                const cognitionConfig = packageInfo.symindx.cognition;

                cognitions.push({
                  name: packageInfo.name,
                  path: cognitionPath,
                  factory: cognitionConfig.factory,
                  type: cognitionConfig.type,
                  category: cognitionConfig.category || 'basic',
                  paradigms: cognitionConfig.paradigms || [],
                  packageInfo,
                });
              }
            } catch (error) {
              runtimeLogger.warn(
                `⚠️ Failed to parse package.json for local cognition ${entry.name}:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      runtimeLogger.warn(
        '⚠️ Failed to discover local cognition modules:',
        error
      );
    }

    return cognitions;
  }

  /**
   * Auto-register discovered cognition modules with the registry
   */
  async autoRegisterCognitions(registry: ModuleRegistry): Promise<void> {
    const cognitions = await this.discoverCognitions();
    const registeredCognitions: string[] = [];

    for (const cognition of cognitions) {
      try {
        // Only auto-register if explicitly enabled or it's a built-in cognition
        const shouldAutoRegister =
          cognition.packageInfo.symindx?.cognition?.autoRegister !== false;

        if (shouldAutoRegister) {
          await this.registerCognition(registry, cognition);
          registeredCognitions.push(cognition.name);
        }
      } catch (error) {
        runtimeLogger.warn(
          `⚠️ Failed to auto-register cognition ${cognition.name}:`,
          error
        );
      }
    }

    if (registeredCognitions.length > 0) {
      runtimeLogger.info(
        `🧠 Cognition modules registered: ${registeredCognitions.join(', ')}`
      );
    }
  }

  /**
   * Register a specific cognition module with the registry
   */
  async registerCognition(
    registry: ModuleRegistry,
    cognition: DiscoveredCognition
  ): Promise<void> {
    try {
      let modulePath: string;

      if (cognition.type === 'built-in') {
        // Built-in cognition - use relative import
        modulePath = path.join(cognition.path, 'index');
      } else {
        // External cognition - use the main field from package.json
        modulePath = path.join(
          cognition.path,
          cognition.packageInfo.main || 'index'
        );
      }

      const cognitionModule = await import(modulePath);
      const factory = cognitionModule[cognition.factory];

      if (typeof factory === 'function') {
        registry.registerCognitionFactory(cognition.name, factory);
        // Individual registration logs removed - summary logged after all registrations
      } else {
        runtimeLogger.warn(
          `⚠️ Cognition ${cognition.name} does not export factory function ${cognition.factory}`
        );
      }
    } catch (error) {
      runtimeLogger.error(
        `❌ Failed to register cognition ${cognition.name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all discovered cognition categories
   */
  async getCognitionCategories(): Promise<string[]> {
    const cognitions = await this.discoverCognitions();
    const categories = new Set(
      cognitions.map((cognition) => cognition.category)
    );
    return Array.from(categories).sort();
  }

  /**
   * Get cognition modules by category
   */
  async getCognitionsByCategory(
    category: string
  ): Promise<DiscoveredCognition[]> {
    const cognitions = await this.discoverCognitions();
    return cognitions.filter((cognition) => cognition.category === category);
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Check if file/directory is a system file that should be ignored
   */
  private isSystemFile(name: string): boolean {
    const systemFiles = [
      'cognition.ts',
      'cognition-discovery.ts',
      'index.ts',
      'package.json',
      'hybrid-reasoning.ts',
      'learning-persistence.ts',
      'meta-reasoner.ts',
      'pddl-planner.ts',
      'probabilistic-reasoning.ts',
      'reinforcement-learning.ts',
      'rule-based-reasoning.ts',
      'theory-of-mind.ts',
    ];
    return systemFiles.includes(name);
  }

  /**
   * Infer cognition category from name
   */
  private inferCognitionCategory(cognitionName: string): string {
    const basicCognitions = ['reactive', 'unified', 'simple'];
    const advancedCognitions = ['htn-planner', 'hybrid', 'meta-reasoner'];
    const specializedCognitions = [
      'theory-of-mind',
      'probabilistic',
      'rule-based',
    ];
    const experimentalCognitions = ['quantum', 'neural', 'evolutionary'];

    if (basicCognitions.includes(cognitionName)) return 'basic';
    if (advancedCognitions.includes(cognitionName)) return 'advanced';
    if (specializedCognitions.includes(cognitionName)) return 'specialized';
    if (experimentalCognitions.includes(cognitionName)) return 'experimental';

    return 'basic'; // default
  }

  /**
   * Get default paradigms for common cognition modules
   */
  private getDefaultParadigms(cognitionName: string): string[] {
    const paradigmMap: Record<string, string[]> = {
      reactive: ['reactive', 'stimulus-response'],
      'htn-planner': ['hierarchical', 'planning', 'goal-oriented'],
      hybrid: ['reactive', 'planning', 'multi-paradigm'],
      unified: ['adaptive', 'multi-modal', 'context-aware'],
      'theory-of-mind': ['social', 'mental-modeling', 'perspective-taking'],
      probabilistic: ['bayesian', 'uncertainty', 'statistical'],
      'rule-based': ['logical', 'rule-driven', 'expert-system'],
    };

    return paradigmMap[cognitionName] || ['general'];
  }
}

/**
 * Create cognition discovery instance
 */
export function createCognitionDiscovery(
  projectRoot: string
): CognitionDiscovery {
  return new CognitionDiscovery(projectRoot);
}
