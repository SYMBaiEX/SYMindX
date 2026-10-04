import { exec, spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Music tracks configuration
export interface MusicTrack {
  name: string;
  artist: string;
  url?: string;
  file?: string;
  license: string;
  mood: 'cyberpunk' | 'ambient' | 'action' | 'menu' | 'victory';
}

// Available music tracks (Eric Skiff - Resistor Anthems)
export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  digitalNative: {
    name: 'Digital Native',
    artist: 'Eric Skiff',
    url: 'http://ericskiff.com/music/',
    license: 'CC-BY 4.0',
    mood: 'cyberpunk',
  },
  searching: {
    name: 'Searching',
    artist: 'Eric Skiff',
    url: 'http://ericskiff.com/music/',
    license: 'CC-BY 4.0',
    mood: 'ambient',
  },
  underclocked: {
    name: 'Underclocked',
    artist: 'Eric Skiff',
    url: 'http://ericskiff.com/music/',
    license: 'CC-BY 4.0',
    mood: 'cyberpunk',
  },
  comeAndFindMe: {
    name: 'Come and Find Me',
    artist: 'Eric Skiff',
    url: 'http://ericskiff.com/music/',
    license: 'CC-BY 4.0',
    mood: 'action',
  },
  hhavokMain: {
    name: 'HHAvok-main',
    artist: 'Eric Skiff',
    url: 'http://ericskiff.com/music/',
    license: 'CC-BY 4.0',
    mood: 'cyberpunk',
  },
};

// Background music manager
export class BackgroundMusicManager {
  private enabled: boolean;
  private volume: number = 0.3;
  private currentProcess: ChildProcess | undefined;
  private platform: string = process.platform;
  private currentTrack: string | undefined;

  constructor(enabled: boolean = false) {
    // Disabled by default - users can enable in settings
    this.enabled = enabled && this.checkMusicSupport();
  }

  // Check if music playback is supported
  private checkMusicSupport(): boolean {
    if (this.platform === 'darwin') {
      // macOS - afplay
      return true;
    } else if (this.platform === 'linux') {
      // Linux - check for mpg123 or sox
      try {
        execAsync('which mpg123').catch(() => execAsync('which play'));
        return true;
      } catch {
        return false;
      }
    } else if (this.platform === 'win32') {
      // Windows - Windows Media Player
      return true;
    }
    return false;
  }

  // Play background music
  async play(
    trackName: keyof typeof MUSIC_TRACKS,
    loop: boolean = true
  ): Promise<void> {
    if (!this.enabled) return;

    const track = MUSIC_TRACKS[trackName];
    if (!track) return;

    // Stop current track if playing
    await this.stop();

    this.currentTrack = trackName;

    // Note: In a real implementation, you would download and cache the music files
    // For this example, we'll show the structure for playing local files

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const musicPath = path.join(
      __dirname,
      '..',
      '..',
      'assets',
      'music',
      `${trackName}.mp3`
    );

    // Check if file exists (in real implementation)
    if (!fs.existsSync(musicPath)) {
      console.log(`♪ Now playing: ${track.name} by ${track.artist}`);
      console.log(`  License: ${track.license}`);
      console.log(`  (Music file would be downloaded from ${track.url})`);
      return;
    }

    try {
      if (this.platform === 'darwin') {
        // macOS - afplay with volume control
        const args = ['-v', this.volume.toString()];
        if (loop) {
          // Create a loop using a shell script
          this.currentProcess = spawn('sh', [
            '-c',
            `while true; do afplay ${args.join(' ')} "${musicPath}"; done`,
          ]);
        } else {
          this.currentProcess = spawn('afplay', [...args, musicPath]);
        }
      } else if (this.platform === 'linux') {
        // Linux - mpg123 or sox
        if (loop) {
          this.currentProcess = spawn('mpg123', [
            '--loop',
            '-1',
            '--scale',
            Math.floor(this.volume * 32768).toString(),
            musicPath,
          ]);
        } else {
          this.currentProcess = spawn('mpg123', [
            '--scale',
            Math.floor(this.volume * 32768).toString(),
            musicPath,
          ]);
        }
      } else if (this.platform === 'win32') {
        // Windows - PowerShell with Windows Media Player
        const script = `
          Add-Type -AssemblyName presentationCore
          $player = New-Object System.Windows.Media.MediaPlayer
          $player.Volume = ${this.volume}
          $player.Open("${musicPath}")
          $player.Play()
          ${loop ? 'while($true) { Start-Sleep -Seconds 1 }' : 'Start-Sleep -Seconds 300'}
        `;
        this.currentProcess = spawn('powershell', ['-Command', script]);
      }

      // Handle process errors
      this.currentProcess?.on('error', (error) => {
        console.error('Music playback error:', error);
      });
    } catch (error) {
      void error; // Acknowledge error
      // Silently fail if music playback fails
    }
  }

  // Stop current music
  async stop(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = undefined;
      this.currentTrack = undefined;
    }
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    // If music is playing, restart with new volume
    if (this.currentTrack) {
      const track = this.currentTrack;
      this.play(track as keyof typeof MUSIC_TRACKS);
    }
  }

  // Toggle music on/off
  toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
  }

  // Check if music is enabled
  isEnabled(): boolean {
    return this.enabled;
  }

  // Get current track info
  getCurrentTrack(): MusicTrack | undefined {
    return this.currentTrack ? MUSIC_TRACKS[this.currentTrack] : undefined;
  }

  // Play mood-based music
  async playMood(mood: MusicTrack['mood']): Promise<void> {
    const tracks = Object.entries(MUSIC_TRACKS)
      .filter(([_, track]) => track.mood === mood)
      .map(([key, _]) => key);

    if (tracks.length > 0) {
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      if (randomTrack) {
        await this.play(randomTrack as keyof typeof MUSIC_TRACKS);
      }
    }
  }

  // Display attribution
  displayAttribution(): string {
    const track = this.getCurrentTrack();
    if (!track) return '';

    return `♪ Music: ${track.artist} - ${track.name} - Resistor Anthems - Available at ${track.url}`;
  }
}

// Global music manager instance
export const musicManager = new BackgroundMusicManager(
  process.env["SYMINDX_BACKGROUND_MUSIC"] === 'true'
);

// Helper function to play background music
export async function playBackgroundMusic(
  track: keyof typeof MUSIC_TRACKS,
  loop: boolean = true
): Promise<void> {
  return musicManager.play(track, loop);
}

// Helper function to play mood-based music
export async function playMoodMusic(mood: MusicTrack['mood']): Promise<void> {
  return musicManager.playMood(mood);
}
