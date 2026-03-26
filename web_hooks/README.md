# Git Webhook 自动部署服务

## 功能

- 接收 Git 平台的 webhook 推送事件
- 自动拉取最新代码
- 自动构建 Docker 镜像
- 自动重启 Docker Compose 服务

## 快速开始

### 1. 安装依赖

```bash
yarn
```

### 2. 启动服务

使用 PM2 管理服务进程：

```bash
# 首次启动
pm2 start server.js --name git-webhook
pm2 save

# 重启服务
pm2 restart git-webhook

# 查看日志
pm2 logs git-webhook
```

或者直接运行（不推荐生产环境）：

```bash
yarn start
```

### 3. 使用部署脚本

项目根目录的 `deploy.sh` 可以手动触发完整部署流程：

```bash
bash deploy.sh
```

---

## GitHub Webhook 配置

进入你的 GitHub 仓库: **Settings** → **Webhooks** → **Add webhook**

### 配置项说明

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Payload URL** | `http://你的服务器IP:9000/webhook` | webhook 接收地址 |
| **Content type** | `application/json` | 必须选择 JSON 格式 |
| **Secret** | 留空或随意填写 | 当前版本未实现签名验证 |
| **Which events** | `Just the push event` | 选择 push 事件 |
| **Active** | ✅ 勾选 | 启用 webhook |

### 配置示意

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
│ Which events would you like to trigger this webhook?   │
│ ● Just the push event.                                  │
│ ○ Send me everything.                                   │
│ ○ Let me select individual events.                      │
│                                                         │
│ ☑ Active                                                │
│                                                         │
│ [Add webhook]                                           │
└─────────────────────────────────────────────────────────┘
```

---

## GitLab Webhook 配置

进入项目: **Settings** → **Webhooks**

| 配置项 | 值 |
|--------|-----|
| URL | `http://你的服务器IP:9000/webhook` |
| Trigger | ✅ Push events |

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查，返回服务状态和时间戳 |
| `/webhook` | POST | Webhook 触发端点，接收后立即执行 deploy.sh |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WEBHOOK_PORT` | 9000 | 服务监听端口 |

---

## 部署流程

当 webhook 端点接收到 POST 请求时，会自动执行 `deploy.sh` 脚本，流程如下：

1. **暂存本地更改** - `git stash` 保存未提交的修改
2. **拉取最新代码** - 带重试机制的 `git pull`（最多重试 6 次，每次超时 10 秒）
3. **构建并启动服务** - `docker compose up -d --build` 重新构建镜像并启动容器
4. **清理旧镜像** - `docker image prune -f --filter "until=24h"` 清理 24 小时前的镜像
5. **启动 Webhook 服务** - 使用 PM2 启动或重启 `server.js`

完成后会显示 Docker 和 PM2 的服务状态。

---

## 本地开发测试

```bash
# 安装依赖
yarn

# 启动服务
yarn start

# 指定端口启动
WEBHOOK_PORT=9001 yarn start

# 测试健康检查
curl http://localhost:9000/health

# 触发部署 (发送任意 POST 请求即可)
curl -X POST http://localhost:9000/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 安全建议

⚠️ **当前版本未实现签名验证**，建议采取以下安全措施：

1. **使用防火墙限制访问** - 只允许 GitHub/GitLab 的 IP 段访问 9000 端口
2. **使用 Nginx 反向代理** - 配置 HTTPS 和访问控制
3. **监控服务日志** - 定期检查 PM2 日志以发现异常请求

### GitHub Webhook IP 段

```bash
# 获取 GitHub 的 webhook IP 段
curl https://api.github.com/meta | jq .hooks
```

可以将这些 IP 添加到防火墙白名单（iptables/ufw）。

### GitLab Webhook IP 段

GitLab.com 的 webhook IP 可查看官方文档：
https://docs.gitlab.com/ee/user/gitlab_com/#ip-range

---

## 故障排查

### Webhook 未触发

1. 检查 GitHub/GitLab 的 Webhook **Recent Deliveries** 查看请求状态
2. 确认服务器防火墙已开放 9000 端口
3. 确认 webhook 服务正在运行：`pm2 list`
4. 查看服务日志：`pm2 logs git-webhook`

### 部署失败

1. 查看 PM2 日志：`pm2 logs git-webhook`
2. 手动执行部署脚本测试：`bash deploy.sh`
3. 检查 Docker 服务状态：`docker compose ps`
4. 确认 git 仓库权限和网络连接

### Git Pull 失败

如果遇到 git pull 超时或失败：
- 脚本会自动重试 6 次，每次间隔 2 秒
- 检查服务器到 Git 平台的网络连接
- 确认 SSH 密钥或 HTTPS 凭证配置正确

---

## 生产环境部署建议

### 使用 PM2 守护进程

```bash
# 启动并设置开机自启
pm2 start server.js --name git-webhook
pm2 save
pm2 startup
```

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name webhook.yourdomain.com;

    location /webhook {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 项目结构

```
web_hooks/
├── server.js          # Express 服务器（webhook 接收端）
├── package.json       # Node.js 依赖配置
└── README.md          # 本文档

../
└── deploy.sh          # 部署脚本（拉取代码、构建、重启）
```
