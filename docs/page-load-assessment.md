# 页面首开性能与服务端渲染评估

评估日期：2026-09-08。基于现有 Next.js 14.2.15 生产服务、本机浏览器实验及仓库代码。此次发布只修改成像组件的 3D 轮播，不顺带重构渲染、导航或全局资源加载。

## 结论

网站已经有服务端渲染，不需要从零“迁移到 SSR”。产品页是异步 Server Component，产品正文和 SEO 在服务端取数、生成初始 HTML；交互组件再在浏览器 hydration。站内桌面 Link 导航通常请求 RSC 数据并复用页面外层，并不等于完全由浏览器渲染正文。

目前不是完整的静态化 / ISR 网站：生产 `.next/prerender-manifest.json` 仅记录 `/favicon.ico`，产品页响应头为 `private, no-cache, no-store`。产品数据有 300 秒 Data Cache，SEO 数据有 3600 秒 Data Cache，但“数据缓存”不等同于“整个路由 HTML 已预生成并可由 CDN 缓存”。

代码依据：

- `next/src/app/[lang]/products/[id]/page.tsx`：`generateMetadata` 和默认异步服务端页面。
- `next/src/lib/products-api.ts`：服务端产品请求、300 秒缓存以及串行分页。
- `next/src/lib/seo-api.ts`：3600 秒缓存。
- `next/src/components/knowledge/ProductSearch.tsx`：搜索结果目前在 hydration 后由 `useEffect` 获取，属于可以进一步改善的客户端数据瀑布。

## 实测证据

本机直接请求现有热服务：About HTML 首字节约 18–21 ms，产品目录约 51–68 ms，成像组件详情约 35–41 ms。目录响应正文约 205 KB，组件详情约 63 KB。这里只说明本机热服务表现，不能代表外网用户、首次启动或缓存过期时的延迟。

另用新建 Chromium 浏览器上下文模拟首次访问，配置 4 Mbps 下载、80 ms 网络延迟和 4 倍 CPU 降速，然后在同一上下文重复访问：

| 页面 | 浏览器缓存 | HTML 首字节 | 加载遮罩消失 | 资源条目 | 下载量 |
| --- | --- | --- | --- | --- | --- |
| `/zh/about` | 冷缓存 | 50 ms | 5.24 s | 98 | 3.73 MB |
| `/zh/about` | 热缓存 | 33 ms | 2.92 s | 98 | 约 36 KB |
| 成像组件详情 | 冷缓存 | 89 ms | 3.99 s | 83 | 1.55 MB |
| 成像组件详情 | 热缓存 | 49 ms | 1.80 s | 83 | 约 36 KB |

About 冷访的慢资源集中在大幅背景图片，包括 expectation、testimonial、page-header 和 footer。合成测试和生产运行在同一台主机，以上是诊断样本，不是用户设备实测或 p95 承诺。详情页测的是首屏，没有滚动触发 3D 模型加载。

还验证了同站跳转：桌面导航产生 0 个新 Document 请求；从复制生成的手机菜单点击产品入口产生 1 个新 Document 请求，即整页刷新。这里只用请求类型判定导航方式，没有把 DOM 到达时间误当作页面可交互时间。

## 主要问题

### 1. 全局遮罩把已经渲染的内容挡住

根布局始终输出 `.preloader`。`ScriptInitializer` 在 hydration 后先等 500 ms，再等待 jQuery 可用；隐藏遮罩前再等 500 ms，并执行 500 ms 淡出。模板脚本还有另一个 `window.load` 隐藏逻辑。正文已经在 HTML 中，用户仍可能只看到遮罩。

依据：`next/src/app/layout.tsx`、`next/src/components/layout/ScriptInitializer.tsx`、`next/public/assets/js/sinace.js`。

### 2. 所有页面都加载完整模板资源

根布局配置 25 个全局脚本、23 个样式表，包含多个轮播库、日期时间控件、jQuery UI、图形插件等。About 之类的普通内容页也承担这些请求、解析和初始化成本。还有来自 Google Fonts 的外部字体请求；这是国内访问的潜在可用性风险，但本次实验的主要慢资源是图片，不能仅凭域名将字体认定为唯一瓶颈。

