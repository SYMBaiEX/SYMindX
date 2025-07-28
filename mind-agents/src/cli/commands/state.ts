/**
 * CLI Commands for State Management Operations
 * Provides command-line interface for agent lifecycle and state management
 */

import { Command } from 'commander';

import { SYMindXRuntime } from '../../core/runtime';
import { LogLevel } from '../../types/index.js';

// Checkpoint types not available in current implementation
enum CheckpointType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  EMERGENCY = 'emergency',
}

// Global runtime instance
let runtime: SYMindXRuntime | null = null;

/**
 * Initialize runtime for CLI commands
 */
async function initializeRuntime(): Promise<SYMindXRuntime> {
  if (runtime) {
    return runtime;
  }

  // Basic runtime initialization with minimal valid configuration
  runtime = new SYMindXRuntime({
    tickInterval: 1000,
    maxAgents: 10,
    logLevel: LogLevel.INFO,
    persistence: {
      enabled: false,
      path: './data'
    },
    extensions: {
      autoLoad: false,
      paths: []
    }
  });
  await runtime.start();

  return runtime;
}

/**
 * Create state command group
 */
export function createStateCommand(): Command {
  const stateCmd = new Command('state').description(
    'Agent state management operations'
  );

  // Status command
  stateCmd
    .command('status')
    .description('Show state management status')
    .option('-a, --agent <agentId>', 'Show status for specific agent')
    .option('-j, --json', 'Output as JSON')
    .action(async (options) => {
      try {
        const rt = await initializeRuntime();

        // State management features not available in current implementation
        process.stdout.write('⚠️  Enhanced state management not available in current implementation' + '\n');
        process.stdout.write('   Basic agent status available through other commands' + '\n');
        
        if (options.agent) {
          process.stdout.write(`   Requested agent: ${options.agent}` + '\n');
        }
      } catch (error) {
        process.stderr.write('❌ Failed to get state status: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  // Checkpoint commands
  const checkpointCmd = stateCmd
    .command('checkpoint')
    .description('Checkpoint management operations');

  checkpointCmd
    .command('create')
    .description('Create checkpoint for an agent')
    .argument('<agentId>', 'Agent ID')
    .option(
      '-t, --type <type>',
      'Checkpoint type (full, incremental, emergency)',
      'full'
    )
    .action(async (agentId, options) => {
      try {
        const rt = await initializeRuntime();

        const checkpointType = options.type.toLowerCase() as CheckpointType;
        if (!Object.values(CheckpointType).includes(checkpointType)) {
          throw new Error(`Invalid checkpoint type: ${options.type}`);
        }

        process.stdout.write('⚠️  Enhanced checkpoint features not available in current implementation' + '\n');
        process.stdout.write(`   Requested: ${checkpointType} checkpoint for agent ${agentId}` + '\n');
        process.stdout.write('   Basic agent state can be managed through other commands' + '\n');
      } catch (error) {
        process.stderr.write('❌ Failed to create checkpoint: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  checkpointCmd
    .command('list')
    .description('List checkpoints for an agent')
    .argument('<agentId>', 'Agent ID')
    .option('-j, --json', 'Output as JSON')
    .action(async (agentId, _options) => {
      try {
        await initializeRuntime();

        process.stdout.write('⚠️  Checkpoint listing not available in current implementation' + '\n');
        process.stdout.write(`   Requested agent: ${agentId}` + '\n');
        process.stdout.write('   Enhanced state management features would need to be implemented' + '\n');
      } catch (error) {
        process.stderr.write('❌ Failed to list checkpoints: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  checkpointCmd
    .command('restore')
    .description('Restore agent from checkpoint')
    .argument('<agentId>', 'Agent ID')
    .option('-c, --checkpoint <file>', 'Specific checkpoint file')
    .action(async (agentId, options) => {
      try {
        const rt = await initializeRuntime();

        process.stdout.write('⚠️  Checkpoint restoration not available in current implementation' + '\n');
        process.stdout.write(`   Requested agent: ${agentId}` + '\n');
        if (options.checkpoint) {
          process.stdout.write(`   Requested checkpoint: ${options.checkpoint}` + '\n');
        }
        process.stdout.write('   Enhanced state management features would need to be implemented' + '\n');
      } catch (error) {
        process.stderr.write('❌ Failed to restore from checkpoint: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  // Lifecycle commands
  const lifecycleCmd = stateCmd
    .command('lifecycle')
    .description('Agent lifecycle management');

  lifecycleCmd
    .command('activate')
    .description('Activate an agent with state restoration')
    .argument('<agentId>', 'Agent ID')
    .action(async (agentId) => {
      try {
        const rt = await initializeRuntime();

        // Check if agent exists
        const agent = rt.agents.get(agentId);
        if (!agent) {
          process.stderr.write(`❌ Agent '${agentId}' not found` + '\n');
          process.exit(1);
        }
        
        process.stdout.write('⚠️  Enhanced lifecycle management not available in current implementation' + '\n');
        process.stdout.write(`   Agent ${agent.name} is currently: ${agent.status}` + '\n');
        process.stdout.write('   Use standard agent commands for basic lifecycle management' + '\n');
      } catch (error) {
        process.stderr.write('❌ Failed to activate agent: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  lifecycleCmd
    .command('deactivate')
    .description('Deactivate an agent with state preservation')
    .argument('<agentId>', 'Agent ID')
    .action(async (agentId) => {
      try {
        const rt = await initializeRuntime();

        const agent = rt.agents.get(agentId);
        if (!agent) {
          process.stderr.write(`❌ Agent '${agentId}' not found or not active` + '\n');
          process.exit(1);
        }
        
        process.stdout.write(`💤 Deactivating agent ${agentId}...` + '\n');
        await rt.deactivateAgent(agentId);
        process.stdout.write(`✅ Agent ${agent.name} deactivated and returned to lazy state` + '\n');
      } catch (error) {
        process.stderr.write('❌ Failed to deactivate agent: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  lifecycleCmd
    .command('restart')
    .description('Restart an agent with full lifecycle')
    .argument('<agentId>', 'Agent ID')
    .action(async (agentId) => {
      try {
        const rt = await initializeRuntime();

        process.stdout.write(`🔄 Restarting agent ${agentId}...` + '\n');
        
        // Check if agent is active
        const isActive = rt.isAgentActive(agentId);
        
        if (isActive) {
          // Deactivate first
          await rt.deactivateAgent(agentId);
          process.stdout.write(`   Deactivated agent ${agentId}` + '\n');
        }
        
        // Activate
        const agent = await rt.activateAgent(agentId);
        process.stdout.write(`✅ Agent restarted: ${agent.name} (${agent.status})` + '\n');
      } catch (error) {
        process.stderr.write('❌ Failed to restart agent: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  // Emergency commands
  stateCmd
    .command('emergency-cleanup')
    .description('Perform emergency cleanup for an agent')
    .argument('<agentId>', 'Agent ID')
    .option('--force', 'Force cleanup without confirmation')
    .action(async (agentId, options) => {
      try {
        if (!options.force) {
          process.stdout.write(
            '⚠️  This will force cleanup all resources for the agent.' + '\n'
          );
          process.stdout.write(
            '❓ Are you sure you want to continue? (type "yes" to confirm)' + '\n'
          );

          // In a real implementation, you'd use readline for input
          process.stdout.write('Use --force flag to skip confirmation' + '\n');
          return;
        }

        const rt = await initializeRuntime();

        process.stdout.write(`🚨 Performing emergency cleanup for agent ${agentId}...` + '\n');
        
        // Use available runtime methods for cleanup
        if (rt.agents.has(agentId)) {
          await rt.deactivateAgent(agentId);
          process.stdout.write(`   Deactivated agent ${agentId}` + '\n');
        }
        
        if (rt.lazyAgents.has(agentId)) {
          process.stdout.write(`   Agent ${agentId} is in lazy state` + '\n');
        }
        
        process.stdout.write(`✅ Emergency cleanup completed` + '\n');
      } catch (error) {
        process.stderr.write('❌ Emergency cleanup failed: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  // Diagnostic commands
  stateCmd
    .command('diagnose')
    .description('Run state management diagnostics')
    .option('-a, --agent <agentId>', 'Diagnose specific agent')
    .action(async (options) => {
      try {
        const rt = await initializeRuntime();

        process.stdout.write('🔍 Running state management diagnostics...' + '\n');

        // Get basic system status using available runtime information
        const systemStatus = {
          enabled: true,
          activeAgents: rt.agents.size,
          lazyAgents: rt.lazyAgents.size,
          totalAgents: rt.agents.size + rt.lazyAgents.size,
          isRunning: rt['isRunning'] || false
        };

        process.stdout.write('\n📊 System Status:' + '\n');
        process.stdout.write(
          `  Runtime: ${systemStatus.isRunning ? '✅ Running' : '❌ Stopped'}` + '\n'
        );
        process.stdout.write(
          `  Active Agents: ${systemStatus.activeAgents}` + '\n'
        );
        process.stdout.write(
          `  Lazy Agents: ${systemStatus.lazyAgents}` + '\n'
        );
        process.stdout.write(
          `  Total Agents: ${systemStatus.totalAgents}` + '\n'
        );

        if (options.agent) {
          process.stdout.write(`\n🤖 Agent ${options.agent} Status:` + '\n');
          const agent = rt.agents.get(options.agent);
          const lazyAgent = rt.lazyAgents.get(options.agent);
          
          if (agent) {
            process.stdout.write(`  Status: ✅ Active` + '\n');
            process.stdout.write(`  Name: ${agent.name}` + '\n');
            process.stdout.write(`  Status: ${agent.status}` + '\n');
            
            const autonomousStatus = rt.getAutonomousStatus(options.agent);
            process.stdout.write(`  Autonomous: ${autonomousStatus.autonomous ? '✅' : '❌'}` + '\n');
          } else if (lazyAgent) {
            process.stdout.write(`  Status: 💤 Lazy (not activated)` + '\n');
            process.stdout.write(`  Name: ${lazyAgent.name}` + '\n');
            process.stdout.write(`  Status: ${lazyAgent.status}` + '\n');
          } else {
            process.stdout.write(`  Status: ❌ Not found` + '\n');
          }
        }

        process.stdout.write('\n✅ Diagnostics completed' + '\n');
      } catch (error) {
        process.stderr.write('❌ Diagnostics failed: ' + String(error) + '\n');
        process.exit(1);
      }
    });

  return stateCmd;
}

// Helper functions for display

function displaySystemStateStatus(status: { enabled: boolean; stateDirectory?: string; checkpointSystem?: any; resourceManager?: any; concurrentSafety?: any; activeOperations?: any[] }): void {
  process.stdout.write('🏛️  State Management System Status' + '\n');
  process.stdout.write('═'.repeat(50) + '\n');

  if (!status.enabled) {
    process.stdout.write('❌ State management is disabled' + '\n');
    return;
  }

  process.stdout.write('✅ State management is enabled' + '\n');
  process.stdout.write(`📁 State Directory: ${status.stateDirectory}` + '\n');

  if (status.checkpointSystem) {
    process.stdout.write('\n📸 Checkpoint System:' + '\n');
    process.stdout.write(`  Total Agents: ${status.checkpointSystem.totalAgents}` + '\n');
    process.stdout.write(
      `  Active Schedules: ${status.checkpointSystem.activeSchedules}` + '\n'
    );
    process.stdout.write(
      `  Total Checkpoints: ${status.checkpointSystem.totalCheckpoints}` + '\n'
    );
    process.stdout.write(
      `  Success Rate: ${(status.checkpointSystem.successRate * 100).toFixed(1)}%` + '\n'
    );
    process.stdout.write(
      `  Next Checkpoint: ${status.checkpointSystem.nextCheckpoint || 'None scheduled'}` + '\n'
    );
  }

  if (status.resourceManager) {
    process.stdout.write('\n🔧 Resource Manager:' + '\n');
    process.stdout.write(`  Total Resources: ${status.resourceManager.totalResources}` + '\n');
    process.stdout.write(
      `  Active Resources: ${status.resourceManager.activeResources}` + '\n'
    );
    process.stdout.write(`  Stale Resources: ${status.resourceManager.staleResources}` + '\n');
    process.stdout.write(
      `  Health Score: ${(status.resourceManager.health * 100).toFixed(1)}%` + '\n'
    );
  }

  if (status.concurrentSafety) {
    process.stdout.write('\n🔒 Concurrent Safety:' + '\n');
    process.stdout.write(`  Active Locks: ${status.concurrentSafety.totalActiveLocks}` + '\n');
    process.stdout.write(
      `  Queued Requests: ${status.concurrentSafety.totalQueuedRequests}` + '\n'
    );
    process.stdout.write(`  Unique Agents: ${status.concurrentSafety.uniqueAgents}` + '\n');
    process.stdout.write(
      `  Max Locks/Agent: ${status.concurrentSafety.maxLocksPerAgent}` + '\n'
    );
  }

  if (status.activeOperations && status.activeOperations.length > 0) {
    process.stdout.write('\n⚡ Active Operations:' + '\n');
    status.activeOperations.forEach((op: { type: string; agentId: string; phase: string }) => {
      process.stdout.write(`  ${op.type} - ${op.agentId} (${op.phase})` + '\n');
    });
  }
}

function displayAgentStateStatus(agentId: string, status: { enabled: boolean; resourceSnapshot?: any; lockStatus?: any; checkpointMetrics?: any; lastCheckpoint?: Date }): void {
  process.stdout.write(`🤖 Agent ${agentId} State Status` + '\n');
  process.stdout.write('═'.repeat(50) + '\n');

  if (!status.enabled) {
    process.stdout.write('❌ State management not enabled for this agent' + '\n');
    return;
  }

  if (status.resourceSnapshot) {
    process.stdout.write('📊 Resource Snapshot:' + '\n');
    process.stdout.write(
      `  Total Resources: ${status.resourceSnapshot.summary.totalResources}` + '\n'
    );
    process.stdout.write(
      `  Active Resources: ${status.resourceSnapshot.summary.activeResources}` + '\n'
    );
    if (status.resourceSnapshot.summary.memoryUsage) {
      process.stdout.write(
        `  Memory Usage: ${(status.resourceSnapshot.summary.memoryUsage / 1024).toFixed(1)} KB` + '\n'
      );
    }
  }

  if (status.lockStatus) {
    process.stdout.write('\n🔒 Lock Status:' + '\n');
    process.stdout.write(`  Active Locks: ${status.lockStatus.activeLocks}` + '\n');
    process.stdout.write(`  Queued Requests: ${status.lockStatus.queuedRequests}` + '\n');

    if (status.lockStatus.locks.length > 0) {
      process.stdout.write('  Current Locks:' + '\n');
      status.lockStatus.locks.forEach((lock: { operation: string; holderId: string }) => {
        process.stdout.write(`    - ${lock.operation} (${lock.holderId})` + '\n');
      });
    }
  }

  if (status.checkpointMetrics) {
    process.stdout.write('\n📸 Checkpoint Metrics:' + '\n');
    process.stdout.write(
      `  Total Checkpoints: ${status.checkpointMetrics.totalCheckpoints}` + '\n'
    );
    process.stdout.write(
      `  Successful: ${status.checkpointMetrics.successfulCheckpoints}` + '\n'
    );
    process.stdout.write(`  Failed: ${status.checkpointMetrics.failedCheckpoints}` + '\n');
    process.stdout.write(
      `  Average Time: ${status.checkpointMetrics.averageCheckpointTime}ms` + '\n'
    );
    if (status.checkpointMetrics.lastCheckpointSize) {
      process.stdout.write(
        `  Last Size: ${(status.checkpointMetrics.lastCheckpointSize / 1024).toFixed(1)} KB` + '\n'
      );
    }
  }

  if (status.lastCheckpoint) {
    process.stdout.write(`\n⏰ Last Checkpoint: ${status.lastCheckpoint.toISOString()}` + '\n');
  }
}
