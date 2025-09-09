#!/bin/bash

# AtmosInsight Comprehensive Production Deployment Script
# Complete deployment pipeline with verification at each step

set -e

echo "🚀 AtmosInsight Production Deployment"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
PROD_URL="https://weather.westfam.media"

# Results tracking
DEPLOYMENT_STEPS=()
FAILED_STEPS=()

# Function to log deployment step
log_step() {
    local step_name="$1"
    local status="$2"  # "start", "success", "error"
    local message="$3"
    
    case "$status" in
        "start")
            echo -e "${BLUE}🔄 ${step_name}${NC}"
            echo "   $message"
            ;;
        "success")
            echo -e "${GREEN}✅ ${step_name} - SUCCESS${NC}"
            [[ -n "$message" ]] && echo "   $message"
            DEPLOYMENT_STEPS+=("✅ $step_name")
            ;;
        "error")
            echo -e "${RED}❌ ${step_name} - FAILED${NC}"
            echo -e "${RED}   $message${NC}"
            FAILED_STEPS+=("❌ $step_name: $message")
            ;;
    esac
    echo ""
}

# Function to verify command exists
require_command() {
    local cmd="$1"
    local description="$2"
    
    if ! command -v "$cmd" >/dev/null 2>&1; then
        log_step "Command Check: $cmd" "error" "$description is required but not installed"
        exit 1
    fi
}

# Function to run with error handling
run_with_error_handling() {
    local step_name="$1"
    local command="$2"
    local success_message="$3"
    local error_message="$4"
    
    log_step "$step_name" "start" "Running: $command"
    
    if eval "$command"; then
        log_step "$step_name" "success" "$success_message"
        return 0
    else
        log_step "$step_name" "error" "$error_message"
        return 1
    fi
}

# Function to test endpoint
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    log_step "Testing: $description" "start" "GET $endpoint"
    
    local response
    response=$(curl -s -w "%{http_code}" --connect-timeout 30 --max-time 60 "$endpoint" -o /dev/null 2>/dev/null || echo "000")
    
    if [[ "$response" == "$expected_status" ]]; then
        log_step "Testing: $description" "success" "HTTP $response"
        return 0
    else
        log_step "Testing: $description" "error" "Expected HTTP $expected_status, got $response"
        return 1
    fi
}

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================
echo -e "${BLUE}📋 Pre-flight Checks${NC}"
echo "==================="

# Check required commands
require_command "node" "Node.js"
require_command "pnpm" "pnpm package manager" 
require_command "jq" "jq JSON processor"
require_command "curl" "curl HTTP client"

# Optional commands
if command -v terraform >/dev/null 2>&1; then
    log_step "Terraform Check" "success" "Terraform available"
else
    log_step "Terraform Check" "error" "Terraform required for infrastructure deployment"
    FAILED_STEPS+=("❌ Missing Terraform")
fi

if command -v aws >/dev/null 2>&1; then
    log_step "AWS CLI Check" "success" "AWS CLI available"
    
    # Check AWS credentials
    if aws sts get-caller-identity >/dev/null 2>&1; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        CURRENT_USER=$(aws sts get-caller-identity --query Arn --output text)
        log_step "AWS Authentication" "success" "Account: $ACCOUNT_ID"
    else
        log_step "AWS Authentication" "error" "AWS credentials not configured"
        FAILED_STEPS+=("❌ AWS credentials missing")
    fi
else
    log_step "AWS CLI Check" "error" "AWS CLI required for deployment"
    FAILED_STEPS+=("❌ Missing AWS CLI")
fi

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "packages" ]] || [[ ! -d "infra" ]]; then
    log_step "Directory Check" "error" "Must run from AtmosInsight root directory"
    exit 1
fi
log_step "Directory Check" "success" "Running from correct directory"

# Exit if pre-flight checks failed
if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
    echo -e "${RED}🚨 Pre-flight checks failed. Fix issues above before proceeding.${NC}"
    exit 1
fi

echo ""

# =============================================================================
# STEP 1: DEPENDENCY INSTALLATION
# =============================================================================
run_with_error_handling \
    "Install Dependencies" \
    "pnpm install --frozen-lockfile" \
    "All dependencies installed successfully" \
    "Failed to install dependencies"

