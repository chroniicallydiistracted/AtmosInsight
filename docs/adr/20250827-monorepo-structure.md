# ADR 20250827: Monorepo Structure

## Status

Accepted

## Context

The project requires multiple components (app, infrastructure, pipelines, services) that share a common specification. A unified repository simplifies coordination and enforces consistent coding standards and CI/CD across modules.

## Decision

Adopt a monorepo layout with top-level directories:

- `dashboard-app/`
- `infra/`
- `data-pipelines/`
- `tiling-services/`
- `docs/`

## Consequences

- Easier cross-cutting changes and shared tooling.
- Single pull request spans app and infrastructure code.
- Requires tooling to manage disparate build systems (npm, Terraform, etc.).
