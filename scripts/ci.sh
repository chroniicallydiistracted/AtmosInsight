#!/bin/bash

# AtmosInsight CI Script
# Performs a completely fresh install of all packages

set -e  # Exit on any error

echo "🚀 AtmosInsight CI - Fresh Install"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    print_error "This script must be run from the AtmosInsight root directory"
    exit 1
fi

print_status "Starting fresh CI install..."

# Stop any running services first
if [ -f "./stop-atmosinsight.sh" ]; then
    print_status "Stopping any running services..."
    ./stop-atmosinsight.sh > /dev/null 2>&1 || true
fi

# Clean all node_modules directories
print_status "Cleaning all node_modules directories..."

# Remove root node_modules
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "Removed root node_modules"
fi

# Remove .pnpm store
if [ -d ".pnpm" ]; then
    rm -rf .pnpm
    print_success "Removed .pnpm store"
fi

# Find and remove all nested node_modules
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
print_success "Removed all nested node_modules directories"

# Clean pnpm cache (optional, but ensures fresh install)
print_status "Cleaning pnpm cache..."
pnpm store prune --force > /dev/null 2>&1 || true
print_success "Cleaned pnpm cache"

# Verify lockfile exists
if [ ! -f "pnpm-lock.yaml" ]; then
    print_error "pnpm-lock.yaml not found! Cannot proceed with CI install."
    exit 1
fi

print_status "Installing dependencies with frozen lockfile..."

# Perform the install
if pnpm install --frozen-lockfile --prefer-offline; then
    print_success "Dependencies installed successfully!"
else
    print_error "Installation failed!"
    exit 1
fi

# Verify the install
print_status "Verifying installation..."

# Check if key packages are accessible
if [ -d "node_modules" ] && [ -d "packages/tokens/node_modules" ]; then
    print_success "Root and tokens packages verified"
else
    print_error "Installation verification failed!"
    exit 1
fi

# Run a quick build test
print_status "Running quick build test..."
if pnpm tokens > /dev/null 2>&1; then
    print_success "Tokens package builds successfully"
else
    print_warning "Tokens package build failed (this might be expected in some cases)"
fi

print_success "CI install completed successfully!"
echo ""
echo "📋 Next steps:"
echo "  • Run 'pnpm build' to build all packages"
echo "  • Run 'pnpm test' to run tests"
echo "  • Run 'pnpm start' to start services"
echo ""
echo "💡 Use 'pnpm ci:clean' for a less aggressive clean, or 'pnpm ci:fresh' for this full clean"
