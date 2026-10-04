import { Box, BoxProps } from 'ink';
import React from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import {
  getResponsiveBoxModel,
  getResponsiveFlex,
  getResponsiveValue,
  shouldShowElement,
  ResponsiveValue,
  ResponsiveSpacing,
  getCurrentBreakpoint,
} from '../../utils/responsive-grid.js';

interface ResponsiveBoxProps
  extends Omit<
    BoxProps,
    | 'flexDirection'
    | 'justifyContent'
    | 'alignItems'
    | 'overflow'
    | 'overflowX'
    | 'overflowY'
    | 'padding'
    | 'paddingX'
    | 'paddingY'
    | 'paddingTop'
    | 'paddingBottom'
    | 'paddingLeft'
    | 'paddingRight'
    | 'margin'
    | 'marginX'
    | 'marginY'
    | 'marginTop'
    | 'marginBottom'
    | 'marginLeft'
    | 'marginRight'
    | 'gap'
    | 'minWidth'
    | 'maxWidth'
    | 'minHeight'
    | 'maxHeight'
  > {
  children: React.ReactNode;

  // Responsive spacing
  padding?: ResponsiveSpacing;
  paddingX?: ResponsiveSpacing;
  paddingY?: ResponsiveSpacing;
  paddingTop?: ResponsiveSpacing;
  paddingBottom?: ResponsiveSpacing;
  paddingLeft?: ResponsiveSpacing;
  paddingRight?: ResponsiveSpacing;

  margin?: ResponsiveSpacing;
  marginX?: ResponsiveSpacing;
  marginY?: ResponsiveSpacing;
  marginTop?: ResponsiveSpacing;
  marginBottom?: ResponsiveSpacing;
  marginLeft?: ResponsiveSpacing;
  marginRight?: ResponsiveSpacing;

  // Responsive flex
  direction?: ResponsiveValue<'row' | 'column'>;
  wrap?: ResponsiveValue<boolean>;
  justify?: ResponsiveValue<'start' | 'center' | 'end' | 'between' | 'around'>;
  align?: ResponsiveValue<'start' | 'center' | 'end' | 'stretch'>;
  gap?: ResponsiveSpacing;

  // Responsive display
  show?: ResponsiveValue<boolean>;
  hide?: ResponsiveValue<boolean>;

  // Size constraints
  minWidth?: ResponsiveValue<number>;
  maxWidth?: ResponsiveValue<number>;
  minHeight?: ResponsiveValue<number>;
  maxHeight?: ResponsiveValue<number>;

  // Overflow handling
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
}

