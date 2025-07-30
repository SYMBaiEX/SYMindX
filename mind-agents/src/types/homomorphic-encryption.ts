/**
 * Homomorphic Encryption Type Definitions
 *
 * Types for fully homomorphic encryption and privacy-preserving computation
 */

// Homomorphic Encryption Schemes
export type HEScheme =
  | 'BFV' // Brakerski-Fan-Vercauteren
  | 'CKKS' // Cheon-Kim-Kim-Song (for approximate arithmetic)
  | 'BGV' // Brakerski-Gentry-Vaikuntanathan
  | 'TFHE' // Fast Fully Homomorphic Encryption over the Torus
  | 'SEAL' // Microsoft SEAL
  | 'HElib' // IBM HElib
  | 'PALISADE' // PALISADE Homomorphic Encryption
  | 'Concrete'; // Zama Concrete

// Security Parameters
export interface HESecurityParams {
  polyModulusDegree: number; // N (power of 2, e.g., 4096, 8192, 16384)
  coeffModulus: number[]; // Coefficient modulus chain
  plainModulus: number; // Plain text modulus (for BFV/BGV)
  scale?: number; // Scale for CKKS
  securityLevel: HESecurityLevel;
}

export type HESecurityLevel =
  | 'HES-128' // 128-bit security
  | 'HES-192' // 192-bit security
  | 'HES-256'; // 256-bit security

// Homomorphic Keys
export interface HEKeySet {
  publicKey: HEPublicKey;
  secretKey?: HESecretKey; // Only on key owner's side
  relinKeys?: HERelinKeys; // For relinearization after multiplication
  galoisKeys?: HEGaloisKeys; // For rotations and complex operations
  evaluationKeys?: HEEvaluationKey[]; // Additional keys for advanced operations
}

export interface HEPublicKey {
  scheme: HEScheme;
  keyData: Uint8Array;
  parameters: HESecurityParams;
  keyId: string;
  generatedAt: Date;
}

export interface HESecretKey {
  scheme: HEScheme;
  keyData: Uint8Array; // Encrypted at rest
  keyId: string;
  owner: string;
}

export interface HERelinKeys {
  keyData: Uint8Array;
  decompositionBitCount: number;
  keyId: string;
}

export interface HEGaloisKeys {
  keyData: Uint8Array;
  steps: number[]; // Rotation steps enabled
  keyId: string;
}

export interface HEEvaluationKey {
  type: 'switch' | 'bootstrap' | 'functional';
  keyData: Uint8Array;
  keyId: string;
  purpose: string;
}

// Encrypted Data Types
export interface HECiphertext {
  scheme: HEScheme;
  cipherData: Uint8Array;
  level: number; // Current level in modulus chain
  scale?: number; // For CKKS
  size: number; // Size of encrypted vector
  noiseLevel?: number; // Estimated noise
  keyId: string; // Public key used for encryption
  metadata?: HEMetadata;
}

export interface HEMetadata {
  dataType: 'integer' | 'float' | 'vector' | 'matrix' | 'boolean';
  shape?: number[]; // For multi-dimensional data
  encoding?: 'batch' | 'coefficient' | 'slot';
  precision?: number; // For CKKS
  overflow?: boolean; // Overflow detection
}

// Homomorphic Operations
export type HEOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'negate'
  | 'square'
  | 'exponentiate'
  | 'rotate'
  | 'conjugate'
  | 'bootstrap' // Noise reduction
  | 'compare' // Comparison operations
  | 'select'; // Conditional selection

export interface HEComputation {
  id: string;
  operations: HEOperationNode[];
  inputs: Map<string, HECiphertext>;
  output?: HECiphertext;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'computing' | 'completed' | 'failed';
  resourceUsage?: HEResourceUsage;
}

export interface HEOperationNode {
  id: string;
  operation: HEOperation;
  inputs: string[]; // IDs of input ciphertexts or previous operations
  parameters?: any; // Operation-specific parameters
  output?: string; // ID of output ciphertext
  depth: number; // Multiplicative depth
}

export interface HEResourceUsage {
  computeTimeMs: number;
  memoryUsageMB: number;
  multiplicativeDepth: number;
  bootstrapCount: number;
  ciphertextSize: number;
}

