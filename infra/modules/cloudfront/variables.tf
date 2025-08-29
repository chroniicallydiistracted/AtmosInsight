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
