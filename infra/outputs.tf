output "app_bucket_id" {
  value = module.app_bucket.bucket_id
}

output "raw_bucket_id" {
  value = module.raw_bucket.bucket_id
}

output "proc_bucket_id" {
  value = module.proc_bucket.bucket_id
}

output "tiles_bucket_id" {
  value = module.tiles_bucket.bucket_id
}

output "dynamodb_table_name" {
  value = module.layer_index.table_name
}

output "rds_endpoint" {
  value = module.database.endpoint
}

output "cloudfront_domain" {
  value = module.cdn.domain_name
}

output "catalog_api_url" {
  value = aws_apigatewayv2_api.catalog.api_endpoint
}
