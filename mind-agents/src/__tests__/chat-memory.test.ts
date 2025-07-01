/**
 * Test for Chat Memory Functionality
 */

import { CommandSystem } from '../core/command-system.js'
import { Agent, MemoryType, MemoryDuration } from '../types/index.js'
import { MemoryRecord } from '../types/agent.js'

// Mock memory provider
class MockMemoryProvider {
  private memories: MemoryRecord[] = []

  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    this.memories.push(memory)
  }

  async retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]> {
    return this.memories
      .filter(mem => mem.content.includes(query))
      .slice(0, limit || 10)
  }

  async search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]> {
    return this.memories.slice(0, limit || 10)
  }

  async delete(agentId: string, memoryId: string): Promise<void> {
    this.memories = this.memories.filter(mem => mem.id !== memoryId)
  }

  async clear(agentId: string): Promise<void> {
    this.memories = this.memories.filter(mem => mem.agentId !== agentId)
  }

  async getRecent(agentId: string, limit?: number): Promise<MemoryRecord[]> {
    return this.memories
      .filter(mem => mem.agentId === agentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit || 10)
  }
}

// Mock agent
const mockAgent: Partial<Agent> = {
  id: 'test-agent',
  name: 'Test Agent',
  memory: new MockMemoryProvider() as any,
  config: {
    core: {
      name: 'Test Agent',
      tone: 'friendly',
      personality: ['helpful']
    },
    lore: {
      origin: 'Test environment',
      motive: 'Testing'
    },
    psyche: {
      traits: ['logical'],
      defaults: {
        memory: 'memory',
        emotion: 'basic',
        cognition: 'reactive'
      }
    },
    modules: {
      extensions: []
    }
  }
}

describe('Chat Memory Functionality', () => {
  let commandSystem: CommandSystem

  beforeEach(() => {
    commandSystem = new CommandSystem()
  })

  test('should store conversation memories', async () => {
    const mockStore = jest.spyOn(mockAgent.memory!, 'store')
    
    // Mock portal integration to avoid actual API calls
    jest.mock('../core/portal-integration.js', () => ({
      PortalIntegration: {
        generateResponse: jest.fn().mockResolvedValue('Hello! How can I help you?')
      }
    }))

    const command = {
      id: 'test-command',
      agentId: 'test-agent',
      type: 'chat' as any,
      instruction: 'Hello, how are you?',
      status: 'pending' as any,
      timestamp: new Date(),
      priority: 1
    }

    // Process the chat command
    await (commandSystem as any).processChatCommand(mockAgent as Agent, command)

    // Verify that store was called for both user and agent messages
    expect(mockStore).toHaveBeenCalledTimes(2)
    
    // Check user memory structure
    const userMemoryCall = mockStore.mock.calls[0]
    expect(userMemoryCall[1]).toMatchObject({
      type: MemoryType.INTERACTION,
      content: expect.stringContaining('User said:'),
      tags: expect.arrayContaining(['conversation', 'chat', 'user_input']),
      duration: MemoryDuration.LONG_TERM
    })

    // Check agent memory structure
    const agentMemoryCall = mockStore.mock.calls[1]
    expect(agentMemoryCall[1]).toMatchObject({
      type: MemoryType.INTERACTION,
      content: expect.stringContaining('I responded:'),
      tags: expect.arrayContaining(['conversation', 'chat', 'agent_response']),
      duration: MemoryDuration.LONG_TERM
    })
  })

  test('should retrieve and use conversation context', async () => {
    // Pre-populate some conversation memories
    const existingMemories: MemoryRecord[] = [
      {
        id: 'mem1',
        agentId: 'test-agent',
        type: MemoryType.INTERACTION,
        content: 'User said: "What is your name?"',
        metadata: {},
        importance: 0.7,
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        tags: ['conversation', 'chat'],
        duration: MemoryDuration.LONG_TERM
      },
      {
        id: 'mem2',
        agentId: 'test-agent',
        type: MemoryType.INTERACTION,
        content: 'I responded: "I am Test Agent"',
        metadata: {},
        importance: 0.6,
        timestamp: new Date(Date.now() - 50000), // 50 seconds ago
        tags: ['conversation', 'chat'],
        duration: MemoryDuration.LONG_TERM
      }
    ]

    const mockRetrieve = jest.spyOn(mockAgent.memory!, 'retrieve')
      .mockResolvedValue(existingMemories)
    const mockGetRecent = jest.spyOn(mockAgent.memory!, 'getRecent')
      .mockResolvedValue(existingMemories)

    const command = {
      id: 'test-command-2',
      agentId: 'test-agent',
      type: 'chat' as any,
      instruction: 'Do you remember me?',
      status: 'pending' as any,
      timestamp: new Date(),
      priority: 1
    }

    // Process the chat command
    await (commandSystem as any).processChatCommand(mockAgent as Agent, command)

    // Verify that retrieve methods were called to get context
    expect(mockRetrieve).toHaveBeenCalledWith('test-agent', 'conversation chat message', 10)
    expect(mockGetRecent).toHaveBeenCalledWith(5)
  })
})