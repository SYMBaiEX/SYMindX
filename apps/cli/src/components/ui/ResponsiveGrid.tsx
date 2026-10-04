import { Box } from 'ink';
import React from 'react';

import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import {
  getResponsiveValue,
  getResponsiveColumns,
  ResponsiveValue,
  ResponsiveSpacing,
} from '../../utils/responsive-grid.js';

import { ResponsiveBox } from './ResponsiveBox.js';

interface ResponsiveGridProps {
  children: React.ReactNode;

  // Grid configuration
  columns?: ResponsiveValue<number>;
  rows?: ResponsiveValue<number>;
  gap?: ResponsiveSpacing;
  rowGap?: ResponsiveSpacing;
  columnGap?: ResponsiveSpacing;

  // Item sizing
  minItemWidth?: ResponsiveValue<number>;
  minItemHeight?: ResponsiveValue<number>;
  aspectRatio?: ResponsiveValue<number>;

  // Layout options
  autoFit?: boolean; // Automatically fit items
  autoFill?: boolean; // Fill available space
  placeItems?: 'start' | 'center' | 'end' | 'stretch';

  // Responsive behavior
  responsive?: boolean;
  maxColumns?: number;

  // Container props
  padding?: ResponsiveSpacing;
  fluid?: boolean; // Use full width
}

