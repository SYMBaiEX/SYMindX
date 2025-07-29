# Portal Migration Guide: Legacy to Enhanced AI SDK v5

## 🎯 Migration Overview

This guide provides step-by-step instructions for migrating from legacy portal implementations to the enhanced AI SDK v5 streaming patterns across all 15+ SYMindX portals.

## 📋 Pre-Migration Checklist

### Environment Preparation

- [ ] **Backup current configurations** - Save all existing portal configurations
- [ ] **Update dependencies** - Ensure AI SDK v5 compatibility
- [ ] **Test environment setup** - Prepare isolated testing environment
- [ ] **Performance baseline** - Record current performance metrics
- [ ] **API key validation** - Verify all provider API keys are valid

### Dependencies Update

```bash
# Update to AI SDK v5 compatible versions
npm install ai@latest
npm install @ai-sdk/openai@latest
npm install @ai-sdk/anthropic@latest
npm install @ai-sdk/google@latest
npm install @ai-sdk/mistral@latest
npm install @ai-sdk/cohere@latest
```

### Configuration Backup

```bash
# Backup current portal configurations
cp -r src/portals src/portals.backup
cp -r src/core/config src/core/config.backup
```

## 🚀 Migration Phases

### Phase 1: Foundation Setup (Week 1)

#### 1.1 Deploy Shared Enhancement Utilities

```bash
# Copy enhanced utilities to shared directory
mkdir -p src/portals/shared
cp enhanced-utilities/* src/portals/shared/
```

#### 1.2 Update Import Statements

```typescript
// Update imports in your codebase
import { 
  StreamBuffer, 
  AdvancedStreamManager,
  globalStreamManager 
} from '../shared/advanced-streaming.js';

import { 
  ToolChainOrchestrator,
  createChainableTool 
} from '../shared/tool-orchestration.js';

import { 
  AdaptiveModelSelector,
  createRequestContext 
} from '../shared/adaptive-model-selection.js';

import { 
  ConnectionPool,
  IntelligentCache,
  globalCache 
} from '../shared/performance-optimization.js';
```

#### 1.3 Test Shared Utilities

```typescript
// Test shared utilities independently
import { globalStreamManager } from './shared/advanced-streaming.js';
import { globalCache } from './shared/performance-optimization.js';

// Verify utilities are working
console.log('Stream manager status:', globalStreamManager.getStats());
console.log('Cache status:', globalCache.getStats());
```

### Phase 2: Portal-by-Portal Migration (Weeks 2-4)

#### 2.1 OpenAI Portal Migration

**Priority**: High (Primary portal)

```typescript
// Before: Legacy OpenAI Portal
import { OpenAIPortal } from './portals/openai/index.js';

const portal = new OpenAIPortal({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7,
});

// After: Enhanced OpenAI Portal
import { 
  EnhancedOpenAIPortal, 
  defaultEnhancedOpenAIConfig 
} from './portals/openai/enhanced-index.js';

const portal = new EnhancedOpenAIPortal({
  ...defaultEnhancedOpenAIConfig,
  apiKey: process.env.OPENAI_API_KEY,
  
  // Enable features gradually
  enableAdvancedStreaming: true,      // Phase 2
  enableToolOrchestration: false,     // Phase 3
  enableAdaptiveModelSelection: false, // Phase 3
  enablePerformanceOptimization: true, // Phase 2
});
```

**Testing Steps**:
```bash
# Test enhanced OpenAI portal
npm test -- --testPathPattern="openai.*enhanced"

# Performance comparison
npm run benchmark -- --portal=openai --type=enhanced
```

#### 2.2 Anthropic Portal Migration

**Priority**: High (Secondary portal)

