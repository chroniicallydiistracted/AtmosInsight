# AtmosInsight Codebase Audit

**Date:** September 8, 2025

This report summarizes code issues identified in the AtmosInsight repository. Findings are organized by category with file and line references plus recommended actions.

## Incomplete or Placeholder Implementations
- **Unconfigurable forecast units and source** – `apps/web/src/components/ForecastPopover.tsx` still hardcodes metric units and default provider; TODO notes configurable options. `const units = 'metric'; // TODO: Make configurable`【F:apps/web/src/components/ForecastPopover.tsx†L72-L74】
- **Secrets Manager integration stub** – `tiling-services/proxy-api/index.ts` fetches API keys from environment variables and leaves a TODO for AWS Secrets Manager support【F:tiling-services/proxy-api/index.ts†L15-L25】
- **Web app lacks tests** – `apps/web/package.json` defines `"test": "echo 'no tests'"`, providing no automated coverage【F:apps/web/package.json†L7-L12】
- **UI stubs** – Several components are placeholders: `cmdk/CommandMenu.tsx` never opens the menu, `panel/LayersPanel.tsx` shows "No layers", `panel/StylePopover.tsx` renders a stub editor, and `toast/ToastHost.tsx` keeps an empty toast list【F:apps/web/src/components/cmdk/CommandMenu.tsx†L5-L6】【F:apps/web/src/components/panel/LayersPanel.tsx†L4-L15】【F:apps/web/src/components/panel/StylePopover.tsx†L1-L4】【F:apps/web/src/components/toast/ToastHost.tsx†L4-L13】
- **Card and RAG placeholders** – `cards/ForecastPopover.tsx` returns a static "Forecast" div, `cards/AssistantCard.tsx` only displays title/body text, and `lib/rag/client.ts` yields a single stubbed chunk【F:apps/web/src/components/cards/ForecastPopover.tsx†L1-L4】【F:apps/web/src/components/cards/AssistantCard.tsx†L1-L14】【F:apps/web/lib/rag/client.ts†L1-L8】
- **Static dark theme** – `apps/web/src/app/layout.tsx` hardcodes a `theme-dark` class with a comment to manually switch themes, leaving no runtime toggle【F:apps/web/src/app/layout.tsx†L21-L23】
- **Missing data pipeline implementation** – `data-pipelines/README.md` only contains a header with no instructions or code, indicating the pipelines are unimplemented【F:data-pipelines/README.md†L1-L1】
- **Hardcoded GIBS XYZ alias** – `packages/providers/gibs.ts` fixes layer `MODIS_Terra_CorrectedReflectance_TrueColor` and date `2020-06-01` when building XYZ URLs, preventing dynamic layer selection【F:packages/providers/gibs.ts†L54-L59】
- **Missing tile-service documentation** – `tiling-services/README.md` contains only a title with no setup or usage guidance【F:tiling-services/README.md†L1-L1】
- **Empty tool extension guides** – `TOOLS-IDE-EXTENSIONS.md` and `TOOLS-IDE-EXTENSIONS-UNMAPPED.md` are blank placeholders, offering no IDE setup instructions【f18bb3†L1-L2】【95cc01†L1-L2】
- **Catalog API data stub** – `tiling-services/catalog-api/index.ts` serves layer metadata directly from local JSON files with no validation or update mechanism【F:tiling-services/catalog-api/index.ts†L9-L32】
- **NEXRAD product fixed** – `packages/providers/nexrad.ts` appends a hard-coded `_V06` suffix when building S3 keys, preventing other radar volume versions from being requested【F:packages/providers/nexrad.ts†L15-L18】
- **Outdated GOES catalog script** – `scripts/update-goes-catalog.js` still targets a `web/public/catalog.json` path that no longer exists in the monorepo structure, indicating an obsolete utility【F:scripts/update-goes-catalog.js†L4-L5】

