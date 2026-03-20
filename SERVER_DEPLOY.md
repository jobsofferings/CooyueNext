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

## 前置条件

- [x] 服务器已安装 Docker
- [x] 服务器已安装 Docker Compose
- [x] 服务器已安装 Git
- [x] 服务器可以访问外网（拉取代码、下载镜像）

### 检查 Docker 环境

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker compose version

# 检查 Docker 服务状态
sudo systemctl status docker
```

---

## 部署步骤

### Step 1: 克隆代码到服务器

```bash
# 进入你想存放项目的目录
cd /home/your-user

# 克隆仓库
git clone https://github.com/your-username/CooyueNext.git

# 进入项目目录
cd CooyueNext
```

---

### Step 2: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

**配置内容：**

```bash
# Webhook 密钥（必须与 GitHub Webhook 配置的 Secret 一致）
WEBHOOK_SECRET=your-secure-secret-here

# 触发部署的目标分支
TARGET_BRANCH=main

# Webhook 服务端口（可选，默认 9000）
# WEBHOOK_PORT=9000
```

**生成安全的 Secret：**

```bash
openssl rand -hex 32
```

---

### Step 3: 首次构建并启动所有服务

```bash
# 构建并启动所有服务（后台运行）
docker compose up -d --build
```

**这个命令会：**
1. 构建 Next.js 应用镜像
2. 构建 Webhook 服务镜像
3. 创建 Docker 网络
4. 启动两个容器

**预计耗时：** 首次构建约 3-5 分钟

---

### Step 4: 验证服务状态

```bash
# 查看所有容器状态
docker compose ps

# 期望输出：
# NAME                IMAGE                  STATUS
# cooyue-next-app     cooyue-next:latest     Up (healthy)
# cooyue-webhook      cooyue-webhook:latest  Up (healthy)
```

```bash
# 查看容器日志
docker compose logs -f

# 单独查看 Next.js 日志
docker compose logs -f next-app

# 单独查看 Webhook 日志
docker compose logs -f webhook
```

---

### Step 5: 测试服务

**测试 Next.js 应用：**

```bash
curl http://localhost:3000
# 或在浏览器访问 http://服务器IP:3000
```

**测试 Webhook 服务：**

```bash
# 健康检查
curl http://localhost:9000/health
# 期望输出: {"status":"ok","timestamp":"..."}

# 模拟 webhook 请求
curl -X POST http://localhost:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref": "refs/heads/main", "after": "test123"}'
```

---

### Step 6: 配置防火墙

开放必要的端口：

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 3000/tcp    # Next.js
sudo ufw allow 9000/tcp    # Webhook
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```

**云服务器安全组：** 记得在云控制台的安全组中也开放这两个端口。

---

### Step 7: 配置 GitHub Webhook

参考 `web_hooks/GITHUB_WEBHOOK_SETUP.md` 配置 GitHub Webhook：

| 配置项 | 值 |
|--------|-----|
| Payload URL | `http://服务器IP:9000/webhook` |
| Content type | `application/json` |
| Secret | 与 `.env` 中的 `WEBHOOK_SECRET` 一致 |
| Events | Just the push event |

---

## 常用命令

### 服务管理

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

# 查看服务状态
docker compose ps

# 查看实时日志
docker compose logs -f
```

### 更新部署

```bash
# 手动更新（如果 webhook 自动部署失败）
git pull origin main
docker compose up -d --build next-app
```

### 清理

```bash
# 清理未使用的镜像
docker image prune -f

# 清理所有未使用的资源
docker system prune -f

# 查看磁盘使用
docker system df
```

---

## 目录结构

```
/home/your-user/CooyueNext/
├── .env                    # 环境变量配置
├── docker-compose.yml      # Docker Compose 配置
├── next/                   # Next.js 应用
│   ├── docker/
│   │   └── Dockerfile      # Next.js Docker 配置
│   ├── src/
│   └── ...
└── web_hooks/              # Webhook 服务
    ├── Dockerfile          # Webhook Docker 配置
    ├── server.js           # Webhook 服务代码
    ├── deploy.sh           # 自动部署脚本
    └── logs/               # 部署日志
```

---

## 服务端口说明

| 服务 | 容器内端口 | 映射到主机端口 | 用途 |
|------|-----------|---------------|------|
| Next.js | 3000 | 3000 | Web 应用 |
| Webhook | 9000 | 9000 | 接收 GitHub webhook |

---

## 自动部署流程

当你在本地执行 `git push` 后：

```
1. GitHub 收到 push
      │
      ▼
2. GitHub 发送 webhook 到服务器 :9000/webhook
      │
      ▼
3. Webhook 服务验证签名
      │
      ▼
4. 执行 deploy.sh 脚本
      │
      ├── git fetch && git reset --hard
      ├── docker build (构建新镜像)
      ├── docker compose up -d --force-recreate (重启服务)
      └── docker image prune (清理旧镜像)
      │
      ▼
5. 新版本上线完成
```

---

## 查看部署日志

```bash
# 方法 1: 通过 API
curl http://localhost:9000/logs

# 方法 2: 进入容器查看
docker compose exec webhook ls /app/logs

# 方法 3: 查看容器日志
docker compose logs webhook | grep DEPLOY
```

---

## 故障排查

### 容器无法启动

```bash
# 查看详细错误
docker compose logs next-app
docker compose logs webhook

# 检查容器状态
docker compose ps -a
```

### Webhook 无法触发部署

1. 检查 GitHub Webhook 的 Recent Deliveries
2. 检查服务器防火墙是否开放 9000 端口
3. 检查 Secret 是否匹配
4. 查看 webhook 日志: `docker compose logs webhook`

### 构建失败

```bash
# 清理缓存重新构建
docker compose build --no-cache

# 检查 Dockerfile 语法
docker build -t test ./next -f ./next/docker/Dockerfile
```

### 磁盘空间不足

```bash
# 查看 Docker 磁盘使用
docker system df

# 清理所有未使用的资源
docker system prune -a -f
```

---

## 生产环境建议

### 1. 配置 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/cooyue
server {
    listen 80;
    server_name your-domain.com;

    # Next.js 应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook 服务
    location /webhook {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. 配置 SSL 证书

```bash
# 使用 certbot 自动配置 HTTPS
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. 设置开机自启

Docker 默认会在系统启动时自动启动，容器设置了 `restart: unless-stopped` 也会自动重启。

确认 Docker 服务开机自启：

```bash
sudo systemctl enable docker
```

---

## 快速命令参考

```bash
# 一键部署
docker compose up -d --build

# 一键停止
docker compose down

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 手动重新部署 Next.js
docker compose up -d --build --force-recreate next-app

# 测试 webhook
curl http://localhost:9000/health
```
