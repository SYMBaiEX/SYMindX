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
export function initializeSkills(extension: any, config: any = {}) {
  return {
    http: new HttpSkill(extension),
    websocketServer: new WebSocketServerSkill(extension, config.websocket),
    chat: new ChatSkill(extension),
    authentication: new AuthenticationSkill(extension),
    sessionManagement: new SessionManagementSkill(extension),
    healthMonitoring: new HealthMonitoringSkill(extension),
  };
}
