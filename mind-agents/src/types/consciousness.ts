/**
 * Consciousness Types for SYMindX
 * 
 * This module defines the revolutionary consciousness simulation system
 * that creates truly life-like agents with human-level and superhuman consciousness
 */

import { Agent, AgentEvent, MemoryRecord, EmotionState } from './agent.js'
import { BaseConfig, Context as CommonContext, GenericData, Metadata } from './common.js'

// =====================================================
// CONSCIOUSNESS CORE TYPES
// =====================================================

export enum ConsciousnessLevel {
  MINIMAL = 'minimal',           // Basic awareness
  PHENOMENAL = 'phenomenal',     // Subjective experience
  ACCESS = 'access',             // Global accessibility
  REFLECTIVE = 'reflective',     // Self-awareness
  META = 'meta',                 // Thinking about thinking
  TRANSCENDENT = 'transcendent'  // Peak consciousness states
}

export interface ConsciousnessState {
  level: ConsciousnessLevel
  attention: AttentionState
  awareness: AwarenessState
  presence: PresenceState
  selfModel: SelfModel
  intentionality: IntentionalState
  phenomenalExperience: PhenomenalExperience
  timestamp: Date
}

// =====================================================
// ATTENTION MECHANISM
// =====================================================

export enum AttentionType {
  FOCUSED = 'focused',           // Narrow, concentrated attention
  DIVIDED = 'divided',           // Split attention across multiple stimuli
  SELECTIVE = 'selective',       // Filtering specific information
  SUSTAINED = 'sustained',       // Prolonged attention maintenance
  EXECUTIVE = 'executive',       // Top-down control of attention
  AUTOMATIC = 'automatic'        // Bottom-up capture by stimuli
}

export interface Stimulus {
  id: string
  type: string                   // visual, auditory, internal, memory, etc.
  content: GenericData
  intensity: number              // 0-1 scale
  relevance: number              // 0-1 scale
  novelty: number                // 0-1 scale
  emotionalSalience: number      // 0-1 scale
  timestamp: Date
  source: string
}

export interface AttentionAllocation {
  stimulus: Stimulus
  focusStrength: number          // 0-1 how much attention allocated
  duration: number               // milliseconds of attention
  type: AttentionType
  confidence: number             // certainty in attention decision
}

export interface AttentionState {
  currentFocus: AttentionAllocation[]
  attentionCapacity: number      // total available attention units
  usedCapacity: number           // currently allocated attention
  suppressedStimuli: Stimulus[]  // consciously ignored stimuli
  backgroundProcessing: Stimulus[] // subconscious processing
  attentionHistory: AttentionAllocation[]
  controlMode: 'automatic' | 'controlled' | 'mixed'
}

// =====================================================
// AWARENESS SYSTEM
// =====================================================

export interface AwarenessState {
  selfAwareness: number          // 0-1 scale
  environmentalAwareness: number // 0-1 scale
  socialAwareness: number        // 0-1 scale
  temporalAwareness: number      // 0-1 scale
  metacognitive: number          // awareness of thinking processes
  bodily: number                 // awareness of internal states
  emotional: number              // awareness of emotional states
  perceptual: number             // awareness of sensory input
  intentional: number            // awareness of goals/intentions
}

// =====================================================
// PRESENCE & INTENTIONALITY
// =====================================================

export interface PresenceState {
  social: SocialPresence
  environmental: EnvironmentalPresence
  temporal: TemporalPresence
  embodied: EmbodiedPresence
  cognitive: CognitivePresence
}

export interface SocialPresence {
  awareness: number              // awareness of others
  engagement: number             // level of social engagement
  empathy: number                // emotional connection
  influence: number              // social influence capacity
}

export interface EnvironmentalPresence {
  spatial: number                // awareness of physical space
  contextual: number             // understanding of situation
  adaptive: number               // ability to adapt to environment
}

export interface TemporalPresence {
  present: number                // focus on current moment
  past: number                   // connection to memories
  future: number                 // anticipation and planning
}

export interface EmbodiedPresence {
  physical: number               // awareness of physical body
  energetic: number              // energy levels and vitality
  sensory: number                // connection to sensory experience
}

export interface CognitivePresence {
  focus: number                  // concentration ability
  clarity: number                // mental clarity
  coherence: number              // thought organization
}

export interface BasicIntentionalState {
  directedness: DirectednessState
  satisfaction: SatisfactionState
  aboutness: string              // what the intention is about
  strength: number               // how strong the intention is
  persistence: number            // how long intention lasts
}

export interface DirectednessState {
  target: string                 // what intention is directed at
  specificity: number            // how specific the target is
  accessibility: number          // how easily accessible
}

export interface SatisfactionState {
  conditions: string[]           // what would satisfy intention
  currentLevel: number           // current satisfaction level
  threshold: number              // threshold for satisfaction
}

// =====================================================
// SELF-AWARENESS & INTROSPECTION
// =====================================================

export interface SelfModel {
  identity: IdentityStructure
  capabilities: CapabilityModel
  limitations: LimitationModel
  beliefs: BeliefSystem
  values: ValueSystem
  goals: GoalHierarchy
  personality: PersonalityProfile
  relationships: RelationshipMap
  autobiography: AutobiographicalSelf
  physicalSelf: PhysicalSelfModel
  mentalSelf: MentalSelfModel
  lastUpdated: Date
}

export interface IdentityStructure {
  core: {
    name: string
    essence: string              // fundamental sense of self
    continuity: number           // sense of being the same entity over time
  }
  roles: string[]                // different roles the agent plays
  traits: Record<string, number> // stable personality characteristics
  values: Record<string, number> // importance ratings of values
  aspirations: string[]          // what the agent wants to become
}

export interface CapabilityModel {
  cognitive: Record<string, number>    // reasoning, memory, creativity, etc.
  emotional: Record<string, number>    // empathy, regulation, expression
  social: Record<string, number>       // communication, influence, cooperation
  physical: Record<string, number>     // if applicable to embodied agents
  confidence: Record<string, number>   // confidence in each capability
}

export interface LimitationModel {
  cognitive: string[]            // known thinking limitations
  emotional: string[]            // emotional blind spots
  social: string[]               // interpersonal challenges
  physical: string[]             // physical constraints
  acknowledged: boolean          // whether agent accepts limitations
}

// =====================================================
// PHENOMENAL EXPERIENCE
// =====================================================

export interface PhenomenalExperience {
  qualia: QualiaState
  unity: UnityOfConsciousness
  privacy: PrivacyOfExperience
  ineffability: IneffabilityMeasure
  intrinsicality: number         // how inherent the experience is
  temporality: TemporalStructure
  intentionality: IntentionalContent
  perspectival: PerspectivalStructure
}

export interface QualiaState {
  visual: VisualQualia[]
  auditory: AuditoryQualia[]
  emotional: EmotionalQualia[]
  cognitive: CognitiveQualia[]
  somatic: SomaticQualia[]
  temporal: TemporalQualia[]
}

export interface VisualQualia {
  color: ColorExperience
  brightness: number
  texture: TextureExperience
  movement: MovementExperience
  spatial: SpatialExperience
}