```typescript
// Enhanced Anthropic implementation
import { EnhancedAnthropicPortal } from './portals/anthropic/enhanced-index.js';

const portal = new EnhancedAnthropicPortal({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  
  // Anthropic-specific optimizations
  enableAdvancedStreaming: true,
  streamingBufferSize: 15,          // Larger buffer for Claude
  streamingThrottleRate: 75,        // Higher rate for Claude
  
  enablePerformanceOptimization: true,
  cacheMaxSize: 100 * 1024 * 1024,  // 100MB cache
});
```

#### 2.3 Google Portal Migration

**Priority**: Medium

```typescript
// Enhanced Google Gemini implementation
import { EnhancedGooglePortal } from './portals/google-generative/enhanced-index.js';

const portal = new EnhancedGooglePortal({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  model: 'gemini-1.5-pro',
  
  // Google-specific features
  enableAdvancedStreaming: true,
  enableAdaptiveModelSelection: true, // Strong multimodal support
  
  // Model capabilities registration
  registerGeminiModels: true,
});
```

#### 2.4 Remaining Portals (Weeks 3-4)

**Migration Order**:
1. **Groq** - Fast inference provider
2. **Mistral** - European AI provider
3. **Cohere** - Enterprise features
4. **Perplexity** - Search-augmented
5. **Azure OpenAI** - Enterprise deployment
6. **XAI** - Alternative provider
7. **Ollama** - Local deployment
8. **Vertex AI** - Google Cloud
9. **LM Studio** - Local development
10. **Multimodal** - Vision/audio support

### Phase 3: Advanced Features (Week 5)

#### 3.1 Enable Tool Orchestration

```typescript
// Enable tool orchestration across all portals
const enhancedConfig = {
  ...baseConfig,
  
  // Tool orchestration features
  enableToolOrchestration: true,
  maxToolChainLength: 5,
  toolExecutionTimeout: 30000,
  
  // Resilient tool execution
  enableResilientExecution: true,
  toolRetryAttempts: 3,
  toolRetryDelay: 1000,
};
```

#### 3.2 Enable Adaptive Model Selection

```typescript
// Configure adaptive model selection
const adaptiveConfig = {
  ...enhancedConfig,
  
  // Adaptive model selection
  enableAdaptiveModelSelection: true,
  performanceWeight: 0.4,
  costWeight: 0.3,
  qualityWeight: 0.3,
  
  // Fallback configuration
  fallbackChainLength: 3,
  minSampleSize: 10,
};
```

#### 3.3 Advanced Performance Optimization

```typescript
// Full performance optimization suite
const optimizedConfig = {
  ...adaptiveConfig,
  
  // Connection optimization
  enableConnectionPooling: true,
  connectionPoolSize: 5,
  
  // Request optimization
  enableRequestBatching: true,
  batchSize: 10,
  batchTimeout: 100,
  
  // Caching optimization
  enableIntelligentCaching: true,
  cacheMaxSize: 100 * 1024 * 1024,
  cacheEvictionPolicy: 'adaptive',
  
  // Rate limiting optimization
  enableDynamicRateLimiting: true,
  rateLimitRequestsPerSecond: 10,
  enableBackoffRecovery: true,
};
```

### Phase 4: Production Deployment (Week 6)

#### 4.1 Gradual Rollout Strategy

```typescript
// Feature flag controlled rollout
const productionConfig = {
  ...optimizedConfig,
  
  // Gradual feature enablement
  enableAdvancedStreaming: process.env.ENABLE_ADVANCED_STREAMING === 'true',
  enableToolOrchestration: process.env.ENABLE_TOOL_ORCHESTRATION === 'true',
  enableAdaptiveModelSelection: process.env.ENABLE_ADAPTIVE_SELECTION === 'true',
  
  // Production safeguards
  enablePerformanceMonitoring: true,
  enableErrorReporting: true,
  enableMetricsCollection: true,
};
```

#### 4.2 A/B Testing Setup

