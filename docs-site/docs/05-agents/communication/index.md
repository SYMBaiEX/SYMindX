---
sidebar_position: 1
title: "Agent Communication"
description: "How agents communicate in SYMindX"
---

# Agent Communication

How agents communicate in SYMindX

## Agent Communication

Agents communicate through various channels and protocols.

### Communication Channels

#### 1. Direct Messaging
```typescript
// Send direct message
await agent1.sendMessage(agent2.id, {
  type: 'query',
  content: 'What is your status?'
});

// Receive messages
agent2.on('message', async (msg) => {
  if (msg.type === 'query') {
    await agent2.reply(msg, {
      status: 'active',
      workload: 0.7
    });
  }
});
```

#### 2. Event Broadcasting
```typescript
// Broadcast to all agents
agent.broadcast('discovery', {
  finding: 'New pattern detected',
  confidence: 0.95
});

// Subscribe to broadcasts
agent.on('broadcast:discovery', (data) => {
  if (data.confidence > 0.9) {
    agent.investigate(data.finding);
  }
});
```

#### 3. Shared Memory
```typescript
// Write to shared memory
await sharedMemory.set('task:current', {
  id: 'task-123',
  assignee: agent1.id,
  status: 'in-progress'
});

// Read from shared memory
const currentTask = await sharedMemory.get('task:current');
```

### Communication Protocols

#### Request-Response
```typescript
// Make request
const response = await agent1.request(agent2, {
  action: 'analyze',
  data: complexData
});

// Handle request
agent2.on('request', async (req) => {
  const result = await agent2.analyze(req.data);
  return { success: true, result };
});
```

#### Publish-Subscribe
```typescript
// Subscribe to topics
agent.subscribe('market:update');
agent.subscribe('security:alert');

// Publish to topic
coordinator.publish('market:update', {
  symbol: 'BTC',
  price: 50000
});
```

#### Stream Communication
```typescript
// Create stream
const stream = agent1.createStream(agent2);

// Send streaming data
for await (const chunk of dataSource) {
  stream.write(chunk);
}
stream.end();

// Receive stream
agent2.on('stream', async (stream) => {
  for await (const chunk of stream) {
    await processChunk(chunk);
  }
});
```

### Communication Patterns

#### Delegation
```typescript
// Delegate task to another agent
const result = await agent1.delegate(agent2, {
  task: 'complex-calculation',
  params: { x: 10, y: 20 },
  timeout: 5000
});
```

#### Negotiation
```typescript
// Negotiate resource allocation
const negotiation = await agent1.negotiate(agent2, {
  resource: 'compute-time',
  requested: 100,
  priority: 'high'
});

if (negotiation.agreed) {
  await useResource(negotiation.allocated);
}
```

#### Consensus
```typescript
// Reach consensus among agents
const decision = await coordinator.consensus(agents, {
  proposal: 'upgrade-system',
  method: 'majority',  // or 'unanimous'
  timeout: 10000
});
```
