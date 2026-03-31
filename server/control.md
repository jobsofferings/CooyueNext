# 服务控制说明

## 数据库表结构

**已经准备好了。** 服务启动时会自动执行迁移，无需手动操作。

### 自动迁移机制

`server/src/config/db.js` 在每次启动时检查 `server/migrations/` 目录，**按文件名顺序**自动执行所有 `.sql` 文件。已经 applied 的文件（表已存在）会被安全跳过，不会报错。

当前已有的迁移文件：

| 文件 | 作用 |
|------|------|
| `001_initial.sql` | 创建 SEO 和 Products 的完整表结构 |

### 表结构一览

**SEO 模块**
- `seo_keys` — SEO 键名定义
- `seo_records` — 每个键的各语言 SEO 内容（title、description、keywords、og_image 等）

**Products 模块**
- `product_categories` — 产品分类（支持层级和多语言 `zh`/`en`）
- `products_key` — 产品主表（名称、描述、价格、图片、规格等）

迁移文件还包含 `updated_at` 自动更新时间触发器，无需手动维护。

---

## 部署时的数据库连接

### Docker Compose 环境（生产）

`docker-compose.yml` 已通过 `DATABASE_URL` 环境变量覆盖连接配置：

```
postgresql://products_key:H3CNBKAM58SwREiy@host.docker.internal:5432/cooyue
```

容器启动时会自动连接到你宿主机的 PostgreSQL 并执行迁移。

### 本地开发

确保 `.env` 中配置正确（已配置）：

```
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=cooyue
PG_USER=products_key
PG_PASSWORD=H3CNBKAM58SwREiy
```

> ⚠️ `DATABASE_URL` 留空即可，会自动使用上述单独参数。

---

## 服务管理命令

```bash
# 构建并启动所有 Docker 服务（自动执行迁移）
docker compose up -d --build

# 查看容器状态
docker compose ps

# 查看迁移日志（服务启动时打印）
docker compose logs server

# 重启 server 服务（重新触发迁移检查）
docker compose restart server

# 手动执行迁移（可选，一般不需要）
docker compose exec server node -e "require('./src/config/db').getPool()"
```

---

## 常见问题

**Q: 迁移失败了怎么办？**

查看日志确认原因：

```bash
docker compose logs server
```

常见原因：PostgreSQL 未运行、密码错误、数据库 `cooyue` 不存在。确认后修复再重启即可。

**Q: 如何添加新的表？**

在 `server/migrations/` 下新建 `.sql` 文件（命名如 `002_xxx.sql`），服务下次启动时会自动按顺序执行。

**Q: 迁移文件是否可以重复执行？**

可以。`001_initial.sql` 中的 `CREATE TABLE` 对已存在的表会跳过（被 `db.js` 中的 safe-ignore 捕获），不会报错。
