/**
 * Learning State Persistence System for SYMindX
 *
 * Handles saving and loading of learned knowledge, Q-tables,
 * rules, and other cognitive adaptations across sessions.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { Agent, MemoryRecord, MemoryDuration } from '../../types/agent';
import { Experience } from '../../types/autonomous';
import {
  ReasoningParadigm,
  Rule,
  RuleAction,
  BayesianNetwork,
  ReasoningPerformance,
} from '../../types/cognition';
// import type { LearningCapability } from '../../types/cognition'; - type not used at runtime
// import type { BaseConfig } from '../../types/common'; - type not used at runtime
import { MemoryType } from '../../types/index';
import { runtimeLogger } from '../../utils/logger';
import { buildObject } from '../../utils/type-helpers';

/**
 * Serializable learning state
 */
export interface LearningState {
  agentId: string;
  paradigm: ReasoningParadigm;
  version: string;
  timestamp: Date;

  // Rule-based learning state
  rules?: SerializableRule[];
  factPatterns?: Record<string, number>;
  rulePerformance?: Record<string, number>;

  // Q-learning state
  qTable?: Record<string, Record<string, number>>;
  explorationRate?: number;
  learningRate?: number;
  episodeCount?: number;

  // Probabilistic learning state
  bayesianNetwork?: SerializableBayesianNetwork;
  probabilityUpdates?: Record<string, number>;

  // Performance tracking
  performanceHistory?: ReasoningPerformance[];
  paradigmPerformance?: Record<string, number>;

  // Experience buffer (recent experiences)
  recentExperiences?: SerializableExperience[];

  // Meta-learning
  contextPatterns?: Record<string, string>;
  paradigmSelections?: Array<{
    context: string;
    paradigm: ReasoningParadigm;
    success: boolean;
    timestamp: Date;
  }>;
}

/**
 * Serializable rule format
 */
export interface SerializableRule {
  id: string;
  name: string;
  conditions: Array<{
    type: string;
    expression: string;
    parameters?: Record<string, unknown>;
  }>;
  actions: Array<{
    type: string;
    target: string;
    parameters?: Record<string, unknown>;
  }>;
  priority: number;
  confidence: number;
  usageCount: number;
  successRate: number;
  metadata?: Record<string, unknown>;
}

/**
 * Serializable Bayesian network
 */
export interface SerializableBayesianNetwork {
  nodes: Array<{
    id: string;
    name: string;
    states: string[];
    conditionalProbabilities: Record<string, number>;
    parents: string[];
    children: string[];
  }>;
  edges: Array<{
    from: string;
    to: string;
  }>;
}

/**
 * Serializable experience
 */
export interface SerializableExperience {
  id: string;
  agentId: string;
  state: {
    features: Record<string, number>;
    context: any;
  };
  action: {
    type: string;
    parameters?: Record<string, unknown>;
  };
  reward: {
    type: string;
    value: number;
    source: string;
  };
  nextState: {
    features: Record<string, number>;
    context: any;
  };
  timestamp: Date;
}

/**
 * Learning persistence manager
 */
export class LearningPersistence {
  private dataDirectory: string;
  private saveInterval: number = 300000; // 5 minutes
  private maxBackups: number = 10;
  private compressionEnabled: boolean = true;

  constructor(dataDirectory: string = './data/learning') {
    this.dataDirectory = dataDirectory;
    this.ensureDirectoryExists();

    // Set up auto-save timer for learning data
    this.setupAutoSave();
  }

  /**
   * Set up automatic saving of learning data
   */
  private setupAutoSave(): void {
    setInterval(() => {
      this.performAutoSave();
    }, this.saveInterval);
  }

