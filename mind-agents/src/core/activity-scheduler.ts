/**
 * Activity Scheduler - 24/7 Autonomous Operation Scheduler
 * 
 * Manages agent activities across multiple platforms with intelligent time management,
 * platform balancing, goal alignment, and adaptive timing optimization.
 */

import { EventBus, AgentEvent, AgentAction, ActionStatus } from '../types/agent';
import { Goal, AutonomousAgent, PerformanceMetrics } from '../types/autonomous';
import { Logger } from '../utils/logger';

export interface ActivitySchedulerConfig {
  enabled: boolean;
  tickInterval: number; // milliseconds between scheduler ticks
  maxConcurrentActivities: number;
  platformBalancing: {
    enabled: boolean;
    minTimePerPlatform: number; // minimum minutes per platform per day
    maxTimePerPlatform: number; // maximum minutes per platform per day
    balanceStrategy: 'equal' | 'weighted' | 'adaptive';
  };
  goalAlignment: {
    enabled: boolean;
    goalPriorityWeight: number; // 0-1, how much goals influence scheduling
    progressThreshold: number; // minimum progress required to continue activity
  };
  adaptiveTiming: {
    enabled: boolean;
    learningRate: number; // how quickly to adapt timing based on performance
    performanceWindow: number; // hours to consider for performance analysis
    optimalTimeDetection: boolean;
  };
  timeZone: string;
  workingHours: {
    start: number; // hour (0-23)
    end: number; // hour (0-23)
    enabled: boolean;
  };
}

export interface ScheduledActivity {
  id: string;
  agentId: string;
  platform: string;
  activityType: ActivityType;
  priority: number; // 0-1
  estimatedDuration: number; // minutes
  goalIds: string[]; // associated goals
  scheduledTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: ActivityStatus;
  parameters: Record<string, unknown>;
  dependencies: string[]; // other activity IDs this depends on
  recurring?: RecurringPattern;
  adaptiveData?: ActivityAdaptiveData;
}

export enum ActivityType {
  SOCIAL_INTERACTION = 'social_interaction',
  CONTENT_CREATION = 'content_creation',
  LEARNING = 'learning',
  EXPLORATION = 'exploration',
  GOAL_PLANNING = 'goal_planning',
  MAINTENANCE = 'maintenance',
  GAMING = 'gaming',
  COMMUNITY_ENGAGEMENT = 'community_engagement',
  SKILL_DEVELOPMENT = 'skill_development',
  REFLECTION = 'reflection'
}

export enum ActivityStatus {
  SCHEDULED = 'scheduled',
  READY = 'ready',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed'
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number; // for custom patterns
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  timeOfDay?: number; // hour (0-23)
  endDate?: Date;
}

export interface ActivityAdaptiveData {
  performanceHistory: ActivityPerformance[];
  optimalTimes: OptimalTimeSlot[];
  platformEffectiveness: Record<string, number>;
  goalContribution: Record<string, number>;
  lastOptimization: Date;
}

export interface ActivityPerformance {
  timestamp: Date;
  duration: number; // actual duration in minutes
  success: boolean;
  goalProgress: number; // 0-1
  platformEngagement: number; // 0-1
  resourceEfficiency: number; // 0-1
  userSatisfaction?: number; // 0-1
}

export interface OptimalTimeSlot {
  startHour: number; // 0-23
  endHour: number; // 0-23
  dayOfWeek: number; // 0-6
  effectiveness: number; // 0-1
  confidence: number; // 0-1
  sampleSize: number;
}

export interface PlatformTimeAllocation {
  platform: string;
  allocatedMinutes: number;
  usedMinutes: number;
  efficiency: number;
  lastActivity: Date;
  priority: number;
}

export interface SchedulingContext {
  currentTime: Date;
  activeGoals: Goal[];
  platformAllocations: PlatformTimeAllocation[];
  recentPerformance: PerformanceMetrics;
  availablePlatforms: string[];
  constraints: SchedulingConstraint[];
}

