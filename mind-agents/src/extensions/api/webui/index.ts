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
import { Agent } from '../../../types/agent.js'
import { CommandSystem } from '../../../core/command-system.js'
import { Logger } from '../../../utils/logger.js'

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
    </style>
</head>
<body>
    ${this.getNavigationHTML()}
    
    <div class="dashboard">
        <div class="card">
            <h2>System Overview</h2>
            <div id="system-stats">
                <div class="metric">
                    <span>Status:</span>
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
            </div>
        </div>

        <div class="card">
            <h2>Agents</h2>
            <div id="agents-overview">
                <div class="metric">
                    <span>Total Agents:</span>
                    <span class="metric-value" id="total-agents">Loading...</span>
                </div>
                <div id="agent-list"></div>
            </div>
        </div>

        <div class="card">
            <h2>Commands</h2>
            <div id="commands-overview">
                <div class="metric">
                    <span>Total Processed:</span>
                    <span class="metric-value" id="total-commands">Loading...</span>
                </div>
                <div class="metric">
                    <span>Success Rate:</span>
                    <span class="metric-value" id="success-rate">Loading...</span>
                </div>
                <div class="metric">
                    <span>Active:</span>
                    <span class="metric-value" id="active-commands">Loading...</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Quick Actions</h2>
            <div style="display: flex; flex-direction: column; gap: 10px;">
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
        .chat-container {
            display: grid;
            grid-template-columns: 300px 1fr;
            height: calc(100vh - 60px);
        }
        .agent-sidebar {
            background: #f8fafc;
            border-right: 1px solid #e2e8f0;
            padding: 20px;
        }
        .chat-main {
            display: flex;
            flex-direction: column;
        }
        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #fff;
        }
        .message {
            margin: 10px 0;
            padding: 10px 15px;
            border-radius: 18px;
            max-width: 70%;
        }
        .message.user {
            background: #2563eb;
            color: white;
            margin-left: auto;
            text-align: right;
        }
        .message.agent {
            background: #f1f5f9;
            margin-right: auto;
        }
        .message-time {
            font-size: 0.8em;
            opacity: 0.7;
            margin-top: 5px;
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
            padding: 10px 15px;
            border: 1px solid #d1d5db;
            border-radius: 25px;
            outline: none;
        }
        .agent-item {
            padding: 10px;
            margin: 5px 0;
            border-radius: 8px;
            cursor: pointer;
            border: 1px solid transparent;
        }
        .agent-item:hover {
            background: white;
            border-color: #e2e8f0;
        }
        .agent-item.selected {
            background: #2563eb;
            color: white;
        }
        .agent-name {
            font-weight: bold;
        }
        .agent-status {
            font-size: 0.8em;
            opacity: 0.8;
        }
        .connection-status {
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
        }
        .connected {
            background: #d1fae5;
            color: #065f46;
        }
        .disconnected {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    ${this.getNavigationHTML()}
    
    <div class="chat-container">
        <div class="agent-sidebar">
            <div id="connection-status" class="connection-status disconnected">
                Connecting...
            </div>
            
            <h3>Available Agents</h3>
            <div id="agent-list"></div>
        </div>

        <div class="chat-main">
            <div class="chat-messages" id="chat-messages">
                <div class="message agent">
                    <div>Welcome to SYMindX Chat! Select an agent from the sidebar to start chatting.</div>
                    <div class="message-time">${new Date().toLocaleTimeString()}</div>
                </div>
            </div>

            <div class="chat-input">
                <input type="text" id="message-input" placeholder="Type your message..." disabled>
                <button id="send-btn" class="btn btn-primary" disabled>Send</button>
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
            max-height: 400px;
            overflow-y: auto;
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
        
        <div style="margin: 20px 0;">
            <label>
                <input type="checkbox" id="auto-refresh" checked> Auto-refresh (5s)
            </label>
            <button class="btn btn-secondary" onclick="refreshAll()" style="margin-left: 20px;">🔄 Refresh Now</button>
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
        <a href="/">Dashboard</a>
        <a href="/chat">Chat</a>
        <a href="/agents">Agents</a>
        <a href="/monitor">Monitor</a>
    </nav>
    `
  }

  private getDashboardJavaScript(): string {
    return `
        async function loadDashboard() {
            try {
                const [stats, agents] = await Promise.all([
                    fetch('/api/stats').then(r => r.json()),
                    fetch('/api/agents').then(r => r.json())
                ]);

                // Update system stats
                document.getElementById('system-status').textContent = 
                    stats.runtime.isRunning ? '✅ Running' : '❌ Stopped';
                document.getElementById('system-uptime').textContent = 
                    (stats.system.uptime / 60).toFixed(1) + ' minutes';
                document.getElementById('memory-usage').textContent = 
                    (stats.system.memory.heapUsed / 1024 / 1024).toFixed(2) + ' MB';

                // Update agent stats
                document.getElementById('total-agents').textContent = agents.length;
                
                const agentList = document.getElementById('agent-list');
                agentList.innerHTML = agents.map(agent => \`
                    <div style="margin: 5px 0;">
                        <span class="status-indicator status-\${agent.status.toLowerCase()}"></span>
                        \${agent.name} (\${agent.status})
                    </div>
                \`).join('');

                // Update command stats
                document.getElementById('total-commands').textContent = stats.commands.totalCommands;
                const successRate = stats.commands.totalCommands > 0 
                    ? ((stats.commands.completedCommands / stats.commands.totalCommands) * 100).toFixed(1)
                    : 0;
                document.getElementById('success-rate').textContent = successRate + '%';
                document.getElementById('active-commands').textContent = 
                    stats.commands.pendingCommands + stats.commands.processingCommands;

            } catch (error) {
                console.error('Failed to load dashboard:', error);
            }
        }

        loadDashboard();
        setInterval(loadDashboard, 5000); // Refresh every 5 seconds
    `
  }

  private getChatJavaScript(): string {
    return `
        let ws = null;
        let selectedAgent = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                updateConnectionStatus(true);
                // Subscribe to agent updates
                ws.send(JSON.stringify({
                    type: 'subscribe',
                    data: { topic: 'agent_updates' }
                }));
            };
            
            ws.onclose = () => {
                updateConnectionStatus(false);
                setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
            };
            
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            };
        }

        function updateConnectionStatus(connected) {
            const statusEl = document.getElementById('connection-status');
            statusEl.textContent = connected ? 'Connected' : 'Disconnected';
            statusEl.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
            
            document.getElementById('message-input').disabled = !connected || !selectedAgent;
            document.getElementById('send-btn').disabled = !connected || !selectedAgent;
        }

        function handleWebSocketMessage(message) {
            if (message.type === 'chat_response' && message.source === selectedAgent) {
                addMessage(message.data.response, 'agent');
            }
        }

        async function loadAgents() {
            try {
                const agents = await fetch('/api/agents').then(r => r.json());
                const agentList = document.getElementById('agent-list');
                
                agentList.innerHTML = agents.map(agent => \`
                    <div class="agent-item" onclick="selectAgent('\${agent.id}', '\${agent.name}')">
                        <div class="agent-name">\${agent.name}</div>
                        <div class="agent-status">
                            <span class="status-indicator status-\${agent.status.toLowerCase()}"></span>
                            \${agent.status}
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Failed to load agents:', error);
            }
        }

        function selectAgent(agentId, agentName) {
            selectedAgent = agentId;
            
            // Update UI
            document.querySelectorAll('.agent-item').forEach(item => {
                item.classList.remove('selected');
            });
            event.target.closest('.agent-item').classList.add('selected');
            
            // Clear messages
            document.getElementById('chat-messages').innerHTML = \`
                <div class="message agent">
                    <div>Connected to \${agentName}. Start chatting!</div>
                    <div class="message-time">\${new Date().toLocaleTimeString()}</div>
                </div>
            \`;
            
            // Enable input
            document.getElementById('message-input').disabled = !ws || ws.readyState !== WebSocket.OPEN;
            document.getElementById('send-btn').disabled = !ws || ws.readyState !== WebSocket.OPEN;
            
            document.getElementById('message-input').focus();
        }

        function addMessage(content, sender) {
            const messagesEl = document.getElementById('chat-messages');
            const messageEl = document.createElement('div');
            messageEl.className = \`message \${sender}\`;
            messageEl.innerHTML = \`
                <div>\${content}</div>
                <div class="message-time">\${new Date().toLocaleTimeString()}</div>
            \`;
            messagesEl.appendChild(messageEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            
            if (!message || !selectedAgent || !ws || ws.readyState !== WebSocket.OPEN) {
                return;
            }
            
            addMessage(message, 'user');
            
            ws.send(JSON.stringify({
                type: 'chat',
                targetAgent: selectedAgent,
                data: { message }
            }));
            
            input.value = '';
        }

        // Event listeners
        document.getElementById('send-btn').addEventListener('click', sendMessage);
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Initialize
        connectWebSocket();
        loadAgents();
        setInterval(loadAgents, 10000); // Refresh agents every 10 seconds
    `
  }

  private getAgentsJavaScript(): string {
    return `
        async function loadAgents() {
            try {
                const agents = await fetch('/api/agents').then(r => r.json());
                const agentsList = document.getElementById('agents-list');
                
                agentsList.innerHTML = agents.map(agent => \`
                    <div class="agent-card">
                        <div class="agent-header">
                            <div>
                                <div class="agent-name">\${agent.name}</div>
                                <div style="color: #6b7280;">\${agent.id}</div>
                            </div>
                            <div class="agent-actions">
                                <button class="btn btn-primary" onclick="chatWithAgent('\${agent.id}')">💬 Chat</button>
                                <button class="btn btn-secondary" onclick="viewAgent('\${agent.id}')">📋 Details</button>
                                <button class="btn btn-danger" onclick="removeAgent('\${agent.id}')">🗑️ Remove</button>
                            </div>
                        </div>
                        <div class="agent-details">
                            <div class="detail-section">
                                <h4>Status</h4>
                                <div>
                                    <span class="status-indicator status-\${agent.status.toLowerCase()}"></span>
                                    \${agent.status}
                                </div>
                                <div>Emotion: \${agent.emotion || 'unknown'}</div>
                                <div>Last Update: \${agent.lastUpdate ? new Date(agent.lastUpdate).toLocaleString() : 'never'}</div>
                            </div>
                            <div class="detail-section">
                                <h4>Configuration</h4>
                                <div>Extensions: \${agent.extensionCount}</div>
                                <div>Portal: \${agent.hasPortal ? '✅ Configured' : '❌ None'}</div>
                            </div>
                            <div class="detail-section">
                                <h4>Actions</h4>
                                <button class="btn btn-secondary" onclick="restartAgent('\${agent.id}')">🔄 Restart</button>
                                <button class="btn btn-secondary" onclick="pauseAgent('\${agent.id}')">⏸️ Pause</button>
                            </div>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Failed to load agents:', error);
            }
        }

        function chatWithAgent(agentId) {
            window.location.href = \`/chat?agent=\${agentId}\`;
        }

        async function viewAgent(agentId) {
            try {
                const agent = await fetch(\`/api/agent/\${agentId}\`).then(r => r.json());
                alert(JSON.stringify(agent, null, 2)); // Simple display - could be a modal
            } catch (error) {
                alert('Failed to load agent details');
            }
        }

        function removeAgent(agentId) {
            if (confirm('Are you sure you want to remove this agent?')) {
                alert('Agent removal not yet implemented');
            }
        }

        function restartAgent(agentId) {
            alert('Agent restart not yet implemented');
        }

        function pauseAgent(agentId) {
            alert('Agent pause not yet implemented');
        }

        function refreshAgents() {
            loadAgents();
        }

        function createAgent() {
            alert('Agent creation not yet implemented');
        }

        // Initialize
        loadAgents();
    `
  }

  private getMonitorJavaScript(): string {
    return `
        let autoRefresh = true;
        let refreshInterval;

        async function loadMetrics() {
            try {
                const [stats, commands, agents] = await Promise.all([
                    fetch('/api/stats').then(r => r.json()),
                    fetch('/api/commands?limit=20').then(r => r.json()),
                    fetch('/api/agents').then(r => r.json())
                ]);

                updateSystemMetrics(stats.system);
                updateAgentMetrics(agents);
                updateCommandMetrics(stats.commands);
                updateCommandsLog(commands);

            } catch (error) {
                console.error('Failed to load metrics:', error);
            }
        }

        function updateSystemMetrics(system) {
            document.getElementById('system-metrics').innerHTML = \`
                <div class="metric">
                    <span>Memory Usage:</span>
                    <span class="metric-value">\${(system.memory.heapUsed / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span class="metric-value">\${(system.uptime / 60).toFixed(1)} minutes</span>
                </div>
                <div class="metric">
                    <span>Platform:</span>
                    <span class="metric-value">\${system.platform}</span>
                </div>
                <div class="metric">
                    <span>Node Version:</span>
                    <span class="metric-value">\${system.nodeVersion}</span>
                </div>
            \`;
        }

        function updateAgentMetrics(agents) {
            const statusCounts = agents.reduce((acc, agent) => {
                acc[agent.status] = (acc[agent.status] || 0) + 1;
                return acc;
            }, {});

            document.getElementById('agent-metrics').innerHTML = \`
                <div class="metric">
                    <span>Total Agents:</span>
                    <span class="metric-value">\${agents.length}</span>
                </div>
                \${Object.entries(statusCounts).map(([status, count]) => \`
                    <div class="metric">
                        <span>\${status}:</span>
                        <span class="metric-value">\${count}</span>
                    </div>
                \`).join('')}
            \`;
        }

        function updateCommandMetrics(commands) {
            const successRate = commands.totalCommands > 0 
                ? ((commands.completedCommands / commands.totalCommands) * 100).toFixed(1)
                : 0;

            document.getElementById('command-metrics').innerHTML = \`
                <div class="metric">
                    <span>Total Commands:</span>
                    <span class="metric-value">\${commands.totalCommands}</span>
                </div>
                <div class="metric">
                    <span>Success Rate:</span>
                    <span class="metric-value">\${successRate}%</span>
                </div>
                <div class="metric">
                    <span>Pending:</span>
                    <span class="metric-value">\${commands.pendingCommands}</span>
                </div>
                <div class="metric">
                    <span>Processing:</span>
                    <span class="metric-value">\${commands.processingCommands}</span>
                </div>
                <div class="metric">
                    <span>Avg Execution:</span>
                    <span class="metric-value">\${commands.averageExecutionTime.toFixed(2)}ms</span>
                </div>
            \`;
        }

        function updateCommandsLog(commands) {
            document.getElementById('commands-log').innerHTML = commands.map(cmd => {
                const statusClass = cmd.status === 'completed' ? 'command-success' : 
                                  cmd.status === 'failed' ? 'command-error' : 'command-pending';
                
                return \`
                    <div class="command-item \${statusClass}">
                        <div><strong>\${cmd.instruction}</strong></div>
                        <div>Agent: \${cmd.agentId} | Status: \${cmd.status}</div>
                        <div class="command-time">\${new Date(cmd.timestamp).toLocaleString()}</div>
                        \${cmd.executionTime ? \`<div class="command-time">Execution time: \${cmd.executionTime}ms</div>\` : ''}
                    </div>
                \`;
            }).join('');
        }

        function refreshAll() {
            loadMetrics();
        }

        function toggleAutoRefresh() {
            autoRefresh = document.getElementById('auto-refresh').checked;
            
            if (autoRefresh) {
                refreshInterval = setInterval(loadMetrics, 5000);
            } else {
                clearInterval(refreshInterval);
            }
        }

        // Event listeners
        document.getElementById('auto-refresh').addEventListener('change', toggleAutoRefresh);

        // Initialize
        loadMetrics();
        refreshInterval = setInterval(loadMetrics, 5000);
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