# Multi-stage build for SYMindX Website
FROM oven/bun:1.1.38-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl ca-certificates

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

FROM base AS builder

# Install all dependencies for build
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the website
RUN bun run build

FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built website
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]