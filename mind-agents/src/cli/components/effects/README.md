# SYMindX CLI Visual Effects System

The most visually stunning terminal interface ever created! This comprehensive visual effects system brings cyberpunk aesthetics, smooth animations, and incredible visual feedback to your CLI.

## 🎨 Available Effects

### 1. **MatrixRain** 
Digital rain effect with multiple variants
```tsx
<MatrixRain 
  variant="classic" // classic | binary | japanese | glitch | custom
  responsive={true}
  colorVariation={true}
  density={0.02}
/>
```

### 2. **GlitchText**
Text corruption and glitch effects
```tsx
<GlitchText 
  variant="digital" // classic | digital | matrix | chromatic | zalgo | wave
  multiLayer={true}
  intensity={0.5}
>
  Glitched Text
</GlitchText>
```

### 3. **ParticleSystem**
Dynamic particle effects
```tsx
<ParticleSystem 
  particleTypes={['star', 'fire', 'snow']}
  gravity={0.1}
  wind={0.05}
  colorful={true}
/>
```

### 4. **NeonGlow**
Neon text effects with animations
```tsx
<NeonGlow 
  variant="outline" // outline | solid | double | gradient
  animation="pulse" // none | pulse | flicker | wave | rainbow
>
  Neon Text
</NeonGlow>
```

### 5. **AnimatedBorder**
Dynamic animated borders
```tsx
<AnimatedBorder 
  variant="tech" // solid | dashed | double | rounded | tech | matrix | glow
  animation="flow" // none | pulse | flow | snake | sparkle | loading
  title="Section Title"
>
  <Content />
</AnimatedBorder>
```

### 6. **PulsingEffect**
Breathing and pulsing animations
```tsx
<PulsingEffect 
  variant="heartbeat" // fade | scale | glow | heartbeat | breathe | bounce
  speed={1000}
>
  <Content />
</PulsingEffect>
```

### 7. **LoadingSpinner**
Advanced loading indicators
```tsx
<LoadingSpinner 
  variant="quantum" // matrix | dna | orbit | quantum | glitch | cube | hexagon | neural
  showProgress={true}
  progress={75}
/>
```

### 8. **ScanlineEffect**
CRT monitor scanline effects
```tsx
<ScanlineEffect 
  variant="classic" // classic | digital | interference | static | wave
  direction="down" // down | up | both
  scanlineCount={2}
/>
```

### 9. **ASCIIAnimation**
Pre-built ASCII art animations
```tsx
<ASCIIAnimation 
  variant="fire" // logo | fire | water | lightning | explosion | portal
  loop={true}
  rainbow={true}
/>
```

### 10. **AnimatedChart**
Data visualization with animations
```tsx
<AnimatedChart
  type="bar" // bar | line | wave | radar | sparkline | area
  data={dataPoints}
  animate={true}
  style="blocks" // ascii | blocks | smooth
/>
```

### 11. **Perspective3D**
3D perspective effects
```tsx
<Perspective3D 
  variant="cube" // rotate | flip | cube | pyramid | tunnel | grid
  animated={true}
>
  3D Text
</Perspective3D>
```

### 12. **StatusAnimation**
Success/error/warning animations
```tsx
<StatusAnimation 
  type="success" // success | error | warning | info
  variant="explosive" // minimal | animated | explosive | matrix
  message="Operation complete!"
/>
```

### 13. **ViewTransition**
Smooth transitions between views
```tsx
<ViewTransition 
  transitionKey={viewKey}
  variant="glitch" // fade | slide | zoom | flip | dissolve | glitch | matrix
  direction="right"
>
  <Content />
</ViewTransition>
```

## 🎭 Theme Engine

The theme engine provides dynamic theme switching and effect control:

```tsx
import { themeEngine } from './effects'

// Switch themes
themeEngine.setTheme('cyberpunk') // cyberpunk | matrix | minimal | retrowave | hacker

// Toggle animations globally
themeEngine.toggleAnimations()

// Toggle specific effects
themeEngine.toggleEffect('glow', true)

// Check if animations are enabled
if (themeEngine.areAnimationsEnabled()) {
  // Show animated content
}
```

### Available Themes

