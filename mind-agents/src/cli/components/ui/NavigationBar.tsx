import { Box, Text } from 'ink';
import React from 'react';

import { TerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { cyberpunkTheme } from '../../themes/cyberpunk.js';

interface NavigationBarProps {
  navigation: any; // Would be properly typed with NavigationState
  dimensions: TerminalDimensions;
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showHelp: boolean;
  commandMode: boolean;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  navigation,
  dimensions,
  currentBreakpoint,
  showHelp,
  commandMode,
}) => {
  const { width, height } = dimensions;
  const { breadcrumbs, canGoBack } = navigation;

  return (
    <Box
      paddingX={1}
      borderStyle='single'
      borderColor={cyberpunkTheme.colors.primary}
      flexDirection='column'
    >
      <Box justifyContent='space-between'>
        {/* Left side - Breadcrumbs */}
        <Box flexGrow={1}>
          <Text color={cyberpunkTheme.colors.primary}>
            {breadcrumbs.map((crumb: any, i: number) => (
              <React.Fragment key={i}>
                {i > 0 && <Text color={cyberpunkTheme.colors.accent}> › </Text>}
                <Text
                  color={
                    i === breadcrumbs.length - 1
                      ? cyberpunkTheme.colors.accent
                      : cyberpunkTheme.colors.text
                  }
                  bold={i === breadcrumbs.length - 1}
                >
                  {crumb.label}
                </Text>
              </React.Fragment>
            ))}
          </Text>
        </Box>

        {/* Right side - Terminal info and status */}
        <Box gap={2}>
          {/* Terminal dimensions */}
          <Text color={cyberpunkTheme.colors.textDim}>
            {width}×{height} ({currentBreakpoint.toUpperCase()})
          </Text>

          {/* Mode indicators */}
          {commandMode && (
            <Text color={cyberpunkTheme.colors.warning} bold>
              [CMD]
            </Text>
          )}
          {showHelp && (
            <Text color={cyberpunkTheme.colors.accent} bold>
              [HELP]
            </Text>
          )}
        </Box>
      </Box>

      {/* Keyboard hints - only show in non-xs breakpoints */}
      {currentBreakpoint !== 'xs' && (
        <Box marginTop={0}>
          <Text color={cyberpunkTheme.colors.textDim}>
            {canGoBack && (
              <>
                <Text color={cyberpunkTheme.colors.accent}>[ESC]</Text> Back •
              </>
            )}
            <Text color={cyberpunkTheme.colors.accent}>[?]</Text> Help •
            <Text color={cyberpunkTheme.colors.accent}>[:]</Text> Command •
            <Text color={cyberpunkTheme.colors.accent}>[Ctrl+C]</Text> Exit
          </Text>
        </Box>
      )}
    </Box>
  );
};