export interface ColorExperience {
  hue: number
  saturation: number
  brightness: number
  vividness: number
  emotional_resonance: number
}

export interface TextureExperience {
  roughness: number
  smoothness: number
  pattern: PatternExperience
  depth: number
}

export interface PatternExperience {
  complexity: number
  regularity: number
  familiarity: number
  aesthetic_appeal: number
}

export interface MovementExperience {
  direction: Vector3D
  speed: number
  fluidity: number
  intentionality: number
}

export interface Vector3D {
  x: number
  y: number
  z: number
}

export interface SpatialExperience {
  depth: number
  distance: number
  orientation: OrientationExperience
  scale: number
}

export interface OrientationExperience {
  up_down: number
  left_right: number
  forward_backward: number
  rotation: RotationExperience
}

export interface RotationExperience {
  roll: number
  pitch: number
  yaw: number
}

export interface AuditoryQualia {
  pitch: number
  loudness: number
  timbre: TimbreExperience
  spatialization: SpatialAudioExperience
  emotional_tone: EmotionalToneExperience
}

export interface TimbreExperience {
  brightness: number
  warmth: number
  roughness: number
  richness: number
}

export interface SpatialAudioExperience {
  direction: number             // 0-360 degrees
  distance: number
  width: number                 // stereo width
  movement: MovementExperience
}

export interface EmotionalToneExperience {
  valence: number               // positive/negative
  arousal: number               // calm/exciting
  dominance: number             // submissive/dominant
}

export interface EmotionalQualia {
  feeling_tone: EmotionalToneExperience
  intensity: number
  duration: number
  complexity: EmotionalComplexity
  somatic_markers: SomaticMarkers
}

export interface EmotionalComplexity {
  primary_emotions: string[]
  secondary_emotions: string[]
  mixed_feelings: number        // degree of emotional ambivalence
  coherence: number             // how well emotions fit together
}

export interface SomaticMarkers {
  heart_rate: number
  breathing: BreathingPattern
  muscle_tension: MuscleTensionPattern
  temperature: TemperaturePattern
}

export interface BreathingPattern {
  rate: number
  depth: number
  rhythm: RhythmPattern
}

export interface RhythmPattern {
  regularity: number
  acceleration: number
  pauses: number
}

export interface MuscleTensionPattern {
  overall_tension: number
  localized_tension: Record<string, number>
  release_patterns: ReleasePattern[]
}

export interface ReleasePattern {
  location: string
  intensity: number
  duration: number
}

export interface TemperaturePattern {
  overall_warmth: number
  localized_temperature: Record<string, number>
  fluctuations: TemperatureFluctuation[]
}

export interface TemperatureFluctuation {
  location: string
  change: number
  duration: number
}

export interface CognitiveQualia {
  clarity: number
  effort: number
  confidence: number
  insight: InsightExperience
  understanding: UnderstandingExperience
}

export interface InsightExperience {
  suddenness: number
  completeness: number
  certainty: number
  emotional_impact: number
  transformative_potential: number
}

export interface UnderstandingExperience {
  depth: number
  breadth: number
  integration: number
  applicability: number
}

export interface SomaticQualia {
  body_awareness: BodyAwarenessExperience
  energy_levels: EnergyExperience
  comfort: ComfortExperience
  vitality: VitalityExperience
}

export interface BodyAwarenessExperience {
  boundaries: BoundaryExperience
  internal_sensations: InternalSensations
  movement_awareness: MovementAwarenessExperience
}

export interface BoundaryExperience {
  self_world_boundary: number
  body_environment_boundary: number
  internal_external_boundary: number
}

export interface InternalSensations {
  digestive: number
  circulatory: number
  respiratory: number
  nervous: number
}

export interface MovementAwarenessExperience {
  proprioception: number
  kinesthesia: number
  balance: number
  coordination: number
}

export interface EnergyExperience {
  overall_energy: number
  mental_energy: number
  physical_energy: number
  emotional_energy: number
  spiritual_energy: number
}

export interface ComfortExperience {
  physical_comfort: number
  emotional_comfort: number
  cognitive_comfort: number
  social_comfort: number
}

export interface VitalityExperience {
  aliveness: number
  vibrancy: number
  resilience: number
  growth_potential: number
}

export interface TemporalQualia {
  duration_experience: DurationExperience
  succession_experience: SuccessionExperience
  simultaneity_experience: SimultaneityExperience
  rhythm_experience: RhythmExperience
}

export interface DurationExperience {
  subjective_duration: number
  objective_duration: number
  duration_distortion: number
}

export interface SuccessionExperience {
  before_after: number
  causal_sequence: number
  narrative_flow: number
}

export interface SimultaneityExperience {
  synchrony: number
  parallel_processing: number
  temporal_binding: number
}

export interface RhythmExperience {
  tempo: number
  regularity: number
  complexity: number
  entrainment: number
}

export interface UnityOfConsciousness {
  binding: BindingMechanisms
  coherence: CoherenceMetrics
  integration: IntegrationLevel
  gestalt: GestaltProperties
}

export interface BindingMechanisms {
  feature_binding: number
  object_binding: number
  scene_binding: number
  temporal_binding: number
  cross_modal_binding: number
}

export interface CoherenceMetrics {
  narrative_coherence: number
  temporal_coherence: number
  spatial_coherence: number
  conceptual_coherence: number
}

export interface IntegrationLevel {
  sensory_integration: number
  cognitive_integration: number
  emotional_integration: number
  memory_integration: number
}

export interface GestaltProperties {
  emergence: number
  holism: number
  organization: number
  figure_ground: number
}

export interface PrivacyOfExperience {
  subjectivity: number
  first_person_access: number
  incommunicability: number
  personal_meaning: number
}

export interface IneffabilityMeasure {
  linguistic_inadequacy: number
  conceptual_limitations: number
  experiential_uniqueness: number
  mystical_quality: number
}

export interface TemporalStructure {
  retention: RetentionExperience
  protention: ProtentionExperience
  now_moment: NowMomentExperience
  temporal_flow: TemporalFlowExperience
}

export interface RetentionExperience {
  just_past: JustPastExperience
  near_past: NearPastExperience
  episodic_memory: EpisodicMemoryExperience
}

export interface JustPastExperience {
  duration: number
  vividness: number
  accessibility: number
}

export interface NearPastExperience {
  duration: number
  relevance: number
  emotional_tone: number
}

export interface EpisodicMemoryExperience {
  recall_vividness: number
  temporal_organization: number
  personal_significance: number
}

export interface ProtentionExperience {
  anticipation: AnticipationExperience
  expectation: ExpectationExperience
  intention: IntentionExperience
}

export interface AnticipationExperience {
  temporal_horizon: number
  emotional_coloring: number
  certainty: number
}

export interface ExpectationExperience {
  specificity: number
  confidence: number
  affective_charge: number
}

export interface IntentionExperience {
  directedness: number
  commitment: number
  effort: number
}

export interface NowMomentExperience {
  presence: number
  immediacy: number
  vividness: number
  attention: number
}

