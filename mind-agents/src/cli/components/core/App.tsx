import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import { Dashboard } from '../views/Dashboard.js'
import { Agents } from '../views/Agents.js'
import { Chat } from '../views/Chat.js'
import { Logs } from '../views/Logs.js'
import { Settings } from '../views/Settings.js'
import { CommandPalette } from '../widgets/CommandPalette.js'
import { HelpOverlay } from '../widgets/HelpOverlay.js'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation.js'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { soundManager, SoundType } from '../../utils/sound-effects.js'

const VIEWS = ['dashboard', 'agents', 'chat', 'logs', 'settings']

interface AppProps {
  initialView?: string
}

export const App: React.FC<AppProps> = ({ initialView = 'dashboard' }) => {
  const { exit } = useApp()
  const [currentView, setCurrentView] = useState(initialView)
  
  const {
    showHelp,
    commandMode,
    commandBuffer,
    keyBindings,
    navigateToView,
    executeCommand,
  } = useKeyboardNavigation({
    views: VIEWS,
    onViewChange: setCurrentView,
    onExit: exit,
    soundEnabled: true,
  })
  
  // Play startup sound
  useEffect(() => {
    soundManager.play(SoundType.STARTUP)
  }, [])
  
  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'agents':
        return <Agents />
      case 'chat':
        return <Chat />
      case 'logs':
        return <Logs />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }
  
  return (
    <Box flexDirection="column" height="100%">
      {/* Main view */}
      <Box flexGrow={1}>
        {renderView()}
      </Box>
      
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
  )
}