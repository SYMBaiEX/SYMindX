import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import ws from 'k6/ws';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics for AI-specific testing
const agentResponseTime = new Trend('agent_response_time');
const emotionStateChanges = new Counter('emotion_state_changes');
const memoryOperations = new Counter('memory_operations');
const multiAgentInteractions = new Counter('multi_agent_interactions');
const tokenUsage = new Gauge('token_usage');
const errorRate = new Rate('errors');

// Load test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Single agent baseline
    single_agent_baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      startTime: '0s',
    },
    // Scenario 2: Multi-agent coordination
    multi_agent_coordination: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 5000 },
        { duration: '10m', target: 10000 },
        { duration: '5m', target: 0 },
      ],
      startTime: '5m',
    },
    // Scenario 3: Stress test with memory pressure
    memory_pressure_test: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      startTime: '40m',
    },
    // Scenario 4: Chaos engineering simulation
    chaos_simulation: {
      executor: 'shared-iterations',
      vus: 50,
      iterations: 1000,
      startTime: '50m',
    },
    // Scenario 5: Spike test
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 2000,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '10s', target: 2000 },
        { duration: '30s', target: 2000 },
        { duration: '10s', target: 50 },
        { duration: '30s', target: 50 },
      ],
      startTime: '60m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'agent_response_time': ['p(95)<2000', 'p(99)<5000'],
    'errors': ['rate<0.1'],
    'http_req_failed': ['rate<0.1'],
    'multi_agent_interactions': ['count>1000'],
    'token_usage': ['value<10000'],
  },
};

// Test data
const agents = new SharedArray('agents', function () {
  return [
    { id: 'nyx', name: 'NyX', type: 'hacker' },
    { id: 'aria', name: 'Aria', type: 'artist' },
    { id: 'rex', name: 'Rex', type: 'strategist' },
    { id: 'nova', name: 'Nova', type: 'counselor' },
  ];
});

const messages = new SharedArray('messages', function () {
  return [
    'Hello, how are you?',
    'Can you help me with a problem?',
    'What is your opinion on AI ethics?',
    'Tell me about your emotions',
    'Analyze this complex situation',
    'Remember our previous conversation',
    'Execute a multi-step plan',
    'Coordinate with other agents',
  ];
});

// API endpoints
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';

// Main test function
export default function () {
  const agent = randomItem(agents);
  const message = randomItem(messages);

  // Test 1: Agent activation
  const activateStart = Date.now();
  const activateRes = http.post(`${BASE_URL}/api/agents/${agent.id}/activate`);
  agentResponseTime.add(Date.now() - activateStart);
  
  check(activateRes, {
    'agent activation successful': (r) => r.status === 200,
    'agent state returned': (r) => r.json('state') !== undefined,
  });

  if (activateRes.status !== 200) {
    errorRate.add(1);
    return;
  }

  // Test 2: Send message
  const messageStart = Date.now();
  const messageRes = http.post(
    `${BASE_URL}/api/agents/${agent.id}/message`,
    JSON.stringify({ message, context: {} }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  agentResponseTime.add(Date.now() - messageStart);

  check(messageRes, {
    'message response received': (r) => r.status === 200,
    'response contains text': (r) => r.json('response.text') !== undefined,
    'emotion state updated': (r) => r.json('response.emotion') !== undefined,
  });

  if (messageRes.json('response.emotion')) {
    emotionStateChanges.add(1);
  }

  // Test 3: Memory operations
  if (Math.random() < 0.3) {
    const memoryRes = http.get(`${BASE_URL}/api/agents/${agent.id}/memories?limit=10`);
    memoryOperations.add(1);
    
    check(memoryRes, {
      'memory retrieval successful': (r) => r.status === 200,
      'memories returned': (r) => Array.isArray(r.json('memories')),
    });
  }

  // Test 4: Multi-agent interaction
  if (Math.random() < 0.2) {
    const otherAgent = randomItem(agents.filter(a => a.id !== agent.id));
    const interactionRes = http.post(
      `${BASE_URL}/api/agents/interact`,
      JSON.stringify({
        fromAgent: agent.id,
        toAgent: otherAgent.id,
        message: message,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    multiAgentInteractions.add(1);
    
    check(interactionRes, {
      'multi-agent interaction successful': (r) => r.status === 200,
    });
  }

  // Test 5: WebSocket connection (10% of requests)
  if (Math.random() < 0.1) {
    const wsRes = ws.connect(`${WS_URL}/ws/agents/${agent.id}`, {}, function (socket) {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'message', content: message }));
      });

      socket.on('message', (data) => {
        const response = JSON.parse(data);
        check(response, {
          'ws response received': (r) => r.type === 'response',
        });
        socket.close();
      });

      socket.setTimeout(() => {
        socket.close();
      }, 5000);
    });
  }

  // Track token usage
  if (messageRes.json('response.tokenUsage')) {
    tokenUsage.add(messageRes.json('response.tokenUsage'));
  }

  sleep(1);
}

// Chaos injection function
export function chaosInjection() {
  const chaosTypes = [
    'network_delay',
    'memory_spike',
    'cpu_spike',
    'agent_crash',
    'database_slowdown',
    'portal_timeout',
  ];

  const chaosType = randomItem(chaosTypes);
  
  const chaosRes = http.post(
    `${BASE_URL}/api/chaos/inject`,
    JSON.stringify({ type: chaosType, duration: 5000 }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(chaosRes, {
    'chaos injection successful': (r) => r.status === 200,
  });
}

// Memory leak detection
export function memoryLeakDetection() {
  const iterations = 100;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const memoryBefore = http.get(`${BASE_URL}/api/system/memory`).json('usage');
    
    // Perform operations that might leak memory
    const agent = randomItem(agents);
    http.post(`${BASE_URL}/api/agents/${agent.id}/activate`);
    
    for (let j = 0; j < 10; j++) {
      http.post(
        `${BASE_URL}/api/agents/${agent.id}/message`,
        JSON.stringify({ message: `Test message ${j}` }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    http.post(`${BASE_URL}/api/agents/${agent.id}/deactivate`);
    
    const memoryAfter = http.get(`${BASE_URL}/api/system/memory`).json('usage');
    results.push(memoryAfter - memoryBefore);
    
    sleep(0.5);
  }

  // Check for memory leak pattern
  const avgGrowth = results.reduce((a, b) => a + b, 0) / results.length;
  check(avgGrowth, {
    'no memory leak detected': (growth) => growth < 1000000, // 1MB threshold
  });
}