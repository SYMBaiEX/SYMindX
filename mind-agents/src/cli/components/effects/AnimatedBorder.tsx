import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { themeEngine } from '../../themes/theme-engine.js';

interface AnimatedBorderProps {
  width?: number;
  height?: number;
  variant?:
    | 'solid'
    | 'dashed'
    | 'double'
    | 'rounded'
    | 'tech'
    | 'matrix'
    | 'glow';
  animation?: 'none' | 'pulse' | 'flow' | 'snake' | 'sparkle' | 'loading';
  color?: string;
  speed?: number;
  cornerStyle?: 'sharp' | 'rounded' | 'diagonal' | 'tech';
  title?: string;
  titlePosition?: 'left' | 'center' | 'right';
  responsive?: boolean;
  children?: React.ReactNode;
}

export const AnimatedBorder: React.FC<AnimatedBorderProps> = ({
  width: propWidth,
  height: propHeight,
  variant = 'solid',
  animation = 'none',
  color,
  speed = 100,
  cornerStyle = 'sharp',
  title,
  titlePosition = 'center',
  responsive = true,
  children,
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);
  const { dimensions } = useTerminalDimensions();
  const theme = themeEngine.getTheme();

  // Use responsive dimensions if enabled
  const width = responsive ? dimensions.width - 2 : propWidth || 40;
  const height = propHeight || 10;
  const defaultColor = color || theme.colors.border;

  // Border character sets
  const borderChars = {
    solid: {
      sharp: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
      rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
      diagonal: { tl: '◤', tr: '◥', bl: '◣', br: '◢', h: '━', v: '┃' },
      tech: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    },
    dashed: {
      sharp: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '┈', v: '┊' },
      rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '┈', v: '┊' },
      diagonal: { tl: '◤', tr: '◥', bl: '◣', br: '◢', h: '┅', v: '┇' },
      tech: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '┅', v: '┇' },
    },
    double: {
      sharp: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
      rounded: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
      diagonal: { tl: '◤', tr: '◥', bl: '◣', br: '◢', h: '═', v: '║' },
      tech: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    },
    tech: {
      sharp: { tl: '◢', tr: '◣', bl: '◥', br: '◤', h: '▬', v: '▮' },
      rounded: { tl: '◜', tr: '◝', bl: '◟', br: '◞', h: '▬', v: '▮' },
      diagonal: { tl: '◸', tr: '◹', bl: '◺', br: '◿', h: '▬', v: '▮' },
      tech: { tl: '▛', tr: '▜', bl: '▙', br: '▟', h: '▀', v: '█' },
    },
    matrix: {
      sharp: { tl: '⌈', tr: '⌉', bl: '⌊', br: '⌋', h: '⌇', v: '⌇' },
      rounded: { tl: '⌜', tr: '⌝', bl: '⌞', br: '⌟', h: '⌇', v: '⌇' },
      diagonal: { tl: '⌈', tr: '⌉', bl: '⌊', br: '⌋', h: '⌇', v: '⌇' },
      tech: { tl: '⌈', tr: '⌉', bl: '⌊', br: '⌋', h: '⌇', v: '⌇' },
    },
    glow: {
      sharp: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
      rounded: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
      diagonal: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
      tech: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    },
    rounded: {
      sharp: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
      rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
      diagonal: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
      tech: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
    },
  };

  const chars = borderChars[variant][cornerStyle];

  // Animation logic
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled() || animation === 'none') return;

    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % (width * 2 + height * 2));
    }, speed);

    return (): void => clearInterval(interval);
  }, [animation, speed, width, height]);

  // Get animated color for a position
  const getAnimatedColor = (
    position: 'top' | 'bottom' | 'left' | 'right',
    index: number
  ): string => {
    if (animation === 'none') return defaultColor;

    const perimeter = width * 2 + height * 2;
    let currentPos = 0;

    // Calculate position in the perimeter
    switch (position) {
      case 'top':
        currentPos = index;
        break;
      case 'right':
        currentPos = width + index;
        break;
      case 'bottom':
        currentPos = width + height + (width - index);
        break;
      case 'left':
        currentPos = width * 2 + height + (height - index);
        break;
    }

    switch (animation) {
      case 'pulse': {
        return animationFrame % 2 === 0
          ? theme.colors.borderBright
          : defaultColor;
      }

      case 'flow': {
        const flowWindow = 10;
        const distance = Math.abs(
          (currentPos - animationFrame + perimeter) % perimeter
        );
        if (distance < flowWindow) {
          return theme.colors.borderBright;
        }
        return defaultColor;
      }

      case 'snake': {
        const snakeLength = Math.floor(perimeter / 4);
        const snakeDistance =
          (currentPos - animationFrame + perimeter) % perimeter;
        if (snakeDistance < snakeLength) {
          const intensity = 1 - snakeDistance / snakeLength;
          return intensity > 0.5 ? theme.colors.borderBright : defaultColor;
        }
        return defaultColor;
      }

      case 'sparkle': {
        return Math.random() < 0.1 ? theme.colors.borderBright : defaultColor;
      }

      case 'loading': {
        const loadingSegment = Math.floor(perimeter / 8);
        const loadingPos = animationFrame % perimeter;
        if (Math.abs(currentPos - loadingPos) < loadingSegment) {
          return theme.colors.primary;
        }
        return theme.colors.borderDim;
      }

      default:
        return defaultColor;
    }
  };

  // Render title if provided
  const renderTitle = (): { title: string; startPos: number; endPos: number } | null => {
    if (!title) return null;

    const padding = 2;
    const titleLength = title.length + padding * 2;
    let startPos = padding;

    switch (titlePosition) {
      case 'center':
        startPos = Math.floor((width - titleLength) / 2);
        break;
      case 'right':
        startPos = width - titleLength - padding;
        break;
    }

    return { title: ` ${title} `, startPos, endPos: startPos + titleLength };
  };

  const titleInfo = renderTitle();

  // Render top border
  const renderTop = (): React.ReactElement => (
    <Box>
      <Text color={getAnimatedColor('top', 0)}>{chars.tl}</Text>
      {Array.from({ length: width - 2 }, (_, i) => {
        const pos = i + 1;
        if (titleInfo && pos >= titleInfo.startPos && pos < titleInfo.endPos) {
          const titleIndex = pos - titleInfo.startPos;
          return (
            <Text key={`title-char-${i}`} color={theme.colors.text} bold>
              {titleInfo.title[titleIndex]}
            </Text>
          );
        }
        return (
          <Text key={`top-border-${i}`} color={getAnimatedColor('top', pos)}>
            {variant === 'matrix' && Math.random() < 0.1
              ? String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96))
              : chars.h}
          </Text>
        );
      })}
      <Text color={getAnimatedColor('top', width - 1)}>{chars.tr}</Text>
    </Box>
  );

  // Render middle section with content
  const renderMiddle = (): React.ReactElement | React.ReactElement[] => {
    if (!children) {
      return Array.from({ length: height - 2 }, (_, i) => (
        <Box key={`middle-row-${i}`}>
          <Text color={getAnimatedColor('left', height - i - 2)}>
            {chars.v}
          </Text>
          <Box width={width - 2}>{/* Empty space */}</Box>
          <Text color={getAnimatedColor('right', i + 1)}>{chars.v}</Text>
        </Box>
      ));
    }

    return (
      <Box flexDirection='row'>
        <Box flexDirection='column'>
          {Array.from({ length: height - 2 }, (_, i) => (
            <Text key={`left-border-${i}`} color={getAnimatedColor('left', height - i - 2)}>
              {chars.v}
            </Text>
          ))}
        </Box>
        <Box width={width - 2} paddingX={1}>
          {children}
        </Box>
        <Box flexDirection='column'>
          {Array.from({ length: height - 2 }, (_, i) => (
            <Text key={`right-border-${i}`} color={getAnimatedColor('right', i + 1)}>
              {chars.v}
            </Text>
          ))}
        </Box>
      </Box>
    );
  };

  // Render bottom border
  const renderBottom = (): React.ReactElement => (
    <Box>
      <Text color={getAnimatedColor('bottom', width - 1)}>{chars.bl}</Text>
      {Array.from({ length: width - 2 }, (_, i) => (
        <Text key={`bottom-border-${i}`} color={getAnimatedColor('bottom', width - i - 2)}>
          {chars.h}
        </Text>
      ))}
      <Text color={getAnimatedColor('bottom', 0)}>{chars.br}</Text>
    </Box>
  );

  return (
    <Box flexDirection='column'>
      {renderTop()}
      {renderMiddle()}
      {renderBottom()}
    </Box>
  );
};
