import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import type { ProductRecord } from '@/services/management/api';
import { createProduct, deleteProduct, listProducts, updateProduct } from '@/services/management/api';

type ProductFormValue = {
  slug: string;
  locale: 'en' | 'zh';
  category_slug?: string;
  name: string;
  short_description?: string;
  description?: string;
  price?: number;
  original_price?: number;
  currency?: string;
  tags?: string;
  images?: string;
  visibility: 'published' | 'draft';
  display_order?: number;
  specificationsJson?: string;
  extraJson?: string;
};

const parseList = (value?: string) =>
  (value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const ProductPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<ProductRecord | undefined>();

  const columns = useMemo<ProColumns<ProductRecord>[]>(
    () => [
      {
        title: '产品',
        dataIndex: 'name',
        ellipsis: true,
      },
      {
        title: 'Slug',
        dataIndex: 'slug',
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
        title: '分类',
        dataIndex: 'category_slug',
        render: (_, record) => record.category_name || record.category_slug || '-',
      },
      {
        title: '价格',
        dataIndex: 'price',
        search: false,
        render: (_, record) => (record.price ? `${record.currency} ${record.price}` : '-'),
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
        title: '标签',
        dataIndex: 'tags',
        search: false,
        render: (_, record) => (
          <Space wrap>
            {(record.tags || []).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ),
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
            title="删除产品？"
            onConfirm={async () => {
              await deleteProduct(record.slug, record.locale);
              message.success('产品已删除');
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
      title="产品管理"
      subTitle="维护产品列表、显示状态、价格与分类信息"
    >
      <ProTable<ProductRecord>
        actionRef={actionRef}
        rowKey={(record) => `${record.slug}-${record.locale}`}
        columns={columns}
        search={{ labelWidth: 88 }}
        request={async (params) => {
          const response = await listProducts({
            page: params.current,
            pageSize: params.pageSize,
            locale: params.locale,
            search: params.name,
            visibility: params.visibility,
            includeHidden: true,
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
            新建产品
          </Button>,
        ]}
      />

      <ModalForm<ProductFormValue>
        title={currentRecord ? '编辑产品' : '新建产品'}
        open={modalOpen}
        width={720}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalOpen(false),
        }}
        initialValues={{
          slug: currentRecord?.slug,
          locale: currentRecord?.locale || 'en',
          category_slug: currentRecord?.category_slug || undefined,
          name: currentRecord?.name || '',
          short_description: currentRecord?.short_description || '',
          description: currentRecord?.description || '',
          price: currentRecord?.price || undefined,
          currency: currentRecord?.currency || 'USD',
          tags: currentRecord?.tags?.join(', ') || '',
          images: currentRecord?.images?.join('\n') || '',
          visibility: currentRecord?.visibility || 'draft',
          display_order: currentRecord?.display_order || 0,
          specificationsJson: currentRecord?.specifications
            ? JSON.stringify(currentRecord.specifications, null, 2)
            : '',
          extraJson: currentRecord?.extra ? JSON.stringify(currentRecord.extra, null, 2) : '',
        }}
        onFinish={async (values) => {
          const payload = {
            locale: values.locale,
            data: {
              category_slug: values.category_slug || null,
              name: values.name,
              short_description: values.short_description || null,
              description: values.description || null,
              price: values.price ?? null,
              original_price: values.original_price ?? null,
              currency: values.currency || 'USD',
              tags: parseList(values.tags),
              images: parseList(values.images),
              visibility: values.visibility,
              display_order: values.display_order || 0,
              specifications: values.specificationsJson?.trim()
                ? JSON.parse(values.specificationsJson)
                : {},
              extra: values.extraJson?.trim() ? JSON.parse(values.extraJson) : {},
            },
          };

          if (currentRecord) {
            await updateProduct(currentRecord.slug, payload);
            message.success('产品已更新');
          } else {
            await createProduct({ slug: values.slug, ...payload });
            message.success('产品已创建');
          }

          setModalOpen(false);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="slug"
          label="Slug"
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
        <ProFormText name="category_slug" label="分类 Slug" />
        <ProFormText name="name" label="名称" rules={[{ required: true }]} />
        <ProFormTextArea name="short_description" label="简述" fieldProps={{ rows: 2 }} />
        <ProFormTextArea name="description" label="详细描述" fieldProps={{ rows: 4 }} />
        <ProFormDigit name="price" label="售价" min={0} fieldProps={{ precision: 2 }} />
        <ProFormText name="currency" label="币种" initialValue="USD" />
        <ProFormText name="tags" label="标签" extra="逗号或换行分隔" />
        <ProFormTextArea name="images" label="图片" fieldProps={{ rows: 3 }} />
        <ProFormSelect
          name="visibility"
          label="状态"
          options={[
            { label: '已发布', value: 'published' },
            { label: '草稿', value: 'draft' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormDigit name="display_order" label="排序" min={0} initialValue={0} />
        <ProFormTextArea
          name="specificationsJson"
          label="规格 JSON"
          fieldProps={{ rows: 4 }}
        />
        <ProFormTextArea name="extraJson" label="扩展 JSON" fieldProps={{ rows: 4 }} />
      </ModalForm>
    </PageContainer>
  );
};

export default ProductPage;
