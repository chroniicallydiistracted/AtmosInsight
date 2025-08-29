# Follow-up Tasks

## Bundle 1: Proxy constants & caching
- ~~Centralize weather provider base URLs and `NWS_USER_AGENT` in shared module.~~
- ~~Apply `shortLived60` middleware to NWS alerts route.~~
- **Tests:**
  - Unit: import shared constants in `gibs.ts` and `owm.ts` with identical values.
  - Integration: `/api/nws/alerts/active?area=AZ` returns `200` with `Cache-Control: public, max-age=60`.

## Bundle 2: Environment variable gating
- [x] ~~Wire `GIBS_ENABLED` into proxy server to allow disabling routes.~~
- **Tests:**
  - [x] ~~Unit: server responds `503` when `GIBS_ENABLED=false`.~~

## Bundle 3: HTTP client wrapper
- [x] ~~Extract `fetchWithRetry` into reusable module with timeout support.~~
- **Tests:**
  - [x] ~~Unit: verify retry/backoff on `429` and timeout rejection.~~
  - Integration: simulate upstream `429` to confirm retry count.

## Bundle 4: Tokenize SVG colors
- [x] ~~Replace hard-coded `#666` fills in SVG icons with theme tokens or CSS variables.~~
- **Tests:**
  - Manual verification that icons respond to CSS `--color-neutral-500` token.

## Bundle 5: tsconfig alignment
- [x] ~~Evaluate migrating `proxy-server` to `moduleResolution: bundler` or document divergence.~~
- **Tests:**
  - [x] `pnpm lint` and `pnpm test` across repo still pass after config change.
