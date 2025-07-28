/**
 * GraphQL API for SYMindX
 * Provides a modern GraphQL interface alongside REST API
 */

import { createServer } from 'http';

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLID,
  GraphQLScalarType,
  buildSchema,
  execute,
  subscribe,
  parse,
  validate,
  ExecutionResult,
} from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { PubSub } from 'graphql-subscriptions';
import { GraphQLJSON, GraphQLJSONObject } from 'graphql-type-json';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import { Agent, AgentStatus } from '../../types/agent.js';
import { EmotionState } from '../../types/emotion.js';
import { MemoryRecord } from '../../types/memory.js';
import { runtimeLogger } from '../../utils/logger.js';

// Create PubSub instance for real-time subscriptions
const pubsub = new PubSub();

// Subscription topics
export enum SubscriptionTopic {
  AGENT_UPDATE = 'AGENT_UPDATE',
  MEMORY_ADDED = 'MEMORY_ADDED',
  EMOTION_CHANGED = 'EMOTION_CHANGED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
  PERFORMANCE_METRIC = 'PERFORMANCE_METRIC',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
}

// GraphQL Types
const AgentStatusEnum = new GraphQLEnumType({
  name: 'AgentStatus',
  values: {
    INITIALIZING: { value: AgentStatus.INITIALIZING },
    ACTIVE: { value: AgentStatus.ACTIVE },
    IDLE: { value: AgentStatus.IDLE },
    THINKING: { value: AgentStatus.THINKING },
    PAUSED: { value: AgentStatus.PAUSED },
    ERROR: { value: AgentStatus.ERROR },
    STOPPING: { value: AgentStatus.STOPPING },
    DISABLED: { value: AgentStatus.DISABLED },
  },
});

const AgentTypeEnum = new GraphQLEnumType({
  name: 'AgentType',
  values: {
    AUTONOMOUS: { value: 'autonomous' },
    ASSISTANT: { value: 'assistant' },
    SPECIALIST: { value: 'specialist' },
    COORDINATOR: { value: 'coordinator' },
  },
});

const EmotionStateType = new GraphQLObjectType({
  name: 'EmotionState',
  fields: {
    primaryEmotion: { type: GraphQLString },
    intensity: { type: GraphQLFloat },
    secondaryEmotions: { type: new GraphQLList(GraphQLString) },
    timestamp: { type: GraphQLString },
  },
});

const MemoryRecordType = new GraphQLObjectType({
  name: 'MemoryRecord',
  fields: {
    id: { type: GraphQLID },
    content: { type: GraphQLString },
    type: { type: GraphQLString },
    timestamp: { type: DateTimeResolver },
    importance: { type: GraphQLFloat },
    metadata: { type: GraphQLJSONObject },
    embedding: { type: new GraphQLList(GraphQLFloat) },
  },
});

const CognitionStateType = new GraphQLObjectType({
  name: 'CognitionState',
  fields: {
    mode: { type: GraphQLString },
    load: { type: GraphQLFloat },
    processing: { type: GraphQLString },
    activeThoughts: { type: GraphQLInt },
    planningDepth: { type: GraphQLInt },
  },
});

const PerformanceMetricsType = new GraphQLObjectType({
  name: 'PerformanceMetrics',
  fields: {
    responseTime: { type: GraphQLFloat },
    memoryUsage: { type: GraphQLFloat },
    cpuUsage: { type: GraphQLFloat },
    requestsPerMinute: { type: GraphQLInt },
    errorRate: { type: GraphQLFloat },
  },
});

const PortalInfoType = new GraphQLObjectType({
  name: 'PortalInfo',
  fields: {
    id: { type: GraphQLString },
    type: { type: GraphQLString },
    status: { type: GraphQLString },
    model: { type: GraphQLString },
    temperature: { type: GraphQLFloat },
    maxTokens: { type: GraphQLInt },
  },
});

const AgentType = new GraphQLObjectType({
  name: 'Agent',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(AgentStatusEnum) },
    type: { type: new GraphQLNonNull(AgentTypeEnum) },
    version: { type: GraphQLString },
    enabled: { type: GraphQLBoolean },
    description: { type: GraphQLString },
    emotion: { type: EmotionStateType },
    cognition: { type: CognitionStateType },
    performance: { type: PerformanceMetricsType },
    portal: { type: PortalInfoType },
    memory: {
      type: new GraphQLObjectType({
        name: 'MemoryStats',
        fields: {
          totalRecords: { type: GraphQLInt },
          recentRecords: { type: GraphQLInt },
          oldestRecord: { type: DateTimeResolver },
          newestRecord: { type: DateTimeResolver },
        },
      }),
    },
    extensions: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: 'ExtensionInfo',
          fields: {
            id: { type: GraphQLString },
            name: { type: GraphQLString },
            type: { type: GraphQLString },
            enabled: { type: GraphQLBoolean },
            status: { type: GraphQLString },
          },
        })
      ),
    },
    lastActivity: { type: DateTimeResolver },
    createdAt: { type: DateTimeResolver },
    metadata: { type: GraphQLJSONObject },
  },
});

