variable "name" {
  description = "Bucket name"
  type        = string
}

variable "force_destroy" {
  description = "Whether to force destroy bucket"
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Enable versioning"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to the S3 bucket"
  type        = map(string)
  default     = {}
}
