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
MAX_RETRIES=6
RETRY_COUNT=0
GIT_PULL_SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$GIT_PULL_SUCCESS" = false ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "尝试 git pull (第 $RETRY_COUNT/$MAX_RETRIES 次)..."
    
    timeout 10s git pull
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        GIT_PULL_SUCCESS=true
        echo "✓ git pull 成功"
    elif [ $EXIT_CODE -eq 124 ]; then
        echo "✗ git pull 超时 (10秒)，准备重试..."
        sleep 2
    else
        echo "✗ git pull 失败 (退出码: $EXIT_CODE)，准备重试..."
        sleep 2
    fi
done

if [ "$GIT_PULL_SUCCESS" = false ]; then
    echo "错误: git pull 失败，已重试 $MAX_RETRIES 次"
    exit 1
fi

echo ""
echo "[3/6] 使用 Docker Compose 构建和启动服务..."
docker compose up -d --build

echo ""
echo "[4/6] 清理旧的 Docker 镜像..."
docker image prune -f --filter "until=24h"

echo ""
echo "[5/6] 验证服务健康状态..."
sleep 5
echo "Next.js 健康检查:"
docker compose ps next-app
echo "Server 健康检查:"
docker compose ps server

echo ""
echo "[6/6] 启动 Webhook 服务 (PM2)..."
cd "$WEB_HOOKS_DIR"

if [ ! -d "node_modules" ]; then
    echo "安装 webhook 依赖..."
    npm install
fi

pm2 describe git-webhook > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "重启 webhook 服务..."
    pm2 restart git-webhook
else
    echo "首次启动 webhook 服务..."
    pm2 start server.js --name git-webhook
fi

pm2 save

echo ""
echo "========================================"
echo "部署完成 $(date)"
echo "========================================"
echo ""
echo "服务状态:"
echo ""
echo "Docker 服务:"
docker compose ps
echo ""
echo "Next.js:   http://localhost:3000"
echo "Server:    http://localhost:3001"
echo ""
echo "PM2 服务:"
pm2 list
