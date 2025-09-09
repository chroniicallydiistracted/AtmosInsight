output "domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "origin_access_control_id" {
  value = aws_cloudfront_origin_access_control.this.id
}
