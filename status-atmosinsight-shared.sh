#!/bin/bash

# AtmosInsight Status Check Script
# This script shows the current status of all services and ports
# Supports both separate and shared port configurations

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load port configuration from JSON file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config/ports.json"

# Check if shared port configuration exists
SHARED_CONFIG_FILE="$SCRIPT_DIR/config/ports-shared.json"
USE_SHARED_PORTS=false

if [ -f "$SHARED_CONFIG_FILE" ]; then
    echo -e "${BLUE}🔍 Found shared port configuration${NC}"
    CONFIG_FILE="$SHARED_CONFIG_FILE"
    USE_SHARED_PORTS=true
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Extract port values from JSON using jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed${NC}"
    exit 1
fi

# Check if using shared ports configuration
if [ "$USE_SHARED_PORTS" = true ]; then
    SHARED_PORT=$(jq -r ".shared_port" "$CONFIG_FILE")
    PROXY_PORT=$SHARED_PORT
    CATALOG_PORT=$SHARED_PORT
    WEB_PORT=$SHARED_PORT

    # Extract service-specific configurations
    PROXY_PATH=$(jq -r ".services.proxy.path" "$CONFIG_FILE")
    CATALOG_PATH=$(jq -r ".services.catalog.path" "$CONFIG_FILE")
    WEB_PATH=$(jq -r ".services.web.path" "$CONFIG_FILE")
    PROXY_HEALTH=$(jq -r ".services.proxy.health_endpoint" "$CONFIG_FILE")
    CATALOG_HEALTH=$(jq -r ".services.catalog.health_endpoint" "$CONFIG_FILE")
    WEB_HEALTH=$(jq -r ".services.web.health_endpoint" "$CONFIG_FILE")
else
    # Use separate ports configuration
    PROXY_PORT=$(jq -r ".proxy" "$CONFIG_FILE")
    CATALOG_PORT=$(jq -r ".catalog" "$CONFIG_FILE")
    WEB_PORT=$(jq -r ".web" "$CONFIG_FILE")
fi

echo -e "${BLUE}📊 AtmosInsight Status Check${NC}"
echo "================================"
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
if [ "$USE_SHARED_PORTS" = true ]; then
    echo "  Shared Port: $SHARED_PORT"
    echo "  - Proxy Server: $PROXY_PORT (path: $PROXY_PATH)"
    echo "  - Catalog API:  $CATALOG_PORT (path: $CATALOG_PATH)"
    echo "  - Web App:     $WEB_PORT (path: $WEB_PATH)"
else
    echo "  Proxy Server Port: $PROXY_PORT"
    echo "  Catalog API Port: $CATALOG_PORT"
    echo "  Web App Port: $WEB_PORT"
fi
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    # Try multiple methods to check port usage
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    elif ss -tlnp | grep -q ":$port "; then
        return 0  # Port is in use (using ss)
    else
        return 1  # Port is free
    fi
}

# Function to check if a specific service is responding on a port
check_service() {
    local port=$1
    local health_endpoint=$2
    local service_name=$3

    # For shared ports, check if the specific service is responding
    if [ "$USE_SHARED_PORTS" = true ]; then
        # Try to connect to the health endpoint with service path
        if curl -s --max-time 5 "http://localhost:$port$health_endpoint" >/dev/null 2>&1; then
            return 0  # Service is responding
        else
            return 1  # Service is not responding
        fi
    else
        # For separate ports, just check if port is in use
        check_port $port
    fi
}

# Function to get detailed process info on port
get_port_details() {
    local port=$1
    if check_port $port; then
        local pid=$(lsof -ti:$port)
        local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        local user=$(ps -p $pid -o user= 2>/dev/null || echo "unknown")
        local time=$(ps -p $pid -o etime= 2>/dev/null || echo "unknown")
        echo "$pid|$cmd|$user|$time"
    else
        echo ""
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "proxy-server" ] || [ ! -d "tiling-services" ]; then
    echo -e "${RED}❌ Error: This script must be run from the AtmosInsight root directory${NC}"
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./status-atmosinsight-shared.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Check proxy-server status
echo -e "${BLUE}🔌 Proxy Server${NC}"
echo "----------------------------------------"

