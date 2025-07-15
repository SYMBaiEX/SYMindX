import { BaseConfig } from '../../../types/common';

export interface TheoryOfMindConfig extends BaseConfig {
  // Mental modeling
  enableMentalModeling?: boolean;
  maxModels?: number;
  modelUpdateFrequency?: number;

  // Perspective taking
  enablePerspectiveTaking?: boolean;
  perspectiveDepth?: 'surface' | 'moderate' | 'deep';

  // Social reasoning
  enableSocialReasoning?: boolean;
  socialContextWeight?: number;

  // Empathy simulation
  enableEmpathy?: boolean;
  empathyThreshold?: number;

  // Learning and adaptation
  enableModelLearning?: boolean;
  learningRate?: number;
}

export interface MentalModel {
  id: string;
  beliefs: Map<string, unknown>;
  desires: Map<string, number>;
  intentions: string[];
  emotions: Map<string, number>;
  personality: Map<string, number>;
  knowledgeState: Map<string, boolean>;
  relationships: Map<string, number>;
  lastUpdated: Date;
}
