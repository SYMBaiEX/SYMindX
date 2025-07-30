/**
 * Homomorphic Encryption Module
 *
 * Exports homomorphic encryption and privacy-preserving components
 */

// Main service
export {
  HomomorphicEncryptionServiceImpl,
  createHomomorphicEncryptionService,
} from './homomorphic-service';

// Core homomorphic encryption
export {
  HomomorphicEncryptionCore,
  PrivateInferenceEngine,
  createHECore,
  createPrivateInferenceEngine,
} from './homomorphic-encryption';

// Privacy-preserving features
export {
  SecureMultiPartyComputation,
  DifferentialPrivacy,
  FederatedLearning,
  PrivateInformationRetrieval,
  PrivateSetIntersection,
  createSMPC,
  createDifferentialPrivacy,
  createFederatedLearning,
  createPIR,
  createPSI,
} from './privacy-preserving';

// Re-export types
export type {
  HEScheme,
  HESecurityParams,
  HESecurityLevel,
  HEKeySet,
  HEPublicKey,
  HESecretKey,
  HECiphertext,
  HEOperation,
  HEComputation,
  HomomorphicEncryptionConfig,
  HomomorphicEncryptionService,
  PrivateInferenceConfig,
  PrivateModel,
  EncryptedMemory,
  EncryptedMemoryQuery,
  EncryptedMemoryResult,
  PIRConfig,
  PIRQuery,
  PIRResponse,
  PSIConfig,
  PSISession,
  HEPerformanceMetrics,
} from '../../../types/homomorphic-encryption';

export type {
  SMPCConfig,
  SMPCSession,
  DifferentialPrivacyConfig,
  DPBudget,
  FederatedLearningConfig,
  FLRound,
  FLMetrics,
} from '../../../types/quantum-security';
