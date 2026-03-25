# 服务器部署指南

本文档说明如何在服务器上部署 Next.js 应用和 Webhook 自动部署服务。

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         服务器                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐         ┌─────────────────┐              │
│   │   Next.js App   │         │  Webhook 服务   │              │
│   │   (Docker)      │         │   (PM2)         │              │
│   │                 │         │                 │              │
│   │   端口: 3000    │         │   端口: 9000    │              │
│   └─────────────────┘         └────────┬────────┘              │
│            │                           │                        │
│            │                           │ 执行部署脚本           │
│            │                           ▼                        │
│            │                  ┌─────────────────┐              │
│            │                  │  deploy.sh      │              │
│            │                  │  - git pull     │              │
│            │◄─────────────────│  - docker build │              │
│            │   重启容器        │  - pm2 restart  │              │
│            │                  └─────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                    │                     ▲
                    │                     │
                    ▼                     │ Webhook
            ┌───────────────┐      ┌──────────────┐
            │   用户访问    │      │   GitHub     │
            │   网站        │      │   git push   │
            └───────────────┘      └──────────────┘
```

---

## 项目结构

```
CooyueNext/
├── .env                        # 环境变量配置
├── .env.example                # 环境变量模板
├── docker-compose.yml          # Docker Compose 编排配置（仅 Next.js）
├── deploy.sh                   # 主部署脚本（根目录）
├── SERVER_DEPLOY.md            # 本部署文档
│
├── next/                       # Next.js 应用
│   ├── docker/
│   │   └── Dockerfile          # Next.js 镜像构建配置
│   ├── src/                    # 源代码
│   ├── package.json
│   └── ...
│
└── web_hooks/                  # Webhook 自动部署服务（PM2）
    ├── server.js               # Webhook 服务主程序
    ├── package.json            # Node.js 依赖
    ├── README.md               # Webhook 服务说明
    └── logs/                   # 部署日志目录
```

---

## 服务说明

### Next.js 应用 (Docker)

**文件位置：** `next/docker/Dockerfile`

**构建阶段：**
1. **deps** - 安装依赖
2. **builder** - 构建应用 (yarn build)
3. **runner** - 生产运行时 (standalone 模式)

**特点：**
- 多阶段构建，最终镜像体积小
- 使用 Alpine 基础镜像
- 非 root 用户运行，更安全
- standalone 输出，无需完整 node_modules

```bash
# 单独构建 Next.js 镜像
docker build -t cooyue-next:latest ./next -f ./next/docker/Dockerfile
```

### Webhook 服务 (PM2)

**文件位置：** `web_hooks/server.js`

**运行方式：** 使用 PM2 进程管理器直接运行在宿主机上

**特点：**
- 由 deploy.sh 自动管理启动/重启
- 接收 GitHub/GitLab webhook 推送事件
- 触发部署脚本完成自动化部署
- 日志记录到 web_hooks/logs 目录

**为什么用 PM2 而不是 Docker？**
- Webhook 服务需要执行 deploy.sh 脚本
- deploy.sh 需要在宿主机上操作 Docker 和 Git
- 使用 PM2 可以更简单直接地访问宿主机资源

---

## 前置条件

- [x] 服务器已安装 Docker
- [x] 服务器已安装 Docker Compose
- [x] 服务器已安装 Git
- [x] 服务器已安装 Node.js 和 PM2
- [x] 服务器可以访问外网

### 检查环境

```bash
# 检查 Docker
docker --version
# Docker version 24.0.x 或更高

# 检查 Docker Compose
docker compose version
# Docker Compose version v2.x.x

# 检查 Git
git --version
# git version 2.x.x

# 检查 Node.js
node --version
# v22.x.x 或更高

# 检查 PM2
pm2 --version
# 如果未安装，执行：npm install -g pm2
```

---

## 部署步骤

### Step 1: 克隆代码

```bash
# 进入部署目录
cd /home/your-user

# 克隆仓库
git clone https://github.com/your-username/CooyueNext.git

# 进入项目
cd CooyueNext
```

---

### Step 2: 配置环境变量

```bash
# 复制模板
cp .env.example .env

# 编辑配置
vim .env
```

**.env 内容：**

```bash
# Webhook 签名密钥（必须与 GitHub 配置一致）
WEBHOOK_SECRET=your-secure-secret-here

# 触发部署的分支
TARGET_BRANCH=main

