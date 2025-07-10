import { TerminalDimensions, TerminalBreakpoints } from '../hooks/useTerminalDimensions.js'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type ResponsiveValue<T> = T | {
  [K in Breakpoint]?: T;
} & {
  [key: string]: T | undefined;
}

export type ResponsiveSpacing = ResponsiveValue<number>
export type ResponsiveSize = ResponsiveValue<number | 'auto' | 'full'>

export interface GridItem {
  id: string
  content: any
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export interface GridLayout {
  columns: number
  itemWidth: number
  itemHeight: number
  gap: number
  padding: number
}

export interface GridConfig {
  columns: ResponsiveValue<number> | number
  gap?: ResponsiveValue<number> | number
  padding?: ResponsiveValue<number> | number
  itemMinWidth?: number
  itemMinHeight?: number
  rows?: number
  maxItemsPerRow?: number
}

export const GRID_BREAKPOINTS = {
  xs: 80,
  sm: 100,
  md: 120,
  lg: 160,
  xl: 200
}

export interface ResponsiveGridOptions {
  items: GridItem[]
  dimensions: TerminalDimensions
  breakpoints: TerminalBreakpoints
  minItemWidth?: number
  minItemHeight?: number
  gap?: number
  padding?: number
}

/**
 * Calculate responsive grid layout based on terminal dimensions
 */
export const calculateGridLayout = (options: ResponsiveGridOptions): GridLayout => {
  const {
    dimensions,
    breakpoints,
    minItemWidth = 20,
    minItemHeight = 6,
    gap = 1,
    padding = 1
  } = options

  const availableWidth = dimensions.width - (padding * 2)
  const availableHeight = dimensions.height - (padding * 2)

  // Calculate columns based on breakpoints
  let columns = 1
  if (breakpoints.isXLarge) {
    columns = Math.floor(availableWidth / (minItemWidth + gap))
  } else if (breakpoints.isLarge) {
    columns = Math.min(3, Math.floor(availableWidth / (minItemWidth + gap)))
  } else if (breakpoints.isMedium) {
    columns = Math.min(2, Math.floor(availableWidth / (minItemWidth + gap)))
  } else if (breakpoints.isSmall) {
    columns = Math.min(2, Math.floor(availableWidth / (minItemWidth + gap)))
  }

  // Ensure at least 1 column
  columns = Math.max(1, columns)

  // Calculate item width
  const totalGapWidth = (columns - 1) * gap
  const itemWidth = Math.floor((availableWidth - totalGapWidth) / columns)

  // Calculate item height based on available space
  const itemHeight = breakpoints.isXSmall ? minItemHeight :
                     breakpoints.isSmall ? Math.floor(availableHeight * 0.3) :
                     breakpoints.isMedium ? Math.floor(availableHeight * 0.35) :
                     Math.floor(availableHeight * 0.4)

  return {
    columns,
    itemWidth: Math.max(minItemWidth, itemWidth),
    itemHeight: Math.max(minItemHeight, itemHeight),
    gap,
    padding
  }
}

/**
 * Get responsive text based on terminal width
 */
export const getResponsiveText = (
  text: string,
  maxWidth: number,
  ellipsis: string = '...'
): string => {
  if (text.length <= maxWidth) {
    return text
  }
  
  const truncateLength = maxWidth - ellipsis.length
  if (truncateLength <= 0) {
    return ellipsis.substring(0, maxWidth)
  }
  
  return text.substring(0, truncateLength) + ellipsis
}

/**
 * Get responsive font size indicator
 */
export const getResponsiveFontSize = (breakpoints: TerminalBreakpoints): 'small' | 'medium' | 'large' => {
  if (breakpoints.isXSmall) return 'small'
  if (breakpoints.isSmall || breakpoints.isMedium) return 'medium'
  return 'large'
}

/**
 * Check if content should be hidden based on breakpoint
 */
export const shouldHideContent = (
  minBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
): boolean => {
  const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl']
  const minIndex = breakpointOrder.indexOf(minBreakpoint)
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint)
  
  return currentIndex < minIndex
}

/**
 * Get adaptive spacing based on breakpoint
 */
export const getAdaptiveSpacing = (breakpoints: TerminalBreakpoints) => {
  return {
    padding: breakpoints.isXSmall ? 0 : breakpoints.isSmall ? 1 : 2,
    gap: breakpoints.isXSmall ? 0 : 1,
    marginBottom: breakpoints.isXSmall ? 0 : 1,
    marginTop: breakpoints.isXSmall ? 0 : 1
  }
}

/**
 * Calculate optimal card dimensions
 */
