import { Box, Text, useInput } from 'ink';
import React, { useState, useEffect } from 'react';

import { soundManager, SoundType } from '../../utils/sound-effects.js';
import {
  MatrixRain,
  GlitchText,
  ParticleSystem,
  NeonGlow,
  AnimatedBorder,
  PulsingEffect,
  LoadingSpinner,
  ScanlineEffect,
  ASCIIAnimation,
  AnimatedChart,
  Perspective3D,
  StatusAnimation,
  ViewTransition,
  themeEngine,
} from '../effects/index.js';

// Demo data for charts
const generateChartData = (): number[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    value: Math.random() * 100,
    label: String.fromCharCode(65 + i),
    color: ['#FF006E', '#00F5FF', '#FFFF00', '#00FF88'][i % 4] ?? '#FFFFFF',
  }));
};

// Demo component showcasing all effects
export const EffectsShowcase: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState('intro');
  const [chartData, setChartData] = useState(generateChartData());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [theme, setTheme] = useState(0);
  const themes = themeEngine.getThemeNames();

  // Handle keyboard navigation
  useInput((input, key) => {
    // Theme switching
    if (input === 't') {
      const nextTheme = (theme + 1) % themes.length;
      setTheme(nextTheme);
      const themeName = themes[nextTheme];
      if (themeName) {
        themeEngine.setTheme(themeName);
      }
      soundManager.play(SoundType.SELECT);
    }

    // Demo switching
    if (input === '1') {
      setActiveDemo('intro');
      soundManager.play(SoundType.NAVIGATE);
    } else if (input === '2') {
      setActiveDemo('matrix');
      soundManager.play(SoundType.MATRIX);
    } else if (input === '3') {
      setActiveDemo('particles');
      soundManager.play(SoundType.NAVIGATE);
    } else if (input === '4') {
      setActiveDemo('3d');
      soundManager.play(SoundType.NAVIGATE);
    } else if (input === '5') {
      setActiveDemo('charts');
      soundManager.play(SoundType.NAVIGATE);
    } else if (input === '6') {
      setActiveDemo('combined');
      soundManager.play(SoundType.NAVIGATE);
    }

    // Sound toggle
    if (input === 's') {
      soundManager.toggle();
      soundManager.play(SoundType.NOTIFICATION);
    }

    // Exit
    if (key.escape) {
      process.exit(0);
    }
  });

  // Update chart data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(generateChartData());
      setLoadingProgress((prev) => (prev + 10) % 100);
    }, 2000);

    return (): void => clearInterval(interval);
  }, []);

  // Render different demo screens
  const renderDemo = (): React.JSX.Element => {
    switch (activeDemo) {
      case 'intro':
        return renderIntroScreen();
      case 'matrix':
        return renderMatrixDemo();
      case 'particles':
        return renderParticlesDemo();
      case '3d':
        return render3DDemo();
      case 'charts':
        return renderChartsDemo();
      case 'combined':
        return renderCombinedDemo();
      default:
        return renderIntroScreen();
    }
  };

  const renderIntroScreen = (): React.JSX.Element => (
    <Box flexDirection='column' alignItems='center' paddingY={2}>
      <ASCIIAnimation variant='logo' />

      <Box>
        <AnimatedBorder
          variant='glow'
          animation='flow'
          width={60}
          height={12}
          title='MIND AGENTS'
          titlePosition='center'
        >
          <Box flexDirection='column' padding={1}>
            <NeonGlow variant='double' animation='pulse'>
              Welcome to the Visual Effects Showcase!
            </NeonGlow>

            <Box>
              <GlitchText variant='matrix' multiLayer>
                Experience the most stunning CLI ever created
              </GlitchText>
            </Box>

            <Box flexDirection='column' gap={1}>
              <Text>Press 1-6 to explore demos</Text>
              <Text>Press 'T' to change theme (Current: {themes[theme]})</Text>
              <Text>
                Press 'S' to toggle sound (
                {soundManager.isEnabled() ? 'ON' : 'OFF'})
              </Text>
              <Text>Press ESC to exit</Text>
            </Box>
          </Box>
        </AnimatedBorder>
      </Box>

      <Box>
        <LoadingSpinner variant='quantum' text='System Ready' />
      </Box>
    </Box>
  );

  const renderMatrixDemo = (): React.JSX.Element => (
    <Box flexDirection='column'>
      <Box height={20}>
        <MatrixRain
          variant='classic'
          responsive
          density={0.04}
          colorVariation
        />
      </Box>

      <Box position='absolute'>
        <AnimatedBorder
          variant='matrix'
          animation='sparkle'
          width={40}
          height={8}
        >
          <Box flexDirection='column' padding={1} alignItems='center'>
            <Perspective3D variant='rotate'>THE MATRIX HAS YOU</Perspective3D>

            <Box>
              <PulsingEffect variant='glow'>
                Follow the white rabbit...
              </PulsingEffect>
            </Box>
          </Box>
        </AnimatedBorder>
      </Box>
    </Box>
  );

  const renderParticlesDemo = (): React.JSX.Element => (
    <Box flexDirection='column'>
      <Box height={20}>
        <ParticleSystem
          particleTypes={['star', 'spark']}
          particleCount={30}
          responsive
          colorful
          emitterY='center'
          spread={2}
        />
      </Box>

      <Box position='absolute'>
        <NeonGlow variant='gradient' animation='rainbow'>
          Particle Storm Active
        </NeonGlow>
      </Box>

      <Box position='absolute'>
        <ASCIIAnimation variant='fire' />
      </Box>

      <Box position='absolute'>
        <ASCIIAnimation variant='water' />
      </Box>
    </Box>
  );

  const render3DDemo = (): React.JSX.Element => (
    <Box flexDirection='column' gap={2} alignItems='center' paddingY={2}>
      <Text bold>3D Perspective Effects</Text>

      <Box gap={3}>
        <Box flexDirection='column' alignItems='center'>
          <Text dimColor>Rotating</Text>
          <Perspective3D variant='rotate'>SYMINDX</Perspective3D>
        </Box>

        <Box flexDirection='column' alignItems='center'>
          <Text dimColor>Flipping</Text>
          <Perspective3D variant='flip'>AGENTS</Perspective3D>
        </Box>

        <Box flexDirection='column' alignItems='center'>
          <Text dimColor>Cube</Text>
          <Perspective3D variant='cube'>3D</Perspective3D>
        </Box>
      </Box>

      <Box>
        <Perspective3D variant='tunnel'>Enter the Portal</Perspective3D>
      </Box>
    </Box>
  );

  const renderChartsDemo = (): React.JSX.Element => (
    <Box flexDirection='column' gap={2} padding={1}>
      <AnimatedBorder variant='tech' animation='pulse' width={80} height={20}>
        <Box flexDirection='column' gap={1} padding={1}>
          <Text bold>Live Data Visualization</Text>

          <AnimatedChart
            type='bar'
            data={chartData.slice(0, 5)}
            height={6}
            width={60}
            animate
            showValues
          />

          <Box>
            <Text>Performance Metrics:</Text>
            <AnimatedChart type='sparkline' data={chartData} width={60} />
          </Box>

          <Box>
            <LoadingSpinner
              variant='neural'
              text='Processing'
              showProgress
              progress={loadingProgress}
            />
          </Box>
        </Box>
      </AnimatedBorder>
    </Box>
  );

  const renderCombinedDemo = (): React.JSX.Element => (
    <Box flexDirection='column'>
      {/* Background effects */}
      <Box height={24}>
        <ScanlineEffect
          variant='digital'
          responsive
          direction='both'
          scanlineCount={2}
        />
      </Box>

      {/* Layered content */}
      <Box position='absolute'>
        <MatrixRain variant='binary' width={20} height={20} density={0.02} />
      </Box>

      <Box position='absolute'>
        <AnimatedBorder
          variant='glow'
          animation='snake'
          width={40}
          height={12}
          cornerStyle='tech'
        >
          <Box flexDirection='column' alignItems='center' padding={1}>
            <ASCIIAnimation variant='portal' />

            <Box>
              <GlitchText variant='matrix' multiLayer intensity={0.8}>
                SYSTEM SYNCHRONIZED
              </GlitchText>
            </Box>

            <Box gap={2}>
              <StatusAnimation type='success' variant='matrix' />
              <StatusAnimation type='warning' variant='explosive' />
            </Box>
          </Box>
        </AnimatedBorder>
      </Box>

      <Box position='absolute'>
        <ParticleSystem
          particleTypes={['bubble']}
          width={60}
          height={6}
          emitterX='random'
          particleCount={10}
          gravity={-0.02}
        />
      </Box>
    </Box>
  );

  return (
    <ViewTransition transitionKey={activeDemo} variant='glitch' duration={500}>
      <Box flexDirection='column' width='100%' height='100%'>
        {renderDemo()}
      </Box>
    </ViewTransition>
  );
};
