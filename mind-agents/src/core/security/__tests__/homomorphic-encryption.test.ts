/**
 * Homomorphic Encryption Tests
 *
 * Test suite for homomorphic encryption and privacy-preserving features
 */

import {
  createHomomorphicEncryptionService,
  createHECore,
  createPrivateInferenceEngine,
  createSMPC,
  createDifferentialPrivacy,
  createFederatedLearning,
  createPIR,
  createPSI,
} from '../homomorphic';
import {
  HEScheme,
  HESecurityLevel,
  HomomorphicEncryptionConfig,
  PrivateInferenceConfig,
  SMPCConfig,
  DifferentialPrivacyConfig,
  FederatedLearningConfig,
} from '../../../types/homomorphic-encryption';

describe('Homomorphic Encryption', () => {
  describe('HE Core Operations', () => {
    let heCore: any;
    let keySet: any;

    beforeEach(async () => {
      heCore = createHECore('CKKS', 'HES-128');
      keySet = await heCore.generateKeys({
        securityLevel: 'HES-128',
        polyModulusDegree: 16384,
        coeffModulusBits: [60, 40, 40, 60],
        scaleBits: 40,
      });
    });

    test('should generate HE keys', async () => {
      expect(keySet).toBeDefined();
      expect(keySet.publicKey).toBeDefined();
      expect(keySet.secretKey).toBeDefined();
      expect(keySet.relinearizationKey).toBeDefined();
      expect(keySet.galoisKeys).toBeDefined();
      expect(keySet.scheme).toBe('CKKS');
      expect(keySet.securityLevel).toBe('HES-128');
    });

    test('should encrypt and decrypt numbers', async () => {
      const plaintext = 42.5;

      const ciphertext = await heCore.encrypt(plaintext, keySet.publicKey);
      expect(ciphertext).toBeDefined();
      expect(ciphertext.scheme).toBe('CKKS');
      expect(ciphertext.cipherData).toBeInstanceOf(Uint8Array);
      expect(ciphertext.noiseLevel).toBeGreaterThanOrEqual(0);
      expect(ciphertext.level).toBeGreaterThanOrEqual(0);

      const decrypted = await heCore.decrypt(ciphertext, keySet.secretKey);
      expect(decrypted).toBeCloseTo(plaintext, 5);
    });

    test('should perform addition on encrypted data', async () => {
      const a = 10.5;
      const b = 20.3;

      const encA = await heCore.encrypt(a, keySet.publicKey);
      const encB = await heCore.encrypt(b, keySet.publicKey);

      const encSum = await heCore.add(encA, encB);
      const decSum = await heCore.decrypt(encSum, keySet.secretKey);

      expect(decSum).toBeCloseTo(a + b, 5);
    });

    test('should perform multiplication on encrypted data', async () => {
      const a = 3.5;
      const b = 2.0;

      const encA = await heCore.encrypt(a, keySet.publicKey);
      const encB = await heCore.encrypt(b, keySet.publicKey);

      const encProduct = await heCore.multiply(encA, encB);
      const decProduct = await heCore.decrypt(encProduct, keySet.secretKey);

      expect(decProduct).toBeCloseTo(a * b, 5);
    });

    test('should handle vector operations', async () => {
      const vector = [1.0, 2.0, 3.0, 4.0];

      const encVector = await heCore.encrypt(vector, keySet.publicKey);
      const decVector = await heCore.decrypt(encVector, keySet.secretKey);

      expect(decVector).toHaveLength(vector.length);
      vector.forEach((val, idx) => {
        expect(decVector[idx]).toBeCloseTo(val, 5);
      });
    });

    test('should bootstrap ciphertexts', async () => {
      const value = 5.5;
      const encValue = await heCore.encrypt(value, keySet.publicKey);

      // Perform many operations to increase noise
      let result = encValue;
      for (let i = 0; i < 5; i++) {
        result = await heCore.multiply(result, encValue);
      }

      // Bootstrap to refresh ciphertext
      const bootstrapped = await heCore.bootstrap(result, keySet.bootstrapKey);
      expect(bootstrapped.noiseLevel).toBeLessThan(result.noiseLevel);

      const decrypted = await heCore.decrypt(bootstrapped, keySet.secretKey);
      expect(decrypted).toBeCloseTo(Math.pow(value, 6), 2);
    });

    test('should evaluate complex computations', async () => {
      const x = 2.0;
      const y = 3.0;

      const encX = await heCore.encrypt(x, keySet.publicKey);
      const encY = await heCore.encrypt(y, keySet.publicKey);

      // Compute: 2x^2 + 3xy + y^2
      const computation = {
        type: 'polynomial' as const,
        expression: '2*x^2 + 3*x*y + y^2',
        variables: { x: encX, y: encY },
        degree: 2,
      };

      const result = await heCore.evaluate(computation);
      const decResult = await heCore.decrypt(result, keySet.secretKey);

      const expected = 2 * x * x + 3 * x * y + y * y;
      expect(decResult).toBeCloseTo(expected, 4);
    });
  });

  describe('Private AI Inference', () => {
    let privateInference: any;
    let heService: any;

    beforeEach(async () => {
      const config: PrivateInferenceConfig = {
        enabled: true,
        scheme: 'CKKS',
        model: {
          type: 'neural-network',
          architecture: {
            layers: [
              { type: 'dense', units: 10, activation: 'relu' },
              { type: 'dense', units: 1, activation: 'linear' },
            ],
          },
        },
        batchSize: 1,
        bootstrapping: false,
      };

      heService = await createHomomorphicEncryptionService({
        defaultScheme: 'CKKS',
        securityLevel: 'HES-128',
        enabledFeatures: { privateInference: true },
      });

      privateInference = createPrivateInferenceEngine(config);
    });

    test('should encrypt model weights', async () => {
      const model = {
        weights: [
          [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
          [[0.5], [0.6]],
        ],
        biases: [[0.1, 0.2], [0.3]],
      };

      const encModel = await privateInference.encryptModel(
        model,
        heService.keys.publicKey
      );
      expect(encModel).toBeDefined();
      expect(encModel.encryptedWeights).toHaveLength(model.weights.length);
      expect(encModel.encryptedBiases).toHaveLength(model.biases.length);
    });

    test('should perform private inference', async () => {
      const input = [1.0, 2.0];
      const encInput = await heService.encrypt(input);

      // Simple linear model: y = 0.5*x1 + 0.3*x2 + 0.1
      const model = {
        weights: [[[0.5, 0.3]]],
        biases: [[0.1]],
      };

      const encModel = await privateInference.encryptModel(
        model,
        heService.keys.publicKey
      );
      const encOutput = await privateInference.inference(encInput, encModel);

      const output = await heService.decrypt(encOutput);
      const expected = 0.5 * input[0] + 0.3 * input[1] + 0.1;
      expect(output[0]).toBeCloseTo(expected, 4);
    });

    test('should benchmark private inference', async () => {
      const input = [1.0, 2.0, 3.0];
      const encInput = await heService.encrypt(input);

      const metrics = await privateInference.benchmarkInference(encInput, 10);

      expect(metrics).toBeDefined();
      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.encryptionOverhead).toBeGreaterThan(0);
      expect(metrics.computationTime).toBeGreaterThan(0);
      expect(metrics.decryptionTime).toBeGreaterThan(0);
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Secure Multi-Party Computation', () => {
    let smpc: any;

    beforeEach(async () => {
      const config: SMPCConfig = {
        enabled: true,
        protocol: 'Shamir',
        parties: 3,
        threshold: 2,
        computationType: 'arithmetic',
      };
      smpc = createSMPC(config);
    });

    test('should create secret shares', async () => {
      const secret = 42;
      const numParties = 3;

      const shares = await smpc.createSecretShares(secret, numParties);

      expect(shares).toHaveLength(numParties);
      shares.forEach((share) => {
        expect(share).toBeInstanceOf(Uint8Array);
      });

      // No single share should reveal the secret
      shares.forEach((share) => {
        expect(share).not.toEqual(secret);
      });
    });

    test('should reconstruct secret from shares', async () => {
      const secret = { value: 42, data: 'secret-data' };
      const shares = await smpc.createSecretShares(secret, 3);

      // Reconstruct with threshold shares
      const reconstructed = await smpc.reconstructSecret(shares.slice(0, 2));
      expect(reconstructed).toEqual(secret);

      // Should fail with insufficient shares
      await expect(smpc.reconstructSecret([shares[0]])).rejects.toThrow();
    });

    test('should create and execute SMPC session', async () => {
      const session = await smpc.createSession('average-computation', [
        'party1',
        'party2',
        'party3',
      ]);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.name).toBe('average-computation');
      expect(session.parties).toHaveLength(3);
      expect(session.protocol).toBe('Shamir');
      expect(session.status).toBe('created');

      // Parties contribute inputs
      await smpc.contributeInput(session.id, 'party1', 100);
      await smpc.contributeInput(session.id, 'party2', 200);
      await smpc.contributeInput(session.id, 'party3', 300);

      // Execute computation
      const result = await smpc.executeComputation(session.id);
      expect(result).toBe(200); // Average of 100, 200, 300
    });

    test('should handle different protocols', async () => {
      const protocols = ['Shamir', 'GMW', 'BGW'] as const;

      for (const protocol of protocols) {
        const config: SMPCConfig = {
          enabled: true,
          protocol,
          parties: 3,
          threshold: 2,
        };
        const smpcInstance = createSMPC(config);
        const session = await smpcInstance.createSession('test', [
          'p1',
          'p2',
          'p3',
        ]);
        expect(session.protocol).toBe(protocol);
      }
    });
  });

  describe('Differential Privacy', () => {
    let dp: any;

    beforeEach(async () => {
      const config: DifferentialPrivacyConfig = {
        enabled: true,
        epsilon: 1.0,
        delta: 1e-5,
        mechanism: 'laplace',
      };
      dp = createDifferentialPrivacy(config);
    });

    test('should add Laplace noise', async () => {
      const value = 100;
      const sensitivity = 1;

      const results = [];
      for (let i = 0; i < 100; i++) {
        const noisy = await dp.addNoise(value, sensitivity);
        results.push(noisy);
      }

      // Check that noise was added
      const uniqueValues = new Set(results);
      expect(uniqueValues.size).toBeGreaterThan(50); // Should have variety

      // Mean should be close to original value
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      expect(mean).toBeCloseTo(value, 0);
    });

    test('should track privacy budget', async () => {
      const initialBudget = dp.getBudget();
      expect(initialBudget.total).toBe(1.0);
      expect(initialBudget.used).toBe(0);
      expect(initialBudget.remaining).toBe(1.0);

      // Use some budget
      await dp.addNoise(100, 1);

      const updatedBudget = dp.getBudget();
      expect(updatedBudget.used).toBeGreaterThan(0);
      expect(updatedBudget.remaining).toBeLessThan(1.0);
      expect(updatedBudget.queries).toHaveLength(1);
    });

    test('should handle different mechanisms', async () => {
      const mechanisms = ['laplace', 'gaussian'] as const;

      for (const mechanism of mechanisms) {
        const config: DifferentialPrivacyConfig = {
          enabled: true,
          epsilon: 1.0,
          delta: 1e-5,
          mechanism,
        };
        const dpInstance = createDifferentialPrivacy(config);

        const noisy = await dpInstance.addNoise(100, 1);
        expect(typeof noisy).toBe('number');
      }
    });

    test('should apply DP to aggregations', async () => {
      const data = [10, 20, 30, 40, 50];

      const privateSum = await dp.privateAggregate(data, 'sum');
      const privateMean = await dp.privateAggregate(data, 'mean');
      const privateCount = await dp.privateAggregate(data, 'count');

      // Results should be close but not exact
      expect(privateSum).toBeCloseTo(150, -1);
      expect(privateMean).toBeCloseTo(30, 0);
      expect(privateCount).toBeCloseTo(5, 0);
    });

    test('should reset privacy budget', async () => {
      // Use some budget
      await dp.addNoise(100, 1);
      await dp.addNoise(200, 1);

      let budget = dp.getBudget();
      expect(budget.used).toBeGreaterThan(0);

      // Reset budget
      dp.resetBudget();

      budget = dp.getBudget();
      expect(budget.used).toBe(0);
      expect(budget.remaining).toBe(1.0);
      expect(budget.queries).toHaveLength(0);
    });
  });

  describe('Federated Learning', () => {
    let fl: any;

    beforeEach(async () => {
      const config: FederatedLearningConfig = {
        enabled: true,
        aggregation: 'fedAvg',
        encryption: 'homomorphic',
        minClients: 2,
        roundTimeout: 300,
      };
      fl = createFederatedLearning(config);
    });

    test('should create federated learning round', async () => {
      const clients = ['client1', 'client2', 'client3'];

      const round = await fl.startRound(clients, 'model-v1');

      expect(round).toBeDefined();
      expect(round.id).toBeDefined();
      expect(round.roundNumber).toBe(1);
      expect(round.participants).toEqual(clients);
      expect(round.modelVersion).toBe('model-v1');
      expect(round.status).toBe('waiting');
      expect(round.startedAt).toBeInstanceOf(Date);
    });

    test('should handle client updates', async () => {
      const clients = ['client1', 'client2'];
      const round = await fl.startRound(clients, 'model-v1');

      // Submit encrypted gradients
      const gradients1 = new Uint8Array([1, 2, 3, 4]);
      const gradients2 = new Uint8Array([5, 6, 7, 8]);

      await fl.submitUpdate(round.id, 'client1', gradients1);
      await fl.submitUpdate(round.id, 'client2', gradients2);

      // Check round status
      const status = await fl.getRoundStatus(round.id);
      expect(status.updates).toHaveLength(2);
      expect(status.pendingClients).toHaveLength(0);
    });

    test('should aggregate updates', async () => {
      const clients = ['client1', 'client2'];
      const round = await fl.startRound(clients, 'model-v1');

      // Submit updates
      await fl.submitUpdate(round.id, 'client1', new Uint8Array([10, 20]));
      await fl.submitUpdate(round.id, 'client2', new Uint8Array([30, 40]));

      // Complete round
      const aggregated = await fl.completeRound(round.id);

      expect(aggregated).toBeDefined();
      expect(aggregated.modelVersion).toBe('model-v1.1');
      expect(aggregated.aggregatedWeights).toBeInstanceOf(Uint8Array);
      expect(aggregated.metrics).toBeDefined();
      expect(aggregated.participantCount).toBe(2);
    });

    test('should handle secure aggregation', async () => {
      const config: FederatedLearningConfig = {
        enabled: true,
        aggregation: 'secureAgg',
        encryption: 'homomorphic',
        minClients: 3,
      };
      const secureFL = createFederatedLearning(config);

      const clients = ['client1', 'client2', 'client3'];
      const round = await secureFL.startRound(clients, 'model-v1');

      expect(round.aggregation).toBe('secureAgg');
    });

    test('should calculate FL metrics', async () => {
      const metrics = await fl.calculateMetrics(['round1', 'round2']);

      expect(metrics).toBeDefined();
      expect(metrics.totalRounds).toBe(2);
      expect(metrics.averageParticipants).toBeGreaterThanOrEqual(0);
      expect(metrics.modelConvergence).toBeGreaterThanOrEqual(0);
      expect(metrics.communicationCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Private Information Retrieval', () => {
    let pir: any;

    beforeEach(async () => {
      pir = createPIR({
        enabled: true,
        scheme: 'computational',
        databaseSize: 1000,
      });
    });

    test('should create PIR query', async () => {
      const index = 42;
      const query = await pir.createQuery(index);

      expect(query).toBeDefined();
      expect(query.encryptedIndex).toBeInstanceOf(Uint8Array);
      expect(query.scheme).toBe('computational');
      expect(query.databaseSize).toBe(1000);
    });

    test('should execute PIR query', async () => {
      const database = Array(100)
        .fill(0)
        .map((_, i) => `record-${i}`);
      const targetIndex = 42;

      const query = await pir.createQuery(targetIndex);
      const response = await pir.executeQuery(query, database);

      expect(response).toBeDefined();
      expect(response.encryptedResult).toBeInstanceOf(Uint8Array);

      const result = await pir.decryptResponse(response);
      expect(result).toBe(`record-${targetIndex}`);
    });
  });

  describe('Private Set Intersection', () => {
    let psi: any;

    beforeEach(async () => {
      psi = createPSI({
        enabled: true,
        protocol: 'DH-PSI',
        hashFunction: 'SHA-256',
      });
    });

    test('should initiate PSI protocol', async () => {
      const clientSet = ['apple', 'banana', 'cherry'];

      const session = await psi.initiate(clientSet);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.protocol).toBe('DH-PSI');
      expect(session.status).toBe('initiated');
      expect(session.clientSetSize).toBe(3);
    });

    test('should complete PSI protocol', async () => {
      const clientSet = ['apple', 'banana', 'cherry', 'date'];
      const serverSet = ['banana', 'cherry', 'elderberry', 'fig'];

      const session = await psi.initiate(clientSet);
      const serverResponse = await psi.respond(session.id, serverSet);
      const intersection = await psi.computeIntersection(
        session.id,
        serverResponse
      );

      expect(intersection).toBeDefined();
      expect(intersection.size).toBe(2);
      expect(intersection.elements).toEqual(['banana', 'cherry']);
    });
  });

  describe('Homomorphic Encryption Service Integration', () => {
    let heService: any;

    beforeEach(async () => {
      const config: HomomorphicEncryptionConfig = {
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
      heService = await createHomomorphicEncryptionService(config);
    });

    test('should encrypt and store agent memory', async () => {
      const memory = {
        content: 'Important agent memory',
        importance: 0.9,
        timestamp: new Date(),
        tags: ['critical', 'personal'],
      };
      const agentId = 'agent-123';

      const encMemory = await heService.encryptMemory(memory, agentId);

      expect(encMemory).toBeDefined();
      expect(encMemory.id).toBeDefined();
      expect(encMemory.agentId).toBe(agentId);
      expect(encMemory.encryptedContent).toBeInstanceOf(Uint8Array);
      expect(encMemory.encryptedImportance).toBeInstanceOf(Uint8Array);
      expect(encMemory.metadata.tags).toEqual(memory.tags);
    });

    test('should search encrypted memories', async () => {
      const agentId = 'agent-123';

      // Store some memories
      const memories = [
        { content: 'Meeting with Alice', importance: 0.8, tags: ['meeting'] },
        { content: 'Project deadline', importance: 0.9, tags: ['project'] },
        { content: 'Lunch with Bob', importance: 0.3, tags: ['meeting'] },
      ];

      for (const mem of memories) {
        await heService.encryptMemory(mem, agentId);
      }

      // Search by importance threshold
      const query = await heService.encrypt(0.7);
      const results = await heService.searchEncryptedMemories({
        agentId,
        queryType: 'threshold',
        encryptedQuery: query,
        limit: 10,
      });

      expect(results).toBeDefined();
      expect(results.results).toHaveLength(2); // Two memories with importance >= 0.7
    });

    test('should get HE performance metrics', async () => {
      const metrics = await heService.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.encryptionTime).toBeDefined();
      expect(metrics.decryptionTime).toBeDefined();
      expect(metrics.computationTime).toBeDefined();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.ciphertextSize).toBeDefined();
      expect(metrics.keySize).toBeDefined();
      expect(metrics.operations).toBeDefined();
    });

    test('should handle performance modes', async () => {
      const modes = ['speed', 'balanced', 'security'] as const;

      for (const mode of modes) {
        await heService.setPerformanceMode(mode);
        const metrics = await heService.getMetrics();

        if (mode === 'speed') {
          expect(metrics.encryptionTime.average).toBeLessThan(100);
        } else if (mode === 'security') {
          expect(metrics.keySize.public).toBeGreaterThan(4096);
        }
      }
    });
  });
});
