import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Descriptions, Drawer, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { getAgentRun, listAgentRuns, type AgentRun, type AgentSummary } from '@/services/management/agent';
import EmbeddingDetails, { EmbeddingStatus, embeddingDegraded } from './EmbeddingDetails';

const statuses = {
  running: { text: '运行中', status: 'Processing' },
  completed: { text: '已完成', status: 'Success' },
  failed: { text: '失败', status: 'Error' },
  cancelled: { text: '取消', status: 'Default' },
  timeout: { text: '超时', status: 'Warning' },
};

const phases: Record<string, string> = { database_connect: '数据库连接', session_claim: '会话与预算', model_select: '模型理解需求', search: '搜索工具', catalog_read: '公开产品查询', news_read: '新闻读取', vector_index: '向量索引检查', vector_rank: '向量相似度计算', embedding: '向量请求', model_explain: '模型流式说明', refresh: '结果公开状态复核', audit: '执行记录保存', idle: '阶段已结束' };

function failurePhase(record: AgentRun) {
  if (record.metrics.failedPhase) return phases[record.metrics.failedPhase] || record.metrics.failedPhase;
  if (record.status === 'timeout' && record.metrics.modelCalls === 1 && record.metrics.toolCalls === 0) return '模型理解需求（旧记录推断）';
  return '—';
}

