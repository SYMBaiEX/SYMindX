/**
 * Emotion Discovery System for SYMindX
 *
 * This module provides automatic discovery and registration of emotions,
 * making it easy for users to add new emotions without modifying core files.
 */

import * as fs from 'fs';
import * as path from 'path';

import { ModuleRegistry } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';

export interface EmotionPackage {
  name: string;
  version: string;
  main: string;
  symindx?: {
    emotion: {
      type: string;
      factory: string;
      autoRegister?: boolean;
      triggers?: string[];
      category?: 'basic' | 'complex' | 'social' | 'cognitive';
    };
  };
}

export interface DiscoveredEmotion {
  name: string;
  path: string;
  factory: string;
  type: string;
  category: string;
  triggers: string[];
  packageInfo: EmotionPackage;
}

/**
 * Emotion Discovery Manager
 */
export class EmotionDiscovery {
  private emotionsDir: string;
  private nodeModulesDir: string;

  constructor(projectRoot: string) {
    this.emotionsDir = path.join(projectRoot, 'src', 'modules', 'emotion');
    this.nodeModulesDir = path.join(projectRoot, 'node_modules');
  }

  /**
   * Discover all available emotions
   */
  async discoverEmotions(): Promise<DiscoveredEmotion[]> {
    const emotions: DiscoveredEmotion[] = [];

    // 1. Discover built-in emotions (in src/modules/emotion/)
    const builtInEmotions = await this.discoverBuiltInEmotions();
    emotions.push(...builtInEmotions);

    // 2. Discover node_modules emotions (packages with symindx.emotion config)
    const nodeModuleEmotions = await this.discoverNodeModuleEmotions();
    emotions.push(...nodeModuleEmotions);

    // 3. Discover local emotion packages (in emotions/ directory if it exists)
    const localEmotions = await this.discoverLocalEmotions();
    emotions.push(...localEmotions);

    runtimeLogger.info(`🔍 Discovered ${emotions.length} emotions`);
    return emotions;
  }