export interface SchedulingConstraint {
  type: 'time' | 'resource' | 'platform' | 'goal' | 'dependency';
  description: string;
  severity: 'soft' | 'hard';
  parameters: Record<string, unknown>;
}

export class ActivityScheduler {
  private agent: AutonomousAgent;
  private config: ActivitySchedulerConfig;
  private eventBus: EventBus;
  private logger: Logger;
  
  private isRunning = false;
  private scheduledActivities: Map<string, ScheduledActivity> = new Map();
  private activeActivities: Map<string, ScheduledActivity> = new Map();
  private platformAllocations: Map<string, PlatformTimeAllocation> = new Map();
  private performanceHistory: ActivityPerformance[] = [];
  
  private schedulingTimer?: NodeJS.Timeout;
  private lastSchedulingRun = 0;

  constructor(
    agent: AutonomousAgent,
    config: ActivitySchedulerConfig,
    eventBus: EventBus
  ) {
    this.agent = agent;
    this.config = config;
    this.eventBus = eventBus;
    this.logger = new Logger(`activity-scheduler-${agent.id}`);

    this.initializePlatformAllocations();
    this.registerEventHandlers();
  }

  /**
   * Start the activity scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Activity scheduler already running');
      return;
    }

    this.logger.info('Starting activity scheduler...');
    this.isRunning = true;

    // Load existing scheduled activities
    await this.loadScheduledActivities();

    // Initialize daily schedule if needed
    await this.initializeDailySchedule();

    // Start scheduling loop
    this.startSchedulingLoop();

    this.logger.info('Activity scheduler started successfully');
  }

  /**
   * Stop the activity scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping activity scheduler...');
    this.isRunning = false;

    // Clear scheduling timer
    if (this.schedulingTimer) {
      clearTimeout(this.schedulingTimer);
      this.schedulingTimer = undefined;
    }

    // Complete active activities gracefully
    await this.completeActiveActivities();

    // Save state
    await this.saveSchedulerState();

    this.logger.info('Activity scheduler stopped');
  }

  /**
   * Schedule a new activity
   */
  async scheduleActivity(activity: Omit<ScheduledActivity, 'id' | 'status'>): Promise<string> {
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const scheduledActivity: ScheduledActivity = {
      ...activity,
      id: activityId,
      status: ActivityStatus.SCHEDULED
    };

    // Validate scheduling constraints
    const validation = await this.validateActivityScheduling(scheduledActivity);
    if (!validation.valid) {
      throw new Error(`Cannot schedule activity: ${validation.reason}`);
    }

    // Optimize scheduling time if adaptive timing is enabled
    if (this.config.adaptiveTiming.enabled) {
      scheduledActivity.scheduledTime = await this.optimizeSchedulingTime(scheduledActivity);
    }

    this.scheduledActivities.set(activityId, scheduledActivity);

    // Emit scheduling event
    await this.eventBus.publish({
      id: `event_${Date.now()}`,
      type: 'activity_scheduled',
      source: 'activity_scheduler',
      data: {
        agentId: this.agent.id,
        activityId,
        activityType: scheduledActivity.activityType,
        platform: scheduledActivity.platform,
        scheduledTime: scheduledActivity.scheduledTime,
        priority: scheduledActivity.priority
      },
      timestamp: new Date(),
      processed: false
    });

    this.logger.info(`Scheduled activity: ${activityId} (${scheduledActivity.activityType}) for ${scheduledActivity.scheduledTime}`);
    return activityId;
  }

