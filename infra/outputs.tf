output "app_bucket" {
  value = aws_s3_bucket.app.id
}

output "layer_index_table" {
  value = aws_dynamodb_table.layer_index.name
}

output "postgis_endpoint" {
  value = aws_db_instance.postgis.address
}
