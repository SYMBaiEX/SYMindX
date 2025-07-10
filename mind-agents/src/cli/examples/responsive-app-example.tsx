import { Box, Text, useApp, useInput } from 'ink';
import React, { useState } from 'react';

import { ResponsiveBox } from '../components/ui/ResponsiveBox.js';
import { ResponsiveAgents } from '../components/views/ResponsiveAgents.js';
import { ResponsiveChat } from '../components/views/ResponsiveChat.js';
import { ResponsiveDashboard } from '../components/views/ResponsiveDashboard.js';
import { useTerminalDimensions } from '../hooks/useTerminalDimensions.js';
import { cyberpunkTheme } from '../themes/cyberpunk.js';

type View = 'dashboard' | 'agents' | 'chat' | 'logs' | 'settings';

export const ResponsiveApp: React.FC = () => {
  const { exit } = useApp();
  const { dimensions, breakpoints: _breakpoints, isMinimumSize, currentBreakpoint } = useTerminalDimensions();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Handle keyboard navigation
  useInput((input, _key) => {
    if (input === 'q' || input === 'Q') {
      exit();
    } else if (input === '\x1B[11~' || input === '\x1BOP') { // F1
      setCurrentView('dashboard');
    } else if (input === '\x1B[12~' || input === '\x1BOQ') { // F2
      setCurrentView('agents');
    } else if (input === '\x1B[13~' || input === '\x1BOR') { // F3
      setCurrentView('chat');
    } else if (input === '\x1B[14~' || input === '\x1BOS') { // F4
      setCurrentView('logs');
    } else if (input === '1') {
      setCurrentView('dashboard');
    } else if (input === '2') {
      setCurrentView('agents');
    } else if (input === '3') {
      setCurrentView('chat');
    }
  });
  
  // Check minimum terminal size
  if (!isMinimumSize) {
    return (
      <ResponsiveBox
        direction="column"
        align="center"
        justify="center"
        height={dimensions.height}
      >
        <Text color={cyberpunkTheme.colors.danger} bold>
          TERMINAL TOO SMALL
        </Text>
        <Text color={cyberpunkTheme.colors.textDim}>
          Minimum size: 80x24
        </Text>
        <Text color={cyberpunkTheme.colors.textDim}>
          Current: {dimensions.width}x{dimensions.height}
        </Text>
      </ResponsiveBox>
    );
  }
  
  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <ResponsiveDashboard />;
      case 'agents':
        return <ResponsiveAgents />;
      case 'chat':
        return <ResponsiveChat />;
      case 'logs':
        return (
          <ResponsiveBox
            direction="column"
            align="center"
            justify="center"
            height={dimensions.height}
          >
            <Text color={cyberpunkTheme.colors.textDim}>
              Logs view not implemented yet
            </Text>
          </ResponsiveBox>
        );
      case 'settings':
        return (
          <ResponsiveBox
            direction="column"
            align="center"
            justify="center"
            height={dimensions.height}
          >
            <Text color={cyberpunkTheme.colors.textDim}>
              Settings view not implemented yet
            </Text>
          </ResponsiveBox>
        );
      default:
        return <ResponsiveDashboard />;
    }
  };
  
  return (
    <Box flexDirection="column" height={dimensions.height}>
      {renderView()}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <Box position="absolute">
          <Text color={cyberpunkTheme.colors.textDim} dimColor>
            {dimensions.width}x{dimensions.height} [{currentBreakpoint}]
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Example usage in your main CLI entry point:
/*
import React from 'react';
import { render } from 'ink';
import { ResponsiveApp } from './examples/responsive-app-example.js';

const app = render(<ResponsiveApp />);

// Handle graceful shutdown
process.on('SIGINT', () => {
  app.unmount();
  process.exit(0);
});
*/