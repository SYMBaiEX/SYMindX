#!/usr/bin/env node
import { render, Box, Text, useInput } from 'ink';
import React, { useState, useEffect } from 'react';

import {
  MatrixRain,
  GlitchText,
  ParticleSystem,
  NeonGlow,
  AnimatedBorder,
  PulsingEffect,
  LoadingSpinner,
  AnimatedChart,
  ViewTransition,
  StatusAnimation,
  themeEngine,
} from '../components/effects/index.js';
import { soundManager, SoundType } from '../utils/sound-effects.js';

// Enhanced Dashboard with all visual effects
const EnhancedDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('overview');
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [showEffects, setShowEffects] = useState(true);
  const [systemStatus, setSystemStatus] = useState('operational');

  // Mock data
  const agents = [
    { name: 'NyX', status: 'active', emotion: 'confident', activity: 87 },
    { name: 'Aria', status: 'idle', emotion: 'creative', activity: 23 },
    { name: 'Rex', status: 'thinking', emotion: 'focused', activity: 56 },
    { name: 'Nova', status: 'inactive', emotion: 'calm', activity: 0 },
  ];

  const systemMetrics = [
    { value: 78, label: 'CPU' },
    { value: 45, label: 'MEM' },
    { value: 92, label: 'NET' },
    { value: 61, label: 'DSK' },
  ];

  // Keyboard navigation
  useInput((input, key) => {
    if (key.tab) {
      setActiveView(activeView === 'overview' ? 'agents' : 'overview');
      soundManager.play(SoundType.NAVIGATE);
    }

    if (key.upArrow) {
      setSelectedAgent((prev) => (prev - 1 + agents.length) % agents.length);
      soundManager.play(SoundType.NAVIGATION);
    }

    if (key.downArrow) {
      setSelectedAgent((prev) => (prev + 1) % agents.length);
      soundManager.play(SoundType.NAVIGATION);
    }

    if (input === 'e') {
      setShowEffects(!showEffects);
      soundManager.play(SoundType.SELECT);
    }

    if (input === 't') {
      const themes = themeEngine.getThemeNames();
      const currentIndex = themes.indexOf(themeEngine.getTheme().name);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      if (nextTheme) {
        themeEngine.setTheme(nextTheme);
      }
      soundManager.play(SoundType.SELECT);
    }

    if (key.escape) {
      process.exit(0);
    }
  });

  // System status updates
  useEffect(() => {
    const interval = setInterval(() => {
      const statuses = ['operational', 'optimal', 'processing', 'syncing'];
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];
      if (randomStatus) {
        setSystemStatus(randomStatus);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const renderHeader = () => (
    <Box marginBottom={1}>
      <AnimatedBorder
        variant='tech'
        animation='flow'
        width={80}
        height={5}
        title='SYMINDX MIND AGENTS'
        titlePosition='center'
      >
        <Box justifyContent='space-between' padding={1}>
          <Box>
            <PulsingEffect variant='breathe'>
              <Text>System Status: </Text>
            </PulsingEffect>
            <StatusAnimation
              type={systemStatus === 'operational' ? 'success' : 'info'}
              message={systemStatus.toUpperCase()}
              variant='minimal'
            />
          </Box>

          <Box gap={2}>
            <Text dimColor>Theme: {themeEngine.getTheme().name}</Text>
            <Text dimColor>Effects: {showEffects ? 'ON' : 'OFF'}</Text>
          </Box>
        </Box>
      </AnimatedBorder>
    </Box>
  );

  const renderOverview = () => (
    <Box flexDirection='column' gap={1}>
      <Box gap={2}>
        {/* System Metrics */}
        <AnimatedBorder
          variant='rounded'
          animation='pulse'
          width={40}
          height={10}
        >
          <Box flexDirection='column' padding={1}>
            <NeonGlow variant='outline' animation='pulse'>
              System Metrics
            </NeonGlow>

            <Box marginTop={1}>
              <AnimatedChart
                type='bar'
                data={systemMetrics}
                height={6}
                width={35}
                showValues
                style='blocks'
              />
            </Box>
          </Box>
        </AnimatedBorder>

        {/* Active Agents */}
        <AnimatedBorder
          variant='rounded'
          animation='sparkle'
          width={36}
          height={10}
        >
          <Box flexDirection='column' padding={1}>
            <GlitchText variant='digital'>Active Agents</GlitchText>

            <Box flexDirection='column' marginTop={1}>
              {agents
                .filter((a) => a.status !== 'inactive')
                .map((agent, _i) => (
                  <Box key={agent.name} gap={1}>
                    <LoadingSpinner
                      variant='orbit'
                      size='small'
                      text={agent.name}
                    />
                    <Text dimColor>{agent.status}</Text>
                  </Box>
                ))}
            </Box>
          </Box>
        </AnimatedBorder>
      </Box>

      {/* Activity Monitor */}
      <Box marginTop={1}>
        <AnimatedBorder
          variant='tech'
          animation='loading'
          width={78}
          height={8}
        >
          <Box flexDirection='column' padding={1}>
            <Text bold>Neural Activity Monitor</Text>

            <Box marginTop={1}>
              <AnimatedChart
                type='wave'
                data={agents.map((a) => ({ value: a.activity }))}
                height={4}
                width={70}
              />
            </Box>
          </Box>
        </AnimatedBorder>
      </Box>
    </Box>
  );

  const renderAgents = () => (
    <Box gap={2}>
      {/* Agent List */}
      <Box flexDirection='column'>
        <Box marginBottom={1}>
          <Text bold>Agents</Text>
        </Box>
        {agents.map((agent, i) => (
          <Box key={agent.name}>
            {i === selectedAgent ? (
              <NeonGlow variant='solid' animation='pulse'>
                {'▶ ' + agent.name}
              </NeonGlow>
            ) : (
              <Text dimColor> {agent.name}</Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Selected Agent Details */}
      <AnimatedBorder variant='double' animation='pulse' width={50} height={15}>
        <Box flexDirection='column' padding={1}>
          <Box marginBottom={1}>
            <GlitchText variant='matrix' multiLayer>
              {agents[selectedAgent]?.name ?? 'Unknown Agent'}
            </GlitchText>
          </Box>

          <Box flexDirection='column' gap={1}>
            <Box>
              <Text>Status: </Text>
              <PulsingEffect variant='glow'>
                <Text color='green'>
                  {agents[selectedAgent]?.status ?? 'Unknown'}
                </Text>
              </PulsingEffect>
            </Box>

            <Box>
              <Text>Emotion: </Text>
              <Text color='cyan'>
                {agents[selectedAgent]?.emotion ?? 'Unknown'}
              </Text>
            </Box>

            <Box>
              <Text>Activity: </Text>
              <AnimatedChart
                type='sparkline'
                data={Array.from({ length: 10 }, () => ({
                  value:
                    (agents[selectedAgent]?.activity ?? 0) +
                    Math.random() * 20 -
                    10,
                }))}
                width={20}
              />
            </Box>

            <Box marginTop={1}>
              <LoadingSpinner
                variant='neural'
                text='Neural Processing'
                showProgress
                progress={agents[selectedAgent]?.activity ?? 0}
              />
            </Box>
          </Box>
        </Box>
      </AnimatedBorder>
    </Box>
  );

  return (
    <Box flexDirection='column'>
      {/* Background Effects */}
      {showEffects && (
        <Box position='absolute' width='100%' height='100%'>
          <MatrixRain
            variant='binary'
            responsive
            density={0.01}
            speed={150}
            fadeLength={0.5}
          />
        </Box>
      )}

      {/* Main Content */}
      <Box flexDirection='column' paddingX={1}>
        {renderHeader()}

        <ViewTransition
          transitionKey={activeView}
          variant='slide'
          direction='right'
        >
          {activeView === 'overview' ? renderOverview() : renderAgents()}
        </ViewTransition>

        {/* Footer */}
        <Box marginTop={1}>
          <Text dimColor>
            Tab: Switch View | ↑↓: Navigate | T: Theme | E: Effects | ESC: Exit
          </Text>
        </Box>
      </Box>

      {/* Particle Effects */}
      {showEffects && (
        <Box position='absolute' width='100%' height='100%'>
          <ParticleSystem
            particleTypes={['star']}
            particleCount={5}
            responsive
            emitterY='top'
            gravity={0.02}
            fadeOut
          />
        </Box>
      )}
    </Box>
  );
};

// Initialize and render
soundManager.playBootSequence().then(() => {
  const { unmount } = render(<EnhancedDashboard />);

  process.on('SIGINT', () => {
    soundManager.play(SoundType.SHUTDOWN);
    unmount();
    process.exit(0);
  });
});

export default EnhancedDashboard;
