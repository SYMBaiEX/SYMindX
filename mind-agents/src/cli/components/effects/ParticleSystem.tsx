import { Box, Text } from 'ink';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { themeEngine } from '../../themes/ThemeEngine.js';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char: string;
  color: string;
  size: number;
}

interface ParticleSystemProps {
  width?: number;
  height?: number;
  particleCount?: number;
  emitterX?: number | 'center' | 'random';
  emitterY?: number | 'center' | 'bottom' | 'top' | 'random';
  particleTypes?: ('star' | 'spark' | 'snow' | 'fire' | 'bubble' | 'custom')[];
  customParticles?: string[];
  gravity?: number;
  wind?: number;
  lifespan?: number;
  speed?: number;
  spread?: number;
  fadeOut?: boolean;
  colorful?: boolean;
  responsive?: boolean;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  width: propWidth,
  height: propHeight,
  particleCount = 20,
  emitterX = 'center',
  emitterY = 'bottom',
  particleTypes = ['star'],
  customParticles,
  gravity = 0.1,
  wind = 0,
  lifespan = 100,
  speed = 1,
  spread = 1,
  fadeOut = true,
  colorful = true,
  responsive = true,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
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

  // Particle character sets
  const particleChars = useMemo(() => ({
    star: ['✦', '✧', '★', '☆', '✨', '✪', '✫', '✬', '✭', '✮'],
    spark: ['·', '•', '∘', '○', '◦', '⁕', '⁎', '⁑'],
    snow: ['❄', '❅', '❆', '❇', '❈', '❉', '❊', '❋', '*', '·'],
    fire: ['🔥', '火', '炎', '🔸', '🔶', '▲', '△', '▴', '▵'],
    bubble: ['○', '◯', '◔', '◕', '◐', '◑', '◒', '◓', '⦿', '◉'],
    custom: customParticles || ['*'],
  }), [customParticles]);

  // Get emitter position
  const getEmitterPosition = useCallback((): { x: number; y: number } => {
    let x = width / 2;
    let y = height - 1;

    if (emitterX === 'center') x = width / 2;
    else if (emitterX === 'random') x = Math.random() * width;
    else if (typeof emitterX === 'number') x = emitterX;

    if (emitterY === 'center') y = height / 2;
    else if (emitterY === 'bottom') y = height - 1;
    else if (emitterY === 'top') y = 0;
    else if (emitterY === 'random') y = Math.random() * height;
    else if (typeof emitterY === 'number') y = emitterY;

    return { x, y };
  }, [width, height, emitterX, emitterY]);

  // Get random particle character
  const getParticleChar = useCallback((): string => {
    const type =
      particleTypes[Math.floor(Math.random() * particleTypes.length)];
    const chars = particleChars[type ?? 'star'];
    return chars[Math.floor(Math.random() * chars.length)] ?? '*';
  }, [particleTypes, particleChars]);

  // Get particle color
  const getParticleColor = useCallback((type: string | undefined): string => {
    if (!type) return theme.colors.text;
    if (!colorful) return theme.colors.text;

    const colorMap = {
      star: [theme.colors.accent, theme.colors.warning, theme.colors.primary],
      spark: [theme.colors.glow, theme.colors.glowAlt, theme.colors.text],
      snow: [theme.colors.text, theme.colors.textBright, '#E0E0E0'],
      fire: [theme.colors.danger, theme.colors.warning, theme.colors.accent],
      bubble: [
        theme.colors.primary,
        theme.colors.secondary,
        theme.colors.accent,
      ],
      custom: [theme.colors.primary],
    };

    const colors = colorMap[type as keyof typeof colorMap] || [
      theme.colors.text,
    ];
    return (
      colors[Math.floor(Math.random() * colors.length)] ?? theme.colors.text
    );
  }, [theme.colors, colorful]);

