#!/bin/bash

# AtmosInsight S3 Bucket Verification Script
# This script verifies all unconfirmed S3 bucket configurations
# Run this before production deployment to update provider manifest

set -e

echo "🔍 AtmosInsight S3 Bucket Verification"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Results tracking
VERIFIED_BUCKETS=()
FAILED_BUCKETS=()
REQUIRES_AUTH_BUCKETS=()

# Function to test bucket access
test_bucket() {
    local bucket_name="$1"
    local description="$2"
    local expected_region="$3"
    
    echo -e "${BLUE}Testing: ${bucket_name} (${description})${NC}"
    
    # Test no-sign-request access first
    if aws s3 ls "s3://${bucket_name}/" --no-sign-request --region "${expected_region:-us-east-1}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SUCCESS: ${bucket_name} - Public access verified${NC}"
        
        # Get bucket region
        local actual_region
        actual_region=$(aws s3api get-bucket-location --bucket "${bucket_name}" --no-sign-request 2>/dev/null | jq -r '.LocationConstraint // "us-east-1"')
        echo -e "   Region: ${actual_region}"
        
        # Test prefix structure
        echo -e "   Sampling content structure:"
        aws s3 ls "s3://${bucket_name}/" --no-sign-request --region "${actual_region}" | head -5 | sed 's/^/   /'
        
        VERIFIED_BUCKETS+=("${bucket_name}:${actual_region}")
        return 0
        
    # Test with credentials if no-sign-request fails
    elif aws s3 ls "s3://${bucket_name}/" --region "${expected_region:-us-east-1}" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  REQUIRES AUTH: ${bucket_name} - Needs credentials${NC}"
        REQUIRES_AUTH_BUCKETS+=("${bucket_name}")
        return 0
        
    else
        echo -e "${RED}❌ FAILED: ${bucket_name} - Access denied or does not exist${NC}"
        FAILED_BUCKETS+=("${bucket_name}")
        return 1
    fi
    echo ""
}

# Function to test multiple bucket name variations
test_bucket_variations() {
    local base_name="$1"
    local description="$2"
    local expected_region="$3"
    shift 3
    local variations=("$@")
    
    echo -e "${YELLOW}🔍 Testing variations for ${description}:${NC}"
    
    local found_bucket=""
    for variation in "${variations[@]}"; do
        echo -n "  Testing ${variation}... "
        if aws s3 ls "s3://${variation}/" --no-sign-request --region "${expected_region:-us-east-1}" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ FOUND${NC}"
            found_bucket="$variation"
            break
        else
            echo -e "${RED}❌${NC}"
        fi
    done
    
    if [[ -n "$found_bucket" ]]; then
        test_bucket "$found_bucket" "$description" "$expected_region"
    else
        echo -e "${RED}❌ No valid bucket found for ${description}${NC}"
        FAILED_BUCKETS+=("${base_name} (${description})")
    fi
    echo ""
}

echo "Starting verification of TODO-marked providers..."
echo ""

# =============================================================================
# CRITICAL TODO: HRRR Zarr Analysis-Ready Data
# =============================================================================
echo -e "${BLUE}1. HRRR Zarr Analysis-Ready Data${NC}"
test_bucket_variations "hrrrzarr" "HRRR Zarr" "us-east-1" \
    "hrrrzarr" \
    "noaa-hrrr-zarr" \
    "noaa-hrrr-bdp-zarr" \
    "pangeo-hrrr" \
    "hrrr-zarr-pds"

# =============================================================================
# CRITICAL TODO: Sentinel-2 COG Collections
# =============================================================================
echo -e "${BLUE}2. Sentinel-2 COG Collections${NC}"
test_bucket_variations "sentinel2-cog" "Sentinel-2 COG" "us-west-2" \
    "sentinel-cogs" \
    "sentinel-s2-l2a-cogs" \
    "sentinel-s2-l1c" \
    "usgs-landsat-ard" \
    "element84-sentinel-2"

# =============================================================================
# ADDITIONAL RESEARCH: Missing Providers
# =============================================================================
echo -e "${BLUE}3. Additional Provider Research${NC}"

# GEFS (Global Ensemble Forecast System)
echo -e "${YELLOW}Testing GEFS availability:${NC}"
test_bucket_variations "gefs" "GEFS Ensemble" "us-east-1" \
    "noaa-gefs-pds" \
    "noaa-gefs-bdp-pds" \
    "gefs-pds"

