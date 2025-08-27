# Infrastructure

Terraform configurations for AWS infrastructure.

Modules provision:
- S3 buckets for app, raw data, processed data, and tiles
- CloudFront distribution for app delivery
- DynamoDB table for LayerIndex
- RDS PostGIS instance for stations and warnings
