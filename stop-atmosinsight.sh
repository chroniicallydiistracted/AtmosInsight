#!/bin/bash

# AtmosInsight Teardown Script
# This script stops all running services and confirms ports are free

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

echo -e "${BLUE}🛑 AtmosInsight Teardown Script${NC}"
echo "====================================="
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

# Function to get process info on port
get_port_info() {
    local port=$1
    if check_port $port; then
        # Try lsof first, then ss as fallback
        local pid=$(lsof -ti:$port 2>/dev/null)
        if [ -z "$pid" ]; then
            # Fallback to ss command
            local ss_output=$(ss -tlnp | grep ":$port ")
            echo -e "${BLUE}🔍 Debug: ss output for port $port: $ss_output${NC}" >&2
            pid=$(echo "$ss_output" | sed 's/.*pid=\([0-9]*\).*/\1/')
            echo -e "${BLUE}🔍 Debug: Extracted PID: $pid${NC}" >&2
        fi
        
        if [ -n "$pid" ]; then
            local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            local user=$(ps -p $pid -o user= 2>/dev/null || echo "unknown")
            echo "$pid|$cmd|$user"
        else
            echo ""
        fi
    else
        echo ""
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    
    echo -e "${YELLOW}🔄 Stopping $service_name on port $port...${NC}"
    
    # Get process info
    local port_info=$(get_port_info $port)
    
    if [ -n "$port_info" ]; then
        IFS='|' read -r pid cmd user <<< "$port_info"
        echo -e "${YELLOW}📋 Found process: PID=$pid, Command=$cmd, User=$user${NC}"
        
        # Validate PID is a number
        if [[ ! "$pid" =~ ^[0-9]+$ ]]; then
            echo -e "${RED}❌ Invalid PID format: $pid${NC}"
            echo -e "${YELLOW}🔄 Trying alternative method to kill process on port $port...${NC}"
            
            # Try to kill by port directly using fuser
            if command -v fuser >/dev/null 2>&1; then
                if fuser -k $port/tcp 2>/dev/null; then
                    echo -e "${GREEN}✅ Process killed using fuser${NC}"
                    sleep 2
                    return 0
                fi
            fi
            
            # Last resort: try to kill any process using the port
            echo -e "${YELLOW}🔄 Attempting to kill any process using port $port...${NC}"
            if pkill -f ":$port" 2>/dev/null; then
                echo -e "${GREEN}✅ Process killed using pkill${NC}"
                sleep 2
                return 0
            else
                echo -e "${RED}❌ Failed to kill process on port $port${NC}"
                return 1
            fi
        fi
        
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
                    return 1
                fi
            else
                echo -e "${GREEN}✅ Process terminated gracefully${NC}"
            fi
        else
            echo -e "${RED}❌ Failed to send termination signal to process on port $port${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}ℹ️  No process found on port $port${NC}"
    fi
}

# Function to wait for port to be free
wait_for_port() {
    local port=$1
    local max_wait=15
    local wait_time=0
    
    echo -e "${BLUE}⏳ Waiting for port $port to be free...${NC}"
    
    while check_port $port && [ $wait_time -lt $max_wait ]; do
        sleep 1
        wait_time=$((wait_time + 1))
        echo -e "${BLUE}⏳ Still waiting... ($wait_time/$max_wait seconds)${NC}"
    done
    
    if check_port $port; then
        echo -e "${RED}❌ Port $port is still in use after $max_wait seconds${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is now free${NC}"
        return 0
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "proxy-server" ] || [ ! -d "tiling-services" ]; then
    echo -e "${RED}❌ Error: This script must be run from the AtmosInsight root directory${NC}"
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./stop-atmosinsight.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Check current status
echo -e "${BLUE}🔍 Checking current service status...${NC}"
echo ""

PROXY_RUNNING=false
CATALOG_RUNNING=false
WEB_RUNNING=false

if check_port $PROXY_PORT; then
    echo -e "${YELLOW}⚠️  Port $PROXY_PORT: IN USE (proxy-server)${NC}"
    PROXY_RUNNING=true
else
    echo -e "${GREEN}✅ Port $PROXY_PORT: FREE${NC}"
fi

if check_port $CATALOG_PORT; then
    echo -e "${YELLOW}⚠️  Port $CATALOG_PORT: IN USE (catalog-api)${NC}"
    CATALOG_RUNNING=true
else
    echo -e "${GREEN}✅ Port $CATALOG_PORT: FREE${NC}"
fi

if check_port $WEB_PORT; then
    echo -e "${YELLOW}⚠️  Port $WEB_PORT: IN USE (Next.js web app)${NC}"
    WEB_RUNNING=true
else
    echo -e "${GREEN}✅ Port $WEB_PORT: FREE${NC}"
fi

echo ""

