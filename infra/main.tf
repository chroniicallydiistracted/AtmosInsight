terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# CloudFront managed policies for API behavior
data "aws_cloudfront_cache_policy" "managed_caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "managed_all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

module "app_bucket" {
  source = "./modules/s3-bucket"
  name   = var.app_bucket_name
}

module "raw_bucket" {
  source = "./modules/s3-bucket"
  name   = var.raw_bucket_name
}

module "proc_bucket" {
  source = "./modules/s3-bucket"
  name   = var.proc_bucket_name
}

module "tiles_bucket" {
  source = "./modules/s3-bucket"
  name   = var.tiles_bucket_name
}

module "layer_index" {
  source    = "./modules/dynamodb-table"
  name      = var.dynamodb_table_name
  hash_key  = "PK"
  range_key = "SK"
}

module "database" {
  count          = var.database_enabled ? 1 : 0
  source         = "./modules/rds-postgis"
  identifier     = var.rds_identifier
  instance_class = var.rds_instance_class
  username       = var.rds_username
  password       = var.rds_password
}

module "cdn" {
  count                = var.cdn_enabled ? 1 : 0
  source               = "./modules/cloudfront"
  origin_domain        = "${module.app_bucket.bucket_id}.s3.amazonaws.com"
  api_origin_domain    = replace(aws_apigatewayv2_api.proxy.api_endpoint, "https://", "")
  aliases              = var.domain_name != "" ? [var.domain_name] : []
  acm_certificate_arn  = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
  custom_domain        = var.domain_name
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "app_bucket_policy" {
  count  = var.cdn_enabled ? 1 : 0
  bucket = module.app_bucket.bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontRead"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "arn:aws:s3:::${module.app_bucket.bucket_id}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${module.cdn[0].distribution_id}"
          }
        }
      }
    ]
  })
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}
