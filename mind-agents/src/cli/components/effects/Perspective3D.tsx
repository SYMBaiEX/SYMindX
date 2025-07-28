import { Box, Text } from 'ink';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface Perspective3DProps {
  children: string;
  variant?: 'rotate' | 'flip' | 'cube' | 'pyramid' | 'tunnel' | 'grid';
  speed?: number;
  depth?: number;
  color?: string;
  wireframe?: boolean;
  animated?: boolean;
}

export const Perspective3D: React.FC<Perspective3DProps> = ({
  children,
  variant = 'rotate',
  speed = 100,
  depth = 3,
  color,
  wireframe = false,
  animated = true,
}) => {
  const [rotation, setRotation] = useState(0);
  const [flipAngle, setFlipAngle] = useState(0);
  const theme = themeEngine.getTheme();
  const defaultColor = useMemo(() => color || theme.colors.primary, [color, theme.colors.primary]);

  // Animation logic
  useEffect(() => {
    if (!animated || !themeEngine.areAnimationsEnabled()) return;

    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
      setFlipAngle((prev) => (prev + 2) % 360);
    }, speed);

    return (): void => clearInterval(interval);
  }, [animated, speed]);

  // 3D transformation matrices (simplified for ASCII)
  const get3DTransform = useCallback((angle: number): { x: number; y: number; z: number } => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad),
      y: Math.sin(rad),
      z: Math.sin(rad * 0.5),
    };
  }, []);

  const renderRotating3D = useCallback((): React.ReactNode => {
    const transform = get3DTransform(rotation);
    const layers = [];

    // Create depth layers
    for (let z = 0; z < depth; z++) {
      const opacity = 1 - z * 0.3;
      const offset = Math.floor(transform.x * z * 2);

      layers.push(
        <Box key={`layer-${z}-${offset}-${opacity}`} marginLeft={Math.abs(offset)} marginTop={z > 0 ? -1 : 0}>
          <Text color={defaultColor} dimColor={opacity < 0.7} bold={z === 0}>
            {children}
          </Text>
        </Box>
      );
    }

    return <Box flexDirection='column'>{layers}</Box>;
  }, [get3DTransform, rotation, depth, defaultColor, children]);

  const renderFlipping3D = useCallback((): React.ReactNode => {
    const transform = get3DTransform(flipAngle);
    const isFlipped = Math.abs(transform.x) < 0.5;

    if (isFlipped) {
      // Show back side
      const reversed = children.split('').reverse().join('');
      return (
        <Box>
          <Text color={theme.colors.textDim} dimColor>
            {reversed}
          </Text>
        </Box>
      );
    }

    // Show front side with perspective
    const scaleX = Math.abs(transform.x);
    const compressed = children
      .split('')
      .map((char, i) => {
        if (i % Math.floor(1 / scaleX + 1) !== 0) return '';
        return char;
      })
      .join('');

    return (
      <Box>
        <Text color={defaultColor} bold={scaleX > 0.8}>
          {compressed || children}
        </Text>
      </Box>
    );
  }, [get3DTransform, flipAngle, children, theme.colors.textDim, defaultColor]);

  // Cube faces (memoized outside of callback)
  const cubeFaces = useMemo(() => ({
    front: children,
    back: children.split('').reverse().join(''),
    top: '▀'.repeat(children.length),
    bottom: '▄'.repeat(children.length),
    left: '▐',
    right: '▌',
  }), [children]);

  const renderCube3D = useCallback((): React.ReactNode => {
    const transform = get3DTransform(rotation);

    // Determine visible faces based on rotation
    const visibleFaces = [];

    if (transform.x > 0) {
      visibleFaces.push('front');
    } else {
      visibleFaces.push('back');
    }

    if (transform.y > 0) {
      visibleFaces.push('right');
    } else {
      visibleFaces.push('left');
    }

    // Render cube with wireframe or solid
    return (
      <Box flexDirection='column'>
        <Box>
          <Text color={theme.colors.borderDim}>╱</Text>
          <Text color={theme.colors.border}>{cubeFaces.top}</Text>
          <Text color={theme.colors.borderDim}>╲</Text>
        </Box>
        <Box>
          <Text color={theme.colors.border}>▐</Text>
          <Text color={defaultColor} bold>
            {visibleFaces.includes('front') ? cubeFaces.front : cubeFaces.back}
          </Text>
          <Text color={theme.colors.border}>▌</Text>
        </Box>
        <Box>
          <Text color={theme.colors.borderDim}>╲</Text>
          <Text color={theme.colors.border}>{cubeFaces.bottom}</Text>
          <Text color={theme.colors.borderDim}>╱</Text>
        </Box>
      </Box>
    );
  }, [get3DTransform, rotation, cubeFaces, theme.colors.borderDim, theme.colors.border, defaultColor]);

  const renderPyramid3D = useCallback((): React.ReactNode => {
    const height = 5;
    const maxWidth = children.length + 4;

    const layers = [];

    for (let i = 0; i < height; i++) {
      const width = Math.floor((i / height) * maxWidth);
      const padding = Math.floor((maxWidth - width) / 2);

      if (i === height - 1) {
        // Base layer with text
        layers.push(
          <Box key={`pyramid-base-${i}-${width}-${padding}`}>
            <Text color={theme.colors.border}>{'_'.repeat(padding)}</Text>
            <Text color={defaultColor} bold>
              {children}
            </Text>
            <Text color={theme.colors.border}>{'_'.repeat(padding)}</Text>
          </Box>
        );
      } else {
        // Pyramid layers
        const sideChar = wireframe ? '╱' : '▓';
        layers.push(
          <Box key={`pyramid-layer-${i}-${width}-${padding}`} marginLeft={padding}>
            <Text color={theme.colors.border}>{sideChar}</Text>
            <Text color={theme.colors.borderDim}>
              {' '.repeat(Math.max(0, width - 2))}
            </Text>
            <Text color={theme.colors.border}>╲</Text>
          </Box>
        );
      }
    }

    return (
      <Box flexDirection='column' alignItems='center'>
        <Text color={theme.colors.accent}>▲</Text>
        {layers}
      </Box>
    );
  }, [children, wireframe, theme.colors.border, theme.colors.borderDim, theme.colors.accent, defaultColor]);

  const renderTunnel3D = useCallback((): React.ReactNode => {
    const tunnelDepth = 5;
    const perspective = [];

    for (let z = 0; z < tunnelDepth; z++) {
      const scale = 1 - (z / tunnelDepth) * 0.8;
      const size = Math.floor(children.length * scale);
      const offset = Math.floor((children.length - size) / 2);

      const frameChars = z === 0 ? ['┌', '┐', '└', '┘'] : ['╔', '╗', '╚', '╝'];

      perspective.push(
        <Box key={`tunnel-layer-${z}-${size}-${offset}`} flexDirection='column' marginLeft={offset}>
          <Box>
            <Text color={theme.colors.border} dimColor={z > 2}>
              {frameChars[0] + '─'.repeat(size) + frameChars[1]}
            </Text>
          </Box>
          {z === tunnelDepth - 1 && (
            <Box>
              <Text color={theme.colors.border} dimColor>
                │
              </Text>
              <Text color={defaultColor}>{children.substring(0, size)}</Text>
              <Text color={theme.colors.border} dimColor>
                │
              </Text>
            </Box>
          )}
          <Box>
            <Text color={theme.colors.border} dimColor={z > 2}>
              {frameChars[2] + '─'.repeat(size) + frameChars[3]}
            </Text>
          </Box>
        </Box>
      );
    }

    return <Box flexDirection='column'>{perspective}</Box>;
  }, [children, theme.colors.border, defaultColor]);

  const renderGrid3D = useCallback((): React.ReactNode => {
    const gridSize = 7;
    // const _transform = get3DTransform(rotation) // Unused in current implementation

    const grid = [];

    for (let y = 0; y < gridSize; y++) {
      const row = [];

      for (let x = 0; x < gridSize; x++) {
        // Calculate 3D perspective distortion
        const centerX = gridSize / 2;
        const centerY = gridSize / 2;
        const distX = (x - centerX) / centerX;
        const distY = (y - centerY) / centerY;

        // Place text in center of grid
        if (x === Math.floor(centerX) && y === Math.floor(centerY)) {
          row.push(
            <Text key={`grid-center-${x}-${y}`} color={defaultColor} bold>
              {children.substring(0, 5)}
            </Text>
          );
        } else {
          // Grid lines with perspective
          const gridChar = wireframe
            ? x % 2 === 0 || y % 2 === 0
              ? '·'
              : ' '
            : '░';

          row.push(
            <Text
              key={`grid-cell-${x}-${y}-${gridChar}`}
              color={theme.colors.borderDim}
              dimColor={Math.abs(distX) > 0.5 || Math.abs(distY) > 0.5}
            >
              {gridChar}
            </Text>
          );
        }
      }

      grid.push(<Box key={`grid-row-${y}`}>{row}</Box>);
    }

    return <Box flexDirection='column'>{grid}</Box>;
  }, [children, wireframe, defaultColor, theme.colors.borderDim]);

  const render3DEffect = useCallback((): React.ReactNode => {
    switch (variant) {
      case 'rotate':
        return renderRotating3D();
      case 'flip':
        return renderFlipping3D();
      case 'cube':
        return renderCube3D();
      case 'pyramid':
        return renderPyramid3D();
      case 'tunnel':
        return renderTunnel3D();
      case 'grid':
        return renderGrid3D();
      default:
        return renderRotating3D();
    }
  }, [variant, renderRotating3D, renderFlipping3D, renderCube3D, renderPyramid3D, renderTunnel3D, renderGrid3D]);

  return render3DEffect();
};
