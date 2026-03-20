# ================================
# 阶段 0: 基础镜像
# 使用 Alpine 版本以减小镜像体积
# ================================
FROM node:22.22.1-alpine AS base

# ================================
# 阶段 1: 依赖安装
# 仅安装生产和开发依赖，利用 Docker 缓存层优化
# ================================
FROM base AS deps
# Alpine 需要 libc6-compat 来兼容某些 Node.js 原生模块
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 仅复制依赖声明文件，最大化利用缓存
COPY package.json yarn.lock* ./
# 使用 frozen-lockfile 确保依赖版本一致性
RUN yarn install --frozen-lockfile

# ================================
# 阶段 2: 构建应用
# 编译 Next.js 应用，生成 standalone 输出
# ================================
FROM base AS builder
WORKDIR /app
# 从 deps 阶段复制已安装的依赖
COPY --from=deps /app/node_modules ./node_modules
# 复制项目源代码
COPY . .

# 禁用 Next.js 遥测数据收集
ENV NEXT_TELEMETRY_DISABLED=1

# 执行生产构建 (需要 next.config.mjs 配置 output: 'standalone')
RUN yarn build

# ================================
# 阶段 3: 生产运行时
# 最小化运行时镜像，仅包含必要文件
# ================================
FROM base AS runner
WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户以提高安全性
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制静态资源文件
COPY --from=builder /app/public ./public

# 创建 .next 目录并设置权限（用于运行时缓存）
RUN mkdir .next && chown nextjs:nodejs .next

# 复制 standalone 构建产物（包含 server.js 和精简的 node_modules）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 复制静态文件到 .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 声明容器监听端口
EXPOSE 3000

# 设置运行时环境变量
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动 Next.js 服务器
CMD ["node", "server.js"]
