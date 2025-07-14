import { useState, useEffect, useCallback, useRef } from 'react';

import {
  EnhancedRuntimeClient,
  ConnectionStatus,
} from '../services/enhancedRuntimeClient.js';

export interface ConnectionEvent {
  timestamp: Date;
  type: 'connected' | 'disconnected' | 'error' | 'retry' | 'latency_spike';
  message?: string;
  details?: any;
}

export interface ConnectionStats {
  uptime: number;
  downtime: number;
  totalConnections: number;
  totalDisconnections: number;
  averageLatency: number;
  currentLatency: number;
  minLatency: number;
  maxLatency: number;
  packetLoss: number;
  lastError: Error | undefined;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

export interface UseConnectionMonitorOptions {
  latencySpikeThreshold?: number;
  qualityCheckInterval?: number;
  historyLimit?: number;
  enableNotifications?: boolean;
}

export interface UseConnectionMonitorResult {
  status: ConnectionStatus;
  stats: ConnectionStats;
  events: ConnectionEvent[];
  isHealthy: boolean;
  qualityScore: number;
  reconnect: () => Promise<void>;
  disconnect: () => void;
  clearHistory: () => void;
}

/**
 * Hook for monitoring connection status and health
 */
export function useConnectionMonitor(
  client: EnhancedRuntimeClient,
  options?: UseConnectionMonitorOptions
): UseConnectionMonitorResult {
  const {
    latencySpikeThreshold = 1000, // 1 second
    qualityCheckInterval = 5000, // 5 seconds
    historyLimit = 100,
    enableNotifications = true,
  } = options || {};

  const [status, setStatus] = useState<ConnectionStatus>(
    client.getConnectionStatus()
  );
  const [events, setEvents] = useState<ConnectionEvent[]>([]);
  const [stats, setStats] = useState<ConnectionStats>({
    uptime: 0,
    downtime: 0,
    totalConnections: 0,
    totalDisconnections: 0,
    averageLatency: 0,
    currentLatency: 0,
    minLatency: Infinity,
    maxLatency: 0,
    packetLoss: 0,
    lastError: undefined,
    connectionQuality: 'offline',
  });

  const connectionStartTimeRef = useRef<Date | null>(null);
  const disconnectionStartTimeRef = useRef<Date | null>(null);
  const latencyHistoryRef = useRef<number[]>([]);
  const qualityCheckIntervalRef = useRef<NodeJS.Timer | null>(null);

  // Add event to history
  const addEvent = useCallback(
    (event: ConnectionEvent) => {
      setEvents((prev) => {
        const newEvents = [...prev, event];
        return newEvents.slice(-historyLimit);
      });

      // Trigger notification if enabled
      if (enableNotifications) {
        // In a real implementation, this would trigger system notifications
        console.log(`[Connection Event] ${event.type}: ${event.message || ''}`);
      }
    },
    [historyLimit, enableNotifications]
  );

  // Update connection stats
  const updateStats = useCallback((newStatus: ConnectionStatus) => {
    setStats((prev) => {
      const now = new Date();
      let uptime = prev.uptime;
      let downtime = prev.downtime;

      // Update uptime/downtime
      if (newStatus.status === 'connected') {
        if (connectionStartTimeRef.current) {
          uptime = now.getTime() - connectionStartTimeRef.current.getTime();
        }
        if (disconnectionStartTimeRef.current) {
          downtime +=
            now.getTime() - disconnectionStartTimeRef.current.getTime();
          disconnectionStartTimeRef.current = null;
        }
      } else {
        if (!disconnectionStartTimeRef.current) {
          disconnectionStartTimeRef.current = now;
        }
        if (connectionStartTimeRef.current) {
          uptime = now.getTime() - connectionStartTimeRef.current.getTime();
        }
      }

      // Update latency stats
      const currentLatency = newStatus.latency || 0;
      if (currentLatency > 0) {
        latencyHistoryRef.current.push(currentLatency);
        if (latencyHistoryRef.current.length > 100) {
          latencyHistoryRef.current.shift();
        }
      }

      const avgLatency =
        latencyHistoryRef.current.length > 0
          ? latencyHistoryRef.current.reduce((a, b) => a + b, 0) /
            latencyHistoryRef.current.length
          : 0;

      // Calculate connection quality
      let quality: ConnectionStats['connectionQuality'] = 'offline';
      if (newStatus.status === 'connected') {
        if (avgLatency < 50) quality = 'excellent';
        else if (avgLatency < 150) quality = 'good';
        else if (avgLatency < 300) quality = 'fair';
        else quality = 'poor';
      }

      return {
        ...prev,
        uptime,
        downtime,
        averageLatency: Math.round(avgLatency),
        currentLatency,
        minLatency: Math.min(prev.minLatency, currentLatency || Infinity),
        maxLatency: Math.max(prev.maxLatency, currentLatency || 0),
        lastError: newStatus.lastError || prev.lastError,
        connectionQuality: quality,
        totalConnections:
          prev.totalConnections +
          (newStatus.status === 'connected' &&
          prev.connectionQuality === 'offline'
            ? 1
            : 0),
        totalDisconnections:
          prev.totalDisconnections +
          (newStatus.status === 'disconnected' &&
          prev.connectionQuality !== 'offline'
            ? 1
            : 0),
        packetLoss: prev.packetLoss,
      };
    });
  }, []);

  // Handle status changes
  const handleStatusChange = useCallback(
    (newStatus: ConnectionStatus) => {
      const prevStatus = status.status;
      setStatus(newStatus);
      updateStats(newStatus);

      // Track status change events
      if (prevStatus !== newStatus.status) {
        const now = new Date();

        if (newStatus.status === 'connected') {
          connectionStartTimeRef.current = now;
          setStats((prev) => ({
            ...prev,
            totalConnections: prev.totalConnections + 1,
          }));
          addEvent({
            timestamp: now,
            type: 'connected',
            message: `Connected with ${newStatus.latency}ms latency`,
          });
        } else if (newStatus.status === 'disconnected') {
          disconnectionStartTimeRef.current = now;
          setStats((prev) => ({
            ...prev,
            totalDisconnections: prev.totalDisconnections + 1,
          }));
          addEvent({
            timestamp: now,
            type: 'disconnected',
            message: 'Connection lost',
          });
        } else if (newStatus.status === 'error') {
          addEvent({
            timestamp: now,
            type: 'error',
            message: newStatus.lastError?.message ?? 'Unknown error',
            details: newStatus.lastError,
          });
        }
      }

      // Check for latency spikes
      if (
        newStatus.status === 'connected' &&
        newStatus.latency > latencySpikeThreshold
      ) {
        addEvent({
          timestamp: new Date(),
          type: 'latency_spike',
          message: `High latency detected: ${newStatus.latency}ms`,
          details: { latency: newStatus.latency },
        });
      }
    },
    [status.status, updateStats, addEvent, latencySpikeThreshold]
  );

  // Subscribe to client events
  useEffect(() => {
    const handleConnected = (_data: any) => {
      handleStatusChange({
        ...client.getConnectionStatus(),
        status: 'connected',
      });
    };

    const handleDisconnected = (_data: any) => {
      handleStatusChange({
        ...client.getConnectionStatus(),
        status: 'disconnected',
      });
    };

    const handleStatusChanged = (newStatus: ConnectionStatus) => {
      handleStatusChange(newStatus);
    };

    const handleLatencyUpdate = (data: {
      current: number;
      average: number;
    }) => {
      const currentStatus = client.getConnectionStatus();
      if (currentStatus.status === 'connected') {
        handleStatusChange({
          ...currentStatus,
          latency: data.current,
        });
      }
    };

    const handleError = (data: { operation: string; error: Error }) => {
      addEvent({
        timestamp: new Date(),
        type: 'error',
        message: `${data.operation}: ${data.error.message}`,
        details: data,
      });
    };

    client.on('connected', handleConnected);
    client.on('disconnected', handleDisconnected);
    client.on('statusChanged', handleStatusChanged);
    client.on('latencyUpdate', handleLatencyUpdate);
    client.on('error', handleError);

    return () => {
      client.off('connected', handleConnected);
      client.off('disconnected', handleDisconnected);
      client.off('statusChanged', handleStatusChanged);
      client.off('latencyUpdate', handleLatencyUpdate);
      client.off('error', handleError);
    };
  }, [client, handleStatusChange, addEvent]);

  // Quality check interval
  useEffect(() => {
    if (qualityCheckInterval > 0) {
      qualityCheckIntervalRef.current = setInterval(() => {
        // Perform quality check
        const metrics = client.getMetrics();

        // Calculate packet loss (simulated based on failed requests)
        const packetLoss =
          metrics.totalRequests > 0
            ? (metrics.failedRequests / metrics.totalRequests) * 100
            : 0;

        setStats((prev) => ({
          ...prev,
          packetLoss: Math.round(packetLoss * 100) / 100,
        }));
      }, qualityCheckInterval);
    }

    return () => {
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
    };
  }, [client, qualityCheckInterval]);

  // Calculate quality score (0-100)
  const qualityScore = (() => {
    if (status.status !== 'connected') return 0;

    let score = 100;

    // Deduct for high latency
    if (stats.averageLatency > 500) score -= 30;
    else if (stats.averageLatency > 200) score -= 20;
    else if (stats.averageLatency > 100) score -= 10;

    // Deduct for packet loss
    score -= Math.min(stats.packetLoss * 2, 30);

    // Deduct for recent disconnections
    const recentDisconnections = events
      .filter((e) => e.type === 'disconnected')
      .filter((e) => Date.now() - e.timestamp.getTime() < 300000).length; // Last 5 minutes
    score -= recentDisconnections * 10;

    return Math.max(0, Math.min(100, score));
  })();

  const isHealthy = status.status === 'connected' && qualityScore >= 70;

  const reconnect = useCallback(async () => {
    // Force a reconnection attempt
    await client.checkConnection();
  }, [client]);

  const disconnect = useCallback(() => {
    client.cancelAllRequests();
  }, [client]);

  const clearHistory = useCallback(() => {
    setEvents([]);
    latencyHistoryRef.current = [];
  }, []);

  return {
    status,
    stats,
    events,
    isHealthy,
    qualityScore,
    reconnect,
    disconnect,
    clearHistory,
  };
}

/**
 * Hook for connection notifications
 */
export function useConnectionNotifications(
  status: ConnectionStatus,
  options?: {
    enableSound?: boolean;
    enableToast?: boolean;
    soundVolume?: number;
  }
) {
  const {
    enableSound = true,
    enableToast = true,
    soundVolume = 0.5,
  } = options || {};
  const prevStatusRef = useRef(status.status);

  useEffect(() => {
    if (prevStatusRef.current !== status.status) {
      // Status changed
      if (
        status.status === 'connected' &&
        prevStatusRef.current !== 'connected'
      ) {
        // Connected
        if (enableSound) {
          // Play connection sound
          // In a real implementation, this would play an actual sound
          console.log('🔊 Connected sound');
        }
        if (enableToast) {
          // Show toast notification
          console.log('✅ Connected to runtime');
        }
      } else if (
        status.status === 'disconnected' &&
        prevStatusRef.current === 'connected'
      ) {
        // Disconnected
        if (enableSound) {
          // Play disconnection sound
          console.log('🔊 Disconnected sound');
        }
        if (enableToast) {
          // Show toast notification
          console.log('❌ Disconnected from runtime');
        }
      }

      prevStatusRef.current = status.status;
    }
  }, [status.status, enableSound, enableToast, soundVolume]);
}

/**
 * Hook for network quality indicator
 */
export function useNetworkQuality(latency: number, packetLoss: number = 0) {
  const [quality, setQuality] = useState<{
    level: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    color: string;
    icon: string;
  }>({
    level: 'poor',
    score: 0,
    color: 'red',
    icon: '📶',
  });

  useEffect(() => {
    let score = 100;

    // Latency impact
    if (latency > 500) score -= 40;
    else if (latency > 200) score -= 25;
    else if (latency > 100) score -= 10;

    // Packet loss impact
    score -= Math.min(packetLoss * 3, 50);

    score = Math.max(0, Math.min(100, score));

    let level: typeof quality.level;
    let color: string;

    if (score >= 90) {
      level = 'excellent';
      color = 'green';
    } else if (score >= 70) {
      level = 'good';
      color = 'green';
    } else if (score >= 50) {
      level = 'fair';
      color = 'yellow';
    } else {
      level = 'poor';
      color = 'red';
    }

    setQuality({ level, score, color, icon: '📶' });
  }, [latency, packetLoss]);

  return quality;
}
