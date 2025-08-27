resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = var.default_root_object

  origin {
    domain_name = var.origin_domain
    origin_id   = "s3-origin"
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
