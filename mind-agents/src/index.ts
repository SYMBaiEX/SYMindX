import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(rootDir, '.env') });

import { SYMindXRuntime } from './core/runtime.js';
import type { RuntimeConfig } from './types/agent.js';
import { LogLevel, MemoryProviderType, EmotionModuleType, CognitionModuleType } from './types/agent.js';

// Default runtime configuration
const config: RuntimeConfig = {
  tickInterval: 1000,
  maxAgents: 10,
  logLevel: LogLevel.INFO,
  persistence: {
    enabled: true,
    path: './data'
  },
  extensions: {
    autoLoad: true,
    paths: ['./extensions']
  },
  portals: {
    autoLoad: true,
    paths: ['./portals'],
    apiKeys: {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      groq: process.env.GROQ_API_KEY || '',
      xai: process.env.XAI_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      'kluster.ai': process.env.KLUSTERAI_API_KEY || ''
    }
  }
};

// Initialize the runtime
const runtime = new SYMindXRuntime(config);

// Start the runtime
async function start() {
  try {
    console.log('Starting SYMindX Runtime...');
    await runtime.initialize();
    console.log('SYMindX Runtime initialized successfully');
    
    // Load available agents
    await runtime.loadAgents();
    
    // Start the runtime loop
    runtime.start();
    console.log('SYMindX Runtime started successfully');
  } catch (error) {
    console.error('Failed to start SYMindX Runtime:', error);
    process.exit(1);
  }
}

start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down SYMindX Runtime...');
  await runtime.stop();
  console.log('SYMindX Runtime stopped successfully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down SYMindX Runtime...');
  await runtime.stop();
  console.log('SYMindX Runtime stopped successfully');
  process.exit(0);
});