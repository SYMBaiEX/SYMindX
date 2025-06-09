/**
 * Media Skill for Twitter Extension
 * 
 * Provides actions related to uploading and managing media.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory } from '../../../types/agent.js';
import { TwitterExtension } from '../index.js';
import { BaseTwitterSkill } from './base-skill.js';
import { TwitterActionType, TwitterErrorType, TwitterMediaType } from '../types.js';

export class MediaSkill extends BaseTwitterSkill {
  /**
   * Get all media-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      [TwitterActionType.UPLOAD_MEDIA]: {
        name: TwitterActionType.UPLOAD_MEDIA,
        description: 'Upload media to Twitter',
        category: ActionCategory.MANIPULATION,
        parameters: { 
          file_path: 'string', 
          alt_text: 'string', 
          media_type: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.uploadMedia(
            params.file_path, 
            params.alt_text, 
            params.media_type as TwitterMediaType
          );
        }
      },
      
      [TwitterActionType.DELETE_MEDIA]: {
        name: TwitterActionType.DELETE_MEDIA,
        description: 'Delete uploaded media',
        category: ActionCategory.MANIPULATION,
        parameters: { 
          media_key: 'string' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.deleteMedia(params.media_key);
        }
      }
    };
  }

  /**
   * Upload media to Twitter
   */
  async uploadMedia(
    filePath: string, 
    altText?: string, 
    mediaType: TwitterMediaType = TwitterMediaType.PHOTO
  ): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.uploadMedia(filePath, altText, mediaType);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.INVALID_REQUEST);
    }
  }

  /**
   * Delete uploaded media
   */
  async deleteMedia(mediaKey: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.deleteMedia(mediaKey);
    } catch (error) {
      return this.createErrorResult(error, TwitterErrorType.RESOURCE_NOT_FOUND);
    }
  }
}