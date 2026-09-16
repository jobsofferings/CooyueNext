import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import { Alert, Button, Descriptions, Drawer, Space, Statistic, Tag, Typography } from 'antd';
import { useState } from 'react';
import { getAgentRun, listAgentRuns, type AgentRun, type AgentSummary } from '@/services/management/agent';

const statuses = {
  running: { text: '运行中', status: 'Processing' },
  completed: { text: '已完成', status: 'Success' },
  failed: { text: '失败', status: 'Error' },
  cancelled: { text: '取消', status: 'Default' },
  timeout: { text: '超时', status: 'Warning' },
};

export default function AgentRuns() {
  const [summary, setSummary] = useState<AgentSummary>();
  const [detail, setDetail] = useState<AgentRun>();
  const [error, setError] = useState('');
  const columns: ProColumns<AgentRun>[] = [
    { title: '开始时间', dataIndex: 'created_at', valueType: 'dateTime', search: false, width: 180 },
    { title: '状态', dataIndex: 'status', valueEnum: statuses, width: 100 },
    { title: '脱敏需求', dataIndex: 'query_preview', search: false, ellipsis: true },
    { title: '检索模式', search: false, render: (_, record) => <Tag>{record.metrics.retrieval || '—'}</Tag> },
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
    <Alert type="info" showIcon message="查询内容为脱敏摘要，不展示凭据、原始 IP 或模型思维链。Token 仅统计供应商返回的已知用量，不代表计费金额。" style={{ marginBottom: 20 }} />
    {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
    <Space size="large" wrap style={{ marginBottom: 24 }}>
      <Statistic title="近 30 天（当前筛选）" value={summary?.total ?? 0} />
      <Statistic title="失败 / 超时" value={summary?.failures ?? 0} />
      <Statistic title="平均耗时" value={summary?.average_ms ?? 0} suffix="ms" />
      <Statistic title="已知 Token" value={summary?.tokens ?? 0} />
      <Statistic title="用量未知的运行" value={summary?.unknown_usage ?? 0} />
    </Space>
    <ProTable<AgentRun> rowKey="id" columns={columns} pagination={{ defaultPageSize: 20 }} scroll={{ x: 1200 }}
      request={async (params) => {
        try {
          const response = await listAgentRuns({ page: params.current || 1, pageSize: params.pageSize || 20, status: params.status });
          setSummary(response.data.summary); setError('');
          return { data: response.data.rows, total: response.data.summary.total, success: response.ok };
        } catch { setError('运行记录加载失败，请确认登录和数据库迁移。'); return { data: [], total: 0, success: false }; }
      }} />
    <Drawer title="Agent 执行详情" width={760} open={Boolean(detail)} onClose={() => setDetail(undefined)}>
      {detail && <>
        <Descriptions column={1} bordered items={[
          { key: 'id', label: 'Run ID', children: detail.id },
          { key: 'session', label: 'Session ID', children: detail.session_id },
          { key: 'model', label: '模型', children: detail.model },
          { key: 'query', label: '脱敏需求', children: detail.query_preview },
          { key: 'status', label: '状态', children: detail.status },
          { key: 'error', label: '错误码', children: detail.error_code || '—' },
        ]} />
        <Typography.Title level={5}>工具轨迹与用量</Typography.Title>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(detail.metrics, null, 2)}</pre>
        <Typography.Title level={5}>返回内容 ID / 类型</Typography.Title>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(detail.result, null, 2)}</pre>
      </>}
    </Drawer>
  </PageContainer>;
}
