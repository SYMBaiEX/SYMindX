/**
 * Context Injection Patterns for SYMindX
 *
 * This module exports all dependency injection patterns for automatic
 * context propagation throughout the system.
 */

// Module injection patterns
export * from './module-injection';
export { moduleInjectionPatterns } from './module-injection';

// Extension injection patterns
export * from './extension-injection';
export { extensionInjectionPatterns } from './extension-injection';

// Portal injection patterns
export * from './portal-injection';
export { portalInjectionPatterns } from './portal-injection';

// Service injection patterns
export * from './service-injection';
export { serviceInjectionPatterns } from './service-injection';

// Aggregate all patterns for easy access
export const allInjectionPatterns = {
  module: () =>
    import('./module-injection').then((m) => m.moduleInjectionPatterns),
  extension: () =>
    import('./extension-injection').then((m) => m.extensionInjectionPatterns),
  portal: () =>
    import('./portal-injection').then((m) => m.portalInjectionPatterns),
  service: () =>
    import('./service-injection').then((m) => m.serviceInjectionPatterns),
};

/**
 * Pattern registry for dynamic loading
 */
export class InjectionPatternRegistry {
  private static patterns = new Map<string, any>();

  /**
   * Register injection patterns for a specific domain
   */
  static registerPatterns(domain: string, patterns: any): void {
    this.patterns.set(domain, patterns);
  }

  /**
   * Get injection patterns for a domain
   */
  static getPatterns(domain: string): any {
    return this.patterns.get(domain);
  }

  /**
   * Get all registered domains
   */
  static getDomains(): string[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Initialize with built-in patterns
   */
  static initialize(): void {
    // Lazy load patterns to avoid circular dependencies
    this.patterns.set('module', () =>
      import('./module-injection').then((m) => m.moduleInjectionPatterns)
    );
    this.patterns.set('extension', () =>
      import('./extension-injection').then((m) => m.extensionInjectionPatterns)
    );
    this.patterns.set('portal', () =>
      import('./portal-injection').then((m) => m.portalInjectionPatterns)
    );
    this.patterns.set('service', () =>
      import('./service-injection').then((m) => m.serviceInjectionPatterns)
    );
  }
}

// Initialize patterns on module load
InjectionPatternRegistry.initialize();
