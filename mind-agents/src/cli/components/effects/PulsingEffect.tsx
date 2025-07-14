import { Box, Text } from 'ink';
import React, { useState, useEffect, useCallback } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface PulsingEffectProps {
  children: React.ReactNode;
  variant?: 'fade' | 'scale' | 'glow' | 'heartbeat' | 'breathe' | 'bounce';
  speed?: number;
  minIntensity?: number;
  maxIntensity?: number;
  color?: string;
  glowColor?: string;
  active?: boolean;
}

export const PulsingEffect: React.FC<PulsingEffectProps> = ({
  children,
  variant = 'fade',
  speed = 1000,
  minIntensity = 0.3,
  maxIntensity = 1,
  color,
  glowColor,
  active = true,
}) => {
  const [, setPhase] = useState(0);
  const [intensity, setIntensity] = useState(maxIntensity);
  const theme = themeEngine.getTheme();

  const defaultColor = color || theme.colors.text;
  const defaultGlowColor = glowColor || theme.colors.glow;

  // Calculate animation curves
  const getAnimationValue = useCallback((p: number): number => {
    switch (variant) {
      case 'fade': {
        // Simple sine wave
        return (
          minIntensity +
          (maxIntensity - minIntensity) *
            (0.5 + 0.5 * Math.sin(p * Math.PI * 2))
        );
      }

      case 'scale': {
        // Breathing effect
        return (
          minIntensity +
          (maxIntensity - minIntensity) *
            (0.5 + 0.5 * Math.sin(p * Math.PI * 2))
        );
      }

      case 'glow': {
        // Sharp pulses
        const glowPhase = (p * 4) % 1;
        return glowPhase < 0.3 ? maxIntensity : minIntensity;
      }

      case 'heartbeat': {
        // Double beat pattern
        const beat = (p * 2) % 1;
        if (beat < 0.1) return maxIntensity;
        if (beat < 0.2) return minIntensity;
        if (beat < 0.3) return maxIntensity * 0.8;
        return minIntensity;
      }

      case 'breathe': {
        // Smooth in and out
        const breathPhase = p % 1;
        return (
          minIntensity +
          (maxIntensity - minIntensity) *
            Math.pow(Math.sin(breathPhase * Math.PI), 2)
        );
      }

      case 'bounce': {
        // Bouncing effect
        const bouncePhase = (p * 2) % 1;
        const bounce = Math.abs(Math.sin(bouncePhase * Math.PI));
        return minIntensity + (maxIntensity - minIntensity) * bounce;
      }

      default:
        return maxIntensity;
    }
  }, [variant, minIntensity, maxIntensity]);

  // Update animation
  useEffect(() => {
    if (!active || !themeEngine.areAnimationsEnabled()) {
      setIntensity(maxIntensity);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newPhase = (elapsed % speed) / speed;
      setPhase(newPhase);
      setIntensity(getAnimationValue(newPhase));
    }, 16); // ~60fps

    return (): void => clearInterval(interval);
  }, [active, speed, variant, minIntensity, maxIntensity, getAnimationValue]);

  // Render with effect
  const renderWithEffect = (): React.ReactNode => {
    switch (variant) {
      case 'fade': {
        return (
          <Box>
            <Text color={defaultColor} dimColor={intensity < 0.7}>
              {children}
            </Text>
          </Box>
        );
      }

      case 'scale': {
        // Simulate scale with padding
        const padding = Math.floor((1 - intensity) * 2);
        return (
          <Box paddingLeft={padding} paddingRight={padding}>
            <Text color={defaultColor} bold={intensity > 0.8}>
              {children}
            </Text>
          </Box>
        );
      }

      case 'glow': {
        const showGlow = intensity > 0.8;
        return (
          <Box>
            {showGlow && (
              <Text color={defaultGlowColor} dimColor>
                {'<'}
              </Text>
            )}
            <Text
              color={showGlow ? defaultGlowColor : defaultColor}
              bold={showGlow}
            >
              {children}
            </Text>
            {showGlow && (
              <Text color={defaultGlowColor} dimColor>
                {'>'}
              </Text>
            )}
          </Box>
        );
      }

      case 'heartbeat': {
        const isBeat = intensity > 0.8;
        return (
          <Box>
            {isBeat && <Text color={theme.colors.danger}>♥ </Text>}
            <Text
              color={isBeat ? theme.colors.danger : defaultColor}
              bold={isBeat}
            >
              {children}
            </Text>
            {isBeat && <Text color={theme.colors.danger}> ♥</Text>}
          </Box>
        );
      }

      case 'breathe': {
        return (
          <Box>
            <Text
              color={defaultColor}
              dimColor={intensity < 0.5}
              bold={intensity > 0.8}
            >
              {children}
            </Text>
          </Box>
        );
      }

      case 'bounce': {
        const bounceHeight = Math.floor((1 - intensity) * 2);
        return (
          <Box flexDirection='column'>
            {Array.from({ length: bounceHeight }, (_, i) => (
              <Text key={`bounce-space-${i}`}> </Text>
            ))}
            <Text color={defaultColor} bold={intensity > 0.9}>
              {children}
            </Text>
          </Box>
        );
      }

      default:
        return children;
    }
  };

  return renderWithEffect();
};
