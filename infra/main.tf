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
}