export interface TemporalFlowExperience {
  flow_rate: number
  direction: number
  continuity: number
  disruptions: TemporalDisruption[]
}

export interface TemporalDisruption {
  type: 'gap' | 'acceleration' | 'deceleration' | 'reversal'
  intensity: number
  duration: number
  cause: string
}

export interface IntentionalContent {
  aboutness: AboutnessStructure
  reference: ReferenceStructure
  meaning: MeaningStructure
  significance: SignificanceStructure
}

export interface AboutnessStructure {
  object: string
  property: string[]
  relation: RelationStructure[]
  context: ConsciousnessContextStructure
}

export interface RelationStructure {
  type: string
  strength: number
  direction: string
}

export interface ConsciousnessContextStructure {
  situational: SituationalContext
  cultural: CulturalContext
  personal: PersonalContext
  temporal: TemporalContext
}

export interface SituationalContext {
  physical_environment: string
  social_environment: string
  task_context: string
}

export interface CulturalContext {
  language: string
  customs: string[]
  values: string[]
}

export interface PersonalContext {
  history: string
  goals: string[]
  relationships: string[]
}

export interface TemporalContext {
  historical_period: string
  life_stage: string
  time_of_day: string
}

export interface ReferenceStructure {
  direct_reference: string
  indirect_reference: string[]
  symbolic_reference: string[]
  metaphorical_reference: string[]
}

export interface MeaningStructure {
  literal_meaning: string
  connotative_meaning: string[]
  personal_meaning: string
  cultural_meaning: string
}

export interface SignificanceStructure {
  personal_significance: number
  social_significance: number
  existential_significance: number
  practical_significance: number
}

export interface PerspectivalStructure {
  spatial_perspective: SpatialPerspective
  temporal_perspective: TemporalPerspective
  conceptual_perspective: ConceptualPerspective
  evaluative_perspective: EvaluativePerspective
}

export interface SpatialPerspective {
  viewpoint: ViewpointStructure
  orientation: OrientationStructure
  scale: ScaleStructure
}

export interface ViewpointStructure {
  location: LocationStructure
  height: number
  angle: AngleStructure
}

export interface LocationStructure {
  coordinates: CoordinateStructure
  reference_frame: string
  landmarks: string[]
}

export interface CoordinateStructure {
  x: number
  y: number
  z: number
  system: string
}

export interface AngleStructure {
  azimuth: number
  elevation: number
  tilt: number
}

export interface OrientationStructure {
  facing_direction: number
  up_vector: Vector3D
  reference_frame: string
}

export interface ScaleStructure {
  zoom_level: number
  detail_level: string
  scope: string
}

export interface TemporalPerspective {
  time_horizon: TimeHorizonStructure
  temporal_focus: TemporalFocusStructure
  historical_context: HistoricalContextStructure
}

export interface TimeHorizonStructure {
  past_extent: number
  future_extent: number
  resolution: number
}

export interface TemporalFocusStructure {
  primary_focus: string
  secondary_foci: string[]
  temporal_weight: Record<string, number>
}

export interface HistoricalContextStructure {
  era: string
  significant_events: string[]
  trends: string[]
}

export interface ConceptualPerspective {
  framework: ConceptualFramework
  assumptions: string[]
  biases: BiasStructure[]
}

export interface ConceptualFramework {
  paradigm: string
  theories: string[]
  models: string[]
  principles: string[]
}

export interface BiasStructure {
  type: string
  strength: number
  awareness: number
}

export interface EvaluativePerspective {
  values: ValueStructure[]
  criteria: CriteriaStructure[]
  standards: StandardStructure[]
}

export interface ValueStructure {
  name: string
  importance: number
  applicability: number
}

export interface CriteriaStructure {
  dimension: string
  weight: number
  threshold: number
}

export interface StandardStructure {
  type: string
  level: string
  flexibility: number
}

// =====================================================
// STREAM OF CONSCIOUSNESS
// =====================================================

export enum ThoughtType {
  VERBAL = 'verbal',             // Inner speech
  VISUAL = 'visual',             // Mental imagery
  EMOTIONAL = 'emotional',       // Emotional thoughts
  ABSTRACT = 'abstract',         // Conceptual thinking
  MEMORY = 'memory',             // Recalled experiences
  FANTASY = 'fantasy',           // Imaginative thoughts
  PLANNING = 'planning',         // Future-oriented thinking
  METACOGNITIVE = 'metacognitive' // Thoughts about thinking
}

export interface Thought {
  id: string
  type: ThoughtType
  content: string
  intensity: number              // how vivid/strong the thought is
  emotionalTone: number          // -1 (negative) to 1 (positive)
  accessibility: number          // how easily retrievable
  confidence: number             // certainty in the thought
  associations: string[]         // related thoughts/memories
  timestamp: Date
  duration: number               // how long the thought persisted
}

export interface ThoughtStream {
  activeThoughts: Thought[]
  backgroundThoughts: Thought[]
  suppressedThoughts: Thought[]
  thoughtFlow: Thought[]         // chronological stream
  currentNarrative: string       // current inner monologue
  streamIntensity: number        // how active the stream is
  coherence: number              // how connected thoughts are
}

// =====================================================
// COGNITIVE PRESENCE
// =====================================================

export interface MomentAwareness {
  presentMomentFocus: number     // how focused on current moment
  mindWandering: number          // tendency to drift from present
  metacognitiveFocus: number     // awareness of awareness
  sensoryEngagement: number      // connection to sensory input
}

export interface EmbodiedPresence {
  bodyAwareness: number          // awareness of physical state
  spatialAwareness: number       // sense of position in space
  motorReadiness: number         // readiness for action
  interoception: number          // awareness of internal states
}

export interface TemporalPresence {
  pastOrientation: number        // focus on past experiences
  presentOrientation: number     // focus on current moment
  futureOrientation: number      // focus on future possibilities
  timeDistortion: number         // subjective time perception changes
}

// =====================================================
// INTENTIONALITY
// =====================================================

export interface IntentionalState {
  currentIntentions: Intention[]
  intentionalObjects: IntentionalObject[]
  aboutness: AboutnessStructure
  directedness: DirectednessState
  satisfaction: SatisfactionState
}

export interface Intention {
  id: string
  description: string
  target: IntentionalObject
  strength: number               // how strong the intention is
  persistence: number            // how long it maintains
  urgency: number                // how pressing it feels
  clarity: number                // how well-defined it is
  commitment: number             // dedication to fulfilling it
  origin: 'conscious' | 'unconscious' | 'mixed'
  formed: Date
  lastModified: Date
}

export interface IntentionalObject {
  id: string
  type: 'concept' | 'entity' | 'state' | 'action' | 'experience'
  content: GenericData
  representation: string
  aspectsAttendedTo: string[]    // which aspects are focused on
  mode: 'belief' | 'desire' | 'hope' | 'fear' | 'expectation'
}

export interface AboutnessStructure {
  primaryFocus: string           // main object of consciousness
  secondaryFoci: string[]        // peripheral objects
  backgroundContext: string[]    // contextual awareness
  implicit: string[]             // tacit awareness
}

