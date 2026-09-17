# Cooyue 官网搜索 Agent（P0）

日期：2026-09-16。本文是实现契约；配置完成、测试通过不等于已经部署。

## 目标与边界

- 输入示例：`我要找用于甲烷巡检的手持设备，帮我对比候选`。
- 理解需求、结合最近对话搜索已发布产品及新闻，先流式解释，再返回可信结构化卡片；至多 20 款产品，新闻单独返回。
- 用户自行在现有界面勾选对比、填写询盘。Agent 没有修改产品、SEO、发邮件、询盘、任意 SQL、任意 HTTP、Shell 等工具。
- 单一白名单工具 `search_public_content`；最多一次工具执行、两次模型请求。模型只能提供检索参数，卡片、ID、类型、链接由服务端从公开内容生成。
- 有至少一个有效结果就返回，不为了追问隐藏已有候选。没有匹配产品时明确显示“当前资料没有确认符合条件的产品”。
- 零结果可追问，每个会话累计最多 10 次；达到上限仍允许继续搜索，只是不再主动追问。

## 会话、保留与安全

- 同浏览器匿名随机标识，HttpOnly、SameSite=Lax Cookie；生产环境 Secure；不使用机器硬件信息、浏览器指纹或 IP 作为身份。
- 每个访客每种语言一个会话，固定 30 天有效期；只保留最近 10 个完整问答轮次。10 轮是滚动历史上限，不是禁止继续对话。
- 没有清空/删除历史接口或按钮，不跨设备同步。网站无法阻止用户自行删除浏览器 Cookie；删除后不能恢复原会话。
- 允许写入专用 `agent` schema 的会话、执行记录和离线搜索索引，禁止工具执行业务写入。
- 模型上下文不包含 Cookie、凭据、访客标识、运行日志或内部数据。常见邮箱、电话号码、API key 在持久化和发模型前脱敏，但这不是完整的个人信息识别系统；界面提醒不要输入隐私。
- Cookie 必须签名；会话访问必须检查所有者、语言和过期时间；访客不能读取运行日志。管理端沿用现有管理登录，仅提供只读日志接口。
- Next 代理只转发白名单路径和方法，限制请求大小，验证同源；后端要求服务间密钥。模型的网络访问仅限配置好的 LLM/Embedding 地址，不跟随重定向。
- 检索通过只读事务执行固定参数化查询；新闻只读取固定 Next 内容接口，不接受用户/模型提供的 URL。
- 单会话并发锁、请求幂等键、每访客/服务入口限流、进程并发上限、全局日预算、总超时；断开流式连接时取消外部模型请求。

## Hybrid Search

1. 模型结合最多 10 轮历史提出规范化查询；服务端保留用户明确气体、形态、型号等限制，模型不能静默删除硬条件。
2. Keyword Search 使用现有中英文词汇/同义词特征；Embedding Search 使用 SDK 生成查询向量，与同模型、同内容版本的离线索引比较。
3. 用 reciprocal rank fusion 合并两路候选。稠密向量与关键词向量不混存；不把相似度当作适用性证明。
4. 气体适用性、气体设备形态和分辨率等硬条件由结构化审核资料验证；非气体产品的手持/固定形态可按公开描述的明确且不矛盾表述过滤，但不称为“已审核”。未知气体、未支持的范围/排除条件不能偷换成相关产品。实际执行的硬约束单独存储，防止模型重写查询后在后续轮次丢失。
5. 不需要 pgvector 即可运行小目录版本：离线向量存于专用 JSONB 索引，应用内余弦评分。后续数据量增大再迁移 ANN；不在访客请求中批量向量化产品。
6. 没有配置 embedding、索引缺失/过期或上游失败时明确标记 keyword-only/degraded，不宣称是真正 Hybrid。不使用失效索引返回下架内容。
7. 全部已发布、非样例的产品/分类可检索。专业能力有审核资料才确认；新闻来自与官网新闻页相同的 `productGuides`，不是 SEO 表或虚构新闻库。

## 接口与流

- `POST /api/agent/sessions`：取得/创建当前浏览器指定语言的会话。
- `GET /api/agent/sessions/:id`：本人有效会话的最近 10 轮；重新核对卡片公开状态。
- `POST /api/agent/sessions/:id/messages`：`{ requestId, message }`；响应 SSE。
- `GET /api/agent/admin/runs`：管理登录后分页、筛选运行记录及汇总。
- `GET /api/agent/admin/runs/:id`：管理登录后读取工具执行和用量明细。
- 不提供 PUT/PATCH/DELETE 或通用 API 转发。

