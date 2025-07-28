/**
 * Session Management Skill for API Extension
 *
 * Provides actions related to session lifecycle and management.
 */

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
} from '../../../types/agent';
import { SkillParameters } from '../../../types/common';
import { runtimeLogger } from '../../../utils/logger';
import { ApiExtension } from '../index';

interface SessionData {
  id: string;
  userId: string;
  agentId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

export class SessionManagementSkill {
  private _extension: ApiExtension;
  private sessions: Map<string, SessionData> = new Map();

  constructor(extension: ApiExtension) {
    this._extension = extension;
  }

  /**
   * Get all session management-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      create_session: {
        name: 'create_session',
        description: 'Create a new user session',
        category: ActionCategory.SYSTEM,
        parameters: { userId: 'string', metadata: 'object', ttl: 'number' },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.createSession(agent, params);
        },
      },

      get_session: {
        name: 'get_session',
        description: 'Retrieve session information',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string' },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getSession(agent, params);
        },
      },

      update_session: {
        name: 'update_session',
        description: 'Update session data',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string', data: 'object' },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.updateSession(agent, params);
        },
      },

      extend_session: {
        name: 'extend_session',
        description: 'Extend session expiration time',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string', extensionTime: 'number' },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.extendSession(agent, params);
        },
      },

      destroy_session: {
        name: 'destroy_session',
        description: 'Destroy a session',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string', reason: 'string' },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.destroySession(agent, params);
        },
      },

      list_sessions: {
        name: 'list_sessions',
        description: 'List active sessions',
        category: ActionCategory.SYSTEM,
        parameters: { userId: 'string', includeExpired: 'boolean' },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.listSessions(agent, params);
        },
      },

      cleanup_expired: {
        name: 'cleanup_expired',
        description: 'Clean up expired sessions',
        category: ActionCategory.SYSTEM,
        parameters: {},
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.cleanupExpired(agent, params);
        },
      },
    };
  }

  /**
   * Create a new session
   */
  private async createSession(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const userId = params.userId;
      const metadata =
        params.metadata && typeof params.metadata === 'object'
          ? (params.metadata as Record<string, unknown>)
          : {};
      const ttl = typeof params.ttl === 'number' ? params.ttl : 3600000; // Default 1 hour TTL

      const sessionId = this.generateSessionId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl);

      const session: SessionData = {
        id: sessionId,
        userId: typeof userId === 'string' ? userId : String(userId),
        agentId: agent.id,
        createdAt: now,
        lastActivity: now,
        expiresAt: expiresAt,
        metadata: {
          ...(typeof metadata === 'object' && metadata !== null
            ? metadata
            : {}),
          extensionId: this._extension.name,
          extensionVersion: this._extension.version,
          agentName: agent.name,
          isActive: true,
        } as Record<string, unknown>,
      };

      this.sessions.set(session.id, session);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          id: session.id,
          userId: session.userId,
          agentId: session.agentId,
          createdAt: session.createdAt.toISOString(),
          lastActivity: session.lastActivity.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'create_session',
          sessionId,
          userId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'create_session',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get session information
   */
  private async getSession(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const sessionId =
        typeof params.sessionId === 'string'
          ? params.sessionId
          : String(params.sessionId);

      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'get_session',
            sessionId,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Validate agent access to session
      if (session.agentId && session.agentId !== agent.id) {
        runtimeLogger.warn(
          `[Session] Agent ${agent.id} attempting to access session owned by ${session.agentId}`
        );
      }

      // Check if session is expired
      const isExpired = new Date() > new Date(session.expiresAt);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          id: session.id,
          userId: session.userId,
          agentId: session.agentId,
          createdAt: session.createdAt.toISOString(),
          lastActivity: session.lastActivity.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          isExpired,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'get_session',
          sessionId,
          isExpired,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'get_session',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Update session data
   */
  private async updateSession(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const sessionId =
        typeof params.sessionId === 'string'
          ? params.sessionId
          : String(params.sessionId);
      const data = params.data;

      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'update_session',
            sessionId,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Update session data
      const updatedSession: SessionData = {
        ...session,
        ...(typeof data === 'object' && data !== null
          ? (data as Partial<SessionData>)
          : {}),
        lastActivity: new Date(),
      };

      this.sessions.set(sessionId, updatedSession);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          id: updatedSession.id,
          userId: updatedSession.userId,
          agentId: updatedSession.agentId,
          createdAt: updatedSession.createdAt.toISOString(),
          lastActivity: updatedSession.lastActivity.toISOString(),
          expiresAt: updatedSession.expiresAt.toISOString(),
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'update_session',
          sessionId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'update_session',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Extend session expiration
   */
  private async extendSession(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const sessionId =
        typeof params.sessionId === 'string'
          ? params.sessionId
          : String(params.sessionId);
      const extensionTime =
        typeof params.extensionTime === 'number'
          ? params.extensionTime
          : 3600000; // Default 1 hour extension

      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'extend_session',
            sessionId,
            timestamp: new Date().toISOString(),
          },
        };
      }

