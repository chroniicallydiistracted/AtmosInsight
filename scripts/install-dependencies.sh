#!/bin/bash

# AtmosInsight Dependency Installation Script
# This script installs dependencies for all services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 AtmosInsight Dependency Installation Script${NC}"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "proxy-server" ] || [ ! -d "tiling-services" ]; then
    echo -e "${RED}❌ Error: This script must be run from the AtmosInsight root directory${NC}"
    echo -e "${RED}💡 Please run: cd /path/to/AtmosInsight && ./install-dependencies.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running from correct directory${NC}"
echo ""

# Function to install dependencies in a directory
install_deps() {
    local dir=$1
    local name=$2

    echo -e "${BLUE}📦 Installing dependencies for $name...${NC}"
    cd "$dir" || {
        echo -e "${RED}❌ Failed to change to directory: $dir${NC}"
        return 1
    }

    if [ -f "package.json" ]; then
        if command -v pnpm &> /dev/null; then
            if pnpm install; then
                echo -e "${GREEN}✅ Dependencies for $name installed successfully${NC}"
            else
                echo -e "${RED}❌ Failed to install dependencies for $name${NC}"
                cd - > /dev/null
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  pnpm not found, using npm${NC}"
            if npm install; then
                echo -e "${GREEN}✅ Dependencies for $name installed successfully${NC}"
            else
                echo -e "${RED}❌ Failed to install dependencies for $name${NC}"
                cd - > /dev/null
                return 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  No package.json found in $name, skipping${NC}"
    fi

    cd - > /dev/null
}

# Install dependencies for each service
echo -e "${BLUE}📋 Installing dependencies for all services...${NC}"
echo ""

# Install root dependencies
if [ -f "package.json" ]; then
    echo -e "${BLUE}📦 Installing root dependencies...${NC}"
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    echo -e "${GREEN}✅ Root dependencies installed${NC}"
fi

echo ""

# Install service dependencies
install_deps "proxy-server" "Proxy Server"
install_deps "tiling-services/catalog-api" "Catalog API"
install_deps "apps/web" "Next.js Web App"

echo ""
echo -e "${GREEN}🎉 All dependencies installed successfully!${NC}"
echo "=============================================="
echo -e "${BLUE}💡 You can now start the services with:${NC}"
echo -e "${GREEN}   ./start-atmosinsight-shared.sh${NC}"
echo ""
echo -e "${BLUE}💡 To check service status:${NC}"
echo -e "${BLUE}   ./status-atmosinsight-shared.sh${NC}"
echo ""
echo -e "${BLUE}💡 To stop services:${NC}"
echo -e "${RED}   ./stop-atmosinsight-shared.sh${NC}"
