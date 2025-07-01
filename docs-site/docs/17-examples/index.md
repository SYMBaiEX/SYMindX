---
sidebar_position: 17
sidebar_label: "Examples"
title: "Examples"
description: "Code examples and templates"
---

# Examples

Code examples and templates

## Overview

Learn by example with real-world SYMindX implementations. This section provides complete, working examples ranging from simple agent setups to complex multi-agent systems. Each example includes full source code, configuration files, and deployment instructions.

## Quick Start Examples

### Basic Agent

A minimal agent setup to get you started:

```typescript
// basic-agent.ts
import { SYMindX } from '@symindx/core';

async function main() {
  // Initialize runtime
  const runtime = new SYMindX.Runtime({
    agents: [{
      id: 'assistant',
      name: 'Basic Assistant',
      personality: {
        traits: ['helpful', 'concise'],
        background: 'A simple AI assistant'
      }
    }]
  });

  // Get agent instance
  const agent = runtime.getAgent('assistant');
  
  // Simple interaction
  const response = await agent.think("What is the weather like?");
  console.log(response);
  
  // Cleanup
  await runtime.shutdown();
}

main().catch(console.error);
```

### Memory-Enabled Agent

Agent with persistent memory:

```typescript
// memory-agent.ts
import { SYMindX } from '@symindx/core';

const agent = await SYMindX.createAgent({
  id: 'memory-bot',
  name: 'Memory Bot',
  modules: {
    memory: {
      provider: 'sqlite',
      config: { dbPath: './memories.db' }
    }
  }
});

// Remember information
await agent.remember("User's favorite color is blue");
await agent.remember("User works as a software engineer");

// Recall information
const response = await agent.think("What do you know about me?");
console.log(response); // Will mention favorite color and profession
```

### Emotional Agent

Agent with emotion processing:

```typescript
// emotional-agent.ts
const emotionalAgent = await SYMindX.createAgent({
  id: 'empathy-bot',
  name: 'Empathy Bot',
  personality: {
    traits: ['empathetic', 'caring', 'supportive']
  },
  modules: {
    emotion: {
      provider: 'rune_emotion_stack',
      config: {
        baselineHappiness: 70,
        emotionalVolatility: 0.3
      }
    }
  }
});

// Emotional responses
emotionalAgent.on('emotion-change', (state) => {
  console.log(`Emotion state:`, state);
});

await emotionalAgent.perceive({
  event: 'user-message',
  data: "I'm feeling really sad today",
  emotional_context: 'negative'
});

const response = await emotionalAgent.respond();
// Response will be empathetic and supportive
```

## Real-World Applications

### Customer Support Bot

Complete customer support implementation:

```typescript
// support-bot/index.ts
import { SYMindX } from '@symindx/core';
import { SlackExtension } from '@symindx/slack';
import { TicketSystem } from './ticket-system';

export class SupportBot {
  private runtime: SYMindX.Runtime;
  private ticketSystem: TicketSystem;
  
  async initialize() {
    this.runtime = new SYMindX.Runtime({
      config: './config/support-bot.json'
    });
    
    // Configure support agent
    const agent = await this.runtime.createAgent({
      id: 'support-agent',
      name: 'Support Bot',
      personality: {
        traits: ['helpful', 'patient', 'professional'],
        background: 'Experienced customer support specialist'
      },
      modules: {
        memory: 'sqlite',
        cognition: {
          provider: 'htn_planner',
          config: {
            goals: [
              'resolve_customer_issues',
              'provide_accurate_information',
              'escalate_when_necessary'
            ]
          }
        }
      }
    });
    
    // Add Slack integration
    agent.use(new SlackExtension({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      channels: ['#support']
    }));
    
    // Connect to ticket system
    this.ticketSystem = new TicketSystem();
    agent.registerTool('create_ticket', this.ticketSystem.createTicket);
    agent.registerTool('update_ticket', this.ticketSystem.updateTicket);
    
    return agent;
  }
}

// config/support-bot.json
{
  "prompts": {
    "system": "You are a helpful customer support agent. Always be professional and empathetic. If you cannot resolve an issue, create a support ticket for human review.",
    "tools": {
      "create_ticket": "Use this when the issue requires human intervention",
      "update_ticket": "Use this to add information to existing tickets"
    }
  },
  "knowledge_base": "./data/support-docs",
  "escalation_keywords": ["refund", "complaint", "urgent", "broken"]
}
```

