variable "identifier" {
  type = string
}

variable "instance_class" {
  type = string
}

variable "engine_version" {
  description = "PostgreSQL engine version (e.g., 16.3)."
  type        = string
  default     = "16.3"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "username" {
  type = string
}

variable "password" {
  type      = string
  sensitive = true
}
