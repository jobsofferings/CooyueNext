import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  ModalForm,
  PageContainer,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import type { MailTaskRecord } from '@/services/management/api';
import {
  createMailTask,
  deleteMailTask,
  listMailTasks,
  markMailTaskSent,
  queueMailTask,
  updateMailTask,
} from '@/services/management/api';

type MailFormValue = {
  recipient_email: string;
  subject: string;
  template_key?: string;
  body_preview?: string;
  status: 'draft' | 'queued' | 'sent' | 'failed';
  scheduled_at?: string;
  last_error?: string;
  metadataJson?: string;
};

const statusColorMap: Record<string, string> = {
  draft: 'default',
  queued: 'processing',
  sent: 'success',
  failed: 'error',
};

const MailPage: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<MailTaskRecord | undefined>();

  const columns = useMemo<ProColumns<MailTaskRecord>[]>(
    () => [
      {
        title: '收件人',
        dataIndex: 'recipient_email',
      },
      {
        title: '主题',
        dataIndex: 'subject',
        ellipsis: true,
      },
      {
        title: '模板',
        dataIndex: 'template_key',
        search: false,
      },
      {
        title: '状态',
        dataIndex: 'status',
        valueType: 'select',
        valueEnum: {
          draft: { text: '草稿', status: 'Default' },
          queued: { text: '排队中', status: 'Processing' },
          sent: { text: '已发送', status: 'Success' },
          failed: { text: '失败', status: 'Error' },
        },
        render: (_, record) => <Tag color={statusColorMap[record.status]}>{record.status}</Tag>,
      },
      {
        title: '计划时间',
        dataIndex: 'scheduled_at',
        valueType: 'dateTime',
        search: false,
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
          <Button
            key="queue"
            type="link"
            icon={<SendOutlined />}
            disabled={record.status === 'queued'}
            onClick={async () => {
              await queueMailTask(record.id);
              message.success('邮件任务已加入队列');
              actionRef.current?.reload();
            }}
          >
            排队
          </Button>,
          <Button
            key="sent"
            type="link"
            icon={<CheckCircleOutlined />}
            disabled={record.status === 'sent'}
            onClick={async () => {
              await markMailTaskSent(record.id);
              message.success('邮件任务已标记发送');
              actionRef.current?.reload();
            }}
          >
            标记发送
          </Button>,
          <Popconfirm
            key="delete"
            title="删除邮件任务？"
            onConfirm={async () => {
              await deleteMailTask(record.id);
              message.success('邮件任务已删除');
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
      title="邮件任务"
      subTitle="管理内部邮件发送任务、排队状态和异常信息"
    >
      <ProTable<MailTaskRecord>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 88 }}
        request={async (params) => {
          const response = await listMailTasks({
            page: params.current,
            pageSize: params.pageSize,
            status: params.status,
            search: params.subject,
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
            新建邮件任务
          </Button>,
        ]}
      />

      <ModalForm<MailFormValue>
        title={currentRecord ? '编辑邮件任务' : '新建邮件任务'}
        open={modalOpen}
        modalProps={{
          destroyOnClose: true,
          onCancel: () => setModalOpen(false),
        }}
        initialValues={{
          recipient_email: currentRecord?.recipient_email || '',
          subject: currentRecord?.subject || '',
          template_key: currentRecord?.template_key || '',
          body_preview: currentRecord?.body_preview || '',
          status: currentRecord?.status || 'draft',
          scheduled_at: currentRecord?.scheduled_at || '',
          last_error: currentRecord?.last_error || '',
          metadataJson: currentRecord?.metadata
            ? JSON.stringify(currentRecord.metadata, null, 2)
            : '',
        }}
        onFinish={async (values) => {
          const payload = {
            recipient_email: values.recipient_email,
            subject: values.subject,
            template_key: values.template_key || null,
            body_preview: values.body_preview || null,
            status: values.status,
            scheduled_at: values.scheduled_at || null,
            last_error: values.last_error || null,
            metadata: values.metadataJson?.trim() ? JSON.parse(values.metadataJson) : {},
          };

          if (currentRecord) {
            await updateMailTask(currentRecord.id, payload);
            message.success('邮件任务已更新');
          } else {
            await createMailTask(payload);
            message.success('邮件任务已创建');
          }

          setModalOpen(false);
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText
          name="recipient_email"
          label="收件人邮箱"
          rules={[{ required: true, type: 'email' }]}
        />
        <ProFormText name="subject" label="主题" rules={[{ required: true }]} />
        <ProFormText name="template_key" label="模板 Key" />
        <ProFormTextArea name="body_preview" label="正文预览" fieldProps={{ rows: 4 }} />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '草稿', value: 'draft' },
            { label: '排队中', value: 'queued' },
            { label: '已发送', value: 'sent' },
            { label: '失败', value: 'failed' },
          ]}
          rules={[{ required: true }]}
        />
        <ProFormText name="scheduled_at" label="计划时间" extra="ISO 时间字符串，可留空" />
        <ProFormTextArea name="last_error" label="错误信息" fieldProps={{ rows: 2 }} />
        <ProFormTextArea name="metadataJson" label="元数据 JSON" fieldProps={{ rows: 4 }} />
      </ModalForm>
    </PageContainer>
  );
};

export default MailPage;
