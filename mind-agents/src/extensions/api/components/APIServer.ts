/**
 * APIServer.ts - Core Express server setup and management
 * 
 * This module handles:
 * - Express application creation and configuration
 * - HTTP server lifecycle management
 * - Basic server settings and listening
 */

import { createServer } from 'http';
import * as http from 'http';
import express from 'express';
import { ApiConfig, ApiSettings } from '../types';
import { standardLoggers } from '../../../utils/standard-logging';
import { createNetworkError } from '../../../utils/standard-errors';

export class APIServer {
  private logger = standardLoggers.api;
  private app: express.Application;
  private server?: http.Server;
  private config: ApiSettings;
  private isRunning = false;

  constructor(config: ApiSettings) {
    this.config = config;
    this.app = express();
    
    // Basic Express configuration
    this.app.set('trust proxy', true);
    this.app.disable('x-powered-by');
  }

  /**
   * Get the Express application instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the HTTP server instance
   */
  getServer(): http.Server | undefined {
    return this.server;
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('API server is already running');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);

        // Configure server settings
        this.server.timeout = this.config.timeout || 30000;
        this.server.keepAliveTimeout = this.config.keepAliveTimeout || 5000;
        this.server.headersTimeout = this.config.headersTimeout || 6000;

        // Handle server errors
        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            const portError = createNetworkError(
              `Port ${this.config.port} is already in use`,
              error
            );
            this.logger.error('Failed to start API server', { error: portError });
            reject(portError);
          } else {
            this.logger.error('API server error', { error });
            reject(error);
          }
        });

        // Handle successful startup
        this.server.on('listening', () => {
          this.isRunning = true;
          const address = this.server?.address();
          const port = typeof address === 'object' && address ? address.port : this.config.port;
          
          this.logger.info(`API server started on port ${port}`, {
            port,
            timeout: this.config.timeout,
            keepAliveTimeout: this.config.keepAliveTimeout,
          });
          
          resolve();
        });

        // Start listening
        this.server.listen(this.config.port, this.config.host);

      } catch (error) {
        this.logger.error('Error starting API server', { error });
        reject(error);
      }
    });
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      this.logger.warn('API server is not running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          this.logger.error('Error stopping API server', { error });
          reject(error);
        } else {
          this.isRunning = false;
          this.server = undefined;
          this.logger.info('API server stopped successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    port?: number;
    host?: string;
    connections?: number;
  } {
    const address = this.server?.address();
    const port = typeof address === 'object' && address ? address.port : this.config.port;

    return {
      isRunning: this.isRunning,
      port: this.isRunning ? port : undefined,
      host: this.isRunning ? this.config.host : undefined,
      connections: this.isRunning ? this.getActiveConnections() : undefined,
    };
  }

  /**
   * Check if server is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get number of active connections
   */
  private getActiveConnections(): number {
    if (!this.server) return 0;
    
    // This is a simplified version - in practice you might want to track connections more accurately
    return this.server.listening ? 1 : 0;
  }

  /**
   * Set up graceful shutdown handling
   */
  setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down API server gracefully...`);
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception in API server', { error });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection in API server', { reason, promise });
      shutdown('unhandledRejection');
    });
  }

  /**
   * Get server metrics
   */
  getMetrics(): {
    uptime: number;
    requests: number;
    errors: number;
    memory: NodeJS.MemoryUsage;
  } {
    return {
      uptime: this.isRunning ? Date.now() - this.getStartTime() : 0,
      requests: this.getRequestCount(),
      errors: this.getErrorCount(),
      memory: process.memoryUsage(),
    };
  }

  /**
   * Get server start time (placeholder - would be tracked properly)
   */
  private getStartTime(): number {
    return Date.now(); // This should be set when server starts
  }

  /**
   * Get request count (placeholder - would be tracked properly)
   */
  private getRequestCount(): number {
    return 0; // This would be tracked by middleware
  }

  /**
   * Get error count (placeholder - would be tracked properly)
   */
  private getErrorCount(): number {
    return 0; // This would be tracked by error middleware
  }
}