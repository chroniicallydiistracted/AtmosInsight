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
  value = try(module.database[0].endpoint, null)
}

output "cloudfront_domain" {
  value = try(module.cdn[0].domain_name, null)
}

output "catalog_api_url" {
  value = aws_apigatewayv2_api.catalog.api_endpoint
}
