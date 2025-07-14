import { Box, Text } from 'ink';
import React, { useState, useEffect, useRef } from 'react';

import { themeEngine } from '../../themes/ThemeEngine.js';

interface ViewTransitionProps {
  children: React.ReactNode;
  transitionKey: string;
  variant?:
    | 'fade'
    | 'slide'
    | 'zoom'
    | 'flip'
    | 'dissolve'
    | 'glitch'
    | 'matrix';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
}

export const ViewTransition: React.FC<ViewTransitionProps> = ({
  children,
  transitionKey,
  variant = 'fade',
  direction = 'right',
  duration = 300,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(1);
  const [currentContent, setCurrentContent] = useState(children);
  const [nextContent, setNextContent] = useState<React.ReactNode>(null);
  const previousKey = useRef(transitionKey);
  const theme = themeEngine.getTheme();

  // Handle transition when key changes
  useEffect(() => {
    if (
      previousKey.current !== transitionKey &&
      themeEngine.areAnimationsEnabled()
    ) {
      setIsTransitioning(true);
      setNextContent(children);
      setProgress(0);

      const startTime = Date.now();
      const animate = (): void => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / duration, 1);

        setProgress(easeInOutCubic(newProgress));

        if (newProgress < 1) {
          (global as any).requestAnimationFrame?.(animate);
        } else {
          setIsTransitioning(false);
          setCurrentContent(children);
          setNextContent(null);
          previousKey.current = transitionKey;
        }
      };

      (global as any).requestAnimationFrame?.(animate);
    } else {
      setCurrentContent(children);
      previousKey.current = transitionKey;
    }
  }, [transitionKey, children, duration]);

  // Easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Render transition effect
  const renderTransition = (): React.ReactNode => {
    if (!isTransitioning) {
      return <Box>{currentContent}</Box>;
    }

    switch (variant) {
      case 'fade':
        return renderFadeTransition();
      case 'slide':
        return renderSlideTransition();
      case 'zoom':
        return renderZoomTransition();
      case 'flip':
        return renderFlipTransition();
      case 'dissolve':
        return renderDissolveTransition();
      case 'glitch':
        return renderGlitchTransition();
      case 'matrix':
        return renderMatrixTransition();
      default:
        return <Box>{currentContent}</Box>;
    }
  };

  const renderFadeTransition = (): React.ReactNode => {
    const showNext = progress > 0.5;

    return <Box>{showNext ? nextContent : currentContent}</Box>;
  };

  const renderSlideTransition = (): React.ReactNode => {
    const offset = Math.floor((1 - progress) * 20);

    let marginProps = {};
    switch (direction) {
      case 'left':
        marginProps = { marginLeft: -offset };
        break;
      case 'right':
        marginProps = { marginLeft: offset };
        break;
      case 'up':
        marginProps = { marginTop: -Math.floor(offset / 4) };
        break;
      case 'down':
        marginProps = { marginTop: Math.floor(offset / 4) };
        break;
    }

    return (
      <Box>
        {progress < 0.5 ? (
          <Box {...marginProps}>{currentContent}</Box>
        ) : (
          <Box {...(progress < 1 ? marginProps : {})}>{nextContent}</Box>
        )}
      </Box>
    );
  };

  const renderZoomTransition = (): React.ReactNode => {
    const scale = progress < 0.5 ? 1 - progress : progress;
    const showNext = progress > 0.5;

    // Simulate zoom with ASCII art borders
    const zoomLevel = Math.floor(scale * 3);
    const zoomChars = ['▪', '▫', '□', '▢'];

    return (
      <Box flexDirection='column' alignItems='center'>
        {zoomLevel > 0 && (
          <Text color={theme.colors.borderDim}>{zoomChars[zoomLevel]}</Text>
        )}
        <Box>
          {zoomLevel > 0 && (
            <Text color={theme.colors.borderDim}>{zoomChars[zoomLevel]}</Text>
          )}
          {showNext ? nextContent : currentContent}
          {zoomLevel > 0 && (
            <Text color={theme.colors.borderDim}>{zoomChars[zoomLevel]}</Text>
          )}
        </Box>
        {zoomLevel > 0 && (
          <Text color={theme.colors.borderDim}>{zoomChars[zoomLevel]}</Text>
        )}
      </Box>
    );
  };

  const renderFlipTransition = (): React.ReactNode => {
    const flipProgress = progress * 180;
    const isFlipped = flipProgress > 90;

    // Simulate 3D flip with character compression
    const compressionFactor = Math.abs(
      Math.cos((flipProgress * Math.PI) / 180)
    );

    return (
      <Box>
        {!isFlipped ? (
          <Box width={Math.floor(50 * compressionFactor)}>{currentContent}</Box>
        ) : (
          <Box width={Math.floor(50 * compressionFactor)}>{nextContent}</Box>
        )}
      </Box>
    );
  };

  const renderDissolveTransition = (): React.ReactNode => {
    const dissolveChars = ['█', '▓', '▒', '░', ' '];
    const dissolveIndex = Math.floor(progress * dissolveChars.length);

    // Create dissolve overlay
    const overlay = Array(5)
      .fill(null)
      .map(() =>
        Array(20)
          .fill(null)
          .map(() => {
            const rand = Math.random();
            if (rand < progress) {
              return dissolveChars[
                Math.min(dissolveIndex, dissolveChars.length - 1)
              ];
            }
            return ' ';
          })
          .join('')
      );

    return (
      <Box flexDirection='column'>
        {progress < 0.5 ? currentContent : nextContent}
        {progress > 0.2 && progress < 0.8 && (
          <Box flexDirection='column' marginTop={-5}>
            {overlay.map((line, i) => (
              <Text key={`glitch-line-${i}-${line}`} color={theme.colors.glitch}>
                {line}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderGlitchTransition = (): React.ReactNode => {
    const glitchIntensity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    const showNext = progress > 0.5;

    // Generate glitch artifacts
    const glitchArtifacts = [];
    if (glitchIntensity > 0.3) {
      for (let i = 0; i < 3; i++) {
        const glitchChars = '▓▒░█▄▀■□▢▣▤▥▦▧▨▩▪▫';
        const artifact = Array(10)
          .fill(null)
          .map(
            () => glitchChars[Math.floor(Math.random() * glitchChars.length)]
          )
          .join('');

        glitchArtifacts.push(
          <Box key={`glitch-artifact-${i}`} marginTop={-1}>
            <Text color={theme.colors.glitch}>{artifact}</Text>
          </Box>
        );
      }
    }

    return (
      <Box flexDirection='column'>
        {showNext ? nextContent : currentContent}
        {glitchArtifacts}
      </Box>
    );
  };

  const renderMatrixTransition = (): React.ReactNode => {
    const matrixDensity = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    const showNext = progress > 0.5;

    // Generate matrix rain overlay
    const matrixOverlay = [];
    if (matrixDensity > 0.2) {
      const matrixChars =
        'アイウエオカキクケコサシスセソタチツテトナニヌネノ01';
      for (let i = 0; i < Math.floor(matrixDensity * 5); i++) {
        const line = Array(30)
          .fill(null)
          .map(() =>
            Math.random() < matrixDensity
              ? matrixChars[Math.floor(Math.random() * matrixChars.length)]
              : ' '
          )
          .join('');

        matrixOverlay.push(
          <Text key={`matrix-overlay-${i}`} color={theme.colors.matrix} dimColor>
            {line}
          </Text>
        );
      }
    }

    return (
      <Box flexDirection='column'>
        {showNext ? nextContent : currentContent}
        {matrixOverlay.length > 0 && (
          <Box flexDirection='column' marginTop={-matrixOverlay.length}>
            {matrixOverlay}
          </Box>
        )}
      </Box>
    );
  };

  return renderTransition();
};
