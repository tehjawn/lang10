#!/bin/sh
# Railway/Docker entrypoint. Migrations only run when a database is attached,
# so the app can be deployed and used before Postgres is provisioned.
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "→ Applying database migrations"
  npx prisma migrate deploy
else
  echo "→ No DATABASE_URL set — starting in local-only mode (accounts disabled)."
fi

exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
