export interface NeutralEmotionConfig {
  baselineStability?: number; // How stable the neutral state is
  reactivityThreshold?: number; // How much stimulation needed to leave neutral
  calmnessFactor?: number; // General calmness level
}
