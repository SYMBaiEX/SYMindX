/**
 * Agent Communication Skill
 * 
 * Provides chat and text generation capabilities for the MCP server
 */

import { BaseMCPSkill } from './base-mcp-skill.js';
import { MCPServerTool } from '../types.js';
import { Agent } from '../../../types/agent.js';
import { runtimeLogger } from '../../../utils/logger.js';

export class AgentCommunicationSkill extends BaseMCPSkill {
  public readonly id = 'agent-communication';
  public readonly name = 'Agent Communication';
  public readonly description = 'Chat and text generation capabilities';
  public readonly version = '1.0.0';
  public readonly category = 'communication' as const;
  
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
        name: 'agent_chat',
        description: 'Chat with the agent and get a response',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message to send to the agent',
            },
            context: {
              type: 'object',
              description: 'Optional context for the conversation',
              properties: {
                topic: { type: 'string' },
                mood: { type: 'string' },
                style: { type: 'string' },
              },
            },
          },
          required: ['message'],
        },
        handler: async (args: Record<string, unknown>) => {
          try {
            const message = String(args['message'] || '');
            const context = args['context'] as Record<string, unknown> | undefined;
            
            // Get the agent's portal for text generation
            const portal = agent.portal;
            if (!portal) {
              throw new Error('No active portal available');
            }
            
            // Generate response using the agent's portal
            const response = await portal.generateText(message, {
              maxOutputTokens: 1000,
              temperature: 0.7,
            });
            
            return {
              type: 'text',
              text: response.text,
              metadata: {
                agentId: agent.id,
                agentName: agent.name,
                timestamp: new Date().toISOString(),
                context: context,
              },
            };
          } catch (error) {
            runtimeLogger.error('Agent chat tool error', {
              error: error instanceof Error ? error.message : String(error),
              agentId: agent.id,
            });
            
            return {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'communication',
          readOnly: false,
          requiresAuth: false,
        },
      },
      
      {
        name: 'agent_generate_text',
        description: 'Generate text based on a prompt',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt for text generation',
            },
            options: {
              type: 'object',
              description: 'Generation options',
              properties: {
                temperature: { type: 'number', minimum: 0, maximum: 2 },
                maxTokens: { type: 'number', minimum: 1, maximum: 4000 },
                style: { type: 'string' },
                format: { type: 'string' },
              },
            },
          },
          required: ['prompt'],
        },
        handler: async (args: Record<string, unknown>) => {
          try {
            const prompt = String(args['prompt'] || '');
            const options = args['options'] as Record<string, unknown> | undefined;
            
            // Create a specialized prompt for text generation
            const generationPrompt = `Generate text based on the following prompt. ${
              options?.['style'] ? `Style: ${options['style']}. ` : ''
            }${options?.['format'] ? `Format: ${options['format']}. ` : ''}Prompt: ${prompt}`;
            
            // Get the agent's portal for text generation
            const portal = agent.portal;
            if (!portal) {
              throw new Error('No active portal available');
            }
            
            const response = await portal.generateText(generationPrompt, {
              maxOutputTokens: Number(options?.['maxTokens'] ?? 1000),
              temperature: Number(options?.['temperature'] ?? 0.7),
            });
            
            return {
              type: 'text',
              text: response.text,
              metadata: {
                agentId: agent.id,
                generatedAt: new Date().toISOString(),
                options: options,
              },
            };
          } catch (error) {
            runtimeLogger.error('Text generation tool error', {
              error: error instanceof Error ? error.message : String(error),
              agentId: agent.id,
            });
            
            return {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
          }
        },
        metadata: {
          category: 'communication',
          readOnly: true,
          requiresAuth: false,
        },
      },
    ];
  }
}