const ChatMessageInput = new GraphQLInputObjectType({
  name: 'ChatMessageInput',
  fields: {
    content: { type: new GraphQLNonNull(GraphQLString) },
    conversationId: { type: GraphQLString },
    userId: { type: GraphQLString },
    context: { type: GraphQLJSONObject },
  },
});

const ChatResponseType = new GraphQLObjectType({
  name: 'ChatResponse',
  fields: {
    id: { type: GraphQLID },
    content: { type: GraphQLString },
    conversationId: { type: GraphQLString },
    agentId: { type: GraphQLString },
    timestamp: { type: DateTimeResolver },
    emotion: { type: EmotionStateType },
    metadata: { type: GraphQLJSONObject },
  },
});

const ActionInput = new GraphQLInputObjectType({
  name: 'ActionInput',
  fields: {
    extension: { type: new GraphQLNonNull(GraphQLString) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    parameters: { type: GraphQLJSONObject },
  },
});

const ActionResultType = new GraphQLObjectType({
  name: 'ActionResult',
  fields: {
    success: { type: GraphQLBoolean },
    result: { type: GraphQLJSONObject },
    error: { type: GraphQLString },
    timestamp: { type: DateTimeResolver },
  },
});

const SystemEventType = new GraphQLObjectType({
  name: 'SystemEvent',
  fields: {
    id: { type: GraphQLID },
    type: { type: GraphQLString },
    source: { type: GraphQLString },
    data: { type: GraphQLJSONObject },
    timestamp: { type: DateTimeResolver },
    processed: { type: GraphQLBoolean },
  },
});

// Root Query Type
const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    // Agent queries
    agent: {
      type: AgentType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        return context.getAgent(args.id);
      },
    },
    agents: {
      type: new GraphQLList(AgentType),
      args: {
        status: { type: AgentStatusEnum },
        type: { type: AgentTypeEnum },
        enabled: { type: GraphQLBoolean },
      },
      resolve: async (parent, args, context) => {
        return context.getAgents(args);
      },
    },
    // Memory queries
    memories: {
      type: new GraphQLList(MemoryRecordType),
      args: {
        agentId: { type: new GraphQLNonNull(GraphQLID) },
        limit: { type: GraphQLInt, defaultValue: 50 },
        offset: { type: GraphQLInt, defaultValue: 0 },
        type: { type: GraphQLString },
        search: { type: GraphQLString },
      },
      resolve: async (parent, args, context) => {
        return context.getMemories(args);
      },
    },
    // System queries
    systemStatus: {
      type: new GraphQLObjectType({
        name: 'SystemStatus',
        fields: {
          healthy: { type: GraphQLBoolean },
          uptime: { type: GraphQLFloat },
          version: { type: GraphQLString },
          activeAgents: { type: GraphQLInt },
          totalMemory: { type: GraphQLFloat },
          freeMemory: { type: GraphQLFloat },
          metrics: { type: PerformanceMetricsType },
        },
      }),
      resolve: async (parent, args, context) => {
        return context.getSystemStatus();
      },
    },
  },
});

// Root Mutation Type
const RootMutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    // Chat mutations
    sendMessage: {
      type: ChatResponseType,
      args: {
        agentId: { type: new GraphQLNonNull(GraphQLID) },
        message: { type: new GraphQLNonNull(ChatMessageInput) },
      },
      resolve: async (parent, args, context) => {
        const response = await context.sendMessage(args.agentId, args.message);

        // Publish to subscriptions
        pubsub.publish(SubscriptionTopic.CHAT_MESSAGE, {
          chatMessage: response,
        });

        return response;
      },
    },
    // Agent control mutations
    startAgent: {
      type: AgentType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        return context.startAgent(args.id);
      },
    },
    stopAgent: {
      type: AgentType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        return context.stopAgent(args.id);
      },
    },
    restartAgent: {
      type: AgentType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        return context.restartAgent(args.id);
      },
    },
    // Action execution
    executeAction: {
      type: ActionResultType,
      args: {
        agentId: { type: new GraphQLNonNull(GraphQLID) },
        action: { type: new GraphQLNonNull(ActionInput) },
      },
      resolve: async (parent, args, context) => {
        return context.executeAction(args.agentId, args.action);
      },
    },
    // Memory management
    addMemory: {
      type: MemoryRecordType,
      args: {
        agentId: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: GraphQLString },
        importance: { type: GraphQLFloat },
        metadata: { type: GraphQLJSONObject },
      },
      resolve: async (parent, args, context) => {
        const memory = await context.addMemory(args);

        // Publish to subscriptions
        pubsub.publish(SubscriptionTopic.MEMORY_ADDED, {
          memoryAdded: memory,
        });

        return memory;
      },
    },
    // Agent spawning
    spawnAgent: {
      type: AgentType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(AgentTypeEnum) },
        character: { type: GraphQLString },
        config: { type: GraphQLJSONObject },
      },
      resolve: async (parent, args, context) => {
        return context.spawnAgent(args);
      },
    },
  },
});

