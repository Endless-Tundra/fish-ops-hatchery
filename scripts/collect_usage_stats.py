#!/usr/bin/env python3
"""
Fish-Ops Usage Stats Collector
Queries GCP Cloud Monitoring, Artifact Registry, Cloud Storage, and GitHub Actions
to produce a lightweight usage.json for the Zero-Cost architecture usage stats display.

IMPORTANT: On any query failure, this script reports "unavailable" rather than
a fabricated placeholder number. The whole point of this tool is telling you
what you're actually using -- a confident-looking fake number on failure would
be worse than no number at all.
"""

import datetime
import json
import subprocess
import sys
import urllib.parse
import urllib.request
import os


def run_cmd(cmd, timeout=30):
    """Execute shell command and return stdout as string, or None on error.
    Inputs here come from trusted, operator-set environment variables (not
    external/user input), so shell=True is fine in this context."""
    try:
        res = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, check=True, timeout=timeout
        )
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Warning: Command failed: {cmd}\n{e.stderr}", file=sys.stderr)
        return None
    except subprocess.TimeoutExpired:
        print(f"Warning: Command timed out after {timeout}s: {cmd}", file=sys.stderr)
        return None


def get_artifact_registry_total(project_id):
    """Sum sizeBytes across EVERY Artifact Registry repository in the
    project. This uses Google's own server-computed total (already
    deduplicated across shared image layers) rather than summing
    individual image listings by hand, which risks double-counting
    layers shared between builds of the same image."""
    output = run_cmd(f"gcloud artifacts repositories list --project={project_id} --format='value(sizeBytes)'")
    if output is None:
        return None, "unavailable (check gcloud auth / permissions)"

    total_bytes = 0
    repo_count = 0
    for line in output.splitlines():
        line = line.strip()
        if line.isdigit():
            total_bytes += int(line)
            repo_count += 1

    total_mb = round(total_bytes / (1024 * 1024), 1)
    label = "repository" if repo_count == 1 else "repositories"
    return total_mb, f"{total_mb} MB across {repo_count} {label}"


def get_gcs_total_size(project_id):
    """Sum total storage across EVERY bucket in the project -- this is
    what actually counts against the 5 GB Cloud Storage free tier, and
    catches storage you might not be tracking by name, like the
    temporary bucket Cloud Build auto-creates for `--source` deploys."""
    output = run_cmd(f"gcloud storage du --summarize --total --project={project_id}")
    if output is None:
        return None, "unavailable (check gcloud auth / permissions)"

    lines = [l for l in output.splitlines() if l.strip()]
    if not lines:
        return 0.0, "0 GB (no buckets found)"

    # gcloud storage du prints "<bytes>  <path>" per line, with a final
    # "<total_bytes>  total" line when --total is passed
    total_bytes = None
    for line in lines:
        parts = line.split()
        if len(parts) >= 2 and parts[0].isdigit() and parts[-1].lower() == "total":
            total_bytes = int(parts[0])
            break

    if total_bytes is None:
        # fallback: sum every numeric first column ourselves, in case
        # the "total" line isn't where this version of gcloud puts it
        total_bytes = sum(int(p[0]) for l in lines if (p := l.split()) and p[0].isdigit())

    total_gb = round(total_bytes / (1024 ** 3), 3)
    return total_gb, f"{total_gb} GB across all buckets"


