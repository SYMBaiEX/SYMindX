---
sidebar_position: 1
title: "Docker Deployment"
description: "Deploy SYMindX with Docker"
---

# Docker Deployment

Deploy SYMindX with Docker

## Docker Deployment

Deploy SYMindX using Docker for consistent, isolated environments.

### Quick Start

```bash
# Build image
docker build -t symindx:latest .

# Run container
docker run -d \
  --name symindx \
  -p 3001:3001 \
  -v ./config:/app/config \
  -v ./data:/app/data \
  --env-file .env \
  symindx:latest
```

### Dockerfile

```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN bun run build

# Runtime
EXPOSE 3001
CMD ["bun", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  symindx:
    build: .
    image: symindx:latest
    container_name: symindx
    ports:
      - "3001:3001"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
      - agent_memory:/app/data/memory
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: symindx-db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: symindx
      POSTGRES_USER: symindx
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: symindx-cache
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  agent_memory:
  postgres_data:
  redis_data:
```

### Multi-Stage Build

```dockerfile
# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime stage
FROM oven/bun:1-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "start"]
```

### Environment Configuration

```bash
# .env file
NODE_ENV=production
LOG_LEVEL=info

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgres://symindx:password@postgres:5432/symindx

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
```

### Production Optimization

#### Resource Limits
```yaml
services:
  symindx:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

#### Logging
```yaml
services:
  symindx:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

#### Networks
```yaml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

services:
  symindx:
    networks:
      - frontend
      - backend
  
  postgres:
    networks:
      - backend
```
