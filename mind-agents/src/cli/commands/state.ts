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
    logLevel: 'info' as 'error' | 'warn' | 'info' | 'debug',
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
            process.stdout.write(JSON.stringify(agentStatus, null, 2) + '\n');
          } else {
            displayAgentStateStatus(options.agent, agentStatus);
          }
        } else {
          const systemStatus = rt.getStateManagementStatus();

          if (options.json) {
            process.stdout.write(JSON.stringify(systemStatus, null, 2) + '\n');
          } else {
            displaySystemStateStatus(systemStatus);
          }
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

        process.stdout.write(
          `📸 Creating ${checkpointType} checkpoint for agent ${agentId}...` + '\n'
        );
        const checkpointPath = await rt.createAgentCheckpoint(
          agentId,
          checkpointType
        );

        process.stdout.write(`✅ Checkpoint created: ${checkpointPath}` + '\n');
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

        // This would require exposing state manager through runtime
        process.stdout.write(`📋 Checkpoints for agent ${agentId}:` + '\n');
        process.stdout.write(
          'Feature not yet implemented - requires state manager exposure' + '\n'
        );
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

        process.stdout.write(`🔄 Restoring agent ${agentId} from checkpoint...` + '\n');
        const agent = await rt.restoreAgentFromCheckpoint(
          agentId,
          options.checkpoint
        );

        process.stdout.write(`✅ Agent restored: ${agent.name} (${agent.id})` + '\n');
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

        process.stdout.write(`🚀 Activating agent ${agentId}...` + '\n');
        const agent = await rt.activateAgent(agentId);

        process.stdout.write(`✅ Agent activated: ${agent.name} (${agent.status})` + '\n');
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

        process.stdout.write(`💤 Deactivating agent ${agentId}...` + '\n');
        await rt.deactivateAgent(agentId);

        process.stdout.write(`✅ Agent deactivated with state preserved` + '\n');
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

        // Deactivate then activate
        await rt.deactivateAgent(agentId);
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
        await rt.emergencyCleanupAgent(agentId);

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

        const systemStatus = rt.getStateManagementStatus();

        process.stdout.write('\n📊 System Status:' + '\n');
        process.stdout.write(
          `  State Management: ${systemStatus.enabled ? '✅ Enabled' : '❌ Disabled'}` + '\n'
        );

        if (systemStatus.enabled) {
          process.stdout.write(`  State Directory: ${systemStatus.stateDirectory}` + '\n');
          process.stdout.write(
            `  Active Operations: ${systemStatus.activeOperations?.length || 0}` + '\n'
          );

          if (systemStatus.checkpointSystem) {
            process.stdout.write(`  Checkpoint System: ✅ Active` + '\n');
            process.stdout.write(
              `    - Total Agents: ${systemStatus.checkpointSystem.totalAgents}` + '\n'
            );
            process.stdout.write(
              `    - Active Schedules: ${systemStatus.checkpointSystem.activeSchedules}` + '\n'
            );
            process.stdout.write(
              `    - Total Checkpoints: ${systemStatus.checkpointSystem.totalCheckpoints}` + '\n'
            );
          }

          if (systemStatus.resourceManager) {
            process.stdout.write(`  Resource Manager: ✅ Active` + '\n');
            process.stdout.write(
              `    - Total Resources: ${systemStatus.resourceManager.totalResources}` + '\n'
            );
            process.stdout.write(
              `    - Active Resources: ${systemStatus.resourceManager.activeResources}` + '\n'
            );
            process.stdout.write(
              `    - Health Score: ${(systemStatus.resourceManager.health * 100).toFixed(1)}%` + '\n'
            );
          }

          if (systemStatus.concurrentSafety) {
            process.stdout.write(`  Concurrent Safety: ✅ Active` + '\n');
            process.stdout.write(
              `    - Active Locks: ${systemStatus.concurrentSafety.totalActiveLocks}` + '\n'
            );
            process.stdout.write(
              `    - Queued Requests: ${systemStatus.concurrentSafety.totalQueuedRequests}` + '\n'
            );
          }
        }

        if (options.agent) {
          process.stdout.write(`\n🤖 Agent ${options.agent} Status:` + '\n');
          const agentStatus = rt.getAgentStateStatus(options.agent);
          displayAgentStateStatus(options.agent, agentStatus);
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

function displayAgentStateStatus(agentId: string, status: { enabled: boolean; resourceSnapshot?: any; lockStatus?: any; checkpointMetrics?: any; lastCheckpoint?: string }): void {
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
    process.stdout.write(`\n⏰ Last Checkpoint: ${status.lastCheckpoint}` + '\n');
  }
}
