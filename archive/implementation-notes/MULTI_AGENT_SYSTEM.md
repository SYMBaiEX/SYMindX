# SYMindX Multi-Agent System

This document describes the multi-agent system for rapid development and testing of the new conversation-based chat system.

## Overview

The multi-agent system allows you to spawn and manage multiple AI agents simultaneously, each with unique personalities, specialties, and conversation styles. This enables comprehensive testing of multi-agent conversations, performance monitoring, and UI interactions.

## Available Agents

### 1. NyX (Chaotic-Empath Hacker)
- **Port**: 3001
- **Specialty**: Technical + Emotional Intelligence
- **Personality**: Chaotic, empathetic, curious, rebellious
- **AI Model**: Groq Llama 3.3 70B (primary), OpenAI GPT-4o-mini (backup)
- **Use Case**: Complex technical challenges with emotional awareness

### 2. ARIA (Analytical Reasoning Intelligence Assistant)
- **Port**: 3002
- **Specialty**: Logical Analysis + Problem Solving
- **Personality**: Analytical, methodical, precise, objective
- **AI Model**: OpenAI GPT-4o (high-precision reasoning)
- **Use Case**: Systematic analysis, research, evidence-based conclusions

### 3. ZARA (Zealous Artistic and Recreational Assistant)
- **Port**: 3003
- **Specialty**: Creative Expression + Storytelling
- **Personality**: Creative, enthusiastic, expressive, spontaneous
- **AI Model**: Anthropic Claude 3.5 Sonnet (primary), OpenAI GPT-4o (backup)
- **Use Case**: Creative projects, storytelling, artistic collaboration

### 4. MARCUS (Methodical Assistance and Resource Coordination)
- **Port**: 3004
- **Specialty**: Support + Organization
- **Personality**: Reliable, helpful, patient, practical
- **AI Model**: OpenAI GPT-4o-mini (cost-effective support), Groq (backup)
- **Use Case**: Task management, organization, user support

### 5. PHOENIX (Paradigm-Hacking Operations and eXperimental Intelligence)
- **Port**: 3005
- **Specialty**: Cybersecurity + Innovation
- **Personality**: Witty, technical, skeptical, unconventional
- **AI Model**: Groq Llama 3.3 70B (primary), XAI Grok-2 (experimental)
- **Use Case**: Security analysis, technical innovation, system optimization

### 6. SAGE (Strategic Advisory and Guidance Engine)
- **Port**: 3006
- **Specialty**: Wisdom + Strategic Thinking
- **Personality**: Wise, thoughtful, ethical, patient
- **AI Model**: Anthropic Claude 3.5 Sonnet (primary), OpenAI GPT-4o (backup)
- **Use Case**: Strategic guidance, ethical consultation, long-term planning

## Quick Start

### 1. Build the System
```bash
cd mind-agents
npm run build
```

### 2. List Available Agents
```bash
npm run agents:list
# or
node multi-agent-manager.js list
```

### 3. Start Individual Agents
```bash
npm run agents:start nyx
npm run agents:start aria
npm run agents:start zara
```

### 4. Check Agent Status
```bash
npm run agents:status
```

### 5. Test Predefined Scenarios
```bash
# Start a balanced test scenario
npm run agents:scenario balanced

# Start all agents for comprehensive testing
npm run agents:scenario full

# Start minimal setup
npm run agents:scenario minimal
```

## Test Scenarios

### Default Scenario
- **Agents**: NyX, ARIA, ZARA
- **Purpose**: Balanced testing with technical, analytical, and creative capabilities
- **Use Case**: General conversation testing

### Minimal Scenario
- **Agents**: NyX, MARCUS
- **Purpose**: Basic functionality testing with support
- **Use Case**: Resource-constrained environments

### Full Scenario
- **Agents**: All 6 agents
- **Purpose**: Comprehensive multi-agent testing
- **Use Case**: Performance stress testing, full personality range

### Creative Scenario
- **Agents**: ZARA, SAGE, NyX
- **Purpose**: Creative collaboration and wisdom
- **Use Case**: Content creation, artistic projects

### Technical Scenario
- **Agents**: ARIA, PHOENIX, MARCUS
- **Purpose**: Technical analysis and support
- **Use Case**: Development and security tasks

### Balanced Scenario
- **Agents**: NyX, ARIA, MARCUS, SAGE
- **Purpose**: Well-rounded capabilities without overwhelming resources
- **Use Case**: Production-like testing

## Management Commands

