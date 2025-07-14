import { Box, Text } from 'ink';
import React from 'react';

import { ConnectionStatus as ConnectionStatusType } from '../../services/enhancedRuntimeClient.js';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'inline';
  compact?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  showDetails = false,
  position = 'inline',
  compact = false,
}) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'yellow';
      case 'disconnected':
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return `Connecting... (Attempt ${status.reconnectAttempts})`;
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const formatLatency = (latency: number) => {
    if (latency < 100) return `${latency}ms`;
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  if (compact) {
    return (
      <Box>
        <Text color={getStatusColor()}>
          {getStatusIcon()}{' '}
          {status.latency > 0 && `${formatLatency(status.latency)}`}
        </Text>
      </Box>
    );
  }

  const content = (
    <Box flexDirection={showDetails ? 'column' : 'row'} gap={1}>
      <Box>
        <Text color={getStatusColor()}>
          {getStatusIcon()} {getStatusText()}
        </Text>
      </Box>

      {showDetails && (
        <>
          {status.latency > 0 && (
            <Box marginLeft={2}>
              <Text color='gray'>
                Latency:{' '}
                <Text
                  color={
                    status.latency < 100
                      ? 'green'
                      : status.latency < 500
                        ? 'yellow'
                        : 'red'
                  }
                >
                  {formatLatency(status.latency)}
                </Text>
              </Text>
            </Box>
          )}

          {status.lastConnectedAt && (
            <Box marginLeft={2}>
              <Text color='gray'>
                Last connected: {status.lastConnectedAt.toLocaleTimeString()}
              </Text>
            </Box>
          )}

          {status.lastError && (
            <Box marginLeft={2}>
              <Text color='red'>Error: {status.lastError.message}</Text>
            </Box>
          )}

          {status.reconnectAttempts > 0 && (
            <Box marginLeft={2}>
              <Text color='yellow'>
                Reconnect attempts: {status.reconnectAttempts}
              </Text>
            </Box>
          )}
        </>
      )}

      {!showDetails && status.latency > 0 && (
        <Text color='gray'>({formatLatency(status.latency)})</Text>
      )}
    </Box>
  );

  if (position === 'inline') {
    return content;
  }

  return (
    <Box
      position='absolute'
      marginTop={position === 'top' ? 0 : undefined}
      marginBottom={position === 'bottom' ? 0 : undefined}
      paddingX={1}
    >
      {content}
    </Box>
  );
};

/**
 * Connection health indicator with visual feedback
 */
interface ConnectionHealthProps {
  latency: number;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  showBars?: boolean;
}

export const ConnectionHealth: React.FC<ConnectionHealthProps> = ({
  latency,
  status,
  showBars = true,
}) => {
  const getHealthLevel = () => {
    if (status !== 'connected') return 0;
    if (latency < 50) return 5;
    if (latency < 100) return 4;
    if (latency < 200) return 3;
    if (latency < 500) return 2;
    return 1;
  };

  const getHealthColor = () => {
    const level = getHealthLevel();
    if (level >= 4) return 'green';
    if (level >= 3) return 'yellow';
    return 'red';
  };

  const healthLevel = getHealthLevel();

  if (!showBars) {
    return (
      <Text color={getHealthColor()}>
        {status === 'connected' ? `${latency}ms` : status}
      </Text>
    );
  }

  return (
    <Box>
      <Text color={getHealthColor()}>
        {'█'.repeat(healthLevel)}
        <Text color='gray'>{'░'.repeat(5 - healthLevel)}</Text>
      </Text>
    </Box>
  );
};

/**
 * Connection status badge
 */
interface ConnectionBadgeProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  size?: 'small' | 'medium' | 'large';
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({
  status,
  size = 'medium',
}) => {
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    if (status === 'connecting') {
      const interval = setInterval(() => {
        setPulse((p) => !p);
      }, 500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [status]);

  const getIcon = () => {
    switch (size) {
      case 'small':
        return status === 'connected' ? '●' : '○';
      case 'large':
        return status === 'connected' ? '⬤' : '⭕';
      default:
        return status === 'connected' ? '●' : '○';
    }
  };

  const getColor = () => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return pulse ? 'yellow' : 'gray';
      case 'disconnected':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return <Text color={getColor()}>{getIcon()}</Text>;
};

/**
 * Auto-reconnect indicator
 */
interface AutoReconnectIndicatorProps {
  attempts: number;
  maxAttempts: number;
  nextRetryIn?: number;
  onCancel?: () => void;
}

export const AutoReconnectIndicator: React.FC<AutoReconnectIndicatorProps> = ({
  attempts,
  maxAttempts,
  nextRetryIn,
  onCancel,
}) => {
  const [countdown, setCountdown] = React.useState(nextRetryIn || 0);

  React.useEffect(() => {
    if (nextRetryIn && nextRetryIn > 0) {
      setCountdown(nextRetryIn);
      const interval = setInterval(() => {
        setCountdown((c) => Math.max(0, c - 100));
      }, 100);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [nextRetryIn]);

  return (
    <Box
      flexDirection='column'
      padding={1}
      borderStyle='round'
      borderColor='yellow'
    >
      <Text color='yellow' bold>
        🔄 Auto-reconnecting...
      </Text>

      <Box marginTop={1}>
        <Text>
          Attempt {attempts} of {maxAttempts}
        </Text>
      </Box>

      {countdown > 0 && (
        <Box marginTop={1}>
          <Text color='gray'>
            Next retry in {(countdown / 1000).toFixed(1)}s
          </Text>
        </Box>
      )}

      {onCancel && (
        <Box marginTop={1}>
          <Text color='cyan'>
            Press <Text bold>C</Text> to cancel
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Connection timeline visualization
 */
interface ConnectionEvent {
  timestamp: Date;
  type: 'connected' | 'disconnected' | 'error' | 'retry';
  message?: string;
}

interface ConnectionTimelineProps {
  events: ConnectionEvent[];
  maxEvents?: number;
}

export const ConnectionTimeline: React.FC<ConnectionTimelineProps> = ({
  events,
  maxEvents = 5,
}) => {
  const recentEvents = events.slice(-maxEvents);

  const getEventIcon = (type: ConnectionEvent['type']) => {
    switch (type) {
      case 'connected':
        return '✓';
      case 'disconnected':
        return '✗';
      case 'error':
        return '!';
      case 'retry':
        return '↻';
      default:
        return '?';
    }
  };

  const getEventColor = (type: ConnectionEvent['type']) => {
    switch (type) {
      case 'connected':
        return 'green';
      case 'disconnected':
        return 'red';
      case 'error':
        return 'red';
      case 'retry':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  return (
    <Box flexDirection='column'>
      {recentEvents.map((event, index) => (
        <Box key={index}>
          <Text color='gray' dimColor>
            {event.timestamp.toLocaleTimeString()}
          </Text>
          <Text> </Text>
          <Text color={getEventColor(event.type)}>
            {getEventIcon(event.type)}
          </Text>
          {event.message && (
            <>
              <Text> </Text>
              <Text color='gray'>{event.message}</Text>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
};
