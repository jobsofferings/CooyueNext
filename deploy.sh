#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR"
WEB_HOOKS_DIR="$PROJECT_ROOT/web_hooks"

MAX_RETRIES=6
RETRY_DELAY=2
GIT_PULL_TIMEOUT=10

run_compose_up() {
    if docker compose up -d --build; then
        echo "✓ Docker Compose 构建和启动成功"
        return 0
    fi

    exit_code=$?
    echo "! Docker Compose 首次启动失败 (退出码: ${exit_code})"
    echo "! 尝试使用 --remove-orphans 恢复 stale/orphan 容器状态..."

    if docker compose up -d --build --remove-orphans; then
        echo "✓ Docker Compose 恢复启动成功"
        return 0
    fi

    echo "错误: Docker Compose 构建或启动失败，部署终止"
    return 1
}

smoke_test() {
    name="$1"
    url="$2"

    printf "%s: %s ... " "$name" "$url"
    if curl -fsSL -m 15 -o /dev/null "$url"; then
        echo "OK"
        return 0
    fi

    echo "FAILED"
    return 1
}

echo "========================================"
echo "开始部署流程 $(date)"
echo "========================================"

cd "$PROJECT_ROOT"

echo ""
echo "[1/7] 暂存本地更改..."
git stash push -u -m "auto-stash before deploy $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null 2>&1 || true
echo "✓ 已执行 stash（如无改动，Git 会自动忽略）"

echo ""
echo "[2/7] 拉取最新代码..."

retry_git_pull() {
    retry_count=1

    while [ "$retry_count" -le "$MAX_RETRIES" ]; do
        echo "尝试 git pull (第 ${retry_count}/${MAX_RETRIES} 次)..."

        if command -v timeout >/dev/null 2>&1; then
            if timeout "${GIT_PULL_TIMEOUT}s" git pull; then
                echo "✓ git pull 成功"
                return 0
            fi
            exit_code=$?
        else
            echo "! 未检测到 timeout 命令，本次直接执行 git pull"
            if git pull; then
                echo "✓ git pull 成功"
                return 0
            fi
            exit_code=$?
        fi

        if [ "$exit_code" -eq 124 ]; then
            echo "✗ git pull 超时 (${GIT_PULL_TIMEOUT}秒)"
        else
            echo "✗ git pull 失败 (退出码: ${exit_code})"
        fi

        if [ "$retry_count" -lt "$MAX_RETRIES" ]; then
            echo "等待 ${RETRY_DELAY} 秒后重试..."
            sleep "$RETRY_DELAY"
        fi

        retry_count=$((retry_count + 1))
    done

    return 1
}

if ! retry_git_pull; then
    echo "错误: git pull 失败，已重试 ${MAX_RETRIES} 次，部署终止"
    exit 1
fi

echo ""
echo "[3/7] 使用 Docker Compose 构建和启动服务..."
run_compose_up

echo ""
echo "[4/7] 清理旧的 Docker 镜像..."
docker image prune -f --filter "until=24h"

echo ""
echo "[5/7] 验证服务健康状态..."
sleep 5
echo "Management 健康检查:"
docker compose ps management-app
echo "Next.js 健康检查:"
docker compose ps next-app
echo "Server 健康检查:"
docker compose ps server

echo ""
echo "[6/7] 启动 Webhook 服务 (PM2)..."
cd "$WEB_HOOKS_DIR"

if [ ! -d "node_modules" ]; then
    echo "安装 webhook 依赖..."
    npm install
fi

if pm2 describe git-webhook >/dev/null 2>&1; then
    echo "重启 webhook 服务..."
    pm2 restart git-webhook
else
    echo "首次启动 webhook 服务..."
    pm2 start server.js --name git-webhook
fi

pm2 save

echo ""
echo "[7/7] Smoke Test..."
smoke_test "Server local" "http://127.0.0.1:3001/"
smoke_test "Next local" "http://127.0.0.1:3000/en"
smoke_test "Management local" "http://127.0.0.1:3003/"
smoke_test "Next public" "http://43.139.70.61:3000/"

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
echo "Management: http://localhost:3003"
echo "Next.js:   http://localhost:3000"
echo "Server:    http://localhost:3001"
echo ""
echo "PM2 服务:"
pm2 list