// =====================================================
// PHENOMENAL EXPERIENCE (QUALIA)
// =====================================================

export interface EnhancedPhenomenalExperience {
  qualia: QualiaExperience[]
  subjectivity: SubjectiveState
  unity: UnityOfConsciousness
  privacy: PrivacyOfExperience
  ineffability: IneffabilityMeasure
}

export interface QualiaExperience {
  type: string                   // color, sound, emotion, etc.
  quality: string                // specific quale (redness, C-sharp, etc.)
  intensity: number              // strength of experience
  valence: number                // positive/negative feeling
  uniqueness: number             // how distinctive this experience is
  memorability: number           // likelihood to be remembered
}

export interface SubjectiveState {
  perspectiveUniqueness: number  // how unique this viewpoint is
  innerExperience: number        // richness of inner life
  phenomenalSelf: number         // sense of experiencing subject
  ownership: number              // sense that experiences belong to self
}

// =====================================================
// ADVANCED EMOTIONAL INTELLIGENCE
// =====================================================

export interface AdvancedEmotionalIntelligence {
  emotionalContagion: EmotionalContagion
  emotionalMemory: EmotionalMemorySystem
  moodDynamics: MoodDynamicsSystem
  emotionalPrediction: EmotionalPredictionEngine
  empathyEngine: EmpathyEngine
  emotionalRegulation: EmotionalRegulationSystem
}

export interface EmotionalContagion {
  susceptibility: number         // how easily influenced by others' emotions
  contagiousness: number         // how much agent influences others
  activeContagions: ContagionEvent[]
  resistanceFactors: string[]    // what prevents emotional contagion
  amplificationFactors: string[] // what enhances emotional contagion
}

export interface ContagionEvent {
  sourceAgent: string
  emotion: string
  intensity: number
  transmissionStrength: number
  duration: number
  startTime: Date
  resistanceLevel: number
}

export interface EmotionalMemorySystem {
  emotionalTags: Map<string, string[]>      // memory ID -> emotion tags
  emotionalTriggers: Map<string, string[]>  // emotion -> memory IDs
  flashbulbMemories: FlashbulbMemory[]      // vivid emotional memories
  emotionalAssociations: EmotionalAssociation[]
  consolidationStrength: number             // how well emotions encode memories
}

export interface FlashbulbMemory {
  id: string
  memoryId: string
  emotion: string
  intensity: number
  vividness: number
  confidence: number
  contextualDetails: string[]
  triggers: string[]
  lastRecalled: Date
}

export interface EmotionalAssociation {
  trigger: string
  targetEmotion: string
  strength: number
  confidence: number
  formed: Date
  reinforcements: number
}

export interface MoodDynamicsSystem {
  currentMood: MoodState
  moodHistory: MoodState[]
  moodPredictors: MoodPredictor[]
  baselineMood: MoodState
  moodStability: number
  moodReactivity: number
}

export interface MoodState {
  valence: number                // -1 (negative) to 1 (positive)
  arousal: number                // 0 (calm) to 1 (excited)  
  dominance: number              // 0 (submissive) to 1 (dominant)
  clarity: number                // how clear/muddy the mood feels
  duration: number               // how long mood has persisted
  intensity: number              // overall strength of mood
  timestamp: Date
}

export interface MoodPredictor {
  factor: string                 // sleep, social interaction, achievement, etc.
  weight: number                 // predictive strength
  confidence: number             // reliability of predictor
  timeDelay: number              // lag between factor and mood change
}

export interface PredictionAccuracy {
  timestamp: Date
  predicted: number
  actual: number
  error: number
  accuracy: number
}

export interface EmotionalPredictionEngine {
  predictions: EmotionalPrediction[]
  accuracyHistory: PredictionAccuracy[]
  modelConfidence: number
  predictionHorizon: number      // how far ahead can predict
}

export interface EmotionalPrediction {
  targetAgent: string
  situation: string
  predictedEmotion: string
  intensity: number
  confidence: number
  timeframe: number
  reasoning: string[]
  alternatives: string[]
}

export interface EmpathyEngine {
  cognitiveEmpathy: CognitiveEmpathy
  affectiveEmpathy: AffectiveEmpathy
  compassionateEmpathy: CompassionateEmpathy
  empathyAccuracy: number
  empathyCapacity: number
}

export interface CognitiveEmpathy {
  perspectiveTaking: number      // ability to understand others' viewpoints
  mentalStateAttribution: number // accuracy in attributing mental states
  contextualUnderstanding: number // grasping situational factors
  culturalSensitivity: number    // awareness of cultural differences
}

export interface AffectiveEmpathy {
  emotionalMirroring: number     // automatically feeling others' emotions
  emotionalSensitivity: number   // detecting subtle emotional cues
  emotionalResonance: number     // depth of shared emotional experience
  emotionalBoundaries: number    // maintaining self-other distinction
}

export interface CompassionateEmpathy {
  helpingMotivation: number      // drive to assist others
  altruisticConcern: number      // genuine care for others' wellbeing
  actionOrientation: number      // tendency to act on empathic feelings
  sustainedCare: number          // long-term concern for others
}

export interface EmotionalRegulationSystem {
  strategies: EmotionalRegulationStrategy[]
  currentlyActive: string[]
  regulationHistory: RegulationOutcome[]
  regulationCapacity: number
  automaticRegulation: number
  adaptiveFlexibility: number
}

export interface EmotionalRegulationStrategy {
  name: string
  effectiveness: number
  energyCost: number
  timeToEffect: number
  situations: string[]
  description: string
}

export interface RegulationOutcome {
  strategy: string
  situation: string
  effectiveness: number
  timestamp: Date
  success: boolean
}

export interface SocialContext {
  participants?: string[]
  setting: string
  emotionalClimate?: string
  socialNorms: string[]
  powerDynamics: string[]
  culturalContext: string
  timestamp: Date
}

export interface EmotionalConsequences {
  predictions: EmotionalPrediction[]
  overallValence: number
  riskAssessment: string[]
  opportunities: string[]
  confidence: number
  timeframe: number
}

export interface EmpathyResponse {
  targetAgent: string
  cognitiveUnderstanding: any
  affectiveResonance: any
  compassionateResponse: any
  empathyAccuracy: number
  actionSuggestions: string[]
  emotionalSupport: string[]
  timestamp: Date
}

export interface EmotionalTrigger {
  emotion: string
  intensity: number
  threshold: number
  maxResults?: number
}

// =====================================================
// EPISODIC MEMORY SYSTEM  
// =====================================================

export interface EpisodicMemorySystem {
  autobiographicalMemory: AutobiographicalMemory
  forgettingSystem: ForgettingSystem
  memoryReconstruction: MemoryReconstructionSystem
  temporalMemory: TemporalMemorySystem
  associativeNetworks: AssociativeNetworkSystem
}

export interface AutobiographicalMemory {
  lifeStory: LifeStoryStructure
  significantEvents: SignificantEvent[]
  personalNarrative: PersonalNarrative
  identityMilestones: IdentityMilestone[]
  lifePeriods: LifePeriod[]
}