```typescript
// A/B testing between legacy and enhanced portals
const portalFactory = (portalType: string, enhanced: boolean = false) => {
  if (enhanced && process.env.ENHANCED_PORTAL_ENABLED === 'true') {
    switch (portalType) {
      case 'openai':
        return new EnhancedOpenAIPortal(productionConfig);
      case 'anthropic':
        return new EnhancedAnthropicPortal(productionConfig);
      default:
        return new LegacyPortal(legacyConfig); // Fallback
    }
  }
  
  return new LegacyPortal(legacyConfig);
};
```

## 🔧 Migration Tools and Scripts

### Automated Migration Script

```bash
#!/bin/bash
# migration-script.sh

echo "Starting SYMindX Portal Migration..."

# Phase 1: Setup
echo "Phase 1: Setting up enhanced utilities..."
npm run setup-enhanced-portals

# Phase 2: Portal Migration
echo "Phase 2: Migrating portals..."
portals=("openai" "anthropic" "google-generative" "groq" "mistral")

for portal in "${portals[@]}"; do
  echo "Migrating $portal portal..."
  npm run migrate-portal -- --portal=$portal
  npm test -- --testPathPattern="$portal.*enhanced"
  
  if [ $? -eq 0 ]; then
    echo "✅ $portal migration successful"
  else
    echo "❌ $portal migration failed"
    exit 1
  fi
done

# Phase 3: Advanced Features
echo "Phase 3: Enabling advanced features..."
npm run enable-advanced-features

# Phase 4: Validation
echo "Phase 4: Running comprehensive tests..."
npm run test:enhanced-portals
npm run benchmark:enhanced-portals

echo "🎉 Migration completed successfully!"
```

### Configuration Migration Tool

```typescript
// migration-tool.ts
import fs from 'fs/promises';
import path from 'path';

interface LegacyConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

interface EnhancedConfig extends LegacyConfig {
  enableAdvancedStreaming?: boolean;
  enableToolOrchestration?: boolean;
  enableAdaptiveModelSelection?: boolean;
  enablePerformanceOptimization?: boolean;
  [key: string]: unknown;
}

export async function migrateLegacyConfig(
  legacyConfigPath: string,
  outputPath: string,
  migrationOptions: {
    enableAllFeatures?: boolean;
    preserveSettings?: boolean;
    addPerformanceOptimization?: boolean;
  } = {}
): Promise<void> {
  // Read legacy configuration
  const legacyConfigRaw = await fs.readFile(legacyConfigPath, 'utf-8');
  const legacyConfig: LegacyConfig = JSON.parse(legacyConfigRaw);
  
  // Create enhanced configuration
  const enhancedConfig: EnhancedConfig = {
    ...legacyConfig,
    
    // Enhanced features (conservative defaults)
    enableAdvancedStreaming: migrationOptions.enableAllFeatures ?? true,
    enableToolOrchestration: migrationOptions.enableAllFeatures ?? false,
    enableAdaptiveModelSelection: migrationOptions.enableAllFeatures ?? false,
    enablePerformanceOptimization: migrationOptions.addPerformanceOptimization ?? true,
    
    // Performance tuning
    ...(migrationOptions.addPerformanceOptimization && {
      enableConnectionPooling: true,
      enableIntelligentCaching: true,
      enableDynamicRateLimiting: true,
      
      // Conservative performance settings
      connectionPoolSize: 3,
      cacheMaxSize: 50 * 1024 * 1024, // 50MB
      rateLimitRequestsPerSecond: 5,
    }),
  };
  
  // Write enhanced configuration
  await fs.writeFile(
    outputPath,
    JSON.stringify(enhancedConfig, null, 2),
    'utf-8'
  );
  
  console.log(`✅ Configuration migrated: ${legacyConfigPath} → ${outputPath}`);
}

// Usage example
migrateLegacyConfig(
  './src/portals/openai/config.json',
  './src/portals/openai/enhanced-config.json',
  {
    enableAllFeatures: false,
    preserveSettings: true,
    addPerformanceOptimization: true,
  }
);
```

### Batch Migration Script

