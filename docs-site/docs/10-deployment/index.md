---
sidebar_position: 10
sidebar_label: "Deployment"
title: "Deployment"
description: "Deployment options and configurations"
---

# Deployment

SYMindX supports multiple deployment strategies to meet different scale and infrastructure requirements. From local development to enterprise Kubernetes clusters, the platform provides flexible deployment options with comprehensive configuration management.

## Architecture Overview

```mermaid
graph TD
    A[Deployment Options] --> B[Local Development]
    A --> C[Docker]
    A --> D[Kubernetes]
    A --> E[Cloud Platforms]
    
    B --> F[Bun/Node.js]
    B --> G[SQLite]
    
    C --> H[Docker Compose]
    C --> I[Container Registry]
    
    D --> J[Helm Charts]
    D --> K[StatefulSets]
    D --> L[ConfigMaps]
    
    E --> M[AWS ECS/EKS]
    E --> N[Google Cloud Run/GKE]
    E --> O[Azure Container Instances/AKS]
```

## Local Development

### Quick Start
Deploy SYMindX locally for development and testing:

```bash
# Clone repository
git clone https://github.com/symindx/symindx.git
cd symindx

# Install dependencies
bun install

# Configure environment
cp config/runtime.example.json config/runtime.json
# Edit runtime.json with your API keys

# Start development server
bun dev
```

### Development Configuration
Optimized settings for local development:

```json
{
  "environment": "development",
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "type": "sqlite",
    "path": "./data/dev.db"
  },
  "logging": {
    "level": "debug",
    "pretty": true
  },
  "agents": [{
    "name": "DevAgent",
    "enabled": true,
    "portal": "ollama",
    "memory": "sqlite"
  }]
}
```

## Docker Deployment

### Single Container
Deploy SYMindX as a standalone container:

```dockerfile
# Dockerfile
FROM oven/bun:1.0-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install --production

# Copy application
COPY . .

# Build TypeScript
RUN bun run build

# Expose ports
EXPOSE 3000

# Start application
CMD ["bun", "start"]
```

### Docker Compose
Multi-container deployment with dependencies:

```yaml
# docker-compose.yml
version: '3.8'

services:
  symindx:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/symindx
    volumes:
      - ./config:/app/config
      - agent-data:/app/data
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=symindx
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  webui:
    build: ./website
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://symindx:3000
    depends_on:
      - symindx

volumes:
  agent-data:
  postgres-data:
  redis-data:
```

### Container Registry
Push to registry for distribution:

```bash
# Build and tag
docker build -t symindx:latest .
docker tag symindx:latest myregistry.com/symindx:v1.0.0

# Push to registry
docker push myregistry.com/symindx:v1.0.0

# Deploy from registry
docker run -d \
  --name symindx \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config \
  myregistry.com/symindx:v1.0.0
```

## Kubernetes Deployment

### Helm Chart
Deploy using Helm for easy management:

```yaml
# values.yaml
replicaCount: 3

image:
  repository: symindx/symindx
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.symindx.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: symindx-tls
      hosts:
        - api.symindx.example.com

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

persistence:
  enabled: true
  storageClass: fast-ssd
  size: 20Gi

postgresql:
  enabled: true
  auth:
    postgresPassword: changeme
    database: symindx
  primary:
    persistence:
      size: 50Gi

redis:
  enabled: true
  auth:
    enabled: true
    password: changeme
```

### Kubernetes Manifests
Direct deployment with kubectl:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: symindx
  labels:
    app: symindx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: symindx
  template:
    metadata:
      labels:
        app: symindx
    spec:
      containers:
      - name: symindx
        image: symindx/symindx:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: symindx-secrets
              key: database-url
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: symindx-config
---
apiVersion: v1
kind: Service
metadata:
  name: symindx
