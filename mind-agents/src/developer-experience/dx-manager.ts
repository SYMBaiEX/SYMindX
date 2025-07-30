/**
 * Developer Experience Manager
 * Central orchestrator for all DX features
 */

import { EventEmitter } from 'events';
import {
  DeveloperExperienceConfig,
  DXEvent,
  DXEventHandler,
  UsageMetrics,
} from './types/index.js';

export class DeveloperExperienceManager extends EventEmitter {
  private config: DeveloperExperienceConfig;
  private initialized = false;
  private features = new Map<string, any>();
  private analytics: DeveloperAnalytics;

  constructor(config: DeveloperExperienceConfig) {
    super();
    this.config = config;
    this.analytics = new DeveloperAnalytics(config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing SYMindX Developer Experience...');

    // Initialize core features
    if (this.config.enableInteractiveTutorials) {
      const { InteractiveTutorialManager } = await import(
        './interactive-tutorials/tutorial-manager.js'
      );
      this.features.set('tutorials', new InteractiveTutorialManager());
      await this.features.get('tutorials').initialize();
    }

    if (this.config.enableAIAssistedCoding) {
      const { AIAssistedCodingEngine } = await import(
        './ai-assisted-coding/coding-engine.js'
      );
      this.features.set('ai-coding', new AIAssistedCodingEngine());
      await this.features.get('ai-coding').initialize();
    }

    if (this.config.enableVisualDebugger) {
      const { VisualDebuggerManager } = await import(
        './visual-debugger/debugger-manager.js'
      );
      this.features.set('debugger', new VisualDebuggerManager());
      await this.features.get('debugger').initialize();
    }

    if (this.config.enableProductivityTools) {
      const { ProductivityToolsManager } = await import(
        './productivity-tools/tools-manager.js'
      );
      this.features.set('productivity', new ProductivityToolsManager());
      await this.features.get('productivity').initialize();
    }

    if (this.config.enableDocumentationPlatform) {
      const { DocumentationPlatformManager } = await import(
        './documentation-platform/docs-manager.js'
      );
      this.features.set('docs', new DocumentationPlatformManager());
      await this.features.get('docs').initialize();
    }

    // Setup cross-feature integrations
    this.setupIntegrations();

    this.initialized = true;
    this.emit('initialized');

    console.log('✅ Developer Experience initialized successfully!');
    this.showWelcomeMessage();
  }

  private setupIntegrations(): void {
    // Connect AI coding with tutorials
    if (this.features.has('ai-coding') && this.features.has('tutorials')) {
      const aiCoding = this.features.get('ai-coding');
      const tutorials = this.features.get('tutorials');

      aiCoding.on('code-completion', (data: any) => {
        tutorials.trackProgress(data.tutorialId, 'code-assistance');
      });
    }

    // Connect debugger with productivity tools
    if (this.features.has('debugger') && this.features.has('productivity')) {
      const visualDebugger = this.features.get('debugger');
      const productivity = this.features.get('productivity');

      visualDebugger?.on('performance-issue', (data: any) => {
        productivity?.suggestOptimization(data);
      });
    }
  }

  private showWelcomeMessage(): void {
    console.log(`
    ┌─────────────────────────────────────────────────────────────┐
    │  🎉 Welcome to SYMindX Developer Experience Revolution!     │
    │                                                             │
    │  🎯 Interactive Tutorials: Learn by building               │
    │  🤖 AI-Assisted Coding: Intelligent completions            │
    │  🔍 Visual Debugger: See your agents in real-time         │
    │  ⚡ Productivity Tools: Build faster with hot reload      │
    │  📚 Smart Documentation: Interactive examples & guides     │
    │                                                             │
    │  Ready to revolutionize AI agent development? Let's go!    │
    └─────────────────────────────────────────────────────────────┘
    `);
  }

  // Feature Access Methods
  getTutorialManager() {
    return this.features.get('tutorials');
  }

  getAICodingEngine() {
    return this.features.get('ai-coding');
  }

  getVisualDebugger() {
    return this.features.get('debugger');
  }

  getProductivityTools() {
    return this.features.get('productivity');
  }

  getDocumentationPlatform() {
    return this.features.get('docs');
  }

  // Analytics
  async getUsageMetrics(): Promise<UsageMetrics> {
    return this.analytics.getMetrics();
  }

  trackEvent(event: string, data: Record<string, any>): void {
    this.analytics.trackEvent(event, data);
  }

  // CLI Integration
  async startTutorial(tutorialId?: string): Promise<void> {
    const tutorials = this.getTutorialManager();
    if (!tutorials) {
      throw new Error('Interactive tutorials not enabled');
    }

    return tutorials.startTutorial(tutorialId);
  }

  async openVisualDebugger(agentId?: string): Promise<void> {
    const visualDebugger = this.getVisualDebugger();
    if (!visualDebugger) {
      throw new Error('Visual debugger not enabled');
    }

    return visualDebugger.openDebugger(agentId);
  }

  async generateCode(prompt: string, context?: any): Promise<string> {
    const aiCoding = this.getAICodingEngine();
    if (!aiCoding) {
      throw new Error('AI-assisted coding not enabled');
    }

    return aiCoding.generateCode(prompt, context);
  }

  // Configuration
  updateConfig(newConfig: Partial<DeveloperExperienceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  getConfig(): DeveloperExperienceConfig {
    return { ...this.config };
  }

  // Cleanup
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Developer Experience...');

    for (const [name, feature] of this.features) {
      try {
        if (feature.shutdown) {
          await feature.shutdown();
        }
      } catch (error) {
        console.error(`Error shutting down ${name}:`, error);
      }
    }

    this.features.clear();
    this.initialized = false;

    console.log('✅ Developer Experience shutdown complete');
  }
}

/**
 * Simple analytics collector
 */
class DeveloperAnalytics {
  private events: Array<{ event: string; data: any; timestamp: Date }> = [];
  private config: DeveloperExperienceConfig;

  constructor(config: DeveloperExperienceConfig) {
    this.config = config;
  }

  trackEvent(event: string, data: Record<string, any>): void {
    if (!this.config.enableAnalytics) return;

    this.events.push({
      event,
      data,
      timestamp: new Date(),
    });

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  async getMetrics(): Promise<UsageMetrics> {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const recentEvents = this.events.filter(
      (e) => now - e.timestamp.getTime() < dayMs
    );

    const featureUsage = new Map<string, number>();
    recentEvents.forEach((event) => {
      const current = featureUsage.get(event.event) || 0;
      featureUsage.set(event.event, current + 1);
    });

    return {
      totalUsers: 1, // Single-user for now
      activeUsers: recentEvents.length > 0 ? 1 : 0,
      tutorialsCompleted: recentEvents.filter(
        (e) => e.event === 'tutorial-completed'
      ).length,
      codeCompletionsUsed: recentEvents.filter(
        (e) => e.event === 'code-completion'
      ).length,
      debuggingSessions: recentEvents.filter((e) => e.event === 'debug-session')
        .length,
      averageSessionTime: this.calculateAverageSessionTime(recentEvents),
      popularFeatures: Array.from(featureUsage.entries())
        .map(([feature, usage]) => ({ feature, usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 10),
    };
  }

  private calculateAverageSessionTime(events: any[]): number {
    // Simple heuristic - time between first and last event
    if (events.length < 2) return 0;

    const firstEvent = events[0].timestamp.getTime();
    const lastEvent = events[events.length - 1].timestamp.getTime();
    return (lastEvent - firstEvent) / 1000 / 60; // minutes
  }
}