  /**
   * Perform automatic saving of current learning state
   */
  private async performAutoSave(): Promise<void> {
    try {
      runtimeLogger.debug('🤖 Performing auto-save of learning data');
      // This would save current learning state - implementation depends on specific data to save
      // For now, just log the event
    } catch (error) {
      void error;
      runtimeLogger.error('❌ Failed to auto-save learning data:', error);
    }
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.dataDirectory, { recursive: true });
    } catch (error) {
      void error;
      runtimeLogger.cognition(
        `Failed to create learning data directory: ${error}`
      );
    }
  }

  /**
   * Save learning state for an agent
   */
  async saveLearningState(
    agent: Agent,
    paradigm: ReasoningParadigm,
    state: Partial<LearningState>
  ): Promise<void> {
    try {
      const learningState: LearningState = {
        agentId: agent.id,
        paradigm,
        version: '1.0.0',
        timestamp: new Date(),
        ...state,
      };

      const filename = this.getLearningStateFilename(agent.id, paradigm);
      const filepath = path.join(this.dataDirectory, filename);

      // Create backup of existing state
      await this.createBackup(filepath);

      // Save new state
      const serialized = JSON.stringify(learningState, null, 2);

      // Apply compression if enabled
      if (this.compressionEnabled) {
        const zlib = await import('zlib');
        const compressed = zlib.gzipSync(Buffer.from(serialized, 'utf8'));
        await fs.writeFile(filepath + '.gz', compressed);
        runtimeLogger.debug(`🗜️ Applied compression to learning state file`);
      } else {
        await fs.writeFile(filepath, serialized, 'utf8');
      }

      runtimeLogger.cognition(
        `Saved learning state for ${agent.id}:${paradigm} to ${filename}`
      );
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to save learning state: ${error}`);
    }
  }

  /**
   * Load learning state for an agent
   */
  async loadLearningState(
    agentId: string,
    paradigm: ReasoningParadigm
  ): Promise<LearningState | null> {
    try {
      const filename = this.getLearningStateFilename(agentId, paradigm);
      const filepath = path.join(this.dataDirectory, filename);

      const data = await fs.readFile(filepath, 'utf8');
      const learningState: LearningState = JSON.parse(data);

      // Validate loaded state
      if (this.validateLearningState(learningState)) {
        runtimeLogger.cognition(
          `Loaded learning state for ${agentId}:${paradigm}`
        );
        return learningState;
      } else {
        runtimeLogger.cognition(
          `Invalid learning state format for ${agentId}:${paradigm}`
        );
        return null;
      }
    } catch (error: unknown) {
      if ((error as any)?.code !== 'ENOENT') {
        runtimeLogger.cognition(`Failed to load learning state: ${error}`);
      }
      return null;
    }
  }

  /**
   * Save Q-learning table
   */
  async saveQTable(
    agentId: string,
    qTable: Map<string, Map<string, number>>,
    metadata: {
      explorationRate: number;
      learningRate: number;
      episodeCount: number;
    }
  ): Promise<void> {
    try {
      // Convert Map to serializable format
      const serializable: Record<string, Record<string, number>> = {};
      for (const [state, actions] of Array.from(qTable.entries())) {
        serializable[state] = Object.fromEntries(Array.from(actions.entries()));
      }

      const state: Partial<LearningState> = {
        qTable: serializable,
        explorationRate: metadata.explorationRate,
        learningRate: metadata.learningRate,
        episodeCount: metadata.episodeCount,
      };

      // Create temporary agent object for save
      const tempAgent = { id: agentId } as Agent;
      await this.saveLearningState(
        tempAgent,
        ReasoningParadigm.REINFORCEMENT_LEARNING,
        state
      );
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to save Q-table: ${error}`);
    }
  }

  /**
   * Load Q-learning table
   */
  async loadQTable(agentId: string): Promise<{
    qTable: Map<string, Map<string, number>>;
    explorationRate: number;
    learningRate: number;
    episodeCount: number;
  } | null> {
    try {
      const state = await this.loadLearningState(
        agentId,
        ReasoningParadigm.REINFORCEMENT_LEARNING
      );
      if (!state || !state.qTable) return null;

      // Convert back to Map format
      const qTable = new Map<string, Map<string, number>>();
      for (const [stateKey, actions] of Object.entries(state.qTable)) {
        qTable.set(stateKey, new Map(Object.entries(actions)));
      }

      return {
        qTable,
        explorationRate: state.explorationRate || 0.1,
        learningRate: state.learningRate || 0.1,
        episodeCount: state.episodeCount || 0,
      };
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to load Q-table: ${error}`);
      return null;
    }
  }

  /**
   * Save rules with performance data
   */
  async saveRules(
    agentId: string,
    rules: Map<string, Rule>,
    performance: Map<string, { usageCount: number; successRate: number }>
  ): Promise<void> {
    try {
      const serializableRules: SerializableRule[] = [];

      for (const [id, rule] of Array.from(rules.entries())) {
        const perf = performance.get(id) || { usageCount: 0, successRate: 0.5 };

        const serializableRule = buildObject<SerializableRule>({
          id: rule.id,
          name: rule.name,
          conditions: rule.conditions.map((c) => ({
            type: c.type,
            expression:
              c.expression || `${c.property} ${c.operator} ${c.value}`,
            parameters: {
              property: c.property,
              operator: c.operator,
              value: c.value,
            },
          })),
          actions: rule.actions.map((a) => {
            const action: any = {
              type: a.type,
              target: a.target,
            };
            if (a.parameters !== undefined) {
              action.parameters = a.parameters;
            }
            return action;
          }),
          priority: rule.priority || 1,
          confidence: (rule as any).confidence || 0.5,
          usageCount: perf.usageCount,
          successRate: perf.successRate,
        })
          .addOptional('metadata', rule.metadata)
          .build();

        serializableRules.push(serializableRule);
      }

      const state: Partial<LearningState> = {
        rules: serializableRules,
      };

      const tempAgent = { id: agentId } as Agent;
      await this.saveLearningState(
        tempAgent,
        ReasoningParadigm.RULE_BASED,
        state
      );
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to save rules: ${error}`);
    }
  }

  /**
   * Load rules with performance data
   */
  async loadRules(agentId: string): Promise<{
    rules: Map<string, Rule>;
    performance: Map<string, { usageCount: number; successRate: number }>;
  } | null> {
    try {
      const state = await this.loadLearningState(
        agentId,
        ReasoningParadigm.RULE_BASED
      );
      if (!state || !state.rules) return null;

      const rules = new Map<string, Rule>();
      const performance = new Map<
        string,
        { usageCount: number; successRate: number }
      >();

      for (const serializableRule of state.rules) {
        const rule = buildObject<Rule>({
          id: serializableRule.id,
          name: serializableRule.name,
          conditions: serializableRule.conditions.map((c) => ({
            type: c.type as any,
            property: (c.parameters?.property as string) || 'unknown',
            operator: (c.parameters?.operator as any) || 'equals',
            value: c.parameters?.value || '',
            expression: c.expression,
          })),
          actions: serializableRule.actions.map((a) => {
            const action: RuleAction = {
              type: a.type as any,
              target: a.target,
            };
            if (a.parameters !== undefined) {
              action.parameters = a.parameters;
            }
            return action;
          }),
          priority: serializableRule.priority,
        })
          .addOptional('metadata', serializableRule.metadata)
          .build();

        rules.set(rule.id, rule);
        performance.set(rule.id, {
          usageCount: serializableRule.usageCount,
          successRate: serializableRule.successRate,
        });
      }

      return { rules, performance };
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to load rules: ${error}`);
      return null;
    }
  }

  /**
   * Save Bayesian network
   */
  async saveBayesianNetwork(
    agentId: string,
    network: BayesianNetwork
  ): Promise<void> {
    try {
      const serializableNetwork: SerializableBayesianNetwork = {
        nodes: [],
        edges: [],
      };

      // Serialize nodes
      for (const node of network.nodes) {
        serializableNetwork.nodes.push({
          id: node.id,
          name: node.name,
          states: node.states,
          conditionalProbabilities: node.conditionalProbabilities || {},
          parents: node.parents || [],
          children: node.children || [],
        });
      }

      // Serialize edges
      for (const edge of network.edges) {
        serializableNetwork.edges.push({ from: edge.from, to: edge.to });
      }

      const state: Partial<LearningState> = {
        bayesianNetwork: serializableNetwork,
      };

      const tempAgent = { id: agentId } as Agent;
      await this.saveLearningState(
        tempAgent,
        ReasoningParadigm.PROBABILISTIC,
        state
      );
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to save Bayesian network: ${error}`);
    }
  }

  /**
   * Load Bayesian network
   */
  async loadBayesianNetwork(
    agentId: string
  ): Promise<SerializableBayesianNetwork | null> {
    try {
      const state = await this.loadLearningState(
        agentId,
        ReasoningParadigm.PROBABILISTIC
      );
      return state?.bayesianNetwork || null;
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to load Bayesian network: ${error}`);
      return null;
    }
  }

  /**
   * Save experiences buffer
   */
  async saveExperiences(
    agentId: string,
    experiences: Experience[]
  ): Promise<void> {
    try {
      const serializableExperiences: SerializableExperience[] = experiences.map(
        (exp) => ({
          id: exp.id,
          agentId: exp.agentId,
          state: {
            features: exp.state.features,
            context: exp.state.context,
          },
          action: {
            type: exp.action.type || 'unknown',
            parameters: exp.action.parameters,
          },
          reward: {
            type: exp.reward.type,
            value: exp.reward.value,
            source: exp.reward.source,
          },
          nextState: {
            features: exp.nextState.features,
            context: exp.nextState.context,
          },
          timestamp: exp.timestamp,
        })
      );

      const state: Partial<LearningState> = {
        recentExperiences: serializableExperiences.slice(-1000), // Keep last 1000
      };

      const tempAgent = { id: agentId } as Agent;
      await this.saveLearningState(
        tempAgent,
        ReasoningParadigm.REINFORCEMENT_LEARNING,
        state
      );
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to save experiences: ${error}`);
    }
  }

  /**
   * Load experiences buffer
   */
  async loadExperiences(agentId: string): Promise<Experience[]> {
    try {
      const state = await this.loadLearningState(
        agentId,
        ReasoningParadigm.REINFORCEMENT_LEARNING
      );
      if (!state?.recentExperiences) return [];

      return state.recentExperiences.map((exp) => ({
        id: exp.id,
        agentId: exp.agentId,
        state: {
          id: `state_${exp.timestamp.getTime()}`,
          agentId: exp.agentId,
          timestamp: new Date(exp.timestamp),
          features: exp.state.features,
          context: exp.state.context,
        },
        action: {
          id: `action_${exp.timestamp.getTime()}`,
          agentId: exp.agentId,
          type: exp.action.type,
          extension: 'learning_persistence',
          action: exp.action.type,
          parameters: exp.action.parameters || {},
          timestamp: new Date(exp.timestamp),
          status: 'completed' as any,
        },
        reward: {
          id: `reward_${exp.timestamp.getTime()}`,
          type: exp.reward.type as any,
          value: exp.reward.value,
          source: exp.reward.source,
          context: {},
          timestamp: new Date(exp.timestamp),
          agentId: exp.agentId,
        },
        nextState: {
          id: `next_state_${exp.timestamp.getTime()}`,
          agentId: exp.agentId,
          timestamp: new Date(exp.timestamp),
          features: exp.nextState.features,
          context: exp.nextState.context,
        },
        done: false,
        timestamp: new Date(exp.timestamp),
        importance: 0.5,
        tags: ['loaded_experience'],
      }));
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to load experiences: ${error}`);
      return [];
    }
  }

  /**
   * Save meta-learning data
   */
  async saveMetaLearning(
    agentId: string,
    data: {
      paradigmPerformance: Record<string, number>;
      contextPatterns: Record<string, string>;
      paradigmSelections: Array<{
        context: string;
        paradigm: ReasoningParadigm;
        success: boolean;
        timestamp: Date;
      }>;
    }
  ): Promise<void> {
    try {
      const state: Partial<LearningState> = {
        paradigmPerformance: data.paradigmPerformance,
        contextPatterns: data.contextPatterns,
        paradigmSelections: data.paradigmSelections,
      };

      const tempAgent = { id: agentId } as Agent;
      await this.saveLearningState(tempAgent, ReasoningParadigm.HYBRID, state);
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to save meta-learning data: ${error}`);
    }
  }

  /**
   * Load meta-learning data
   */
  async loadMetaLearning(agentId: string): Promise<{
    paradigmPerformance: Record<string, number>;
    contextPatterns: Record<string, string>;
    paradigmSelections: Array<{
      context: string;
      paradigm: ReasoningParadigm;
      success: boolean;
      timestamp: Date;
    }>;
  } | null> {
    try {
      const state = await this.loadLearningState(
        agentId,
        ReasoningParadigm.HYBRID
      );
      if (!state) return null;

      return {
        paradigmPerformance: state.paradigmPerformance || {},
        contextPatterns: state.contextPatterns || {},
        paradigmSelections: state.paradigmSelections || [],
      };
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to load meta-learning data: ${error}`);
      return null;
    }
  }

  /**
   * Create learning memory record
   */
  createLearningMemory(
    agentId: string,
    paradigm: ReasoningParadigm,
    action: 'save' | 'load',
    details: string
  ): MemoryRecord {
    return {
      id: `learning_memory_${Date.now()}`,
      agentId,
      type: MemoryType.LEARNING,
      content: `${action} learning state for ${paradigm}: ${details}`,
      metadata: {
        paradigm,
        action,
        timestamp: new Date(),
      },
      importance: 0.6,
      timestamp: new Date(),
      tags: ['learning', 'persistence', paradigm],
      duration: MemoryDuration.LONG_TERM,
    };
  }

  /**
   * Get learning state filename
   */
  private getLearningStateFilename(
    agentId: string,
    paradigm: ReasoningParadigm
  ): string {
    return `${agentId}_${paradigm}_learning.json`;
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filepath: string): Promise<void> {
    try {
      const exists = await fs
        .access(filepath)
        .then(() => true)
        .catch(() => false);
      if (!exists) return;

      const backupPath = `${filepath}.backup.${Date.now()}`;
      await fs.copyFile(filepath, backupPath);

      // Clean up old backups
      await this.cleanupOldBackups(filepath);
    } catch (error) {
      void error;
      // Backup failure is not critical
    }
  }

  /**
   * Clean up old backup files
   */
  private async cleanupOldBackups(originalPath: string): Promise<void> {
    try {
      const dir = path.dirname(originalPath);
      const basename = path.basename(originalPath);
      const files = await fs.readdir(dir);

      const backupFiles = files
        .filter((f) => f.startsWith(`${basename}.backup.`))
        .map((f) => {
          const parts = f.split('.backup.');
          const timestampStr = parts[1];
          return {
            name: f,
            path: path.join(dir, f),
            timestamp: timestampStr ? parseInt(timestampStr) : 0,
          };
        })
        .filter((f) => f.timestamp > 0)
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the most recent backups
      const toDelete = backupFiles.slice(this.maxBackups);
      for (const file of toDelete) {
        await fs.unlink(file.path);
      }
    } catch (error) {
      void error;
      // Cleanup failure is not critical
    }
  }

  /**
   * Validate learning state format
   */
  private validateLearningState(state: LearningState): boolean {
    return !!(
      state.agentId &&
      state.paradigm &&
      state.version &&
      state.timestamp
    );
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    lastModified: Date | null;
    paradigmCounts: Record<string, number>;
  }> {
    try {
      const files = await fs.readdir(this.dataDirectory);
      const learningFiles = files.filter((f) => f.endsWith('_learning.json'));

      let totalSize = 0;
      let lastModified: Date | null = null;
      const paradigmCounts: Record<string, number> = {};

      for (const file of learningFiles) {
        const filepath = path.join(this.dataDirectory, file);
        const stats = await fs.stat(filepath);

        totalSize += stats.size;
        if (!lastModified || stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }

        // Extract paradigm from filename
        const parts = file.split('_');
        if (parts.length >= 3 && parts[1]) {
          const paradigm = parts[1];
          paradigmCounts[paradigm] = (paradigmCounts[paradigm] || 0) + 1;
        }
      }

      return {
        totalFiles: learningFiles.length,
        totalSize,
        lastModified,
        paradigmCounts,
      };
    } catch (error) {
      void error;
      runtimeLogger.cognition(`Failed to get storage stats: ${error}`);
      return {
        totalFiles: 0,
        totalSize: 0,
        lastModified: null,
        paradigmCounts: {},
      };
    }
  }
}

/**
 * Global learning persistence instance
 */
export const learningPersistence = new LearningPersistence();

/**
 * Convenience functions
 */
export async function saveLearningState(
  agent: Agent,
  paradigm: ReasoningParadigm,
  state: Partial<LearningState>
): Promise<void> {
  return learningPersistence.saveLearningState(agent, paradigm, state);
}

export async function loadLearningState(
  agentId: string,
  paradigm: ReasoningParadigm
): Promise<LearningState | null> {
  return learningPersistence.loadLearningState(agentId, paradigm);
}
