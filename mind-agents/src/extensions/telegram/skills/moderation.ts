/**
 * Moderation Skill for Telegram Extension
 * 
 * Handles community moderation and rule enforcement
 */

import { ExtensionAction, ActionCategory, Agent, ActionResult, ActionResultType } from '../../../types/agent.js';
import { SkillParameters } from '../../../types/common.js';
import { TelegramSkill } from './index.js';
import { TelegramConfig } from '../types.js';
import { Logger } from '../../../utils/logger.js';

export interface ModerationRule {
  id: string;
  name: string;
  type: 'spam' | 'language' | 'content' | 'behavior' | 'links';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'warn' | 'mute' | 'kick' | 'ban' | 'delete';
  autoEnforce: boolean;
  conditions: {
    keywords?: string[];
    patterns?: string[];
  };
  enabled: boolean;
}

export class ModerationSkill implements TelegramSkill {
  name = 'moderation';
  description = 'Community moderation and rule enforcement';
  
  private config?: TelegramConfig;
  private logger?: Logger;
  private moderationRules: Map<string, ModerationRule[]> = new Map();

  async initialize(config: TelegramConfig, logger: Logger): Promise<void> {
    this.config = config;
    this.logger = logger;
    await this.loadModerationData();
  }

  async cleanup(): Promise<void> {
    await this.saveModerationData();
  }

  private async loadModerationData(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dataDir = path.join(process.cwd(), 'data', 'telegram', 'moderation');
      const rulesPath = path.join(dataDir, 'rules.json');
      
      try {
        const rulesData = await fs.readFile(rulesPath, 'utf-8');
        const rules = JSON.parse(rulesData);
        for (const [groupId, groupRules] of Object.entries(rules)) {
          this.moderationRules.set(groupId, groupRules as ModerationRule[]);
        }
        this.logger?.info(`Loaded moderation rules for ${this.moderationRules.size} groups`);
      } catch (error) {
        this.logger?.debug('No existing moderation rules found');
      }
    } catch (error) {
      this.logger?.error('Failed to load moderation data', error);
    }
  }

  private async saveModerationData(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dataDir = path.join(process.cwd(), 'data', 'telegram', 'moderation');
      await fs.mkdir(dataDir, { recursive: true });

      const rules = Object.fromEntries(this.moderationRules);
      await fs.writeFile(
        path.join(dataDir, 'rules.json'),
        JSON.stringify(rules, null, 2),
        'utf-8'
      );
      this.logger?.debug('Saved moderation data');
    } catch (error) {
      this.logger?.error('Failed to save moderation data', error);
    }
  }

  getActions(): Record<string, ExtensionAction> {
    return {
      moderateGroup: {
        name: 'moderateGroup',
        description: 'Enable automatic moderation for a group with custom rules',
        category: ActionCategory.AUTONOMOUS,
        parameters: {
          groupId: {
            type: 'string',
            required: true,
            description: 'Group ID to moderate',
          },
          rules: {
            type: 'array',
            required: true,
            description: 'Moderation rules to apply',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.moderateGroup(agent, params);
        },
      },

      checkMessage: {
        name: 'checkMessage',
        description: 'Check a message against moderation rules',
        category: ActionCategory.PROCESSING,
        parameters: {
          groupId: {
            type: 'string',
            required: true,
            description: 'Group ID where message was sent',
          },
          messageText: {
            type: 'string',
            required: true,
            description: 'Message content to check',
          },
          userId: {
            type: 'string',
            required: true,
            description: 'User ID who sent the message',
          },
        },
        execute: async (agent: Agent, params: SkillParameters): Promise<ActionResult> => {
          return this.checkMessage(agent, params);
        },
      },
    };
  }

  private async moderateGroup(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const rules = params.rules as ModerationRule[];

      this.moderationRules.set(groupId, rules);

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          groupId,
          rulesCount: rules.length,
          autoModerationEnabled: true,
        },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to set up group moderation', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private async checkMessage(agent: Agent, params: SkillParameters): Promise<ActionResult> {
    try {
      const groupId = params.groupId as string;
      const messageText = params.messageText as string;
      const userId = params.userId as string;

      const rules = this.moderationRules.get(groupId) || [];
      const violations: Array<{ rule: ModerationRule; confidence: number }> = [];

      for (const rule of rules) {
        if (!rule.enabled) continue;

        const violation = this.checkRuleViolation(messageText, rule);
        if (violation.violated) {
          violations.push({ rule, confidence: violation.confidence });
        }
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          violations: violations.map(v => ({
            ruleId: v.rule.id,
            ruleName: v.rule.name,
            severity: v.rule.severity,
            confidence: v.confidence,
            action: v.rule.action,
          })),
          requiresAction: violations.length > 0,
        },
        metadata: { timestamp: new Date().toISOString() },
      };
    } catch (error) {
      this.logger?.error('Failed to check message', error);
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: error instanceof Error ? error.message : String(error),
        metadata: { timestamp: new Date().toISOString() },
      };
    }
  }

  private checkRuleViolation(messageText: string, rule: ModerationRule): { violated: boolean; confidence: number } {
    let confidence = 0;
    let violated = false;

    switch (rule.type) {
      case 'spam':
        violated = this.checkSpamViolation(messageText);
        confidence = violated ? 0.8 : 0;
        break;
      
      case 'language':
        violated = this.checkLanguageViolation(messageText, rule);
        confidence = violated ? 0.9 : 0;
        break;
      
      case 'content':
        violated = this.checkContentViolation(messageText, rule);
        confidence = violated ? 0.7 : 0;
        break;
      
      case 'links':
        violated = this.checkLinkViolation(messageText);
        confidence = violated ? 0.95 : 0;
        break;
    }

    return { violated, confidence };
  }

  private checkSpamViolation(messageText: string): boolean {
    // Check for repetitive characters
    const repetitivePattern = /(.)\1{4,}/g;
    if (repetitivePattern.test(messageText)) return true;

    // Check for excessive caps
    const capsRatio = (messageText.match(/[A-Z]/g) || []).length / messageText.length;
    if (capsRatio > 0.7 && messageText.length > 10) return true;

    return false;
  }

  private checkLanguageViolation(messageText: string, rule: ModerationRule): boolean {
    const keywords = rule.conditions.keywords || [];
    const lowerText = messageText.toLowerCase();
    return keywords.some(word => lowerText.includes(word.toLowerCase()));
  }

  private checkContentViolation(messageText: string, rule: ModerationRule): boolean {
    const patterns = rule.conditions.patterns || [];
    
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(messageText)) return true;
      } catch (error) {
        this.logger?.warn(`Invalid regex pattern: ${pattern}`);
      }
    }

    return false;
  }

  private checkLinkViolation(messageText: string): boolean {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return urlPattern.test(messageText);
  }

  public getModerationRules(groupId: string): ModerationRule[] {
    return this.moderationRules.get(groupId) || [];
  }
}