# =============================================================================
# STEP 2: PROVIDER MANIFEST VALIDATION
# =============================================================================
log_step "Provider Manifest Validation" "start" "Checking provider configuration"

if [[ ! -f "packages/providers/providers.json" ]]; then
    log_step "Provider Manifest Validation" "error" "Provider manifest not found"
    exit 1
fi

# Validate JSON syntax
if ! jq empty packages/providers/providers.json >/dev/null 2>&1; then
    log_step "Provider Manifest Validation" "error" "Provider manifest has invalid JSON"
    exit 1
fi

# Check for TODO providers
TODO_COUNT=$(jq '[.providers[] | select(.status == "todo")] | length' packages/providers/providers.json)
if [[ $TODO_COUNT -gt 0 ]]; then
    log_step "Provider Manifest Validation" "error" "$TODO_COUNT providers still marked as TODO - run ./scripts/verify-s3-buckets.sh first"
    exit 1
fi

TOTAL_PROVIDERS=$(jq '.providers | length' packages/providers/providers.json)
log_step "Provider Manifest Validation" "success" "$TOTAL_PROVIDERS providers validated"

# =============================================================================
# STEP 3: BUILD DESIGN TOKENS
# =============================================================================
run_with_error_handling \
    "Build Design Tokens" \
    "pnpm tokens" \
    "Design tokens built successfully" \
    "Failed to build design tokens"

# =============================================================================
# STEP 4: BUILD ALL PACKAGES
# =============================================================================
run_with_error_handling \
    "Build All Packages" \
    "pnpm build" \
    "All packages built successfully" \
    "Failed to build packages"

# =============================================================================
# STEP 5: RUN TESTS
# =============================================================================
run_with_error_handling \
    "Run Tests" \
    "pnpm test" \
    "All tests passed" \
    "Tests failed - fix before deploying"

# =============================================================================
# STEP 6: BUILD LAMBDA FUNCTIONS
# =============================================================================
run_with_error_handling \
    "Build Lambda Functions" \
    "node scripts/build-lambdas.js" \
    "Lambda functions built successfully" \
    "Failed to build Lambda functions"

# Verify Lambda artifacts exist
if [[ ! -f "tiling-services/proxy-api/index.mjs" ]] || [[ ! -f "tiling-services/catalog-api/index.mjs" ]]; then
    log_step "Lambda Artifacts Check" "error" "Lambda build artifacts missing"
    exit 1
fi

PROXY_SIZE=$(du -h tiling-services/proxy-api/index.mjs | cut -f1)
CATALOG_SIZE=$(du -h tiling-services/catalog-api/index.mjs | cut -f1)
log_step "Lambda Artifacts Check" "success" "proxy-api: $PROXY_SIZE, catalog-api: $CATALOG_SIZE"

# =============================================================================
# STEP 7: TERRAFORM DEPLOYMENT
# =============================================================================
log_step "Terraform Deployment" "start" "Deploying infrastructure"

cd infra || exit 1

# Initialize terraform if needed
if [[ ! -d ".terraform" ]]; then
    run_with_error_handling \
        "Terraform Init" \
        "terraform init" \
        "Terraform initialized" \
        "Terraform initialization failed"
fi

# Plan deployment
run_with_error_handling \
    "Terraform Plan" \
    "terraform plan -out=tfplan" \
    "Terraform plan generated" \
    "Terraform plan failed"

# Apply deployment
run_with_error_handling \
    "Terraform Apply" \
    "terraform apply tfplan" \
    "Infrastructure deployed successfully" \
    "Terraform apply failed"

# Get outputs
if terraform output >/dev/null 2>&1; then
    API_GATEWAY_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "not_found")
    CLOUDFRONT_URL=$(terraform output -raw cloudfront_url 2>/dev/null || echo "not_found")
    log_step "Terraform Outputs" "success" "API Gateway: $API_GATEWAY_URL, CloudFront: $CLOUDFRONT_URL"
else
    log_step "Terraform Outputs" "error" "Failed to get terraform outputs"
fi

cd - >/dev/null || exit 1

