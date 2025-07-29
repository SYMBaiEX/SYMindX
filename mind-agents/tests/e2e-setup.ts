// E2E test specific setup
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import path from 'path';

let serverProcess: ChildProcess;
const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

beforeAll(async () => {
  console.log('🚀 Starting API server for E2E tests...');
  
  // Start the API server
  serverProcess = spawn('bun', ['run', 'start'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'test',
    },
    detached: false,
  });
  
  // Wait for server to be ready
  await waitForServer(API_URL, 30000);
  
  console.log('✅ API server ready');
});

afterAll(async () => {
  console.log('🛑 Stopping API server...');
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force kill if still running
    try {
      process.kill(serverProcess.pid!, 0);
      serverProcess.kill('SIGKILL');
    } catch (e) {
      // Process already dead
    }
  }
});

// E2E test utilities
global.e2eTestUtils = {
  apiUrl: API_URL,
  
  // Make API requests
  api: {
    get: (path: string) => axios.get(`${API_URL}${path}`),
    post: (path: string, data: any) => axios.post(`${API_URL}${path}`, data),
    put: (path: string, data: any) => axios.put(`${API_URL}${path}`, data),
    delete: (path: string) => axios.delete(`${API_URL}${path}`),
  },
  
  // WebSocket helpers
  createWebSocket: (path: string) => {
    const ws = new WebSocket(`ws://localhost:3001${path}`);
    return new Promise((resolve, reject) => {
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  },
  
  // Wait for conditions
  waitFor: async (condition: () => boolean | Promise<boolean>, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timeout waiting for condition');
  },
};

// Helper to wait for server to be ready
async function waitForServer(url: string, timeout: number) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await axios.get(`${url}/health`);
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Server failed to start');
}