export const ResponsiveBox: React.FC<ResponsiveBoxProps> = ({
  children,
  padding,
  paddingX,
  paddingY,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  margin,
  marginX,
  marginY,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  direction,
  wrap,
  justify,
  align,
  gap,
  show,
  hide,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  overflow = 'visible',
  overflowX,
  overflowY,
  ...restProps
}) => {
  const { dimensions, breakpoints } = useTerminalDimensions();

  // Handle visibility
  if (hide) {
    const shouldHide = Object.entries(hide).some(([breakpoint, value]) => {
      if (!value) return false;
      switch (breakpoint) {
        case 'xs':
          return breakpoints.isXSmall;
        case 'sm':
          return breakpoints.isSmall;
        case 'md':
          return breakpoints.isMedium;
        case 'lg':
          return breakpoints.isLarge;
        case 'xl':
          return breakpoints.isXLarge;
        default:
          return false;
      }
    });
    if (shouldHide) return null;
  }

  const currentBreakpoint = getCurrentBreakpoint(dimensions.width);
  if (show && !shouldShowElement(show, currentBreakpoint)) {
    return null;
  }

  // Calculate responsive padding
  const paddingModel = padding
    ? getResponsiveBoxModel(padding, undefined, currentBreakpoint)
    : {
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      };

  const computedPaddingTop =
    getResponsiveValue(paddingTop, currentBreakpoint) ??
    getResponsiveValue(paddingY, currentBreakpoint) ??
    paddingModel.paddingTop;
  const computedPaddingBottom =
    getResponsiveValue(paddingBottom, currentBreakpoint) ??
    getResponsiveValue(paddingY, currentBreakpoint) ??
    paddingModel.paddingBottom;
  const computedPaddingLeft =
    getResponsiveValue(paddingLeft, currentBreakpoint) ??
    getResponsiveValue(paddingX, currentBreakpoint) ??
    paddingModel.paddingLeft;
  const computedPaddingRight =
    getResponsiveValue(paddingRight, currentBreakpoint) ??
    getResponsiveValue(paddingX, currentBreakpoint) ??
    paddingModel.paddingRight;

  // Calculate responsive margin
  const marginModel = margin
    ? getResponsiveBoxModel(undefined, margin, currentBreakpoint)
    : {
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      };

  const computedMarginTop =
    getResponsiveValue(marginTop, currentBreakpoint) ??
    getResponsiveValue(marginY, currentBreakpoint) ??
    marginModel.marginTop;
  const computedMarginBottom =
    getResponsiveValue(marginBottom, currentBreakpoint) ??
    getResponsiveValue(marginY, currentBreakpoint) ??
    marginModel.marginBottom;
  const computedMarginLeft =
    getResponsiveValue(marginLeft, currentBreakpoint) ??
    getResponsiveValue(marginX, currentBreakpoint) ??
    marginModel.marginLeft;
  const computedMarginRight =
    getResponsiveValue(marginRight, currentBreakpoint) ??
    getResponsiveValue(marginX, currentBreakpoint) ??
    marginModel.marginRight;

  // Calculate responsive flex properties
  const flexProps = getResponsiveFlex(
    direction,
    justify,
    align,
    currentBreakpoint
  ) || {
    flexDirection: 'column',
    justifyContent: 'start',
    alignItems: 'stretch',
  };
  const computedGap = gap
    ? getResponsiveValue(gap, currentBreakpoint, 0) || 0
    : 0;

  // Map justify values to Ink's justifyContent
  const justifyContentMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
  } as const;

  // Map align values to Ink's alignItems
  const alignItemsMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  } as const;

  // Calculate size constraints
  const computedMinWidth = minWidth
    ? getResponsiveValue(minWidth, currentBreakpoint)
    : undefined;
  const computedMaxWidth = maxWidth
    ? getResponsiveValue(maxWidth, currentBreakpoint)
    : undefined;
  const computedMinHeight = minHeight
    ? getResponsiveValue(minHeight, currentBreakpoint)
    : undefined;
  const computedMaxHeight = maxHeight
    ? getResponsiveValue(maxHeight, currentBreakpoint)
    : undefined;

  // Handle overflow
  const handleOverflow = (content: React.ReactNode): React.ReactNode => {
    const effectiveOverflowX = overflowX || overflow;
    const effectiveOverflowY = overflowY || overflow;

    if (effectiveOverflowX === 'hidden' || effectiveOverflowY === 'hidden') {
      // In terminal, we can only truly hide overflow by limiting dimensions
      return (
        <Box
          width={computedMaxWidth}
          height={computedMaxHeight}
          flexGrow={0}
          flexShrink={0}
        >
          {content}
        </Box>
      );
    }

    return content;
  };

  const content = (
    <Box
      {...restProps}
      paddingTop={computedPaddingTop}
      paddingBottom={computedPaddingBottom}
      paddingLeft={computedPaddingLeft}
      paddingRight={computedPaddingRight}
      marginTop={computedMarginTop}
      marginBottom={computedMarginBottom}
      marginLeft={computedMarginLeft}
      marginRight={computedMarginRight}
      flexDirection={flexProps.flexDirection}
      flexWrap={
        wrap
          ? getResponsiveValue(wrap, currentBreakpoint)
            ? 'wrap'
            : 'nowrap'
          : 'nowrap'
      }
      justifyContent={
        justifyContentMap[
          flexProps.justifyContent as keyof typeof justifyContentMap
        ] || 'flex-start'
      }
      alignItems={
        alignItemsMap[flexProps.alignItems as keyof typeof alignItemsMap] ||
        'stretch'
      }
      gap={computedGap}
      minWidth={computedMinWidth}
      minHeight={computedMinHeight}
    >
      {children}
    </Box>
  );

  return handleOverflow(content);
};
