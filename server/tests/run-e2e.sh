#!/usr/bin/env bash
# Runs the end-to-end suite against a LOCAL Supabase (Docker). Never touches production.
#
# One-time setup:
#   brew install supabase/tap/supabase   (and have Docker running)
#   mkdir -p ../e2e-local && (cd ../e2e-local && supabase init)
#
# Usage (from the repo root):  server/tests/run-e2e.sh
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL_DIR="${E2E_SUPABASE_DIR:-$REPO/../e2e-local}"

cd "$LOCAL_DIR"
if ! supabase status >/dev/null 2>&1; then
  supabase start -x studio,imgproxy,realtime,storage-api,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
fi

# Fresh database, then the ORIGINAL production schema (the test applies the fix itself).
supabase db reset --local >/dev/null 2>&1
eval "$(supabase status -o env | sed 's/^/export E2E_RAW_/')"
export E2E_SUPABASE_URL="$E2E_RAW_API_URL"
export E2E_ANON_KEY="$E2E_RAW_ANON_KEY"
export E2E_SERVICE_KEY="$E2E_RAW_SERVICE_ROLE_KEY"
export E2E_DB_URL="$E2E_RAW_DB_URL"

export PGOPTIONS="--client-min-messages=warning"
psql "$E2E_DB_URL" -v ON_ERROR_STOP=1 -q -f "$REPO/database-schema.sql" >/dev/null
psql "$E2E_DB_URL" -v ON_ERROR_STOP=1 -q -f "$REPO/database-contact-messages.sql" >/dev/null

cd "$REPO"
# Run in-process (no test-runner subprocess) so server log lines cannot corrupt its IPC.
node --test-reporter=spec server/tests/e2e.test.js
