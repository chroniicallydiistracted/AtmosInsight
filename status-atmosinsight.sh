#!/bin/bash

# AtmosInsight Status Check Script
# This script shows the current status of all services and ports

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Port configuration
PROXY_PORT=3000
WEB_PORT=3002

echo -e "${BLUE}📊 AtmosInsight Status Check${NC}"
echo "================================"
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
if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "proxy-server" ]; then
    echo -e "${RED}❌ Error: This script must be run from the AtmosInsight root directory${NC}"
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./status-atmosinsight.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Check proxy-server status
echo -e "${BLUE}🔌 Proxy Server (Port $PROXY_PORT)${NC}"
echo "----------------------------------------"

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

echo ""

# Check Next.js web app status
echo -e "${BLUE}📱 Next.js Web App (Port $WEB_PORT)${NC}"
echo "----------------------------------------"

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
echo "----------------------------------------"

PROXY_RUNNING=false
WEB_RUNNING=false

if check_port $PROXY_PORT; then
    PROXY_RUNNING=true
fi

if check_port $WEB_PORT; then
    WEB_RUNNING=true
fi

if [ "$PROXY_RUNNING" = true ] && [ "$WEB_RUNNING" = true ]; then
    echo -e "${GREEN}🎉 All services are running!${NC}"
    echo -e "${BLUE}🌐 Open your browser to: http://localhost:$WEB_PORT${NC}"
elif [ "$PROXY_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only proxy-server is running${NC}"
    echo -e "${BLUE}💡 Start web app: cd apps/web && pnpm run dev${NC}"
elif [ "$WEB_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  Only Next.js web app is running${NC}"
    echo -e "${BLUE}💡 Start proxy-server: cd proxy-server && pnpm run dev${NC}"
else
    echo -e "${RED}❌ No services are running${NC}"
    echo -e "${BLUE}💡 Start all services: ./start-atmosinsight.sh${NC}"
fi

echo ""

# Quick actions
echo -e "${BLUE}🚀 Quick Actions${NC}"
echo "----------------------------------------"
echo -e "${GREEN}./start-atmosinsight.sh${NC}  - Start all services"
echo -e "${RED}./stop-atmosinsight.sh${NC}   - Stop all services"
echo -e "${BLUE}./status-atmosinsight.sh${NC} - Show this status (current script)"
echo ""
echo -e "${YELLOW}💡 Run this script anytime to check status${NC}"

# Package.json scripts (recommended)
echo -e "${BLUE}📦 Package.json Scripts (Recommended)${NC}"
echo "----------------------------------------"
echo -e "${GREEN}pnpm start${NC}     - Start all services"
echo -e "${BLUE}pnpm status${NC}    - Show this status"
echo -e "${RED}pnpm stop${NC}      - Stop all services"
echo -e "${YELLOW}pnpm restart${NC}  - Restart all services"
echo ""
echo -e "${YELLOW}💡 Use pnpm commands from anywhere in the monorepo${NC}"
