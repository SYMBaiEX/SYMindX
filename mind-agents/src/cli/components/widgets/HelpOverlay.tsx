import React from 'react'
import { Box, Text } from 'ink'
import { Card3D } from '../ui/Card3D.js'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { KeyBinding } from '../../hooks/useKeyboardNavigation.js'

interface HelpOverlayProps {
  keyBindings: KeyBinding[]
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ keyBindings }) => {
  // Group key bindings by category
  const navigationBindings = keyBindings.filter(kb => 
    ['f1', 'f2', 'f3', 'f4', 'f5', 'tab', 'd', 'a', 'c', 'l', 's'].includes(kb.key)
  )
  
  const commandBindings = keyBindings.filter(kb => 
    [':', '/', 'h', '?', 'q', 'm'].includes(kb.key) || kb.ctrl
  )
  
  const formatKey = (binding: KeyBinding): string => {
    let key = binding.key.toUpperCase()
    if (binding.ctrl) key = `Ctrl+${key}`
    if (binding.shift) key = `Shift+${key}`
    if (binding.alt) key = `Alt+${key}`
    if (key.startsWith('F')) key = key.toUpperCase()
    return key
  }
  
  return (
    <Card3D
      title="KEYBOARD SHORTCUTS"
      width={60}
      height={20}
      color={cyberpunkTheme.colors.accent}
      glowColor={cyberpunkTheme.colors.glowAlt}
      animated={true}
    >
      <Box flexDirection="column" gap={1}>
        {/* Navigation section */}
        <Box flexDirection="column">
          <Text color={cyberpunkTheme.colors.primary} bold underline>
            Navigation
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {navigationBindings.map((binding, index) => (
              <Box key={index} gap={2}>
                <Box width={15}>
                  <Text color={cyberpunkTheme.colors.accent}>
                    {formatKey(binding)}
                  </Text>
                </Box>
                <Text color={cyberpunkTheme.colors.text}>
                  {binding.description}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* Separator */}
        <Text color={cyberpunkTheme.colors.borderDim}>
          {'─'.repeat(50)}
        </Text>
        
        {/* Commands section */}
        <Box flexDirection="column">
          <Text color={cyberpunkTheme.colors.primary} bold underline>
            Commands
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {commandBindings.map((binding, index) => (
              <Box key={index} gap={2}>
                <Box width={15}>
                  <Text color={cyberpunkTheme.colors.accent}>
                    {formatKey(binding)}
                  </Text>
                </Box>
                <Text color={cyberpunkTheme.colors.text}>
                  {binding.description}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* Footer */}
        <Box marginTop={1}>
          <Text color={cyberpunkTheme.colors.textDim}>
            Press any key to close this help menu
          </Text>
        </Box>
      </Box>
    </Card3D>
  )
}