# Webhook 端口（可选）
# WEBHOOK_PORT=9000
```

**生成随机密钥：**

```bash
openssl rand -hex 32
```

---

### Step 3: 一键部署

```bash
# 执行部署脚本（自动完成所有部署步骤）
bash deploy.sh
```

**执行过程：**

```
========================================
开始部署流程 Mon Mar 23 22:35:46 CST 2026
========================================

[1/4] 暂存本地更改...
[2/4] 拉取最新代码...（支持超时重试，最多6次）
[3/4] 使用 Docker Compose 构建和启动 Next.js...
[4/5] 清理旧的 Docker 镜像...
[5/5] 启动 Webhook 服务 (PM2)...

========================================
部署完成
========================================

Docker 服务:
NAME               STATUS         PORTS
cooyue-next-app   Up (healthy)   0.0.0.0:3000->3000/tcp

PM2 服务:
┌────┬───────────────┬─────────┬─────────┐
│ id │ name          │ status  │ restart │
├────┼───────────────┼─────────┼─────────┤
│ 0  │ git-webhook   │ online  │ 0       │
└────┴───────────────┴─────────┴─────────┘
```

**首次部署耗时约 3-5 分钟**

---

### Step 4: 验证服务

```bash
# 查看 Docker 容器状态
docker compose ps

# 查看 PM2 服务状态
pm2 list
```

**期望输出：**

```
Docker 服务:
NAME                IMAGE                  STATUS              PORTS
cooyue-next-app     cooyue-next:latest     Up (healthy)        0.0.0.0:3000->3000/tcp

PM2 服务:
┌────┬───────────────┬─────────┬─────────┐
│ id │ name          │ status  │ restart │
├────┼───────────────┼─────────┼─────────┤
│ 0  │ git-webhook   │ online  │ 0       │
└────┴───────────────┴─────────┴─────────┘
```

**测试服务：**

```bash
# 测试 Next.js
curl -I http://localhost:3000
# HTTP/1.1 200 OK

# 测试 Webhook
curl http://localhost:9000/health
# {"status":"ok","timestamp":"..."}
```

---

### Step 5: 配置防火墙

**Ubuntu/Debian (ufw):**

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 9000/tcp
sudo ufw reload
sudo ufw status
```

**CentOS/RHEL (firewalld):**

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```

**云服务器：** 在云控制台安全组中开放 3000 和 9000 端口

---

### Step 6: 配置 GitHub Webhook

参考 `web_hooks/GITHUB_WEBHOOK_SETUP.md`

| 配置项 | 值 |
|--------|-----|
| Payload URL | `http://服务器IP:9000/webhook` |
| Content type | `application/json` |
| Secret | 与 `.env` 中 `WEBHOOK_SECRET` 一致 |
| Events | Just the push event |
| Active | ✅ |

---

## 服务端口

| 服务 | 端口 | 运行方式 | 用途 |
|------|------|----------|------|
| Next.js | 3000 | Docker | Web 应用访问 |
| Webhook | 9000 | PM2 | GitHub webhook 接收 |

---

## 常用命令

### 一键部署

```bash
# 完整部署流程（推荐）
bash deploy.sh

# 部署流程说明：
# 1. 暂存本地更改 (git stash)
# 2. 拉取最新代码 (git pull，10秒超时，最多重试6次)
# 3. 构建并启动 Docker 服务 (docker compose up -d --build)
# 4. 清理旧镜像
# 5. 重启 PM2 webhook 服务
```

### Docker 服务管理

```bash
# 启动 Docker 服务
docker compose up -d

# 停止 Docker 服务
docker compose down

# 重启 Next.js 服务
docker compose restart next-app

# 重新构建 Next.js
docker compose up -d --build next-app
```

### PM2 服务管理

```bash
# 查看 PM2 服务状态
pm2 list

# 查看 webhook 服务日志
pm2 logs git-webhook

# 手动重启 webhook 服务
pm2 restart git-webhook

# 停止 webhook 服务
pm2 stop git-webhook

# 启动 webhook 服务
pm2 start web_hooks/server.js --name git-webhook

# 查看 webhook 详细信息
pm2 describe git-webhook
```

### 查看状态和日志

```bash
# Docker 服务状态
docker compose ps

# Docker 实时日志
docker compose logs -f next-app

# PM2 实时日志
pm2 logs git-webhook --lines 100

# 查看 webhook 部署日志
ls -lh web_hooks/logs/
tail -f web_hooks/logs/webhook-$(date +%Y-%m-%d).log
```

### 构建相关

```bash
# 重新构建并启动
docker compose up -d --build

# 只重建 Next.js
docker compose up -d --build next-app

# 强制重建（不使用缓存）
docker compose build --no-cache
docker compose up -d
```

