import { Box, Text } from 'ink';
import React from 'react';

interface LoadingIndicatorProps {
  text?: string;
  variant?: 'dots' | 'spinner' | 'pulse' | 'wave';
  color?: string;
  size?: 'small' | 'medium' | 'large';
  reducedMotion?: boolean;
}

// Loading dots indicator
const LoadingDots: React.FC<{ color?: string; text?: string; reducedMotion?: boolean }> = ({ 
  color = 'cyan', 
  text = 'Loading',
  reducedMotion = false 
}) => {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    if (reducedMotion) {
      setDots('...');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <Box>
      <Text color={color}>
        {text}{dots}
      </Text>
    </Box>
  );
};

// Spinner indicator
const LoadingSpinner: React.FC<{ color?: string; size?: number; reducedMotion?: boolean }> = ({ 
  color = 'cyan', 
  size = 1,
  reducedMotion = false 
}) => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    if (reducedMotion) {
      setFrame(0);
      return;
    }

    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, 80);

    return () => clearInterval(interval);
  }, [frames.length, reducedMotion]);

  const spinner = reducedMotion ? '○' : frames[frame];

  return (
    <Text color={color}>
      {Array(size).fill(spinner).join('')}
    </Text>
  );
};

// Pulse indicator
const LoadingPulse: React.FC<{ color?: string; width?: number; reducedMotion?: boolean }> = ({ 
  color = 'cyan', 
  width = 20,
  reducedMotion = false 
}) => {
  const [position, setPosition] = React.useState(0);
  const [direction, setDirection] = React.useState(1);

  React.useEffect(() => {
    if (reducedMotion) {
      setPosition(Math.floor(width / 2));
      return;
    }

    const interval = setInterval(() => {
      setPosition(prev => {
        const next = prev + direction;
        if (next >= width - 3 || next <= 0) {
          setDirection(-direction);
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [width, direction, reducedMotion]);

  const pulse = reducedMotion 
    ? '█'.repeat(3)
    : ' '.repeat(position) + '█'.repeat(3) + ' '.repeat(width - position - 3);

  return (
    <Box width={width}>
      <Text color={color}>[{pulse}]</Text>
    </Box>
  );
};

// Wave indicator
const LoadingWave: React.FC<{ color?: string; width?: number; reducedMotion?: boolean }> = ({ 
  color = 'cyan', 
  width = 10,
  reducedMotion = false 
}) => {
  const [phase, setPhase] = React.useState(0);
  const waveChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'];

  React.useEffect(() => {
    if (reducedMotion) {
      setPhase(0);
      return;
    }

    const interval = setInterval(() => {
      setPhase(prev => (prev + 1) % waveChars.length);
    }, 150);

    return () => clearInterval(interval);
  }, [waveChars.length, reducedMotion]);

  const wave = Array(width).fill(null).map((_, i) => {
    const charIndex = reducedMotion ? 4 : (phase + i) % waveChars.length;
    return waveChars[charIndex];
  }).join('');

  return (
    <Text color={color}>{wave}</Text>
  );
};

// Main loading indicator component
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  text,
  variant = 'spinner',
  color = 'cyan',
  size = 'medium',
  reducedMotion = false
}) => {
  const sizeMap = {
    small: 1,
    medium: 2,
    large: 3
  };

  const widthMap = {
    small: 15,
    medium: 20,
    large: 30
  };

  switch (variant) {
    case 'dots':
      return <LoadingDots color={color} {...(text && { text })} reducedMotion={reducedMotion} />;
    case 'spinner':
      return <LoadingSpinner color={color} size={sizeMap[size]} reducedMotion={reducedMotion} />;
    case 'pulse':
      return <LoadingPulse color={color} width={widthMap[size]} reducedMotion={reducedMotion} />;
    case 'wave':
      return <LoadingWave color={color} width={widthMap[size]} reducedMotion={reducedMotion} />;
    default:
      return <LoadingSpinner color={color} size={sizeMap[size]} reducedMotion={reducedMotion} />;
  }
};

// Progress bar component
interface ProgressBarProps {
  value: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  reducedMotion?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  total,
  width = 20,
  showPercentage = true,
  color = 'green',
  backgroundColor = 'gray',
  reducedMotion = false
}) => {
  const percentage = Math.min(100, Math.max(0, (value / total) * 100));
  const filledWidth = Math.round((percentage / 100) * width);
  
  const [displayWidth, setDisplayWidth] = React.useState(reducedMotion ? filledWidth : 0);

  React.useEffect(() => {
    if (reducedMotion) {
      setDisplayWidth(filledWidth);
      return;
    }

    const steps = 5;
    const stepSize = (filledWidth - displayWidth) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setDisplayWidth(prev => {
        const next = prev + stepSize;
        if (currentStep >= steps) {
          clearInterval(interval);
          return filledWidth;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [filledWidth, reducedMotion]);

  const filled = '█'.repeat(Math.round(displayWidth));
  const empty = '░'.repeat(width - Math.round(displayWidth));

  return (
    <Box>
      <Text>
        <Text color={color}>{filled}</Text>
        <Text color={backgroundColor}>{empty}</Text>
        {showPercentage && (
          <Text color={color}> {Math.round(percentage)}%</Text>
        )}
      </Text>
    </Box>
  );
};

// Skeleton loader component
interface SkeletonProps {
  width?: number;
  height?: number;
  variant?: 'text' | 'rect' | 'circle';
  animate?: boolean;
  reducedMotion?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = 20,
  height = 1,
  animate = true,
  reducedMotion = false
}) => {
  const [opacity, setOpacity] = React.useState(1);

  React.useEffect(() => {
    if (!animate || reducedMotion) {
      setOpacity(0.5);
      return;
    }

    const interval = setInterval(() => {
      setOpacity(prev => prev === 1 ? 0.3 : 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [animate, reducedMotion]);

  const char = opacity > 0.6 ? '█' : '▓';
  const skeleton = Array(height).fill(null).map(() => 
    char.repeat(width)
  ).join('\n');

  return (
    <Box flexDirection="column">
      <Text dimColor={opacity < 0.6}>{skeleton}</Text>
    </Box>
  );
};

// Shimmer effect component
interface ShimmerProps {
  width?: number;
  height?: number;
  duration?: number;
  reducedMotion?: boolean;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width = 20,
  height = 1,
  duration = 2000,
  reducedMotion = false
}) => {
  const [position, setPosition] = React.useState(-5);

  React.useEffect(() => {
    if (reducedMotion) {
      setPosition(width / 2);
      return;
    }

    const interval = setInterval(() => {
      setPosition(prev => {
        if (prev > width) return -5;
        return prev + 1;
      });
    }, duration / (width + 5));

    return () => clearInterval(interval);
  }, [width, duration, reducedMotion]);

  const lines = Array(height).fill(null).map(() => {
    const line = Array(width).fill(null).map((_, i) => {
      const distance = Math.abs(i - position);
      if (distance <= 2) {
        return '█';
      } else if (distance <= 4) {
        return '▓';
      }
      return '░';
    }).join('');
    return line;
  });

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} color="gray">{line}</Text>
      ))}
    </Box>
  );
};

// Export all components
export default {
  LoadingIndicator,
  ProgressBar,
  Skeleton,
  Shimmer
};