import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'

import {
  MatrixRain,
  GlitchText,
  ParticleSystem,
  NeonGlow,
  AnimatedBorder,
  PulsingEffect,
  LoadingSpinner,
  ScanlineEffect,
  ASCIIAnimation,
  AnimatedChart,
  Perspective3D,
  StatusAnimation,
  ViewTransition,
  themeEngine,
} from '../effects/index.js'

export const EffectsDemo: React.FC = () => {
  const [selectedEffect, setSelectedEffect] = useState(0)
  const [currentTheme, setCurrentTheme] = useState(0)
  
  const effects = [
    { name: 'Matrix Rain', component: 'matrix' },
    { name: 'Glitch Text', component: 'glitch' },
    { name: 'Particle System', component: 'particles' },
    { name: 'Neon Glow', component: 'neon' },
    { name: 'Animated Borders', component: 'borders' },
    { name: 'Pulsing Effects', component: 'pulse' },
    { name: 'Loading Spinners', component: 'loading' },
    { name: 'Scanline Effect', component: 'scanline' },
    { name: 'ASCII Animations', component: 'ascii' },
    { name: 'Animated Charts', component: 'charts' },
    { name: '3D Perspective', component: '3d' },
    { name: 'Status Animations', component: 'status' },
  ]
  
  const themes = themeEngine.getThemeNames()
  
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedEffect(prev => (prev - 1 + effects.length) % effects.length)
    } else if (key.downArrow) {
      setSelectedEffect(prev => (prev + 1) % effects.length)
    } else if (key.leftArrow) {
      setCurrentTheme(prev => (prev - 1 + themes.length) % themes.length)
      const prevTheme = themes[(currentTheme - 1 + themes.length) % themes.length]
      if (prevTheme) {
        themeEngine.setTheme(prevTheme)
      }
    } else if (key.rightArrow) {
      setCurrentTheme(prev => (prev + 1) % themes.length)
      const nextTheme = themes[(currentTheme + 1) % themes.length]
      if (nextTheme) {
        themeEngine.setTheme(nextTheme)
      }
    } else if (input === 't') {
      themeEngine.toggleAnimations()
    }
  })
  
  const renderEffect = () => {
    const effect = effects[selectedEffect]?.component
    
    switch (effect) {
      case 'matrix':
        return (
          <Box flexDirection="column" gap={1}>
            <Text bold>Matrix Rain Variants:</Text>
            <Box height={10}>
              <MatrixRain variant="classic" height={10} width={30} />
              <Box marginLeft={2}>
                <MatrixRain variant="binary" height={10} width={20} colorVariation />
              </Box>
              <Box marginLeft={2}>
                <MatrixRain variant="japanese" height={10} width={20} />
              </Box>
            </Box>
          </Box>
        )
        
      case 'glitch':
        return (
          <Box flexDirection="column" gap={1}>
            <GlitchText variant="classic">Classic Glitch Effect</GlitchText>
            <GlitchText variant="digital" intensity={0.5}>Digital Corruption</GlitchText>
            <GlitchText variant="matrix" multiLayer>Matrix Style Glitch</GlitchText>
            <GlitchText variant="chromatic" multiLayer>Chromatic Aberration</GlitchText>
            <GlitchText variant="zalgo">Z̸͎̈a̵̱̍l̶̳̾g̷̬̈́o̴̜͌ ̶̭̏T̵̬̈́e̷̖̾x̸̱̾t̷̮́</GlitchText>
            <GlitchText variant="wave">Wave Distortion</GlitchText>
          </Box>
        )
        
      case 'particles':
        return (
          <Box flexDirection="column" gap={1}>
            <Text bold>Particle Systems:</Text>
            <Box height={12}>
              <Box width={30}>
                <ParticleSystem 
                  particleTypes={['star']} 
                  height={12} 
                  width={30}
                  emitterY="bottom"
                />
              </Box>
              <Box width={30}>
                <ParticleSystem 
                  particleTypes={['fire']} 
                  height={12} 
                  width={30}
                  gravity={-0.05}
                />
              </Box>
              <Box width={30}>
                <ParticleSystem 
                  particleTypes={['snow']} 
                  height={12} 
                  width={30}
                  gravity={0.02}
                  wind={0.1}
                />
              </Box>
            </Box>
          </Box>
        )
        
      case 'neon':
        return (
          <Box flexDirection="column" gap={1}>
            <NeonGlow variant="outline">Neon Outline</NeonGlow>
            <NeonGlow variant="solid" animation="pulse">Pulsing Neon</NeonGlow>
            <NeonGlow variant="double" animation="flicker">Flickering Sign</NeonGlow>
            <NeonGlow variant="gradient" animation="wave">Wave Animation</NeonGlow>
            <NeonGlow animation="rainbow">Rainbow Glow</NeonGlow>
          </Box>
        )
        
      case 'borders':
        return (
          <Box flexDirection="column" gap={1}>
            <AnimatedBorder 
              variant="solid" 
              animation="flow" 
              title="Flow Animation" 
              width={40} 
              height={5}
            >
              <Text>Content inside border</Text>
            </AnimatedBorder>
            <AnimatedBorder 
              variant="tech" 
              animation="snake" 
              title="Snake Border" 
              width={40} 
              height={5}
            />
            <AnimatedBorder 
              variant="matrix" 
              animation="sparkle" 
              width={40} 
              height={5}
            />
          </Box>
        )
        
      case 'pulse':
        return (
          <Box flexDirection="column" gap={1}>
            <PulsingEffect variant="fade">Fading Text</PulsingEffect>
            <PulsingEffect variant="scale">Scaling Effect</PulsingEffect>
            <PulsingEffect variant="glow">Glowing Pulse</PulsingEffect>
            <PulsingEffect variant="heartbeat">♥ Heartbeat ♥</PulsingEffect>
            <PulsingEffect variant="breathe">Breathing Effect</PulsingEffect>
            <PulsingEffect variant="bounce">Bouncing Text</PulsingEffect>
          </Box>
        )
        
      case 'loading':
        return (
          <Box flexDirection="column" gap={1}>
            <LoadingSpinner variant="matrix" text="Loading Matrix" />
            <LoadingSpinner variant="dna" text="DNA Helix" />
            <LoadingSpinner variant="orbit" text="Orbital" />
            <LoadingSpinner variant="quantum" text="Quantum State" />
            <LoadingSpinner variant="glitch" text="Glitching" />
            <LoadingSpinner variant="neural" text="Neural Network" />
          </Box>
        )
        
      case 'scanline':
        return (
          <Box height={15}>
            <ScanlineEffect 
              variant="classic" 
              height={15} 
              width={60} 
              scanlineCount={2}
            />
          </Box>
        )
        
      case 'ascii':
        return (
          <Box flexDirection="column" gap={1}>
            <ASCIIAnimation variant="logo" />
            <ASCIIAnimation variant="fire" />
            <ASCIIAnimation variant="lightning" />
          </Box>
        )
        
      case 'charts':
        return (
          <Box flexDirection="column" gap={1}>
            <AnimatedChart
              type="bar"
              data={[
                { value: 10, label: 'A' },
                { value: 25, label: 'B' },
                { value: 15, label: 'C' },
                { value: 30, label: 'D' },
              ]}
              height={8}
              width={40}
              title="Bar Chart"
            />
            <AnimatedChart
              type="sparkline"
              data={Array.from({ length: 20 }, (_, i) => ({
                value: Math.sin(i * 0.5) * 50 + 50,
              }))}
            />
          </Box>
        )
        
      case '3d':
        return (
          <Box flexDirection="column" gap={1}>
            <Perspective3D variant="rotate">Rotating 3D</Perspective3D>
            <Perspective3D variant="flip">Flipping Text</Perspective3D>
            <Perspective3D variant="cube">3D Cube</Perspective3D>
            <Perspective3D variant="pyramid">Pyramid</Perspective3D>
          </Box>
        )
        
      case 'status':
        return (
          <Box flexDirection="column" gap={1}>
            <StatusAnimation type="success" message="Operation completed!" variant="animated" />
            <StatusAnimation type="error" message="Something went wrong" variant="explosive" />
            <StatusAnimation type="warning" message="Please be careful" variant="matrix" />
            <StatusAnimation type="info" message="For your information" variant="animated" />
          </Box>
        )
        
      default:
        return <Text>Select an effect</Text>
    }
  }
  
  return (
    <ViewTransition transitionKey={effects[selectedEffect]?.name ?? 'default'} variant="slide">
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Visual Effects Demo</Text>
          <Text dimColor> - Use ↑↓ to navigate, ←→ to change theme, 't' to toggle animations</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>Current Theme: </Text>
          <Text color="yellow">{themes[currentTheme]}</Text>
          <Text> | Animations: </Text>
          <Text color={themeEngine.areAnimationsEnabled() ? 'green' : 'red'}>
            {themeEngine.areAnimationsEnabled() ? 'ON' : 'OFF'}
          </Text>
        </Box>
        
        <Box>
          <Box flexDirection="column" marginRight={2}>
            {effects.map((effect, index) => (
              <Box key={effect.name}>
                <Text color={index === selectedEffect ? 'cyan' : 'gray'}>
                  {index === selectedEffect ? '▶ ' : '  '}
                  {effect.name}
                </Text>
              </Box>
            ))}
          </Box>
          
          <Box flexDirection="column" width={80}>
            {renderEffect()}
          </Box>
        </Box>
      </Box>
    </ViewTransition>
  )
}