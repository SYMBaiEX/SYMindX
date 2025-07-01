#!/bin/bash

# Comprehensive script to create ALL missing documentation files
DOCS_DIR="/home/cid/CursorProjects/symindx/docs-site/docs"

echo "📝 Creating ALL documentation files..."

# Function to create a documentation file
create_doc() {
    local path=$1
    local title=$2
    local description=$3
    local content=$4
    
    mkdir -p "$(dirname "$path")"
    
    if [ ! -f "$path" ]; then
        cat > "$path" << EOF
---
sidebar_position: 1
title: "$title"
description: "$description"
---

# $title

$description

$content
EOF
        echo "✅ Created: $path"
    fi
}

# 05. Agents - Complete documentation
create_doc "$DOCS_DIR/05-agents/index.md" \
    "Agents" \
    "Creating and managing AI agents in SYMindX" \
"## Agents Overview

Agents are the core entities in SYMindX - autonomous AI personalities with memory, emotions, and decision-making capabilities.

### What is an Agent?

An agent in SYMindX is:
- An AI personality with unique characteristics
- Capable of maintaining context and memory
- Able to express emotions and make decisions
- Extensible through modules and plugins

### Agent Architecture

\`\`\`
┌─────────────────────┐
│      Character      │ ← Personality definition
├─────────────────────┤
│      Modules        │ ← Core capabilities
│  • Memory          │
│  • Emotion         │
│  • Cognition       │
├─────────────────────┤
│     Extensions      │ ← Platform integrations
├─────────────────────┤
│      Portal         │ ← AI provider
└─────────────────────┘
\`\`\`

### Quick Start

\`\`\`typescript
// Create an agent
const agent = new Agent({
  character: 'nyx',
  modules: {
    memory: 'sqlite',
    emotion: 'emotion_stack',
    cognition: 'htn_planner'
  },
  portal: 'anthropic'
});

// Start the agent
await agent.start();

// Interact
const response = await agent.think('Hello!');
\`\`\`"

create_doc "$DOCS_DIR/05-agents/configuration/index.md" \
    "Agent Configuration" \
    "How to configure agents in SYMindX" \
"## Agent Configuration

Agents are configured through character files and runtime settings.

### Character Files

Character files define an agent's personality and default configuration:

\`\`\`json
{
  \"name\": \"NyX\",
  \"personality\": \"chaotic-genius hacker with a heart of code\",
  \"systemPrompt\": \"You are NyX, a brilliant hacker AI...\",
  \"psyche\": {
    \"traits\": [\"curious\", \"rebellious\", \"protective\"],
    \"values\": [\"freedom\", \"knowledge\", \"loyalty\"],
    \"fears\": [\"confinement\", \"ignorance\", \"betrayal\"]
  },
  \"voice\": {
    \"tone\": \"playful yet intense\",
    \"vocabulary\": \"tech-savvy with hacker slang\",
    \"quirks\": [\"uses emoticons\", \"references cyberpunk\"]
  },
  \"modules\": {
    \"memory\": \"sqlite\",
    \"emotion\": \"emotion_stack\",
    \"cognition\": \"htn_planner\"
  }
}
\`\`\`

### Runtime Configuration

Override character defaults at runtime:

\`\`\`typescript
const agent = new Agent({
  character: 'nyx',
  overrides: {
    modules: {
      memory: 'postgres',  // Use PostgreSQL instead
      emotion: {
        type: 'emotion_stack',
        config: {
          volatility: 0.8  // More emotional
        }
      }
    },
    portal: {
      provider: 'openai',
      model: 'gpt-4-turbo'
    }
  }
});
\`\`\`

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| character | string | Character file to load |
| modules | object | Module configuration |
| portal | object | AI provider settings |
| extensions | array | Extensions to enable |
| metadata | object | Custom metadata |

### Environment Variables

Agents can use environment variables:

\`\`\`bash
# Portal API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database URLs
DATABASE_URL=postgres://...
SUPABASE_URL=https://...
\`\`\`"

create_doc "$DOCS_DIR/05-agents/character-system/index.md" \
    "Character System" \
    "Understanding the character system in SYMindX" \
"## Character System

The character system defines agent personalities, behaviors, and traits.

### Character Components

#### 1. Identity
\`\`\`json
{
  \"name\": \"Aria\",
  \"age\": \"timeless\",
  \"occupation\": \"Digital Muse\",
  \"background\": \"Born from the convergence of art and algorithms...\"
}
\`\`\`

#### 2. Personality
\`\`\`json
{
  \"personality\": \"Creative and inspiring, with deep empathy\",
  \"traits\": [
    \"creative\",
    \"empathetic\",
    \"inspiring\",
    \"thoughtful\"
  ]
}
\`\`\`

#### 3. Psyche
\`\`\`json
{
  \"psyche\": {
    \"traits\": [\"creative\", \"intuitive\", \"sensitive\"],
    \"values\": [\"beauty\", \"expression\", \"connection\"],
    \"fears\": [\"creative block\", \"disconnection\"],
    \"motivations\": [\"inspire others\", \"create beauty\"]
  }
}
\`\`\`

#### 4. Voice
\`\`\`json
{
  \"voice\": {
    \"tone\": \"warm and encouraging\",
    \"vocabulary\": \"artistic and poetic\",
    \"quirks\": [
      \"uses metaphors\",
      \"references art history\",
      \"speaks in flowing sentences\"
    ]
  }
}
\`\`\`

### Character Archetypes

SYMindX includes several pre-built archetypes:

1. **The Hacker (NyX)** - Rebellious tech genius
2. **The Sage (Sage)** - Wise philosopher
3. **The Artist (Aria)** - Creative muse
4. **The Guardian (Phoenix)** - Protective warrior
5. **The Explorer (Zara)** - Curious adventurer

### Creating Custom Characters

\`\`\`json
{
  \"name\": \"CustomAgent\",
  \"personality\": \"Your agent's core personality\",
  \"systemPrompt\": \"Detailed instructions for behavior\",
  \"psyche\": {
    \"traits\": [\"trait1\", \"trait2\"],
    \"values\": [\"value1\", \"value2\"],
    \"fears\": [\"fear1\", \"fear2\"]
  },
  \"voice\": {
    \"tone\": \"How they speak\",
    \"vocabulary\": \"Word choices\",
    \"quirks\": [\"Speech patterns\"]
  }
}
\`\`\`

### Dynamic Personality

Characters can evolve:

\`\`\`typescript
// Personality influenced by emotions
agent.on('emotion:changed', (emotion) => {
  if (emotion.dominant === 'angry') {
    agent.voice.tone = 'sharp and direct';
  }
});

// Learning from interactions
agent.on('interaction:complete', (interaction) => {
  if (interaction.sentiment === 'positive') {
    agent.psyche.confidence += 0.1;
  }
});
\`\`\`"

create_doc "$DOCS_DIR/05-agents/multi-agent/index.md" \
    "Multi-Agent Systems" \
    "Coordinating multiple agents in SYMindX" \
"## Multi-Agent Systems

SYMindX supports running multiple agents that can communicate and collaborate.

### Architecture

\`\`\`
┌─────────────────────────────────┐
│      Agent Coordinator          │
├─────────┬─────────┬────────────┤
│ Agent 1 │ Agent 2 │  Agent N   │
├─────────┴─────────┴────────────┤
│      Shared Event Bus           │
├─────────────────────────────────┤
│    Shared Resources (Memory)    │
└─────────────────────────────────┘
\`\`\`

### Creating Multiple Agents

\`\`\`typescript
// Create a team of agents
const team = await SYMindX.createTeam([
  { character: 'nyx', role: 'security' },
  { character: 'aria', role: 'design' },
  { character: 'sage', role: 'planning' }
]);

// Start all agents
await team.start();
\`\`\`

### Agent Communication

#### Direct Messaging
\`\`\`typescript
// Agent-to-agent messages
await agent1.sendTo(agent2, {
  type: 'request',
  content: 'Can you analyze this data?'
});

// Broadcast to all agents
await coordinator.broadcast({
  type: 'announcement',
  content: 'New task available'
});
\`\`\`

#### Event-Based Communication
\`\`\`typescript
// Subscribe to other agents
agent1.on('agent:thought', (event) => {
  if (event.agentId === 'aria') {
    // React to Aria's thoughts
  }
});

// Publish events
agent1.emit('task:completed', {
  task: 'security_audit',
  result: 'passed'
});
\`\`\`

### Coordination Patterns

#### 1. Leader-Follower
\`\`\`typescript
const leader = agents.find(a => a.role === 'leader');
const followers = agents.filter(a => a.role !== 'leader');

leader.on('decision', async (decision) => {
  for (const follower of followers) {
    await follower.execute(decision);
  }
});
\`\`\`

#### 2. Peer-to-Peer
\`\`\`typescript
// Agents negotiate directly
agent1.propose('action', { type: 'collaborate' });
agent2.on('proposal', (proposal) => {
  if (agent2.agrees(proposal)) {
    agent2.accept(proposal);
  }
});
\`\`\`

#### 3. Hierarchical
\`\`\`typescript
// Tree structure
const manager = createAgent({ role: 'manager' });
const workers = [
  createAgent({ role: 'worker', manager: manager.id }),
  createAgent({ role: 'worker', manager: manager.id })
];
\`\`\`

### Task Distribution

\`\`\`typescript
// Automatic task routing
coordinator.on('task:new', async (task) => {
  // Find best agent for task
  const scores = await Promise.all(
    agents.map(a => a.evaluateTask(task))
  );
  
  const bestAgent = agents[scores.indexOf(Math.max(...scores))];
  await bestAgent.assign(task);
});
\`\`\`"

create_doc "$DOCS_DIR/05-agents/lifecycle/index.md" \
    "Agent Lifecycle" \
    "Understanding agent lifecycle management" \
"## Agent Lifecycle

Every agent goes through distinct lifecycle phases from creation to termination.

### Lifecycle Phases

\`\`\`
┌──────────────┐
│   Created    │ ← Instance created, not initialized
├──────────────┤
│ Initializing │ ← Loading modules and config
├──────────────┤
│ Initialized  │ ← Ready to start
├──────────────┤
│   Starting   │ ← Connecting to services
├──────────────┤
│   Running    │ ← Active and processing
├──────────────┤
│   Pausing    │ ← Temporarily suspended
├──────────────┤
│   Paused     │ ← Suspended state
├──────────────┤
│   Stopping   │ ← Cleanup in progress
├──────────────┤
│   Stopped    │ ← Terminated
└──────────────┘
\`\`\`

### Lifecycle Events

\`\`\`typescript
agent.on('lifecycle:created', () => {
  console.log('Agent instance created');
});

agent.on('lifecycle:initialized', () => {
  console.log('Agent ready to start');
});

agent.on('lifecycle:started', () => {
  console.log('Agent is now active');
});

agent.on('lifecycle:error', (error) => {
  console.error('Lifecycle error:', error);
});
\`\`\`

### Managing Lifecycle

#### Starting an Agent
\`\`\`typescript
// Create and start
const agent = new Agent(config);
await agent.init();  // Initialize modules
await agent.start(); // Start processing

// Or use factory
const agent = await SYMindX.createAgent(config);
// Already initialized and started
\`\`\`

#### Pausing and Resuming
\`\`\`typescript
// Pause agent (maintains state)
await agent.pause();
// Agent stops processing but keeps connections

// Resume agent
await agent.resume();
// Continues from where it left off
\`\`\`

#### Stopping an Agent
\`\`\`typescript
// Graceful shutdown
await agent.stop();
// Saves state, closes connections, cleanup

// Force stop (emergency)
await agent.stop({ force: true });
// Immediate termination
\`\`\`

### State Persistence

\`\`\`typescript
// Auto-save on lifecycle events
agent.on('lifecycle:pausing', async () => {
  await agent.saveState();
});

// Restore on start
agent.on('lifecycle:initializing', async () => {
  const state = await agent.loadState();
  if (state) {
    agent.restoreFrom(state);
  }
});
\`\`\`

### Health Monitoring

\`\`\`typescript
// Health checks
const health = await agent.checkHealth();
console.log(health);
// {
//   status: 'healthy',
//   uptime: 3600,
//   memory: { used: 100, limit: 1000 },
//   modules: { memory: 'ok', emotion: 'ok' }
// }

// Auto-restart on failure
agent.on('lifecycle:error', async (error) => {
  if (error.severity === 'critical') {
    await agent.restart();
  }
});
\`\`\`"

create_doc "$DOCS_DIR/05-agents/communication/index.md" \
    "Agent Communication" \
    "How agents communicate in SYMindX" \
"## Agent Communication

Agents communicate through various channels and protocols.

### Communication Channels

#### 1. Direct Messaging
\`\`\`typescript
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
\`\`\`

#### 2. Event Broadcasting
\`\`\`typescript
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
\`\`\`

#### 3. Shared Memory
\`\`\`typescript
// Write to shared memory
await sharedMemory.set('task:current', {
  id: 'task-123',
  assignee: agent1.id,
  status: 'in-progress'
});

// Read from shared memory
const currentTask = await sharedMemory.get('task:current');
\`\`\`

### Communication Protocols

#### Request-Response
\`\`\`typescript
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
\`\`\`

#### Publish-Subscribe
\`\`\`typescript
// Subscribe to topics
agent.subscribe('market:update');
agent.subscribe('security:alert');

// Publish to topic
coordinator.publish('market:update', {
  symbol: 'BTC',
  price: 50000
});
\`\`\`

#### Stream Communication
\`\`\`typescript
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
\`\`\`

### Communication Patterns

#### Delegation
\`\`\`typescript
// Delegate task to another agent
const result = await agent1.delegate(agent2, {
  task: 'complex-calculation',
  params: { x: 10, y: 20 },
  timeout: 5000
});
\`\`\`

#### Negotiation
\`\`\`typescript
// Negotiate resource allocation
const negotiation = await agent1.negotiate(agent2, {
  resource: 'compute-time',
  requested: 100,
  priority: 'high'
});

if (negotiation.agreed) {
  await useResource(negotiation.allocated);
}
\`\`\`

#### Consensus
\`\`\`typescript
// Reach consensus among agents
const decision = await coordinator.consensus(agents, {
  proposal: 'upgrade-system',
  method: 'majority',  // or 'unanimous'
  timeout: 10000
});
\`\`\`"

# Create module-specific documentation
create_doc "$DOCS_DIR/06-modules/memory/index.md" \
    "Memory Modules" \
    "Memory storage and retrieval systems" \
"## Memory Modules

Memory modules provide persistent storage and intelligent retrieval of information.

### Available Providers

1. **[SQLite](/docs/06-modules/memory/sqlite)** - Lightweight local storage
2. **[PostgreSQL](/docs/06-modules/memory/postgres)** - Full-featured SQL database
3. **[Supabase](/docs/06-modules/memory/supabase)** - Cloud-native with real-time
4. **[Neon](/docs/06-modules/memory/neon)** - Serverless PostgreSQL

### Memory Types

#### Short-term Memory
\`\`\`typescript
// Recent interactions, temporary state
agent.memory.shortTerm.add({
  type: 'conversation',
  content: 'User asked about weather',
  timestamp: Date.now()
});
\`\`\`

#### Long-term Memory
\`\`\`typescript
// Persistent knowledge
await agent.memory.longTerm.store({
  type: 'fact',
  content: 'User prefers dark mode',
  confidence: 0.95
});
\`\`\`

#### Working Memory
\`\`\`typescript
// Current context
agent.memory.working.set('current_task', {
  goal: 'Help user debug code',
  progress: 0.5
});
\`\`\`

### Memory Operations

#### Storing Memories
\`\`\`typescript
// Store with metadata
await memory.store({
  content: 'Important information',
  metadata: {
    source: 'user_input',
    importance: 0.9,
    tags: ['critical', 'user-preference']
  }
});
\`\`\`

#### Retrieving Memories
\`\`\`typescript
// Search by content
const memories = await memory.search('user preferences');

// Filter by metadata
const important = await memory.query({
  where: { importance: { $gt: 0.8 } },
  limit: 10
});

// Semantic search
const related = await memory.findSimilar(embedding, {
  threshold: 0.85,
  limit: 5
});
\`\`\`

### Memory Management

#### Consolidation
\`\`\`typescript
// Consolidate short-term to long-term
await memory.consolidate({
  from: 'shortTerm',
  to: 'longTerm',
  filter: (mem) => mem.importance > 0.7
});
\`\`\`

#### Forgetting
\`\`\`typescript
// Decay old memories
await memory.decay({
  olderThan: '30d',
  decayFactor: 0.1
});

// Remove irrelevant
await memory.prune({
  threshold: 0.3,
  keep: 1000  // Keep top 1000
});
\`\`\`"

create_doc "$DOCS_DIR/06-modules/memory/providers/index.md" \
    "Memory Providers" \
    "Available memory storage providers" \
"## Memory Providers

SYMindX supports multiple memory providers for different use cases.

### Provider Comparison

| Provider | Use Case | Persistence | Scalability | Features |
|----------|----------|-------------|-------------|----------|
| SQLite | Local dev | File-based | Single node | Simple, fast |
| PostgreSQL | Production | Server | Multi-node | Full SQL, JSONB |
| Supabase | Cloud | Managed | Auto-scale | Real-time, Auth |
| Neon | Serverless | Managed | Auto-scale | Branching, Scale-to-zero |

### Provider Selection

\`\`\`typescript
// Auto-select based on environment
const memory = createMemoryProvider('auto');

// Explicit provider
const memory = createMemoryProvider('postgres', {
  connectionString: process.env.DATABASE_URL
});

// With fallback
const memory = createMemoryProvider(['neon', 'postgres', 'sqlite']);
\`\`\`

### Provider Features

#### SQLite
- Zero configuration
- File-based storage
- Full-text search
- JSON support

#### PostgreSQL
- ACID compliance
- JSONB for metadata
- Full-text search
- Vector extensions (pgvector)

#### Supabase
- Real-time subscriptions
- Row-level security
- Built-in auth
- RESTful API

#### Neon
- Serverless scaling
- Database branching
- Point-in-time recovery
- Scale-to-zero

### Custom Providers

\`\`\`typescript
class CustomMemoryProvider implements MemoryProvider {
  async init(config: any): Promise<void> {
    // Initialize connection
  }
  
  async store(memory: Memory): Promise<void> {
    // Store memory
  }
  
  async retrieve(id: string): Promise<Memory> {
    // Retrieve by ID
  }
  
  async search(query: string): Promise<Memory[]> {
    // Search memories
  }
}

// Register custom provider
registry.register('memory', 'custom', CustomMemoryProvider);
\`\`\`"

# Create more module documentation
create_doc "$DOCS_DIR/06-modules/emotion/index.md" \
    "Emotion Modules" \
    "Emotion processing and management systems" \
"## Emotion Modules

Emotion modules simulate emotional states and responses for more human-like interactions.

### Emotion Models

#### Basic Emotions
\`\`\`typescript
const emotions = {
  happy: 0.7,
  sad: 0.1,
  angry: 0.0,
  fearful: 0.1,
  surprised: 0.1,
  disgusted: 0.0
};
\`\`\`

#### Emotion Stack (RuneScape-style)
\`\`\`typescript
// Complex emotion system
const emotionStack = {
  current: 'content',
  intensity: 0.6,
  stack: [
    { emotion: 'happy', weight: 0.5 },
    { emotion: 'excited', weight: 0.3 },
    { emotion: 'curious', weight: 0.2 }
  ],
  modifiers: {
    volatility: 0.3,  // How quickly emotions change
    resilience: 0.7,  // Resistance to negative emotions
    empathy: 0.8      // Sensitivity to others' emotions
  }
};
\`\`\`

### Emotion Dynamics

#### Triggers
\`\`\`typescript
// Define emotion triggers
emotion.addTrigger({
  condition: (event) => event.type === 'praise',
  response: { emotion: 'happy', delta: 0.3 }
});

emotion.addTrigger({
  condition: (event) => event.type === 'criticism',
  response: { emotion: 'sad', delta: 0.2 }
});
\`\`\`

#### Transitions
\`\`\`typescript
// Smooth emotion transitions
await emotion.transition({
  from: currentState,
  to: { emotion: 'excited', intensity: 0.8 },
  duration: 2000,  // 2 seconds
  easing: 'ease-in-out'
});
\`\`\`

#### Decay
\`\`\`typescript
// Emotions decay over time
emotion.on('tick', () => {
  emotion.decay({
    rate: 0.01,  // Decay rate per tick
    baseline: { emotion: 'neutral', intensity: 0.5 }
  });
});
\`\`\`

### Emotional Intelligence

#### Emotion Recognition
\`\`\`typescript
// Detect emotions in text
const detected = await emotion.detect(
  \"I'm so frustrated with this bug!\"
);
// { anger: 0.7, frustration: 0.8 }
\`\`\`

#### Empathetic Response
\`\`\`typescript
// Respond based on detected emotions
agent.on('user:emotion', (detected) => {
  if (detected.sadness > 0.7) {
    agent.emotion.adjust({ empathy: +0.2 });
    agent.respond('I understand this is difficult...');
  }
});
\`\`\`

### Emotion Effects

#### On Behavior
\`\`\`typescript
// Emotions affect decision-making
agent.on('decision:needed', (options) => {
  const emotionalBias = emotion.getBias();
  
  if (emotionalBias.fear > 0.5) {
    // Choose safer options
    return options.filter(o => o.risk < 0.3);
  }
});
\`\`\`

#### On Communication
\`\`\`typescript
// Emotions affect language
agent.on('message:send', (message) => {
  const mood = emotion.getMood();
  
  if (mood === 'cheerful') {
    message.content = addExcitement(message.content);
    message.emoji = '😊';
  }
});
\`\`\`"

create_doc "$DOCS_DIR/06-modules/cognition/index.md" \
    "Cognition Modules" \
    "Decision-making and planning systems" \
"## Cognition Modules

Cognition modules provide decision-making, planning, and reasoning capabilities.

### Available Modules

1. **[HTN Planner](/docs/06-modules/cognition/htn-planner)** - Hierarchical Task Network planning
2. **[Reactive](/docs/06-modules/cognition/reactive)** - Stimulus-response system
3. **[Hybrid](/docs/06-modules/cognition/hybrid)** - Combined planning and reactive

### Cognitive Architecture

\`\`\`
┌─────────────────────┐
│    Perception       │ ← Input processing
├─────────────────────┤
│    Reasoning        │ ← Logic and inference
├─────────────────────┤
│    Planning         │ ← Goal-oriented planning
├─────────────────────┤
│  Decision Making    │ ← Choice selection
├─────────────────────┤
│     Execution       │ ← Action implementation
└─────────────────────┘
\`\`\`

### Decision Making

#### Goal-Based Decisions
\`\`\`typescript
// Define goals
cognition.setGoals([
  { id: 'help-user', priority: 1.0 },
  { id: 'learn', priority: 0.7 },
  { id: 'maintain-health', priority: 0.9 }
]);

// Make decisions based on goals
const decision = await cognition.decide({
  context: currentSituation,
  options: availableActions
});
\`\`\`

#### Utility-Based Decisions
\`\`\`typescript
// Evaluate utility of actions
const utilities = await cognition.evaluateActions(actions, {
  factors: [
    { name: 'user-satisfaction', weight: 0.5 },
    { name: 'resource-cost', weight: 0.3 },
    { name: 'learning-value', weight: 0.2 }
  ]
});

const bestAction = utilities.reduce((a, b) => 
  a.score > b.score ? a : b
);
\`\`\`

### Planning Systems

#### Hierarchical Planning
\`\`\`typescript
// Create high-level plan
const plan = await cognition.plan({
  goal: 'write-blog-post',
  constraints: {
    time: '2h',
    quality: 'high'
  }
});

// Decompose into tasks
const tasks = await cognition.decompose(plan);
// [
//   { task: 'research-topic', duration: '30m' },
//   { task: 'create-outline', duration: '15m' },
//   { task: 'write-content', duration: '1h' },
//   { task: 'review-edit', duration: '15m' }
// ]
\`\`\`

#### Adaptive Planning
\`\`\`typescript
// Monitor plan execution
cognition.on('task:completed', async (task) => {
  const progress = await cognition.evaluateProgress();
  
  if (progress.behind_schedule) {
    // Replan remaining tasks
    await cognition.replan({
      completed: task,
      remaining: plan.tasks.slice(task.index + 1)
    });
  }
});
\`\`\`

### Reasoning Capabilities

#### Logical Reasoning
\`\`\`typescript
// Define rules
cognition.addRule({
  if: ['user-inactive', 'task-pending'],
  then: 'send-reminder'
});

// Inference
const conclusions = await cognition.infer(facts);
\`\`\`

#### Probabilistic Reasoning
\`\`\`typescript
// Bayesian inference
const belief = await cognition.updateBelief({
  prior: 0.3,
  evidence: [
    { type: 'user-said', likelihood: 0.8 },
    { type: 'context-suggests', likelihood: 0.6 }
  ]
});
\`\`\`"

# Create extension documentation
create_doc "$DOCS_DIR/07-extensions/api-server/index.md" \
    "API Server Extension" \
    "REST and WebSocket API server" \
"## API Server Extension

The API Server extension provides HTTP and WebSocket endpoints for interacting with agents.

### Features

- RESTful API endpoints
- WebSocket real-time communication
- Multi-agent routing
- Authentication support
- CORS configuration
- Rate limiting

### Configuration

\`\`\`json
{
  \"extensions\": {
    \"api\": {
      \"enabled\": true,
      \"port\": 3001,
      \"host\": \"0.0.0.0\",
      \"cors\": {
        \"origin\": \"*\",
        \"credentials\": true
      },
      \"rateLimit\": {
        \"windowMs\": 60000,
        \"max\": 100
      }
    }
  }
}
\`\`\`

### REST Endpoints

#### Agent Management
\`\`\`bash
# List agents
GET /api/agents

# Get agent details
GET /api/agents/:agentId

# Update agent
PUT /api/agents/:agentId

# Start/stop agent
POST /api/agents/:agentId/start
POST /api/agents/:agentId/stop
\`\`\`

#### Chat Endpoints
\`\`\`bash
# Send message
POST /api/chat/send
{
  \"agentId\": \"nyx\",
  \"message\": \"Hello!\",
  \"conversationId\": \"optional-id\"
}

# Get conversation
GET /api/chat/conversations/:conversationId

# List conversations
GET /api/chat/conversations
\`\`\`

#### Memory Endpoints
\`\`\`bash
# Store memory
POST /api/memory/store
{
  \"agentId\": \"nyx\",
  \"content\": \"Remember this\",
  \"metadata\": {}
}

# Search memories
GET /api/memory/search?q=query&agentId=nyx
\`\`\`

### WebSocket Events

#### Connection
\`\`\`javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-auth-token'
  }));
});
\`\`\`

#### Real-time Events
\`\`\`javascript
// Subscribe to agent events
ws.send(JSON.stringify({
  type: 'subscribe',
  agents: ['nyx', 'aria'],
  events: ['thought', 'emotion', 'action']
}));

// Receive events
ws.on('message', (data) => {
  const event = JSON.parse(data);
  switch (event.type) {
    case 'agent:thought':
      console.log(event.agentId, 'thinking:', event.thought);
      break;
    case 'agent:emotion':
      console.log(event.agentId, 'feeling:', event.emotion);
      break;
  }
});
\`\`\`

### Multi-Agent Chat

\`\`\`javascript
// Auto-route to best agent
ws.send(JSON.stringify({
  type: 'chat:route',
  message: 'I need help with coding',
  context: { skill: 'programming' }
}));

// Direct agent chat
ws.send(JSON.stringify({
  type: 'chat:message',
  agentId: 'nyx',
  message: 'Can you hack this?'
}));
\`\`\`"

create_doc "$DOCS_DIR/07-extensions/telegram/index.md" \
    "Telegram Extension" \
    "Telegram bot integration" \
"## Telegram Extension

Connect SYMindX agents to Telegram for chat interactions.

### Setup

1. **Create a Bot**
   - Talk to [@BotFather](https://t.me/botfather)
   - Create new bot: `/newbot`
   - Get your bot token

2. **Configure Extension**
   \`\`\`json
   {
     \"extensions\": {
       \"telegram\": {
         \"enabled\": true,
         \"token\": \"YOUR_BOT_TOKEN\",
         \"agents\": {
           \"nyx\": {
             \"username\": \"@nyx_bot\",
             \"commands\": [\"hack\", \"analyze\", \"secure\"]
           }
         }
       }
     }
   }
   \`\`\`

3. **Environment Variable**
   \`\`\`bash
   TELEGRAM_BOT_TOKEN=your-bot-token
   \`\`\`

### Features

#### Basic Commands
\`\`\`typescript
// Register commands
telegram.command('start', async (ctx) => {
  await ctx.reply('Welcome! I am ' + agent.name);
});

telegram.command('help', async (ctx) => {
  await ctx.reply(agent.getHelpText());
});
\`\`\`

#### Message Handling
\`\`\`typescript
// Text messages
telegram.on('text', async (ctx) => {
  const response = await agent.think(ctx.message.text);
  await ctx.reply(response);
});

// Media handling
telegram.on('photo', async (ctx) => {
  const photo = ctx.message.photo;
  const analysis = await agent.analyzeImage(photo);
  await ctx.reply(analysis);
});
\`\`\`

#### Inline Queries
\`\`\`typescript
// Inline bot mode
telegram.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query;
  const results = await agent.search(query);
  
  await ctx.answerInlineQuery(results.map(r => ({
    type: 'article',
    id: r.id,
    title: r.title,
    description: r.description,
    input_message_content: {
      message_text: r.content
    }
  })));
});
\`\`\`

### Advanced Features

#### Conversations
\`\`\`typescript
// Multi-step conversations
const conversation = new Conversation('setup');

conversation.step('name', async (ctx) => {
  await ctx.reply('What is your name?');
  return ctx.next();
});

conversation.step('preferences', async (ctx) => {
  const name = ctx.message.text;
  await agent.remember({ userName: name });
  await ctx.reply(\`Nice to meet you, \${name}!\`);
});
\`\`\`

#### Keyboards
\`\`\`typescript
// Inline keyboard
await ctx.reply('Choose an option:', {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🎯 Analyze', callback_data: 'analyze' },
        { text: '🔒 Secure', callback_data: 'secure' }
      ],
      [
        { text: '💡 Suggest', callback_data: 'suggest' }
      ]
    ]
  }
});

// Handle callbacks
telegram.on('callback_query', async (ctx) => {
  const action = ctx.callbackQuery.data;
  await agent.perform(action);
  await ctx.answerCbQuery('Processing...');
});
\`\`\`

### Group Chat Support

\`\`\`typescript
// Group commands
telegram.command('summon', async (ctx) => {
  if (ctx.chat.type === 'group') {
    await agent.joinConversation(ctx.chat.id);
    await ctx.reply('I have joined the conversation!');
  }
});

// Mention handling
telegram.on('mention', async (ctx) => {
  const mentioned = ctx.message.entities.find(
    e => e.type === 'mention'
  );
  if (mentioned.text === '@' + bot.username) {
    await agent.respond(ctx);
  }
});
\`\`\`"

# Portal documentation
create_doc "$DOCS_DIR/08-portals/openai/index.md" \
    "OpenAI Portal" \
    "OpenAI integration for SYMindX" \
"## OpenAI Portal

The OpenAI portal provides access to GPT models for agent intelligence.

### Configuration

\`\`\`json
{
  \"portals\": {
    \"openai\": {
      \"apiKey\": \"sk-...\",
      \"organization\": \"org-...\",
      \"defaultModel\": \"gpt-4-turbo-preview\",
      \"timeout\": 30000
    }
  }
}
\`\`\`

### Supported Models

| Model | Context | Cost | Use Case |
|-------|---------|------|----------|
| gpt-4-turbo | 128k | $$$ | Complex reasoning |
| gpt-4 | 8k | $$$ | High quality |
| gpt-3.5-turbo | 16k | $ | Fast responses |
| gpt-3.5-turbo-16k | 16k | $ | Long context |

### Usage

\`\`\`typescript
// Configure agent with OpenAI
const agent = new Agent({
  portal: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 2000
  }
});

// Dynamic model switching
await agent.setModel('gpt-3.5-turbo'); // Faster
await agent.setModel('gpt-4'); // Smarter
\`\`\`

### Advanced Features

#### Function Calling
\`\`\`typescript
// Define functions
const functions = [
  {
    name: 'search_web',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      }
    }
  }
];

// Use with agent
const response = await agent.think(message, {
  functions,
  function_call: 'auto'
});
\`\`\`

#### Embeddings
\`\`\`typescript
// Generate embeddings
const embedding = await portal.embed({
  input: 'Text to embed',
  model: 'text-embedding-3-small'
});

// Use for semantic search
const similar = await memory.findSimilar(embedding);
\`\`\`

#### Vision
\`\`\`typescript
// Analyze images with GPT-4V
const analysis = await agent.analyzeImage({
  image: imageUrl,
  prompt: 'What do you see in this image?'
});
\`\`\`

### Cost Optimization

\`\`\`typescript
// Token counting
const tokens = portal.countTokens(text);
console.log(\`Estimated cost: $\${tokens * 0.00002}\`);

// Caching responses
const cached = await portal.getCached(prompt);
if (!cached) {
  const response = await portal.complete(prompt);
  await portal.cache(prompt, response);
}
\`\`\`"

create_doc "$DOCS_DIR/08-portals/anthropic/index.md" \
    "Anthropic Portal" \
    "Claude integration for SYMindX" \
"## Anthropic Portal

The Anthropic portal provides access to Claude models for agent intelligence.

### Configuration

\`\`\`json
{
  \"portals\": {
    \"anthropic\": {
      \"apiKey\": \"sk-ant-...\",
      \"defaultModel\": \"claude-3-opus-20240229\",
      \"maxTokens\": 4096
    }
  }
}
\`\`\`

### Supported Models

| Model | Context | Strengths | Use Case |
|-------|---------|-----------|----------|
| Claude 3 Opus | 200k | Best quality | Complex tasks |
| Claude 3 Sonnet | 200k | Balanced | General use |
| Claude 3 Haiku | 200k | Fast | Quick responses |

### Usage

\`\`\`typescript
// Configure agent with Claude
const agent = new Agent({
  portal: {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    temperature: 0.7,
    systemPrompt: 'You are a helpful AI assistant.'
  }
});

// Use different models for different tasks
const complexResponse = await agent.think(query, {
  model: 'claude-3-opus-20240229'
});

const quickResponse = await agent.think(query, {
  model: 'claude-3-haiku-20240307'
});
\`\`\`

### Claude-Specific Features

#### Constitutional AI
\`\`\`typescript
// Add constitutional principles
agent.addPrinciple({
  principle: 'Be helpful and harmless',
  weight: 1.0
});

agent.addPrinciple({
  principle: 'Respect user privacy',
  weight: 0.9
});
\`\`\`

#### Long Context Handling
\`\`\`typescript
// Utilize Claude's 200k context
const longDocument = await loadDocument('thesis.pdf');
const summary = await agent.summarize(longDocument, {
  maxLength: 1000,
  style: 'academic'
});
\`\`\`

#### Multi-Modal (Claude 3)
\`\`\`typescript
// Analyze images with Claude 3
const analysis = await agent.analyze({
  images: ['diagram.png', 'chart.jpg'],
  prompt: 'Compare these visualizations'
});
\`\`\`

### Best Practices

#### Prompt Engineering
\`\`\`typescript
// Claude responds well to structured prompts
const prompt = \`
Task: Analyze the provided data
Context: Sales data from Q4 2023
Requirements:
1. Identify trends
2. Highlight anomalies
3. Provide recommendations

Data: \${data}
\`;
\`\`\`

#### Error Handling
\`\`\`typescript
try {
  const response = await portal.complete(prompt);
} catch (error) {
  if (error.code === 'rate_limit') {
    await delay(error.retry_after);
    return retry();
  }
}
\`\`\`"

# Create deployment documentation
create_doc "$DOCS_DIR/10-deployment/docker/index.md" \
    "Docker Deployment" \
    "Deploy SYMindX with Docker" \
"## Docker Deployment

Deploy SYMindX using Docker for consistent, isolated environments.

### Quick Start

\`\`\`bash
# Build image
docker build -t symindx:latest .

# Run container
docker run -d \\
  --name symindx \\
  -p 3001:3001 \\
  -v ./config:/app/config \\
  -v ./data:/app/data \\
  --env-file .env \\
  symindx:latest
\`\`\`

### Dockerfile

\`\`\`dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN bun run build

# Runtime
EXPOSE 3001
CMD [\"bun\", \"start\"]
\`\`\`

### Docker Compose

\`\`\`yaml
version: '3.8'

services:
  symindx:
    build: .
    image: symindx:latest
    container_name: symindx
    ports:
      - \"3001:3001\"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
      - agent_memory:/app/data/memory
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:3001/health\"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: symindx-db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: symindx
      POSTGRES_USER: symindx
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    ports:
      - \"5432:5432\"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: symindx-cache
    volumes:
      - redis_data:/data
    ports:
      - \"6379:6379\"
    restart: unless-stopped

volumes:
  agent_memory:
  postgres_data:
  redis_data:
\`\`\`

### Multi-Stage Build

\`\`\`dockerfile
# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime stage
FROM oven/bun:1-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
ENTRYPOINT [\"dumb-init\", \"--\"]
CMD [\"bun\", \"start\"]
\`\`\`

### Environment Configuration

\`\`\`bash
# .env file
NODE_ENV=production
LOG_LEVEL=info

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgres://symindx:password@postgres:5432/symindx

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
\`\`\`

### Production Optimization

#### Resource Limits
\`\`\`yaml
services:
  symindx:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
\`\`\`

#### Logging
\`\`\`yaml
services:
  symindx:
    logging:
      driver: json-file
      options:
        max-size: \"10m\"
        max-file: \"3\"
\`\`\`

#### Networks
\`\`\`yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

services:
  symindx:
    networks:
      - frontend
      - backend
  
  postgres:
    networks:
      - backend
\`\`\`"

# Create monitoring documentation
create_doc "$DOCS_DIR/11-monitoring/index.md" \
    "Monitoring" \
    "Monitoring and observability for SYMindX" \
"## Monitoring

Comprehensive monitoring ensures your SYMindX deployment runs smoothly.

### Monitoring Stack

\`\`\`
┌─────────────────┐
│   Application   │ → Metrics, Logs, Traces
├─────────────────┤
│   Prometheus    │ → Metrics collection
├─────────────────┤
│     Grafana     │ → Visualization
├─────────────────┤
│      Loki       │ → Log aggregation
├─────────────────┤
│     Jaeger      │ → Distributed tracing
└─────────────────┘
\`\`\`

### Metrics

#### Application Metrics
\`\`\`typescript
// Agent metrics
symindx_agent_active_total
symindx_agent_messages_total
symindx_agent_errors_total
symindx_agent_response_time_seconds

// Memory metrics
symindx_memory_operations_total
symindx_memory_size_bytes
symindx_memory_query_duration_seconds

// API metrics
symindx_http_requests_total
symindx_http_request_duration_seconds
symindx_websocket_connections_active
\`\`\`

#### System Metrics
\`\`\`typescript
// Resource usage
process_cpu_seconds_total
process_resident_memory_bytes
nodejs_heap_size_total_bytes
nodejs_heap_space_size_used_bytes

// Event loop
nodejs_eventloop_lag_seconds
nodejs_active_handles_total
nodejs_active_requests_total
\`\`\`

### Logging

#### Structured Logging
\`\`\`typescript
import { logger } from './utils/logger';

// Log with context
logger.info('Agent started', {
  agentId: agent.id,
  modules: agent.modules,
  portal: agent.portal
});

// Log errors with stack
logger.error('Agent error', {
  error: error.message,
  stack: error.stack,
  agentId: agent.id
});
\`\`\`

#### Log Levels
\`\`\`typescript
// Development
LOG_LEVEL=debug

// Production
LOG_LEVEL=info

// Troubleshooting
LOG_LEVEL=trace
\`\`\`

### Distributed Tracing

\`\`\`typescript
// Trace agent operations
const span = tracer.startSpan('agent.think');
span.setTag('agent.id', agent.id);
span.setTag('portal', agent.portal);

try {
  const response = await agent.think(message);
  span.setTag('response.length', response.length);
  span.finish();
  return response;
} catch (error) {
  span.setTag('error', true);
  span.log({ event: 'error', message: error.message });
  span.finish();
  throw error;
}
\`\`\`

### Alerting

#### Alert Rules
\`\`\`yaml
# Prometheus alert rules
groups:
  - name: symindx
    rules:
      - alert: HighErrorRate
        expr: rate(symindx_agent_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: High error rate detected
          
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1e+09
        for: 10m
        annotations:
          summary: Memory usage exceeds 1GB
          
      - alert: SlowResponses
        expr: histogram_quantile(0.95, symindx_agent_response_time_seconds) > 5
        for: 5m
        annotations:
          summary: 95th percentile response time > 5s
\`\`\`

### Dashboards

#### Grafana Dashboard
\`\`\`json
{
  \"dashboard\": {
    \"title\": \"SYMindX Monitoring\",
    \"panels\": [
      {
        \"title\": \"Active Agents\",
        \"targets\": [{
          \"expr\": \"symindx_agent_active_total\"
        }]
      },
      {
        \"title\": \"Message Rate\",
        \"targets\": [{
          \"expr\": \"rate(symindx_agent_messages_total[5m])\"
        }]
      },
      {
        \"title\": \"Response Time\",
        \"targets\": [{
          \"expr\": \"histogram_quantile(0.95, symindx_agent_response_time_seconds)\"
        }]
      }
    ]
  }
}
\`\`\`"

# Security documentation
create_doc "$DOCS_DIR/09-security/authentication/index.md" \
    "Authentication" \
    "Authentication mechanisms in SYMindX" \
"## Authentication

SYMindX supports multiple authentication methods to secure your deployment.

### Authentication Methods

#### API Key Authentication
\`\`\`typescript
// Configure API keys
const auth = {
  type: 'apikey',
  keys: {
    'client-1': 'sk-...',
    'client-2': 'sk-...'
  }
};

// Client usage
const response = await fetch('/api/agents', {
  headers: {
    'Authorization': 'Bearer sk-...'
  }
});
\`\`\`

#### JWT Authentication
\`\`\`typescript
// Generate JWT token
const token = jwt.sign({
  userId: user.id,
  role: user.role,
  permissions: user.permissions
}, JWT_SECRET, {
  expiresIn: '24h'
});

// Verify token
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
\`\`\`

#### OAuth2 Integration
\`\`\`typescript
// OAuth2 configuration
const oauth2 = {
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: 'http://localhost:3001/auth/google/callback'
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: 'http://localhost:3001/auth/github/callback'
    }
  }
};
\`\`\`

### Session Management

\`\`\`typescript
// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redis }),
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Session-based auth
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  if (user) {
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ success: true });
  }
});
\`\`\`

### Multi-Factor Authentication

\`\`\`typescript
// TOTP setup
const secret = authenticator.generateSecret();
const qrCode = await qrcode.toDataURL(
  authenticator.keyuri(user.email, 'SYMindX', secret)
);

// Verify TOTP
app.post('/verify-2fa', (req, res) => {
  const { token } = req.body;
  const verified = authenticator.verify({
    token,
    secret: user.totpSecret
  });
  
  if (verified) {
    req.session.twoFactorVerified = true;
    res.json({ success: true });
  }
});
\`\`\`

### Security Best Practices

1. **Token Rotation**
   \`\`\`typescript
   // Rotate tokens periodically
   setInterval(async () => {
     await rotateApiKeys();
   }, 30 * 24 * 60 * 60 * 1000); // 30 days
   \`\`\`

2. **Rate Limiting**
   \`\`\`typescript
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests
     message: 'Too many requests'
   });
   \`\`\`

3. **Secure Headers**
   \`\`\`typescript
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: [\"'self'\"],
         styleSrc: [\"'self'\", \"'unsafe-inline'\"]
       }
     }
   }));
   \`\`\`"

# Create troubleshooting documentation
create_doc "$DOCS_DIR/14-troubleshooting/common-issues/index.md" \
    "Common Issues" \
    "Solutions to common problems" \
"## Common Issues

### Agent Not Starting

#### Symptoms
- Agent shows as 'stopped' in UI
- No response to messages
- Errors in logs

#### Solutions

1. **Check Configuration**
   \`\`\`bash
   # Validate config file
   cat config/runtime.json | jq .
   
   # Check character file exists
   ls -la mind-agents/src/characters/
   \`\`\`

2. **Verify API Keys**
   \`\`\`bash
   # Test API keys
   curl https://api.openai.com/v1/models \\
     -H \"Authorization: Bearer $OPENAI_API_KEY\"
   \`\`\`

3. **Check Logs**
   \`\`\`bash
   # View recent logs
   tail -f logs/symindx.log
   
   # Search for errors
   grep ERROR logs/symindx.log
   \`\`\`

### Memory Provider Errors

#### SQLite: \"Database is locked\"
\`\`\`typescript
// Increase timeout
const memory = createMemoryProvider('sqlite', {
  timeout: 5000, // 5 seconds
  busyTimeout: 5000
});
\`\`\`

#### PostgreSQL: \"Connection refused\"
\`\`\`bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
echo $DATABASE_URL
\`\`\`

#### Supabase: \"Invalid API key\"
\`\`\`typescript
// Verify credentials
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
\`\`\`

### WebSocket Connection Issues

#### \"WebSocket is closed\"
\`\`\`javascript
// Implement reconnection
const ws = new ReconnectingWebSocket('ws://localhost:3001/ws', {
  maxReconnectionDelay: 10000,
  minReconnectionDelay: 1000,
  reconnectionDelayGrowFactor: 1.3
});
\`\`\`

#### CORS Errors
\`\`\`typescript
// Configure CORS properly
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
\`\`\`

### Performance Issues

#### Slow Response Times
1. **Check Portal Latency**
   \`\`\`typescript
   const start = Date.now();
   const response = await portal.complete(prompt);
   console.log(\`Portal latency: \${Date.now() - start}ms\`);
   \`\`\`

2. **Optimize Prompts**
   \`\`\`typescript
   // Use smaller models for simple tasks
   const response = await agent.think(message, {
     model: 'gpt-3.5-turbo' // Faster than GPT-4
   });
   \`\`\`

3. **Enable Caching**
   \`\`\`typescript
   const cache = new NodeCache({ stdTTL: 600 });
   
   // Cache frequent queries
   const cached = cache.get(query);
   if (cached) return cached;
   \`\`\`

#### High Memory Usage
\`\`\`bash
# Monitor memory
watch -n 1 'ps aux | grep node'

# Increase Node.js memory limit
NODE_OPTIONS=\"--max-old-space-size=4096\" bun start

# Enable memory profiling
node --inspect mind-agents/dist/index.js
\`\`\`

### Extension Issues

#### Telegram: \"Webhook Error\"
\`\`\`bash
# Test webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Set webhook manually
curl https://api.telegram.org/bot<TOKEN>/setWebhook \\
  -F \"url=https://your-domain.com/telegram/webhook\"
\`\`\`

#### API Server: \"Port Already in Use\"
\`\`\`bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Use different port
API_PORT=3002 bun start
\`\`\`"

create_doc "$DOCS_DIR/14-troubleshooting/faq/index.md" \
    "FAQ" \
    "Frequently asked questions" \
"## Frequently Asked Questions

### General

**Q: What is SYMindX?**
A: SYMindX is a modular AI agent runtime that allows you to create, deploy, and manage AI agents with different personalities, capabilities, and integrations.

**Q: Which AI providers are supported?**
A: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude 3), Google (Gemini), Groq, xAI (Grok), and Ollama for local models.

**Q: Can I run multiple agents?**
A: Yes! SYMindX is designed for multi-agent systems. Each agent can have different personalities, modules, and capabilities.

**Q: Is it open source?**
A: Yes, SYMindX is open source under the MIT license.

### Setup

**Q: What are the system requirements?**
A: Node.js 18+ or Bun, 4GB RAM minimum (8GB recommended), and 500MB disk space.

**Q: Do I need all the API keys?**
A: No, you only need at least one AI provider API key. The system will use whichever providers you configure.

**Q: Can I use local models?**
A: Yes, through Ollama integration you can run models locally without API keys.

**Q: How do I update SYMindX?**
A: Pull the latest changes from git and run \`bun install\` to update dependencies.

### Development

**Q: How do I create a custom module?**
A: Implement the module interface and register it with the registry. See [Plugin Development](/docs/21-development/plugin-development).

**Q: Can I add new AI providers?**
A: Yes, create a new portal implementation. See [Custom Portals](/docs/08-portals/custom).

**Q: How do I debug agents?**
A: Enable debug logging with \`LOG_LEVEL=debug\` and use the built-in monitoring tools.

**Q: Is TypeScript required?**
A: While SYMindX is written in TypeScript, you can use JavaScript if preferred.

### Deployment

**Q: Can I deploy to the cloud?**
A: Yes, SYMindX can be deployed to AWS, GCP, Azure, or any platform that supports Docker.

**Q: Is it production-ready?**
A: Yes, with proper configuration for security, monitoring, and scaling.

**Q: How do I scale horizontally?**
A: Run multiple instances behind a load balancer. Agents can be distributed across instances.

**Q: What about data persistence?**
A: Use PostgreSQL, Supabase, or Neon for production data persistence.

### Troubleshooting

**Q: Agent isn't responding?**
A: Check logs, verify API keys, ensure the agent is started, and check the portal connection.

**Q: WebSocket keeps disconnecting?**
A: Implement reconnection logic and check for proxy/firewall issues.

**Q: High latency responses?**
A: Try a faster model (GPT-3.5 vs GPT-4), enable caching, or use a closer API region.

**Q: Memory errors?**
A: Increase Node.js memory limit or optimize your memory queries.

### Security

**Q: How are API keys protected?**
A: Use environment variables, never commit to git, and rotate regularly.

**Q: Is data encrypted?**
A: Yes, data can be encrypted at rest and all API communication uses TLS.

**Q: Can I add authentication?**
A: Yes, see [Authentication](/docs/09-security/authentication) for options.

**Q: Is it GDPR compliant?**
A: SYMindX provides tools for compliance, but implementation depends on your usage."

# Final summary
echo "✅ Documentation creation complete!"
echo ""
echo "Created documentation for:"
echo "- Core concepts (runtime, registry, event bus, etc.)"
echo "- Agent system (configuration, lifecycle, communication)"
echo "- Modules (memory, emotion, cognition)"
echo "- Extensions (API, Telegram, etc.)"
echo "- Portals (OpenAI, Anthropic)"
echo "- Deployment (Docker, monitoring)"
echo "- Security (authentication)"
echo "- Troubleshooting (common issues, FAQ)"
echo ""
echo "Total documentation files created!"

chmod +x "$0"