### Personal Assistant

Multi-functional personal assistant:

```typescript
// personal-assistant/agent.ts
export class PersonalAssistant {
  private agent: Agent;
  private calendar: CalendarIntegration;
  private email: EmailIntegration;
  private tasks: TaskManager;
  
  async setup() {
    this.agent = await SYMindX.createAgent({
      id: 'personal-assistant',
      name: 'PA',
      personality: {
        traits: ['organized', 'proactive', 'discrete'],
        background: 'Executive personal assistant with 10 years experience'
      },
      modules: {
        memory: {
          provider: 'supabase',
          config: {
            url: process.env.SUPABASE_URL,
            key: process.env.SUPABASE_KEY
          }
        },
        cognition: 'htn_planner'
      }
    });
    
    // Integrate tools
    this.calendar = new CalendarIntegration('google');
    this.email = new EmailIntegration('gmail');
    this.tasks = new TaskManager();
    
    // Register capabilities
    this.agent.registerTools({
      schedule_meeting: this.calendar.scheduleMeeting,
      check_calendar: this.calendar.getEvents,
      send_email: this.email.send,
      check_email: this.email.getUnread,
      add_task: this.tasks.add,
      get_tasks: this.tasks.list
    });
    
    // Proactive behaviors
    this.agent.on('tick', async () => {
      await this.checkDailyBriefing();
      await this.reviewUpcomingEvents();
      await this.processEmailQueue();
    });
  }
  
  private async checkDailyBriefing() {
    const hour = new Date().getHours();
    if (hour === 8 && !this.agent.memory.get('briefing_sent_today')) {
      const briefing = await this.generateDailyBriefing();
      await this.agent.notify(briefing);
      await this.agent.memory.set('briefing_sent_today', true);
    }
  }
}
```

### Game NPC System

Interactive game NPCs with personality:

```typescript
// game-npc/npc-system.ts
export class NPCSystem {
  private npcs: Map<string, Agent> = new Map();
  
  async createNPC(config: NPCConfig) {
    const npc = await SYMindX.createAgent({
      id: config.id,
      name: config.name,
      personality: config.personality,
      modules: {
        memory: 'sqlite',
        emotion: 'rune_emotion_stack',
        cognition: 'reactive'
      }
    });
    
    // Add game-specific behaviors
    npc.registerBehavior('trade', this.handleTrade);
    npc.registerBehavior('quest', this.handleQuest);
    npc.registerBehavior('combat', this.handleCombat);
    
    // Location awareness
    npc.state.location = config.spawnLocation;
    npc.state.inventory = config.initialInventory;
    
    this.npcs.set(config.id, npc);
    return npc;
  }
  
  async interact(npcId: string, player: Player, action: string) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;
    
    // Update NPC's memory about player
    await npc.remember(`Player ${player.name} ${action} at ${new Date()}`);
    
    // Generate contextual response
    const context = {
      player,
      action,
      location: npc.state.location,
      relationship: await npc.getRelationship(player.id)
    };
    
    return npc.respondTo(context);
  }
}

// Example NPC configuration
const merchantNPC = {
  id: 'merchant_01',
  name: 'Gareth the Trader',
  personality: {
    traits: ['shrewd', 'friendly', 'gossiper'],
    background: 'Traveled merchant with connections across the realm'
  },
  spawnLocation: 'market_square',
  initialInventory: [
    { item: 'health_potion', quantity: 10, price: 50 },
    { item: 'mana_potion', quantity: 5, price: 100 }
  ],
  dialogue: {
    greeting: "Well met, traveler! Looking for something special?",
    farewell: "Safe travels! Come back when you need supplies.",
    no_money: "Ah, seems you're a bit short on coin, friend."
  }
};
```

## Multi-Agent Systems

### Collaborative Research Team

Multiple agents working together:

