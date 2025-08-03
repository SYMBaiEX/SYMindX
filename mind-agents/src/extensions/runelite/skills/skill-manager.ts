/**
 * RuneLite Skill Manager
 * Manages the lifecycle and coordination of all RuneLite skills
 */

import { Agent, ExtensionAction } from '../../../types/index';
import { runtimeLogger } from '../../../utils/logger';
import { BaseRuneLiteSkill } from './base-runelite-skill';

export interface RuneLiteSkillManagerConfig {
  maxConcurrentSkills?: number;
  skillTimeout?: number;
}

export class DefaultRuneLiteSkillManager {
  private skills: Map<string, BaseRuneLiteSkill> = new Map();
  private agent: Agent | undefined;
  private config: RuneLiteSkillManagerConfig;

  constructor(config: RuneLiteSkillManagerConfig = {}) {
    this.config = {
      maxConcurrentSkills: 10,
      skillTimeout: 30000,
      ...config
    };
  }

  /**
   * Register a skill with the manager
   */
  async registerSkill(skill: BaseRuneLiteSkill): Promise<void> {
    if (!skill.isEnabled()) {
      runtimeLogger.info(`⏸️ Skipping disabled skill: ${skill.getName()}`);
      return;
    }

    if (this.skills.has(skill.getName())) {
      runtimeLogger.warn(`⚠️ Skill already registered: ${skill.getName()}`);
      return;
    }

    this.skills.set(skill.getName(), skill);
    
    // Initialize skill if agent is available
    if (this.agent) {
      await skill.initialize(this.agent);
    }

    runtimeLogger.info(`✅ Registered RuneLite skill: ${skill.getName()}`);
  }

  /**
   * Unregister a skill from the manager
   */
  async unregisterSkill(skillName: string): Promise<void> {
    const skill = this.skills.get(skillName);
    if (!skill) {
      runtimeLogger.warn(`⚠️ Skill not found: ${skillName}`);
      return;
    }

    await skill.cleanup();
    this.skills.delete(skillName);
    runtimeLogger.info(`⚙️ Unregistered RuneLite skill: ${skillName}`);
  }

  /**
   * Initialize all registered skills with the agent
   */
  async initializeAll(agent: Agent): Promise<void> {
    this.agent = agent;
    
    const skillPromises = Array.from(this.skills.values()).map(
      async (skill) => {
        try {
          await skill.initialize(agent);
        } catch (error) {
          runtimeLogger.error(`Failed to initialize skill ${skill.getName()}:`, error);
        }
      }
    );

    await Promise.all(skillPromises);
    runtimeLogger.info(`✅ Initialized ${this.skills.size} RuneLite skills`);
  }

  /**
   * Clean up all skills
   */
  async cleanupAll(): Promise<void> {
    const skillPromises = Array.from(this.skills.values()).map(
      async (skill) => {
        try {
          await skill.cleanup();
        } catch (error) {
          runtimeLogger.error(`Failed to cleanup skill ${skill.getName()}:`, error);
        }
      }
    );

    await Promise.all(skillPromises);
    this.skills.clear();
    this.agent = undefined;
    runtimeLogger.info('🧹 Cleaned up all RuneLite skills');
  }

  /**
   * Get all actions from all registered skills
   */
  getAllActions(): ExtensionAction[] {
    const actions: ExtensionAction[] = [];
    
    for (const skill of this.skills.values()) {
      if (skill.isEnabled()) {
        try {
          const skillActions = skill.getActions();
          actions.push(...skillActions);
        } catch (error) {
          runtimeLogger.error(`Failed to get actions from skill ${skill.getName()}:`, error);
        }
      }
    }

    return actions;
  }

  /**
   * Handle game events by distributing them to relevant skills
   */
  async handleGameEvent(eventType: string, eventData: any): Promise<void> {
    const eventPromises = Array.from(this.skills.values()).map(
      async (skill) => {
        if (skill.isEnabled()) {
          try {
            await skill.handleGameEvent(eventType, eventData);
          } catch (error) {
            runtimeLogger.error(`Skill ${skill.getName()} failed to handle event ${eventType}:`, error);
          }
        }
      }
    );

    await Promise.all(eventPromises);
  }

  /**
   * Get a specific skill by name
   */
  getSkill(skillName: string): BaseRuneLiteSkill | undefined {
    return this.skills.get(skillName);
  }

  /**
   * Get all registered skills
   */
  getSkills(): BaseRuneLiteSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills statistics
   */
  getStats(): {
    totalSkills: number;
    enabledSkills: number;
    disabledSkills: number;
    skillNames: string[];
  } {
    const enabledSkills = Array.from(this.skills.values()).filter(skill => skill.isEnabled());
    
    return {
      totalSkills: this.skills.size,
      enabledSkills: enabledSkills.length,
      disabledSkills: this.skills.size - enabledSkills.length,
      skillNames: Array.from(this.skills.keys())
    };
  }
}