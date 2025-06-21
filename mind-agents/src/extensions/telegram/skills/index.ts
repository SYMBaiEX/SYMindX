/**
 * Telegram Extension Skills
 * 
 * Exports all skills for the Telegram extension.
 */

export * from './base-skill';
export * from './messaging';
export * from './chat-management';
export * from './media';

import { TelegramExtension } from '../index';
import { MessagingSkill } from './messaging';
import { ChatManagementSkill } from './chat-management';
import { MediaSkill } from './media';

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