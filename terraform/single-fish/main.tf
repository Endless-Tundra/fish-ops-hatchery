resource "google_cloud_run_v2_service" "single-fish" {
  name     = "fish-ops-single-fish-${var.service}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  deletion_protection = false

  template {
    containers {
      image = var.container_image
      ports {
        container_port = 80
      }
      resources {
        cpu_idle = true # same "CPU only during requests" behavior as the display service
      }
      startup_probe {
        tcp_socket {
          port = 80
        }
        initial_delay_seconds = 2
        period_seconds        = 5
        timeout_seconds       = 2
        failure_threshold     = 10
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
  member   = "serviceAccount:${var.invoker_service_account}"
}