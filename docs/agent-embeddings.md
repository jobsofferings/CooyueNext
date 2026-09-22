# Agent 搜索向量

当前 `/search` 使用 Agent 搜索，读取 `agent.search_vectors`，与旧目录搜索的 `knowledge.product_vectors` 和 `KNOWLEDGE_*` 配置独立。向量存储为 PostgreSQL JSONB 数组，不需要 pgvector 迁移；召回先执行发布状态和审核事实硬过滤，再融合关键词和语义候选。索引检查只返回内容标识、哈希、维度和有效性，相似度在数据库计算，不把完整向量加载到应用或日志。embedding 服务不可用时保留关键词搜索。

查询时只传输索引元信息，在 PostgreSQL 中对有效候选计算余弦相似度并返回分数，避免每次把整库 2048 维数组传回 Node 导致网络和数据库读超时。这是小规模目录的精确扫描，不是 ANN 索引；后台时间线分别记录索引检查、查询向量请求和相似度计算。

## 独立豆包接口

聊天继续使用 `AGENT_BASE_URL`、`AGENT_API_KEY`、`AGENT_CHAT_MODEL`。在不提交 Git 的 `server/.env` 中配置：

```dotenv
AGENT_EMBEDDING_PROVIDER=ark
AGENT_EMBEDDING_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
AGENT_EMBEDDING_API_KEY=填入方舟API密钥
AGENT_EMBEDDING_MODEL=doubao-embedding-vision-251215
AGENT_EMBEDDING_DIMENSIONS=2048
AGENT_MIN_SIMILARITY=0.35
```

这里需要的是 Bearer API Key，不是 Access Key / Secret Key 签名对。密钥只保存在服务端，权限建议为 `600`，不得放进 Next 公共变量、提交记录或日志。独立 embedding 地址必须使用 HTTPS，禁止重定向，不会将聊天密钥自动转发到独立服务。

适配器调用 `/embeddings/multimodal`，每个请求只携带一篇资料的纯文本，读取 `data.embedding`。该接口的 `input` 不能作为多个独立文档的批量数组使用；索引使用最多四个并发请求，结果按原输入顺序回填，失败时取消同批其余请求，不写入不完整批次。

文档使用语料模板 `Instruction:Compress the text into one word.\nQuery:`；查询使用 `Target_modality: text.` 开头的业务指令，要求检索与需求相关的产品描述、规格或新闻。不能使用空指令，也不能把语料压缩指令直接作为查询指令。两侧模板遵循供应商《多模态向量化》的非对称文本检索规则。当前只索引文本，不上传产品图片、客户联系人或询盘。向量版本包含 embedding 服务、地址、模型、维度和指令策略版本（`text-search-v2`）；轮换密钥或修改独立的聊天模型不触发向量重建。

`AGENT_MIN_SIMILARITY=0.35` 是原有起始阈值，不代表已针对豆包完成相关性标注评测；上线后应分别使用中英文查询检验召回率、首屏相关性和延迟，再调整阈值。

## 兼容原 OpenAI embedding

`AGENT_EMBEDDING_PROVIDER=openai` 且独立地址、密钥均为空时，沿用原聊天连接的 `/embeddings` 和旧 `v1` 向量版本。也可以同时设置独立的 `AGENT_EMBEDDING_BASE_URL` 和 `AGENT_EMBEDDING_API_KEY`，使用另一个 OpenAI 兼容 embedding 服务。独立地址必须显式配置其自己的密钥。

## 索引与验收

确保 PostgreSQL 已存在 `agent.search_vectors`，且 `AGENT_NEWS_ORIGIN` 指向可访问的 Next 服务。本机默认 `http://127.0.0.1:3000`；Compose 后端使用 `http://next-app:3000`。

```bash
cd server
npm run test:agent
npm run agent:index
npm run agent:index -- --apply
npm run agent:index
```

不带 `--apply` 只检查当前目录与索引 hash、维度和有效性，不调用付费 embedding、不写数据库。缺失、过期、维度错误或无效向量都会列入待重建，即使内容 hash 未改变。带 `--apply` 会调用供应商并只修改 `agent.search_vectors`，按语言、每批 16 篇更新。初次索引包含中英文公开产品和新闻，需接受模型用量。完成后的 dry-run 应显示两个语言 `pending: 0`。

每种语言成功回填后会清理该语言的旧版本和已撤回内容；需要回滚到旧 embedding 模型时必须重新建索引。部分批次失败可重跑，已完成且 hash 匹配的内容不会重复生成。发布、修改或撤回产品/新闻后应重新运行维护命令，访客请求不负责更新索引。

```sql
SELECT locale, model_version, jsonb_array_length(embedding) AS dimensions,
       count(*) AS total, max(updated_at) AS last_updated
FROM agent.search_vectors
GROUP BY locale, model_version, jsonb_array_length(embedding)
ORDER BY locale, model_version;
```

修改工作区配置不会自动更新已运行的 Docker 容器。需要重新构建并重建后端容器以加载适配代码和环境；本次后台结果展示还需要重新构建管理端容器。仅 embedding 接入不要求重建 Next 官网，也不需要给浏览器配置凭据。确认运行环境与索引版本一致，再验证真实查询的 `retrieval.mode=hybrid`、向量匹配数及无过期索引原因。`hybrid` 本身不保证每个查询都有向量命中，还需检查 `vectorMatches`。

供应商 HTTP 错误、错误维度、空向量、非数值向量和查询超时都应降级为关键词结果，且型号、气体、分辨率、下架和语言隔离仍由原规则处理。清空 `AGENT_EMBEDDING_MODEL` 并重新加载运行环境可关闭语义召回，不需删除索引。

## 后台日志与展示

管理端 `/operations/agent` 的列表展示 embedding 状态、向量耗时、Token 和独立的向量降级标记；顶部统计混合检索运行数、向量降级运行数及已知 embedding 用量。详情展示供应商、模型、维度、语言、阈值、调用次数、索引覆盖及缺失/过期/无效候选数，最多展示 20 个向量命中的内容 ID、余弦分数、关键词是否同时命中及检索阶段是否返回。最终结果仍以公开状态复核后的 ID 为准。

这些字段保存为 `agent.runs.metrics.embedding`，同时关联 `result.retrieval.embedding`，沿用原有管理员认证和 30 天保留策略。覆盖率是本次读取时、当前语言公开内容的快照，不是另一个实时全库监控接口。未启用、无候选、索引缺失、服务失败和成功但零命中分别记录；旧记录显示“未采集”，不推断其覆盖率。后台不保存请求密钥、完整向量或供应商原始错误消息；访客结果仍移除内部检索诊断字段。
