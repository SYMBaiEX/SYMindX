import { Box, Text } from 'ink';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { themeEngine } from '../../themes/theme-engine.js';

interface MatrixRainProps {
  width?: number;
  height?: number;
  speed?: number;
  density?: number;
  color?: string;
  responsive?: boolean;
  variant?: 'classic' | 'binary' | 'japanese' | 'glitch' | 'custom';
  customChars?: string;
  fadeLength?: number;
  colorVariation?: boolean;
}

interface Drop {
  id: string;
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
  color?: string;
  glitchRate?: number;
}

export const MatrixRain: React.FC<MatrixRainProps> = ({
  width: propWidth,
  height: propHeight,
  speed = 100,
  density = 0.02,
  color,
  responsive = true,
  variant = 'classic',
  customChars,
  fadeLength = 0.8,
  colorVariation = true,
}) => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const { dimensions } = useTerminalDimensions();
  const theme = themeEngine.getTheme();

  // Use responsive dimensions if enabled (memoized)
  const width = useMemo((): number => 
    responsive ? dimensions.width : propWidth || 80, 
    [responsive, dimensions.width, propWidth]
  );
  
  const height = useMemo((): number => 
    responsive ? dimensions.height - 2 : propHeight || 24, 
    [responsive, dimensions.height, propHeight]
  );

  // Get default color from theme if not provided (memoized)
  const defaultColor = useMemo((): string => 
    color ?? theme.colors.matrix, 
    [color, theme.colors.matrix]
  );

  // Character sets for different variants (memoized)
  const charSets = useMemo(() => ({
    classic:
      '⌂⌀⌁⌃⌄⌅⌆⌇⌈⌉⌊⌋⌌⌍⌎⌏⌐⌑⌒⌓⌔⌕⌖⌗⌘⌙⌚⌛⌜⌝⌞⌟⌠⌡⌢⌣⌤⌥⌦⌧⌨〈〉⌫⌬アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    binary: '01',
    japanese:
      'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    glitch: '▓▒░█▄▀■□▢▣▤▥▦▧▨▩▪▫!@#$%^&*()_+-=[]{}|;:,.<>?',
    custom: customChars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  }), [customChars]);

  const matrixChars = useMemo((): string => charSets[variant], [charSets, variant]);

  // Generate color variation
  const getDropColor = useCallback((): string => {
    if (!colorVariation) return defaultColor;

    const colors = [
      theme.colors.matrix,
      theme.colors.primary,
      theme.colors.accent,
      theme.colors.success,
    ];

    return colors[Math.floor(Math.random() * colors.length)] ?? defaultColor;
  }, [colorVariation, defaultColor, theme.colors.matrix, theme.colors.primary, theme.colors.accent, theme.colors.success]);

  // Initialize drops with unique IDs
  const initializeDrops = useCallback((): void => {
    const initialDrops: Drop[] = [];
    const numDrops = Math.floor(width * density);

    for (let i = 0; i < numDrops; i++) {
      const dropLength =
        variant === 'binary'
          ? 8 + Math.floor(Math.random() * 12)
          : 5 + Math.floor(Math.random() * 10);

      initialDrops.push({
        id: `drop-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height) - height,
        speed: 0.5 + Math.random() * 0.5,
        length: dropLength,
        chars: Array.from(
          { length: dropLength },
          () =>
            matrixChars[Math.floor(Math.random() * matrixChars.length)] ?? ' '
        ),
        color: getDropColor(),
        glitchRate: variant === 'glitch' ? 0.3 : 0.1,
      });
    }

    setDrops(initialDrops);
  }, [width, height, density, variant, getDropColor, matrixChars]);

  useEffect(() => {
    initializeDrops();
  }, [initializeDrops]);

  // Animate drops function wrapped in useCallback
  const animateDrops = useCallback((): void => {
    setDrops((prevDrops) =>
      prevDrops.map((drop) => {
        let newY = drop.y + drop.speed;
        let newChars = drop.chars;
        let newColor = drop.color;

        // Reset drop when it goes off screen
        if (newY > height + drop.length) {
          newY = -drop.length;
          drop.x = Math.floor(Math.random() * width);
          newChars = Array.from(
            { length: drop.length },
            () =>
              matrixChars[Math.floor(Math.random() * matrixChars.length)] ??
              ' '
          );
          newColor = getDropColor();
        }

        // Character mutations based on variant
        const mutationRate = drop.glitchRate || 0.1;
        if (Math.random() < mutationRate) {
          const charIndex = Math.floor(Math.random() * drop.chars.length);
          newChars = [...drop.chars];

          if (variant === 'glitch') {
            // Glitch variant: more aggressive mutations
            for (let i = 0; i < 3; i++) {
              const idx = Math.floor(Math.random() * drop.chars.length);
              newChars[idx] =
                matrixChars[Math.floor(Math.random() * matrixChars.length)] ??
                ' ';
            }
          } else {
            newChars[charIndex] =
              matrixChars[Math.floor(Math.random() * matrixChars.length)] ??
              ' ';
          }
        }

        return {
          ...drop,
          y: newY,
          chars: newChars,
          color: newColor ?? drop.color ?? defaultColor,
        };
      })
    );
  }, [height, width, variant, defaultColor, getDropColor, matrixChars]);

  // Animate drops
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled()) return;

    const interval = setInterval(animateDrops, speed);
    return (): void => clearInterval(interval);
  }, [speed, animateDrops]);

  // Render matrix with content-based keys
  const renderMatrix = useCallback((): React.ReactElement[] => {
    const display: string[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(' '));

    // Place drops on the display
    drops.forEach((drop) => {
      for (let i = 0; i < drop.length; i++) {
        const y = Math.floor(drop.y - i);
        if (
          y >= 0 &&
          y < height &&
          drop.x >= 0 &&
          drop.x < width &&
          display[y]
        ) {
          const char = drop.chars[i] || ' ';
          display[y][drop.x] = char;
        }
      }
    });

    return display.map((row, y) => {
      const rowContent = row.join('');
      const rowKey = `row-${y}-${rowContent.length}-${rowContent.charCodeAt(0)}-${rowContent.charCodeAt(Math.floor(rowContent.length / 2))}-${rowContent.charCodeAt(rowContent.length - 1)}`;
      
      return (
        <Text key={rowKey}>
          {row.map((char, x) => {
            const drop = drops.find(
              (d) =>
                d.x === x &&
                Math.floor(d.y) <= y &&
                Math.floor(d.y - d.length) >= y
            );

            const cellKey = drop 
              ? `cell-${drop.id}-${y}-${x}-${char}`
              : `empty-${y}-${x}-${char}`;

            if (drop) {
              const charPosition = Math.floor(drop.y) - y;
              const opacity = 1 - (charPosition / drop.length) * fadeLength;

              // Head of the drop is brighter
              if (charPosition === 0) {
                return (
                  <Text key={cellKey} color={theme.colors.textBright} bold>
                    {char}
                  </Text>
                );
              }

              // Second character is also bright in some variants
              if (
                charPosition === 1 &&
                (variant === 'glitch' || variant === 'binary')
              ) {
                return (
                  <Text key={cellKey} color={drop?.color ?? defaultColor} bold>
                    {char}
                  </Text>
                );
              }

              // Fade out towards the tail
              const useColor = drop?.color ?? defaultColor;
              return (
                <Text key={cellKey} color={useColor} dimColor={opacity < 0.5}>
                  {char}
                </Text>
              );
            }

            return <Text key={cellKey}> </Text>;
          })}
        </Text>
      );
    });
  }, [drops, height, width, fadeLength, theme.colors.textBright, variant, defaultColor]);

  return <Box flexDirection='column'>{renderMatrix()}</Box>;
};
