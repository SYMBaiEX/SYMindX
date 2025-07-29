/**
 * Theme Engine for CLI components
 * Provides theming capabilities for the Ink-based CLI
 */

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  borders: {
    default: string;
    rounded: string;
    double: string;
    tech: string;
    matrix: string;
  };
  animations: {
    duration: number;
    easing: string;
  };
}

const defaultTheme: Theme = {
  colors: {
    primary: '#3A86FF',
    secondary: '#8338EC',
    accent: '#FF006E',
    background: '#0A0A0A',
    text: '#FFFFFF',
    error: '#FF4444',
    warning: '#FFAA00',
    success: '#00FF88',
    info: '#00AAFF',
  },
  borders: {
    default: '─│┌┐└┘',
    rounded: '─│╭╮╰╯',
    double: '═║╔╗╚╝',
    tech: '━┃┏┓┗┛',
    matrix: '▓▓▓▓▓▓',
  },
  animations: {
    duration: 1000,
    easing: 'ease-in-out',
  },
};

class ThemeEngine {
  private theme: Theme = defaultTheme;

  getTheme(): Theme {
    return this.theme;
  }

  setTheme(theme: Partial<Theme>): void {
    this.theme = { ...this.theme, ...theme };
  }

  getColor(colorKey: keyof Theme['colors']): string {
    return this.theme.colors[colorKey];
  }

  getBorder(borderKey: keyof Theme['borders']): string {
    return this.theme.borders[borderKey];
  }

  getAnimationDuration(): number {
    return this.theme.animations.duration;
  }

  getAnimationEasing(): string {
    return this.theme.animations.easing;
  }
}

export const themeEngine = new ThemeEngine();
export default themeEngine;