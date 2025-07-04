import React, { useState, useEffect, useRef } from 'react'
import { Box, Text } from 'ink'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'

interface MatrixRainProps {
  width?: number
  height?: number
  speed?: number
  density?: number
  color?: string
}

interface Drop {
  x: number
  y: number
  speed: number
  chars: string[]
  length: number
}

export const MatrixRain: React.FC<MatrixRainProps> = ({
  width = 80,
  height = 24,
  speed = 100,
  density = 0.02,
  color = cyberpunkTheme.colors.matrix,
}) => {
  const [drops, setDrops] = useState<Drop[]>([])
  const matrixChars = '⌂⌀⌁⌃⌄⌅⌆⌇⌈⌉⌊⌋⌌⌍⌎⌏⌐⌑⌒⌓⌔⌕⌖⌗⌘⌙⌚⌛⌜⌝⌞⌟⌠⌡⌢⌣⌤⌥⌦⌧⌨〈〉⌫⌬アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
  
  // Initialize drops
  useEffect(() => {
    const initialDrops: Drop[] = []
    const numDrops = Math.floor(width * density)
    
    for (let i = 0; i < numDrops; i++) {
      initialDrops.push({
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height) - height,
        speed: 0.5 + Math.random() * 0.5,
        length: 5 + Math.floor(Math.random() * 10),
        chars: Array.from({ length: 15 }, () => 
          matrixChars[Math.floor(Math.random() * matrixChars.length)]
        ),
      })
    }
    
    setDrops(initialDrops)
  }, [width, height, density])
  
  // Animate drops
  useEffect(() => {
    const interval = setInterval(() => {
      setDrops(prevDrops => 
        prevDrops.map(drop => {
          let newY = drop.y + drop.speed
          let newChars = drop.chars
          
          // Reset drop when it goes off screen
          if (newY > height + drop.length) {
            newY = -drop.length
            drop.x = Math.floor(Math.random() * width)
            newChars = Array.from({ length: drop.length }, () => 
              matrixChars[Math.floor(Math.random() * matrixChars.length)]
            )
          }
          
          // Occasionally change characters
          if (Math.random() < 0.1) {
            const charIndex = Math.floor(Math.random() * drop.chars.length)
            newChars = [...drop.chars]
            newChars[charIndex] = matrixChars[Math.floor(Math.random() * matrixChars.length)]
          }
          
          return {
            ...drop,
            y: newY,
            chars: newChars,
          }
        })
      )
    }, speed)
    
    return () => clearInterval(interval)
  }, [speed, height, width])
  
  // Render matrix
  const renderMatrix = () => {
    const display: string[][] = Array(height).fill(null).map(() => 
      Array(width).fill(' ')
    )
    
    // Place drops on the display
    drops.forEach(drop => {
      for (let i = 0; i < drop.length; i++) {
        const y = Math.floor(drop.y - i)
        if (y >= 0 && y < height && drop.x >= 0 && drop.x < width) {
          const char = drop.chars[i] || ' '
          display[y][drop.x] = char
        }
      }
    })
    
    return display.map((row, y) => (
      <Text key={y}>
        {row.map((char, x) => {
          const dropIndex = drops.findIndex(d => 
            d.x === x && Math.floor(d.y) <= y && Math.floor(d.y - d.length) >= y
          )
          
          if (dropIndex !== -1) {
            const drop = drops[dropIndex]
            const charPosition = Math.floor(drop.y) - y
            const opacity = 1 - (charPosition / drop.length)
            
            // Head of the drop is brighter
            if (charPosition === 0) {
              return (
                <Text key={x} color={cyberpunkTheme.colors.text} bold>
                  {char}
                </Text>
              )
            }
            
            // Fade out towards the tail
            return (
              <Text 
                key={x} 
                color={color} 
                dimColor={opacity < 0.5}
              >
                {char}
              </Text>
            )
          }
          
          return <Text key={x}> </Text>
        })}
      </Text>
    ))
  }
  
  return (
    <Box flexDirection="column">
      {renderMatrix()}
    </Box>
  )
}