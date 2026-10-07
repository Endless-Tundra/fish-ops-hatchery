variable "region" {
  default = "us-central1"
}

variable "container_image" {
  type = string
}

variable "service" {
  type = string
}

variable "invoker_service_account" {
  type        = string
  description = "Service account allowed to invoke the service (used by the smoke test)"
}