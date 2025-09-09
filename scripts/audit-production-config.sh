#!/bin/bash

# AtmosInsight Production Configuration Audit
# Verifies all required environment variables, secrets, and infrastructure

set -e

echo "🔍 AtmosInsight Production Configuration Audit"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Results tracking
MISSING_CONFIGS=()
VERIFIED_CONFIGS=()
INFRASTRUCTURE_ISSUES=()

# Function to check environment variable
check_env_var() {
    local var_name="$1"
    local description="$2"
    local required="$3"  # "required" or "optional"
    
    if [[ -n "${!var_name}" ]]; then
        echo -e "${GREEN}✅ ${var_name}: ${description}${NC}"
        VERIFIED_CONFIGS+=("${var_name}")
    else
        if [[ "$required" == "required" ]]; then
            echo -e "${RED}❌ ${var_name}: ${description} - MISSING${NC}"
            MISSING_CONFIGS+=("${var_name}: ${description}")
        else
            echo -e "${YELLOW}⚠️  ${var_name}: ${description} - OPTIONAL${NC}"
        fi
    fi
}

# Function to check AWS secret
check_aws_secret() {
    local secret_name="$1"
    local description="$2"
    
    if command -v aws >/dev/null 2>&1; then
        if aws secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ AWS Secret: ${secret_name} - ${description}${NC}"
            VERIFIED_CONFIGS+=("SECRET:${secret_name}")
        else
            echo -e "${RED}❌ AWS Secret: ${secret_name} - ${description} - NOT FOUND${NC}"
            MISSING_CONFIGS+=("SECRET:${secret_name}: ${description}")
        fi
    else
        echo -e "${YELLOW}⚠️  AWS CLI not available - cannot check secrets${NC}"
    fi
}

# Function to check AWS infrastructure
check_aws_infrastructure() {
    local resource_type="$1"
    local identifier="$2"
    local description="$3"
    
    if ! command -v aws >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  AWS CLI not available - skipping infrastructure checks${NC}"
        return
    fi
    
    case "$resource_type" in
        "lambda")
            if aws lambda get-function --function-name "$identifier" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Lambda: ${identifier} - ${description}${NC}"
                
                # Check last modified date
                local last_modified
                last_modified=$(aws lambda get-function --function-name "$identifier" --query 'Configuration.LastModified' --output text)
                echo -e "   Last updated: ${last_modified}"
                
                VERIFIED_CONFIGS+=("LAMBDA:${identifier}")
            else
                echo -e "${RED}❌ Lambda: ${identifier} - ${description} - NOT FOUND${NC}"
                INFRASTRUCTURE_ISSUES+=("LAMBDA:${identifier}: ${description}")
            fi
            ;;
        "s3")
            if aws s3 ls "s3://${identifier}" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ S3 Bucket: ${identifier} - ${description}${NC}"
                VERIFIED_CONFIGS+=("S3:${identifier}")
            else
                echo -e "${RED}❌ S3 Bucket: ${identifier} - ${description} - NOT ACCESSIBLE${NC}"
                INFRASTRUCTURE_ISSUES+=("S3:${identifier}: ${description}")
            fi
            ;;
        "cloudfront")
            if aws cloudfront list-distributions --query "DistributionList.Items[?Id=='${identifier}']" --output text | grep -q "$identifier"; then
                echo -e "${GREEN}✅ CloudFront: ${identifier} - ${description}${NC}"
                VERIFIED_CONFIGS+=("CLOUDFRONT:${identifier}")
            else
                echo -e "${RED}❌ CloudFront: ${identifier} - ${description} - NOT FOUND${NC}"
                INFRASTRUCTURE_ISSUES+=("CLOUDFRONT:${identifier}: ${description}")
            fi
            ;;
        "apigateway")
            if aws apigateway get-rest-apis --query "items[?name=='${identifier}']" --output text | grep -q "$identifier"; then
                echo -e "${GREEN}✅ API Gateway: ${identifier} - ${description}${NC}"
                VERIFIED_CONFIGS+=("APIGATEWAY:${identifier}")
            else
                echo -e "${RED}❌ API Gateway: ${identifier} - ${description} - NOT FOUND${NC}"
                INFRASTRUCTURE_ISSUES+=("APIGATEWAY:${identifier}: ${description}")
            fi
            ;;
    esac
}