export const getOptimalCardDimensions = (
  dimensions: TerminalDimensions,
  breakpoints: TerminalBreakpoints,
  aspectRatio: number = 2.5 // width:height ratio
) => {
  const spacing = getAdaptiveSpacing(breakpoints)
  const availableWidth = dimensions.width - (spacing.padding * 2)
  const availableHeight = dimensions.height - (spacing.padding * 2)
  
  let width: number
  let height: number
  
  if (breakpoints.isXSmall) {
    width = availableWidth
    height = Math.floor(width / aspectRatio)
  } else if (breakpoints.isSmall) {
    width = Math.floor(availableWidth * 0.9)
    height = Math.floor(width / aspectRatio)
  } else if (breakpoints.isMedium) {
    width = Math.floor(availableWidth * 0.8)
    height = Math.floor(width / aspectRatio)
  } else {
    width = Math.floor(availableWidth * 0.6)
    height = Math.floor(width / aspectRatio)
  }
  
  // Ensure dimensions don't exceed available space
  if (height > availableHeight * 0.8) {
    height = Math.floor(availableHeight * 0.8)
    width = Math.floor(height * aspectRatio)
  }
  
  return {
    width: Math.max(20, width),
    height: Math.max(6, height)
  }
}

/**
 * Get current breakpoint from terminal width
 */
export const getCurrentBreakpoint = (width: number): Breakpoint => {
  if (width <= GRID_BREAKPOINTS.xs) return 'xs'
  if (width <= GRID_BREAKPOINTS.sm) return 'sm'
  if (width <= GRID_BREAKPOINTS.md) return 'md'
  if (width <= GRID_BREAKPOINTS.lg) return 'lg'
  return 'xl'
}

/**
 * Get responsive value based on current breakpoint
 */
export const getResponsiveValue = <T>(
  value: ResponsiveValue<T>,
  breakpoint: Breakpoint,
  defaultValue?: T
): T | undefined => {
  if (typeof value !== 'object' || value === null) {
    return value as T
  }

  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl']
  const currentIndex = breakpointOrder.indexOf(breakpoint)

  // Type guard to check if value is a responsive object
  const responsiveValue = value as { [K in Breakpoint]?: T }

  // Try to find value for current or smaller breakpoint
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i]
    if (bp && bp in responsiveValue && responsiveValue[bp] !== undefined) {
      return responsiveValue[bp]
    }
  }

  return defaultValue
}

/**
 * Calculate responsive width
 */
export const getResponsiveWidth = (
  width: ResponsiveValue<number | 'auto' | 'full'>,
  terminalWidth: number,
  breakpoint: Breakpoint
): number | 'auto' => {
  const value = getResponsiveValue(width, breakpoint, 'auto')
  
  if (value === 'full') {
    return terminalWidth - 2 // Account for borders
  }
  
  return value || 'auto'
}

/**
 * Calculate responsive height
 */
export const getResponsiveHeight = (
  height: ResponsiveValue<number | 'auto'>,
  terminalHeight: number,
  breakpoint: Breakpoint
): number | 'auto' => {
  const value = getResponsiveValue(height, breakpoint, 'auto')
  
  if (typeof value === 'number' && value < 1) {
    // Treat as percentage
    return Math.floor(terminalHeight * value)
  }
  
  return value || 'auto'
}

/**
 * Get responsive spacing
 */
export const getResponsiveSpacing = (
  spacing: ResponsiveSpacing,
  breakpoint: Breakpoint
): number => {
  return getResponsiveValue(spacing, breakpoint, 1) || 1
}

/**
 * Truncate text with responsive max width
 */
export const responsiveTruncate = (
  text: string,
  maxWidth: ResponsiveValue<number>,
  breakpoint: Breakpoint,
  ellipsis: string = '...'
): string => {
  const width = getResponsiveValue(maxWidth, breakpoint, 50) || 50
  return getResponsiveText(text, width, ellipsis)
}

/**
 * Simple text truncation
 */
export const truncateText = (text: string, maxWidth: number, ellipsis: string = '...'): string => {
  return getResponsiveText(text, maxWidth, ellipsis)
}

/**
 * Get responsive box model (padding, margin)
 */
export const getResponsiveBoxModel = (
  padding?: ResponsiveSpacing,
  margin?: ResponsiveSpacing,
  breakpoint?: Breakpoint
): {
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
} => {
  const bp = breakpoint || 'md'
  
  const p = padding !== undefined ? getResponsiveValue(padding, bp, 0) || 0 : 0
  const m = margin !== undefined ? getResponsiveValue(margin, bp, 0) || 0 : 0
  
  return {
    paddingTop: p,
    paddingRight: p,
    paddingBottom: p,
    paddingLeft: p,
    marginTop: m,
    marginRight: m,
    marginBottom: m,
    marginLeft: m
  }
}

/**
 * Get responsive flex properties
 */
export const getResponsiveFlex = (
  direction?: ResponsiveValue<'row' | 'column'>,
  justify?: ResponsiveValue<string>,
  align?: ResponsiveValue<string>,
  breakpoint?: Breakpoint
) => {
  const bp = breakpoint || 'md'
  
  return {
    flexDirection: getResponsiveValue(direction, bp, 'column'),
    justifyContent: getResponsiveValue(justify, bp, 'start'),
    alignItems: getResponsiveValue(align, bp, 'stretch')
  }
}