```typescript
// research-team/team.ts
export class ResearchTeam {
  private researcher: Agent;
  private analyst: Agent;
  private writer: Agent;
  private coordinator: Agent;
  
  async initialize() {
    // Create specialized agents
    this.researcher = await this.createResearcher();
    this.analyst = await this.createAnalyst();
    this.writer = await this.createWriter();
    this.coordinator = await this.createCoordinator();
    
    // Set up inter-agent communication
    const eventBus = new EventBus();
    [this.researcher, this.analyst, this.writer, this.coordinator]
      .forEach(agent => agent.connectTo(eventBus));
  }
  
  async research(topic: string): Promise<ResearchReport> {
    // Coordinator delegates tasks
    await this.coordinator.think(`Plan research for: ${topic}`);
    
    // Parallel research phase
    const [sources, data] = await Promise.all([
      this.researcher.findSources(topic),
      this.analyst.gatherData(topic)
    ]);
    
    // Analysis phase
    const analysis = await this.analyst.analyzeData(data, sources);
    
    // Writing phase
    const report = await this.writer.writeReport({
      topic,
      sources,
      data,
      analysis
    });
    
    // Review and finalize
    return this.coordinator.review(report);
  }
  
  private async createResearcher(): Promise<Agent> {
    return SYMindX.createAgent({
      id: 'researcher',
      name: 'Research Specialist',
      personality: {
        traits: ['thorough', 'curious', 'methodical'],
        background: 'PhD in Information Science'
      },
      tools: ['web_search', 'academic_search', 'fact_check']
    });
  }
}
```

### Agent Democracy

Agents voting on decisions:

```typescript
// democracy/voting-system.ts
export class AgentDemocracy {
  private citizens: Agent[] = [];
  private proposals: Map<string, Proposal> = new Map();
  
  async createCitizen(personality: Personality): Promise<Agent> {
    const citizen = await SYMindX.createAgent({
      id: `citizen_${this.citizens.length}`,
      personality,
      modules: {
        cognition: 'htn_planner',
        memory: 'sqlite'
      }
    });
    
    // Add voting behavior
    citizen.registerBehavior('vote', async (proposal: Proposal) => {
      // Analyze proposal based on personality and memories
      const analysis = await citizen.think(
        `Analyze this proposal: ${proposal.description}. 
         Consider: ${proposal.impacts.join(', ')}`
      );
      
      // Make decision
      const decision = await citizen.decide({
        options: ['support', 'oppose', 'abstain'],
        context: analysis
      });
      
      return {
        vote: decision,
        reasoning: analysis
      };
    });
    
    this.citizens.push(citizen);
    return citizen;
  }
  
  async proposeAndVote(proposal: Proposal): Promise<VotingResult> {
    // Parallel voting
    const votes = await Promise.all(
      this.citizens.map(citizen => citizen.vote(proposal))
    );
    
    // Tally results
    const results = {
      proposal: proposal.id,
      total: votes.length,
      support: votes.filter(v => v.vote === 'support').length,
      oppose: votes.filter(v => v.vote === 'oppose').length,
      abstain: votes.filter(v => v.vote === 'abstain').length,
      passed: false
    };
    
    results.passed = results.support > results.oppose;
    
    // Inform all citizens of results
    await Promise.all(
      this.citizens.map(citizen => 
        citizen.remember(`Proposal ${proposal.id} ${results.passed ? 'passed' : 'failed'}`)
      )
    );
    
    return results;
  }
}
```

## Extension Examples

### Custom Portal

Create your own AI provider:

```typescript
// custom-portal/local-llm.ts
export class LocalLLMPortal implements Portal {
  private model: any; // Your local model
  
  async initialize(config: PortalConfig) {
    // Load local model
    this.model = await loadModel(config.modelPath);
  }
  
  async generateText(
    prompt: string, 
    options?: GenerateOptions
  ): Promise<string> {
    const result = await this.model.generate({
      prompt,
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7
    });
    
    return result.text;
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    return this.model.embed(text);
  }
}

// Register portal
SYMindX.registerPortal('local-llm', LocalLLMPortal);
```

## Templates

### Project Starter

Complete project structure:

```bash
symindx-project/
├── src/
│   ├── agents/
│   │   └── main-agent.ts
│   ├── extensions/
│   │   └── custom-extension.ts
│   ├── config/
│   │   └── runtime.json
│   └── index.ts
├── data/
│   └── memories.db
├── tests/
│   └── agent.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Next Steps

- Browse [Basic Examples](./basic-examples) for simple implementations
- Explore [Advanced Examples](./advanced-examples) for complex scenarios
- Check out [Templates](./templates) for project starters
- View [Use Cases](./use-case-examples) for industry-specific examples
