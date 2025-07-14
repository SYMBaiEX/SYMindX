import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface StatusAnimationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  variant?: 'minimal' | 'animated' | 'explosive' | 'matrix';
  duration?: number;
  onComplete?: () => void;
}

export const StatusAnimation: React.FC<StatusAnimationProps> = ({
  type,
  message,
  variant = 'animated',
  duration = 2000,
  onComplete,
}) => {
  const [frame, setFrame] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const theme = themeEngine.getTheme();

  // Animation frames for different status types
  const animations = {
    success: {
      minimal: ['✓'],
      animated: ['   ', ' • ', ' ○ ', ' ◉ ', '(◉)', '[◉]', '[✓]', ' ✓ '],
      explosive: [
        '   ',
        ' . ',
        ' • ',
        '(•)',
        '(○)',
        '(◉)',
        '<◉>',
        '«◉»',
        '≪✓≫',
        ' ✓ ',
      ],
      matrix: ['░░░', '▒░░', '▓▒░', '█▓▒', '███', '█✓█', '░✓░', ' ✓ '],
    },
    error: {
      minimal: ['✗'],
      animated: ['   ', ' ! ', '[!]', '[X]', '(X)', '<X>', '[✗]', ' ✗ '],
      explosive: [
        '   ',
        ' · ',
        ' * ',
        '***',
        'XXX',
        '╳╳╳',
        '❌❌❌',
        '╳✗╳',
        ' ✗ ',
      ],
      matrix: ['░░░', '▒▒▒', '▓▓▓', '███', '█✗█', '▓✗▓', '▒✗▒', ' ✗ '],
    },
    warning: {
      minimal: ['⚠'],
      animated: ['   ', ' . ', ' ▲ ', '[▲]', '[⚠]', '(⚠)', ' ⚠ '],
      explosive: ['   ', ' ▴ ', ' ▲ ', '▲▲▲', '⚠⚠⚠', '[⚠]', ' ⚠ '],
      matrix: ['░░░', '▒▲▒', '▓▲▓', '█▲█', '█⚠█', '▓⚠▓', ' ⚠ '],
    },
    info: {
      minimal: ['ℹ'],
      animated: ['   ', ' · ', ' • ', '(•)', '(i)', '[i]', '[ℹ]', ' ℹ '],
      explosive: ['   ', '···', '•••', '◉◉◉', '[ℹ]', ' ℹ '],
      matrix: ['░░░', '▒•▒', '▓•▓', '█ℹ█', '▓ℹ▓', ' ℹ '],
    },
  };

  const statusColors = {
    success: theme.colors.success,
    error: theme.colors.danger,
    warning: theme.colors.warning,
    info: theme.colors.primary,
  };

  const selectedAnimation = animations[type][variant];
  const color = statusColors[type];

  // Animation logic
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled()) {
      setFrame(selectedAnimation.length - 1);
      setIsComplete(true);
      return;
    }

    const frameTime = duration / selectedAnimation.length;
    let currentFrame = 0;

    const interval = setInterval(() => {
      currentFrame++;

      if (currentFrame >= selectedAnimation.length) {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) {
          setTimeout(onComplete, 500);
        }
      } else {
        setFrame(currentFrame);
      }
    }, frameTime);

    return () => clearInterval(interval);
  }, [duration, selectedAnimation.length, onComplete]);

  // Render status icon with effects
  const renderStatusIcon = () => {
    const icon = selectedAnimation[frame];

    switch (variant) {
      case 'explosive':
        // Add explosion effects
        const explosionSize = Math.min(frame, 3);
        const explosionChars = ['·', '•', '○', '◉'];

        return (
          <Box flexDirection='column' alignItems='center'>
            {explosionSize > 0 && (
              <Box>
                {Array.from({ length: explosionSize * 2 + 1 }, (_, i) => (
                  <Text key={i} color={color} dimColor>
                    {
                      explosionChars[
                        Math.min(explosionSize - 1, explosionChars.length - 1)
                      ]
                    }
                  </Text>
                ))}
              </Box>
            )}
            <Box>
              {explosionSize > 0 && (
                <Text color={color} dimColor>
                  {
                    explosionChars[
                      Math.min(explosionSize - 1, explosionChars.length - 1)
                    ]
                  }
                </Text>
              )}
              <Text color={color} bold>
                {icon}
              </Text>
              {explosionSize > 0 && (
                <Text color={color} dimColor>
                  {
                    explosionChars[
                      Math.min(explosionSize - 1, explosionChars.length - 1)
                    ]
                  }
                </Text>
              )}
            </Box>
            {explosionSize > 0 && (
              <Box>
                {Array.from({ length: explosionSize * 2 + 1 }, (_, i) => (
                  <Text key={i} color={color} dimColor>
                    {
                      explosionChars[
                        Math.min(explosionSize - 1, explosionChars.length - 1)
                      ]
                    }
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        );

      case 'matrix':
        // Add matrix rain effect around icon
        return (
          <Box>
            <Text color={theme.colors.matrix} dimColor>
              {frame % 2 === 0 ? '░' : '▒'}
            </Text>
            <Text color={color} bold>
              {icon}
            </Text>
            <Text color={theme.colors.matrix} dimColor>
              {frame % 2 === 1 ? '░' : '▒'}
            </Text>
          </Box>
        );

      default:
        // Standard animation
        return (
          <Text color={color} bold={frame === selectedAnimation.length - 1}>
            {icon}
          </Text>
        );
    }
  };

  // Render message with typewriter effect
  const renderMessage = () => {
    if (!message) return null;

    if (variant === 'animated' && !isComplete) {
      // Typewriter effect
      const progress = frame / selectedAnimation.length;
      const visibleChars = Math.floor(message.length * progress);
      const visibleMessage = message.substring(0, visibleChars);

      return (
        <Text color={theme.colors.text}>
          {' '}
          {visibleMessage}
          {visibleChars < message.length && (
            <Text color={theme.colors.textDim}>▌</Text>
          )}
        </Text>
      );
    }

    return <Text color={theme.colors.text}> {message}</Text>;
  };

  return (
    <Box>
      {renderStatusIcon()}
      {renderMessage()}
    </Box>
  );
};

// Compound success/error components for convenience
export const SuccessAnimation: React.FC<Omit<StatusAnimationProps, 'type'>> = (
  props
) => <StatusAnimation type='success' {...props} />;

export const ErrorAnimation: React.FC<Omit<StatusAnimationProps, 'type'>> = (
  props
) => <StatusAnimation type='error' {...props} />;

export const WarningAnimation: React.FC<Omit<StatusAnimationProps, 'type'>> = (
  props
) => <StatusAnimation type='warning' {...props} />;

export const InfoAnimation: React.FC<Omit<StatusAnimationProps, 'type'>> = (
  props
) => <StatusAnimation type='info' {...props} />;
