import React from 'react'
import { Box, Text } from 'ink'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'

interface Card3DProps {
  title: string
  children: React.ReactNode
  width?: number
  height?: number
  depth?: number
  color?: string
  glowColor?: string
  animated?: boolean
}

export const Card3D: React.FC<Card3DProps> = ({
  title,
  children,
  width = 30,
  height = 10,
  depth = 2,
  color = cyberpunkTheme.colors.primary,
  glowColor = cyberpunkTheme.colors.glow,
  animated = false,
}) => {
  // Create 3D effect with offset shadows
  const depthChar = '│'
  const depthCorner = '╱'
  
  // Calculate padding for content
  const contentWidth = width - 4 // Account for borders and padding
  
  // Top face of the 3D box
  const topLine = ' '.repeat(depth) + '╔' + '═'.repeat(width - 2) + '╗'
  
  // Depth lines for 3D effect
  const depthLines = Array.from({ length: depth - 1 }, (_, i) => {
    const spaces = depth - i - 1
    return ' '.repeat(spaces) + depthCorner + ' '.repeat(width - 2) + depthCorner
  })
  
  // Title bar
  const titleBar = `║ ${title.padEnd(width - 4)} ║${depthChar}`
  const titleSeparator = `╠${'═'.repeat(width - 2)}╣${depthChar}`
  
  // Bottom of the box
  const bottomLine = `╚${'═'.repeat(width - 2)}╝${depthChar}`
  const bottomDepth = ' '.repeat(1) + '╲' + '_'.repeat(width - 2) + '╱'
  
  return (
    <Box flexDirection="column">
      {/* Top 3D effect */}
      <Text color={cyberpunkTheme.colors.borderDim}>{topLine}</Text>
      {depthLines.map((line, i) => (
        <Text key={i} color={cyberpunkTheme.colors.borderDim}>{line}</Text>
      ))}
      
      {/* Title */}
      <Box>
        <Text color={color} bold>{titleBar}</Text>
      </Box>
      
      {/* Title separator */}
      <Text color={cyberpunkTheme.colors.border}>{titleSeparator}</Text>
      
      {/* Content area */}
      <Box flexDirection="column" minHeight={height - 4}>
        {React.Children.map(children, (child, index) => (
          <Box key={index}>
            <Text color={cyberpunkTheme.colors.text}>║ </Text>
            <Box width={contentWidth}>
              {child}
            </Box>
            <Text color={cyberpunkTheme.colors.text}> ║{depthChar}</Text>
          </Box>
        ))}
      </Box>
      
      {/* Bottom */}
      <Text color={cyberpunkTheme.colors.border}>{bottomLine}</Text>
      <Text color={cyberpunkTheme.colors.borderDim}>{bottomDepth}</Text>
      
      {/* Glow effect (simulated with colored text) */}
      {animated && (
        <Box marginTop={-1}>
          <Text color={glowColor} dimColor>
            {' '.repeat(2) + '─'.repeat(width - 2)}
          </Text>
        </Box>
      )}
    </Box>
  )
}