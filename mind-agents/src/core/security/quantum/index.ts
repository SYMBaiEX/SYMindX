/**
 * Quantum Security Module
 *
 * Exports quantum-resistant security components
 */

// Core quantum security service
export {
  QuantumSecurityServiceImpl,
  createQuantumSecurityService,
} from './quantum-security-service';

// Quantum cryptography
export {
  QuantumCrypto,
  HybridCrypto,
  createQuantumCrypto,
  createHybridCrypto,
} from './quantum-crypto';

// Zero-knowledge proofs
export {
  ZeroKnowledgeProofSystem,
  ZKAuthentication,
  createZKProofSystem,
  createZKAuthentication,
} from './zero-knowledge';

// Quantum key distribution and QRNG
export {
  QuantumRandomNumberGenerator,
  QuantumKeyDistribution,
  createQRNG,
  createQKD,
} from './quantum-key-distribution';

// Re-export types
export type {
  QuantumAlgorithm,
  QuantumSecurityLevel,
  QuantumSecurityConfig,
  QuantumSecurityService,
  PQCKeyPair,
  PQCSignature,
  PQCEncryptedData,
  HybridCryptoConfig,
  HybridKeyPair,
  QKDConfig,
  QKDSession,
  QRNGConfig,
  QRNGStatus,
  ZKProofConfig,
  ZKProof,
  ZKAuthenticationChallenge,
  QuantumReadinessReport,
  QuantumVulnerability,
  QuantumMigrationRecommendation,
  QuantumMigrationTimeline,
} from '../../../types/quantum-security';