interface GridItemProps {
  children: React.ReactNode;
  span?: ResponsiveValue<number>; // Column span
  rowSpan?: ResponsiveValue<number>; // Row span
  order?: ResponsiveValue<number>; // Display order
  alignSelf?: 'start' | 'center' | 'end' | 'stretch';
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  span,
  rowSpan: _rowSpan,
  order: _order,
  alignSelf = 'stretch',
}) => {
  const { currentBreakpoint } = useTerminalDimensions();

  const computedSpan = span
    ? getResponsiveValue(span, currentBreakpoint, 1) || 1
    : 1;

  return (
    <Box
      flexGrow={typeof computedSpan === 'number' ? computedSpan : 1}
      flexBasis={0}
      alignSelf={
        alignSelf === 'end'
          ? 'flex-end'
          : alignSelf === 'start'
            ? 'flex-start'
            : alignSelf === 'center'
              ? 'center'
              : undefined
      }
      // Note: CSS Grid-like spanning isn't directly supported in Ink,
      // but we can simulate it with flex properties
    >
      {children}
    </Box>
  );
};

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns,
  rows,
  gap,
  rowGap,
  columnGap,
  minItemWidth,
  minItemHeight,
  aspectRatio: _aspectRatio,
  autoFit = false,
  autoFill = false,
  placeItems = 'stretch',
  responsive = true,
  maxColumns = 12,
  padding,
  fluid = false,
}) => {
  const { dimensions, breakpoints, currentBreakpoint } =
    useTerminalDimensions();

  // Calculate responsive values
  const computedColumns = columns
    ? getResponsiveColumns(breakpoints, columns)
    : undefined;
  const computedGap = gap
    ? getResponsiveValue(gap, currentBreakpoint, 1) || 1
    : 1;
  const computedRowGap = rowGap
    ? getResponsiveValue(rowGap, currentBreakpoint, computedGap) || computedGap
    : computedGap;
  const computedColumnGap = columnGap
    ? getResponsiveValue(columnGap, currentBreakpoint, computedGap) ||
      computedGap
    : computedGap;

  // Calculate grid configuration
  const availableWidth = dimensions.width - 4; // Account for padding
  const defaultColumns =
    computedColumns ||
    getResponsiveValue(
      {
        xs: 1,
        sm: 2,
        md: 3,
        lg: 4,
        xl: 6,
      },
      currentBreakpoint,
      3
    ) ||
    3;

  const itemMinWidth = minItemWidth
    ? getResponsiveValue(minItemWidth, currentBreakpoint, 20) || 20
    : 20;
  const itemMinHeight = minItemHeight
    ? getResponsiveValue(minItemHeight, currentBreakpoint, 6) || 6
    : 6;

  const actualColumns =
    responsive && (autoFit || autoFill)
      ? Math.min(
          maxColumns,
          Math.max(
            1,
            Math.floor(
              availableWidth /
                (itemMinWidth +
                  (typeof computedGap === 'number' ? computedGap : 1))
            )
          )
        )
      : defaultColumns;

  const gridConfig = {
    columns: actualColumns,
    rows: rows ? getResponsiveValue(rows, currentBreakpoint, 1) || 1 : 1,
    gap: computedGap,
    padding: padding
      ? getResponsiveValue(padding, currentBreakpoint, 0) || 0
      : 0,
    itemWidth: Math.floor(
      (availableWidth -
        (actualColumns - 1) *
          (typeof computedGap === 'number' ? computedGap : 1)) /
        actualColumns
    ),
    itemHeight: itemMinHeight,
    itemMinWidth,
    itemMinHeight,
  };

  // Convert children to array and filter out nulls
  const items = React.Children.toArray(children).filter(
    (child) => child !== null
  );

  // Group items into rows
  const itemsPerRow =
    typeof gridConfig.columns === 'number' ? gridConfig.columns : 1;
  const rowCount = Math.ceil(items.length / itemsPerRow);
  const itemRows: React.ReactNode[][] = [];

  for (let i = 0; i < rowCount; i++) {
    const rowItems = items.slice(i * itemsPerRow, (i + 1) * itemsPerRow);
    itemRows.push(rowItems);
  }

  // Calculate item dimensions if using auto-sizing
  const itemDimensions =
    (autoFit || autoFill) && responsive
      ? items.map(() => ({
          width: gridConfig.itemWidth || 20,
          height: gridConfig.itemHeight || 6,
        }))
      : null;

  // Render grid rows
  return (
    <ResponsiveBox
      direction='column'
      gap={typeof computedRowGap === 'number' ? computedRowGap : 1}
      padding={
        padding ? getResponsiveValue(padding, currentBreakpoint, 0) || 0 : 0
      }
      {...(fluid && dimensions.width && { width: dimensions.width })}
    >
      {itemRows.map((row, rowIndex) => (
        <Box
          key={`row-${rowIndex}`}
          flexDirection='row'
          gap={typeof computedColumnGap === 'number' ? computedColumnGap : 1}
          justifyContent={
            placeItems === 'start'
              ? 'flex-start'
              : placeItems === 'center'
                ? 'center'
                : placeItems === 'end'
                  ? 'flex-end'
                  : 'space-between'
          }
          alignItems={
            placeItems === 'start'
              ? 'flex-start'
              : placeItems === 'center'
                ? 'center'
                : placeItems === 'end'
                  ? 'flex-end'
                  : 'stretch'
          }
        >
          {row.map((item, itemIndex) => {
            const globalIndex = rowIndex * itemsPerRow + itemIndex;
            const itemDims =
              itemDimensions && itemDimensions[globalIndex]
                ? itemDimensions[globalIndex]
                : null;

            if (itemDims && (autoFit || autoFill)) {
              // Auto-sized items
              return (
                <Box
                  key={`item-${rowIndex}-${itemIndex}`}
                  width={itemDims.width}
                  height={itemDims.height}
                  flexShrink={0}
                >
                  {item}
                </Box>
              );
            } else {
              // Flex-based items
              return (
                <Box key={`item-${rowIndex}-${itemIndex}`} flexGrow={1} flexBasis={0} flexShrink={1}>
                  {item}
                </Box>
              );
            }
          })}

          {/* Fill empty cells if needed */}
          {autoFill &&
            row.length < itemsPerRow &&
            Array.from({ length: Math.max(0, itemsPerRow - row.length) }).map(
              (_, i) => <Box key={`empty-${rowIndex}-${i}`} flexGrow={1} flexBasis={0} />
            )}
        </Box>
      ))}
    </ResponsiveBox>
  );
};

// Export GridItem as a property of ResponsiveGrid for convenience
(ResponsiveGrid as any).Item = GridItem;
