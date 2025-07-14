import { Text, Box } from 'ink';
import React, { useState, useEffect } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface GlitchTextProps {
  children: string;
  intensity?: number;
  frequency?: number;
  color?: string;
  bold?: boolean;
  variant?: 'classic' | 'digital' | 'matrix' | 'chromatic' | 'zalgo' | 'wave';
  duration?: number;
  multiLayer?: boolean;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  intensity = 0.3,
  frequency = 100,
  color,
  bold = false,
  variant = 'classic',
  duration = 50,
  multiLayer = false,
}) => {
  const [glitchedText, setGlitchedText] = useState(children);
  const [isGlitching, setIsGlitching] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const theme = themeEngine.getTheme();
  const defaultColor = color || theme.colors.primary;

  const glitchCharSets = {
    classic: '▓▒░█▄▀■□▢▣▤▥▦▧▨▩▪▫!@#$%^&*()_+-=[]{}|;:,.<>?',
    digital: '01010101⌂⌀⌁⌃⌄⌅⌆⌇⌈⌉⌊⌋⌌⌍⌎⌏',
    matrix: 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01',
    chromatic: '░▒▓█▀▄■□▢▣▤▥▦▧▨▩',
    zalgo: '̸̨̢̧̨̖̗̘̙̜̝̞̟̠̣̤̥̦̩̪̫̬̭̮̯̰̱̲̳̹̺̻̼͇͈͉͍͎̀́̂̃̄̅̆̇̈̉̊̋̌̍̎̏̐̑̒̓̔̽̾̿̀́͂̓̈́͆͊͋͌',
    wave: '~≈≋∼∽⌇⌈⌉⌊⌋⌌⌍⌎⌏',
  };

  const glitchChars = glitchCharSets[variant];

  // Apply different glitch algorithms based on variant
  const applyGlitch = (text: string): string => {
    switch (variant) {
      case 'digital':
        // Binary corruption effect
        return text
          .split('')
          .map((char) => {
            if (Math.random() < intensity) {
              return Math.random() < 0.5 ? '0' : '1';
            }
            return char;
          })
          .join('');

      case 'matrix':
        // Matrix-style character replacement
        return text
          .split('')
          .map((char) => {
            if (Math.random() < intensity) {
              return glitchChars[
                Math.floor(Math.random() * glitchChars.length)
              ];
            }
            return char;
          })
          .join('');

      case 'chromatic':
        // Block character replacement
        return text
          .split('')
          .map((char) => {
            if (Math.random() < intensity) {
              const blocks = '░▒▓█';
              return blocks[Math.floor(Math.random() * blocks.length)];
            }
            return char;
          })
          .join('');

      case 'zalgo':
        // Add combining characters for zalgo effect
        return text
          .split('')
          .map((char) => {
            if (Math.random() < intensity) {
              const zalgoChars = '̸̨̢̧̨̀́̂̃̄̅̆̇̈̉̊̋̌̍̎̏';
              return (
                char + zalgoChars[Math.floor(Math.random() * zalgoChars.length)]
              );
            }
            return char;
          })
          .join('');

      case 'wave':
        // Wave-like distortion
        return text
          .split('')
          .map((char, i) => {
            if (Math.random() < intensity) {
              const waveChars = '~≈≋∼∽';
              return i % 2 === 0
                ? waveChars[Math.floor(Math.random() * waveChars.length)]
                : char;
            }
            return char;
          })
          .join('');

      default:
        // Classic glitch
        return text
          .split('')
          .map((char) => {
            if (Math.random() < intensity) {
              return glitchChars[
                Math.floor(Math.random() * glitchChars.length)
              ];
            }
            return char;
          })
          .join('');
    }
  };

  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled()) return;

    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        // 30% chance to glitch
        setIsGlitching(true);

        // Apply variant-specific glitch
        setGlitchedText(applyGlitch(children));

        // Set random offset for chromatic aberration effect
        if (multiLayer) {
          setOffset({
            x: Math.floor(Math.random() * 3) - 1,
            y: Math.floor(Math.random() * 2) - 1,
          });
        }

        // Reset after specified duration
        setTimeout(
          () => {
            setGlitchedText(children);
            setIsGlitching(false);
            setOffset({ x: 0, y: 0 });
          },
          duration + Math.random() * duration
        );
      }
    }, frequency);

    return () => clearInterval(glitchInterval);
  }, [children, intensity, frequency, variant, duration, multiLayer]);

  // Create multiple text layers for glitch effect
  if (isGlitching && multiLayer) {
    return (
      <Box>
        {/* Base layer */}
        <Text color={defaultColor} bold={bold}>
          {children}
        </Text>

        {/* Glitch layer with offset */}
        {offset.x !== 0 && (
          <Box marginLeft={offset.x}>
            <Text color={theme.colors.glitch} bold={bold} dimColor>
              {glitchedText}
            </Text>
          </Box>
        )}

        {/* Additional chromatic aberration layers */}
        {variant === 'chromatic' && (
          <>
            <Box marginLeft={-1}>
              <Text color={theme.colors.danger} dimColor>
                {glitchedText.substring(0, Math.floor(glitchedText.length / 2))}
              </Text>
            </Box>
            <Box marginLeft={1}>
              <Text color={theme.colors.accent} dimColor>
                {glitchedText.substring(Math.floor(glitchedText.length / 2))}
              </Text>
            </Box>
          </>
        )}
      </Box>
    );
  }

  if (isGlitching) {
    return (
      <Text
        color={variant === 'matrix' ? theme.colors.matrix : theme.colors.glitch}
        bold={bold}
        dimColor={variant !== 'digital'}
      >
        {glitchedText}
      </Text>
    );
  }

  return (
    <Text color={defaultColor} bold={bold}>
      {glitchedText}
    </Text>
  );
};
