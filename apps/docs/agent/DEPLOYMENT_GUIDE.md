# SYMindX Deployment Guide

The SQLite runtime server and mind-agents extensions in this guide are not part of v2; the library is `packages/agent`, the CLI is `apps/cli`, and the website is `apps/website`.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Development Deployment](#development-deployment)
5. [Production Deployment](#production-deployment)
6. [Container Deployment](#container-deployment)
7. [Cloud Deployment](#cloud-deployment)
8. [Database Setup](#database-setup)
9. [Security Configuration](#security-configuration)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Scaling and Load Balancing](#scaling-and-load-balancing)
12. [Backup and Recovery](#backup-and-recovery)
13. [Maintenance](#maintenance)
14. [Troubleshooting](#troubleshooting)

## Overview

This guide covers deploying SYMindX in various environments, from local development to production cloud deployments. SYMindX is designed to be flexible and can run on various platforms including local servers, VPS, cloud providers, and container orchestration platforms.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ SYMindX     │  │ SYMindX     │  │ SYMindX     │        │
│  │ Instance 1  │  │ Instance 2  │  │ Instance 3  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│              Database Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │   Vector    │        │
│  │  Primary    │  │    Cache    │  │    Store    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│              External Services                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   OpenAI    │  │  Anthropic  │  │    Groq     │        │
│  │     API     │  │     API     │  │     API     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### System Requirements

**Minimum Requirements** (Development):
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: Broadband internet connection

**Recommended Requirements** (Production):
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: High-bandwidth connection with low latency

### Software Requirements

**Runtime Environment**:
- **Node.js** 18+ or **Bun** 1.0+
- **TypeScript** 5.8+
- **Git** for version control

**Database Options** (choose one or more):
- **SQLite** 3.35+ (development)
- **PostgreSQL** 14+ (production)
- **Supabase** account (managed PostgreSQL)
- **Neon** account (serverless PostgreSQL)

**Optional Components**:
- **Redis** 6+ (caching)
- **Docker** 20+ (containerization)
- **Nginx** 1.20+ (reverse proxy)
- **PM2** (process management)

## Environment Setup

### Local Development Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/symindx.git
   cd symindx/packages/agent
   ```

2. **Install Dependencies**:
   ```bash
   # Using Bun (recommended)
   bun install
   
   # Or using npm
   npm install
   ```

3. **Configure Environment**:
   ```bash
   # Copy example configuration
   cp src/core/config/runtime.example.json src/core/config/runtime.json
   
   # Create environment file
   cp .env.example .env
   ```

4. **Set Environment Variables**:
   ```bash
   # Edit .env file with your configuration
   vim .env
   ```

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Application Settings
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
HOST=0.0.0.0

# AI Provider API Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
XAI_API_KEY=xai-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
COHERE_API_KEY=...

# Database Configuration
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/symindx
REDIS_URL=redis://localhost:6379

# Memory Provider Settings
SQLITE_DB_PATH=./data/memories.db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEON_DATABASE_URL=postgresql://user:password@host/db

# Extension Configuration
TELEGRAM_BOT_TOKEN=your-telegram-token
API_SERVER_PORT=3001
WEBSOCKET_PORT=3002

# Security Settings
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Monitoring and Logging
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_FILE_PATH=./logs/symindx.log
```

## Development Deployment

### Quick Start (Local Development)

1. **Build the Application**:
   ```bash
   bun run build
   ```

2. **Start Development Server**:
   ```bash
   # Development mode with hot reload
   bun run dev
   
   # Or start built application
   bun run start
   ```

3. **Verify Installation**:
   ```bash
   # Check health endpoint
   curl http://localhost:3000/api/system/health
   
   # Test CLI
   bun cli status
   ```

### Development with Docker

1. **Create Development Dockerfile**:
   ```dockerfile
   # Dockerfile.dev
   FROM node:18-alpine
   
   WORKDIR /app
   
   # Install Bun
   RUN npm install -g bun
   
   # Copy package files
   COPY package*.json bun.lockb ./
   RUN bun install
   
   # Copy source code
   COPY . .
   
   # Build application
   RUN bun run build
   
   # Expose ports
   EXPOSE 3000 3001 3002
   
   # Start in development mode
   CMD ["bun", "run", "dev"]
   ```

2. **Docker Compose for Development**:
   ```yaml
   # docker-compose.dev.yml
   version: '3.8'
   
   services:
     symindx:
       build:
         context: .
         dockerfile: Dockerfile.dev
       ports:
         - "3000:3000"
         - "3001:3001"
         - "3002:3002"
       environment:
         - NODE_ENV=development
         - DATABASE_URL=postgresql://symindx:password@postgres:5432/symindx
         - REDIS_URL=redis://redis:6379
       volumes:
         - .:/app
         - /app/node_modules
       depends_on:
         - postgres
         - redis
   
     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: symindx
         POSTGRES_USER: symindx
         POSTGRES_PASSWORD: password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
   
   volumes:
     postgres_data:
     redis_data:
   ```

3. **Start Development Environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

## Production Deployment

### Server Preparation

1. **Update System**:
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt upgrade -y
   
   # CentOS/RHEL
   sudo yum update -y
   ```

2. **Install Node.js and Bun**:
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install Bun
   curl -fsSL https://bun.sh/install | bash
   source ~/.bashrc
   ```

3. **Install PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib -y
   
   # Configure PostgreSQL
   sudo -u postgres createuser --createdb symindx
   sudo -u postgres createdb symindx
   sudo -u postgres psql -c "ALTER USER symindx PASSWORD 'secure_password';"
   ```

4. **Install Redis** (optional but recommended):
   ```bash
   sudo apt install redis-server -y
   sudo systemctl enable redis-server
   sudo systemctl start redis-server
   ```

### Application Deployment

1. **Create Application User**:
   ```bash
   sudo useradd --system --shell /bin/bash --home /opt/symindx symindx
   sudo mkdir -p /opt/symindx
   sudo chown symindx:symindx /opt/symindx
   ```

2. **Deploy Application**:
   ```bash
   # Switch to application user
   sudo -u symindx -i
   
   # Clone repository
   cd /opt/symindx
   git clone https://github.com/yourusername/symindx.git .
   cd packages/agent
   
   # Install dependencies
   bun install --production
   
   # Build application
   bun run build
   ```

3. **Configure Production Environment**:
   ```bash
   # Create production environment file
   sudo -u symindx vim /opt/symindx/packages/agent/.env
   ```

   ```bash
   # Production .env
   NODE_ENV=production
   LOG_LEVEL=info
   PORT=3000
   HOST=0.0.0.0
   
   # Database
   DATABASE_URL=postgresql://symindx:secure_password@localhost:5432/symindx
   REDIS_URL=redis://localhost:6379
   
   # API Keys (use your actual keys)
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   
   # Security
   JWT_SECRET=your-production-jwt-secret
   CORS_ORIGINS=https://yourdomain.com
   ```

4. **Set Up Process Management with PM2**:
   ```bash
   # Install PM2
   sudo npm install -g pm2
   
   # Create PM2 ecosystem file
   sudo -u symindx vim /opt/symindx/packages/agent/ecosystem.config.js
   ```

   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'symindx',
       script: 'bun',
       args: 'start',
       cwd: '/opt/symindx/apps/cli',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       env_production: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       log_file: '/var/log/symindx/combined.log',
       out_file: '/var/log/symindx/out.log',
       error_file: '/var/log/symindx/error.log',
       merge_logs: true,
       max_memory_restart: '1G',
       restart_delay: 4000,
       max_restarts: 10,
       min_uptime: '10s'
     }]
   };
   ```

5. **Create Log Directory**:
   ```bash
   sudo mkdir -p /var/log/symindx
   sudo chown symindx:symindx /var/log/symindx
   ```

6. **Start Application**:
   ```bash
   # Start with PM2
   sudo -u symindx pm2 start ecosystem.config.js --env production
   
   # Save PM2 configuration
   sudo -u symindx pm2 save
   
   # Generate PM2 startup script
   sudo -u symindx pm2 startup
   ```

### Reverse Proxy with Nginx

1. **Install Nginx**:
   ```bash
   sudo apt install nginx -y
   ```

2. **Configure Nginx**:
   ```bash
   sudo vim /etc/nginx/sites-available/symindx
   ```

   ```nginx
   # /etc/nginx/sites-available/symindx
   upstream symindx_backend {
       server 127.0.0.1:3000;
       # Add more instances for load balancing
       # server 127.0.0.1:3001;
       # server 127.0.0.1:3002;
   }
   
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       
       # Redirect HTTP to HTTPS
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;
   
       # SSL Certificate (use Let's Encrypt)
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       
       # SSL Configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;
   
       # Security Headers
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   
       # Gzip Compression
       gzip on;
       gzip_vary on;
       gzip_min_length 1024;
       gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
   
       # Rate Limiting
       limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
       limit_req_zone $binary_remote_addr zone=chat:10m rate=5r/s;
   
       # Main Application
       location / {
           proxy_pass http://symindx_backend;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 86400;
       }
   
       # API Rate Limiting
       location /api/ {
           limit_req zone=api burst=20 nodelay;
           proxy_pass http://symindx_backend;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   
       # Chat API with stricter rate limiting
       location /api/chat {
           limit_req zone=chat burst=10 nodelay;
           proxy_pass http://symindx_backend;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   
       # WebSocket Support
       location /ws {
           proxy_pass http://symindx_backend;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_read_timeout 86400;
       }
   
       # Health Check
       location /health {
           proxy_pass http://symindx_backend/api/system/health;
           access_log off;
       }
   
       # Static Files (if serving web interface)
       location /static/ {
           alias /opt/symindx/apps/website/dist/;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. **Enable Site and Restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/symindx /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### SSL Certificate with Let's Encrypt

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain SSL Certificate**:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Auto-renewal**:
   ```bash
   sudo crontab -e
   # Add this line:
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

## Container Deployment

### Docker Production Setup

1. **Production Dockerfile**:
   ```dockerfile
   # Dockerfile
   FROM node:18-alpine AS builder
   
   WORKDIR /app
   
   # Install Bun
   RUN npm install -g bun
   
   # Copy package files
   COPY package*.json bun.lockb ./
   RUN bun install --frozen-lockfile
   
   # Copy source code
   COPY . .
   
   # Build application
   RUN bun run build
   
   # Production stage
   FROM node:18-alpine AS production
   
   WORKDIR /app
   
   # Install Bun and production dependencies
   RUN npm install -g bun
   COPY package*.json bun.lockb ./
   RUN bun install --production --frozen-lockfile
   
   # Copy built application
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/src/characters ./src/characters
   
   # Create non-root user
   RUN addgroup -g 1001 -S symindx && \
       adduser -S symindx -u 1001
   
   # Create data directory
   RUN mkdir -p /app/data && chown symindx:symindx /app/data
   
   USER symindx
   
   # Expose ports
   EXPOSE 3000
   
   # Health check
   HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
     CMD curl -f http://localhost:3000/api/system/health || exit 1
   
   # Start application
   CMD ["bun", "start"]
   ```

2. **Production Docker Compose**:
   ```yaml
   # docker-compose.prod.yml
   version: '3.8'
   
   services:
     symindx:
       build:
         context: .
         dockerfile: Dockerfile
       restart: unless-stopped
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://symindx:${DB_PASSWORD}@postgres:5432/symindx
         - REDIS_URL=redis://redis:6379
         - OPENAI_API_KEY=${OPENAI_API_KEY}
         - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
       depends_on:
         postgres:
           condition: service_healthy
         redis:
           condition: service_healthy
       networks:
         - symindx-network
       volumes:
         - symindx-data:/app/data
       labels:
         - "traefik.enable=true"
         - "traefik.http.routers.symindx.rule=Host(`yourdomain.com`)"
         - "traefik.http.routers.symindx.tls.certresolver=letsencrypt"
   
     postgres:
       image: postgres:15-alpine
       restart: unless-stopped
       environment:
         POSTGRES_DB: symindx
         POSTGRES_USER: symindx
         POSTGRES_PASSWORD: ${DB_PASSWORD}
       volumes:
         - postgres-data:/var/lib/postgresql/data
         - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
       networks:
         - symindx-network
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U symindx"]
         interval: 5s
         timeout: 5s
         retries: 5
   
     redis:
       image: redis:7-alpine
       restart: unless-stopped
       command: redis-server --appendonly yes
       volumes:
         - redis-data:/data
       networks:
         - symindx-network
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 5s
         timeout: 3s
         retries: 5
   
     traefik:
       image: traefik:v3.0
       restart: unless-stopped
       command:
         - "--api.dashboard=true"
         - "--providers.docker=true"
         - "--providers.docker.exposedbydefault=false"
         - "--entrypoints.web.address=:80"
         - "--entrypoints.websecure.address=:443"
         - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
         - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
         - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
       ports:
         - "80:80"
         - "443:443"
         - "8080:8080"
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock:ro
         - traefik-data:/letsencrypt
       networks:
         - symindx-network
   
   networks:
     symindx-network:
       driver: bridge
   
   volumes:
     symindx-data:
     postgres-data:
     redis-data:
     traefik-data:
   ```

3. **Environment File for Production**:
   ```bash
   # .env.prod
   DB_PASSWORD=secure_database_password
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   JWT_SECRET=your-production-jwt-secret
   ```

4. **Deploy with Docker Compose**:
   ```bash
   # Create environment file
   cp .env.prod .env
   
   # Deploy to production
   docker-compose -f docker-compose.prod.yml up -d
   
   # Check logs
   docker-compose -f docker-compose.prod.yml logs -f symindx
   ```

### Kubernetes Deployment

1. **Kubernetes Manifests**:
   ```yaml
   # k8s/namespace.yaml
   apiVersion: v1
   kind: Namespace
   metadata:
     name: symindx
   
   ---
   # k8s/configmap.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: symindx-config
     namespace: symindx
   data:
     NODE_ENV: "production"
     LOG_LEVEL: "info"
     PORT: "3000"
   
   ---
   # k8s/secret.yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: symindx-secrets
     namespace: symindx
   type: Opaque
   data:
     DATABASE_URL: <base64-encoded-url>
     OPENAI_API_KEY: <base64-encoded-key>
     ANTHROPIC_API_KEY: <base64-encoded-key>
     JWT_SECRET: <base64-encoded-secret>
   
   ---
   # k8s/deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: symindx
     namespace: symindx
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
           image: your-registry/symindx:latest
           ports:
           - containerPort: 3000
           envFrom:
           - configMapRef:
               name: symindx-config
           - secretRef:
               name: symindx-secrets
           resources:
             requests:
               memory: "512Mi"
               cpu: "250m"
             limits:
               memory: "1Gi"
               cpu: "500m"
           livenessProbe:
             httpGet:
               path: /api/system/health
               port: 3000
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /api/system/health
               port: 3000
             initialDelaySeconds: 5
             periodSeconds: 5
   
   ---
   # k8s/service.yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: symindx-service
     namespace: symindx
   spec:
     selector:
       app: symindx
     ports:
     - protocol: TCP
       port: 80
       targetPort: 3000
     type: ClusterIP
   
   ---
   # k8s/ingress.yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: symindx-ingress
     namespace: symindx
     annotations:
       cert-manager.io/cluster-issuer: "letsencrypt-prod"
       nginx.ingress.kubernetes.io/rate-limit: "100"
   spec:
     tls:
     - hosts:
       - yourdomain.com
       secretName: symindx-tls
     rules:
     - host: yourdomain.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: symindx-service
               port:
                 number: 80
   ```

2. **Deploy to Kubernetes**:
   ```bash
   # Apply manifests
   kubectl apply -f k8s/
   
   # Check deployment
   kubectl get pods -n symindx
   kubectl logs -f deployment/symindx -n symindx
   ```

## Cloud Deployment

### AWS Deployment

1. **EC2 Instance Setup**:
   ```bash
   # Launch EC2 instance (t3.medium or larger)
   # Security group: Allow 22 (SSH), 80 (HTTP), 443 (HTTPS)
   
   # Connect and setup
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Follow production deployment steps above
   ```

2. **RDS Database**:
   ```bash
   # Create RDS PostgreSQL instance
   aws rds create-db-instance \
     --db-name symindx \
     --db-instance-identifier symindx-prod \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username symindx \
     --master-user-password your-secure-password \
     --allocated-storage 20 \
     --vpc-security-group-ids sg-xxxxxxxx
   ```

3. **ElastiCache Redis**:
   ```bash
   # Create Redis cluster
   aws elasticache create-cache-cluster \
     --cache-cluster-id symindx-redis \
     --engine redis \
     --cache-node-type cache.t3.micro \
     --num-cache-nodes 1
   ```

### Vercel Deployment

1. **Prepare for Vercel**:
   ```json
   // vercel.json
   {
     "version": 2,
     "builds": [
       {
         "src": "dist/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/dist/index.js"
       },
       {
         "src": "/(.*)",
         "dest": "/dist/index.js"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   
   # Set environment variables
   vercel env add OPENAI_API_KEY
   vercel env add DATABASE_URL
   ```

### Railway Deployment

1. **Railway Configuration**:
   ```json
   // railway.json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "bun start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Deploy to Railway**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```

### DigitalOcean App Platform

1. **App Spec**:
   ```yaml
   # .do/app.yaml
   name: symindx
   region: nyc1
   
   services:
   - name: api
     source_dir: /
     github:
       repo: your-username/symindx
       branch: main
     run_command: cd apps/cli && bun run start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: "production"
     - key: DATABASE_URL
       value: "${db.DATABASE_URL}"
     - key: OPENAI_API_KEY
       value: "${OPENAI_API_KEY}"
       type: SECRET
     http_port: 3000
     health_check:
       http_path: /api/system/health
   
   databases:
   - name: db
     engine: PG
     version: "15"
     size: db-s-dev-database
   ```

## Database Setup

### PostgreSQL Setup

1. **Create Database and User**:
   ```sql
   -- Create database
   CREATE DATABASE symindx;
   
   -- Create user
   CREATE USER symindx WITH PASSWORD 'secure_password';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE symindx TO symindx;
   
   -- Switch to symindx database
   \c symindx
   
   -- Grant schema privileges
   GRANT ALL ON SCHEMA public TO symindx;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO symindx;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO symindx;
   ```

2. **Initialize Schema**:
   ```sql
   -- Memory tables
   CREATE TABLE IF NOT EXISTS memories (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     agent_id VARCHAR(255) NOT NULL,
     content TEXT NOT NULL,
     type VARCHAR(50) NOT NULL DEFAULT 'conversation',
     emotional_weight DECIMAL(3,2) DEFAULT 0.5,
     importance DECIMAL(3,2) DEFAULT 0.5,
     timestamp TIMESTAMPTZ DEFAULT NOW(),
     metadata JSONB DEFAULT '{}',
     embedding vector(1536)  -- For OpenAI embeddings
   );
   
   CREATE INDEX idx_memories_agent_id ON memories(agent_id);
   CREATE INDEX idx_memories_timestamp ON memories(timestamp);
   CREATE INDEX idx_memories_type ON memories(type);
   CREATE INDEX idx_memories_importance ON memories(importance);
   
   -- Chat history
   CREATE TABLE IF NOT EXISTS chat_history (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     agent_id VARCHAR(255) NOT NULL,
     user_id VARCHAR(255) NOT NULL,
     message TEXT NOT NULL,
     response TEXT NOT NULL,
     timestamp TIMESTAMPTZ DEFAULT NOW(),
     metadata JSONB DEFAULT '{}'
   );
   
   CREATE INDEX idx_chat_history_agent_id ON chat_history(agent_id);
   CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
   CREATE INDEX idx_chat_history_timestamp ON chat_history(timestamp);
   
   -- Agent states
   CREATE TABLE IF NOT EXISTS agent_states (
     agent_id VARCHAR(255) PRIMARY KEY,
     state JSONB NOT NULL,
     last_updated TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Enable Vector Extension** (for Supabase or self-hosted):
   ```sql
   -- Enable pgvector extension
   CREATE EXTENSION IF NOT EXISTS vector;
   
   -- Create vector index for similarity search
   CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

### Database Migration

1. **Migration Script**:
   ```javascript
   // scripts/migrate.js
   import { Pool } from 'pg';
   import fs from 'fs';
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL
   });
   
   async function runMigrations() {
     const migrations = [
       'migrations/001_initial_schema.sql',
       'migrations/002_add_embeddings.sql',
       'migrations/003_add_chat_history.sql'
     ];
     
     for (const migration of migrations) {
       console.log(`Running migration: ${migration}`);
       const sql = fs.readFileSync(migration, 'utf8');
       await pool.query(sql);
       console.log(`Completed migration: ${migration}`);
     }
     
     await pool.end();
   }
   
   runMigrations().catch(console.error);
   ```

2. **Run Migrations**:
   ```bash
   node scripts/migrate.js
   ```

## Security Configuration

### Application Security

1. **Environment Variable Security**:
   ```bash
   # Use secure random values
   ENCRYPTION_KEY=$(openssl rand -hex 32)
   JWT_SECRET=$(openssl rand -hex 32)
   
   # Store in secure location
   echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> /etc/symindx/.env
   echo "JWT_SECRET=$JWT_SECRET" >> /etc/symindx/.env
   
   # Set proper permissions
   sudo chown symindx:symindx /etc/symindx/.env
   sudo chmod 600 /etc/symindx/.env
   ```

2. **API Rate Limiting**:
   ```javascript
   // In application configuration
   {
     "rateLimit": {
       "windowMs": 900000,    // 15 minutes
       "max": 100,            // Max requests per window
       "message": "Rate limit exceeded"
     },
     "chatRateLimit": {
       "windowMs": 60000,     // 1 minute
       "max": 10,             // Max chat requests per minute
       "message": "Chat rate limit exceeded"
     }
   }
   ```

3. **Input Validation**:
   ```javascript
   // Validation middleware
   import { z } from 'zod';
   
   const chatSchema = z.object({
     message: z.string().min(1).max(4000),
     agentId: z.string().min(1).max(100),
     context: z.object({}).optional()
   });
   
   // Use in routes
   app.post('/api/chat', validateInput(chatSchema), async (req, res) => {
     // Handle request
   });
   ```

### Database Security

1. **PostgreSQL Security**:
   ```bash
   # Edit postgresql.conf
   sudo vim /etc/postgresql/15/main/postgresql.conf
   
   # Security settings
   ssl = on
   ssl_cert_file = '/etc/ssl/certs/postgresql.crt'
   ssl_key_file = '/etc/ssl/private/postgresql.key'
   
   # Connection settings
   listen_addresses = 'localhost'
   max_connections = 100
   
   # Authentication
   sudo vim /etc/postgresql/15/main/pg_hba.conf
   
   # Require SSL for remote connections
   hostssl all all 0.0.0.0/0 md5
   ```

2. **Database User Permissions**:
   ```sql
   -- Create read-only user for monitoring
   CREATE USER monitor WITH PASSWORD 'monitor_password';
   GRANT CONNECT ON DATABASE symindx TO monitor;
   GRANT USAGE ON SCHEMA public TO monitor;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor;
   
   -- Revoke unnecessary permissions
   REVOKE ALL ON SCHEMA public FROM PUBLIC;
   GRANT USAGE ON SCHEMA public TO symindx;
   ```

### Network Security

1. **Firewall Configuration**:
   ```bash
   # Ubuntu UFW
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   
   # Allow only specific IPs for database
   sudo ufw allow from 10.0.0.0/8 to any port 5432
   ```

2. **SSH Hardening**:
   ```bash
   # Edit SSH config
   sudo vim /etc/ssh/sshd_config
   
   # Security settings
   PermitRootLogin no
   PasswordAuthentication no
   PubkeyAuthentication yes
   Port 2222
   AllowUsers symindx
   
   sudo systemctl restart ssh
   ```

## Monitoring and Logging

### Application Monitoring

1. **Health Checks**:
   ```javascript
   // health-check.js
   import express from 'express';
   import { checkDatabaseConnection } from './database.js';
   import { checkRedisConnection } from './redis.js';
   
   const app = express();
   
   app.get('/health', async (req, res) => {
     const health = {
       status: 'healthy',
       timestamp: new Date().toISOString(),
       checks: {
         database: await checkDatabaseConnection(),
         redis: await checkRedisConnection(),
         memory: process.memoryUsage(),
         uptime: process.uptime()
       }
     };
     
     const allHealthy = Object.values(health.checks).every(check => 
       typeof check === 'object' ? check.status === 'healthy' : check
     );
     
     res.status(allHealthy ? 200 : 503).json(health);
   });
   ```

2. **Metrics Collection**:
   ```javascript
   // metrics.js
   import prometheus from 'prom-client';
   
   // Create metrics
   const httpRequestsTotal = new prometheus.Counter({
     name: 'http_requests_total',
     help: 'Total number of HTTP requests',
     labelNames: ['method', 'route', 'status_code']
   });
   
   const chatResponseTime = new prometheus.Histogram({
     name: 'chat_response_time_seconds',
     help: 'Chat response time in seconds',
     buckets: [0.1, 0.5, 1, 2, 5, 10]
   });
   
   // Export metrics endpoint
   app.get('/metrics', (req, res) => {
     res.set('Content-Type', prometheus.register.contentType);
     res.end(prometheus.register.metrics());
   });
   ```

3. **Structured Logging**:
   ```javascript
   // logger.js
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.errors({ stack: true }),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ 
         filename: '/var/log/symindx/error.log', 
         level: 'error' 
       }),
       new winston.transports.File({ 
         filename: '/var/log/symindx/combined.log' 
       }),
       new winston.transports.Console({
         format: winston.format.simple()
       })
     ]
   });
   
   export default logger;
   ```

### External Monitoring

1. **Prometheus and Grafana**:
   ```yaml
   # docker-compose.monitoring.yml
   version: '3.8'
   
   services:
     prometheus:
       image: prom/prometheus:latest
       ports:
         - "9090:9090"
       volumes:
         - ./prometheus.yml:/etc/prometheus/prometheus.yml
         - prometheus-data:/prometheus
   
     grafana:
       image: grafana/grafana:latest
       ports:
         - "3001:3000"
       environment:
         - GF_SECURITY_ADMIN_PASSWORD=admin
       volumes:
         - grafana-data:/var/lib/grafana
   
   volumes:
     prometheus-data:
     grafana-data:
   ```

2. **Prometheus Configuration**:
   ```yaml
   # prometheus.yml
   global:
     scrape_interval: 15s
   
   scrape_configs:
     - job_name: 'symindx'
       static_configs:
         - targets: ['localhost:3000']
       metrics_path: /metrics
       scrape_interval: 10s
   ```

3. **Uptime Monitoring**:
   ```bash
   # Simple uptime monitor script
   #!/bin/bash
   # monitor.sh
   
   URL="https://yourdomain.com/health"
   WEBHOOK_URL="https://hooks.slack.com/your-webhook-url"
   
   response=$(curl -s -o /dev/null -w "%{http_code}" $URL)
   
   if [ $response != "200" ]; then
     curl -X POST -H 'Content-type: application/json' \
       --data "{\"text\":\"SYMindX health check failed: HTTP $response\"}" \
       $WEBHOOK_URL
   fi
   
   # Add to crontab: * * * * * /path/to/monitor.sh
   ```

## Scaling and Load Balancing

### Horizontal Scaling

1. **Multi-Instance Setup**:
   ```javascript
   // ecosystem.config.js for multiple instances
   module.exports = {
     apps: [
       {
         name: 'symindx-3000',
         script: 'bun',
         args: 'start',
         env: { PORT: 3000 }
       },
       {
         name: 'symindx-3001',
         script: 'bun',
         args: 'start',
         env: { PORT: 3001 }
       },
       {
         name: 'symindx-3002',
         script: 'bun',
         args: 'start',
         env: { PORT: 3002 }
       }
     ]
   };
   ```

2. **Load Balancer Configuration**:
   ```nginx
   # /etc/nginx/sites-available/symindx-lb
   upstream symindx_cluster {
       least_conn;
       server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
       server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
       server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
   }
   
   server {
       listen 80;
       server_name yourdomain.com;
   
       location / {
           proxy_pass http://symindx_cluster;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           
           # Session stickiness for WebSocket
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           
           # Health check
           proxy_next_upstream error timeout invalid_header http_500;
       }
   }
   ```

### Database Scaling

1. **Read Replicas**:
   ```javascript
   // database.js - Master-slave configuration
   import { Pool } from 'pg';
   
   const masterPool = new Pool({
     connectionString: process.env.DATABASE_MASTER_URL,
     max: 20
   });
   
   const replicaPool = new Pool({
     connectionString: process.env.DATABASE_REPLICA_URL,
     max: 10
   });
   
   export function getWriteConnection() {
     return masterPool;
   }
   
   export function getReadConnection() {
     return replicaPool;
   }
   ```

2. **Connection Pooling**:
   ```javascript
   // Advanced connection pooling
   const pgPool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,                    // Maximum connections
     min: 5,                     // Minimum connections
     idleTimeoutMillis: 30000,   // Idle timeout
     connectionTimeoutMillis: 2000, // Connection timeout
     maxUses: 7500,              // Max uses per connection
   });
   ```

### Caching Strategy

1. **Redis Caching**:
   ```javascript
   // cache.js
   import Redis from 'ioredis';
   
   const redis = new Redis({
     host: process.env.REDIS_HOST,
     port: process.env.REDIS_PORT,
     retryDelayOnFailover: 100,
     maxRetriesPerRequest: 3
   });
   
   export async function getCachedResponse(key) {
     try {
       const cached = await redis.get(key);
       return cached ? JSON.parse(cached) : null;
     } catch (error) {
       console.error('Cache get error:', error);
       return null;
     }
   }
   
   export async function setCachedResponse(key, data, ttl = 300) {
     try {
       await redis.setex(key, ttl, JSON.stringify(data));
     } catch (error) {
       console.error('Cache set error:', error);
     }
   }
   ```

## Backup and Recovery

### Database Backups

1. **Automated PostgreSQL Backups**:
   ```bash
   #!/bin/bash
   # backup.sh
   
   BACKUP_DIR="/opt/backups/symindx"
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_FILE="symindx_backup_$DATE.sql"
   
   # Create backup directory
   mkdir -p $BACKUP_DIR
   
   # Create backup
   pg_dump $DATABASE_URL > "$BACKUP_DIR/$BACKUP_FILE"
   
   # Compress backup
   gzip "$BACKUP_DIR/$BACKUP_FILE"
   
   # Upload to S3 (optional)
   aws s3 cp "$BACKUP_DIR/$BACKUP_FILE.gz" s3://your-backup-bucket/
   
   # Clean old backups (keep 7 days)
   find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
   
   # Add to crontab: 0 2 * * * /path/to/backup.sh
   ```

2. **Application Data Backup**:
   ```bash
   #!/bin/bash
   # backup-data.sh
   
   APP_DATA_DIR="/opt/symindx/packages/agent/data"
   BACKUP_DIR="/opt/backups/symindx/data"
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Create backup
   tar -czf "$BACKUP_DIR/data_backup_$DATE.tar.gz" -C "$APP_DATA_DIR" .
   
   # Upload to cloud storage
   aws s3 cp "$BACKUP_DIR/data_backup_$DATE.tar.gz" s3://your-backup-bucket/data/
   ```

3. **Recovery Procedures**:
   ```bash
   # Database recovery
   psql $DATABASE_URL < backup_file.sql
   
   # Data recovery
   tar -xzf data_backup.tar.gz -C /opt/symindx/packages/agent/data/
   sudo chown -R symindx:symindx /opt/symindx/packages/agent/data/
   ```

### Disaster Recovery

1. **Infrastructure as Code**:
   ```bash
   # Terraform or similar to recreate infrastructure
   terraform plan
   terraform apply
   ```

2. **Recovery Checklist**:
   - [ ] Provision new infrastructure
   - [ ] Restore database from latest backup
   - [ ] Deploy application code
   - [ ] Restore application data
   - [ ] Update DNS records
   - [ ] Test all functionality
   - [ ] Notify users of restoration

## Maintenance

### Regular Maintenance Tasks

1. **System Updates**:
   ```bash
   #!/bin/bash
   # update.sh
   
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Update Node.js/Bun if needed
   bun upgrade
   
   # Update application dependencies
   cd /opt/symindx/packages/agent
   bun update
   
   # Restart services
   sudo -u symindx pm2 restart all
   
   # Clean up old logs
   find /var/log/symindx -name "*.log" -mtime +30 -delete
   ```

2. **Database Maintenance**:
   ```sql
   -- Weekly maintenance queries
   
   -- Analyze tables for query optimization
   ANALYZE;
   
   -- Vacuum to reclaim space
   VACUUM;
   
   -- Clean old memories (optional)
   DELETE FROM memories 
   WHERE timestamp < NOW() - INTERVAL '90 days' 
   AND importance < 0.3;
   
   -- Update table statistics
   VACUUM ANALYZE;
   ```

3. **Log Rotation**:
   ```bash
   # /etc/logrotate.d/symindx
   /var/log/symindx/*.log {
       daily
       missingok
       rotate 30
       compress
       delaycompress
       notifempty
       copytruncate
       postrotate
           systemctl reload rsyslog > /dev/null 2>&1 || true
       endscript
   }
   ```

### Performance Monitoring

1. **Resource Monitoring**:
   ```bash
   # System resource check
   #!/bin/bash
   
   # CPU usage
   cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
   
   # Memory usage
   mem_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
   
   # Disk usage
   disk_usage=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
   
   # Alert if usage too high
   if (( $(echo "$cpu_usage > 80" | bc -l) )); then
       echo "High CPU usage: $cpu_usage%"
   fi
   
   if (( $(echo "$mem_usage > 80" | bc -l) )); then
       echo "High memory usage: $mem_usage%"
   fi
   
   if [ $disk_usage -gt 80 ]; then
       echo "High disk usage: $disk_usage%"
   fi
   ```

2. **Application Performance**:
   ```javascript
   // performance-monitor.js
   import os from 'os';
   
   export function getSystemMetrics() {
     return {
       cpu: {
         usage: process.cpuUsage(),
         load: os.loadavg()
       },
       memory: {
         usage: process.memoryUsage(),
         free: os.freemem(),
         total: os.totalmem()
       },
       uptime: process.uptime(),
       timestamp: new Date()
     };
   }
   ```

## Troubleshooting

### Common Issues

1. **Application Won't Start**:
   ```bash
   # Check logs
   tail -f /var/log/symindx/error.log
   
   # Check PM2 status
   sudo -u symindx pm2 status
   sudo -u symindx pm2 logs
   
   # Check port conflicts
   sudo netstat -tlnp | grep :3000
   
   # Check environment variables
   sudo -u symindx printenv | grep DATABASE_URL
   ```

2. **Database Connection Issues**:
   ```bash
   # Test database connection
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check PostgreSQL logs
   sudo tail -f /var/log/postgresql/postgresql-15-main.log
   
   # Check connection limits
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **High Memory Usage**:
   ```bash
   # Check memory usage by process
   ps aux --sort=-%mem | head -10
   
   # Check for memory leaks
   sudo -u symindx pm2 monit
   
   # Restart if necessary
   sudo -u symindx pm2 restart all
   ```

4. **Slow Response Times**:
   ```bash
   # Check API response times
   curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/system/health"
   
   # Check database performance
   psql $DATABASE_URL -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
   
   # Check system load
   htop
   ```

### Debugging Commands

```bash
# Check service status
sudo systemctl status nginx
sudo systemctl status postgresql
sudo -u symindx pm2 status

# Check network connectivity
curl -I https://api.openai.com/v1/models
curl -I https://api.anthropic.com/v1/messages

# Check disk space
df -h
du -sh /opt/symindx/*

# Check memory and CPU
free -h
top -p $(pgrep -f symindx)

# Check logs
journalctl -u nginx -f
tail -f /var/log/symindx/combined.log
sudo -u symindx pm2 logs --lines 50
```

### Emergency Procedures

1. **Service Outage**:
   ```bash
   # Quick restart
   sudo systemctl restart nginx
   sudo -u symindx pm2 restart all
   
   # If database is down
   sudo systemctl restart postgresql
   
   # If everything fails, reboot
   sudo reboot
   ```

2. **Database Corruption**:
   ```bash
   # Stop application
   sudo -u symindx pm2 stop all
   
   # Restore from backup
   psql $DATABASE_URL < latest_backup.sql
   
   # Restart application
   sudo -u symindx pm2 start all
   ```

3. **Security Incident**:
   ```bash
   # Block suspicious IPs
   sudo ufw deny from suspicious_ip
   
   # Check access logs
   sudo tail -f /var/log/nginx/access.log
   
   # Rotate API keys if compromised
   # Update environment variables
   # Restart application
   ```

---

This deployment guide covers comprehensive deployment scenarios from development to production. Choose the deployment method that best fits your infrastructure requirements and scaling needs. Remember to always test deployments in a staging environment before deploying to production.