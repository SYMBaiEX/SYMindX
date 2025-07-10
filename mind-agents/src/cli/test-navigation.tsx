#!/usr/bin/env node
import { render, Box, Text } from 'ink'
import { useInput } from 'ink'
import React from 'react'

import { NavigationBar } from './components/ui/NavigationBar.js'
import { useNavigation } from './hooks/useNavigation.js'
import { useTerminalDimensions } from './hooks/useTerminalDimensions.js'


const TestNavigation = () => {
  const navigation = useNavigation({
    initialItem: { id: 'home', label: 'Home' },
    soundEnabled: false
  })
  
  const { dimensions, currentBreakpoint } = useTerminalDimensions()
  
  useInput((input, key) => {
    if (key.escape && navigation.canGoBack) {
      navigation.goBack()
    } else if (input === '1') {
      navigation.navigateTo({ id: 'agents', label: 'Agents', parentId: 'home' })
    } else if (input === '2') {
      navigation.navigateTo({ id: 'agent-detail', label: 'Agent Detail', parentId: 'agents' })
    } else if (input === '3') {
      navigation.navigate('settings', { title: 'Settings' })
    } else if (input === 'r') {
      navigation.reset()
    } else if (key.ctrl && input === 'c') {
      process.exit(0)
    }
  })
  
  return (
    <Box flexDirection="column" height="100%">
      <NavigationBar 
        navigation={navigation}
        dimensions={dimensions}
        currentBreakpoint={currentBreakpoint}
        showHelp={false}
        commandMode={false}
      />
      
      <Box flexGrow={1} padding={1} flexDirection="column">
        <Text bold>Navigation Test</Text>
        <Text>Current: {navigation.currentItem.label} (ID: {navigation.currentItem.id})</Text>
        <Text>Can go back: {navigation.canGoBack ? 'Yes' : 'No'}</Text>
        <Text>History length: {navigation.history.length}</Text>
        
        <Box marginTop={1}>
          <Text dimColor>Commands:</Text>
          <Text dimColor>[1] Navigate to Agents</Text>
          <Text dimColor>[2] Navigate to Agent Detail</Text>
          <Text dimColor>[3] Navigate to Settings</Text>
          <Text dimColor>[R] Reset navigation</Text>
          <Text dimColor>[ESC] Go back</Text>
          <Text dimColor>[Ctrl+C] Exit</Text>
        </Box>
        
        <Box marginTop={1}>
          <Text>Breadcrumbs:</Text>
          {navigation.breadcrumbs.map((crumb, i) => (
            <Text key={i}>  {i + 1}. {crumb.label} ({crumb.id})</Text>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

const { waitUntilExit } = render(<TestNavigation />)
waitUntilExit()