### 清理

```bash
# 清理未使用镜像
docker image prune -f

# 清理所有未使用资源
docker system prune -f

# 查看磁盘使用
docker system df
```

---

## 查看部署日志

```bash
# 通过 API 查看日志列表
curl http://localhost:9000/logs

# 查看最新日志内容
curl http://localhost:9000/logs/webhook-2026-03-23.log

# 直接查看日志文件
tail -f web_hooks/logs/webhook-$(date +%Y-%m-%d).log

# 查看 PM2 日志
pm2 logs git-webhook --lines 50
```

---

## 手动部署

如果自动部署失败，可以手动执行：

```bash
# 方法 1: 执行完整部署脚本
bash deploy.sh

# 方法 2: 分步执行
cd /root/CooyueNext

# 拉取最新代码
git pull origin main

# 重新构建并启动 Next.js
docker compose up -d --build next-app

# 重启 webhook 服务
pm2 restart git-webhook

# 查看状态
docker compose ps
pm2 list
```

---

## 故障排查

### Next.js 容器无法启动

```bash
# 查看错误日志
docker compose logs next-app

# 查看所有容器（包括已停止的）
docker compose ps -a

# 检查镜像是否构建成功
docker images | grep cooyue

# 重新构建（不使用缓存）
docker compose build --no-cache next-app
docker compose up -d next-app
```

### Webhook 服务无法启动

```bash
# 查看 PM2 状态
pm2 list

# 查看错误日志
pm2 logs git-webhook --err

# 手动重启
cd web_hooks
pm2 stop git-webhook
pm2 start server.js --name git-webhook

# 检查端口占用
lsof -i :9000
```

### Webhook 不触发

1. 检查 PM2 服务是否在线：`pm2 list`
2. 检查 GitHub → Settings → Webhooks → Recent Deliveries
3. 确认防火墙开放 9000 端口：`lsof -i :9000`
4. 确认 Secret 配置一致
5. 查看实时日志：`pm2 logs git-webhook`
6. 查看日志文件：`tail -f web_hooks/logs/webhook-$(date +%Y-%m-%d).log`

### Git Pull 超时

deploy.sh 已内置重试机制：
- 单次超时：10 秒
- 最大重试：6 次
- 重试间隔：2 秒

如果仍然失败，检查：
```bash
# 检查网络连接
ping github.com

# 手动测试 git pull
cd /root/CooyueNext
timeout 10s git pull
```

### 构建失败

```bash
# 查看构建日志
docker compose build next-app 2>&1 | tee build.log

# 清理缓存重建
docker compose build --no-cache next-app
docker compose up -d next-app

# 检查磁盘空间
df -h
docker system df
```

### 端口冲突

```bash
# 检查端口占用
lsof -i :3000   # Next.js
lsof -i :9000   # Webhook

# 修改 Next.js 端口（编辑 docker-compose.yml）
ports:
  - "3001:3000"  # 改为 3001

# 修改 Webhook 端口（编辑 .env）
WEBHOOK_PORT=9001
# 然后重启：pm2 restart git-webhook
```

---

## 生产环境配置

### Nginx 反向代理

```nginx
# /etc/nginx/sites-available/cooyue
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /webhook {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
        proxy_set_header X-GitHub-Event $http_x_github_event;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/cooyue /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 配置 HTTPS

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 自动配置 SSL
sudo certbot --nginx -d your-domain.com

# 自动续期（certbot 会自动添加定时任务）
sudo certbot renew --dry-run
```

### 开机自启

```bash
# 1. 确保 Docker 开机自启
sudo systemctl enable docker

# 2. Docker 容器自动重启（已配置 restart: unless-stopped）
# 系统重启后 Next.js 容器会自动恢复运行

# 3. PM2 开机自启
pm2 startup
# 按照输出的提示执行命令（通常是 sudo 开头的命令）

pm2 save
# 保存当前 PM2 进程列表，重启后自动恢复
```

---

## 快速参考

```bash
# ===== 部署 =====
docker compose up -d --build         # 构建并启动
docker compose down                   # 停止服务

# ===== 状态 =====
docker compose ps                     # 查看状态
docker compose logs -f                # 查看日志

# ===== 更新 =====
git pull && docker compose up -d --build next-app  # 手动更新

# ===== 测试 =====
curl http://localhost:3000            # 测试网站
curl http://localhost:9000/health     # 测试 webhook

# ===== 清理 =====
docker system prune -f                # 清理资源
```