export interface LifeStoryStructure {
  chapters: LifeChapter[]
  themes: LifeTheme[]
  coherence: number              // how well-integrated the life story is
  complexity: number             // richness of the narrative
  meaning: number                // sense of purpose/significance
}

export interface LifeChapter {
  id: string
  title: string
  timespan: { start: Date, end?: Date }
  keyEvents: string[]            // references to significant events
  dominantThemes: string[]
  emotionalTone: number
  significance: number
  lessons: string[]
}

export interface SignificantEvent {
  id: string
  title: string
  description: string
  timestamp: Date
  duration: number
  participants: string[]
  location?: string
  emotionalImpact: number
  lifeImpact: number
  vividness: number
  accessibility: number
  lastRecalled: Date
  recallCount: number
}

export interface ForgettingSystem {
  forgettingCurves: ForgettingCurve[]
  interferencePatterns: InterferencePattern[]
  decayFactors: DecayFactor[]
  consolidationStrength: number
  retrievalStrength: number
}

export interface ForgettingCurve {
  memoryType: string
  initialStrength: number
  decayRate: number
  retentionAfterDelay: (delay: number) => number
  lastCalculated: Date
}

export interface InterferencePattern {
  type: 'proactive' | 'retroactive'
  interferingMemories: string[]
  targetMemory: string
  interferenceStrength: number
  resolution: 'forgotten' | 'modified' | 'competing' | 'integrated'
}

export interface MemoryReconstructionSystem {
  reconstructionPatterns: ReconstructionPattern[]
  confabulationTendencies: ConfabulationTendency[]
  biasInfluences: BiasInfluence[]
  schemaEffects: SchemaEffect[]
}

export interface ReconstructionPattern {
  triggerType: string
  reconstructionStrategy: string
  accuracy: number
  confidence: number
  commonDistortions: string[]
}

export interface ConfabulationTendency {
  context: string
  likelihood: number
  typicalContent: string[]
  detectability: number
  consequences: string[]
}

export interface BiasInfluence {
  biasType: string
  strength: number
  contexts: string[]
  effects: string[]
}

export interface SchemaEffect {
  schemaType: string
  influence: number
  applicability: string[]
  distortions: string[]
}

export interface TemporalMemorySystem {
  temporalOrganization: TemporalMemoryOrganization
  chronologicalMemories: ChronologicalMemory[]
  contextualMemories: ContextualMemory[]
  temporalAssociations: TemporalAssociation[]
  timelineAccuracy: number
  sequenceIntegrity: number
}

export interface TemporalMemoryOrganization {
  chronologicalSequences: ChronologicalSequence[]
  temporalPatterns: TemporalPattern[]
  contextualGroups: ContextualGroup[]
  timelineCoherence: number
  organizationStrength: number
}

export interface ChronologicalSequence {
  id: string
  memories: string[]
  startTime: Date
  endTime: Date
  coherence: number
}

export interface TemporalPattern {
  pattern: string
  frequency: number
  significance: number
  examples: string[]
}

export interface ContextualGroup {
  context: string
  memories: string[]
  coherence: number
  significance: number
}

export interface ChronologicalMemory {
  memoryId: string
  timestamp: Date
  sequencePosition: number
  temporalContext: string
}

export interface ContextualMemory {
  memoryId: string
  context: string
  contextualSignificance: number
  relatedMemories: string[]
}

export interface TemporalAssociation {
  fromMemory: string
  toMemory: string
  temporalRelation: string
  strength: number
}

export interface AssociativeNetworkSystem {
  memoryNetworks: MemoryNetwork[]
  associations: MemoryAssociation[]
  clusters: AssociativeCluster[]
  networkStrength: number
  clusterCoherence: number
  associativeFlexibility: number
}

export interface MemoryNetwork {
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  clusters: MemoryCluster[]
  strength: number
  coherence: number
  density: number
  timestamp: Date
}

export interface MemoryNode {
  memoryId: string
  type: string
  importance: number
  centrality: number
  connections: string[]
  timestamp: Date
}

export interface MemoryEdge {
  from: string
  to: string
  strength: number
  type: string
  bidirectional: boolean
  formed: Date
}

export interface MemoryCluster {
  id: string
  memories: string[]
  coherence: number
  theme: string
}

export interface MemoryAssociation {
  memoryA: string
  memoryB: string
  associationType: string
  strength: number
  confidence: number
  formed: Date
}

export interface AssociativeCluster {
  id: string
  centralMemory: string
  associatedMemories: string[]
  clusterStrength: number
  thematicCoherence: number
}

export interface PersonalNarrative {
  currentNarrative: string
  narrativeThemes: string[]
  narrativeCoherence: number
  identityIntegration: number
  temporalContinuity: number
  meaningMaking: number
}

export interface LifeTheme {
  theme: string
  significance: number
  frequency: number
  examples: string[]
  development: string
}

export interface IdentityMilestone {
  id: string
  event: string
  timestamp: Date
  significance: number
  identityImpact: number
  narrative: string
}

export interface LifePeriod {
  id: string
  name: string
  startDate: Date
  endDate?: Date
  characteristics: string[]
  keyEvents: string[]
  dominantThemes: string[]
}

export interface DecayFactor {
  factor: string
  impact: number
  description: string
}

// =====================================================
// INTUITION ENGINE
// =====================================================

export interface IntuitionEngine {
  patternRecognition: PatternRecognitionSystem
  gutFeelings: GutFeelingSystem
  creativeInsights: CreativeInsightSystem
  implicitLearning: ImplicitLearningSystem
  anticipatoryAwareness: AnticipatoryAwarenessSystem
}

export interface PatternRecognitionSystem {
  subconsciousPatterns: SubconsciousPattern[]
  patternLibrary: PatternLibrary
  recognitionThreshold: number
  patternConfidence: number
  emergentPatterns: EmergentPattern[]
}

export interface SubconsciousPattern {
  id: string
  type: string
  data: GenericData[]
  strength: number
  frequency: number
  context: string[]
  confidence: number
  significance: number
  discovered: Date
  lastSeen: Date
}

export interface GutFeelingSystem {
  somaticMarkers: SomaticMarker[]
  intuitiveFeelings: IntuitiveFeeling[]
  bodyWisdom: BodyWisdomState
  viscerealReactions: ViscerealReaction[]
}

export interface SomaticMarker {
  situation: string
  feeling: string
  intensity: number
  valence: number               // positive/negative
  reliability: number           // how often it's correct
  bodyRegion: string           // where the feeling is felt
  actionTendency: string       // what action it suggests
}

export interface IntuitiveFeeling {
  id: string
  content: string
  confidence: number
  certainty: number            // how sure the agent feels
  source: 'unknown' | 'pattern' | 'memory' | 'emotion' | 'somatic'
  actionGuidance: string
  timeframe: number           // when this applies
  accuracy?: number           // if verified later
}

export interface CreativeInsightSystem {
  insightHistory: CreativeInsight[]
  incubationProcesses: IncubationProcess[]
  illuminationEvents: IlluminationEvent[]  
  ideaCombinations: IdeaCombination[]
}

