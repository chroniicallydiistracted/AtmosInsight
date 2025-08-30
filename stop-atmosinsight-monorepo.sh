#!/bin/bash

# AtmosInsight Monorepo Teardown Script
# This script stops all running services in a pnpm monorepo

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

echo -e "${BLUE}🛑 AtmosInsight Monorepo Teardown Script${NC}"
echo "========================================="
echo ""
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Shared Port: $SHARED_PORT"
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
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./stop-atmosinsight-monorepo.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Check current status
echo -e "${BLUE}🔍 Checking current service status...${NC}"
echo ""

# Check if shared port is in use
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
                    exit 1
                fi
            else
                echo -e "${GREEN}✅ Process terminated gracefully${NC}"
            fi
        else
            echo -e "${RED}❌ Failed to send termination signal to process on port $SHARED_PORT${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Could not find process using port $SHARED_PORT${NC}"
        exit 1
    fi

    wait_for_port $SHARED_PORT
else
    echo -e "${GREEN}✅ Shared port $SHARED_PORT is free${NC}"
fi

echo ""

# Kill any remaining pnpm processes
echo -e "${BLUE}🧹 Cleaning up any remaining pnpm processes...${NC}"
if pkill -f "pnpm run dev" 2>/dev/null; then
    echo -e "${GREEN}✅ Killed remaining pnpm processes${NC}"
    sleep 2
else
    echo -e "${YELLOW}ℹ️  No remaining pnpm processes found${NC}"
fi

# Also try to kill any processes on our shared port
echo -e "${BLUE}🧹 Cleaning up any remaining processes on our shared port...${NC}"
if command -v fuser >/dev/null 2>&1; then
    if fuser -k $SHARED_PORT/tcp 2>/dev/null; then
        echo -e "${GREEN}✅ Killed remaining processes on shared port $SHARED_PORT${NC}"
    fi
    sleep 2
else
    echo -e "${YELLOW}ℹ️  fuser not available, using pkill fallback${NC}"
    pkill -f ":$SHARED_PORT" 2>/dev/null || true
fi

echo ""

# Final verification
echo -e "${BLUE}🔍 Final verification of port status...${NC}"
echo ""

if check_port $SHARED_PORT; then
    echo -e "${RED}❌ Port $SHARED_PORT is still in use${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Port $SHARED_PORT is now free${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All services have been stopped successfully!${NC}"
echo "=============================================="
echo ""
echo -e "${BLUE}💡 To start services again, run: ./start-atmosinsight-monorepo.sh${NC}"
