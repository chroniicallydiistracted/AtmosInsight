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

variable "database_enabled" {
  description = "Whether to create/manage the RDS database in this stack"
  type        = bool
  default     = false
}

variable "cdn_enabled" {
  description = "Whether to create/manage the CloudFront distribution in this stack"
  type        = bool
  default     = false
}

# API proxy (serverless) variables
variable "nws_user_agent" {
  description = "NWS-required User-Agent header value (include contact email)"
  type        = string
  default     = ""
}

variable "openweather_api_key" {
  description = "OpenWeatherMap API key for tile proxy"
  type        = string
  sensitive   = true
  default     = ""
}

variable "tracestrack_api_key" {
  description = "Tracestrack basemap API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "glm_toe_py_url" {
  description = "Optional Python GLM TOE tiles service base URL (leave empty to disable)"
  type        = string
  default     = ""
}

variable "catalog_api_base" {
  description = "Optional Catalog API base URL (e.g., https://..execute-api../catalog). Leave empty to disable forwarder."
  type        = string
  default     = ""
}

# CloudFront variables
variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate to use with CloudFront (must be in us-east-1)"
  type        = string
  default     = ""
}

# Monitoring variables
variable "alert_email" {
  description = "Email address to receive CloudWatch alarms (optional)"
  type        = string
  default     = ""
}

variable "monitoring_enabled" {
  description = "Whether to enable CloudWatch monitoring and alarms"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}
