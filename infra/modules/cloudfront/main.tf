data "aws_cloudfront_cache_policy" "managed_caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "managed_all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_cloudfront_cache_policy" "managed_caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "atmosinsight-staging-site-weather-oac"
  description                       = "OAC for S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = var.default_root_object
  aliases             = var.aliases

  origin {
    domain_name              = var.origin_domain
    origin_id                = "s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
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
  # 1) Cached tiles: /api/basemap/*
  dynamic "ordered_cache_behavior" {
    for_each = var.api_origin_domain == null ? [] : [true]
    content {
      path_pattern           = "/api/basemap/*"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD", "OPTIONS"]
      target_origin_id       = "api-origin"
      viewer_protocol_policy = "redirect-to-https"
      cache_policy_id          = data.aws_cloudfront_cache_policy.managed_caching_optimized.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_all_viewer_except_host.id
    }
  }

  # 2) General API (no cache)
  dynamic "ordered_cache_behavior" {
    for_each = var.api_origin_domain == null ? [] : [true]
    content {
      path_pattern           = "/api/*"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD", "OPTIONS"]
      target_origin_id       = "api-origin"
      viewer_protocol_policy = "redirect-to-https"
      # Use AWS managed policies for APIs: no cache and forward all viewer headers except Host
      cache_policy_id          = data.aws_cloudfront_cache_policy.managed_caching_disabled.id
      origin_request_policy_id = data.aws_cloudfront_origin_request_policy.managed_all_viewer_except_host.id
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
