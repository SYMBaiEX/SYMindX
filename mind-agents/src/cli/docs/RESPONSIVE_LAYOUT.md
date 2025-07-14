# Responsive CLI Layout System

A comprehensive responsive layout system for terminal-based UIs in the SYMindX CLI, providing adaptive components that automatically adjust to different terminal sizes.

## Overview

The responsive layout system provides:

- **Breakpoint-based layouts** - Different layouts for different terminal sizes
- **Responsive components** - Components that adapt to available space
- **Smart text truncation** - Automatic text ellipsis with word preservation
- **Flexible grid system** - Auto-adjusting column layouts
- **Responsive spacing** - Dynamic padding and margins

## Breakpoints

The system uses 5 breakpoints based on terminal width:

```typescript
- xs: ≤80 columns (minimal terminals)
- sm: 81-100 columns (small terminals)
- md: 101-120 columns (medium terminals)
- lg: 121-160 columns (large terminals)
- xl: >160 columns (extra large terminals)
```

## Core Components

### ResponsiveBox

A flexible container with responsive properties:

```tsx
import { ResponsiveBox } from '../components/ui/ResponsiveBox.js';

<ResponsiveBox
  // Responsive padding
  padding={{ xs: 0, sm: 1, md: 2, default: 1 }}
  // Responsive flex direction
  direction={{ xs: 'column', md: 'row', default: 'row' }}
  // Responsive visibility
  show={{ xs: false, sm: true }}
  // Responsive gap between children
  gap={{ xs: 1, sm: 2, md: 3, default: 2 }}
>
  {children}
</ResponsiveBox>;
```

### ResponsiveGrid

A grid layout system with automatic column adjustment:

```tsx
import { ResponsiveGrid } from '../components/ui/ResponsiveGrid.js';

<ResponsiveGrid
  // Responsive columns
  columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
  // Responsive gap
  gap={{ xs: 1, sm: 2, default: 2 }}
  // Auto-fit items to available space
  autoFit={true}
  minItemWidth={30}
>
  <ResponsiveGrid.Item span={2}>
    Wide item spanning 2 columns
  </ResponsiveGrid.Item>
  <ResponsiveGrid.Item>Regular item</ResponsiveGrid.Item>
</ResponsiveGrid>;
```

### ResponsiveCard3D

An enhanced 3D card component with responsive sizing:

```tsx
import { ResponsiveCard3D } from '../components/ui/ResponsiveCard3D.js';

<ResponsiveCard3D
  title='System Status'
  // Responsive width
  width={{ xs: 'full', sm: 40, md: 50, default: 'auto' }}
  // Responsive height
  height={{ xs: 10, sm: 12, md: 14, default: 'auto' }}
  // Grid span when used in ResponsiveGrid
  span={{ xs: 1, md: 2, default: 1 }}
  animated={true}
>
  <Text>Card content</Text>
</ResponsiveCard3D>;
```

## Utility Functions

### Text Truncation

```typescript
import { responsiveTruncate } from '../utils/responsive-grid.js';

const truncated = responsiveTruncate(longText, breakpoints, {
  maxWidth: { xs: 20, sm: 40, md: 60, default: 50 },
  preserveWords: true,
  suffix: '...',
});
```

### Responsive Values

```typescript
import { getResponsiveValue } from '../utils/responsive-grid.js';

const fontSize = getResponsiveValue(breakpoints, {
  xs: 'small',
  sm: 'medium',
  md: 'large',
  default: 'medium',
});
```

### Visibility Control

```typescript
import { shouldShowElement } from '../utils/responsive-grid.js';

const showFeature = shouldShowElement(breakpoints, {
  xs: false, // Hide on extra small
  sm: false, // Hide on small
  md: true, // Show on medium and above
});
```

## Usage Examples

### Responsive Dashboard

```tsx
export const ResponsiveDashboard = () => {
  const { dimensions, breakpoints } = useTerminalDimensions();

  return (
    <ResponsiveBox direction='column' padding={{ xs: 0, sm: 1, default: 2 }}>
      <Header title='Dashboard' />

      <ResponsiveGrid columns={{ xs: 1, sm: 1, md: 2, lg: 3 }} gap={2}>
        <ResponsiveCard3D title='CPU Usage' width='auto' height='auto'>
          <Chart data={cpuData} />
        </ResponsiveCard3D>

        <ResponsiveCard3D
          title='Memory'
          width='auto'
          height='auto'
          show={{ xs: false, sm: true }}
        >
          <MemoryStats />
        </ResponsiveCard3D>

        <ResponsiveCard3D title='Agents' width='auto' span={{ md: 2, lg: 1 }}>
          <AgentList />
        </ResponsiveCard3D>
      </ResponsiveGrid>
    </ResponsiveBox>
  );
};
```

