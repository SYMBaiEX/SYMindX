#!/usr/bin/env node

/**
 * Multi-Agent Manager for SYMindX
 * 
 * This script allows you to spawn, manage, and coordinate multiple agents
 * for testing the new conversation-based chat system.
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MultiAgentManager {
  constructor() {
    this.agents = new Map();
    this.basePort = 3001;
    this.isRunning = false;
    this.charactersDir = path.join(__dirname, 'src', 'characters');
    
    // Define available agent configurations
    this.availableAgents = {
      nyx: {
        name: 'NyX',
        description: 'Chaotic-empath hacker with deep technical knowledge',
        specialty: 'Technical + Emotional Intelligence',
        port: 3001
      },
      aria: {
        name: 'ARIA',
        description: 'Analytical Reasoning Intelligence Assistant',
        specialty: 'Logical Analysis + Problem Solving',
        port: 3002
      },
      zara: {
        name: 'ZARA', 
        description: 'Zealous Artistic and Recreational Assistant',
        specialty: 'Creative Expression + Storytelling',
        port: 3003
      },
      marcus: {
        name: 'MARCUS',
        description: 'Methodical Assistance and Resource Coordination',
        specialty: 'Support + Organization',
        port: 3004
      },
      phoenix: {
        name: 'PHOENIX',
        description: 'Paradigm-Hacking Operations and eXperimental Intelligence',
        specialty: 'Cybersecurity + Innovation',
        port: 3005
      },
      sage: {
        name: 'SAGE',
        description: 'Strategic Advisory and Guidance Engine',
        specialty: 'Wisdom + Strategic Thinking',
        port: 3006
      }
    };
  }

  async checkAgentConfig(agentId) {
    const configPath = path.join(this.charactersDir, `${agentId}.json`);
    try {
      await fs.access(configPath);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      return config;
    } catch (error) {
      throw new Error(`Agent configuration not found: ${configPath}`);
    }
  }

  async listAvailableAgents() {
    console.log('\n🤖 Available Agents:');
    console.log('==================');
    
    for (const [id, info] of Object.entries(this.availableAgents)) {
      const status = this.agents.has(id) ? '🟢 RUNNING' : '⚪ STOPPED';
      console.log(`${status} ${info.name} (${id})`);
      console.log(`    ${info.description}`);
      console.log(`    Specialty: ${info.specialty}`);
      console.log(`    Port: ${info.port}`);
      console.log('');
    }
  }

  async spawnAgent(agentId, options = {}) {
    if (this.agents.has(agentId)) {
      console.log(`⚠️  Agent ${agentId} is already running`);
      return;
    }

    if (!this.availableAgents[agentId]) {
      console.log(`❌ Unknown agent: ${agentId}`);
      return;
    }

    try {
      // Check if agent configuration exists
      const config = await this.checkAgentConfig(agentId);
      const agentInfo = this.availableAgents[agentId];

      console.log(`🚀 Starting agent: ${agentInfo.name} (${agentId})`);
      console.log(`   Port: ${agentInfo.port}`);
      console.log(`   Specialty: ${agentInfo.specialty}`);

      // Create a custom environment for this agent
      const env = {
        ...process.env,
        AGENT_ID: agentId,
        AGENT_CONFIG_PATH: path.join(this.charactersDir, `${agentId}.json`),
        FORCE_SINGLE_AGENT: agentId // Force load only this agent
      };

      // Spawn the agent process with isolated character loading
      const agentProcess = spawn('node', ['dist/index.js'], {
        cwd: __dirname,
        env: env,
        stdio: options.verbose ? 'inherit' : 'pipe'
      });

      // Store agent process info
      this.agents.set(agentId, {
        process: agentProcess,
        info: agentInfo,
        startTime: new Date(),
        pid: agentProcess.pid
      });

      // Handle process events
      agentProcess.on('error', (error) => {
        console.error(`❌ Error starting agent ${agentId}:`, error.message);
        this.agents.delete(agentId);
      });

      agentProcess.on('exit', (code, signal) => {
        console.log(`🛑 Agent ${agentId} exited with code ${code} (signal: ${signal})`);
        this.agents.delete(agentId);
      });

      // Capture output if not verbose
      if (!options.verbose) {
        agentProcess.stdout.on('data', (data) => {
          const output = data.toString();
          // Only show important messages
          if (output.includes('✅') || output.includes('❌') || output.includes('🚀')) {
            console.log(`[${agentId}] ${output.trim()}`);
          }
        });

        agentProcess.stderr.on('data', (data) => {
          console.error(`[${agentId}] ${data.toString().trim()}`);
        });
      }

      // Wait a moment for startup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Agent ${agentInfo.name} started successfully`);
      console.log(`   WebUI: http://localhost:${agentInfo.port}`);
      console.log(`   API: http://localhost:${agentInfo.port}/api`);

    } catch (error) {
      console.error(`❌ Failed to start agent ${agentId}:`, error.message);
    }
  }

  async stopAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.log(`⚠️  Agent ${agentId} is not running`);
      return;
    }

    console.log(`🛑 Stopping agent: ${agent.info.name} (${agentId})`);
    
    try {
      agent.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log(`⚠️  Force killing agent ${agentId}`);
          agent.process.kill('SIGKILL');
          resolve();
        }, 5000);

        agent.process.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.agents.delete(agentId);
      console.log(`✅ Agent ${agentId} stopped`);
    } catch (error) {
      console.error(`❌ Error stopping agent ${agentId}:`, error.message);
    }
  }

  async stopAllAgents() {
    console.log('🛑 Stopping all running agents...');
    
    const stopPromises = Array.from(this.agents.keys()).map(agentId => 
      this.stopAgent(agentId)
    );
    
    await Promise.all(stopPromises);
    console.log('✅ All agents stopped');
  }

  async getAgentStatus() {
    console.log('\n📊 Agent Status:');
    console.log('================');
    
    if (this.agents.size === 0) {
      console.log('No agents currently running');
      return;
    }

    for (const [agentId, agent] of this.agents) {
      const uptime = Math.floor((Date.now() - agent.startTime.getTime()) / 1000);
      console.log(`🟢 ${agent.info.name} (${agentId})`);
      console.log(`   PID: ${agent.pid}`);
      console.log(`   Port: ${agent.info.port}`);
      console.log(`   Uptime: ${uptime}s`);
      console.log(`   WebUI: http://localhost:${agent.info.port}`);
      console.log('');
    }
  }

  async startTestScenario(scenario = 'default') {
    const scenarios = {
      default: ['nyx', 'aria', 'zara'],
      minimal: ['nyx', 'marcus'],
      full: ['nyx', 'aria', 'zara', 'marcus', 'phoenix', 'sage'],
      creative: ['zara', 'sage', 'nyx'],
      technical: ['aria', 'phoenix', 'marcus'],
      balanced: ['nyx', 'aria', 'marcus', 'sage']
    };

    const agentsToStart = scenarios[scenario];
    if (!agentsToStart) {
      console.log(`❌ Unknown scenario: ${scenario}`);
      console.log(`Available scenarios: ${Object.keys(scenarios).join(', ')}`);
      return;
    }

    console.log(`🎬 Starting test scenario: ${scenario}`);
    console.log(`   Agents: ${agentsToStart.join(', ')}`);

    for (const agentId of agentsToStart) {
      await this.spawnAgent(agentId);
      // Stagger startup to avoid resource conflicts
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`✅ Test scenario '${scenario}' started successfully`);
    await this.getAgentStatus();
  }

  async testMultiAgentChat() {
    console.log('💬 Testing multi-agent chat capabilities...');
    
    // Check if we have multiple agents running
    if (this.agents.size < 2) {
      console.log('⚠️  Need at least 2 agents running for chat test');
      return;
    }

    console.log(`✅ ${this.agents.size} agents available for chat testing`);
    console.log('\n📝 Test Instructions:');
    console.log('1. Open multiple browser tabs/windows');
    console.log('2. Connect to different agent WebUIs:');
    
    for (const [agentId, agent] of this.agents) {
      console.log(`   - ${agent.info.name}: http://localhost:${agent.info.port}`);
    }
    
    console.log('3. Start conversations between agents');
    console.log('4. Test personality differences and specialties');
    console.log('5. Monitor for proper WebSocket handling');
  }

  displayHelp() {
    console.log(`
🤖 SYMindX Multi-Agent Manager
=============================

Usage: node multi-agent-manager.js <command> [options]

Commands:
  list                    - List all available agents
  status                  - Show running agent status  
  start <agent-id>        - Start a specific agent
  stop <agent-id>         - Stop a specific agent
  stop-all                - Stop all running agents
  scenario <name>         - Start a predefined test scenario
  test-chat               - Test multi-agent chat capabilities
  help                    - Show this help message

Available Scenarios:
  default                 - Start NyX, ARIA, and ZARA
  minimal                 - Start NyX and MARCUS
  full                    - Start all 6 agents
  creative                - Start ZARA, SAGE, and NyX
  technical               - Start ARIA, PHOENIX, and MARCUS
  balanced                - Start NyX, ARIA, MARCUS, and SAGE

Agent Specialties:
  nyx      - Technical + Emotional Intelligence
  aria     - Logical Analysis + Problem Solving
  zara     - Creative Expression + Storytelling
  marcus   - Support + Organization
  phoenix  - Cybersecurity + Innovation
  sage     - Wisdom + Strategic Thinking

Examples:
  node multi-agent-manager.js list
  node multi-agent-manager.js start nyx
  node multi-agent-manager.js scenario creative
  node multi-agent-manager.js test-chat
  node multi-agent-manager.js stop-all
`);
  }

  async handleCleanup() {
    console.log('\n🧹 Cleanup requested...');
    await this.stopAllAgents();
    process.exit(0);
  }
}

// Main execution
async function main() {
  const manager = new MultiAgentManager();

  // Handle cleanup on exit
  process.on('SIGINT', () => manager.handleCleanup());
  process.on('SIGTERM', () => manager.handleCleanup());

  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];

  switch (command) {
    case 'list':
      await manager.listAvailableAgents();
      break;

    case 'status':
      await manager.getAgentStatus();
      break;

    case 'start':
      if (!param) {
        console.log('❌ Please specify an agent ID');
        await manager.listAvailableAgents();
        break;
      }
      await manager.spawnAgent(param, { verbose: args.includes('--verbose') });
      break;

    case 'stop':
      if (!param) {
        console.log('❌ Please specify an agent ID');
        break;
      }
      await manager.stopAgent(param);
      break;

    case 'stop-all':
      await manager.stopAllAgents();
      break;

    case 'scenario':
      if (!param) {
        console.log('❌ Please specify a scenario name');
        break;
      }
      await manager.startTestScenario(param);
      break;

    case 'test-chat':
      await manager.testMultiAgentChat();
      break;

    case 'help':
    case '--help':
    case '-h':
      manager.displayHelp();
      break;

    default:
      console.log('❌ Unknown command:', command);
      manager.displayHelp();
      break;
  }
}

// Run the manager
main().catch(error => {
  console.error('❌ Manager error:', error);
  process.exit(1);
});