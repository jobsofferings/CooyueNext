import { render, screen } from '@testing-library/react';
import React from 'react';
import type { AgentEmbedding } from '@/services/management/agent';
import EmbeddingDetails, { EmbeddingStatus, embeddingDegraded } from './EmbeddingDetails';

const embedding: AgentEmbedding = {
  enabled: true, provider: 'ark', model: 'doubao-embedding-vision-251215', dimensions: 2048, locale: 'zh',
  minSimilarity: 0.35, status: 'completed', reason: null, calls: 1, durationMs: 180, totalTokens: 12,
  vectorMatches: 1, index: { published: 316, eligible: 2, stored: 316, current: 316, valid: 2, missing: 0, stale: 0, invalid: 0 },
  topMatches: [{ key: 'product:pv400', type: 'product', score: 0.678901, rank: 1, keywordMatch: true, returned: true }],
};

test('embedding details show provider, coverage, usage and bounded result scores', () => {
  const view = render(<EmbeddingDetails embedding={embedding} />);
  for (const text of ['doubao-embedding-vision-251215', '2048', '2 / 2', '316 / 316', '180 ms', '12', 'product:pv400', '0.6789']) {
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  }
  expect(view.container.textContent).toContain('不是概率或产品适用性保证');
  view.unmount();
});

test('legacy metrics are unknown, not falsely disabled or fully indexed', () => {
  const view = render(<EmbeddingDetails />);
  expect(screen.getByText(/该历史记录未采集/)).toBeTruthy();
  expect(screen.queryByText('0 / 0')).toBeNull();
  view.unmount();
});

test('zero vector hits remain a successful call and not a provider failure', () => {
  const view = render(<EmbeddingStatus embedding={{ ...embedding, vectorMatches: 0, reason: 'no_vector_matches' }} />);
  expect(screen.getByText('调用成功 · 0 命中')).toBeTruthy();
  expect(embeddingDegraded({ ...embedding, vectorMatches: 0, reason: 'no_vector_matches' })).toBe(false);
  view.unmount();
});

test('partial index, missing index and failure are marked as embedding degradation', () => {
  for (const reason of ['partial_or_stale_index', 'index_missing_or_stale', 'embedding_unavailable']) {
    expect(embeddingDegraded({ ...embedding, reason })).toBe(true);
  }
  expect(embeddingDegraded(undefined)).toBe(false);
  expect(embeddingDegraded({ ...embedding, status: 'disabled', reason: 'embedding_not_configured' })).toBe(false);
  const view = render(<EmbeddingDetails embedding={{ ...embedding, status: 'failed', reason: 'embedding_unavailable',
    vectorMatches: 0, topMatches: [], error: { code: 'EMBEDDING_UNAVAILABLE', httpStatus: 429 } }} />);
  expect(screen.getByText('向量服务不可用，已回退关键词检索')).toBeTruthy();
  expect(screen.getByText('EMBEDDING_UNAVAILABLE · HTTP 429')).toBeTruthy();
  view.unmount();
});
