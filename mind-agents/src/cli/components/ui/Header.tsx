import figlet from 'figlet'
import gradient from 'gradient-string'
import { Box, Text } from 'ink'
import React, { useState, useEffect } from 'react'

import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { GlitchText } from '../effects/GlitchText.js'

interface HeaderProps {
  title?: string
  subtitle?: string
  showStatus?: boolean
  animated?: boolean
}

export const Header: React.FC<HeaderProps> = ({
  title = 'SYMINDX',
  subtitle = 'NEURAL RUNTIME SYSTEM v2.0',
  showStatus = true,
  animated = true,
}) => {
  const [asciiArt, setAsciiArt] = useState('')
  const [animationFrame, setAnimationFrame] = useState(0)
  const [systemStatus, setSystemStatus] = useState('INITIALIZING')
  
  const gradients = {
    cyberpunk: gradient(['#00F5FF', '#FF00FF', '#FFFF00']),
    neon: gradient(['#FF006E', '#8338EC', '#3A86FF']),
    synthwave: gradient(['#FF71CE', '#B967FF', '#01CDFE']),
  }
  
  // Generate ASCII art
  useEffect(() => {
    figlet(title, { font: 'ANSI Shadow' }, (err, data) => {
      if (!err && data) {
        setAsciiArt(data)
      }
    })
  }, [title])
  
  // Animate status
  useEffect(() => {
    if (!animated) {
      setSystemStatus('ACTIVE')
      return
    }
    
    const statuses = [
      'INITIALIZING',
      'LOADING MODULES',
      'SYNCING AGENTS',
      'ESTABLISHING CONNECTIONS',
      'CALIBRATING NEURAL NETS',
      'ACTIVE',
    ]
    
    let index = 0
    const interval = setInterval(() => {
      if (index < statuses.length - 1) {
        index++
        setSystemStatus(statuses[index] ?? 'INITIALIZING')
      } else {
        clearInterval(interval)
      }
    }, 500)
    
    return () => clearInterval(interval)
  }, [animated])
  
  // Animation frames
  useEffect(() => {
    if (!animated) return
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 4)
    }, 200)
    
    return () => clearInterval(interval)
  }, [animated])
  
  const animationChars = ['⠋', '⠙', '⠹', '⠸']
  const progressBar = '█'.repeat(30)
  
  return (
    <Box 
      flexDirection="column" 
      alignItems="center" 
      paddingY={1}
      borderStyle="double"
      borderColor={cyberpunkTheme.colors.primary}
    >
      {/* ASCII Title */}
      {asciiArt && (
        <Text>
          {gradients.cyberpunk(asciiArt)}
        </Text>
      )}
      
      {/* Subtitle */}
      <Box marginTop={1}>
        <GlitchText intensity={0.1} frequency={2000} color={cyberpunkTheme.colors.accent}>
          {subtitle}
        </GlitchText>
      </Box>
      
      {/* Status Bar */}
      {showStatus && (
        <Box marginTop={1} flexDirection="row" gap={2}>
          <Text color={cyberpunkTheme.colors.textDim}>[SYSTEM STATUS]</Text>
          <Text color={cyberpunkTheme.colors.success}>
            {systemStatus === 'ACTIVE' ? '●' : animationChars[animationFrame]}
          </Text>
          <Text 
            color={systemStatus === 'ACTIVE' 
              ? cyberpunkTheme.colors.success 
              : cyberpunkTheme.colors.warning
            }
            bold
          >
            {systemStatus}
          </Text>
        </Box>
      )}
      
      {/* Progress Bar */}
      {showStatus && systemStatus !== 'ACTIVE' && (
        <Box marginTop={1} width="100%">
          <Text color={cyberpunkTheme.colors.primary}>
            [{progressBar.substring(0, Math.floor((animationFrame + 1) * 7.5))}
            {cyberpunkTheme.ascii.progressEmpty.repeat(30 - Math.floor((animationFrame + 1) * 7.5))}]
          </Text>
        </Box>
      )}
      
      {/* Decorative Line */}
      <Box marginTop={1} width="100%">
        <Text color={cyberpunkTheme.colors.borderDim}>
          {cyberpunkTheme.ascii.boxHorizontal.repeat(60)}
        </Text>
      </Box>
    </Box>
  )
}