if [ "$USE_SHARED_PORTS" = true ]; then
    if check_service $SHARED_PORT "$PROXY_HEALTH" "proxy-server"; then
        local details=$(get_port_details $SHARED_PORT)
        IFS='|' read -r pid cmd user time <<< "$details"

        echo -e "${GREEN}✅ Status: RUNNING${NC}"
        echo -e "${BLUE}   Port:${NC} $SHARED_PORT (shared)"
        echo -e "${BLUE}   Path:${NC} $PROXY_PATH"
        echo -e "${BLUE}   PID:${NC} $pid"
        echo -e "${BLUE}   Command:${NC} $cmd"
        echo -e "${BLUE}   User:${NC} $user"
        echo -e "${BLUE}   Uptime:${NC} $time"

        # Health check is already done by check_service
        echo -e "${GREEN}   Health: RESPONDING${NC}"
    else
        echo -e "${RED}❌ Status: STOPPED${NC}"
        echo -e "${BLUE}   Port:${NC} $SHARED_PORT (shared)"
        echo -e "${BLUE}   Path:${NC} $PROXY_PATH"
        echo -e "${BLUE}   Health: NOT RESPONDING${NC}"
    fi
else
    if check_port $PROXY_PORT; then
        local details=$(get_port_details $PROXY_PORT)
        IFS='|' read -r pid cmd user time <<< "$details"

        echo -e "${GREEN}✅ Status: RUNNING${NC}"
        echo -e "${BLUE}   PID:${NC} $pid"
        echo -e "${BLUE}   Command:${NC} $cmd"
        echo -e "${BLUE}   User:${NC} $user"
        echo -e "${BLUE}   Uptime:${NC} $time"

        # Check if it's responding
        if curl -s http://localhost:$PROXY_PORT/health >/dev/null 2>&1; then
            echo -e "${GREEN}   Health: RESPONDING${NC}"
        else
            echo -e "${YELLOW}   Health: NOT RESPONDING${NC}"
        fi
    else
        echo -e "${RED}❌ Status: STOPPED${NC}"
        echo -e "${BLUE}   Port:${NC} FREE"
    fi
fi

echo ""

# Check catalog-api status
echo -e "${BLUE}📚 Catalog API${NC}"
echo "----------------------------------------"

if [ "$USE_SHARED_PORTS" = true ]; then
    if check_service $SHARED_PORT "$CATALOG_HEALTH" "catalog-api"; then
        local details=$(get_port_details $SHARED_PORT)
        IFS='|' read -r pid cmd user time <<< "$details"

        echo -e "${GREEN}✅ Status: RUNNING${NC}"
        echo -e "${BLUE}   Port:${NC} $SHARED_PORT (shared)"
        echo -e "${BLUE}   Path:${NC} $CATALOG_PATH"
        echo -e "${BLUE}   PID:${NC} $pid"
        echo -e "${BLUE}   Command:${NC} $cmd"
        echo -e "${BLUE}   User:${NC} $user"
        echo -e "${BLUE}   Uptime:${NC} $time"

        # Health check is already done by check_service
        echo -e "${GREEN}   Health: RESPONDING${NC}"
    else
        echo -e "${RED}❌ Status: STOPPED${NC}"
        echo -e "${BLUE}   Port:${NC} $SHARED_PORT (shared)"
        echo -e "${BLUE}   Path:${NC} $CATALOG_PATH"
        echo -e "${BLUE}   Health: NOT RESPONDING${NC}"
    fi
else
    if check_port $CATALOG_PORT; then
        local details=$(get_port_details $CATALOG_PORT)
        IFS='|' read -r pid cmd user time <<< "$details"

        echo -e "${GREEN}✅ Status: RUNNING${NC}"
        echo -e "${BLUE}   PID:${NC} $pid"
        echo -e "${BLUE}   Command:${NC} $cmd"
        echo -e "${BLUE}   User:${NC} $user"
        echo -e "${BLUE}   Uptime:${NC} $time"

        # Check if it's responding
        if curl -s http://localhost:$CATALOG_PORT/health >/dev/null 2>&1; then
            echo -e "${GREEN}   Health: RESPONDING${NC}"
        else
            echo -e "${YELLOW}   Health: NOT RESPONDING${NC}"
        fi
    else
        echo -e "${RED}❌ Status: STOPPED${NC}"
        echo -e "${BLUE}   Port:${NC} FREE"
    fi
fi

echo ""

# Check Next.js web app status
echo -e "${BLUE}📱 Next.js Web App${NC}"
echo "----------------------------------------"