  /**
   * Cancel a scheduled activity
   */
  async cancelActivity(activityId: string, reason?: string): Promise<void> {
    const activity = this.scheduledActivities.get(activityId);
    if (!activity) {
      throw new Error(`Activity not found: ${activityId}`);
    }

    if (activity.status === ActivityStatus.EXECUTING) {
      // Stop executing activity
      await this.stopActivity(activityId);
    }

    activity.status = ActivityStatus.CANCELLED;
    this.scheduledActivities.delete(activityId);

    await this.eventBus.publish({
      id: `event_${Date.now()}`,
      type: 'activity_cancelled',
      source: 'activity_scheduler',
      data: {
        agentId: this.agent.id,
        activityId,
        reason: reason || 'Manual cancellation'
      },
      timestamp: new Date(),
      processed: false
    });

    this.logger.info(`Cancelled activity: ${activityId} - ${reason || 'Manual cancellation'}`);
  }

  /**
   * Get current schedule
   */
  getSchedule(timeRange?: { start: Date; end: Date }): ScheduledActivity[] {
    let activities = Array.from(this.scheduledActivities.values());

    if (timeRange) {
      activities = activities.filter(activity => 
        activity.scheduledTime >= timeRange.start && 
        activity.scheduledTime <= timeRange.end
      );
    }

    return activities.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  /**
   * Get platform time allocations
   */
  getPlatformAllocations(): PlatformTimeAllocation[] {
    return Array.from(this.platformAllocations.values());
  }

  /**
   * Get scheduler performance metrics
   */
  getPerformanceMetrics(): {
    totalActivities: number;
    completedActivities: number;
    failedActivities: number;
    averageDuration: number;
    platformEfficiency: Record<string, number>;
    goalAlignment: number;
    adaptiveOptimization: number;
  } {
    const completed = this.performanceHistory.filter(p => p.success);
    const failed = this.performanceHistory.filter(p => !p.success);
    
    const avgDuration = this.performanceHistory.length > 0 
      ? this.performanceHistory.reduce((sum, p) => sum + p.duration, 0) / this.performanceHistory.length
      : 0;

    const platformEfficiency: Record<string, number> = {};
    for (const [platform, allocation] of this.platformAllocations) {
      platformEfficiency[platform] = allocation.efficiency;
    }

    const goalAlignment = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, p) => sum + p.goalProgress, 0) / this.performanceHistory.length
      : 0;

    const adaptiveOptimization = this.calculateAdaptiveOptimizationScore();