spec:
  selector:
    app: symindx
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### StatefulSet for Agents
Deploy agents with persistent identity:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: symindx-agents
spec:
  serviceName: symindx-agents
  replicas: 5
  selector:
    matchLabels:
      app: symindx-agent
  template:
    metadata:
      labels:
        app: symindx-agent
    spec:
      containers:
      - name: agent
        image: symindx/symindx:1.0.0
        env:
        - name: AGENT_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: AGENT_MODE
          value: "dedicated"
        volumeMounts:
        - name: agent-data
          mountPath: /app/data
  volumeClaimTemplates:
  - metadata:
      name: agent-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi
```

## Cloud Platform Deployment

### AWS Deployment
Deploy on AWS using ECS or EKS:

```typescript
// AWS CDK Stack
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class SymindxStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'SymindxVPC', {
      maxAzs: 2
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'SymindxCluster', {
      vpc,
      containerInsights: true
    });

    // Fargate Service
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this, 'SymindxService', {
        cluster,
        cpu: 1024,
        memoryLimitMiB: 2048,
        desiredCount: 3,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry('symindx/symindx:latest'),
          environment: {
            NODE_ENV: 'production'
          }
        }
      }
    );

    // Auto Scaling
    const scaling = fargateService.service.autoScaleTaskCount({
      maxCapacity: 10,
      minCapacity: 2
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70
    });
  }
}
```

### Google Cloud Deployment
Deploy on GCP using Cloud Run:

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: symindx
  annotations:
    run.googleapis.com/launch-stage: GA
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: gcr.io/project-id/symindx:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
```

### Azure Deployment
Deploy on Azure using Container Instances:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "containerGroupName": {
      "type": "string",
      "defaultValue": "symindx-group"
    }
  },
  "resources": [{
    "type": "Microsoft.ContainerInstance/containerGroups",
    "apiVersion": "2021-09-01",
    "name": "[parameters('containerGroupName')]",
    "location": "[resourceGroup().location]",
    "properties": {
      "containers": [{
        "name": "symindx",
        "properties": {
          "image": "symindx/symindx:latest",
          "ports": [{
            "port": 3000,
            "protocol": "TCP"
          }],
          "resources": {
            "requests": {
              "cpu": 1,
              "memoryInGB": 2
            }
          },
          "environmentVariables": [{
            "name": "NODE_ENV",
            "value": "production"
          }]
        }
      }],
      "osType": "Linux",
      "ipAddress": {
        "type": "Public",
        "ports": [{
          "port": 3000,
          "protocol": "TCP"
        }]
      }
    }
  }]
}
```

## Production Configuration

### Environment Variables
Essential production environment settings:

```bash
# Core Configuration
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/symindx
REDIS_URL=redis://user:pass@host:6379

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
SESSION_SECRET=your-session-secret

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
PROMETHEUS_ENABLED=true
GRAFANA_API_KEY=...
```

### Health Checks
Implement comprehensive health monitoring:

```typescript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.VERSION,
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkAIProviders()
  ]);
  
  if (checks.every(c => c.healthy)) {
    res.json({ status: 'ready', checks });
  } else {
    res.status(503).json({ status: 'not ready', checks });
  }
});
```

### Backup and Recovery
Automated backup strategies:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: symindx-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: symindx/backup:latest
            env:
            - name: BACKUP_DESTINATION
              value: "s3://backups/symindx"
            command:
            - /bin/sh
            - -c
            - |
              pg_dump $DATABASE_URL > backup.sql
              aws s3 cp backup.sql $BACKUP_DESTINATION/$(date +%Y%m%d).sql
              redis-cli --rdb /data/dump.rdb
              aws s3 cp /data/dump.rdb $BACKUP_DESTINATION/redis-$(date +%Y%m%d).rdb
```

## Monitoring and Observability

### Metrics Collection
Prometheus metrics endpoint:

```typescript
import { register } from 'prom-client';

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Distributed Tracing
OpenTelemetry integration:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'symindx',
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

### Log Aggregation
Structured logging for analysis:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

SYMindX's flexible deployment options ensure you can run your AI agents anywhere, from local development to global cloud infrastructure, with the tools and configurations needed for reliable, scalable operation.
