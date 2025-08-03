/**
 * Communication Skills Index
 * Exports all communication skills and related types
 */

// Base skill and manager
export { 
  BaseCommunicationSkill,
  type CommunicationSkillConfig 
} from './base-communication-skill';

export { 
  DefaultCommunicationSkillManager,
  type CommunicationSkillManagerConfig 
} from './skill-manager';

// Individual skills
export { 
  ContextManagementSkill,
  type ContextManagementSkillConfig 
} from './context-management-skill';

export { 
  StyleAdaptationSkill,
  type StyleAdaptationSkillConfig,
  type StyleAdaptationRequest 
} from './style-adaptation-skill';

export { 
  ExpressionEngineSkill,
  type ExpressionEngineSkillConfig,
  type ExpressionVariationRequest,
  type ExpressionEnhancementRequest 
} from './expression-engine-skill';

export { 
  ResponseEnhancementSkill,
  type ResponseEnhancementSkillConfig,
  type EnhancementRequest,
  type EnhancementResult 
} from './response-enhancement-skill';

// Re-export skill types for convenience
export type CommunicationSkill = 
  | ContextManagementSkill
  | StyleAdaptationSkill
  | ExpressionEngineSkill
  | ResponseEnhancementSkill;

// Factory functions for creating skills
export function createContextManagementSkill(config: ContextManagementSkillConfig): ContextManagementSkill {
  return new ContextManagementSkill(config);
}

export function createStyleAdaptationSkill(config: StyleAdaptationSkillConfig): StyleAdaptationSkill {
  return new StyleAdaptationSkill(config);
}

export function createExpressionEngineSkill(config: ExpressionEngineSkillConfig): ExpressionEngineSkill {
  return new ExpressionEngineSkill(config);
}

export function createResponseEnhancementSkill(config: ResponseEnhancementSkillConfig): ResponseEnhancementSkill {
  return new ResponseEnhancementSkill(config);
}

export function createCommunicationSkillManager(config?: CommunicationSkillManagerConfig): DefaultCommunicationSkillManager {
  return new DefaultCommunicationSkillManager(config);
}