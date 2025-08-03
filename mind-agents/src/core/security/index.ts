/**
 * Security Module Index
 * Exports all security-related components
 */

export { ConfigManager, configManager, type SecurityConfig } from './config-manager';
export { JWTAuth, jwtAuth, type JWTPayload, type AuthResult } from './jwt-auth';
export { InputValidator, inputValidator, type ValidationRule, type ValidationResult } from './input-validator';
export { HTTPSServer, httpsServer, type TLSConfig, type ServerOptions } from './https-server';

// Re-export existing security components
export * from './auth/jwt-manager';
export * from './auth/session-manager';
export * from './middleware/auth-middleware';
export * from './middleware/input-validation';
export * from './middleware/secure-error-handler';