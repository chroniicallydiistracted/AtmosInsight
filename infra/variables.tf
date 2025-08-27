variable "region" {
  description = "AWS region"
  type        = string
}

variable "app_bucket_name" {
  type = string
}

variable "raw_bucket_name" {
  type = string
}

variable "proc_bucket_name" {
  type = string
}

variable "tiles_bucket_name" {
  type = string
}

variable "dynamodb_table_name" {
  type = string
}

variable "rds_identifier" {
  type = string
}

variable "rds_instance_class" {
  type = string
}

variable "rds_username" {
  type = string
}

variable "rds_password" {
  type      = string
  sensitive = true
}
