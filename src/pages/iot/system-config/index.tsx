import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useMutation } from '@tanstack/react-query';
import { useAccess } from '@umijs/max';
import {
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import type {
  SystemConfigCreatePayload,
  SystemConfigRecord,
  SystemConfigStatus,
  SystemConfigUpdatePayload,
  SystemConfigValueType,
} from '@/services/iot/systemConfig';
import {
  createSystemConfig,
  deleteSystemConfig,
  getSystemConfig,
  pageSystemConfigs,
  updateSystemConfig,
} from '@/services/iot/systemConfig';
import { downloadCsv } from '@/utils/exportCsv';

type ConfigFormValues = {
  configKey: string;
  configValue?: string;
  valueType: SystemConfigValueType;
  name: string;
  description?: string;
  status?: SystemConfigStatus;
};

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
  valueType?: SystemConfigValueType;
  status?: number | string;
};

type SaveVariables =
  | { mode: 'create'; values: ConfigFormValues }
  | { mode: 'update'; id: number; values: ConfigFormValues };

const VALUE_TYPE_LABELS: Record<SystemConfigValueType, string> = {
  string: '字符串',
  int: '整数',
  long: '长整数',
  bool: '布尔值',
  json: 'JSON',
};

const VALUE_TYPE_COLORS: Record<SystemConfigValueType, string> = {
  string: 'blue',
  int: 'cyan',
  long: 'geekblue',
  bool: 'purple',
  json: 'gold',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const value = error as {
      info?: { message?: string };
      response?: { data?: { message?: string } };
    };
    return value.info?.message || value.response?.data?.message || fallback;
  }
  return fallback;
};

