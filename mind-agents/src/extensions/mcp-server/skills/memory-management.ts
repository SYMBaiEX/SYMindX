/**
 * Memory Management Skill
 * 
 * Provides memory storage, retrieval, and search capabilities
 */

import { BaseMCPSkill } from './base-mcp-skill.js';
import { MCPServerTool, MCPServerResource } from '../types.js';
import { Agent } from '../../../types/agent.js';
import { MemoryType, MemoryDuration } from '../../../types/enums.js';
import { MemoryRecord } from '../../../types/memory.js';
import { runtimeLogger } from '../../../utils/logger.js';

export class MemoryManagementSkill extends BaseMCPSkill {
  public readonly id = 'memory-management';
  public readonly name = 'Memory Management';
  public readonly description = 'Memory storage and retrieval capabilities';
  public readonly version = '1.0.0';
  public readonly category = 'memory' as const;
  
  protected override async onInitialize(_agent: Agent): Promise<void> {
    // No special initialization needed
  }
  
  protected override async onCleanup(): Promise<void> {
    // No special cleanup needed
  }
  
  override async getTools(): Promise<MCPServerTool[]> {
    const agent = this.ensureAgent();
    
    return [
      {
        name: 'memory_store',
        description: 'Store a memory in the agent\'s memory system',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Type of memory (experience, fact, skill, etc.)',
              enum: Object.values(MemoryType),
            },
            content: {
              type: 'string',
              description: 'The content of the memory',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to categorize the memory',
            },
            importance: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              description: 'Importance level (0-10)',
            },
            duration: {
              type: 'string',
              description: 'Memory duration',
              enum: Object.values(MemoryDuration),
            },
          },
          required: ['content'],
        },
        handler: async (args: Record<string, unknown>) => {
          try {
            const memoryProvider = agent.memory;
            if (!memoryProvider) {
              throw new Error('Memory provider not available');
            }
            
            const memoryId = `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const memoryType = args['type'] as MemoryType || MemoryType.EXPERIENCE;
            const content = String(args['content'] || '');
            const tags = Array.isArray(args['tags']) ? args['tags'] as string[] : [];
            const importance = Number(args['importance'] ?? 5);
            const duration = args['duration'] as MemoryDuration || MemoryDuration.LONG_TERM;
            
            await memoryProvider.store(agent.id, {
              id: memoryId,
              agentId: agent.id,
              type: memoryType,
              content: content,
              metadata: {
                source: 'mcp_server',
                timestamp: new Date(),
                tags: tags,
                importance: importance,
              },
              importance: importance / 10,
              timestamp: new Date(),
              tags: tags,
              duration: duration,
            });
            
            return {
              type: 'text',
              text: `Stored memory with ID: ${memoryId}`,
              metadata: {
                memoryId,
                type: memoryType,
                tags,
                importance,
              },
            };
          } catch (error) {
            runtimeLogger.error('Memory store error', {
              error: error instanceof Error ? error.message : String(error),
              agentId: agent.id,
            });
            
            return {
              type: 'text',
              text: `Error storing memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'memory',
          readOnly: false,
          requiresAuth: false,
        },
      },
      
      {
        name: 'memory_retrieve',
        description: 'Retrieve a specific memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            memoryId: {
              type: 'string',
              description: 'The ID of the memory to retrieve',
            },
          },
          required: ['memoryId'],
        },
        handler: async (args: Record<string, unknown>) => {
          try {
            const memoryProvider = agent.memory;
            if (!memoryProvider) {
              throw new Error('Memory provider not available');
            }
            
            const memoryId = String(args['memoryId'] || '');
            const memories = await memoryProvider.retrieve(agent.id, memoryId, 1);
            
            if (!memories || memories.length === 0) {
              return {
                type: 'text',
                text: 'Memory not found',
              };
            }
            
            const memory = memories[0];
            if (!memory) {
              return {
                type: 'text',
                text: 'Memory not found',
              };
            }
            
            return {
              type: 'text',
              text: JSON.stringify(memory, null, 2),
              metadata: {
                memoryId: memory.id,
                type: memory.type,
                timestamp: memory.timestamp,
              },
            };
          } catch (error) {
            runtimeLogger.error('Memory retrieve error', {
              error: error instanceof Error ? error.message : String(error),
              agentId: agent.id,
            });
            
            return {
              type: 'text',
              text: `Error retrieving memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'memory',
          readOnly: true,
          requiresAuth: false,
        },
      },
      
      {
        name: 'memory_search',
        description: 'Search memories by query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Maximum number of results',
            },
            type: {
              type: 'string',
              description: 'Filter by memory type',
              enum: Object.values(MemoryType),
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
          },
          required: ['query'],
        },
        handler: async (args: Record<string, unknown>) => {
          try {
            const memoryProvider = agent.memory;
            if (!memoryProvider) {
              throw new Error('Memory provider not available');
            }
            
            const query = String(args['query'] || '');
            const limit = Number(args['limit'] ?? 10);
            const type = args['type'] as MemoryType | undefined;
            const tags = Array.isArray(args['tags']) ? args['tags'] as string[] : undefined;
            
            // Search memories using retrieve method (which takes a query string)
            const memories = await memoryProvider.retrieve(agent.id, query, limit);
            
            return {
              type: 'text',
              text: JSON.stringify(memories, null, 2),
              metadata: {
                count: memories.length,
                query,
                filters: { type, tags },
              },
            };
          } catch (error) {
            runtimeLogger.error('Memory search error', {
              error: error instanceof Error ? error.message : String(error),
              agentId: agent.id,
            });
            
            return {
              type: 'text',
              text: `Error searching memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'memory',
          readOnly: true,
          requiresAuth: false,
        },
      },
    ];
  }
  
  override async getResources(): Promise<MCPServerResource[]> {
    const agent = this.ensureAgent();
    
    return [
      {
        uri: `agent://${agent.id}/memory/recent`,
        name: 'Recent Memories',
        description: 'Get the agent\'s recent memories',
        mimeType: 'application/json',
        handler: async () => {
          try {
            const memoryProvider = agent.memory;
            if (!memoryProvider) {
              return { memories: [], error: 'Memory provider not available' };
            }
            
            const memories = await memoryProvider.getRecent(agent.id, 20);
            
            return {
              memories: memories.map((m: MemoryRecord) => ({
                id: m.id,
                type: m.type,
                content: m.content,
                timestamp: m.timestamp,
                tags: m.tags,
                importance: m.importance,
              })),
              count: memories.length,
              agentId: agent.id,
            };
          } catch (error) {
            return {
              memories: [],
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        },
        metadata: {
          cacheable: false,
          refreshInterval: 60000,
          requiresAuth: false,
        },
      },
    ];
  }
}