SSE 事件：`meta`（runId）、`status`、`message_delta`（纯文本解释）、`results`（结构化最终结果）、`done`、`error`。心跳防止代理空闲断流；前端不能把 EOF 当作成功。

最终结果包含 `status`、`message`、`query`、`products`、`news`、`clarification`、`retrieval`。产品复用 `KnowledgeProduct`，增加 `id/type`；新闻提供 `id/type/title/description/detailPath`。不向访客暴露原始分数、内部思维链或凭据。

## 运行记录（P0）

- requestId/runId、会话关联、时间、状态、延迟、首段输出延迟、模型、调用次数、token 用量（未知为 null）、检索模式、结果数、脱敏错误码。
- 只记录简短脱敏查询和工具事件，不记录模型思维链、密钥、原始 IP、完整供应商错误或 HTTP headers。
- 后台分页列表、状态筛选、用量/错误/耗时汇总、详情抽屉。日志不是客户端随意上报的“成功”，由实际服务执行生成。
- 会话与运行记录 30 天后由运维清理任务物理删除；API 到期即不可读。日预算用于止损，不是美元费用估算。

## 配置与启动前置条件

需要配置（不在聊天中提交密钥）：供应商的 OpenAI-compatible base URL、支持 tool calling 的聊天模型名、embedding 模型名及维度。API key 放在 `server/.env`。当前按用户授权复用本机 Codex 中转配置，已验证模型列表和 Chat Completions 流式工具调用；该中转未列出 embedding 模型，因此暂以明确标记的 keyword-only/degraded 模式提供检索，不宣称已验证 Socheap 独立服务。

SDK 使用 `openai`，支持自定义 baseURL；禁用自动重试，统一 AbortSignal 和预算。代理商必须实际支持 Chat Completions tools/streaming 和 Embeddings；不支持时明确失败，不假装接入成功。

配置示例见 `server/.env.example`；`AGENT_ENABLED=false` 默认关闭。`AGENT_PROXY_SECRET` 在后端与 Next 服务端必须一致，不能使用 `NEXT_PUBLIC_` 前缀。开发时 Next 放入 `.env.local`；Docker Compose 从根 `.env` 注入 Next，后端从 `server/.env` 读取。Cookie 密钥独立设置。

真实环境文件不提交 Git，文件权限设为 600；Next 和后端构建上下文根目录的 `.dockerignore` 排除 `.env*`，防止凭据进入镜像层。外部模型地址默认要求 HTTPS；只有运维显式设置 `AGENT_ALLOWED_HTTP_BASE_URL` 与 `AGENT_BASE_URL` 完整地址一致时，才允许该特定 HTTP 中转（主机、端口、路径均不能替换），仍拒绝重定向和 URL 中的凭据。HTTP 会使后端到中转的 API key 及内容失去传输加密，此例外是用户明确授权的临时配置，应尽快换回 HTTPS。Codex 的 Responses 配置不等于已验证 Chat Completions/Embeddings 兼容性，必须实际联调。

官网浏览器入口继续使用 HTTPS 域名；后端中转使用 HTTP 不要求网站也改成 HTTP。生产匿名 Cookie 保留 Secure，浏览器调用使用安全上下文，不为公网裸 IP 的 HTTP 访问降低 Cookie 安全性或暴露模型密钥。

## 验收

- 正常：甲烷/手持候选不混入仅支持 SF6 的产品；GF77 保留镜头配置提醒；跨轮“只要手持”“换成 SF6”能更新查询。
- 搜索：关键词/向量联合召回、中英文隔离、新闻、20 个产品上限、索引失效/模型失败明确降级、下架回查。
- 会话：10 轮滚动历史、30 天过期、10 次追问上限、不提供删除、不能越权读取、重复 requestId 不重复消费。
- 安全：提示词注入不能新增工具、不能发送询盘/执行 SQL/请求任意 URL，恶意 tool 参数拒绝；跨站请求/超限/并发/断线受控。
- 流式：解释先于卡片，结束/错误事件明确；上游断流不能报告成功；原搜索、手动对比、询盘保持不变。
- 管理：未登录不能看日志，已登录可筛选分页并查看工具轨迹；无密钥、原始 IP 或未脱敏联系信息。
- 实际模型联调和正式数据索引需要用户配置供应商；本地使用 mock SDK/数据库测试不消耗真实模型额度、不发送邮件、不部署。

