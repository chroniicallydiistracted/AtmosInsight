#!/bin/bash

# AtmosInsight Universal Startup Script
# This script ensures clean startup of proxy-server, catalog-api, and Next.js web app
# Supports both separate and shared port configurations

set -e  # Exit on any error

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

echo -e "${BLUE}🚀 AtmosInsight Universal Startup Script${NC}"
echo "================================================"
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

# Function to install dependencies
install_dependencies() {
    local service_name=$1
    local working_dir=$2

    echo -e "${BLUE}📦 Installing dependencies for $service_name...${NC}"

    # Check if directory exists
    if [ ! -d "$working_dir" ]; then
        echo -e "${RED}❌ Directory not found: $working_dir${NC}"
        echo -e "${RED}💡 Current directory: $(pwd)${NC}"
        echo -e "${RED}💡 Available directories:${NC}"
        ls -la
        return 1
    fi

    cd "$working_dir" || {
        echo -e "${RED}❌ Failed to change to directory: $working_dir${NC}"
        echo -e "${RED}💡 Current directory: $(pwd)${NC}"
        return 1
    }

    if [ -f "package.json" ]; then
        if command -v pnpm &> /dev/null; then
            # Check if we're in a pnpm workspace
            if [ -f "pnpm-workspace.yaml" ] || grep -q "workspaces" package.json; then
                echo -e "${BLUE}🌐 Found pnpm workspace, installing all dependencies...${NC}"
                if pnpm install; then
                    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
                else
                    echo -e "${RED}❌ Failed to install dependencies${NC}"
                    cd - > /dev/null
                    return 1
                fi
            else
                echo -e "${BLUE}📦 Installing dependencies for $service_name...${NC}"
                if pnpm install; then
                    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
                else
                    echo -e "${RED}❌ Failed to install dependencies${NC}"
                    cd - > /dev/null
                    return 1
                fi
            fi
        else
            echo -e "${YELLOW}⚠️  pnpm not found, using npm${NC}"
            if npm install; then
                echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
            else
                echo -e "${RED}❌ Failed to install dependencies${NC}"
                cd - > /dev/null
                return 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  No package.json found, skipping dependency installation${NC}"
    fi

    cd - > /dev/null
}

# Function to start service
start_service() {
    local service_name=$1
    local port=$2
    local start_cmd=$3
    local working_dir=$4
    local health_endpoint=$5

    echo -e "${BLUE}🚀 Starting $service_name${NC}"

    if [ "$USE_SHARED_PORTS" = true ]; then
        echo -e "${BLUE}   Port: $port (shared)${NC}"
        echo -e "${BLUE}   Path: $health_endpoint${NC}"
    else
        echo -e "${BLUE}   Port: $port${NC}"
    fi

    # Store current directory to return to later
    local current_dir=$(pwd)

    # Change to working directory
    if [ ! -d "$working_dir" ]; then
        echo -e "${RED}❌ Directory not found: $working_dir${NC}"
        echo -e "${RED}💡 Current directory: $(pwd)${NC}"
        echo -e "${RED}💡 Available directories:${NC}"
        ls -la
        exit 1
    fi

    cd "$working_dir" || {
        echo -e "${RED}❌ Failed to change to directory: $working_dir${NC}"
        echo -e "${RED}💡 Current directory: $(pwd)${NC}"
        exit 1
    }

    # Install dependencies if needed
    install_dependencies "$service_name" "$working_dir"

    # Start service in background
    if eval "$start_cmd" > "$service_name.log" 2>&1 & then
        local pid=$!
        echo -e "${GREEN}✅ $service_name started with PID: $pid${NC}"

        # Wait for service to be ready
        echo -e "${BLUE}⏳ Waiting for $service_name to be ready...${NC}"
        local max_wait=30
        local wait_time=0

        while ! check_service $port "$health_endpoint" "$service_name" && [ $wait_time -lt $max_wait ]; do
            sleep 1
            wait_time=$((wait_time + 1))
            echo -e "${BLUE}⏳ Still waiting... ($wait_time/$max_wait seconds)${NC}"
        done

        if check_service $port "$health_endpoint" "$service_name"; then
            echo -e "${GREEN}✅ $service_name is ready${NC}"
        else
            echo -e "${RED}❌ $service_name failed to start${NC}"
            echo -e "${RED}📋 Check logs: $working_dir/$service_name.log${NC}"
            echo -e "${RED}📋 Last 20 lines of log:${NC}"
            tail -n 20 "$service_name.log"
            echo -e "${RED}💡 Common issues:${NC}"
            echo -e "${RED}   1. Missing dependencies - try running 'pnpm install' in the service directory${NC}"
            echo -e "${RED}   2. Port already in use - try running './stop-atmosinsight-shared.sh' first${NC}"
            echo -e "${RED}   3. Configuration errors - check the service's configuration files${NC}"
            # Return to original directory before exiting
            cd "$current_dir"
            exit 1
        fi
    else
        echo -e "${RED}❌ Failed to start $service_name${NC}"
        echo -e "${RED}📋 Check logs: $working_dir/$service_name.log${NC}"
        echo -e "${RED}💡 Common issues:${NC}"
        echo -e "${RED}   1. Missing dependencies - try running 'pnpm install' in the service directory${NC}"
        echo -e "${RED}   2. Port already in use - try running './stop-atmosinsight-shared.sh' first${NC}"
        echo -e "${RED}   3. Configuration errors - check the service's configuration files${NC}"
        # Return to original directory before exiting
        cd "$current_dir"
        exit 1
    fi

    # Return to original directory after successful start
    cd "$current_dir"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "proxy-server" ] || [ ! -d "tiling-services" ]; then
    echo -e "${RED}❌ Error: This script must be run from the AtmosInsight root directory${NC}"
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./start-atmosinsight-shared.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Check and kill conflicting processes
echo -e "${BLUE}🔍 Checking for port conflicts...${NC}"