// Privacy-Preserving Inference
export interface PrivateInferenceConfig {
  enabled: boolean;
  scheme: HEScheme;
  model: PrivateModel;
  batchSize: number;
  precisionBits?: number; // For CKKS
  bootstrapping: boolean;
  optimizations: HEOptimization[];
}

export interface PrivateModel {
  id: string;
  type: 'linear' | 'polynomial' | 'neural-network' | 'decision-tree';
  encryptedWeights: HECiphertext[];
  architecture?: NeuralArchitecture; // For neural networks
  polynomialDegree?: number; // For polynomial models
  preprocessor?: DataPreprocessor;
}

export interface NeuralArchitecture {
  layers: NeuralLayer[];
  activations: ActivationType[];
  inputShape: number[];
  outputShape: number[];
}

export interface NeuralLayer {
  type: 'dense' | 'conv' | 'pooling';
  units?: number;
  kernelSize?: number[];
  stride?: number[];
  padding?: 'valid' | 'same';
}

export type ActivationType =
  | 'relu'
  | 'polynomial' // Polynomial approximation
  | 'sigmoid-approx'
  | 'tanh-approx'
  | 'square'
  | 'identity';

export interface DataPreprocessor {
  normalization?: {
    mean: number[];
    std: number[];
  };
  encoding?: 'one-hot' | 'ordinal' | 'binary';
  featureSelection?: number[]; // Indices of features to use
}

export type HEOptimization =
  | 'baby-step-giant-step' // For polynomial evaluation
  | 'hoisting' // For multiple rotations
  | 'lazy-reduction' // Delay modulus reduction
  | 'packed-encoding' // SIMD operations
  | 'circuit-privacy' // Hide circuit structure
  | 'noise-flooding'; // Additional privacy

// Private Information Retrieval (PIR)
export interface PIRConfig {
  enabled: boolean;
  scheme:
    | 'single-server'
    | 'multi-server'
    | 'computational'
    | 'information-theoretic';
  databaseSize: number;
  recordSize: number;
  servers?: PIRServer[]; // For multi-server PIR
}

export interface PIRServer {
  id: string;
  url: string;
  publicKey?: Uint8Array;
  trusted: boolean;
}

export interface PIRQuery {
  id: string;
  index: number; // Desired record index (encrypted)
  encryptedQuery: HECiphertext;
  timestamp: Date;
  clientId: string;
}

export interface PIRResponse {
  queryId: string;
  encryptedResult: HECiphertext;
  serverId: string;
  processingTimeMs: number;
}

// Private Set Intersection (PSI)
export interface PSIConfig {
  enabled: boolean;
  protocol: 'DH-PSI' | 'OT-PSI' | 'Circuit-PSI' | 'FHE-PSI';
  hashFunction: 'SHA256' | 'SHA3' | 'BLAKE3';
  maxSetSize: number;
  revealSize: boolean; // Reveal intersection size
}

export interface PSISession {
  id: string;
  parties: PSIParty[];
  protocol: string;
  startedAt: Date;
  status: 'setup' | 'exchanging' | 'computing' | 'completed';
  intersection?: Uint8Array[]; // Encrypted or hashed
  intersectionSize?: number;
}

export interface PSIParty {
  id: string;
  setSize: number;
  commitment: Uint8Array;
  ready: boolean;
}

// Secure Aggregation
export interface SecureAggregationConfig {
  enabled: boolean;
  protocol: 'masking' | 'threshold-he' | 'mpc-based';
  aggregationFunction: 'sum' | 'average' | 'weighted-sum' | 'histogram';
  threshold: number; // Minimum participants
  privacyBudget?: number; // For DP-enhanced aggregation
}

export interface AggregationSession {
  id: string;
  function: string;
  participants: string[];
  contributions: Map<string, HECiphertext>;
  result?: HECiphertext;
  startedAt: Date;
  completedAt?: Date;
  dropouts: string[];
}

// Memory Encryption for Agents
export interface EncryptedMemory {
  id: string;
  agentId: string;
  memoryType: 'episodic' | 'semantic' | 'procedural' | 'working';
  encryptedContent: HECiphertext;
  timestamp: Date;
  importance: HECiphertext; // Encrypted importance score
  tags?: HECiphertext[]; // Encrypted tags
  searchable: boolean; // Whether encrypted search is enabled
}