const SystemConfigManagement: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const access = useAccess();
  const [form] = Form.useForm<ConfigFormValues>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfigRecord | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<SystemConfigRecord | null>(null);
  const [detailConfigId, setDetailConfigId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [currentRows, setCurrentRows] = useState<SystemConfigRecord[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<SystemConfigRecord[]>([]);

  const reloadConfigs = () => actionRef.current?.reload();

  const exportRows = (rows: SystemConfigRecord[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `系统配置-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: 'ID', value: (row) => row.id },
        { title: '配置键', value: (row) => row.configKey },
        { title: '配置名称', value: (row) => row.name },
        { title: '配置值', value: (row) => row.configValue },
        { title: '值类型', value: (row) => VALUE_TYPE_LABELS[row.valueType] },
        { title: '状态', value: (row) => (row.status === 1 ? '启用' : '停用') },
        { title: '说明', value: (row) => row.description },
        { title: '更新时间', value: (row) => row.updatedAt || row.createdAt },
      ],
      rows,
    );
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await deleteSystemConfig(id, { skipErrorHandler: true });
      if (response.code !== 0) {
        throw new Error(response.message || '删除系统配置失败');
      }
    },
    onSuccess: () => {
      message.success('系统配置已删除');
      reloadConfigs();
    },
    onError: (error) =>
      message.error(getErrorMessage(error, '删除系统配置失败')),
  });

  const saveMutation = useMutation<void, Error, SaveVariables>({
    mutationFn: async (variables) => {
      if (variables.mode === 'update') {
        const { id, values } = variables;
        const body: SystemConfigUpdatePayload = {
          configValue: values.configValue ?? '',
          valueType: values.valueType,
          name: values.name.trim(),
          description: values.description ?? '',
          status: values.status,
        };
        const response = await updateSystemConfig(id, body, {
          skipErrorHandler: true,
        });
        if (response.code !== 0) {
          throw new Error(response.message || '更新系统配置失败');
        }
        return;
      }

      const { values } = variables;
      const body: SystemConfigCreatePayload = {
        configKey: values.configKey.trim(),
        configValue: values.configValue ?? '',
        valueType: values.valueType,
        name: values.name.trim(),
        description: values.description ?? '',
      };
      const response = await createSystemConfig(body, {
        skipErrorHandler: true,
      });
      if (response.code !== 0) {
        throw new Error(response.message || '创建系统配置失败');
      }
    },
    onSuccess: (_data, variables) => {
      message.success(
        variables.mode === 'update' ? '系统配置已更新' : '系统配置已创建',
      );
      setModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      reloadConfigs();
    },
    onError: (error) =>
      message.error(getErrorMessage(error, '保存系统配置失败')),
  });

  const loadConfigs = useCallback(async (params: TableRequestParams) => {
    setLoadError(undefined);
    try {
      const selectedStatus =
        params.status === undefined || params.status === ''
          ? undefined
          : (Number(params.status) as SystemConfigStatus);
      const response = await pageSystemConfigs(
        {
          page: params.current,
          size: params.pageSize,
          keyword: params.keyword?.trim() || undefined,
          valueType: params.valueType || undefined,
          status: selectedStatus,
        },
        { skipErrorHandler: true },
      );
      if (response.code !== 0) {
        throw new Error(response.message || '系统配置列表加载失败');
      }
      const rows = response.data?.list || [];
      setCurrentRows(rows);
      return {
        data: rows,
        success: true,
        total: response.data?.total || 0,
      };
    } catch (error) {
      const description = getErrorMessage(error, '系统配置列表加载失败');
      setLoadError(description);
      setCurrentRows([]);
      setSelectedKeys([]);
      setSelectedRows([]);
      return { data: [], success: false, total: 0 };
    }
  }, []);

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({
      configKey: '',
      configValue: '',
      valueType: 'string',
      name: '',
      description: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (record: SystemConfigRecord) => {
    setEditingConfig(record);
    form.resetFields();
    form.setFieldsValue({
      configKey: record.configKey,
      configValue: record.configValue || '',
      valueType: record.valueType || 'string',
      name: record.name,
      description: record.description || '',
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    if (saveMutation.isPending) return;
    setModalVisible(false);
    setEditingConfig(null);
    form.resetFields();
  };

  const loadConfigDetail = async (id: number) => {
    setDetail(null);
    setDetailConfigId(id);
    setDetailError(undefined);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const response = await getSystemConfig(id, { skipErrorHandler: true });
      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || '系统配置详情加载失败');
      }
      setDetail(response.data);
    } catch (error) {
      setDetailError(getErrorMessage(error, '系统配置详情加载失败'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleView = (record: SystemConfigRecord) =>
    loadConfigDetail(record.id);

  const columns: ProColumns<SystemConfigRecord>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false },
    {
      title: '配置键',
      dataIndex: 'configKey',
      width: 250,
      search: false,
      ellipsis: true,
      render: (_, record) => (
        <Typography.Text code copyable>
          {record.configKey}
        </Typography.Text>
      ),
    },
    {
      title: '配置名称',
      dataIndex: 'name',
      width: 180,
      search: false,
      ellipsis: true,
    },
    {
      title: '配置值',
      dataIndex: 'configValue',
      search: false,
      ellipsis: true,
      render: (_, record) => {
        const value = record.configValue || '';
        const preview = value.replace(/\s+/g, ' ');
        return value ? (
          <Typography.Text code title={value}>
            {preview.length > 80 ? `${preview.slice(0, 80)}…` : preview}
          </Typography.Text>
        ) : (
          '-'
        );
      },
    },
    {
      title: '值类型',
      dataIndex: 'valueType',
      width: 120,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(VALUE_TYPE_LABELS).map(([value, text]) => [
          value,
          { text },
        ]),
      ),
      render: (_, record) => (
        <Tag color={VALUE_TYPE_COLORS[record.valueType]}>
          {VALUE_TYPE_LABELS[record.valueType] || record.valueType}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        1: { text: '启用' },
        0: { text: '禁用' },
      },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { allowClear: true, placeholder: '配置键或名称' },
    },
    {
      title: '说明',
      dataIndex: 'description',
      search: false,
      ellipsis: true,
      render: (_, record) => record.description || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      search: false,
      valueType: 'dateTime',
      render: (_, record) => record.updatedAt || record.createdAt || '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 190,
      fixed: 'right',
      render: (_, record) => {
        const rowDeleteLoading =
          deleteMutation.isPending && deleteMutation.variables === record.id;
        return [
          <Button
            key="view"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            详情
          </Button>,
          access.canUpdateSystemConfig ? (
            <Button
              key="edit"
              type="link"
              size="small"
              icon={<EditOutlined />}
              disabled={saveMutation.isPending}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          ) : null,
          access.canDeleteSystemConfig ? (
            <Popconfirm
              key="delete"
              title="确认删除此系统配置？"
              description={`配置键：${record.configKey}`}
              onConfirm={() => deleteMutation.mutate(record.id)}
              okButtonProps={{ danger: true, loading: rowDeleteLoading }}
              okText="删除"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={rowDeleteLoading}
              >
                删除
              </Button>
            </Popconfirm>
          ) : null,
        ];
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<SystemConfigRecord, TableRequestParams>
        headerTitle="系统配置"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={loadConfigs}
        search={{ labelWidth: 'auto', span: 8 }}
        options={{ reload: true, density: true, setting: true }}
        scroll={{ x: 1250 }}
        toolBarRender={() => [
          <Button
            key="export-page"
            icon={<DownloadOutlined />}
            disabled={!currentRows.length}
            onClick={() => exportRows(currentRows, '当前页')}
          >
            导出当前页
          </Button>,
          <Button
            key="export-selected"
            icon={<DownloadOutlined />}
            disabled={!selectedRows.length}
            onClick={() => exportRows(selectedRows, '已选')}
          >
            导出已选（{selectedRows.length}）
          </Button>,
          ...(access.canCreateSystemConfig
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  新建配置
                </Button>,
              ]
            : []),
        ]}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedKeys,
          onChange: (keys, rows) => {
            setSelectedKeys(keys);
            setSelectedRows(rows);
          },
        }}
        locale={{
          emptyText: loadError ? (
            <Empty description={loadError} image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button onClick={reloadConfigs}>重试</Button>
            </Empty>
          ) : (
            <Empty
              description="暂无系统配置"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      <Modal
        title={editingConfig ? '编辑系统配置' : '新建系统配置'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={handleModalCancel}
        confirmLoading={saveMutation.isPending}
        cancelButtonProps={{ disabled: saveMutation.isPending }}
        closable={!saveMutation.isPending}
        mask={{ closable: !saveMutation.isPending }}
        width="min(640px, calc(100vw - 32px))"
        forceRender
        destroyOnHidden
      >
        <Form<ConfigFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingConfig) {
              saveMutation.mutate({
                mode: 'update',
                id: editingConfig.id,
                values,
              });
              return;
            }
            saveMutation.mutate({ mode: 'create', values });
          }}
          preserve={false}
        >
          <Form.Item
            label="配置键"
            name="configKey"
            rules={[
              { required: true, whitespace: true, message: '请输入配置键' },
              { max: 128, message: '配置键不能超过 128 个字符' },
            ]}
            extra={
              editingConfig
                ? '配置键创建后不可修改。'
                : '建议使用大写字母和点号分隔。'
            }
          >
            <Input
              maxLength={128}
              disabled={!!editingConfig}
              placeholder="例如：MQTT.BROKER.URL"
            />
          </Form.Item>
          <Form.Item
            label="配置名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入配置名称' },
              { max: 128, message: '配置名称不能超过 128 个字符' },
            ]}
          >
            <Input maxLength={128} placeholder="请输入配置名称" />
          </Form.Item>
          <Form.Item
            label="值类型"
            name="valueType"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.entries(VALUE_TYPE_LABELS).map(
                ([value, label]) => ({
                  value,
                  label,
                }),
              )}
            />
          </Form.Item>
          <Form.Item
            label="配置值"
            name="configValue"
            rules={[{ max: 2048, message: '配置值不能超过 2048 个字符' }]}
          >
            <Input.TextArea
              rows={5}
              maxLength={2048}
              showCount
              placeholder="请输入配置值"
            />
          </Form.Item>
          <Form.Item
            label="说明"
            name="description"
            rules={[{ max: 512, message: '说明不能超过 512 个字符' }]}
          >
            <Input.TextArea
              rows={3}
              maxLength={512}
              showCount
              placeholder="请输入配置说明（可选）"
            />
          </Form.Item>
          {editingConfig && (
            <Form.Item label="状态" name="status" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 1, label: '启用' },
                  { value: 0, label: '禁用' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="系统配置详情"
        open={detailVisible}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        onCancel={() => setDetailVisible(false)}
        width="min(760px, calc(100vw - 32px))"
        destroyOnHidden
      >
        {detailLoading ? (
          <Spin />
        ) : detailError ? (
          <Empty description={detailError} image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button
              onClick={() =>
                detailConfigId !== null && void loadConfigDetail(detailConfigId)
              }
            >
              重试
            </Button>
          </Empty>
        ) : detail ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="配置键">
              <Typography.Text code copyable>
                {detail.configKey}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="配置名称">
              {detail.name}
            </Descriptions.Item>
            <Descriptions.Item label="值类型">
              <Tag color={VALUE_TYPE_COLORS[detail.valueType]}>
                {VALUE_TYPE_LABELS[detail.valueType] || detail.valueType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="配置值">
              <Typography.Paragraph
                copyable={!!detail.configValue}
                style={{
                  marginBottom: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {detail.configValue || '-'}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="说明">
              {detail.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={detail.status === 1 ? 'green' : 'default'}>
                {detail.status === 1 ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detail.createdAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {detail.updatedAt || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </PageContainer>
  );
};

export default SystemConfigManagement;
