#!/usr/bin/env bun

import { SYMindXRuntime } from './dist/core/runtime.js';

console.log('Testing runtime agent loading...\n');

// Create a test config
const config = {
  tickInterval: 1000,
  maxAgents: 10,
  logLevel: 'debug',
  persistence: {
    enabled: true,
    path: './data'
  },
  extensions: {
    autoLoad: false
  },
  agents: {
    enabled: true,
    autoLoad: true,
    autoDiscoverCharacters: true,
    charactersPath: './dist/characters',
    defaultLazy: true,
    defaultEnabled: false
  },
  portals: {
    autoLoad: false
  }
};

console.log('Config:', JSON.stringify(config, null, 2));

try {
  const runtime = new SYMindXRuntime(config);
  console.log('\nRuntime created. Agents config:', runtime.config.agents);
  
  // Initialize
  console.log('\nInitializing runtime...');
  await runtime.initialize();
  
  // Load agents manually
  console.log('\nLoading agents...');
  await runtime.loadAgents();
  
  console.log('\nActive agents:', runtime.agents.size);
  console.log('Lazy agents:', runtime.lazyAgents.size);
  
  // List agents
  for (const [id, agent] of runtime.agents) {
    console.log(`- Active: ${agent.name} (${id})`);
  }
  
  for (const [id, agent] of runtime.lazyAgents) {
    console.log(`- Lazy: ${agent.name} (${id})`);
  }
  
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
}