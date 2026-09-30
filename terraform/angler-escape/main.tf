resource "google_cloud_run_v2_service" "angler-escape" {
  name                = "fish-ops-angler-escape"
  location            = var.region
  deletion_protection = false

  template {
    scaling {
      # scale to zero between requests #
      min_instance_count = 0
      max_instance_count = 1 
    }

    # ---- ingress container: the only one with a `ports` block, so the
    # only one Cloud Run's front end can route external traffic to ----
    containers {
      name  = "angler-frontend"
      image = var.frontend_image
      ports {
        container_port = 80 # must match nginx's `listen 80` in the image
      }
      resources {
        cpu_idle = true # same "CPU only during requests" behavior as the display service
      }
      depends_on = ["angler-backend"]
    }

    # ---- sidecar: reachable only via localhost from other containers
    # in this instance, never from outside ----
    containers {
      name  = "angler-backend"
      image = var.backend_image
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "DB_HOST"
        value = "localhost"
      }
      env {
        name  = "DB_PORT"
        value = "6379"
      }
      resources {
        cpu_idle = true # same "CPU only during requests" behavior as the display service
      }
      depends_on = ["angler-db"]
      startup_probe {
        http_get {
          port = 3000
        }
      }
    }

    # ---- sidecar: no depends_on, so this starts first, concurrently
    # with anything else that has no dependencies ----
    containers {
      name  = "angler-db"
      image = var.db_image
      resources {
        limits = { memory = "128Mi" }
        cpu_idle = true # same "CPU only during requests" behavior as the display service
      }
      startup_probe {
        tcp_socket {
          port = 6379 # http_get can't be used here -- Redis doesn't speak HTTP
        }
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.angler-escape.location
  name     = google_cloud_run_v2_service.angler-escape.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
