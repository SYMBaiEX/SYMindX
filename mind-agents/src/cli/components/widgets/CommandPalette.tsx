import { Box, Text } from 'ink'
import React from 'react'

import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { GlitchText } from '../effects/GlitchText.js'

interface CommandPaletteProps {
  value: string
  onSubmit: (command: string) => void
  onCancel: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  value,
  onSubmit: _onSubmit,
  onCancel: _onCancel,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={cyberpunkTheme.colors.primary}
      paddingX={2}
      paddingY={1}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <GlitchText intensity={0.1} frequency={3000} color={cyberpunkTheme.colors.accent}>
          COMMAND MODE
        </GlitchText>
      </Box>
      
      {/* Command input */}
      <Box>
        <Text color={cyberpunkTheme.colors.primary} bold>
          {value.startsWith('/') ? '/' : ':'}
        </Text>
        <Text color={cyberpunkTheme.colors.text}>
          {value.startsWith('/') ? value.slice(1) : value}
        </Text>
        <Text color={cyberpunkTheme.colors.primary} bold>
          █
        </Text>
      </Box>
      
      {/* Hints */}
      <Box marginTop={1}>
        <Text color={cyberpunkTheme.colors.textDim}>
          [Enter] Execute | [Esc] Cancel | Commands: dashboard, agents, chat, logs, settings, help, quit
        </Text>
      </Box>
    </Box>
  )
}