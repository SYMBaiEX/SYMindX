/**
 * Streaming Skill for API Extension
 *
 * Provides real-time streaming capabilities including:
 * - Server-Sent Events (SSE)
 * - Real-time data streams
 * - Event broadcasting
 * - Stream management
 * - Live monitoring feeds
 * - Chat streaming
 * - Agent activity streams
 */

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
  AgentEvent,
} from '../../../types/agent';
import { SkillParameters, GenericData } from '../../../types/common';
import { runtimeLogger } from '../../../utils/logger';
import { ApiExtension } from '../index';

interface StreamConnection {
  id: string;
  clientId: string;
  type: 'sse' | 'websocket' | 'webhook';
  endpoint: string;
  filters: string[];
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

interface StreamEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  source: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export class StreamingSkill {
  private extension: ApiExtension;
  private streams = new Map<string, StreamConnection>();
  private eventBuffer = new Map<string, StreamEvent[]>();
  private maxBufferSize = 1000;

  constructor(extension: ApiExtension) {
    this.extension = extension;
  }

  /**
   * Get all streaming-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      create_stream: {
        name: 'create_stream',
        description: 'Create a new real-time data stream',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          type: 'string',
          endpoint: 'string',
          filters: 'array',
          clientId: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.createStream(agent, params);
        },
      },

      close_stream: {
        name: 'close_stream',
        description: 'Close an existing stream',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          streamId: 'string',
          reason: 'string',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.closeStream(agent, params);
        },
      },

      send_stream_event: {
        name: 'send_stream_event',
        description: 'Send an event to specific stream(s)',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          streamId: 'string',
          event: 'object',
          priority: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.sendStreamEvent(_agent, params);
        },
      },

      broadcast_event: {
        name: 'broadcast_event',
        description: 'Broadcast an event to all matching streams',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          event: 'object',
          filters: 'array',
          priority: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.broadcastEvent(_agent, params);
        },
      },

      get_stream_status: {
        name: 'get_stream_status',
        description: 'Get status of streaming connections',
        category: ActionCategory.OBSERVATION,
        parameters: {
          streamId: 'string',
          includeBuffer: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getStreamStatus(_agent, params);
        },
      },

      list_streams: {
        name: 'list_streams',
        description: 'List all active streams',
        category: ActionCategory.OBSERVATION,
        parameters: {
          type: 'string',
          clientId: 'string',
          includeMetrics: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.listStreams(_agent, params);
        },
      },

      stream_agent_events: {
        name: 'stream_agent_events',
        description: 'Stream real-time agent events',
        category: ActionCategory.OBSERVATION,
        parameters: {
          agentId: 'string',
          eventTypes: 'array',
          streamId: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.streamAgentEvents(_agent, params);
        },
      },

      stream_chat: {
        name: 'stream_chat',
        description: 'Stream real-time chat messages',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          conversationId: 'string',
          streamId: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.streamChat(_agent, params);
        },
      },

      stream_metrics: {
        name: 'stream_metrics',
        description: 'Stream real-time system metrics',
        category: ActionCategory.OBSERVATION,
        parameters: {
          metrics: 'array',
          interval: 'number',
          streamId: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.streamMetrics(_agent, params);
        },
      },

      configure_stream_filters: {
        name: 'configure_stream_filters',
        description: 'Configure filters for a stream',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          streamId: 'string',
          filters: 'array',
          operation: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.configureStreamFilters(_agent, params);
        },
      },

      get_stream_buffer: {
        name: 'get_stream_buffer',
        description: 'Get buffered events for a stream',
        category: ActionCategory.OBSERVATION,
        parameters: {
          streamId: 'string',
          limit: 'number',
          since: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getStreamBuffer(_agent, params);
        },
      },

      clear_stream_buffer: {
        name: 'clear_stream_buffer',
        description: 'Clear buffered events for a stream',
        category: ActionCategory.SYSTEM,
        parameters: {
          streamId: 'string',
          confirm: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.clearStreamBuffer(_agent, params);
        },
      },

      stream_health_check: {
        name: 'stream_health_check',
        description: 'Check health of streaming system',
        category: ActionCategory.OBSERVATION,
        parameters: {
          detailed: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.streamHealthCheck(_agent, params);
        },
      },
    };
  }

  /**
   * Create a new stream
   */
  private async createStream(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const type = String(params['type'] || 'sse');
      const endpoint = String(params['endpoint']);
      const filters = Array.isArray(params['filters'])
        ? (params['filters'] as string[])
        : [];
      const clientId = String(params['clientId'] || agent.id);

      if (!endpoint) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Endpoint is required',
          metadata: { action: 'create_stream' },
        };
      }

