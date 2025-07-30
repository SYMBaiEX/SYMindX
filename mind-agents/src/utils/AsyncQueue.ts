/**
 * Optimized Async Queue System
 * Event-driven task scheduling to replace setTimeout/setInterval patterns
 */

import { EventEmitter } from 'node:events';
import { performanceMonitor } from './PerformanceMonitor';
import { runtimeLogger } from './logger';

interface QueuedTask {
  id: string;
  fn: () => Promise<void> | void;
  priority: number;
  delay?: number;
  recurring?: {
    interval: number;
    maxExecutions?: number;
    executionCount: number;
  };
  retries?: {
    maxRetries: number;
    currentRetries: number;
    backoffMs: number;
  };
  createdAt: number;
  scheduledFor: number;
  tags?: Record<string, string>;
}

interface QueueOptions {
  maxConcurrency?: number;
  maxQueueSize?: number;
  defaultPriority?: number;
  enableMetrics?: boolean;
}

export class AsyncQueue extends EventEmitter {
  private tasks = new Map<string, QueuedTask>();
  private runningTasks = new Set<string>();
  private options: Required<QueueOptions>;
  private isProcessing = false;
  private nextTaskId = 0;
  private processTimer?: NodeJS.Timeout;

  constructor(options: QueueOptions = {}) {
    super();

    this.options = {
      maxConcurrency: options.maxConcurrency ?? 10,
      maxQueueSize: options.maxQueueSize ?? 1000,
      defaultPriority: options.defaultPriority ?? 5,
      enableMetrics: options.enableMetrics ?? true,
    };

    // Start processing loop
    this.startProcessing();
  }

  /**
   * Add a one-time task to the queue
   */
  add(
    fn: () => Promise<void> | void,
    options?: {
      priority?: number;
      delay?: number;
      retries?: number;
      tags?: Record<string, string>;
    }
  ): string {
    const taskId = this.generateTaskId();
    const now = Date.now();

    if (this.tasks.size >= this.options.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const task: QueuedTask = {
      id: taskId,
      fn,
      priority: options?.priority ?? this.options.defaultPriority,
      delay: options?.delay,
      createdAt: now,
      scheduledFor: now + (options?.delay || 0),
      tags: options?.tags,
      retries: options?.retries
        ? {
            maxRetries: options.retries,
            currentRetries: 0,
            backoffMs: 100,
          }
        : undefined,
    };

    this.tasks.set(taskId, task);

    if (this.options.enableMetrics) {
      performanceMonitor.recordMetric(
        'async_queue.task.added',
        1,
        'count',
        task.tags
      );
    }

    this.emit('taskAdded', task);
    return taskId;
  }

  /**
   * Add a recurring task to the queue
   */
  addRecurring(
    fn: () => Promise<void> | void,
    interval: number,
    options?: {
      priority?: number;
      maxExecutions?: number;
      startDelay?: number;
      tags?: Record<string, string>;
    }
  ): string {
    const taskId = this.generateTaskId();
    const now = Date.now();

    const task: QueuedTask = {
      id: taskId,
      fn,
      priority: options?.priority ?? this.options.defaultPriority,
      createdAt: now,
      scheduledFor: now + (options?.startDelay || 0),
      tags: options?.tags,
      recurring: {
        interval,
        maxExecutions: options?.maxExecutions,
        executionCount: 0,
      },
    };

    this.tasks.set(taskId, task);

    if (this.options.enableMetrics) {
      performanceMonitor.recordMetric(
        'async_queue.recurring_task.added',
        1,
        'count',
        task.tags
      );
    }

    this.emit('recurringTaskAdded', task);
    return taskId;
  }

  /**
   * Remove a task from the queue
   */
  remove(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Don't remove if currently running
    if (this.runningTasks.has(taskId)) {
      runtimeLogger.warn(`Cannot remove running task: ${taskId}`);
      return false;
    }

    this.tasks.delete(taskId);

    if (this.options.enableMetrics) {
      performanceMonitor.recordMetric(
        'async_queue.task.removed',
        1,
        'count',
        task.tags
      );
    }

    this.emit('taskRemoved', task);
    return true;
  }

  /**
   * Clear all tasks from the queue
   */
  clear(): void {
    const taskCount = this.tasks.size;

    // Only remove non-running tasks
    for (const [taskId, task] of this.tasks) {
      if (!this.runningTasks.has(taskId)) {
        this.tasks.delete(taskId);
      }
    }

    if (this.options.enableMetrics) {
      performanceMonitor.recordMetric(
        'async_queue.tasks.cleared',
        taskCount,
        'count'
      );
    }

    this.emit('cleared', taskCount);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    totalTasks: number;
    runningTasks: number;
    pendingTasks: number;
    recurringTasks: number;
    overdueTasks: number;
  } {
    const now = Date.now();
    let recurringCount = 0;
    let overdueCount = 0;

    for (const task of this.tasks.values()) {
      if (task.recurring) recurringCount++;
      if (task.scheduledFor < now && !this.runningTasks.has(task.id)) {
        overdueCount++;
      }
    }

    return {
      totalTasks: this.tasks.size,
      runningTasks: this.runningTasks.size,
      pendingTasks: this.tasks.size - this.runningTasks.size,
      recurringTasks: recurringCount,
      overdueTasks: overdueCount,
    };
  }

  /**
   * Shutdown the queue and wait for running tasks
   */
  async shutdown(timeout = 30000): Promise<void> {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = undefined;
    }

    // Clear all pending tasks
    this.clear();

    // Wait for running tasks to complete
    const startTime = Date.now();
    while (this.runningTasks.size > 0 && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.runningTasks.size > 0) {
      runtimeLogger.warn(
        `${this.runningTasks.size} tasks still running after shutdown timeout`
      );
    }

    this.emit('shutdown');
  }

