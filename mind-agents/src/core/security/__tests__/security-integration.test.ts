/**
 * Security Integration Tests
 *
 * End-to-end tests for quantum security, homomorphic encryption, and AI Act compliance
 */

import {
  createQuantumSecurityService,
  createHomomorphicEncryptionService,
  createAIActComplianceService,
  createComplianceDashboard,
} from '../index';
import {
  QuantumSecurityConfig,
  HomomorphicEncryptionConfig,
  AIActConfig,
} from '../../../types';

describe('Security Integration', () => {
  let quantumSecurity: any;
  let heService: any;
  let aiCompliance: any;
  let dashboard: any;

  beforeEach(async () => {
    // Initialize all security services
    const quantumConfig: QuantumSecurityConfig = {
      pqc: {
        enabled: true,
        defaultAlgorithm: 'CRYSTALS-Kyber',
        securityLevel: 'NIST-3',
        keyRotationInterval: 86400000,
      },
      qkd: {
        enabled: true,
        protocol: 'BB84',
        errorRate: 0.01,
        keyRate: 1000,
      },
      qrng: {
        enabled: true,
        source: 'optical',
        minEntropy: 7.5,
        healthCheckInterval: 5000,
      },
      zkProofs: {
        enabled: true,
        protocol: 'zk-SNARK',
        curve: 'BLS12-381',
        securityParameter: 128,
      },
    };

    const heConfig: HomomorphicEncryptionConfig = {
      defaultScheme: 'CKKS',
      securityLevel: 'HES-128',
      enabledFeatures: {
        privateInference: true,
        encryptedMemory: true,
        pir: true,
        psi: true,
        secureAggregation: true,
      },
      performanceMode: 'balanced',
    };

    const aiActConfig: AIActConfig = {
      enabled: true,
      systemPurpose: 'conversational',
      riskCategory: 'high',
      deploymentRegion: ['EU'],
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

    quantumSecurity = await createQuantumSecurityService(quantumConfig);
    heService = await createHomomorphicEncryptionService(heConfig);
    aiCompliance = await createAIActComplianceService(aiActConfig);
    dashboard = createComplianceDashboard();
  });

  afterEach(() => {
    dashboard.stop();
  });

  describe('Secure AI Agent Memory', () => {
    test('should encrypt agent memories with quantum-safe encryption', async () => {
      const agentId = 'secure-agent-001';
      const memory = {
        content: 'Sensitive agent memory about user preferences',
        importance: 0.9,
        timestamp: new Date(),
        tags: ['user-data', 'sensitive'],
      };

      // Generate quantum-safe keys
      const qKeys = await quantumSecurity.generatePQCKeyPair(
        'CRYSTALS-Kyber',
        'NIST-5'
      );

      // Encrypt memory with homomorphic encryption
      const encMemory = await heService.encryptMemory(memory, agentId);

      expect(encMemory).toBeDefined();
      expect(encMemory.agentId).toBe(agentId);
      expect(encMemory.encryptedContent).toBeInstanceOf(Uint8Array);

      // Double-encrypt with quantum-safe encryption for storage
      const doubleEncrypted = await quantumSecurity.encryptPQC(
        encMemory.encryptedContent,
        qKeys.publicKey,
        'CRYSTALS-Kyber'
      );

      expect(doubleEncrypted).toBeDefined();
      expect(doubleEncrypted.algorithm).toBe('CRYSTALS-Kyber');

      // Log for AI Act compliance
      await aiCompliance.logAIEvent({
        eventType: 'data-processing',
        systemId: agentId,
        input: { action: 'memory-encryption' },
        output: { status: 'encrypted', memoryId: encMemory.id },
        modelVersion: '1.0.0',
        processingTime: 50,
        confidence: 1.0,
      });
    });

    test('should perform private inference on encrypted data', async () => {
      const agentId = 'inference-agent-001';

      // Encrypt user query
      const userQuery = [0.5, 0.3, 0.8]; // Feature vector
      const encQuery = await heService.encrypt(userQuery);

      // Perform private inference
      const model = {
        weights: [[[0.2, 0.3, 0.1]]],
        biases: [[0.1]],
      };

      const privateInference = heService.createPrivateInferenceEngine();
      const encModel = await privateInference.encryptModel(
        model,
        heService.keys.publicKey
      );
      const encResult = await privateInference.inference(encQuery, encModel);

      // Decrypt result
      const result = await heService.decrypt(encResult);

      // Generate explanation for AI Act
      const explanation = await aiCompliance.generateExplanation(
        { prediction: result, confidence: 0.85 },
        { enabled: true, methods: ['SHAP'], detailLevel: 'simple' }
      );

      expect(explanation).toBeDefined();
      expect(explanation.naturalLanguage).toContain('important factor');

      // Log inference event
      await aiCompliance.logAIEvent({
        eventType: 'inference',
        systemId: agentId,
        input: { query: 'encrypted' },
        output: { result: 'encrypted' },
        modelVersion: '1.0.0',
        processingTime: 200,
        confidence: 0.85,
        explanations: [explanation],
      });
    });
  });

  describe('Secure Multi-Agent Communication', () => {
    test('should establish quantum-secure communication between agents', async () => {
      const agent1 = 'alice-agent';
      const agent2 = 'bob-agent';

      // Establish QKD session
      const qkdSession = await quantumSecurity.establishQKDSession(
        agent1,
        agent2,
        {
          protocol: 'BB84',
          errorRate: 0.01,
          keyRate: 1000,
        }
      );

      expect(qkdSession).toBeDefined();
      expect(qkdSession.status).toBe('active');

      // Get quantum key
      const sharedKey = await quantumSecurity.getQKDKey(qkdSession.id, 256);
      expect(sharedKey).toBeInstanceOf(Uint8Array);
      expect(sharedKey.length).toBe(256);

      // Use key for secure communication
      const message = { action: 'collaborate', data: 'shared-task' };
      const encrypted = await quantumSecurity.encryptWithKey(
        JSON.stringify(message),
        sharedKey
      );

      // Log communication for compliance
      await aiCompliance.logAIEvent({
        eventType: 'agent-communication',
        systemId: agent1,
        input: { recipient: agent2, encrypted: true },
        output: { status: 'sent' },
        modelVersion: '1.0.0',
        processingTime: 10,
      });
    });

    test('should perform secure multi-party computation', async () => {
      const agents = ['agent-1', 'agent-2', 'agent-3'];

      // Create SMPC session
      const smpc = heService.createSMPC({
        enabled: true,
        protocol: 'Shamir',
        parties: agents.length,
        threshold: 2,
      });

      const session = await smpc.createSession(
        'collaborative-decision',
        agents
      );

      // Each agent contributes encrypted input
      const inputs = [100, 200, 150]; // Private values
      for (let i = 0; i < agents.length; i++) {
        await smpc.contributeInput(session.id, agents[i], inputs[i]);
      }

      // Compute average without revealing individual values
      const result = await smpc.executeComputation(session.id);
      expect(result).toBe(150); // Average of 100, 200, 150

      // Check for bias in collaborative decision
      const biasReport = await aiCompliance.detectBias(
        agents.map((agent, i) => ({ agent, contribution: inputs[i] })),
        [result]
      );

      expect(biasReport.overallFairness).toBeGreaterThan(0.8);
    });
  });

  describe('Privacy-Preserving Analytics', () => {
    test('should apply differential privacy to agent metrics', async () => {
      const metrics = {
        agentPerformance: [0.85, 0.9, 0.88, 0.92, 0.87],
        userSatisfaction: [4.5, 4.8, 4.6, 4.9, 4.7],
        responseTime: [100, 120, 95, 110, 105],
      };

      // Create differential privacy system
      const dp = heService.createDifferentialPrivacy({
        enabled: true,
        epsilon: 1.0,
        delta: 1e-5,
        mechanism: 'laplace',
      });

      // Add noise to protect individual metrics
      const privateMetrics: any = {};
      for (const [key, values] of Object.entries(metrics)) {
        privateMetrics[key] = await dp.privateAggregate(values, 'mean');
      }

      // Verify privacy budget
      const budget = dp.getBudget();
      expect(budget.used).toBeGreaterThan(0);
      expect(budget.remaining).toBeGreaterThan(0);

      // Log analytics event
      await aiCompliance.logAIEvent({
        eventType: 'analytics',
        systemId: 'analytics-system',
        input: { metrics: 'aggregated' },
        output: { privateMetrics },
        modelVersion: '1.0.0',
        processingTime: 50,
        metadata: { privacyMethod: 'differential-privacy', epsilon: 1.0 },
      });
    });

    test('should perform federated learning across agents', async () => {
      const agents = ['agent-1', 'agent-2', 'agent-3'];

      // Create federated learning round
      const fl = heService.createFederatedLearning({
        enabled: true,
        aggregation: 'fedAvg',
        encryption: 'homomorphic',
        minClients: 2,
      });

      const round = await fl.startRound(agents, 'model-v1');

      // Each agent trains locally and submits encrypted updates
      for (const agent of agents) {
        const localGradients = new Uint8Array(100); // Simulated gradients
        crypto.getRandomValues(localGradients);

        await fl.submitUpdate(round.id, agent, localGradients);
      }

      // Aggregate updates
      const aggregated = await fl.completeRound(round.id);
      expect(aggregated.participantCount).toBe(3);
      expect(aggregated.modelVersion).toBe('model-v1.1');

      // Document for AI Act compliance
      const docs = await aiCompliance.generateDocumentation();
      expect(docs.modelInformation.trainingProcess).toContain(
        'federated learning'
      );
    });
  });

  describe('Compliance Monitoring', () => {
    test('should monitor all security aspects in dashboard', async () => {
      // Start dashboard monitoring
      await dashboard.start(1000);

      // Perform various security operations
      const qKeys = await quantumSecurity.generatePQCKeyPair();
      const qrngStatus = await quantumSecurity.getQRNGStatus();
      const readiness = await quantumSecurity.assessQuantumReadiness();

      const heMetrics = await heService.getMetrics();

      const complianceStatus = await aiCompliance.assessCompliance();
      const biasReport = await aiCompliance.detectBias(
        [{ feature: 'test', value: 1 }],
        [0]
      );

      // Update dashboard
      dashboard.updateQuantumSecurity(readiness, qrngStatus);
      dashboard.updateHomomorphicEncryption(heMetrics);
      dashboard.updateAIActCompliance(
        complianceStatus,
        undefined,
        undefined,
        biasReport
      );

      // Get comprehensive status
      const summary = dashboard.getSummary();
      expect(summary.compliant).toBeDefined();
      expect(summary.quantumReadiness).toBeGreaterThan(0);
      expect(summary.privacyBudgetUsed).toBeDefined();

      // Export report
      const report = dashboard.exportReport();
      expect(report).toContain('quantumSecurity');
      expect(report).toContain('aiActCompliance');
      expect(report).toContain('homomorphicEncryption');
    });

    test('should handle security incidents', async () => {
      // Simulate security incident
      const incident = {
        type: 'quantum-vulnerability',
        severity: 'critical',
        component: 'legacy-encryption',
        description: 'RSA-2048 vulnerable to quantum attack',
      };

      // Add alert to dashboard
      dashboard.addAlert({
        severity: incident.severity,
        category: 'quantum',
        message: incident.description,
        actionRequired: true,
      });

      // Request human review for critical decision
      const reviewRequest = await aiCompliance.requestHumanReview({
        systemId: 'security-system',
        context: incident,
        aiDecision: { action: 'immediate-migration' },
        confidence: 0.95,
        explanation: { factors: ['quantum-threat-detected'] },
        urgency: 'critical',
      });

      expect(reviewRequest.urgency).toBe('critical');
      expect(reviewRequest.deadline).toBeDefined();

      // Migrate to quantum-safe
      const migrated = await quantumSecurity.migrateToQuantumSafe(
        'legacy-data',
        'RSA-2048'
      );

      expect(migrated.algorithm).toMatch(/CRYSTALS/);

      // Update dashboard
      dashboard.updateQuantumSecurity({
        overallScore: 85,
        vulnerabilities: [],
      } as any);

      const data = dashboard.getData();
      expect(data.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Zero-Knowledge Authentication', () => {
    test('should authenticate agents without revealing credentials', async () => {
      const agentId = 'zk-agent-001';
      const agentSecret = 'super-secret-credential';

      // Create ZK authentication system
      const zkAuth = await quantumSecurity.createZKAuthentication({
        enabled: true,
        protocol: 'zk-SNARK',
        curve: 'BLS12-381',
      });

      // Register agent
      await zkAuth.registerUser(agentId, agentSecret);

      // Create authentication challenge
      const challenge = await zkAuth.createZKAuthChallenge(agentId);
      expect(challenge.challenge).toBeInstanceOf(Uint8Array);

      // Prove knowledge of secret without revealing it
      const proof = await zkAuth.authenticateUser(
        agentId,
        agentSecret,
        challenge
      );
      expect(proof.proof).toBeInstanceOf(Uint8Array);

      // Verify authentication
      const isAuthenticated = await zkAuth.verifyAuthentication(proof);
      expect(isAuthenticated).toBe(true);

      // Log authentication event
      await aiCompliance.logAIEvent({
        eventType: 'authentication',
        systemId: agentId,
        input: { method: 'zero-knowledge' },
        output: { authenticated: true },
        modelVersion: '1.0.0',
        processingTime: 100,
        metadata: { protocol: 'zk-SNARK' },
      });
    });
  });

  describe('Audit and Certification', () => {
    test('should prepare comprehensive audit package', async () => {
      // Perform various operations to generate audit trail
      await quantumSecurity.generatePQCKeyPair();
      await heService.encrypt(42);
      await aiCompliance.logAIEvent({
        eventType: 'decision',
        systemId: 'audit-test',
        input: {},
        output: {},
      });

      // Generate audit package
      const auditPackage = await aiCompliance.handleAudit('EU-Auditor-2025');

      expect(auditPackage).toBeDefined();
      expect(auditPackage.documentation).toBeDefined();
      expect(auditPackage.logs).toBeInstanceOf(Array);
      expect(auditPackage.complianceReports).toHaveLength(1);
      expect(auditPackage.testResults).toBeDefined();

      // Verify quantum security in audit
      expect(auditPackage.documentation.performance).toBeDefined();
      expect(auditPackage.documentation.limitations.knownLimitations).toContain(
        expect.stringContaining('quantum')
      );
    });

    test('should maintain compliance through continuous monitoring', async () => {
      // Set up continuous monitoring
      const monitoringInterval = setInterval(async () => {
        const status = await aiCompliance.assessCompliance();
        dashboard.updateAIActCompliance(status);

        const readiness = await quantumSecurity.assessQuantumReadiness();
        dashboard.updateQuantumSecurity(readiness);

        await dashboard.update();
      }, 1000);

      // Simulate operations over time
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check final compliance status
      const finalData = dashboard.getData();
      expect(finalData.overallCompliant).toBeDefined();
      expect(finalData.alerts).toBeDefined();
      expect(finalData.recommendedActions).toBeDefined();

      clearInterval(monitoringInterval);
    });
  });
});
