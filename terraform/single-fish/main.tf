resource "google_cloud_run_v2_service" "single-fish" {
  name     = "fish-ops-single-fish"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    containers {
      image = var.container_image # passed in from the pipeline after it builds+pushes
      resources {
        cpu_idle = true # same "CPU only during requests" behavior as the display service
      }
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.single-fish.location
  name     = google_cloud_run_v2_service.single-fish.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}