# =============================================================================
# 1. CRITICAL ENVIRONMENT VARIABLES
# =============================================================================
echo -e "${BLUE}1. Critical Environment Variables${NC}"
echo "=================================="

# AWS Configuration
check_env_var "AWS_REGION" "AWS Region for deployment" "required"
check_env_var "AWS_ACCESS_KEY_ID" "AWS Access Key" "required"
check_env_var "AWS_SECRET_ACCESS_KEY" "AWS Secret Key" "required"

# Provider API Keys
check_env_var "NWS_USER_AGENT" "National Weather Service User-Agent" "required"
check_env_var "OPENWEATHER_API_KEY" "OpenWeatherMap API Key" "required"
check_env_var "AIRNOW_API_KEY" "AirNow API Key" "required"
check_env_var "TRACESTRACK_API_KEY" "TracesTrack API Key" "required"
check_env_var "FIRMS_MAP_KEY" "NASA FIRMS Map Key" "optional"

# Security Configuration
check_env_var "ALLOWED_ORIGINS" "CORS Allowed Origins" "required"
check_env_var "NODE_ENV" "Environment Mode" "required"

# Service URLs
check_env_var "GLM_TOE_PY_URL" "GLM Lightning Service URL" "optional"
check_env_var "CATALOG_API_BASE" "Catalog API Base URL" "optional"
check_env_var "NEXT_PUBLIC_API_BASE_URL" "Frontend API Base URL" "required"

echo ""

# =============================================================================
# 2. AWS SECRETS MANAGER
# =============================================================================
echo -e "${BLUE}2. AWS Secrets Manager Configuration${NC}"
echo "===================================="

# Check for production secrets
check_aws_secret "atmosinsight/api-keys" "Production API Keys Bundle"
check_aws_secret "atmosinsight/openweather" "OpenWeatherMap API Key"
check_aws_secret "atmosinsight/airnow" "AirNow API Key"  
check_aws_secret "atmosinsight/tracestrack" "TracesTrack API Key"
check_aws_secret "atmosinsight/firms" "NASA FIRMS Map Key"

echo ""

# =============================================================================
# 3. AWS INFRASTRUCTURE VERIFICATION
# =============================================================================
echo -e "${BLUE}3. AWS Infrastructure Verification${NC}"
echo "=================================="

# Lambda Functions
check_aws_infrastructure "lambda" "atmosinsight-proxy-api" "Main Proxy Lambda"
check_aws_infrastructure "lambda" "atmosinsight-catalog-api" "Catalog Lambda"

# S3 Buckets
check_aws_infrastructure "s3" "atmosinsight-app-bucket" "Web App Bucket"
check_aws_infrastructure "s3" "atmosinsight-assets" "Assets Bucket"

# CloudFront Distribution
# Note: Would need actual distribution ID - this is a placeholder
echo -e "${YELLOW}⚠️  CloudFront: Check manually - need distribution ID${NC}"

# API Gateway
check_aws_infrastructure "apigateway" "atmosinsight-api" "Main API Gateway"

echo ""

# =============================================================================
# 4. PRODUCTION DEPLOYMENT VERIFICATION
# =============================================================================
echo -e "${BLUE}4. Production Deployment Verification${NC}"
echo "====================================="

