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

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { Agent } from '../../../types/agent.js'
import { CommandSystem } from '../../../core/command-system.js'
import { Logger } from '../../../utils/logger.js'

// Handle ES module __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class WebUIServer {
  private logger = new Logger('webui')
  private app: express.Application

  constructor(
    private commandSystem: CommandSystem,
    private getAgents: () => Map<string, Agent>,
    private getRuntimeStats: () => any
  ) {
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(express.json())
    this.app.use(express.static(path.join(__dirname, 'static')))
  }

  private setupRoutes(): void {
    // Serve main dashboard
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML())
    })

    // Chat interface
    this.app.get('/chat', (req, res) => {
      res.send(this.generateChatHTML())
    })

    // Agent management interface
    this.app.get('/agents', (req, res) => {
      res.send(this.generateAgentsHTML())
    })

    // System monitoring interface
    this.app.get('/monitor', (req, res) => {
      res.send(this.generateMonitorHTML())
    })

    // API endpoints for dynamic content
    this.app.get('/api/agents', (req, res) => {
      const agents = Array.from(this.getAgents().values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        emotion: agent.emotion?.current,
        lastUpdate: agent.lastUpdate,
        extensionCount: agent.extensions.length,
        hasPortal: !!agent.portal
      }))
      res.json(agents)
    })

    this.app.get('/api/agent/:id', (req, res) => {
      const agent = this.getAgents().get(req.params.id)
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' })
        return
      }

      res.json({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        emotion: agent.emotion?.current,
        lastUpdate: agent.lastUpdate,
        extensions: agent.extensions.map(ext => ({
          id: ext.id,
          name: ext.name,
          enabled: ext.enabled,
          status: ext.status
        })),
        portal: agent.portal ? {
          name: agent.portal.name,
          enabled: agent.portal.enabled
        } : null
      })
    })

    this.app.get('/api/stats', (req, res) => {
      const runtimeStats = this.getRuntimeStats()
      const commandStats = this.commandSystem.getStats()
      
      res.json({
        runtime: runtimeStats,
        commands: commandStats,
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version
        }
      })
    })

    this.app.get('/api/commands', (req, res) => {
      const agentId = req.query.agent as string
      const limit = parseInt(req.query.limit as string) || 20
      
      let commands = this.commandSystem.getAllCommands()
      
      if (agentId) {
        commands = commands.filter(cmd => cmd.agentId === agentId)
      }
      
      commands = commands
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
      
      res.json(commands.map(cmd => ({
        id: cmd.id,
        agentId: cmd.agentId,
        instruction: cmd.instruction,
        type: cmd.type,
        status: cmd.status,
        timestamp: cmd.timestamp,
        result: cmd.result,
        executionTime: cmd.result?.executionTime
      })))
    })

    // Chat API
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { agentId, message } = req.body
        
        if (!agentId || !message) {
          res.status(400).json({ error: 'Agent ID and message required' })
          return
        }

        const response = await this.commandSystem.sendMessage(agentId, message)
        res.json({ response, timestamp: new Date().toISOString() })
      } catch (error) {
        res.status(500).json({ 
          error: 'Chat failed',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })

    // Command execution API
    this.app.post('/api/command', async (req, res) => {
      try {
        const { agentId, command, priority = 'normal', async = false } = req.body
        
        if (!agentId || !command) {
          res.status(400).json({ error: 'Agent ID and command required' })
          return
        }

        const cmd = await this.commandSystem.sendCommand(agentId, command, {
          priority: this.mapPriority(priority),
          async
        })

        res.json({
          commandId: cmd.id,
          status: cmd.status,
          result: cmd.result,
          async
        })
      } catch (error) {
        res.status(500).json({ 
          error: 'Command execution failed',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
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
</html>`
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
</html>`
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
</html>`
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
</html>`
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
    `
  }

  private getNavigationHTML(): string {
    return `
    <nav class="navbar">
        <h1>🤖 SYMindX</h1>
        <a href="/ui">Dashboard</a>
        <a href="/ui/chat">Chat</a>
        <a href="/ui/agents">Agents</a>
        <a href="/ui/monitor">Monitor</a>
    </nav>
    `
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
                console.error('Failed to load dashboard:', error);
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
            console.log('WebSocket connected for real-time updates');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'agent-update' || data.type === 'command-update' || data.type === 'system-update') {
                    loadDashboard(); // Trigger immediate update
                }
            } catch (err) {
                console.error('WebSocket message error:', err);
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    `
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
                agents = data.agents || data;
                
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
                
                console.log('Created new conversation:', conversation.id);
            } catch (error) {
                console.error('Failed to create conversation:', error);
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
                console.error('WebSocket error:', error);
            }
        };
    `
  }

  private getAgentsJavaScript(): string {
    return `
        let selectedAgentDetails = null;
        
        async function loadAgents() {
            try {
                const response = await fetch('/api/agents');
                const data = await response.json();
                const agents = data.agents || [];
                const agentsList = document.getElementById('agents-list');
                
                if (agents.length === 0) {
                    agentsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">No agents are currently running. Start an agent to see it here.</div>';
                    return;
                }
                
                agentsList.innerHTML = agents.map(agent => \`
                    <div class="agent-card" id="agent-card-\${agent.id}">
                        <div class="agent-header">
                            <div>
                                <div class="agent-name">\${agent.name}</div>
                                <div style="color: #6b7280; font-size: 0.9em;">\${agent.id}</div>
                            </div>
                            <div class="agent-actions">
                                <button class="btn btn-primary" onclick="chatWithAgent('\${agent.id}')">💬 Chat</button>
                                <button class="btn btn-secondary" onclick="viewAgentDetails('\${agent.id}')">📋 Details</button>
                                <button class="btn btn-secondary" onclick="sendCommand('\${agent.id}')">⚡ Command</button>
                            </div>
                        </div>
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
                    </div>
                \`).join('');
                
                // Load detailed info for each agent
                agents.forEach(agent => loadAgentDetails(agent.id));
            } catch (error) {
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
                
                // Update metrics
                const metricsEl = document.getElementById(\`metrics-\${agentId}\`);
                metricsEl.innerHTML = \`
                    <div style="margin: 4px 0; color: #64748b;">Memory: Loading...</div>
                    <div style="margin: 4px 0; color: #64748b;">Commands: Loading...</div>
                    <div style="margin: 4px 0; color: #64748b;">Uptime: \${formatUptime(agent.lastUpdate)}...</div>
                \`;
                
            } catch (error) {
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
                alert('Failed to send command: ' + error.message);
            }
        }

        function refreshAgents() {
            loadAgents();
        }

        function createAgent() {
            alert('Agent creation interface coming soon!\n\nTo create an agent:\n1. Add a character JSON file in src/characters/\n2. Configure it in config/runtime.json\n3. Restart the runtime');
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
    `
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
            
            const memoryPercent = system.memory?.heapUsed && system.memory?.heapTotal 
                ? ((system.memory.heapUsed / system.memory.heapTotal) * 100).toFixed(1)
                : 0;
            
            document.getElementById('system-metrics').innerHTML = \`
                <div class="metric">
                    <span>Memory Usage:</span>
                    <span class="metric-value">\${formatMemory(system.memory?.heapUsed || 0)} (\${memoryPercent}%)</span>
                </div>
                <div class="metric">
                    <span>Total Memory:</span>
                    <span class="metric-value">\${formatMemory(system.memory?.heapTotal || 0)}</span>
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
    `
  }

  private mapPriority(priority: string): any {
    const priorities: Record<string, any> = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4
    }
    return priorities[priority.toLowerCase()] || 2
  }

  public getExpressApp(): express.Application {
    return this.app
  }
}