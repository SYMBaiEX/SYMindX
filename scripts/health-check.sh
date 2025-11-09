#!/bin/bash

# SYMindX Health Check Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENVIRONMENT" = "development" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
fi

echo -e "${BLUE}🏥 SYMindX Health Check - ${ENVIRONMENT} environment${NC}"

# Function to check service health
check_service_health() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "  Checking $service_name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        return 1
    fi
}

# Function to check Docker service status
check_docker_service() {
    local service_name=$1
    echo -n "  Docker service $service_name... "
    
    if docker-compose -f "$COMPOSE_FILE" ps "$service_name" | grep -q "Up"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not running${NC}"
        return 1
    fi
}

# Check Docker services
echo -e "${BLUE}🐳 Docker Services Status:${NC}"
DOCKER_SERVICES=("symindx-core" "symindx-postgres" "symindx-redis")

if [ "$ENVIRONMENT" = "development" ]; then
    DOCKER_SERVICES=("postgres-dev" "redis-dev")
fi

all_services_healthy=true

for service in "${DOCKER_SERVICES[@]}"; do
    if ! check_docker_service "$service"; then
        all_services_healthy=false
    fi
done

# Check HTTP endpoints
echo -e "${BLUE}🌐 HTTP Endpoints Health:${NC}"

ENDPOINTS=(
    "Core Application:http://localhost:3000/health"
    "API Server:http://localhost:8080/health"
    "Website:http://localhost:3001/health"
)

if [ "$ENVIRONMENT" = "production" ]; then
    ENDPOINTS+=(
        "Grafana:http://localhost:3002/api/health"
        "Prometheus:http://localhost:9090/-/healthy"
    )
fi

for endpoint in "${ENDPOINTS[@]}"; do
    IFS=':' read -r name url <<< "$endpoint"
    if ! check_service_health "$name" "$url"; then
        all_services_healthy=false
    fi
done

# Check database connectivity
echo -e "${BLUE}🗄️  Database Connectivity:${NC}"
echo -n "  PostgreSQL connection... "

if [ "$ENVIRONMENT" = "development" ]; then
    DB_CHECK_CMD="docker-compose -f $COMPOSE_FILE exec -T postgres-dev pg_isready -U symindx -d symindx_dev"
else
    DB_CHECK_CMD="docker-compose -f $COMPOSE_FILE exec -T symindx-postgres pg_isready -U symindx -d symindx"
fi

if $DB_CHECK_CMD &>/dev/null; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    all_services_healthy=false
fi

# Check Redis connectivity
echo -n "  Redis connection... "
if [ "$ENVIRONMENT" = "development" ]; then
    REDIS_CHECK_CMD="docker-compose -f $COMPOSE_FILE exec -T redis-dev redis-cli ping"
else
    REDIS_CHECK_CMD="docker-compose -f $COMPOSE_FILE exec -T symindx-redis redis-cli ping"
fi

if $REDIS_CHECK_CMD | grep -q "PONG"; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    all_services_healthy=false
fi

# Overall health status
echo -e "\n${BLUE}📊 Overall Health Status:${NC}"
if [ "$all_services_healthy" = true ]; then
    echo -e "${GREEN}✅ All systems operational${NC}"
    exit 0
else
    echo -e "${RED}❌ Some systems are unhealthy${NC}"
    echo -e "${YELLOW}💡 Run 'docker-compose -f $COMPOSE_FILE logs' to check logs${NC}"
    exit 1
fi