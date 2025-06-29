/**
 * Simple Plugin Loader
 * Emergency cleanup - basic implementation only
 */

import { Extension } from '../types/agent.js'
import { ExtensionContext } from '../types/extension.js'

export interface SimplePluginLoader {
  loadExtensions(): Promise<Extension[]>
  getStats(): Record<string, number>
}

export class BasicPluginLoader implements SimplePluginLoader {
  private context: ExtensionContext

  constructor(context: ExtensionContext) {
    this.context = context
  }

  async loadExtensions(): Promise<Extension[]> {
    // For emergency cleanup, return empty array
    // Extensions can be manually registered later
    return []
  }

  getStats(): Record<string, number> {
    return {
      loaded: 0,
      failed: 0,
      total: 0
    }
  }
}

export function createPluginLoader(context: ExtensionContext): SimplePluginLoader {
  return new BasicPluginLoader(context)
}