# Enhanced AI SDK v5 Portals Deployment Guide

## 🚀 Production Deployment Overview

This guide covers deploying the enhanced AI SDK v5 streaming patterns to production environments, including configuration management, monitoring setup, and operational procedures.

## 📋 Pre-Deployment Checklist

### Environment Validation

- [ ] **API Keys Verified** - All provider API keys tested and valid
- [ ] **Dependencies Updated** - AI SDK v5 and all required packages installed
- [ ] **Configuration Validated** - All portal configurations tested in staging
- [ ] **Performance Benchmarked** - Baseline metrics established
- [ ] **Monitoring Configured** - Observability system ready
- [ ] **Backup Strategy** - Rollback procedures tested
- [ ] **Security Review** - Security protocols validated
- [ ] **Load Testing** - System tested under expected load

### Infrastructure Requirements

#### Minimum System Requirements

```yaml
# Production Environment Specifications
compute:
  cpu: 4 cores minimum (8 cores recommended)
  memory: 8GB minimum (16GB recommended)
  storage: 100GB SSD (500GB recommended)
  
networking:
  bandwidth: 1Gbps minimum
  latency: <50ms to provider APIs
  
dependencies:
  node_version: ">=18.0.0"
  npm_version: ">=9.0.0"
  ai_sdk_version: ">=5.0.0"
```

#### Container Configuration

```dockerfile
# Dockerfile for enhanced portals
FROM node:18-alpine

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV ENABLE_ENHANCED_PORTALS=true

# Configure resource limits
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV UV_THREADPOOL_SIZE=64

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
EXPOSE 3000
CMD ["npm", "start"]
```

## 🌍 Environment Configuration

### Development Environment

```typescript
// config/development.ts
export const developmentConfig = {
  // Enhanced features enabled for testing
  enhancedPortals: {
    enableAdvancedStreaming: true,
    enableToolOrchestration: true,
    enableAdaptiveModelSelection: false, // Disabled for consistency
    enablePerformanceOptimization: true,
    
    // Development-friendly settings
    streamingBufferSize: 5,
    streamingThrottleRate: 200,
    toolExecutionTimeout: 60000,
    
    // Verbose logging
    enableDebugLogging: true,
    logLevel: 'debug',
  },
  
  // Resource limits for development
  performance: {
    cacheMaxSize: 25 * 1024 * 1024, // 25MB
    connectionPoolSize: 2,
    rateLimitRequestsPerSecond: 20,
  },
  
  // API endpoints
  providers: {
    openai: {
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      timeout: 30000,
    },
    anthropic: {
      baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      timeout: 30000,
    },
  },
};
```

### Staging Environment

```typescript
// config/staging.ts
export const stagingConfig = {
  // Production-like feature set
  enhancedPortals: {
    enableAdvancedStreaming: true,
    enableToolOrchestration: true,
    enableAdaptiveModelSelection: true,
    enablePerformanceOptimization: true,
    
    // Production-like settings
    streamingBufferSize: 10,
    streamingThrottleRate: 100,
    toolExecutionTimeout: 30000,
    
    // Moderate logging
    enableDebugLogging: false,
    logLevel: 'info',
  },
  
  // Staging resource allocation
  performance: {
    cacheMaxSize: 50 * 1024 * 1024, // 50MB
    connectionPoolSize: 3,
    rateLimitRequestsPerSecond: 15,
  },
  
  // Load testing configuration
  loadTesting: {
    maxConcurrentRequests: 100,
    rampUpDuration: 60000, // 1 minute
    testDuration: 300000,  // 5 minutes
  },
};
```

### Production Environment

