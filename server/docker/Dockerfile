# ================================
# Stage 0: Base image
# Alpine for minimal image size
# ================================
FROM node:22.22.0-alpine AS base

# ================================
# Stage 1: Install dependencies
# Copy only lockfile for better Docker layer caching
# ================================
FROM base AS deps
WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

# ================================
# Stage 2: Production build
# ================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/static

# ================================
# Stage 3: Production runtime
# Minimal image with only production files
# ================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S -G nodejs cooyue-server

COPY --from=builder /app/node_modules ./node_modules
# Ensure static directory exists (even if empty)
RUN mkdir -p /app/static

COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/static ./static

USER cooyue-server

EXPOSE 3001

ENV PORT=3001

CMD ["node", "src/index.js"]
