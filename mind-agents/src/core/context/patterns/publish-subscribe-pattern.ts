/**
 * Publish-Subscribe Pattern for Multi-Agent Context Coordination
 * 
 * Implements event-based context updates where agents can publish
 * context changes to topics and subscribe to receive updates.
 */

import { EventEmitter } from 'events';
import {
  AgentContext,
  ContextUpdate
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Topic subscription information
 */
export interface TopicSubscription {
  subscriberId: AgentId;
  topic: string;
  subscribedAt: string;
  lastMessage: string;
  messageCount: number;
  isActive: boolean;
  filters?: SubscriptionFilter[];
  deliveryMode: 'immediate' | 'batch' | 'delayed';
  maxBatchSize?: number;
  batchTimeout?: number;
}

/**
 * Message filtering criteria
 */
export interface SubscriptionFilter {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'range' | 'custom';
  value: unknown;
  customFilter?: (context: AgentContext, update: ContextUpdate) => boolean;
}

/**
 * Published message information
 */
export interface PublishedMessage {
  messageId: string;
  publisherId: AgentId;
  topic: string;
  context: AgentContext;
  update: ContextUpdate;
  publishedAt: string;
  ttl: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Topic information and statistics
 */
export interface TopicInfo {
  name: string;
  subscriberCount: number;
  messageCount: number;
  lastMessage?: string;
  retentionPolicy: {
    maxMessages: number;
    maxAge: number; // milliseconds
    autoDelete: boolean;
  };
  accessControl: {
    publicRead: boolean;
    publicWrite: boolean;
    allowedPublishers?: AgentId[];
    allowedSubscribers?: AgentId[];
  };
}

/**
 * Batch delivery information
 */
export interface BatchDelivery {
  batchId: string;
  subscriberId: AgentId;
  topic: string;
  messages: PublishedMessage[];
  createdAt: string;
  scheduledDelivery: string;
  status: 'pending' | 'delivered' | 'failed';
}

/**
 * Implements publish-subscribe coordination pattern
 */
export class PublishSubscribePattern extends EventEmitter {
  private topics: Map<string, TopicInfo> = new Map();
  private subscriptions: Map<string, TopicSubscription[]> = new Map();
  private messageQueue: Map<string, PublishedMessage[]> = new Map();
  private batchQueues: Map<AgentId, Map<string, PublishedMessage[]>> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private messageHistory: Map<string, PublishedMessage[]> = new Map();

  private readonly defaultRetention = {
    maxMessages: 1000,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    autoDelete: true
  };

  private readonly defaultAccessControl = {
    publicRead: true,
    publicWrite: true
  };

  constructor() {
    super();
    this.setupCleanup();
  }

  /**
   * Create a new topic
   */
  async createTopic(
    topicName: string,
    options?: {
      retentionPolicy?: Partial<TopicInfo['retentionPolicy']>;
      accessControl?: Partial<TopicInfo['accessControl']>;
    }
  ): Promise<OperationResult> {
    try {
      if (this.topics.has(topicName)) {
        return {
          success: false,
          error: 'Topic already exists',
          metadata: { operation: 'createTopic' }
        };
      }

      const topicInfo: TopicInfo = {
        name: topicName,
        subscriberCount: 0,
        messageCount: 0,
        retentionPolicy: {
          ...this.defaultRetention,
          ...options?.retentionPolicy
        },
        accessControl: {
          ...this.defaultAccessControl,
          ...options?.accessControl
        }
      };

      this.topics.set(topicName, topicInfo);
      this.subscriptions.set(topicName, []);
      this.messageQueue.set(topicName, []);
      this.messageHistory.set(topicName, []);

      this.emit('topicCreated', {
        topicName,
        timestamp: new Date().toISOString()
      });

      runtimeLogger.debug('Topic created', { topicName });

      return {
        success: true,
        data: {
          topicName,
          retentionPolicy: topicInfo.retentionPolicy,
          accessControl: topicInfo.accessControl
        },
        metadata: {
          operation: 'createTopic',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Topic creation failed: ${(error as Error).message}`,
        metadata: {
          operation: 'createTopic',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(
    subscriberId: AgentId,
    topic: string,
    options?: {
      filters?: SubscriptionFilter[];
      deliveryMode?: 'immediate' | 'batch' | 'delayed';
      maxBatchSize?: number;
      batchTimeout?: number;
    }
  ): Promise<OperationResult> {
    try {
      // Create topic if it doesn't exist
      if (!this.topics.has(topic)) {
        await this.createTopic(topic);
      }

      const topicInfo = this.topics.get(topic)!;

      // Check access control
      if (!this.canSubscribe(subscriberId, topicInfo)) {
        return {
          success: false,
          error: 'Access denied for topic subscription',
          metadata: { operation: 'subscribe' }
        };
      }

      // Check if already subscribed
      const existingSubscriptions = this.subscriptions.get(topic)!;
      const existingIndex = existingSubscriptions.findIndex(s => s.subscriberId === subscriberId);

      if (existingIndex !== -1) {
        // Update existing subscription
        const existing = existingSubscriptions[existingIndex];
        existing.filters = options?.filters;
        existing.deliveryMode = options?.deliveryMode || existing.deliveryMode;
        existing.maxBatchSize = options?.maxBatchSize;
        existing.batchTimeout = options?.batchTimeout;
        existing.isActive = true;

        runtimeLogger.debug('Subscription updated', { subscriberId, topic });
      } else {
        // Create new subscription
        const subscription: TopicSubscription = {
          subscriberId,
          topic,
          subscribedAt: new Date().toISOString(),
          lastMessage: new Date().toISOString(),
          messageCount: 0,
          isActive: true,
          filters: options?.filters,
          deliveryMode: options?.deliveryMode || 'immediate',
          maxBatchSize: options?.maxBatchSize || 10,
          batchTimeout: options?.batchTimeout || 5000
        };

        existingSubscriptions.push(subscription);
        topicInfo.subscriberCount++;

        // Initialize batch queue if needed
        if (subscription.deliveryMode === 'batch') {
          if (!this.batchQueues.has(subscriberId)) {
            this.batchQueues.set(subscriberId, new Map());
          }
          this.batchQueues.get(subscriberId)!.set(topic, []);
          this.setupBatchTimer(subscriberId, topic, subscription.batchTimeout!);
        }

        runtimeLogger.debug('New subscription created', { subscriberId, topic });
      }

      this.emit('subscribed', {
        subscriberId,
        topic,
        deliveryMode: options?.deliveryMode || 'immediate',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: {
          subscriberId,
          topic,
          subscriberCount: topicInfo.subscriberCount
        },
        metadata: {
          operation: 'subscribe',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Subscription failed: ${(error as Error).message}`,
        metadata: {
          operation: 'subscribe',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(subscriberId: AgentId, topic: string): Promise<OperationResult> {
    try {
      const subscriptions = this.subscriptions.get(topic);
      if (!subscriptions) {
        return {
          success: false,
          error: 'Topic not found',
          metadata: { operation: 'unsubscribe' }
        };
      }

      const subscriptionIndex = subscriptions.findIndex(s => s.subscriberId === subscriberId);
      if (subscriptionIndex === -1) {
        return {
          success: false,
          error: 'Subscription not found',
          metadata: { operation: 'unsubscribe' }
        };
      }

      // Remove subscription
      subscriptions.splice(subscriptionIndex, 1);

      // Update topic info
      const topicInfo = this.topics.get(topic)!;
      topicInfo.subscriberCount--;

      // Clean up batch queue and timer
      const batchQueue = this.batchQueues.get(subscriberId);
      if (batchQueue) {
        batchQueue.delete(topic);
        if (batchQueue.size === 0) {
          this.batchQueues.delete(subscriberId);
        }
      }

      const timerKey = `${subscriberId}:${topic}`;
      const timer = this.batchTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.batchTimers.delete(timerKey);
      }

      this.emit('unsubscribed', {
        subscriberId,
        topic,
        timestamp: new Date().toISOString()
      });

      runtimeLogger.debug('Unsubscribed from topic', { subscriberId, topic });

      return {
        success: true,
        data: {
          subscriberId,
          topic,
          remainingSubscribers: topicInfo.subscriberCount
        },
        metadata: {
          operation: 'unsubscribe',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Unsubscription failed: ${(error as Error).message}`,
        metadata: {
          operation: 'unsubscribe',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Publish context update to a topic
   */
  async publish(
    publisherId: AgentId,
    topic: string,
    context: AgentContext,
    update: ContextUpdate,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      tags?: string[];
      ttl?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<OperationResult> {
    try {
      // Create topic if it doesn't exist
      if (!this.topics.has(topic)) {
        await this.createTopic(topic);
      }

      const topicInfo = this.topics.get(topic)!;

      // Check access control
      if (!this.canPublish(publisherId, topicInfo)) {
        return {
          success: false,
          error: 'Access denied for topic publishing',
          metadata: { operation: 'publish' }
        };
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const message: PublishedMessage = {
        messageId,
        publisherId,
        topic,
        context,
        update,
        publishedAt: now,
        ttl: options?.ttl || 60000, // 1 minute default
        priority: options?.priority || 'normal',
        tags: options?.tags,
        metadata: options?.metadata
      };

      // Add to message queue
      const queue = this.messageQueue.get(topic)!;
      queue.push(message);

      // Add to history
      const history = this.messageHistory.get(topic)!;
      history.push(message);

      // Apply retention policy
      this.applyRetentionPolicy(topic);

      // Update topic info
      topicInfo.messageCount++;
      topicInfo.lastMessage = now;

      // Deliver to subscribers
      const deliveryResults = await this.deliverToSubscribers(topic, message);

      this.emit('messagePublished', {
        messageId,
        publisherId,
        topic,
        subscriberCount: deliveryResults.totalSubscribers,
        deliveredCount: deliveryResults.deliveredCount,
        timestamp: now
      });

      runtimeLogger.debug('Message published to topic', {
        messageId,
        publisherId,
        topic,
        subscriberCount: deliveryResults.totalSubscribers
      });

      return {
        success: true,
        data: {
          messageId,
          topic,
          totalSubscribers: deliveryResults.totalSubscribers,
          deliveredCount: deliveryResults.deliveredCount,
          batchedCount: deliveryResults.batchedCount
        },
        metadata: {
          operation: 'publish',
          timestamp: now
        }
      };

    } catch (error) {
      runtimeLogger.error('Message publishing failed', error as Error, {
        publisherId,
        topic
      });

      return {
        success: false,
        error: `Publishing failed: ${(error as Error).message}`,
        metadata: {
          operation: 'publish',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get topic information
   */
  getTopicInfo(topicName: string): TopicInfo | undefined {
    return this.topics.get(topicName);
  }

  /**
   * List all topics
   */
  listTopics(): TopicInfo[] {
    return Array.from(this.topics.values());
  }

  /**
   * Get subscriptions for a topic
   */
  getTopicSubscriptions(topicName: string): TopicSubscription[] {
    return this.subscriptions.get(topicName) || [];
  }

  /**
   * Get all subscriptions for an agent
   */
  getAgentSubscriptions(agentId: AgentId): TopicSubscription[] {
    const subscriptions: TopicSubscription[] = [];
    
    for (const topicSubscriptions of this.subscriptions.values()) {
      for (const subscription of topicSubscriptions) {
        if (subscription.subscriberId === agentId) {
          subscriptions.push(subscription);
        }
      }
    }
    
    return subscriptions;
  }

  /**
   * Check if agent can subscribe to topic
   */
  private canSubscribe(agentId: AgentId, topicInfo: TopicInfo): boolean {
    if (topicInfo.accessControl.publicRead) {
      return true;
    }

    return topicInfo.accessControl.allowedSubscribers?.includes(agentId) || false;
  }

  /**
   * Check if agent can publish to topic
   */
  private canPublish(agentId: AgentId, topicInfo: TopicInfo): boolean {
    if (topicInfo.accessControl.publicWrite) {
      return true;
    }

    return topicInfo.accessControl.allowedPublishers?.includes(agentId) || false;
  }

  /**
   * Deliver message to all topic subscribers
   */
  private async deliverToSubscribers(
    topic: string,
    message: PublishedMessage
  ): Promise<{ totalSubscribers: number; deliveredCount: number; batchedCount: number }> {
    const subscriptions = this.subscriptions.get(topic) || [];
    let deliveredCount = 0;
    let batchedCount = 0;

    for (const subscription of subscriptions) {
      if (!subscription.isActive) {
        continue;
      }

      // Apply filters
      if (subscription.filters && !this.passesFilters(message, subscription.filters)) {
        continue;
      }

      try {
        switch (subscription.deliveryMode) {
          case 'immediate':
            await this.deliverImmediate(subscription, message);
            deliveredCount++;
            break;

          case 'batch':
            await this.addToBatch(subscription, message);
            batchedCount++;
            break;

          case 'delayed':
            // In a real implementation, this would schedule delivery
            await this.deliverImmediate(subscription, message);
            deliveredCount++;
            break;
        }

        // Update subscription stats
        subscription.lastMessage = message.publishedAt;
        subscription.messageCount++;

      } catch (error) {
        runtimeLogger.error('Failed to deliver message to subscriber', error as Error, {
          messageId: message.messageId,
          subscriberId: subscription.subscriberId,
          topic
        });
      }
    }

    return {
      totalSubscribers: subscriptions.filter(s => s.isActive).length,
      deliveredCount,
      batchedCount
    };
  }

  /**
   * Deliver message immediately
   */
  private async deliverImmediate(subscription: TopicSubscription, message: PublishedMessage): Promise<void> {
    // In a real implementation, this would actually deliver the message
    // For now, we'll just emit an event
    
    this.emit('messageDelivered', {
      subscriberId: subscription.subscriberId,
      messageId: message.messageId,
      topic: message.topic,
      deliveryMode: 'immediate',
      timestamp: new Date().toISOString()
    });

    runtimeLogger.debug('Message delivered immediately', {
      subscriberId: subscription.subscriberId,
      messageId: message.messageId,
      topic: message.topic
    });
  }

  /**
   * Add message to batch queue
   */
  private async addToBatch(subscription: TopicSubscription, message: PublishedMessage): Promise<void> {
    const agentBatchQueues = this.batchQueues.get(subscription.subscriberId);
    if (!agentBatchQueues) {
      return;
    }

    const topicBatch = agentBatchQueues.get(subscription.topic);
    if (!topicBatch) {
      return;
    }

    topicBatch.push(message);

    // Check if batch is full
    if (topicBatch.length >= (subscription.maxBatchSize || 10)) {
      await this.deliverBatch(subscription.subscriberId, subscription.topic);
    }
  }

  /**
   * Deliver batch of messages
   */
  private async deliverBatch(subscriberId: AgentId, topic: string): Promise<void> {
    const agentBatchQueues = this.batchQueues.get(subscriberId);
    if (!agentBatchQueues) {
      return;
    }

    const batch = agentBatchQueues.get(topic);
    if (!batch || batch.length === 0) {
      return;
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create batch delivery
    const batchDelivery: BatchDelivery = {
      batchId,
      subscriberId,
      topic,
      messages: [...batch],
      createdAt: new Date().toISOString(),
      scheduledDelivery: new Date().toISOString(),
      status: 'delivered'
    };

    // Clear the batch
    batch.length = 0;

    this.emit('batchDelivered', {
      batchId,
      subscriberId,
      topic,
      messageCount: batchDelivery.messages.length,
      timestamp: batchDelivery.scheduledDelivery
    });

    runtimeLogger.debug('Batch delivered', {
      batchId,
      subscriberId,
      topic,
      messageCount: batchDelivery.messages.length
    });
  }

  /**
   * Setup batch timer for delayed delivery
   */
  private setupBatchTimer(subscriberId: AgentId, topic: string, timeout: number): void {
    const timerKey = `${subscriberId}:${topic}`;
    
    // Clear existing timer
    const existingTimer = this.batchTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Setup new timer
    const timer = setTimeout(() => {
      this.deliverBatch(subscriberId, topic).catch(error => {
        runtimeLogger.error('Failed to deliver batch on timer', error as Error, {
          subscriberId,
          topic
        });
      });
    }, timeout);

    this.batchTimers.set(timerKey, timer);
  }

  /**
   * Check if message passes subscription filters
   */
  private passesFilters(message: PublishedMessage, filters: SubscriptionFilter[]): boolean {
    for (const filter of filters) {
      if (!this.evaluateFilter(message, filter)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single filter
   */
  private evaluateFilter(message: PublishedMessage, filter: SubscriptionFilter): boolean {
    let fieldValue: unknown;

    // Get field value from message or context
    if (filter.field in message) {
      fieldValue = (message as any)[filter.field];
    } else if (filter.field in message.context) {
      fieldValue = (message.context as any)[filter.field];
    } else if (filter.field in message.update) {
      fieldValue = (message.update as any)[filter.field];
    } else {
      return false; // Field not found
    }

    switch (filter.operator) {
      case 'equals':
        return fieldValue === filter.value;
      
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(filter.value);
        }
        return String(fieldValue).includes(String(filter.value));
      
      case 'regex':
        return new RegExp(String(filter.value)).test(String(fieldValue));
      
      case 'range':
        if (typeof fieldValue === 'number' && Array.isArray(filter.value) && filter.value.length === 2) {
          return fieldValue >= filter.value[0] && fieldValue <= filter.value[1];
        }
        return false;
      
      case 'custom':
        return filter.customFilter 
          ? filter.customFilter(message.context, message.update)
          : false;
      
      default:
        return false;
    }
  }

  /**
   * Apply retention policy to a topic
   */
  private applyRetentionPolicy(topic: string): void {
    const topicInfo = this.topics.get(topic);
    if (!topicInfo || !topicInfo.retentionPolicy.autoDelete) {
      return;
    }

    const queue = this.messageQueue.get(topic)!;
    const history = this.messageHistory.get(topic)!;
    const policy = topicInfo.retentionPolicy;
    const now = Date.now();

    // Remove messages by count
    while (queue.length > policy.maxMessages) {
      queue.shift();
    }

    while (history.length > policy.maxMessages) {
      history.shift();
    }

    // Remove messages by age
    const cutoffTime = now - policy.maxAge;
    
    while (queue.length > 0 && new Date(queue[0].publishedAt).getTime() < cutoffTime) {
      queue.shift();
    }

    while (history.length > 0 && new Date(history[0].publishedAt).getTime() < cutoffTime) {
      history.shift();
    }
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredMessages();
      this.cleanupInactiveSubscriptions();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired messages
   */
  private cleanupExpiredMessages(): void {
    const now = Date.now();

    for (const [topic, queue] of this.messageQueue.entries()) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const message = queue[i];
        const messageTime = new Date(message.publishedAt).getTime();
        
        if (now - messageTime > message.ttl) {
          queue.splice(i, 1);
        }
      }
    }
  }

  /**
   * Clean up inactive subscriptions
   */
  private cleanupInactiveSubscriptions(): void {
    for (const [topic, subscriptions] of this.subscriptions.entries()) {
      const topicInfo = this.topics.get(topic)!;
      let activeCount = 0;

      for (let i = subscriptions.length - 1; i >= 0; i--) {
        const subscription = subscriptions[i];
        
        if (subscription.isActive) {
          activeCount++;
        } else {
          // Remove inactive subscription
          subscriptions.splice(i, 1);
          
          runtimeLogger.debug('Removed inactive subscription', {
            subscriberId: subscription.subscriberId,
            topic
          });
        }
      }

      topicInfo.subscriberCount = activeCount;
    }
  }

  /**
   * Get pattern statistics
   */
  getStatistics() {
    const totalTopics = this.topics.size;
    const totalSubscriptions = Array.from(this.subscriptions.values())
      .reduce((sum, subs) => sum + subs.filter(s => s.isActive).length, 0);
    const totalMessages = Array.from(this.messageQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);
    const totalBatches = Array.from(this.batchQueues.values())
      .reduce((sum, agentQueues) => sum + agentQueues.size, 0);

    return {
      totalTopics,
      totalSubscriptions,
      totalMessages,
      totalBatches,
      activeBatchTimers: this.batchTimers.size,
      avgSubscriptionsPerTopic: totalTopics > 0 ? totalSubscriptions / totalTopics : 0,
      avgMessagesPerTopic: totalTopics > 0 ? totalMessages / totalTopics : 0
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }

    this.topics.clear();
    this.subscriptions.clear();
    this.messageQueue.clear();
    this.batchQueues.clear();
    this.batchTimers.clear();
    this.messageHistory.clear();
    this.removeAllListeners();
  }
}