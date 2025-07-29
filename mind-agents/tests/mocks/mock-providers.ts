// Mock implementations for external providers
import { jest } from '@jest/globals';
import { MemoryProvider, Portal, Extension } from '../../src/types';
import { TestFactories } from '../utils/test-factories';

// Mock Memory Provider
export class MockMemoryProvider implements MemoryProvider {
  private memories = new Map<string, any>();
  
  async initialize(): Promise<void> {
    // Mock initialization
  }
  
  async storeMemory(agentId: string, memory: any): Promise<string> {
    const id = `mock-memory-${Date.now()}`;
    this.memories.set(id, { ...memory, id, agentId });
    return id;
  }
  
  async retrieveMemories(agentId: string, query?: string, limit?: number): Promise<any[]> {
    const agentMemories = Array.from(this.memories.values())
      .filter(m => m.agentId === agentId);
    
    if (limit) {
      return agentMemories.slice(0, limit);
    }
    
    return agentMemories;
  }
  
  async deleteMemory(memoryId: string): Promise<boolean> {
    return this.memories.delete(memoryId);
  }
  
  async cleanup(): Promise<void> {
    this.memories.clear();
  }
}

// Mock Portal Provider
export class MockPortal implements Portal {
  name = 'mock-portal';
  model = 'mock-model';
  
  async generateResponse(messages: any[]): Promise<any> {
    return {
      content: 'Mock response from portal',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };
  }
  
  async streamResponse(messages: any[]): Promise<AsyncIterable<any>> {
    const mockStream = async function* () {
      yield { content: 'Mock ' };
      yield { content: 'streamed ' };
      yield { content: 'response' };
    };
    
    return mockStream();
  }
}

// Mock Extension
export class MockExtension implements Extension {
  name = 'mock-extension';
  actions = {
    test_action: jest.fn().mockResolvedValue({ success: true }),
    send_message: jest.fn().mockResolvedValue({ success: true }),
  };
  events = {
    message: jest.fn(),
    error: jest.fn(),
  };
  
  async init(agent: any): Promise<void> {
    // Mock initialization
  }
  
  async tick(agent: any): Promise<void> {
    // Mock tick
  }
  
  async shutdown(): Promise<void> {
    // Mock shutdown
  }
}

// Mock AI SDK providers
export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Mock OpenAI response',
            role: 'assistant',
          },
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    },
  },
};

export const mockAnthropic = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ text: 'Mock Anthropic response' }],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    }),
  },
};

export const mockGroq = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Mock Groq response',
            role: 'assistant',
          },
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }),
    },
  },
};

// Mock Database connections
export const mockSQLite = {
  prepare: jest.fn().mockReturnValue({
    get: jest.fn(),
    all: jest.fn().mockReturnValue([]),
    run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
  }),
  exec: jest.fn(),
  close: jest.fn(),
};

export const mockPostgres = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
  end: jest.fn(),
};

export const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      data: [],
      error: null,
    }),
    insert: jest.fn().mockReturnValue({
      data: [{ id: 1 }],
      error: null,
    }),
    update: jest.fn().mockReturnValue({
      data: [{ id: 1 }],
      error: null,
    }),
    delete: jest.fn().mockReturnValue({
      data: null,
      error: null,
    }),
  }),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
};

// Mock WebSocket
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  readyState = MockWebSocket.CONNECTING;
  onopen = jest.fn();
  onclose = jest.fn();
  onmessage = jest.fn();
  onerror = jest.fn();
  
  constructor(url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen({});
    }, 0);
  }
  
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({});
  });
}

// Mock Express app
export const mockExpressApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  listen: jest.fn().mockImplementation((port, callback) => {
    if (callback) callback();
    return { close: jest.fn() };
  }),
};

// Mock HTTP request/response
export const mockRequest = {
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/',
};

export const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis(),
  setHeader: jest.fn().mockReturnThis(),
};

// Mock Telegraf bot
export const mockTelegraf = {
  start: jest.fn(),
  help: jest.fn(),
  on: jest.fn(),
  command: jest.fn(),
  launch: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
};