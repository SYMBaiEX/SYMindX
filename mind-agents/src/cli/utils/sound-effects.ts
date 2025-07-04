import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Sound effect types
export enum SoundType {
  STARTUP = 'startup',
  SHUTDOWN = 'shutdown',
  ERROR = 'error',
  SUCCESS = 'success',
  NOTIFICATION = 'notification',
  KEYPRESS = 'keypress',
  GLITCH = 'glitch',
  MATRIX = 'matrix',
  AGENT_ACTIVATE = 'agent_activate',
  AGENT_DEACTIVATE = 'agent_deactivate',
  CHAT_SEND = 'chat_send',
  CHAT_RECEIVE = 'chat_receive',
  NAVIGATION = 'navigation',
  WARNING = 'warning',
  LOADING = 'loading',
}

// Sound configuration
interface SoundConfig {
  frequency: number
  duration: number
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
  volume?: number
}

// Default sound configurations
const SOUND_CONFIGS: Record<SoundType, SoundConfig[]> = {
  [SoundType.STARTUP]: [
    { frequency: 200, duration: 100 },
    { frequency: 400, duration: 100 },
    { frequency: 600, duration: 100 },
    { frequency: 800, duration: 200 },
  ],
  [SoundType.SHUTDOWN]: [
    { frequency: 800, duration: 100 },
    { frequency: 600, duration: 100 },
    { frequency: 400, duration: 100 },
    { frequency: 200, duration: 200 },
  ],
  [SoundType.ERROR]: [
    { frequency: 200, duration: 300, type: 'square' },
    { frequency: 150, duration: 300, type: 'square' },
  ],
  [SoundType.SUCCESS]: [
    { frequency: 523, duration: 100 }, // C
    { frequency: 659, duration: 100 }, // E
    { frequency: 784, duration: 200 }, // G
  ],
  [SoundType.NOTIFICATION]: [
    { frequency: 1000, duration: 100 },
    { frequency: 1200, duration: 150 },
  ],
  [SoundType.KEYPRESS]: [
    { frequency: 2000, duration: 10, volume: 0.1 },
  ],
  [SoundType.GLITCH]: [
    { frequency: 100, duration: 20, type: 'square' },
    { frequency: 2500, duration: 20, type: 'sawtooth' },
    { frequency: 50, duration: 20, type: 'square' },
  ],
  [SoundType.MATRIX]: [
    { frequency: 440, duration: 50 },
    { frequency: 220, duration: 50 },
    { frequency: 110, duration: 50 },
  ],
  [SoundType.AGENT_ACTIVATE]: [
    { frequency: 261, duration: 100 }, // C
    { frequency: 329, duration: 100 }, // E
    { frequency: 392, duration: 100 }, // G
    { frequency: 523, duration: 200 }, // High C
  ],
  [SoundType.AGENT_DEACTIVATE]: [
    { frequency: 523, duration: 100 }, // High C
    { frequency: 392, duration: 100 }, // G
    { frequency: 329, duration: 100 }, // E
    { frequency: 261, duration: 200 }, // C
  ],
  [SoundType.CHAT_SEND]: [
    { frequency: 800, duration: 50 },
    { frequency: 1200, duration: 50 },
  ],
  [SoundType.CHAT_RECEIVE]: [
    { frequency: 1200, duration: 50 },
    { frequency: 800, duration: 50 },
  ],
  [SoundType.NAVIGATION]: [
    { frequency: 1500, duration: 30, volume: 0.3 },
  ],
  [SoundType.WARNING]: [
    { frequency: 440, duration: 200, type: 'triangle' },
    { frequency: 350, duration: 200, type: 'triangle' },
  ],
  [SoundType.LOADING]: [
    { frequency: 200, duration: 100 },
    { frequency: 300, duration: 100 },
    { frequency: 400, duration: 100 },
    { frequency: 300, duration: 100 },
  ],
}

// Sound effects manager
export class SoundEffectsManager {
  private enabled: boolean = true
  private platform: string = process.platform
  private queue: Promise<void> = Promise.resolve()
  
  constructor(enabled: boolean = true) {
    this.enabled = enabled && this.checkAudioSupport()
  }
  
  // Check if audio is supported on the platform
  private checkAudioSupport(): boolean {
    // Check for audio support based on platform
    if (this.platform === 'darwin') {
      // macOS - check for afplay
      return true
    } else if (this.platform === 'linux') {
      // Linux - check for paplay or aplay
      try {
        execAsync('which paplay').catch(() => execAsync('which aplay'))
        return true
      } catch {
        return false
      }
    } else if (this.platform === 'win32') {
      // Windows - PowerShell beep
      return true
    }
    return false
  }
  
  // Play a sound effect
  async play(soundType: SoundType): Promise<void> {
    if (!this.enabled) return
    
    const configs = SOUND_CONFIGS[soundType]
    if (!configs) return
    
    // Queue sound to prevent overlapping
    this.queue = this.queue.then(async () => {
      for (const config of configs) {
        await this.playTone(config)
      }
    })
    
    return this.queue
  }
  
  // Play a custom tone
  async playTone(config: SoundConfig): Promise<void> {
    if (!this.enabled) return
    
    try {
      if (this.platform === 'darwin') {
        // macOS using afplay with generated sine wave
        const command = `echo "
          for i in {1..${config.duration}}; do 
            printf '\\a'
            sleep 0.001
          done" | bash`
        await execAsync(command)
      } else if (this.platform === 'linux') {
        // Linux using paplay or speaker-test
        const command = `timeout ${config.duration}ms speaker-test -t sine -f ${config.frequency} >/dev/null 2>&1 || true`
        await execAsync(command)
      } else if (this.platform === 'win32') {
        // Windows PowerShell beep
        const command = `powershell -Command "[console]::beep(${config.frequency}, ${config.duration})"`
        await execAsync(command)
      }
    } catch (error) {
      // Silently fail if sound playback fails
    }
  }
  
  // Toggle sound effects
  toggle(): void {
    this.enabled = !this.enabled
  }
  
  // Check if sound is enabled
  isEnabled(): boolean {
    return this.enabled
  }
  
  // Play a sequence of notes (for melodies)
  async playMelody(notes: Array<{ frequency: number; duration: number }>): Promise<void> {
    if (!this.enabled) return
    
    for (const note of notes) {
      await this.playTone(note)
    }
  }
  
  // Play cyberpunk-style boot sequence
  async playBootSequence(): Promise<void> {
    const bootMelody = [
      { frequency: 110, duration: 100 },  // A2
      { frequency: 220, duration: 100 },  // A3
      { frequency: 440, duration: 100 },  // A4
      { frequency: 880, duration: 100 },  // A5
      { frequency: 440, duration: 50 },   // A4
      { frequency: 523, duration: 100 },  // C5
      { frequency: 659, duration: 100 },  // E5
      { frequency: 784, duration: 200 },  // G5
    ]
    
    await this.playMelody(bootMelody)
  }
  
  // Play glitch sequence
  async playGlitchSequence(): Promise<void> {
    const glitchNotes = Array.from({ length: 10 }, () => ({
      frequency: Math.random() * 2000 + 100,
      duration: Math.random() * 50 + 10,
    }))
    
    await this.playMelody(glitchNotes)
  }
}

// Global sound manager instance
export const soundManager = new SoundEffectsManager(
  process.env.SYMINDX_SOUND_EFFECTS !== 'false'
)

// Helper function to play sounds
export async function playSound(type: SoundType): Promise<void> {
  return soundManager.play(type)
}