// Root Subscription Type
const RootSubscriptionType = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    // Agent updates
    agentUpdate: {
      type: AgentType,
      args: {
        agentId: { type: GraphQLID },
      },
      subscribe: (parent, args) => {
        const topic = args.agentId
          ? SubscriptionTopic.AGENT_UPDATE
          : SubscriptionTopic.AGENT_UPDATE;
        return pubsub.asyncIterator(topic);
      },
    },
    // Chat messages
    chatMessage: {
      type: ChatResponseType,
      args: {
        agentId: { type: GraphQLID },
        conversationId: { type: GraphQLID },
      },
      subscribe: (parent, args) => {
        const topics = [SubscriptionTopic.CHAT_MESSAGE];
        if (args.agentId) {
          topics.push(SubscriptionTopic.CHAT_MESSAGE);
        }
        if (args.conversationId) {
          topics.push(SubscriptionTopic.CHAT_MESSAGE);
        }
        return pubsub.asyncIterator(topics);
      },
    },
    // Memory updates
    memoryAdded: {
      type: MemoryRecordType,
      args: {
        agentId: { type: new GraphQLNonNull(GraphQLID) },
      },
      subscribe: (parent, args) => {
        return pubsub.asyncIterator(SubscriptionTopic.MEMORY_ADDED);
      },
    },
    // Emotion changes
    emotionChanged: {
      type: new GraphQLObjectType({
        name: 'EmotionChange',
        fields: {
          agentId: { type: GraphQLID },
          previousState: { type: EmotionStateType },
          currentState: { type: EmotionStateType },
          trigger: { type: GraphQLString },
          timestamp: { type: DateTimeResolver },
        },
      }),
      args: {
        agentId: { type: GraphQLID },
      },
      subscribe: (parent, args) => {
        const topic = args.agentId
          ? SubscriptionTopic.EMOTION_CHANGED
          : SubscriptionTopic.EMOTION_CHANGED;
        return pubsub.asyncIterator(topic);
      },
    },
    // System events
    systemEvent: {
      type: SystemEventType,
      args: {
        type: { type: GraphQLString },
        source: { type: GraphQLString },
      },
      subscribe: (parent, args) => {
        const topics = [SubscriptionTopic.SYSTEM_EVENT];
        if (args.type) {
          topics.push(SubscriptionTopic.SYSTEM_EVENT);
        }
        if (args.source) {
          topics.push(SubscriptionTopic.SYSTEM_EVENT);
        }
        return pubsub.asyncIterator(topics);
      },
    },
    // Performance metrics
    performanceMetric: {
      type: new GraphQLObjectType({
        name: 'PerformanceMetric',
        fields: {
          agentId: { type: GraphQLID },
          metric: { type: GraphQLString },
          value: { type: GraphQLFloat },
          unit: { type: GraphQLString },
          timestamp: { type: DateTimeResolver },
        },
      }),
      args: {
        agentId: { type: GraphQLID },
        metric: { type: GraphQLString },
      },
      subscribe: (parent, args) => {
        const topics = [SubscriptionTopic.PERFORMANCE_METRIC];
        if (args.agentId) {
          topics.push(SubscriptionTopic.PERFORMANCE_METRIC);
        }
        if (args.metric) {
          topics.push(SubscriptionTopic.PERFORMANCE_METRIC);
        }
        return pubsub.asyncIterator(topics);
      },
    },
    // Error notifications
    errorOccurred: {
      type: new GraphQLObjectType({
        name: 'ErrorNotification',
        fields: {
          id: { type: GraphQLID },
          agentId: { type: GraphQLID },
          error: { type: GraphQLString },
          stack: { type: GraphQLString },
          severity: { type: GraphQLString },
          timestamp: { type: DateTimeResolver },
          context: { type: GraphQLJSONObject },
        },
      }),
      args: {
        agentId: { type: GraphQLID },
        severity: { type: GraphQLString },
      },
      subscribe: (parent, args) => {
        const topics = [SubscriptionTopic.ERROR_OCCURRED];
        if (args.agentId) {
          topics.push(SubscriptionTopic.ERROR_OCCURRED);
        }
        if (args.severity) {
          topics.push(SubscriptionTopic.ERROR_OCCURRED);
        }
        return pubsub.asyncIterator(topics);
      },
    },
  },
});