  // Create new particle
  const createParticle = useCallback((baseId: number): Particle => {
    const { x, y } = getEmitterPosition();
    const type =
      particleTypes[Math.floor(Math.random() * particleTypes.length)];
    const angle = Math.PI / 2 + (Math.random() - 0.5) * spread * Math.PI;
    const velocity = speed * (0.5 + Math.random() * 0.5);

    return {
      id: `particle-${baseId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      vx: Math.cos(angle) * velocity + wind,
      vy: -Math.sin(angle) * velocity,
      life: lifespan,
      maxLife: lifespan,
      char: getParticleChar(),
      color: getParticleColor(type ?? 'star'),
      size: Math.random() < 0.2 ? 2 : 1, // 20% chance for larger particles
    };
  }, [getEmitterPosition, particleTypes, spread, speed, wind, lifespan, getParticleChar, getParticleColor]);

  // Initialize particles
  useEffect(() => {
    const initialParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      // Stagger particle creation for a continuous stream
      const delay = i * (lifespan / particleCount);
      const particle = createParticle(i);
      particle.life = lifespan - delay;
      initialParticles.push(particle);
    }
    setParticles(initialParticles);
  }, [particleCount, width, height, createParticle, lifespan]);

  // Update particles
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled()) return;

    const updateInterval = setInterval(() => {
      setParticles((prevParticles) =>
        prevParticles.map((particle) => {
          // Update physics
          let newVx = particle.vx + wind * 0.01;
          const newVy = particle.vy + gravity;
          const newX = particle.x + newVx;
          const newY = particle.y + newVy;
          const newLife = particle.life - 1;

          // Reset particle if it dies or goes off screen
          if (newLife <= 0 || newY > height || newX < 0 || newX > width) {
            return createParticle(parseInt(particle.id.split('-')[1] || '0', 10));
          }

          // Apply some randomness for organic movement
          if (Math.random() < 0.1) {
            newVx += (Math.random() - 0.5) * 0.2;
          }

          return {
            ...particle,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            life: newLife,
          };
        })
      );
    }, 50);

    return (): void => clearInterval(updateInterval);
  }, [gravity, wind, height, width, createParticle]);

  // Render particles with content-based keys
  const renderParticles = useCallback((): React.ReactElement[] => {
    const display: string[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(' '));

    // Place particles on the display
    particles.forEach((particle) => {
      const x = Math.floor(particle.x);
      const y = Math.floor(particle.y);

      if (x >= 0 && x < width && y >= 0 && y < height && display[y]) {
        display[y][x] = particle.char;

        // Add glow effect for larger particles
        if (particle.size > 1 && x > 0 && x < width - 1 && display[y]) {
          display[y][x - 1] = '·';
          display[y][x + 1] = '·';
        }
      }
    });

    return display.map((row, y) => {
      const rowContent = row.join('');
      const rowKey = `row-${y}-${rowContent.length}-${rowContent.charCodeAt(0)}-${rowContent.charCodeAt(Math.floor(rowContent.length / 2))}-${rowContent.charCodeAt(rowContent.length - 1)}`;
      
      return (
        <Text key={rowKey}>
          {row.map((char, x) => {
            const particle = particles.find(
              (p) => Math.floor(p.x) === x && Math.floor(p.y) === y
            );

            const cellKey = particle 
              ? `cell-${particle.id}-${y}-${x}-${char}`
              : `empty-${y}-${x}-${char}`;

            if (char === ' ') return <Text key={cellKey}> </Text>;

            if (!particle) return <Text key={cellKey}>{char}</Text>;

            // Calculate opacity based on life
            const lifeRatio = particle.life / particle.maxLife;
            const dimmed = fadeOut && lifeRatio < 0.5;

            return (
              <Text
                key={cellKey}
                color={particle.color}
                dimColor={dimmed}
                bold={particle.size > 1}
              >
                {char}
              </Text>
            );
          })}
        </Text>
      );
    });
  }, [particles, height, width, fadeOut]);

  return <Box flexDirection='column'>{renderParticles()}</Box>;
};
