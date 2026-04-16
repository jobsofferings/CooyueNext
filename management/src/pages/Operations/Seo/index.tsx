import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import type { SeoRecord } from '@/services/management/api';
import { deleteSeoRecord, listSeoRecords, saveSeoRecord } from '@/services/management/api';

type SeoFormValue = {
  seo_key: string;
  locale: 'en' | 'zh';
  title?: string;
  description?: string;
  keywords?: string;
  targets?: string;
  canonical?: string;
  og_image?: string;
  visibility: 'published' | 'draft';
  no_index?: boolean;
  extraJson?: string;
};

const parseList = (value?: string) =>
  (value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const SeoPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<SeoRecord | undefined>();

  const columns = useMemo<ProColumns<SeoRecord>[]>(
    () => [
      {
        title: 'SEO Key',
        dataIndex: 'seo_key',
        ellipsis: true,
      },
      {
        title: '语言',
        dataIndex: 'locale',
        valueType: 'select',
        valueEnum: {
          en: { text: 'EN' },
          zh: { text: 'ZH' },
        },
      },
      {
        title: '标题',
        dataIndex: 'title',
        ellipsis: true,
      },
      {
        title: '目标路径',
        dataIndex: 'targets',
        search: false,
        render: (_, record) =>
          (record.targets || []).map((target) => (
            <Tag key={target} color="blue">
              {target}
            </Tag>
          )),
      },
      {
        title: '状态',
        dataIndex: 'visibility',
        valueType: 'select',
        valueEnum: {
          published: { text: '已发布', status: 'Success' },
          draft: { text: '草稿', status: 'Default' },
        },
      },
      {
        title: '更新时间',
        dataIndex: 'updated_at',
        valueType: 'dateTime',
        search: false,
      },
      {
        title: '操作',
        valueType: 'option',
        render: (_, record) => [
          <Button
            key="edit"
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setCurrentRecord(record);
              setModalOpen(true);
            }}
          >
            编辑
          </Button>,
          <Popconfirm
            key="delete"
            title="删除 SEO 记录？"
            onConfirm={async () => {
              await deleteSeoRecord(record.seo_key, record.locale);
              message.success('SEO 记录已删除');
              actionRef.current?.reload();
            }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>,
        ],
      },
    ],
    [message],
  );

  return (
    <PageContainer
      title="SEO 管理"
      subTitle="维护页面标题、描述、路径映射与发布状态"
    >
      <ProTable<SeoRecord>
        actionRef={actionRef}
        rowKey={(record) => `${record.seo_key}-${record.locale}`}
        columns={columns}
        search={{ labelWidth: 88 }}
        request={async (params) => {
          const response = await listSeoRecords({
            page: params.current,
            pageSize: params.pageSize,
            locale: params.locale,
            visibility: params.visibility,
          });

          return {
            data: response.data || [],
            total: response.total || 0,
            success: response.ok,
          };
        }}
        toolBarRender={() => [
          <Button
            key="new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCurrentRecord(undefined);
              setModalOpen(true);
            }}
          >
            新建 SEO
          </Button>,
        ]}
      />

      <ModalForm<SeoFormValue>
        title={currentRecord ? '编辑 SEO' : '新建 SEO'}
        open={modalOpen}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalOpen(false),
        }}
        initialValues={{
          seo_key: currentRecord?.seo_key,
          locale: currentRecord?.locale || 'en',
          title: currentRecord?.title || '',
          description: currentRecord?.description || '',
          keywords: currentRecord?.keywords?.join(', ') || '',
          targets: currentRecord?.targets?.join('\n') || '',
          canonical: currentRecord?.canonical || '',
          og_image: currentRecord?.og_image || '',
          visibility: currentRecord?.visibility || 'draft',
          no_index: currentRecord?.no_index || false,
        }}
        onFinish={async (values) => {
          let extra: Record<string, unknown> = {};
          if (values.extraJson?.trim()) {
            extra = JSON.parse(values.extraJson);
          }

          await saveSeoRecord(values.seo_key, {
            locale: values.locale,
            title: values.title || null,
            description: values.description || null,
            keywords: parseList(values.keywords),
            targets: parseList(values.targets),
            canonical: values.canonical || null,
            og_image: values.og_image || null,
            visibility: values.visibility,
            no_index: values.no_index,
            extra,
          });

          message.success(currentRecord ? 'SEO 已更新' : 'SEO 已创建');
          setModalOpen(false);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="seo_key"
          label="SEO Key"
          rules={[{ required: true }]}
          disabled={Boolean(currentRecord)}
        />
        <ProFormSelect
          name="locale"
          label="语言"
          options={[
            { label: 'English', value: 'en' },
            { label: '中文', value: 'zh' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormText name="title" label="标题" rules={[{ required: true }]} />
        <ProFormTextArea name="description" label="描述" fieldProps={{ rows: 3 }} />
        <ProFormTextArea
          name="targets"
          label="目标路径"
          fieldProps={{ rows: 4 }}
          extra="每行一个路径，例如 /about"
        />
        <ProFormText name="keywords" label="关键词" extra="逗号或换行分隔" />
        <ProFormText name="canonical" label="Canonical" />
        <ProFormText name="og_image" label="OG 图片" />
        <ProFormSelect
          name="visibility"
          label="状态"
          options={[
            { label: '已发布', value: 'published' },
            { label: '草稿', value: 'draft' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormSwitch name="no_index" label="禁止索引" />
        <ProFormTextArea
          name="extraJson"
          label="扩展 JSON"
          fieldProps={{ rows: 4 }}
          extra='可选，例如 {"channel":"campaign"}'
        />
      </ModalForm>
    </PageContainer>
  );
};

export default SeoPage;
