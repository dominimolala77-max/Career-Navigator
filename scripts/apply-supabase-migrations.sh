#!/usr/bin/env bash
set -euo pipefail

echo "Applying Supabase migrations (payments table)..."

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  if command -v psql >/dev/null 2>&1; then
    echo "Using psql with SUPABASE_DB_URL"
    psql "$SUPABASE_DB_URL" -f supabase/migrations/20260615000000_payments_table.sql
    echo "Migration applied via psql"
    exit 0
  else
    echo "psql not found. Install psql or unset SUPABASE_DB_URL to use the Supabase CLI option."
    exit 1
  fi
fi

echo "No SUPABASE_DB_URL provided — trying Supabase CLI (requires supabase CLI installed).
If you prefer to run via psql, set SUPABASE_DB_URL to your database connection string and re-run."

if command -v npx >/dev/null 2>&1; then
  echo "Running: npx supabase migrations apply"
  npx supabase migrations apply || { echo "Supabase CLI failed. Install supabase CLI or apply migration manually."; exit 1; }
  echo "Supabase migrations applied (via supabase CLI)"
else
  echo "npx not found. Install Node.js or run migration manually in Supabase SQL editor."
  exit 1
fi
