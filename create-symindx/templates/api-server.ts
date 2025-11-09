/**
 * API Server template for SYMindX agents
 * Provides HTTP/WebSocket API and web dashboard
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ApiServerConfig {
  port: number;
  host: string;
  enableDashboard: boolean;
  enableWebSocket: boolean;
  corsOrigins: string[];
}

export class ApiServer {
  private app: express.Application;
  private server: any;
  private wss?: WebSocketServer;
  private config: ApiServerConfig;
  private agent: any;

  constructor(agent: any, config: Partial<ApiServerConfig> = {}) {
    this.agent = agent;
    this.config = {
      port: config.port || parseInt(process.env.API_PORT || '8000'),
      host: config.host || process.env.API_HOST || 'localhost',
      enableDashboard: config.enableDashboard ?? true,
      enableWebSocket: config.enableWebSocket ?? true,
      corsOrigins: config.corsOrigins || ['http://localhost:3000', 'http://localhost:8000']
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Static files for dashboard
    if (this.config.enableDashboard) {
      this.app.use('/static', express.static(path.join(__dirname, 'public')));
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Agent status
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = await this.agent.getStatus();
        res.json({
          ...status,
          personality: this.agent.config?.core?.personality?.[0] || 'unknown',
          memoryProvider: this.agent.config?.modules?.memory?.provider || 'unknown',
          aiProvider: this.agent.config?.modules?.portals?.primary || 'unknown'
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get agent status' });
      }
    });

    // Chat endpoint
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message } = req.body;
        
        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }

        const response = await this.agent.processMessage(message);
        
        res.json({
          response: response.text || response.message,
          emotion: response.emotion,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
      }
    });

    // Agent restart
    this.app.post('/api/restart', async (req, res) => {
      try {
        res.json({ message: 'Restart initiated' });
        
        // Restart after sending response
        setTimeout(async () => {
          await this.agent.restart();
        }, 1000);
      } catch (error) {
        res.status(500).json({ error: 'Failed to restart agent' });
      }
    });

    // Logs endpoint
    this.app.get('/api/logs', (req, res) => {
      try {
        const logs = this.agent.getLogs ? this.agent.getLogs() : [];
        res.json({ logs });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get logs' });
      }
    });

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      const docs = {
        title: 'SYMindX Agent API',
        version: '1.0.0',
        endpoints: {
          'GET /api/health': 'Health check',
          'GET /api/status': 'Get agent status',
          'POST /api/chat': 'Send message to agent',
          'POST /api/restart': 'Restart agent',
          'GET /api/logs': 'Get agent logs',
          'GET /api/docs': 'This documentation'
        },
        examples: {
          chat: {
            method: 'POST',
            url: '/api/chat',
            body: { message: 'Hello, agent!' },
            response: {
              response: 'Hello! How can I help you?',
              emotion: 'happy',
              timestamp: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      };
      res.json(docs);
    });

    // Dashboard route
    if (this.config.enableDashboard) {
      this.app.get('/', async (req, res) => {
        try {
          const dashboardPath = path.join(__dirname, '..', 'templates', 'dashboard.html');
          const dashboardHtml = await fs.readFile(dashboardPath, 'utf-8');
          res.send(dashboardHtml);
        } catch (error) {
          res.status(500).send('Dashboard not available');
        }
      });
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  private setupWebSocket(): void {
    if (!this.config.enableWebSocket) return;

    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'chat') {
            const response = await this.agent.processMessage(message.content);
            ws.send(JSON.stringify({
              type: 'chat_response',
              content: response.text || response.message,
              emotion: response.emotion,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message'
          }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to SYMindX agent'
      }));
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);
        
        if (this.config.enableWebSocket) {
          this.setupWebSocket();
        }

        this.server.listen(this.config.port, this.config.host, () => {
          console.log(`🌐 API Server running on http://${this.config.host}:${this.config.port}`);
          
          if (this.config.enableDashboard) {
            console.log(`📊 Dashboard available at http://${this.config.host}:${this.config.port}`);
          }
          
          if (this.config.enableWebSocket) {
            console.log(`🔌 WebSocket server enabled`);
          }
          
          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
      }
      
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }
}