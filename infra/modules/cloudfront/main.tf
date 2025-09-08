resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = var.default_root_object
  aliases             = var.aliases

  origin {
    domain_name = var.origin_domain
    origin_id   = "s3-origin"
    
    s3_origin_config {
      origin_access_identity = ""
    }
  }

  # Optional API origin (API Gateway or other HTTP origin)
  dynamic "origin" {
    for_each = var.api_origin_domain == null ? [] : [var.api_origin_domain]
    content {
      domain_name = origin.value
      origin_id   = "api-origin"
      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # Route /api/* to the API origin if provided
  dynamic "ordered_cache_behavior" {
    for_each = var.api_origin_domain == null ? [] : [true]
    content {
      path_pattern           = "/api/*"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD", "OPTIONS"]
      target_origin_id       = "api-origin"
      viewer_protocol_policy = "redirect-to-https"
      min_ttl                = 0
      default_ttl            = 60
      max_ttl                = 60
      forwarded_values {
        query_string = true
        headers      = ["*"]
        cookies { forward = "none" }
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # Use ACM certificate if provided, otherwise use CloudFront default
    acm_certificate_arn            = var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != null ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.acm_certificate_arn == null
  }
}
