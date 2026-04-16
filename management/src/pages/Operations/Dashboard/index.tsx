import {
  ClockCircleOutlined,
  MailOutlined,
  NotificationOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useRequest } from '@umijs/max';
import { Alert, List, Space, Spin, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import { getOverview } from '@/services/management/api';

const { Text } = Typography;

const numberify = (value?: string) => Number(value || 0);

const statusColorMap: Record<string, string> = {
  published: 'green',
  draft: 'gold',
  queued: 'processing',
  failed: 'red',
  sent: 'green',
};

const OperationsDashboard: React.FC = () => {
  const { data, loading, error } = useRequest(getOverview);
  const overview = data?.data;

  return (
    <PageContainer
      title="运营概览"
      subTitle="统一查看 SEO、产品与邮件任务状态"
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message="概览数据加载失败"
          description="请确认 /server 已启动，并且数据库连接正常。"
        />
      ) : null}

      <Spin spinning={loading}>
        <Space direction="vertical" size={16} style={{ display: 'flex' }}>
          <ProCard gutter={16} wrap>
            <ProCard colSpan={{ xs: 24, md: 8 }}>
              <Statistic
                title="产品总量"
                value={numberify(overview?.products.total)}
                prefix={<ShoppingOutlined />}
              />
              <Text type="secondary">
                已发布 {numberify(overview?.products.published)}，草稿 {numberify(overview?.products.draft)}
              </Text>
            </ProCard>
            <ProCard colSpan={{ xs: 24, md: 8 }}>
              <Statistic
                title="SEO 记录"
                value={numberify(overview?.seo.total)}
                prefix={<NotificationOutlined />}
              />
              <Text type="secondary">
                已发布 {numberify(overview?.seo.published)}，草稿 {numberify(overview?.seo.draft)}
              </Text>
            </ProCard>
            <ProCard colSpan={{ xs: 24, md: 8 }}>
              <Statistic
                title="邮件任务"
                value={numberify(overview?.mail.total)}
                prefix={<MailOutlined />}
              />
              <Text type="secondary">
                排队中 {numberify(overview?.mail.queued)}，失败 {numberify(overview?.mail.failed)}
              </Text>
            </ProCard>
          </ProCard>

          <ProCard gutter={16} wrap>
            <ProCard title="最近更新的产品" colSpan={{ xs: 24, lg: 8 }}>
              <List
                dataSource={overview?.recentProducts || []}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.name}</span>
                          <Tag color={statusColorMap[item.visibility]}>{item.visibility}</Tag>
                        </Space>
                      }
                      description={`${item.slug} / ${item.locale}`}
                    />
                    <Text type="secondary">
                      <ClockCircleOutlined /> {new Date(item.updated_at).toLocaleString()}
                    </Text>
                  </List.Item>
                )}
              />
            </ProCard>

            <ProCard title="最近更新的 SEO" colSpan={{ xs: 24, lg: 8 }}>
              <List
                dataSource={overview?.recentSeo || []}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.title || item.seo_key}</span>
                          <Tag color={statusColorMap[item.visibility]}>{item.visibility}</Tag>
                        </Space>
                      }
                      description={`${item.seo_key} / ${item.locale}`}
                    />
                    <Text type="secondary">
                      <ClockCircleOutlined /> {new Date(item.updated_at).toLocaleString()}
                    </Text>
                  </List.Item>
                )}
              />
            </ProCard>

            <ProCard title="最近邮件任务" colSpan={{ xs: 24, lg: 8 }}>
              <List
                dataSource={overview?.recentMail || []}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{item.subject}</span>
                          <Tag color={statusColorMap[item.status]}>{item.status}</Tag>
                        </Space>
                      }
                      description={item.recipient_email}
                    />
                    <Text type="secondary">
                      <ClockCircleOutlined /> {new Date(item.updated_at).toLocaleString()}
                    </Text>
                  </List.Item>
                )}
              />
            </ProCard>
          </ProCard>
        </Space>
      </Spin>
    </PageContainer>
  );
};

export default OperationsDashboard;
