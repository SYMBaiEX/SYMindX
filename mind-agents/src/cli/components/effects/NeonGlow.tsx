import { Box, Text } from 'ink';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { themeEngine } from '../../themes/theme-engine.js';

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
  const defaultColor = useMemo(() => color ?? theme.colors.glow, [color, theme.colors.glow]);

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

  // Get glow characters based on variant (memoized)
  const getGlowChars = useCallback((): { left: string; right: string; top: string; bottom: string } => {
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
  }, [variant]);

  // Memoized color arrays for better performance
  const pulseColors = useMemo(() => [
    defaultColor,
    theme.colors.glowAlt,
    defaultColor,
    theme.colors.primary,
  ], [defaultColor, theme.colors.glowAlt, theme.colors.primary]);

  const rainbowColors = useMemo(() => [
    '#FF0000',
    '#FF7F00',
    '#FFFF00',
    '#00FF00',
    '#0000FF',
    '#4B0082',
    '#9400D3',
  ], []);

  // Get color based on animation state (memoized)
  const getAnimatedColor = useCallback((index?: number): string => {
    if (!flickerState && animation === 'flicker')
      return theme.colors.bgSecondary;

    switch (animation) {
      case 'pulse': {
        return pulseColors[glowPhase % pulseColors.length] ?? defaultColor;
      }

      case 'wave':
        if (index !== undefined && Math.abs(index - glowPhase) < 2) {
          return theme.colors.glowAlt;
        }
        return defaultColor;

      case 'rainbow': {
        return rainbowColors[glowPhase % rainbowColors.length] ?? defaultColor;
      }

      default:
        return defaultColor;
    }
  }, [flickerState, animation, theme.colors.bgSecondary, theme.colors.glowAlt, glowPhase, pulseColors, rainbowColors, defaultColor]);

  // Get intensity-based styling (memoized)
  const getIntensityStyle = useCallback((): { dimColor: boolean; bold: boolean } => {
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
  }, [intensity, bold, glowPhase]);

  const glowChars = useMemo(() => getGlowChars(), [getGlowChars]);
  const style = useMemo(() => getIntensityStyle(), [getIntensityStyle]);

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
        {children.split('').map((char, i) => {
          const charKey = `char-${char}-${children.length}-${i === 0 ? 'start' : i === children.length - 1 ? 'end' : 'mid'}-${getAnimatedColor(i)}`;
          return (
            <Text
              key={charKey}
              color={getAnimatedColor(i)}
              dimColor={style.dimColor}
              bold={style.bold}
            >
              {char}
            </Text>
          );
        })}
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