    return {
      totalActivities: this.performanceHistory.length,
      completedActivities: completed.length,
      failedActivities: failed.length,
      averageDuration: avgDuration,
      platformEfficiency,
      goalAlignment,
      adaptiveOptimization
    };
  }

  /**
   * Main scheduling loop
   */
  private startSchedulingLoop(): void {
    const runScheduler = async () => {
      if (!this.isRunning) return;

      try {
        const startTime = Date.now();

        // 1. Check for activities ready to execute
        await this.checkReadyActivities();

        // 2. Update platform time allocations
        await this.updatePlatformAllocations();

        // 3. Generate new activities based on goals and platform balance
        await this.generateScheduledActivities();

        // 4. Optimize existing schedule if needed
        if (this.config.adaptiveTiming.enabled) {
          await this.optimizeSchedule();
        }

        // 5. Clean up completed activities
        await this.cleanupCompletedActivities();

        const processingTime = Date.now() - startTime;
        const sleepTime = Math.max(0, this.config.tickInterval - processingTime);

        this.schedulingTimer = setTimeout(runScheduler, sleepTime);
        this.lastSchedulingRun = Date.now();

      } catch (error) {
        this.logger.error('Error in scheduling loop:', error);
        this.schedulingTimer = setTimeout(runScheduler, this.config.tickInterval);
      }
    };

    runScheduler();
  }

  /**
   * Check for activities that are ready to execute
   */
  private async checkReadyActivities(): Promise<void> {
    const now = new Date();
    const readyActivities: ScheduledActivity[] = [];

    for (const activity of this.scheduledActivities.values()) {
      if (activity.status === ActivityStatus.SCHEDULED && activity.scheduledTime <= now) {
        // Check dependencies
        const dependenciesMet = await this.checkActivityDependencies(activity);
        if (dependenciesMet) {
          activity.status = ActivityStatus.READY;
          readyActivities.push(activity);
        }
      }
    }

    // Execute ready activities (respecting concurrency limits)
    for (const activity of readyActivities) {
      if (this.activeActivities.size < this.config.maxConcurrentActivities) {
        await this.executeActivity(activity);
      } else {
        // Postpone if at capacity
        activity.status = ActivityStatus.POSTPONED;
        activity.scheduledTime = new Date(now.getTime() + 5 * 60 * 1000); // Retry in 5 minutes
      }
    }
  }

  /**
   * Execute an activity
   */
  private async executeActivity(activity: ScheduledActivity): Promise<void> {
    this.logger.info(`Executing activity: ${activity.id} (${activity.activityType})`);

    activity.status = ActivityStatus.EXECUTING;
    activity.actualStartTime = new Date();
    this.activeActivities.set(activity.id, activity);

    try {
      // Create agent action for the activity
      const action: AgentAction = {
        id: `action_${activity.id}`,
        agentId: this.agent.id,
        type: this.mapActivityTypeToActionCategory(activity.activityType),
        extension: activity.platform,
        action: activity.activityType,
        parameters: {
          ...activity.parameters,
          scheduledActivityId: activity.id,
          goalIds: activity.goalIds,
          priority: activity.priority
        },
        status: ActionStatus.PENDING,
        timestamp: new Date()
      };

      // Emit activity execution event
      await this.eventBus.publish({
        id: `event_${Date.now()}`,
        type: 'activity_execution_started',
        source: 'activity_scheduler',
        data: {
          agentId: this.agent.id,
          activityId: activity.id,
          actionId: action.id,
          activityType: activity.activityType,
          platform: activity.platform
        },
        timestamp: new Date(),
        processed: false
      });

      // The actual execution will be handled by the appropriate extension
      // We'll track completion through event handlers

    } catch (error) {
      this.logger.error(`Failed to execute activity ${activity.id}:`, error);
      await this.completeActivity(activity, false, error as Error);
    }
  }

  /**
   * Complete an activity and record performance
   */
  private async completeActivity(
    activity: ScheduledActivity, 
    success: boolean, 
    error?: Error
  ): Promise<void> {
    activity.actualEndTime = new Date();
    activity.status = success ? ActivityStatus.COMPLETED : ActivityStatus.FAILED;

    const duration = activity.actualStartTime && activity.actualEndTime
      ? (activity.actualEndTime.getTime() - activity.actualStartTime.getTime()) / (1000 * 60)
      : activity.estimatedDuration;

    // Record performance
    const performance: ActivityPerformance = {
      timestamp: new Date(),
      duration,
      success,
      goalProgress: await this.calculateGoalProgress(activity),
      platformEngagement: await this.calculatePlatformEngagement(activity),
      resourceEfficiency: await this.calculateResourceEfficiency(activity)
    };

    this.performanceHistory.push(performance);

    // Update adaptive data
    if (this.config.adaptiveTiming.enabled) {
      await this.updateActivityAdaptiveData(activity, performance);
    }

    // Update platform allocation
    await this.updatePlatformAllocationUsage(activity.platform, duration, performance);

    this.activeActivities.delete(activity.id);
    this.scheduledActivities.delete(activity.id);

    // Emit completion event
    await this.eventBus.publish({
      id: `event_${Date.now()}`,
      type: 'activity_completed',
      source: 'activity_scheduler',
      data: {
        agentId: this.agent.id,
        activityId: activity.id,
        success,
        duration,
        performance,
        error: error?.message
      },
      timestamp: new Date(),
      processed: false
    });

    this.logger.info(`Activity completed: ${activity.id} - Success: ${success}, Duration: ${duration}min`);
  }

  // Helper methods for initialization and utilities
  private initializePlatformAllocations(): void {
    const platforms = ['twitter', 'telegram', 'discord', 'runelite', 'api'];
    
    for (const platform of platforms) {
      this.platformAllocations.set(platform, {
        platform,
        allocatedMinutes: this.calculateDailyPlatformAllocation(platform),
        usedMinutes: 0,
        efficiency: 0.8, // Default efficiency
        lastActivity: new Date(0),
        priority: this.calculatePlatformPriority(platform)
      });
    }
  }

  private calculateDailyPlatformAllocation(platform: string): number {
    if (!this.config.platformBalancing.enabled) {
      return 480; // 8 hours default
    }

    const totalMinutes = 24 * 60;
    const platformCount = this.platformAllocations.size || 5;
    
    switch (this.config.platformBalancing.balanceStrategy) {
      case 'equal':
        return Math.floor(totalMinutes / platformCount);
      case 'weighted':
        return this.getWeightedPlatformAllocation(platform, totalMinutes);
      case 'adaptive':
        return this.getAdaptivePlatformAllocation(platform, totalMinutes);
      default:
        return Math.floor(totalMinutes / platformCount);
    }
  }

  private getWeightedPlatformAllocation(platform: string, totalMinutes: number): number {
    const weights: Record<string, number> = {
      'twitter': 0.25,
      'telegram': 0.20,
      'discord': 0.20,
      'runelite': 0.25,
      'api': 0.10
    };
    
    return Math.floor(totalMinutes * (weights[platform] || 0.2));
  }

  private getAdaptivePlatformAllocation(platform: string, totalMinutes: number): number {
    // Base allocation on historical performance and goal alignment
    const allocation = this.platformAllocations.get(platform);
    if (!allocation) {
      return Math.floor(totalMinutes / 5); // Default equal split
    }

    const baseAllocation = Math.floor(totalMinutes / 5);
    const efficiencyMultiplier = allocation.efficiency;
    const priorityMultiplier = allocation.priority;

    return Math.floor(baseAllocation * efficiencyMultiplier * priorityMultiplier);
  }

  private calculatePlatformPriority(platform: string): number {
    // Calculate priority based on agent goals and configuration
    const goalPlatformRelevance: Record<string, number> = {
      'twitter': 0.9,
      'telegram': 0.8,
      'discord': 0.8,
      'runelite': 0.9,
      'api': 0.6
    };

    return goalPlatformRelevance[platform] || 0.7;
  }

  // Stub methods to be implemented based on specific requirements
  private async loadScheduledActivities(): Promise<void> {
    // Load from persistent storage
    this.logger.debug('Loading scheduled activities from storage');
  }

  private async initializeDailySchedule(): Promise<void> {
    // Generate initial daily schedule based on goals and platform balance
    this.logger.debug('Initializing daily schedule');
  }

  private async validateActivityScheduling(activity: ScheduledActivity): Promise<{ valid: boolean; reason?: string }> {
    // Validate scheduling constraints
    return { valid: true };
  }

  private async optimizeSchedulingTime(activity: ScheduledActivity): Promise<Date> {
    // Use adaptive data to find optimal scheduling time
    return activity.scheduledTime;
  }

  private async checkActivityDependencies(activity: ScheduledActivity): Promise<boolean> {
    // Check if all dependencies are met
    return activity.dependencies.length === 0;
  }

  private mapActivityTypeToActionCategory(activityType: ActivityType): string {
    const mapping: Record<ActivityType, string> = {
      [ActivityType.SOCIAL_INTERACTION]: 'communication',
      [ActivityType.CONTENT_CREATION]: 'creation',
      [ActivityType.LEARNING]: 'learning',
      [ActivityType.EXPLORATION]: 'exploration',
      [ActivityType.GOAL_PLANNING]: 'planning',
      [ActivityType.MAINTENANCE]: 'maintenance',
      [ActivityType.GAMING]: 'gaming',
      [ActivityType.COMMUNITY_ENGAGEMENT]: 'communication',
      [ActivityType.SKILL_DEVELOPMENT]: 'learning',
      [ActivityType.REFLECTION]: 'reflection'
    };

    return mapping[activityType] || 'general';
  }

  private async stopActivity(activityId: string): Promise<void> {
    const activity = this.activeActivities.get(activityId);
    if (activity) {
      await this.completeActivity(activity, false, new Error('Activity stopped'));
    }
  }

  private async completeActiveActivities(): Promise<void> {
    const activeActivities = Array.from(this.activeActivities.values());
    for (const activity of activeActivities) {
      await this.completeActivity(activity, false, new Error('Scheduler stopped'));
    }
  }

  private async saveSchedulerState(): Promise<void> {
    // Save scheduler state to persistent storage
    this.logger.debug('Saving scheduler state');
  }

  private async updatePlatformAllocations(): Promise<void> {
    // Update platform time allocations based on usage and performance
    this.logger.debug('Updating platform allocations');
  }

  private async generateScheduledActivities(): Promise<void> {
    // Generate new activities based on goals and platform balance
    this.logger.debug('Generating scheduled activities');
  }

  private async optimizeSchedule(): Promise<void> {
    // Optimize existing schedule based on adaptive learning
    this.logger.debug('Optimizing schedule');
  }

  private async cleanupCompletedActivities(): Promise<void> {
    // Clean up old completed activities
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.performanceHistory = this.performanceHistory.filter(p => p.timestamp > cutoffTime);
  }

  private async calculateGoalProgress(activity: ScheduledActivity): Promise<number> {
    // Calculate how much this activity contributed to goal progress
    return 0.5; // Placeholder
  }

  private async calculatePlatformEngagement(activity: ScheduledActivity): Promise<number> {
    // Calculate platform engagement score
    return 0.7; // Placeholder
  }

  private async calculateResourceEfficiency(activity: ScheduledActivity): Promise<number> {
    // Calculate resource efficiency
    return 0.8; // Placeholder
  }

  private async updateActivityAdaptiveData(activity: ScheduledActivity, performance: ActivityPerformance): Promise<void> {
    // Update adaptive data for future optimization
    this.logger.debug(`Updating adaptive data for activity ${activity.id}`);
  }

  private async updatePlatformAllocationUsage(platform: string, duration: number, performance: ActivityPerformance): Promise<void> {
    const allocation = this.platformAllocations.get(platform);
    if (allocation) {
      allocation.usedMinutes += duration;
      allocation.efficiency = (allocation.efficiency + performance.resourceEfficiency) / 2;
      allocation.lastActivity = new Date();
    }
  }

  private calculateAdaptiveOptimizationScore(): number {
    // Calculate how well the adaptive optimization is working
    return 0.75; // Placeholder
  }

  private registerEventHandlers(): void {
    // Register event handlers for activity completion, goal updates, etc.
    this.logger.debug('Registering event handlers');
  }
}

/**
 * Create default activity scheduler configuration
 */
export function createDefaultActivitySchedulerConfig(): ActivitySchedulerConfig {
  return {
    enabled: true,
    tickInterval: 30000, // 30 seconds
    maxConcurrentActivities: 3,
    platformBalancing: {
      enabled: true,
      minTimePerPlatform: 60, // 1 hour minimum
      maxTimePerPlatform: 480, // 8 hours maximum
      balanceStrategy: 'adaptive'
    },
    goalAlignment: {
      enabled: true,
      goalPriorityWeight: 0.7,
      progressThreshold: 0.1
    },
    adaptiveTiming: {
      enabled: true,
      learningRate: 0.1,
      performanceWindow: 24, // 24 hours
      optimalTimeDetection: true
    },
    timeZone: 'UTC',
    workingHours: {
      start: 6,
      end: 22,
      enabled: true
    }
  };
}