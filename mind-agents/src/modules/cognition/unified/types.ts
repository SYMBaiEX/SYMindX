import { BaseConfig } from '../../../types/common';
export interface UnifiedCognitionConfig extends BaseConfig {
  // When to think
  thinkForActions?: boolean; // Think before taking actions
  thinkForMentions?: boolean; // Think when mentioned/tagged
  thinkOnRequest?: boolean; // Think when explicitly asked

  // Thinking parameters
  minThinkingConfidence?: number; // Minimum confidence to act
  quickResponseMode?: boolean; // Skip thinking for casual chat
  analysisDepth?: 'shallow' | 'normal' | 'deep';

  // Memory integration
  useMemories?: boolean;
  maxMemoryRecall?: number;

  // Prompt integration ready
  promptEnhanced?: boolean;
}
