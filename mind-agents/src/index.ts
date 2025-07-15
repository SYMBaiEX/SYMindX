import * as path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import { SYMindXRuntime } from './core/runtime';
import type { RuntimeConfig } from './types/agent';
import {
  displayBanner,
  createSpinner,
  animateLoading,
  displaySuccess,
  animateShutdown,
  matrixRain,
  createStatusDashboard,
} from './utils/cli-ui';
import { logger } from './utils/logger';

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });
// Export types for API consumers
export type {
  MemoryProviderType,
  EmotionModuleType,
  CognitionModuleType,
} from './types/agent';

// Available module types for runtime configuration:
// - Memory providers: MemoryProviderType
// - Emotion modules: EmotionModuleType
// - Cognition modules: CognitionModuleType
// These types are exported for API consumers but not used directly in startup

// Export autonomous components for external use
export { AutonomousEngine } from './core/autonomous-engine';
export { DecisionEngine } from './core/decision-engine';
export { EthicsEngine } from './core/ethics-engine';
export { InteractionManager } from './core/interaction-manager';
// Future module exports - see /TODO.md for implementation details
export * from './types/autonomous';

// Default runtime configuration
const config: RuntimeConfig = {
  tickInterval: 1000,
  maxAgents: 10,
  logLevel: logger.LogLevel.INFO,
  persistence: {
    enabled: true,
    path: './data',
  },
  extensions: {
    autoLoad: true,
    paths: ['./extensions'],
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
      'kluster.ai': process.env.KLUSTERAI_API_KEY || '',
    },
  },
};

// Initialize the runtime
const runtime = new SYMindXRuntime(config);

// Create status dashboard
const dashboard = createStatusDashboard();

// Start the runtime
async function start() {
  try {
    // Show awesome banner
    await displayBanner();

    // Optional: Show matrix rain for 2 seconds
    if (process.env.SHOW_MATRIX === 'true') {
      await matrixRain(2000);
    }

    // Animated initialization sequence
    await animateLoading('🔧 Loading configuration', 500);
    await animateLoading('📦 Initializing core modules', 800);

    const initSpinner = createSpinner(
      'Initializing SYMindX Runtime...',
      'star'
    );
    initSpinner.start();

    await runtime.initialize();

    initSpinner.succeed('Runtime initialized successfully!');

    await animateLoading('🔮 Connecting to AI portals', 1000);
    await animateLoading('🤖 Loading agents', 1000);

    // Start the runtime loop
    const startSpinner = createSpinner(
      'Starting runtime engine...',
      'bouncingBar'
    );
    startSpinner.start();

    await runtime.start();

    startSpinner.succeed('Runtime engine started!');

    console.log();
    displaySuccess('SYMindX is now running! All systems operational.');
    console.log();

    // Track command and portal metrics
    let commandCount = 0;
    let portalRequestCount = 0;

    // Listen to events to track real metrics
    runtime.eventBus.on('command:executed', () => commandCount++);
    runtime.eventBus.on('portal:request', () => portalRequestCount++);

    // Display initial dashboard status with actual uptime
    dashboard.update({
      metrics: {
        uptime: (Date.now() - startTime) / 1000, // uptime in seconds
        activeAgents: runtime.registry.getRegisteredAgents().length,
        commandsProcessed: commandCount,
        portalRequests: portalRequestCount,
        memory: process.memoryUsage().heapUsed / 1024 / 1024,
      },
    });
    dashboard.render();
  } catch (error) {
    void error;
    logger.error('Failed to start runtime:', error);
    process.exit(1);
  }
}

const startTime = Date.now();

start();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await animateShutdown();
  await runtime.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await animateShutdown();
  await runtime.stop();
  process.exit(0);
});
