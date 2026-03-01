#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# WhyteBox Production Deploy Script
#
# Usage:
#   ./scripts/deploy.sh [--env-file .env.prod] [--version 1.2.3] [--no-build]
#
# What it does:
#   1. Validates required env vars
#   2. Builds Docker images (unless --no-build)
#   3. Runs database migrations
#   4. Performs a rolling restart (zero-downtime for stateless services)
#   5. Runs a smoke test against the health endpoint
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env.prod"
VERSION="${VERSION:-$(git -C "${PROJECT_DIR}" describe --tags --always 2>/dev/null || echo 'latest')}"
NO_BUILD=false
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── Argument parsing ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)  ENV_FILE="$2"; shift 2 ;;
    --version)   VERSION="$2"; shift 2 ;;
    --no-build)  NO_BUILD=true; shift ;;
    -h|--help)
      echo "Usage: $0 [--env-file FILE] [--version TAG] [--no-build]"
      exit 0
      ;;
    *) die "Unknown argument: $1" ;;
  esac
done

# ── Validate env file ──────────────────────────────────────────────────────────
[[ -f "${ENV_FILE}" ]] || die "Env file not found: ${ENV_FILE}\nCopy .env.prod.example → .env.prod and fill in values."

# Source env file for validation
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

# ── Validate required variables ────────────────────────────────────────────────
REQUIRED_VARS=(POSTGRES_PASSWORD SECRET_KEY ALLOWED_ORIGINS VITE_API_URL)
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  [[ -z "${!var:-}" ]] && MISSING+=("$var")
done
[[ ${#MISSING[@]} -gt 0 ]] && die "Missing required env vars: ${MISSING[*]}"

# Warn if placeholder values are still present
for var in POSTGRES_PASSWORD SECRET_KEY; do
  if [[ "${!var}" == *"CHANGE_ME"* ]]; then
    die "${var} still contains placeholder value. Set a real value in ${ENV_FILE}."
  fi
done

info "Deploying WhyteBox version: ${VERSION}"
info "Using env file: ${ENV_FILE}"
info "Compose file:   ${COMPOSE_FILE}"

# ── Build images ───────────────────────────────────────────────────────────────
if [[ "${NO_BUILD}" == false ]]; then
  info "Building Docker images…"
  VERSION="${VERSION}" docker compose \
    -f "${COMPOSE_FILE}" \
    --env-file "${ENV_FILE}" \
    build \
    --pull \
    --no-cache \
    backend frontend
  success "Images built."
else
  warn "Skipping build (--no-build)."
fi

# ── Start infrastructure services first ────────────────────────────────────────
info "Starting postgres and redis…"
VERSION="${VERSION}" docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${ENV_FILE}" \
  up -d postgres redis

info "Waiting for postgres to be healthy…"
RETRIES=30
until VERSION="${VERSION}" docker compose \
    -f "${COMPOSE_FILE}" \
    --env-file "${ENV_FILE}" \
    exec -T postgres pg_isready -U "${POSTGRES_USER:-whytebox}" &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  [[ $RETRIES -le 0 ]] && die "Postgres did not become healthy in time."
  sleep 2
done
success "Postgres is healthy."

# ── Run database migrations ────────────────────────────────────────────────────
info "Running Alembic migrations…"
VERSION="${VERSION}" docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${ENV_FILE}" \
  run --rm backend \
  alembic upgrade head
success "Migrations complete."

# ── Start all services ─────────────────────────────────────────────────────────
info "Starting all services…"
VERSION="${VERSION}" docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${ENV_FILE}" \
  up -d --remove-orphans
success "Services started."

# ── Smoke test ─────────────────────────────────────────────────────────────────
info "Running smoke test…"
HTTP_PORT="${HTTP_PORT:-80}"
HEALTH_URL="http://localhost:${HTTP_PORT}/api/v1/health"
RETRIES=20
until curl -sf "${HEALTH_URL}" &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  [[ $RETRIES -le 0 ]] && die "Health check failed: ${HEALTH_URL}"
  sleep 3
done
success "Health check passed: ${HEALTH_URL}"

# ── Print status ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  WhyteBox ${VERSION} deployed successfully!  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Frontend:  http://localhost:${HTTP_PORT}"
echo -e "  API:       http://localhost:${HTTP_PORT}/api/v1"
echo -e "  API docs:  http://localhost:${HTTP_PORT}/api/v1/docs"
echo ""

VERSION="${VERSION}" docker compose \
  -f "${COMPOSE_FILE}" \
  --env-file "${ENV_FILE}" \
  ps

# Made with Bob
