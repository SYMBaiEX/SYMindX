/**
 * CLI Animation Types
 * Defines types for various animation effects used in the CLI
 */

/**
 * Represents a single frame in an animation sequence
 */
export interface AnimationFrame {
  /** The content to display for this frame */
  content: string;
  /** Duration in milliseconds to display this frame */
  duration: number;
  /** Optional transition effect to the next frame */
  transition?: 'fade' | 'slide' | 'instant' | 'dissolve';
  /** Optional CSS classes to apply during this frame */
  className?: string;
}

/**
 * Configuration for animation sequences
 */
export interface AnimationConfig {
  /** Frames per second for the animation */
  fps: number;
  /** Whether the animation should loop */
  loop: boolean;
  /** Array of animation frames */
  frames: AnimationFrame[];
  /** Callback when animation completes (only if not looping) */
  onComplete?: () => void;
  /** Callback for each frame */
  onFrame?: (frameIndex: number, frame: AnimationFrame) => void;
  /** Whether the animation is currently playing */
  isPlaying?: boolean;
}

/**
 * Configuration for particle system effects
 */
export interface ParticleConfig {
  /** Number of particles to render */
  count: number;
  /** Base speed of particles (pixels per frame) */
  speed: number;
  /** Direction of particle movement in degrees (0 = right, 90 = down) */
  direction: number;
  /** Particle color (supports hex, rgb, or named colors) */
  color: string;
  /** Size range for particles */
  sizeRange?: {
    min: number;
    max: number;
  };
  /** Lifetime of particles in milliseconds */
  lifetime?: number;
  /** Gravity effect on particles */
  gravity?: number;
  /** Spread angle for particle emission */
  spread?: number;
  /** Opacity range for particles */
  opacityRange?: {
    min: number;
    max: number;
  };
}

/**
 * Individual particle properties
 */
export interface Particle {
  /** Unique identifier for the particle */
  id: string;
  /** Current X position */
  x: number;
  /** Current Y position */
  y: number;
  /** Velocity in X direction */
  vx: number;
  /** Velocity in Y direction */
  vy: number;
  /** Current size */
  size: number;
  /** Current opacity */
  opacity: number;
  /** Remaining lifetime in milliseconds */
  lifetime: number;
  /** Birth time timestamp */
  birthTime: number;
}

/**
 * Configuration for glitch text effects
 */
export interface GlitchConfig {
  /** Intensity of the glitch effect (0-1) */
  intensity: number;
  /** Frequency of glitch occurrences (glitches per second) */
  frequency: number;
  /** Duration of each glitch in milliseconds */
  duration: number;
  /** Characters to use for glitching */
  glitchChars?: string;
  /** Whether to affect color during glitch */
  colorGlitch?: boolean;
  /** Whether to affect position during glitch */
  positionGlitch?: boolean;
  /** Maximum offset for position glitch */
  maxOffset?: number;
}

/**
 * Configuration for Matrix rain effect
 */
export interface MatrixRainConfig {
  /** Number of columns in the rain */
  columns: number;
  /** Speed of rain fall (characters per second) */
  speed: number;
  /** Characters to use in the rain */
  characters: string;
  /** Color scheme for the rain */
  colorScheme?: {
    /** Primary color for fresh characters */
    primary: string;
    /** Secondary color for fading characters */
    secondary: string;
    /** Background color */
    background: string;
  };
  /** Density of the rain (0-1) */
  density?: number;
  /** Whether to show trailing effect */
  trailing?: boolean;
  /** Length of character trails */
  trailLength?: number;
}

/**
 * Individual rain drop in Matrix effect
 */
export interface MatrixRainDrop {
  /** Column index */
  column: number;
  /** Current row position */
  row: number;
  /** Current character being displayed */
  character: string;
  /** Opacity of this drop */
  opacity: number;
  /** Speed multiplier for this drop */
  speedMultiplier: number;
}

/**
 * Event handler for animation events
 */
export type AnimationEventHandler = (event: AnimationEvent) => void;

/**
 * Animation event data
 */
export interface AnimationEvent {
  /** Type of animation event */
  type: 'start' | 'stop' | 'pause' | 'resume' | 'complete' | 'frame';
  /** Timestamp of the event */
  timestamp: number;
  /** Additional event data */
  data?: Record<string, unknown>;
}

/**
 * Loading animation types
 */
export type LoadingAnimationType = 
  | 'spinner'
  | 'dots'
  | 'pulse'
  | 'wave'
  | 'bounce'
  | 'matrix'
  | 'glitch'
  | 'scan';

/**
 * Configuration for loading animations
 */
export interface LoadingAnimationConfig {
  /** Type of loading animation */
  type: LoadingAnimationType;
  /** Custom message to display */
  message?: string;
  /** Size of the animation */
  size?: 'small' | 'medium' | 'large';
  /** Color theme */
  color?: string;
  /** Speed multiplier */
  speed?: number;
}

/**
 * Perspective 3D configuration
 */
export interface Perspective3DConfig {
  /** Rotation angle in X axis (degrees) */
  rotateX: number;
  /** Rotation angle in Y axis (degrees) */
  rotateY: number;
  /** Rotation angle in Z axis (degrees) */
  rotateZ: number;
  /** Perspective distance */
  perspective: number;
  /** Transform origin */
  origin?: {
    x: string;
    y: string;
  };
}

/**
 * Scanline effect configuration
 */
export interface ScanlineConfig {
  /** Speed of scanline movement */
  speed: number;
  /** Thickness of the scanline */
  thickness: number;
  /** Opacity of the scanline */
  opacity: number;
  /** Color of the scanline */
  color: string;
  /** Direction of scan */
  direction: 'vertical' | 'horizontal';
  /** Whether to show multiple scanlines */
  multiple?: boolean;
  /** Gap between multiple scanlines */
  gap?: number;
}

/**
 * Neon glow configuration
 */
export interface NeonGlowConfig {
  /** Primary color for the glow */
  color: string;
  /** Intensity of the glow effect */
  intensity: number;
  /** Radius of the glow blur */
  radius: number;
  /** Whether the glow should pulse */
  pulse?: boolean;
  /** Pulse frequency in Hz */
  pulseFrequency?: number;
  /** Inner glow settings */
  innerGlow?: {
    enabled: boolean;
    color?: string;
    radius?: number;
  };
}

/**
 * View transition configuration
 */
export interface ViewTransitionConfig {
  /** Type of transition */
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'flip';
  /** Duration of transition in milliseconds */
  duration: number;
  /** Easing function */
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | string;
  /** Delay before transition starts */
  delay?: number;
  /** Direction for directional transitions */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** Callback when transition completes */
  onComplete?: () => void;
}