依据：`next/src/app/layout.tsx`、`next/public/assets/vendors/fonts/googleapis.css`。

### 3. 手机菜单复制 DOM，丢失 Next Link 导航能力

`MobileNav` 的菜单容器由 `ScriptInitializer` 使用 `outerHTML` / `innerHTML` 填充。复制后的普通链接没有原 React Link 的事件绑定和预取能力，实际测试会重新请求整份 Document。

依据：`next/src/components/layout/MobileNav.tsx`、`next/src/components/layout/ScriptInitializer.tsx`。

### 4. 缺少路由级 loading / streaming 边界

当前 `app` 下没有 `loading.tsx`。动态页面未准备好时，没有合适的局部骨架反馈；Next 的导航和预取也不能充分利用 loading 边界。SSR 本身不保证响应立即可见，尤其在串行取数或缓存未命中时。

### 5. 后端取数仍有可改进项

产品目录按每页 100 条串行获取；独立的目录、分类、SEO 和相关产品请求可以在确认依赖后并行。产品和 SEO fetch 没有显式超时。需要注意：同一个 GET 在 metadata 和页面中出现两次，并不能直接证明发送了两次网络请求，Next / React 有渲染请求去重机制，应通过日志或追踪确认。

## 建议实施顺序、难度与工期

以下是基于当前代码的开发加回归测试估算，不是固定交付承诺；多个条目可合并处理。

| 优先级 | 方案 | 难度 | 估算 |
| --- | --- | --- | --- |
| P0 | 移除全页强制遮罩和固定等待；为产品、搜索等路由增加局部 `loading.tsx`，让已有 SSR 正文立即可见 | 低 | 0.5 天 |
| P0 | 手机菜单改为 React 渲染的共享导航数据 + Next Link，保留展开、关闭和语言切换行为 | 低–中 | 0.5–1 天 |
| P1 | 将模板 JS / CSS 按实际页面需求加载，清理重复插件初始化；压缩首屏背景图、为非首屏图片设置延迟加载 | 中 | 1–2 天 |
| P1 | 审查取数依赖、并行化、添加请求超时；导航分类服务端提供初始数据，避免浏览器首次再补取 | 低–中 | 0.5–1 天 |
| P2 | 对公开产品和分类实现 `generateStaticParams` / 按需 ISR；按产品发布行为设计 revalidateTag / 路径失效及必要的部署后预热 | 中 | 1–2 天 |
| P2 | 搜索页首批结果由服务端启动请求并通过 Suspense 逐步返回，客户端仅接管选择、比较和询盘交互 | 中 | 0.5–1 天 |

优先做 P0 和资源减负，第一轮约 2–4 个工作日可形成有对照数据的版本。不建议先花时间“整站重新改 SSR”，因为已有 SSR，并且把所有交互搬到服务端既不现实，也不能消除资源下载、遮罩和整页刷新造成的延迟。

缓存边界必须明确：公开目录和公开 SEO 可以缓存；姓名、邮箱、询盘正文、确认凭据及邮件提交不能进入公开缓存。3D WebGL 交互必须在浏览器运行，服务端提供标题、参数和占位图，模型仅在接近视区时加载，保留当前延迟加载边界。

## 下一轮验收方式

1. 同一网络和 CPU 条件对比冷访、热访及首次站内跳转，至少覆盖 About、目录、详情、搜索和手机菜单。
2. 分别记录 TTFB、首屏可见时间、LCP、INP、下载量和路由 Document 请求数量，不仅检查构建成功或服务器响应。
3. 检查关闭 JS 时正文可见、慢 API 时骨架可见、手机导航不整页重载、产品发布后缓存能更新。
4. 在真实国内移动网络和低端手机上复核，再决定是否需要 CDN、额外资源预热或服务器扩容。

## 框架文档

- Next.js 14 Server Components：`https://nextjs.org/docs/14/app/building-your-application/rendering/server-components`
- Next.js 14 Linking and Navigating：`https://nextjs.org/docs/14/app/building-your-application/routing/linking-and-navigating`
- Next.js 14 Caching：`https://nextjs.org/docs/14/app/building-your-application/caching`
- Next.js 14 Loading UI and Streaming：`https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming`