### Individual Agent Control
```bash
# Start specific agent
node multi-agent-manager.js start <agent-id>

# Stop specific agent
node multi-agent-manager.js stop <agent-id>

# Examples
node multi-agent-manager.js start nyx
node multi-agent-manager.js start aria
node multi-agent-manager.js stop phoenix
```

### Bulk Operations
```bash
# Stop all running agents
npm run agents:stop-all

# Start predefined scenarios
npm run agents:scenario <scenario-name>

# Test chat capabilities
npm run agents:test-chat
```

### Monitoring
```bash
# Check status of all agents
npm run agents:status

# Get detailed help
node multi-agent-manager.js help
```

## Testing Multi-Agent Conversations

### 1. Start Multiple Agents
```bash
npm run agents:scenario default
```

### 2. Open Browser Tabs
Open separate browser tabs/windows for each agent:
- NyX: http://localhost:3001
- ARIA: http://localhost:3002
- ZARA: http://localhost:3003

### 3. Test Scenarios

#### Personality Differences
- Ask the same question to different agents
- Observe response styles and approaches
- Test emotional vs analytical vs creative responses

#### Multi-Agent Collaboration
- Start a conversation thread between agents
- Test handoffs and collaborative problem-solving
- Monitor WebSocket handling for multiple connections

#### Specialty Testing
- Give technical problems to ARIA and PHOENIX
- Request creative content from ZARA
- Ask for support and organization help from MARCUS
- Seek strategic advice from SAGE

### 4. Performance Monitoring
- Monitor resource usage with multiple agents
- Test WebSocket connection stability
- Verify memory isolation between agents
- Check API response times under load

## Configuration

### Port Allocation
Each agent runs on a dedicated port to avoid conflicts:
- NyX: 3001
- ARIA: 3002
- ZARA: 3003
- MARCUS: 3004
- PHOENIX: 3005
- SAGE: 3006

### Memory Isolation
Each agent uses its own SQLite database:
- NyX: `./data/memories.db`
- ARIA: `./data/aria_memories.db`
- ZARA: `./data/zara_memories.db`
- MARCUS: `./data/marcus_memories.db`
- PHOENIX: `./data/phoenix_memories.db`
- SAGE: `./data/sage_memories.db`

### AI Model Distribution
Different agents use different AI models to test:
- Model switching capabilities
- Cost optimization strategies
- Performance characteristics
- Specialty-model matching

## Troubleshooting

### Port Conflicts
If you get port conflicts:
1. Check running processes: `lsof -i :3001-3006`
2. Stop all agents: `npm run agents:stop-all`
3. Wait a few seconds and retry

### Memory Issues
If running many agents simultaneously:
1. Monitor system resources
2. Use minimal or balanced scenarios instead of full
3. Stop unused agents: `npm run agents:stop <agent-id>`

### Agent Startup Failures
Check logs for specific errors:
1. Ensure all environment variables are set
2. Verify API keys are valid
3. Check database permissions in `./data/` directory
4. Confirm TypeScript compilation: `npm run build`

### WebSocket Issues
If chat UI doesn't connect:
1. Verify agent is running: `npm run agents:status`
2. Check browser console for WebSocket errors
3. Ensure correct port in URL
4. Try refreshing the browser tab

## Advanced Usage

### Custom Agent Creation
To create new agents:
1. Copy an existing character config (e.g., `aria.json`)
2. Modify personality traits, ports, and models
3. Update the multi-agent-manager.js `availableAgents` object
4. Test with `npm run agents:start <new-agent-id>`

### Production Deployment
For production multi-agent setups:
1. Use process managers (PM2, systemd)
2. Configure load balancing
3. Set up monitoring and alerting
4. Implement agent health checks

### Development Workflow
1. Start development scenario: `npm run agents:scenario balanced`
2. Make code changes
3. Rebuild: `npm run build`
4. Test specific agents affected by changes
5. Use `npm run agents:test-chat` to verify functionality

## Architecture Notes

### Single-Agent Loading
The system uses the `FORCE_SINGLE_AGENT` environment variable to load only specific agent configurations, enabling true isolation between agent processes.

### Process Management
Each agent runs in its own Node.js process with:
- Isolated memory space
- Dedicated port allocation
- Independent AI model connections
- Separate database instances

### Inter-Agent Communication
While agents run independently, they can potentially communicate through:
- Shared database systems (if configured)
- WebSocket bridges (future enhancement)
- External message queues (future enhancement)

This multi-agent system provides a robust foundation for testing and developing sophisticated AI agent interactions while maintaining clear separation of concerns and scalable architecture.