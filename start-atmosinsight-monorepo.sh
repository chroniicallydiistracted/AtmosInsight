#!/bin/bash

# AtmosInsight Monorepo Startup Script
# This script starts all services in a pnpm monorepo with shared port support

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load port configuration from JSON file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config/ports-shared.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

# Extract port values from JSON using jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required but not installed${NC}"
    exit 1
fi

SHARED_PORT=$(jq -r ".shared_port" "$CONFIG_FILE")
PROXY_PATH=$(jq -r ".services.proxy.path" "$CONFIG_FILE")
CATALOG_PATH=$(jq -r ".services.catalog.path" "$CONFIG_FILE")
WEB_PATH=$(jq -r ".services.web.path" "$CONFIG_FILE")
PROXY_HEALTH=$(jq -r ".services.proxy.health_endpoint" "$CONFIG_FILE")
CATALOG_HEALTH=$(jq -r ".services.catalog.health_endpoint" "$CONFIG_FILE")
WEB_HEALTH=$(jq -r ".services.web.health_endpoint" "$CONFIG_FILE")

echo -e "${BLUE}🚀 AtmosInsight Monorepo Startup Script${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Shared Port: $SHARED_PORT"
echo "  - Proxy Server: $PROXY_PATH"
echo "  - Catalog API:  $CATALOG_PATH"
echo "  - Web App:     $WEB_PATH"
echo ""

