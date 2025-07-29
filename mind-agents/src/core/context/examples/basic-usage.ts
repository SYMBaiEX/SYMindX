/**
 * Basic Usage Examples for Context Injection Framework
 * 
 * This file demonstrates common usage patterns and serves as a reference
 * for developers implementing context injection in their components.
 */

import {
  createContextInjector,
  createScope,
  contextUtils,
  ContextScopeType
} from '../index';
import type {
  ContextProvider,
  ContextMiddleware,
  ContextEnricher,
  ContextScope
} from '../../../types/context/context-injection';

/**
 * Example 1: Basic Context Injection
 */
export async function basicContextInjectionExample() {
  console.log('=== Basic Context Injection Example ===');

  // Create a context injector
  const injector = await createContextInjector();

  // Create a simple context provider
  const configProvider: ContextProvider<{ apiUrl: string; timeout: number }> = {
    id: 'example-config-provider',
    priority: 80,
    supportsAsync: false,

    provide(scope: ContextScope) {
      if (scope.type === ContextScopeType.Module && scope.target === 'example-module') {
        return {
          apiUrl: 'https://api.example.com',
          timeout: 5000
        };
      }
      return undefined;
    },

    canProvide(scope: ContextScope) {
      return scope.type === ContextScopeType.Module && scope.target === 'example-module';
    }
  };

  // Register the provider
  const registerResult = injector.registerProvider(configProvider);
  console.log('Provider registered:', registerResult.success);

  // Create a context scope
  const scope = createScope(ContextScopeType.Module, 'example-module', {
    agentId: 'example-agent',
    correlationId: 'example-request-123'
  });

  // Inject context
  const result = await injector.inject(scope);
  console.log('Injection successful:', result.success);
  console.log('Context data:', result.context);
  console.log('Providers used:', result.providers);
  console.log('Injection time:', result.metrics.totalTime + 'ms');
}

/**
 * Example 2: Context Middleware
 */
export async function middlewareExample() {
  console.log('\n=== Context Middleware Example ===');

  const injector = await createContextInjector();

  // Create a provider
  const dataProvider: ContextProvider<{ data: string; sensitive: string }> = {
    id: 'data-provider',
    priority: 80,
    supportsAsync: false,

    provide() {
      return {
        data: 'public-data',
        sensitive: 'secret-value'
      };
    },

    canProvide() {
      return true;
    }
  };

  // Create sanitization middleware
  const sanitizationMiddleware: ContextMiddleware<any, any> = {
    id: 'sanitization-middleware',
    priority: 100, // High priority - runs first

    async transform(context: any, scope: ContextScope, next: Function) {
      console.log('Sanitizing context...');
      
      // Remove sensitive data
      const sanitized = { ...context };
      if ('sensitive' in sanitized) {
        sanitized.sensitive = '[REDACTED]';
      }

      // Add security metadata
      sanitized._security = {
        sanitized: true,
        sanitizedAt: new Date()
      };

      return next(sanitized);
    },

    shouldProcess() {
      return true;
    }
  };

  // Register components
  injector.registerProvider(dataProvider);
  injector.registerMiddleware(sanitizationMiddleware);

  // Inject context
  const scope = createScope(ContextScopeType.Module, 'secure-module');
  const result = await injector.inject(scope);
  
  console.log('Context after sanitization:', result.context);
  console.log('Middleware applied:', result.middleware);
}

/**
 * Example 3: Context Enrichment
 */
export async function enrichmentExample() {
  console.log('\n=== Context Enrichment Example ===');

  const injector = await createContextInjector();

  // Basic provider
  const basicProvider: ContextProvider<{ name: string }> = {
    id: 'basic-provider',
    priority: 80,
    supportsAsync: false,

    provide() {
      return { name: 'example-component' };
    },

    canProvide() {
      return true;
    }
  };

  // Metadata enricher
  const metadataEnricher: ContextEnricher<any> = {
    id: 'metadata-enricher',
    priority: 70,

    async enrich(context: any, scope: ContextScope) {
      console.log('Enriching context with metadata...');
      
      return {
        ...context,
        metadata: {
          enrichedAt: new Date(),
          enrichedBy: this.id,
          scope: {
            type: scope.type,
            target: scope.target
          },
          version: '1.0.0'
        },
        computed: {
          displayName: `${context.name} (${scope.target})`,
          hash: Math.random().toString(36).substring(7)
        }
      };
    },

    shouldEnrich() {
      return true;
    }
  };

  // Register components
  injector.registerProvider(basicProvider);
  injector.registerEnricher(metadataEnricher);

  // Inject context
  const scope = createScope(ContextScopeType.Extension, 'example-extension');
  const result = await injector.inject(scope);
  
  console.log('Enriched context:', JSON.stringify(result.context, null, 2));
  console.log('Enrichers applied:', result.enrichers);
}

/**
 * Example 4: Async Context Providers
 */
