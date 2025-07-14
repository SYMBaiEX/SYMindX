/**
 * API Extension Skills
 *
 * This module exports all the skills available in the API extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

import { AuthenticationSkill } from './authentication';
import { ChatSkill } from './chat';
import { HealthMonitoringSkill } from './health-monitoring';
import { HttpSkill } from './http';
import { SessionManagementSkill } from './session-management';
import { WebSocketServerSkill } from './websocket-server';

export {
  HttpSkill,
  WebSocketServerSkill,
  ChatSkill,
  AuthenticationSkill,
  SessionManagementSkill,
  HealthMonitoringSkill,
};

/**
 * Initialize all skills with the API extension instance
 */
export function initializeSkills(
  extension: unknown,
  config: Record<string, unknown> = {}
): {
  http: HttpSkill;
  websocketServer: WebSocketServerSkill;
  chat: ChatSkill;
  authentication: AuthenticationSkill;
  sessionManagement: SessionManagementSkill;
  healthMonitoring: HealthMonitoringSkill;
} {
  return {
    http: new HttpSkill(extension as any),
    websocketServer: new WebSocketServerSkill(
      extension as any,
      (config as any).websocket
    ),
    chat: new ChatSkill(extension as any),
    authentication: new AuthenticationSkill(extension as any),
    sessionManagement: new SessionManagementSkill(extension as any),
    healthMonitoring: new HealthMonitoringSkill(extension as any),
  };
}
