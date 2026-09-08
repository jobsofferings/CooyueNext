# 页面加载改造与运行策略

本次实现承接 `rendering-performance-assessment.md` 的评估，适用于 Next 14.2.15 / App Router。

## 按页插件

- 根布局只保留字体、Bootstrap 基础样式、图标及站点样式，不再加载旧插件脚本，也不再输出遮住 SSR 正文的全屏 preloader。
- 首页挂载 `PagePlugins(page="home")`：加载 Owl Carousel、视频弹窗、圆形文字和原有表单校验所需的 jQuery 依赖；进入视区的装饰动画、进度条与统计数字改用原生 IntersectionObserver，不再依赖 WOW / jquery.appear。
- 关于页挂载 `PagePlugins(page="about")`：仅加载 Jarallax；减弱动态效果偏好下不加载、不启动视差。
- 产品、搜索、联系等页面不加载以上插件。FAQ 使用原生 details/summary，不需要 jQuery。
- 按依赖顺序加载脚本，同一浏览器文档去重；组件离开时销毁轮播、弹窗、表单校验和观察器。再次进入页面重新初始化，而不是依赖只执行一次的 window.load。加载失败保留静态内容。
- 原 `sinace.js` 文件作为模板资产保留，但不再由应用加载；其中的菜单 DOM 克隆不会执行。

## 导航

`NavigationProvider` 共享服务端准备的公开分类、移动菜单及搜索弹窗状态。桌面、吸顶、手机菜单都由 React 渲染 Next Link，不再复制 outerHTML。

手机菜单支持分类展开、遮罩关闭、Escape、焦点约束与归还、路由跳转后关闭、桌面断点关闭。统一管理 body 滚动锁，避免菜单与搜索弹窗互相覆盖状态。分类不再在 hydration 后额外请求。

## 公开产品的 SSG / ISR

- 中英文产品目录在构建时预生成。
- 产品详情优先预生成成像组件、PV400 和目录排序靠前的 8 个红外产品；去重。其余公开产品第一次访问时生成并缓存，新增产品无需为注册路由重新构建。
- 页面与产品数据使用 300 秒再验证周期；SEO 保留 3600 秒数据缓存。产品 API 访问最多等待 8 秒，SEO 最多等待 5 秒。
- 列表第一批读取后，后续分页每批最多并行 3 个请求；单次服务端渲染通过 React cache 复用相同分类、详情及相关产品读取。
- 只输出当前语言、已发布且分类祖先链也公开的产品；不存在、草稿或隐藏分类产品返回 404。
- 上游超时、5xx、无效响应不会被伪装成“产品不存在”或空目录。构建失败应停止部署；ISR 再生成失败保留上一个成功版本，后续访问再试。无历史缓存的依赖故障显示错误/重试状态。

### 更新可见性边界

当前采用**定时再验证**，未新增管理端主动清缓存接口。产品修改、上下架、删除通常在缓存超过 300 秒后的下一次访问触发后台再生成；触发请求可能仍拿到旧内容，成功后的后续请求得到新版本。无流量时不会定时主动生成，接口故障时旧版本也可能保留更久，不能将 300 秒理解为强制删除的最长期限。

SEO 数据独立缓存一小时，标题等更新可能晚于正文。若将来需要发布后立即更新或强制下架，应额外接入经过认证的 `revalidatePath` / `revalidateTag` 管理端通知，而不是向公众开放缓存失效接口。询盘选品仍由后端按当前公开状态重新验证，不信任旧页面中的产品数据。

构建环境需要能访问已运行的产品 API。Docker 构建用现有 `NEXT_PUBLIC_API_URL`，运行时用容器内部 `SEO_API_URL`，无需新增环境变量或凭据。

## 搜索与 3D 边界

- 搜索页面读取 URL 后立即在服务端调用同一向量/关键词并集检索接口，使用 Suspense 先输出轻量等待界面，再传回可交互结果。
- 首次结果和可重试错误传入 ProductSearch，hydration 不重复首查。后续修改查询、浏览器历史、重复同一查询重试继续使用客户端接口，保留跨查询已选产品。
- 搜索请求使用 no-store；姓名、邮箱、询盘预览与发送不进入公共缓存。原查询 500 字符、手填总内容 1000 字、姓名/邮箱各 100 字符的限制保持不变。
- 3D 场景、Three.js 和 GLB 仍在客户端接近视区时懒加载。SSG 只生成说明、控件和轻量预览，不在构建或服务端执行 WebGL。自动轮播逻辑不变。

## 验证方法

```bash
node --test server/tests/*.test.js
cd next
npm run test:rendering
npm run build
SEO_API_URL=http://127.0.0.1:3001 npm run start -- --port 3100
```

另一个终端运行（Playwright 为可选本地验证工具，不是应用运行依赖）：

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium \
  COOYUE_TEST_URL=http://127.0.0.1:3100 node server/scripts/verify-page-loading.js
```

`COOYUE_TEST_URL` 默认值为本机 3100 端口。`PLAYWRIGHT_MODULE` 未设置时使用本地安装的 `playwright`，`CHROMIUM_PATH` 可省略以使用 Playwright 自带浏览器。

验证脚本检查：中英文产品缓存响应、404、产品冷访问无旧插件与离屏 GLB、插件跨路由初始化和资源去重、手机导航无 Document 重载、搜索 HTML 包含初始结果且浏览器首查为零、历史与同词重试、禁用 JS 的产品正文/首页首张轮播/FAQ。只执行公开读取和搜索，不发询盘或真实邮件。
