/**
 * @fileoverview Context Serialization Types for SYMindX
 * @description Comprehensive type definitions for context serialization, compression,
 * versioning, and migration systems. Supports multiple formats and algorithms
 * optimized for network transmission and storage.
 * 
 * @version 1.0.0
 * @author SYMindX Core Team
 */

import type { UnifiedContext, ContextMetadata } from './unified-context.js';
import type { Timestamp } from '../helpers.js';

/**
 * Supported serialization formats
 */
export enum SerializationFormat {
  /** Human-readable JSON format */
  JSON = 'json',
  /** Compact binary format */
  BINARY = 'binary',
  /** Efficient MessagePack format */
  MESSAGEPACK = 'messagepack',
  /** Schema-based Protocol Buffers */
  PROTOBUF = 'protobuf',
  /** Custom compressed format */
  CUSTOM = 'custom'
}

/**
 * Compression levels for size optimization
 */
export enum CompressionLevel {
  /** No compression - fastest */
  NONE = 0,
  /** Fast compression with moderate size reduction */
  FAST = 1,
  /** Balanced compression and speed */
  BALANCED = 5,
  /** Maximum compression - slowest */
  MAXIMUM = 9
}

/**
 * Compression algorithms supported
 */
export enum CompressionAlgorithm {
  /** No compression */
  NONE = 'none',
  /** Fast GZIP compression */
  GZIP = 'gzip',
  /** High compression ratio BROTLI */
  BROTLI = 'brotli',
  /** Ultra-fast LZ4 compression */
  LZ4 = 'lz4',
  /** Balanced ZSTD compression */
  ZSTD = 'zstd',
  /** Custom algorithm */
  CUSTOM = 'custom'
}

/**
 * Serialization error types
 */
export enum SerializationErrorType {
  /** Invalid input data */
  INVALID_INPUT = 'invalid_input',
  /** Unsupported format */
  UNSUPPORTED_FORMAT = 'unsupported_format',
  /** Compression failure */
  COMPRESSION_ERROR = 'compression_error',
  /** Decompression failure */
  DECOMPRESSION_ERROR = 'decompression_error',
  /** Version mismatch */
  VERSION_MISMATCH = 'version_mismatch',
  /** Schema validation error */
  SCHEMA_ERROR = 'schema_error',
  /** Size limit exceeded */
  SIZE_LIMIT_EXCEEDED = 'size_limit_exceeded',
  /** Hash verification failed */
  HASH_MISMATCH = 'hash_mismatch'
}

/**
 * Serialization configuration interface
 */
export interface SerializationConfig {
  /** Target serialization format */
  format: SerializationFormat;
  /** Compression algorithm to use */
  compression: CompressionAlgorithm;
  /** Compression level (0-9) */
  compressionLevel: CompressionLevel;
  /** Include metadata in serialization */
  includeMetadata: boolean;
  /** Validate data integrity */
  validateIntegrity: boolean;
  /** Enable version compatibility checks */
  versionCheck: boolean;
  /** Maximum serialized size in bytes */
  maxSize?: number;
  /** Custom serialization options */
  options?: Record<string, unknown>;
}

/**
 * Serialized context representation
 */
export interface SerializedContext {
  /** Unique identifier for this serialized context */
  readonly id: string;
  /** Serialization format used */
  readonly format: SerializationFormat;
  /** Compression algorithm applied */
  readonly compression: CompressionAlgorithm;
  /** Compression level used */
  readonly compressionLevel: CompressionLevel;
  /** Schema version for compatibility */
  readonly version: string;
  /** Serialized data payload */
  readonly data: Uint8Array | string;
  /** Original context metadata */
  readonly metadata: ContextMetadata;
  /** Data integrity hash */
  readonly hash: string;
  /** Original size before compression */
  readonly originalSize: number;
  /** Compressed size */
  readonly compressedSize: number;
  /** Compression ratio achieved */
  readonly compressionRatio: number;
  /** Serialization timestamp */
  readonly serializedAt: Timestamp;
  /** Expiration timestamp */
  readonly expiresAt?: Timestamp;
  /** Custom serialization metadata */
  readonly customMetadata?: Record<string, unknown>;
}

/**
 * Compressed context representation
 */
export interface CompressedContext {
  /** Compression algorithm used */
  algorithm: CompressionAlgorithm;
  /** Compression level applied */
  level: CompressionLevel;
  /** Compressed data */
  data: Uint8Array;
  /** Original size before compression */
  originalSize: number;
  /** Compressed size */
  compressedSize: number;
  /** Compression ratio */
  ratio: number;
  /** Compression timestamp */
  compressedAt: Timestamp;
  /** Checksum for integrity verification */
  checksum: string;
}

