/**
 * Admin Dashboard for SYMindX API
 * Provides a comprehensive web-based administration interface
 */

// import path from 'path';

import { Request, Response, Router } from 'express';

// import { runtimeLogger } from '../../utils/logger.js';

export class AdminDashboard {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Serve dashboard HTML
    this.router.get('/', (_req: Request, res: Response) => {
      res.send(this.getDashboardHTML());
    });

    // Serve dashboard assets
    this.router.get('/assets/:file', (req: Request, res: Response) => {
      const file = req.params['file'];
      if (file === 'style.css') {
        res.type('text/css').send(this.getDashboardCSS());
      } else if (file === 'script.js') {
        res.type('application/javascript').send(this.getDashboardJS());
      } else {
        res.status(404).send('Not found');
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }

  private getDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYMindX Admin Dashboard</title>
    <link rel="stylesheet" href="/admin/assets/style.css">
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@apollo/client@3/apollo-client.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script src="/admin/assets/script.js"></script>
</body>
</html>`;
  }

  private getDashboardCSS(): string {
    return `/* SYMindX Admin Dashboard Styles */
:root {
  --primary-color: #2563eb;
  --secondary-color: #7c3aed;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --dark-bg: #111827;
  --light-bg: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #374151;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--dark-bg);
  color: var(--text-primary);
  line-height: 1.6;
}

.dashboard {
  display: grid;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr;
  height: 100vh;
}

/* Header */
.header {
  grid-area: header;
  background-color: var(--light-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
}

.header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

/* Sidebar */
.sidebar {
  grid-area: sidebar;
  background-color: var(--light-bg);
  border-right: 1px solid var(--border-color);
  padding: 1rem;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  margin-bottom: 2rem;
}

.sidebar-nav {
  list-style: none;
}

.sidebar-nav-item {
  margin-bottom: 0.5rem;
}

.sidebar-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}

.sidebar-nav-link:hover {
  background-color: var(--dark-bg);
  color: var(--text-primary);
}

.sidebar-nav-link.active {
  background-color: var(--primary-color);
  color: white;
}

/* Main Content */
.main {
  grid-area: main;
  padding: 2rem;
  overflow-y: auto;
}

/* Cards */
.card {
  background-color: var(--light-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: var(--light-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.stat-change {
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.stat-change.positive {
  color: var(--success-color);
}

.stat-change.negative {
  color: var(--danger-color);
}

/* Agent List */
.agent-list {
  display: grid;
  gap: 1rem;
}

.agent-item {
  background-color: var(--dark-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
}

.agent-status {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.agent-status.ready {
  background-color: var(--success-color);
}

.agent-status.busy {
  background-color: var(--warning-color);
}

.agent-status.error {
  background-color: var(--danger-color);
}

.agent-info h3 {
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
}

.agent-meta {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.agent-actions {
  display: flex;
  gap: 0.5rem;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: var(--dark-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--border-color);
}

.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}

/* Charts */
.chart-container {
  position: relative;
  height: 300px;
}

/* Logs */
.log-viewer {
  background-color: var(--dark-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  max-height: 400px;
  overflow-y: auto;
}

.log-entry {
  margin-bottom: 0.5rem;
  display: flex;
  gap: 1rem;
}

.log-timestamp {
  color: var(--text-secondary);
}

.log-level {
  font-weight: 600;
}

.log-level.info {
  color: var(--primary-color);
}

.log-level.warn {
  color: var(--warning-color);
}

.log-level.error {
  color: var(--danger-color);
}

/* Forms */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: var(--dark-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--light-bg);
  border-radius: 0.5rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard {
    grid-template-areas:
      "header"
      "main";
    grid-template-columns: 1fr;
    grid-template-rows: 60px 1fr;
  }
  
  .sidebar {
    display: none;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}`;
  }

  private getDashboardJS(): string {
    return `// SYMindX Admin Dashboard JavaScript
const { useState, useEffect, useRef } = React;
const { ApolloClient, InMemoryCache, gql, useQuery, useMutation, useSubscription } = window['@apollo/client'];

// Initialize Apollo Client
const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
  wsUri: 'ws://localhost:8000/graphql-subscriptions',
});

// GraphQL Queries
const GET_AGENTS = gql\`
  query GetAgents {
    agents {
      id
      name
      status
      type
      enabled
      emotion {
        primaryEmotion
        intensity
      }
      cognition {
        mode
        load
      }
      performance {
        responseTime
        memoryUsage
        cpuUsage
      }
      lastActivity
    }
  }
\`;

const GET_SYSTEM_STATUS = gql\`
  query GetSystemStatus {
    systemStatus {
      healthy
      uptime
      version
      activeAgents
      totalMemory
      freeMemory
      metrics {
        responseTime
        memoryUsage
        cpuUsage
        requestsPerMinute
        errorRate
      }
    }
  }
\`;

// GraphQL Mutations
const START_AGENT = gql\`
  mutation StartAgent($id: ID!) {
    startAgent(id: $id) {
      id
      status
    }
  }
\`;

const STOP_AGENT = gql\`
  mutation StopAgent($id: ID!) {
    stopAgent(id: $id) {
      id
      status
    }
  }
\`;

// GraphQL Subscriptions
const AGENT_UPDATE_SUBSCRIPTION = gql\`
  subscription OnAgentUpdate {
    agentUpdate {
      id
      name
      status
      emotion {
        primaryEmotion
        intensity
      }
      cognition {
        mode
        load
      }
      performance {
        responseTime
        memoryUsage
        cpuUsage
      }
    }
  }
\`;

// Components
function Dashboard() {
  const [activeView, setActiveView] = useState('overview');
  
  return (
    <div className="dashboard">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <Header />
      <main className="main">
        {activeView === 'overview' && <Overview />}
        {activeView === 'agents' && <Agents />}
        {activeView === 'logs' && <Logs />}
        {activeView === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function Sidebar({ activeView, setActiveView }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span style={{ fontSize: '1.5rem' }}>🧠</span>
        <span style={{ fontWeight: 'bold' }}>SYMindX</span>
      </div>
      <nav>
        <ul className="sidebar-nav">
          {navItems.map(item => (
            <li key={item.id} className="sidebar-nav-item">
              <a
                href="#"
                className={\`sidebar-nav-link \${activeView === item.id ? 'active' : ''}\`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(item.id);
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function Header() {
  return (
    <header className="header">
      <h1>Admin Dashboard</h1>
      <div className="header-actions">
        <button className="btn btn-primary">New Agent</button>
      </div>
    </header>
  );
}

function Overview() {
  const { loading, error, data } = useQuery(GET_SYSTEM_STATUS, {
    pollInterval: 5000,
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const status = data.systemStatus;
  
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>System Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{status.activeAgents}</div>
          <div className="stat-label">Active Agents</div>
          <div className="stat-change positive">+2 from last hour</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{formatUptime(status.uptime)}</div>
          <div className="stat-label">Uptime</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{status.metrics.requestsPerMinute}</div>
          <div className="stat-label">Requests/min</div>
          <div className="stat-change positive">+15%</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{(status.metrics.errorRate * 100).toFixed(2)}%</div>
          <div className="stat-label">Error Rate</div>
          <div className="stat-change negative">-0.1%</div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Performance Metrics</h3>
        </div>
        <div className="chart-container">
          <PerformanceChart />
        </div>
      </div>
    </div>
  );
}

function Agents() {
  const { loading, error, data } = useQuery(GET_AGENTS, {
    pollInterval: 2000,
  });
  const [startAgent] = useMutation(START_AGENT);
  const [stopAgent] = useMutation(STOP_AGENT);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Agent Management</h2>
      
      <div className="agent-list">
        {data.agents.map(agent => (
          <div key={agent.id} className="agent-item">
            <div className={\`agent-status \${agent.status.toLowerCase()}\`}></div>
            <div className="agent-info">
              <h3>{agent.name}</h3>
              <div className="agent-meta">
                {agent.type} • {agent.emotion.primaryEmotion} ({(agent.emotion.intensity * 100).toFixed(0)}%) • 
                CPU: {agent.performance.cpuUsage.toFixed(1)}%
              </div>
            </div>
            <div className="agent-actions">
              {agent.status === 'READY' ? (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => stopAgent({ variables: { id: agent.id } })}
                >
                  Stop
                </button>
              ) : (
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => startAgent({ variables: { id: agent.id } })}
                >
                  Start
                </button>
              )}
              <button className="btn btn-secondary btn-sm">Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Logs() {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    // Subscribe to system events
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs(prev => [...prev.slice(-100), data].slice(-100));
      }
    };
    
    return () => ws.close();
  }, []);
  
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>System Logs</h2>
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Real-time Logs</h3>
        </div>
        <div className="log-viewer">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className={\`log-level \${log.level}\`}>{log.level.toUpperCase()}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Settings</h2>
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">API Configuration</h3>
        </div>
        <form>
          <div className="form-group">
            <label className="form-label">API Port</label>
            <input type="number" className="form-input" defaultValue="8000" />
          </div>
          
          <div className="form-group">
            <label className="form-label">Rate Limit (requests/min)</label>
            <input type="number" className="form-input" defaultValue="100" />
          </div>
          
          <div className="form-group">
            <label className="form-label">CORS Origins</label>
            <textarea className="form-textarea" rows="3" defaultValue="*" />
          </div>
          
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </form>
      </div>
    </div>
  );
}

function PerformanceChart() {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 20 }, (_, i) => \`\${20 - i}m\`),
        datasets: [
          {
            label: 'Response Time (ms)',
            data: Array.from({ length: 20 }, () => Math.random() * 200 + 100),
            borderColor: '#2563eb',
            tension: 0.4,
          },
          {
            label: 'CPU Usage (%)',
            data: Array.from({ length: 20 }, () => Math.random() * 50 + 20),
            borderColor: '#10b981',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#9ca3af',
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: '#374151',
            },
            ticks: {
              color: '#9ca3af',
            },
          },
          y: {
            grid: {
              color: '#374151',
            },
            ticks: {
              color: '#9ca3af',
            },
          },
        },
      },
    });
    
    return () => chart.destroy();
  }, []);
  
  return <canvas ref={canvasRef}></canvas>;
}

// Utility functions
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return \`\${days}d \${hours}h\`;
  if (hours > 0) return \`\${hours}h \${minutes}m\`;
  return \`\${minutes}m\`;
}

// Mount the app
ReactDOM.render(<Dashboard />, document.getElementById('root'));`;
  }
}

// Export the AdminDashboard class
export default AdminDashboard;
