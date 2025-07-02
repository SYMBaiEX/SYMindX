import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

import { SYMindXRuntime } from './core/runtime.js';
import type { RuntimeConfig } from './types/agent.js';
import { LogLevel, MemoryProviderType, EmotionModuleType, CognitionModuleType } from './types/agent.js';
import { logger } from './utils/logger.js';

// Export autonomous components for external use
export { AutonomousEngine } from './core/autonomous-engine.js';
export { DecisionEngine } from './core/decision-engine.js';
export { EthicsEngine } from './core/ethics-engine.js';
export { InteractionManager } from './core/interaction-manager.js';
// TEMPORARILY COMMENTED OUT - export conflicts
// export * from './modules/behaviors/index.js';
// export * from './modules/life-cycle/index.js';
export * from './types/autonomous.js';

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
    logger.banner('SYMindX Runtime', 'Modular AI Agent Framework');
    logger.start('Initializing runtime...');
    await runtime.initialize();
    logger.success('Runtime initialized');
    
    // Start the runtime loop (which will load agents after registering modules)
    await runtime.start();
    logger.success('Runtime started successfully');
  } catch (error) {
    logger.error('Failed to start runtime:', error);
    process.exit(1);
  }
}

start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.warn('Received shutdown signal, stopping runtime...');
  await runtime.stop();
  logger.success('Runtime stopped successfully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.warn('Received termination signal, stopping runtime...');
  await runtime.stop();
  logger.success('Runtime stopped successfully');
  process.exit(0);
});