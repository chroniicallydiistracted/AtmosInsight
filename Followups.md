# Follow-up Tasks

## 1. HTTP Client Standardization
- **Scope:** remaining provider modules using direct `fetch`.
- **Goal:** ensure all outbound requests go through `@atmos/fetch-client` with retries/timeouts.
- **Tests:** `pnpm --filter @atmos/providers test` covering updated modules.
- **Requirements Needed:** list of providers still using raw `fetch`.

## 2. Remove Provider Duplicates
- **Scope:** `packages/providers/*.{js,ts}` pairs where both exist.
- **Goal:** keep TypeScript sources and generate JS artifacts during build.
- **Tests:** `pnpm --filter @atmos/providers build && pnpm --filter @atmos/providers test`.
- **Requirements Needed:** decision on build output targets (CommonJS, ESM).

## 3. Central Config Module
- **Scope:** monorepo-wide environment variable access.
- **Goal:** introduce `@atmos/config` that reads env once and exposes typed getters.
- **Tests:** unit tests for config defaults; integration run of proxy-server.
- **Requirements Needed:** agreed schema for required/optional env vars.

## 4. Documentation Audit
- **Scope:** docs/README and env examples.
- **Goal:** verify all env vars are documented and consistently named.
- **Tests:** `pnpm format:check` for markdown formatting.
- **Requirements Needed:** list of env vars from `@atmos/config` once defined.

## Requirements Needed Checklist
- [ ] Inventory of providers still using direct `fetch`.
- [ ] Build output format decision for providers package.
- [ ] Schema for `@atmos/config` module (types, defaults).
- [ ] Comprehensive env var list for documentation.
