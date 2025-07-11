import { EventEmitter } from 'events'

import { cyberpunkTheme, Theme } from './cyberpunk.js'
import { hackerTheme } from './hacker.js'
import { matrixTheme } from './matrix.js'
import { minimalTheme } from './minimal.js'
import { retroWaveTheme } from './retrowave.js'

export interface ThemeEngineEvents {
  'theme-changed': (theme: Theme) => void
  'animation-toggled': (enabled: boolean) => void
  'effect-toggled': (effect: string, enabled: boolean) => void
}

export class ThemeEngine extends EventEmitter {
  private currentTheme: Theme
  private themes: Map<string, Theme>
  private animationsEnabled: boolean = true
  private effectsEnabled: Set<string> = new Set()
  private customColors: Map<string, string> = new Map()
  
  constructor() {
    super()
    this.themes = new Map([
      ['cyberpunk', cyberpunkTheme],
      ['matrix', matrixTheme],
      ['minimal', minimalTheme],
      ['retrowave', retroWaveTheme],
      ['hacker', hackerTheme],
    ])
    
    this.currentTheme = cyberpunkTheme
    
    // Enable all effects by default
    Object.keys(cyberpunkTheme.effects).forEach(effect => {
      if (cyberpunkTheme.effects[effect as keyof typeof cyberpunkTheme.effects]) {
        this.effectsEnabled.add(effect)
      }
    })
  }
  
  // Get current theme
  getTheme(): Theme {
    return {
      ...this.currentTheme,
      colors: this.applyCustomColors(this.currentTheme.colors),
    }
  }
  
  // Switch themes with transition
  setTheme(themeName: string): void {
    const theme = this.themes.get(themeName)
    if (!theme) {
      throw new Error(`Theme '${themeName}' not found`)
    }
    
    this.currentTheme = theme
    this.emit('theme-changed', this.getTheme())
  }
  
  // Get available themes
  getThemeNames(): string[] {
    return Array.from(this.themes.keys())
  }
  
  // Toggle animations globally
  toggleAnimations(enabled?: boolean): void {
    this.animationsEnabled = enabled ?? !this.animationsEnabled
    this.emit('animation-toggled', this.animationsEnabled)
  }
  
  // Toggle specific effect
  toggleEffect(effect: string, enabled?: boolean): void {
    if (enabled ?? !this.effectsEnabled.has(effect)) {
      this.effectsEnabled.add(effect)
    } else {
      this.effectsEnabled.delete(effect)
    }
    this.emit('effect-toggled', effect, this.effectsEnabled.has(effect))
  }
  
  // Check if effect is enabled
  isEffectEnabled(effect: string): boolean {
    return this.effectsEnabled.has(effect)
  }
  
  // Check if animations are enabled
  areAnimationsEnabled(): boolean {
    return this.animationsEnabled
  }
  
  // Set custom color
  setCustomColor(key: string, color: string): void {
    this.customColors.set(key, color)
    this.emit('theme-changed', this.getTheme())
  }
  
  // Apply custom colors to theme
  private applyCustomColors(colors: Theme['colors']): Theme['colors'] {
    const result = { ...colors }
    
    for (const [key, value] of this.customColors) {
      if (key in result) {
        (result as any)[key] = value
      }
    }
    
    return result
  }
  
  // Get interpolated color for transitions
  interpolateColor(from: string, to: string, progress: number): string {
    // Simple hex color interpolation
    const fromRgb = this.hexToRgb(from)
    const toRgb = this.hexToRgb(to)
    
    if (!fromRgb || !toRgb) return from
    
    const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * progress)
    const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * progress)
    const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * progress)
    
    return this.rgbToHex(r, g, b)
  }
  
  // Hex to RGB conversion
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1] ?? '0', 16),
      g: parseInt(result[2] ?? '0', 16),
      b: parseInt(result[3] ?? '0', 16),
    } : null
  }
  
  // RGB to hex conversion
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }
  
  // Get animation duration based on theme and global settings
  getAnimationDuration(type: keyof Theme['animations']['duration']): number {
    if (!this.animationsEnabled) return 0
    return this.currentTheme.animations.duration[type]
  }
  
  // Generate gradient between two colors
  generateGradient(color1: string, color2: string, steps: number): string[] {
    const gradient: string[] = []
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      gradient.push(this.interpolateColor(color1, color2, progress))
    }
    
    return gradient
  }
  
  // Apply theme-based text transformation
  applyTextStyle(text: string, style: 'glow' | 'glitch' | 'matrix' | 'neon'): string {
    if (!this.isEffectEnabled(style)) return text
    
    // These would be handled by the respective effect components
    // This is just for demonstration
    switch (style) {
      case 'glow':
        return `✦ ${text} ✦`
      case 'glitch':
        return text.split('').map(char => 
          Math.random() < 0.1 ? this.getGlitchChar() : char
        ).join('')
      case 'matrix':
        return text.split('').map(char => 
          Math.random() < 0.2 ? this.getMatrixChar() : char
        ).join('')
      case 'neon':
        return `【 ${text} 】`
      default:
        return text
    }
  }
  
  private getGlitchChar(): string {
    const glitchChars = '▓▒░█▄▀■□▢▣▤▥▦▧▨▩▪▫'
    return glitchChars[Math.floor(Math.random() * glitchChars.length)] ?? '█'
  }
  
  private getMatrixChar(): string {
    const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ'
    return matrixChars[Math.floor(Math.random() * matrixChars.length)] ?? 'ア'
  }
}

// Singleton instance
export const themeEngine = new ThemeEngine()