/**
 * Compliance Dashboard Tests
 *
 * Test suite for the unified compliance dashboard
 */

import { createComplianceDashboard } from '../compliance-dashboard';
import { createQuantumSecurityService } from '../quantum';
import { createHomomorphicEncryptionService } from '../homomorphic';
import { createAIActComplianceService } from '../ai-act';
import {
  ComplianceDashboardData,
  ComplianceAlert,
  ComplianceAction,
} from '../compliance-dashboard';
import {
  QuantumReadinessReport,
  QRNGStatus,
  FLRound,
  DPBudget,
} from '../../../types/quantum-security';
import {
  AIActComplianceStatus,
  AIActComplianceReport,
  BiasReport,
  HumanOversightRequest,
  AISystemLog,
} from '../../../types/ai-act-compliance';
import { HEPerformanceMetrics } from '../../../types/homomorphic-encryption';

describe('Compliance Dashboard', () => {
  let dashboard: any;

  beforeEach(() => {
    dashboard = createComplianceDashboard();
  });

  afterEach(() => {
    dashboard.stop();
  });

  describe('Dashboard Initialization', () => {
    test('should initialize with default values', () => {
      const data = dashboard.getData();

      expect(data).toBeDefined();
      expect(data.overallCompliant).toBe(true);
      expect(data.lastUpdated).toBeInstanceOf(Date);
      expect(data.aiActCompliance).toBeDefined();
      expect(data.quantumSecurity).toBeDefined();
      expect(data.homomorphicEncryption).toBeDefined();
      expect(data.privacyMetrics).toBeDefined();
      expect(data.alerts).toEqual([]);
      expect(data.recommendedActions).toEqual([]);
    });

    test('should start monitoring', async () => {
      await dashboard.start(100); // Update every 100ms for testing

      // Wait for an update
      await new Promise((resolve) => setTimeout(resolve, 150));

      const data = dashboard.getData();
      expect(data.lastUpdated.getTime()).toBeGreaterThan(Date.now() - 200);
    });
  });

  describe('AI Act Compliance Updates', () => {
    test('should update AI Act compliance status', () => {
      const status: AIActComplianceStatus = {
        compliant: true,
        lastAssessment: new Date(),
        riskCategory: 'high',
        requirements: [
          {
            id: 'REQ-001',
            name: 'Explainability',
            description: 'Must provide explanations',
            category: 'transparency',
            mandatory: true,
            status: 'compliant',
            evidence: ['Implemented'],
          },
        ],
        violations: [],
        certifications: [],
      };

      dashboard.updateAIActCompliance(status);

      const data = dashboard.getData();
      expect(data.aiActCompliance.status).toEqual(status);
    });

    test('should track pending human reviews', () => {
      const pendingReviews: HumanOversightRequest[] = [
        {
          id: 'review-1',
          systemId: 'system-1',
          requestedAt: new Date(),
          urgency: 'high',
          context: {},
          aiDecision: {},
          confidence: 0.5,
          status: 'pending',
        },
        {
          id: 'review-2',
          systemId: 'system-1',
          requestedAt: new Date(),
          urgency: 'medium',
          context: {},
          aiDecision: {},
          confidence: 0.6,
          status: 'pending',
        },
      ];

      dashboard.updateAIActCompliance(
        {} as AIActComplianceStatus,
        undefined,
        pendingReviews
      );

      const data = dashboard.getData();
      expect(data.aiActCompliance.pendingReviews).toBe(2);
    });

    test('should update bias metrics', () => {
      const biasReport: BiasReport = {
        timestamp: new Date(),
        metrics: [
          {
            name: 'demographic-parity',
            value: 0.15,
            threshold: 0.1,
            passed: false,
            affectedGroups: ['group-a', 'group-b'],
          },
        ],
        detectedBiases: [
          {
            attribute: 'gender',
            metric: 'demographic-parity',
            severity: 'high',
            disparity: 0.15,
            affectedGroups: ['male', 'female'],
          },
        ],
        overallFairness: 0.85,
      };

      dashboard.updateAIActCompliance(
        {} as AIActComplianceStatus,
        undefined,
        undefined,
        biasReport
      );

      const data = dashboard.getData();
      expect(data.aiActCompliance.biasMetrics).toEqual(biasReport);
    });

    test('should count anomalies from logs', () => {
      const logs: AISystemLog[] = [
        {
          id: 'log-1',
          timestamp: new Date(),
          eventType: 'inference',
          systemId: 'system-1',
          anomalies: [
            {
              type: 'performance',
              severity: 'high',
              description: 'Slow response',
            },
            {
              type: 'behavior',
              severity: 'medium',
              description: 'Unusual pattern',
            },
          ],
        },
        {
          id: 'log-2',
          timestamp: new Date(),
          eventType: 'decision',
          systemId: 'system-1',
          anomalies: [
            {
              type: 'security',
              severity: 'critical',
              description: 'Suspicious input',
            },
          ],
        },
      ];

      dashboard.updateAIActCompliance(
        {} as AIActComplianceStatus,
        undefined,
        undefined,
        undefined,
        logs
      );

      const data = dashboard.getData();
      expect(data.aiActCompliance.recentAnomalies).toBe(3);
    });
  });

  describe('Quantum Security Updates', () => {
    test('should update quantum readiness report', () => {
      const readinessReport: QuantumReadinessReport = {
        assessedAt: new Date(),
        overallScore: 75,
        components: {
          encryption: { status: 'partial', score: 70 },
          signatures: { status: 'ready', score: 90 },
          keyExchange: { status: 'partial', score: 65 },
          randomGeneration: { status: 'ready', score: 85 },
        },
        vulnerabilities: [
          {
            component: 'TLS',
            algorithm: 'RSA-2048',
            severity: 'high',
            quantumThreat: 'immediate',
            migrationPath: 'CRYSTALS-Kyber',
          },
        ],
        recommendations: [
          {
            action: 'Migrate RSA to CRYSTALS-Dilithium',
            priority: 1,
            effort: 'medium',
            impact: 'Critical security improvement',
          },
        ],
        migrationPlan: {
          phases: [],
          estimatedDuration: 180,
          requiredResources: [],
        },
        estimatedCost: 50000,
        estimatedTime: 180,
      };

      dashboard.updateQuantumSecurity(readinessReport);

      const data = dashboard.getData();
      expect(data.quantumSecurity.readinessReport).toEqual(readinessReport);
    });

    test('should update QRNG status', () => {
      const qrngStatus: QRNGStatus = {
        healthy: true,
        source: 'optical',
        entropyRate: 8.5,
        temperature: 20.5,
        uptime: 3600,
        totalBitsGenerated: 1000000,
        lastHealthCheck: new Date(),
        errors: [],
      };

      dashboard.updateQuantumSecurity(undefined, qrngStatus);

      const data = dashboard.getData();
      expect(data.quantumSecurity.qrngStatus).toEqual(qrngStatus);
    });

    test('should update encryption metrics', () => {
      const metrics = {
        keysGenerated: 100,
        encryptionsPerformed: 500,
        migrationsCompleted: 10,
      };

      dashboard.updateQuantumSecurity(
        undefined,
        undefined,
        5, // Active QKD sessions
        metrics
      );

      const data = dashboard.getData();
      expect(data.quantumSecurity.activeQKDSessions).toBe(5);
      expect(data.quantumSecurity.encryptionMetrics).toEqual(metrics);
    });
  });

  describe('Homomorphic Encryption Updates', () => {
    test('should update HE performance metrics', () => {
      const metrics: HEPerformanceMetrics = {
        encryptionTime: {
          average: 50,
          min: 30,
          max: 100,
        },
        decryptionTime: {
          average: 40,
          min: 25,
          max: 80,
        },
        computationTime: {
          addition: 10,
          multiplication: 20,
          bootstrapping: 500,
        },
        memoryUsage: 2048,
        ciphertextSize: {
          single: 16384,
          packed: 32768,
        },
        keySize: {
          public: 8192,
          secret: 4096,
          evaluation: 16384,
        },
        operations: {
          encryptions: 1000,
          decryptions: 900,
          additions: 500,
          multiplications: 200,
          bootstraps: 10,
        },
      };

      dashboard.updateHomomorphicEncryption(metrics);

      const data = dashboard.getData();
      expect(data.homomorphicEncryption.performanceMetrics).toEqual(metrics);
    });

    test('should update encrypted memory counts', () => {
      dashboard.updateHomomorphicEncryption(
        undefined,
        150, // Encrypted memories
        25, // Private inferences
        3 // Active computations
      );

      const data = dashboard.getData();
      expect(data.homomorphicEncryption.encryptedMemories).toBe(150);
      expect(data.homomorphicEncryption.privateInferences).toBe(25);
      expect(data.homomorphicEncryption.activeComputations).toBe(3);
    });
  });

  describe('Privacy Metrics Updates', () => {
    test('should update differential privacy budget', () => {
      const dpBudget: DPBudget = {
        total: 1.0,
        used: 0.3,
        remaining: 0.7,
        queries: [
          {
            timestamp: new Date(),
            epsilon: 0.1,
            delta: 1e-5,
            description: 'Query 1',
          },
          {
            timestamp: new Date(),
            epsilon: 0.2,
            delta: 1e-5,
            description: 'Query 2',
          },
        ],
      };

      dashboard.updatePrivacyMetrics(dpBudget);

      const data = dashboard.getData();
      expect(data.privacyMetrics.differentialPrivacy).toEqual(dpBudget);
    });

    test('should update federated learning metrics', () => {
      const flRounds: FLRound[] = [
        {
          id: 'round-1',
          roundNumber: 1,
          participants: ['client1', 'client2', 'client3'],
          modelVersion: 'v1.0',
          status: 'completed',
          startedAt: new Date(Date.now() - 3600000),
          completedAt: new Date(),
          aggregation: 'fedAvg',
          metrics: {
            accuracy: 0.92,
            loss: 0.15,
            participationRate: 1.0,
          },
        },
        {
          id: 'round-2',
          roundNumber: 2,
          participants: ['client1', 'client2'],
          modelVersion: 'v1.1',
          status: 'active',
          startedAt: new Date(),
          aggregation: 'fedAvg',
        },
      ];

      dashboard.updatePrivacyMetrics(undefined, flRounds);

      const data = dashboard.getData();
      expect(data.privacyMetrics.federatedLearning.activeRounds).toBe(1);
      expect(data.privacyMetrics.federatedLearning.totalParticipants).toBe(3);
      expect(data.privacyMetrics.federatedLearning.averageAccuracy).toBeCloseTo(
        0.92
      );
    });

    test('should update SMPC metrics', () => {
      dashboard.updatePrivacyMetrics(undefined, undefined, {
        active: 2,
        completed: 15,
      });

      const data = dashboard.getData();
      expect(data.privacyMetrics.secureMPC.activeSessions).toBe(2);
      expect(data.privacyMetrics.secureMPC.completedComputations).toBe(15);
    });
  });

  describe('Alert Management', () => {
    test('should add alerts', () => {
      dashboard.addAlert({
        severity: 'high',
        category: 'quantum',
        message: 'Quantum readiness below threshold',
        actionRequired: true,
      });

      const data = dashboard.getData();
      expect(data.alerts).toHaveLength(1);
      expect(data.alerts[0]).toMatchObject({
        severity: 'high',
        category: 'quantum',
        message: 'Quantum readiness below threshold',
        actionRequired: true,
      });
      expect(data.alerts[0].id).toBeDefined();
      expect(data.alerts[0].timestamp).toBeInstanceOf(Date);
    });

    test('should limit alerts to 100', () => {
      for (let i = 0; i < 150; i++) {
        dashboard.addAlert({
          severity: 'low',
          category: 'ai-act',
          message: `Alert ${i}`,
          actionRequired: false,
        });
      }

      const data = dashboard.getData();
      expect(data.alerts).toHaveLength(100);
      expect(data.alerts[0].message).toBe('Alert 50'); // Kept last 100
    });

    test('should clear resolved alerts', () => {
      dashboard.addAlert({
        severity: 'medium',
        category: 'privacy',
        message: 'Alert 1',
        actionRequired: true,
      });

      dashboard.addAlert({
        severity: 'low',
        category: 'security',
        message: 'Alert 2',
        actionRequired: false,
      });

      dashboard.clearResolvedAlerts();

      const data = dashboard.getData();
      expect(data.alerts).toHaveLength(1);
      expect(data.alerts[0].message).toBe('Alert 1');
    });

    test('should automatically generate alerts', async () => {
      // Set conditions that trigger alerts
      dashboard.updateAIActCompliance({
        compliant: false,
        lastAssessment: new Date(),
        riskCategory: 'high',
        requirements: [],
        violations: [{ requirement: 'REQ-001', severity: 'major' }],
        certifications: [],
      });

      await dashboard.update();

      const data = dashboard.getData();
      const aiActAlert = data.alerts.find((a) => a.category === 'ai-act');
      expect(aiActAlert).toBeDefined();
      expect(aiActAlert?.severity).toBe('critical');
    });

    test('should alert on low quantum readiness', async () => {
      dashboard.updateQuantumSecurity({
        assessedAt: new Date(),
        overallScore: 40, // Below 50
        components: {},
        vulnerabilities: [],
        recommendations: [],
        migrationPlan: {
          phases: [],
          estimatedDuration: 0,
          requiredResources: [],
        },
        estimatedCost: 0,
        estimatedTime: 0,
      });

      await dashboard.update();

      const data = dashboard.getData();
      const quantumAlert = data.alerts.find((a) => a.category === 'quantum');
      expect(quantumAlert).toBeDefined();
      expect(quantumAlert?.message).toContain('quantum readiness');
    });

    test('should alert on privacy budget exhaustion', async () => {
      dashboard.updatePrivacyMetrics({
        total: 1.0,
        used: 0.95,
        remaining: 0.05, // Less than 10%
        queries: [],
      });

      await dashboard.update();

      const data = dashboard.getData();
      const privacyAlert = data.alerts.find((a) => a.category === 'privacy');
      expect(privacyAlert).toBeDefined();
      expect(privacyAlert?.message).toContain('privacy budget');
    });
  });

  describe('Recommended Actions', () => {
    test('should generate actions from violations', async () => {
      dashboard.updateAIActCompliance({
        compliant: false,
        lastAssessment: new Date(),
        riskCategory: 'high',
        requirements: [],
        violations: [
          {
            requirement: 'REQ-001',
            detectedAt: new Date(),
            severity: 'major',
            description: 'Missing explainability',
            remediation: 'Implement SHAP explanations',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'open',
          },
        ],
        certifications: [],
      });

      await dashboard.update();

      const data = dashboard.getData();
      expect(data.recommendedActions).toContainEqual(
        expect.objectContaining({
          category: 'ai-act',
          action: 'Implement SHAP explanations',
          priority: 1,
          status: 'pending',
        })
      );
    });

    test('should prioritize actions', async () => {
      // Add multiple issues
      dashboard.updateAIActCompliance({
        compliant: false,
        violations: [
          {
            requirement: 'REQ-001',
            remediation: 'Fix critical issue',
            severity: 'critical',
          },
          {
            requirement: 'REQ-002',
            remediation: 'Fix minor issue',
            severity: 'minor',
          },
        ],
      } as AIActComplianceStatus);

      dashboard.updateQuantumSecurity({
        overallScore: 30,
        recommendations: [
          {
            action: 'Urgent quantum migration',
            priority: 1,
            effort: 'high',
            impact: 'Critical',
          },
        ],
      } as QuantumReadinessReport);

      await dashboard.update();

      const data = dashboard.getData();
      expect(data.recommendedActions[0].priority).toBe(1);
      expect(data.recommendedActions).toHaveLength(3);
    });

    test('should limit actions to top 20', async () => {
      const violations = [];
      for (let i = 0; i < 30; i++) {
        violations.push({
          requirement: `REQ-${i}`,
          remediation: `Fix issue ${i}`,
          deadline: new Date(),
        });
      }

      dashboard.updateAIActCompliance({
        violations,
      } as AIActComplianceStatus);

      await dashboard.update();

      const data = dashboard.getData();
      expect(data.recommendedActions).toHaveLength(20);
    });
  });

  describe('Overall Compliance', () => {
    test('should be compliant when all checks pass', async () => {
      dashboard.updateAIActCompliance({
        compliant: true,
        violations: [],
      } as AIActComplianceStatus);

      dashboard.updateQuantumSecurity({
        overallScore: 85,
      } as QuantumReadinessReport);

      dashboard.updatePrivacyMetrics({
        total: 1.0,
        used: 0.3,
        remaining: 0.7,
        queries: [],
      });

      await dashboard.update();

      const data = dashboard.getData();
      expect(data.overallCompliant).toBe(true);
    });

    test('should be non-compliant with violations', async () => {
      dashboard.updateAIActCompliance({
        compliant: false,
        violations: [{ requirement: 'REQ-001' }],
      } as AIActComplianceStatus);

      await dashboard.update();

      const data = dashboard.getData();
      expect(data.overallCompliant).toBe(false);
    });

    test('should be non-compliant with low quantum readiness', async () => {
      dashboard.updateQuantumSecurity({
        overallScore: 50, // Below 70
      } as QuantumReadinessReport);

      await dashboard.update();

      const data = dashboard.getData();
      expect(data.overallCompliant).toBe(false);
    });

    test('should be non-compliant with critical alerts', async () => {
      dashboard.addAlert({
        severity: 'critical',
        category: 'security',
        message: 'Critical security issue',
        actionRequired: true,
      });

      await dashboard.update();

      const data = dashboard.getData();
      expect(data.overallCompliant).toBe(false);
    });
  });

  describe('Summary and Reporting', () => {
    test('should generate dashboard summary', () => {
      dashboard.updateAIActCompliance({
        pendingReviews: [],
      } as any);

      dashboard.addAlert({
        severity: 'critical',
        category: 'ai-act',
        message: 'Test alert',
        actionRequired: true,
      });

      dashboard.updateQuantumSecurity({
        overallScore: 80,
      } as QuantumReadinessReport);

      dashboard.updatePrivacyMetrics({
        total: 1.0,
        used: 0.4,
        remaining: 0.6,
        queries: [],
      });

      const summary = dashboard.getSummary();

      expect(summary).toMatchObject({
        compliant: expect.any(Boolean),
        criticalAlerts: 1,
        pendingActions: expect.any(Number),
        quantumReadiness: 80,
        privacyBudgetUsed: 0.4,
      });
    });

    test('should export dashboard report', () => {
      dashboard.updateAIActCompliance({
        compliant: true,
        violations: [],
      } as AIActComplianceStatus);

      const report = dashboard.exportReport();
      const parsed = JSON.parse(report);

      expect(parsed).toBeDefined();
      expect(parsed.generatedAt).toBeDefined();
      expect(parsed.summary).toBeDefined();
      expect(parsed.data).toBeDefined();
      expect(parsed.data.overallCompliant).toBe(true);
    });
  });

  describe('Integration with Security Services', () => {
    test('should integrate with all security services', async () => {
      // Create actual services
      const quantumSecurity = await createQuantumSecurityService({
        pqc: {
          enabled: true,
          defaultAlgorithm: 'CRYSTALS-Kyber',
          securityLevel: 'NIST-3',
        },
        qrng: { enabled: true, source: 'optical', minEntropy: 7.5 },
      });

      const heService = await createHomomorphicEncryptionService({
        defaultScheme: 'CKKS',
        securityLevel: 'HES-128',
        enabledFeatures: { encryptedMemory: true },
      });

      const aiCompliance = await createAIActComplianceService({
        enabled: true,
        systemPurpose: 'conversational',
        riskCategory: 'limited',
      });

      // Get status from services
      const quantumReadiness = await quantumSecurity.assessQuantumReadiness();
      const complianceStatus = await aiCompliance.assessCompliance();
      const heMetrics = await heService.getMetrics();

      // Update dashboard
      dashboard.updateQuantumSecurity(quantumReadiness);
      dashboard.updateAIActCompliance(complianceStatus);
      dashboard.updateHomomorphicEncryption(heMetrics);

      const data = dashboard.getData();
      expect(data.quantumSecurity.readinessReport).toBeDefined();
      expect(data.aiActCompliance.status).toBeDefined();
      expect(data.homomorphicEncryption.performanceMetrics).toBeDefined();
    });
  });
});
