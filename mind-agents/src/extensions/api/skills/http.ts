/**
 * HTTP Skill for API Extension
 *
 * Provides actions related to HTTP request handling and response management.
 */

// HTTP skill implementation - Express types available when needed

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
} from '../../../types/agent';
import type { SkillParameters } from '../../../types/common';
import type {
  SkillExecutionContext,
  SkillResult,
  HTTPSkillConfig,
  APISkillResult,
} from '../../../types/extensions/skills';
import { ApiExtension } from '../index';

export class HttpSkill {
  private _extension: ApiExtension;

  constructor(extension: ApiExtension) {
    this._extension = extension;
  }

  /**
   * Get all HTTP-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      handle_chat_request: {
        name: 'handle_chat_request',
        description: 'Handle incoming chat requests via HTTP API',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          message: 'string',
          sessionId: 'string',
          userId: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          const context: SkillExecutionContext = {
            agent: _agent,
            parameters: params,
            metadata: {
              executionId: `http-chat-${Date.now()}`,
              startTime: new Date(),
              extension: 'api',
            },
            environment: {
              mode:
                process.env.NODE_ENV === 'production'
                  ? 'production'
                  : 'development',
              resources: {
                memory: process.memoryUsage().heapUsed,
                cpu: process.cpuUsage().user,
              },
            },
          };
          return this.handleChatRequest(context);
        },
      },

      send_response: {
        name: 'send_response',
        description: 'Send HTTP response to client',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          response: 'object',
          statusCode: 'number',
          headers: 'object',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.sendResponse(_agent, params);
        },
      },

      validate_request: {
        name: 'validate_request',
        description: 'Validate incoming HTTP request',
        category: ActionCategory.SYSTEM,
        parameters: { request: 'object', schema: 'object' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.validateRequest(_agent, params);
        },
      },

      handle_cors: {
        name: 'handle_cors',
        description: 'Handle CORS preflight and headers',
        category: ActionCategory.SYSTEM,
        parameters: { origin: 'string', methods: 'array', headers: 'array' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.handleCors(_agent, params);
        },
      },

      rate_limit_check: {
        name: 'rate_limit_check',
        description: 'Check if request is within rate limits',
        category: ActionCategory.SYSTEM,
        parameters: { clientId: 'string', endpoint: 'string' },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.rateLimitCheck(_agent, params);
        },
      },
    };
  }

  /**
   * Handle incoming chat request
   */
  private async handleChatRequest(
    context: SkillExecutionContext
  ): Promise<ActionResult> {
    try {
      const { message, sessionId, userId } = context.parameters;

      // Process the chat message through the extension's chat handler
      let response;
      if (this._extension.handleChatRequest) {
        // Use extension's chat handling if available
        const chatResponse = await this._extension.handleChatRequest({
          agentId: context.agent.id,
          message: message as string,
          conversationId: sessionId as string,
          userId: userId as string,
        });
        response = {
          message: chatResponse.message || chatResponse.response,
          sessionId,
          userId,
          source: 'api',
        };
      } else {
        // Fallback response
        response = {
          message: `Received message: ${message}`,
          sessionId,
          userId,
          source: 'api',
        };
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          response: response.message,
          sessionId,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'handle_chat_request',
          userId,
          sessionId,
        },
      };
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to handle chat request: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'handle_chat_request',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Send HTTP response
   */
  private async sendResponse(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { response, statusCode = 200, headers = {} } = params;

      // This would typically be handled by the extension's response system
      // For now, we'll return the formatted response data

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          statusCode,
          headers,
          body: response,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'send_response',
          statusCode,
        },
      };
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to send response: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'send_response',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Validate incoming request
   */
  private async validateRequest(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { request, schema } = params;

      // Basic validation logic
      const isValid = this.performValidation(request, schema);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          isValid,
          validationResult: isValid ? 'passed' : 'failed',
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'validate_request',
          isValid,
        },
      };
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to validate request: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'validate_request',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Handle CORS
   */
  private async handleCors(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { origin, methods = ['GET', 'POST'], headers = [] } = params;

      const corsHeaders = {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': methods.join(', '),
        'Access-Control-Allow-Headers': headers.join(', '),
        'Access-Control-Allow-Credentials': 'true',
      };

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          corsHeaders,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'handle_cors',
          origin,
        },
      };
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to handle CORS: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'handle_cors',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Check rate limits
   */
  private async rateLimitCheck(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { clientId, endpoint } = params;

      // Basic rate limiting logic (would be more sophisticated in practice)
      const isWithinLimits = true; // Placeholder

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          isWithinLimits,
          clientId,
          endpoint,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          action: 'rate_limit_check',
          clientId,
          endpoint,
        },
      };
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to check rate limits: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'rate_limit_check',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Perform basic validation
   */
  private performValidation(
    request: Record<string, unknown>,
    schema: Record<string, unknown>
  ): boolean {
    // Basic validation logic - in practice this would use a proper validation library
    if (!request || !schema) return false;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in request)) return false;
      }
    }

    return true;
  }
}