# Stop services if running
if [ "$PROXY_RUNNING" = true ] || [ "$CATALOG_RUNNING" = true ] || [ "$WEB_RUNNING" = true ]; then
    echo -e "${BLUE}🛑 Stopping running services...${NC}"
    echo ""
    
    if [ "$PROXY_RUNNING" = true ]; then
        if kill_port $PROXY_PORT "proxy-server"; then
            wait_for_port $PROXY_PORT || {
                echo -e "${RED}❌ Failed to free port $PROXY_PORT${NC}"
                exit 1
            }
        else
            echo -e "${RED}❌ Failed to stop proxy-server${NC}"
            exit 1
        fi
    fi
    
    if [ "$CATALOG_RUNNING" = true ]; then
        if kill_port $CATALOG_PORT "catalog-api"; then
            wait_for_port $CATALOG_PORT || {
                echo -e "${RED}❌ Failed to free port $CATALOG_PORT${NC}"
                exit 1
            }
        else
            echo -e "${RED}❌ Failed to stop catalog-api${NC}"
            exit 1
        fi
    fi
    
    if [ "$WEB_RUNNING" = true ]; then
        if kill_port $WEB_PORT "Next.js web app"; then
            wait_for_port $WEB_PORT || {
                echo -e "${RED}❌ Failed to free port $WEB_PORT${NC}"
                exit 1
            }
        else
            echo -e "${RED}❌ Failed to stop Next.js web app${NC}"
            exit 1
        fi
    fi
    
    echo ""
else
    echo -e "${GREEN}✅ No services are currently running${NC}"
    echo ""
fi

# Kill any remaining pnpm processes
echo -e "${BLUE}🧹 Cleaning up any remaining pnpm processes...${NC}"
if pkill -f "pnpm run dev" 2>/dev/null; then
    echo -e "${GREEN}✅ Killed remaining pnpm processes${NC}"
    sleep 2
else
    echo -e "${YELLOW}ℹ️  No remaining pnpm processes found${NC}"
fi

# Also try to kill any processes on our specific ports
echo -e "${BLUE}🧹 Cleaning up any remaining processes on our ports...${NC}"
if command -v fuser >/dev/null 2>&1; then
    if fuser -k $PROXY_PORT/tcp 2>/dev/null; then
        echo -e "${GREEN}✅ Killed remaining processes on port $PROXY_PORT${NC}"
    fi
    if fuser -k $CATALOG_PORT/tcp 2>/dev/null; then
        echo -e "${GREEN}✅ Killed remaining processes on port $CATALOG_PORT${NC}"
    fi
    if fuser -k $WEB_PORT/tcp 2>/dev/null; then
        echo -e "${GREEN}✅ Killed remaining processes on port $WEB_PORT${NC}"
    fi
    sleep 2
else
    echo -e "${YELLOW}ℹ️  fuser not available, using pkill fallback${NC}"
    pkill -f ":$PROXY_PORT" 2>/dev/null || true
    pkill -f ":$WEB_PORT" 2>/dev/null || true
    pkill -f ":$CATALOG_PORT" 2>/dev/null || true
fi

echo ""

# Final verification
echo -e "${BLUE}🔍 Final verification of port status...${NC}"
echo ""

FINAL_CHECK_PASSED=true

if check_port $PROXY_PORT; then
    echo -e "${RED}❌ Port $PROXY_PORT: STILL IN USE${NC}"
    FINAL_CHECK_PASSED=false
else
    echo -e "${GREEN}✅ Port $PROXY_PORT: CONFIRMED FREE${NC}"
fi

if check_port $CATALOG_PORT; then
    echo -e "${RED}❌ Port $CATALOG_PORT: STILL IN USE${NC}"
    FINAL_CHECK_PASSED=false
else
    echo -e "${GREEN}✅ Port $CATALOG_PORT: CONFIRMED FREE${NC}"
fi

if check_port $WEB_PORT; then
    echo -e "${RED}❌ Port $WEB_PORT: STILL IN USE${NC}"
    FINAL_CHECK_PASSED=false
else
    echo -e "${GREEN}✅ Port $WEB_PORT: CONFIRMED FREE${NC}"
fi

echo ""

# Show final status
if [ "$FINAL_CHECK_PASSED" = true ]; then
    echo -e "${GREEN}🎉 Teardown completed successfully!${NC}"
    echo "====================================="
    echo -e "${GREEN}✅ All ports are confirmed free${NC}"
    echo -e "${GREEN}✅ All services have been stopped${NC}"
    echo ""
    echo -e "${BLUE}💡 To restart services, run: ./start-atmosinsight.sh${NC}"
else
    echo -e "${RED}❌ Teardown completed with issues${NC}"
    echo "====================================="
    echo -e "${RED}⚠️  Some ports may still be in use${NC}"
    echo ""
    echo -e "${YELLOW}💡 You may need to manually check and kill processes${NC}"
    echo -e "${YELLOW}💡 Check with: lsof -i :3000, lsof -i :3001, and lsof -i :3002${NC}"
    exit 1
fi