if [ "$USE_SHARED_PORTS" = true ]; then
    if check_service $SHARED_PORT "$WEB_HEALTH" "Next.js web app"; then
        local details=$(get_port_details $SHARED_PORT)
        IFS='|' read -r pid cmd user time <<< "$details"

        echo -e "${GREEN}✅ Status: RUNNING${NC}"
        echo -e "${BLUE}   Port:${NC} $SHARED_PORT (shared)"
        echo -e "${BLUE}   Path:${NC} $WEB_PATH"
        echo -e "${BLUE}   PID:${NC} $pid"
        echo -e "${BLUE}   Command:${NC} $cmd"
        echo -e "${BLUE}   User:${NC} $user"
        echo -e "${BLUE}   Uptime:${NC} $time"

        # Health check is already done by check_service
        echo -e "${GREEN}   Health: RESPONDING${NC}"
    else
        echo -e "${RED}❌ Status: STOPPED${NC}"
        echo -e "${BLUE}   Port:${NC} $SHARED_PORT (shared)"
        echo -e "${BLUE}   Path:${NC} $WEB_PATH"
        echo -e "${BLUE}   Health: NOT RESPONDING${NC}"
    fi
else
    if check_port $WEB_PORT; then
        local details=$(get_port_details $WEB_PORT)
        IFS='|' read -r pid cmd user time <<< "$details"

        echo -e "${GREEN}✅ Status: RUNNING${NC}"
        echo -e "${BLUE}   PID:${NC} $pid"
        echo -e "${BLUE}   Command:${NC} $cmd"
        echo -e "${BLUE}   User:${NC} $user"
        echo -e "${BLUE}   Uptime:${NC} $time"

        # Check if it's responding
        if curl -s http://localhost:$WEB_PORT >/dev/null 2>&1; then
            echo -e "${GREEN}   Health: RESPONDING${NC}"
        else
            echo -e "${YELLOW}   Health: NOT RESPONDING${NC}"
        fi
    else
        echo -e "${RED}❌ Status: STOPPED${NC}"
        echo -e "${BLUE}   Port:${NC} FREE"
    fi
fi

echo ""

# Check for any other pnpm processes
echo -e "${BLUE}🔍 Other pnpm Processes${NC}"
echo "----------------------------------------"

PNPM_PROCESSES=$(pgrep -f "pnpm run dev" 2>/dev/null || true)

if [ -n "$PNPM_PROCESSES" ]; then
    echo -e "${YELLOW}⚠️  Found additional pnpm processes:${NC}"
    echo "$PNPM_PROCESSES" | while read -r pid; do
        local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        local user=$(ps -p $pid -o user= 2>/dev/null || echo "unknown")
        local time=$(ps -p $pid -o etime= 2>/dev/null || echo "unknown")
        echo -e "${BLUE}   PID $pid:${NC} $cmd (User: $user, Uptime: $time)"
    done
else
    echo -e "${GREEN}✅ No additional pnpm processes found${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}📋 Summary${NC}"
echo "========================================"

PROXY_RUNNING=false
CATALOG_RUNNING=false
WEB_RUNNING=false

if [ "$USE_SHARED_PORTS" = true ]; then
    # For shared ports, check each service individually
    if check_service $SHARED_PORT "$PROXY_HEALTH" "proxy-server"; then
        PROXY_RUNNING=true
    fi

    if check_service $SHARED_PORT "$CATALOG_HEALTH" "catalog-api"; then
        CATALOG_RUNNING=true
    fi

    if check_service $SHARED_PORT "$WEB_HEALTH" "Next.js web app"; then
        WEB_RUNNING=true
    fi
else
    # For separate ports, check each port individually
    if check_port $PROXY_PORT; then
        PROXY_RUNNING=true
    fi

    if check_port $CATALOG_PORT; then
        CATALOG_RUNNING=true
    fi

    if check_port $WEB_PORT; then
        WEB_RUNNING=true
    fi
fi

if [ "$PROXY_RUNNING" = true ] && [ "$CATALOG_RUNNING" = true ] && [ "$WEB_RUNNING" = true ]; then
    echo -e "${GREEN}🎉 All services are running!${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}🌐 All services available on: http://localhost:$SHARED_PORT${NC}"
        echo -e "${BLUE}   Proxy Server:${NC} http://localhost:$SHARED_PORT$PROXY_PATH"
        echo -e "${BLUE}   Catalog API:${NC}  http://localhost:$SHARED_PORT$CATALOG_PATH"
        echo -e "${BLUE}   Web App:${NC}     http://localhost:$SHARED_PORT$WEB_PATH"
    else
        echo -e "${BLUE}🌐 Open your browser to: http://localhost:$WEB_PORT${NC}"
    fi
