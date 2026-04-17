## Next Frontend

### 本地启动

```bash
yarn dev
```

默认访问 `http://localhost:3000`。

### API 联调说明

这个前端支持两种本地开发方式：

1. 只启动前端
2. 前后端联调

不配置 `NEXT_PUBLIC_API_URL` 或 `SEO_API_URL` 时，前端本地开发默认会走 `http://43.139.70.61:3001`。也就是说你访问 `http://localhost:3000/api/*` 时，Next 会代你转发到远端接口。

如果需要联调后端，请配置下面任一环境变量：

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
# 或
SEO_API_URL=http://localhost:3001
```

配置后，`/api/*` 请求会自动转发到对应后端服务。

### 当前行为

- 未配置后端地址：默认请求 `http://43.139.70.61:3001`
- 已配置后端地址：保留原有 API 转发能力