export interface EncryptedMemoryQuery {
  agentId: string;
  queryType: 'similarity' | 'keyword' | 'temporal' | 'importance';
  encryptedQuery: HECiphertext;
  limit?: number;
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface EncryptedMemoryResult {
  memories: EncryptedMemory[];
  scores?: HECiphertext[]; // Encrypted similarity scores
  totalCount: number;
}

// Performance Metrics
export interface HEPerformanceMetrics {
  encryptionTimeMs: number;
  decryptionTimeMs: number;
  operationTimes: Map<HEOperation, number>;
  ciphertextSizes: {
    fresh: number;
    afterOps: number;
    compressed?: number;
  };
  noiseGrowth: number[];
  bootstrapFrequency?: number;
  throughput: {
    encryptionsPerSec: number;
    operationsPerSec: number;
    decryptionsPerSec: number;
  };
}

// Homomorphic Encryption Service Interface
export interface HomomorphicEncryptionService {
  // Key Management
  generateKeys(params: HESecurityParams, scheme: HEScheme): Promise<HEKeySet>;
  importPublicKey(keyData: Uint8Array, scheme: HEScheme): Promise<HEPublicKey>;
  rotateKeys(oldKeyId: string): Promise<HEKeySet>;

  // Encryption/Decryption
  encrypt(
    data: number | number[],
    publicKey: HEPublicKey
  ): Promise<HECiphertext>;
  decrypt(
    ciphertext: HECiphertext,
    secretKey: HESecretKey
  ): Promise<number | number[]>;

  // Homomorphic Operations
  add(a: HECiphertext, b: HECiphertext): Promise<HECiphertext>;
  multiply(a: HECiphertext, b: HECiphertext): Promise<HECiphertext>;
  evaluate(computation: HEComputation): Promise<HECiphertext>;

  // Advanced Operations
  bootstrap(
    ciphertext: HECiphertext,
    bootstrapKey: HEEvaluationKey
  ): Promise<HECiphertext>;
  rotate(
    ciphertext: HECiphertext,
    steps: number,
    galoisKeys: HEGaloisKeys
  ): Promise<HECiphertext>;

  // Private Inference
  encryptModel(
    model: any,
    config: PrivateInferenceConfig
  ): Promise<PrivateModel>;
  privateInference(
    input: HECiphertext,
    model: PrivateModel
  ): Promise<HECiphertext>;

  // Memory Operations
  encryptMemory(memory: any, agentId: string): Promise<EncryptedMemory>;
  searchEncryptedMemories(
    query: EncryptedMemoryQuery
  ): Promise<EncryptedMemoryResult>;

  // PIR Operations
  createPIRQuery(index: number, config: PIRConfig): Promise<PIRQuery>;
  processPIRQuery(query: PIRQuery, database: any[]): Promise<PIRResponse>;
  extractPIRResult(response: PIRResponse, secretKey: HESecretKey): Promise<any>;

  // PSI Operations
  initiatePSI(set: any[], config: PSIConfig): Promise<PSISession>;
  contributeToPSI(sessionId: string, contribution: any): Promise<void>;
  computePSIResult(sessionId: string): Promise<any[]>;

  // Performance Monitoring
  getPerformanceMetrics(): Promise<HEPerformanceMetrics>;
  optimizeComputation(computation: HEComputation): Promise<HEComputation>;

  // Noise Management
  estimateNoise(ciphertext: HECiphertext): Promise<number>;
  requiresBootstrap(ciphertext: HECiphertext): Promise<boolean>;
}

// Configuration Interface
export interface HomomorphicEncryptionConfig {
  defaultScheme: HEScheme;
  securityLevel: HESecurityLevel;
  enabledFeatures: {
    privateInference: boolean;
    encryptedMemory: boolean;
    pir: boolean;
    psi: boolean;
    secureAggregation: boolean;
  };
  optimization: {
    autoBootstrap: boolean;
    lazyReduction: boolean;
    parallelization: boolean;
    gpuAcceleration?: boolean;
  };
  resourceLimits: {
    maxCiphertextSizeMB: number;
    maxComputeTimeMs: number;
    maxMemoryUsageMB: number;
  };
}

// Factory function type
export type HomomorphicEncryptionFactory = (
  config: HomomorphicEncryptionConfig
) => Promise<HomomorphicEncryptionService>;