  // Private methods

  private generateTaskId(): string {
    return `task_${Date.now()}_${++this.nextTaskId}`;
  }

  private startProcessing(): void {
    const processLoop = () => {
      this.processTasks().catch((error) => {
        runtimeLogger.error('Error in task processing loop:', error);
      });

      this.processTimer = setTimeout(processLoop, 10); // 10ms polling
    };

    processLoop();
  }

  private async processTasks(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      const readyTasks = this.getReadyTasks(now);

      // Execute tasks up to concurrency limit
      const availableSlots =
        this.options.maxConcurrency - this.runningTasks.size;
      const tasksToRun = readyTasks.slice(0, availableSlots);

      for (const task of tasksToRun) {
        this.executeTask(task).catch((error) => {
          runtimeLogger.error(`Task execution error: ${task.id}`, error);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private getReadyTasks(now: number): QueuedTask[] {
    const readyTasks: QueuedTask[] = [];

    for (const task of this.tasks.values()) {
      if (!this.runningTasks.has(task.id) && task.scheduledFor <= now) {
        readyTasks.push(task);
      }
    }

    // Sort by priority (higher first) then by scheduled time
    return readyTasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.scheduledFor - b.scheduledFor;
    });
  }

  private async executeTask(task: QueuedTask): Promise<void> {
    this.runningTasks.add(task.id);

    const timer = this.options.enableMetrics
      ? performanceMonitor.createTimer('async_queue.task.execution', task.tags)
      : null;

    try {
      this.emit('taskStarted', task);

      await Promise.resolve(task.fn());

      if (timer) timer.end();

      if (this.options.enableMetrics) {
        performanceMonitor.recordMetric(
          'async_queue.task.completed',
          1,
          'count',
          task.tags
        );
      }

      this.emit('taskCompleted', task);

      // Handle recurring tasks
      if (task.recurring) {
        task.recurring.executionCount++;

        const shouldContinue =
          !task.recurring.maxExecutions ||
          task.recurring.executionCount < task.recurring.maxExecutions;

        if (shouldContinue) {
          // Reschedule for next execution
          task.scheduledFor = Date.now() + task.recurring.interval;
          this.emit('taskRescheduled', task);
        } else {
          // Remove completed recurring task
          this.tasks.delete(task.id);
          this.emit('recurringTaskCompleted', task);
        }
      } else {
        // Remove one-time task
        this.tasks.delete(task.id);
      }
    } catch (error) {
      if (timer) timer.end();

      if (this.options.enableMetrics) {
        performanceMonitor.recordMetric(
          'async_queue.task.failed',
          1,
          'count',
          task.tags
        );
      }

      this.emit('taskFailed', task, error);

      // Handle retries
      if (
        task.retries &&
        task.retries.currentRetries < task.retries.maxRetries
      ) {
        task.retries.currentRetries++;
        task.scheduledFor =
          Date.now() + task.retries.backoffMs * task.retries.currentRetries;

        this.emit('taskRetried', task);

        runtimeLogger.warn(
          `Retrying task ${task.id} (attempt ${task.retries.currentRetries}/${task.retries.maxRetries})`
        );
      } else {
        // Remove failed task
        this.tasks.delete(task.id);
        runtimeLogger.error(`Task ${task.id} failed permanently:`, error);
      }
    } finally {
      this.runningTasks.delete(task.id);
    }
  }
}

// Global queue instance
export const globalQueue = new AsyncQueue({
  maxConcurrency: 20,
  maxQueueSize: 2000,
  enableMetrics: true,
});

/**
 * Optimized replacement for setTimeout
 */
export function scheduleTask(
  fn: () => Promise<void> | void,
  delay: number,
  options?: {
    priority?: number;
    retries?: number;
    tags?: Record<string, string>;
  }
): string {
  return globalQueue.add(fn, { ...options, delay });
}

/**
 * Optimized replacement for setInterval
 */
export function scheduleRecurring(
  fn: () => Promise<void> | void,
  interval: number,
  options?: {
    priority?: number;
    maxExecutions?: number;
    startDelay?: number;
    tags?: Record<string, string>;
  }
): string {
  return globalQueue.addRecurring(fn, interval, options);
}

/**
 * Cancel a scheduled task
 */
export function cancelTask(taskId: string): boolean {
  return globalQueue.remove(taskId);
}

/**
 * Get global queue statistics
 */
export function getQueueStats() {
  return globalQueue.getStats();
}
