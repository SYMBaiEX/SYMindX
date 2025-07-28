# Portal Shared Utilities

This directory contains shared utilities that dramatically reduce code duplication across portal implementations and provide consistent behavior for common operations.

## Overview

The shared utilities refactor was designed to address massive code duplication across portal implementations. Previously, each portal had ~900-1000 lines of mostly identical code. With the shared utilities, portal implementations can be reduced to ~200-300 lines while maintaining full functionality.

## Architecture

The shared utilities are organized into focused modules:

- **`message-converter.ts`**: Standardized message conversion with provider-specific handling
- **`parameter-builder.ts`**: AI SDK parameter building with validation and defaults
- **`model-resolver.ts`**: Model selection with hierarchy and capability mapping
- **`error-handler.ts`**: Error handling, retry logic, and API key validation
- **`stream-handler.ts`**: Streaming logic with tool support and error handling
- **`finish-reason-mapper.ts`**: Finish reason mapping with provider-specific handling
- **`provider-factory.ts`**: Provider creation and configuration management
- **`index.ts`**: Centralized exports and portal toolkit factory

## Usage

### Basic Usage

```typescript
import { createPortalHelper } from '../shared';

export class MyPortal extends BasePortal {
  private helper = createPortalHelper('myProvider', config);
  
  async generateText(prompt: string, options?: TextGenerationOptions) {
    return this.helper.withRetry(async () => {
      const model = this.helper.resolveModel('chat', options?.model);
      const languageModel = this.helper.getLanguageModel(this.provider, model);
      
      const params = this.helper.buildTextParams({
        model: languageModel,
        prompt,
      }, options);
      
      const result = await generateText(params);
      
      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.helper.mapFinishReason(result.finishReason),
        metadata: { model, provider: 'myProvider' },
      };
    }, 'generateText', options?.model);
  }
}
```

### Advanced Usage

```typescript
import { 
  createPortalToolkit,
  PortalImplementationHelper,
  buildChatGenerationParams,
  createProvider,
} from '../shared';

// Create individual utilities
const toolkit = createPortalToolkit('openai', config);

// Or use the helper class
const helper = new PortalImplementationHelper('openai', config);

// Direct utility usage
const convertMessages = createMessageConverter('anthropic');
const buildParams = createParameterBuilder('groq');
const handleError = createErrorHandler('xai');
```

## Benefits

### Code Reduction
- **Before**: ~900-1000 lines per portal implementation
- **After**: ~200-300 lines per portal implementation
- **Reduction**: 70-75% less code

### Consistency
- Standardized error handling across all portals
- Consistent parameter validation and defaults
- Unified message conversion logic
- Shared model resolution strategies
- Consistent streaming implementations

### Maintainability
- Single source of truth for common logic
- Easier to add new providers
- Consistent behavior across all portals
- Better type safety through shared utilities
- Centralized bug fixes and improvements

### Features
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Handling**: Provider-specific error handling with proper error types
- **Model Resolution**: Intelligent model selection with fallbacks
- **Parameter Building**: Validation and defaults with provider-specific optimizations
- **Streaming**: Unified streaming with tool support and error recovery
- **Message Conversion**: Provider-specific message format handling

## Supported Providers

The shared utilities support all major AI providers:

- **OpenAI**: Complete support with all features
- **Anthropic**: Full support including computer use
- **Groq**: Fast inference with tool support
- **XAI/Grok**: Basic support with tool calling
- **Google/Gemini**: Multimodal and tool support
- **Mistral**: Chat and embedding support
- **Cohere**: Chat and embedding support

## Provider-Specific Features

### Message Conversion
- **OpenAI**: Multimodal support with multiple system messages
- **Anthropic**: Single system message with computer use support
- **Groq**: Tool calling with fast inference optimization
- **Google**: Single system message with multimodal support

### Parameter Building
- **OpenAI**: Full parameter support including frequency/presence penalties
- **Anthropic**: Basic parameters with computer use options
- **Groq**: Speed-optimized parameters
- **XAI**: Basic parameters with Grok-specific defaults

### Model Resolution
- **Intelligent Selection**: Different models for chat vs tool calling
- **Environment Variables**: Support for provider-specific env vars
- **Capability Mapping**: Models mapped to specific capabilities
- **Fallback Logic**: Graceful fallback to default models

### Error Handling
- **Provider-Specific**: Tailored error handling for each provider
- **Retry Logic**: Smart retry with exponential backoff
- **API Key Validation**: Provider-specific key format validation
- **Rate Limiting**: Automatic rate limit handling with retry-after