if [ "$USE_SHARED_PORTS" = false ]; then
    # For separate ports, check each port individually
    if check_port $PROXY_PORT; then
        kill_port $PROXY_PORT "proxy-server"
        wait_for_port $PROXY_PORT
    fi

    if check_port $CATALOG_PORT; then
        kill_port $CATALOG_PORT "catalog-api"
        wait_for_port $CATALOG_PORT
    fi

    if check_port $WEB_PORT; then
        kill_port $WEB_PORT "Next.js web app"
        wait_for_port $WEB_PORT
    fi
else
    # For shared ports, check if any service is already using the port
    if check_port $SHARED_PORT; then
        echo -e "${YELLOW}⚠️  Shared port $SHARED_PORT is in use${NC}"
        echo -e "${YELLOW}🔄 Attempting to kill processes on port $SHARED_PORT...${NC}"

        # Try to kill any process on the shared port
        local pid=$(lsof -ti:$SHARED_PORT)
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
fi

echo -e "${GREEN}✅ All ports are free${NC}"
echo ""

# Start services in order
echo -e "${BLUE}📋 Starting services in order:${NC}"

if [ "$USE_SHARED_PORTS" = true ]; then
    echo "1. Proxy Server (port $SHARED_PORT, path: $PROXY_PATH)"
    echo "2. Catalog API (port $SHARED_PORT, path: $CATALOG_PATH)"
    echo "3. Next.js Web App (port $SHARED_PORT, path: $WEB_PATH)"
    echo ""

    start_service "proxy-server" $SHARED_PORT "pnpm --filter proxy-server run dev" "." "$PROXY_HEALTH"
    start_service "catalog-api" $SHARED_PORT "pnpm --filter catalog-api run start" "." "$CATALOG_HEALTH"

    # Wait a moment for services to fully initialize
    sleep 2

    # Start Next.js web app
    start_service "Next.js web app" $SHARED_PORT "pnpm --filter web run dev" "." "$WEB_HEALTH"

    # Wait for all services to be ready
    sleep 3

    echo ""
    echo -e "${GREEN}🎉 Startup complete! Services are running on shared port $SHARED_PORT${NC}"
    echo "================================================"
    echo -e "${BLUE}🌐 All services available on: http://localhost:$SHARED_PORT${NC}"
    echo -e "${BLUE}   Proxy Server:${NC} http://localhost:$SHARED_PORT$PROXY_PATH"
    echo -e "${BLUE}   Catalog API:${NC}  http://localhost:$SHARED_PORT$CATALOG_PATH"
    echo -e "${BLUE}   Web App:${NC}     http://localhost:$SHARED_PORT$WEB_PATH"
    echo ""
    echo -e "${YELLOW}📋 Logs:${NC}"
    echo -e "${BLUE}   Proxy Server:${NC} proxy-server/proxy-server.log"
    echo -e "${BLUE}   Catalog API:${NC}  tiling-services/catalog-api/catalog-api.log"
    echo -e "${BLUE}   Web App:${NC}     apps/web/Next.js\ web\ app.log"
    echo ""
    echo -e "${GREEN}✅ All services are running successfully!${NC}"
    echo -e "${BLUE}🌐 Open your browser to: http://localhost:$SHARED_PORT$WEB_PATH${NC}"
    echo ""
    echo -e "${YELLOW}💡 To stop all services, run: ./stop-atmosinsight.sh${NC}"
    echo -e "${YELLOW}💡 Or use package.json: pnpm stop${NC}"
    echo -e "${YELLOW}💡 Or manually: pkill -f 'pnpm run dev'${NC}"
    echo ""
    echo -e "${BLUE}📋 Services are now running on shared port $SHARED_PORT${NC}"
    echo -e "${BLUE}🌐 Open your browser to: http://localhost:$SHARED_PORT$WEB_PATH${NC}"
    echo ""
    echo -e "${GREEN}✅ Script completed successfully!${NC}"
