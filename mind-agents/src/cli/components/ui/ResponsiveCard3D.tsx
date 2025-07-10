import { Box, Text } from 'ink';
import React from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { cyberpunkTheme } from '../../themes/cyberpunk.js';
import { 
  getResponsiveValue,
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveSpacing,
  responsiveTruncate,
  ResponsiveValue,
} from '../../utils/responsive-grid.js';

interface ResponsiveCard3DProps {
  title: string;
  children: React.ReactNode;
  width?: ResponsiveValue<number | 'auto' | 'full'>;
  height?: ResponsiveValue<number | 'auto'>;
  span?: ResponsiveValue<number>; // Grid span
  color?: string;
  glowColor?: string;
  animated?: boolean;
  responsive?: boolean;
}

export const ResponsiveCard3D: React.FC<ResponsiveCard3DProps> = ({
  title,
  children,
  width,
  height,
  span: _span,
  color = cyberpunkTheme.colors.primary,
  glowColor = cyberpunkTheme.colors.glow,
  animated = false,
  responsive = true,
}) => {
  const { dimensions, breakpoints, currentBreakpoint } = useTerminalDimensions();
  const spacing = getResponsiveSpacing(1, currentBreakpoint);
  
  // Calculate responsive dimensions
  const getWidth = (): number => {
    if (!responsive || !width) {
      return 30; // Default width
    }
    
    if (typeof width === 'object' || width === 'auto' || width === 'full') {
      if (width === 'full') {
        return dimensions.width - (spacing * 2);
      }
      if (width === 'auto') {
        const autoWidth = getResponsiveWidth('auto', dimensions.width, currentBreakpoint);
        return typeof autoWidth === 'number' ? autoWidth : 30;
      }
      const numericWidth = getResponsiveValue(width, currentBreakpoint, 40) || 40;
      return typeof numericWidth === 'number' ? numericWidth : 40;
    }
    
    return typeof width === 'number' ? width : 30;
  };
  
  const getHeight = (): number => {
    if (!responsive || !height) {
      return 10; // Default height
    }
    
    if (typeof height === 'object' || height === 'auto') {
      if (height === 'auto') {
        const autoHeight = getResponsiveHeight('auto', dimensions.height, currentBreakpoint);
        return typeof autoHeight === 'number' ? autoHeight : 10;
      }
      const numericHeight = getResponsiveValue(height, currentBreakpoint, 10) || 10;
      return typeof numericHeight === 'number' ? numericHeight : 10;
    }
    
    return typeof height === 'number' ? height : 10;
  };
  
  const cardWidth = getWidth();
  const cardHeight = getHeight();
  
  // Responsive depth effect
  const depth = getResponsiveValue({
    xs: 0,
    sm: 1,
    md: 2,
    lg: 2,
    xl: 3,
  }, currentBreakpoint, 2);
  
  // Responsive text sizing
  const titleMaxWidth = cardWidth - 6; // Account for borders and padding
  const truncatedTitle = responsiveTruncate(title, titleMaxWidth, currentBreakpoint);
  
  // Create 3D effect with offset shadows
  const depthValue = depth || 0;
  const depthChar = depthValue > 0 ? '│' : '';
  const depthCorner = depthValue > 0 ? '╱' : '';
  
  // Calculate padding for content
  const contentWidth = Math.max(10, cardWidth - 4); // Account for borders and padding
  
  // Top face of the 3D box
  const topLine = ' '.repeat(depthValue) + '╔' + '═'.repeat(Math.max(0, cardWidth - 2)) + '╗';
  
  // Depth lines for 3D effect
  const depthLines = depthValue > 0 ? Array.from({ length: depthValue - 1 }, (_, i) => {
    const spaces = depthValue - i - 1;
    return ' '.repeat(spaces) + depthCorner + ' '.repeat(Math.max(0, cardWidth - 2)) + depthCorner;
  }) : [];
  
  // Title bar
  const titleBar = `║ ${truncatedTitle.padEnd(Math.max(0, cardWidth - 4))} ║${depthChar}`;
  const titleSeparator = `╠${'═'.repeat(Math.max(0, cardWidth - 2))}╣${depthChar}`;
  
  // Bottom of the box
  const bottomLine = `╚${'═'.repeat(Math.max(0, cardWidth - 2))}╝${depthChar}`;
  const bottomDepth = depthValue > 0 ? ' '.repeat(1) + '╲' + '_'.repeat(Math.max(0, cardWidth - 2)) + '╱' : '';
  
  // Scale font size based on breakpoint
  const useCompactMode = breakpoints.isXSmall || breakpoints.isSmall;
  
  return (
    <Box flexDirection="column">
      {/* Top 3D effect */}
      {!useCompactMode && (
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
      <Box flexDirection="column" minHeight={Math.max(1, cardHeight - 4)}>
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
      {!useCompactMode && depthValue > 0 && (
        <Text color={cyberpunkTheme.colors.borderDim}>{bottomDepth}</Text>
      )}
      
      {/* Glow effect (simulated with colored text) */}
      {animated && !useCompactMode && (
        <Box marginTop={-1}>
          <Text color={glowColor} dimColor>
            {' '.repeat(Math.max(0, depthValue)) + '─'.repeat(Math.max(0, cardWidth - 2))}
          </Text>
        </Box>
      )}
    </Box>
  );
};