def _monitoring_sum(project_id, metric_type, resource_filter, start_iso, end_iso):
    """Query Cloud Monitoring's timeSeries.list REST API directly (rather
    than guessing at gcloud CLI flag names) and sum every returned point.
    Uses `gcloud auth print-access-token` for auth -- no service account
    key file needed, and no extra pip dependency beyond the stdlib."""
    token = run_cmd("gcloud auth print-access-token")
    if not token:
        return None

    filter_str = f'metric.type="{metric_type}" AND {resource_filter}'
    params = {
        "filter": filter_str,
        "interval.startTime": start_iso,
        "interval.endTime": end_iso,
        # one bucket covering the whole window, summed
        "aggregation.alignmentPeriod": "2592000s",  # 30 days
        "aggregation.perSeriesAligner": "ALIGN_SUM",
        "aggregation.crossSeriesReducer": "REDUCE_SUM",
    }
    url = (
        f"https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries?"
        + urllib.parse.urlencode(params)
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f"Monitoring query failed for {metric_type}: {e}", file=sys.stderr)
        return None

    total = 0.0
    for series in data.get("timeSeries", []):
        for point in series.get("points", []):
            value = point.get("value", {})
            if "int64Value" in value:
                total += int(value["int64Value"])
            elif "doubleValue" in value:
                total += float(value["doubleValue"])
    return total