## 实施与运维命令

1. 服务端使用 Node.js 22+。`cd server && yarn install --frozen-lockfile` 安装 SDK 和测试依赖；迁移 `009_agent.sql` 随原有产品库初始化机制执行，新增独立 `agent` schema，不改业务表。
2. 填入 `AGENT_BASE_URL`（完整的兼容 API 前缀）、`AGENT_API_KEY`、`AGENT_CHAT_MODEL`、`AGENT_EMBEDDING_MODEL`、`AGENT_EMBEDDING_DIMENSIONS`。分别生成至少 32 字符的 cookie/proxy 随机密钥；proxy 密钥配置在 Next 服务端与 Express 两侧。密钥不提交 Git、不发到浏览器。
3. Next 与后端启动、产品库迁移完成后，先 `npm run agent:index` 检查待索引数量；明确接受模型用量后 `npm run agent:index -- --apply`。可在 `AGENT_ENABLED=false` 时离线建索引，随后再开放入口。该维护命令只写 `agent.search_vectors`，不在访客请求里生成目录索引。发布/撤回/修改产品或新闻、切换 embedding 模型后重新运行。
4. 配置完成后设置 `AGENT_ENABLED=true`，访问 `/zh/search` 或 `/en/search`；原普通搜索仍保留。管理后台 `/operations/agent` 需要登录。生产反向代理对 `/api/agent/` 设置 `proxy_buffering off`、读取超时至少 70 秒，保持 Cookie 和 SSE 流；不能把这一前缀直接转发到通用后端 API。
5. 以现有调度方式每小时执行 `cd /root/CooyueNext/server && npm run agent:cleanup -- --apply`；不加 `--apply` 只查看过期计数。会话到期即拒绝读取，物理删除最迟在下次调度完成；运行中断的记录同时收敛为 timeout。
6. `npm run test:agent` 使用 PGlite 内存 PostgreSQL 和 mock 模型，验证真实迁移/查询，不连接现有 PostgreSQL；`npm run test:search`、`npm run test:contact` 验证原流程。Next 的 `npm run test:agent` 验证同源、Cookie 转发、请求大小和 SSE 取消，另运行 `npm run lint`、TypeScript 检查与生产构建。

## 本次本地验证（2026-09-16）

- 新增测试：后端 Agent 34 项、Next 代理 4 项全部通过，包含真实 SQL 的内存 PostgreSQL 测试、SDK mock、权限、限流、超时、断流、混合检索、跨轮约束、受限 HTTP 例外和 Docker 构建凭据隔离。
- 原有回归：搜索/询盘 32 项、联系邮件 17 项、轮播 4 项、Next 数据渲染 7 项全部通过。邮件测试不发送真实邮件。
- Next 与管理后台的生产构建均通过；Next 构建包含类型及 lint 检查，仍有既有图片/CSS 警告。管理后台新增页面和服务的定向 Biome lint 通过。
- 管理后台全量 `npm run tsc` 未通过：报错位于本次未修改的 `Dashboard`、`Mail`、`Products`、`Seo` 页面；新增 Agent 页面和服务没有报告类型错误。本次不修改无关代码。
- 已验证用户指定中转的模型列表及真实流式工具调用；尚未完成独立 Socheap 服务、Embedding 或浏览器端到端验收。代码模板默认关闭，实际环境按用户授权启用特定 HTTP 中转；不进行无法验证的付费向量化。部署时还需验证线上搜索并配置清理任务。

## 线上验收与测试（2026-09-17）

