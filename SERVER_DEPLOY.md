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
│   │    (容器)       │         │    (容器)       │              │
│   │                 │         │                 │              │
│   │   端口: 3000    │         │   端口: 9000    │              │
│   └─────────────────┘         └────────┬────────┘              │
│            │                           │                        │
│            │                           │ 触发部署               │
│            │                           ▼                        │
│            │                  ┌─────────────────┐              │
│            │                  │  deploy.sh      │              │
│            │                  │  - git pull     │              │
│            │◄─────────────────│  - docker build │              │
│            │   重启容器        │  - 重启服务     │              │
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
├── docker-compose.yml          # Docker Compose 编排配置
├── SERVER_DEPLOY.md            # 本部署文档
│
├── next/                       # Next.js 应用
│   ├── docker/
│   │   └── Dockerfile          # Next.js 镜像构建配置
│   ├── src/                    # 源代码
│   ├── package.json
│   └── ...
│
└── web_hooks/                  # Webhook 自动部署服务
    ├── Dockerfile              # Webhook 镜像构建配置
    ├── server.js               # Webhook 服务主程序
    ├── deploy.sh               # 自动部署脚本
    ├── package.json
    ├── README.md               # Webhook 服务说明
    ├── GITHUB_WEBHOOK_SETUP.md # GitHub 配置指南
    └── logs/                   # 部署日志目录
```

---

## Docker 镜像说明

### Next.js 应用镜像

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

### Webhook 服务镜像

**文件位置：** `web_hooks/Dockerfile`

**包含组件：**
- Node.js 22 (Alpine)
- Git (拉取代码)
- Docker CLI (构建镜像)
- Docker Compose (管理服务)

**特点：**
- 挂载 docker.sock 实现容器内操作 Docker
- 挂载项目目录实现代码更新
- 日志持久化存储

```bash
# 单独构建 Webhook 镜像
docker build -t cooyue-webhook:latest ./web_hooks
```

---

## 前置条件

- [x] 服务器已安装 Docker
- [x] 服务器已安装 Docker Compose
- [x] 服务器已安装 Git
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

# 检查 Docker 服务状态
sudo systemctl status docker
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

### Step 3: 构建并启动服务

```bash
# 一键构建并启动（后台运行）
docker compose up -d --build
```

**执行过程：**

```
[+] Building 180.5s (23/23) FINISHED
 => [next-app] 构建 Next.js 镜像...
 => [webhook] 构建 Webhook 镜像...
[+] Running 3/3
 ✔ Network cooyue-network    Created
 ✔ Container cooyue-next-app Started
 ✔ Container cooyue-webhook  Started
```

**首次构建耗时约 3-5 分钟**

---

### Step 4: 验证服务

```bash
# 查看容器状态
docker compose ps
```

**期望输出：**

```
NAME                IMAGE                  STATUS              PORTS
cooyue-next-app     cooyue-next:latest     Up (healthy)        0.0.0.0:3000->3000/tcp
cooyue-webhook      cooyue-webhook:latest  Up (healthy)        0.0.0.0:9000->9000/tcp
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

| 服务 | 端口 | 用途 |
|------|------|------|
| Next.js | 3000 | Web 应用访问 |
| Webhook | 9000 | GitHub webhook 接收 |

---

## 常用命令

### 启动/停止

```bash
# 启动所有服务
docker compose up -d

# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart next-app
docker compose restart webhook
```

### 查看状态

```bash
# 容器状态
docker compose ps

# 实时日志
docker compose logs -f

# 单个服务日志
docker compose logs -f next-app
docker compose logs -f webhook
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
curl http://localhost:9000/logs/webhook-2026-03-20.log

# 进入容器查看
docker compose exec webhook cat /app/logs/webhook-2026-03-20.log

# 从容器日志查看
docker compose logs webhook | grep -A 20 "DEPLOY"
```

---

## 手动部署

如果自动部署失败，可以手动执行：

```bash
# 进入项目目录
cd /home/your-user/CooyueNext

# 拉取最新代码
git pull origin main

# 重新构建并启动 Next.js
docker compose up -d --build next-app

# 查看状态
docker compose ps
docker compose logs -f next-app
```

---

## 故障排查

### 容器无法启动

```bash
# 查看错误日志
docker compose logs next-app
docker compose logs webhook

# 查看所有容器（包括已停止的）
docker compose ps -a

# 检查镜像是否构建成功
docker images | grep cooyue
```

### Webhook 不触发

1. 检查 GitHub → Settings → Webhooks → Recent Deliveries
2. 确认防火墙开放 9000 端口
3. 确认 Secret 配置一致
4. 查看日志：`docker compose logs webhook`

### 构建失败

```bash
# 查看构建日志
docker compose build next-app 2>&1 | tee build.log

# 清理缓存重建
docker compose build --no-cache

# 检查磁盘空间
df -h
docker system df
```

### 端口冲突

```bash
# 检查端口占用
sudo lsof -i :3000
sudo lsof -i :9000

# 修改端口（编辑 docker-compose.yml）
ports:
  - "3001:3000"  # 改为 3001
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
# 确保 Docker 开机自启
sudo systemctl enable docker

# 容器配置了 restart: unless-stopped
# 系统重启后会自动恢复运行
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
