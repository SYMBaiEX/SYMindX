/**
 * Security Module Index
 * Exports all security components for the SYMindX system
 */

// Authentication
export { JWTManager } from './auth/jwt-manager';
export { SessionManager } from './auth/session-manager';

// Middleware
export { AuthMiddleware } from './middleware/auth-middleware';
export { InputValidator } from './middleware/input-validation';
export { SecureErrorHandler } from './middleware/secure-error-handler';

// WebSocket Security
export { WebSocketSecurity } from './websocket/websocket-auth';

// Secrets Management
export { SecretsManager } from './secrets-manager';

// Quantum Security
export {
  QuantumSecurityServiceImpl,
  createQuantumSecurityService,
  QuantumCrypto,
  HybridCrypto,
  createQuantumCrypto,
  createHybridCrypto,
  ZeroKnowledgeProofSystem,
  ZKAuthentication,
  createZKProofSystem,
  createZKAuthentication,
  QuantumRandomNumberGenerator,
  QuantumKeyDistribution,
  createQRNG,
  createQKD,
} from './quantum';

// Homomorphic Encryption
export {
  HomomorphicEncryptionServiceImpl,
  createHomomorphicEncryptionService,
  HomomorphicEncryptionCore,
  PrivateInferenceEngine,
  createHECore,
  createPrivateInferenceEngine,
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
} from './homomorphic';

// AI Act Compliance
export {
  AIActComplianceServiceImpl,
  createAIActComplianceService,
  ExplainabilityEngine,
  createExplainabilityEngine,
  BiasDetectionEngine,
  createBiasDetectionEngine,
  AISystemLogger,
  HumanOversightManager,
  createAISystemLogger,
  createHumanOversightManager,
} from './ai-act';

// Compliance Dashboard
export {
  ComplianceDashboard,
  createComplianceDashboard,
} from './compliance-dashboard';

// Types - Authentication & Middleware
export type { JWTPayload, TokenPair, JWTConfig } from './auth/jwt-manager';
export type { Session, SessionConfig } from './auth/session-manager';
export type {
  AuthMiddlewareConfig,
  ApiKeyData,
} from './middleware/auth-middleware';
export type {
  ValidationConfig,
  ValidationRule,
} from './middleware/input-validation';
export type {
  SecureErrorConfig,
  SecureError,
} from './middleware/secure-error-handler';
export type {
  WebSocketSecurityConfig,
  SecureWebSocketConnection,
} from './websocket/websocket-auth';
export type { SecretConfig, EncryptedSecret } from './secrets-manager';

// Types - Quantum Security
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
} from './quantum';

// Types - Homomorphic Encryption
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
  HEPerformanceMetrics,
} from './homomorphic';

// Types - AI Act Compliance
export type {
  AIRiskCategory,
  AISystemPurpose,
  AIActConfig,
  AISystemLog,
  AIEventType,
  ExplainabilityConfig,
  ExplainabilityMethod,
  Explanation,
  ExplanationFactor,
  HumanOversightConfig,
  HumanReview,
  HumanOversightRequest,
  BiasDetectionConfig,
  FairnessMetric,
  MitigationStrategy,
  BiasReport,
  BiasMetric,
  DetectedBias,
  MitigationAction,
  DataQualityConfig,
  DataQualityReport,
  TechnicalDocumentation,
  AIActComplianceStatus,
  AIActComplianceReport,
  AIActComplianceService,
} from './ai-act';

// Types - Privacy Features
export type {
  SMPCConfig,
  SMPCSession,
  DifferentialPrivacyConfig,
  DPBudget,
  FederatedLearningConfig,
  FLRound,
  FLMetrics,
} from './homomorphic';

// Types - Compliance Dashboard
export type {
  ComplianceDashboardData,
  ComplianceAlert,
  ComplianceAction,
} from './compliance-dashboard';
