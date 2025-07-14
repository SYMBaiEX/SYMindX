import { Box, Text } from 'ink';
import React, { Component, ReactNode } from 'react';

import { LoadingIndicator } from './LoadingStates.js';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
  enableRetry?: boolean;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });

    // Wait a bit before retrying
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
      isRetrying: false,
    });

    // Call onRetry callback if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  override render() {
    const {
      children,
      fallback,
      enableRetry = true,
      showDetails = process.env.NODE_ENV !== 'production',
    } = this.props;

    const { hasError, error, errorInfo, retryCount, isRetrying } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI
      return (
        <Box flexDirection='column' padding={1}>
          <Box
            flexDirection='column'
            borderStyle='round'
            borderColor='red'
            padding={1}
          >
            {/* Error Header */}
            <Box marginBottom={1}>
              <Text color='red' bold>
                ⚠️ An error occurred
              </Text>
            </Box>

            {/* Error Message */}
            <Box marginBottom={1}>
              <Text color='yellow'>
                {error.message || 'Something went wrong'}
              </Text>
            </Box>

            {/* Error Details (Development Only) */}
            {showDetails && errorInfo && (
              <Box flexDirection='column' marginBottom={1}>
                <Text color='gray' dimColor>
                  Component Stack:
                </Text>
                <Box marginLeft={2}>
                  <Text color='gray' wrap='truncate-end'>
                    {errorInfo.componentStack
                      ? errorInfo.componentStack
                          .split('\n')
                          .slice(0, 3)
                          .join('\n')
                      : 'No stack trace available'}
                  </Text>
                </Box>
              </Box>
            )}

            {/* Retry Information */}
            {retryCount > 0 && (
              <Box marginBottom={1}>
                <Text color='gray'>Retry attempts: {retryCount}</Text>
              </Box>
            )}

            {/* Action Buttons */}
            {enableRetry && (
              <Box marginTop={1}>
                {isRetrying ? (
                  <LoadingIndicator
                    text='Retrying'
                    variant='dots'
                    color='cyan'
                  />
                ) : (
                  <Text color='cyan'>
                    Press <Text bold>R</Text> to retry or <Text bold>Q</Text> to
                    quit
                  </Text>
                )}
              </Box>
            )}
          </Box>

          {/* Additional Help Text */}
          <Box marginTop={1}>
            <Text color='gray' dimColor>
              If this error persists, please check your configuration and try
              again.
            </Text>
          </Box>
        </Box>
      );
    }

    return <>{children}</>;
  }
}

/**
 * Error fallback component for specific error types
 */
interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  title?: string;
  showStack?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  showStack = false,
}) => {
  return (
    <Box flexDirection='column' padding={1}>
      <Box borderStyle='round' borderColor='red' padding={1}>
        <Box flexDirection='column'>
          <Text color='red' bold>
            {title}
          </Text>
          <Text color='yellow'>{error.message}</Text>

          {showStack && error.stack && (
            <Box marginTop={1}>
              <Text color='gray' dimColor wrap='truncate-end'>
                {error.stack.split('\n').slice(1, 4).join('\n')}
              </Text>
            </Box>
          )}

          {resetError && (
            <Box marginTop={1}>
              <Text color='cyan'>
                Press <Text bold>Enter</Text> to try again
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Network error fallback component
 */
interface NetworkErrorFallbackProps {
  error: Error;
  endpoint?: string;
  onRetry?: () => void;
}

export const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({
  error,
  endpoint,
  onRetry,
}) => {
  const [retrying, _setRetrying] = React.useState(false);

  // const _handleRetry = async () => {
  //   if (onRetry) {
  //     setRetrying(true);
  //     try {
  //       await onRetry();
  //     } finally {
  //       setRetrying(false);
  //     }
  //   }
  // }; // Unused in current implementation

  // Retry functionality handled by UI interactions

  return (
    <Box flexDirection='column' padding={1}>
      <Box borderStyle='round' borderColor='yellow' padding={1}>
        <Box flexDirection='column'>
          <Text color='yellow' bold>
            🌐 Connection Error
          </Text>

          <Box marginTop={1}>
            <Text>Unable to connect to the runtime API</Text>
          </Box>

          {endpoint && (
            <Box marginTop={1}>
              <Text color='gray'>Endpoint: {endpoint}</Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text color='gray' dimColor>
              {error.message}
            </Text>
          </Box>

          <Box marginTop={1}>
            {retrying ? (
              <LoadingIndicator
                text='Reconnecting'
                variant='dots'
                color='cyan'
              />
            ) : onRetry ? (
              <Text color='cyan'>
                Press <Text bold>R</Text> to retry
              </Text>
            ) : (
              <Text color='gray'>Check connection and try again</Text>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Timeout error fallback component
 */
interface TimeoutErrorFallbackProps {
  onRetry: () => void;
  timeout: number;
}

export const TimeoutErrorFallback: React.FC<TimeoutErrorFallbackProps> = ({
  onRetry: _onRetry,
  timeout,
}) => {
  return (
    <Box flexDirection='column' padding={1}>
      <Box borderStyle='round' borderColor='yellow' padding={1}>
        <Box flexDirection='column'>
          <Text color='yellow' bold>
            ⏱️ Request Timeout
          </Text>

          <Box marginTop={1}>
            <Text>The request took longer than {timeout / 1000} seconds</Text>
          </Box>

          <Box marginTop={1}>
            <Text color='gray'>
              This might be due to network issues or server load
            </Text>
          </Box>

          <Box marginTop={1}>
            <Text color='cyan'>
              Press <Text bold>R</Text> to retry with a longer timeout
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Hook to use error boundary functionality
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // Throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  return { resetError, captureError };
};
