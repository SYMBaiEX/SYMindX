import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { themeEngine } from '../../themes/ThemeEngine.js';

interface ScanlineEffectProps {
  width?: number;
  height?: number;
  speed?: number;
  variant?: 'classic' | 'digital' | 'interference' | 'static' | 'wave';
  intensity?: number;
  color?: string;
  responsive?: boolean;
  direction?: 'down' | 'up' | 'both';
  scanlineCount?: number;
}

export const ScanlineEffect: React.FC<ScanlineEffectProps> = ({
  width: propWidth,
  height: propHeight,
  speed = 100,
  variant = 'classic',
  intensity = 0.3,
  color,
  responsive = true,
  direction = 'down',
  scanlineCount = 1,
}) => {
  const [scanlinePositions, setScanlinePositions] = useState<number[]>(
    Array.from({ length: scanlineCount }, (_, i) => i * 10)
  );
  const [staticNoise, setStaticNoise] = useState<string[][]>([]);
  const { dimensions } = useTerminalDimensions();
  const theme = themeEngine.getTheme();

  // Use responsive dimensions if enabled
  const width = responsive ? dimensions.width : propWidth || 80;
  const height = responsive ? dimensions.height - 2 : propHeight || 24;
  const defaultColor = color || theme.colors.borderDim;

  // Initialize static noise for certain variants
  useEffect(() => {
    if (variant === 'static' || variant === 'interference') {
      const noise = Array(height)
        .fill(null)
        .map(() =>
          Array(width)
            .fill(null)
            .map(() => {
              const rand = Math.random();
              if (rand < 0.05) return '█';
              if (rand < 0.1) return '▓';
              if (rand < 0.15) return '▒';
              if (rand < 0.2) return '░';
              return ' ';
            })
        );
      setStaticNoise(noise);
    }
  }, [width, height, variant]);

  // Update scanline positions
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled()) return;

    const interval = setInterval(() => {
      setScanlinePositions((prev) =>
        prev.map((pos, index) => {
          let newPos = pos;

          switch (direction) {
            case 'down':
              newPos = (pos + 1) % height;
              break;
            case 'up':
              newPos = (pos - 1 + height) % height;
              break;
            case 'both':
              newPos =
                index % 2 === 0
                  ? (pos + 1) % height
                  : (pos - 1 + height) % height;
              break;
          }

          return newPos;
        })
      );

      // Update static noise for interference variant
      if (variant === 'interference') {
        setStaticNoise((prev) =>
          prev.map((row) => row.map(() => (Math.random() < 0.1 ? '░' : ' ')))
        );
      }
    }, speed);

    return () => clearInterval(interval);
  }, [speed, height, direction, variant]);

  // Render scanline effect
  const renderScanlines = () => {
    const lines: React.ReactNode[] = [];

    for (let y = 0; y < height; y++) {
      const isScanline = scanlinePositions.includes(y);
      const nearScanline = scanlinePositions.some(
        (pos) => Math.abs(pos - y) <= 2
      );

      let lineContent = '';

      switch (variant) {
        case 'classic':
          if (isScanline) {
            lineContent = '─'.repeat(width);
          } else if (nearScanline) {
            lineContent = ' '.repeat(width);
          } else {
            lineContent = ' '.repeat(width);
          }
          break;

        case 'digital':
          if (isScanline) {
            lineContent = Array(width)
              .fill(null)
              .map(() => (Math.random() < 0.5 ? '1' : '0'))
              .join('');
          } else {
            lineContent = ' '.repeat(width);
          }
          break;

        case 'interference':
          if (isScanline) {
            lineContent = Array(width)
              .fill(null)
              .map(() => {
                const chars = '▓▒░ ';
                return chars[Math.floor(Math.random() * chars.length)];
              })
              .join('');
          } else if (staticNoise[y]) {
            lineContent = staticNoise[y]?.join('') || ' '.repeat(width);
          } else {
            lineContent = ' '.repeat(width);
          }
          break;

        case 'static':
          if (isScanline) {
            lineContent = '█'.repeat(width);
          } else if (staticNoise[y]) {
            lineContent = staticNoise[y]?.join('') || ' '.repeat(width);
          } else {
            lineContent = ' '.repeat(width);
          }
          break;

        case 'wave':
          if (isScanline) {
            const wavePhase = Date.now() / 100;
            lineContent = Array(width)
              .fill(null)
              .map((_, x) => {
                const wave =
                  Math.sin((x / width) * Math.PI * 2 + wavePhase) * 0.5 + 0.5;
                if (wave > 0.7) return '▓';
                if (wave > 0.4) return '▒';
                if (wave > 0.2) return '░';
                return ' ';
              })
              .join('');
          } else {
            lineContent = ' '.repeat(width);
          }
          break;

        default:
          lineContent = ' '.repeat(width);
      }

      // Apply color and effects
      if (isScanline) {
        lines.push(
          <Text
            key={y}
            color={theme.colors.glow}
            bold
            dimColor={variant === 'static'}
          >
            {lineContent}
          </Text>
        );
      } else if (nearScanline && intensity > 0.5) {
        lines.push(
          <Text key={y} color={defaultColor} dimColor>
            {lineContent}
          </Text>
        );
      } else {
        lines.push(
          <Text key={y} color={defaultColor} dimColor>
            {lineContent}
          </Text>
        );
      }
    }

    return lines;
  };

  return (
    <Box flexDirection='column' width={width} height={height}>
      {renderScanlines()}
    </Box>
  );
};
