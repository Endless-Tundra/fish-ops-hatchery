terraform {
  backend "gcs" {
    bucket = "wst_devopsresume_terraformstate"
    prefix = "fish-ops-ephemeral"
  }
}