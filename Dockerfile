# Multi-stage build for SYMindX Enterprise
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    curl \
    ca-certificates

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY mind-agents/package*.json ./mind-agents/
COPY website/package*.json ./website/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

FROM base AS builder

# Install all dependencies for build
RUN npm ci

# Copy source code
COPY . .

# Build the applications
RUN npm run build

FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tini

# Create non-root user
RUN addgroup -g 1001 -S symindx && \
    adduser -S symindx -u 1001

# Set working directory
WORKDIR /app

# Copy built applications
COPY --from=builder --chown=symindx:symindx /app/mind-agents/dist ./mind-agents/dist
COPY --from=builder --chown=symindx:symindx /app/website/dist ./website/dist
COPY --from=builder --chown=symindx:symindx /app/node_modules ./node_modules
COPY --from=builder --chown=symindx:symindx /app/mind-agents/node_modules ./mind-agents/node_modules
COPY --from=builder --chown=symindx:symindx /app/package*.json ./

# Copy configuration
COPY --chown=symindx:symindx config/ ./config/

# Create data directories
RUN mkdir -p /app/data/logs /app/data/events /app/data/memories && \
    chown -R symindx:symindx /app/data

# Switch to non-root user
USER symindx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000 8080 9090

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["npm", "start"]