### Adaptive Agent List

```tsx
export const AdaptiveAgentList = () => {
  const { breakpoints } = useTerminalDimensions();

  return (
    <ResponsiveGrid
      columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
      gap={{ xs: 1, sm: 2, default: 2 }}
      autoFit={true}
      minItemWidth={30}
    >
      {agents.map((agent) => (
        <ResponsiveCard3D
          key={agent.id}
          title={agent.name}
          width='auto'
          height={{ xs: 8, sm: 10, md: 12 }}
        >
          <ResponsiveBox direction='column' gap={1}>
            <Text>Status: {agent.status}</Text>

            {/* Hide details on small screens */}
            <ResponsiveBox show={{ xs: false, md: true }}>
              <Text>Portal: {agent.portal}</Text>
              <Text>Memory: {agent.memoryCount}</Text>
            </ResponsiveBox>
          </ResponsiveBox>
        </ResponsiveCard3D>
      ))}
    </ResponsiveGrid>
  );
};
```

### Responsive Chat Interface

```tsx
export const ResponsiveChat = () => {
  const { dimensions, breakpoints } = useTerminalDimensions();

  return (
    <ResponsiveBox
      direction={{ xs: 'column', md: 'row' }}
      gap={2}
      height={dimensions.height}
    >
      {/* Agent list - hide on mobile */}
      <ResponsiveBox show={{ xs: false, md: true }} width={{ md: 30, lg: 40 }}>
        <AgentList />
      </ResponsiveBox>

      {/* Chat area - full width on mobile */}
      <ResponsiveBox flexGrow={1}>
        <ChatMessages />
        <ChatInput />
      </ResponsiveBox>
    </ResponsiveBox>
  );
};
```

## Best Practices

### 1. Mobile-First Design

Start with the smallest screen size and enhance for larger screens:

```tsx
<ResponsiveBox
  padding={{ xs: 0, sm: 1, md: 2, lg: 3 }}
  direction={{ xs: 'column', md: 'row' }}
>
```

### 2. Progressive Disclosure

Show more information as screen size increases:

```tsx
<ResponsiveBox>
  <Text>{agent.name}</Text>
  <ResponsiveBox show={{ xs: false, sm: true }}>
    <Text>{agent.status}</Text>
  </ResponsiveBox>
  <ResponsiveBox show={{ xs: false, md: true }}>
    <Text>{agent.description}</Text>
  </ResponsiveBox>
</ResponsiveBox>
```

### 3. Smart Defaults

Always provide sensible default values:

```tsx
const columns = getResponsiveValue(breakpoints, {
  xs: 1,
  sm: 2,
  md: 3,
  default: 2, // Fallback value
});
```

### 4. Performance Considerations

- Use `responsive={false}` on Card3D for static layouts
- Minimize re-renders by memoizing responsive calculations
- Debounce terminal resize events (handled automatically)

## Terminal Size Guidelines

### Minimum Requirements

- Width: 80 columns
- Height: 24 rows

### Recommended Sizes

- **Mobile view**: 80x24 (standard terminal)
- **Tablet view**: 120x30 (medium terminal)
- **Desktop view**: 160x40+ (full terminal)

## Debugging

Enable debug mode to see current breakpoint:

```tsx
{
  process.env.NODE_ENV === 'development' && (
    <Box position='absolute' top={0} right={0}>
      <Text dimColor>
        {dimensions.width}x{dimensions.height} [{currentBreakpoint}]
      </Text>
    </Box>
  );
}
```

## Migration Guide

To migrate existing components to responsive:

1. Replace `Card3D` with `ResponsiveCard3D`
2. Replace `Box` with `ResponsiveBox` where needed
3. Use `ResponsiveGrid` for layouts
4. Add responsive props to spacing and sizing
5. Test on different terminal sizes

Example migration:

```tsx
// Before
<Card3D title="Status" width={40} height={12}>
  <Box padding={2}>
    <Text>Content</Text>
  </Box>
</Card3D>

// After
<ResponsiveCard3D
  title="Status"
  width={{ xs: 'full', md: 40 }}
  height={{ xs: 10, md: 12 }}
>
  <ResponsiveBox padding={{ xs: 1, md: 2 }}>
    <Text>Content</Text>
  </ResponsiveBox>
</ResponsiveCard3D>
```

## Future Enhancements

Planned features:

- [ ] Responsive typography scale
- [ ] Orientation detection (portrait/landscape)
- [ ] Custom breakpoint configuration
- [ ] Responsive animations
- [ ] Virtual scrolling for large lists
- [ ] Responsive table component