# =============================================================================
# STEP 8: DEPLOYMENT VERIFICATION
# =============================================================================
echo -e "${BLUE}🔍 Deployment Verification${NC}"
echo "========================="

# Wait for deployment to propagate
log_step "Deployment Propagation" "start" "Waiting 30 seconds for services to start"
sleep 30
log_step "Deployment Propagation" "success" "Propagation delay completed"

# Test health endpoint
test_endpoint "$PROD_URL/api/health" "Health Check"

# Test S3 provider endpoint (should return 400 for missing path, not 500)
test_endpoint "$PROD_URL/api/s3/goes19-abi/" "S3 Provider Endpoint" "400"

# Test CORS headers
log_step "CORS Configuration" "start" "Testing CORS headers"
CORS_ORIGIN=$(curl -s -H "Origin: https://weather.westfam.media" "$PROD_URL/api/health" -I 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
if [[ -n "$CORS_ORIGIN" ]]; then
    log_step "CORS Configuration" "success" "CORS headers present"
else
    log_step "CORS Configuration" "error" "CORS headers missing"
fi

# =============================================================================
# STEP 9: PERFORMANCE VERIFICATION
# =============================================================================
echo -e "${BLUE}⚡ Performance Verification${NC}"
echo "=========================="

# Test response times
log_step "Response Time Test" "start" "Measuring API response times"

HEALTH_TIME=$(curl -s -w "%{time_total}" -o /dev/null "$PROD_URL/api/health" 2>/dev/null || echo "999")
if (( $(echo "$HEALTH_TIME < 2.0" | bc -l 2>/dev/null || echo "0") )); then
    log_step "Response Time Test" "success" "Health endpoint: ${HEALTH_TIME}s"
else
    log_step "Response Time Test" "error" "Health endpoint too slow: ${HEALTH_TIME}s"
fi

# =============================================================================
# DEPLOYMENT SUMMARY
# =============================================================================
echo ""
echo "=========================================="
echo -e "${BLUE}DEPLOYMENT SUMMARY${NC}"
echo "=========================================="
echo ""

echo -e "${BLUE}Deployment Details:${NC}"
echo "Start Time: $DEPLOYMENT_START_TIME"
echo "End Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Production URL: $PROD_URL"
echo ""

# Successful steps
if [[ ${#DEPLOYMENT_STEPS[@]} -gt 0 ]]; then
    echo -e "${GREEN}✅ SUCCESSFUL STEPS (${#DEPLOYMENT_STEPS[@]}):${NC}"
    for step in "${DEPLOYMENT_STEPS[@]}"; do
        echo "   $step"
    done
    echo ""
fi

# Failed steps
if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
    echo -e "${RED}❌ FAILED STEPS (${#FAILED_STEPS[@]}):${NC}"
    for step in "${FAILED_STEPS[@]}"; do
        echo "   $step"
    done
    echo ""
fi

# Overall status
echo -e "${BLUE}📊 DEPLOYMENT STATUS:${NC}"
if [[ ${#FAILED_STEPS[@]} -eq 0 ]]; then
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL${NC}"
    echo ""
    echo "✅ All systems deployed and verified"
    echo "✅ Production endpoints responding"
    echo ""
    echo -e "${BLUE}🌐 Production Access:${NC}"
    echo "Web App: $PROD_URL"
    echo "API Health: $PROD_URL/api/health"
    echo ""
    echo -e "${BLUE}📊 Next Steps:${NC}"
    echo "1. Monitor CloudWatch logs for any issues"
    echo "2. Run integration tests with real data"
    echo "3. Test all provider endpoints manually"
    echo "4. Update DNS if needed"
    echo ""
else
    echo -e "${RED}🚨 DEPLOYMENT FAILED${NC}"
    echo ""
    echo "❌ Some deployment steps failed"
    echo "❌ Manual intervention required"
    echo ""
    echo -e "${RED}🔧 REQUIRED ACTIONS:${NC}"
    echo "1. Review failed steps above"
    echo "2. Fix identified issues"  
    echo "3. Re-run deployment: ./scripts/deploy-production-comprehensive.sh"
    echo "4. Contact DevOps team if issues persist"
    echo ""
fi

# Return appropriate exit code
if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
    exit 1
else
    exit 0
fi