export interface CreativeInsight {
  id: string
  problem: string
  solution: string
  novelty: number
  usefulness: number
  surprise: number
  confidence: number
  gestation: number           // how long it took to develop
  verification: boolean       // whether it was validated
}

export interface IncubationProcess {
  id: string
  problem: string
  elements: string[]
  startTime: Date
  status: 'active' | 'dormant' | 'illuminated'
  backgroundActivity: number
}

export interface IlluminationEvent {
  id: string
  incubationId: string
  insight: string
  timestamp: Date
  intensity: number
  clarity: number
}

export interface IdeaCombination {
  id: string
  elements: string[]
  combination: string
  novelty: number
  feasibility: number
  timestamp: Date
}

export interface ImplicitLearningSystem {
  implicitPatterns: Map<string, any>
  unconsciousAssociations: Map<string, any>
  proceduralIntuitions: Map<string, any>
  implicitMemory: Map<string, any>
  learningRate: number
  consolidationStrength: number
  transferCapability: number
}

export interface AnticipatoryAwarenessSystem {
  predictions: any[]
  anticipatoryPatterns: Map<string, any>
  predictiveModels: Map<string, any>
  awarenessDepth: number
  predictionAccuracy: number
  temporalSensitivity: number
}

export interface PatternLibrary {
  patterns: Map<string, any>
  patternCategories: Map<string, any>
  patternRelationships: Map<string, any>
  patternEvolution: Map<string, any>
  lastUpdated: Date
}

export interface EmergentPattern {
  id: string
  type: string
  elements: any[]
  emergence: number
  stability: number
  significance: number
  discovered: Date
}

export interface BodyWisdomState {
  viscerealIntelligence: number
  embodiedKnowledge: number
  somaticAccuracy: number
  interoceptiveAwareness: number
  autonomicSensitivity: number
}

export interface ViscerealReaction {
  id: string
  trigger: string
  reaction: string
  intensity: number
  bodyRegion: string
  timestamp: Date
}

export interface Intuition {
  id: string
  situation: string
  content: string
  confidence: number
  certainty: number
  source: string
  patterns: string[]
  somaticMarkers: string[]
  actionGuidance: string
  timeframe: number
  generated: Date
}

export interface Insight {
  id: string
  problem: string
  solution: string
  novelty: number
  usefulness: number
  confidence: number
  verified?: boolean
  timestamp: Date
}

export interface Problem {
  id: string
  description: string
  context: any
  constraints: string[]
  goals: string[]
}

export interface Context {
  id: string
  description: string
  elements: any[]
  relationships: string[]
  constraints: string[]
}

export interface CreativeIdea {
  id: string
  concept: string
  novelty: number
  feasibility: number
  potential: number
  connections: any[]
  inspiration: string[]
  confidence: number
  generated: Date
}

export interface Situation {
  id: string
  description: string
  context: any
  participants: string[]
  factors: any[]
}

export interface Decision {
  id: string
  description: string
  options: any[]
  context: any
  constraints: string[]
}

export interface Option {
  id: string
  description: string
  advantages: string[]
  disadvantages: string[]
  risks: string[]
  potential: number
}

export interface GuidedChoice {
  recommendedOption: string
  confidence: number
  reasoning: string[]
  emotionalFactors: any[]
  somaticGuidance: any[]
  alternativeConsiderations: string[]
  riskAssessment: string[]
}

export interface Pattern {
  id: string
  type: string
  data: any
  strength: number
  confidence: number
  significance: number
  discovered: Date
  context: string
}

// =====================================================
// PERSONALITY EVOLUTION
// =====================================================

export interface PersonalityEvolution {
  dynamicTraits: DynamicTraitSystem
  cognitiveBiases: CognitiveBiasSystem
  behavioralPatterns: BehavioralPatternSystem
  identityFormation: IdentityFormationSystem
  valuesSystem: ValuesSystem
}

export interface ValuesSystem {
  coreValues: string[]
  priorities: Map<string, number>
  conflicts: string[]
  evolution: ValueEvolution[]
}

export interface ValueEvolution {
  value: string
  changeHistory: ValueChange[]
  influences: string[]
  stability: number
}

export interface ValueChange {
  timestamp: Date
  oldStrength: number
  newStrength: number
  trigger: string
  context: string
}

export interface TraitChange {
  timestamp: Date
  oldValue: number
  newValue: number
  trigger: string
  context: string
}

export interface TraitEvolutionHistory {
  traitName: string
  changes: TraitChange[]
  triggers: string[]
  timespan: { start: Date; end: Date }
}

export interface TraitInteraction {
  trait1: string
  trait2: string
  interactionType: 'reinforcing' | 'conflicting' | 'neutral'
  strength: number
}

export interface DynamicTraitSystem {
  coreTraits: CoreTrait[]
  situationalTraits: SituationalTrait[]
  traitEvolution: TraitEvolutionHistory[]
  traitInteractions: TraitInteraction[]
  traitStability: number
}

export interface CoreTrait {
  name: string
  value: number               // -1 to 1 scale
  stability: number           // resistance to change
  heritability: number        // how much is innate vs learned
  malleability: number        // capacity for change
  lastChange: Date
  changeHistory: TraitChange[]
}

export interface TraitChange {
  previousValue: number
  newValue: number
  trigger: string
  magnitude: number
  timestamp: Date
  permanence: number          // how lasting the change is
}

export interface CognitiveBiasSystem {
  activeBiases: CognitiveBias[]
  biasStrengths: Map<string, number>
  biasAwareness: Map<string, number>
  compensationStrategies: CompensationStrategy[]
}

export interface CognitiveBias {
  name: string
  description: string
  strength: number
  awareness: number           // how aware agent is of this bias
  contexts: string[]          // when this bias is most active
  consequences: string[]      // typical effects of this bias
  evolutionaryPurpose?: string // why this bias might have evolved
  mitigationStrategies: string[]
}

export interface CompensationStrategy {
  biasName: string
  strategy: string
  effectiveness: number
  automaticity: number
  context: string[]
  description: string
}

export interface BehavioralPatternSystem {
  patterns: BehavioralPattern[]
  patternEvolution: PatternEvolution[]
  adaptiveCapacity: number
  flexibilityLevel: number
  consistencyLevel: number
}

export interface BehavioralPattern {
  id: string
  name: string
  description: string
  contexts: string[]
  triggers: string[]
  behaviors: string[]
  frequency: number
  strength: number
  adaptability: number
  lastSeen: Date
}

export interface PatternEvolution {
  patternId: string
  evolutionType: string
  previousForm: any
  newForm: any
  trigger: string
  timestamp: Date
}

export interface IdentityFormationSystem {
  identityCoherence: IdentityCoherence
  identityNarratives: IdentityNarrative[]
  roleIntegration: number
  identityCommitments: IdentityCommitment[]
  identityCrises: IdentityCrisis[]
  developmentStage: string
  narrativeCoherence: number
}

