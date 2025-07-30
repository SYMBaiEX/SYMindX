/**
 * Authentication Skill for API Extension
 *
 * Provides actions related to authentication and authorization.
 */

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
} from '../../../types/agent';
import { SkillParameters } from '../../../types/common';
import { ApiExtension } from '../index';
import { JWTManager } from '../../../core/security/auth/jwt-manager';
import { SessionManager } from '../../../core/security/auth/session-manager';

export class AuthenticationSkill {
  private extension: ApiExtension;

  constructor(extension: ApiExtension) {
    this.extension = extension;
  }

  /**
   * Get all authentication-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      validate_token: {
        name: 'validate_token',
        description: 'Validate authentication token',
        category: ActionCategory.SYSTEM,
        parameters: { token: 'string', type: 'string' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.validateToken(_agent, params);
        },
      },

      validate_api_key: {
        name: 'validate_api_key',
        description: 'Validate API key',
        category: ActionCategory.SYSTEM,
        parameters: { apiKey: 'string', permissions: 'array' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.validateApiKey(_agent, params);
        },
      },

      check_permissions: {
        name: 'check_permissions',
        description: 'Check user permissions for specific action',
        category: ActionCategory.SYSTEM,
        parameters: { userId: 'string', action: 'string', resource: 'string' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.checkPermissions(_agent, params);
        },
      },

      generate_session: {
        name: 'generate_session',
        description: 'Generate new session for authenticated user',
        category: ActionCategory.SYSTEM,
        parameters: { userId: 'string', metadata: 'object' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.generateSession(_agent, params);
        },
      },

      revoke_session: {
        name: 'revoke_session',
        description: 'Revoke user session',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string', reason: 'string' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.revokeSession(_agent, params);
        },
      },
    };
  }

  /**
   * Validate authentication token
   */
  private async validateToken(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { token, type = 'bearer' } = params;

      if (!token) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Token is required',
          metadata: {
            action: 'validate_token',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // JWT token validation
      const isValid = await this.performTokenValidation(
        String(token),
        String(type)
      );
      const decoded = isValid ? await this.decodeToken(String(token)) : null;

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          isValid,
          decoded: decoded as any,
          tokenType: type,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'validate_token',
          tokenType: type,
          isValid,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to validate token: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'validate_token',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Validate API key
   */
  private async validateApiKey(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { apiKey, permissions = [] } = params;

      if (!apiKey) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'API key is required',
          metadata: {
            action: 'validate_api_key',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Check if API key exists in configuration
      const config = this.extension.config;
      const isValid =
        config.settings.auth?.apiKeys?.includes(String(apiKey)) || false;

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          isValid,
          permissions: isValid ? permissions : [],
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'validate_api_key',
          isValid,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to validate API key: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'validate_api_key',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Check user permissions
   */
  private async checkPermissions(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { userId, action, resource } = params;

      // Basic permission checking logic
      const hasPermission = await this.performPermissionCheck(
        String(userId),
        String(action),
        String(resource)
      );

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          hasPermission,
          userId,
          action,
          resource,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'check_permissions',
          userId,
          hasPermission,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to check permissions: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'check_permissions',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Generate new session
   */
  private async generateSession(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { userId, metadata = {} } = params;

      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = {
        sessionId,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        metadata,
      };

      // Store session (in practice, this would be stored in a database)

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          session,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'generate_session',
          userId,
          sessionId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to generate session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'generate_session',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Revoke session
   */
  private async revokeSession(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { sessionId, reason = 'manual_revocation' } = params;

      // Revoke session (in practice, this would update the database)
      const revoked = {
        sessionId,
        revokedAt: new Date().toISOString(),
        reason,
      };

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          revoked,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'revoke_session',
          sessionId,
          reason,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to revoke session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'revoke_session',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Perform token validation using JWT
   */
  private async performTokenValidation(
    token: string,
    type: string
  ): Promise<boolean> {
    if (type !== 'bearer') {
      return false;
    }

    try {
      // Get JWT manager from extension
      const jwtManager = (this.extension as any).jwtManager as JWTManager;
      if (!jwtManager) {
        console.warn('JWT manager not available');
        return false;
      }

      await jwtManager.verifyToken(token, 'access');
      return true;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Decode token using JWT
   */
  private async decodeToken(
    token: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const jwtManager = (this.extension as any).jwtManager as JWTManager;
      if (!jwtManager) {
        return null;
      }

      const payload = await jwtManager.verifyToken(token, 'access');
      return {
        sub: payload.sub,
        iat: payload.iat,
        exp: payload.exp,
        scopes: payload.scopes || [],
        type: payload.type,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Perform permission check
   */
  private async performPermissionCheck(
    _userId: string,
    _action: string,
    _resource: string
  ): Promise<boolean> {
    // Basic permission logic - in practice this would check against a proper RBAC system
    return true; // Placeholder
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return (
      'sess_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
