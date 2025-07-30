/**
 * Quantum Security Tests
 *
 * Test suite for quantum-resistant cryptography and related features
 */

import {
  createQuantumSecurityService,
  createQuantumCrypto,
  createZKProofSystem,
  createQKD,
  createQRNG,
} from '../quantum';
import {
  QuantumAlgorithm,
  QuantumSecurityLevel,
  QuantumSecurityConfig,
  PQCKeyPair,
  ZKProofConfig,
  QKDConfig,
  QRNGConfig,
} from '../../../types/quantum-security';

describe('Quantum Security', () => {
  describe('Post-Quantum Cryptography', () => {
    let quantumCrypto: any;

    beforeEach(async () => {
      quantumCrypto = createQuantumCrypto('CRYSTALS-Kyber', 'NIST-3');
    });

    test('should generate quantum-resistant key pairs', async () => {
      const keyPair = await quantumCrypto.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.algorithm).toBe('CRYSTALS-Kyber');
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.securityLevel).toBe('NIST-3');
      expect(keyPair.keySize).toBeGreaterThan(0);
      expect(keyPair.generatedAt).toBeInstanceOf(Date);
    });

    test('should encrypt and decrypt data', async () => {
      const keyPair = await quantumCrypto.generateKeyPair();
      const plaintext = new TextEncoder().encode('Secret message');

      const encrypted = await quantumCrypto.encrypt(
        plaintext,
        keyPair.publicKey
      );
      expect(encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe('CRYSTALS-Kyber');
      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.encapsulatedKey).toBeInstanceOf(Uint8Array);

      const decrypted = await quantumCrypto.decrypt(
        encrypted,
        keyPair.privateKey
      );
      expect(decrypted).toEqual(plaintext);
    });

    test('should create and verify signatures', async () => {
      const signer = createQuantumCrypto('CRYSTALS-Dilithium', 'NIST-5');
      const keyPair = await signer.generateKeyPair();
      const message = new TextEncoder().encode('Sign this message');

      const signature = await signer.sign(message, keyPair.privateKey);
      expect(signature).toBeDefined();
      expect(signature.algorithm).toBe('CRYSTALS-Dilithium');
      expect(signature.signature).toBeInstanceOf(Uint8Array);

      const isValid = await signer.verify(signature, keyPair.publicKey);
      expect(isValid).toBe(true);

      // Test invalid signature
      signature.signature[0] = signature.signature[0] ^ 0xff;
      const isInvalid = await signer.verify(signature, keyPair.publicKey);
      expect(isInvalid).toBe(false);
    });

    test('should handle different quantum algorithms', async () => {
      const algorithms: QuantumAlgorithm[] = [
        'CRYSTALS-Kyber',
        'CRYSTALS-Dilithium',
        'Falcon',
        'SPHINCS+',
      ];

      for (const algorithm of algorithms) {
        const crypto = createQuantumCrypto(algorithm, 'NIST-3');
        const keyPair = await crypto.generateKeyPair();
        expect(keyPair.algorithm).toBe(algorithm);
      }
    });

    test('should handle different security levels', async () => {
      const levels: QuantumSecurityLevel[] = ['NIST-1', 'NIST-3', 'NIST-5'];

      for (const level of levels) {
        const crypto = createQuantumCrypto('CRYSTALS-Kyber', level);
        const keyPair = await crypto.generateKeyPair();
        expect(keyPair.securityLevel).toBe(level);

        // Higher security levels should have larger keys
        if (level === 'NIST-5') {
          expect(keyPair.keySize).toBeGreaterThan(3000);
        }
      }
    });
  });

  describe('Zero-Knowledge Proofs', () => {
    let zkProofSystem: any;
    let zkAuth: any;

    beforeEach(async () => {
      const config: ZKProofConfig = {
        enabled: true,
        protocol: 'zk-SNARK',
        curve: 'BLS12-381',
        securityParameter: 128,
      };
      zkProofSystem = createZKProofSystem(config);
      zkAuth = await zkProofSystem.createZKAuthentication(config);
    });

    test('should generate and verify ZK proofs', async () => {
      const statement = { claim: 'I know the secret', public: 42 };
      const witness = { secret: 'my-secret-value' };

      const proof = await zkProofSystem.generateProof(statement, witness);
      expect(proof).toBeDefined();
      expect(proof.protocol).toBe('zk-SNARK');
      expect(proof.proof).toBeInstanceOf(Uint8Array);
      expect(proof.publicInputs).toContain('42');

      const isValid = await zkProofSystem.verifyProof(proof);
      expect(isValid).toBe(true);
    });

    test('should handle ZK authentication', async () => {
      const userId = 'user-123';
      const userSecret = 'super-secret-password';

      // Register user
      await zkAuth.registerUser(userId, userSecret);

      // Create authentication challenge
      const challenge = await zkAuth.createZKAuthChallenge(userId);
      expect(challenge).toBeDefined();
      expect(challenge.userId).toBe(userId);
      expect(challenge.challenge).toBeInstanceOf(Uint8Array);
      expect(challenge.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Authenticate without revealing secret
      const authProof = await zkAuth.authenticateUser(
        userId,
        userSecret,
        challenge
      );
      expect(authProof).toBeDefined();
      expect(authProof.proof).toBeInstanceOf(Uint8Array);

      // Verify authentication
      const isAuthenticated = await zkAuth.verifyAuthentication(authProof);
      expect(isAuthenticated).toBe(true);
    });

    test('should create membership proofs', async () => {
      const set = ['alice', 'bob', 'charlie', 'david'];
      const member = 'charlie';

      const proof = await zkProofSystem.createMembershipProof(member, set);
      expect(proof).toBeDefined();

      const isValid = await zkProofSystem.verifyMembershipProof(proof, set);
      expect(isValid).toBe(true);
    });

    test('should create range proofs', async () => {
      const value = 25;
      const min = 18;
      const max = 65;

      const proof = await zkProofSystem.createRangeProof(value, min, max);
      expect(proof).toBeDefined();

      const isValid = await zkProofSystem.verifyRangeProof(proof, min, max);
      expect(isValid).toBe(true);
    });
  });

  describe('Quantum Key Distribution', () => {
    let qkd: any;

    beforeEach(async () => {
      const config: QKDConfig = {
        enabled: true,
        protocol: 'BB84',
        errorRate: 0.01,
        keyRate: 1000,
        channelLoss: 0.2,
      };
      qkd = createQKD(config);
    });

    test('should establish QKD session', async () => {
      const session = await qkd.createSession('alice', 'bob');

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.alice).toBe('alice');
      expect(session.bob).toBe('bob');
      expect(session.protocol).toBe('BB84');
      expect(session.status).toBe('initializing');
      expect(session.startedAt).toBeInstanceOf(Date);
    });

    test('should execute BB84 protocol', async () => {
      const session = await qkd.createSession('alice', 'bob');

      // Execute protocol
      await qkd.executeBB84(session);

      // Get key from session
      const key = await qkd.getKey(session.id, 256);
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(256);

      // Get session metrics
      const metrics = await qkd.getSessionMetrics(session.id);
      expect(metrics).toBeDefined();
      expect(metrics.bitsExchanged).toBeGreaterThan(0);
      expect(metrics.finalKeyBits).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeLessThan(0.05);
      expect(metrics.compressionRatio).toBeGreaterThan(0);
    });

    test('should handle different QKD protocols', async () => {
      const protocols = ['BB84', 'E91', 'B92'];

      for (const protocol of protocols) {
        const config: QKDConfig = {
          enabled: true,
          protocol: protocol as any,
          errorRate: 0.01,
          keyRate: 1000,
        };
        const qkdInstance = createQKD(config);
        const session = await qkdInstance.createSession('alice', 'bob');
        expect(session.protocol).toBe(protocol);
      }
    });
  });

  describe('Quantum Random Number Generator', () => {
    let qrng: any;

    beforeEach(async () => {
      const config: QRNGConfig = {
        enabled: true,
        source: 'optical',
        minEntropy: 7.5,
        healthCheckInterval: 5000,
      };
      qrng = createQRNG(config);
    });

    test('should generate quantum random numbers', async () => {
      const randomBytes = await qrng.generateRandom(32);

      expect(randomBytes).toBeInstanceOf(Uint8Array);
      expect(randomBytes.length).toBe(32);

      // Check randomness (very basic test)
      const uniqueBytes = new Set(randomBytes);
      expect(uniqueBytes.size).toBeGreaterThan(16); // Should have variety
    });

    test('should handle different byte sizes', async () => {
      const sizes = [16, 32, 64, 128, 256];

      for (const size of sizes) {
        const random = await qrng.generateRandom(size);
        expect(random.length).toBe(size);
      }
    });

    test('should check QRNG health', async () => {
      const status = await qrng.getStatus();

      expect(status).toBeDefined();
      expect(status.healthy).toBe(true);
      expect(status.source).toBe('optical');
      expect(status.entropyRate).toBeGreaterThan(7.5);
      expect(status.temperature).toBeGreaterThan(0);
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.totalBitsGenerated).toBeGreaterThan(0);
      expect(status.lastHealthCheck).toBeInstanceOf(Date);
    });

    test('should handle health check failures', async () => {
      // Force a health check failure
      qrng.config.minEntropy = 10.0; // Unrealistically high

      const status = await qrng.getStatus();
      expect(status.healthy).toBe(false);
      expect(status.errors).toContain('Entropy below minimum threshold');
    });
  });

  describe('Quantum Security Service Integration', () => {
    let quantumSecurity: any;

    beforeEach(async () => {
      const config: QuantumSecurityConfig = {
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
        },
        zkProofs: {
          enabled: true,
          protocol: 'zk-SNARK',
          curve: 'BLS12-381',
        },
      };
      quantumSecurity = await createQuantumSecurityService(config);
    });

    test('should assess quantum readiness', async () => {
      const readiness = await quantumSecurity.assessQuantumReadiness();

      expect(readiness).toBeDefined();
      expect(readiness.overallScore).toBeGreaterThanOrEqual(0);
      expect(readiness.overallScore).toBeLessThanOrEqual(100);
      expect(readiness.components).toBeDefined();
      expect(readiness.vulnerabilities).toBeInstanceOf(Array);
      expect(readiness.recommendations).toBeInstanceOf(Array);
      expect(readiness.migrationPlan).toBeDefined();
      expect(readiness.estimatedCost).toBeGreaterThan(0);
      expect(readiness.estimatedTime).toBeGreaterThan(0);
    });

    test('should migrate to quantum-safe algorithms', async () => {
      const testData = {
        algorithm: 'RSA-2048',
        data: 'legacy-encrypted-data',
      };

      const migrated = await quantumSecurity.migrateToQuantumSafe(
        testData.data,
        testData.algorithm
      );

      expect(migrated).toBeDefined();
      expect(migrated.algorithm).toMatch(/CRYSTALS-Kyber|CRYSTALS-Dilithium/);
      expect(migrated.data).toBeDefined();
      expect(migrated.migratedAt).toBeInstanceOf(Date);
    });

    test('should handle hybrid cryptography', async () => {
      const hybridKeys = await quantumSecurity.generateHybridKeyPair({
        classical: 'ECDH-P256',
        quantum: 'CRYSTALS-Kyber',
        combiner: 'XOR',
      });

      expect(hybridKeys).toBeDefined();
      expect(hybridKeys.classical).toBeDefined();
      expect(hybridKeys.quantum).toBeDefined();
      expect(hybridKeys.classical.algorithm).toBe('ECDH-P256');
      expect(hybridKeys.quantum.algorithm).toBe('CRYSTALS-Kyber');
    });

    test('should integrate all quantum features', async () => {
      // Generate PQC keys
      const pqcKeys = await quantumSecurity.generatePQCKeyPair();
      expect(pqcKeys).toBeDefined();

      // Establish QKD session
      const qkdSession = await quantumSecurity.establishQKDSession(
        'alice',
        'bob'
      );
      expect(qkdSession).toBeDefined();

      // Generate quantum random
      const qrandom = await quantumSecurity.generateQuantumRandom(32);
      expect(qrandom).toBeInstanceOf(Uint8Array);

      // Create ZK proof
      const zkProof = await quantumSecurity.generateZKProof(
        { claim: 'test' },
        { witness: 'secret' }
      );
      expect(zkProof).toBeDefined();
    });
  });
});
