import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface LoadingSpinnerProps {
  variant?:
    | 'matrix'
    | 'dna'
    | 'orbit'
    | 'quantum'
    | 'glitch'
    | 'cube'
    | 'hexagon'
    | 'neural';
  text?: string;
  size?: 'small' | 'medium' | 'large';
  speed?: number;
  color?: string;
  showProgress?: boolean;
  progress?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'matrix',
  text = 'Loading',
  size = 'medium',
  speed = 100,
  color,
  showProgress = false,
  progress = 0,
}) => {
  const [frame, setFrame] = useState(0);
  const [glitchText, setGlitchText] = useState(text);
  const theme = themeEngine.getTheme();
  const defaultColor = color || theme.colors.primary;

  // Spinner configurations
  const spinners = {
    matrix: {
      frames: ['⣾', '⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽'],
      pattern: 'circular',
    },
    dna: {
      frames: ['⠋', '⠙', '⠚', '⠞', '⠖', '⠦', '⠴', '⠲', '⠳', '⠓'],
      pattern: 'helix',
    },
    orbit: {
      frames: ['◐', '◓', '◑', '◒'],
      pattern: 'orbital',
    },
    quantum: {
      frames: ['⬡', '⬢', '⬡', '⬢', '⬡', '⬢'],
      pattern: 'quantum',
    },
    glitch: {
      frames: ['█', '▓', '▒', '░', '▒', '▓'],
      pattern: 'glitch',
    },
    cube: {
      frames: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'],
      pattern: 'dice',
    },
    hexagon: {
      frames: ['⬡', '⬢', '⬣', '⬤', '⬥', '⬦'],
      pattern: 'hex',
    },
    neural: {
      frames: ['⊙', '⊚', '⊛', '⊜', '⊝'],
      pattern: 'neural',
    },
  };

  const spinner = spinners[variant];

  // Size configurations
  const sizeConfig = {
    small: { width: 20, height: 3, textSize: 8 },
    medium: { width: 30, height: 5, textSize: 12 },
    large: { width: 40, height: 7, textSize: 16 },
  };

  const config = sizeConfig[size];

  // Update animation
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled()) return;

    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % spinner.frames.length);

      // Glitch effect for glitch variant
      if (variant === 'glitch' && Math.random() < 0.3) {
        const glitchChars = '▓▒░█▄▀■□';
        setGlitchText(
          text
            .split('')
            .map((char) =>
              Math.random() < 0.2
                ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
                : char
            )
            .join('')
        );
      } else {
        setGlitchText(text);
      }
    }, speed);

    return (): void => clearInterval(interval);
  }, [speed, variant, text, spinner.frames.length]);

  // Render different spinner patterns
  const renderSpinner = (): React.ReactElement => {
    const currentFrame = spinner.frames[frame];

    switch (spinner.pattern) {
      case 'circular':
        return (
          <Box>
            <Text color={defaultColor} bold>
              {currentFrame}
            </Text>
            <Text color={defaultColor} dimColor={frame % 2 === 0}>
              {glitchText}
            </Text>
            <Text color={defaultColor} bold>
              {' '}
              {currentFrame}
            </Text>
          </Box>
        );

      case 'helix': {
        const helixOffset = Math.sin(frame * 0.5) * 3;
        return (
          <Box flexDirection='column' alignItems='center'>
            <Box marginLeft={Math.floor(helixOffset + 3)}>
              <Text color={theme.colors.accent}>{currentFrame}</Text>
            </Box>
            <Text color={defaultColor}>{glitchText}</Text>
            <Box marginLeft={Math.floor(-helixOffset + 3)}>
              <Text color={theme.colors.secondary}>{currentFrame}</Text>
            </Box>
          </Box>
        );
      }

      case 'orbital': {
        const orbitPositions = [
          { x: 0, y: -1 },
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
        ];
        const pos = orbitPositions[frame % 4];
        if (!pos) return <Text>Loading...</Text>; // Fallback if position is undefined

        return (
          <Box flexDirection='column' width={config.width} height={3}>
            <Box marginLeft={config.width / 2 + (pos?.x || 0) * 5}>
              <Text color={defaultColor}>{currentFrame}</Text>
            </Box>
            {pos?.y === 0 && (
              <Box justifyContent='center' width={config.width}>
                <Text color={defaultColor}>{glitchText}</Text>
              </Box>
            )}
            {pos?.y === 1 && (
              <Box marginLeft={config.width / 2 + (pos?.x || 0) * 5}>
                <Text color={defaultColor}>{currentFrame}</Text>
              </Box>
            )}
          </Box>
        );
      }

      case 'quantum': {
        const quantumStates = ['|0⟩', '|1⟩', '|+⟩', '|-⟩', '|i⟩', '|-i⟩'];
        return (
          <Box>
            <Text color={theme.colors.accent}>
              {quantumStates[frame % quantumStates.length]}
            </Text>
            <Text color={defaultColor}> {currentFrame} </Text>
            <Text color={defaultColor} bold={frame % 2 === 0}>
              {glitchText}
            </Text>
            <Text color={defaultColor}> {currentFrame} </Text>
            <Text color={theme.colors.secondary}>
              {quantumStates[(frame + 3) % quantumStates.length]}
            </Text>
          </Box>
        );
      }

      case 'glitch':
        return (
          <Box flexDirection='column'>
            <Box>
              {Array.from({ length: 5 }, (_, i) => (
                <Text key={`glitch-frame-${i}`} color={theme.colors.glitch}>
                  {spinner.frames[(frame + i) % spinner.frames.length]}
                </Text>
              ))}
            </Box>
            <Text color={defaultColor} bold>
              {glitchText}
            </Text>
          </Box>
        );

      case 'neural': {
        const connections = ['─', '━', '═', '≡', '≈'];
        return (
          <Box>
            <Text color={theme.colors.accent}>{currentFrame}</Text>
            <Text color={defaultColor}>
              {connections[frame % connections.length]}
            </Text>
            <Text color={defaultColor} bold>
              {glitchText}
            </Text>
            <Text color={defaultColor}>
              {connections[(frame + 2) % connections.length]}
            </Text>
            <Text color={theme.colors.secondary}>{currentFrame}</Text>
          </Box>
        );
      }

      default:
        return (
          <Box>
            <Text color={defaultColor}>
              {currentFrame} {glitchText}
            </Text>
          </Box>
        );
    }
  };

  // Render progress bar if enabled
  const renderProgress = (): React.ReactElement | null => {
    if (!showProgress) return null;

    const barWidth = config.width - 10;
    const filled = Math.floor((progress / 100) * barWidth);
    const empty = barWidth - filled;

    return (
      <Box marginTop={1}>
        <Text color={theme.colors.borderDim}>[</Text>
        <Text color={theme.colors.success}>{'█'.repeat(filled)}</Text>
        <Text color={theme.colors.borderDim}>{'░'.repeat(empty)}</Text>
        <Text color={theme.colors.borderDim}>] </Text>
        <Text color={defaultColor}>{Math.round(progress)}%</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection='column' alignItems='center'>
      {renderSpinner()}
      {renderProgress()}
    </Box>
  );
};