// Create GraphQL Schema
export const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType,
  subscription: RootSubscriptionType,
});

// GraphQL Context Builder
export interface GraphQLContext {
  // Agent operations
  getAgent: (id: string) => Promise<any>;
  getAgents: (filter: any) => Promise<any[]>;
  startAgent: (id: string) => Promise<any>;
  stopAgent: (id: string) => Promise<any>;
  restartAgent: (id: string) => Promise<any>;
  spawnAgent: (params: any) => Promise<any>;

  // Chat operations
  sendMessage: (agentId: string, message: any) => Promise<any>;

  // Action operations
  executeAction: (agentId: string, action: any) => Promise<any>;

  // Memory operations
  getMemories: (params: any) => Promise<any[]>;
  addMemory: (params: any) => Promise<any>;

  // System operations
  getSystemStatus: () => Promise<any>;

  // User context
  userId?: string;
  sessionId?: string;
  permissions?: string[];
}

// GraphQL Server Setup
export class GraphQLServer {
  private server?: any;
  private subscriptionServer?: SubscriptionServer;

  constructor(
    private httpServer: any,
    private contextBuilder: () => GraphQLContext
  ) {}

  async start(path = '/graphql'): Promise<void> {
    // Set up subscription server
    this.subscriptionServer = new SubscriptionServer(
      {
        execute,
        subscribe,
        schema,
        onConnect: (connectionParams: any) => {
          runtimeLogger.info('GraphQL subscription client connected');
          return {
            ...this.contextBuilder(),
            connectionParams,
          };
        },
        onDisconnect: () => {
          runtimeLogger.info('GraphQL subscription client disconnected');
        },
      },
      {
        server: this.httpServer,
        path: `${path}-subscriptions`,
      }
    );

    runtimeLogger.info(
      `🚀 GraphQL subscriptions ready at ws://localhost:${this.httpServer.address()?.port}${path}-subscriptions`
    );
  }

  async stop(): Promise<void> {
    if (this.subscriptionServer) {
      this.subscriptionServer.close();
    }
  }

  // Publish methods for real-time updates
  publishAgentUpdate(agent: any): void {
    pubsub.publish(SubscriptionTopic.AGENT_UPDATE, { agentUpdate: agent });
    pubsub.publish(SubscriptionTopic.AGENT_UPDATE, { agentUpdate: agent });
  }

  publishChatMessage(message: any): void {
    pubsub.publish(SubscriptionTopic.CHAT_MESSAGE, { chatMessage: message });
    if (message.agentId) {
      pubsub.publish(SubscriptionTopic.CHAT_MESSAGE, { chatMessage: message });
    }
    if (message.conversationId) {
      pubsub.publish(SubscriptionTopic.CHAT_MESSAGE, { chatMessage: message });
    }
  }

  publishEmotionChange(change: any): void {
    pubsub.publish(SubscriptionTopic.EMOTION_CHANGED, {
      emotionChanged: change,
    });
    if (change.agentId) {
      pubsub.publish(SubscriptionTopic.EMOTION_CHANGED, {
        emotionChanged: change,
      });
    }
  }

  publishSystemEvent(event: any): void {
    pubsub.publish(SubscriptionTopic.SYSTEM_EVENT, { systemEvent: event });
    if (event.type) {
      pubsub.publish(SubscriptionTopic.SYSTEM_EVENT, { systemEvent: event });
    }
    if (event.source) {
      pubsub.publish(SubscriptionTopic.SYSTEM_EVENT, { systemEvent: event });
    }
  }

  publishPerformanceMetric(metric: any): void {
    pubsub.publish(SubscriptionTopic.PERFORMANCE_METRIC, {
      performanceMetric: metric,
    });
    if (metric.agentId) {
      pubsub.publish(SubscriptionTopic.PERFORMANCE_METRIC, {
        performanceMetric: metric,
      });
    }
    if (metric.metric) {
      pubsub.publish(SubscriptionTopic.PERFORMANCE_METRIC, {
        performanceMetric: metric,
      });
    }
  }

  publishError(error: any): void {
    pubsub.publish(SubscriptionTopic.ERROR_OCCURRED, { errorOccurred: error });
    if (error.agentId) {
      pubsub.publish(SubscriptionTopic.ERROR_OCCURRED, {
        errorOccurred: error,
      });
    }
    if (error.severity) {
      pubsub.publish(SubscriptionTopic.ERROR_OCCURRED, {
        errorOccurred: error,
      });
    }
  }
}

// Export pubsub for external use
export { pubsub };
