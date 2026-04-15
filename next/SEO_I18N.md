# SEO And I18N Flow

## 1. 当前逻辑

项目现在采用的是：

- 前台页面按 `route path + locale` 获取 SEO，不再按 `seo key` 直取。
- `seo_keys` 表负责维护路径映射。
- `seo_records` 表负责维护具体语言版本的 SEO 内容。
- Next.js 在 `generateMetadata()` 阶段服务端读取 SEO，再生成页面 `<head>`。

当前前台公开接口是：

```text
GET /api/seo/by-path?path=/about&locale=en
```

其中：

- `path` 是不带语言前缀的路由，例如 `/`、`/about`、`/team/1`
- `locale` 是语言，例如 `en`、`zh`

数据库职责拆分如下：

- `seo_keys.key`
  - 后台管理主键
  - 仍然存在，但不再作为前台页面取 SEO 的依据
- `seo_keys.targets`
  - 前台路由映射
  - 当前应该存真实页面路径数组，例如 `["/about"]`、`["/team/1"]`
- `seo_records`
  - 某个 `seo_key` 在某个 `locale` 下的 title/description/keywords/canonical/no_index

## 2. 命中顺序

前台页面生成 metadata 的影响顺序如下：

1. Next 页面先确定当前页面的无语言前缀路由。
2. Next 页面拿当前语言 `lang`。
3. `generateMetadata()` 调用 `getSeoByPath(path, locale)`。
4. Server 通过 `/api/seo/by-path` 在 `seo_keys.targets` 中查目标路径。
5. 如果命中路径，再去读对应 `seo_records` 的当前语言记录。
6. 只有当该记录 `visibility = published` 时，数据库内容才会进入页面 meta。
7. 如果数据库没有命中，或者记录不是 `published`，页面会回退到代码里的默认 metadata。
8. 页面级 metadata 会覆盖 layout 级默认 metadata。

可以理解成：

```text
route path
  -> locale
  -> seo_keys.targets
  -> seo_records(locale)
  -> published 检查
  -> 页面 metadata
  -> fallback metadata
```

## 3. 渲染时机

这套 SEO 不是“渲染后客户端再补”。

它发生在 **渲染前**，更准确地说，是在 Next.js 的 `generateMetadata()` 阶段：

- 对静态生成或可预构建页面：
  - 会在构建阶段或 ISR 重新生成时获取 SEO
- 对请求时渲染页面：
  - 会在服务端返回 HTML 之前获取 SEO

结论：

- SEO metadata 是服务端产物
- 不是 hydration 之后再写 `<head>`
- 搜索引擎拿到的初始 HTML 就应该包含最终 metadata

## 4. 当前系统边界

当前系统里，SEO 和 I18N 是两套东西：

- SEO 翻译：
  - 来自数据库 `seo_records`
  - 影响 `<title>`、`description`、`keywords`、`canonical`、`robots`、`openGraph`
- 页面正文 I18N：
  - 优先来自 `NEXT_PUBLIC_I18N_HOSTS` 指向的 OSS 文案
  - OSS 取不到时，回退到本地 `next/src/dictionaries/*.json`

也就是说：

- 改页面正文文案，不会自动改数据库 SEO
- 改数据库 SEO，也不会自动改页面正文

## 5. 路径规范

`seo_keys.targets` 必须遵循这些规则：

- 不带语言前缀
  - 对：`/about`
  - 不对：`/en/about`
- 根路径固定写 `/`
- 非根路径不要带结尾 `/`
  - 对：`/team/1`
  - 不对：`/team/1/`
- 动态详情页要存真实落地路径
  - 例如：`/news/1`、`/team/3`

## 6. 修改一个已有页面的 SEO

如果页面路径不变，只是要改 SEO 内容：

1. 找到该页面对应的 `seo_keys.targets`
2. 保持 `targets` 不变
3. 更新对应 `seo_records` 的 `locale`
4. 确保 `visibility = published`

你需要改的是数据库，不是 Next 页面代码。

## 7. 新增一个页面时怎么做

如果新增页面，例如 `/services`：

1. 在 `next` 中创建页面路由
2. 在该页面的 `generateMetadata()` 中调用：

```ts
const seoData = await getSeoByPath('/services', lang)
```

3. 在 `seo_keys` 新增一条记录
4. 把 `targets` 设为：

```json
["/services"]
```

5. 在 `seo_records` 中为 `en`、`zh` 等语言新增记录
6. 设置 `visibility = published`

