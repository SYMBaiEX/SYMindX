import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface NeonGlowProps {
  children: string;
  color?: string;
  intensity?: 'low' | 'medium' | 'high' | 'pulse';
  variant?: 'outline' | 'solid' | 'double' | 'gradient';
  animation?: 'none' | 'pulse' | 'flicker' | 'wave' | 'rainbow';
  speed?: number;
  bold?: boolean;
}

export const NeonGlow: React.FC<NeonGlowProps> = ({
  children,
  color,
  intensity = 'medium',
  variant = 'outline',
  animation = 'none',
  speed = 1000,
  bold = true,
}) => {
  const [glowPhase, setGlowPhase] = useState(0);
  const [flickerState, setFlickerState] = useState(true);
  const theme = themeEngine.getTheme();
  const defaultColor = color ?? theme.colors.glow;

  // Animation effects
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled() || animation === 'none') return;

    const interval = setInterval(
      () => {
        switch (animation) {
          case 'pulse':
            setGlowPhase((prev) => (prev + 1) % 4);
            break;
          case 'flicker':
            setFlickerState((prev) => (Math.random() > 0.1 ? !prev : prev));
            break;
          case 'wave':
            setGlowPhase((prev) => (prev + 1) % children.length);
            break;
          case 'rainbow':
            setGlowPhase((prev) => (prev + 1) % 7);
            break;
        }
      },
      speed / (animation === 'flicker' ? 10 : 1)
    );

    return (): void => clearInterval(interval);
  }, [animation, speed, children.length]);

  // Get glow characters based on variant
  const getGlowChars = (): { left: string; right: string; top: string; bottom: string } => {
    switch (variant) {
      case 'outline':
        return {
          left: '【',
          right: '】',
          top: '￣',
          bottom: '＿',
        };
      case 'solid':
        return {
          left: '█',
          right: '█',
          top: '▀',
          bottom: '▄',
        };
      case 'double':
        return {
          left: '《',
          right: '》',
          top: '＝',
          bottom: '＝',
        };
      case 'gradient':
        return {
          left: '░▒',
          right: '▒░',
          top: '▓',
          bottom: '▓',
        };
      default:
        return { left: '[', right: ']', top: '-', bottom: '-' };
    }
  };

  // Get color based on animation state
  const getAnimatedColor = (index?: number): string => {
    if (!flickerState && animation === 'flicker')
      return theme.colors.bgSecondary;

    switch (animation) {
      case 'pulse': {
        const pulseColors = [
          defaultColor,
          theme.colors.glowAlt,
          defaultColor,
          theme.colors.primary,
        ];
        return pulseColors[glowPhase % pulseColors.length] ?? defaultColor;
      }

      case 'wave':
        if (index !== undefined && Math.abs(index - glowPhase) < 2) {
          return theme.colors.glowAlt;
        }
        return defaultColor;

      case 'rainbow': {
        const rainbowColors = [
          '#FF0000',
          '#FF7F00',
          '#FFFF00',
          '#00FF00',
          '#0000FF',
          '#4B0082',
          '#9400D3',
        ];
        return rainbowColors[glowPhase % rainbowColors.length] ?? defaultColor;
      }

      default:
        return defaultColor;
    }
  };

  // Get intensity-based styling
  const getIntensityStyle = (): { dimColor: boolean; bold: boolean } => {
    const baseStyle = { dimColor: false, bold: bold };

    switch (intensity) {
      case 'low':
        return { ...baseStyle, dimColor: true };
      case 'high':
        return { ...baseStyle, bold: true };
      case 'pulse':
        return { ...baseStyle, bold: glowPhase % 2 === 0 };
      default:
        return baseStyle;
    }
  };

  const glowChars = getGlowChars();
  const style = getIntensityStyle();

  // Render based on variant
  if (variant === 'gradient') {
    return (
      <Box>
        <Text color={theme.colors.glowAlt} dimColor>
          {glowChars.left}
        </Text>
        <Text
          color={getAnimatedColor()}
          dimColor={style.dimColor}
          bold={style.bold}
        >
          {children}
        </Text>
        <Text color={theme.colors.glowAlt} dimColor>
          {glowChars.right}
        </Text>
      </Box>
    );
  }

  if (animation === 'wave') {
    return (
      <Box>
        <Text
          color={getAnimatedColor()}
          dimColor={style.dimColor}
          bold={style.bold}
        >
          {glowChars.left}
        </Text>
        {children.split('').map((char, i) => (
          <Text
            key={`char-${i}-${char}`}
            color={getAnimatedColor(i)}
            dimColor={style.dimColor}
            bold={style.bold}
          >
            {char}
          </Text>
        ))}
        <Text
          color={getAnimatedColor()}
          dimColor={style.dimColor}
          bold={style.bold}
        >
          {glowChars.right}
        </Text>
      </Box>
    );
  }

  // Standard glow rendering
  return (
    <Box>
      <Text
        color={getAnimatedColor()}
        dimColor={style.dimColor}
        bold={style.bold}
      >
        {glowChars.left}
      </Text>
      <Text
        color={getAnimatedColor()}
        dimColor={style.dimColor}
        bold={style.bold}
      >
        {children}
      </Text>
      <Text
        color={getAnimatedColor()}
        dimColor={style.dimColor}
        bold={style.bold}
      >
        {glowChars.right}
      </Text>
    </Box>
  );
};
