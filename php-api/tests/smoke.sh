#!/usr/bin/env bash
set -euo pipefail

base_url="${BASE_URL:-http://127.0.0.1:8080}"

expect_status() {
  local expected="$1" method="$2" path="$3" data="${4:-}"
  local actual
  if [[ "$method" == "POST" ]]; then
    actual="$(curl --silent --show-error -o /tmp/hb-response.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data "$data" "$base_url$path")"
  else
    actual="$(curl --silent --show-error -o /tmp/hb-response.json -w '%{http_code}' "$base_url$path")"
  fi
  if [[ "$actual" != "$expected" ]]; then
    echo "Expected HTTP $expected for $method $path, got $actual"
    cat /tmp/hb-response.json
    exit 1
  fi
}

expect_status 200 GET /api/healthz
grep -q '"status":"ok"' /tmp/hb-response.json
expect_status 200 GET /api/me
grep -q '"user":null' /tmp/hb-response.json
expect_status 200 GET /api/csrf
grep -q '"csrfToken":"' /tmp/hb-response.json
expect_status 403 POST /api/not-migrated '{}'
grep -q '"error":"csrf_failed"' /tmp/hb-response.json
expect_status 501 GET /api/not-migrated
grep -q '"error":"endpoint_not_migrated"' /tmp/hb-response.json

echo "PHP API smoke tests passed."
