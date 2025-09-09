#!/usr/bin/env bash
set -euo pipefail

echo "==> Deploying weather-proxy-api (bundle, Terraform main infra, smoke tests)"

# Colors
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
note(){ echo -e "${YELLOW}➡ $*${NC}"; }
ok(){ echo -e "${GREEN}✓ $*${NC}"; }
err(){ echo -e "${RED}✗ $*${NC}"; }

# Prereqs
command -v npx >/dev/null || { err "npx not found"; exit 1; }
command -v terraform >/dev/null || { err "terraform not found"; exit 1; }
command -v aws >/dev/null || { err "aws CLI not found"; exit 1; }

# Load local env (non-fatal if missing)
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
  ok "Loaded .env for defaults"
fi

# Prefer AWS profile/SSO over .env static keys if a profile is set
if [[ -n "${AWS_PROFILE:-}" ]]; then
  unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
  ok "Using AWS profile: $AWS_PROFILE"
fi

# Preflight credentials check
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  err "AWS credentials are not valid. Set AWS_PROFILE or keys, e.g.:"
  echo "   export AWS_PROFILE=andre-admin"
  echo "   export AWS_REGION=us-east-1"
  exit 1
fi

# 1) Build/bundle Lambda
note "Bundling proxy Lambda with esbuild"
npx esbuild tiling-services/proxy-api/index.ts \
  --bundle --platform=node --format=esm \
  --outfile=tiling-services/proxy-api/index.mjs \
  --packages=bundle --external:fs --external:path
ok "Built tiling-services/proxy-api/index.mjs ($(du -h tiling-services/proxy-api/index.mjs | cut -f1))"

# 2) Use main infrastructure directory (not proxy-only)
TFVARS_DIR="infra"
pushd "$TFVARS_DIR" >/dev/null

# 3) terraform init (main infrastructure)
note "Initializing Terraform (main infrastructure)"
terraform init -input=false

# 4) Only update the Lambda function (skip imports to avoid conflicts)
note "Planning Lambda function update only"
terraform plan -target=aws_lambda_function.proxy_api -out=tfplan -input=false

note "Applying Lambda function update"
terraform apply -auto-approve tfplan

# 5) Get the correct API endpoint from main infrastructure 
API_URL=$(terraform output -raw proxy_api_endpoint)
ok "API Gateway endpoint: $API_URL"

# Get CloudFront URL if available
if terraform state list | grep -q "module.cdn"; then
  CLOUDFRONT_URL="https://$(terraform output -raw cloudfront_domain 2>/dev/null || echo "CloudFront domain not available")"
  ok "CloudFront URL: $CLOUDFRONT_URL"
else
  note "CloudFront not deployed in this infrastructure"
fi

echo
note "Running smoke tests against production endpoints"
set +e

# Test CloudFront endpoints (production)
if [[ -n "${CLOUDFRONT_URL:-}" ]] && [[ "$CLOUDFRONT_URL" != "https://CloudFront domain not available" ]]; then
  note "Testing CloudFront endpoints..."
  curl -fsSI "$CLOUDFRONT_URL/api/healthz" | sed -n '1,5p' || true
  curl -fsSI "$CLOUDFRONT_URL/api/providers" | sed -n '1,5p' || true
  curl -fsSI "$CLOUDFRONT_URL/api/rainviewer/index.json" | sed -n '1,5p' || true
  curl -fsSI "$CLOUDFRONT_URL/api/owm/precipitation_new/6/32/22.png" | sed -n '1,5p' || true
  curl -fsSI "$CLOUDFRONT_URL/api/tracestrack/topo_en/7/50/55.webp" | sed -n '1,5p' || true
fi

# Test direct API Gateway endpoints (fallback)
note "Testing direct API Gateway endpoints..."
curl -fsSI "$API_URL/api/healthz" | sed -n '1,5p' || true
curl -fsSI "$API_URL/api/providers" | sed -n '1,5p' || true
curl -fsSI "$API_URL/api/rainviewer/index.json" | sed -n '1,5p' || true

set -e

if [[ -n "${CLOUDFRONT_URL:-}" ]] && [[ "$CLOUDFRONT_URL" != "https://CloudFront domain not available" ]]; then
  ok "Deploy complete. Production site: $CLOUDFRONT_URL"
else
  ok "Deploy complete. Direct API access: $API_URL"
  note "Deploy CloudFront with: cd infra && terraform plan -var 'cdn_enabled=true' && terraform apply"
fi

popd >/dev/null