## Bugs and Error-Prone Code
- **TypeScript lint errors** – `apps/web/src/app/page.tsx` uses `any` types in the `source.error` handler, triggering ESLint failures【F:apps/web/src/app/page.tsx†L95-L97】【f50213†L8-L17】
- **Missing hook dependency** – `ForecastPopover` omits `fetchForecast` from `useEffect` dependencies, risking stale closures【F:apps/web/src/components/ForecastPopover.tsx†L58-L63】【f50213†L14-L17】
- **Malformed provider manifest** – `providers.json` contains duplicated and truncated entries, breaking JSON structure【F:providers.json†L1-L40】
- **Fetch client test failure** – `packages/fetch-client` tests error out with `packageEntryFailure` when resolving `@atmos/shared-utils`【c0fd76†L45-L58】
- **Hard-coded port config path** – `packages/shared-utils/index.ts` reads `/AtmosInsight/config/ports.json` before falling back to a relative path, limiting portability across installations【F:packages/shared-utils/index.ts†L10-L21】
- **Port utilities depend on Unix commands** – `isPortInUse` and `killProcessOnPort` shell out to `lsof`, `ss`, `fuser`, and `pkill`, which may be missing on non‑Unix hosts【F:packages/shared-utils/index.ts†L90-L167】
- **Misaliased fetch-client** – `scripts/build-lambdas.js` maps `@atmos/fetch-client` to `packages/shared-utils/dist/index.js`, bundling the wrong module during Lambda builds【F:scripts/build-lambdas.js†L18-L22】

## Security Concerns
- **Overly permissive CORS** – Proxy API sets `Access-Control-Allow-Origin: *`, allowing any origin to access API responses【F:tiling-services/proxy-api/index.ts†L41-L48】
- **Global map reference** – Web page exposes map instance on `window` in development; ensure removal or guarding for production【F:apps/web/src/app/page.tsx†L100-L103】
- **Inline API keys in Terraform** – `infra/proxy-only/main.tf` injects API keys directly into Lambda environment variables; prefer AWS Secrets Manager or Parameter Store【F:infra/proxy-only/main.tf†L62-L70】
- **RDS snapshot disabled** – `infra/modules/rds-postgis/main.tf` sets `skip_final_snapshot = true`, risking irreversible data loss on deletion【F:infra/modules/rds-postgis/main.tf†L1-L10】
- **Wildcard CORS in GLM service** – `glm_toe` FastAPI middleware allows any origin with credentials, broadening attack surface【F:tiling-services/glm_toe/app/main.py†L38-L45】
- **Destructive S3 bucket defaults** – `infra/modules/s3-bucket/main.tf` enables `force_destroy`, allowing buckets with data to be deleted without confirmation【F:infra/modules/s3-bucket/main.tf†L1-L4】
- **VS Code auto-approve settings** – `.vscode/settings.json` enables automatic approval for certain terminal commands from chat tools, which could execute without user confirmation【F:.vscode/settings.json†L32-L48】

