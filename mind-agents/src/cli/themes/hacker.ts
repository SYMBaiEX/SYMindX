import { Theme } from './cyberpunk.js'

export const hackerTheme: Theme = {
  name: 'hacker',
  colors: {
    // Primary colors (classic terminal)
    primary: '#39FF14',      // Neon green
    secondary: '#FF3131',    // Terminal red
    accent: '#FFD700',       // Gold
    danger: '#FF0000',       // Pure red
    success: '#00FF00',      // Pure green
    warning: '#FFA500',      // Orange
    
    // Background colors
    bgPrimary: '#0C0C0C',    // Almost black
    bgSecondary: '#1A1A1A',  // Very dark gray
    bgTertiary: '#262626',   // Dark gray
    
    // Text colors
    text: '#39FF14',         // Neon green
    textDim: '#2A7F0F',      // Dark green
    textBright: '#7FFF00',   // Bright green
    
    // Border colors
    border: '#39FF14',       // Neon green
    borderBright: '#7FFF00', // Bright green
    borderDim: '#1F5F00',    // Very dark green
    
    // Special effects
    glow: '#39FF14',         // Green glow
    glowAlt: '#FF3131',      // Red glow
    matrix: '#39FF14',       // Green
    glitch: '#FF3131',       // Red
  },
  
  // ASCII art characters (hacker style)
  ascii: {
    // Box drawing
    boxTopLeft: '┏',
    boxTopRight: '┓',
    boxBottomLeft: '┗',
    boxBottomRight: '┛',
    boxHorizontal: '━',
    boxVertical: '┃',
    boxCross: '╋',
    
    // Progress bars
    progressFull: '▓',
    progressHalf: '▒',
    progressQuarter: '░',
    progressEmpty: ' ',
    
    // Arrows and indicators
    arrowRight: '➤',
    arrowLeft: '➤',
    arrowUp: '⬆',
    arrowDown: '⬇',
    bullet: '◉',
    star: '✱',
    
    // Special characters
    blockFull: '█',
    blockLight: '░',
    blockMedium: '▒',
    blockDark: '▓',
  },
  
  // Animation settings
  animations: {
    duration: {
      fast: 75,
      normal: 150,
      slow: 300,
    },
    easing: 'linear',
  },
  
  // Typography
  fonts: {
    ascii: 'ANSI Shadow',
    header: 'Doom',
    subheader: 'Small',
  },
  
  // Effects
  effects: {
    glow: true,
    glitch: true,
    matrix: true,
    particles: false,
    scanlines: true,
  },
}