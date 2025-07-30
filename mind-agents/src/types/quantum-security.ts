/**
 * Quantum Security Type Definitions
 *
 * Types for quantum-resistant cryptography and security features
 */

// Quantum Algorithm Types
export type QuantumAlgorithm =
  | 'CRYSTALS-Kyber'
  | 'CRYSTALS-Dilithium'
  | 'Falcon'
  | 'SPHINCS+'
  | 'Classic-McEliece'
  | 'NTRU'
  | 'SABER';

export type QuantumSecurityLevel =
  | 'NIST-1' // 128-bit classical security
  | 'NIST-3' // 192-bit classical security
  | 'NIST-5'; // 256-bit classical security;

// Quantum Key Distribution
export interface QKDConfig {
  enabled: boolean;
  protocol: 'BB84' | 'E91' | 'B92' | 'SARG04';
  errorRate: number;
  keyRate: number; // bits per second
  maxDistance?: number; // km
  quantumChannel?: 'fiber' | 'free-space';
}

export interface QKDSession {
  id: string;
  alice: string;
  bob: string;
  protocol: string;
  establishedAt: Date;
  keyBits: number;
  errorRate: number;
  status: 'establishing' | 'active' | 'completed' | 'failed';
}

// Quantum Random Number Generation
export interface QRNGConfig {
  enabled: boolean;
  source: 'optical' | 'radioactive' | 'vacuum' | 'simulated';
  minEntropy: number; // bits per byte
  healthCheckInterval: number; // ms
}

export interface QRNGStatus {
  healthy: boolean;
  entropy: number;
  bytesGenerated: number;
  lastHealthCheck: Date;
  failureRate: number;
}

// Post-Quantum Cryptography
export interface PQCKeyPair {
  algorithm: QuantumAlgorithm;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  securityLevel: QuantumSecurityLevel;
  keySize: number;
  generatedAt: Date;
}

export interface PQCSignature {
  algorithm: QuantumAlgorithm;
  signature: Uint8Array;
  message: Uint8Array;
  publicKey: Uint8Array;
  timestamp: Date;
}

export interface PQCEncryptedData {
  algorithm: QuantumAlgorithm;
  ciphertext: Uint8Array;
  encapsulatedKey?: Uint8Array; // For KEM-based encryption
  nonce?: Uint8Array;
  aad?: Uint8Array; // Additional authenticated data
}

// Hybrid Cryptography (Classical + Quantum-Resistant)
export interface HybridCryptoConfig {
  classical: {
    algorithm: 'RSA-2048' | 'ECDSA-P256' | 'Ed25519';
    enabled: boolean;
  };
  quantumResistant: {
    algorithm: QuantumAlgorithm;
    securityLevel: QuantumSecurityLevel;
    enabled: boolean;
  };
  mode: 'concatenate' | 'nested' | 'combined';
}

export interface HybridKeyPair {
  classical: {
    algorithm: string;
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  };
  quantumResistant: PQCKeyPair;
  combinedPublicKey: Uint8Array;
  combinedPrivateKey: Uint8Array;
}

// Zero-Knowledge Proofs
export interface ZKProofConfig {
  enabled: boolean;
  protocol: 'zk-SNARK' | 'zk-STARK' | 'Bulletproofs' | 'Aurora';
  curve?: 'BN254' | 'BLS12-381' | 'Groth16';
  trustedSetup?: boolean;
}

export interface ZKProof {
  protocol: string;
  statement: string;
  proof: Uint8Array;
  publicInputs?: any[];
  verificationKey?: Uint8Array;
  timestamp: Date;
}

export interface ZKAuthenticationChallenge {
  id: string;
  challenge: Uint8Array;
  protocol: string;
  expiresAt: Date;
  attempts: number;
}

// Secure Multi-Party Computation
export interface SMPCConfig {
  enabled: boolean;
  protocol: 'GMW' | 'BGW' | 'Shamir' | 'SPDZ';
  parties: number;
  threshold: number; // minimum parties needed
  computationType: 'boolean' | 'arithmetic' | 'mixed';
}

export interface SMPCSession {
  id: string;
  protocol: string;
  parties: SMPCParty[];
  computation: string;
  inputs: Map<string, Uint8Array>; // party ID -> encrypted input
  startedAt: Date;
  status: 'initializing' | 'computing' | 'completed' | 'failed';
  result?: Uint8Array;
}

export interface SMPCParty {
  id: string;
  publicKey: Uint8Array;
  role: 'contributor' | 'evaluator' | 'observer';
  online: boolean;
  share?: Uint8Array;
}

// Differential Privacy
export interface DifferentialPrivacyConfig {
  enabled: boolean;
  epsilon: number; // privacy budget
  delta: number; // failure probability
  mechanism: 'laplace' | 'gaussian' | 'exponential' | 'randomized-response';
  sensitivity?: number;
}

