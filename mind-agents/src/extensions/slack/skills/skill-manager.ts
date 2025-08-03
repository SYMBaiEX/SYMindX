/**
 * Slack Skill Manager
 * Manages the lifecycle of Slack skills
 */

import { Agent, ExtensionAction } from '../../../types';
import { runtimeLogger } from '../../../utils/logger';
import { BaseSlackSkill } from './base-slack-skill';
import { SlackSkillContext } from '../types';

export interface SlackSkillManagerConfig {
  maxSkills?: number;
  skillTimeout?: number;
  enableAutoDiscovery?: boolean;
}

export class DefaultSlackSkillManager {
  private skills: Map<string, BaseSlackSkill> = new Map();
  private config: SlackSkillManagerConfig;
  private agent?: Agent;
  private context?: SlackSkillContext;
  private initialized = false;

  constructor(config?: SlackSkillManagerConfig) {
    this.config = {
      maxSkills: 20,
      skillTimeout: 30000,
      enableAutoDiscovery: false,
      ...config
    };
  }

  /**
   * Initialize the skill manager
   */
  async initialize(agent: Agent, context: SlackSkillContext): Promise<void> {
    if (this.initialized) {
      runtimeLogger.warn('Slack skill manager already initialized');
      return;
    }

    this.agent = agent;
    this.context = context;

    // Initialize all registered skills
    for (const [name, skill] of this.skills) {
      try {
        await skill.initialize(agent, context);
        runtimeLogger.info(`✅ Initialized Slack skill: ${name}`);
      } catch (error) {
        runtimeLogger.error(`Failed to initialize Slack skill ${name}:`, error);
      }
    }

    this.initialized = true;
    runtimeLogger.info(`🚀 Slack skill manager initialized with ${this.skills.size} skills`);
  }

  /**
   * Register a new skill
   */
  async registerSkill(skill: BaseSlackSkill): Promise<void> {
    const info = skill.getInfo();
    
    if (this.skills.size >= (this.config.maxSkills || 20)) {
      throw new Error(`Maximum number of skills (${this.config.maxSkills}) reached`);
    }

    if (this.skills.has(info.name)) {
      runtimeLogger.warn(`Skill ${info.name} already registered, replacing...`);
    }

    this.skills.set(info.name, skill);

    // Initialize if manager is already initialized
    if (this.initialized && this.agent && this.context) {
      try {
        await skill.initialize(this.agent, this.context);
        runtimeLogger.info(`✅ Registered and initialized Slack skill: ${info.name}`);
      } catch (error) {
        runtimeLogger.error(`Failed to initialize newly registered skill ${info.name}:`, error);
        this.skills.delete(info.name);
        throw error;
      }
    } else {
      runtimeLogger.info(`📝 Registered Slack skill: ${info.name} (pending initialization)`);
    }
  }

  /**
   * Unregister a skill
   */
  async unregisterSkill(skillName: string): Promise<void> {
    const skill = this.skills.get(skillName);
    if (!skill) {
      runtimeLogger.warn(`Skill ${skillName} not found`);
      return;
    }

    try {
      await skill.cleanup();
      this.skills.delete(skillName);
      runtimeLogger.info(`🗑️ Unregistered Slack skill: ${skillName}`);
    } catch (error) {
      runtimeLogger.error(`Error cleaning up skill ${skillName}:`, error);
    }
  }

  /**
   * Get all actions from all skills
   */
  getAllActions(): ExtensionAction[] {
    const actions: ExtensionAction[] = [];

    for (const [name, skill] of this.skills) {
      if (skill.isEnabled()) {
        try {
          const skillActions = skill.getActions();
          actions.push(...skillActions);
        } catch (error) {
          runtimeLogger.error(`Failed to get actions from skill ${name}:`, error);
        }
      }
    }

    return actions;
  }

  /**
   * Get a specific skill
   */
  getSkill(name: string): BaseSlackSkill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all skills
   */
  getAllSkills(): Map<string, BaseSlackSkill> {
    return new Map(this.skills);
  }

  /**
   * Get enabled skills
   */
  getEnabledSkills(): BaseSlackSkill[] {
    return Array.from(this.skills.values()).filter(skill => skill.isEnabled());
  }

  /**
   * Execute skill action
   */
  async executeAction(
    skillName: string,
    actionName: string,
    params: any
  ): Promise<any> {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill ${skillName} not found`);
    }

    if (!skill.isEnabled()) {
      throw new Error(`Skill ${skillName} is disabled`);
    }

    const actions = skill.getActions();
    const action = actions.find(a => a.name === actionName);
    
    if (!action) {
      throw new Error(`Action ${actionName} not found in skill ${skillName}`);
    }

    if (!this.agent) {
      throw new Error('Agent not initialized');
    }

    return await action.execute(this.agent, params);
  }

  /**
   * Cleanup all skills
   */
  async cleanup(): Promise<void> {
    runtimeLogger.info('🧹 Cleaning up Slack skill manager...');

    // Cleanup all skills
    const cleanupPromises: Promise<void>[] = [];
    
    for (const [name, skill] of this.skills) {
      cleanupPromises.push(
        skill.cleanup().catch(error => {
          runtimeLogger.error(`Error cleaning up skill ${name}:`, error);
        })
      );
    }

    await Promise.all(cleanupPromises);
    
    this.skills.clear();
    this.initialized = false;
    this.agent = undefined;
    this.context = undefined;

    runtimeLogger.info('✅ Slack skill manager cleaned up');
  }

  /**
   * Get skill statistics
   */
  getStats(): {
    totalSkills: number;
    enabledSkills: number;
    totalActions: number;
    skillNames: string[];
  } {
    const enabledSkills = this.getEnabledSkills();
    const allActions = this.getAllActions();

    return {
      totalSkills: this.skills.size,
      enabledSkills: enabledSkills.length,
      totalActions: allActions.length,
      skillNames: Array.from(this.skills.keys())
    };
  }

  /**
   * Enable a skill
   */
  enableSkill(skillName: string): void {
    const skill = this.skills.get(skillName);
    if (skill) {
      skill.config.enabled = true;
      runtimeLogger.info(`✅ Enabled Slack skill: ${skillName}`);
    }
  }

  /**
   * Disable a skill
   */
  disableSkill(skillName: string): void {
    const skill = this.skills.get(skillName);
    if (skill) {
      skill.config.enabled = false;
      runtimeLogger.info(`⏸️ Disabled Slack skill: ${skillName}`);
    }
  }
}