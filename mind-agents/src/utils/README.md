# Configuration System Documentation

## Overview

The SYMindX configuration system provides robust, type-safe environment variable validation and configuration management. It uses a two-layer approach:

1. **Configuration Validator** (`config-validator.ts`) - Validates and sanitizes environment variables
2. **Configuration Resolver** (`config-resolver.ts`) - Transforms character configurations to runtime configurations

## Key Features

### ✅ Type Safety
- **exactOptionalPropertyTypes** compliance
- No `undefined` values in required configuration
- Strong typing throughout the system
- Comprehensive type validation

### 🛡️ Environment Variable Validation
- **API Key Format Validation**: Validates specific formats for each provider
- **Boolean Parsing**: Safe conversion of string values to boolean
- **Integer Validation**: Ensures positive values for numeric settings
- **URL Validation**: Validates Ollama base URL format
- **Conditional Inclusion**: Only includes defined values

### 🔧 Configuration Management
- **Safe Defaults**: Provides sensible defaults for all settings
- **Graceful Fallbacks**: Handles missing or invalid values
- **Environment-Specific**: Adapts to development/production environments
- **Comprehensive Logging**: Detailed error and warning messages

## Configuration Validator

### Core Validation Functions

```typescript
// Validate entire environment configuration
const result = ConfigValidator.validateEnvironmentConfig();

// Result structure
interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: ValidatedEnvironmentConfig;
}
```

### API Key Validation

The system validates API keys for specific formats:

```typescript
// OpenAI: Must start with 'sk-' and be >20 characters
OPENAI_API_KEY=sk-1234567890123456789012345678901234

// Anthropic: Must start with 'sk-ant-' and be >20 characters  
ANTHROPIC_API_KEY=sk-ant-1234567890123456789012345678901234

// Groq: Must start with 'gsk_' and be >20 characters
GROQ_API_KEY=gsk_1234567890123456789012345678901234

// Telegram: Must match format 'digits:token'
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
```

### Boolean Environment Variables

Safe boolean parsing with defaults:

```typescript
// Accepts: 'true', '1', 'false', '0', undefined
ENABLE_OPENAI_EMBEDDINGS=true
GROQ_ENABLED=1
OPENAI_CHAT_ENABLED=false
```

### Portal Configuration

Granular control over AI provider capabilities:

```typescript
// Main portal toggle
GROQ_ENABLED=true
OPENAI_ENABLED=true

// Capability-specific toggles
GROQ_CHAT_ENABLED=true
GROQ_EMBEDDING_ENABLED=false
OPENAI_CHAT_ENABLED=true
OPENAI_EMBEDDINGS_ENABLED=true
OPENAI_IMAGE_ENABLED=false

// Model-specific configuration
GROQ_CHAT_MODEL=llama-3.1-70b-versatile
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
```

## Configuration Resolver

### Character Configuration Integration

The resolver transforms character configurations into runtime configurations:

```typescript
// Usage
const resolver = new ConfigResolver();
const runtimeConfig = resolver.resolveCharacterConfig(characterConfig);

// Validation
const validation = resolver.validateEnvironment();
if (!validation.valid) {
  console.error('Configuration errors:', validation.missing);
}
```

### Memory Configuration

Automatic embedding configuration:

```typescript
// Memory config gets enhanced with environment settings
const memoryConfig = {
  type: 'sqlite',
  config: {
    database_path: './data/memories.db',
    // Auto-added from environment:
    enable_embeddings: 'true',
    embedding_provider: 'openai',
    embedding_model: 'text-embedding-3-large',
    embedding_dimensions: 3072
  }
};
```

### Portal Configuration

Dynamic portal enabling based on environment:

```typescript
// Portal automatically disabled if API key missing
const portalConfig = {
  name: 'openai',
  type: 'openai',
  enabled: false, // Auto-set based on OPENAI_API_KEY presence
  capabilities: ['chat_generation', 'embedding_generation'],
  config: {
    apiKey: process.env.OPENAI_API_KEY, // Only if valid
    chatModel: 'gpt-4.1-mini',
    embeddingModel: 'text-embedding-3-large'
  }
};
```

