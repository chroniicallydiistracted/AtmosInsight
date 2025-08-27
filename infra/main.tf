provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "app" {
  bucket = "app-${var.environment}-site"
}

resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "layer_index" {
  name         = "LayerIndex"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }
}

resource "aws_db_instance" "postgis" {
  identifier          = "postgis-${var.environment}"
  allocated_storage   = 20
  engine              = "postgres"
  engine_version      = "15.5"
  instance_class      = "db.t3.small"
  username            = "postgres"
  password            = "change-me"
  skip_final_snapshot = true
}