export async function asyncProviderExample() {
  console.log('\n=== Async Context Provider Example ===');

  const injector = await createContextInjector({
    enableAsync: true,
    asyncTimeout: 2000 // 2 second timeout
  });

  // Async database config provider
  const databaseConfigProvider: ContextProvider<{ connectionString: string; poolSize: number }> = {
    id: 'database-config-provider',
    priority: 90,
    supportsAsync: true,

    provide() {
      // Sync version returns undefined - use async version
      return undefined;
    },

    async provideAsync(scope: ContextScope) {
      console.log('Loading database config asynchronously...');
      
      // Simulate database lookup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        connectionString: `postgresql://localhost/${scope.target}_db`,
        poolSize: 10
      };
    },

    canProvide(scope: ContextScope) {
      return scope.type === ContextScopeType.Service;
    }
  };

  // Register provider
  injector.registerProvider(databaseConfigProvider);

  // Inject context
  const scope = createScope(ContextScopeType.Service, 'user-service');
  const result = await injector.inject(scope);
  
  console.log('Async context loaded:', result.context);
  console.log('Provider time:', result.metrics.providerTime + 'ms');
}

/**
 * Example 5: Context-Aware Objects
 */
export async function contextAwareObjectExample() {
  console.log('\n=== Context-Aware Objects Example ===');

  // Create a simple service object
  class UserService {
    getUsers() {
      return ['user1', 'user2', 'user3'];
    }

    createUser(name: string) {
      return { id: Date.now(), name };
    }
  }

  // Create context
  const context = {
    config: {
      apiUrl: 'https://api.example.com',
      timeout: 5000
    },
    database: {
      connectionString: 'postgresql://localhost/users',
      poolSize: 10
    },
    metrics: {
      requestCount: 0,
      errorCount: 0
    }
  };

  const scope = createScope(ContextScopeType.Service, 'user-service');
  
  // Wrap service with context
  const userService = new UserService();
  const contextualUserService = contextUtils.withContext(userService, context, scope);

  // Use the service
  console.log('Users:', contextualUserService.getUsers());
  console.log('Context config:', contextualUserService.context.config);
  console.log('Database config:', contextualUserService.context.database);

  // Update context
  await contextualUserService.updateContext({
    metrics: {
      requestCount: 1,
      errorCount: 0
    }
  });

  console.log('Updated metrics:', contextualUserService.getContextValue('metrics'));
}

/**
 * Example 6: Multiple Providers with Priority
 */
export async function providerPriorityExample() {
  console.log('\n=== Provider Priority Example ===');

  const injector = await createContextInjector();

  // Low priority provider (default config)
  const defaultConfigProvider: ContextProvider<{ theme: string; lang: string }> = {
    id: 'default-config',
    priority: 50, // Lower priority

    provide() {
      return {
        theme: 'light',
        lang: 'en'
      };
    },

    canProvide() {
      return true;
    },

    supportsAsync: false
  };

  // High priority provider (user config)
  const userConfigProvider: ContextProvider<{ theme: string }> = {
    id: 'user-config',
    priority: 90, // Higher priority

    provide() {
      return {
        theme: 'dark' // Should override default
      };
    },

    canProvide() {
      return true;
    },

    supportsAsync: false
  };

  // Register providers (order doesn't matter - priority determines execution order)
  injector.registerProvider(defaultConfigProvider);
  injector.registerProvider(userConfigProvider);

  // Inject context
  const scope = createScope(ContextScopeType.Global, 'app');
  const result = await injector.inject(scope);
  
  console.log('Final context (theme should be "dark"):', result.context);
  console.log('Provider execution order:', result.providers);
}

/**
 * Example 7: Context Validation
 */
export async function contextValidationExample() {
  console.log('\n=== Context Validation Example ===');

  const injector = await createContextInjector({
    enableValidation: true
  });

  // Provider that returns invalid data
  const invalidDataProvider: ContextProvider<any> = {
    id: 'invalid-data-provider',
    priority: 80,
    supportsAsync: false,

    provide() {
      return {
        requiredField: undefined, // Invalid - should be present
        numericField: 'not-a-number', // Invalid - should be numeric
        email: 'invalid-email' // Invalid - should be valid email
      };
    },

    canProvide() {
      return true;
    }
  };

  // Validation middleware
  const validationMiddleware: ContextMiddleware<any, any> = {
    id: 'validation-middleware',
    priority: 100,

    async transform(context: any, scope: ContextScope, next: Function) {
      console.log('Validating context...');
      
      const errors: string[] = [];

      if (!context.requiredField) {
        errors.push('requiredField is missing');
      }

      if (context.numericField && isNaN(Number(context.numericField))) {
        errors.push('numericField must be numeric');
      }

      if (context.email && !context.email.includes('@')) {
        errors.push('email must be valid');
      }

      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      return next(context);
    },

    shouldProcess() {
      return true;
    }
  };

  // Register components
  injector.registerProvider(invalidDataProvider);
  injector.registerMiddleware(validationMiddleware);

  // Inject context (should fail validation)
  const scope = createScope(ContextScopeType.Module, 'validated-module');
  const result = await injector.inject(scope);
  
  console.log('Injection result:', result.success);
  console.log('Validation errors:', result.errors?.map(e => e.message));
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await basicContextInjectionExample();
    await middlewareExample();
    await enrichmentExample();
    await asyncProviderExample();
    await contextAwareObjectExample();
    await providerPriorityExample();
    await contextValidationExample();
    
    console.log('\n🎉 All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}