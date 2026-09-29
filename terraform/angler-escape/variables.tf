variable "region" {
  default = "us-central1"
}

variable "frontend_image" {
  type = string
}

variable "backend_image" {
  type = string
}

variable "redis_image" {
  type = string
}
