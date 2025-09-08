#!/usr/bin/env bash
set -euo pipefail

echo "==> Deploying weather-proxy-api (bundle, Terraform, smoke tests)"

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
  --packages=bundle
ok "Built tiling-services/proxy-api/index.mjs ($(du -h tiling-services/proxy-api/index.mjs | cut -f1))"

# 2) Prepare Terraform tfvars for proxy-only
TFVARS_DIR="infra/proxy-only"
mkdir -p "$TFVARS_DIR"
cat > "$TFVARS_DIR/terraform.tfvars" <<EOF
region = "${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
nws_user_agent = "${NWS_USER_AGENT:-}"
openweather_api_key = "${OPENWEATHER_API_KEY:-}"
tracestrack_api_key = "${TRACESTRACK_API_KEY:-}"
glm_toe_py_url = "${GLM_TOE_PY_URL:-}"
catalog_api_base = "${CATALOG_API_BASE:-}"
EOF
ok "Wrote $TFVARS_DIR/terraform.tfvars"

pushd "$TFVARS_DIR" >/dev/null

# 3) terraform init
note "Initializing Terraform (proxy-only)"
terraform init -input=false

# 4) Import existing resources if present to avoid conflicts
ROLE_NAME="weather-proxy-api-role"
FUNC_NAME="weather-proxy-api"

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  note "Importing IAM role $ROLE_NAME into state"
  terraform import -input=false aws_iam_role.proxy_api "$ROLE_NAME" >/dev/null 2>&1 || true
fi

if aws lambda get-function --function-name "$FUNC_NAME" >/dev/null 2>&1; then
  note "Importing Lambda $FUNC_NAME into state"
  terraform import -input=false aws_lambda_function.proxy_api "$FUNC_NAME" >/dev/null 2>&1 || true
fi

# Prefer API ID already in Terraform state to avoid mismatches
STATE_API_ID=$(terraform state show aws_apigatewayv2_api.proxy 2>/dev/null | awk -F' = ' '/^\s*id\s*=/{print $2}' | tr -d '"') || true
API_ID=${STATE_API_ID:-$(aws apigatewayv2 get-apis --query "Items[?Name=='weather-proxy-api'].ApiId | [0]" --output text 2>/dev/null || echo "")}
if [[ "$API_ID" != "" && "$API_ID" != "None" ]]; then
  note "Importing API Gateway ID $API_ID"
  terraform import -input=false aws_apigatewayv2_api.proxy "$API_ID" >/dev/null 2>&1 || true
  # Import default stage if present
  if aws apigatewayv2 get-stage --api-id "$API_ID" --stage-name '$default' >/dev/null 2>&1; then
    terraform import -input=false aws_apigatewayv2_stage.proxy "$API_ID/\$default" >/dev/null 2>&1 || true
  fi
  # Import route ANY /api/{proxy+} if present
  ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$API_ID" --query "Items[?RouteKey=='ANY /api/{proxy+}'].RouteId | [0]" --output text 2>/dev/null || echo "")
  if [[ "$ROUTE_ID" != "" && "$ROUTE_ID" != "None" ]]; then
    terraform import -input=false aws_apigatewayv2_route.proxy_any "$API_ID/$ROUTE_ID" >/dev/null 2>&1 || true
  fi
fi

# Import existing Lambda permission if present to avoid SID conflicts
POLICY_STR=$(aws lambda get-policy --function-name "$FUNC_NAME" --query 'Policy' --output text 2>/dev/null || echo "")
if echo "$POLICY_STR" | grep -q '"Sid":"AllowAPIGatewayInvoke"'; then
  note "Importing existing Lambda permission AllowAPIGatewayInvoke"
  terraform import -input=false aws_lambda_permission.proxy_invoke "$FUNC_NAME/AllowAPIGatewayInvoke" >/dev/null 2>&1 || true
fi

# 5) Plan/apply
note "Planning changes"
terraform plan -out=tfplan -input=false
note "Applying changes"
terraform apply -auto-approve tfplan

# 6) Output API endpoint and run smoke tests
API_URL=$(terraform output -raw proxy_api_endpoint)
ok "API Gateway endpoint: $API_URL"

echo
note "Running smoke tests against $API_URL"
set +e
curl -fsSI "$API_URL/api/healthz" | sed -n '1,10p' || true
curl -fsSI "$API_URL/api/nws/alerts/active?area=AZ" | sed -n '1,10p' || true
curl -fsSI "$API_URL/api/rainviewer/index.json" | sed -n '1,10p' || true
curl -fsSI "$API_URL/api/osm/cyclosm/0/0/0.png" | sed -n '1,10p' || true
curl -fsSI "$API_URL/api/tracestrack/topo_en/1/1/1.webp" | sed -n '1,10p' || true
curl -fsSI "$API_URL/api/forecast?lat=33.45&lon=-112.07" | sed -n '1,10p' || true
set -e

ok "Deploy proxy complete. Point CloudFront /api/* to $API_URL for production."

popd >/dev/null
