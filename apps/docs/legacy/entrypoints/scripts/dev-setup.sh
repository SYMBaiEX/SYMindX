#!/bin/bash

# SYMindX Development Environment Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️  Setting up SYMindX development environment${NC}"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create development environment file if it doesn't exist
if [ ! -f ".env.development" ]; then
    echo -e "${YELLOW}📝 Creating development environment file${NC}"
    cp .env.development.example .env.development 2>/dev/null || echo "Please create .env.development file manually"
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating development directories${NC}"
mkdir -p data/logs
mkdir -p data/db
mkdir -p data/memories
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning

# Start development services
echo -e "${BLUE}🚀 Starting development services${NC}"
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d postgres-dev redis-dev

# Wait for database to be ready
echo -e "${BLUE}⏳ Waiting for database to be ready${NC}"
sleep 10

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies${NC}"
bun install

# Build the project
echo -e "${BLUE}🏗️  Building project${NC}"
bun run build

echo -e "${GREEN}✅ Development environment setup complete!${NC}"
echo -e "${BLUE}🚀 To start development:${NC}"
echo -e "  • Run: ${YELLOW}bun dev${NC}"
echo -e "  • Or with Docker: ${YELLOW}docker-compose -f docker-compose.dev.yml up${NC}"
echo -e "${BLUE}📊 Development URLs:${NC}"
echo -e "  • Application: http://localhost:3000"
echo -e "  • API: http://localhost:8080"
echo -e "  • Website: http://localhost:3001"
echo -e "  • Database: localhost:5432"
echo -e "  • Redis: localhost:6379"