## Error Handling

### Validation Errors

Critical configuration errors that prevent startup:

```typescript
// Missing required providers
"At least one AI provider must be configured with valid API key"

// Invalid API configuration
"OpenAI API key required when using OpenAI embeddings"

// Invalid URL format
"Invalid Ollama base URL format"

// Invalid numeric values
"Embedding dimensions must be a positive number"
```

### Validation Warnings

Non-critical issues that allow startup but should be addressed:

```typescript
// Invalid API key format
"Invalid format for GROQ_API_KEY"

// Configuration mismatches
"Ollama embeddings enabled but Ollama is not configured"
```

## Best Practices

### Environment Variable Management

```bash
# Development (.env.local)
GROQ_API_KEY=gsk_your_development_key
OPENAI_API_KEY=sk-your_development_key
ENABLE_OPENAI_EMBEDDINGS=true
EMBEDDING_PROVIDER=openai
LOG_LEVEL=debug

# Production (.env.production)
GROQ_API_KEY=gsk_your_production_key
OPENAI_API_KEY=sk-your_production_key
ENABLE_OPENAI_EMBEDDINGS=true
EMBEDDING_PROVIDER=openai
LOG_LEVEL=error
```

### Configuration Validation

```typescript
// Always validate before using configuration
const validation = configResolver.validateEnvironment();
if (!validation.valid) {
  console.error('Configuration errors:', validation.missing);
  process.exit(1);
}

// Log warnings for non-critical issues
if (validation.warnings?.length > 0) {
  console.warn('Configuration warnings:', validation.warnings);
}
```

### Testing Configuration

```typescript
// Unit tests should save/restore environment
let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  // Set test environment variables
  process.env.GROQ_API_KEY = 'gsk_test_key_1234567890123456789012345678901234';
});

afterEach(() => {
  process.env = originalEnv;
});
```

## Security Considerations

### API Key Protection

- **Never commit API keys** to version control
- **Use environment variables** for all sensitive data
- **Validate API key formats** to prevent injection attacks
- **Log validation errors** without exposing key values

### Configuration Sanitization

- **Input validation** on all environment variables
- **Type safety** prevents runtime errors
- **Safe defaults** for all configuration options
- **Graceful degradation** when optional services are unavailable

## Troubleshooting

### Common Issues

1. **"At least one AI provider must be configured"**
   - Ensure at least one valid API key is provided
   - Check API key format validation
   - Verify portal enabled flags

2. **"Invalid format for [PROVIDER]_API_KEY"**
   - Check API key format requirements
   - Ensure key is not truncated or corrupted
   - Verify key is for the correct provider

3. **TypeScript exactOptionalPropertyTypes errors**
   - All environment variables are now safely handled
   - No undefined values in required configuration
   - Type-safe throughout the system

### Debugging Configuration

```typescript
// Enable detailed logging
const result = ConfigValidator.validateEnvironmentConfig();
console.log('Validation result:', result);

// Check specific configuration
const resolver = new ConfigResolver();
const envConfig = resolver.ensureEnvConfig(); // Private method - use validateEnvironment()
console.log('Environment config:', envConfig);
```

## Migration Guide

### From Previous Configuration System

The new system is backward compatible but provides enhanced validation:

```typescript
// Old approach (still works)
const envConfig = configResolver.ensureEnvConfig();

// New approach (recommended)
const validation = configResolver.validateEnvironment();
if (!validation.valid) {
  throw new Error('Configuration validation failed');
}
```

### Configuration File Updates

No changes needed to existing character configuration files. The system automatically:

- Validates environment variables
- Provides safe defaults
- Handles missing or invalid values
- Logs warnings for configuration issues

## Performance Considerations

### Lazy Loading
- Configuration validation occurs only when needed
- Cached results for subsequent calls
- Minimal performance impact

### Memory Usage
- Efficient validation algorithms
- Shared configuration instances
- Garbage collection friendly

### Startup Time
- Fast validation process
- Parallel validation where possible
- Early error detection prevents wasted startup time

---

*Configuration System v2.0 | Type-safe, secure, and robust*