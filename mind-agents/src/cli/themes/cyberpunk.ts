export const cyberpunkTheme = {
  name: 'cyberpunk',
  colors: {
    // Primary colors
    primary: '#00F5FF',      // Cyan
    secondary: '#FF00FF',    // Magenta
    accent: '#FFFF00',       // Yellow
    danger: '#FF006E',       // Hot pink
    success: '#00FF88',      // Neon green
    warning: '#FFA500',      // Orange
    
    // Background colors
    bgPrimary: '#0A0E27',    // Deep blue
    bgSecondary: '#161B3C',  // Dark blue
    bgTertiary: '#1E2451',   // Medium blue
    
    // Text colors
    text: '#E0E0E0',         // Light gray
    textDim: '#808080',      // Medium gray
    textBright: '#FFFFFF',   // White
    
    // Border colors
    border: '#2A3F5F',       // Blue gray
    borderBright: '#00F5FF', // Cyan
    borderDim: '#1A2332',    // Dark blue gray
    
    // Special effects
    glow: '#00F5FF',         // Cyan glow
    glowAlt: '#FF00FF',      // Magenta glow
    matrix: '#00FF00',       // Matrix green
    glitch: '#FF0080',       // Glitch pink
  },
  
  // ASCII art characters
  ascii: {
    // Box drawing
    boxTopLeft: '╔',
    boxTopRight: '╗',
    boxBottomLeft: '╚',
    boxBottomRight: '╝',
    boxHorizontal: '═',
    boxVertical: '║',
    boxCross: '╬',
    
    // Progress bars
    progressFull: '█',
    progressHalf: '▓',
    progressQuarter: '▒',
    progressEmpty: '░',
    
    // Arrows and indicators
    arrowRight: '▶',
    arrowLeft: '◀',
    arrowUp: '▲',
    arrowDown: '▼',
    bullet: '▪',
    star: '★',
    
    // Special characters
    blockFull: '█',
    blockLight: '░',
    blockMedium: '▒',
    blockDark: '▓',
  },
  
  // Animation settings
  animations: {
    duration: {
      fast: 100,
      normal: 200,
      slow: 400,
    },
    easing: 'ease-in-out',
  },
  
  // Typography
  fonts: {
    ascii: 'ANSI Shadow',
    header: 'Small',
    subheader: 'Mini',
  },
  
  // Effects
  effects: {
    glow: true,
    glitch: true,
    matrix: true,
    particles: true,
    scanlines: true,
  },
}

export type Theme = typeof cyberpunkTheme