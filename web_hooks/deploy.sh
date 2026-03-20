#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NEXT_DIR="$PROJECT_ROOT/next"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
LOG_FILE="$SCRIPT_DIR/logs/deploy-$(date +%Y%m%d_%H%M%S).log"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "========================================"
echo "Deployment started at $(date)"
echo "========================================"
echo "Branch: ${BRANCH:-main}"
echo "Commit: ${COMMIT:-unknown}"
echo "========================================"

cd "$PROJECT_ROOT"
echo "Working directory: $(pwd)"

echo ""
echo "[1/5] Pulling latest code..."
git fetch origin
git reset --hard origin/${BRANCH:-main}

echo ""
echo "[2/5] Building Docker image..."
cd "$NEXT_DIR"
docker build -f docker/Dockerfile -t cooyue-next:latest .

echo ""
echo "[3/5] Tagging image with timestamp..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker tag cooyue-next:latest cooyue-next:$TIMESTAMP

echo ""
echo "[4/5] Restarting services with docker-compose..."
cd "$PROJECT_ROOT"
docker-compose -f "$COMPOSE_FILE" up -d --force-recreate next-app

echo ""
echo "[5/5] Cleaning up old images..."
docker image prune -f --filter "until=24h"

echo ""
echo "========================================"
echo "Deployment completed at $(date)"
echo "========================================"

docker-compose -f "$COMPOSE_FILE" ps
