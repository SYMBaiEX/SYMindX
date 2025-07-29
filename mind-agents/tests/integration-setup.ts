// Integration test specific setup
import { Runtime } from '../src/core/runtime';
import { createMemoryProvider } from '../src/modules/memory';
import path from 'path';

// Integration test database
const TEST_DB_PATH = path.join(__dirname, '../temp/test-memories/integration.db');

// Shared runtime instance for integration tests
let runtime: Runtime;

beforeAll(async () => {
  // Initialize runtime for integration tests
  runtime = new Runtime({
    agents: [],
    extensions: [],
    portals: [],
    config: {
      logLevel: 'error',
      maxAgents: 10,
      memoryProvider: {
        type: 'sqlite',
        config: {
          dbPath: TEST_DB_PATH,
        },
      },
    },
  });
  
  // Make runtime available globally
  global.integrationRuntime = runtime;
});

afterAll(async () => {
  // Cleanup runtime
  if (runtime) {
    await runtime.shutdown();
  }
});

// Integration test utilities
global.integrationTestUtils = {
  getRuntime: () => runtime,
  
  createTestAgent: async (config: any) => {
    const agent = await runtime.createAgent(config);
    return agent;
  },
  
  waitForEvent: (eventName: string, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);
      
      runtime.eventBus.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  },
  
  cleanupAgents: async () => {
    const agents = await runtime.listAgents();
    for (const agent of agents) {
      await runtime.removeAgent(agent.id);
    }
  },
};