## Migration Guide

### Existing Portals

To migrate an existing portal to use shared utilities:

1. **Add helper**: Create a portal helper instance
```typescript
private helper = createPortalHelper('providerName', config);
```

2. **Replace message conversion**: Use shared message converter
```typescript
// Before
private convertToModelMessages(messages: ChatMessage[]): AIMessage[] { /* 50+ lines */ }

// After  
private convertToModelMessages(messages: ChatMessage[]): AIMessage[] {
  return this.helper.convertMessages(messages);
}
```

3. **Replace parameter building**: Use shared parameter builders
```typescript
// Before
const params = { ...baseParams };
if (options?.maxOutputTokens) params.maxOutputTokens = options.maxOutputTokens;
// ... 20+ lines of parameter building

// After
const params = this.helper.buildChatParams(baseParams, options);
```

4. **Add error handling**: Wrap operations with retry logic
```typescript
// Before
try {
  const result = await generateText(params);
  return result;
} catch (error) {
  throw new Error(`Generation failed: ${error}`);
}

// After
return this.helper.withRetry(async () => {
  const result = await generateText(params);
  return result;
}, 'generateText', model);
```

5. **Use shared model resolution**: Replace manual model selection
```typescript
// Before
const model = options?.model || config.model || 'default-model';

// After
const model = this.helper.resolveModel('chat', options?.model);
```

### New Portals

For new portal implementations:

1. **Extend BasePortal**: Start with the base portal class
2. **Create Helper**: Use `createPortalHelper()` for utilities
3. **Implement Required Methods**: Use shared utilities for implementation
4. **Add Provider Config**: Configure provider-specific options
5. **Test**: Use existing test patterns with shared utilities

## Examples

See the following examples:
- **Refactored OpenAI**: `/src/portals/openai/index.ts` (partially refactored)
- **Refactored Anthropic**: `/src/portals/anthropic/refactored-example.ts` (full example)

## API Reference

### Core Classes

#### `PortalImplementationHelper`
Main helper class providing all shared utilities.

```typescript
class PortalImplementationHelper {
  // Model operations
  resolveModel(type: string, explicit?: string): string
  getLanguageModel(provider: any, modelId: string): any
  
  // Parameter building
  buildTextParams(baseParams: any, options?: any): any
  buildChatParams(baseParams: any, options?: any): any
  
  // Message conversion
  convertMessages(messages: ChatMessage[]): AIMessage[]
  
  // Streaming
  createTextStream(model: any, params: any, options?: any): AsyncGenerator<string>
  createChatStream(model: any, params: any, options?: any): AsyncGenerator<string>
  
  // Error handling
  handleError(error: any, operation: string, model?: string): Error
  withRetry<T>(operation: () => Promise<T>, name: string, model?: string): Promise<T>
  
  // Utilities
  mapFinishReason(reason?: string): FinishReason
  createProvider(config: any, options?: any): any
}
```

### Factory Functions

#### `createPortalHelper(provider: string, config?: any)`
Creates a configured helper instance for a specific provider.

#### `createPortalToolkit(provider: string, config?: any)`
Creates individual utility functions configured for a provider.

### Individual Utilities

Each utility module can be used independently:

```typescript
import { 
  convertToAIMessages,
  buildChatGenerationParams,
  resolveModel,
  handleAISDKError,
  createTextStream,
  mapFinishReason,
  createProvider,
} from '../shared';
```

## Contributing

When adding new providers or extending functionality:

1. **Update Provider Configs**: Add provider-specific configurations
2. **Extend Model Mappings**: Add model support for new capabilities
3. **Add Error Handling**: Include provider-specific error patterns
4. **Update Tests**: Add test cases for new functionality
5. **Document Changes**: Update this README and inline documentation

## Testing

The shared utilities include comprehensive test coverage:

```bash
# Run shared utility tests
npm test src/portals/shared/

# Run portal integration tests
npm test src/portals/
```

## Performance

The shared utilities are designed for performance:
- **Caching**: Model resolution and parameter building are cached
- **Lazy Loading**: Provider instances created on demand
- **Batch Operations**: Optimized for batch processing
- **Memory Efficient**: Minimal memory overhead per portal instance

## Security

Security considerations:
- **API Key Validation**: Format validation for all providers
- **Input Sanitization**: Safe parameter building and validation
- **Error Sanitization**: Sensitive information filtered from error messages
- **Timeout Handling**: Prevents hanging operations

---

*This refactoring reduces portal implementation complexity by 70-75% while improving consistency, maintainability, and functionality across all AI provider integrations.*