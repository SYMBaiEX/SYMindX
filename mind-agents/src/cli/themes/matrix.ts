import { Theme } from './cyberpunk.js'

export const matrixTheme: Theme = {
  name: 'matrix',
  colors: {
    // Primary colors
    primary: '#00FF00',      // Matrix green
    secondary: '#008F00',    // Dark green
    accent: '#00FF00',       // Bright green
    danger: '#FF0000',       // Red (for agents)
    success: '#00FF00',      // Green
    warning: '#FFFF00',      // Yellow
    
    // Background colors
    bgPrimary: '#000000',    // Black
    bgSecondary: '#0A0A0A',  // Very dark gray
    bgTertiary: '#141414',   // Dark gray
    
    // Text colors
    text: '#00FF00',         // Green
    textDim: '#008F00',      // Dark green
    textBright: '#00FF00',   // Bright green
    
    // Border colors
    border: '#00FF00',       // Green
    borderBright: '#00FF00', // Bright green
    borderDim: '#004F00',    // Very dark green
    
    // Special effects
    glow: '#00FF00',         // Green glow
    glowAlt: '#00FF00',      // Green glow
    matrix: '#00FF00',       // Matrix green
    glitch: '#FF0000',       // Red glitch
  },
  
  // ASCII art characters
  ascii: {
    // Box drawing (Matrix style)
    boxTopLeft: '┌',
    boxTopRight: '┐',
    boxBottomLeft: '└',
    boxBottomRight: '┘',
    boxHorizontal: '─',
    boxVertical: '│',
    boxCross: '┼',
    
    // Progress bars
    progressFull: '█',
    progressHalf: '▓',
    progressQuarter: '▒',
    progressEmpty: '░',
    
    // Arrows and indicators
    arrowRight: '>',
    arrowLeft: '<',
    arrowUp: '^',
    arrowDown: 'v',
    bullet: '*',
    star: '*',
    
    // Special characters
    blockFull: '█',
    blockLight: '░',
    blockMedium: '▒',
    blockDark: '▓',
  },
  
  // Animation settings
  animations: {
    duration: {
      fast: 50,
      normal: 100,
      slow: 200,
    },
    easing: 'linear',
  },
  
  // Typography
  fonts: {
    ascii: 'Standard',
    header: 'Standard',
    subheader: 'Standard',
  },
  
  // Effects
  effects: {
    glow: false,
    glitch: true,
    matrix: true,
    particles: false,
    scanlines: true,
  },
}