# Check if terraform state exists
if [[ -f "infra/terraform.tfstate" ]]; then
    echo -e "${GREEN}✅ Terraform state file exists${NC}"
    
    # Check terraform plan status
    echo "Checking terraform plan status..."
    cd infra 2>/dev/null || echo -e "${RED}❌ Cannot access infra directory${NC}"
    
    if command -v terraform >/dev/null 2>&1; then
        if terraform plan -detailed-exitcode >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Infrastructure is up to date${NC}"
        else
            echo -e "${YELLOW}⚠️  Infrastructure changes pending${NC}"
            INFRASTRUCTURE_ISSUES+=("TERRAFORM: Changes pending deployment")
        fi
    else
        echo -e "${YELLOW}⚠️  Terraform not available - cannot verify plan${NC}"
    fi
    
    cd - >/dev/null || true
else
    echo -e "${RED}❌ No terraform state found - infrastructure may not be deployed${NC}"
    INFRASTRUCTURE_ISSUES+=("TERRAFORM: No state file found")
fi

# Check if Lambda builds are current
echo "Checking Lambda build status..."
if [[ -f "tiling-services/proxy-api/index.mjs" && -f "tiling-services/catalog-api/index.mjs" ]]; then
    echo -e "${GREEN}✅ Lambda builds exist${NC}"
    
    # Check if builds are recent
    proxy_age=$(find tiling-services/proxy-api/index.mjs -mtime -1 2>/dev/null | wc -l)
    catalog_age=$(find tiling-services/catalog-api/index.mjs -mtime -1 2>/dev/null | wc -l)
    
    if [[ $proxy_age -eq 0 || $catalog_age -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  Lambda builds are older than 24 hours${NC}"
        INFRASTRUCTURE_ISSUES+=("LAMBDA_BUILDS: Builds may be stale")
    fi
else
    echo -e "${RED}❌ Lambda builds missing - run 'node scripts/build-lambdas.js'${NC}"
    INFRASTRUCTURE_ISSUES+=("LAMBDA_BUILDS: Missing build artifacts")
fi

echo ""

# =============================================================================
# 5. PROVIDER MANIFEST VALIDATION
# =============================================================================
echo -e "${BLUE}5. Provider Manifest Validation${NC}"
echo "==============================="

if [[ -f "packages/providers/providers.json" ]]; then
    echo -e "${GREEN}✅ Provider manifest exists${NC}"
    
    # Validate JSON syntax
    if jq empty packages/providers/providers.json >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Provider manifest is valid JSON${NC}"
        
        # Check for TODO status providers
        todo_count=$(jq '[.providers[] | select(.status == "todo")] | length' packages/providers/providers.json)
        if [[ $todo_count -gt 0 ]]; then
            echo -e "${RED}❌ Provider manifest has ${todo_count} TODO providers${NC}"
            echo "   Run ./scripts/verify-s3-buckets.sh to resolve"
            MISSING_CONFIGS+=("PROVIDER_MANIFEST: ${todo_count} providers marked as TODO")
        else
            echo -e "${GREEN}✅ All providers verified (no TODO status)${NC}"
        fi
        
        # Show provider summary
        total_providers=$(jq '.providers | length' packages/providers/providers.json)
        s3_providers=$(jq '[.providers[] | select(.access == "s3")] | length' packages/providers/providers.json)
        non_s3_providers=$(jq '[.providers[] | select(.access == "non_s3")] | length' packages/providers/providers.json)
        
        echo "   Total providers: ${total_providers}"
        echo "   S3 providers: ${s3_providers}"
        echo "   Non-S3 providers: ${non_s3_providers}"
    else
        echo -e "${RED}❌ Provider manifest has invalid JSON syntax${NC}"
        MISSING_CONFIGS+=("PROVIDER_MANIFEST: Invalid JSON syntax")
    fi
else
    echo -e "${RED}❌ Provider manifest missing${NC}"
    MISSING_CONFIGS+=("PROVIDER_MANIFEST: File not found")
fi

echo ""

# =============================================================================
# 6. PRODUCTION ENDPOINT TESTING
# =============================================================================
echo -e "${BLUE}6. Production Endpoint Testing${NC}"
echo "=============================="

PROD_URL="https://weather.westfam.media"

# Test health endpoint
echo "Testing production health endpoint..."
if curl -s --connect-timeout 10 "${PROD_URL}/api/health" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Health endpoint responding${NC}"
else
    echo -e "${RED}❌ Health endpoint not responding${NC}"
    INFRASTRUCTURE_ISSUES+=("ENDPOINT: Health check failed")
fi

# Test provider endpoint
echo "Testing provider endpoint..."
if curl -s --connect-timeout 10 "${PROD_URL}/api/s3/goes19-abi/" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ S3 provider endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠️  S3 provider endpoint not responding (may need specific path)${NC}"
fi

echo ""

# =============================================================================
# SUMMARY AND RECOMMENDATIONS
# =============================================================================
echo "=========================================="
echo -e "${BLUE}PRODUCTION READINESS SUMMARY${NC}"
echo "=========================================="
echo ""

# Verified configurations
if [[ ${#VERIFIED_CONFIGS[@]} -gt 0 ]]; then
    echo -e "${GREEN}✅ VERIFIED CONFIGURATIONS (${#VERIFIED_CONFIGS[@]}):${NC}"
    for config in "${VERIFIED_CONFIGS[@]}"; do
        echo "   - $config"
    done
    echo ""
fi

# Missing configurations
if [[ ${#MISSING_CONFIGS[@]} -gt 0 ]]; then
    echo -e "${RED}❌ MISSING CONFIGURATIONS (${#MISSING_CONFIGS[@]}):${NC}"
    for config in "${MISSING_CONFIGS[@]}"; do
        echo "   - $config"
    done
    echo ""
fi

# Infrastructure issues
if [[ ${#INFRASTRUCTURE_ISSUES[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  INFRASTRUCTURE ISSUES (${#INFRASTRUCTURE_ISSUES[@]}):${NC}"
    for issue in "${INFRASTRUCTURE_ISSUES[@]}"; do
        echo "   - $issue"
    done
    echo ""
fi

# Overall status
echo -e "${BLUE}📊 OVERALL PRODUCTION STATUS:${NC}"
if [[ ${#MISSING_CONFIGS[@]} -eq 0 && ${#INFRASTRUCTURE_ISSUES[@]} -eq 0 ]]; then
    echo -e "${GREEN}🎉 READY FOR PRODUCTION${NC}"
    echo ""
    echo "All critical configurations verified."
    echo "Infrastructure appears to be deployed and functional."
    echo ""
elif [[ ${#MISSING_CONFIGS[@]} -gt 0 ]]; then
    echo -e "${RED}🚨 NOT READY - MISSING CRITICAL CONFIGURATIONS${NC}"
    echo ""
    echo "IMMEDIATE ACTIONS REQUIRED:"
    echo "1. Configure missing environment variables"
    echo "2. Set up AWS Secrets Manager with required keys" 
    echo "3. Update provider manifest TODO items"
    echo ""
else
    echo -e "${YELLOW}⚠️  PARTIAL READINESS - INFRASTRUCTURE ISSUES${NC}"
    echo ""
    echo "RECOMMENDED ACTIONS:"
    echo "1. Deploy infrastructure updates: cd infra && terraform apply"
    echo "2. Rebuild and deploy Lambda functions: node scripts/build-lambdas.js"
    echo "3. Test production endpoints manually"
    echo ""
fi

echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo "1. Resolve any missing configurations above"
echo "2. Run: ./scripts/verify-s3-buckets.sh"
echo "3. Deploy: cd infra && terraform apply"
echo "4. Test: curl https://weather.westfam.media/api/health"
echo ""

# Return appropriate exit code
if [[ ${#MISSING_CONFIGS[@]} -gt 0 ]]; then
    exit 1
else
    exit 0
fi