export interface DPQuery {
  id: string;
  query: string;
  mechanism: string;
  epsilon: number;
  noise: number;
  timestamp: Date;
}

export interface DPBudget {
  total: number;
  used: number;
  remaining: number;
  queries: DPQuery[];
  resetAt?: Date;
}

// Federated Learning Security
export interface FederatedLearningConfig {
  enabled: boolean;
  aggregation: 'fedAvg' | 'fedProx' | 'fedNova' | 'scaffold';
  encryption: 'homomorphic' | 'secure-aggregation' | 'differential-privacy';
  minClients: number;
  roundTimeout: number; // seconds
}

export interface FLRound {
  id: string;
  roundNumber: number;
  participants: string[];
  modelVersion: string;
  startedAt: Date;
  completedAt?: Date;
  aggregatedUpdate?: Uint8Array;
  metrics?: FLMetrics;
}

export interface FLMetrics {
  accuracy: number;
  loss: number;
  participationRate: number;
  averageComputeTime: number;
  droppedClients: number;
}

// Quantum Security Service Interface
export interface QuantumSecurityService {
  // Key Generation
  generatePQCKeyPair(
    algorithm: QuantumAlgorithm,
    level: QuantumSecurityLevel
  ): Promise<PQCKeyPair>;
  generateHybridKeyPair(config: HybridCryptoConfig): Promise<HybridKeyPair>;

  // Encryption/Decryption
  encryptPQC(
    data: Uint8Array,
    publicKey: Uint8Array,
    algorithm: QuantumAlgorithm
  ): Promise<PQCEncryptedData>;
  decryptPQC(
    encrypted: PQCEncryptedData,
    privateKey: Uint8Array
  ): Promise<Uint8Array>;

  // Signatures
  signPQC(
    message: Uint8Array,
    privateKey: Uint8Array,
    algorithm: QuantumAlgorithm
  ): Promise<PQCSignature>;
  verifyPQC(signature: PQCSignature): Promise<boolean>;

  // QKD
  establishQKDSession(
    alice: string,
    bob: string,
    config: QKDConfig
  ): Promise<QKDSession>;
  getQKDKey(sessionId: string, length: number): Promise<Uint8Array>;

  // QRNG
  generateQuantumRandom(bytes: number): Promise<Uint8Array>;
  getQRNGStatus(): Promise<QRNGStatus>;

  // Zero-Knowledge Proofs
  generateZKProof(
    statement: any,
    witness: any,
    config: ZKProofConfig
  ): Promise<ZKProof>;
  verifyZKProof(proof: ZKProof): Promise<boolean>;
  createZKAuthChallenge(userId: string): Promise<ZKAuthenticationChallenge>;
  respondToZKChallenge(
    challenge: ZKAuthenticationChallenge,
    response: Uint8Array
  ): Promise<boolean>;

  // Migration
  migrateToQuantumSafe(data: any, fromAlgorithm: string): Promise<any>;
  assessQuantumReadiness(): Promise<QuantumReadinessReport>;
}

// Quantum Readiness Assessment
export interface QuantumReadinessReport {
  assessedAt: Date;
  overallScore: number; // 0-100
  vulnerabilities: QuantumVulnerability[];
  recommendations: QuantumMigrationRecommendation[];
  timeline: QuantumMigrationTimeline;
}

export interface QuantumVulnerability {
  component: string;
  algorithm: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  quantumThreat: 'harvest-now-decrypt-later' | 'immediate' | 'future';
  description: string;
}

export interface QuantumMigrationRecommendation {
  priority: number;
  component: string;
  currentAlgorithm: string;
  recommendedAlgorithm: QuantumAlgorithm;
  effort: 'low' | 'medium' | 'high';
  impact: string;
}

export interface QuantumMigrationTimeline {
  immediate: string[]; // Components to migrate now
  shortTerm: string[]; // 6-12 months
  mediumTerm: string[]; // 1-2 years
  longTerm: string[]; // 2-5 years
}

// Quantum Security Configuration
export interface QuantumSecurityConfig {
  pqc: {
    enabled: boolean;
    defaultAlgorithm: QuantumAlgorithm;
    securityLevel: QuantumSecurityLevel;
    hybridMode?: HybridCryptoConfig;
  };
  qkd?: QKDConfig;
  qrng?: QRNGConfig;
  zkProofs?: ZKProofConfig;
  smpc?: SMPCConfig;
  differentialPrivacy?: DifferentialPrivacyConfig;
  federatedLearning?: FederatedLearningConfig;
}

// Factory function type
export type QuantumSecurityFactory = (
  config: QuantumSecurityConfig
) => Promise<QuantumSecurityService>;
