import { Alert, Descriptions, Table, Tag, Typography } from 'antd';
import React from 'react';
import type { AgentEmbedding } from '@/services/management/agent';

const states = {
  pending: { text: '尚未执行', color: 'default' },
  running: { text: '向量生成中', color: 'processing' },
  disabled: { text: '未启用', color: 'default' },
  skipped: { text: '未调用', color: 'warning' },
  completed: { text: '调用成功', color: 'success' },
  failed: { text: '调用失败', color: 'error' },
  timeout: { text: '请求超时', color: 'error' },
  cancelled: { text: '已取消', color: 'default' },
};

const reasons: Record<string, string> = {
  embedding_not_configured: '未配置 embedding 模型，仅使用关键词检索',
  no_eligible_content: '硬条件过滤后没有候选，未调用 embedding',
  index_missing_or_stale: '当前模型没有可用索引，仅使用关键词检索',
  partial_or_stale_index: '候选索引不完整或已过期，部分内容仅参与关键词检索',
  embedding_unavailable: '向量服务不可用，已回退关键词检索',
  index_unavailable: '索引读取或相似度计算失败，已回退关键词检索',
  no_vector_matches: '向量请求成功，但没有候选达到相似度阈值',
  request_cancelled: '整体请求已取消或超时',
};

export function embeddingDegraded(embedding?: AgentEmbedding) {
  return ['embedding_unavailable', 'index_unavailable', 'index_missing_or_stale', 'partial_or_stale_index'].includes(embedding?.reason || '');
}

export function EmbeddingStatus({ embedding }: { embedding?: AgentEmbedding }) {
  if (!embedding) return <Tag>未采集</Tag>;
  const state = states[embedding.status] || { text: embedding.status, color: 'default' };
  return <Tag color={embeddingDegraded(embedding) ? 'warning' : state.color}>
    {state.text}{embedding.status === 'completed' ? ` · ${embedding.vectorMatches} 命中` : ''}
  </Tag>;
}

function coverage(valid: number | null | undefined, total: number | undefined) {
  return valid == null || total == null ? '未检查' : `${valid} / ${total}`;
}

export default function EmbeddingDetails({ embedding }: { embedding?: AgentEmbedding }) {
  if (!embedding) return <Alert type="info" showIcon message="该历史记录未采集 embedding 明细，不能据此判断当时的索引覆盖。" />;
  const index = embedding.index;
  return <>
    <Descriptions column={2} bordered size="small" items={[
      { key: 'status', label: 'Embedding 状态', children: <EmbeddingStatus embedding={embedding} /> },
      { key: 'provider', label: '供应商', children: embedding.provider },
      { key: 'model', label: '向量模型', span: 2, children: embedding.model || '未配置' },
      { key: 'dimensions', label: '配置维度', children: embedding.dimensions },
      { key: 'locale', label: '语言', children: embedding.locale || '—' },
      { key: 'calls', label: '请求次数', children: embedding.calls },
      { key: 'duration', label: '向量请求耗时', children: embedding.durationMs == null ? '未调用' : `${embedding.durationMs} ms` },
      { key: 'tokens', label: 'Embedding Token', children: embedding.totalTokens ?? '未返回' },
      { key: 'threshold', label: '相似度阈值', children: embedding.minSimilarity },
      { key: 'coverage', label: '本次候选有效索引', children: coverage(index?.valid, index?.eligible) },
      { key: 'catalogCoverage', label: '已加载公开资料有效索引', children: coverage(index?.current, index?.published) },
      { key: 'stored', label: '当前语言/版本索引行数', children: index?.stored ?? '未检查' },
      { key: 'hits', label: '向量命中数', children: embedding.vectorMatches },
      { key: 'invalid', label: '候选缺失 / 过期 / 无效', span: 2, children: index?.valid == null ? '未检查' : `${index.missing} / ${index.stale} / ${index.invalid}` },
      { key: 'reason', label: '跳过 / 降级说明', span: 2, children: embedding.reason ? reasons[embedding.reason] || embedding.reason : '无' },
      ...(embedding.error ? [{ key: 'error', label: '安全错误摘要', span: 2,
        children: [embedding.error.code, embedding.error.phase, embedding.error.httpStatus ? `HTTP ${embedding.error.httpStatus}` : '',
          embedding.error.sqlState ? `SQLSTATE ${embedding.error.sqlState}` : ''].filter(Boolean).join(' · ') }] : []),
    ]} />
    <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
      覆盖率为本次搜索读取时的快照，不是全库实时监控。分数为余弦相似度，不是概率或产品适用性保证；未展示密钥、输入全文或完整向量。
    </Typography.Paragraph>
    <Table<AgentEmbedding['topMatches'][number]> size="small" pagination={false} rowKey="key" scroll={{ x: 650 }}
      locale={{ emptyText: embedding.status === 'completed' ? '无达到阈值的向量命中' : '本次没有向量结果' }}
      dataSource={embedding.topMatches || []} columns={[
        { title: '向量排名', dataIndex: 'rank', width: 85 },
        { title: '内容 ID', dataIndex: 'key', ellipsis: true },
        { title: '类型', dataIndex: 'type', render: (value: string) => value === 'product' ? '产品' : '新闻' },
        { title: '相似度', dataIndex: 'score', render: (value: number) => value.toFixed(4) },
        { title: '关键词也命中', dataIndex: 'keywordMatch', render: (value: boolean) => value ? '是' : '否' },
        { title: '检索阶段入选', dataIndex: 'returned', render: (value: boolean) => value ? '是' : '否' },
      ]} />
    <Typography.Text type="secondary">仅展示向量前 20 名；最终结果还会经过关键词融合、数量限制和公开状态复核。</Typography.Text>
  </>;
}
