#!/usr/bin/env node

/**
 * Test script to verify agents are properly displayed in the WebUI
 */

const http = require('http');

// Test /api/agents endpoint
function testAgentsEndpoint() {
  console.log('Testing /api/agents endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/agents',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        const parsed = JSON.parse(data);
        console.log('Response:', JSON.stringify(parsed, null, 2));
        
        if (parsed.agents) {
          console.log(`\n✅ Found ${parsed.agents.length} agents`);
          parsed.agents.forEach(agent => {
            console.log(`  - ${agent.name} (${agent.id}): ${agent.status}`);
          });
        } else {
          console.log('\n❌ No agents property in response');
        }
      } catch (error) {
        console.error('Failed to parse response:', error);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request failed:', error);
  });

  req.end();
}

// Test /api/stats endpoint
function testStatsEndpoint() {
  console.log('\nTesting /api/stats endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/stats',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        const parsed = JSON.parse(data);
        console.log('Stats available:', Object.keys(parsed).join(', '));
        if (parsed.runtime) {
          console.log('Runtime stats:', parsed.runtime);
        }
      } catch (error) {
        console.error('Failed to parse response:', error);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request failed:', error);
  });

  req.end();
}

// Test if agent detail endpoint works
function testAgentDetailEndpoint(agentId) {
  console.log(`\nTesting /api/agent/${agentId} endpoint...`);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/agent/${agentId}`,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode);
      if (res.statusCode === 200) {
        console.log('✅ Agent detail endpoint works');
      } else {
        console.log('❌ Agent detail endpoint returned:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request failed:', error);
  });

  req.end();
}

console.log('🧪 Testing SYMindX Agent UI endpoints...\n');
console.log('Make sure the agent system is running on port 3000\n');

// Run tests
testAgentsEndpoint();
setTimeout(() => testStatsEndpoint(), 1000);

// Test agent detail endpoint with a dummy ID
setTimeout(() => testAgentDetailEndpoint('test-agent'), 2000);

console.log('\n📝 To access the WebUI, visit:');
console.log('  - http://localhost:3000/ui/agents');
console.log('  - http://localhost:3000/api/ui/agents');