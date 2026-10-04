import { Box, useApp } from 'ink';
import React, { useState, useEffect } from 'react';

import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation.js';
import { useNavigation } from '../../hooks/useNavigation.js';
import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { soundManager, SoundType } from '../../utils/sound-effects.js';
import { NavigationBar } from '../ui/NavigationBar.js';
import { Agents } from '../views/Agents.js';
import { Chat } from '../views/Chat.js';
import { Dashboard } from '../views/Dashboard.js';
import { Logs } from '../views/Logs.js';
import { Settings } from '../views/Settings.js';
import { CommandPalette } from '../widgets/CommandPalette.js';
import { HelpOverlay } from '../widgets/HelpOverlay.js';

const VIEWS = ['dashboard', 'agents', 'chat', 'logs', 'settings'];

interface AppProps {
  initialView?: string;
}

export const App: React.FC<AppProps> = ({ initialView = 'dashboard' }) => {
  const { exit } = useApp();
  const [currentView, setCurrentView] = useState(initialView);
  const navigation = useNavigation({
    initialItem: {
      id: initialView,
      label: initialView.charAt(0).toUpperCase() + initialView.slice(1),
    },
    onNavigate: (item) => {
      if (item.id && VIEWS.includes(item.id)) {
        setCurrentView(item.id);
      }
    },
    soundEnabled: true,
  });
  const { dimensions, currentBreakpoint } = useTerminalDimensions();

  const { showHelp, commandMode, commandBuffer, keyBindings, executeCommand } =
    useKeyboardNavigation({
      views: VIEWS,
      onViewChange: (view) => {
        setCurrentView(view);
        navigation.navigateTo({
          id: view,
          label: view.charAt(0).toUpperCase() + view.slice(1),
        });
      },
      onExit: exit,
      soundEnabled: true,
    });

  // Play startup sound
  useEffect(() => {
    soundManager.play(SoundType.STARTUP);
  }, []);

  // Render current view
  const renderView = (): React.ReactNode => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'agents':
        return <Agents />;
      case 'chat':
        return <Chat />;
      case 'logs':
        return <Logs />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Box flexDirection='column' height='100%'>
      {/* Navigation Bar */}
      <NavigationBar
        navigation={navigation}
        dimensions={dimensions}
        currentBreakpoint={currentBreakpoint}
        showHelp={showHelp}
        commandMode={commandMode}
      />

      {/* Main view */}
      <Box flexGrow={1}>{renderView()}</Box>

      {/* Command palette overlay */}
      {commandMode && (
        <Box>
          <CommandPalette
            value={commandBuffer}
            onSubmit={executeCommand}
            onCancel={() => executeCommand('')}
          />
        </Box>
      )}

      {/* Help overlay */}
      {showHelp && (
        <Box>
          <HelpOverlay keyBindings={keyBindings} />
        </Box>
      )}
    </Box>
  );
};
