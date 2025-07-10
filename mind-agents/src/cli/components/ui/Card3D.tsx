import { Box, Text } from 'ink'
import React from 'react'

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { getResponsiveText, getOptimalCardDimensions } from '../../utils/responsive-grid.js'

interface Card3DProps {
  title: string
  children: React.ReactNode
  width?: number
  height?: number
  depth?: number
  color?: string
  glowColor?: string
  animated?: boolean
  responsive?: boolean
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
  responsive = false,
}) => {
  const { dimensions, breakpoints } = useTerminalDimensions()
  
  // Apply responsive sizing if enabled
  const cardDimensions = responsive ? getOptimalCardDimensions(dimensions, breakpoints) : { width, height }
  const actualWidth = responsive ? cardDimensions.width : width
  const actualHeight = responsive ? cardDimensions.height : height
  const actualDepth = responsive && breakpoints.isXSmall ? 0 : depth
  // Create 3D effect with offset shadows
  const depthChar = actualDepth > 0 ? '│' : ''
  const depthCorner = actualDepth > 0 ? '╱' : ''
  
  // Calculate padding for content
  const contentWidth = Math.max(10, actualWidth - 4) // Account for borders and padding
  
  // Truncate title if needed
  const truncatedTitle = responsive ? 
    getResponsiveText(title, actualWidth - 6) : title
  
  // Top face of the 3D box
  const topLine = ' '.repeat(actualDepth) + '╔' + '═'.repeat(Math.max(0, actualWidth - 2)) + '╗'
  
  // Depth lines for 3D effect
  const depthLines = actualDepth > 0 ? Array.from({ length: actualDepth - 1 }, (_, i) => {
    const spaces = actualDepth - i - 1
    return ' '.repeat(spaces) + depthCorner + ' '.repeat(Math.max(0, actualWidth - 2)) + depthCorner
  }) : []
  
  // Title bar
  const titleBar = `║ ${truncatedTitle.padEnd(Math.max(0, actualWidth - 4))} ║${depthChar}`
  const titleSeparator = `╠${'═'.repeat(Math.max(0, actualWidth - 2))}╣${depthChar}`
  
  // Bottom of the box
  const bottomLine = `╚${'═'.repeat(Math.max(0, actualWidth - 2))}╝${depthChar}`
  const bottomDepth = actualDepth > 0 ? ' '.repeat(1) + '╲' + '_'.repeat(Math.max(0, actualWidth - 2)) + '╱' : ''
  
  return (
    <Box flexDirection="column">
      {/* Top 3D effect */}
      {(!responsive || !breakpoints.isXSmall) && (
        <>
          <Text color={cyberpunkTheme.colors.borderDim}>{topLine}</Text>
          {depthLines.map((line, i) => (
            <Text key={i} color={cyberpunkTheme.colors.borderDim}>{line}</Text>
          ))}
        </>
      )}
      
      {/* Title */}
      <Box>
        <Text color={color} bold>{titleBar}</Text>
      </Box>
      
      {/* Title separator */}
      <Text color={cyberpunkTheme.colors.border}>{titleSeparator}</Text>
      
      {/* Content area */}
      <Box flexDirection="column" minHeight={Math.max(1, actualHeight - 4)}>
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
      {(!responsive || !breakpoints.isXSmall) && actualDepth > 0 && (
        <Text color={cyberpunkTheme.colors.borderDim}>{bottomDepth}</Text>
      )}
      
      {/* Glow effect (simulated with colored text) */}
      {animated && (!responsive || !breakpoints.isXSmall) && (
        <Box marginTop={-1}>
          <Text color={glowColor} dimColor>
            {' '.repeat(Math.max(0, actualDepth)) + '─'.repeat(Math.max(0, actualWidth - 2))}
          </Text>
        </Box>
      )}
    </Box>
  )
}