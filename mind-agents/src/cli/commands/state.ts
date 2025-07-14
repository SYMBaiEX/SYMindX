/**
 * CLI Commands for State Management Operations
 * Provides command-line interface for agent lifecycle and state management
 */

import { Command } from 'commander';

import {
  EnhancedSYMindXRuntime,
  EnhancedRuntimeConfig,
} from '../../core/enhanced-runtime';
import { CheckpointType } from '../../core/state-manager';

// Global runtime instance
let runtime: EnhancedSYMindXRuntime | null = null;

/**
 * Initialize runtime for CLI commands
 */
async function initializeRuntime(): Promise<EnhancedSYMindXRuntime> {
  if (runtime) {
    return runtime;
  }

  // Load configuration
  const config: EnhancedRuntimeConfig = {
    tickInterval: 5000,
    maxAgents: 10,
    logLevel: 'info' as any,
    persistence: {
      enabled: true,
      path: './data',
    },
    extensions: {
      autoLoad: true,
      paths: ['./extensions'],
    },
    stateManagement: {
      enabled: true,
      stateDirectory: './data/agent-states',
      enableCheckpoints: true,
      checkpointInterval: 5 * 60 * 1000, // 5 minutes
      maxCheckpoints: 20,
      enableStateRecovery: true,
      enableConcurrentSafety: true,
      enableAutoCleanup: true,
    },
  };

  runtime = new EnhancedSYMindXRuntime(config);
  await runtime.initialize();

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

        if (options.agent) {
          const agentStatus = rt.getAgentStateStatus(options.agent);

          if (options.json) {
            console.log(JSON.stringify(agentStatus, null, 2));
          } else {
            displayAgentStateStatus(options.agent, agentStatus);
          }
        } else {
          const systemStatus = rt.getStateManagementStatus();

          if (options.json) {
            console.log(JSON.stringify(systemStatus, null, 2));
          } else {
            displaySystemStateStatus(systemStatus);
          }
        }
      } catch (error) {
        console.error('❌ Failed to get state status:', error);
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

        console.log(
          `📸 Creating ${checkpointType} checkpoint for agent ${agentId}...`
        );
        const checkpointPath = await rt.createAgentCheckpoint(
          agentId,
          checkpointType
        );

        console.log(`✅ Checkpoint created: ${checkpointPath}`);
      } catch (error) {
        console.error('❌ Failed to create checkpoint:', error);
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

        // This would require exposing state manager through runtime
        console.log(`📋 Checkpoints for agent ${agentId}:`);
        console.log(
          'Feature not yet implemented - requires state manager exposure'
        );
      } catch (error) {
        console.error('❌ Failed to list checkpoints:', error);
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

        console.log(`🔄 Restoring agent ${agentId} from checkpoint...`);
        const agent = await rt.restoreAgentFromCheckpoint(
          agentId,
          options.checkpoint
        );

        console.log(`✅ Agent restored: ${agent.name} (${agent.id})`);
      } catch (error) {
        console.error('❌ Failed to restore from checkpoint:', error);
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

        console.log(`🚀 Activating agent ${agentId}...`);
        const agent = await rt.activateAgent(agentId);

        console.log(`✅ Agent activated: ${agent.name} (${agent.status})`);
      } catch (error) {
        console.error('❌ Failed to activate agent:', error);
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

        console.log(`💤 Deactivating agent ${agentId}...`);
        await rt.deactivateAgent(agentId);

        console.log(`✅ Agent deactivated with state preserved`);
      } catch (error) {
        console.error('❌ Failed to deactivate agent:', error);
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

        console.log(`🔄 Restarting agent ${agentId}...`);

        // Deactivate then activate
        await rt.deactivateAgent(agentId);
        const agent = await rt.activateAgent(agentId);

        console.log(`✅ Agent restarted: ${agent.name} (${agent.status})`);
      } catch (error) {
        console.error('❌ Failed to restart agent:', error);
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
          console.log(
            '⚠️  This will force cleanup all resources for the agent.'
          );
          console.log(
            '❓ Are you sure you want to continue? (type "yes" to confirm)'
          );

          // In a real implementation, you'd use readline for input
          console.log('Use --force flag to skip confirmation');
          return;
        }

        const rt = await initializeRuntime();

        console.log(`🚨 Performing emergency cleanup for agent ${agentId}...`);
        await rt.emergencyCleanupAgent(agentId);

        console.log(`✅ Emergency cleanup completed`);
      } catch (error) {
        console.error('❌ Emergency cleanup failed:', error);
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

        console.log('🔍 Running state management diagnostics...');

        const systemStatus = rt.getStateManagementStatus();

        console.log('\n📊 System Status:');
        console.log(
          `  State Management: ${systemStatus.enabled ? '✅ Enabled' : '❌ Disabled'}`
        );

        if (systemStatus.enabled) {
          console.log(`  State Directory: ${systemStatus.stateDirectory}`);
          console.log(
            `  Active Operations: ${systemStatus.activeOperations?.length || 0}`
          );

          if (systemStatus.checkpointSystem) {
            console.log(`  Checkpoint System: ✅ Active`);
            console.log(
              `    - Total Agents: ${systemStatus.checkpointSystem.totalAgents}`
            );
            console.log(
              `    - Active Schedules: ${systemStatus.checkpointSystem.activeSchedules}`
            );
            console.log(
              `    - Total Checkpoints: ${systemStatus.checkpointSystem.totalCheckpoints}`
            );
          }

          if (systemStatus.resourceManager) {
            console.log(`  Resource Manager: ✅ Active`);
            console.log(
              `    - Total Resources: ${systemStatus.resourceManager.totalResources}`
            );
            console.log(
              `    - Active Resources: ${systemStatus.resourceManager.activeResources}`
            );
            console.log(
              `    - Health Score: ${(systemStatus.resourceManager.health * 100).toFixed(1)}%`
            );
          }

          if (systemStatus.concurrentSafety) {
            console.log(`  Concurrent Safety: ✅ Active`);
            console.log(
              `    - Active Locks: ${systemStatus.concurrentSafety.totalActiveLocks}`
            );
            console.log(
              `    - Queued Requests: ${systemStatus.concurrentSafety.totalQueuedRequests}`
            );
          }
        }

        if (options.agent) {
          console.log(`\n🤖 Agent ${options.agent} Status:`);
          const agentStatus = rt.getAgentStateStatus(options.agent);
          displayAgentStateStatus(options.agent, agentStatus);
        }

        console.log('\n✅ Diagnostics completed');
      } catch (error) {
        console.error('❌ Diagnostics failed:', error);
        process.exit(1);
      }
    });

  return stateCmd;
}