```typescript
// batch-migration.ts
import { migrateLegacyConfig } from './migration-tool.js';
import { glob } from 'glob';
import path from 'path';

const PORTAL_DIRECTORIES = [
  'openai', 'anthropic', 'google-generative', 'groq', 'mistral',
  'cohere', 'perplexity', 'azure-openai', 'xai', 'ollama',
  'google-vertex', 'lmstudio', 'multimodal'
];

async function batchMigratePortals(): Promise<void> {
  console.log('Starting batch portal migration...');
  
  for (const portalDir of PORTAL_DIRECTORIES) {
    const portalPath = `./src/portals/${portalDir}`;
    const configPath = `${portalPath}/config.json`;
    const enhancedConfigPath = `${portalPath}/enhanced-config.json`;
    
    try {
      // Check if legacy config exists
      await fs.access(configPath);
      
      // Migrate configuration
      await migrateLegacyConfig(configPath, enhancedConfigPath, {
        enableAllFeatures: false, // Conservative migration
        preserveSettings: true,
        addPerformanceOptimization: true,
      });
      
      // Copy enhanced portal template if doesn't exist
      const enhancedPortalPath = `${portalPath}/enhanced-index.ts`;
      try {
        await fs.access(enhancedPortalPath);
      } catch {
        // Copy template and customize
        await copyEnhancedTemplate(portalDir, enhancedPortalPath);
      }
      
      console.log(`✅ ${portalDir} portal migration completed`);
      
    } catch (error) {
      console.log(`⚠️  ${portalDir} portal skipped (no config found)`);
    }
  }
  
  console.log('🎉 Batch migration completed!');
}

async function copyEnhancedTemplate(
  portalName: string, 
  targetPath: string
): Promise<void> {
  const templatePath = './src/portals/templates/enhanced-portal-template.ts';
  const template = await fs.readFile(templatePath, 'utf-8');
  
  // Customize template for specific portal
  const customizedTemplate = template
    .replace(/{{PORTAL_NAME}}/g, portalName)
    .replace(/{{PORTAL_CLASS}}/g, `Enhanced${capitalizeFirst(portalName)}Portal`)
    .replace(/{{PROVIDER_IMPORT}}/g, `@ai-sdk/${portalName}`);
  
  await fs.writeFile(targetPath, customizedTemplate, 'utf-8');
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run batch migration
batchMigratePortals().catch(console.error);
```

## 📊 Migration Monitoring

### Performance Comparison Dashboard

```typescript
// performance-comparison.ts
import { LegacyPortal } from './legacy-portal.js';
import { EnhancedPortal } from './enhanced-portal.js';

interface PerformanceMetrics {
  averageResponseTime: number;
  tokensPerSecond: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class MigrationMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  
  async comparePortalPerformance(
    portalName: string,
    testPrompts: string[],
    iterations: number = 10
  ): Promise<{
    legacy: PerformanceMetrics;
    enhanced: PerformanceMetrics;
    improvement: Record<string, string>;
  }> {
    console.log(`Comparing ${portalName} portal performance...`);
    
    // Test legacy portal
    const legacyMetrics = await this.benchmarkPortal(
      new LegacyPortal(legacyConfig),
      testPrompts,
      iterations
    );
    
    // Test enhanced portal
    const enhancedMetrics = await this.benchmarkPortal(
      new EnhancedPortal(enhancedConfig),
      testPrompts,
      iterations
    );
    
    // Calculate improvements
    const improvement = {
      responseTime: this.calculateImprovement(
        legacyMetrics.averageResponseTime,
        enhancedMetrics.averageResponseTime
      ),
      throughput: this.calculateImprovement(
        legacyMetrics.tokensPerSecond,
        enhancedMetrics.tokensPerSecond,
        true // Higher is better
      ),
      errorRate: this.calculateImprovement(
        legacyMetrics.errorRate,
        enhancedMetrics.errorRate
      ),
      memoryUsage: this.calculateImprovement(
        legacyMetrics.memoryUsage,
        enhancedMetrics.memoryUsage
      ),
    };
    
    return {
      legacy: legacyMetrics,
      enhanced: enhancedMetrics,
      improvement,
    };
  }
  
  private calculateImprovement(before: number, after: number, higherIsBetter = false): string {
    const change = higherIsBetter ? 
      ((after - before) / before) * 100 :
      ((before - after) / before) * 100;
    
    const direction = change > 0 ? 'improvement' : 'regression';
    return `${Math.abs(change).toFixed(1)}% ${direction}`;
  }
}
```

