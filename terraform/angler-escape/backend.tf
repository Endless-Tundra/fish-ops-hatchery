terraform {
  backend "gcs" {
    bucket = "wst_devopsresume_terraformstate"
    prefix = "angler_escape"
  }
}