// Helper functions for display

function displaySystemStateStatus(status: any): void {
  console.log('🏛️  State Management System Status');
  console.log('═'.repeat(50));

  if (!status.enabled) {
    console.log('❌ State management is disabled');
    return;
  }

  console.log('✅ State management is enabled');
  console.log(`📁 State Directory: ${status.stateDirectory}`);

  if (status.checkpointSystem) {
    console.log('\n📸 Checkpoint System:');
    console.log(`  Total Agents: ${status.checkpointSystem.totalAgents}`);
    console.log(
      `  Active Schedules: ${status.checkpointSystem.activeSchedules}`
    );
    console.log(
      `  Total Checkpoints: ${status.checkpointSystem.totalCheckpoints}`
    );
    console.log(
      `  Success Rate: ${(status.checkpointSystem.successRate * 100).toFixed(1)}%`
    );
    console.log(
      `  Next Checkpoint: ${status.checkpointSystem.nextCheckpoint || 'None scheduled'}`
    );
  }

  if (status.resourceManager) {
    console.log('\n🔧 Resource Manager:');
    console.log(`  Total Resources: ${status.resourceManager.totalResources}`);
    console.log(
      `  Active Resources: ${status.resourceManager.activeResources}`
    );
    console.log(`  Stale Resources: ${status.resourceManager.staleResources}`);
    console.log(
      `  Health Score: ${(status.resourceManager.health * 100).toFixed(1)}%`
    );
  }

  if (status.concurrentSafety) {
    console.log('\n🔒 Concurrent Safety:');
    console.log(`  Active Locks: ${status.concurrentSafety.totalActiveLocks}`);
    console.log(
      `  Queued Requests: ${status.concurrentSafety.totalQueuedRequests}`
    );
    console.log(`  Unique Agents: ${status.concurrentSafety.uniqueAgents}`);
    console.log(
      `  Max Locks/Agent: ${status.concurrentSafety.maxLocksPerAgent}`
    );
  }

  if (status.activeOperations && status.activeOperations.length > 0) {
    console.log('\n⚡ Active Operations:');
    status.activeOperations.forEach((op: any) => {
      console.log(`  ${op.type} - ${op.agentId} (${op.phase})`);
    });
  }
}

function displayAgentStateStatus(agentId: string, status: any): void {
  console.log(`🤖 Agent ${agentId} State Status`);
  console.log('═'.repeat(50));

  if (!status.enabled) {
    console.log('❌ State management not enabled for this agent');
    return;
  }

  if (status.resourceSnapshot) {
    console.log('📊 Resource Snapshot:');
    console.log(
      `  Total Resources: ${status.resourceSnapshot.summary.totalResources}`
    );
    console.log(
      `  Active Resources: ${status.resourceSnapshot.summary.activeResources}`
    );
    if (status.resourceSnapshot.summary.memoryUsage) {
      console.log(
        `  Memory Usage: ${(status.resourceSnapshot.summary.memoryUsage / 1024).toFixed(1)} KB`
      );
    }
  }

  if (status.lockStatus) {
    console.log('\n🔒 Lock Status:');
    console.log(`  Active Locks: ${status.lockStatus.activeLocks}`);
    console.log(`  Queued Requests: ${status.lockStatus.queuedRequests}`);

    if (status.lockStatus.locks.length > 0) {
      console.log('  Current Locks:');
      status.lockStatus.locks.forEach((lock: any) => {
        console.log(`    - ${lock.operation} (${lock.holderId})`);
      });
    }
  }

  if (status.checkpointMetrics) {
    console.log('\n📸 Checkpoint Metrics:');
    console.log(
      `  Total Checkpoints: ${status.checkpointMetrics.totalCheckpoints}`
    );
    console.log(
      `  Successful: ${status.checkpointMetrics.successfulCheckpoints}`
    );
    console.log(`  Failed: ${status.checkpointMetrics.failedCheckpoints}`);
    console.log(
      `  Average Time: ${status.checkpointMetrics.averageCheckpointTime}ms`
    );
    if (status.checkpointMetrics.lastCheckpointSize) {
      console.log(
        `  Last Size: ${(status.checkpointMetrics.lastCheckpointSize / 1024).toFixed(1)} KB`
      );
    }
  }

  if (status.lastCheckpoint) {
    console.log(`\n⏰ Last Checkpoint: ${status.lastCheckpoint}`);
  }
}