export default function AgentRuns() {
  const [summary, setSummary] = useState<AgentSummary>();
  const [detail, setDetail] = useState<AgentRun>();
  const [error, setError] = useState('');
  const [hasRunning, setHasRunning] = useState(false);
  useEffect(() => {
    if (detail?.status !== 'running') return;
    const timer = window.setInterval(() => { getAgentRun(detail.id).then((response) => setDetail(response.data)).catch(() => setError('运行详情刷新失败。')); }, 3000);
    return () => window.clearInterval(timer);
  }, [detail?.id, detail?.status]);
  const columns: ProColumns<AgentRun>[] = [
    { title: '开始时间', dataIndex: 'created_at', valueType: 'dateTime', search: false, width: 180 },
    { title: '状态', dataIndex: 'status', valueEnum: statuses, width: 100 },
    { title: '当前 / 异常阶段', search: false, renderText: (_, record) => record.status === 'running' ? phases[record.metrics.currentPhase || ''] || record.metrics.currentPhase || '启动中' : failurePhase(record) },
    { title: '降级', search: false, render: (_, record) => <Space size={0} wrap>
      {(record.metrics.selectionFallback || record.metrics.explanationFallback) && <Tag color="orange">聊天模型降级</Tag>}
      {embeddingDegraded(record.metrics.embedding) && <Tag color="orange">向量降级</Tag>}
      {!record.metrics.selectionFallback && !record.metrics.explanationFallback && !embeddingDegraded(record.metrics.embedding) && '—'}
    </Space> },
    { title: '脱敏需求', dataIndex: 'query_preview', search: false, ellipsis: true },
    { title: '检索模式', search: false, render: (_, record) => <Tag>{record.metrics.retrieval || '—'}</Tag> },
    { title: 'Embedding 结果', search: false, render: (_, record) => <EmbeddingStatus embedding={record.metrics.embedding} /> },
    { title: '向量耗时 / Token', search: false, renderText: (_, record) => `${record.metrics.embedding?.durationMs ?? '—'} ms / ${record.metrics.embedding?.totalTokens ?? '未返回'}` },
    { title: '耗时 / 首段', search: false, renderText: (_, record) => `${record.metrics.durationMs ?? '—'} / ${record.metrics.firstTextMs ?? '—'} ms` },
    { title: '产品 / 新闻', search: false, renderText: (_, record) => `${record.metrics.productCount ?? 0} / ${record.metrics.newsCount ?? 0}` },
    { title: 'Token', search: false, renderText: (_, record) => record.metrics.totalTokens ?? '未返回' },
    { title: '错误码', dataIndex: 'error_code', search: false },
    { title: '执行详情', valueType: 'option', render: (_, record) => <Button type="link" onClick={async () => {
      try { setError(''); setDetail((await getAgentRun(record.id)).data); }
      catch { setError('无法加载运行详情，请确认登录状态后重试。'); }
    }}>查看</Button> },
  ];
  return <PageContainer title="Agent 运行记录" subTitle="只读埋点：工具调用、检索结果、耗时、用量与错误；保留 30 天">
    <Alert type="info" showIcon message="查询内容为脱敏摘要，不展示凭据、原始 IP、模型思维链或完整向量。Token 包含聊天与 embedding 已知用量，不代表计费金额；向量分数不代表适用性确认。" style={{ marginBottom: 20 }} />
    {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
    <Space size="large" wrap style={{ marginBottom: 24 }}>
      <Statistic title="近 30 天（当前筛选）" value={summary?.total ?? 0} />
      <Statistic title="失败 / 超时" value={summary?.failures ?? 0} />
      <Statistic title="平均耗时" value={summary?.average_ms ?? 0} suffix="ms" />
      <Statistic title="已知 Token" value={summary?.tokens ?? 0} />
      <Statistic title="用量未知的运行" value={summary?.unknown_usage ?? 0} />
      <Statistic title="混合检索运行" value={summary?.hybrid_runs ?? 0} />
      <Statistic title="向量降级运行" value={summary?.embedding_degraded ?? 0} />
      <Statistic title="已知 Embedding Token" value={summary?.embedding_tokens ?? 0} />
    </Space>
    <ProTable<AgentRun> rowKey="id" columns={columns} pagination={{ defaultPageSize: 20 }} scroll={{ x: 1850 }} polling={hasRunning ? 5000 : undefined}
      request={async (params) => {
        try {
          const response = await listAgentRuns({ page: params.current || 1, pageSize: params.pageSize || 20, status: params.status });
          setHasRunning(response.data.rows.some((row) => row.status === 'running' && Date.now() - new Date(row.created_at).getTime() < 120000));
          setSummary(response.data.summary); setError('');
          return { data: response.data.rows, total: response.data.summary.total, success: response.ok };
        } catch { setError('运行记录加载失败，请确认登录和数据库迁移。'); return { data: [], total: 0, success: false }; }
      }} />
    <Drawer title="Agent 执行详情" width={760} open={Boolean(detail)} onClose={() => setDetail(undefined)}>
      {detail && <>
        <Descriptions column={1} bordered items={[
          { key: 'id', label: 'Run ID', children: detail.id },
          { key: 'request', label: 'Request ID', children: detail.request_id || detail.metrics.requestId || '—' },
          { key: 'session', label: 'Session ID', children: detail.session_id },
          { key: 'model', label: '聊天模型', children: detail.model },
          { key: 'query', label: '脱敏需求', children: detail.query_preview },
          { key: 'status', label: '状态', children: detail.status },
          { key: 'error', label: '错误码', children: detail.error_code || '—' },
          { key: 'phase', label: '异常阶段', children: failurePhase(detail) },
          { key: 'stream', label: '下发事件 / 字节', children: `${detail.metrics.streamEvents ?? '—'} / ${detail.metrics.streamBytes ?? '—'}` },
        ]} />
        <Typography.Title level={5}>Embedding 检索结果</Typography.Title>
        <EmbeddingDetails embedding={detail.metrics.embedding} />
        <Typography.Title level={5}>分阶段执行时间线</Typography.Title>
        {!detail.metrics.phases?.length && <Alert type="warning" message="旧记录未采集分阶段详情；阶段推断仅根据调用次数，不代表已知具体网络原因。" />}
        <Table size="small" pagination={false} scroll={{ x: 1050 }} rowKey={(_, index) => String(index)} dataSource={detail.metrics.phases || []} columns={[
          { title: '阶段', dataIndex: 'phase', render: (value: string) => phases[value] || value },
          { title: '状态', dataIndex: 'status' },
          { title: '开始偏移', dataIndex: 'offsetMs' },
          { title: '耗时 ms', dataIndex: 'durationMs' },
          { title: '上限 ms', dataIndex: 'timeoutMs' },
          { title: '响应头 / 首包 ms', render: (_, row) => `${row.headersMs ?? '—'} / ${row.firstChunkMs ?? '—'}` },
          { title: 'HTTP', dataIndex: 'httpStatus' },
          { title: '分块数', dataIndex: 'chunks' },
          { title: '错误', render: (_, row) => row.code || row.networkCode || '—' },
        ]} />
        <Typography.Title level={5}>工具轨迹与用量</Typography.Title>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(detail.metrics, null, 2)}</pre>
        <Typography.Title level={5}>返回内容 ID / 类型</Typography.Title>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(detail.result, null, 2)}</pre>
      </>}
    </Drawer>
  </PageContainer>;
}
