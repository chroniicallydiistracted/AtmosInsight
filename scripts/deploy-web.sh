#!/usr/bin/env bash
set -euo pipefail

# Deploy the Next.js static web app to S3 + invalidate CloudFront
# Ensures production build does NOT use apps/web/.env.local

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
note(){ echo -e "${YELLOW}➡ $*${NC}"; }
ok(){ echo -e "${GREEN}✓ $*${NC}"; }
err(){ echo -e "${RED}✗ $*${NC}"; }

# Load root .env for AWS + bucket/cf vars if present
if [[ -f .env ]]; then set -a; source .env; set +a; ok "Loaded .env"; fi

: "${APP_BUCKET:?APP_BUCKET not set}"
: "${DIST_ID:?DIST_ID not set}"

# Check apps/web/.env.local for unsafe API base (do not modify filesystem)
ENV_LOCAL="apps/web/.env.local"
if [[ -f "$ENV_LOCAL" ]] && grep -qE '^NEXT_PUBLIC_API_BASE_URL=.*localhost' "$ENV_LOCAL"; then
  note "Warning: $ENV_LOCAL contains a localhost API base; ignoring it for production build."
fi

if [[ -z "${NEXT_PUBLIC_API_BASE_URL:-}" ]]; then
  note "NEXT_PUBLIC_API_BASE_URL is not set; site will use relative /api paths behind CloudFront."
else
  ok "Using API base: $NEXT_PUBLIC_API_BASE_URL"
fi

note "Building web app (Next.js build with output: export)"
pnpm --filter web build
ok "Build complete"



note "Syncing to S3 s3://$APP_BUCKET/"
aws s3 sync apps/web/out/ "s3://$APP_BUCKET/" --delete --profile "${AWS_PROFILE:-default}" --region "${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"
ok "Uploaded site"

note "Invalidating CloudFront distribution $DIST_ID"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --profile "${AWS_PROFILE:-default}" --region "${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}" >/dev/null
ok "Invalidation requested"

note "Done. Hard refresh your site to verify."
