import { Box, Text, useApp } from 'ink';
import React, { useState, useEffect } from 'react';

import { useAgentData } from '../../hooks/useAgentData.js';
import { useSystemStats } from '../../hooks/useSystemStats.js';
import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { cyberpunkTheme } from '../../themes/cyberpunk.js';
import { musicManager } from '../../utils/background-music.js';
import {
  getResponsiveValueFromBreakpoints,
  shouldShowElement,
} from '../../utils/responsive-grid.js';
import { soundManager } from '../../utils/sound-effects.js';
import { GlitchText } from '../effects/GlitchText.js';
import { MatrixRain } from '../effects/MatrixRain.js';
import { Chart } from '../ui/Chart.js';
import { Header } from '../ui/Header.js';
import { ResponsiveBox } from '../ui/ResponsiveBox.js';
import { ResponsiveCard3D } from '../ui/ResponsiveCard3D.js';
import { ResponsiveGrid } from '../ui/ResponsiveGrid.js';

export const ResponsiveDashboard: React.FC = () => {
  const { exit: _exit } = useApp();
  const systemStats = useSystemStats();
  const agentData = useAgentData();
  const {
    dimensions,
    breakpoints,
    currentBreakpoint: _currentBreakpoint,
  } = useTerminalDimensions();

  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(20).fill(0));
  const [memHistory, setMemHistory] = useState<number[]>(Array(20).fill(0));
  const [selectedMetric, _setSelectedMetric] = useState<'cpu' | 'memory'>(
    'cpu'
  );
  const [showMatrix, setShowMatrix] = useState(false);

  // Convert SystemStats to simpler format for display
  const displayStats = systemStats
    ? {
        cpu: systemStats.performance.cpu,
        memory: parseFloat(systemStats.performance.memory) || 0,
        memoryUsed: parseFloat(systemStats.memoryUsage) * 1024 * 1024 || 0,
        memoryTotal: 2048 * 1024 * 1024, // 2GB default
        uptime: systemStats.uptime,
        network: systemStats.isConnected ? 'CONNECTED' : 'DISCONNECTED',
      }
    : null;

  // Play startup sound and music
  useEffect(() => {
    soundManager.playBootSequence();
    if (musicManager.isEnabled()) {
      musicManager.playMood('cyberpunk');
    }

    return () => {
      musicManager.stop();
    };
  }, []);

  // Update history data
  useEffect(() => {
    if (displayStats) {
      setCpuHistory((prev) => [...prev.slice(1), displayStats.cpu]);
      setMemHistory((prev) => [...prev.slice(1), displayStats.memory]);
    }
  }, [displayStats]);

  // Toggle matrix effect (only on larger screens)
  useEffect(() => {
    if (!breakpoints.isXSmall && !breakpoints.isSmall) {
      const timer = setTimeout(() => {
        setShowMatrix(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [breakpoints]);

  const formatBytes = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  // Responsive chart dimensions
  const chartWidth = getResponsiveValueFromBreakpoints(
    breakpoints,
    {
      xs: dimensions.width - 8,
      sm: 30,
      md: 36,
      lg: 40,
      xl: 50,
    },
    36
  );

  const chartHeight = getResponsiveValueFromBreakpoints(
    breakpoints,
    {
      xs: 6,
      sm: 8,
      md: 10,
      lg: 12,
      xl: 14,
    },
    10
  );

  return (
    <ResponsiveBox
      direction='column'
      height={dimensions.height}
      padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
    >
      {/* Header */}
      <Header
        title='SYMINDX'
        subtitle={
          shouldShowElement(
            { xs: false, sm: true, md: true, lg: true, xl: true },
            breakpoints.isXSmall
              ? 'xs'
              : breakpoints.isSmall
                ? 'sm'
                : breakpoints.isMedium
                  ? 'md'
                  : breakpoints.isLarge
                    ? 'lg'
                    : 'xl'
          )
            ? 'NEURAL RUNTIME SYSTEM v2.0'
            : 'v2.0'
        }
        showStatus={true}
        animated={!breakpoints.isXSmall}
      />

      {/* Main Content */}
      <ResponsiveBox
        flexGrow={1}
        direction={{
          xs: 'column',
          sm: 'column',
          md: 'row',
          lg: 'row',
          xl: 'row',
        }}
        gap={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
        padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
      >
        <ResponsiveGrid
          columns={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
          gap={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
          responsive={true}
        >
          {/* System Status Card */}
          <ResponsiveCard3D
            title='SYSTEM STATUS'
            width={{
              xs: 'full',
              sm: 'full',
              md: 'auto',
              lg: 'auto',
              xl: 'auto',
            }}
            height={{ xs: 10, sm: 12, md: 14, lg: 16, xl: 18 }}
            span={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
            color={cyberpunkTheme.colors.primary}
            animated={!breakpoints.isXSmall}
          >
            <ResponsiveBox direction='column' gap={1}>
              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Runtime: </Text>
                <GlitchText intensity={0.05} frequency={5000}>
                  {systemStats?.uptime || 'LOADING...'}
                </GlitchText>
              </Box>

              <ResponsiveBox
                show={{ xs: true, sm: true, md: true, lg: true, xl: true }}
              >
                <Text color={cyberpunkTheme.colors.textDim}>CPU: </Text>
                <Text color={cyberpunkTheme.colors.warning}>
                  {displayStats?.cpu?.toFixed(1) || '0.0'}%
                </Text>
              </ResponsiveBox>

              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Memory: </Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {displayStats
                    ? `${formatBytes(displayStats.memoryUsed)}`
                    : '...'}
                </Text>
              </Box>

              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Agents: </Text>
                <Text color={cyberpunkTheme.colors.accent} bold>
                  {agentData?.activeAgents || 0} / {agentData?.totalAgents || 0}
                </Text>
              </Box>

              <ResponsiveBox
                show={{ xs: false, sm: false, md: true, lg: true, xl: true }}
              >
                <Text color={cyberpunkTheme.colors.textDim}>Network: </Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {displayStats?.network || 'CHECKING...'}
                </Text>
              </ResponsiveBox>
            </ResponsiveBox>
          </ResponsiveCard3D>

          {/* Performance Chart - Hide on XS screens */}
          <ResponsiveBox
            show={{ xs: false, sm: true, md: true, lg: true, xl: true }}
          >
            <ResponsiveCard3D
              title='PERFORMANCE'
              width={{
                xs: 'full',
                sm: 'full',
                md: 'auto',
                lg: 'auto',
                xl: 'auto',
              }}
              height={{ xs: 10, sm: 12, md: 16, lg: 18, xl: 20 }}
              span={{ xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
              color={cyberpunkTheme.colors.secondary}
            >
              <Chart
                data={selectedMetric === 'cpu' ? cpuHistory : memHistory}
                width={chartWidth || 36}
                height={chartHeight || 10}
                title={selectedMetric === 'cpu' ? 'CPU %' : 'MEM %'}
                color={
                  selectedMetric === 'cpu'
                    ? cyberpunkTheme.colors.warning
                    : cyberpunkTheme.colors.success
                }
                type='area'
                animated={!breakpoints.isXSmall}
              />
            </ResponsiveCard3D>
          </ResponsiveBox>

          {/* Active Agents */}
          <ResponsiveCard3D
            title='NEURAL AGENTS'
            width={{
              xs: 'full',
              sm: 'full',
              md: 'auto',
              lg: 'auto',
              xl: 'auto',
            }}
            height={{ xs: 12, sm: 16, md: 20, lg: 24, xl: 26 }}
            span={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 1 }}
            color={cyberpunkTheme.colors.accent}
            animated={!breakpoints.isXSmall}
          >
            <ResponsiveBox direction='column' gap={1}>
              {agentData?.agents
                .slice(
                  0,
                  getResponsiveValueFromBreakpoints(
                    breakpoints,
                    {
                      xs: 3,
                      sm: 4,
                      md: 5,
                      lg: 6,
                      xl: 8,
                    },
                    5
                  ) || 5
                )
                .map((agent, index) => (
                  <ResponsiveBox key={agent.id} direction='column'>
                    <Box>
                      <Text
                        color={
                          agent.status === 'active'
                            ? cyberpunkTheme.colors.success
                            : cyberpunkTheme.colors.danger
                        }
                      >
                        {agent.status === 'active' ? '●' : '○'}
                      </Text>
                      <Text color={cyberpunkTheme.colors.text} bold>
                        {' '}
                        {agent.name}
                      </Text>
                      {agent.ethicsEnabled === false && (
                        <Text color={cyberpunkTheme.colors.warning}> ⚠️</Text>
                      )}
                    </Box>

                    <ResponsiveBox
                      marginLeft={2}
                      show={{
                        xs: false,
                        sm: true,
                        md: true,
                        lg: true,
                        xl: true,
                      }}
                    >
                      <Text color={cyberpunkTheme.colors.textDim}>
                        {agent.emotion || 'neutral'} | {agent.portal || 'none'}
                      </Text>
                    </ResponsiveBox>

                    {index < agentData.agents.length - 1 &&
                      shouldShowElement(
                        { xs: false, sm: true, md: true, lg: true, xl: true },
                        breakpoints.isXSmall
                          ? 'xs'
                          : breakpoints.isSmall
                            ? 'sm'
                            : breakpoints.isMedium
                              ? 'md'
                              : breakpoints.isLarge
                                ? 'lg'
                                : 'xl'
                      ) && (
                        <Text color={cyberpunkTheme.colors.borderDim}>
                          {'─'.repeat(Math.min(35, dimensions.width - 10))}
                        </Text>
                      )}
                  </ResponsiveBox>
                ))}

              {(!agentData || agentData.agents.length === 0) && (
                <Text color={cyberpunkTheme.colors.textDim}>
                  No agents detected...
                </Text>
              )}
            </ResponsiveBox>
          </ResponsiveCard3D>

          {/* System Logs Preview - Hide on small screens */}
          <ResponsiveBox
            show={{ xs: false, sm: false, md: false, lg: true, xl: true }}
          >
            <ResponsiveCard3D
              title='SYSTEM LOGS'
              width={{ lg: 'auto', xl: 'auto' }}
              height={{ lg: 10, xl: 12 }}
              span={{ lg: 2, xl: 1 }}
              color={cyberpunkTheme.colors.matrix}
            >
              <ResponsiveBox direction='column'>
                <Text color={cyberpunkTheme.colors.matrix}>
                  [09:15:23] System initialized
                </Text>
                <Text color={cyberpunkTheme.colors.success}>
                  [09:15:24] Neural runtime active
                </Text>
                <Text color={cyberpunkTheme.colors.warning}>
                  [09:15:25] Loading agent: NyX
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>
                  [09:15:26] Portal connected
                </Text>
              </ResponsiveBox>
            </ResponsiveCard3D>
          </ResponsiveBox>
        </ResponsiveGrid>
      </ResponsiveBox>

      {/* Matrix Rain Background (subtle, only on large screens) */}
      {showMatrix &&
        shouldShowElement(
          { xs: false, sm: false, md: true, lg: true, xl: true },
          breakpoints.isXSmall
            ? 'xs'
            : breakpoints.isSmall
              ? 'sm'
              : breakpoints.isMedium
                ? 'md'
                : breakpoints.isLarge
                  ? 'lg'
                  : 'xl'
        ) && (
          <Box position='absolute'>
            <MatrixRain
              width={dimensions.width}
              height={dimensions.height}
              speed={200}
              density={0.01}
            />
          </Box>
        )}

      {/* Footer */}
      <ResponsiveBox
        padding={{ xs: 0, sm: 1, md: 1, lg: 1, xl: 1 }}
        borderStyle='single'
        borderColor={cyberpunkTheme.colors.border}
      >
        <Text color={cyberpunkTheme.colors.textDim}>
          {breakpoints.isXSmall
            ? '[↑↓] Nav | [Q] Quit'
            : '[F1] Dashboard | [F2] Agents | [F3] Chat | [F4] Logs | [↑↓] Navigate | [Q] Quit'}
        </Text>
        {musicManager.isEnabled() &&
          shouldShowElement(
            { xs: false, sm: true, md: true, lg: true, xl: true },
            breakpoints.isXSmall
              ? 'xs'
              : breakpoints.isSmall
                ? 'sm'
                : breakpoints.isMedium
                  ? 'md'
                  : breakpoints.isLarge
                    ? 'lg'
                    : 'xl'
          ) && (
            <Text color={cyberpunkTheme.colors.textDim}>
              {' | '}♪ {musicManager.getCurrentTrack()?.name || 'No music'}
            </Text>
          )}
      </ResponsiveBox>
    </ResponsiveBox>
  );
};
