import { useState, useEffect, useCallback } from 'react';

export interface TerminalDimensions {
  width: number;
  height: number;
}

export interface TerminalBreakpoints {
  isXSmall: boolean; // 80x24 or smaller
  isSmall: boolean; // 81-100 columns
  isMedium: boolean; // 101-120 columns
  isLarge: boolean; // 121-160 columns
  isXLarge: boolean; // 161+ columns
}

export interface TerminalOrientation {
  isPortrait: boolean;
  isLandscape: boolean;
  aspectRatio: number;
}

export interface TerminalResponsive {
  dimensions: TerminalDimensions;
  breakpoints: TerminalBreakpoints;
  orientation: TerminalOrientation;
  isMinimumSize: boolean;
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

// Debounce function to prevent too many resize events
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const useTerminalDimensions = (): TerminalResponsive => {
  const [dimensions, setDimensions] = useState<TerminalDimensions>({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  });

  const updateDimensions = useCallback(() => {
    setDimensions({
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24,
    });
  }, []);

  useEffect(() => {
    // Debounced resize handler
    const handleResize = debounce(updateDimensions, 100);

    // Listen for terminal resize events
    process.stdout.on('resize', handleResize);

    // Initial dimension check
    updateDimensions();

    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, [updateDimensions]);

  // Calculate breakpoints based on terminal width
  const breakpoints: TerminalBreakpoints = {
    isXSmall: dimensions.width <= 80,
    isSmall: dimensions.width > 80 && dimensions.width <= 100,
    isMedium: dimensions.width > 100 && dimensions.width <= 120,
    isLarge: dimensions.width > 120 && dimensions.width <= 160,
    isXLarge: dimensions.width > 160,
  };

  // Determine current breakpoint
  const currentBreakpoint = breakpoints.isXSmall
    ? 'xs'
    : breakpoints.isSmall
      ? 'sm'
      : breakpoints.isMedium
        ? 'md'
        : breakpoints.isLarge
          ? 'lg'
          : 'xl';

  // Calculate orientation
  const aspectRatio = dimensions.width / dimensions.height;
  const orientation: TerminalOrientation = {
    isPortrait: aspectRatio < 1.5,
    isLandscape: aspectRatio >= 1.5,
    aspectRatio,
  };

  // Check if terminal meets minimum requirements
  const isMinimumSize = dimensions.width >= 80 && dimensions.height >= 24;

  return {
    dimensions,
    breakpoints,
    orientation,
    isMinimumSize,
    currentBreakpoint,
  };
};

/**
 * Utility function to get adaptive dimensions based on terminal size
 */
export const getAdaptiveDimensions = (
  dimensions: TerminalDimensions,
  breakpoints: TerminalBreakpoints
) => {
  const { width, height } = dimensions;

  // Card dimensions based on breakpoints
  const cardWidth = breakpoints.isXSmall
    ? Math.floor(width * 0.9)
    : breakpoints.isSmall
      ? Math.floor(width * 0.8)
      : breakpoints.isMedium
        ? Math.floor(width * 0.7)
        : breakpoints.isLarge
          ? Math.floor(width * 0.6)
          : Math.floor(width * 0.5);

  const cardHeight = breakpoints.isXSmall
    ? Math.floor(height * 0.3)
    : breakpoints.isSmall
      ? Math.floor(height * 0.35)
      : Math.floor(height * 0.4);

  // Layout configuration
  const layout = {
    cardWidth: Math.max(20, cardWidth), // Minimum 20 columns
    cardHeight: Math.max(6, cardHeight), // Minimum 6 rows
    maxCardsPerRow: breakpoints.isXSmall
      ? 1
      : breakpoints.isSmall
        ? 2
        : breakpoints.isMedium
          ? 2
          : breakpoints.isLarge
            ? 3
            : 4,
    padding: breakpoints.isXSmall ? 0 : 1,
    gap: breakpoints.isXSmall ? 0 : 1,
  };

  return layout;
};