/**
 * Context serialization metrics
 */
export interface SerializationMetrics {
  /** Total serialization time in milliseconds */
  serializationTime: number;
  /** Compression time in milliseconds */
  compressionTime: number;
  /** Deserialization time in milliseconds */
  deserializationTime: number;
  /** Decompression time in milliseconds */
  decompressionTime: number;
  /** Memory usage during serialization */
  memoryUsage: number;
  /** Size reduction percentage */
  sizeReduction: number;
  /** Throughput in bytes per second */
  throughput: number;
}

/**
 * Serialization validation result
 */
export interface SerializationValidation {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Schema version compatibility */
  schemaCompatible: boolean;
  /** Data integrity check result */
  integrityValid: boolean;
  /** Validation timestamp */
  validatedAt: Timestamp;
}

/**
 * Context migration information
 */
export interface ContextMigration {
  /** Source version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Migration steps applied */
  steps: string[];
  /** Migration timestamp */
  migratedAt: Timestamp;
  /** Whether migration was successful */
  success: boolean;
  /** Migration errors */
  errors?: string[];
  /** Backup of original data */
  backup?: SerializedContext;
}

/**
 * Context fingerprint for change detection
 */
export interface ContextFingerprint {
  /** Hash of context content */
  contentHash: string;
  /** Hash of context structure */
  structureHash: string;
  /** Combined fingerprint */
  fingerprint: string;
  /** Algorithm used for hashing */
  algorithm: string;
  /** Timestamp when fingerprint was created */
  createdAt: Timestamp;
  /** Size of content */
  size: number;
}

/**
 * Serialization benchmark result
 */
export interface SerializationBenchmark {
  /** Format tested */
  format: SerializationFormat;
  /** Compression algorithm tested */
  compression: CompressionAlgorithm;
  /** Compression level tested */
  level: CompressionLevel;
  /** Average serialization time */
  avgSerializationTime: number;
  /** Average deserialization time */
  avgDeserializationTime: number;
  /** Average compression ratio */
  avgCompressionRatio: number;
  /** Memory usage */
  memoryUsage: number;
  /** Throughput */
  throughput: number;
  /** Error rate */
  errorRate: number;
  /** Test iterations */
  iterations: number;
  /** Benchmark timestamp */
  benchmarkedAt: Timestamp;
}

/**
 * Context serializer interface
 */
export interface ContextSerializer {
  /** Serializer identifier */
  readonly id: string;
  /** Supported format */
  readonly format: SerializationFormat;
  /** Supported compression algorithms */
  readonly supportedCompression: CompressionAlgorithm[];

  /**
   * Serialize a unified context
   */
  serialize(
    context: UnifiedContext,
    config?: Partial<SerializationConfig>
  ): Promise<SerializedContext>;

  /**
   * Deserialize a serialized context
   */
  deserialize(
    serialized: SerializedContext,
    config?: Partial<SerializationConfig>
  ): Promise<UnifiedContext>;

  /**
   * Validate serialized context
   */
  validate(serialized: SerializedContext): Promise<SerializationValidation>;

  /**
   * Get serialization metrics
   */
  getMetrics(): SerializationMetrics;

  /**
   * Check format compatibility
   */
  isCompatible(version: string): boolean;
}

/**
 * Context compressor interface
 */
export interface ContextCompressor {
  /** Compressor identifier */
  readonly id: string;
  /** Supported algorithm */
  readonly algorithm: CompressionAlgorithm;
  /** Supported levels */
  readonly supportedLevels: CompressionLevel[];

  /**
   * Compress data
   */
  compress(
    data: Uint8Array,
    level?: CompressionLevel
  ): Promise<CompressedContext>;

  /**
   * Decompress data
   */
  decompress(compressed: CompressedContext): Promise<Uint8Array>;

  /**
   * Estimate compression ratio
   */
  estimateRatio(data: Uint8Array, level: CompressionLevel): number;

  /**
   * Validate compressed data
   */
  validate(compressed: CompressedContext): boolean;
}

/**
 * Context hasher interface
 */
export interface ContextHasher {
  /** Hasher identifier */
  readonly id: string;
  /** Hash algorithm used */
  readonly algorithm: string;

  /**
   * Generate context fingerprint
   */
  generateFingerprint(context: UnifiedContext): Promise<ContextFingerprint>;

  /**
   * Generate content hash
   */
  hashContent(data: Uint8Array): string;

  /**
   * Verify hash integrity
   */
  verifyHash(data: Uint8Array, hash: string): boolean;

  /**
   * Compare fingerprints
   */
  compareFingerprints(
    fp1: ContextFingerprint,
    fp2: ContextFingerprint
  ): boolean;
}

