#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
NEXT_DIR="$PROJECT_ROOT/next"
WEB_HOOKS_DIR="$PROJECT_ROOT/web_hooks"

echo "========================================"
echo "开始部署流程 $(date)"
echo "========================================"

cd "$PROJECT_ROOT"

echo ""
echo "[1/4] 暂存本地更改..."
git stash

echo ""
echo "[2/4] 拉取最新代码..."
git pull

echo ""
echo "[3/4] 使用 Docker Compose 构建和启动服务..."
docker compose up -d --build

echo ""
echo "[4/4] 清理旧的 Docker 镜像..."
docker image prune -f --filter "until=24h"

echo ""
echo "========================================"
echo "部署完成 $(date)"
echo "========================================"
echo ""
echo "服务状态:"
docker compose ps
