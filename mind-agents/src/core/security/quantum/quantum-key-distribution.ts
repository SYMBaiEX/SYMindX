/**
 * Quantum Key Distribution (QKD) Implementation
 *
 * Simulates QKD protocols for secure key exchange
 */

import { randomBytes, createHash } from 'crypto';
import {
  QKDConfig,
  QKDSession,
  QRNGConfig,
  QRNGStatus,
} from '../../../types/quantum-security';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Quantum Random Number Generator
 */
export class QuantumRandomNumberGenerator {
  private readonly config: QRNGConfig;
  private bytesGenerated: number = 0;
  private lastHealthCheck: Date;
  private failureCount: number = 0;

  constructor(config: QRNGConfig) {
    this.config = config;
    this.lastHealthCheck = new Date();
  }

  /**
   * Generate quantum random bytes
   */
  async generateRandom(bytes: number): Promise<Uint8Array> {
    runtimeLogger.debug(`Generating ${bytes} quantum random bytes`);

    // Check health periodically
    if (
      Date.now() - this.lastHealthCheck.getTime() >
      this.config.healthCheckInterval
    ) {
      await this.performHealthCheck();
    }

    // In production, this would interface with actual QRNG hardware
    // For demonstration, we simulate with crypto.randomBytes
    const random = randomBytes(bytes);

    // Apply entropy validation
    const entropy = this.calculateEntropy(random);
    if (entropy < this.config.minEntropy) {
      this.failureCount++;
      throw new Error(
        `Insufficient entropy: ${entropy} < ${this.config.minEntropy}`
      );
    }

    this.bytesGenerated += bytes;
    return new Uint8Array(random);
  }

  /**
   * Get QRNG status
   */
  async getStatus(): Promise<QRNGStatus> {
    const healthy = this.failureCount < 5 && (await this.isHealthy());
    const currentEntropy = await this.measureCurrentEntropy();

    return {
      healthy,
      entropy: currentEntropy,
      bytesGenerated: this.bytesGenerated,
      lastHealthCheck: this.lastHealthCheck,
      failureRate: this.failureCount / Math.max(1, this.bytesGenerated / 1024),
    };
  }

  /**
   * Calculate entropy of random data
   */
  private calculateEntropy(data: Buffer): number {
    // Shannon entropy calculation
    const frequencies = new Map<number, number>();

    for (const byte of data) {
      frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }

    let entropy = 0;
    const total = data.length;

    frequencies.forEach((count) => {
      const probability = count / total;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });

    return entropy;
  }

  /**
   * Perform health check on QRNG
   */
  private async performHealthCheck(): Promise<void> {
    this.lastHealthCheck = new Date();

    // Run statistical tests
    const testData = await this.generateTestData();

    // Frequency test
    const freqTest = this.frequencyTest(testData);

    // Runs test
    const runsTest = this.runsTest(testData);

    if (!freqTest || !runsTest) {
      this.failureCount++;
      runtimeLogger.warn('QRNG health check failed');
    }
  }

  /**
   * Generate test data for health checks
   */
  private async generateTestData(): Promise<Buffer> {
    // In production, get raw data from QRNG
    return randomBytes(1024);
  }

  /**
   * Frequency test for randomness
   */
  private frequencyTest(data: Buffer): boolean {
    let ones = 0;

    for (const byte of data) {
      for (let i = 0; i < 8; i++) {
        if ((byte >> i) & 1) ones++;
      }
    }

    const total = data.length * 8;
    const ratio = ones / total;

    // Check if ratio is close to 0.5 (within 1%)
    return Math.abs(ratio - 0.5) < 0.01;
  }

  /**
   * Runs test for randomness
   */
  private runsTest(data: Buffer): boolean {
    let runs = 0;
    let previousBit = 0;

    for (const byte of data) {
      for (let i = 0; i < 8; i++) {
        const bit = (byte >> i) & 1;
        if (bit !== previousBit) {
          runs++;
          previousBit = bit;
        }
      }
    }

    const expectedRuns = data.length * 4; // Approximately
    const variance = data.length * 2;

    // Check if runs count is within expected range
    return Math.abs(runs - expectedRuns) < 2 * Math.sqrt(variance);
  }

  /**
   * Check if QRNG is healthy
   */
  private async isHealthy(): Promise<boolean> {
    // Simulate hardware status check
    return this.failureCount < 5;
  }

  /**
   * Measure current entropy
   */
  private async measureCurrentEntropy(): Promise<number> {
    const sample = await this.generateTestData();
    return this.calculateEntropy(sample);
  }
}

/**
 * Quantum Key Distribution System
 */
export class QuantumKeyDistribution {
  private readonly config: QKDConfig;
  private readonly sessions: Map<string, QKDSession>;
  private readonly qrng: QuantumRandomNumberGenerator;

  constructor(config: QKDConfig, qrng: QuantumRandomNumberGenerator) {
    this.config = config;
    this.sessions = new Map();
    this.qrng = qrng;
  }

