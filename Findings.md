# Findings Report

## Executive Summary

- **Severity counts:** P1:2, P2:2, P3:2
- **Top risk areas:** environment variable drift, inconsistent HTTP client usage.
- **Most urgent items:**
  1. OpenWeatherMap API key naming drift caused missing credentials.
  2. NWS provider bypassed shared retry/timeout client.
  3. Raw `fetch` usage across providers without centralized config.
  4. Hard-coded User-Agent on OpenStreetMap requests.
  5. Undocumented `NEXT_PUBLIC_API_BASE_URL` env var.

## Issue Inventory

| Sev | Area        | File:Line                                                                   | Rule Violated                                      | Evidence                                     | Impact/Risk                            | Proposed Fix                                       | Confidence | Fix Status | Requirements Needed              |
| --- | ----------- | --------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------- | -------------------------------------- | -------------------------------------------------- | ---------- | ---------- | -------------------------------- |
| P1  | Env vars    | proxy-server/src/app.ts:359-364; tiling-services/proxy-api/index.ts:191-193 | Invariant: consistent env var naming               | `OWM_API_KEY` vs `OPENWEATHER_API_KEY` usage | Missing credentials break tile fetches | Standardize on `OPENWEATHER_API_KEY` across repo   | High       | Applied    | –                                |
| P1  | HTTP client | packages/providers/nws.ts:13-20                                             | Invariant: all external requests use shared client | Direct `fetch` without retries               | Upstream glitches propagate to users   | Use `fetchWithRetry` with `DEFAULT_NWS_USER_AGENT` | High       | Applied    | –                                |
| P2  | Structure   | packages/providers/nws.ts & nws.js                                          | Avoid duplicated logic                             | Both TS and JS versions coexist              | Drift between implementations          | Remove JS duplicate, generate build output         | Medium     | Info       | Decision on build output targets |
| P2  | Config      | rg `process.env` across packages                                            | Env vars via one config module                     | Modules read `process.env` directly          | Hard to audit and mock                 | Introduce central `@atmos/config` helper           | Medium     | Info       | Agree on env schema              |
| P3  | Headers     | proxy-server/src/app.ts:305                                                 | Consistent User-Agent for external providers       | Hard-coded `'AtmosInsight/1.0...'`           | Divergent headers risk rate limiting   | Reuse `DEFAULT_NWS_USER_AGENT`                     | Medium     | Applied    | –                                |
| P3  | Docs        | apps/web/env.example:4                                                      | Env vars documented                                | `NEXT_PUBLIC_API_BASE_URL` absent from docs  | Onboarding confusion                   | Document variable in README                        | High       | Applied    | –                                |

## Invariant & Identifier Inventory (subset)

- `NWS_USER_AGENT` – used in proxy and provider modules for NWS calls.
- `OPENWEATHER_API_KEY` – OpenWeatherMap credentials.
- `NEXT_PUBLIC_API_BASE_URL` – frontend API base.
- `GIBS_ENABLED`, `RAINVIEWER_ENABLED`, `AIRNOW_ENABLED`, `OPENAQ_ENABLED`, `TRACESTRACK_API_KEY`, `GLM_TOE_PY_URL`, etc.
- Constants: `DEFAULT_NWS_USER_AGENT`, `NWS_API_BASE`, `OWM_BASE`.
- HTTP headers: `User-Agent`, `Accept: application/geo+json` for NWS, various API keys.
