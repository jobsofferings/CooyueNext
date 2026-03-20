# Git Webhook 自动部署服务

## 功能

- 接收 GitHub/GitLab 的 webhook 推送事件
- 自动拉取最新代码
- 自动构建 Docker 镜像
- 自动重启 Docker Compose 服务
- 记录部署日志

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置你的 webhook secret
```

### 2. 启动服务

```bash
# 首次启动（构建并启动所有服务）
docker-compose up -d --build

# 仅启动 webhook 服务
docker-compose up -d webhook
```

---

## GitHub Webhook 配置指南

进入你的 GitHub 仓库: **Settings** → **Webhooks** → **Add webhook**

### 配置项说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Payload URL** | `http://你的服务器IP:9000/webhook` | webhook 接收地址。如果使用 Nginx 反向代理配置了 HTTPS，则使用 `https://your-domain.com/webhook` |
| **Content type** | `application/json` | **必须选择 JSON 格式**，服务端只支持 JSON 解析 |
| **Secret** | 与 `.env` 中的 `WEBHOOK_SECRET` 一致 | 用于验证请求来源，建议使用强随机密码 |
| **SSL verification** | Enable SSL verification | 如果使用 HTTPS，保持启用；如果使用 HTTP，选择 Disable |
| **Which events would you like to trigger this webhook?** | `Just the push event` | 只需要 push 事件触发部署 |
| **Active** | ✅ 勾选 | 启用这个 webhook |

### 配置截图对照

```
┌─────────────────────────────────────────────────────────┐
│ Webhooks / Add webhook                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Payload URL *                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ http://your-server-ip:9000/webhook                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Content type *                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ application/json                              ▼     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Secret                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ your-secure-webhook-secret                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ SSL verification                                        │
│ ○ Enable SSL verification  (推荐，需要 HTTPS)          │
│ ○ Disable (not recommended) (仅 HTTP 时使用)           │
│                                                         │
│ Which events would you like to trigger this webhook?   │
│ ● Just the push event.      ← 选择这个                  │
│ ○ Send me everything.                                   │
│ ○ Let me select individual events.                      │
│                                                         │
│ ☑ Active                                                │
│                                                         │
│ [Add webhook]                                           │
└─────────────────────────────────────────────────────────┘
```

### 生成安全的 Secret

```bash
# 方法1: 使用 openssl 生成随机字符串
openssl rand -hex 32

# 方法2: 使用 node 生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

将生成的字符串同时填入:
1. GitHub Webhook 配置的 **Secret** 字段
2. 服务器 `.env` 文件的 **WEBHOOK_SECRET** 变量

---

## GitLab Webhook 配置

进入项目: **Settings** → **Webhooks**

| 配置项 | 值 |
|--------|-----|
| URL | `http://你的服务器IP:9000/webhook` |
| Secret token | 与 `.env` 中的 `WEBHOOK_SECRET` 一致 |
| Trigger | ✅ Push events |

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/webhook` | POST | 主 webhook 端点 |
| `/webhook/github` | POST | GitHub 专用端点 |
| `/webhook/gitlab` | POST | GitLab 专用端点 |
| `/logs` | GET | 获取日志文件列表 |
| `/logs/:filename` | GET | 获取指定日志内容 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WEBHOOK_PORT` | 9000 | 服务监听端口 |
| `WEBHOOK_SECRET` | your-webhook-secret | Webhook 签名密钥 |
| `TARGET_BRANCH` | main | 触发部署的目标分支 |

## 部署流程

当收到符合条件的 push 事件时，会执行以下步骤：

1. **验证签名** - 确保请求来自配置的 Git 平台
2. **拉取代码** - `git fetch && git reset --hard`
3. **构建镜像** - `docker build` 构建 Next.js 应用
4. **标记版本** - 使用时间戳标记镜像版本
5. **重启服务** - `docker-compose up -d --force-recreate`
6. **清理旧镜像** - 自动清理过期镜像

## 日志

日志存储在 `logs/` 目录下：
- `webhook-YYYY-MM-DD.log`: 每日 webhook 请求日志
- `deploy-*.log`: 每次部署的详细日志

## 本地开发测试

```bash
# 安装依赖
npm install

# 启动服务 (如果 9000 端口被占用，可以指定其他端口)
npm start
# 或
WEBHOOK_PORT=9001 npm start

# 测试健康检查
curl http://localhost:9000/health

# 模拟 GitHub push 事件 (非目标分支，不会触发部署)
curl -X POST http://localhost:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref": "refs/heads/develop", "after": "abc123"}'

# 模拟 GitHub push 事件 (main 分支，会触发部署)
curl -X POST http://localhost:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref": "refs/heads/main", "after": "abc123"}'

# 查看日志列表
curl http://localhost:9000/logs
```

## 安全建议

1. **始终设置强密码的 `WEBHOOK_SECRET`**
2. **使用 HTTPS** - 建议通过 Nginx 反向代理配置 SSL
3. **限制访问 IP** - 只允许 GitHub/GitLab 的 IP 段访问 webhook 端口
4. **定期检查部署日志** - 监控异常部署行为

### GitHub Webhook IP 白名单

GitHub 的 webhook 请求来自特定 IP 段，可以通过防火墙限制:

```bash
# 获取 GitHub 的 IP 段
curl -s https://api.github.com/meta | grep -A 100 '"hooks"'
```

## 故障排查

### Webhook 未触发

1. 检查 GitHub Webhook 配置的 **Recent Deliveries**
2. 确认 Payload URL 可以从外网访问
3. 确认 Content-type 设置为 `application/json`

### 签名验证失败

1. 确认 GitHub Secret 和服务器 `WEBHOOK_SECRET` 完全一致
2. 检查是否有空格或换行符

### 部署失败

1. 查看日志: `curl http://your-server:9000/logs`
2. 检查 Docker 是否正常运行
3. 确认 git 仓库权限正确
