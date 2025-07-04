import React, { useState, useEffect } from 'react'
import { Text } from 'ink'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'

interface GlitchTextProps {
  children: string
  intensity?: number
  frequency?: number
  color?: string
  bold?: boolean
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  intensity = 0.3,
  frequency = 100,
  color = cyberpunkTheme.colors.primary,
  bold = false,
}) => {
  const [glitchedText, setGlitchedText] = useState(children)
  const [isGlitching, setIsGlitching] = useState(false)
  
  const glitchChars = '▓▒░█▄▀■□▢▣▤▥▦▧▨▩▪▫!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance to glitch
        setIsGlitching(true)
        
        // Create glitched version
        let result = ''
        for (let i = 0; i < children.length; i++) {
          if (Math.random() < intensity) {
            result += glitchChars[Math.floor(Math.random() * glitchChars.length)]
          } else {
            result += children[i]
          }
        }
        setGlitchedText(result)
        
        // Reset after a short time
        setTimeout(() => {
          setGlitchedText(children)
          setIsGlitching(false)
        }, 50 + Math.random() * 100)
      }
    }, frequency)
    
    return () => clearInterval(glitchInterval)
  }, [children, intensity, frequency])
  
  // Create multiple text layers for glitch effect
  if (isGlitching) {
    return (
      <>
        <Text 
          color={cyberpunkTheme.colors.glitch} 
          bold={bold}
          dimColor
        >
          {glitchedText}
        </Text>
      </>
    )
  }
  
  return (
    <Text color={color} bold={bold}>
      {glitchedText}
    </Text>
  )
}