      const newExpiry = new Date(session.expiresAt.getTime() + extensionTime);
      const now = new Date();

      const extendedSession: SessionData = {
        ...session,
        expiresAt: newExpiry,
        lastActivity: now,
      };

      this.sessions.set(sessionId, extendedSession);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          id: extendedSession.id,
          userId: extendedSession.userId,
          agentId: extendedSession.agentId,
          expiresAt: extendedSession.expiresAt.toISOString(),
          extensionTime,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'extend_session',
          sessionId,
          extensionTime,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to extend session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'extend_session',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Destroy a session
   */
  private async destroySession(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const sessionId =
        typeof params.sessionId === 'string'
          ? params.sessionId
          : String(params.sessionId);
      const reason =
        typeof params.reason === 'string'
          ? params.reason
          : 'manual_destruction';

      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'destroy_session',
            sessionId,
            timestamp: new Date().toISOString(),
          },
        };
      }

      this.sessions.delete(sessionId);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          destroyed: true,
          sessionId,
          reason,
          destroyedAt: new Date().toISOString(),
        },
        metadata: {
          action: 'destroy_session',
          sessionId,
          reason,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to destroy session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'destroy_session',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * List sessions
   */
  private async listSessions(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { userId, includeExpired = false } = params;

      let sessions = Array.from(this.sessions.values());

      // Filter by user ID if provided
      if (userId) {
        sessions = sessions.filter((session) => session.userId === userId);
      }

      // Filter by agent ID to show only sessions this agent has access to
      const agentSessions = sessions.filter(
        (session) => !session.agentId || session.agentId === agent.id
      );
      runtimeLogger.debug(
        `[Session] Agent ${agent.id} can access ${agentSessions.length} of ${sessions.length} total sessions`
      );

      // Filter expired sessions if not included
      if (!includeExpired) {
        const now = new Date();
        sessions = agentSessions.filter(
          (session) => new Date(session.expiresAt) > now
        );
      } else {
        sessions = agentSessions;
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          sessions: sessions.map((s) => ({
            id: s.id,
            userId: s.userId,
            agentId: s.agentId,
            createdAt: s.createdAt.toISOString(),
            lastActivity: s.lastActivity.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
          })),
          count: sessions.length,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'list_sessions',
          userId,
          includeExpired,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'list_sessions',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpired(
    _agent: Agent,
    _params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of Array.from(this.sessions.entries())) {
        if (new Date(session.expiresAt) <= now) {
          this.sessions.delete(sessionId);
          expiredSessions.push(sessionId);
        }
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          cleanedUp: true,
          expiredSessions,
          count: expiredSessions.length,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'cleanup_expired',
          cleanedCount: expiredSessions.length,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to cleanup expired sessions: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'cleanup_expired',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return (
      'sess_' +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2)
    );
  }
}