/**
 * Check if element should be shown
 */
export const shouldShowElement = (
  show: ResponsiveValue<boolean>,
  breakpoint: Breakpoint
): boolean => {
  return getResponsiveValue(show, breakpoint, true) !== false
}

/**
 * Calculate grid configuration
 */
export const calculateGridConfig = (
  config: GridConfig,
  dimensions: TerminalDimensions,
  breakpoint: Breakpoint
): GridLayout => {
  const columns = getResponsiveValue(config.columns, breakpoint, 1) || 1
  const gap = getResponsiveValue(config.gap, breakpoint, 1) || 1
  const padding = getResponsiveValue(config.padding, breakpoint, 1) || 1
  
  const availableWidth = dimensions.width - (padding * 2)
  const totalGapWidth = (columns - 1) * gap
  const itemWidth = Math.floor((availableWidth - totalGapWidth) / columns)
  
  return {
    columns,
    itemWidth: Math.max(config.itemMinWidth || 10, itemWidth),
    itemHeight: config.itemMinHeight || 6,
    gap,
    padding
  }
}

/**
 * Calculate grid item dimensions
 */
export const calculateGridItemDimensions = (
  span: number = 1,
  layout: GridLayout
): { width: number; height: number } => {
  const gapValue = typeof layout.gap === 'number' ? layout.gap : 1
  const width = (layout.itemWidth * span) + (gapValue * (span - 1))
  
  return {
    width: Math.max(10, width),
    height: layout.itemHeight
  }
}

/**
 * Calculate all grid item dimensions for a given layout
 */
export const calculateAllGridItemDimensions = (
  layout: GridLayout,
  dimensions: TerminalDimensions,
  itemCount: number
): Array<{ width: number; height: number }> => {
  const items: Array<{ width: number; height: number }> = []
  
  for (let i = 0; i < itemCount; i++) {
    items.push(calculateGridItemDimensions(1, layout))
  }
  
  return items
}

/**
 * Get responsive columns based on breakpoint
 */
export const getResponsiveColumns = (
  breakpoints: TerminalBreakpoints,
  columns?: ResponsiveValue<number>
): number => {
  const currentBreakpoint = breakpoints.isXSmall ? 'xs' :
                          breakpoints.isSmall ? 'sm' :
                          breakpoints.isMedium ? 'md' :
                          breakpoints.isLarge ? 'lg' : 'xl'
  
  if (columns) {
    return getResponsiveValue(columns, currentBreakpoint, 1) || 1
  }
  
  // Default columns based on breakpoint
  return breakpoints.isXSmall ? 1 :
         breakpoints.isSmall ? 2 :
         breakpoints.isMedium ? 3 :
         breakpoints.isLarge ? 4 : 6
}

/**
 * Calculate responsive grid configuration for auto-sizing
 */
export const calculateResponsiveGridConfig = (
  dimensions: TerminalDimensions,
  breakpoints: TerminalBreakpoints,
  options: {
    minItemWidth?: number
    minItemHeight?: number
    aspectRatio?: number
    maxColumns?: number
    responsive?: boolean
  }
): GridLayout => {
  const {
    minItemWidth = 20,
    minItemHeight = 6,
    maxColumns = 12,
  } = options
  
  const columns = Math.min(
    maxColumns,
    getResponsiveColumns(breakpoints)
  )
  
  const gap = breakpoints.isXSmall ? 0 : 1
  const padding = breakpoints.isXSmall ? 0 : 1
  
  const availableWidth = dimensions.width - (padding * 2)
  const totalGapWidth = (columns - 1) * gap
  const itemWidth = Math.floor((availableWidth - totalGapWidth) / columns)
  
  return {
    columns,
    itemWidth: Math.max(minItemWidth, itemWidth),
    itemHeight: minItemHeight,
    gap,
    padding
  }
}

/**
 * Get responsive layout type
 */
export const getResponsiveLayout = (
  breakpoint: Breakpoint
): 'stacked' | 'grid' | 'flex' => {
  if (breakpoint === 'xs') return 'stacked'
  if (breakpoint === 'sm' || breakpoint === 'md') return 'flex'
  return 'grid'
}


/**
 * Enhanced getResponsiveValue that accepts TerminalBreakpoints as first parameter
 */
export function getResponsiveValueFromBreakpoints<T>(
  breakpoints: TerminalBreakpoints,
  value: ResponsiveValue<T>,
  defaultValue?: T
): T | undefined {
  const currentBreakpoint = breakpoints.isXSmall ? 'xs' :
                           breakpoints.isSmall ? 'sm' :
                           breakpoints.isMedium ? 'md' :
                           breakpoints.isLarge ? 'lg' : 'xl'
  
  return getResponsiveValue(value, currentBreakpoint, defaultValue)
}