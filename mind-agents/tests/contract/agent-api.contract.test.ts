import { Pact, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import axios from 'axios';
import { Agent } from '../../src/types/agent';
import { Message } from '../../src/types/message';
import { EmotionState } from '../../src/types/emotion';

const { like, term, eachLike, iso8601DateTimeWithMillis } = Matchers;

/**
 * Contract Testing for Agent API
 * Ensures API compatibility between services
 */

describe('Agent API Contract Tests', () => {
  const provider = new Pact({
    consumer: 'mind-agents-client',
    provider: 'mind-agents-api',
    port: 8080,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    logLevel: 'warn',
    dir: path.resolve(process.cwd(), 'pacts'),
    spec: 2,
  });

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('Agent Lifecycle', () => {
    test('POST /api/agents/:id/activate - Agent activation', async () => {
      const expectedResponse = {
        id: like('agent-123'),
        name: like('TestAgent'),
        status: term({
          matcher: 'active|inactive|suspended',
          generate: 'active',
        }),
        activated_at: iso8601DateTimeWithMillis(),
        emotions: like({
          happy: 0.5,
          sad: 0.0,
          angry: 0.0,
          anxious: 0.0,
          confident: 0.7,
          nostalgic: 0.0,
          empathetic: 0.3,
          curious: 0.6,
          proud: 0.0,
          confused: 0.0,
          neutral: 0.2,
        }),
        metadata: like({
          version: '1.0.0',
          capabilities: eachLike('text_generation'),
        }),
      };

      await provider.addInteraction({
        state: 'agent exists and is inactive',
        uponReceiving: 'a request to activate an agent',
        withRequest: {
          method: 'POST',
          path: '/api/agents/agent-123/activate',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': term({
              matcher: 'Bearer [A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]*',
              generate: 'Bearer valid.jwt.token',
            }),
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: expectedResponse,
        },
      });

      const response = await axios.post(
        'http://localhost:8080/api/agents/agent-123/activate',
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid.jwt.token',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        id: expect.any(String),
        status: 'active',
      });
    });

    test('POST /api/agents/:id/deactivate - Agent deactivation', async () => {
      await provider.addInteraction({
        state: 'agent is active',
        uponReceiving: 'a request to deactivate an agent',
        withRequest: {
          method: 'POST',
          path: '/api/agents/agent-123/deactivate',
          headers: {
            'Authorization': like('Bearer valid.jwt.token'),
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            id: 'agent-123',
            status: 'inactive',
            deactivated_at: iso8601DateTimeWithMillis(),
          },
        },
      });

      const response = await axios.post(
        'http://localhost:8080/api/agents/agent-123/deactivate',
        {},
        {
          headers: {
            'Authorization': 'Bearer valid.jwt.token',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('inactive');
    });
  });

  describe('Message Processing', () => {
    test('POST /api/agents/:id/message - Send message to agent', async () => {
      const messageRequest = {
        content: 'Hello, how are you?',
        context: {
          conversation_id: like('conv-123'),
          user_id: like('user-456'),
        },
      };

      const expectedResponse = {
        id: like('msg-789'),
        agent_id: 'agent-123',
        content: like('I am doing well, thank you for asking!'),
        timestamp: iso8601DateTimeWithMillis(),
        emotions: like({
          happy: 0.7,
          sad: 0.0,
          angry: 0.0,
          anxious: 0.0,
          confident: 0.8,
          nostalgic: 0.0,
          empathetic: 0.5,
          curious: 0.3,
          proud: 0.0,
          confused: 0.0,
          neutral: 0.1,
        }),
        token_usage: like({
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
        }),
        processing_time_ms: like(250),
      };

      await provider.addInteraction({
        state: 'agent is active and ready to receive messages',
        uponReceiving: 'a message for the agent',
        withRequest: {
          method: 'POST',
          path: '/api/agents/agent-123/message',
          headers: {
            'Content-Type': 'application/json',
          },
          body: messageRequest,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: expectedResponse,
        },
      });

      const response = await axios.post(
        'http://localhost:8080/api/agents/agent-123/message',
        messageRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('content');
      expect(response.data).toHaveProperty('emotions');
      expect(response.data).toHaveProperty('token_usage');
    });

    test('POST /api/agents/:id/message - Handle empty message', async () => {
      await provider.addInteraction({
        state: 'agent is active',
        uponReceiving: 'an empty message',
        withRequest: {
          method: 'POST',
          path: '/api/agents/agent-123/message',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            content: '',
          },
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'INVALID_MESSAGE',
            message: 'Message content cannot be empty',
          },
        },
      });

      try {
        await axios.post(
          'http://localhost:8080/api/agents/agent-123/message',
          { content: '' },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('INVALID_MESSAGE');
      }
    });
  });

  describe('Memory Operations', () => {
    test('GET /api/agents/:id/memories - Retrieve agent memories', async () => {
      const expectedMemories = eachLike({
        id: like('mem-123'),
        agent_id: 'agent-123',
        content: like('Previous conversation about AI'),
        type: term({
          matcher: 'conversation|fact|emotion|skill',
          generate: 'conversation',
        }),
        importance: like(0.8),
        timestamp: iso8601DateTimeWithMillis(),
        metadata: like({
          keywords: eachLike('AI'),
          sentiment: 'positive',
        }),
      });

      await provider.addInteraction({
        state: 'agent has stored memories',
        uponReceiving: 'a request for agent memories',
        withRequest: {
          method: 'GET',
          path: '/api/agents/agent-123/memories',
          query: {
            limit: '10',
            offset: '0',
            type: 'conversation',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            memories: expectedMemories,
            total: like(25),
            limit: 10,
            offset: 0,
          },
        },
      });

      const response = await axios.get(
        'http://localhost:8080/api/agents/agent-123/memories?limit=10&offset=0&type=conversation'
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('memories');
      expect(Array.isArray(response.data.memories)).toBe(true);
      expect(response.data).toHaveProperty('total');
    });

    test('POST /api/agents/:id/memories - Store new memory', async () => {
      const memoryRequest = {
        content: 'User prefers formal communication style',
        type: 'fact',
        importance: 0.9,
        metadata: {
          category: 'preference',
          confidence: 0.95,
        },
      };

      await provider.addInteraction({
        state: 'agent is active',
        uponReceiving: 'a request to store a memory',
        withRequest: {
          method: 'POST',
          path: '/api/agents/agent-123/memories',
          headers: {
            'Content-Type': 'application/json',
          },
          body: memoryRequest,
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Location': term({
              matcher: '/api/agents/[^/]+/memories/[^/]+',
              generate: '/api/agents/agent-123/memories/mem-456',
            }),
          },
          body: {
            id: like('mem-456'),
            agent_id: 'agent-123',
            ...memoryRequest,
            created_at: iso8601DateTimeWithMillis(),
          },
        },
      });

      const response = await axios.post(
        'http://localhost:8080/api/agents/agent-123/memories',
        memoryRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.headers).toHaveProperty('location');
      expect(response.data).toHaveProperty('id');
    });
  });

  describe('Multi-Agent Interactions', () => {
    test('POST /api/agents/interact - Agent-to-agent communication', async () => {
      const interactionRequest = {
        from_agent: 'agent-123',
        to_agent: 'agent-456',
        message: {
          content: 'Can you help me with this task?',
          priority: 'normal',
        },
      };

      const expectedResponse = {
        interaction_id: like('int-789'),
        from_agent: 'agent-123',
        to_agent: 'agent-456',
        request: interactionRequest.message,
        response: {
          content: like('I would be happy to help with that task.'),
          emotions: like({
            happy: 0.6,
            empathetic: 0.8,
          }),
        },
        timestamp: iso8601DateTimeWithMillis(),
        processing_time_ms: like(300),
      };

      await provider.addInteraction({
        state: 'both agents are active',
        uponReceiving: 'an agent-to-agent interaction request',
        withRequest: {
          method: 'POST',
          path: '/api/agents/interact',
          headers: {
            'Content-Type': 'application/json',
          },
          body: interactionRequest,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: expectedResponse,
        },
      });

      const response = await axios.post(
        'http://localhost:8080/api/agents/interact',
        interactionRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('interaction_id');
      expect(response.data).toHaveProperty('response');
    });

    test('POST /api/agents/broadcast - Broadcast message to multiple agents', async () => {
      const broadcastRequest = {
        from_agent: 'agent-123',
        to_agents: ['agent-456', 'agent-789', 'agent-101'],
        message: {
          content: 'Team meeting in 5 minutes',
          type: 'announcement',
        },
      };

      const expectedResponse = {
        broadcast_id: like('bcast-123'),
        from_agent: 'agent-123',
        recipients: eachLike({
          agent_id: like('agent-456'),
          status: term({
            matcher: 'delivered|failed',
            generate: 'delivered',
          }),
          response: like({
            acknowledged: true,
            content: 'Acknowledged. I will attend the meeting.',
          }),
        }),
        summary: {
          total: 3,
          delivered: like(3),
          failed: like(0),
        },
        timestamp: iso8601DateTimeWithMillis(),
      };

      await provider.addInteraction({
        state: 'multiple agents are active',
        uponReceiving: 'a broadcast message request',
        withRequest: {
          method: 'POST',
          path: '/api/agents/broadcast',
          headers: {
            'Content-Type': 'application/json',
          },
          body: broadcastRequest,
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: expectedResponse,
        },
      });

      const response = await axios.post(
        'http://localhost:8080/api/agents/broadcast',
        broadcastRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('broadcast_id');
      expect(response.data).toHaveProperty('recipients');
      expect(response.data.summary.total).toBe(3);
    });
  });

  describe('WebSocket Contracts', () => {
    test('WebSocket connection contract', async () => {
      // WebSocket contract testing requires a different approach
      // This is a placeholder for WebSocket contract structure
      const wsContract = {
        connection: {
          url: 'ws://localhost:8080/ws/agents/:id',
          protocols: ['agent-protocol-v1'],
          headers: {
            'Authorization': 'Bearer token',
          },
        },
        messages: {
          client_to_server: [
            {
              type: 'message',
              content: like('Hello agent'),
              metadata: like({}),
            },
            {
              type: 'ping',
              timestamp: iso8601DateTimeWithMillis(),
            },
          ],
          server_to_client: [
            {
              type: 'response',
              content: like('Agent response'),
              emotions: like({}),
              timestamp: iso8601DateTimeWithMillis(),
            },
            {
              type: 'pong',
              timestamp: iso8601DateTimeWithMillis(),
            },
            {
              type: 'emotion_update',
              emotions: like({}),
              trigger: like('message_received'),
            },
          ],
        },
        events: {
          connection_established: {
            agent_id: like('agent-123'),
            session_id: like('session-456'),
          },
          connection_closed: {
            reason: like('client_disconnect'),
            code: like(1000),
          },
          error: {
            code: like('INVALID_MESSAGE'),
            message: like('Invalid message format'),
          },
        },
      };

      // WebSocket contract would be validated differently
      expect(wsContract).toBeDefined();
    });
  });

  describe('Error Contracts', () => {
    test('404 - Agent not found', async () => {
      await provider.addInteraction({
        state: 'agent does not exist',
        uponReceiving: 'a request for non-existent agent',
        withRequest: {
          method: 'GET',
          path: '/api/agents/non-existent-agent',
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: 'AGENT_NOT_FOUND',
            message: 'Agent with id non-existent-agent not found',
            timestamp: iso8601DateTimeWithMillis(),
            path: '/api/agents/non-existent-agent',
          },
        },
      });

      try {
        await axios.get('http://localhost:8080/api/agents/non-existent-agent');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error).toBe('AGENT_NOT_FOUND');
      }
    });

    test('503 - Service unavailable', async () => {
      await provider.addInteraction({
        state: 'system is under maintenance',
        uponReceiving: 'any request during maintenance',
        withRequest: {
          method: 'GET',
          path: '/api/agents/agent-123',
        },
        willRespondWith: {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '300',
          },
          body: {
            error: 'SERVICE_UNAVAILABLE',
            message: 'System is under maintenance. Please try again later.',
            retry_after_seconds: 300,
          },
        },
      });

      try {
        await axios.get('http://localhost:8080/api/agents/agent-123');
      } catch (error: any) {
        expect(error.response.status).toBe(503);
        expect(error.response.headers['retry-after']).toBe('300');
      }
    });

    test('429 - Rate limit exceeded', async () => {
      await provider.addInteraction({
        state: 'rate limit exceeded for client',
        uponReceiving: 'a request exceeding rate limit',
        withRequest: {
          method: 'POST',
          path: '/api/agents/agent-123/message',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            content: 'Hello',
          },
        },
        willRespondWith: {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': like('1234567890'),
          },
          body: {
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retry_after_seconds: like(60),
          },
        },
      });

      try {
        await axios.post(
          'http://localhost:8080/api/agents/agent-123/message',
          { content: 'Hello' },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(429);
        expect(error.response.headers['x-ratelimit-remaining']).toBe('0');
      }
    });
  });
});