/**
 * Communication Skills Manager
 * Manages lifecycle and coordination of all communication skills
 */

import { Agent, ExtensionAction } from '../../../types/index';
import { runtimeLogger } from '../../../utils/logger';
import { BaseCommunicationSkill } from './base-communication-skill';

export interface CommunicationSkillManagerConfig {
  enabledSkills?: string[];
}

export class DefaultCommunicationSkillManager {
  private skills = new Map<string, BaseCommunicationSkill>();
  private config: CommunicationSkillManagerConfig;
  private agent?: Agent;

  constructor(config: CommunicationSkillManagerConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the skill manager with an agent
   */
  async initialize(agent: Agent): Promise<void> {
    this.agent = agent;
    
    // Initialize all registered skills
    for (const [skillName, skill] of this.skills) {
      if (this.isSkillEnabled(skillName)) {
        await skill.initialize(agent);
      }
    }

    runtimeLogger.info(`🎯 Communication Skills Manager initialized with ${this.skills.size} skills`);
  }

  /**
   * Register a skill
   */
  async registerSkill(skill: BaseCommunicationSkill): Promise<void> {
    const skillName = skill.constructor.name;
    this.skills.set(skillName, skill);

    // Initialize immediately if agent is available
    if (this.agent && this.isSkillEnabled(skillName)) {
      await skill.initialize(this.agent);
    }

    runtimeLogger.info(`📝 Registered communication skill: ${skillName}`);
  }

  /**
   * Unregister a skill
   */
  async unregisterSkill(skillName: string): Promise<void> {
    const skill = this.skills.get(skillName);
    if (skill) {
      await skill.cleanup();
      this.skills.delete(skillName);
      runtimeLogger.info(`🗑️ Unregistered communication skill: ${skillName}`);
    }
  }

  /**
   * Get all actions from all enabled skills
   */
  getAllActions(): ExtensionAction[] {
    const actions: ExtensionAction[] = [];

    for (const [skillName, skill] of this.skills) {
      if (this.isSkillEnabled(skillName) && skill.isEnabled()) {
        const skillActions = skill.getActions();
        actions.push(...skillActions);
      }
    }

    return actions;
  }

  /**
   * Get a specific skill by name
   */
  getSkill<T extends BaseCommunicationSkill>(skillName: string): T | undefined {
    return this.skills.get(skillName) as T | undefined;
  }

  /**
   * Get all registered skills
   */
  getSkills(): Map<string, BaseCommunicationSkill> {
    return new Map(this.skills);
  }

  /**
   * Enable a skill
   */
  async enableSkill(skillName: string): Promise<void> {
    const skill = this.skills.get(skillName);
    if (skill && this.agent) {
      skill.updateConfig({ enabled: true });
      await skill.initialize(this.agent);
      runtimeLogger.info(`✅ Enabled communication skill: ${skillName}`);
    }
  }

  /**
   * Disable a skill
   */
  async disableSkill(skillName: string): Promise<void> {
    const skill = this.skills.get(skillName);
    if (skill) {
      skill.updateConfig({ enabled: false });
      await skill.cleanup();
      runtimeLogger.info(`⏸️ Disabled communication skill: ${skillName}`);
    }
  }

  /**
   * Clean up all skills
   */
  async cleanup(): Promise<void> {
    for (const [skillName, skill] of this.skills) {
      await skill.cleanup();
    }
    this.skills.clear();
    runtimeLogger.info('🧹 Communication Skills Manager cleaned up');
  }

  /**
   * Check if a skill is enabled in configuration
   */
  private isSkillEnabled(skillName: string): boolean {
    if (!this.config.enabledSkills) {
      return true; // All skills enabled by default
    }
    return this.config.enabledSkills.includes(skillName);
  }

  /**
   * Update manager configuration
   */
  updateConfig(config: Partial<CommunicationSkillManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}