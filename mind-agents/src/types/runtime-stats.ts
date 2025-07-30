/**
 * Runtime statistics type definitions
 */

/**
 * Runtime statistics returned by the runtime getStats method
 */
export interface RuntimeStats {
  isRunning?: boolean;
  agents?: number;
  autonomousAgents?: number;
  uptime?: number;
  memory?: {
    used: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  performance?: {
    responseTime: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  [key: string]: unknown;
}
