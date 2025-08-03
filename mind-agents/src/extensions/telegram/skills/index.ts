/**
 * Telegram Extension Skills
 * 
 * Centralized skills management for the Telegram extension
 */

export * from './group-management';
export * from './direct-messaging';
export * from './community-building';
export * from './content-sharing';
export * from './moderation';
export * from './relationship-building';

import { GroupManagementSkill } from './group-management';
import { DirectMessagingSkill } from './direct-messaging';
import { CommunityBuildingSkill } from './community-building';
import { ContentSharingSkill } from './content-sharing';
import { ModerationSkill } from './moderation';
import { RelationshipBuildingSkill } from './relationship-building';
import { TelegramConfig } from '../types.js';
import { Logger } from '../../../utils/logger.js';

export interface TelegramSkill {
  name: string;
  description: string;
  getActions(): Record<string, any>;
  initialize?(config: TelegramConfig, logger: Logger): Promise<void>;
  cleanup?(): Promise<void>;
}

export class TelegramSkillManager {
  private skills: Map<string, TelegramSkill> = new Map();
  private logger: Logger;
  private config: TelegramConfig;

  constructor(config: TelegramConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.initializeSkills();
  }

  private initializeSkills(): void {
    // Register all skills
    this.registerSkill(new GroupManagementSkill());
    this.registerSkill(new DirectMessagingSkill());
    this.registerSkill(new CommunityBuildingSkill());
    this.registerSkill(new ContentSharingSkill());
    this.registerSkill(new ModerationSkill());
    this.registerSkill(new RelationshipBuildingSkill());
  }

  private registerSkill(skill: TelegramSkill): void {
    this.skills.set(skill.name, skill);
    this.logger.debug(`Registered Telegram skill: ${skill.name}`);
  }

  async initialize(): Promise<void> {
    for (const skill of this.skills.values()) {
      if (skill.initialize) {
        await skill.initialize(this.config, this.logger);
      }
    }
  }

  async cleanup(): Promise<void> {
    for (const skill of this.skills.values()) {
      if (skill.cleanup) {
        await skill.cleanup();
      }
    }
  }

  getSkill(name: string): TelegramSkill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): TelegramSkill[] {
    return Array.from(this.skills.values());
  }

  getAllActions(): Record<string, any> {
    const allActions: Record<string, any> = {};
    
    for (const skill of this.skills.values()) {
      const actions = skill.getActions();
      Object.assign(allActions, actions);
    }
    
    return allActions;
  }
}