### Migration Health Checks

```typescript
// health-checks.ts
export class MigrationHealthCheck {
  
  async runHealthCheck(portalName: string): Promise<{
    status: 'healthy' | 'warning' | 'error';
    checks: Array<{ name: string; status: boolean; message: string }>;
  }> {
    const checks = [];
    
    // API connectivity check
    checks.push(await this.checkApiConnectivity(portalName));
    
    // Configuration validation
    checks.push(await this.checkConfiguration(portalName));
    
    // Performance baseline
    checks.push(await this.checkPerformanceBaseline(portalName));
    
    // Feature compatibility
    checks.push(await this.checkFeatureCompatibility(portalName));
    
    // Error rate check
    checks.push(await this.checkErrorRate(portalName));
    
    const failedChecks = checks.filter(check => !check.status);
    const status = failedChecks.length === 0 ? 'healthy' : 
                   failedChecks.length < 2 ? 'warning' : 'error';
    
    return { status, checks };
  }
  
  private async checkApiConnectivity(portalName: string): Promise<{
    name: string;
    status: boolean;
    message: string;
  }> {
    try {
      // Test basic API connectivity
      const portal = this.createPortal(portalName);
      await portal.generateText('Hello', { maxOutputTokens: 10 });
      
      return {
        name: 'API Connectivity',
        status: true,
        message: 'API is accessible and responsive',
      };
    } catch (error) {
      return {
        name: 'API Connectivity',
        status: false,
        message: `API connectivity failed: ${error.message}`,
      };
    }
  }
}
```

## ⚠️ Risk Management

### Rollback Strategy

```typescript
// rollback-strategy.ts
export class RollbackManager {
  private backupConfigs: Map<string, any> = new Map();
  
  async createBackup(portalName: string): Promise<void> {
    const currentConfig = await this.getCurrentConfig(portalName);
    this.backupConfigs.set(portalName, currentConfig);
    
    // Also backup to file system
    await fs.writeFile(
      `./backups/${portalName}-config-${Date.now()}.json`,
      JSON.stringify(currentConfig, null, 2)
    );
  }
  
  async rollback(portalName: string): Promise<void> {
    const backupConfig = this.backupConfigs.get(portalName);
    if (!backupConfig) {
      throw new Error(`No backup found for ${portalName}`);
    }
    
    // Restore legacy configuration
    await this.restoreConfig(portalName, backupConfig);
    
    // Switch back to legacy portal
    await this.switchToLegacyPortal(portalName);
    
    console.log(`✅ Rolled back ${portalName} to legacy configuration`);
  }
  
  async validateRollback(portalName: string): Promise<boolean> {
    try {
      const portal = this.createLegacyPortal(portalName);
      await portal.generateText('Rollback test', { maxOutputTokens: 10 });
      return true;
    } catch (error) {
      console.error(`Rollback validation failed for ${portalName}:`, error);
      return false;
    }
  }
}
```

### Circuit Breaker Pattern

