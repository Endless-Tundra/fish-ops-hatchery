terraform {
  backend "gcs" {
    bucket = "wst_devopsresume_terraformstate"
  }
}