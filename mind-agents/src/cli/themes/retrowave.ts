import { Theme } from './cyberpunk.js';

export const retroWaveTheme: Theme = {
  name: 'retrowave',
  colors: {
    // Primary colors (80s neon palette)
    primary: '#FF006E', // Hot pink
    secondary: '#FB5607', // Orange
    accent: '#FFBE0B', // Yellow
    danger: '#FF006E', // Hot pink
    success: '#8338EC', // Purple
    warning: '#FFBE0B', // Yellow

    // Background colors (dark with purple tint)
    bgPrimary: '#0D0221', // Deep purple-black
    bgSecondary: '#190840', // Dark purple
    bgTertiary: '#240E5E', // Medium purple

    // Text colors
    text: '#F72585', // Pink
    textDim: '#B5179E', // Dark pink
    textBright: '#FFFFFF', // White

    // Border colors
    border: '#7209B7', // Purple
    borderBright: '#FF006E', // Hot pink
    borderDim: '#3A0CA3', // Dark purple

    // Special effects
    glow: '#FF006E', // Pink glow
    glowAlt: '#8338EC', // Purple glow
    matrix: '#FB5607', // Orange
    glitch: '#3BCEAC', // Teal
  },

  // ASCII art characters (retro style)
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
    progressFull: '▰',
    progressHalf: '▱',
    progressQuarter: '▱',
    progressEmpty: '▱',

    // Arrows and indicators
    arrowRight: '▸',
    arrowLeft: '◂',
    arrowUp: '▴',
    arrowDown: '▾',
    bullet: '◆',
    star: '✦',

    // Special characters
    blockFull: '▓',
    blockLight: '░',
    blockMedium: '▒',
    blockDark: '▓',
  },

  // Animation settings
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 600,
    },
    easing: 'ease-out',
  },

  // Typography
  fonts: {
    ascii: 'Isometric3',
    header: 'Epic',
    subheader: 'Small',
  },

  // Effects
  effects: {
    glow: true,
    glitch: true,
    matrix: false,
    particles: true,
    scanlines: true,
  },
};
