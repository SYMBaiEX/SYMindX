/**
 * AI Act Compliance Tests
 *
 * Test suite for EU AI Act 2025 compliance features
 */

import {
  createAIActComplianceService,
  createExplainabilityEngine,
  createBiasDetectionEngine,
  createAISystemLogger,
  createHumanOversightManager,
} from '../ai-act';
import {
  AIActConfig,
  AIRiskCategory,
  AISystemPurpose,
  ExplainabilityConfig,
  BiasDetectionConfig,
  HumanOversightConfig,
  AISystemLog,
  AIEventType,
} from '../../../types/ai-act-compliance';

describe('AI Act Compliance', () => {
  describe('Risk Assessment', () => {
    let aiCompliance: any;

    beforeEach(async () => {
      const config: AIActConfig = {
        enabled: true,
        systemPurpose: 'conversational',
        riskCategory: 'high',
        deploymentRegion: ['EU'],
        dataProtection: {
          anonymization: true,
          encryption: true,
          retentionPeriod: 365,
        },
      };
      aiCompliance = await createAIActComplianceService(config);
    });

    test('should assess risk category for different purposes', async () => {
      const purposes: AISystemPurpose[] = [
        'biometric-identification',
        'critical-infrastructure',
        'education-vocational',
        'employment',
        'conversational',
        'content-generation',
        'research',
      ];

      const expectedRisks: Record<AISystemPurpose, AIRiskCategory> = {
        'biometric-identification': 'high',
        'critical-infrastructure': 'high',
        'education-vocational': 'high',
        employment: 'high',
        conversational: 'limited',
        'content-generation': 'limited',
        research: 'minimal',
      };

      for (const purpose of purposes) {
        const risk = aiCompliance.assessRiskCategory(purpose);
        expect(risk).toBe(expectedRisks[purpose]);
      }
    });

    test('should enforce requirements based on risk category', async () => {
      const status = await aiCompliance.assessCompliance();

      expect(status).toBeDefined();
      expect(status.riskCategory).toBe('high');
      expect(status.requirements).toContainEqual(
        expect.objectContaining({
          name: 'Explainability',
          mandatory: true,
        })
      );
      expect(status.requirements).toContainEqual(
        expect.objectContaining({
          name: 'Human Oversight',
          mandatory: true,
        })
      );
    });
  });

  describe('AI System Logging', () => {
    let logger: any;

    beforeEach(async () => {
      logger = createAISystemLogger();
    });

    test('should log AI events', async () => {
      const event: Omit<AISystemLog, 'id' | 'timestamp'> = {
        eventType: 'inference',
        systemId: 'test-system',
        userId: 'user-123',
        input: { query: 'What is AI?' },
        output: { response: 'AI is...' },
        modelVersion: '1.0.0',
        processingTime: 150,
        confidence: 0.95,
      };

      await logger.logEvent(
        event.eventType,
        event.systemId,
        event.input,
        event.output,
        {
          userId: event.userId,
          modelVersion: event.modelVersion,
          processingTime: event.processingTime,
          confidence: event.confidence,
        }
      );

      const logs = await logger.queryLogs({});
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject(event);
      expect(logs[0].id).toBeDefined();
      expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    test('should detect anomalies in logs', async () => {
      // Log normal events
      for (let i = 0; i < 10; i++) {
        await logger.logEvent(
          'inference',
          'system-1',
          { query: 'normal' },
          { response: 'normal' },
          { processingTime: 100 + i * 10, confidence: 0.9 }
        );
      }

      // Log anomalous event
      await logger.logEvent(
        'inference',
        'system-1',
        { query: 'anomaly' },
        { response: 'error' },
        { processingTime: 5000, confidence: 0.2 }
      );

      const logs = await logger.queryLogs({});
      const anomalousLog = logs.find(
        (log) => log.anomalies && log.anomalies.length > 0
      );

      expect(anomalousLog).toBeDefined();
      expect(anomalousLog?.anomalies).toContainEqual(
        expect.objectContaining({
          type: 'performance',
          severity: 'high',
        })
      );
    });

    test('should query logs with filters', async () => {
      const systemIds = ['system-1', 'system-2'];
      const eventTypes: AIEventType[] = ['inference', 'decision', 'error'];

      // Create varied logs
      for (const systemId of systemIds) {
        for (const eventType of eventTypes) {
          await logger.logEvent(eventType, systemId, {}, {});
        }
      }

      // Query by system ID
      const systemLogs = await logger.queryLogs({ systemId: 'system-1' });
      expect(systemLogs).toHaveLength(3);
      expect(systemLogs.every((log) => log.systemId === 'system-1')).toBe(true);

      // Query by event type
      const inferenceLogs = await logger.queryLogs({ eventType: 'inference' });
      expect(inferenceLogs).toHaveLength(2);
      expect(inferenceLogs.every((log) => log.eventType === 'inference')).toBe(
        true
      );

      // Query by date range
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const dateLogs = await logger.queryLogs({
        startDate: yesterday,
        endDate: now,
      });
      expect(dateLogs).toHaveLength(6);
    });

    test('should export logs for audit', async () => {
      // Create some logs
      for (let i = 0; i < 5; i++) {
        await logger.logEvent(
          'inference',
          'audit-system',
          { input: i },
          { output: i * 2 }
        );
      }

      const exported = await logger.exportLogs('json');
      expect(exported).toBeDefined();

      const parsed = JSON.parse(exported);
      expect(parsed.logs).toHaveLength(5);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.exportedAt).toBeDefined();
    });
  });

  describe('Explainability Engine', () => {
    let explainability: any;

    beforeEach(async () => {
      const config: ExplainabilityConfig = {
        enabled: true,
        methods: ['SHAP', 'LIME', 'counterfactual', 'attention'],
        detailLevel: 'detailed',
        languages: ['en', 'es', 'fr'],
      };
      explainability = createExplainabilityEngine(config);
    });

    test('should generate SHAP explanation', async () => {
      const decision = {
        prediction: 'approved',
        confidence: 0.85,
        features: {
          age: 35,
          income: 75000,
          creditScore: 720,
        },
      };

      const explanation = await explainability.generateExplanation(decision, {
        inputs: decision.features,
      });

      expect(explanation).toBeDefined();
      expect(explanation.method).toContain('SHAP');
      expect(explanation.confidence).toBeGreaterThan(0);
      expect(explanation.factors).toHaveLength(3);
      expect(explanation.factors[0]).toMatchObject({
        factor: expect.any(String),
        importance: expect.any(Number),
        contribution: expect.any(Number),
        value: expect.any(Number),
      });
      expect(explanation.naturalLanguage).toContain('most important factor');
    });

    test('should generate LIME explanation', async () => {
      const decision = {
        output: 'high-risk',
        model: 'risk-assessment-v1',
      };
      const context = {
        inputs: { feature1: 10, feature2: 20, feature3: 30 },
      };

      const explanation = await explainability.explainWithLIME(
        decision,
        context
      );

      expect(explanation).toBeDefined();
      expect(explanation.method).toBe('LIME');
      expect(explanation.factors).toBeDefined();
      expect(explanation.visualization).toBeDefined();
    });

    test('should generate counterfactual explanation', async () => {
      const decision = {
        prediction: 'rejected',
        threshold: 0.7,
        score: 0.45,
      };

      const counterfactual = await explainability.generateCounterfactual(
        decision,
        {
          inputs: { income: 40000, debt: 20000 },
        }
      );

      expect(counterfactual).toBeDefined();
      expect(counterfactual.method).toBe('counterfactual');
      expect(counterfactual.factors).toContainEqual(
        expect.objectContaining({
          factor: expect.stringContaining('change'),
          description: expect.any(String),
        })
      );
      expect(counterfactual.naturalLanguage).toContain('would need to');
    });

    test('should handle explanation requests', async () => {
      const request = {
        id: 'req-123',
        userId: 'user-456',
        decisionId: 'dec-789',
        language: 'en',
        detailLevel: 'simple' as const,
      };

      const response = await explainability.handleExplanationRequest(request);

      expect(response).toBeDefined();
      expect(response.requestId).toBe(request.id);
      expect(response.decisionId).toBe(request.decisionId);
      expect(response.explanation).toBeDefined();
      expect(response.providedAt).toBeInstanceOf(Date);
      expect(response.language).toBe('en');
    });

    test('should support multiple languages', async () => {
      const decision = { output: 'approved' };
      const languages = ['en', 'es', 'fr'];

      for (const lang of languages) {
        const explanation = await explainability.generateExplanation(decision, {
          inputs: {},
          language: lang,
        });

        expect(explanation.naturalLanguage).toBeDefined();
        if (lang === 'es') {
          expect(explanation.naturalLanguage).toContain(
            'factor más importante'
          );
        } else if (lang === 'fr') {
          expect(explanation.naturalLanguage).toContain(
            'facteur le plus important'
          );
        }
      }
    });

    test('should visualize explanations', async () => {
      const decision = { prediction: 'class-a' };
      const visualization = await explainability.visualizeExplanation(
        decision,
        {
          inputs: { x: 1, y: 2, z: 3 },
        }
      );

      expect(visualization).toBeDefined();
      expect(visualization.type).toBe('bar-chart');
      expect(visualization.data).toBeDefined();
      expect(visualization.metadata).toBeDefined();
    });
  });

  describe('Bias Detection', () => {
    let biasDetection: any;

    beforeEach(async () => {
      const config: BiasDetectionConfig = {
        enabled: true,
        checkFrequency: 'batch',
        sensitiveAttributes: ['gender', 'race', 'age'],
        fairnessMetrics: [
          'demographic-parity',
          'equal-opportunity',
          'calibration',
        ],
        mitigationStrategies: [
          'pre-processing',
          'in-processing',
          'post-processing',
        ],
      };
      biasDetection = createBiasDetectionEngine(config);
    });

    test('should detect demographic parity violations', async () => {
      const data = [
        { gender: 'male', prediction: 1, actual: 1 },
        { gender: 'male', prediction: 1, actual: 0 },
        { gender: 'male', prediction: 1, actual: 1 },
        { gender: 'male', prediction: 1, actual: 1 },
        { gender: 'female', prediction: 0, actual: 1 },
        { gender: 'female', prediction: 0, actual: 0 },
        { gender: 'female', prediction: 0, actual: 1 },
        { gender: 'female', prediction: 1, actual: 1 },
      ];

      const predictions = data.map((d) => d.prediction);
      const report = await biasDetection.detectBias(data, predictions);

      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.metrics).toContainEqual(
        expect.objectContaining({
          name: 'demographic-parity',
          value: expect.any(Number),
          threshold: 0.1,
          passed: false,
        })
      );
      expect(report.detectedBiases).toHaveLength(1);
      expect(report.detectedBiases[0]).toMatchObject({
        attribute: 'gender',
        metric: 'demographic-parity',
        severity: 'high',
      });
    });

    test('should calculate equal opportunity metric', async () => {
      const data = [
        { race: 'group-a', prediction: 1, actual: 1 },
        { race: 'group-a', prediction: 0, actual: 1 },
        { race: 'group-b', prediction: 1, actual: 1 },
        { race: 'group-b', prediction: 1, actual: 1 },
      ];

      const metric = biasDetection.constructor.equalOpportunity(
        data.map((d) => ({ ...d, label: d.actual })),
        'race',
        1
      );

      expect(metric).toBeDefined();
      expect(metric.name).toBe('equal-opportunity');
      expect(metric.value).toBeDefined();
      expect(metric.affectedGroups).toContain('group-a');
      expect(metric.affectedGroups).toContain('group-b');
    });

    test('should suggest mitigation strategies', async () => {
      const biasReport = {
        timestamp: new Date(),
        metrics: [
          {
            name: 'demographic-parity' as const,
            value: 0.3,
            threshold: 0.1,
            passed: false,
            affectedGroups: ['male', 'female'],
          },
        ],
        detectedBiases: [
          {
            attribute: 'gender',
            metric: 'demographic-parity' as const,
            severity: 'high' as const,
            disparity: 0.3,
            affectedGroups: ['male', 'female'],
          },
        ],
        overallFairness: 0.7,
      };

      const mitigation = await biasDetection.mitigateBias(
        biasReport,
        'post-processing'
      );

      expect(mitigation).toBeDefined();
      expect(mitigation.strategy).toBe('post-processing');
      expect(mitigation.actions).toContainEqual(
        expect.objectContaining({
          type: expect.any(String),
          description: expect.any(String),
          estimatedImpact: expect.any(Number),
        })
      );
      expect(mitigation.expectedImprovement).toBeGreaterThan(0);
    });

    test('should handle multiple sensitive attributes', async () => {
      const data = [
        { gender: 'male', age: 'young', race: 'group-a', prediction: 1 },
        { gender: 'female', age: 'old', race: 'group-b', prediction: 0 },
        // ... more data
      ];

      const report = await biasDetection.detectBias(
        data,
        data.map((d) => d.prediction)
      );

      expect(report.detectedBiases).toBeDefined();
      const attributes = report.detectedBiases.map((b) => b.attribute);
      expect(attributes).toEqual(
        expect.arrayContaining(['gender', 'age', 'race'])
      );
    });

    test('should continuously monitor for bias', async () => {
      const monitor = await biasDetection.createContinuousMonitor('model-123');

      // Simulate streaming predictions
      for (let i = 0; i < 100; i++) {
        await monitor.addPrediction({
          features: { gender: i % 2 === 0 ? 'male' : 'female' },
          prediction: i % 3 === 0 ? 1 : 0,
          actual: Math.random() > 0.5 ? 1 : 0,
        });
      }

      const status = await monitor.getStatus();
      expect(status).toBeDefined();
      expect(status.predictionsAnalyzed).toBe(100);
      expect(status.biasAlerts).toBeDefined();
    });
  });

  describe('Human Oversight', () => {
    let oversightManager: any;

    beforeEach(async () => {
      const config: HumanOversightConfig = {
        enabled: true,
        mode: 'human-on-the-loop',
        reviewThreshold: 0.7,
        responseTimeout: 300,
        fallbackBehavior: 'default-action',
        escalationPolicy: {
          levels: ['reviewer', 'supervisor', 'admin'],
          timeouts: [300, 600, 1800],
        },
      };
      oversightManager = createHumanOversightManager(config);
    });

    test('should request human review for low confidence', async () => {
      const request = await oversightManager.requestReview(
        'system-123',
        { input: 'complex query' },
        { output: 'uncertain response' },
        0.45, // Low confidence
        { factors: ['ambiguous input'] },
        'high'
      );

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.systemId).toBe('system-123');
      expect(request.confidence).toBe(0.45);
      expect(request.urgency).toBe('high');
      expect(request.status).toBe('pending');
      expect(request.deadline).toBeInstanceOf(Date);
    });

    test('should handle human review submission', async () => {
      const request = await oversightManager.requestReview(
        'system-123',
        {},
        { decision: 'approve' },
        0.6,
        {},
        'medium'
      );

      await oversightManager.submitReview(
        request.id,
        'reviewer-456',
        'modify',
        { decision: 'reject' },
        'Confidence too low for approval'
      );

      const status = await oversightManager.getReviewStatus(request.id);
      expect(status.status).toBe('reviewed');
      expect(status.review).toBeDefined();
      expect(status.review?.decision).toBe('modify');
      expect(status.review?.modifications).toEqual({ decision: 'reject' });
    });

    test('should handle review timeouts', async () => {
      jest.useFakeTimers();

      const request = await oversightManager.requestReview(
        'system-123',
        {},
        {},
        0.5,
        {},
        'high'
      );

      // Fast forward past deadline
      jest.advanceTimersByTime(301000); // 301 seconds

      const status = await oversightManager.getReviewStatus(request.id);
      expect(status.status).toBe('timeout');
      expect(status.fallbackAction).toBe('default-action');

      jest.useRealTimers();
    });

    test('should escalate reviews', async () => {
      const request = await oversightManager.requestReview(
        'system-123',
        {},
        {},
        0.3,
        {},
        'critical'
      );

      // Escalate to supervisor
      await oversightManager.escalateReview(request.id, 'Complex case');

      const status = await oversightManager.getReviewStatus(request.id);
      expect(status.escalationLevel).toBe(1);
      expect(status.escalationReason).toBe('Complex case');
    });

    test('should track reviewer performance', async () => {
      const reviewerId = 'reviewer-789';

      // Submit multiple reviews
      for (let i = 0; i < 5; i++) {
        const request = await oversightManager.requestReview(
          'system-123',
          {},
          {},
          0.5,
          {},
          'low'
        );

        await oversightManager.submitReview(
          request.id,
          reviewerId,
          'approve',
          {},
          'Looks good'
        );
      }

      const metrics = await oversightManager.getReviewerMetrics(reviewerId);
      expect(metrics).toBeDefined();
      expect(metrics.totalReviews).toBe(5);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.decisionBreakdown.approve).toBe(5);
    });

    test('should implement different oversight modes', async () => {
      const modes = [
        'human-in-the-loop',
        'human-on-the-loop',
        'human-in-command',
      ] as const;

      for (const mode of modes) {
        const config: HumanOversightConfig = {
          enabled: true,
          mode,
          reviewThreshold: 0.7,
          responseTimeout: 300,
        };
        const manager = createHumanOversightManager(config);

        const shouldReview = await manager.shouldRequestReview(0.5);

        if (mode === 'human-in-the-loop') {
          expect(shouldReview).toBe(true); // Always review
        } else if (mode === 'human-on-the-loop') {
          expect(shouldReview).toBe(true); // Below threshold
        } else {
          expect(shouldReview).toBe(false); // Human decides when
        }
      }
    });
  });

  describe('AI Act Compliance Service Integration', () => {
    let complianceService: any;

    beforeEach(async () => {
      const config: AIActConfig = {
        enabled: true,
        systemPurpose: 'employment',
        riskCategory: 'high',
        deploymentRegion: ['EU', 'UK'],
        dataProtection: {
          anonymization: true,
          encryption: true,
          retentionPeriod: 365,
        },
        transparency: {
          userNotification: true,
          aiIdentification: true,
          capabilityDisclosure: true,
        },
      };
      complianceService = await createAIActComplianceService(config);
    });

    test('should generate comprehensive compliance report', async () => {
      // Create some test data
      for (let i = 0; i < 10; i++) {
        await complianceService.logAIEvent({
          eventType: 'decision',
          systemId: 'hr-system',
          userId: `user-${i}`,
          input: { application: i },
          output: { decision: i % 2 === 0 ? 'accept' : 'reject' },
          modelVersion: '1.0.0',
          processingTime: 100 + i * 10,
          confidence: 0.7 + (i % 3) * 0.1,
          explanations: [{ method: 'SHAP', factors: [] }],
        });
      }

      const report = await complianceService.generateComplianceReport();

      expect(report).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.systemInfo).toBeDefined();
      expect(report.complianceStatus).toBeDefined();
      expect(report.statistics).toMatchObject({
        totalDecisions: 10,
        humanReviews: expect.any(Number),
        explanationsProvided: 10,
        biasIncidents: expect.any(Number),
        anomaliesDetected: expect.any(Number),
      });
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.executiveSummary).toContain('high-risk system');
    });

    test('should handle full audit process', async () => {
      const auditPackage =
        await complianceService.handleAudit('EU-Auditor-001');

      expect(auditPackage).toBeDefined();
      expect(auditPackage.timestamp).toBeInstanceOf(Date);
      expect(auditPackage.documentation).toBeDefined();
      expect(auditPackage.logs).toBeInstanceOf(Array);
      expect(auditPackage.complianceReports).toHaveLength(1);
      expect(auditPackage.certificates).toBeInstanceOf(Array);
      expect(auditPackage.testResults).toBeDefined();
    });

    test('should validate data quality', async () => {
      const testData = [
        { id: 1, name: 'Alice', age: 25, score: 0.8 },
        { id: 2, name: 'Bob', age: null, score: 0.7 },
        { id: 3, name: '', age: 30, score: 0.9 },
      ];

      const qualityReport = await complianceService.assessDataQuality(
        testData,
        {
          enabled: true,
          validationRules: [
            { field: 'name', type: 'required', severity: 'error' },
            { field: 'age', type: 'required', severity: 'error' },
            {
              field: 'score',
              type: 'range',
              condition: { min: 0, max: 1 },
              severity: 'warning',
            },
          ],
          qualityThresholds: [
            { metric: 'completeness', threshold: 0.95, action: 'reject' },
          ],
        }
      );

      expect(qualityReport).toBeDefined();
      expect(qualityReport.metrics).toContainEqual(
        expect.objectContaining({
          name: 'completeness',
          value: expect.any(Number),
          status: 'fail',
        })
      );
      expect(qualityReport.issues).toHaveLength(2);
    });

    test('should maintain technical documentation', async () => {
      const docs = await complianceService.generateDocumentation();

      expect(docs).toBeDefined();
      expect(docs.systemDescription).toMatchObject({
        name: expect.any(String),
        version: expect.any(String),
        purpose: expect.any(String),
        intendedUse: expect.any(Array),
        prohibitedUse: expect.any(Array),
      });
      expect(docs.dataUsed).toBeDefined();
      expect(docs.modelInformation).toBeDefined();
      expect(docs.performance).toBeDefined();
      expect(docs.limitations).toBeDefined();
      expect(docs.humanOversight).toBeDefined();
      expect(docs.updates).toBeInstanceOf(Array);
    });

    test('should track compliance violations', async () => {
      // Force a violation by disabling a required component
      complianceService.config.explainability = { enabled: false };

      const status = await complianceService.assessCompliance();

      expect(status.compliant).toBe(false);
      expect(status.violations).toContainEqual(
        expect.objectContaining({
          requirement: expect.any(String),
          severity: 'major',
          description: expect.stringContaining('Explainability'),
          status: 'open',
        })
      );
    });
  });
});
