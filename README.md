# 🐟 Fish-Ops Hatchery (`fish-ops-hatchery`)

> **The automated CI/CD engine powering the Fish-Ops serverless aquarium ecosystem.**

`fish-ops-hatchery` hosts the GitHub Actions pipelines, Dockerfiles, and Terraform Infrastructure as Code (IaC) configurations that dynamically provision, scan, and deploy serverless container organisms to Google Cloud Platform on demand.

---

## 🌊 Overview

When visitors interact with the Fish-Ops aquarium UI or dispatch deployments, requests pass through Cloudflare Turnstile bot verification and hit the `fish-ops-api` broker. The broker invokes `workflow_dispatch` events in this repository.

Each workflow run:
1. **Authenticates** keylessly to Google Cloud using **Workload Identity Federation (WIF)**.
2. **Builds** minimal container images with multi-stage Docker Buildx.
3. **Scans** containers for CVE vulnerabilities via **Trivy** (failing immediately on `CRITICAL` findings).
4. **Pushes** passing images to **Google Artifact Registry**.
5. **Provisions** serverless **Google Cloud Run v2** instances with **Terraform**.
6. **Performs** authenticated smoke tests.
7. **Cleans up** stale Artifact Registry image digests to enforce the **Zero-Cost Free Tier model**.

---

## 📁 Repository Structure

```text
fish-ops-hatchery/
├── .github/
│   └── workflows/
│       ├── single-fish.yml         # On-demand single-container pipeline
│       └── angler-escape.yml       # 3-tier full-stack ecosystem pipeline (game)
│
├── apps/
│   ├── single-fish/                # Micro-container definitions for individual organisms
│   │   ├── Dockerfile-nginx        # Neon Tetra organism
│   │   ├── Dockerfile-httpd        # Betta Fish organism
│   │   ├── Dockerfile-caddy        # Clownfish organism
│   │   ├── Dockerfile-python       # Guppy organism
│   │   └── Dockerfile-busybox      # Sea Turtle organism
│   │
│   └── angler-escape/              # Multi-tier playable game microservices
│       ├── Dockerfile-frontend     # Anglerfish (React/Vite static frontend)
│       ├── Dockerfile-backend      # Black Shark (Node.js/Express API)
│       └── Dockerfile-db           # Hermit Crab (In-memory/micro state layer)
│
├── terraform/
│   ├── single-fish/                # Modular Cloud Run Terraform definitions
│   │   ├── main.tf                 # google_cloud_run_v2_service definition
│   │   ├── variables.tf            # Service name, container_image, invoker SA
│   │   └── outputs.tf              # service_url output for health check
│   │
│   └── angler-escape/              # 3-service deployment
│       ├── main.tf                 # Frontend, backend, and db service definitions
│       ├── variables.tf            # Component image digests
│       └── outputs.tf              # Game entrypoint URL output
│
└── README.md
```

---

## 🚀 Workflows

### 1. Single Fish Pipeline (`.github/workflows/single-fish.yml`)

Triggered on demand for individual container organisms. Accepts the target service name via `workflow_dispatch` inputs.

- **Trigger Input:** `service` (`nginx`, `httpd`, `caddy`, `python`, `busybox`)
- **Execution Stages:**
  1. `checkout_repo`: Clones the repository.
  2. `gcp_auth`: Authenticates via Workload Identity Federation (no long-lived JSON keys).
  3. `gcp_auth_docker`: Configures Docker authentication helper for `us-central1-docker.pkg.dev`.
  4. `install_terraform` & `install_buildx`: Sets up Terraform CLI and Docker Buildx.
  5. `build_image`: Builds `apps/single-fish/Dockerfile-${{ inputs.service }}` with GitHub Actions layer cache.
  6. `security_scan`: Aqua Security Trivy image scan. Exits with code `1` on `CRITICAL` CVEs (`CVE Vulnerability Detected. Stopping Pipeline.`).
  7. `push_image`: Pushes verified container image to Google Artifact Registry.
  8. `tf_init` & `tf_apply`: Provisions the Cloud Run v2 service using Terraform state isolated by service prefix.
  9. `smoke_test`: Generates an ephemeral GCP identity token and performs an authenticated curl health probe against the Cloud Run URL.
  10. `cleanup_old_images`: Queries Artifact Registry and removes image versions beyond the 2 most recent to prevent storage fees.

