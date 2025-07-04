#!/usr/bin/env tsx

/**
 * Demo script to showcase the new CLI features
 */

import React from 'react'
import { render, Box, Text } from 'ink'
import gradient from 'gradient-string'
import { Header } from './components/ui/Header.js'
import { Card3D } from './components/ui/Card3D.js'
import { Chart } from './components/ui/Chart.js'
import { GlitchText } from './components/effects/GlitchText.js'
import { MatrixRain } from './components/effects/MatrixRain.js'
import { cyberpunkTheme } from './themes/cyberpunk.js'
import { createCyberpunkHeader } from './utils/ascii-art.js'

const Demo = () => {
  const [showMatrix] = React.useState(true)
  const [chartData] = React.useState(
    Array.from({ length: 20 }, () => Math.random() * 100)
  )
  
  return (
    <Box flexDirection="column" height="100%">
      {/* ASCII Header */}
      <Box marginBottom={1}>
        <Text>{gradient(['#00F5FF', '#FF00FF', '#FFFF00'])(`
███████╗██╗   ██╗███╗   ███╗██╗███╗   ██╗██████╗ ██╗  ██╗
██╔════╝╚██╗ ██╔╝████╗ ████║██║████╗  ██║██╔══██╗╚██╗██╔╝
███████╗ ╚████╔╝ ██╔████╔██║██║██╔██╗ ██║██║  ██║ ╚███╔╝ 
╚════██║  ╚██╔╝  ██║╚██╔╝██║██║██║╚██╗██║██║  ██║ ██╔██╗ 
███████║   ██║   ██║ ╚═╝ ██║██║██║ ╚████║██████╔╝██╔╝ ██╗
╚══════╝   ╚═╝   ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝
        `)}</Text>
      </Box>
      
      <Box>
        <GlitchText intensity={0.2} frequency={1000} color="#00F5FF" bold>
          NEURAL RUNTIME SYSTEM v2.0 - DEMO MODE
        </GlitchText>
      </Box>
      
      <Box flexDirection="row" gap={2} marginTop={2}>
        {/* 3D Card Demo */}
        <Card3D 
          title="3D CARD DEMO" 
          width={40} 
          height={12}
          color="#FF00FF"
          animated={true}
        >
          <Text color="#00F5FF">▶ 3D-style card with depth effect</Text>
          <Text color="#FFFF00">▶ Animated glow effects</Text>
          <Text color="#00FF88">▶ Cyberpunk color scheme</Text>
          <Text color="#FF006E">▶ Modular component system</Text>
        </Card3D>
        
        {/* Chart Demo */}
        <Card3D 
          title="REAL-TIME CHARTS" 
          width={40} 
          height={12}
          color="#00F5FF"
        >
          <Chart
            data={chartData}
            width={36}
            height={8}
            title="Performance Metrics"
            color="#FFFF00"
            type="area"
            animated={true}
          />
        </Card3D>
      </Box>
      
      <Box marginTop={2}>
        <Card3D 
          title="FEATURES IMPLEMENTED" 
          width={82} 
          height={10}
          color="#00FF88"
        >
          <Box flexDirection="row" gap={4}>
            <Box flexDirection="column">
              <Text color="#00F5FF" bold>✨ Visual Effects</Text>
              <Text color="#E0E0E0">• Matrix rain background</Text>
              <Text color="#E0E0E0">• Glitch text animations</Text>
              <Text color="#E0E0E0">• Gradient ASCII art</Text>
            </Box>
            
            <Box flexDirection="column">
              <Text color="#FF00FF" bold>🎵 Audio Integration</Text>
              <Text color="#E0E0E0">• 8-bit sound effects</Text>
              <Text color="#E0E0E0">• Background music support</Text>
              <Text color="#E0E0E0">• Platform-specific playback</Text>
            </Box>
            
            <Box flexDirection="column">
              <Text color="#FFFF00" bold>⚡ Navigation</Text>
              <Text color="#E0E0E0">• Function key shortcuts</Text>
              <Text color="#E0E0E0">• Vi-style commands</Text>
              <Text color="#E0E0E0">• Command palette</Text>
            </Box>
          </Box>
        </Card3D>
      </Box>
      
      {/* Matrix rain in background */}
      {showMatrix && (
        <Box position="absolute">
          <MatrixRain width={85} height={40} speed={150} density={0.02} />
        </Box>
      )}
    </Box>
  )
}

// Run demo
console.clear()
const app = render(<Demo />)

// Exit after 10 seconds
setTimeout(() => {
  app.unmount()
  console.log(gradient(['#00F5FF', '#FF00FF'])('\n✨ Demo completed! The new CLI is ready to use.\n'))
  console.log('Run with: bun run cli:new (requires TTY/interactive terminal)\n')
  process.exit(0)
}, 10000)