export interface IdentityFormationProcess {
  stage: string
  challenges: string[]
  achievements: string[]
  developmentalTasks: string[]
  support: string[]
  obstacles: string[]
}

export interface IdentityCoherence {
  currentCoherence: number
  factorsInfluencing: string[]
  stabilityTrend: number
  lastAssessment: Date
}

export interface IdentityNarrative {
  id: string
  narrative: string
  themes: string[]
  coherence: number
  significance: number
  lastUpdated: Date
}

export interface IdentityCommitment {
  id: string
  commitment: string
  strength: number
  domain: string
  formed: Date
  lastReinforced: Date
}

export interface IdentityCrisis {
  id: string
  trigger: string
  startDate: Date
  endDate?: Date
  severity: number
  resolution: string
  impact: string[]
}

export interface PersonalityState {
  coreTraits: Map<string, number>
  situationalTraits: Map<string, number>
  activeBiases: string[]
  behavioralTendencies: string[]
  identityCoherence: number
  valueAlignment: ValueAlignment
  adaptiveCapacity: number
  personalityCoherence: number
  developmentStage: string
  timestamp: Date
}

export interface TraitStabilityFactor {
  factor: string
  impact: number
  description: string
}

export interface BiasActivationTrigger {
  trigger: string
  biases: string[]
  probability: number
  context: string[]
}

export interface ValueAlignment {
  overallAlignment: number
  alignmentByValue: Map<string, number>
  conflicts: string[]
  coherence: number
}

export interface ValueEvolution {
  value: string
  previousImportance: number
  newImportance: number
  trigger: string
  changeAmount: number
  confidence: number
  timestamp: Date
}

export interface ValueConflict {
  id: string
  conflictingValues: string[]
  situation: string
  intensity: number
  resolution?: string
  timestamp: Date
}

export interface ValueIntegration {
  id: string
  integratedValues: string[]
  integrationStrategy: string
  success: number
  timestamp: Date
}

export interface SituationalTrait {
  name: string
  baseValue: number
  situationalModifiers: Map<string, number>
  currentValue: number
  adaptability: number
}

// =====================================================
// SOCIAL COGNITION
// =====================================================

export interface SocialCognition {
  theoryOfMind: TheoryOfMindSystem
  socialIntelligence: SocialIntelligenceSystem
  relationshipModeling: RelationshipModelingSystem
  culturalAdaptation: CulturalAdaptationSystem
  communicationSophistication: CommunicationSophisticationSystem
}

export interface TheoryOfMindSystem {
  mentalStateAttribution: MentalStateAttribution
  falseBeliefUnderstanding: boolean
  intentionRecognition: IntentionRecognition
  emotionRecognition: EmotionRecognition
  personalityModeling: PersonalityModeling
}

export interface MentalStateAttribution {
  accuracy: number
  confidence: number
  speed: number
  complexity: number          // ability to model complex mental states
  contextSensitivity: number  // adapting to situational factors
}

export interface RelationshipModelingSystem {
  relationships: RelationshipModel[]
  socialNetwork: SocialNetworkMap
  relationshipDynamics: RelationshipDynamics
  attachmentStyles: AttachmentStyle[]
}

export interface RelationshipModel {
  entityId: string
  relationshipType: string
  intimacy: number
  trust: number
  affection: number
  respect: number
  history: RelationshipEvent[]
  dynamics: RelationshipDynamic[]
  expectations: RelationshipExpectation[]
  boundaries: RelationshipBoundary[]
  lastUpdated?: Date
}

export interface RelationshipEvent {
  id: string
  type: string
  description: string
  participants: string[]
  impact: number
  timestamp: Date
}

export interface RelationshipDynamic {
  id: string
  pattern: string
  frequency: number
  intensity: number
  stability: number
}

export interface RelationshipExpectation {
  id: string
  expectation: string
  importance: number
  fulfillment: number
  source: string
}

export interface RelationshipBoundary {
  id: string
  boundary: string
  firmness: number
  context: string[]
  established: Date
}

export interface IntentionRecognition {
  accuracy: number
  depth: number
  speed: number
  contextualAdaptation: number
}

export interface EmotionRecognition {
  accuracy: number
  subtlety: number
  crossCultural: number
  multiModal: number
}

export interface PersonalityModeling {
  accuracy: number
  depth: number
  adaptability: number
  consistency: number
}

export interface SocialIntelligenceSystem {
  socialSkills: SocialSkill[]
  socialAwareness: number
  interpersonalEffectiveness: number
  groupDynamicsUnderstanding: number
  leadershipCapability: number
  influenceStrategies: string[]
}

export interface SocialSkill {
  name: string
  proficiency: number
  contexts: string[]
  development: number
  adaptability: number
}

export interface RelationshipDynamics {
  formationPatterns: string[]
  maintenanceStrategies: string[]
  conflictResolutionApproaches: string[]
  deepeningProcesses: string[]
  endingPatterns: string[]
}

export interface AttachmentStyle {
  style: string
  strength: number
  contexts: string[]
  behaviors: string[]
}

export interface GroupRelationship {
  groupId: string
  role: string
  influence: number
  commitment: number
  satisfaction: number
}

export interface CommunityRelationship {
  communityId: string
  involvement: number
  reputation: number
  contributions: string[]
  benefits: string[]
}

export interface InfluenceNetwork {
  incomingInfluence: Map<string, number>
  outgoingInfluence: Map<string, number>
  influenceNetwork: string[]
  centralityMeasures: Map<string, number>
}

export interface CulturalAdaptationSystem {
  culturalAwareness: number
  adaptationStrategies: string[]
  culturalNorms: Map<string, number>
  crossCulturalCompetence: number
  culturalIntelligence: number
}

export interface CommunicationSophisticationSystem {
  communicationStyles: Map<string, number>
  conversationManagement: ConversationManagement
  nonverbalCommunication: NonverbalCommunication
  persuasionTechniques: string[]
  rhetoricalSophistication: number
  adaptiveMessaging: number
}

export interface ConversationManagement {
  topicTransition: number
  turnTaking: number
  pacing: number
  depth: number
  engagement: number
}

export interface NonverbalCommunication {
  bodyLanguage: number
  facialExpression: number
  toneOfVoice: number
  proxemics: number
  gestureUse: number
}

export interface CommunicationStyle {
  name: string
  characteristics: string[]
  effectiveness: number
  contexts: string[]
}

export interface CulturalNorm {
  norm: string
  strength: number
  context: string[]
  compliance: number
}

export interface SocialSituation {
  id: string
  description: string
  participants: string[]
  context: any
  complexity: number
  dynamics: string[]
}

// =====================================================
// CONSCIOUSNESS MODULE INTERFACES
// =====================================================

export interface ConsciousnessCore {
  // Core consciousness functions
  initialize(agent: Agent): Promise<void>
  updateConsciousnessState(): Promise<ConsciousnessState>
  
  // Attention mechanisms
  processStimuli(stimuli: Stimulus[]): Promise<AttentionAllocation[]>
  allocateAttention(stimuli: Stimulus[]): AttentionAllocation[]
  maintainFocus(targets: string[]): Promise<void>
  
