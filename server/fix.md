# SEO 页面修复大纲

## 概述

根据 `/server` 中的 SEO 接口和数据库结构，将 `/next` 中所有页面的 `title` 和 `description` 修改为从数据库动态获取。

## 后端接口

### SEO 模块接口

- **Base URL**: `http://localhost:3001/api`
- **获取 SEO 数据**: `GET /api/seo/:key?locale={locale}`
  - `key`: SEO 键名 (如 `home`, `about`, `team`, `team-1`, `news`, `news-1` 等)
  - `locale`: 语言代码 (`en` 或 `zh`)

### 数据库表结构

- **seo_keys**: 存储 SEO 键名定义
- **seo_records**: 存储每个键的各语言 SEO 内容 (title, description, keywords, og_image 等)

---

## 修改的文件

### 1. 新建 SEO API 客户端

**文件**: `next/src/lib/seo-api.ts`

新建统一的 SEO API 客户端，提供以下功能：
- `getSeoData(key, locale)`: 获取指定 key 和语言的 SEO 数据
- `extractSeoMeta(seoResponse, defaults)`: 提取 SEO 的 title、description、keywords、ogImage
- 各个页面的便捷函数: `getHomeSeo`, `getAboutSeo`, `getTeamSeo` 等

**性能优化**:
- 使用 Next.js 的 `revalidate: 3600` (1小时缓存) 减少数据库查询
- API 请求错误时优���降级到默认值

### 2. 首页

**文件**: `next/src/app/[lang]/page.tsx`

修改内容:
- 导入 `getHomeSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据
- 数据库无数据时回退到默认值
- 支持 `keywords` 和 `ogImage`

SEO Key: `home`

### 3. About 页面

**文件**: `next/src/app/[lang]/about/page.tsx`

修改内容:
- 导入 `getAboutSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `about`

### 4. Team 列表页

**文件**: `next/src/app/[lang]/team/page.tsx`

修改内容:
- 导入 `getTeamSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `team`

### 5. Team 详情页

**文件**: `next/src/app/[lang]/team/[id]/page.tsx`

修改内容:
- 导入 `getTeamMemberSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `team-{id}` (如 `team-1`, `team-2`)

### 6. Careers 页面

**文件**: `next/src/app/[lang]/careers/page.tsx`

修改内容:
- 导入 `getCareersSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `careers`

### 7. Contact 页面

**文件**: `next/src/app/[lang]/contact/page.tsx`

修改内容:
- 导入 `getContactSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `contact`

### 8. FAQ 页面

**文件**: `next/src/app/[lang]/faq/page.tsx`

修改内容:
- 从客户端组件改为服务端组件 (移除 `'use client'`)
- 导入 `getDictionary` 从 `@/get-dictionary`
- 导入 `getFaqSeo` 和 `extractSeoMeta`
- 添加 `generateMetadata` 函数

SEO Key: `faq`

### 9. News 列表页

**文件**: `next/src/app/[lang]/news/page.tsx`

修改内容:
- 导入 `getNewsSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `news`

### 10. News 详情页

**文件**: `next/src/app/[lang]/news/[id]/page.tsx`

修改内容:
- 导入 `getNewsItemSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `news-{id}` (如 `news-1`, `news-2`)

### 11. Testimonials 页面

**文件**: `next/src/app/[lang]/testimonials/page.tsx`

修改内容:
- 导入 `getTestimonialsSeo` 和 `extractSeoMeta`
- `generateMetadata` 改为从数据库获取 SEO 数据

SEO Key: `testimonials`

---

## 环境变量

需要在 Next.js 项目的 `.env.local` 中配置:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 数据填充示例

在数据库中插入 SEO 数据的 SQL 示例:

```sql
-- 首页 (英文)
INSERT INTO seo_keys (key, targets) VALUES ('home', ARRAY['homepage'])
ON CONFLICT (key) DO NOTHING;

INSERT INTO seo_records (seo_key, locale, title, description, keywords, visibility)
VALUES ('home', 'en', 'Cooyue - Professional Business Consulting', 
        'Expert business consulting services for your company growth.',
        ARRAY['business consulting', 'professional services', 'growth'],
        'published');

-- 首页 (中文)
INSERT INTO seo_records (seo_key, locale, title, description, keywords, visibility)
VALUES ('home', 'zh', 'Cooyue - 专业商业咨询',
        '为您公司增长提供专业的商业咨询服务。',
        ARRAY['商业咨询', '专业服务', '增长'],
        'published');
```

---

## 性能考虑

1. **缓存策略**: 使用 Next.js 的 ISR (Incremental Static Regeneration)，设置 `revalidate: 3600` (1小时)，平衡数据时效性和性能
2. **优雅降级**: API 请求失败时自动使用默认值，确保页面可访问
3. **并行请求**: `generateMetadata` 中的数据库请求可以与页面数据请求并行执行
4. **只读字段**: API 只返回必要的字段，减少数据传输

---

## 验证步骤

1. 确保后端服务运行在 `http://localhost:3001`
2. 确保数据库中有 SEO 数据 (可通过 API 或直接插入 SQL)
3. 访问各页面，检查 `<title>` 和 `<meta name="description">` 是否正确
4. 测试不同语言 (en/zh) 切换是否正确
5. 测试 API 不可用时是否正确降级到默认值