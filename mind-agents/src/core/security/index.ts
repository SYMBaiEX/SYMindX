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

// Types
export type { JWTPayload, TokenPair, JWTConfig } from './auth/jwt-manager';
export type { Session, SessionConfig } from './auth/session-manager';
export type { AuthMiddlewareConfig, ApiKeyData } from './middleware/auth-middleware';
export type { ValidationConfig, ValidationRule } from './middleware/input-validation';
export type { SecureErrorConfig, SecureError } from './middleware/secure-error-handler';
export type { WebSocketSecurityConfig, SecureWebSocketConnection } from './websocket/websocket-auth';
export type { SecretConfig, EncryptedSecret } from './secrets-manager';