### 2. Angler Escape Ecosystem Pipeline (`.github/workflows/angler-escape.yml`)

Deploys a complete 3-tier playable microservice game ([anglerescape.fish-ops.com](https://anglerescape.fish-ops.com/)).

- **Trigger:** `workflow_dispatch`
- **Jobs:**
  - `build-scan-push` (Matrix build):
    - Runs in parallel across `[frontend, backend, db]`.
    - Daily persistent Trivy vulnerability database caching (`~/.cache/trivy`).
    - Builds, scans, and pushes all 3 microservices concurrently.
  - `deploy`:
    - Executes after `build-scan-push` succeeds.
    - Applies `terraform/angler-escape`.
    - Validates service health via automated smoke test.
    - Sends deployment completion webhook with the live service URL back to `fish-ops-site`.
    - Prunes older images across all 3 component repositories.

---

## 🔒 Security Architecture

| Security Layer | Implementation |
| :--- | :--- |
| **Authentication** | Keyless **Google Cloud Workload Identity Federation (WIF)**. GitHub OIDC tokens authenticate directly with GCP IAM. No stored private keys. |
| **Vulnerability Gating** | **Trivy** scan with `severity: CRITICAL` and `exit-code: 1`. Pipelines immediately abort if vulnerabilities are discovered before push. |
| **Service Isolation** | Least-privilege Service Accounts (`github-deployer`). Ingress configured strictly via Cloudflare and internal Cloud Run invoker authentication. |
| **Audit Trails** | All workflow events are logged to GitHub Actions and streamed in real time to the Fish-Ops live terminal. |

---

## 💰 Zero-Cost FinOps Model

This pipeline is engineered to operate strictly within Google Cloud's Always-Free Tier limits:

- **Cloud Run Scale-to-Zero:** All deployed containers configure `min_instance_count = 0` and CPU allocation on-request only. Idle organisms incur $0.00 compute cost.
- **Artifact Registry Retention Hygiene:** Workflows feature automated post-deploy cleanup steps pruning older image digests (`gcloud artifacts docker images delete`). Storage footprint stays under free tier allocations.
- **Resource Constraints:** Containers are tuned with minimal memory limits (128MiB - 256MiB) and 0.5 - 1 vCPU limits.

---

## ⚙️ Configuration & Secrets

Configure the following GitHub Secrets & Variables in the repository:

### Required Secrets
| Name | Description |
| :--- | :--- |
| `GCP_PROJECT_ID` | GCP Project ID (e.g., `fish-ops-production`) |
| `GCP_PROJECT_NUMBER` | GCP Numeric Project Number (for WIF provider path) |
| `DEPLOY_CALLBACK_TOKEN` | Bearer token for authenticating post-deploy webhooks to `fish-ops-api` |

### Required IAM Configuration
- **Workload Identity Pool:** `projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool`
- **Provider:** `providers/github-provider`
- **Service Account:** `github-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com`
- **IAM Roles:**
  - `roles/run.admin`
  - `roles/artifactregistry.writer`
  - `roles/iam.serviceAccountTokenCreator`
  - `roles/storage.admin` (for Terraform state backend)

---

## 🧪 Manual Testing

You can trigger pipelines manually from your terminal using the GitHub CLI:

```bash
# Trigger a single organism deployment (e.g. Neon Tetra / nginx)
gh workflow run single-fish.yml -f service=nginx

# Trigger Caddy organism
gh workflow run single-fish.yml -f service=caddy

# Trigger full-stack Angler Escape ecosystem
gh workflow run angler-escape.yml

# Watch live execution logs
gh run watch
```

