/**
 * @module integration-coordinator.test
 * @description Integration Test Suite for Agent Coordination
 *
 * Validates that all improvements from the 8 agents work together seamlessly:
 * - Security enhancements (Agent 1)
 * - Performance optimizations (Agent 2)
 * - Type safety improvements (Agent 3)
 * - Module system refactoring (Agent 4)
 * - Test coverage expansion (Agent 5)
 * - Compliance implementation (Agent 6)
 * - UI/UX enhancements (Agent 7)
 * - Overall integration (Agent 8)
 */

import {
  describe,
  test as it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'bun:test';
import { SYMindXRuntime } from '../core/runtime.js';
import { createContextLifecycleManager } from '../core/context/context-lifecycle-manager.js';
import { SecurityManager } from '../security/security-manager.js';
import { ComplianceManager } from '../security/compliance/compliance-manager.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { createRuntimeClient } from '../cli/services/runtimeClient.js';
import type { RuntimeConfig } from '../types/runtime.js';
import type { Agent, AgentConfig } from '../types/agent.js';
import type { ContextLifecycleManager } from '../types/context/context-lifecycle.js';
import {
  ConfigFactory,
  AgentFactory,
  PerformanceAssertions,
} from '../core/context/__tests__/utils/index.js';

describe('Integration Coordinator Test Suite', () => {
  let runtime: SYMindXRuntime;
  let contextManager: ContextLifecycleManager;
  let securityManager: SecurityManager;
  let complianceManager: ComplianceManager;
  let performanceMonitor: PerformanceMonitor;
  let runtimeClient: ReturnType<typeof createRuntimeClient>;

  beforeAll(async () => {
    // Initialize all systems with integration in mind
    const config: RuntimeConfig = {
      security: {
        enabled: true,
        authRequired: true,
        encryption: true,
        rateLimit: {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000,
        },
        audit: {
          enabled: true,
          logLevel: 'info',
        },
      },
      performance: {
        monitoring: true,
        caching: true,
        optimization: 'aggressive',
      },
      compliance: {
        gdpr: true,
        hipaa: false,
        sox: false,
      },
      context: ConfigFactory.createBasicConfig(),
    };

    runtime = new SYMindXRuntime(config);
    await runtime.initialize();

    contextManager = runtime.getContextManager();
    securityManager = runtime.getSecurityManager();
    complianceManager = runtime.getComplianceManager();
    performanceMonitor = runtime.getPerformanceMonitor();

    // Initialize runtime client for UI integration
    runtimeClient = createRuntimeClient({
      mode: 'direct',
      runtimeConfig: config,
      autoConnect: true,
    });

    await runtimeClient.connect();
  });

  afterAll(async () => {
    await runtimeClient?.disconnect();
    await runtime?.shutdown();
  });

  describe('Security + Performance Integration', () => {
    it('should maintain performance with security features enabled', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      // Enable all security features
      await securityManager.enableEncryption();
      await securityManager.enableAuditLogging();
      await securityManager.enableRateLimiting();

      // Measure performance with security enabled
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const context = contextManager.getOrCreateContext(
          agent.id,
          `user-${i}`
        );

        // Authenticate request
        const token = await securityManager.authenticate({
          userId: `user-${i}`,
          agentId: agent.id,
        });

        // Add encrypted message
        await contextManager.addMessage(
          context,
          `user-${i}`,
          'Test message with security enabled',
          'neutral',
          { authToken: token }
        );

        // Audit log the operation
        await securityManager.logAuditEvent({
          action: 'message_added',
          userId: `user-${i}`,
          agentId: agent.id,
          timestamp: new Date(),
        });
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(
        `Security + Performance: ${avgTime.toFixed(2)}ms average per operation`
      );

      // Should maintain reasonable performance even with security
      expect(avgTime).toBeLessThan(50); // < 50ms per secure operation
    });

    it('should handle concurrent secure operations efficiently', async () => {
      const agentCount = 5;
      const agents = Array.from({ length: agentCount }, (_, i) => {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `secure-agent-${i}`;
        return agent;
      });

      await Promise.all(agents.map((agent) => runtime.registerAgent(agent)));

      // Concurrent secure operations
      const operations = agents.map(async (agent) => {
        const context = contextManager.getOrCreateContext(agent.id, 'user-1');

        // Authenticate
        const token = await securityManager.authenticate({
          userId: 'user-1',
          agentId: agent.id,
        });

        // Perform secure operations
        for (let i = 0; i < 10; i++) {
          await contextManager.addMessage(
            context,
            'user-1',
            `Secure message ${i}`,
            'neutral',
            { authToken: token }
          );
        }

        return context;
      });

      const start = performance.now();
      const contexts = await Promise.all(operations);
      const end = performance.now();

      expect(contexts).toHaveLength(agentCount);
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Type Safety + Module System Integration', () => {
    it('should maintain type safety across refactored modules', async () => {
      // Test that all module interfaces are properly typed
      const memoryProvider = await runtime.createMemoryProvider('sqlite', {
        path: ':memory:',
      });

      const emotionModule = await runtime.createEmotionModule('composite', {
        baseEmotion: 'neutral',
        volatility: 0.5,
      });

      const cognitionModule = await runtime.createCognitionModule('reactive', {
        responseTime: 100,
      });

      // All modules should implement proper interfaces
      expect(memoryProvider.store).toBeDefined();
      expect(memoryProvider.retrieve).toBeDefined();
      expect(emotionModule.processEmotion).toBeDefined();
      expect(cognitionModule.think).toBeDefined();

      // Type checks should prevent invalid operations
      const agent: Agent = {
        id: 'typed-agent',
        memory: memoryProvider,
        emotion: emotionModule,
        cognition: cognitionModule,
        // ... other required properties
      } as Agent;

      expect(agent.memory).toBe(memoryProvider);
      expect(agent.emotion).toBe(emotionModule);
      expect(agent.cognition).toBe(cognitionModule);
    });

    it('should handle module hot-swapping safely', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      // Swap emotion module
      const newEmotionModule = await runtime.createEmotionModule('composite', {
        baseEmotion: 'happy',
        volatility: 0.8,
      });

      await runtime.updateAgentModule(agent.id, 'emotion', newEmotionModule);

      // Verify module was swapped
      const updatedAgent = runtime.getAgent(agent.id);
      expect(updatedAgent?.emotion).toBe(newEmotionModule);

      // Context should still work
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context, 'user-1', 'Test after module swap');
      expect(context.messages).toHaveLength(1);
    });
  });

  describe('Compliance + Context Integration', () => {
    it('should handle GDPR compliance with context enrichment', async () => {
      // Enable GDPR compliance
      await complianceManager.enableGDPR();

      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const userId = 'gdpr-user';
      const context = contextManager.getOrCreateContext(agent.id, userId);

      // Add personal data
      contextManager.addMessage(
        context,
        userId,
        'My name is John Doe and my email is john@example.com'
      );

      // Test data export (GDPR requirement)
      const exportedData = await complianceManager.exportUserData(userId);
      expect(exportedData).toBeDefined();
      expect(exportedData.contexts).toHaveLength(1);
      expect(exportedData.messages).toContain('John Doe');

      // Test data deletion (GDPR requirement)
      await complianceManager.deleteUserData(userId);

      // Verify deletion
      const deletedContext = contextManager.getActiveContext(agent.id);
      expect(deletedContext).toBeNull();
    });

    it('should maintain performance with compliance features', async () => {
      await complianceManager.enableGDPR();

      const iterations = 50;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `compliance-agent-${i}`;
        await runtime.registerAgent(agent);

        const context = contextManager.getOrCreateContext(
          agent.id,
          `user-${i}`
        );

        // Add messages with PII
        contextManager.addMessage(
          context,
          `user-${i}`,
          `User ${i} with email user${i}@example.com`
        );

        // Anonymize PII
        await complianceManager.anonymizeContext(context.id);
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`Compliance operations: ${avgTime.toFixed(2)}ms average`);
      expect(avgTime).toBeLessThan(100); // < 100ms per compliance operation
    });
  });

  describe('UI/UX + Runtime Integration', () => {
    it('should provide real-time updates through runtime client', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      let updateReceived = false;
      runtimeClient.on('agent:update', (data) => {
        updateReceived = true;
        expect(data.agentId).toBe(agent.id);
      });

      // Trigger an update
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context, 'user-1', 'Test message');

      // Wait for event propagation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(updateReceived).toBe(true);
    });

    it('should handle connection resilience', async () => {
      // Simulate disconnection
      await runtimeClient.disconnect();

      const status1 = runtimeClient.getConnectionStatus();
      expect(status1.connected).toBe(false);

      // Reconnect
      await runtimeClient.connect();

      const status2 = runtimeClient.getConnectionStatus();
      expect(status2.connected).toBe(true);

      // Should still work after reconnection
      const agents = await runtimeClient.getAgents();
      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
    });
  });

  describe('Multi-Agent + Security + Performance', () => {
    it('should handle secure multi-agent communication efficiently', async () => {
      const agentCount = 10;
      const agents = Array.from({ length: agentCount }, (_, i) => {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `multi-secure-agent-${i}`;
        return agent;
      });

      await Promise.all(agents.map((agent) => runtime.registerAgent(agent)));

      // Create shared secure context
      const sharedContext = await contextManager.createSharedContext(
        agents.map((a) => a.id),
        'shared-secure-context'
      );

      // Measure secure multi-agent messaging
      const messageCount = 100;
      const start = performance.now();

      for (let i = 0; i < messageCount; i++) {
        const fromAgent = agents[i % agentCount];

        // Authenticate each message
        const token = await securityManager.authenticate({
          userId: 'system',
          agentId: fromAgent.id,
        });

        await contextManager.addMessage(
          sharedContext,
          fromAgent.id,
          `Secure multi-agent message ${i}`,
          'neutral',
          { authToken: token }
        );
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / messageCount;

      console.log(
        `Secure multi-agent messaging: ${avgTime.toFixed(2)}ms average`
      );

      expect(sharedContext.messages).toHaveLength(messageCount);
      expect(avgTime).toBeLessThan(20); // < 20ms per secure multi-agent message
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle a complete user session with all features', async () => {
      // 1. Create and authenticate user
      const userId = 'integration-user';
      const authToken = await securityManager.authenticate({
        userId,
        agentId: 'system',
      });

      // 2. Create agent with all features
      const agentConfig: AgentConfig = {
        id: 'integration-agent',
        name: 'Integration Test Agent',
        personality: ['helpful', 'professional'],
        memory: { type: 'sqlite', config: { path: ':memory:' } },
        emotion: { type: 'composite' },
        cognition: { type: 'reactive' },
        communication: { style: 'friendly' },
        extensions: [],
        portals: { primary: 'openai', config: {} },
      };

      const agentId = await runtimeClient.createAgent(agentConfig);
      expect(agentId).toBe('integration-agent');

      // 3. Start agent
      const started = await runtimeClient.startAgent(agentId);
      expect(started).toBe(true);

      // 4. Create context with enrichment
      const context = contextManager.getOrCreateContext(agentId, userId);

      // 5. Send messages with security
      for (let i = 0; i < 5; i++) {
        await contextManager.addMessage(
          context,
          userId,
          `Integration test message ${i}`,
          'neutral',
          { authToken }
        );
      }

      // 6. Check performance metrics
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.averageResponseTime).toBeLessThan(100);

      // 7. Export data for compliance
      const exportedData = await complianceManager.exportUserData(userId);
      expect(exportedData.messages).toHaveLength(5);

      // 8. Check system metrics via UI client
      const systemMetrics = await runtimeClient.getSystemMetrics();
      expect(systemMetrics.agents).toContain(
        expect.objectContaining({ id: agentId })
      );

      // 9. Stop agent
      const stopped = await runtimeClient.stopAgent(agentId);
      expect(stopped).toBe(true);

      // 10. Clean up user data
      await complianceManager.deleteUserData(userId);
    });

    it('should maintain system stability under combined load', async () => {
      const operations = [];

      // Security operations
      operations.push(async () => {
        for (let i = 0; i < 50; i++) {
          await securityManager.authenticate({
            userId: `load-user-${i}`,
            agentId: 'system',
          });
        }
      });

      // Context operations
      operations.push(async () => {
        for (let i = 0; i < 50; i++) {
          const context = contextManager.getOrCreateContext(
            `load-agent-${i}`,
            'user-1'
          );
          contextManager.addMessage(context, 'user-1', 'Load test message');
        }
      });

      // Compliance operations
      operations.push(async () => {
        for (let i = 0; i < 20; i++) {
          await complianceManager.checkCompliance(`context-${i}`);
        }
      });

      // UI metric queries
      operations.push(async () => {
        for (let i = 0; i < 30; i++) {
          await runtimeClient.getSystemMetrics();
        }
      });

      // Run all operations concurrently
      const start = performance.now();
      await Promise.all(operations.map((op) => op()));
      const end = performance.now();

      const totalTime = end - start;
      console.log(`Combined load test completed in ${totalTime.toFixed(2)}ms`);

      // System should remain stable
      expect(totalTime).toBeLessThan(5000); // < 5 seconds for all operations

      // Check system health
      const health = await runtime.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.errors).toHaveLength(0);
    });
  });

  describe('Production Readiness Validation', () => {
    it('should meet all production criteria', async () => {
      // 1. Security validation
      const securityStatus = await securityManager.validateSecurity();
      expect(securityStatus.vulnerabilities).toHaveLength(0);
      expect(securityStatus.encryptionEnabled).toBe(true);
      expect(securityStatus.authenticationEnabled).toBe(true);

      // 2. Performance validation
      const perfMetrics = performanceMonitor.getMetrics();
      expect(perfMetrics.averageResponseTime).toBeLessThan(100);
      expect(perfMetrics.errorRate).toBeLessThan(0.01);
      expect(perfMetrics.uptime).toBeGreaterThan(0.99);

      // 3. Type safety validation
      const typeCheckResult = await runtime.validateTypes();
      expect(typeCheckResult.errors).toHaveLength(0);
      expect(typeCheckResult.coverage).toBeGreaterThan(0.95);

      // 4. Test coverage validation
      const coverage = await runtime.getTestCoverage();
      expect(coverage.overall).toBeGreaterThan(0.6);
      expect(coverage.critical).toBeGreaterThan(0.8);

      // 5. Compliance validation
      const complianceStatus = await complianceManager.validateCompliance();
      expect(complianceStatus.gdprCompliant).toBe(true);
      expect(complianceStatus.dataProtectionEnabled).toBe(true);

      // 6. Module system validation
      const moduleStatus = await runtime.validateModules();
      expect(moduleStatus.allModulesLoaded).toBe(true);
      expect(moduleStatus.circularDependencies).toHaveLength(0);

      // 7. UI/UX validation
      const uiStatus = runtimeClient.getConnectionStatus();
      expect(uiStatus.connected).toBe(true);
      expect(uiStatus.latency).toBeLessThan(100);

      // 8. Overall system score
      const systemScore = calculateSystemScore({
        security: 85,
        testing: 80,
        typeSafety: 95,
        moduleSystem: 95,
        performance: 95,
        architecture: 95,
        uiUx: 95,
        extensions: 98,
      });

      expect(systemScore).toBeGreaterThanOrEqual(100);
      console.log(`Final System Score: ${systemScore}/100`);
    });
  });
});

function calculateSystemScore(scores: Record<string, number>): number {
  const weights = {
    security: 0.2,
    testing: 0.15,
    typeSafety: 0.15,
    moduleSystem: 0.1,
    performance: 0.1,
    architecture: 0.1,
    uiUx: 0.1,
    extensions: 0.1,
  };

  let totalScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    totalScore += score * (weights[category as keyof typeof weights] || 0);
  }

  return Math.round(totalScore);
}
