# ADR 20250829: Catalog API as Node.js Lambda

## Status
Accepted

## Context
We need a simple service to expose `/catalog/layers` and `/catalog/layers/{id}/times` for the dashboard timeline. AWS Lambda with an HTTP API offers a lightweight path that fits the serverless model and allows the function to read from the `LayerIndex` DynamoDB table.

## Decision
Implement the catalog endpoints as a Node.js 18 Lambda function backed by API Gateway HTTP API. For now the function reads static JSON but will later query DynamoDB.

## Consequences
- Minimal always-on cost and scales automatically.
- HTTP API integration keeps latency low.
- Local development can invoke the handler directly.