# FIRMS additional access patterns
echo -e "${YELLOW}Testing FIRMS S3 access:${NC}"
test_bucket_variations "firms" "FIRMS Fire Data" "us-west-2" \
    "modis-pds" \
    "firms-modis-pds" \
    "nasa-firms-pds"

# S-111 Surface Currents
echo -e "${YELLOW}Testing S-111 Surface Currents:${NC}"
test_bucket_variations "s111" "S-111 Surface Currents" "us-east-1" \
    "noaa-s111-pds" \
    "iho-s111" \
    "nautical-charts-pds"

# ESA WorldCover
echo -e "${YELLOW}Testing ESA WorldCover region:${NC}"
test_bucket "esa-worldcover" "ESA WorldCover" "eu-central-1"

# =============================================================================
# VERIFICATION OF ASSUMED CONFIGS
# =============================================================================
echo -e "${BLUE}4. Verification of Key Production Buckets${NC}"

# Verify critical production buckets that should definitely work
production_buckets=(
    "noaa-goes19:GOES-19 Data:us-east-1"
    "noaa-goes18:GOES-18 Data:us-east-1"
    "noaa-hrrr-bdp-pds:HRRR Model:us-east-1"
    "noaa-mrms-pds:MRMS Radar:us-east-1"
    "unidata-nexrad-level2:NEXRAD Level II:us-east-1"
    "landsat-pds:Landsat Imagery:us-west-2"
    "copernicus-dem-30m:Copernicus DEM 30m:eu-central-1"
)

for bucket_info in "${production_buckets[@]}"; do
    IFS=':' read -r bucket desc region <<< "$bucket_info"
    test_bucket "$bucket" "$desc" "$region"
done

# =============================================================================
# RESULTS SUMMARY
# =============================================================================
echo ""
echo "=========================================="
echo -e "${BLUE}VERIFICATION RESULTS SUMMARY${NC}"
echo "=========================================="
echo ""

if [[ ${#VERIFIED_BUCKETS[@]} -gt 0 ]]; then
    echo -e "${GREEN}✅ VERIFIED BUCKETS (${#VERIFIED_BUCKETS[@]}):${NC}"
    for bucket in "${VERIFIED_BUCKETS[@]}"; do
        echo "   - $bucket"
    done
    echo ""
fi

if [[ ${#REQUIRES_AUTH_BUCKETS[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  REQUIRES AUTHENTICATION (${#REQUIRES_AUTH_BUCKETS[@]}):${NC}"
    for bucket in "${REQUIRES_AUTH_BUCKETS[@]}"; do
        echo "   - $bucket"
    done
    echo ""
fi

if [[ ${#FAILED_BUCKETS[@]} -gt 0 ]]; then
    echo -e "${RED}❌ FAILED VERIFICATION (${#FAILED_BUCKETS[@]}):${NC}"
    for bucket in "${FAILED_BUCKETS[@]}"; do
        echo "   - $bucket"
    done
    echo ""
fi

# =============================================================================
# NEXT STEPS
# =============================================================================
echo -e "${BLUE}📋 REQUIRED NEXT STEPS:${NC}"
echo ""

if [[ ${#FAILED_BUCKETS[@]} -gt 0 ]]; then
    echo -e "${RED}🚨 CRITICAL: Update provider manifest${NC}"
    echo "   1. Remove or research failed bucket configurations"
    echo "   2. Update packages/providers/providers.json with verified configs"
    echo "   3. Remove 'status: todo' for verified providers"
    echo ""
fi

if [[ ${#REQUIRES_AUTH_BUCKETS[@]} -gt 0 ]]; then
    echo -e "${YELLOW}🔑 AUTHENTICATION REQUIRED:${NC}"
    echo "   1. Configure AWS credentials for Earthdata/authenticated buckets"
    echo "   2. Test access with appropriate authentication"
    echo "   3. Update provider manifest with auth requirements"
    echo ""
fi

echo -e "${BLUE}📝 UPDATE PROVIDER MANIFEST:${NC}"
echo "   1. Edit packages/providers/providers.json"
echo "   2. Replace 'unknown' bucket/region values with verified data"
echo "   3. Update cost notes (same-region/cross-region)"
echo "   4. Remove 'status: todo' for completed providers"
echo "   5. Test updated manifest with: node -e \"JSON.parse(require('fs').readFileSync('packages/providers/providers.json'))\""
echo ""

echo -e "${GREEN}✅ Run deployment verification after updating manifest${NC}"
echo ""

# Return appropriate exit code
if [[ ${#FAILED_BUCKETS[@]} -gt 0 ]]; then
    exit 1
else
    exit 0
fi