## Code Quality & Maintainability
- **Hardcoded configuration** – ForecastPopover hardcodes units and source instead of using state or props【F:apps/web/src/components/ForecastPopover.tsx†L72-L74】
- **Deck overlay casts** – `lib/overlays/deckOverlay.ts` disables `no-explicit-any` to call `setMap` and exports empty scatterplot layer subclasses【F:apps/web/lib/overlays/deckOverlay.ts†L5-L13】
- **Untyped layout metadata** – `apps/web/src/app/layout.tsx` defines `metadata` as a plain object without Next.js `Metadata` typing, reducing compile-time validation【F:apps/web/src/app/layout.tsx†L9-L13】
- **Silent map update failures** – `GlmLegend.tsx` wraps MapLibre source and layer mutations in multiple empty `try/catch` blocks, obscuring errors during tile refreshes【F:apps/web/src/components/GlmLegend.tsx†L53-L109】
- **Duplicate manual type definitions** – Provider modules maintain separate `.d.ts` files like `airnow.d.ts`, increasing drift risk between declarations and implementations【F:packages/providers/airnow.d.ts†L1-L8】
- **Provider JSON typing gaps** – `openmeteo.ts`, `tomorrowio.ts`, and `visualcrossing.ts` all return `Promise<any>` from `fetchJson`, undermining type safety【F:packages/providers/openmeteo.ts†L15-L17】【F:packages/providers/tomorrowio.ts†L15-L23】【F:packages/providers/visualcrossing.ts†L17-L19】
- **Uncaught fetch errors** – NWS alerts fetch chain lacks a `catch`, risking unhandled promise rejections【F:apps/web/src/app/page.tsx†L106-L114】
- **Console debug in production path** – Proxy API logs attempted secret fetches, which may leak metadata【F:tiling-services/proxy-api/index.ts†L19-L23】
- **Extraneous Zone.Identifier files** – Windows metadata files clutter the scripts directory and should be removed【58d987†L1-L14】
- **Port management scripts rely on external binaries** – `port_killer.py` shells out to `netstat`, `ss`, `fuser`, `lsof`, and `ps`, requiring these commands to exist on the host system and potentially limiting portability【F:scripts/port_killer.py†L27-L37】
- **Leftover patch artifact** – `StagedFixes.patch` at the repository root holds obsolete provider diffs and should be deleted【F:StagedFixes.patch†L1-L19】
- **Obsolete CI workflow** – `.github/workflows/ci.yml` still runs npm-based jobs for removed `proxy-server` and `dashboard-app` directories, leaving the pipeline misaligned with the pnpm workspace【F:.github/workflows/ci.yml†L9-L61】
- **Hard-coded port config path** – `packages/shared-utils/index.ts` tries `/AtmosInsight/config/ports.json` before falling back to a repo-relative path, reducing portability across environments【F:packages/shared-utils/index.ts†L11-L20】
- **Regex-based fetch migration** – `migrate-fetch.js` replaces `fetch` calls with `fetchWithRetry` via regex, risking incorrect transformations and leaving `.backup` files【F:migrate-fetch.js†L60-L79】【F:migrate-fetch.js†L105-L108】
- **Stale README configuration** – `README_MAIN.md` shows an outdated `config/ports.json` example with a nested database object and repeats tile cache environment variables, leading to documentation drift【F:README_MAIN.md†L18-L24】【F:README_MAIN.md†L84-L95】
- **Angular-heavy extension installer** – `install-vscode-extensions.sh` installs numerous Angular-focused extensions that do not align with the repository’s stack and may confuse contributors【F:install-vscode-extensions.sh†L8-L37】
- **Outdated documentation references** – `CLAUDE.md` and `docs/Implementation_Checklist_and_Status.md` still cite removed `proxy-server` and `dashboard-app` directories, creating confusion【F:CLAUDE.md†L22-L23】【F:docs/Implementation_Checklist_and_Status.md†L14-L24】
- **Fixed development ports** – `config/ports.json` hardcodes proxy, catalog, web, and database ports (3000–3002, 3306) without overrides, requiring manual edits for alternate setups【F:config/ports.json†L1-L5】
 - **Workspace lists missing package** – `pnpm-workspace.yaml` includes a `proxy-server` entry though the directory is absent, leading to potential pnpm warnings【F:pnpm-workspace.yaml†L1-L5】
 - **Token build watcher risks** – `packages/tokens/build.mjs` uses `fs.watch` without debouncing, which may trigger redundant rebuilds or miss rapid file changes on some platforms【F:packages/tokens/build.mjs†L106-L109】

## Performance
// RainViewer audit notes removed (service retired)
- **CloudFront header forwarding** – Wildcard header forwarding (`headers = ["*"]`) in `cloudfront` module prevents effective caching and increases latency【F:infra/modules/cloudfront/main.tf†L53-L56】
- **Catalog API reads from disk on every call** – `tiling-services/catalog-api/index.ts` performs `fs.readFile` for each request, which may become I/O bound; cache layer metadata in memory【F:tiling-services/catalog-api/index.ts†L9-L32】

## Dependencies & Configuration
- **Single shared TypeScript version** – Root and packages align on `typescript@^5.9.2`, but ensure all workspaces lock to this version to avoid build drift【F:package.json†L42-L46】【F:apps/web/package.json†L43-L45】
- **Providers manifest not validated** – Absence of schema or validation tooling means malformed `providers.json` goes undetected; integrate JSON schema checks【F:providers.json†L1-L40】
- **Placeholder Python requirements** – Root `requirements.txt` claims no external dependencies, which may hide actual needs for scripts or services【F:requirements.txt†L1-L3】


## Recommendations (Ordered by Severity)
1. **Fix lint/test failures** – Replace `any` types in `page.tsx`, include missing hook dependencies, and resolve `@atmos/shared-utils` import for fetch-client tests.
2. **Repair `providers.json`** – Reconstruct valid JSON and add schema validation to CI.
3. **Implement configuration options** – Make forecast units/source user-configurable and integrate Secrets Manager for API keys.
4. **Harden security** – Restrict CORS origins where possible, remove debug map exposure in production, and avoid logging secret names.
5. **Add test coverage** – Replace placeholder web tests with meaningful suites and add error handling for NWS alerts fetch.
6. **Review caching strategy** – Remove legacy references; consider cache policy docs for remaining providers.

