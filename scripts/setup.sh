#!/usr/bin/env bash
# RootLink — one-command local dev setup
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $1"; }

# ── Prerequisites check ────────────────────────────────────────────────────
for cmd in node npm docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not installed." >&2; exit 1
  fi
done

NODE_VERSION=$(node -v | cut -c2- | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "Error: Node.js 22+ is required (found v${NODE_VERSION})." >&2; exit 1
fi

log "Prerequisites OK"

# ── Install npm deps ───────────────────────────────────────────────────────
log "Installing dependencies..."
npm install

# ── Start Docker services ──────────────────────────────────────────────────
log "Starting Docker services (postgres, redis, minio)..."
docker compose up -d postgres redis minio minio_setup

log "Waiting for services to be healthy..."
sleep 5

# ── Copy env files ─────────────────────────────────────────────────────────
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  log "Created apps/api/.env from example"
else
  warn "apps/api/.env already exists — skipping"
fi

if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.local.example apps/web/.env.local
  log "Created apps/web/.env.local from example"
else
  warn "apps/web/.env.local already exists — skipping"
fi

# ── Build shared packages ──────────────────────────────────────────────────
log "Building shared packages..."
npm run build --workspace=packages/shared
npm run build --workspace=packages/db

# ── Run database migrations ────────────────────────────────────────────────
log "Running database migrations..."
npm run db:migrate

log "Seeding development data..."
npm run db:seed

log ""
log "Setup complete. Run \`npm run dev\` to start all services."
log ""
log "  API:      http://localhost:3001"
log "  Web:      http://localhost:3000"
log "  API docs: http://localhost:3001/docs"
log "  MinIO:    http://localhost:9001  (rootlink / rootlink_dev_secret)"
