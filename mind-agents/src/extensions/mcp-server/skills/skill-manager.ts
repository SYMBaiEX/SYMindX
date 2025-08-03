/**
 * MCP Skill Manager
 * 
 * Manages the lifecycle and orchestration of MCP server skills
 */

import { MCPSkillManager, BaseSkill, MCPServerTool, MCPServerResource, MCPServerPrompt } from '../types.js';
import { Agent } from '../../../types/agent.js';
import { runtimeLogger } from '../../../utils/logger.js';

export class DefaultMCPSkillManager implements MCPSkillManager {
  private skills: Map<string, BaseSkill> = new Map();
  private agent?: Agent;
  
  async registerSkill(skill: BaseSkill): Promise<void> {
    if (this.skills.has(skill.id)) {
      runtimeLogger.warn(`Skill ${skill.id} already registered, replacing...`, {
        metadata: { skillId: skill.id }
      });
    }
    
    this.skills.set(skill.id, skill);
    
    // Initialize immediately if agent is available
    if (this.agent && skill.enabled) {
      await skill.initialize(this.agent);
    }
    
    runtimeLogger.info(`Registered MCP skill: ${skill.name}`, {
      metadata: {
        skillId: skill.id,
        category: skill.category,
        version: skill.version
      }
    });
  }
  
  getSkills(): BaseSkill[] {
    return Array.from(this.skills.values());
  }
  
  getSkill(id: string): BaseSkill | undefined {
    return this.skills.get(id);
  }
  
  async initializeAll(agent: Agent): Promise<void> {
    this.agent = agent;
    
    const initPromises: Promise<void>[] = [];
    
    for (const skill of this.skills.values()) {
      if (skill.enabled) {
        initPromises.push(
          skill.initialize(agent).catch((error) => {
            runtimeLogger.error(`Failed to initialize skill ${skill.id}`, {
              error: error instanceof Error ? error.message : String(error),
              metadata: { skillId: skill.id }
            });
          })
        );
      }
    }
    
    await Promise.all(initPromises);
    
    runtimeLogger.info(`Initialized ${initPromises.length} MCP skills`, {
      metadata: {
        agentId: agent.id,
        skillCount: initPromises.length
      }
    });
  }
  
  async getAllTools(): Promise<MCPServerTool[]> {
    const allTools: MCPServerTool[] = [];
    
    for (const skill of this.skills.values()) {
      if (skill.enabled) {
        try {
          const tools = await skill.getTools();
          allTools.push(...tools);
        } catch (error) {
          runtimeLogger.error(`Failed to get tools from skill ${skill.id}`, {
            error: error instanceof Error ? error.message : String(error),
            metadata: { skillId: skill.id }
          });
        }
      }
    }
    
    return allTools;
  }
  
  async getAllResources(): Promise<MCPServerResource[]> {
    const allResources: MCPServerResource[] = [];
    
    for (const skill of this.skills.values()) {
      if (skill.enabled) {
        try {
          const resources = await skill.getResources();
          allResources.push(...resources);
        } catch (error) {
          runtimeLogger.error(`Failed to get resources from skill ${skill.id}`, {
            error: error instanceof Error ? error.message : String(error),
            metadata: { skillId: skill.id }
          });
        }
      }
    }
    
    return allResources;
  }
  
  async getAllPrompts(): Promise<MCPServerPrompt[]> {
    const allPrompts: MCPServerPrompt[] = [];
    
    for (const skill of this.skills.values()) {
      if (skill.enabled) {
        try {
          const prompts = await skill.getPrompts();
          allPrompts.push(...prompts);
        } catch (error) {
          runtimeLogger.error(`Failed to get prompts from skill ${skill.id}`, {
            error: error instanceof Error ? error.message : String(error),
            metadata: { skillId: skill.id }
          });
        }
      }
    }
    
    return allPrompts;
  }
  
  async cleanupAll(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];
    
    for (const skill of this.skills.values()) {
      cleanupPromises.push(
        skill.cleanup().catch((error) => {
          runtimeLogger.error(`Failed to cleanup skill ${skill.id}`, {
            error: error instanceof Error ? error.message : String(error),
            metadata: { skillId: skill.id }
          });
        })
      );
    }
    
    await Promise.all(cleanupPromises);
    
    runtimeLogger.info(`Cleaned up ${cleanupPromises.length} MCP skills`);
    
    this.skills.clear();
    delete this.agent;
  }
}