```typescript
// config/production.ts
export const productionConfig = {
  // All features enabled with optimized settings
  enhancedPortals: {
    enableAdvancedStreaming: true,
    enableToolOrchestration: true,
    enableAdaptiveModelSelection: true,
    enablePerformanceOptimization: true,
    
    // Production-optimized settings
    streamingBufferSize: 15,
    streamingThrottleRate: 75,
    toolExecutionTimeout: 30000,
    
    // Production logging
    enableDebugLogging: false,
    logLevel: 'warn',
    enableMetricsCollection: true,
  },
  
  // Production resource allocation
  performance: {
    cacheMaxSize: 100 * 1024 * 1024, // 100MB
    connectionPoolSize: 5,
    rateLimitRequestsPerSecond: 10,
    
    // Advanced optimizations
    enableConnectionMultiplexing: true,
    enableRequestCoalescing: true,
    enablePredictivePrefetching: true,
  },
  
  // High availability configuration
  highAvailability: {
    enableCircuitBreaker: true,
    enableRetryWithBackoff: true,
    enableGracefulDegradation: true,
    healthCheckInterval: 30000,
  },
  
  // Security configuration
  security: {
    enableApiKeyRotation: true,
    enableRequestSigning: true,
    enableRateLimitByUser: true,
    maxRequestsPerUserPerHour: 1000,
  },
};
```

## 🔧 Infrastructure Setup

### Kubernetes Deployment

```yaml
# k8s/enhanced-portals-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: symindx-enhanced-portals
  namespace: symindx
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: symindx-enhanced-portals
  template:
    metadata:
      labels:
        app: symindx-enhanced-portals
    spec:
      containers:
      - name: enhanced-portals
        image: symindx/enhanced-portals:v2.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: ENABLE_ENHANCED_PORTALS
          value: "true"
        - name: LOG_LEVEL
          value: "info"
        
        # API Keys from secrets
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-provider-keys
              key: openai-api-key
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-provider-keys
              key: anthropic-api-key
        
        # Resource limits
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
      
      # Pod security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000

---
# Service configuration
apiVersion: v1
kind: Service
metadata:
  name: symindx-enhanced-portals-service
  namespace: symindx
spec:
  selector:
    app: symindx-enhanced-portals
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: symindx-enhanced-portals-hpa
  namespace: symindx
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: symindx-enhanced-portals
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
# ConfigMap for portal configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: enhanced-portals-config
  namespace: symindx
data:
  config.yaml: |
    enhancedPortals:
      enableAdvancedStreaming: true
      enableToolOrchestration: true
      enableAdaptiveModelSelection: true
      enablePerformanceOptimization: true
      
      # Performance settings
      streamingBufferSize: 15
      streamingThrottleRate: 75
      cacheMaxSize: 104857600  # 100MB
      connectionPoolSize: 5
      
      # Observability
      enableMetricsCollection: true
      enableTracing: true
      metricsPort: 9090
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  enhanced-portals:
    build: .
    ports:
      - "3000:3000"
      - "9090:9090"  # Metrics port
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - ENABLE_ENHANCED_PORTALS=true
      
      # API Keys (use .env file)
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
    
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
      - portal-cache:/app/cache
    
    depends_on:
      - redis
      - prometheus
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
  
  # Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
  
  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
  
  # Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning

volumes:
  portal-cache:
  redis-data:
  prometheus-data:
  grafana-data:
```

## 📊 Monitoring and Observability

### Prometheus Metrics Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "portal_rules.yml"

scrape_configs:
  - job_name: 'enhanced-portals'
    static_configs:
      - targets: ['enhanced-portals:9090']
    scrape_interval: 10s
    metrics_path: /metrics
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Enhanced AI SDK v5 Portals",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(portal_requests_total[5m])",
            "legendFormat": "{{portal}} - {{model}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(portal_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th Percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(portal_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th Percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(portal_errors_total[5m]) / rate(portal_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "portal_cache_hits_total / (portal_cache_hits_total + portal_cache_misses_total)",
            "legendFormat": "Hit Rate"
          }
        ]
      },
      {
        "title": "Streaming Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(portal_streaming_tokens_total[5m])",
            "legendFormat": "Tokens/Second"
          },
          {
            "expr": "portal_streaming_time_to_first_token_seconds",
            "legendFormat": "Time to First Token"
          }
        ]
      }
    ]
  }
}
```

### Application Metrics Integration

```typescript
// monitoring/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Request metrics
export const requestCounter = new Counter({
  name: 'portal_requests_total',
  help: 'Total number of portal requests',
  labelNames: ['portal', 'model', 'method', 'status'],
});

