import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'

interface ChartProps {
  data: number[]
  width?: number
  height?: number
  title?: string
  color?: string
  showAxes?: boolean
  animated?: boolean
  type?: 'line' | 'bar' | 'area'
}

export const Chart: React.FC<ChartProps> = ({
  data,
  width = 40,
  height = 10,
  title,
  color = cyberpunkTheme.colors.primary,
  showAxes = true,
  animated = true,
  type = 'line',
}) => {
  const [displayData, setDisplayData] = useState<number[]>([])
  const [animationStep, setAnimationStep] = useState(0)
  
  // Animate data reveal
  useEffect(() => {
    if (!animated) {
      setDisplayData(data)
      return
    }
    
    const interval = setInterval(() => {
      setAnimationStep(prev => {
        if (prev >= data.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 50)
    
    return () => clearInterval(interval)
  }, [data, animated])
  
  useEffect(() => {
    setDisplayData(data.slice(0, animationStep))
  }, [animationStep, data])
  
  // Normalize data to fit in chart height
  const maxValue = Math.max(...data, 1)
  const minValue = Math.min(...data, 0)
  const range = maxValue - minValue || 1
  
  const normalizeValue = (value: number): number => {
    return Math.round(((value - minValue) / range) * (height - 1))
  }
  
  // Create chart grid
  const createGrid = (): string[][] => {
    const grid: string[][] = Array(height).fill(null).map(() => 
      Array(width).fill(' ')
    )
    
    // Draw axes if enabled
    if (showAxes) {
      // Y-axis
      for (let y = 0; y < height; y++) {
        grid[y][0] = '│'
      }
      // X-axis
      for (let x = 0; x < width; x++) {
        grid[height - 1][x] = '─'
      }
      // Origin
      grid[height - 1][0] = '└'
    }
    
    return grid
  }
  
  // Plot data on grid
  const plotData = (grid: string[][]): void => {
    const startX = showAxes ? 2 : 0
    const availableWidth = width - (showAxes ? 2 : 0)
    const step = Math.max(1, Math.floor(displayData.length / availableWidth))
    
    for (let i = 0; i < displayData.length && (i / step) < availableWidth; i += step) {
      const x = startX + Math.floor(i / step)
      const y = height - 1 - normalizeValue(displayData[i])
      
      if (x < width && y >= 0 && y < height) {
        switch (type) {
          case 'line':
            // Connect points with line characters
            if (i > 0 && i - step < displayData.length) {
              const prevY = height - 1 - normalizeValue(displayData[i - step])
              if (prevY === y) {
                grid[y][x] = '─'
              } else if (prevY < y) {
                grid[y][x] = '╱'
              } else {
                grid[y][x] = '╲'
              }
            }
            grid[y][x] = '●'
            break
            
          case 'bar':
            // Draw vertical bars
            for (let barY = height - 1; barY >= y; barY--) {
              if (barY === height - 1 && showAxes) continue
              grid[barY][x] = '█'
            }
            break
            
          case 'area':
            // Fill area under the line
            for (let fillY = height - 1; fillY >= y; fillY--) {
              if (fillY === height - 1 && showAxes) continue
              const intensity = (height - 1 - fillY) / (height - 1 - y)
              if (intensity < 0.3) grid[fillY][x] = '░'
              else if (intensity < 0.6) grid[fillY][x] = '▒'
              else if (intensity < 0.9) grid[fillY][x] = '▓'
              else grid[fillY][x] = '█'
            }
            break
        }
      }
    }
  }
  
  // Render the chart
  const grid = createGrid()
  plotData(grid)
  
  // Add value labels
  const maxLabel = maxValue.toFixed(0)
  const minLabel = minValue.toFixed(0)
  
  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text color={color} bold>{title}</Text>
        </Box>
      )}
      
      <Box flexDirection="row">
        {/* Y-axis labels */}
        {showAxes && (
          <Box flexDirection="column" marginRight={1}>
            <Text color={cyberpunkTheme.colors.textDim}>{maxLabel}</Text>
            <Box flexGrow={1} />
            <Text color={cyberpunkTheme.colors.textDim}>{minLabel}</Text>
          </Box>
        )}
        
        {/* Chart grid */}
        <Box flexDirection="column">
          {grid.map((row, y) => (
            <Text key={y}>
              {row.map((cell, x) => {
                const isAxis = showAxes && (x === 0 || y === height - 1)
                const isData = !isAxis && cell !== ' '
                
                if (isAxis) {
                  return (
                    <Text key={x} color={cyberpunkTheme.colors.border}>
                      {cell}
                    </Text>
                  )
                } else if (isData) {
                  return (
                    <Text key={x} color={color}>
                      {cell}
                    </Text>
                  )
                } else {
                  return <Text key={x}> </Text>
                }
              })}
            </Text>
          ))}
        </Box>
      </Box>
      
      {/* X-axis label */}
      {showAxes && (
        <Box marginTop={1} marginLeft={showAxes ? 4 : 0}>
          <Text color={cyberpunkTheme.colors.textDim}>
            {animated ? `Time (${displayData.length}/${data.length} points)` : 'Time'}
          </Text>
        </Box>
      )}
    </Box>
  )
}