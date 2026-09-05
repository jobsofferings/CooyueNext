# AI Agent 数据地图与 MVP 问题集

整理范围：当前 CooyueNext 仓库可确认的数据库与产品数据  
整理时间：2026-09-05

## 结论先说

当前仓库里没有找到 MySQL 连接配置。实际可用的数据源是两个 PostgreSQL 库：

- `products_key`
- `seo_key`

这份文档先把当前仓库里能确认的数据地图整理出来，作为后续 Text-to-SQL、RAG 和 Agent 的第一版输入。如果你说的 MySQL 在另一台服务器上，那会是第二个独立数据源，后面再单独接入。

## 数据源概览

| 数据源 | 位置 | 角色 | 状态 |
| --- | --- | --- | --- |
| products_key | `43.139.70.61:5432` | 产品主库 | 已连通 |
| seo_key | `43.139.70.61:5432` | SEO 主库 | 已连通 |
| 另一台 MySQL | 未在仓库中发现 | 待接入 | 未确认 |

## 产品库地图

### 表级结构

| 表 | 行数 | 说明 |
| --- | --- | --- |
| `product_categories` | 32 | 类目表，16 个 slug，双语各一行 |
| `products_key` | 636 | 产品表，318 个 slug，双语各一行 |
| `mail_tasks` | 0 | 邮件任务表，当前没有可用数据 |

### 关键字段

- `product_categories`
  - `slug`, `parent_slug`, `locale`, `name`, `description`, `display_order`, `visibility`, `extra`
- `products_key`
  - `slug`, `category_slug`, `locale`, `name`, `short_description`, `description`, `price`, `original_price`, `currency`
  - `images`, `tags`, `specifications`, `visibility`, `display_order`, `extra`

### 数据画像

- 产品总行数：636
- 产品唯一 slug：318
- 双语配对：318 zh + 318 en
- 已发布：636
- 草稿：0
- 有图片的产品 slug：290
- 无图片的产品 slug：28
- 有价格的行：2

结论：

- 第一版不要把“价格分析”当主问题，因为价格数据太少。
- “有无图片”是一个很好的首版筛选维度。
- 双语完整率很好，适合做中英文切换和翻译检查。

### 类目分布

| 类目 slug | 中文名 | 英文名 | 产品数 | 无图产品数 |
| --- | --- | --- | ---: | ---: |
| `handheld-thermal-cameras` | 手持热像仪 | Handheld Thermal Cameras | 86 | 4 |
| `infrared-thermometers` | 红外测温仪 | Infrared Thermometers | 46 | 3 |
| `pyrometers` | 红外高温计 | Pyrometers | 33 | 11 |
| `thermal-monoculars` | 热成像单筒 | Thermal Monoculars | 30 | 0 |
| `thermal-scopes` | 热成像瞄具 | Thermal Scopes | 27 | 0 |
| `fixed-thermal-cameras` | 固定式热像仪 | Fixed Thermal Cameras | 20 | 0 |
| `ir-accessories` | 红外附件 | IR Accessories | 18 | 3 |
| `thermal-phone-modules` | 手机热像模块 | Phone Thermal Modules | 16 | 0 |
| `systems` | 整机系统 | Systems | 15 | 0 |
| `gas-imaging-cameras` | 气体红外成像 | Gas Imaging Cameras | 11 | 0 |
| `thermal-binoculars` | 热成像双筒 | Thermal Binoculars | 8 | 0 |
| `cores` | 机芯 | Cores | 5 | 5 |
| `lenses` | 镜头 | Lenses | 2 | 2 |
| `electronics` | 电子产品 | Electronics | 1 | 0 |
| `infrared-products` | 红外产品 | Infrared Products | 0 | 0 |
| `eyepieces` | 目镜 | Eyepieces | 0 | 0 |

### 无图产品清单

这些产品当前没有图片，前端必须兼容占位图或无图布局。

#### `cores`

