variable "origin_domain" {
  description = "Domain name of the origin"
  type        = string
}

variable "default_root_object" {
  description = "Default root object"
  type        = string
  default     = "index.html"
}