/**
 * Context validator interface
 */
export interface ContextValidator {
  /** Validator identifier */
  readonly id: string;
  /** Supported schema versions */
  readonly supportedVersions: string[];

  /**
   * Validate context structure
   */
  validateStructure(context: UnifiedContext): Promise<SerializationValidation>;

  /**
   * Validate serialized context
   */
  validateSerialized(
    serialized: SerializedContext
  ): Promise<SerializationValidation>;

  /**
   * Check version compatibility
   */
  checkVersionCompatibility(
    sourceVersion: string,
    targetVersion: string
  ): boolean;

  /**
   * Get validation schema
   */
  getSchema(version: string): Record<string, unknown>;
}

/**
 * Context migrator interface
 */
export interface ContextMigrator {
  /** Migrator identifier */
  readonly id: string;
  /** Supported migration paths */
  readonly supportedMigrations: Array<{
    from: string;
    to: string;
  }>;

  /**
   * Migrate context to newer version
   */
  migrate(
    context: SerializedContext,
    targetVersion: string
  ): Promise<ContextMigration>;

  /**
   * Check if migration is needed
   */
  needsMigration(currentVersion: string, targetVersion: string): boolean;

  /**
   * Get migration path
   */
  getMigrationPath(
    fromVersion: string,
    toVersion: string
  ): string[] | null;

  /**
   * Rollback migration
   */
  rollback(migration: ContextMigration): Promise<SerializedContext>;
}

/**
 * Serialization error class
 */
export class SerializationError extends Error {
  constructor(
    public readonly type: SerializationErrorType,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SerializationError';
  }
}

/**
 * Default serialization configuration
 */
export const DEFAULT_SERIALIZATION_CONFIG: SerializationConfig = {
  format: SerializationFormat.JSON,
  compression: CompressionAlgorithm.GZIP,
  compressionLevel: CompressionLevel.BALANCED,
  includeMetadata: true,
  validateIntegrity: true,
  versionCheck: true,
  maxSize: 10 * 1024 * 1024, // 10MB
};

/**
 * Serialization format capabilities
 */
export const SERIALIZATION_CAPABILITIES = {
  [SerializationFormat.JSON]: {
    humanReadable: true,
    schemaValidation: true,
    streamingSupport: false,
    maxSize: 100 * 1024 * 1024, // 100MB
    compression: [
      CompressionAlgorithm.NONE,
      CompressionAlgorithm.GZIP,
      CompressionAlgorithm.BROTLI
    ]
  },
  [SerializationFormat.BINARY]: {
    humanReadable: false,
    schemaValidation: false,
    streamingSupport: true,
    maxSize: 1024 * 1024 * 1024, // 1GB
    compression: [
      CompressionAlgorithm.NONE,
      CompressionAlgorithm.LZ4,
      CompressionAlgorithm.ZSTD
    ]
  },
  [SerializationFormat.MESSAGEPACK]: {
    humanReadable: false,
    schemaValidation: true,
    streamingSupport: true,
    maxSize: 500 * 1024 * 1024, // 500MB
    compression: [
      CompressionAlgorithm.NONE,
      CompressionAlgorithm.GZIP,
      CompressionAlgorithm.ZSTD
    ]
  },
  [SerializationFormat.PROTOBUF]: {
    humanReadable: false,
    schemaValidation: true,
    streamingSupport: true,
    maxSize: 2 * 1024 * 1024 * 1024, // 2GB
    compression: [
      CompressionAlgorithm.NONE,
      CompressionAlgorithm.GZIP,
      CompressionAlgorithm.BROTLI,
      CompressionAlgorithm.ZSTD
    ]
  }
} as const;

/**
 * Type guards for serialization types
 */
export namespace SerializationTypeGuards {
  /**
   * Type guard for SerializedContext
   */
  export function isSerializedContext(obj: unknown): obj is SerializedContext {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'format' in obj &&
      'compression' in obj &&
      'data' in obj &&
      'metadata' in obj &&
      'hash' in obj
    );
  }

  /**
   * Type guard for CompressedContext
   */
  export function isCompressedContext(obj: unknown): obj is CompressedContext {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'algorithm' in obj &&
      'level' in obj &&
      'data' in obj &&
      'originalSize' in obj &&
      'compressedSize' in obj
    );
  }

  /**
   * Type guard for ContextFingerprint
   */
  export function isContextFingerprint(obj: unknown): obj is ContextFingerprint {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'contentHash' in obj &&
      'structureHash' in obj &&
      'fingerprint' in obj &&
      'algorithm' in obj
    );
  }
}