      const streamId = this.generateStreamId();
      const stream: StreamConnection = {
        id: streamId,
        clientId,
        type: type as any,
        endpoint,
        filters,
        isActive: true,
        createdAt: new Date(),
        lastActivity: new Date(),
        metadata: {
          agentId: agent.id,
          userAgent: '', // Would be populated from request headers
        },
      };

      this.streams.set(streamId, stream);
      this.eventBuffer.set(streamId, []);

      // Emit event about stream creation using the agent's event bus if available
      if (agent.eventBus) {
        const streamEvent: AgentEvent = {
          id: `stream-created-${streamId}`,
          agentId: agent.id,
          type: 'stream:created',
          timestamp: new Date(),
          source: 'api',
          processed: false,
          data: {
            streamId,
            agentId: agent.id,
            type,
            endpoint,
            timestamp: new Date().toISOString()
          }
        };
        agent.eventBus.emit(streamEvent);
      }

      runtimeLogger.extension(`📡 Stream created: ${streamId} (${type})`);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          type,
          endpoint,
          filters,
          clientId,
          createdAt: stream.createdAt.toISOString(),
        },
        metadata: {
          action: 'create_stream',
          streamId,
          type,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to create stream: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'create_stream' },
      };
    }
  }

  /**
   * Close a stream
   */
  private async closeStream(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const streamId = String(params['streamId']);
      const reason = String(params['reason'] || 'manual_close');

      const stream = this.streams.get(streamId);
      if (!stream) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream not found',
          metadata: { action: 'close_stream' },
        };
      }

      stream.isActive = false;
      this.streams.delete(streamId);
      this.eventBuffer.delete(streamId);

      // Emit event about stream closure using the agent's event bus if available
      if (agent.eventBus) {
        const streamClosedEvent: AgentEvent = {
          id: `stream-closed-${streamId}`,
          agentId: agent.id,
          type: 'stream:closed',
          timestamp: new Date(),
          source: 'api',
          processed: false,
          data: {
            streamId,
            agentId: agent.id,
            reason,
            timestamp: new Date().toISOString()
          }
        };
        agent.eventBus.emit(streamClosedEvent);
      }

      runtimeLogger.extension(`📡 Stream closed: ${streamId} (${reason})`);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          reason,
          closedAt: new Date().toISOString(),
        },
        metadata: {
          action: 'close_stream',
          streamId,
          reason,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to close stream: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'close_stream' },
      };
    }
  }

  /**
   * Send event to specific stream
   */
  private async sendStreamEvent(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const streamId = String(params['streamId']);
      const eventData = params['event'] || {};
      const priority = String(params['priority'] || 'normal') as
        | 'low'
        | 'normal'
        | 'high'
        | 'critical';

      const stream = this.streams.get(streamId);
      if (!stream) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream not found',
          metadata: { action: 'send_stream_event' },
        };
      }

      const event: StreamEvent = {
        id: this.generateEventId(),
        type: (eventData as any)['type'] || 'custom',
        data: eventData,
        timestamp: new Date(),
        source: _agent.id,
        priority,
      };

      // Add to buffer
      const buffer = this.eventBuffer.get(streamId) || [];
      buffer.push(event);

      // Maintain buffer size
      if (buffer.length > this.maxBufferSize) {
        buffer.splice(0, buffer.length - this.maxBufferSize);
      }

      this.eventBuffer.set(streamId, buffer);

      // Send to actual stream (implementation would depend on stream type)
      await this.deliverEventToStream(stream, event);

      stream.lastActivity = new Date();

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          eventId: event.id,
          streamId,
          delivered: true,
          timestamp: event.timestamp.toISOString(),
        },
        metadata: {
          action: 'send_stream_event',
          streamId,
          eventType: event.type,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to send stream event: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'send_stream_event' },
      };
    }
  }

  /**
   * Broadcast event to all matching streams
   */
  private async broadcastEvent(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const eventData = params['event'] || {};
      const filters = Array.isArray(params['filters'])
        ? (params['filters'] as string[])
        : [];
      const priority = String(params['priority'] || 'normal') as
        | 'low'
        | 'normal'
        | 'high'
        | 'critical';

      const event: StreamEvent = {
        id: this.generateEventId(),
        type: (eventData as any)['type'] || 'broadcast',
        data: eventData,
        timestamp: new Date(),
        source: _agent.id,
        priority,
      };

      const deliveredStreams: string[] = [];

      for (const [streamId, stream] of this.streams) {
        if (!stream.isActive) continue;

        // Check if stream matches filters
        if (filters.length > 0) {
          const hasMatchingFilter = filters.some((filter) =>
            stream.filters.some(
              (streamFilter) =>
                streamFilter.includes(filter) || filter.includes(streamFilter)
            )
          );
          if (!hasMatchingFilter) continue;
        }

        try {
          await this.deliverEventToStream(stream, event);
          deliveredStreams.push(streamId);

          // Update buffer
          const buffer = this.eventBuffer.get(streamId) || [];
          buffer.push(event);
          if (buffer.length > this.maxBufferSize) {
            buffer.splice(0, buffer.length - this.maxBufferSize);
          }
          this.eventBuffer.set(streamId, buffer);

          stream.lastActivity = new Date();
        } catch (error) {
          runtimeLogger.warn(
            `Failed to deliver event to stream ${streamId}:`,
            {
              error: {
                code: 'STREAM_DELIVERY_FAILED',
                message: error instanceof Error ? error.message : String(error),
                ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
                cause: error
              }
            }
          );
        }
      }

      runtimeLogger.extension(
        `📡 Broadcast event delivered to ${deliveredStreams.length} streams`
      );

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          eventId: event.id,
          deliveredStreams,
          deliveryCount: deliveredStreams.length,
          totalStreams: this.streams.size,
          timestamp: event.timestamp.toISOString(),
        },
        metadata: {
          action: 'broadcast_event',
          eventType: event.type,
          deliveryCount: deliveredStreams.length,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to broadcast event: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'broadcast_event' },
      };
    }
  }

  /**
   * Get stream status
   */
  private async getStreamStatus(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const streamId = params['streamId'] ? String(params['streamId']) : undefined;
      const includeBuffer = Boolean(params['includeBuffer'] ?? false);

      if (streamId) {
        // Get specific stream status
        const stream = this.streams.get(streamId);
        if (!stream) {
          return {
            type: ActionResultType.FAILURE,
            success: false,
            error: 'Stream not found',
            metadata: { action: 'get_stream_status' },
          };
        }

        const status: any = {
          id: stream.id,
          clientId: stream.clientId,
          type: stream.type,
          endpoint: stream.endpoint,
          filters: stream.filters,
          isActive: stream.isActive,
          createdAt: stream.createdAt.toISOString(),
          lastActivity: stream.lastActivity.toISOString(),
          bufferSize: this.eventBuffer.get(streamId)?.length || 0,
        };

        if (includeBuffer) {
          status['buffer'] = this.eventBuffer.get(streamId) || [];
        }

        return {
          type: ActionResultType.SUCCESS,
          success: true,
          result: status,
          metadata: {
            action: 'get_stream_status',
            streamId,
          },
        };
      } else {
        // Get overall streaming status
        const activeStreams = Array.from(this.streams.values()).filter(
          (s) => s.isActive
        );
        const totalBufferSize = Array.from(this.eventBuffer.values()).reduce(
          (sum, buffer) => sum + buffer.length,
          0
        );

        return {
          type: ActionResultType.SUCCESS,
          success: true,
          result: {
            totalStreams: this.streams.size,
            activeStreams: activeStreams.length,
            totalBufferSize,
            streamTypes: this.getStreamTypeDistribution(),
            timestamp: new Date().toISOString(),
          },
          metadata: {
            action: 'get_stream_status',
            overview: true,
          },
        };
      }
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get stream status: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'get_stream_status' },
      };
    }
  }

  /**
   * List all streams
   */
  private async listStreams(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const typeFilter = params['type'] ? String(params['type']) : undefined;
      const clientIdFilter = params['clientId']
        ? String(params['clientId'])
        : undefined;
      const includeMetrics = Boolean(params['includeMetrics'] ?? false);

      let streams = Array.from(this.streams.values());

      // Apply filters
      if (typeFilter) {
        streams = streams.filter((s) => s.type === typeFilter);
      }
      if (clientIdFilter) {
        streams = streams.filter((s) => s.clientId === clientIdFilter);
      }

      const streamList = streams.map((stream) => {
        const streamInfo: any = {
          id: stream.id,
          clientId: stream.clientId,
          type: stream.type,
          endpoint: stream.endpoint,
          filters: stream.filters,
          isActive: stream.isActive,
          createdAt: stream.createdAt.toISOString(),
          lastActivity: stream.lastActivity.toISOString(),
        };

        if (includeMetrics) {
          const buffer = this.eventBuffer.get(stream.id);
          streamInfo['metrics'] = {
            bufferSize: buffer?.length || 0,
            uptime: Date.now() - stream.createdAt.getTime(),
            lastEventTime:
              buffer && buffer.length > 0
                ? buffer[buffer.length - 1]?.timestamp.toISOString()
                : null,
          };
        }

        return streamInfo;
      });

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streams: streamList,
          count: streamList.length,
          filters: {
            type: typeFilter,
            clientId: clientIdFilter,
          },
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'list_streams',
          count: streamList.length,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to list streams: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'list_streams' },
      };
    }
  }

  /**
   * Stream agent events
   */
  private async streamAgentEvents(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = params['agentId'] ? String(params['agentId']) : _agent.id;
      const eventTypes = Array.isArray(params['eventTypes'])
        ? (params['eventTypes'] as string[])
        : ['all'];
      const streamId = String(params['streamId']);

      const stream = this.streams.get(streamId);
      if (!stream) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream not found',
          metadata: { action: 'stream_agent_events' },
        };
      }

      // Set up agent event filtering
      const agentFilter = `agent:${agentId}`;
      if (!stream.filters.includes(agentFilter)) {
        stream.filters.push(agentFilter);
      }

      // Add event type filters
      for (const eventType of eventTypes) {
        const typeFilter = `event:${eventType}`;
        if (!stream.filters.includes(typeFilter)) {
          stream.filters.push(typeFilter);
        }
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          agentId,
          eventTypes,
          configured: true,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'stream_agent_events',
          streamId,
          agentId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to stream agent events: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'stream_agent_events' },
      };
    }
  }

  /**
   * Stream chat messages
   */
  private async streamChat(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const conversationId = String(params['conversationId']);
      const streamId = String(params['streamId']);

      const stream = this.streams.get(streamId);
      if (!stream) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream not found',
          metadata: { action: 'stream_chat' },
        };
      }

      // Set up chat filtering
      const chatFilter = `chat:${conversationId}`;
      if (!stream.filters.includes(chatFilter)) {
        stream.filters.push(chatFilter);
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          conversationId,
          configured: true,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'stream_chat',
          streamId,
          conversationId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to stream chat: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'stream_chat' },
      };
    }
  }

  /**
   * Stream system metrics
   */
  private async streamMetrics(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const metrics = Array.isArray(params['metrics'])
        ? (params['metrics'] as string[])
        : ['all'];
      const interval =
        typeof params['interval'] === 'number' ? params['interval'] : 30000; // 30 seconds
      const streamId = String(params['streamId']);

      const stream = this.streams.get(streamId);
      if (!stream) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream not found',
          metadata: { action: 'stream_metrics' },
        };
      }

      // Set up metrics filtering
      for (const metric of metrics) {
        const metricFilter = `metrics:${metric}`;
        if (!stream.filters.includes(metricFilter)) {
          stream.filters.push(metricFilter);
        }
      }

      // Store interval in metadata for periodic updates
      stream.metadata['metricsInterval'] = interval;
      stream.metadata['metricsTypes'] = metrics;

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          metrics,
          interval,
          configured: true,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'stream_metrics',
          streamId,
          metricsCount: metrics.length,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to stream metrics: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'stream_metrics' },
      };
    }
  }

  /**
   * Configure stream filters
   */
  private async configureStreamFilters(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const streamId = String(params['streamId']);
      const filters = Array.isArray(params['filters'])
        ? (params['filters'] as string[])
        : [];
      const operation = String(params['operation'] || 'replace'); // replace, add, remove

      const stream = this.streams.get(streamId);
      if (!stream) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream not found',
          metadata: { action: 'configure_stream_filters' },
        };
      }

      const oldFilters = [...stream.filters];

      switch (operation) {
        case 'replace':
          stream.filters = filters;
          break;
        case 'add':
          for (const filter of filters) {
            if (!stream.filters.includes(filter)) {
              stream.filters.push(filter);
            }
          }
          break;
        case 'remove':
          stream.filters = stream.filters.filter((f) => !filters.includes(f));
          break;
        default:
          return {
            type: ActionResultType.FAILURE,
            success: false,
            error: `Invalid operation: ${operation}`,
            metadata: { action: 'configure_stream_filters' },
          };
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          operation,
          oldFilters,
          newFilters: stream.filters,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'configure_stream_filters',
          streamId,
          operation,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to configure stream filters: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'configure_stream_filters' },
      };
    }
  }

  /**
   * Get stream buffer
   */
  private async getStreamBuffer(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const streamId = String(params['streamId']);
      const limit = typeof params['limit'] === 'number' ? params['limit'] : 100;
      const since = params['since'] ? new Date(String(params['since'])) : undefined;

      const buffer = this.eventBuffer.get(streamId);
      if (!buffer) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream buffer not found',
          metadata: { action: 'get_stream_buffer' },
        };
      }

      let events = [...buffer];

      // Filter by timestamp if specified
      if (since) {
        events = events.filter((event) => event.timestamp > since);
      }

      // Apply limit
      if (limit > 0) {
        events = events.slice(-limit);
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          events: events.map((e) => ({
            id: e.id,
            type: e.type,
            data: JSON.stringify(e.data),
            timestamp: e.timestamp.toISOString(),
            source: e.source,
            priority: e.priority,
          })),
          count: events.length,
          totalBufferSize: buffer.length,
          since: since?.toISOString(),
          limit,
          timestamp: new Date().toISOString(),
        } as GenericData,
        metadata: {
          action: 'get_stream_buffer',
          streamId,
          eventCount: events.length,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get stream buffer: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'get_stream_buffer' },
      };
    }
  }

  /**
   * Clear stream buffer
   */
  private async clearStreamBuffer(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const streamId = String(params['streamId']);
      const confirm = Boolean(params['confirm'] ?? false);

      if (!confirm) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Confirmation required. Set confirm=true to proceed.',
          metadata: { action: 'clear_stream_buffer' },
        };
      }

      const buffer = this.eventBuffer.get(streamId);
      if (!buffer) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Stream buffer not found',
          metadata: { action: 'clear_stream_buffer' },
        };
      }

      const clearedCount = buffer.length;
      this.eventBuffer.set(streamId, []);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamId,
          clearedCount,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'clear_stream_buffer',
          streamId,
          clearedCount,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to clear stream buffer: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'clear_stream_buffer' },
      };
    }
  }

  /**
   * Stream health check
   */
  private async streamHealthCheck(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const detailed = Boolean(params['detailed'] ?? false);

      const activeStreams = Array.from(this.streams.values()).filter(
        (s) => s.isActive
      );
      const totalBufferSize = Array.from(this.eventBuffer.values()).reduce(
        (sum, buffer) => sum + buffer.length,
        0
      );

      const health: any = {
        status: 'healthy',
        totalStreams: this.streams.size,
        activeStreams: activeStreams.length,
        totalBufferSize,
        maxBufferSize: this.maxBufferSize,
        streamTypes: this.getStreamTypeDistribution(),
        timestamp: new Date().toISOString(),
      };

      // Determine health status
      if (activeStreams.length === 0) {
        health['status'] = 'warning';
        health['message'] = 'No active streams';
      } else if (totalBufferSize > this.maxBufferSize * 0.8) {
        health['status'] = 'warning';
        health['message'] = 'High buffer usage';
      }

      if (detailed) {
        health['detailed'] = {
          streamsById: Object.fromEntries(
            activeStreams.map((stream) => [
              stream.id,
              {
                type: stream.type,
                clientId: stream.clientId,
                uptime: Date.now() - stream.createdAt.getTime(),
                bufferSize: this.eventBuffer.get(stream.id)?.length || 0,
                lastActivity: stream.lastActivity.toISOString(),
              },
            ])
          ),
          bufferDistribution: Object.fromEntries(
            Array.from(this.eventBuffer.entries()).map(([id, buffer]) => [
              id,
              buffer.length,
            ])
          ),
        };
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: health,
        metadata: {
          action: 'stream_health_check',
          status: health['status'],
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to perform stream health check: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { action: 'stream_health_check' },
      };
    }
  }

  /**
   * Generate unique stream ID
   */
  private generateStreamId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deliver event to a stream (placeholder implementation)
   */
  private async deliverEventToStream(
    stream: StreamConnection,
    event: StreamEvent
  ): Promise<void> {
    // In a real implementation, this would deliver the event based on stream type:
    // - SSE: Write to response stream
    // - WebSocket: Send via WebSocket connection
    // - Webhook: HTTP POST to endpoint

    runtimeLogger.debug(
      `📡 Delivering ${event.type} event to ${stream.type} stream ${stream.id}`
    );

    // Placeholder delivery logic
    switch (stream.type) {
      case 'sse':
        // Would write to SSE response stream
        break;
      case 'websocket':
        // Would send via WebSocket
        break;
      case 'webhook':
        // Would make HTTP POST request
        break;
    }
  }

  /**
   * Get distribution of stream types
   */
  private getStreamTypeDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const stream of this.streams.values()) {
      if (stream.isActive) {
        distribution[stream.type] = (distribution[stream.type] || 0) + 1;
      }
    }

    return distribution;
  }

  /**
   * Health check interface for the skill itself
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    const activeStreams = Array.from(this.streams.values()).filter(
      (s) => s.isActive
    );
    const totalBufferSize = Array.from(this.eventBuffer.values()).reduce(
      (sum, buffer) => sum + buffer.length,
      0
    );

    return {
      status: activeStreams.length > 0 ? 'healthy' : 'idle',
      details: {
        totalStreams: this.streams.size,
        activeStreams: activeStreams.length,
        totalBufferSize,
        maxBufferSize: this.maxBufferSize,
        bufferUtilization: Math.round(
          (totalBufferSize / this.maxBufferSize) * 100
        ),
      },
    };
  }

  /**
   * Process agent event for streaming
   */
  processAgentEvent(event: AgentEvent): void {
    const streamEvent: StreamEvent = {
      id: this.generateEventId(),
      type: `agent_${event.type}`,
      data: event,
      timestamp: new Date(),
      source: event.agentId || 'unknown',
      priority: 'normal',
    };

    // Broadcast to streams with agent filters
    const agentFilter = `agent:${event.agentId}`;
    const eventTypeFilter = `event:${event.type}`;

    for (const [streamId, stream] of this.streams) {
      if (!stream.isActive) continue;

      const hasAgentFilter =
        stream.filters.includes(agentFilter) ||
        stream.filters.includes('agent:all');
      const hasEventFilter =
        stream.filters.includes(eventTypeFilter) ||
        stream.filters.includes('event:all');

      if (hasAgentFilter || hasEventFilter) {
        this.deliverEventToStream(stream, streamEvent).catch((error) => {
          runtimeLogger.warn(
            `Failed to deliver agent event to stream ${streamId}:`,
            error
          );
        });

        // Add to buffer
        const buffer = this.eventBuffer.get(streamId) || [];
        buffer.push(streamEvent);
        if (buffer.length > this.maxBufferSize) {
          buffer.splice(0, buffer.length - this.maxBufferSize);
        }
        this.eventBuffer.set(streamId, buffer);

        stream.lastActivity = new Date();
      }
    }
  }

  /**
   * Cleanup inactive streams
   */
  cleanupInactiveStreams(): void {
    const now = Date.now();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [streamId, stream] of this.streams) {
      if (now - stream.lastActivity.getTime() > maxInactiveTime) {
        runtimeLogger.extension(`🧹 Cleaning up inactive stream: ${streamId}`);
        stream.isActive = false;
        this.streams.delete(streamId);
        this.eventBuffer.delete(streamId);
      }
    }
  }
}