- 已执行 `deploy.sh`，退出码 0；官网、管理后台、后端容器均健康，`AGENT_ENABLED=true`。模型密钥仅存在服务端环境文件，不提交 Git、不暴露给浏览器。
- 公网入口为 `https://www.cooyue.tech/zh/search`，英文为 `https://www.cooyue.tech/en/search`；访问 `http://43.139.70.61/zh/search` 会跳转到官网 HTTPS 域名。不要用裸 IP 的 3000 端口 HTTP 页面测试生产匿名 Cookie。
- 已在真实浏览器完成搜索、产品卡片展示、同浏览器刷新恢复历史、勾选两款产品手动对比，以及后台运行列表和详情验证。未发送询盘邮件或改动产品业务数据。
- 当前为模型理解需求、关键词检索的 `keyword-only/degraded` 模式：中转未提供已验证的 Embedding 模型，因此不是完整 Hybrid Search。网页会显示“关键词检索 · 降级模式”。
- 真实公网测试中，甲烷手持需求返回 GF77、PV400；随后改为 SF6 返回 G306、GF77。两轮均先流式解释再返回卡片，单轮约 13 秒；实际响应时间取决于中转，不是耗时保证。
- 后台记录已确认两次模型请求、一次只读搜索工具调用、结果数量、耗时与供应商返回的 Token 用量；匿名访问后台接口被拒绝。

### 给测试者的步骤

1. 打开中文搜索页，在上方“智能搜索 · 产品与新闻”输入 `我要找用于甲烷巡检的手持设备，帮我对比候选`，点击“智能搜索”，不要使用下方普通搜索框代替。
2. 等待说明逐步出现，再向下查看产品卡片。当前公开资料下应看到 GF77、PV400 候选；相关性不代表已确认实际镜头、工况和适用性。
3. 在同一输入框继续发送 `换成 SF6，仍然要手持设备`，验证多轮条件更新。也可发送 `改成氢气，只查手持产品`，检查缺少依据时不会冒充找到符合条件的产品。
4. 刷新页面，展开“对话历史”，应保留刚才的问答。刷新后如需恢复卡片，点击“在下方展示本轮产品，手动对比 / 询盘”；不提供清空历史按钮。
5. 勾选至少两款产品，点击“对比所选产品”查看参数。询盘属于真实业务操作，测试到填写或预览即可，除非确实要发送邮件，否则不要点击最终确认发送。
6. 登录现有管理后台，进入“运营后台 → Agent 运行记录”（`/operations/agent`），按时间找到本轮记录，点击“查看”，核对状态、调用次数、结果 ID、耗时与 Token。

### 本机运维落点

- 网站 Nginx 已为 `/api/agent/` 配置转发到 Next 的独立 location，关闭缓冲、缓存及该入口 access log，读取超时 75 秒；`/api/agent-content` 也转发到 Next。配置位于 `/www/server/panel/vhost/nginx/cooyue.tech.conf`，修改前备份并通过 `nginx -t` 后 reload。
- `/etc/cron.d/cooyue-agent-cleanup` 每小时第 7 分钟在后端容器运行 `node scripts/agent.js cleanup --apply`，使用独占锁，结果写入系统日志标签 `cooyue-agent-cleanup`。只清理 Agent 的过期数据和超时执行记录；会话到期立即不可读，物理删除在下次任务完成。
- 用户授权的 HTTP 例外只针对后端到指定中转的完整地址，官网 HTTPS 与 Secure Cookie 不变。此中转链路仍是明文，应后续升级为 HTTPS；不能将“网页 HTTPS”误解为中转链路也被加密。

### 已知边界

- 这里不是通用自主 Agent，只允许一次白名单搜索；对比和询盘仍是用户手动操作。
- 新闻仅包含当前官网实际展示的静态采购指南；未来动态新闻发布后，需让同一只读内容源包含其 published 记录。
- 目前没有专业资料的产品也可按公开目录查到，但不能借用其他产品的气体能力或配置来承诺适用性。
- Keyword 检索为项目现有的词汇/同义词特征评分，不宣称使用 BM25。向量索引为空或不完整会明确标记降级；效果阈值需用真实模型和问题集校准。
- 供应商不返回流式 usage 时后台显示未知/不完整，已知 token 不是完整账单；失败调用也可能收费，日运行上限不等于金额保证。
- 当前工程沿用应用连接账号；生产进一步收紧数据库权限时应分离迁移/索引账号和运行账号，只给运行账号公开业务表 SELECT 及 `agent.sessions/runs` 所需权限。工具本身始终在只读事务里检索，不能提交任意 SQL。
- 用户删除浏览器 Cookie、无痕窗口或换浏览器会生成新匿名身份；本实现不能也不尝试恢复硬件身份。
