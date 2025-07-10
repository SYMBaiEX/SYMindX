import { Theme } from './cyberpunk.js'

export const minimalTheme: Theme = {
  name: 'minimal',
  colors: {
    // Primary colors
    primary: '#FFFFFF',      // White
    secondary: '#E0E0E0',    // Light gray
    accent: '#000000',       // Black
    danger: '#FF4444',       // Red
    success: '#44FF44',      // Green
    warning: '#FFAA44',      // Orange
    
    // Background colors
    bgPrimary: '#000000',    // Black
    bgSecondary: '#111111',  // Very dark gray
    bgTertiary: '#222222',   // Dark gray
    
    // Text colors
    text: '#FFFFFF',         // White
    textDim: '#888888',      // Gray
    textBright: '#FFFFFF',   // White
    
    // Border colors
    border: '#444444',       // Dark gray
    borderBright: '#FFFFFF', // White
    borderDim: '#222222',    // Very dark gray
    
    // Special effects
    glow: '#FFFFFF',         // White
    glowAlt: '#E0E0E0',      // Light gray
    matrix: '#FFFFFF',       // White
    glitch: '#FF4444',       // Red
  },
  
  // ASCII art characters
  ascii: {
    // Box drawing (minimal style)
    boxTopLeft: '+',
    boxTopRight: '+',
    boxBottomLeft: '+',
    boxBottomRight: '+',
    boxHorizontal: '-',
    boxVertical: '|',
    boxCross: '+',
    
    // Progress bars
    progressFull: '=',
    progressHalf: '-',
    progressQuarter: '.',
    progressEmpty: ' ',
    
    // Arrows and indicators
    arrowRight: '>',
    arrowLeft: '<',
    arrowUp: '^',
    arrowDown: 'v',
    bullet: '·',
    star: '*',
    
    // Special characters
    blockFull: '#',
    blockLight: '.',
    blockMedium: ':',
    blockDark: '=',
  },
  
  // Animation settings
  animations: {
    duration: {
      fast: 0,
      normal: 0,
      slow: 0,
    },
    easing: 'none',
  },
  
  // Typography
  fonts: {
    ascii: 'Standard',
    header: 'Standard',
    subheader: 'Standard',
  },
  
  // Effects (all disabled for minimal theme)
  effects: {
    glow: false,
    glitch: false,
    matrix: false,
    particles: false,
    scanlines: false,
  },
}