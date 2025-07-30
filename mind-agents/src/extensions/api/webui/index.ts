/**
 * WebUI Server for SYMindX
 *
 * Provides a comprehensive web interface for agent interaction:
 * - Real-time chat interface
 * - Agent dashboard and monitoring
 * - Command execution interface
 * - System metrics and logs
 * - Agent configuration management
 */

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';

import { CommandSystem } from '../../../core/command-system';
import { Agent } from '../../../types/agent';
import {
  standardLoggers,
  createStandardLoggingPatterns,
  StandardLogContext,
} from '../../../utils/standard-logging.js';

// Handle ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebUIServer {
  private logger = standardLoggers.webui;
  private loggingPatterns = createStandardLoggingPatterns(this.logger);
  private app: express.Application;

  constructor(
    private commandSystem: CommandSystem,
    private getAgents: () => Map<string, Agent>,
    private getRuntimeStats: () => any,
    private runtime?: any
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this._logger.info('WebUI server initialized');
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'static')));
    this._logger.debug('WebUI middleware configured');
  }

  private setupRoutes(): void {
    // Serve main dashboard
    this.app.get('/', (_req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // Chat interface
    this.app.get('/chat', (_req, res) => {
      res.send(this.generateChatHTML());
    });

    // Agent management interface
    this.app.get('/agents', (_req, res) => {
      res.send(this.generateAgentsHTML());
    });

    // System monitoring interface
    this.app.get('/monitor', (_req, res) => {
      res.send(this.generateMonitorHTML());
    });

    // Multi-Agent Manager interface
    this.app.get('/multi-agent', (_req, res) => {
      res.send(this.generateMultiAgentHTML());
    });

    // Alternative route for UI namespace consistency
    this.app.get('/ui/multi-agent', (_req, res) => {
      res.send(this.generateMultiAgentHTML());
    });

    // API endpoints for dynamic content
    this.app.get('/api/agents', (_req, res) => {
      const agents = Array.from(this.getAgents().values()).map((agent) => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        emotion: agent.emotion?.current,
        lastUpdate: agent.lastUpdate,
        extensionCount: agent.extensions.length,
        hasPortal: !!agent.portal,
      }));
      res.json({ agents });
    });

    this.app.get('/api/agent/:id', (req, res) => {
      const agent = this.getAgents().get(req.params['id']);
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      res.json({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        emotion: agent.emotion?.current,
        lastUpdate: agent.lastUpdate,
        extensions: agent.extensions.map((ext) => ({
          id: ext.id,
          name: ext.name,
          enabled: ext.enabled,
          status: ext.status,
        })),
        portal: agent.portal
          ? {
              name: agent.portal.name,
              enabled: agent.portal.enabled,
            }
          : null,
      });
    });

    this.app.get('/api/stats', (_req, res) => {
      const runtimeStats = this.getRuntimeStats();
      const commandStats = this.commandSystem.getStats();

      res.json({
        runtime: runtimeStats,
        commands: commandStats,
        system: {
          memory: process.memoryUsage(),
          totalSystemMemory: os.totalmem(),
          freeSystemMemory: os.freemem(),
          uptime: process.uptime(),
          systemUptime: os.uptime(),
          platform: process.platform,
          nodeVersion: process.version,
          cpus: os.cpus().length,
          loadAverage: os.loadavg(),
        },
      });
    });

    this.app.get('/api/commands', (req, res) => {
      const agentId = req.query['agent'] as string;
      const limit = parseInt(req.query['limit'] as string) || 20;

      let commands = this.commandSystem.getAllCommands();

      if (agentId) {
        commands = commands.filter((cmd) => cmd.agentId === agentId);
      }

      commands = commands
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      res.json(
        commands.map((cmd) => ({
          id: cmd.id,
          agentId: cmd.agentId,
          instruction: cmd.instruction,
          type: cmd.type,
          status: cmd.status,
          timestamp: cmd.timestamp,
          result: cmd.result,
          executionTime: cmd.result?.executionTime,
        }))
      );
    });

    // Chat API
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { agentId, message } = req.body;

        if (!agentId || !message) {
          res.status(400).json({ error: 'Agent ID and message required' });
          return;
        }

        const response = await this.commandSystem.sendMessage(agentId, message);
        res.json({ response, timestamp: new Date().toISOString() });
      } catch (error) {
        void error;
        res.status(500).json({
          error: 'Chat failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Command execution API
    this.app.post('/api/command', async (req, res) => {
      try {
        const {
          agentId,
          command,
          priority = 'normal',
          async = false,
        } = req.body;

        if (!agentId || !command) {
          res.status(400).json({ error: 'Agent ID and command required' });
          return;
        }

        const cmd = await this.commandSystem.sendCommand(agentId, command, {
          priority: this.mapPriority(priority),
          async,
        });

        res.json({
          commandId: cmd.id,
          status: cmd.status,
          result: cmd.result,
          async,
        });
      } catch (error) {
        void error;
        res.status(500).json({
          error: 'Command execution failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Characters API endpoint
    this.app.get('/api/characters', async (_req, res) => {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const charactersDir = path.join(__dirname, '../../../characters');

        const files = fs.readdirSync(charactersDir);
        const characters = [];

        for (const file of files) {
          if (file.endsWith('.json') && !file.includes('example')) {
            try {
              const filePath = path.join(charactersDir, file);
              const data = fs.readFileSync(filePath, 'utf-8');
              const character = JSON.parse(data);

              characters.push({
                id: character.id,
                name: character.name,
                description: character.description,
                version: character.version,
                personality: character.personality?.traits || {},
                capabilities: character.capabilities || {},
                communication: character.communication || {},
                file: file,
              });
            } catch (error) {
              void error;
              this._logger.warn(`Failed to parse character file ${file}:`, {
                error: {
                  code: error instanceof Error ? error.name : 'UnknownError',
                  message:
                    error instanceof Error ? error.message : String(error),
                  ...(error instanceof Error && error.stack
                    ? { stack: error.stack }
                    : {}),
                  ...(error instanceof Error && error.cause !== undefined
                    ? { cause: error.cause }
                    : {}),
                },
              });
            }
          }
        }

        res.json({ characters });
      } catch (error) {
        void error;
        res.status(500).json({
          error: 'Failed to load characters',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // API endpoint to get all agents (from character files) with their running status
    this.app.get('/api/agents/all', async (_req, res) => {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const charactersDir = path.join(__dirname, '../../../characters');

        // Get all character files
        const files = fs.readdirSync(charactersDir);
        const allAgents = [];

        // Get currently running agents
        const runningAgents = this.getAgents();

        for (const file of files) {
          if (file.endsWith('.json') && !file.includes('example')) {
            try {
              const filePath = path.join(charactersDir, file);
              const data = fs.readFileSync(filePath, 'utf-8');
              const character = JSON.parse(data);

              // Check if this agent is currently running
              const runningAgent = runningAgents.get(character.id);
              const isRunning = !!runningAgent;

              allAgents.push({
                id: character.id,
                name: character.name,
                description: character.description,
                version: character.version,
                enabled: character.enabled !== false, // default to true if not specified
                status: isRunning ? runningAgent.status : 'stopped',
                isRunning: isRunning,
                personality: character.personality?.traits || {},
                capabilities: character.capabilities || {},
                communication: character.communication || {},
                // Include runtime data if agent is running
                ...(isRunning && {
                  emotion: runningAgent.emotion?.current,
                  lastUpdate: runningAgent.lastUpdate,
                  extensionCount: runningAgent.extensions?.length || 0,
                  hasPortal: !!runningAgent.portal,
                }),
                file: file,
              });
            } catch (error) {
              void error;
              this._logger.warn(`Failed to parse character file ${file}:`, {
                error: {
                  code: error instanceof Error ? error.name : 'UnknownError',
                  message:
                    error instanceof Error ? error.message : String(error),
                  ...(error instanceof Error && error.stack
                    ? { stack: error.stack }
                    : {}),
                  ...(error instanceof Error && error.cause !== undefined
                    ? { cause: error.cause }
                    : {}),
                },
              });
            }
          }
        }

        res.json({ agents: allAgents });
      } catch (error) {
        void error;
        res.status(500).json({
          error: 'Failed to load all agents',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // API endpoint to start an agent
    this.app.post('/api/agents/:id/start', async (req, res) => {
      try {
        const { id } = req.params;

        if (!this.runtime) {
          res.status(500).json({ error: 'Runtime not available' });
          return;
        }

        // Check if agent is already running
        const runningAgents = this.getAgents();
        if (runningAgents.has(id)) {
          res.status(400).json({ error: 'Agent is already running' });
          return;
        }

        // Load character configuration
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const charactersDir = path.join(__dirname, '../../../characters');
        const characterFile = path.join(charactersDir, `${id}.json`);

        if (!fs.existsSync(characterFile)) {
          res.status(404).json({ error: 'Character configuration not found' });
          return;
        }

        // Read and parse character config
        const configData = fs.readFileSync(characterFile, 'utf-8');
        const config = JSON.parse(configData);

        // Create agent using runtime
        await this.runtime.createAgent(config);

        res.json({
          success: true,
          message: `Agent ${id} started successfully`,
        });
      } catch (error) {
        void error;
        this._logger.error('Failed to start agent:', error);
        res.status(500).json({
          error: 'Failed to start agent',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // API endpoint to stop an agent
    this.app.post('/api/agents/:id/stop', async (req, res) => {
      try {
        const { id } = req.params;

        if (!this.runtime) {
          res.status(500).json({ error: 'Runtime not available' });
          return;
        }

        // Check if agent is running
        const runningAgents = this.getAgents();
        if (!runningAgents.has(id)) {
          res.status(400).json({ error: 'Agent is not running' });
          return;
        }

        // Stop agent using runtime
        await this.runtime.removeAgent(id);

        res.json({
          success: true,
          message: `Agent ${id} stopped successfully`,
        });
      } catch (error) {
        void error;
        this._logger.error('Failed to stop agent:', error);
        res.status(500).json({
          error: 'Failed to stop agent',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYMindX Dashboard</title>
    <style>
        ${this.getCommonStyles()}
        .dashboard {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px;
            background: #f8fafc;
            border-radius: 4px;
        }
        .metric-value {
            font-weight: bold;
            color: #2563eb;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-active { background-color: #10b981; }
        .status-idle { background-color: #6b7280; }
        .status-error { background-color: #ef4444; }
        .status-thinking { background-color: #3b82f6; }
        .agent-card {
            padding: 12px;
            margin: 8px 0;
            background: #f8fafc;
            border-radius: 6px;
            border-left: 3px solid #2563eb;
        }
        .agent-card h4 {
            margin: 0 0 8px 0;
            color: #1e293b;
        }
        .agent-detail {
            font-size: 0.9em;
            color: #64748b;
            margin: 4px 0;
        }
        .activity-item {
            padding: 8px;
            margin: 4px 0;
            background: #f1f5f9;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .timestamp {
            color: #94a3b8;
            font-size: 0.8em;
        }
        .realtime-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            margin-left: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    ${this.getNavigationHTML()}
    
    <div class="dashboard">
        <div class="card">
            <h2>System Overview <span class="realtime-indicator"></span></h2>
            <div id="system-stats">
                <div class="metric">
                    <span>Runtime Status:</span>
                    <span class="metric-value" id="system-status">Loading...</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span class="metric-value" id="system-uptime">Loading...</span>
                </div>
                <div class="metric">
                    <span>Memory Usage:</span>
                    <span class="metric-value" id="memory-usage">Loading...</span>
                </div>
                <div class="metric">
                    <span>CPU Usage:</span>
                    <span class="metric-value" id="cpu-usage">N/A</span>
                </div>
                <div class="metric">
                    <span>Node Version:</span>
                    <span class="metric-value" id="node-version">Loading...</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Active Agents</h2>
            <div id="agents-overview">
                <div class="metric">
                    <span>Total Agents:</span>
                    <span class="metric-value" id="total-agents">0</span>
                </div>
                <div id="agent-list">
                    <p class="timestamp">No agents running</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Command Statistics</h2>
            <div id="commands-overview">
                <div class="metric">
                    <span>Total Processed:</span>
                    <span class="metric-value" id="total-commands">0</span>
                </div>
                <div class="metric">
                    <span>Success Rate:</span>
                    <span class="metric-value" id="success-rate">0%</span>
                </div>
                <div class="metric">
                    <span>Active Commands:</span>
                    <span class="metric-value" id="active-commands">0</span>
                </div>
                <div class="metric">
                    <span>Avg Response Time:</span>
                    <span class="metric-value" id="avg-response-time">0ms</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Recent Activity</h2>
            <div id="recent-activity">
                <p class="timestamp">No recent activity</p>
            </div>
        </div>

        <div class="card" style="grid-column: span 2;">
            <h2>Quick Actions</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <a href="/chat" class="btn btn-primary">💬 Chat with Agents</a>
                <a href="/agents" class="btn btn-secondary">🤖 Manage Agents</a>
                <a href="/monitor" class="btn btn-secondary">📊 System Monitor</a>
            </div>
        </div>
    </div>

    <script>
        ${this.getDashboardJavaScript()}
    </script>
</body>
</html>`;
  }

  private generateChatHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYMindX Chat</title>
    <style>
        ${this.getCommonStyles()}
        
        /* Agent Selection Screen */
        .agent-selection {
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .agent-selection h1 {
            text-align: center;
            margin-bottom: 40px;
            font-size: 2.5em;
        }
        .agents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .agent-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }
        .agent-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .agent-avatar {
            width: 80px;
            height: 80px;
            background: #e2e8f0;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5em;
        }
        .agent-card h3 {
            margin: 0 0 10px 0;
            font-size: 1.5em;
        }
        .agent-card .status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin: 10px 0;
            padding: 5px 15px;
            background: #f3f4f6;
            border-radius: 20px;
            font-size: 0.9em;
        }
        .agent-card .emotion {
            color: #6b7280;
            margin: 10px 0;
        }
        .agent-card .chat-count {
            color: #6b7280;
            font-size: 0.9em;
        }
        
        /* Chat Interface */
        .chat-interface {
            display: none;
            height: calc(100vh - 60px);
            background: #f3f4f6;
        }
        .chat-container {
            display: grid;
            grid-template-columns: 300px 1fr;
            height: 100%;
        }
        
        /* Chat History Sidebar */
        .chat-history-sidebar {
            background: white;
            border-right: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .chat-header h3 {
            margin: 0;
            font-size: 1.2em;
        }
        .agent-info {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        .agent-info .avatar {
            width: 50px;
            height: 50px;
            background: #e2e8f0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
        }
        .agent-info .details h4 {
            margin: 0;
        }
        .agent-info .details .status {
            font-size: 0.9em;
            color: #6b7280;
        }
        .chat-history-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .history-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            position: relative;
        }
        .history-item:hover {
            background: #f3f4f6;
        }
        .history-item.active {
            background: #e0f2fe !important;
            border-left: 3px solid #2563eb !important;
        }
        .history-item .sender {
            font-weight: bold;
            font-size: 0.9em;
            color: #374151;
        }
        .history-item .preview {
            font-size: 0.85em;
            color: #6b7280;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .history-item .time {
            font-size: 0.8em;
            color: #9ca3af;
            margin-top: 2px;
        }
        
        /* Chat Main Area */
        .chat-main {
            display: flex;
            flex-direction: column;
            background: white;
        }
        .chat-main-header {
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #fafafa;
        }
        .message {
            margin: 15px 0;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        .message.user {
            flex-direction: row-reverse;
        }
        .message-avatar {
            width: 36px;
            height: 36px;
            background: #e2e8f0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9em;
            flex-shrink: 0;
        }
        .message-content {
            max-width: 70%;
        }
        .message-bubble {
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
        }
        .message.user .message-bubble {
            background: #2563eb;
            color: white;
        }
        .message.agent .message-bubble {
            background: #f3f4f6;
            color: #1f2937;
        }
        .message-time {
            font-size: 0.75em;
            color: #9ca3af;
            margin-top: 4px;
            padding: 0 8px;
        }
        .chat-input {
            background: white;
            border-top: 1px solid #e2e8f0;
            padding: 20px;
            display: flex;
            gap: 10px;
        }
        .chat-input input {
            flex: 1;
            padding: 12px 20px;
            border: 1px solid #d1d5db;
            border-radius: 25px;
            outline: none;
            font-size: 0.95em;
        }
        .chat-input input:focus {
            border-color: #2563eb;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }
        .status-active { background-color: #10b981; }
        .status-idle { background-color: #6b7280; }
        .status-error { background-color: #ef4444; }
        .status-thinking { background-color: #3b82f6; }
        
        .back-button {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 8px 16px;
            background: #f3f4f6;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .back-button:hover {
            background: #e5e7eb;
        }
    </style>
</head>
<body>
    ${this.getNavigationHTML()}
    
    <!-- Agent Selection Screen -->
    <div id="agent-selection" class="agent-selection">
        <h1>Select an Agent to Chat With</h1>
        <div id="agents-grid" class="agents-grid">
            <!-- Agent cards will be loaded here -->
        </div>
        <div id="no-agents" style="display: none; text-align: center; padding: 60px; color: #6b7280;">
            <h2>No Agents Available</h2>
            <p>Please start an agent from the dashboard to begin chatting.</p>
        </div>
    </div>
    
    <!-- Chat Interface -->
    <div id="chat-interface" class="chat-interface">
        <div class="chat-container">
            <!-- Chat History Sidebar -->
            <div class="chat-history-sidebar">
                <div class="chat-header">
                    <div class="agent-info">
                        <div class="avatar" id="sidebar-agent-avatar">🤖</div>
                        <div class="details">
                            <h4 id="sidebar-agent-name">Agent</h4>
                            <div class="status" id="sidebar-agent-status">Active</div>
                        </div>
                    </div>
                    <h3>Conversations</h3>
                </div>
                <div class="chat-history-list" id="chat-history-list">
                    <!-- History items will be loaded here -->
                </div>
                <div style="padding: 10px; border-top: 1px solid #e2e8f0;">
                    <button onclick="clearChatHistory()" class="btn btn-danger" style="width: 100%;">
                        Delete Conversation
                    </button>
                </div>
            </div>
            
            <!-- Chat Main Area -->
            <div class="chat-main">
                <div class="chat-main-header">
                    <button class="back-button" onclick="backToAgentSelection()">
                        ← Back to Agents
                    </button>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span id="chat-agent-name" style="font-weight: bold;">Agent</span>
                        <span class="status-indicator" id="chat-agent-status-indicator"></span>
                    </div>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <!-- Messages will be loaded here -->
                </div>
                <div class="chat-input">
                    <input type="text" id="message-input" placeholder="Type your message..." disabled>
                    <button id="send-btn" class="btn btn-primary" disabled>Send</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        ${this.getChatJavaScript()}
    </script>
</body>
</html>`;
  }

  private generateAgentsHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYMindX Agents</title>
    <style>
        ${this.getCommonStyles()}
        .agents-container {
            padding: 20px;
        }
        .agent-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 10px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .agent-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .agent-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .agent-name {
            font-size: 1.5em;
            font-weight: bold;
        }
        .agent-actions {
            display: flex;
            gap: 10px;
        }
        .agent-details {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
        }
        .detail-section h4 {
            margin: 0 0 10px 0;
            color: #374151;
        }
        .extension-item {
            padding: 5px 10px;
            margin: 2px 0;
            background: #f1f5f9;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .extension-enabled {
            background: #d1fae5;
            color: #065f46;
        }
        .extension-disabled {
            background: #fee2e2;
            color: #991b1b;
        }
        .memory-info {
            background: #f8fafc;
            padding: 8px;
            border-radius: 4px;
            margin: 8px 0;
            font-family: monospace;
        }
        .memory-warning {
            color: #f59e0b;
        }
        .memory-critical {
            color: #ef4444;
        }
        .agent-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-running {
            background: #d1fae5;
            color: #065f46;
        }
        .status-stopped {
            background: #fee2e2;
            color: #991b1b;
        }
        .status-disabled {
            background: #f3f4f6;
            color: #6b7280;
        }
        .agent-card.disabled {
            opacity: 0.7;
        }
        .agent-description {
            color: #6b7280;
            font-size: 0.9em;
            margin: 8px 0;
            line-height: 1.4;
        }
        .btn-start {
            background: #10b981;
            color: white;
        }
        .btn-start:hover {
            background: #059669;
        }
        .btn-stop {
            background: #ef4444;
            color: white;
        }
        .btn-stop:hover {
            background: #dc2626;
        }
    </style>
</head>
<body>
    ${this.getNavigationHTML()}
    
    <div class="agents-container">
        <h1>Agent Management</h1>
        
        <div style="margin: 20px 0;">
            <button class="btn btn-primary" onclick="refreshAgents()">🔄 Refresh</button>
            <button class="btn btn-secondary" onclick="createAgent()">➕ Create Agent</button>
        </div>

        <div id="agents-list"></div>
    </div>

    <script>
        ${this.getAgentsJavaScript()}
    </script>
</body>
</html>`;
  }

  private generateMonitorHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYMindX Monitor</title>
    <style>
        ${this.getCommonStyles()}
        .monitor-container {
            padding: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .commands-log {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-height: 500px;
            overflow-y: auto;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 8px;
            background: #f8fafc;
            border-radius: 4px;
        }
        .metric-value {
            font-weight: bold;
            color: #2563eb;
        }
        .command-item {
            padding: 10px;
            margin: 5px 0;
            border-left: 4px solid #e2e8f0;
            background: #f8fafc;
        }
        .command-success {
            border-left-color: #10b981;
        }
        .command-error {
            border-left-color: #ef4444;
        }
        .command-pending {
            border-left-color: #3b82f6;
        }
        .command-time {
            font-size: 0.8em;
            color: #6b7280;
        }
    </style>
</head>
<body>
    ${this.getNavigationHTML()}
    
    <div class="monitor-container">
        <h1>System Monitor</h1>
        
        <div style="margin: 20px 0; display: flex; align-items: center; gap: 20px;">
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="auto-refresh" checked> 
                <span>Auto-refresh (2s)</span>
            </label>
            <button class="btn btn-secondary" onclick="refreshAll()">🔄 Refresh Now</button>
            <span style="color: #6b7280; font-size: 0.9em;">Last updated: <span id="last-update">Never</span></span>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <h3>System Metrics</h3>
                <div id="system-metrics"></div>
            </div>

            <div class="metric-card">
                <h3>Agent Status</h3>
                <div id="agent-metrics"></div>
            </div>

            <div class="metric-card">
                <h3>Command Statistics</h3>
                <div id="command-metrics"></div>
            </div>
        </div>

        <div class="commands-log">
            <h3>Recent Commands</h3>
            <div id="commands-log"></div>
        </div>
    </div>

    <script>
        ${this.getMonitorJavaScript()}
    </script>
</body>
</html>`;
  }

  private generateMultiAgentHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYMindX Multi-Agent Manager</title>
    <style>
        ${this.getCommonStyles()}
        .multi-agent-container {
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .control-panel {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .control-panel h2 {
            margin-bottom: 20px;
            color: #1f2937;
        }
        .control-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .spawn-panel {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 2px dashed #d1d5db;
        }
        .spawn-panel h3 {
            margin-bottom: 15px;
            color: #374151;
        }
        .character-select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            margin-bottom: 10px;
        }
        .spawn-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .spawn-form input {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
        }
        .spawn-form label {
            font-size: 0.9em;
            color: #374151;
            margin-bottom: 5px;
        }
        .bulk-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .system-metrics {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
        }
        .metric-item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 3px 0;
        }
        .metric-value {
            font-weight: bold;
            color: #2563eb;
        }
        .agents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .agent-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
        }
        .agent-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .agent-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }
        .agent-info h3 {
            margin: 0 0 5px 0;
            font-size: 1.3em;
        }
        .agent-id {
            font-size: 0.8em;
            color: #6b7280;
            font-family: monospace;
        }
        .agent-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .status-running {
            background: #d1fae5;
            color: #065f46;
        }
        .status-stopped {
            background: #fee2e2;
            color: #991b1b;
        }
        .status-error {
            background: #fef3c7;
            color: #92400e;
        }
        .status-starting {
            background: #dbeafe;
            color: #1e40af;
        }
        .health-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
        }
        .health-section h4 {
            margin: 0 0 8px 0;
            color: #374151;
            font-size: 0.9em;
        }
        .health-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 0.85em;
        }
        .health-item:last-child {
            border-bottom: none;
        }
        .health-value {
            font-weight: bold;
        }
        .health-good { color: #10b981; }
        .health-warning { color: #f59e0b; }
        .health-critical { color: #ef4444; }
        .agent-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 15px;
        }
        .agent-actions .btn {
            font-size: 0.8em;
            padding: 6px 12px;
        }
        .character-preview {
            background: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            display: none;
        }
        .character-preview.active {
            display: block;
        }
        .character-preview h4 {
            margin: 0 0 10px 0;
            color: #374151;
        }
        .character-traits {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin: 8px 0;
        }
        .trait-tag {
            background: #e2e8f0;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            color: #475569;
        }
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        .error-message {
            background: #fee2e2;
            color: #991b1b;
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9em;
        }
        .success-message {
            background: #d1fae5;
            color: #065f46;
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9em;
        }
        .info-message {
            background: #dbeafe;
            color: #1e40af;
            padding: 10px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9em;
        }
        .real-time-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .routing-panel {
            background: #f8fafc;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        .specialty-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin: 8px 0;
        }
        .specialty-tag {
            background: #3b82f6;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.75em;
        }
    </style>
</head>
<body>
    ${this.getNavigationHTML()}
    
    <div class="multi-agent-container">
        <div class="control-panel">
            <h2>🎛️ Multi-Agent Control Center <span class="real-time-indicator"></span></h2>
            
            <div class="control-grid">
                <!-- Spawn New Agent -->
                <div class="spawn-panel">
                    <h3>🚀 Spawn New Agent</h3>
                    <div class="spawn-form">
                        <label>Character:</label>
                        <select id="character-select" class="character-select" onchange="showCharacterPreview(this.value)">
                            <option value="">Select a character...</option>
                        </select>
                        
                        <div id="character-preview" class="character-preview">
                            <!-- Character details will be loaded here -->
                        </div>
                        
                        <label>Instance Name (optional):</label>
                        <input type="text" id="instance-name" placeholder="Custom agent instance name">
                        
                        <label>
                            <input type="checkbox" id="auto-start" checked>
                            Auto-start after spawning
                        </label>
                        
                        <button class="btn btn-primary" onclick="spawnAgent()">🚀 Spawn Agent</button>
                    </div>
                    
                    <div id="spawn-message"></div>
                </div>

                <!-- System Metrics -->
                <div class="system-metrics">
                    <h3>📊 System Status</h3>
                    <div id="system-metrics">
                        <div class="metric-item">
                            <span>Multi-Agent System:</span>
                            <span class="metric-value" id="system-status">Loading...</span>
                        </div>
                        <div class="metric-item">
                            <span>Active Agents:</span>
                            <span class="metric-value" id="active-agents">0</span>
                        </div>
                        <div class="metric-item">
                            <span>Memory Usage:</span>
                            <span class="metric-value" id="total-memory">0 MB</span>
                        </div>
                        <div class="metric-item">
                            <span>Avg Response Time:</span>
                            <span class="metric-value" id="avg-response">0ms</span>
                        </div>
                        <div class="metric-item">
                            <span>System Load:</span>
                            <span class="metric-value" id="system-load">0%</span>
                        </div>
                    </div>
                </div>

                <!-- Routing & Discovery -->
                <div class="routing-panel">
                    <h3>🎯 Agent Routing</h3>
                    <div style="margin-bottom: 10px;">
                        <label>Find agents by specialty:</label>
                        <select id="specialty-select" onchange="findBySpecialty(this.value)">
                            <option value="">Select specialty...</option>
                            <option value="chat">Chat & Conversation</option>
                            <option value="analysis">Data Analysis</option>
                            <option value="creative">Creative Tasks</option>
                            <option value="technical">Technical Support</option>
                            <option value="emotional">Emotional Support</option>
                        </select>
                    </div>
                    <div id="specialty-results"></div>
                    
                    <div style="margin-top: 15px;">
                        <button class="btn btn-secondary" onclick="testRouting()">🧪 Test Routing</button>
                    </div>
                </div>
            </div>

            <!-- Bulk Actions -->
            <div class="bulk-actions">
                <button class="btn btn-primary" onclick="startAllAgents()">▶️ Start All</button>
                <button class="btn btn-secondary" onclick="stopAllAgents()">⏹️ Stop All</button>
                <button class="btn btn-secondary" onclick="restartAllAgents()">🔄 Restart All</button>
                <button class="btn btn-secondary" onclick="refreshAgents()">🔄 Refresh</button>
                <button class="btn btn-danger" onclick="emergencyStop()">🚨 Emergency Stop</button>
            </div>
        </div>

        <!-- Managed Agents Grid -->
        <div id="agents-grid" class="agents-grid">
            <!-- Agent cards will be loaded here -->
        </div>
        
        <div id="no-agents-message" style="display: none; text-align: center; padding: 60px; color: #6b7280;">
            <h3>No Multi-Agent System Available</h3>
            <p>The Multi-Agent Manager is not initialized or no agents are currently managed.</p>
            <p>Spawn your first agent using the control panel above.</p>
        </div>
    </div>

    <script>
        ${this.getMultiAgentJavaScript()}
    </script>
</body>
</html>`;
  }

  private getCommonStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1f2937;
        }
        .navbar {
            background: #1e293b;
            color: white;
            padding: 0 20px;
            display: flex;
            align-items: center;
            height: 60px;
        }
        .navbar h1 {
            margin-right: 30px;
        }
        .navbar a {
            color: white;
            text-decoration: none;
            margin: 0 15px;
            padding: 8px 16px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .navbar a:hover {
            background: rgba(255,255,255,0.1);
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #2563eb;
            color: white;
        }
        .btn-primary:hover {
            background: #1d4ed8;
        }
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        .btn-secondary:hover {
            background: #4b5563;
        }
        .btn-danger {
            background: #dc2626;
            color: white;
        }
        .btn-danger:hover {
            background: #b91c1c;
        }
        h1, h2, h3 {
            color: #1f2937;
        }
    `;
  }

  private getNavigationHTML(): string {
    return `
    <nav class="navbar">
        <h1>🤖 SYMindX</h1>
        <a href="/ui">Dashboard</a>
        <a href="/ui/chat">Chat</a>
        <a href="/ui/agents">Agents</a>
        <a href="/ui/multi-agent">Multi-Agent Manager</a>
        <a href="/ui/monitor">Monitor</a>
    </nav>
    `;
  }

  private getDashboardJavaScript(): string {
    return `
        let updateCount = 0;
        let lastCommandCount = 0;
        
        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            if (hours > 0) return hours + 'h ' + minutes + 'm ' + secs + 's';
            if (minutes > 0) return minutes + 'm ' + secs + 's';
            return secs + 's';
        }
        
        function formatMemory(bytes) {
            const mb = bytes / 1024 / 1024;
            if (mb > 1024) return (mb / 1024).toFixed(2) + ' GB';
            return mb.toFixed(2) + ' MB';
        }
        
        async function loadDashboard() {
            try {
                const [statsRes, agentsRes, commandsRes] = await Promise.all([
                    fetch('/api/stats'),
                    fetch('/api/agents'),
                    fetch('/api/commands?limit=10')
                ]);
                
                const stats = await statsRes.json();
                const agentsData = await agentsRes.json();
                const commands = await commandsRes.json();
                const agents = agentsData.agents || [];

                // Update system stats with better formatting
                const statusEl = document.getElementById('system-status');
                const isRunning = stats.runtime?.isRunning;
                statusEl.innerHTML = isRunning 
                    ? '<span class="status-indicator status-active"></span>Running' 
                    : '<span class="status-indicator status-error"></span>Stopped';
                
                document.getElementById('system-uptime').textContent = formatUptime(stats.system?.uptime || 0);
                document.getElementById('memory-usage').textContent = formatMemory(stats.system?.memory?.heapUsed || 0);
                document.getElementById('node-version').textContent = stats.system?.nodeVersion || 'Unknown';

                // Update agent stats with detailed cards
                document.getElementById('total-agents').textContent = agents.length;
                
                const agentList = document.getElementById('agent-list');
                if (agents.length > 0) {
                    agentList.innerHTML = agents.map(agent => \`
                        <div class="agent-card">
                            <h4>
                                <span class="status-indicator status-\${agent.status.toLowerCase()}"></span>
                                \${agent.name}
                            </h4>
                            <div class="agent-detail">Status: \${agent.status}</div>
                            <div class="agent-detail">Emotion: \${agent.emotion || 'neutral'}</div>
                            <div class="agent-detail">Extensions: \${agent.extensionCount}</div>
                            <div class="agent-detail">Portal: \${agent.hasPortal ? '✅ Connected' : '❌ None'}</div>
                            <div class="timestamp">Last update: \${new Date(agent.lastUpdate).toLocaleTimeString()}</div>
                        </div>
                    \`).join('');
                } else {
                    agentList.innerHTML = '<p class="timestamp">No agents running</p>';
                }

                // Update command stats with calculations
                const totalCommands = stats.commands?.totalCommands || 0;
                const completedCommands = stats.commands?.completedCommands || 0;
                const successRate = totalCommands > 0 
                    ? ((completedCommands / totalCommands) * 100).toFixed(1)
                    : 0;
                const activeCommands = (stats.commands?.pendingCommands || 0) + (stats.commands?.processingCommands || 0);
                
                document.getElementById('total-commands').textContent = totalCommands;
                document.getElementById('success-rate').textContent = successRate + '%';
                document.getElementById('active-commands').textContent = activeCommands;
                document.getElementById('avg-response-time').textContent = 
                    (stats.commands?.avgResponseTime || 0).toFixed(0) + 'ms';
                
                // Update recent activity
                const activityEl = document.getElementById('recent-activity');
                if (commands && commands.length > 0) {
                    activityEl.innerHTML = commands.map(cmd => {
                        const time = new Date(cmd.timestamp);
                        const statusClass = cmd.status === 'completed' ? 'status-active' : 
                                          cmd.status === 'failed' ? 'status-error' : 'status-thinking';
                        return \`
                            <div class="activity-item">
                                <div style="display: flex; justify-content: space-between;">
                                    <span><span class="status-indicator \${statusClass}"></span>\${cmd.type}</span>
                                    <span class="timestamp">\${time.toLocaleTimeString()}</span>
                                </div>
                                <div class="timestamp">\${cmd.message || cmd.command || 'No details'}</div>
                            </div>
                        \`;
                    }).join('');
                } else {
                    activityEl.innerHTML = '<p class="timestamp">No recent activity</p>';
                }
                
                updateCount++;
            } catch (error) {
    void error;
                this.logger.error('Failed to load dashboard', error as Error);
                document.getElementById('system-status').innerHTML = 
                    '<span class="status-indicator status-error"></span>Error loading data';
            }
        }

        // Initial load and set refresh interval
        loadDashboard();
        setInterval(loadDashboard, 2000); // Refresh every 2 seconds for real-time feel
        
        // Add WebSocket connection for instant updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
        
        ws.onopen = () => {
            this.logger.info('WebSocket connected for real-time updates');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'agent-update' || data.type === 'command-update' || data.type === 'system-update') {
                    loadDashboard(); // Trigger immediate update
                }
            } catch (err) {
                this.logger.error('WebSocket message error', err as Error);
            }
        };
        
        ws.onerror = (error) => {
            this.logger.error('WebSocket error', error as Error);
        };
    `;
  }

  private getChatJavaScript(): string {
    return `
        let ws = null;
        let selectedAgentId = null;
        let selectedAgentName = null;
        let selectedConversationId = null;
        let agents = [];
        let conversations = [];
        const userId = 'default_user'; // Default user ID for WebUI sessions
        
        // Load agents for selection screen
        async function loadAgentSelection() {
            try {
                const response = await fetch('/api/agents');
                const data = await response.json();
                agents = data.agents || [];
                
                const agentsGrid = document.getElementById('agents-grid');
                const noAgentsDiv = document.getElementById('no-agents');
                
                if (!agents || agents.length === 0) {
                    agentsGrid.style.display = 'none';
                    noAgentsDiv.style.display = 'block';
                    return;
                }
                
                agentsGrid.style.display = 'grid';
                noAgentsDiv.style.display = 'none';
                
                // Get conversation counts for each agent
                const conversationPromises = agents.map(agent => 
                    fetch(\`/api/conversations?userId=\${userId}&agentId=\${agent.id}&limit=1\`)
                        .then(r => r.json())
                        .then(d => ({ agentId: agent.id, count: d.conversations?.length || 0 }))
                        .catch(() => ({ agentId: agent.id, count: 0 }))
                );
                const conversationCounts = await Promise.all(conversationPromises);
                const conversationMap = Object.fromEntries(conversationCounts.map(c => [c.agentId, c.count]));
                
                agentsGrid.innerHTML = agents.map(agent => {
                    const conversationCount = conversationMap[agent.id] || 0;
                    const statusClass = agent.status.toLowerCase();
                    const emotionIcon = agent.emotion ? '😊' : '🤖';
                    
                    return \`
                        <div class="agent-card" onclick="selectAgentForChat('\${agent.id}', '\${agent.name}')">
                            <div class="agent-avatar">\${emotionIcon}</div>
                            <h3>\${agent.name}</h3>
                            <div class="status">
                                <span class="status-indicator status-\${statusClass}"></span>
                                \${agent.status}
                            </div>
                            \${agent.emotion ? \`<div class="emotion">Feeling: \${agent.emotion.type || agent.emotion}</div>\` : ''}
                            <div class="chat-count">\${conversationCount} conversations</div>
                        </div>
                    \`;
                }).join('');
            } catch (error) {
    void error;
                console.error('Failed to load agents:', error);
                document.getElementById('agents-grid').innerHTML = 
                    '<div style="grid-column: 1/-1; text-align: center; color: #ef4444;">Failed to load agents</div>';
            }
        }
        
        // Select agent and switch to chat interface
        async function selectAgentForChat(agentId, agentName) {
            selectedAgentId = agentId;
            selectedAgentName = agentName;
            
            // Hide selection screen, show chat interface
            document.getElementById('agent-selection').style.display = 'none';
            document.getElementById('chat-interface').style.display = 'block';
            
            // Update agent info in sidebar
            document.getElementById('sidebar-agent-name').textContent = agentName;
            document.getElementById('chat-agent-name').textContent = agentName;
            
            const agent = agents.find(a => a.id === agentId);
            if (agent) {
                const statusText = agent.status;
                const statusClass = agent.status.toLowerCase();
                document.getElementById('sidebar-agent-status').textContent = statusText;
                
                const statusIndicator = document.getElementById('chat-agent-status-indicator');
                statusIndicator.className = 'status-indicator status-' + statusClass;
            }
            
            // Load conversations for this agent
            await loadConversationsForAgent(agentId);
            
            // Enable input
            document.getElementById('message-input').disabled = false;
            document.getElementById('send-btn').disabled = false;
            document.getElementById('message-input').focus();
        }
        
        // Load conversations for selected agent
        async function loadConversationsForAgent(agentId) {
            try {
                const response = await fetch(\`/api/conversations?userId=\${userId}&agentId=\${agentId}&limit=50\`);
                const data = await response.json();
                
                conversations = data.conversations || [];
                
                // Update conversation list in sidebar
                updateConversationsSidebar(conversations);
                
                // If there are conversations, select the most recent one
                if (conversations.length > 0) {
                    await selectConversation(conversations[0].id);
                } else {
                    // No conversations, show welcome message and create new conversation
                    await createNewConversation(agentId);
                }
            } catch (error) {
    void error;
                console.error('Failed to load conversations:', error);
                showWelcomeMessage();
            }
        }
        
        // Create a new conversation
        async function createNewConversation(agentId) {
            try {
                const response = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentId: agentId,
                        userId: userId,
                        title: \`Chat with \${selectedAgentName}\`
                    })
                });
                
                if (!response.ok) throw new Error('Failed to create conversation');
                
                const data = await response.json();
                const conversation = data.conversation;
                
                // Add to conversations list
                conversations.unshift(conversation);
                
                // Select the new conversation
                await selectConversation(conversation.id);
                
                // Update sidebar
                updateConversationsSidebar(conversations);
                
                this.logger.info('Created new conversation', { conversationId: conversation.id });
            } catch (error) {
    void error;
                this.logger.error('Failed to create conversation', error as Error);
                showWelcomeMessage();
            }
        }
        
        // Select and load a conversation
        async function selectConversation(conversationId) {
            selectedConversationId = conversationId;
            
            try {
                const response = await fetch(\`/api/conversations/\${conversationId}/messages?limit=1000\`);
                const data = await response.json();
                
                const messages = data.messages || [];
                
                // Load messages into chat area
                const messagesEl = document.getElementById('chat-messages');
                messagesEl.innerHTML = '';
                
                if (messages.length > 0) {
                    messages.forEach(msg => {
                        addMessage(msg.message, msg.sender, new Date(msg.timestamp), false);
                    });
                } else {
                    showWelcomeMessage();
                }
                
                // Scroll to bottom
                messagesEl.scrollTop = messagesEl.scrollHeight;
                
                // Update active conversation in sidebar
                updateActiveConversationInSidebar(conversationId);
                
            } catch (error) {
    void error;
                console.error('Failed to load conversation messages:', error);
                showWelcomeMessage();
            }
        }
        
        // Show welcome message
        function showWelcomeMessage() {
            const messagesEl = document.getElementById('chat-messages');
            messagesEl.innerHTML = '';
            
            const welcomeDiv = document.createElement('div');
            welcomeDiv.style.textAlign = 'center';
            welcomeDiv.style.padding = '40px';
            welcomeDiv.style.color = '#6b7280';
            welcomeDiv.innerHTML = \`
                <h3>Start a conversation with \${selectedAgentName}</h3>
                <p>No messages yet. Say hello!</p>
            \`;
            messagesEl.appendChild(welcomeDiv);
        }
        
        // Update conversations sidebar
        function updateConversationsSidebar(conversations) {
            const historyList = document.getElementById('chat-history-list');
            
            if (!conversations || conversations.length === 0) {
                historyList.innerHTML = \`
                    <div style="text-align: center; padding: 20px; color: #9ca3af;">
                        <p>No conversations yet</p>
                        <button onclick="createNewConversation('\${selectedAgentId}')" class="btn btn-primary" style="margin-top: 10px; font-size: 0.9em;">
                            Start New Chat
                        </button>
                    </div>
                \`;
                return;
            }
            
            historyList.innerHTML = \`
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
                    <button onclick="createNewConversation('\${selectedAgentId}')" class="btn btn-primary" style="width: 100%; font-size: 0.9em;">
                        + New Conversation
                    </button>
                </div>
                \${conversations.map(conversation => {
                    const isActive = conversation.id === selectedConversationId;
                    const title = conversation.title || 'Untitled Chat';
                    const lastMessageTime = conversation.lastMessageAt ? 
                        formatHistoryTime(new Date(conversation.lastMessageAt)) : 
                        formatHistoryTime(new Date(conversation.updatedAt));
                    
                    return \`
                        <div class="history-item \${isActive ? 'active' : ''}" 
                             onclick="selectConversation('\${conversation.id}')"
                             style="\${isActive ? 'background: #e0f2fe; border-left: 3px solid #2563eb;' : ''}">
                            <div class="preview" style="font-weight: \${isActive ? 'bold' : 'normal'};">
                                \${truncateText(title, 35)}
                            </div>
                            <div class="time">\${lastMessageTime}</div>
                            <div style="font-size: 0.75em; color: #9ca3af;">
                                \${conversation.messageCount || 0} messages
                            </div>
                            <div style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%);">
                                <button onclick="event.stopPropagation(); deleteConversation('\${conversation.id}')" 
                                        style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 2px;"
                                        title="Delete conversation">×</button>
                            </div>
                        </div>
                    \`;
                }).join('')}
            \`;
        }
        
        // Update active conversation highlighting in sidebar
        function updateActiveConversationInSidebar(conversationId) {
            const historyItems = document.querySelectorAll('.history-item');
            historyItems.forEach(item => {
                item.classList.remove('active');
                item.style.background = '';
                item.style.borderLeft = '';
                const preview = item.querySelector('.preview');
                if (preview) preview.style.fontWeight = 'normal';
            });
            
            // Find and highlight the active conversation
            historyItems.forEach(item => {
                if (item.onclick && item.onclick.toString().includes(conversationId)) {
                    item.classList.add('active');
                    item.style.background = '#e0f2fe';
                    item.style.borderLeft = '3px solid #2563eb';
                    const preview = item.querySelector('.preview');
                    if (preview) preview.style.fontWeight = 'bold';
                }
            });
        }
        
        // Delete conversation
        async function deleteConversation(conversationId) {
            if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                return;
            }
            
            try {
                const response = await fetch(\`/api/conversations/\${conversationId}?userId=\${userId}\`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Failed to delete conversation');
                
                // Remove from conversations array
                conversations = conversations.filter(c => c.id !== conversationId);
                
                // If this was the selected conversation, select another or create new
                if (selectedConversationId === conversationId) {
                    if (conversations.length > 0) {
                        await selectConversation(conversations[0].id);
                    } else {
                        await createNewConversation(selectedAgentId);
                    }
                }
                
                // Update sidebar
                updateConversationsSidebar(conversations);
                
            } catch (error) {
    void error;
                console.error('Failed to delete conversation:', error);
                alert('Failed to delete conversation. Please try again.');
            }
        }
        
        // Add message to chat
        function addMessage(content, sender, timestamp = new Date(), scrollToBottom = true) {
            const messagesEl = document.getElementById('chat-messages');
            
            // Remove welcome message if it exists
            const welcomeMsg = messagesEl.querySelector('div[style*="text-align: center"]');
            if (welcomeMsg) welcomeMsg.remove();
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + sender;
            messageDiv.id = 'msg_' + timestamp.getTime();
            
            const avatarIcon = sender === 'user' ? '👤' : '🤖';
            
            messageDiv.innerHTML = \`
                <div class="message-avatar">\${avatarIcon}</div>
                <div class="message-content">
                    <div class="message-bubble">\${escapeHtml(content)}</div>
                    <div class="message-time">\${timestamp.toLocaleTimeString()}</div>
                </div>
            \`;
            
            messagesEl.appendChild(messageDiv);
            
            if (scrollToBottom) {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        }
        
        // Send message
        async function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            
            if (!message || !selectedConversationId) return;
            
            // Add user message immediately
            addMessage(message, 'user');
            input.value = '';
            
            // Show typing indicator
            const typingId = 'typing-' + Date.now();
            const messagesEl = document.getElementById('chat-messages');
            const typingDiv = document.createElement('div');
            typingDiv.id = typingId;
            typingDiv.className = 'message agent';
            typingDiv.innerHTML = \`
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-bubble" style="background: #e5e7eb;">
                        <span class="typing-dots">Thinking</span>
                    </div>
                </div>
            \`;
            messagesEl.appendChild(typingDiv);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            
            // Animate dots
            let dots = 0;
            const dotsInterval = setInterval(() => {
                dots = (dots + 1) % 4;
                const dotsEl = typingDiv.querySelector('.typing-dots');
                if (dotsEl) {
                    dotsEl.textContent = 'Thinking' + '.'.repeat(dots);
                }
            }, 500);
            
            try {
                const response = await fetch(\`/api/conversations/\${selectedConversationId}/messages\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: message,
                        userId: userId
                    })
                });
                
                clearInterval(dotsInterval);
                document.getElementById(typingId)?.remove();
                
                if (!response.ok) throw new Error('Chat request failed');
                
                const data = await response.json();
                
                // Add agent response
                addMessage(data.agentMessage.message, 'agent', new Date(data.agentMessage.timestamp));
                
                // Update conversation list to reflect new message
                await loadConversationsForAgent(selectedAgentId);
                
            } catch (error) {
    void error;
                clearInterval(dotsInterval);
                document.getElementById(typingId)?.remove();
                console.error('Failed to send message:', error);
                addMessage('Sorry, I encountered an error. Please try again.', 'agent');
            }
        }
        
        // Clear chat history (now clears current conversation)
        async function clearChatHistory() {
            if (!selectedConversationId || !confirm('Delete this conversation? This action cannot be undone.')) return;
            
            await deleteConversation(selectedConversationId);
        }
        
        // Go back to agent selection
        function backToAgentSelection() {
            document.getElementById('chat-interface').style.display = 'none';
            document.getElementById('agent-selection').style.display = 'block';
            selectedAgentId = null;
            selectedAgentName = null;
            selectedConversationId = null;
            conversations = [];
            loadAgentSelection();
        }
        
        // Utility functions
        function formatHistoryTime(date) {
            const now = new Date();
            const diff = now - date;
            
            if (diff < 86400000) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        }
        
        function truncateText(text, maxLength) {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function scrollToMessage(messageId) {
            const msgEl = document.getElementById(messageId);
            if (msgEl) {
                msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                msgEl.style.background = '#fef3c7';
                setTimeout(() => msgEl.style.background = '', 2000);
            }
        }

        // Event listeners
        document.getElementById('send-btn').addEventListener('click', sendMessage);
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Initialize
        loadAgentSelection();
        setInterval(loadAgentSelection, 10000); // Refresh agent list
        
        // WebSocket for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(\`\${protocol}//\${window.location.host}/ws\`);
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'agent_update') {
                    loadAgentSelection();
                } else if (data.type === 'chat_message' && data.agentId === selectedAgentId) {
                    addMessage(data.message, 'agent');
                }
            } catch (error) {
    void error;
                this.logger.error('WebSocket error', error as Error);
            }
        };
    `;
  }

  private getAgentsJavaScript(): string {
    return `
        let selectedAgentDetails = null;
        let systemStats = null;
        
        // Memory formatting function
        function formatMemory(bytes) {
            if (!bytes) return '0 MB';
            const mb = bytes / 1024 / 1024;
            if (mb > 1024) return (mb / 1024).toFixed(2) + ' GB';
            return mb.toFixed(2) + ' MB';
        }
        
        // Load system stats
        async function loadSystemStats() {
            try {
                const response = await fetch('/api/stats');
                systemStats = await response.json();
            } catch (error) {
    void error;
                console.error('Failed to load system stats:', error);
            }
        }
        
        async function loadAgents() {
            try {
                // Load system stats first
                await loadSystemStats();
                
                const response = await fetch('/api/agents/all');
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                const data = await response.json();
                const agents = data.agents || [];
                const agentsList = document.getElementById('agents-list');
                
                console.log('Loaded all agents:', agents); // Debug log
                
                if (!agents || agents.length === 0) {
                    agentsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">No agent configurations found. Please add character files to get started.</div>';
                    return;
                }
                
                agentsList.innerHTML = agents.map(agent => \`
                    <div class="agent-card \${!agent.enabled ? 'disabled' : ''}" id="agent-card-\${agent.id}">
                        <div class="agent-header">
                            <div>
                                <div class="agent-name">\${agent.name}</div>
                                <div style="color: #6b7280; font-size: 0.9em;">\${agent.id}</div>
                                <div class="agent-description">\${agent.description || ''}</div>
                                <div class="agent-status">
                                    <span class="status-badge status-\${agent.isRunning ? 'running' : (agent.enabled ? 'stopped' : 'disabled')}">
                                        \${agent.isRunning ? 'Running' : (agent.enabled ? 'Stopped' : 'Disabled')}
                                    </span>
                                    <span style="color: #6b7280; font-size: 0.8em;">v\${agent.version || '1.0.0'}</span>
                                </div>
                            </div>
                            <div class="agent-actions">
                                \${agent.isRunning ? \`
                                    <button class="btn btn-primary" onclick="chatWithAgent('\${agent.id}')">💬 Chat</button>
                                    <button class="btn btn-secondary" onclick="viewAgentDetails('\${agent.id}')">📋 Details</button>
                                    <button class="btn btn-secondary" onclick="sendCommand('\${agent.id}')">⚡ Command</button>
                                    <button class="btn btn-stop" onclick="stopAgent('\${agent.id}')">🛑 Stop</button>
                                \` : \`
                                    <button class="btn btn-start" onclick="startAgent('\${agent.id}')" \${!agent.enabled ? 'disabled' : ''}>
                                        ▶️ Start
                                    </button>
                                    <button class="btn btn-secondary" onclick="viewAgentConfig('\${agent.id}')">⚙️ Config</button>
                                \`}
                            </div>
                        </div>
                        \${agent.isRunning ? \`
                        <div class="agent-details">
                            <div class="detail-section">
                                <h4>Status & State</h4>
                                <div style="margin: 8px 0;">
                                    <span class="status-indicator status-\${agent.status.toLowerCase()}"></span>
                                    <strong>\${agent.status}</strong>
                                </div>
                                <div style="margin: 4px 0; color: #64748b;">Emotion: \${agent.emotion || 'neutral'}</div>
                                <div style="margin: 4px 0; color: #64748b;">Last Update: \${formatTime(agent.lastUpdate)}</div>
                            </div>
                            <div class="detail-section">
                                <h4>Configuration</h4>
                                <div style="margin: 4px 0;">Extensions: \${agent.extensionCount || 0}</div>
                                <div style="margin: 4px 0;">Portal: \${agent.hasPortal ? '✅ Connected' : '❌ None'}</div>
                                <div id="extensions-\${agent.id}" style="margin-top: 8px;"></div>
                            </div>
                            <div class="detail-section">
                                <h4>Real-time Metrics</h4>
                                <div id="metrics-\${agent.id}">
                                    <div style="margin: 4px 0; color: #64748b;">Loading metrics...</div>
                                </div>
                            </div>
                        </div>
                        \` : \`
                        <div class="agent-details">
                            <div class="detail-section">
                                <h4>Personality Traits</h4>
                                \${Object.entries(agent.personality).map(([trait, value]) => 
                                    \`<div style="margin: 4px 0; display: flex; justify-content: space-between;">
                                        <span>\${trait}:</span>
                                        <span style="font-weight: bold;">\${typeof value === 'number' ? (value * 100).toFixed(0) + '%' : value}</span>
                                    </div>\`
                                ).join('')}
                            </div>
                            <div class="detail-section">
                                <h4>Capabilities</h4>
                                \${Object.entries(agent.capabilities).map(([category, caps]) =>
                                    \`<div style="margin: 4px 0;">
                                        <strong>\${category}:</strong>
                                        <div style="margin-left: 10px; font-size: 0.9em; color: #6b7280;">
                                            \${Object.entries(caps).filter(([_, enabled]) => enabled).map(([cap, _]) => cap).join(', ')}
                                        </div>
                                    </div>\`
                                ).join('')}
                            </div>
                            <div class="detail-section">
                                <h4>Communication</h4>
                                <div style="margin: 4px 0;">Style: \${agent.communication.style || 'default'}</div>
                                <div style="margin: 4px 0;">Tone: \${agent.communication.tone || 'neutral'}</div>
                                <div style="margin: 4px 0;">Languages: \${(agent.communication.languages || ['en']).join(', ')}</div>
                            </div>
                        </div>
                        \`}
                    </div>
                \`).join('');
                
                // Load detailed info for running agents
                agents.filter(agent => agent.isRunning).forEach(agent => loadAgentDetails(agent.id));
            } catch (error) {
    void error;
                console.error('Failed to load agents:', error);
                document.getElementById('agents-list').innerHTML = 
                    '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load agents. Please refresh the page.</div>';
            }
        }
        
        function formatTime(timestamp) {
            if (!timestamp) return 'Never';
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
            if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
            return date.toLocaleString();
        }
        
        async function loadAgentDetails(agentId) {
            try {
                const response = await fetch(\`/api/agent/\${agentId}\`);
                if (!response.ok) {
                    console.error(\`Failed to load agent details for \${agentId}: HTTP \${response.status}\`);
                    return;
                }
                const agent = await response.json();
                
                // Update extensions list
                const extensionsEl = document.getElementById(\`extensions-\${agentId}\`);
                if (agent.extensions && agent.extensions.length > 0) {
                    extensionsEl.innerHTML = agent.extensions.map(ext => \`
                        <div class="extension-item \${ext.enabled ? 'extension-enabled' : 'extension-disabled'}">
                            \${ext.name} (\${ext.status})
                        </div>
                    \`).join('');
                }
                
                // Update metrics with memory information
                const metricsEl = document.getElementById(\`metrics-\${agentId}\`);
                let memoryHtml = '<div class="memory-info">';
                
                if (systemStats && systemStats.system) {
                    const processMemory = systemStats.system.memory;
                    const systemMemoryUsed = systemStats.system.totalSystemMemory - systemStats.system.freeSystemMemory;
                    const systemMemoryPercent = ((systemMemoryUsed / systemStats.system.totalSystemMemory) * 100).toFixed(1);
                    const processMemoryPercent = ((processMemory.heapUsed / processMemory.heapTotal) * 100).toFixed(1);
                    
                    // Apply color coding based on memory usage
                    const systemMemoryClass = systemMemoryPercent > 90 ? 'memory-critical' : systemMemoryPercent > 75 ? 'memory-warning' : '';
                    const processMemoryClass = processMemoryPercent > 90 ? 'memory-critical' : processMemoryPercent > 75 ? 'memory-warning' : '';
                    
                    memoryHtml += \`
                        <div style="margin: 4px 0;">
                            <strong>System RAM:</strong> <span class="\${systemMemoryClass}">\${formatMemory(systemMemoryUsed)} / \${formatMemory(systemStats.system.totalSystemMemory)} (\${systemMemoryPercent}%)</span>
                        </div>
                        <div style="margin: 4px 0;">
                            <strong>Process:</strong> <span class="\${processMemoryClass}">\${formatMemory(processMemory.heapUsed)} / \${formatMemory(processMemory.heapTotal)} (\${processMemoryPercent}%)</span>
                        </div>
                    \`;
                }
                
                // If agent has individual memory tracking, add it
                if (agent.memoryUsage) {
                    memoryHtml += \`
                        <div style="margin: 4px 0;">
                            <strong>Agent Memory:</strong> \${formatMemory(agent.memoryUsage)}
                        </div>
                    \`;
                }
                
                memoryHtml += '</div>';
                
                metricsEl.innerHTML = memoryHtml + \`
                    <div style="margin: 4px 0; color: #64748b;">Commands: \${agent.commandsProcessed || 0}</div>
                    <div style="margin: 4px 0; color: #64748b;">Uptime: \${formatUptime(agent.lastUpdate)}</div>
                \`;
                
            } catch (error) {
    void error;
                console.error(\`Failed to load details for agent \${agentId}:\`, error);
            }
        }
        
        function formatUptime(startTime) {
            if (!startTime) return '0s';
            const diff = Date.now() - new Date(startTime).getTime();
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            if (hours > 0) return hours + 'h ' + minutes + 'm';
            return minutes + 'm';
        }

        function chatWithAgent(agentId) {
            window.location.href = \`/chat?agent=\${agentId}\`;
        }

        async function viewAgentDetails(agentId) {
            try {
                const agent = await fetch(\`/api/agent/\${agentId}\`).then(r => r.json());
                
                // Create a nice modal-like display
                const detailsHtml = \`
                    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="this.remove()">
                        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation()">
                            <h2>\${agent.name} Details</h2>
                            <pre style="background: #f8fafc; padding: 15px; border-radius: 4px; overflow-x: auto;">\${JSON.stringify(agent, null, 2)}</pre>
                            <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()" style="margin-top: 20px;">Close</button>
                        </div>
                    </div>
                \`;
                
                document.body.insertAdjacentHTML('beforeend', detailsHtml);
            } catch (error) {
    void error;
                alert('Failed to load agent details: ' + error.message);
            }
        }
        
        async function sendCommand(agentId) {
            const command = prompt('Enter command for agent:');
            if (!command) return;
            
            try {
                const response = await fetch('/api/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentId: agentId,
                        command: command,
                        priority: 'normal'
                    })
                });
                
                const result = await response.json();
                if (result.error) {
                    alert('Command failed: ' + result.error);
                } else {
                    alert('Command sent successfully!\nCommand ID: ' + result.commandId);
                }
            } catch (error) {
    void error;
                alert('Failed to send command: ' + error.message);
            }
        }

        function refreshAgents() {
            loadAgents();
        }

        function createAgent() {
            alert('Agent creation interface coming soon!\n\nTo create an agent:\n1. Add a character JSON file in src/characters/\n2. Configure it in mind-agents/src/core/config/runtime.json\n3. Restart the runtime');
        }

        async function startAgent(agentId) {
            try {
                const btn = document.querySelector(\`button[onclick="startAgent('\${agentId}')"]\`);
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = '⏳ Starting...';
                }

                const response = await fetch(\`/api/agents/\${agentId}/start\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                
                if (response.ok) {
                    console.log(\`Agent \${agentId} started successfully\`);
                    // Refresh the agents list to show the updated status
                    setTimeout(loadAgents, 1000);
                } else {
                    console.error('Failed to start agent:', data.error);
                    alert(\`Failed to start agent: \${data.error}\`);
                }
            } catch (error) {
    void error;
                console.error('Error starting agent:', error);
                alert(\`Error starting agent: \${error.message}\`);
            } finally {
                // Re-enable the button
                const btn = document.querySelector(\`button[onclick="startAgent('\${agentId}')"]\`);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '▶️ Start';
                }
            }
        }

        async function stopAgent(agentId) {
            try {
                const btn = document.querySelector(\`button[onclick="stopAgent('\${agentId}')"]\`);
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = '⏳ Stopping...';
                }

                const response = await fetch(\`/api/agents/\${agentId}/stop\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                
                if (response.ok) {
                    console.log(\`Agent \${agentId} stopped successfully\`);
                    // Refresh the agents list to show the updated status
                    setTimeout(loadAgents, 1000);
                } else {
                    console.error('Failed to stop agent:', data.error);
                    alert(\`Failed to stop agent: \${data.error}\`);
                }
            } catch (error) {
    void error;
                console.error('Error stopping agent:', error);
                alert(\`Error stopping agent: \${error.message}\`);
            } finally {
                // Re-enable the button
                const btn = document.querySelector(\`button[onclick="stopAgent('\${agentId}')"]\`);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '🛑 Stop';
                }
            }
        }

        function viewAgentConfig(agentId) {
            // For now, show a simple alert with basic info
            // In the future, this could open a modal with full config details
            alert(\`Agent Configuration: \${agentId}\n\nConfiguration viewing interface coming soon!\n\nFor now, you can view the character file in src/characters/\${agentId}.json\`);
        }

        // Initialize and set up auto-refresh
        loadAgents();
        setInterval(loadAgents, 5000); // Refresh every 5 seconds
        
        // WebSocket for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'agent-update') {
                    loadAgents(); // Reload on agent updates
                }
            } catch (err) {
                console.error('WebSocket error:', err);
            }
        };
    `;
  }

  private getMonitorJavaScript(): string {
    return `
        let autoRefresh = true;
        let refreshInterval;
        let chartData = {
            timestamps: [],
            memory: [],
            commands: []
        };
        const maxDataPoints = 20;

        async function loadMetrics() {
            try {
                const [statsRes, commandsRes, agentsRes] = await Promise.all([
                    fetch('/api/stats'),
                    fetch('/api/commands?limit=20'),
                    fetch('/api/agents')
                ]);
                
                const stats = await statsRes.json();
                const commands = await commandsRes.json();
                const agentsData = await agentsRes.json();
                const agents = agentsData.agents || [];

                updateSystemMetrics(stats.system);
                updateAgentMetrics(agents);
                updateCommandMetrics(stats.commands);
                updateCommandsLog(commands);
                
                // Track data for charts
                chartData.timestamps.push(new Date().toLocaleTimeString());
                chartData.memory.push((stats.system?.memory?.heapUsed || 0) / 1024 / 1024);
                chartData.commands.push(stats.commands?.totalCommands || 0);
                
                // Keep only last N data points
                if (chartData.timestamps.length > maxDataPoints) {
                    chartData.timestamps.shift();
                    chartData.memory.shift();
                    chartData.commands.shift();
                }

            } catch (error) {
    void error;
                console.error('Failed to load metrics:', error);
                showError('Failed to load metrics');
            }
        }
        
        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (days > 0) return days + 'd ' + hours + 'h ' + minutes + 'm';
            if (hours > 0) return hours + 'h ' + minutes + 'm ' + secs + 's';
            if (minutes > 0) return minutes + 'm ' + secs + 's';
            return secs + 's';
        }
        
        function formatMemory(bytes) {
            const mb = bytes / 1024 / 1024;
            if (mb > 1024) return (mb / 1024).toFixed(2) + ' GB';
            return mb.toFixed(2) + ' MB';
        }

        function updateSystemMetrics(system) {
            if (!system) {
                document.getElementById('system-metrics').innerHTML = '<div style="color: #ef4444;">No system data available</div>';
                return;
            }
            
            const heapPercent = system.memory?.heapUsed && system.memory?.heapTotal 
                ? ((system.memory.heapUsed / system.memory.heapTotal) * 100).toFixed(1)
                : 0;
                
            const systemMemoryUsed = system.totalSystemMemory && system.freeSystemMemory
                ? system.totalSystemMemory - system.freeSystemMemory
                : 0;
            const systemMemoryPercent = system.totalSystemMemory
                ? ((systemMemoryUsed / system.totalSystemMemory) * 100).toFixed(1)
                : 0;
            
            document.getElementById('system-metrics').innerHTML = \`
                <div class="metric">
                    <span>Process Memory:</span>
                    <span class="metric-value">\${formatMemory(system.memory?.heapUsed || 0)} / \${formatMemory(system.memory?.heapTotal || 0)} (\${heapPercent}%)</span>
                </div>
                <div class="metric">
                    <span>System Memory:</span>
                    <span class="metric-value">\${formatMemory(systemMemoryUsed)} / \${formatMemory(system.totalSystemMemory || 0)} (\${systemMemoryPercent}%)</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span class="metric-value">\${formatUptime(system.uptime || 0)}</span>
                </div>
                <div class="metric">
                    <span>Platform:</span>
                    <span class="metric-value">\${system.platform || 'Unknown'}</span>
                </div>
                <div class="metric">
                    <span>Node Version:</span>
                    <span class="metric-value">\${system.nodeVersion || 'Unknown'}</span>
                </div>
                <div class="metric" style="margin-top: 10px;">
                    <span>Memory Trend:</span>
                    <span class="metric-value" style="font-family: monospace;">\${drawSparkline(chartData.memory)}</span>
                </div>
            \`;
        }

        function updateAgentMetrics(agents) {
            const statusCounts = agents.reduce((acc, agent) => {
                acc[agent.status] = (acc[agent.status] || 0) + 1;
                return acc;
            }, {});
            
            const statusColors = {
                'ACTIVE': '#10b981',
                'IDLE': '#6b7280',
                'THINKING': '#3b82f6',
                'ERROR': '#ef4444'
            };

            document.getElementById('agent-metrics').innerHTML = \`
                <div class="metric" style="font-weight: bold;">
                    <span>Total Agents:</span>
                    <span class="metric-value">\${agents.length}</span>
                </div>
                \${Object.entries(statusCounts).map(([status, count]) => \`
                    <div class="metric">
                        <span><span style="display: inline-block; width: 10px; height: 10px; background: \${statusColors[status] || '#9ca3af'}; border-radius: 50%; margin-right: 5px;"></span>\${status}:</span>
                        <span class="metric-value">\${count}</span>
                    </div>
                \`).join('')}
                <div class="metric" style="margin-top: 10px;">
                    <span>Active Extensions:</span>
                    <span class="metric-value">\${agents.reduce((sum, a) => sum + (a.extensionCount || 0), 0)}</span>
                </div>
                <div class="metric">
                    <span>Connected Portals:</span>
                    <span class="metric-value">\${agents.filter(a => a.hasPortal).length}</span>
                </div>
            \`;
        }

        function updateCommandMetrics(commands) {
            if (!commands) {
                document.getElementById('command-metrics').innerHTML = '<div style="color: #ef4444;">No command data available</div>';
                return;
            }
            
            const successRate = commands.totalCommands > 0 
                ? ((commands.completedCommands / commands.totalCommands) * 100).toFixed(1)
                : 0;
            
            const failureRate = commands.totalCommands > 0
                ? ((commands.failedCommands / commands.totalCommands) * 100).toFixed(1)
                : 0;

            document.getElementById('command-metrics').innerHTML = \`
                <div class="metric" style="font-weight: bold;">
                    <span>Total Commands:</span>
                    <span class="metric-value">\${commands.totalCommands || 0}</span>
                </div>
                <div class="metric">
                    <span>Success Rate:</span>
                    <span class="metric-value" style="color: #10b981;">\${successRate}%</span>
                </div>
                <div class="metric">
                    <span>Failure Rate:</span>
                    <span class="metric-value" style="color: #ef4444;">\${failureRate}%</span>
                </div>
                <div class="metric">
                    <span>Pending:</span>
                    <span class="metric-value" style="color: #f59e0b;">\${commands.pendingCommands || 0}</span>
                </div>
                <div class="metric">
                    <span>Processing:</span>
                    <span class="metric-value" style="color: #3b82f6;">\${commands.processingCommands || 0}</span>
                </div>
                <div class="metric">
                    <span>Avg Response Time:</span>
                    <span class="metric-value">\${(commands.avgResponseTime || 0).toFixed(0)}ms</span>
                </div>
                <div class="metric" style="margin-top: 10px;">
                    <span>Command Trend:</span>
                    <span class="metric-value" style="font-family: monospace;">\${drawSparkline(chartData.commands)}</span>
                </div>
            \`;
        }

        function updateCommandsLog(commands) {
            if (!commands || commands.length === 0) {
                document.getElementById('commands-log').innerHTML = '<div style="text-align: center; padding: 20px; color: #6b7280;">No recent commands</div>';
                return;
            }
            
            document.getElementById('commands-log').innerHTML = commands.map(cmd => {
                const statusClass = cmd.status === 'completed' ? 'command-success' : 
                                  cmd.status === 'failed' ? 'command-error' : 'command-pending';
                const statusEmoji = cmd.status === 'completed' ? '✅' : 
                                   cmd.status === 'failed' ? '❌' : '🔄';
                
                return \`
                    <div class="command-item \${statusClass}">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <strong>\${statusEmoji} \${cmd.type || 'Command'}</strong>
                                <div style="color: #6b7280; font-size: 0.9em;">\${cmd.instruction || cmd.message || 'No details'}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="command-time">\${formatTimeAgo(cmd.timestamp)}</div>
                                \${cmd.executionTime ? \`<div class="command-time">\${cmd.executionTime}ms</div>\` : ''}
                            </div>
                        </div>
                        <div style="font-size: 0.8em; color: #9ca3af; margin-top: 4px;">Agent: \${cmd.agentId}</div>
                    </div>
                \`;
            }).join('');
        }
        
        function formatTimeAgo(timestamp) {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
            if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
            return date.toLocaleTimeString();
        }
        
        function drawSparkline(data) {
            if (!data || data.length === 0) return '⬜';
            
            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
            
            return data.slice(-10).map(value => {
                const normalized = (value - min) / range;
                const index = Math.floor(normalized * (bars.length - 1));
                return bars[index];
            }).join('');
        }
        
        function showError(message) {
            console.error(message);
        }

        function refreshAll() {
            loadMetrics();
        }

        function toggleAutoRefresh() {
            autoRefresh = document.getElementById('auto-refresh').checked;
            
            if (autoRefresh) {
                refreshInterval = setInterval(loadMetrics, 2000); // Faster refresh for monitor
            } else {
                clearInterval(refreshInterval);
            }
        }

        // Event listeners
        document.getElementById('auto-refresh').addEventListener('change', toggleAutoRefresh);

        // Initialize
        loadMetrics();
        refreshInterval = setInterval(loadMetrics, 2000); // Update every 2 seconds
        
        // WebSocket for instant updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'command-update' || data.type === 'agent-update') {
                    loadMetrics(); // Instant update on relevant events
                }
            } catch (err) {
                console.error('WebSocket error:', err);
            }
        };
    `;
  }

  private getMultiAgentJavaScript(): string {
    return `
        let agents = [];
        let characters = [];
        let systemMetrics = {};
        let autoRefresh = true;
        let refreshInterval;
        let selectedCharacter = null;

        // Initialize the Multi-Agent Manager
        async function initializeMultiAgent() {
            try {
                await Promise.all([
                    loadCharacters(),
                    loadManagedAgents(),
                    loadSystemMetrics()
                ]);
                
                setupAutoRefresh();
                setupWebSocket();
            } catch (error) {
    void error;
                console.error('Failed to initialize multi-agent manager:', error);
                showError('Failed to initialize multi-agent manager');
            }
        }

        // Load available characters
        async function loadCharacters() {
            try {
                const response = await fetch('/api/characters');
                const data = await response.json();
                characters = data.characters || [];
                
                const characterSelect = document.getElementById('character-select');
                characterSelect.innerHTML = '<option value="">Select a character...</option>';
                
                characters.forEach(character => {
                    const option = document.createElement('option');
                    option.value = character.id;
                    option.textContent = \`\${character.name} - \${character.description}\`;
                    characterSelect.appendChild(option);
                });
                
                console.log('Loaded', characters.length, 'characters');
            } catch (error) {
    void error;
                console.error('Failed to load characters:', error);
                showError('Failed to load available characters');
            }
        }

        // Load managed agents
        async function loadManagedAgents() {
            try {
                const response = await fetch('/api/agents/managed');
                const data = await response.json();
                agents = data.agents || [];
                
                updateAgentsGrid();
                updateSystemStatus();
                
                console.log('Loaded', agents.length, 'managed agents');
            } catch (error) {
    void error;
                console.error('Failed to load managed agents:', error);
                // Don't show error for this as it might be normal if no multi-agent system
                if (error.message !== 'Multi-Agent Manager not available') {
                    showError('Failed to load managed agents');
                }
                showNoAgentsMessage();
            }
        }

        // Load system metrics
        async function loadSystemMetrics() {
            try {
                const [agentsResponse, statsResponse] = await Promise.all([
                    fetch('/api/agents'),
                    fetch('/api/stats')
                ]);
                
                const agentsData = await agentsResponse.json();
                const statsData = await statsResponse.json();
                
                const activeAgentsCount = agentsData.filter(a => a.status === 'active' || a.status === 'running').length;
                
                systemMetrics = {
                    enabled: true,
                    totalAgents: agentsData.length,
                    activeAgents: activeAgentsCount,
                    totalMemoryUsage: statsData.system?.totalSystemMemory || 0,
                    totalSystemMemory: statsData.system?.totalSystemMemory || 0,
                    freeSystemMemory: statsData.system?.freeSystemMemory || 0,
                    processMemory: statsData.system?.memory || {},
                    averageResponseTime: 150, // Mock for now
                    systemLoad: statsData.system?.loadAverage ? statsData.system.loadAverage[0] / statsData.system.cpus : 0
                };
                
                updateSystemMetrics();
            } catch (error) {
    void error;
                console.error('Failed to load system metrics:', error);
                // Set default metrics
                systemMetrics = {
                    enabled: false,
                    totalAgents: 0,
                    activeAgents: 0,
                    totalMemoryUsage: 0,
                    totalSystemMemory: 0,
                    freeSystemMemory: 0,
                    processMemory: {},
                    averageResponseTime: 0,
                    systemLoad: 0
                };
                updateSystemMetrics();
            }
        }

        // Update agents grid display
        function updateAgentsGrid() {
            const agentsGrid = document.getElementById('agents-grid');
            const noAgentsMessage = document.getElementById('no-agents-message');
            
            if (!agents || agents.length === 0) {
                agentsGrid.style.display = 'none';
                noAgentsMessage.style.display = 'block';
                return;
            }
            
            agentsGrid.style.display = 'grid';
            noAgentsMessage.style.display = 'none';
            
            agentsGrid.innerHTML = agents.map(agent => \`
                <div class="agent-card" id="agent-\${agent.id}">
                    <div class="real-time-indicator"></div>
                    <div class="agent-header">
                        <div class="agent-info">
                            <h3>\${agent.name || agent.characterId}</h3>
                            <div class="agent-id">\${agent.id}</div>
                        </div>
                        <div class="agent-status status-\${getStatusClass(agent.status)}">
                            \${getStatusIcon(agent.status)} \${agent.status}
                        </div>
                    </div>
                    
                    <div class="health-metrics">
                        <div class="health-section">
                            <h4>Performance</h4>
                            <div class="health-item">
                                <span>Uptime:</span>
                                <span class="health-value health-\${getHealthClass(agent.uptime)}">\${formatUptime(agent.uptime)}</span>
                            </div>
                            <div class="health-item">
                                <span>Memory:</span>
                                <span class="health-value health-\${getMemoryHealthClass(agent.memoryUsage)}">\${formatMemory(agent.memoryUsage)}</span>
                            </div>
                            <div class="health-item">
                                <span>Response Time:</span>
                                <span class="health-value health-\${getResponseHealthClass(agent.averageResponseTime)}">\${agent.averageResponseTime || 0}ms</span>
                            </div>
                        </div>
                        
                        <div class="health-section">
                            <h4>Status</h4>
                            <div class="health-item">
                                <span>Character:</span>
                                <span class="health-value">\${agent.characterId}</span>
                            </div>
                            <div class="health-item">
                                <span>Priority:</span>
                                <span class="health-value">\${agent.priority || 'normal'}</span>
                            </div>
                            <div class="health-item">
                                <span>Last Seen:</span>
                                <span class="health-value">\${formatTimeAgo(agent.lastUpdate)}</span>
                            </div>
                        </div>
                    </div>
                    
                    \${agent.specialties && agent.specialties.length > 0 ? \`
                        <div style="margin: 10px 0;">
                            <h4 style="font-size: 0.9em; margin-bottom: 5px;">Specialties:</h4>
                            <div class="specialty-tags">
                                \${agent.specialties.map(s => \`<span class="specialty-tag">\${s}</span>\`).join('')}
                            </div>
                        </div>
                    \` : ''}
                    
                    <div class="agent-actions">
                        \${agent.status === 'stopped' ? 
                            \`<button class="btn btn-primary" onclick="startAgent('\${agent.id}')">▶️ Start</button>\` :
                            \`<button class="btn btn-secondary" onclick="stopAgent('\${agent.id}')">⏹️ Stop</button>\`
                        }
                        <button class="btn btn-secondary" onclick="restartAgent('\${agent.id}')">🔄 Restart</button>
                        <button class="btn btn-secondary" onclick="viewAgentHealth('\${agent.id}')">📊 Health</button>
                        <button class="btn btn-primary" onclick="chatWithAgent('\${agent.id}')">💬 Chat</button>
                    </div>
                </div>
            \`).join('');
        }

        // Update system metrics display
        function updateSystemMetrics() {
            document.getElementById('system-status').textContent = systemMetrics.enabled ? 'Active' : 'Inactive';
            document.getElementById('active-agents').textContent = systemMetrics.activeAgents || 0;
            
            // Display actual system memory with usage info
            const systemMemoryUsed = systemMetrics.totalSystemMemory && systemMetrics.freeSystemMemory
                ? systemMetrics.totalSystemMemory - systemMetrics.freeSystemMemory
                : 0;
            const systemMemoryPercent = systemMetrics.totalSystemMemory
                ? ((systemMemoryUsed / systemMetrics.totalSystemMemory) * 100).toFixed(1)
                : 0;
            
            const processMemoryUsed = systemMetrics.processMemory?.heapUsed || 0;
            const processMemoryTotal = systemMetrics.processMemory?.heapTotal || 0;
            const processMemoryPercent = processMemoryTotal > 0
                ? ((processMemoryUsed / processMemoryTotal) * 100).toFixed(1)
                : 0;
                
            document.getElementById('total-memory').innerHTML = \`
                <div style="font-size: 0.9em;">
                    System: \${formatMemory(systemMemoryUsed)} / \${formatMemory(systemMetrics.totalSystemMemory || 0)} (\${systemMemoryPercent}%)
                    <br>
                    Process: \${formatMemory(processMemoryUsed)} / \${formatMemory(processMemoryTotal)} (\${processMemoryPercent}%)
                </div>
            \`;
            
            document.getElementById('avg-response').textContent = (systemMetrics.averageResponseTime || 0) + 'ms';
            document.getElementById('system-load').textContent = ((systemMetrics.systemLoad || 0) * 100).toFixed(1) + '%';
        }

        // Update system status
        function updateSystemStatus() {
            const activeCount = agents.filter(a => a.status === 'running').length;
            document.getElementById('active-agents').textContent = activeCount;
        }

        // Show character preview
        function showCharacterPreview(characterId) {
            const preview = document.getElementById('character-preview');
            
            if (!characterId) {
                preview.classList.remove('active');
                selectedCharacter = null;
                return;
            }
            
            selectedCharacter = characters.find(c => c.id === characterId);
            if (!selectedCharacter) return;
            
            preview.innerHTML = \`
                <h4>\${selectedCharacter.name}</h4>
                <p style="margin-bottom: 10px; color: #6b7280;">\${selectedCharacter.description}</p>
                <div>
                    <strong>Personality Traits:</strong>
                    <div class="character-traits">
                        \${Object.entries(selectedCharacter.personality).map(([trait, value]) => 
                            \`<span class="trait-tag">\${trait}: \${typeof value === 'number' ? (value * 100).toFixed(0) + '%' : value}</span>\`
                        ).join('')}
                    </div>
                </div>
                <div style="margin-top: 8px;">
                    <strong>Communication Style:</strong> \${selectedCharacter.communication.style || 'adaptive'}
                </div>
            \`;
            preview.classList.add('active');
        }

        // Spawn new agent
        async function spawnAgent() {
            const characterId = document.getElementById('character-select').value;
            const instanceName = document.getElementById('instance-name').value;
            const autoStart = document.getElementById('auto-start').checked;
            const messageEl = document.getElementById('spawn-message');
            
            if (!characterId) {
                showMessage(messageEl, 'Please select a character first', 'error');
                return;
            }
            
            try {
                showMessage(messageEl, 'Spawning agent...', 'info');
                
                const response = await fetch('/api/agents/spawn', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterId,
                        instanceName: instanceName || undefined,
                        autoStart,
                        priority: 'normal'
                    })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to spawn agent');
                }
                
                showMessage(messageEl, \`✅ \${result.message}\`, 'success');
                
                // Clear form
                document.getElementById('character-select').value = '';
                document.getElementById('instance-name').value = '';
                document.getElementById('character-preview').classList.remove('active');
                
                // Refresh agents list
                setTimeout(loadManagedAgents, 1000);
                
            } catch (error) {
    void error;
                console.error('Failed to spawn agent:', error);
                showMessage(messageEl, \`❌ \${error.message}\`, 'error');
            }
        }

        // Agent control functions
        async function startAgent(agentId) {
            try {
                await agentAction('start', agentId);
            } catch (error) {
    void error;
                showError(\`Failed to start agent: \${error.message}\`);
            }
        }

        async function stopAgent(agentId) {
            try {
                await agentAction('stop', agentId);
            } catch (error) {
    void error;
                showError(\`Failed to stop agent: \${error.message}\`);
            }
        }

        async function restartAgent(agentId) {
            try {
                await agentAction('restart', agentId);
            } catch (error) {
    void error;
                showError(\`Failed to restart agent: \${error.message}\`);
            }
        }

        async function agentAction(action, agentId) {
            const response = await fetch(\`/api/agents/\${agentId}/\${action}\`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || \`Failed to \${action} agent\`);
            }
            
            // Update agent status immediately for better UX
            const agentCard = document.getElementById(\`agent-\${agentId}\`);
            if (agentCard) {
                const statusEl = agentCard.querySelector('.agent-status');
                if (statusEl) {
                    statusEl.textContent = action === 'start' ? '🟡 Starting' : 
                                         action === 'stop' ? '🔴 Stopping' : 
                                         '🟡 Restarting';
                }
            }
            
            // Refresh after a delay
            setTimeout(loadManagedAgents, 1500);
        }

        // Bulk operations
        async function startAllAgents() {
            const stoppedAgents = agents.filter(a => a.status === 'stopped');
            if (stoppedAgents.length === 0) {
                showError('No stopped agents to start');
                return;
            }
            
            if (!confirm(\`Start \${stoppedAgents.length} agents?\`)) return;
            
            for (const agent of stoppedAgents) {
                try {
                    await startAgent(agent.id);
                } catch (error) {
    void error;
                    console.error(\`Failed to start agent \${agent.id}:\`, error);
                }
            }
        }

        async function stopAllAgents() {
            const runningAgents = agents.filter(a => a.status === 'running');
            if (runningAgents.length === 0) {
                showError('No running agents to stop');
                return;
            }
            
            if (!confirm(\`Stop \${runningAgents.length} agents?\`)) return;
            
            for (const agent of runningAgents) {
                try {
                    await stopAgent(agent.id);
                } catch (error) {
    void error;
                    console.error(\`Failed to stop agent \${agent.id}:\`, error);
                }
            }
        }

        async function restartAllAgents() {
            if (agents.length === 0) {
                showError('No agents to restart');
                return;
            }
            
            if (!confirm(\`Restart all \${agents.length} agents?\`)) return;
            
            for (const agent of agents) {
                try {
                    await restartAgent(agent.id);
                } catch (error) {
    void error;
                    console.error(\`Failed to restart agent \${agent.id}:\`, error);
                }
            }
        }

        async function emergencyStop() {
            if (!confirm('EMERGENCY STOP: This will immediately stop all agents. Continue?')) return;
            
            try {
                // Stop all agents immediately
                await stopAllAgents();
                showError('Emergency stop executed - all agents stopped');
            } catch (error) {
    void error;
                console.error('Emergency stop failed:', error);
                showError('Emergency stop failed: ' + error.message);
            }
        }

        // Agent routing and specialty functions
        async function findBySpecialty(specialty) {
            if (!specialty) {
                document.getElementById('specialty-results').innerHTML = '';
                return;
            }
            
            try {
                const response = await fetch(\`/api/agents/specialty/\${specialty}\`);
                const data = await response.json();
                
                const resultsEl = document.getElementById('specialty-results');
                if (data.agents && data.agents.length > 0) {
                    resultsEl.innerHTML = \`
                        <div style="margin-top: 10px;">
                            <strong>\${data.agents.length} agents found:</strong>
                            <div style="margin-top: 5px;">
                                \${data.agents.map(agent => \`
                                    <div style="padding: 5px; background: #f3f4f6; margin: 2px 0; border-radius: 4px;">
                                        <strong>\${agent.name}</strong> (\${agent.status})
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    \`;
                } else {
                    resultsEl.innerHTML = '<div style="margin-top: 10px; color: #6b7280;">No agents found for this specialty</div>';
                }
            } catch (error) {
    void error;
                console.error('Failed to find agents by specialty:', error);
                document.getElementById('specialty-results').innerHTML = '<div style="margin-top: 10px; color: #ef4444;">Failed to search agents</div>';
            }
        }

        async function testRouting() {
            try {
                const response = await fetch('/api/agents/route', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requirements: {
                            specialty: 'chat',
                            priority: 'normal',
                            characteristics: ['empathetic', 'responsive']
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.agentId) {
                    alert(\`Routing test successful!\\nSelected agent: \${result.name} (\${result.agentId})\`);
                } else {
                    alert('No suitable agent found for routing test requirements');
                }
            } catch (error) {
    void error;
                console.error('Routing test failed:', error);
                alert('Routing test failed: ' + error.message);
            }
        }

        // View agent health details
        async function viewAgentHealth(agentId) {
            try {
                const response = await fetch(\`/api/agents/\${agentId}/health\`);
                const health = await response.json();
                
                if (!response.ok) {
                    throw new Error(health.error || 'Failed to get health data');
                }
                
                const healthModal = \`
                    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;" onclick="this.remove()">
                        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation()">
                            <h2>Agent Health: \${health.agentId}</h2>
                            <pre style="background: #f8fafc; padding: 15px; border-radius: 4px; overflow-x: auto; margin: 20px 0;">\${JSON.stringify(health, null, 2)}</pre>
                            <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">Close</button>
                        </div>
                    </div>
                \`;
                
                document.body.insertAdjacentHTML('beforeend', healthModal);
            } catch (error) {
    void error;
                showError(\`Failed to load agent health: \${error.message}\`);
            }
        }

        // Chat with agent
        function chatWithAgent(agentId) {
            window.location.href = \`/ui/chat?agent=\${agentId}\`;
        }

        // Refresh functions
        function refreshAgents() {
            loadManagedAgents();
            loadSystemMetrics();
        }

        function setupAutoRefresh() {
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(() => {
                if (autoRefresh) {
                    loadManagedAgents();
                    loadSystemMetrics();
                }
            }, 3000); // Refresh every 3 seconds
        }

        // WebSocket setup for real-time updates
        function setupWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(\`\${protocol}//\${window.location.host}/ws\`);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'multi-agent-update' || data.type === 'agent-update') {
                        loadManagedAgents();
                    } else if (data.type === 'system-metrics-update') {
                        loadSystemMetrics();
                    }
                } catch (error) {
    void error;
                    this.logger.error('WebSocket error', error as Error);
                }
            };
            
            ws.onerror = (error) => {
                this.logger.error('WebSocket error', error as Error);
            };
        }

        // Utility functions
        function getStatusClass(status) {
            switch (status?.toLowerCase()) {
                case 'running': return 'running';
                case 'stopped': return 'stopped';
                case 'error': return 'error';
                case 'starting': return 'starting';
                default: return 'stopped';
            }
        }

        function getStatusIcon(status) {
            switch (status?.toLowerCase()) {
                case 'running': return '🟢';
                case 'stopped': return '🔴';
                case 'error': return '🟡';
                case 'starting': return '🟡';
                default: return '🔴';
            }
        }

        function getHealthClass(value) {
            if (!value || value < 60000) return 'critical'; // Less than 1 minute
            if (value < 300000) return 'warning';           // Less than 5 minutes
            return 'good';
        }

        function getMemoryHealthClass(value) {
            if (!value) return 'good';
            const mb = value / 1024 / 1024;
            if (mb > 500) return 'critical';
            if (mb > 200) return 'warning';
            return 'good';
        }

        function getResponseHealthClass(value) {
            if (!value) return 'good';
            if (value > 5000) return 'critical';
            if (value > 2000) return 'warning';
            return 'good';
        }

        function formatUptime(ms) {
            if (!ms) return '0s';
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d \${hours % 24}h\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
            if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
            return \`\${seconds}s\`;
        }

        function formatMemory(bytes) {
            if (!bytes) return '0 MB';
            const mb = bytes / 1024 / 1024;
            if (mb > 1024) return (mb / 1024).toFixed(2) + ' GB';
            return mb.toFixed(2) + ' MB';
        }

        function formatTimeAgo(timestamp) {
            if (!timestamp) return 'Never';
            const diff = Date.now() - new Date(timestamp).getTime();
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (days > 0) return \`\${days}d ago\`;
            if (hours > 0) return \`\${hours}h ago\`;
            if (minutes > 0) return \`\${minutes}m ago\`;
            return 'Just now';
        }

        function showMessage(element, message, type) {
            element.innerHTML = \`<div class="\${type}-message">\${message}</div>\`;
            if (type === 'success') {
                setTimeout(() => element.innerHTML = '', 5000);
            }
        }

        function showError(message) {
            console.error(message);
            // Could add a toast notification here
        }

        function showNoAgentsMessage() {
            document.getElementById('agents-grid').style.display = 'none';
            document.getElementById('no-agents-message').style.display = 'block';
        }

        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initializeMultiAgent);
        
        // Expose functions globally for HTML onclick handlers
        window.showCharacterPreview = showCharacterPreview;
        window.spawnAgent = spawnAgent;
        window.startAgent = startAgent;
        window.stopAgent = stopAgent;
        window.restartAgent = restartAgent;
        window.startAllAgents = startAllAgents;
        window.stopAllAgents = stopAllAgents;
        window.restartAllAgents = restartAllAgents;
        window.emergencyStop = emergencyStop;
        window.findBySpecialty = findBySpecialty;
        window.testRouting = testRouting;
        window.viewAgentHealth = viewAgentHealth;
        window.chatWithAgent = chatWithAgent;
        window.refreshAgents = refreshAgents;
    `;
  }

  private mapPriority(priority: string): any {
    const priorities: Record<string, any> = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4,
    };
    return priorities[priority.toLowerCase()] || 2;
  }

  public getExpressApp(): express.Application {
    return this.app;
  }
}