如果少了第 3 到第 6 步，页面会走 fallback metadata。

## 8. 修改已有 I18N 文案

### 场景 A：只改现有 `en/zh` 页面正文

优先级是：

1. OSS 文案
2. 本地 `next/src/dictionaries/en.json`
3. 本地 `next/src/dictionaries/zh.json`

当前读取逻辑在：

- [next/src/get-dictionary.ts](/Users/edy/Downloads/CooyueNext/next/src/get-dictionary.ts)

如果线上配置了 `NEXT_PUBLIC_I18N_HOSTS`：

- 应优先更新 OSS 的 `/article/en.json`、`/article/zh.json`
- 等待 `revalidate: 3600` 的缓存刷新，或者主动清缓存/重新部署

如果线上没有配置 OSS：

- 直接更新：
  - [next/src/dictionaries/en.json](/Users/edy/Downloads/CooyueNext/next/src/dictionaries/en.json)
  - [next/src/dictionaries/zh.json](/Users/edy/Downloads/CooyueNext/next/src/dictionaries/zh.json)
- 然后重新构建部署 `next`

### 场景 B：页面正文和 SEO 都要改

要改两处：

1. 页面文案：
  - OSS 或本地 dictionaries
2. 页面 SEO：
  - `seo_records`

这两套数据互不自动同步。

## 9. 新增一种语言时怎么更新项目

新增语言不是只改一处，至少要改下面这些地方。

### Next 侧

1. 更新 [next/src/i18n-config.ts](/Users/edy/Downloads/CooyueNext/next/src/i18n-config.ts)
   - 把新语言加入 `locales`
   - 视情况调整 `defaultLocale`
2. 更新 [next/src/get-dictionary.ts](/Users/edy/Downloads/CooyueNext/next/src/get-dictionary.ts)
   - 增加新语言字典 loader
3. 新增本地字典文件
   - 例如 `next/src/dictionaries/ja.json`
4. 如果使用 OSS：
   - 同步新增 `/article/{locale}.json`
5. `middleware` 会自动读取 `i18n.locales`
   - 文件在 [next/src/middleware.ts](/Users/edy/Downloads/CooyueNext/next/src/middleware.ts)

### Server 侧

1. 更新 SEO 模块允许的 locale
   - [server/src/modules/seo/queries.js](/Users/edy/Downloads/CooyueNext/server/src/modules/seo/queries.js)
2. 如果 products 模块也走同样 locale 限制，也要同步更新 products 的 locale 校验
3. 给数据库加上新的 locale 支持

### 数据库侧

当前数据库用的是 `locale` enum，不是纯文本。

所以新增语言时，需要对相关数据库做 migration：

1. `seo_key` 数据库里的 `locale` enum 增加新值
2. `products_key` 数据库里的 `locale` enum 也增加新值
3. 给 `seo_records` 补上新语言版本
4. 如有产品/分类多语言，也要补对应语言数据

如果只改了 Next，不改数据库 enum，Server 写新语言会直接失败。

## 10. 部署顺序

涉及 SEO / I18N 变更时，推荐顺序：

### 仅改数据库 SEO 内容

1. 先更新 `seo_keys.targets`
2. 再更新 `seo_records`
3. 不一定需要重新部署代码

### 改 SEO 代码逻辑

1. 先部署 `server`
2. 再部署 `next`

原因：

- `next` 依赖 `server` 的 `/api/seo/by-path`
- 如果先上 `next`，但 `server` 还是旧版，就会拿不到新接口

### 改 I18N 文案

1. 如果用 OSS，先发 OSS 文案
2. 如果改本地字典，重新部署 `next`
3. 如果同时改 SEO 数据，再同步更新数据库

## 11. 维护建议

建议长期遵守这几条：

- 前台页面只按 `path + locale` 取 SEO
- 不要再让页面直接依赖 `seo key`
- `seo_keys.targets` 只存真实前台路由
- 页面正文翻译和 SEO 翻译分开维护
- 新增页面时，代码路由、`targets`、`seo_records` 一起补
- 新增语言时，Next、Server、数据库 migration 必须一起改

## 12. 一句话总结

当前模式是：

- 路由决定页面
- `targets` 决定 SEO 命中
- `locale` 决定语言版本
- `generateMetadata()` 在服务端渲染前把数据库 SEO 写进页面 meta
- 页面正文 I18N 和 SEO I18N 是两套数据源，必须分别维护
