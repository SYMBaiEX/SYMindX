/**
 * Telegram Extension Skills
 * 
 * Exports all skills for the Telegram extension.
 */

export * from './base-skill.js';
export * from './messaging.js';
export * from './chat-management.js';
export * from './media.js';

import { TelegramExtension } from '../index.js';
import { MessagingSkill } from './messaging.js';
import { ChatManagementSkill } from './chat-management.js';
import { MediaSkill } from './media.js';

/**
 * Initialize all skills for the Telegram extension
 * @param extension The Telegram extension instance
 * @returns An array of initialized skills
 */
export function initializeSkills(extension: TelegramExtension) {
  return [
    new MessagingSkill(extension),
    new ChatManagementSkill(extension),
    new MediaSkill(extension)
  ];
}