- `teledyne-flir-oem-boson`
- `teledyne-flir-oem-boson-plus-iq-development-kit`
- `teledyne-flir-oem-hadron-640`
- `teledyne-flir-oem-lepton`
- `teledyne-flir-oem-neutrino`

#### `handheld-thermal-cameras`

- `flir-c3-x`
- `flir-c5`
- `flir-c8`
- `flir-cx5`

#### `infrared-thermometers`

- `cooyue-cy-t80`
- `cooyue-cy-t160`
- `cooyue-cy-t320`

#### `ir-accessories`

- `cooyue-cy-irw-50-inspection-window`
- `cooyue-cy-la-25-lens-adapter`
- `cooyue-cy-mb-01-mounting-bracket`

#### `lenses`

- `teledyne-flir-oem-lwir-zoom-lens-assemblies`
- `teledyne-flir-oem-mwir-zoom-lens-assemblies`

#### `pyrometers`

- `cooyue-cy-py650`
- `cooyue-cy-py1200`
- `cooyue-cy-py1800`
- `fluke-process-instruments-endurance-series`
- `fluke-process-instruments-raytek-compact-ci`
- `fluke-process-instruments-raytek-compact-cm`
- `fluke-process-instruments-raytek-compact-gp`
- `fluke-process-instruments-raytek-compact-mi3`
- `fluke-process-instruments-raytek-marathon-mm`
- `fluke-process-instruments-raytek-raynger-3i-plus`
- `fluke-process-instruments-thermalert-4-0`

### 样例 / 占位产品

这 9 个 slug 属于内部样例内容，适合在前端和 AI 说明中标记为“示例产品”：

- 红外测温仪：`cooyue-cy-t80`, `cooyue-cy-t160`, `cooyue-cy-t320`
- 红外高温计：`cooyue-cy-py650`, `cooyue-cy-py1200`, `cooyue-cy-py1800`
- 红外附件：`cooyue-cy-irw-50-inspection-window`, `cooyue-cy-la-25-lens-adapter`, `cooyue-cy-mb-01-mounting-bracket`

## SEO 地图

| 指标 | 数值 |
| --- | ---: |
| `seo_keys` | 21 |
| `seo_records` | 41 |
| zh 记录 | 20 |
| en 记录 | 21 |
| 已发布 | 41 |
| 草稿 | 0 |
| 有 targets 的 key | 20 |
| no_index | 0 |

### SEO 覆盖页面

- `/`
- `/about`
- `/careers`
- `/contact`
- `/faq`
- `/news`
- `/news/1` 到 `/news/6`
- `/team`
- `/team/1` 到 `/team/6`
- `/testimonials`

### SEO 异常点

- `blog-post-123` 没有 targets
- `blog-post-123` 只有 en，没有 zh

## 适合第一版 MVP 的问题集

### 优先级 1

1. 某个红外类目下，产品数量最多的是哪些？
2. 红外测温仪、红外高温计、红外附件里，哪些产品没有图片？
3. 某个产品是否同时有 zh / en 两个版本？
4. 某个类目下有哪些产品样例，适合前端做“更多产品”展示？
5. 某个页面的 SEO key 是否完整、双语是否齐全？

### 不建议第一版优先做

- 价格分布和价格对比

原因：

- 价格只有 2 行有效数据，样本太少，不适合作为首个分析主轴。

## 当前完成情况

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 数据源识别 | 已完成 | 已确认当前仓库是 PostgreSQL 的 products / seo 双库 |
| 产品库地图 | 已完成 | 类目、产品、无图清单、样例产品已整理 |
| SEO 地图 | 已完成 | key、record、targets、双语覆盖已整理 |
| MVP 问题集 | 已完成 | 已筛出适合第一版 Text-to-SQL / RAG 的问题 |
| MySQL 访问确认 | 未完成 | 当前仓库未发现 MySQL，若另有服务器需单独接入 |
| 第一版实现 | 未开始 | 还没开始写 Text-to-SQL / RAG 接口 |

