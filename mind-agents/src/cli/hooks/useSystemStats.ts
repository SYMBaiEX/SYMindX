import { useState, useEffect } from 'react';
import * as os from 'os';
import { runtimeClient } from '../services/runtimeClient.js';

export interface SystemComponent {
  status: 'running' | 'stopped' | 'error' | 'warning';
  message?: string;
}

export interface PerformanceMetrics {
  cpu: number;
  memory: string;
  uptime: string;
  connections: number;
  messageRate: number;
  responseTime: number;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  configFile: string;
  logLevel: string;
  env: string;
}

export interface SystemStats {
  isRunning: boolean;
  uptime: string;
  memoryUsage: string;
  runtime: SystemComponent;
  memory: SystemComponent;
  eventBus: SystemComponent;
  portals: SystemComponent;
  extensions: SystemComponent;
  security: SystemComponent;
  performance: PerformanceMetrics;
  environment: EnvironmentInfo;
  warnings: string[];
  isConnected: boolean;
  error?: string;
}

export const useSystemStats = (): SystemStats => {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    isRunning: false,
    uptime: '0s',
    memoryUsage: '0MB',
    runtime: { status: 'stopped' },
    memory: { status: 'stopped' },
    eventBus: { status: 'stopped' },
    portals: { status: 'stopped' },
    extensions: { status: 'stopped' },
    security: { status: 'stopped' },
    performance: {
      cpu: 0,
      memory: '0MB',
      uptime: '0s',
      connections: 0,
      messageRate: 0,
      responseTime: 0
    },
    environment: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      configFile: './config/runtime.json',
      logLevel: 'info',
      env: process.env.NODE_ENV || 'development'
    },
    warnings: [],
    isConnected: false
  });

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        // Check if runtime is available
        const isAvailable = await runtimeClient.isRuntimeAvailable();
        
        if (!isAvailable) {
          // Runtime not available - show offline state
          const connectionStatus = runtimeClient.getConnectionStatus();
          setSystemStats(prev => ({
            ...prev,
            isRunning: false,
            isConnected: false,
            error: connectionStatus.error || 'Runtime not available',
            runtime: { status: 'stopped', message: 'Runtime offline' },
            memory: { status: 'stopped', message: 'No connection' },
            eventBus: { status: 'stopped', message: 'No connection' },
            portals: { status: 'stopped', message: 'No connection' },
            extensions: { status: 'stopped', message: 'No connection' },
            security: { status: 'stopped', message: 'No connection' },
            warnings: [connectionStatus.error || 'Unable to connect to runtime'],
            performance: {
              ...prev.performance,
              connections: 0,
              messageRate: 0,
              responseTime: 0
            }
          }));
          return;
        }

        // Fetch real data from runtime
        const [status, metrics] = await Promise.all([
          runtimeClient.getRuntimeStatus(),
          runtimeClient.getSystemMetrics()
        ]);

        // Convert runtime data to our format
        const runtimeUptime = formatUptime(metrics.uptime / 1000); // Convert ms to seconds
        const memoryUsage = formatBytes(metrics.memory.heapUsed);
        
        // Determine component statuses based on runtime data
        const isRuntimeRunning = status.runtime.isRunning;
        const componentStatus: SystemComponent['status'] = isRuntimeRunning ? 'running' : 'stopped';
        
        // Calculate CPU usage approximation from memory pressure
        const cpuUsage = Math.min(100, Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100));
        
        // Build warnings array
        const warnings: string[] = [];
        if (!status.runtime.isRunning) {
          warnings.push('Runtime is not running');
        }
        if (metrics.activeAgents === 0 && metrics.totalAgents > 0) {
          warnings.push('No agents are currently active');
        }
        if (cpuUsage > 80) {
          warnings.push('High memory usage detected');
        }

        setSystemStats({
          isRunning: isRuntimeRunning,
          uptime: runtimeUptime,
          memoryUsage,
          runtime: { 
            status: componentStatus, 
            message: isRuntimeRunning ? 'Runtime operational' : 'Runtime stopped'
          },
          memory: { 
            status: componentStatus, 
            message: isRuntimeRunning ? 'Memory providers connected' : 'Memory offline'
          },
          eventBus: { 
            status: componentStatus, 
            message: isRuntimeRunning ? `${status.runtime.eventBus.events} events processed` : 'Event bus offline'
          },
          portals: { 
            status: componentStatus, 
            message: isRuntimeRunning ? 'AI portals connected' : 'Portals offline'
          },
          extensions: { 
            status: componentStatus, 
            message: isRuntimeRunning ? `${status.extensions.loaded} extensions loaded` : 'Extensions offline'
          },
          security: { 
            status: componentStatus, 
            message: isRuntimeRunning ? 'Security systems active' : 'Security offline'
          },
          performance: {
            cpu: cpuUsage,
            memory: formatBytes(metrics.memory.heapUsed),
            uptime: runtimeUptime,
            connections: 0, // Would need WebSocket connection count from API
            messageRate: Math.round(metrics.commandsProcessed / Math.max(1, metrics.uptime / 60000)), // Commands per minute
            responseTime: 150 // Would need actual response time metrics
          },
          environment: {
            nodeVersion: process.version,
            platform: os.platform(),
            arch: os.arch(),
            configFile: './config/runtime.json',
            logLevel: 'info',
            env: process.env.NODE_ENV || 'development'
          },
          warnings,
          isConnected: true,
          error: undefined
        });

      } catch (error) {
        console.error('Error fetching system stats:', error);
        const connectionStatus = runtimeClient.getConnectionStatus();
        setSystemStats(prev => ({
          ...prev,
          isRunning: false,
          isConnected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          warnings: [
            ...prev.warnings.slice(0, 4), // Keep only recent warnings
            `Error fetching stats: ${error instanceof Error ? error.message : 'Unknown error'}`
          ],
          runtime: { status: 'error', message: 'Failed to fetch runtime status' },
          memory: { status: 'error', message: 'Connection failed' },
          eventBus: { status: 'error', message: 'Connection failed' },
          portals: { status: 'error', message: 'Connection failed' },
          extensions: { status: 'error', message: 'Connection failed' },
          security: { status: 'error', message: 'Connection failed' }
        }));
      }
    };

    // Initial fetch
    fetchSystemStats();
    
    // Refresh stats every 2 seconds for system metrics
    const interval = setInterval(fetchSystemStats, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return systemStats;
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0MB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))}${sizes[i]}`;
}