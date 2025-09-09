variable "origin_domain" {
  description = "Domain name of the origin"
  type        = string
}

variable "default_root_object" {
  description = "Default root object"
  type        = string
  default     = "index.html"
}

variable "api_origin_domain" {
  description = "Optional API origin domain (e.g., execute-api domain). If set, a /api/* behavior is added."
  type        = string
  default     = null
}

variable "aliases" {
  description = "List of domain aliases for the CloudFront distribution"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate to use (must be in us-east-1). If null, uses CloudFront default certificate"
  type        = string
  default     = null
}

variable "custom_domain" {
  description = "Custom domain name for the distribution (used for API origin headers)"
  type        = string
  default     = ""
}
