#!/bin/bash

# AtmosInsight Universal Startup Script
# This script ensures clean startup of both proxy-server and Next.js web app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Port configuration
PROXY_PORT=3000
CATALOG_PORT=3001
WEB_PORT=3002

echo -e "${BLUE}🚀 AtmosInsight Universal Startup Script${NC}"
echo "================================================"
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

# Function to start service
start_service() {
    local service_name=$1
    local port=$2
    local start_cmd=$3
    local working_dir=$4
    
    echo -e "${BLUE}🚀 Starting $service_name on port $port...${NC}"
    
    # Store current directory to return to later
    local current_dir=$(pwd)
    
    # Change to working directory
    cd "$working_dir" || {
        echo -e "${RED}❌ Failed to change to directory: $working_dir${NC}"
        exit 1
    }
    
    # Start service in background
    if eval "$start_cmd" > "$service_name.log" 2>&1 & then
        local pid=$!
        echo -e "${GREEN}✅ $service_name started with PID: $pid${NC}"
        
        # Wait for service to be ready
        echo -e "${BLUE}⏳ Waiting for $service_name to be ready...${NC}"
        local max_wait=30
        local wait_time=0
        
        while ! check_port $port && [ $wait_time -lt $max_wait ]; do
            sleep 1
            wait_time=$((wait_time + 1))
            echo -e "${BLUE}⏳ Still waiting... ($wait_time/$max_wait seconds)${NC}"
        done
        
        if check_port $port; then
            echo -e "${GREEN}✅ $service_name is ready on port $port${NC}"
        else
            echo -e "${RED}❌ $service_name failed to start on port $port${NC}"
            echo -e "${RED}📋 Check logs: $working_dir/$service_name.log${NC}"
            # Return to original directory before exiting
            cd "$current_dir"
            exit 1
        fi
    else
        echo -e "${RED}❌ Failed to start $service_name${NC}"
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
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./start-atmosinsight.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Check and kill conflicting processes
echo -e "${BLUE}🔍 Checking for port conflicts...${NC}"

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

echo -e "${GREEN}✅ All ports are free${NC}"
echo ""

# Start services in order
echo -e "${BLUE}📋 Starting services in order:${NC}"
echo "1. Proxy Server (port $PROXY_PORT)"
echo "2. Catalog API (port $CATALOG_PORT)"
echo "3. Next.js Web App (port $WEB_PORT)"
echo ""

start_service "proxy-server" $PROXY_PORT "pnpm run dev" "proxy-server"
start_service "catalog-api" $CATALOG_PORT "pnpm run start" "tiling-services/catalog-api"

# Wait a moment for services to fully initialize
sleep 2

# Start Next.js web app
start_service "Next.js web app" $WEB_PORT "pnpm run dev" "apps/web"

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
