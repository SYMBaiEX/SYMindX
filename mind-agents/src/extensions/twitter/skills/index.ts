/**
 * Twitter Extension Skills
 * 
 * This module exports all the skills available in the Twitter extension.
 * Each skill represents a group of related actions that the agent can perform.
 */

import { TweetingSkill } from './tweeting.js';
import { EngagementSkill } from './engagement.js';
import { SearchSkill } from './search.js';
import { MediaSkill } from './media.js';
import { UserManagementSkill } from './user-management.js';
import { TwitterSkill, BaseTwitterSkill } from './base-skill.js';
import { TwitterExtension } from '../index.js';

export {
  TweetingSkill,
  EngagementSkill,
  SearchSkill,
  MediaSkill,
  UserManagementSkill,
  BaseTwitterSkill
};

export type { TwitterSkill };

/**
 * Interface for the skills container
 */
export interface TwitterSkills {
  tweeting: TweetingSkill;
  engagement: EngagementSkill;
  search: SearchSkill;
  media: MediaSkill;
  userManagement: UserManagementSkill;
}

/**
 * Initialize all skills with the Twitter extension instance
 */
export function initializeSkills(extension: TwitterExtension): TwitterSkills {
  return {
    tweeting: new TweetingSkill(extension),
    engagement: new EngagementSkill(extension),
    search: new SearchSkill(extension),
    media: new MediaSkill(extension),
    userManagement: new UserManagementSkill(extension)
  };
}