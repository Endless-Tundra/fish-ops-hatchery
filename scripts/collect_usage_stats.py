#!/usr/bin/env python3
"""
Fish-Ops Usage Stats Collector
Queries GCP Cloud Monitoring, Cloud Logging, Artifact Registry, and Cloud Storage
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
import urllib.error
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


def _monitoring_get(project_id, params):
    """GET Cloud Monitoring's timeSeries.list and return parsed JSON, or
    None on failure. On an HTTP error the response body is printed -- that's
    where Google says WHY (API not enabled, bad filter, missing role).
    Uses `gcloud auth print-access-token`, so no key file and no pip deps."""
    token = run_cmd("gcloud auth print-access-token")
    if not token:
        return None

    url = (
        f"https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries?"
        + urllib.parse.urlencode(params)
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:500]
        print(f"Monitoring API HTTP {e.code} for {params.get('filter')}:\n{body}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Monitoring query failed for {params.get('filter')}: {e}", file=sys.stderr)
        return None


def _monitoring_sum(project_id, metric_type, resource_filter, start_iso, end_iso):
    """Sum a DELTA metric over [start, end]. Returns None only if the query
    FAILED; if it succeeds but there is no data, that's a real 0.0 -- the
    two cases must not be conflated. resource_filter may be empty."""
    filter_str = f'metric.type="{metric_type}"'
    if resource_filter:
        filter_str += f" AND {resource_filter}"

    data = _monitoring_get(project_id, {
        "filter": filter_str,
        "interval.startTime": start_iso,
        "interval.endTime": end_iso,
        # one bucket covering the whole window, summed across all series
        "aggregation.alignmentPeriod": "2592000s",  # 30 days
        "aggregation.perSeriesAligner": "ALIGN_SUM",
        "aggregation.crossSeriesReducer": "REDUCE_SUM",
    })
    if data is None:
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


def get_logging_usage(project_id):
    """Cloud Logging ingestion so far this calendar month, against the 50
    GiB/project/month free tier for log storage.

    Sums the GA `billing/bytes_ingested` metric from the 1st of the month.
    (An earlier version read the BETA month-to-date gauge over a 15-minute
    window, which returned nothing on a quiet project and was misreported
    as a failure.) Caveat: I couldn't confirm whether this metric counts
    bytes in the free _Required bucket, so it may slightly overstate what
    is actually billable."""
    now = datetime.datetime.now(datetime.timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_bytes = _monitoring_sum(
        project_id,
        "logging.googleapis.com/billing/bytes_ingested",
        "",  # project-level metric; sum every resource_type
        month_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )
    if total_bytes is None:
        return None, "unavailable (see Monitoring API error above)"

    gib = round(total_bytes / (1024 ** 3), 4)
    return gib, f"{gib} GiB ingested this month"


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


def main():
    project_id = os.environ.get("GCP_PROJECT_ID", "project-95dc5755-7684-4706-bf5")
    cloud_run_service = os.environ.get("CLOUD_RUN_SERVICE", "fish-ops-site")

    print(f"Collecting usage stats for project={project_id}...")

    ar_total_mb, ar_display = get_artifact_registry_total(project_id)
    gcs_total_gb, gcs_display = get_gcs_total_size(project_id)
    cr_reqs, cr_vcpu, cr_display = get_cloud_run_metrics(project_id, cloud_run_service)
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