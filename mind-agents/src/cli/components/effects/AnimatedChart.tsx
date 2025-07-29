import { Box, Text } from 'ink';
import React, { useState, useEffect } from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { themeEngine } from '../../themes/theme-engine.js';

interface DataPoint {
  value: number;
  label?: string;
  color?: string;
}

interface AnimatedChartProps {
  data: DataPoint[];
  type?: 'bar' | 'line' | 'wave' | 'radar' | 'sparkline' | 'area';
  width?: number;
  height?: number;
  animate?: boolean;
  speed?: number;
  title?: string;
  showLabels?: boolean;
  showValues?: boolean;
  color?: string;
  responsive?: boolean;
  style?: 'ascii' | 'blocks' | 'smooth';
}

export const AnimatedChart: React.FC<AnimatedChartProps> = ({
  data,
  type = 'bar',
  width: propWidth,
  height: propHeight = 10,
  animate = true,
  speed = 50,
  title,
  showLabels = true,
  showValues = false,
  color,
  responsive = true,
  style = 'blocks',
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [wavePhase, setWavePhase] = useState(0);
  const { dimensions } = useTerminalDimensions();
  const theme = themeEngine.getTheme();

  // Use responsive dimensions if enabled
  const width = responsive
    ? Math.min(dimensions.width - 4, propWidth || 60)
    : propWidth || 60;
  const height = propHeight;
  const defaultColor = color || theme.colors.primary;

  // Normalize data values
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  // Animation
  useEffect(() => {
    if (!animate || !themeEngine.areAnimationsEnabled()) {
      setAnimationProgress(1);
      return;
    }

    const startTime = Date.now();
    const duration = 1000;

    const animateInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(easeOutCubic(progress));

      if (progress >= 1) {
        clearInterval(animateInterval);
      }
    }, 16);

    // Wave animation for certain chart types
    if (type === 'wave' || type === 'area') {
      const waveInterval = setInterval(() => {
        setWavePhase((prev) => (prev + 0.1) % (Math.PI * 2));
      }, speed);

      return (): void => {
        clearInterval(animateInterval);
        clearInterval(waveInterval);
      };
    }

    return (): void => clearInterval(animateInterval);
  }, [animate, type, speed]);

  // Easing function
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Chart rendering functions
  const renderBarChart = (): React.ReactElement => {
    const barWidth = Math.floor(width / data.length) - 1;
    const bars: React.ReactNode[] = [];

    // Character sets for different styles
    const barChars = {
      ascii: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
      blocks: ['░', '▒', '▓', '█'],
      smooth: ['⣀', '⣤', '⣶', '⣿'],
    };

    const chars = barChars[style];

    data.forEach((point, index) => {
      const normalizedValue = (point.value - minValue) / range;
      const barHeight = Math.floor(
        normalizedValue * height * animationProgress
      );
      const barColor = point.color || defaultColor;

      const bar: React.ReactNode[] = [];

      // Build bar from bottom to top
      for (let y = height - 1; y >= 0; y--) {
        const row: React.ReactNode[] = [];

        for (let x = 0; x < barWidth; x++) {
          if (y >= height - barHeight) {
            const charIndex = Math.min(
              Math.floor(
                (1 - (y - (height - barHeight)) / barHeight) * chars.length
              ),
              chars.length - 1
            );
            row.push(
              <Text key={`bar-${x}`} color={barColor} bold={y === height - barHeight}>
                {chars[charIndex]}
              </Text>
            );
          } else {
            row.push(<Text key={`empty-${x}`}> </Text>);
          }
        }

        bar.push(<Box key={`bar-row-${y}`}>{row}</Box>);
      }

      bars.push(
        <Box key={`bar-${point.label || `data-${index}`}`} flexDirection='column' marginRight={1}>
          {bar}
          {showLabels && (
            <Text color={theme.colors.textDim}>{point.label || index}</Text>
          )}
          {showValues && (
            <Text color={barColor} dimColor>
              {point.value.toFixed(0)}
            </Text>
          )}
        </Box>
      );
    });

    return <Box>{bars}</Box>;
  };

  const renderLineChart = (): React.ReactElement => {
    const chartWidth = width;
    const pointSpacing = chartWidth / (data.length - 1);

    // Create a 2D grid for the chart
    const grid: string[][] = Array(height)
      .fill(null)
      .map(() => Array(chartWidth).fill(' '));

    // Plot points and lines
    data.forEach((point, index) => {
      if (index === 0) return;

      const prevPoint = data[index - 1];
      if (!prevPoint) return; // Skip if previous point is undefined

      const normalizedValue = (point.value - minValue) / range;
      const normalizedPrevValue = (prevPoint.value - minValue) / range;

      const x1 = Math.floor((index - 1) * pointSpacing);
      const y1 = Math.floor((1 - normalizedPrevValue) * (height - 1));
      const x2 = Math.floor(index * pointSpacing);
      const y2 = Math.floor((1 - normalizedValue) * (height - 1));

      // Draw line between points
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      for (let i = 0; i <= steps; i++) {
        const progress = (i / steps) * animationProgress;
        const x = Math.floor(x1 + (x2 - x1) * progress);
        const y = Math.floor(y1 + (y2 - y1) * progress);

        if (x >= 0 && x < chartWidth && y >= 0 && y < height && grid[y]) {
          grid[y][x] = style === 'smooth' ? '─' : '█';
        }
      }

      // Mark data points
      if (animationProgress >= index / data.length) {
        if (x2 >= 0 && x2 < chartWidth && y2 >= 0 && y2 < height && grid[y2]) {
          grid[y2][x2] = '●';
        }
      }
    });

    return (
      <Box flexDirection='column'>
        {grid.map((row, y) => {
          const rowKey = `line-row-${y}-${row.length}-${row.filter(c => c !== ' ').length}`;
          return (
            <Text key={rowKey}>
              {row.map((char, x) => {
                const pointIndex = Math.floor(x / pointSpacing);
                const pointColor = data[pointIndex]?.color || defaultColor;

                if (char === ' ') return ' ';

                const uniqueKey = `char-${char.charCodeAt(0)}-y${y}x${x}`;
                return (
                  <Text key={uniqueKey} color={pointColor} bold={char === '●'}>
                    {char}
                  </Text>
                );
              })}
            </Text>
          );
        })}
      </Box>
    );
  };

  const renderWaveChart = (): React.ReactElement => {
    const lines: React.ReactNode[] = [];

    for (let y = 0; y < height; y++) {
      const row: React.ReactNode[] = [];

      for (let x = 0; x < width; x++) {
        const dataIndex = Math.floor((x / width) * data.length);
        const point = data[dataIndex];
        if (!point) continue; // Skip if point is undefined

        const normalizedValue = (point.value - minValue) / range;

        // Apply wave distortion
        const waveOffset = Math.sin(x * 0.1 + wavePhase) * 0.1;
        const adjustedValue = normalizedValue + waveOffset;

        const yPos = Math.floor((1 - adjustedValue) * height);

        if (Math.abs(y - yPos) < 2) {
          const waveChars = ['～', '≈', '≋', '~'];
          const charIndex = Math.floor((x + wavePhase * 10) % waveChars.length);
          row.push(
            <Text key={`wave-${x}`} color={point?.color || defaultColor}>
              {waveChars[charIndex]}
            </Text>
          );
        } else {
          row.push(<Text key={x}> </Text>);
        }
      }

      lines.push(<Box key={`wave-row-${y}`}>{row}</Box>);
    }

    return <Box flexDirection='column'>{lines}</Box>;
  };

  const renderSparkline = (): React.ReactElement => {
    const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

    return (
      <Box>
        {data.map((point, index) => {
          const normalizedValue = (point.value - minValue) / range;
          const charIndex = Math.floor(
            normalizedValue * (sparkChars.length - 1) * animationProgress
          );

          return (
            <Text key={`spark-${point.label || `data-${index}`}`} color={point.color || defaultColor}>
              {sparkChars[charIndex]}
            </Text>
          );
        })}
      </Box>
    );
  };

  // Chart selection
  const renderChart = (): React.ReactElement => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'wave':
        return renderWaveChart();
      case 'sparkline':
        return renderSparkline();
      default:
        return renderBarChart();
    }
  };

  return (
    <Box flexDirection='column'>
      {title && (
        <Box marginBottom={1}>
          <Text color={theme.colors.text} bold>
            {title}
          </Text>
        </Box>
      )}
      {renderChart()}
    </Box>
  );
};
