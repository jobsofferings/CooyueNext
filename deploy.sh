#!/bin/sh

set -eu

DEPLOY_MODE=publish
case "${1:-}" in
    '') ;;
    --pull-only) DEPLOY_MODE=pull-only ;;
    --check) DEPLOY_MODE=check ;;
    --help|-h)
        echo "用法: bash deploy.sh [--check|--pull-only]"
        echo "默认: 安全检查 → 提交全部普通改动（含暂存区）→ 推送 → 拉取 → 构建 → 健康检查"
        echo "--check: 只做提交前检查，不改 Git、不构建；--pull-only: Webhook 专用，不提交本地改动"
        exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
esac
if [ "$#" -gt 1 ]; then echo "只支持一个部署参数" >&2; exit 1; fi

if [ "${COOYUE_DEPLOY_LOCKED:-0}" != "1" ]; then
    LOCK_FILE=${COOYUE_DEPLOY_LOCK_FILE:-/tmp/cooyue-deploy.lock}
    LOCK_WAIT=${COOYUE_DEPLOY_LOCK_WAIT:-900}

    if command -v flock >/dev/null 2>&1; then
        echo "等待部署锁: ${LOCK_FILE}"
        COOYUE_DEPLOY_LOCKED=1
        export COOYUE_DEPLOY_LOCKED
        exec flock -w "$LOCK_WAIT" "$LOCK_FILE" sh "$0" "$@"
    else
        echo "错误: 缺少 flock，无法保证串行部署" >&2
        exit 1
    fi
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR"
WEB_HOOKS_DIR="$PROJECT_ROOT/web_hooks"

MAX_RETRIES=6
RETRY_DELAY=2
GIT_PULL_TIMEOUT=10
PUBLIC_SITE_URL=${PUBLIC_SITE_URL:-https://www.cooyue.tech/}
export COMPOSE_PARALLEL_LIMIT=${COMPOSE_PARALLEL_LIMIT:-1}

for dependency in git node; do
    command -v "$dependency" >/dev/null 2>&1 || { echo "错误: 缺少 $dependency" >&2; exit 1; }
done

if [ "$DEPLOY_MODE" = check ]; then
    node "$PROJECT_ROOT/scripts/deploy-git.cjs" check
    exit 0
fi

for dependency in docker pm2 curl; do
    command -v "$dependency" >/dev/null 2>&1 || { echo "错误: 缺少 $dependency" >&2; exit 1; }
done

run_compose_up() {
    if docker compose up -d --build; then
        echo "✓ Docker Compose 构建和启动成功"
        return 0
    else
        exit_code=$?
    fi
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
echo "[1/7] 检查并提交部署内容（${DEPLOY_MODE}）..."
node "$PROJECT_ROOT/scripts/deploy-git.cjs" "$DEPLOY_MODE"

echo ""
echo "[2/7] 拉取最新代码..."

retry_git_pull() {
    retry_count=1

    while [ "$retry_count" -le "$MAX_RETRIES" ]; do
        echo "尝试 git pull (第 ${retry_count}/${MAX_RETRIES} 次)..."

        if command -v timeout >/dev/null 2>&1; then
            if timeout "${GIT_PULL_TIMEOUT}s" git pull --ff-only origin main; then
                echo "✓ git pull 成功"
                return 0
            else
                exit_code=$?
            fi
        else
            echo "! 未检测到 timeout 命令，本次直接执行 git pull"
            if git pull --ff-only origin main; then
                echo "✓ git pull 成功"
                return 0
            else
                exit_code=$?
            fi
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

if [ -n "$(git status --porcelain=v1 --untracked-files=all)" ]; then
    echo "错误: 拉取后工作区不干净，停止部署" >&2
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
for service in management-app next-app server; do
    attempt=0
    until [ "$attempt" -ge 30 ]; do
        container=$(docker compose ps -q "$service")
        health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo missing)
        if [ "$health" = healthy ]; then break; fi
        attempt=$((attempt + 1))
        sleep 2
    done
    if [ "$health" != healthy ]; then
        echo "错误: $service 未通过健康检查（$health），部署终止" >&2
        exit 1
    fi
    echo "✓ $service healthy"
done

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
smoke_test "Next public" "$PUBLIC_SITE_URL"

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
echo "Public:    $PUBLIC_SITE_URL"
echo ""
echo "PM2 服务:"
pm2 list
