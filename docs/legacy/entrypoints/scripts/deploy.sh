#!/bin/bash

# SYMindX Production Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.${ENVIRONMENT}"

echo -e "${BLUE}🚀 Starting SYMindX deployment for ${ENVIRONMENT} environment${NC}"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file $ENV_FILE not found${NC}"
    echo -e "${YELLOW}💡 Please create $ENV_FILE with your configuration${NC}"
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

echo -e "${BLUE}📋 Pre-deployment checks${NC}"

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check required environment variables
REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "OPENAI_API_KEY"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Create necessary directories
echo -e "${BLUE}📁 Creating directories${NC}"
mkdir -p docker/nginx/ssl
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning
mkdir -p monitoring/prometheus/rules

# Generate SSL certificates if they don't exist
if [ ! -f "docker/nginx/ssl/cert.pem" ]; then
    echo -e "${YELLOW}🔐 Generating self-signed SSL certificates${NC}"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/key.pem \
        -out docker/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Build and deploy
echo -e "${BLUE}🏗️  Building Docker images${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

echo -e "${BLUE}🚀 Starting services${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy${NC}"
sleep 30

# Check service health
SERVICES=("symindx-core" "symindx-postgres" "symindx-redis")
for service in "${SERVICES[@]}"; do
    if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up (healthy)"; then
        echo -e "${GREEN}✅ $service is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  $service is not healthy yet${NC}"
    fi
done

# Run database migrations if needed
echo -e "${BLUE}🗄️  Running database setup${NC}"
docker-compose -f "$COMPOSE_FILE" exec -T symindx-core bun run db:migrate || true

# Display deployment information
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Service URLs:${NC}"
echo -e "  • Main Application: http://localhost:${HTTP_PORT:-80}"
echo -e "  • API: http://localhost:${HTTP_PORT:-80}/api"
echo -e "  • Website Dashboard: http://localhost:${WEBSITE_PORT:-3001}"
echo -e "  • Grafana Monitoring: http://localhost:${GRAFANA_PORT:-3002}"
echo -e "  • Prometheus: http://localhost:${PROMETHEUS_PORT:-9090}"
echo -e "  • Jaeger Tracing: http://localhost:${JAEGER_UI_PORT:-16686}"

echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "  1. Configure your AI provider API keys in $ENV_FILE"
echo -e "  2. Set up your platform integrations (Telegram, Discord, etc.)"
echo -e "  3. Create your first agent using the API or dashboard"
echo -e "  4. Monitor the system using Grafana dashboards"

echo -e "${BLUE}🔧 Useful commands:${NC}"
echo -e "  • View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo -e "  • Stop services: docker-compose -f $COMPOSE_FILE down"
echo -e "  • Update services: ./scripts/deploy.sh $ENVIRONMENT"