/**
 * API Extension Skills
 * 
 * This module exports all the skills available in the API extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

import { HttpSkill } from './http'
import { WebSocketServerSkill } from './websocket-server'
import { ChatSkill } from './chat'
import { AuthenticationSkill } from './authentication'
import { SessionManagementSkill } from './session-management'
import { HealthMonitoringSkill } from './health-monitoring'

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