  /**
   * Discover built-in emotions in src/modules/emotion/
   */
  private async discoverBuiltInEmotions(): Promise<DiscoveredEmotion[]> {
    const emotions: DiscoveredEmotion[] = [];

    try {
      if (!fs.existsSync(this.emotionsDir)) {
        return emotions;
      }

      const entries = fs.readdirSync(this.emotionsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !['base-emotion.ts', 'composite-emotion.ts'].includes(entry.name)
        ) {
          const emotionPath = path.join(this.emotionsDir, entry.name);
          const indexPath = path.join(emotionPath, 'index.ts');
          const packageJsonPath = path.join(emotionPath, 'package.json');

          if (fs.existsSync(indexPath)) {
            let packageInfo: EmotionPackage = {
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
                void error;
                runtimeLogger.warn(
                  `⚠️ Failed to parse package.json for ${entry.name}:`,
                  {
                    error: {
                      code: 'PARSE_ERROR',
                      message:
                        error instanceof Error ? error.message : String(error),
                      ...(error instanceof Error && error.stack
                        ? { stack: error.stack }
                        : {}),
                    },
                    metadata: { emotion: entry.name },
                  }
                );
              }
            }

            emotions.push({
              name: entry.name,
              path: emotionPath,
              factory: `create${this.toPascalCase(entry.name)}Emotion`,
              type: 'built-in',
              category: this.inferEmotionCategory(entry.name),
              triggers: this.getDefaultTriggers(entry.name),
              packageInfo,
            });
          }
        }
      }
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to discover built-in emotions:', {
        error: {
          code: 'DISCOVERY_ERROR',
          message: error instanceof Error ? error.message : String(error),
          ...(error instanceof Error && error.stack
            ? { stack: error.stack }
            : {}),
        },
        metadata: { directory: this.emotionsDir },
      });
    }

    return emotions;
  }

  /**
   * Discover emotions in node_modules (packages with symindx.emotion config)
   */
  private async discoverNodeModuleEmotions(): Promise<DiscoveredEmotion[]> {
    const emotions: DiscoveredEmotion[] = [];

    try {
      if (!fs.existsSync(this.nodeModulesDir)) {
        return emotions;
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
              const packageInfo: EmotionPackage = JSON.parse(packageContent);

              // Check if this is a SYMindX emotion
              if (packageInfo.symindx?.emotion) {
                const emotionConfig = packageInfo.symindx.emotion;

                emotions.push({
                  name: packageInfo.name,
                  path: packagePath,
                  factory: emotionConfig.factory,
                  type: emotionConfig.type,
                  category: emotionConfig.category || 'basic',
                  triggers: emotionConfig.triggers || [],
                  packageInfo,
                });
              }
            } catch {
              // Ignore packages with invalid package.json
            }
          }
        }
      }
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to discover node_modules emotions:', {
        error: {
          code: 'NODE_MODULES_DISCOVERY_ERROR',
          message: error instanceof Error ? error.message : String(error),
          ...(error instanceof Error && error.stack
            ? { stack: error.stack }
            : {}),
        },
        metadata: { directory: this.nodeModulesDir },
      });
    }

    return emotions;
  }

  /**
   * Discover local emotion packages (in project emotions/ directory)
   */
  private async discoverLocalEmotions(): Promise<DiscoveredEmotion[]> {
    const emotions: DiscoveredEmotion[] = [];
    const localEmotionsDir = path.join(
      path.dirname(this.emotionsDir),
      '..',
      '..',
      'emotions'
    );

    try {
      if (!fs.existsSync(localEmotionsDir)) {
        return emotions;
      }

      const entries = fs.readdirSync(localEmotionsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const emotionPath = path.join(localEmotionsDir, entry.name);
          const packageJsonPath = path.join(emotionPath, 'package.json');

          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
              const packageInfo: EmotionPackage = JSON.parse(packageContent);

              if (packageInfo.symindx?.emotion) {
                const emotionConfig = packageInfo.symindx.emotion;

                emotions.push({
                  name: packageInfo.name,
                  path: emotionPath,
                  factory: emotionConfig.factory,
                  type: emotionConfig.type,
                  category: emotionConfig.category || 'basic',
                  triggers: emotionConfig.triggers || [],
                  packageInfo,
                });
              }
            } catch (error) {
              void error;
              runtimeLogger.warn(
                `⚠️ Failed to parse package.json for local emotion ${entry.name}:`,
                {
                  error: {
                    code: 'LOCAL_PARSE_ERROR',
                    message:
                      error instanceof Error ? error.message : String(error),
                    ...(error instanceof Error && error.stack
                      ? { stack: error.stack }
                      : {}),
                  },
                  metadata: { emotion: entry.name, path: packageJsonPath },
                }
              );
            }
          }
        }
      }
    } catch (error) {
      void error;
      runtimeLogger.warn('⚠️ Failed to discover local emotions:', {
        error: {
          code: 'LOCAL_DISCOVERY_ERROR',
          message: error instanceof Error ? error.message : String(error),
          ...(error instanceof Error && error.stack
            ? { stack: error.stack }
            : {}),
        },
        metadata: { directory: localEmotionsDir },
      });
    }

    return emotions;
  }

  /**
   * Auto-register discovered emotions with the registry
   */
  async autoRegisterEmotions(registry: ModuleRegistry): Promise<void> {
    const emotions = await this.discoverEmotions();
    const registeredEmotions: string[] = [];

    for (const emotion of emotions) {
      try {
        // Only auto-register if explicitly enabled or it's a built-in emotion
        const shouldAutoRegister =
          emotion.packageInfo.symindx?.emotion?.autoRegister !== false;

        if (shouldAutoRegister) {
          await this.registerEmotion(registry, emotion);
          registeredEmotions.push(emotion.name);
        }
      } catch (error) {
        void error;
        runtimeLogger.warn(
          `⚠️ Failed to auto-register emotion ${emotion.name}:`,
          {
            error: {
              code: 'AUTO_REGISTER_ERROR',
              message: error instanceof Error ? error.message : String(error),
              ...(error instanceof Error && error.stack
                ? { stack: error.stack }
                : {}),
            },
            metadata: { emotion: emotion.name, path: emotion.path },
          }
        );
      }
    }

    if (registeredEmotions.length > 0) {
      runtimeLogger.info(
        `🎭 Emotion modules registered: ${registeredEmotions.join(', ')}`
      );
    }
  }

  /**
   * Register a specific emotion with the registry
   */
  async registerEmotion(
    registry: ModuleRegistry,
    emotion: DiscoveredEmotion
  ): Promise<void> {
    try {
      let modulePath: string;

      if (emotion.type === 'built-in') {
        // Built-in emotion - use relative import
        modulePath = path.join(emotion.path, 'index');
      } else {
        // External emotion - use the main field from package.json
        modulePath = path.join(
          emotion.path,
          emotion.packageInfo.main || 'index'
        );
      }

      const emotionModule = await import(modulePath);
      const factory = emotionModule[emotion.factory];

      if (typeof factory === 'function') {
        registry.registerEmotionFactory(emotion.name, factory);
        // Individual registration logs removed - summary logged after all registrations
      } else {
        runtimeLogger.warn(
          `⚠️ Emotion ${emotion.name} does not export factory function ${emotion.factory}`
        );
      }
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to register emotion ${emotion.name}:`,
        error,
        {
          metadata: {
            emotion: emotion.name,
            path: emotion.path,
            factory: emotion.factory,
          },
        }
      );
      throw error;
    }
  }

  /**
   * Get all discovered emotion categories
   */
  async getEmotionCategories(): Promise<string[]> {
    const emotions = await this.discoverEmotions();
    const categories = new Set(emotions.map((emotion) => emotion.category));
    return Array.from(categories).sort();
  }

  /**
   * Get emotions by category
   */
  async getEmotionsByCategory(category: string): Promise<DiscoveredEmotion[]> {
    const emotions = await this.discoverEmotions();
    return emotions.filter((emotion) => emotion.category === category);
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
   * Infer emotion category from name (simplified to 5 core emotions)
   */
  private inferEmotionCategory(emotionName: string): string {
    const coreEmotions = {
      'happy': 'basic',
      'sad': 'basic', 
      'angry': 'basic',
      'confident': 'cognitive',
      'neutral': 'basic'
    };

    return coreEmotions[emotionName as keyof typeof coreEmotions] || 'basic';
  }

  /**
   * Get default triggers for 5 core emotions
   */
  private getDefaultTriggers(emotionName: string): string[] {
    const triggerMap: Record<string, string[]> = {
      happy: [
        'success',
        'achievement',
        'positive_feedback',
        'praise',
        'victory',
        'joy',
        'celebration',
        'good_news'
      ],
      sad: [
        'failure', 
        'loss', 
        'rejection', 
        'disappointment', 
        'separation',
        'grief',
        'loneliness'
      ],
      angry: [
        'frustration', 
        'injustice', 
        'blocking', 
        'insult', 
        'betrayal',
        'offense',
        'irritation'
      ],
      confident: [
        'success',
        'mastery',
        'recognition',
        'accomplishment',
        'validation',
        'competence',
        'self_assurance'
      ],
      neutral: [
        'baseline', 
        'calm', 
        'default', 
        'steady', 
        'balanced',
        'normal',
        'stable'
      ],
    };

    return triggerMap[emotionName] || ['general_trigger'];
  }
}

/**
 * Create emotion discovery instance
 */
export function createEmotionDiscovery(projectRoot: string): EmotionDiscovery {
  return new EmotionDiscovery(projectRoot);
}