```typescript
// circuit-breaker.ts
export class MigrationCircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, number>();
  private readonly maxFailures = 5;
  private readonly resetTimeout = 300000; // 5 minutes
  
  async execute<T>(
    portalName: string,
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    if (this.isCircuitOpen(portalName)) {
      console.warn(`Circuit breaker open for ${portalName}, using fallback`);
      return await fallback();
    }
    
    try {
      const result = await operation();
      this.recordSuccess(portalName);
      return result;
    } catch (error) {
      this.recordFailure(portalName);
      
      if (this.isCircuitOpen(portalName)) {
        console.error(`Circuit breaker tripped for ${portalName}, switching to fallback`);
      }
      
      throw error;
    }
  }
  
  private isCircuitOpen(portalName: string): boolean {
    const failures = this.failures.get(portalName) || 0;
    const lastFailure = this.lastFailure.get(portalName) || 0;
    
    if (failures >= this.maxFailures) {
      if (Date.now() - lastFailure > this.resetTimeout) {
        // Reset circuit breaker
        this.failures.set(portalName, 0);
        return false;
      }
      return true;
    }
    
    return false;
  }
}
```

## 📈 Success Metrics

### Migration Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Performance Improvement** | 40%+ faster streaming | Before/after benchmarks |
| **Token Efficiency** | 30% reduced usage | Cache hit rate + model selection |
| **Error Reduction** | 50% fewer errors | Error rate comparison |
| **Memory Optimization** | 30% less memory | Memory usage profiling |
| **Test Coverage** | 95%+ coverage | Enhanced compliance tests |
| **Migration Speed** | <6 weeks total | Project timeline |
| **Zero Downtime** | 100% uptime | Production monitoring |

### Key Performance Indicators (KPIs)

```typescript
// migration-kpis.ts
export interface MigrationKPIs {
  // Performance KPIs
  averageResponseTime: number;        // Target: <500ms
  streamingThroughput: number;        // Target: 70+ tokens/sec
  cacheHitRate: number;              // Target: 60%+
  errorRate: number;                 // Target: <1%
  
  // Resource KPIs
  memoryUsage: number;               // Target: <50MB per portal
  cpuUsage: number;                  // Target: <20%
  networkBandwidth: number;          // Target: Minimal increase
  
  // Business KPIs
  tokenCostReduction: number;        // Target: 30%+ savings
  developmentVelocity: number;       // Target: Faster feature development
  systemReliability: number;        // Target: 99.9% uptime
  
  // User Experience KPIs
  timeToFirstToken: number;          // Target: <200ms
  streamingLatency: number;          // Target: <50ms variance
  toolExecutionTime: number;        // Target: <2s for complex workflows
}

export class MigrationMetrics {
  async calculateROI(
    migrationCost: number,
    monthlySavings: number,
    performanceGains: number
  ): Promise<{
    paybackPeriod: number;
    annualROI: number;
    recommendation: string;
  }> {
    const paybackPeriod = migrationCost / monthlySavings;
    const annualROI = (monthlySavings * 12 - migrationCost) / migrationCost;
    
    const recommendation = 
      paybackPeriod < 6 ? 'Highly recommended - quick payback' :
      paybackPeriod < 12 ? 'Recommended - reasonable payback' :
      'Consider optimizing costs - long payback period';
    
    return {
      paybackPeriod,
      annualROI,
      recommendation,
    };
  }
}
```

## 🎯 Next Steps

### Post-Migration Tasks

1. **Monitoring Setup** (Week 7)
   - Configure comprehensive monitoring
   - Set up alerting for performance regressions
   - Implement automated health checks

2. **Performance Tuning** (Week 8)
   - Analyze production metrics
   - Optimize configurations based on usage patterns
   - Fine-tune caching and rate limiting

3. **Documentation Updates** (Week 9)
   - Update API documentation
   - Create troubleshooting guides
   - Document best practices

4. **Team Training** (Week 10)
   - Train development team on new features
   - Create internal knowledge base
   - Establish support procedures

### Continuous Improvement

- **Monthly Performance Reviews** - Regular performance analysis
- **Quarterly Feature Updates** - New enhancement rollout
- **Annual Architecture Review** - System-wide optimization

---

**Migration Timeline**: 6-10 weeks  
**Success Rate Target**: 100% successful migrations  
**Performance Improvement Target**: 40%+ across all metrics  
**Zero Downtime Requirement**: Maintained throughout migration