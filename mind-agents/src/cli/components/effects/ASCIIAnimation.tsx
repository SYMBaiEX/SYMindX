import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface ASCIIAnimationProps {
  variant?:
    | 'logo'
    | 'fire'
    | 'water'
    | 'lightning'
    | 'explosion'
    | 'portal'
    | 'custom';
  frames?: string[];
  speed?: number;
  loop?: boolean;
  color?: string;
  rainbow?: boolean;
  onComplete?: () => void;
}

export const ASCIIAnimation: React.FC<ASCIIAnimationProps> = ({
  variant = 'logo',
  frames: customFrames,
  speed = 100,
  loop = true,
  color,
  rainbow = false,
  onComplete,
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const theme = themeEngine.getTheme();
  const defaultColor = color ?? theme.colors.primary;

  // Predefined animations
  const animations = {
    logo: [
      `
   ███████╗██╗   ██╗███╗   ███╗
   ██╔════╝╚██╗ ██╔╝████╗ ████║
   ███████╗ ╚████╔╝ ██╔████╔██║
   ╚════██║  ╚██╔╝  ██║╚██╔╝██║
   ███████║   ██║   ██║ ╚═╝ ██║
   ╚══════╝   ╚═╝   ╚═╝     ╚═╝`,
      `
   ▄████████▄ ▄██▄ ▄██▄ ▄██████▄
   ██████████ ████ ████ ████████
   ▀████████▀ ▀██▀ ▀██▀ ▀██████▀`,
      `
   ░██████╗██╗░░░██╗███╗░░░███╗
   ██╔════╝╚██╗░██╔╝████╗░████║
   ╚█████╗░░╚████╔╝░██╔████╔██║
   ░╚═══██╗░░╚██╔╝░░██║╚██╔╝██║
   ██████╔╝░░░██║░░░██║░╚═╝░██║
   ╚═════╝░░░░╚═╝░░░╚═╝░░░░░╚═╝`,
    ],
    fire: [
      `
       (  )   (   )  )
        ) (     )  (  (
        ( )   (    ) )
        _____________
       <_____________> ___
       |             |/ _ \\
       |               | | |
       |               |_| |
    ___|             |\\___/`,
      `
        )  (   )    (
       (    ) (    )  )
        )  ( (   )  (
        _____________
       <_____________> ___
       |     ~~      |/ _ \\
       |      ~~     | | |
       |    ~~~~     |_| |
    ___|_____________|\\___/`,
      `
       (    )  (   ) (
        )  (   )  (   )
       (   ) (   )  (
        _____________
       <_____________> ___
       |   ~~~~~~   |/ _ \\
       |  ~~~~~~~~  | | |
       | ~~~~~~~~~~ |_| |
    ___|_____________|\\___/`,
    ],
    water: [
      `
    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋
    ∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼
    ～～～～～～～～～～～～`,
      `
    ～～～～～～～～～～～～
    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋
    ∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼`,
      `
    ∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼∼
    ～～～～～～～～～～～～
    ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈
    ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋`,
    ],
    lightning: [
      `
           ▲
          ╱ ╲
         ╱   ╲
        ╱     ╲
       ▕  ⚡  ▏
        ╲     ╱
         ╲   ╱
          ╲ ╱
           ▼`,
      `
         ┃
         ┃
       ╱╲┃╱╲
      ╱  ┃  ╲
     ╱   ┃   ╲
    ╱  ⚡┃⚡  ╲
   ╱     ┃     ╲
  ╱      ┃      ╲`,
      `
    ╱╲    ╱╲    ╱╲
   ╱  ╲  ╱  ╲  ╱  ╲
  ╱    ╲╱    ╲╱    ╲
 ╱  ⚡  ╱╲  ⚡  ╱╲  ⚡  ╲
╱      ╱  ╲      ╱  ╲      ╲`,
    ],
    explosion: [
      `
         .
        .:.
       .:::.
      .:::::.
     .:::::::.
    .:::::::::.`,
      `
       *****
      *******
     *********
    ***********
   *************
  ***************`,
      `
     ▓▓▓▓▓▓▓
    ▓▓▓▓▓▓▓▓▓
   ▓▓▓▓▓▓▓▓▓▓▓
  ▓▓▓▓▓▓▓▓▓▓▓▓▓
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`,
      `
    ░░░░░░░░░
   ░░░░░░░░░░░
  ░░░░░░░░░░░░░
 ░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░`,
    ],
    portal: [
      `
       ╱◯╲
      ╱   ╲
     │  ◉  │
      ╲   ╱
       ╲◯╱`,
      `
      ╱═◯═╲
     ╱     ╲
    │   ◉   │
     ╲     ╱
      ╲═◯═╱`,
      `
     ╱══◯══╲
    ╱       ╲
   │    ◉    │
    ╲       ╱
     ╲══◯══╱`,
      `
    ╱═══◯═══╲
   ╱         ╲
  │     ◉     │
   ╲         ╱
    ╲═══◯═══╱`,
    ],
    custom: customFrames || ['Custom Animation'],
  };

  const selectedFrames = customFrames || animations[variant];

  // Rainbow colors
  const rainbowColors = [
    '#FF0000',
    '#FF7F00',
    '#FFFF00',
    '#00FF00',
    '#0000FF',
    '#4B0082',
    '#9400D3',
  ];

  // Get current color for rainbow effect
  const getCurrentColor = (): string => {
    if (!rainbow) return defaultColor;
    const colorIndex = currentFrame % rainbowColors.length;
    return rainbowColors[colorIndex] || defaultColor;
  };

  // Animation logic
  useEffect(() => {
    if (!isPlaying || !themeEngine.areAnimationsEnabled()) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;

        if (next >= selectedFrames.length) {
          if (loop) {
            return 0;
          } else {
            setIsPlaying(false);
            if (onComplete) onComplete();
            return prev;
          }
        }

        return next;
      });
    }, speed);

    return (): void => clearInterval(interval);
  }, [isPlaying, speed, selectedFrames.length, loop, onComplete]);

  // Apply effects to frame
  const renderFrame = (): React.ReactElement[] => {
    const frame = selectedFrames[currentFrame % selectedFrames.length];
    if (!frame) {
      return [<Text key='empty'>Loading...</Text>];
    }
    const lines = frame.trim().split('\n');

    return lines.map((line, i) => {
      const uniqueKey = `${variant}-${currentFrame}-${line.substring(0, 10)}-${i}`;
      // Apply wave effect for water variant
      if (variant === 'water') {
        const offset = Math.sin((Date.now() / 200 + i) * 0.5) * 2;
        return (
          <Box key={uniqueKey} marginLeft={Math.floor(offset + 2)}>
            <Text color={getCurrentColor()}>{line}</Text>
          </Box>
        );
      }

      // Apply flicker effect for fire and explosion
      if (
        (variant === 'fire' || variant === 'explosion') &&
        Math.random() < 0.3
      ) {
        return (
          <Text key={uniqueKey} color={getCurrentColor()} dimColor>
            {line}
          </Text>
        );
      }

      // Apply glow effect for lightning and portal
      if (variant === 'lightning' || variant === 'portal') {
        return (
          <Text key={uniqueKey} color={getCurrentColor()} bold>
            {line}
          </Text>
        );
      }

      // Default rendering
      return (
        <Text key={uniqueKey} color={getCurrentColor()}>
          {line}
        </Text>
      );
    });
  };

  return (
    <Box flexDirection='column' alignItems='center'>
      {renderFrame()}
    </Box>
  );
};