  /**
   * Establish a QKD session between Alice and Bob
   */
  async establishSession(alice: string, bob: string): Promise<QKDSession> {
    runtimeLogger.info(`Establishing QKD session between ${alice} and ${bob}`);

    const sessionId = this.generateSessionId();

    const session: QKDSession = {
      id: sessionId,
      alice,
      bob,
      protocol: this.config.protocol,
      establishedAt: new Date(),
      keyBits: 0,
      errorRate: 0,
      status: 'establishing',
    };

    this.sessions.set(sessionId, session);

    // Simulate QKD protocol execution
    await this.executeProtocol(session);

    return session;
  }

  /**
   * Get secure key from QKD session
   */
  async getKey(sessionId: string, length: number): Promise<Uint8Array> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'active') {
      throw new Error(`Session ${sessionId} is not active`);
    }

    if (session.keyBits < length * 8) {
      throw new Error(
        `Insufficient key material: ${session.keyBits} bits available, ${length * 8} requested`
      );
    }

    // Generate key material using QRNG
    const key = await this.qrng.generateRandom(length);

    // Update session
    session.keyBits -= length * 8;

    return key;
  }

  /**
   * Execute QKD protocol
   */
  private async executeProtocol(session: QKDSession): Promise<void> {
    switch (this.config.protocol) {
      case 'BB84':
        await this.executeBB84(session);
        break;
      case 'E91':
        await this.executeE91(session);
        break;
      case 'B92':
        await this.executeB92(session);
        break;
      case 'SARG04':
        await this.executeSARG04(session);
        break;
      default:
        throw new Error(`Unknown QKD protocol: ${this.config.protocol}`);
    }
  }

  /**
   * Simulate BB84 protocol
   */
  private async executeBB84(session: QKDSession): Promise<void> {
    runtimeLogger.debug(`Executing BB84 protocol for session ${session.id}`);

    // Simulate quantum transmission
    const rawKeyLength = 4096; // bits
    const quantumBits = await this.qrng.generateRandom(rawKeyLength / 8);

    // Simulate basis selection
    const aliceBases = await this.qrng.generateRandom(rawKeyLength / 8);
    const bobBases = await this.qrng.generateRandom(rawKeyLength / 8);

    // Simulate measurement and basis reconciliation
    let matchingBases = 0;
    let errors = 0;

    for (let i = 0; i < rawKeyLength / 8; i++) {
      for (let bit = 0; bit < 8; bit++) {
        const aliceBasis = (aliceBases[i] >> bit) & 1;
        const bobBasis = (bobBases[i] >> bit) & 1;

        if (aliceBasis === bobBasis) {
          matchingBases++;

          // Simulate quantum noise/eavesdropping
          if (Math.random() < this.config.errorRate) {
            errors++;
          }
        }
      }
    }

    // Calculate error rate
    const observedErrorRate = errors / matchingBases;

    if (observedErrorRate > 0.11) {
      // Too high error rate indicates eavesdropping
      session.status = 'failed';
      session.errorRate = observedErrorRate;
      runtimeLogger.warn(
        `QKD session ${session.id} failed due to high error rate: ${observedErrorRate}`
      );
      return;
    }

    // Privacy amplification
    const finalKeyBits = Math.floor(
      matchingBases * (1 - 1.2 * observedErrorRate)
    );

    session.keyBits = finalKeyBits;
    session.errorRate = observedErrorRate;
    session.status = 'active';

    runtimeLogger.info(
      `QKD session ${session.id} established with ${finalKeyBits} secure bits`
    );
  }

  /**
   * Simulate E91 protocol (Ekert 91)
   */
  private async executeE91(session: QKDSession): Promise<void> {
    // E91 uses entangled photon pairs
    // Similar to BB84 but with Bell inequality testing
    await this.executeBB84(session); // Simplified for demonstration
  }

  /**
   * Simulate B92 protocol
   */
  private async executeB92(session: QKDSession): Promise<void> {
    // B92 uses only 2 states instead of 4
    // Simplified implementation
    await this.executeBB84(session);
    session.keyBits = Math.floor(session.keyBits * 0.5); // Lower efficiency
  }

  /**
   * Simulate SARG04 protocol
   */
  private async executeSARG04(session: QKDSession): Promise<void> {
    // SARG04 is more robust against PNS attacks
    await this.executeBB84(session);
    session.keyBits = Math.floor(session.keyBits * 0.8); // Slightly lower efficiency
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return createHash('sha256')
      .update(randomBytes(32))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Monitor QKD sessions
   */
  async monitorSessions(): Promise<Map<string, QKDSession>> {
    // Clean up old sessions
    const now = Date.now();
    const expired: string[] = [];

    this.sessions.forEach((session, id) => {
      const age = now - session.establishedAt.getTime();
      if (age > 3600000) {
        // 1 hour
        expired.push(id);
      }
    });

    expired.forEach((id) => this.sessions.delete(id));

    return new Map(this.sessions);
  }
}

/**
 * Create a Quantum Random Number Generator
 */
export function createQRNG(config: QRNGConfig): QuantumRandomNumberGenerator {
  return new QuantumRandomNumberGenerator(config);
}

/**
 * Create a Quantum Key Distribution system
 */
export function createQKD(
  config: QKDConfig,
  qrng: QuantumRandomNumberGenerator
): QuantumKeyDistribution {
  return new QuantumKeyDistribution(config, qrng);
}
