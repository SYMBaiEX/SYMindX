/**
 * Utility functions for portals
 */

import type { LanguageModelUsage } from 'ai'

/**
 * Convert AI SDK v5 usage to our internal format
 */
export function convertUsage(usage?: LanguageModelUsage | Record<string, any>): {
  promptTokens: number
  completionTokens: number
  totalTokens: number
} | undefined {
  if (!usage) return undefined
  
  // Handle different usage formats
  const promptTokens = (usage as any).promptTokens || 0
  const completionTokens = (usage as any).completionTokens || 0
  
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  }
}