elif [ "$PROXY_RUNNING" = true ] && [ "$CATALOG_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only proxy-server and catalog-api are running${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}💡 Web App should be available at: http://localhost:$SHARED_PORT$WEB_PATH${NC}"
    else
        echo -e "${BLUE}💡 Start web app: cd apps/web && pnpm run dev${NC}"
    fi
elif [ "$PROXY_RUNNING" = true ] && [ "$WEB_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only proxy-server and web app are running${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}💡 Catalog API should be available at: http://localhost:$SHARED_PORT$CATALOG_PATH${NC}"
    else
        echo -e "${BLUE}💡 Start catalog-api: cd tiling-services/catalog-api && pnpm run start${NC}"
    fi
elif [ "$CATALOG_RUNNING" = true ] && [ "$WEB_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only catalog-api and web app are running${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}💡 Proxy Server should be available at: http://localhost:$SHARED_PORT$PROXY_PATH${NC}"
    else
        echo -e "${BLUE}💡 Start proxy-server: cd proxy-server && pnpm run dev${NC}"
    fi
elif [ "$PROXY_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only proxy-server is running${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}💡 Catalog API should be available at: http://localhost:$SHARED_PORT$CATALOG_PATH${NC}"
        echo -e "${BLUE}💡 Web App should be available at: http://localhost:$SHARED_PORT$WEB_PATH${NC}"
    else
        echo -e "${BLUE}💡 Start catalog-api: cd tiling-services/catalog-api && pnpm run start${NC}"
        echo -e "${BLUE}💡 Start web app: cd apps/web && pnpm run dev${NC}"
    fi
elif [ "$CATALOG_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only catalog-api is running${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}💡 Proxy Server should be available at: http://localhost:$SHARED_PORT$PROXY_PATH${NC}"
        echo -e "${BLUE}💡 Web App should be available at: http://localhost:$SHARED_PORT$WEB_PATH${NC}"
    else
        echo -e "${BLUE}💡 Start proxy-server: cd proxy-server && pnpm run dev${NC}"
        echo -e "${BLUE}💡 Start web app: cd apps/web && pnpm run dev${NC}"
    fi
elif [ "$WEB_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only Next.js web app is running${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}💡 Proxy Server should be available at: http://localhost:$SHARED_PORT$PROXY_PATH${NC}"
        echo -e "${BLUE}💡 Catalog API should be available at: http://localhost:$SHARED_PORT$CATALOG_PATH${NC}"
    else
        echo -e "${BLUE}💡 Start proxy-server: cd proxy-server && pnpm run dev${NC}"
        echo -e "${BLUE}💡 Start catalog-api: cd tiling-services/catalog-api && pnpm run start${NC}"
    fi
else
    echo -e "${RED}❌ No services are running${NC}"
    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}💡 Start all services: ./start-atmosinsight-shared.sh${NC}"
    else
        echo -e "${BLUE}💡 Start all services: ./start-atmosinsight.sh${NC}"
    fi
fi

echo ""

# Quick actions
echo -e "${BLUE}🚀 Quick Actions${NC}"
echo "========================================"
if [ "$USE_SHARED_PORTS" = true ]; then
    echo -e "${GREEN}./start-atmosinsight-shared.sh${NC}  - Start all services"
    echo -e "${RED}./stop-atmosinsight-shared.sh${NC}   - Stop all services"
    echo -e "${BLUE}./status-atmosinsight-shared.sh${NC} - Show this status (current script)"
else
    echo -e "${GREEN}./start-atmosinsight.sh${NC}  - Start all services"
    echo -e "${RED}./stop-atmosinsight.sh${NC}   - Stop all services"
    echo -e "${BLUE}./status-atmosinsight.sh${NC} - Show this status"
fi
echo ""
echo -e "${YELLOW}💡 Run this script anytime to check status${NC}"

# Package.json scripts (recommended)
echo -e "${BLUE}📦 Package.json Scripts (Recommended)${NC}"
echo "========================================"
echo -e "${GREEN}pnpm start${NC}     - Start all services"
echo -e "${BLUE}pnpm status${NC}    - Show this status"
echo -e "${RED}pnpm stop${NC}      - Stop all services"
echo -e "${YELLOW}pnpm restart${NC}  - Restart all services"
echo ""
echo -e "${YELLOW}💡 Use pnpm commands from anywhere in the monorepo${NC}"
