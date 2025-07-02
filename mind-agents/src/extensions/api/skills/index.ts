/**
 * API Extension Skills
 * 
 * This module exports all the skills available in the API extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

import { HttpSkill } from './http.js'
import { WebSocketServerSkill } from './websocket-server.js'
import { ChatSkill } from './chat.js'
import { AuthenticationSkill } from './authentication.js'
import { SessionManagementSkill } from './session-management.js'
import { HealthMonitoringSkill } from './health-monitoring.js'

export {
  HttpSkill,
  WebSocketServerSkill,
  ChatSkill,
  AuthenticationSkill,
  SessionManagementSkill,
  HealthMonitoringSkill
}

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
    healthMonitoring: new HealthMonitoringSkill(extension)
  }
}