def _monitoring_latest(project_id, metric_type, resource_filter, lookback_minutes=15):
    """Query the most recent value of a GAUGE-type metric -- e.g. a
    running month-to-date total -- rather than summing across an
    interval. Summing snapshots of an already-cumulative gauge would
    wildly overcount, unlike the DELTA metrics _monitoring_sum handles."""
    token = run_cmd("gcloud auth print-access-token")
    if not token:
        return None

    now = datetime.datetime.now(datetime.timezone.utc)
    start = now - datetime.timedelta(minutes=lookback_minutes)

    filter_str = f'metric.type="{metric_type}" AND {resource_filter}'
    params = {
        "filter": filter_str,
        "interval.startTime": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "interval.endTime": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    url = (
        f"https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries?"
        + urllib.parse.urlencode(params)
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f"Monitoring query failed for {metric_type}: {e}", file=sys.stderr)
        return None

    latest_value, latest_time = None, None
    for series in data.get("timeSeries", []):
        for point in series.get("points", []):
            end_time = point.get("interval", {}).get("endTime")
            value = point.get("value", {})
            v = value.get("int64Value")
            v = int(v) if v is not None else value.get("doubleValue")
            if v is None or end_time is None:
                continue
            if latest_time is None or end_time > latest_time:
                latest_time, latest_value = end_time, v

    return latest_value


def get_logging_usage(project_id):
    """Month-to-date Cloud Logging ingestion volume, against the 50
    GiB/project/month free tier for log storage. Uses Cloud Logging's
    own billing/log_bucket_monthly_bytes_ingested gauge, which Google
    itself resets and tracks per calendar month -- this is the actual
    figure Logging bills against, not something summed by hand.

    NOTE: the resource filter below assumes this metric reports under
    resource.type="global", the standard catch-all for project-level
    metrics. If this returns nothing, check Metrics Explorer in the
    console for the exact resource type this metric uses in your project."""
    bytes_val = _monitoring_latest(
        project_id,
        "logging.googleapis.com/billing/log_bucket_monthly_bytes_ingested",
        'resource.type="global"',
    )
    if bytes_val is None:
        return None, "unavailable (check Cloud Monitoring API is enabled / permissions)"

    gb_val = round(bytes_val / (1024 ** 3), 4)
    return gb_val, f"{gb_val} GB ingested this month"


def get_cloud_run_metrics(project_id, service_name):
    """Query REAL Cloud Run request count and billable CPU time for the
    current calendar month via Cloud Monitoring. This replaces a stub in
    the original script that always returned the same hardcoded numbers."""
    now = datetime.datetime.now(datetime.timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_iso = month_start.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    resource_filter = f'resource.type="cloud_run_revision" AND resource.labels.service_name="{service_name}"'

    request_count = _monitoring_sum(
        project_id, "run.googleapis.com/request_count", resource_filter, start_iso, end_iso
    )
    # cpu/allocation_time (not billable_instance_time) is the metric that
    # actually maps to the free tier's "vCPU-seconds" quota
    cpu_seconds = _monitoring_sum(
        project_id, "run.googleapis.com/container/cpu/allocation_time", resource_filter, start_iso, end_iso
    )

    if request_count is None or cpu_seconds is None:
        return None, None, "unavailable (check Cloud Monitoring API is enabled / permissions)"

    reqs = int(request_count)
    vcpu_sec = round(cpu_seconds)
    return reqs, vcpu_sec, f"~{reqs:,} requests & {vcpu_sec:,} vCPU-sec"


def _gh(args, timeout=30, quiet=False):
    """Run a gh CLI command (no shell) and return stdout, or None on failure.
    gh prints the API's error body to stdout and the HTTP status to stderr,
    so both are echoed on failure -- that's usually where the real reason is."""
    try:
        res = subprocess.run(
            ["gh", *args], capture_output=True, text=True, check=True, timeout=timeout
        )
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        if not quiet:
            print(
                f"Warning: gh {' '.join(args)} failed (exit {e.returncode}):\n"
                f"STDERR: {e.stderr}\nSTDOUT: {e.stdout}",
                file=sys.stderr,
            )
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        if not quiet:
            print(f"Warning: gh {' '.join(args)}: {e}", file=sys.stderr)
        return None


def _estimate_actions_minutes(repo):
    """Fallback: approximate this month's Actions minutes as the sum of
    (updated_at - run_started_at) over completed runs. Needs no billing
    permissions. Close for a single-job workflow like pipeline.yml; it can
    under/overcount versus real billing (per-job rounding, parallel jobs)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    output = _gh([
        "api", f"/repos/{repo}/actions/runs", "--paginate", "--jq",
        '.workflow_runs[] | select(.status == "completed") '
        '| {started: .run_started_at, updated: .updated_at}',
    ])
    if output is None:
        return None

    total_seconds = 0.0
    for line in output.splitlines():
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
            started = datetime.datetime.fromisoformat(entry["started"].replace("Z", "+00:00"))
            updated = datetime.datetime.fromisoformat(entry["updated"].replace("Z", "+00:00"))
        except (KeyError, ValueError, TypeError, json.JSONDecodeError):
            continue
        if started >= month_start:
            total_seconds += max((updated - started).total_seconds(), 0)
    return round(total_seconds / 60)


def get_github_actions_minutes(repo):
    """GitHub Actions minutes used this month, as a dict for usage.json.

    GitHub has two billing platforms and each has its own endpoint, so this
    tries them in order and records which one answered in "source":

      1. legacy    GET /users/{username}/settings/billing/actions
                   Returns total_minutes_used and included_minutes (so the
                   free-tier limit comes from GitHub, not a hardcoded guess).
                   Works for accounts NOT on the enhanced billing platform.
                   GitHub's docs still list it, but accounts that have moved
                   to enhanced billing may get an error or redirect instead.
      2. enhanced  GET /users/{username}/settings/billing/usage/summary
                   Only exists for accounts on the enhanced billing platform
                   (public preview). No included-minutes figure, so the limit
                   falls back to GH_ACTIONS_FREE_MINUTES (default 2000).
      3. estimate  Sum of run durations from the runs API. Needs no billing
                   access, but is only an approximation.

    Both billing endpoints need a token allowed to read billing: a classic
    token with the `user` scope, or a fine-grained token with the "Plan"
    user permission (read). gh's default login token may lack this.
    A failure never raises -- worst case is minutes=None and an explanation.
    """
    default_limit = int(os.environ.get("GH_ACTIONS_FREE_MINUTES", "2000"))

    login = _gh(["api", "user", "--jq", ".login"])
    if not login:
        return {
            "minutes": None,
            "free_tier_limit_minutes": default_limit,
            "source": None,
            "display": "unavailable (gh not authenticated -- run `gh auth login`)",
        }

    # 1) legacy billing platform
    output = _gh(["api", f"users/{login}/settings/billing/actions"], quiet=True)
    if output:
        try:
            data = json.loads(output)
            used = data.get("total_minutes_used")
            if used is not None:
                included = data.get("included_minutes") or default_limit
                paid = data.get("total_paid_minutes_used", 0)
                return {
                    "minutes": used,
                    "free_tier_limit_minutes": included,
                    "source": "legacy-billing",
                    "display": f"{used} / {included} min used this cycle ({paid} paid)",
                }
        except (json.JSONDecodeError, AttributeError, TypeError) as e:
            print(f"Legacy billing parse error: {e}", file=sys.stderr)

    # 2) enhanced billing platform
    now = datetime.datetime.now(datetime.timezone.utc)
    endpoint = f"users/{login}/settings/billing/usage/summary?year={now.year}&month={now.month}"
    output = _gh(["api", endpoint], quiet=True)
    if output:
        try:
            items = json.loads(output).get("usageItems", [])
            actions = [
                i for i in items
                if str(i.get("product", "")).lower() == "actions" and i.get("unitType") == "minutes"
            ]
            gross = round(sum(i.get("grossQuantity", 0) for i in actions))
            net = round(sum(i.get("netQuantity", 0) for i in actions))
            return {
                "minutes": gross,
                "free_tier_limit_minutes": default_limit,
                "source": "enhanced-billing",
                "display": f"{gross} min used this month ({net} billable)",
            }
        except (json.JSONDecodeError, AttributeError, TypeError) as e:
            print(f"Enhanced billing parse error: {e}", file=sys.stderr)

    # 3) estimate from run durations
    print(
        "Neither billing endpoint answered (token lacks billing access, or "
        "the account is on the other billing platform) -- estimating from run durations.",
        file=sys.stderr,
    )
    estimate = _estimate_actions_minutes(repo)
    if estimate is None:
        return {
            "minutes": None,
            "free_tier_limit_minutes": default_limit,
            "source": None,
            "display": "unavailable (billing and runs APIs all failed -- see warnings above)",
        }
    return {
        "minutes": estimate,
        "free_tier_limit_minutes": default_limit,
        "source": "estimate",
        "display": f"~{estimate} min this month (estimated from run durations)",
    }


def main():
    project_id = os.environ.get("GCP_PROJECT_ID", "project-95dc5755-7684-4706-bf5")
    repo = os.environ.get("GITHUB_REPOSITORY", "Endless-Tundra/fish-ops-hatchery")
    cloud_run_service = os.environ.get("CLOUD_RUN_SERVICE", "fish-ops-site")

    print(f"Collecting usage stats for project={project_id}, repo={repo}...")

    ar_total_mb, ar_display = get_artifact_registry_total(project_id)
    gcs_total_gb, gcs_display = get_gcs_total_size(project_id)
    cr_reqs, cr_vcpu, cr_display = get_cloud_run_metrics(project_id, cloud_run_service)
    ci_cd = get_github_actions_minutes(repo)
    log_gb, log_display = get_logging_usage(project_id)

    data = {
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": "live-gcp-usage-stats",
        "metrics": {
            "cloud_run": {
                "requests": cr_reqs,
                "vcpu_seconds": cr_vcpu,
                "display": cr_display,
            },
            "artifact_registry": {
                "total_size_mb": ar_total_mb,
                "free_tier_limit_mb": 500,
                "display": ar_display,
            },
            "ci_cd": ci_cd,
            "cloud_storage": {
                "total_size_gb": gcs_total_gb,
                "free_tier_limit_gb": 5,
                "display": gcs_display,
            },
            "logging": {
                "ingested_gb": log_gb,
                "free_tier_limit_gb": 50,
                "display": log_display,
            },
        },
    }

    failures = [k for k, v in data["metrics"].items() if v.get(list(v.keys())[0]) is None]
    if failures:
        print(f"\nWarning: {len(failures)} metric(s) unavailable: {', '.join(failures)}", file=sys.stderr)

    out_file = sys.argv[1] if len(sys.argv) > 1 else "usage.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Wrote {out_file}:")
    print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()