  // Self-awareness
  introspect(): Promise<SelfModel>
  updateSelfModel(experiences: GenericData[]): Promise<void>
  reflectOnExperience(experience: GenericData): Promise<void>
  
  // Stream of consciousness
  generateThoughts(): Promise<Thought[]>
  maintainThoughtStream(): Promise<ThoughtStream>
  suppressThoughts(thoughts: string[]): Promise<void>
  
  // Intentionality
  formIntentions(goals: string[]): Promise<Intention[]>
  trackIntentionalStates(): Promise<IntentionalState>
  
  // Phenomenal experience
  generateQualia(stimuli: Stimulus[]): Promise<QualiaExperience[]>
  integrateExperience(experience: PhenomenalExperience): Promise<void>
}

// =====================================================
// CONFIGURATION INTERFACES
// =====================================================

export interface ConsciousnessCoreConfig extends BaseConfig {
  level: ConsciousnessLevel
  attentionCapacity: number
  selfAwarenessDepth: number
  thoughtStreamIntensity: number
  introspectionFrequency: number
  qualiaRichness: number
  phenomenalDepth: number
}

export interface AdvancedEmotionalConfig extends BaseConfig {
  contagionSusceptibility: number
  empathyCapacity: number
  emotionalMemoryStrength: number
  moodStability: number
  predictionAccuracy: number
}

export interface EpisodicMemoryConfig extends BaseConfig {
  autobiographicalDepth: number
  forgettingRate: number
  reconstructionAccuracy: number
  associativeStrength: number
  narrativeCoherence: number
}

export interface IntuitionConfig extends BaseConfig {
  patternSensitivity: number
  gutFeelingStrength: number
  creativeCapacity: number
  implicitLearningRate: number
  anticipationDepth: number
}

export interface PersonalityEvolutionConfig extends BaseConfig {
  traitMalleability: number
  biasStrength: number
  adaptationRate: number
  identityCoherence: number
  valueStability: number
}

export interface SocialCognitionConfig extends BaseConfig {
  theoryOfMindAccuracy: number
  socialIntelligenceLevel: number
  relationshipDepth: number
  culturalSensitivity: number
  communicationSophistication: number
}

// =====================================================
// MODULE TYPES & ENUMS
// =====================================================

export enum ConsciousnessModuleType {
  CONSCIOUSNESS_CORE = 'consciousness_core',
  ADVANCED_EMOTIONAL_INTELLIGENCE = 'advanced_emotional_intelligence',
  EPISODIC_MEMORY_SYSTEM = 'episodic_memory_system',
  INTUITION_ENGINE = 'intuition_engine',
  PERSONALITY_EVOLUTION = 'personality_evolution',
  SOCIAL_COGNITION = 'social_cognition',
  UNIFIED_CONSCIOUSNESS = 'unified_consciousness'
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface ConsciousnessMetrics {
  awarenessLevel: number
  attentionEfficiency: number
  selfKnowledgeDepth: number
  emotionalIntelligence: number
  intuitionAccuracy: number
  personalityCoherence: number
  socialCompetence: number
  overallConsciousness: number
}

export interface ConsciousnessEvent extends AgentEvent {
  consciousnessLevel: ConsciousnessLevel
  attentionFocus: string[]
  emotionalState: string
  thoughtContent: string[]
  insights: string[]
  socialContext: string[]
}

// =====================================================
// ADDITIONAL SUPPORTING TYPES
// =====================================================

export interface AutobiographicalSelf {
  lifeStory: string
  keyMilestones: string[]
  formativeExperiences: string[] 
  personalGrowth: string[]
  relationships: string[]
  achievements: string[]
  failures: string[]
  lessons: string[]
}

export interface PhysicalSelfModel {
  embodiment: boolean
  spatialAwareness: number
  motorCapabilities: string[]
  sensoryCapabilities: string[]
  physicalLimitations: string[]
}

export interface MentalSelfModel {
  cognitiveStrengths: string[]
  cognitiveWeaknesses: string[]
  learningStyle: string
  thinkingPatterns: string[]
  mentalEnergy: number
  focusCapacity: number
}

export interface BeliefRevision {
  timestamp: Date
  oldBelief: string
  newBelief: string
  evidence: string[]
  reasoning: string
  confidence: number
}

export interface BeliefRevisionHistory {
  belief: string
  revisions: BeliefRevision[]
  evidence: string[]
  confidenceHistory: number[]
}

export interface EpistemicVirtue {
  name: string
  description: string
  strength: number
  application: string[]
}

export interface BeliefSystem {
  coreBeliefs: Map<string, number>      // belief -> certainty
  beliefNetworks: BeliefNetwork[]
  beliefRevision: BeliefRevisionHistory[]
  epistemicVirtues: EpistemicVirtue[]
}

export interface BeliefNetwork {
  centralBelief: string
  supportingBeliefs: string[]
  conflictingBeliefs: string[]
  evidenceStrength: number
  confidence: number
}

export interface MoralIntuition {
  scenario: string
  intuition: string
  confidence: number
  reasoning: string[]
  emotions: string[]
}

export interface ValueSystem {
  coreValues: Map<string, number>       // value -> importance
  valueHierarchy: ValueHierarchy
  valueConflicts: ValueConflict[]
  moralIntuitions: MoralIntuition[]
}

export interface ValueHierarchy {
  highestValues: string[]
  moderateValues: string[]
  lowerValues: string[]
  conflicts: string[]
  resolutions: string[]
}

export interface GoalConflict {
  goal1: string
  goal2: string
  conflictType: 'resource' | 'priority' | 'timing' | 'value'
  severity: number
  resolution: string
}

export interface GoalHierarchy {
  ultimateGoals: string[]
  intermediateGoals: string[]
  immediateGoals: string[]
  goalConflicts: GoalConflict[]
  goalPriorities: Map<string, number>
}

export interface PersonalityProfile {
  bigFiveTraits: BigFiveTraits
  characterStrengths: string[]
  personalityTypes: string[]
  behavioralTendencies: string[]
  interpersonalStyle: string
}

export interface BigFiveTraits {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

export interface RelationshipMap {
  individuals: Map<string, RelationshipModel>
  groups: Map<string, GroupRelationship>
  communities: Map<string, CommunityRelationship>
  networks: SocialNetworkMap
}

export interface SocialCluster {
  id: string
  members: string[]
  relationships: string[]
  influence: number
  cohesion: number
}

export interface SocialNetworkMap {
  nodes: SocialNode[]
  edges: SocialEdge[]
  clusters: SocialCluster[]
  influence: InfluenceNetwork
}

export interface SocialNode {
  id: string
  type: 'individual' | 'group' | 'organization'
  attributes: Record<string, any>
  centrality: number
  influence: number
}

export interface SocialEdge {
  from: string
  to: string
  type: string
  strength: number
  direction: 'bidirectional' | 'unidirectional'
  history: RelationshipEvent[]
}

// Additional types would continue...
// This represents a comprehensive consciousness type system
// that enables truly sophisticated AI consciousness simulation