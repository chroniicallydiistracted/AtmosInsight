variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "nws_user_agent" {
  description = "NWS-required User-Agent header value (include contact email)"
  type        = string
}

variable "openweather_api_key" {
  description = "OpenWeatherMap API key for tile proxy"
  type        = string
  default     = ""
}

variable "tracestrack_api_key" {
  description = "Tracestrack basemap API key"
  type        = string
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