else
    echo "1. Proxy Server (port $PROXY_PORT)"
    echo "2. Catalog API (port $CATALOG_PORT)"
    echo "3. Next.js Web App (port $WEB_PORT)"
    echo ""

    start_service "proxy-server" $PROXY_PORT "pnpm --filter proxy-server run dev" "." "$PROXY_HEALTH"
    start_service "catalog-api" $CATALOG_PORT "pnpm --filter catalog-api run start" "." "$CATALOG_HEALTH"

    # Wait a moment for services to fully initialize
    sleep 2

    # Start Next.js web app
    start_service "Next.js web app" $WEB_PORT "pnpm --filter web run dev" "." "$WEB_HEALTH"

    # Wait for all services to be ready
    sleep 3

    echo ""
    echo -e "${GREEN}🎉 Startup complete! Services are running in the background.${NC}"
    echo "================================================"
    echo -e "${BLUE}📱 Web App:${NC}     http://localhost:$WEB_PORT"
    echo -e "${BLUE}🔌 Proxy Server:${NC} http://localhost:$PROXY_PORT"
    echo -e "${BLUE}📚 Catalog API:${NC}  http://localhost:$CATALOG_PORT"
    echo ""
    echo -e "${YELLOW}📋 Logs:${NC}"
    echo -e "${BLUE}   Proxy Server:${NC} proxy-server/proxy-server.log"
    echo -e "${BLUE}   Catalog API:${NC}  tiling-services/catalog-api/catalog-api.log"
    echo -e "${BLUE}   Web App:${NC}     apps/web/Next.js\ web\ app.log"
    echo ""
    echo -e "${GREEN}✅ All services are running successfully!${NC}"
    echo -e "${BLUE}🌐 Open your browser to: http://localhost:$WEB_PORT${NC}"
    echo ""
    echo -e "${YELLOW}💡 To stop all services, run: ./stop-atmosinsight.sh${NC}"
    echo -e "${YELLOW}💡 Or use package.json: pnpm stop${NC}"
    echo -e "${YELLOW}💡 Or manually: pkill -f 'pnpm run dev'${NC}"
    echo ""
    echo -e "${BLUE}📋 Services are now running independently in the background${NC}"
    echo -e "${BLUE}🌐 Open your browser to: http://localhost:$WEB_PORT${NC}"
    echo ""
    echo -e "${GREEN}✅ Script completed successfully!${NC}"
fi