export const requestDuration = new Histogram({
  name: 'portal_request_duration_seconds',
  help: 'Duration of portal requests in seconds',
  labelNames: ['portal', 'model', 'method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

// Error metrics
export const errorCounter = new Counter({
  name: 'portal_errors_total',
  help: 'Total number of portal errors',
  labelNames: ['portal', 'model', 'error_type'],
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'portal_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['portal'],
});

export const cacheMisses = new Counter({
  name: 'portal_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['portal'],
});

// Streaming metrics
export const streamingTokens = new Counter({
  name: 'portal_streaming_tokens_total',
  help: 'Total number of streaming tokens',
  labelNames: ['portal', 'model'],
});

export const timeToFirstToken = new Histogram({
  name: 'portal_streaming_time_to_first_token_seconds',
  help: 'Time to first token in streaming responses',
  labelNames: ['portal', 'model'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2],
});

// Resource metrics
export const memoryUsage = new Gauge({
  name: 'portal_memory_usage_bytes',
  help: 'Memory usage by portal components',
  labelNames: ['component'],
});

export const connectionPoolSize = new Gauge({
  name: 'portal_connection_pool_size',
  help: 'Current connection pool size',
  labelNames: ['portal'],
});

// Custom metrics collection
export function recordPortalRequest(
  portal: string,
  model: string,
  method: string,
  duration: number,
  success: boolean
): void {
  const status = success ? 'success' : 'error';
  
  requestCounter.inc({ portal, model, method, status });
  requestDuration.observe({ portal, model, method }, duration);
  
  if (!success) {
    errorCounter.inc({ portal, model, error_type: 'request_failed' });
  }
}

export function recordCacheOperation(portal: string, hit: boolean): void {
  if (hit) {
    cacheHits.inc({ portal });
  } else {
    cacheMisses.inc({ portal });
  }
}

export function recordStreamingMetrics(
  portal: string,
  model: string,
  tokenCount: number,
  timeToFirst: number
): void {
  streamingTokens.inc({ portal, model }, tokenCount);
  timeToFirstToken.observe({ portal, model }, timeToFirst);
}

// Metrics endpoint
export function setupMetricsEndpoint(app: any): void {
  app.get('/metrics', async (req: any, res: any) => {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  });
}
```

## 🔒 Security Configuration

### API Key Management

```typescript
// security/api-key-manager.ts
import { encrypt, decrypt } from 'crypto';

export class ApiKeyManager {
  private keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
  private encryptionKey: Buffer;
  
  constructor(masterKey: string) {
    this.encryptionKey = Buffer.from(masterKey, 'hex');
  }
  
  async rotateApiKey(provider: string): Promise<void> {
    // Implement key rotation logic
    const currentKey = await this.getApiKey(provider);
    const newKey = await this.generateNewApiKey(provider);
    
    // Test new key
    await this.validateApiKey(provider, newKey);
    
    // Update configuration
    await this.updateApiKey(provider, newKey);
    
    // Schedule old key cleanup
    setTimeout(() => {
      this.cleanupOldKey(provider, currentKey);
    }, 60000); // 1 minute grace period
  }
  
  async getApiKey(provider: string): Promise<string> {
    const encryptedKey = process.env[`${provider.toUpperCase()}_API_KEY_ENCRYPTED`];
    if (encryptedKey) {
      return this.decrypt(encryptedKey);
    }
    
    // Fallback to plain text (development only)
    return process.env[`${provider.toUpperCase()}_API_KEY`] || '';
  }
  
  private encrypt(text: string): string {
    // Implement encryption logic
    return 'encrypted_' + Buffer.from(text).toString('base64');
  }
  
  private decrypt(encryptedText: string): string {
    // Implement decryption logic
    return Buffer.from(encryptedText.replace('encrypted_', ''), 'base64').toString();
  }
}
```

### Rate Limiting and Security Headers

```typescript
// security/middleware.ts
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export function setupSecurityMiddleware(app: any): void {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
  
  // Rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // stricter limit for API endpoints
    skipSuccessfulRequests: true,
  });
  
  app.use('/api/', generalLimiter);
  app.use('/api/portals/', strictLimiter);
  
  // Request validation
  app.use((req: any, res: any, next: any) => {
    // Validate request size
    if (req.headers['content-length'] && 
        parseInt(req.headers['content-length']) > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Request too large' });
    }
    
    // Validate user agent
    if (!req.headers['user-agent'] || req.headers['user-agent'].length > 500) {
      return res.status(400).json({ error: 'Invalid user agent' });
    }
    
    next();
  });
}
```

## 🚀 Deployment Procedures

### Blue-Green Deployment Script

```bash
#!/bin/bash
# deploy-blue-green.sh

set -e

NAMESPACE="symindx"
APP_NAME="enhanced-portals"
NEW_VERSION=$1
TIMEOUT=300

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Starting blue-green deployment for version $NEW_VERSION"

# Determine current color
CURRENT_COLOR=$(kubectl get service ${APP_NAME}-service -n $NAMESPACE -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "Current color: $CURRENT_COLOR"
echo "Deploying to color: $NEW_COLOR"

# Deploy new version
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}-${NEW_COLOR}
  namespace: $NAMESPACE
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $APP_NAME
      color: $NEW_COLOR
  template:
    metadata:
      labels:
        app: $APP_NAME
        color: $NEW_COLOR
    spec:
      containers:
      - name: $APP_NAME
        image: symindx/${APP_NAME}:${NEW_VERSION}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: COLOR
          value: "$NEW_COLOR"
        # ... (rest of container spec)
EOF

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/${APP_NAME}-${NEW_COLOR} -n $NAMESPACE --timeout=${TIMEOUT}s

# Health check on new deployment
echo "Performing health check..."
NEW_POD=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME,color=$NEW_COLOR -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $NAMESPACE $NEW_POD -- curl -f http://localhost:3000/health

# Run smoke tests
echo "Running smoke tests..."
./scripts/smoke-tests.sh $NEW_COLOR

# Switch traffic
echo "Switching traffic to $NEW_COLOR"
kubectl patch service ${APP_NAME}-service -n $NAMESPACE -p '{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'

# Verify traffic switch
sleep 30
echo "Verifying traffic switch..."
./scripts/verify-deployment.sh

# Cleanup old deployment
echo "Cleaning up old $CURRENT_COLOR deployment"
kubectl delete deployment ${APP_NAME}-${CURRENT_COLOR} -n $NAMESPACE

echo "✅ Blue-green deployment completed successfully!"
```

### Rollback Procedure

```bash
#!/bin/bash
# rollback.sh

set -e

NAMESPACE="symindx"
APP_NAME="enhanced-portals"
REASON=$1

if [ -z "$REASON" ]; then
  echo "Usage: $0 <rollback-reason>"
  exit 1
fi

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "Reason: $REASON"
echo "Timestamp: $(date)"

# Get current and previous versions
CURRENT_COLOR=$(kubectl get service ${APP_NAME}-service -n $NAMESPACE -o jsonpath='{.spec.selector.color}')
PREVIOUS_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

echo "Rolling back from $CURRENT_COLOR to $PREVIOUS_COLOR"

# Check if previous deployment exists
if ! kubectl get deployment ${APP_NAME}-${PREVIOUS_COLOR} -n $NAMESPACE >/dev/null 2>&1; then
  echo "❌ Previous deployment not found. Manual recovery required."
  exit 1
fi

# Switch traffic back
echo "Switching traffic back to $PREVIOUS_COLOR"
kubectl patch service ${APP_NAME}-service -n $NAMESPACE -p '{"spec":{"selector":{"color":"'$PREVIOUS_COLOR'"}}}'

# Verify rollback
sleep 10
echo "Verifying rollback..."
./scripts/verify-deployment.sh

# Scale down failed deployment
echo "Scaling down failed deployment"
kubectl scale deployment ${APP_NAME}-${CURRENT_COLOR} -n $NAMESPACE --replicas=0

# Log rollback
echo "Rollback completed at $(date)" >> /var/log/deployments.log
echo "Reason: $REASON" >> /var/log/deployments.log

echo "✅ Rollback completed successfully!"
```

### Health Check Scripts

```bash
#!/bin/bash
# scripts/smoke-tests.sh

COLOR=$1
NAMESPACE="symindx"
APP_NAME="enhanced-portals"

echo "Running smoke tests for $COLOR deployment..."

# Get service endpoint
SERVICE_IP=$(kubectl get service ${APP_NAME}-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$SERVICE_IP" ]; then
  SERVICE_IP=$(kubectl get service ${APP_NAME}-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
fi

BASE_URL="http://${SERVICE_IP}"

# Test 1: Health check
echo "Test 1: Health check"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$RESPONSE" != "200" ]; then
  echo "❌ Health check failed (HTTP $RESPONSE)"
  exit 1
fi
echo "✅ Health check passed"

# Test 2: Basic portal functionality
echo "Test 2: Basic portal functionality"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/portals/openai/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello","maxTokens":5}' \
  -w "%{http_code}")

if [[ "$RESPONSE" != *"200"* ]]; then
  echo "❌ Portal functionality test failed"
  exit 1
fi
echo "✅ Portal functionality test passed"

# Test 3: Enhanced streaming
echo "Test 3: Enhanced streaming"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/portals/openai/stream" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Count to 3","maxTokens":10}' \
  -w "%{http_code}")

if [[ "$RESPONSE" != *"200"* ]]; then
  echo "❌ Streaming test failed"
  exit 1
fi
echo "✅ Streaming test passed"

# Test 4: Performance metrics
echo "Test 4: Performance metrics"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics")
if [ "$RESPONSE" != "200" ]; then
  echo "❌ Metrics endpoint failed"
  exit 1
fi
echo "✅ Metrics endpoint test passed"

echo "🎉 All smoke tests passed!"
```

## 📈 Performance Tuning

### Production Optimization Settings

```typescript
// config/production-optimizations.ts
export const productionOptimizations = {
  // Node.js optimizations
  nodeOptions: {
    maxOldSpaceSize: 4096, // 4GB heap
    maxSemiSpaceSize: 128, // 128MB young generation
    uvThreadpoolSize: 64,  // Increase thread pool
  },
  
  // HTTP server optimizations
  server: {
    keepAliveTimeout: 65000,
    headersTimeout: 66000,
    maxHeaderSize: 8192,
    noDelay: true,
  },
  
  // Enhanced portal optimizations
  portals: {
    // Connection management
    connectionPool: {
      maxConnections: 10,
      maxIdleTime: 30000,
      connectionTimeout: 5000,
    },
    
    // Request batching
    requestBatching: {
      maxBatchSize: 20,
      batchTimeout: 50, // ms
      enableSimilarityGrouping: true,
    },
    
    // Caching optimization
    cache: {
      defaultTTL: 3600, // 1 hour
      maxSize: 200 * 1024 * 1024, // 200MB
      evictionPolicy: 'adaptive',
      enableCompression: true,
    },
    
    // Streaming optimization
    streaming: {
      bufferSize: 20,
      throttleRate: 150,
      enableAdaptiveBuffering: true,
      enablePredictivePrefetch: true,
    },
  },
  
  // Monitoring and observability
  observability: {
    metricsCollectionInterval: 10000, // 10 seconds
    enableDetailed Tracing: false, // Reduce overhead
    logLevel: 'warn',
    enablePerformanceMarks: true,
  },
};
```

### Auto-scaling Configuration

```yaml
# k8s/vertical-pod-autoscaler.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: symindx-enhanced-portals-vpa
  namespace: symindx
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: symindx-enhanced-portals
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: enhanced-portals
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
```

## 🔍 Troubleshooting Guide

### Common Deployment Issues

#### Issue 1: High Memory Usage

**Symptoms**: OOM kills, high memory consumption
**Diagnosis**:
```bash
# Check memory usage
kubectl top pods -n symindx
kubectl describe pod <pod-name> -n symindx

# Check Node.js heap
curl localhost:3000/debug/heap
```

**Solution**:
```typescript
// Optimize cache size
const config = {
  performance: {
    cacheMaxSize: 50 * 1024 * 1024, // Reduce to 50MB
    enableCacheCompression: true,
    cacheEvictionPolicy: 'lru', // More aggressive eviction
  }
};
```

#### Issue 2: API Rate Limiting

**Symptoms**: 429 errors, slow response times
**Diagnosis**:
```bash
# Check rate limiter status
curl localhost:3000/debug/rate-limiter

# Check provider status
curl localhost:3000/debug/providers
```

**Solution**:
```typescript
// Adjust rate limiting
const config = {
  performance: {
    rateLimitRequestsPerSecond: 5, // Reduce rate
    enableAdaptiveRateLimit: true,
    enableRequestQueuing: true,
  }
};
```

#### Issue 3: Streaming Performance Issues

**Symptoms**: Slow streaming, high latency
**Diagnosis**:
```bash
# Check streaming metrics
curl localhost:9090/metrics | grep streaming

# Monitor network latency
kubectl exec -it <pod-name> -- ping api.openai.com
```

**Solution**:
```typescript
// Optimize streaming
const config = {
  portals: {
    streaming: {
      bufferSize: 5, // Smaller buffer
      throttleRate: 200, // Higher rate
      enableAdaptiveThrottling: true,
    }
  }
};
```

### Emergency Procedures

#### Immediate Issue Response

```bash
#!/bin/bash
# emergency-response.sh

echo "🚨 EMERGENCY RESPONSE INITIATED"

# 1. Scale up replicas for immediate relief
kubectl scale deployment symindx-enhanced-portals -n symindx --replicas=6

# 2. Check system health
kubectl get pods -n symindx -l app=symindx-enhanced-portals
kubectl get events -n symindx --sort-by='.lastTimestamp'

# 3. Enable circuit breaker
curl -X POST localhost:3000/admin/circuit-breaker/enable

# 4. Switch to safe mode
curl -X POST localhost:3000/admin/safe-mode/enable

# 5. Notify team
echo "Emergency response activated at $(date)" | mail -s "SYMindX Emergency" ops-team@company.com

echo "✅ Emergency response procedures completed"
```

## 📚 Operations Manual

### Daily Operations Checklist

- [ ] **Monitor Dashboard** - Check Grafana dashboards for anomalies
- [ ] **Review Logs** - Check application logs for errors
- [ ] **Performance Metrics** - Verify response times and throughput
- [ ] **Resource Usage** - Monitor CPU, memory, and storage
- [ ] **API Key Status** - Check API key validity and usage limits
- [ ] **Cache Performance** - Review cache hit rates and eviction patterns
- [ ] **Alert Status** - Ensure monitoring alerts are functioning

### Weekly Operations Tasks

- [ ] **Performance Review** - Analyze weekly performance trends
- [ ] **Capacity Planning** - Review resource usage and plan scaling
- [ ] **Security Audit** - Check for security updates and vulnerabilities
- [ ] **Configuration Review** - Validate portal configurations
- [ ] **Backup Verification** - Ensure backup procedures are working
- [ ] **Documentation Updates** - Update operational documentation

### Monthly Operations Tasks

- [ ] **Full System Health Check** - Comprehensive system review
- [ ] **API Key Rotation** - Rotate API keys following security policy
- [ ] **Performance Optimization** - Review and optimize configurations
- [ ] **Disaster Recovery Test** - Test backup and recovery procedures
- [ ] **Security Assessment** - Conduct security vulnerability assessment
- [ ] **Team Training** - Update team on new procedures and features

---

**Deployment Status**: Production Ready  
**Last Updated**: 2024-01-28  
**Version**: 2.0.0  
**Support**: SYMindX Operations Team