1. **Cyberpunk** - Neon colors, high contrast, futuristic
2. **Matrix** - Green on black, digital rain aesthetic
3. **Minimal** - Clean, simple, no distractions
4. **Retrowave** - 80s inspired, purple and pink
5. **Hacker** - Terminal green, classic hacker aesthetic

## 🔊 Sound Effects

Integrated terminal sound effects:

```tsx
import { soundManager, SoundType } from './utils/sound-effects'

// Play predefined sounds
soundManager.play(SoundType.SUCCESS)
soundManager.play(SoundType.MATRIX)
soundManager.play(SoundType.GLITCH)

// Play boot sequence
soundManager.playBootSequence()

// Toggle sound
soundManager.toggle()
```

## 📱 Responsive Design

All effects support responsive design:

```tsx
import { useTerminalDimensions } from './hooks/useTerminalDimensions'

const { dimensions, breakpoints } = useTerminalDimensions()

// Components automatically adapt
<MatrixRain responsive={true} />
<ParticleSystem responsive={true} />
```

## 🚀 Performance

- Hardware-accelerated animations where possible
- Efficient render cycles
- Automatic animation disabling for better performance
- Debounced terminal resize handling

## 💡 Usage Examples

### Complete Dashboard
```tsx
<Box>
  {/* Background effects */}
  <MatrixRain variant="binary" responsive />
  
  {/* Main content */}
  <AnimatedBorder variant="glow" animation="flow">
    <NeonGlow animation="pulse">
      <Text>System Status</Text>
    </NeonGlow>
    
    <LoadingSpinner variant="quantum" />
    
    <AnimatedChart 
      type="sparkline" 
      data={systemMetrics}
    />
  </AnimatedBorder>
  
  {/* Particles overlay */}
  <ParticleSystem particleTypes={['star']} />
</Box>
```

### Status Messages
```tsx
// Success with effects
<Box>
  <SuccessAnimation 
    variant="explosive" 
    message="Agent activated successfully!" 
  />
  <ParticleSystem 
    particleTypes={['star']} 
    emitterY="center"
    particleCount={20}
  />
</Box>
```

### Loading States
```tsx
<ViewTransition transitionKey={isLoading} variant="fade">
  {isLoading ? (
    <Box flexDirection="column" alignItems="center">
      <ASCIIAnimation variant="portal" />
      <LoadingSpinner 
        variant="neural" 
        text="Initializing neural network..."
      />
    </Box>
  ) : (
    <Content />
  )}
</ViewTransition>
```

## 🎮 Controls

Standard keyboard controls for demos:
- `↑↓` - Navigate options
- `←→` - Change values/themes
- `Tab` - Switch views
- `T` - Toggle theme
- `E` - Toggle effects
- `S` - Toggle sound
- `ESC` - Exit

## 🛠️ Creating Custom Effects

Extend the base components to create your own effects:

```tsx
import { Box, Text } from 'ink'
import { themeEngine } from './effects'

export const CustomEffect: React.FC<Props> = ({ children }) => {
  const theme = themeEngine.getTheme()
  const [frame, setFrame] = useState(0)
  
  useEffect(() => {
    if (!themeEngine.areAnimationsEnabled()) return
    
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % 10)
    }, 100)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <Text color={theme.colors.primary}>
      {/* Your custom effect logic */}
    </Text>
  )
}
```

## 🌟 Best Practices

1. **Performance**: Use `responsive` prop for dynamic sizing
2. **Accessibility**: Always check `themeEngine.areAnimationsEnabled()`
3. **Theming**: Use theme colors instead of hardcoded values
4. **Sound**: Make sound effects optional and respect user preferences
5. **Combinations**: Layer effects for maximum impact

## 🎯 Future Enhancements

- [ ] More particle types (rain, bubbles, plasma)
- [ ] Advanced 3D effects (wireframe models)
- [ ] Musical sequences with sound effects
- [ ] Network activity visualizers
- [ ] CPU/GPU usage effects
- [ ] Weather effects (rain, snow, fog)
- [ ] Emoji-based animations
- [ ] Terminal shader effects

## 📦 Installation

All effects are included in the mind-agents CLI package:

```bash
cd mind-agents
bun install
bun run cli
```

Then navigate to the effects demo to see everything in action!

---

*Making the terminal beautiful, one effect at a time* ✨