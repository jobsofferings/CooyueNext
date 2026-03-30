# 数据库连接说明

更新时间：2026-03-27

## 环境变量配置

项目通过环境变量读取服务端口和 PostgreSQL 连接信息。

请在 `server/` 目录下配置 `.env` 文件，格式如下：

```env
PORT=<APP_PORT>
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>
```

其中：

- `<APP_PORT>`：服务监听端口
- `<DB_USER>`：数据库用户名
- `<DB_PASSWORD>`：数据库密码
- `<DB_HOST>`：数据库主机地址
- `<DB_PORT>`：数据库端口
- `<DB_NAME>`：数据库名

## 连接字符串格式

PostgreSQL 连接串标准格式如下：

```text
postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>
```

本项目中的 `DATABASE_URL` 应保持这一格式。

## 启动服务

在 `server/` 目录下执行：

```bash
yarn start
```

开发模式启动：

```bash
yarn dev
```

## 健康检查

健康检查接口如下：

```text
GET /api/health
```

如果数据库连接成功，接口通常会返回类似结果：

```json
{
  "ok": true,
  "database": "connected"
}
```

## 直接连接数据库示例

如果你的机器已经安装了 `psql`，可以使用占位格式进行连接：

```bash
psql "postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>"
```

也可以使用分开的参数写法：

```bash
PGPASSWORD='<DB_PASSWORD>' psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d <DB_NAME>
```

## 使用 Node.js 快速测试

在 `server/` 目录下执行：

```bash
node -e "const {Client}=require('pg'); const client=new Client({connectionString:'postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>'}); client.connect().then(()=>client.query('select 1')).then(r=>{console.log(r.rows); return client.end();}).catch(err=>{console.error(err.message); process.exit(1);});"
```

## 如果仍然无法连接，请优先检查

1. PostgreSQL 服务是否已经启动。
2. 数据库端口是否已开放。
3. PostgreSQL 是否监听了外部地址，而不是只监听 `localhost`。
4. `pg_hba.conf` 是否允许当前客户端连接。
5. 数据库用户是否有目标数据库的连接权限。
