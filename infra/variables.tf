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

variable "glm_toe_py_url" {
  description = "Optional Python GLM TOE tiles service base URL (leave empty to disable)"
  type        = string
  default     = ""
}
