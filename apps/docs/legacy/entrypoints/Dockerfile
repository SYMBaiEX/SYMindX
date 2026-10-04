# Multi-stage build for SYMindX Production
FROM oven/bun:1.1.38-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    curl \
    ca-certificates \
    dumb-init

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lockb ./
COPY mind-agents/package.json ./mind-agents/
COPY website/package.json ./website/
COPY create-symindx/package.json ./create-symindx/

# Install dependencies
RUN bun install --frozen-lockfile --production

FROM base AS builder

# Install all dependencies for build (including dev dependencies)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the applications
RUN bun run build:all

FROM oven/bun:1.1.38-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    dumb-init \
    sqlite

# Create non-root user
RUN addgroup -g 1001 -S symindx && \
    adduser -S symindx -u 1001

# Set working directory
WORKDIR /app

# Copy built applications and dependencies
COPY --from=builder --chown=symindx:symindx /app/mind-agents/dist ./mind-agents/dist
COPY --from=builder --chown=symindx:symindx /app/website/dist ./website/dist
COPY --from=builder --chown=symindx:symindx /app/create-symindx/dist ./create-symindx/dist
COPY --from=builder --chown=symindx:symindx /app/node_modules ./node_modules
COPY --from=builder --chown=symindx:symindx /app/package.json ./
COPY --from=builder --chown=symindx:symindx /app/bun.lockb ./

# Copy runtime configuration
COPY --chown=symindx:symindx mind-agents/src/characters ./mind-agents/src/characters

# Create data directories with proper permissions
RUN mkdir -p /app/data/logs /app/data/events /app/data/memories /app/data/db && \
    chown -R symindx:symindx /app/data

# Create config directory
RUN mkdir -p /app/config && chown -R symindx:symindx /app/config

# Switch to non-root user
USER symindx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000 8080 9090

# Use dumb-init as init system
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["bun", "start:agent"]