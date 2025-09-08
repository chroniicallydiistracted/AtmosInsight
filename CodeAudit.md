# AtmosInsight Codebase Audit

**Date:** September 8, 2025

This report summarizes code issues identified in the AtmosInsight repository. Findings are organized by category with file and line references plus recommended actions.

## Incomplete or Placeholder Implementations
- **Unconfigurable forecast units and source** – `apps/web/src/components/ForecastPopover.tsx` still hardcodes metric units and default provider; TODO notes configurable options. `const units = 'metric'; // TODO: Make configurable`【F:apps/web/src/components/ForecastPopover.tsx†L72-L74】
- **Secrets Manager integration stub** – `tiling-services/proxy-api/index.ts` fetches API keys from environment variables and leaves a TODO for AWS Secrets Manager support【F:tiling-services/proxy-api/index.ts†L15-L25】
- **Web app lacks tests** – `apps/web/package.json` defines `"test": "echo 'no tests'"`, providing no automated coverage【F:apps/web/package.json†L7-L12】

## Bugs and Error-Prone Code
- **TypeScript lint errors** – `apps/web/src/app/page.tsx` uses `any` types in the `source.error` handler, triggering ESLint failures【F:apps/web/src/app/page.tsx†L95-L97】【f50213†L8-L17】
- **Missing hook dependency** – `ForecastPopover` omits `fetchForecast` from `useEffect` dependencies, risking stale closures【F:apps/web/src/components/ForecastPopover.tsx†L58-L63】【f50213†L14-L17】
- **Malformed provider manifest** – `providers.json` contains duplicated and truncated entries, breaking JSON structure【F:providers.json†L1-L40】
- **Fetch client test failure** – `packages/fetch-client` tests error out with `packageEntryFailure` when resolving `@atmos/shared-utils`【c0fd76†L45-L58】

## Security Concerns
- **Overly permissive CORS** – Proxy API sets `Access-Control-Allow-Origin: *`, allowing any origin to access API responses【F:tiling-services/proxy-api/index.ts†L41-L48】
- **Global map reference** – Web page exposes map instance on `window` in development; ensure removal or guarding for production【F:apps/web/src/app/page.tsx†L100-L103】

## Code Quality & Maintainability
- **Hardcoded configuration** – ForecastPopover hardcodes units and source instead of using state or props【F:apps/web/src/components/ForecastPopover.tsx†L72-L74】
- **Uncaught fetch errors** – NWS alerts fetch chain lacks a `catch`, risking unhandled promise rejections【F:apps/web/src/app/page.tsx†L106-L114】
- **Console debug in production path** – Proxy API logs attempted secret fetches, which may leak metadata【F:tiling-services/proxy-api/index.ts†L19-L23】

## Performance
- **RainViewer index cache TTL** – `getRainviewerIndex` uses a fixed 60 s TTL; consider configurability or cache invalidation strategy for high-load scenarios【F:tiling-services/proxy-api/index.ts†L73-L87】

## Dependencies & Configuration
- **Single shared TypeScript version** – Root and packages align on `typescript@^5.9.2`, but ensure all workspaces lock to this version to avoid build drift【F:package.json†L42-L46】【F:apps/web/package.json†L43-L45】
- **Providers manifest not validated** – Absence of schema or validation tooling means malformed `providers.json` goes undetected; integrate JSON schema checks【F:providers.json†L1-L40】

## Recommendations (Ordered by Severity)
1. **Fix lint/test failures** – Replace `any` types in `page.tsx`, include missing hook dependencies, and resolve `@atmos/shared-utils` import for fetch-client tests.
2. **Repair `providers.json`** – Reconstruct valid JSON and add schema validation to CI.
3. **Implement configuration options** – Make forecast units/source user-configurable and integrate Secrets Manager for API keys.
4. **Harden security** – Restrict CORS origins where possible, remove debug map exposure in production, and avoid logging secret names.
5. **Add test coverage** – Replace placeholder web tests with meaningful suites and add error handling for NWS alerts fetch.
6. **Review caching strategy** – Expose RainViewer cache TTL via configuration and handle refresh logic for long-running processes.

