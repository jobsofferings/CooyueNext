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
echo "[1/6] 暂存本地更改..."
git stash

echo ""
echo "[2/6] 拉取最新代码..."
git pull

echo ""
echo "[3/6] Next 项目安装依赖和构建..."
cd "$NEXT_DIR"
echo "当前目录: $(pwd)"
echo "执行 yarn install..."
yarn
echo "执行 yarn build..."
yarn build

echo ""
echo "[4/6] Web Hooks 项目安装依赖和构建..."
cd "$WEB_HOOKS_DIR"
echo "当前目录: $(pwd)"
echo "执行 yarn install..."
yarn
echo "执行 yarn build..."
yarn build

echo ""
echo "[5/6] 使用 Docker Compose 构建和启动服务..."
cd "$PROJECT_ROOT"
docker compose up -d --build

echo ""
echo "[6/6] 清理旧的 Docker 镜像..."
docker image prune -f --filter "until=24h"

echo ""
echo "========================================"
echo "部署完成 $(date)"
echo "========================================"
echo ""
echo "服务状态:"
docker compose ps