# Build packages if needed
echo -e "${BLUE}🔨 Building packages...${NC}"
if [ -d "packages" ]; then
    echo "Found packages directory, building packages..."
    if command -v pnpm &> /dev/null; then
        # First install all dependencies to ensure packages are linked
        echo "Installing all dependencies..."
        if pnpm install; then
            echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to install dependencies${NC}"
            exit 1
        fi

        # Then build the shared-utils package
        if pnpm --filter shared-utils build; then
            echo -e "${GREEN}✅ shared-utils package built successfully${NC}"

            # Copy compiled files to proxy-server's node_modules
            echo "Copying compiled files to proxy-server's node_modules..."
            if [ -d "packages/shared-utils/dist" ] && [ -d "proxy-server/node_modules/@atmos/shared-utils" ]; then
                cp packages/shared-utils/dist/* proxy-server/node_modules/@atmos/shared-utils/
                echo -e "${GREEN}✅ Compiled files copied successfully${NC}"
            else
                echo -e "${YELLOW}⚠️  Could not copy compiled files${NC}"
            fi
        else
            echo -e "${RED}❌ Failed to build shared-utils package${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  pnpm not found, skipping package build${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No packages directory found, skipping package build${NC}"
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

    # Try to connect to the health endpoint with service path
    if curl -s --max-time 5 "http://localhost:$port$health_endpoint" >/dev/null 2>&1; then
        return 0  # Service is responding
    else
        return 1  # Service is not responding
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2

    echo -e "${YELLOW}⚠️  Port $port is in use by $service_name${NC}"
    echo -e "${YELLOW}🔄 Attempting to kill process on port $port...${NC}"

    # Get PID of process using the port
    local pid=$(lsof -ti:$port)

    if [ -n "$pid" ]; then
        echo -e "${YELLOW}📋 Found process PID: $pid${NC}"

        # Try graceful shutdown first
        if kill -TERM $pid 2>/dev/null; then
            echo -e "${YELLOW}⏳ Waiting for graceful shutdown...${NC}"
            sleep 3

            # Check if process is still running
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}⚠️  Graceful shutdown failed, forcing kill...${NC}"
                if kill -KILL $pid 2>/dev/null; then
                    echo -e "${GREEN}✅ Process killed successfully${NC}"
                    sleep 1
                else
                    echo -e "${RED}❌ Failed to kill process on port $port${NC}"
                    echo -e "${RED}💡 Please manually stop the service using port $port and try again${NC}"
                    exit 1
                fi
            else
                echo -e "${GREEN}✅ Process terminated gracefully${NC}"
            fi
        else
            echo -e "${RED}❌ Failed to send termination signal to process on port $port${NC}"
            echo -e "${RED}💡 Please manually stop the service using port $port and try again${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Could not find process using port $port${NC}"
        echo -e "${RED}💡 Please manually stop the service using port $port and try again${NC}"
        exit 1
    fi
}

# Function to wait for port to be free
wait_for_port() {
    local port=$1
    local max_wait=10
    local wait_time=0

    echo -e "${BLUE}⏳ Waiting for port $port to be free...${NC}"

    while check_port $port && [ $wait_time -lt $max_wait ]; do
        sleep 1
        wait_time=$((wait_time + 1))
        echo -e "${BLUE}⏳ Still waiting... ($wait_time/$max_wait seconds)${NC}"
    done

    if check_port $port; then
        echo -e "${RED}❌ Port $port is still in use after $max_wait seconds${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Port $port is now free${NC}"
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "proxy-server" ] || [ ! -d "tiling-services" ]; then
    echo -e "${RED}❌ Error: This script must be run from the AtmosInsight root directory${NC}"
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./start-atmosinsight-monorepo.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Check and kill conflicting processes
echo -e "${BLUE}🔍 Checking for port conflicts...${NC}"

if check_port $SHARED_PORT; then
    echo -e "${YELLOW}⚠️  Shared port $SHARED_PORT is in use${NC}"
    echo -e "${YELLOW}🔄 Attempting to kill processes on port $SHARED_PORT...${NC}"

    # Try to kill any process on the shared port
    pid=$(lsof -ti:$SHARED_PORT)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}📋 Found process PID: $pid${NC}"

        # Try graceful shutdown first
        if kill -TERM $pid 2>/dev/null; then
            echo -e "${YELLOW}⏳ Waiting for graceful shutdown...${NC}"
            sleep 3

            # Check if process is still running
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}⚠️  Graceful shutdown failed, forcing kill...${NC}"
                if kill -KILL $pid 2>/dev/null; then
                    echo -e "${GREEN}✅ Process killed successfully${NC}"
                    sleep 1
                else
                    echo -e "${RED}❌ Failed to kill process on port $SHARED_PORT${NC}"
                    echo -e "${RED}💡 Please manually stop the service using port $SHARED_PORT and try again${NC}"
                    exit 1
                fi
            else
                echo -e "${GREEN}✅ Process terminated gracefully${NC}"
            fi
        else
            echo -e "${RED}❌ Failed to send termination signal to process on port $SHARED_PORT${NC}"
            echo -e "${RED}💡 Please manually stop the service using port $SHARED_PORT and try again${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Could not find process using port $SHARED_PORT${NC}"
        echo -e "${RED}💡 Please manually stop the service using port $SHARED_PORT and try again${NC}"
        exit 1
    fi

    wait_for_port $SHARED_PORT
fi

echo -e "${GREEN}✅ All ports are free${NC}"
echo ""

# Start services in order
echo -e "${BLUE}📋 Starting services in order:${NC}"
echo "1. Proxy Server (port $SHARED_PORT, path: $PROXY_PATH)"
echo "2. Catalog API (port $SHARED_PORT, path: $CATALOG_PATH) - NOT IMPLEMENTED YET"
echo "3. Next.js Web App (port $SHARED_PORT, path: $WEB_PATH)"
echo ""

# Start Proxy Server
echo -e "${BLUE}🚀 Starting Proxy Server...${NC}"
if pnpm --filter proxy-server run dev > proxy-server.log 2>&1 & then
    pid=$!
    echo -e "${GREEN}✅ Proxy Server started with PID: $pid${NC}"

    # Wait for service to be ready
    echo -e "${BLUE}⏳ Waiting for Proxy Server to be ready...${NC}"
    max_wait=30
    wait_time=0

    while ! check_service $SHARED_PORT "$PROXY_HEALTH" && [ $wait_time -lt $max_wait ]; do
        sleep 1
        wait_time=$((wait_time + 1))
        echo -e "${BLUE}⏳ Still waiting... ($wait_time/$max_wait seconds)${NC}"
    done

    if check_service $SHARED_PORT "$PROXY_HEALTH"; then
        echo -e "${GREEN}✅ Proxy Server is ready${NC}"
    else
        echo -e "${RED}❌ Proxy Server failed to start${NC}"
        echo -e "${RED}📋 Check logs: proxy-server.log${NC}"
        echo -e "${RED}📋 Last 20 lines of log:${NC}"
        tail -n 20 proxy-server.log
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to start Proxy Server${NC}"
    echo -e "${RED}📋 Check logs: proxy-server.log${NC}"
    exit 1
fi

# Catalog API is not implemented yet
echo -e "${YELLOW}⚠️  Catalog API is not implemented yet, skipping...${NC}"


# Start Next.js Web App
echo -e "${BLUE}🚀 Starting Next.js Web App...${NC}"
if pnpm --filter web run dev > web-app.log 2>&1 & then
    pid=$!
    echo -e "${GREEN}✅ Next.js Web App started with PID: $pid${NC}"

    # Wait for service to be ready
    echo -e "${BLUE}⏳ Waiting for Next.js Web App to be ready...${NC}"
    max_wait=30
    wait_time=0

    while ! check_service $SHARED_PORT "$WEB_HEALTH" && [ $wait_time -lt $max_wait ]; do
        sleep 1
        wait_time=$((wait_time + 1))
        echo -e "${BLUE}⏳ Still waiting... ($wait_time/$max_wait seconds)${NC}"
    done

    if check_service $SHARED_PORT "$WEB_HEALTH"; then
        echo -e "${GREEN}✅ Next.js Web App is ready${NC}"
    else
        echo -e "${RED}❌ Next.js Web App failed to start${NC}"
        echo -e "${RED}📋 Check logs: web-app.log${NC}"
        echo -e "${RED}📋 Last 20 lines of log:${NC}"
        tail -n 20 web-app.log
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to start Next.js Web App${NC}"
    echo -e "${RED}📋 Check logs: web-app.log${NC}"
    exit 1
fi

# Wait for all services to be ready
sleep 3

echo ""
echo -e "${GREEN}🎉 Startup complete! Services are running on shared port $SHARED_PORT${NC}"
echo "=========================================="
echo -e "${BLUE}🌐 All services available on: http://localhost:$SHARED_PORT${NC}"
echo -e "${BLUE}   Proxy Server:${NC} http://localhost:$SHARED_PORT$PROXY_PATH"
echo -e "${BLUE}   Catalog API:${NC}  http://localhost:$SHARED_PORT$CATALOG_PATH (NOT IMPLEMENTED)"
echo -e "${BLUE}   Web App:${NC}     http://localhost:$SHARED_PORT$WEB_PATH"
echo ""
echo -e "${YELLOW}📋 Logs:${NC}"
echo -e "${BLUE}   Proxy Server:${NC} proxy-server.log"
echo -e "${BLUE}   Catalog API:${NC}  catalog-api.log"
echo -e "${BLUE}   Web App:${NC}     web-app.log"
echo ""
echo -e "${GREEN}✅ All services are running successfully!${NC}"
echo -e "${BLUE}🌐 Open your browser to: http://localhost:$SHARED_PORT$WEB_PATH${NC}"
echo ""
echo -e "${YELLOW}💡 To stop all services, run: ./stop-atmosinsight-shared.sh${NC}"
echo -e "${YELLOW}💡 Or manually: pkill -f 'pnpm run dev'${NC}"
echo ""
echo -e "${BLUE}📋 Services are now running on shared port $SHARED_PORT${NC}"
echo -e "${BLUE}🌐 Open your browser to: http://localhost:$SHARED_PORT$WEB_PATH${NC}"
echo ""
echo -e "${GREEN}✅ Script completed successfully!${NC}"
