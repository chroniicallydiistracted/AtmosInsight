#!/bin/bash

# AtmosInsight Production Deployment Script
# This script builds and prepares all components for production deployment

set -e  # Exit on any error

echo "🚀 AtmosInsight Production Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}▶️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_step "Checking prerequisites..."

if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is required but not installed"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    print_error "npx is required but not installed"
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    print_warning "Terraform not found - you'll need to install it for infrastructure deployment"
fi

print_success "Prerequisites check completed"

# 1. Install dependencies
print_step "Installing dependencies..."
pnpm install
print_success "Dependencies installed"

# 2. Build Lambda functions
print_step "Building Lambda functions..."
echo "  📦 Building proxy Lambda..."
npx esbuild tiling-services/proxy-api/index.ts --bundle --platform=node --format=esm --outfile=tiling-services/proxy-api/index.mjs --minify --packages=bundle

echo "  📦 Building catalog Lambda..."
npx esbuild tiling-services/catalog-api/index.ts --bundle --platform=node --format=esm --outfile=tiling-services/catalog-api/index.mjs --minify --packages=bundle

print_success "Lambda functions built successfully"

# 3. Build frontend
print_step "Building frontend application..."
pnpm --filter web build
print_success "Frontend built successfully"

# 4. Run tests
print_step "Running tests..."
pnpm test
print_success "Tests completed"

# 5. Build design tokens
print_step "Building design tokens..."
pnpm tokens
print_success "Design tokens built"

# 6. Display deployment information
echo ""
echo "🎉 Build completed successfully!"
echo "================================="
echo ""
echo "📁 Build artifacts created:"
echo "  - tiling-services/proxy-api/index.mjs ($(du -h tiling-services/proxy-api/index.mjs | cut -f1))"
echo "  - tiling-services/catalog-api/index.mjs ($(du -h tiling-services/catalog-api/index.mjs | cut -f1))"
echo "  - apps/web/out/ (static site files)"
echo ""
echo "🔧 Next steps for deployment:"
echo "  1. Configure environment variables in AWS Lambda"
echo "  2. Update Terraform variables with your ACM certificate ARN"
echo "  3. Run: terraform init && terraform plan -out tfplan && terraform apply tfplan"
echo "  4. Configure Cloudflare DNS CNAME to CloudFront distribution"
echo "  5. Run smoke tests"
echo ""
echo "📚 Documentation:"
echo "  - Implementation_Checklist_and_Status.md - Implementation details"
echo "  - Manual_Configuration_Requirements.md - Required manual configuration"
echo "  - Followups.md - Production readiness checklist"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    print_success ".env file found - reference this for Lambda environment variables"
else
    print_warning ".env file not found - you'll need to configure environment variables manually"
fi

echo "🚀 Ready for production deployment!"