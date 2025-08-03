/**
 * Skills Module for RuneLite Extension
 * Handles autonomous gameplay activities with goal-oriented strategies
 */

export { 
  BaseRuneLiteSkill,
  type RuneLiteSkillConfig
} from './base-runelite-skill';
export { 
  DefaultRuneLiteSkillManager,
  type RuneLiteSkillManagerConfig
} from './skill-manager';
export { 
  SkillTrainerSkill
} from './skill-trainer';
export { 
  QuestManagerSkill,
  type QuestManagerConfig
} from './quest-manager';
export { 
  EconomicManagerSkill,
  type EconomicManagerConfig,
  type MarketData,
  type TradeRecord
} from './economic-manager';
export { 
  SocialManagerSkill,
  type SocialManagerConfig,
  type CommunicationStyle,
  type ResponsePattern,
  type SocialActivity
} from './social-manager';
export { 
  PvPManagerSkill,
  type PvPManagerConfig,
  type PvPEvent
} from './pvp-manager';
export * from './types';