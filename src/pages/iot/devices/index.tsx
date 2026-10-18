import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  StopOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccess } from '@umijs/max';
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import {
  createDevice,
  deleteDevice,
  disableDevice,
  enableDevice,
  flattenAgentTree,
  getAgentTree,
  getAgentTreeNodes,
  getDevice,
  listProducts,
  pageDevices,
  transferDevice,
  updateDevice,
} from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';

type DeviceRow = {
  deviceId: string;
  productId: number;
  productKey: string;
  name?: string;
  status: number;
  online?: boolean;
  firmwareVersion?: string;
  lastOnlineAt?: string;
  createdAt?: string;
  ownerAgentId?: API.AgentId | null;
  ownerAgentCode?: string;
  ownerAgentName?: string;
};

type ProductOption = {
  id: number;
  name: string;
  productKey: string;
};

type DeviceCredential = {
  deviceId: string;
  name?: string;
  productKey?: string;
  deviceSecret: string;
  mqttPassword: string;
  brokerUrl: string;
  mqttUsername: string;
  mqttClientId: string;
  mqttPublishTopic: string;
  mqttSubscribeTopic: string;
};

type DeviceFormValues = {
  productId?: number;
  name: string;
  firmwareVersion?: string;
};

type SaveDeviceVariables =
  | { mode: 'create'; values: DeviceFormValues }
  | { mode: 'update'; deviceId: string; values: DeviceFormValues };

type PageData<T> = {
  list?: T[];
  total?: number;
};

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  productId?: number | string;
  status?: number | string;
  keyword?: string;
  online?: boolean | string;
};

const DeviceManagement: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const access = useAccess();
  const [form] = Form.useForm<DeviceFormValues>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceRow | null>(null);
  const [credential, setCredential] = useState<DeviceCredential | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceRow | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [currentRows, setCurrentRows] = useState<DeviceRow[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<DeviceRow[]>([]);
  const [transferModalDevice, setTransferModalDevice] =
    useState<DeviceRow | null>(null);
  const [transferForm] = Form.useForm<{
    deviceId: string;
    targetAgentId: string;
    reason?: string;
  }>();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await listProducts();
      if (response.code !== 0) {
        throw new Error(response.message || '产品列表加载失败');
      }
      return (response.data || []) as unknown as ProductOption[];
    },
  });
  const products = productsQuery.data || [];
  const productNames = new Map(
    products.map((product) => [product.id, product.name]),
  );

  const agentTreeQuery = useQuery({
    queryKey: ['agent-tree', 'device-transfer'],
    queryFn: async () => {
      const response = await getAgentTree({ skipErrorHandler: true });
      if (response.code !== 0) {
        throw new Error(response.message || '代理树加载失败');
      }
      return flattenAgentTree(getAgentTreeNodes(response.data));
    },
    enabled: access.canTransferDevice,
  });
  const agentOptions = (agentTreeQuery.data || []).map((agent) => ({
    value: String(agent.id),
    label: `${agent.name || agent.agentName || agent.agentCode || agent.id}（${agent.agentCode || agent.id}）`,
  }));

  const deviceDetailQuery = useQuery({
    queryKey: ['device-detail', selectedDevice?.deviceId],
    queryFn: async () => {
      const device = selectedDevice;
      if (!device) throw new Error('未选择设备');
      const response = await getDevice(device.deviceId, {
        skipErrorHandler: true,
      });
      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || '设备详情加载失败');
      }
      return response.data as unknown as DeviceRow;
    },
    enabled: !!selectedDevice,
  });

  const reloadDevices = () => actionRef.current?.reload();

  const exportRows = (rows: DeviceRow[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `设备-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: '设备 ID', value: (row) => row.deviceId },
        { title: '设备名称', value: (row) => row.name || '未命名设备' },
        { title: '产品 Key', value: (row) => row.productKey },
        { title: '所属代理', value: (row) => row.ownerAgentName || '未分配' },
        { title: '状态', value: (row) => (row.status === 1 ? '启用' : '禁用') },
        { title: '在线状态', value: (row) => (row.online ? '在线' : '离线') },
        { title: '固件版本', value: (row) => row.firmwareVersion },
        { title: '最后在线时间', value: (row) => row.lastOnlineAt },
        { title: '创建时间', value: (row) => row.createdAt },
      ],
      rows,
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (deviceId: string) => deleteDevice(deviceId),
    onSuccess: () => {
      message.success('设备已删除');
      reloadDevices();
    },
    onError: (error) => message.error(error.message || '删除设备失败'),
  });

  const enableMutation = useMutation({
    mutationFn: (deviceId: string) => enableDevice(deviceId),
    onSuccess: () => {
      message.success('设备已启用');
      reloadDevices();
    },
    onError: (error) => message.error(error.message || '启用设备失败'),
  });

  const disableMutation = useMutation({
    mutationFn: (deviceId: string) => disableDevice(deviceId),
    onSuccess: () => {
      message.success('设备已禁用');
      reloadDevices();
    },
    onError: (error) => message.error(error.message || '禁用设备失败'),
  });

  const transferMutation = useMutation<
    void,
    Error,
    { deviceId: string; targetAgentId: string; reason?: string }
  >({
    mutationFn: async ({ deviceId, targetAgentId, reason }) => {
      const response = await transferDevice(deviceId, {
        targetAgentId,
        reason: reason?.trim() || undefined,
      });
      if (response.code !== 0) {
        throw new Error(response.message || '设备转移失败');
      }
    },
    onSuccess: () => {
      message.success('设备归属已转移');
      setTransferModalDevice(null);
      transferForm.resetFields();
      reloadDevices();
    },
    onError: (error) => message.error(error.message || '设备转移失败'),
  });

  const saveMutation = useMutation<
    DeviceCredential | undefined,
    Error,
    SaveDeviceVariables
  >({
    mutationFn: async (variables) => {
      if (variables.mode === 'update') {
        const body = {
          name: variables.values.name.trim(),
          firmwareVersion:
            variables.values.firmwareVersion?.trim() || undefined,
        };
        const response = await updateDevice(
          variables.deviceId,
          body as unknown as API.DeviceUpdateRequest,
        );
        if (response.code !== 0) {
          throw new Error(response.message || '更新设备失败');
        }
        return undefined;
      }

      const productId = variables.values.productId;
      if (productId === undefined) throw new Error('请选择所属产品');
      const body = {
        productId,
        name: variables.values.name.trim(),
        firmwareVersion: variables.values.firmwareVersion?.trim() || undefined,
      };
      const response = await createDevice(
        body as unknown as API.DeviceCreateRequest,
      );
      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || '注册设备失败');
      }
      return response.data as unknown as DeviceCredential;
    },
    onSuccess: (createdCredential, variables) => {
      message.success(
        variables.mode === 'update' ? '设备已更新' : '设备注册成功',
      );
      setIsModalVisible(false);
      setEditingDevice(null);
      form.resetFields();
      reloadDevices();
      if (createdCredential) {
        setCredential(createdCredential);
      }
    },
    onError: (error) => message.error(error.message || '保存设备失败'),
  });

  const getStatus = (record: DeviceRow) => {
    if (record.status === 0) {
      return { color: 'red', text: '已禁用' };
    }
    return record.online
      ? { color: 'green', text: '在线' }
      : { color: 'default', text: '离线' };
  };

  const columns: ProColumns<DeviceRow>[] = [
    {
      title: '设备 ID',
      dataIndex: 'deviceId',
      width: 210,
      search: false,
      ellipsis: true,
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      width: 160,
      search: false,
      render: (_, record) => record.name || '未命名设备',
    },
    {
      title: '所属产品',
      dataIndex: 'productId',
      width: 160,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        products.map((product) => [product.id, { text: product.name }]),
      ),
      fieldProps: {
        showSearch: true,
        optionFilterProp: 'label',
        placeholder: '全部产品',
        loading: productsQuery.isFetching,
      },
      render: (_, record) =>
        productNames.get(record.productId) || record.productKey || '-',
    },
    {
      title: '所属代理',
      dataIndex: 'ownerAgentName',
      width: 180,
      search: false,
      render: (_, record) => record.ownerAgentName || '—',
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
      render: (_, record) => {
        const status = getStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '在线状态',
      dataIndex: 'online',
      hideInTable: true,
      valueType: 'select',
      valueEnum: {
        true: { text: '在线' },
        false: { text: '离线' },
      },
      fieldProps: { allowClear: true, placeholder: '全部在线状态' },
    },
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { allowClear: true, placeholder: '设备 ID 或名称' },
    },
    {
      title: '固件版本',
      dataIndex: 'firmwareVersion',
      width: 140,
      search: false,
      render: (_, record) => record.firmwareVersion || '-',
    },
    {
      title: '最后在线时间',
      dataIndex: 'lastOnlineAt',
      width: 180,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 360,
      fixed: 'right',
      render: (_, record) => {
        const rowDeleteLoading =
          deleteMutation.isPending &&
          deleteMutation.variables === record.deviceId;
        const rowEnableLoading =
          enableMutation.isPending &&
          enableMutation.variables === record.deviceId;
        const rowDisableLoading =
          disableMutation.isPending &&
          disableMutation.variables === record.deviceId;
        return [
          <Button
            key="detail"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setSelectedDevice(record)}
          >
            详情
          </Button>,
          access.canUpdateDevice ? (
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
          access.canUpdateDevice ? (
            record.status === 0 ? (
              <Popconfirm
                key="enable"
                title="确认启用此设备？"
                onConfirm={() => enableMutation.mutate(record.deviceId)}
                okButtonProps={{ loading: rowEnableLoading }}
                okText="启用"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  loading={rowEnableLoading}
                >
                  启用
                </Button>
              </Popconfirm>
            ) : (
              <Popconfirm
                key="disable"
                title="确认禁用此设备？"
                onConfirm={() => disableMutation.mutate(record.deviceId)}
                okButtonProps={{ loading: rowDisableLoading }}
                okText="禁用"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<StopOutlined />}
                  loading={rowDisableLoading}
                >
                  禁用
                </Button>
              </Popconfirm>
            )
          ) : null,
          access.canDeleteDevice ? (
            <Popconfirm
              key="delete"
              title="确认删除此设备？"
              description="删除后设备将无法继续接入。"
              onConfirm={() => deleteMutation.mutate(record.deviceId)}
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
          access.canTransferDevice ? (
            <Button
              key="transfer"
              type="link"
              size="small"
              icon={<SwapOutlined />}
              onClick={() => {
                transferForm.resetFields();
                transferForm.setFieldsValue({ deviceId: record.deviceId });
                setTransferModalDevice(record);
              }}
            >
              转移代理
            </Button>
          ) : null,
        ];
      },
    },
  ];

  function handleCreate() {
    setEditingDevice(null);
    form.resetFields();
    form.setFieldsValue({ name: '', firmwareVersion: '' });
    setIsModalVisible(true);
  }

  function handleEdit(record: DeviceRow) {
    setEditingDevice(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name || '',
      firmwareVersion: record.firmwareVersion || '',
    });
    setIsModalVisible(true);
  }

  function handleModalCancel() {
    if (saveMutation.isPending) return;
    setIsModalVisible(false);
    setEditingDevice(null);
    form.resetFields();
  }

  function handleSubmit(values: DeviceFormValues) {
    if (editingDevice) {
      saveMutation.mutate({
        mode: 'update',
        deviceId: editingDevice.deviceId,
        values,
      });
      return;
    }
    saveMutation.mutate({ mode: 'create', values });
  }

  const loadDevices = useCallback(async (params: TableRequestParams) => {
    setLoadError(undefined);
    try {
      const query = {
        page: params.current,
        size: params.pageSize,
        productId: params.productId ? Number(params.productId) : undefined,
        status:
          params.status === undefined || params.status === ''
            ? undefined
            : Number(params.status),
        keyword: params.keyword || undefined,
        online:
          params.online === undefined || params.online === ''
            ? undefined
            : params.online === true || params.online === 'true',
      };
      const response = await pageDevices(
        query as unknown as API.DevicePageRequest,
      );
      if (response.code !== 0) {
        throw new Error(response.message || '设备列表加载失败');
      }
      const page = response.data as unknown as PageData<DeviceRow> | undefined;
      const rows = page?.list || [];
      setCurrentRows(rows);
      return {
        data: rows,
        success: true,
        total: page?.total || 0,
      };
    } catch (error) {
      const description =
        error instanceof Error ? error.message : '设备列表加载失败';
      setLoadError(description);
      setCurrentRows([]);
      setSelectedKeys([]);
      setSelectedRows([]);
      return { data: [], success: false, total: 0 };
    }
  }, []);

  return (
    <PageContainer>
      <ProTable<DeviceRow, TableRequestParams>
        headerTitle="设备管理"
        actionRef={actionRef}
        rowKey="deviceId"
        search={{ labelWidth: 'auto', span: 8 }}
        options={{ reload: true, density: true, setting: true }}
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
          ...(access.canCreateDevice
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  注册设备
                </Button>,
              ]
            : []),
        ]}
        request={loadDevices}
        columns={columns}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedKeys,
          onChange: (keys, rows) => {
            setSelectedKeys(keys);
            setSelectedRows(rows);
          },
        }}
        scroll={{ x: 1320 }}
        locale={{
          emptyText: loadError ? (
            <Empty description={loadError} image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button onClick={reloadDevices}>重试</Button>
            </Empty>
          ) : (
            <Empty
              description="暂无设备"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      <Drawer
        title="设备详情"
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        size="min(560px, calc(100vw - 24px))"
        destroyOnHidden
      >
        {deviceDetailQuery.isPending ? (
          <Empty
            description="正在加载设备详情"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : deviceDetailQuery.isError ? (
          <Empty
            description={deviceDetailQuery.error.message || '设备详情加载失败'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={() => deviceDetailQuery.refetch()}>重试</Button>
          </Empty>
        ) : deviceDetailQuery.data ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="设备 ID">
              <Typography.Text copyable>
                {deviceDetailQuery.data.deviceId}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="设备名称">
              {deviceDetailQuery.data.name || '未命名设备'}
            </Descriptions.Item>
            <Descriptions.Item label="所属产品">
              {productNames.get(deviceDetailQuery.data.productId) ||
                deviceDetailQuery.data.productKey ||
                '-'}
            </Descriptions.Item>
            <Descriptions.Item label="所属代理">
              {deviceDetailQuery.data.ownerAgentName ||
                deviceDetailQuery.data.ownerAgentCode ||
                '未分配'}
            </Descriptions.Item>
            <Descriptions.Item label="运行状态">
              <Tag color={getStatus(deviceDetailQuery.data).color}>
                {getStatus(deviceDetailQuery.data).text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="固件版本">
              {deviceDetailQuery.data.firmwareVersion || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="最后在线时间">
              {deviceDetailQuery.data.lastOnlineAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {deviceDetailQuery.data.createdAt || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={`设备转移：${transferModalDevice?.deviceId || ''}`}
        open={transferModalDevice !== null}
        onOk={() => transferForm.submit()}
        onCancel={() => {
          if (!transferMutation.isPending) {
            setTransferModalDevice(null);
            transferForm.resetFields();
          }
        }}
        confirmLoading={transferMutation.isPending}
        destroyOnHidden
      >
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={(values) => transferMutation.mutate(values)}
        >
          <Form.Item name="deviceId" label="设备 ID">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="targetAgentId"
            label="目标代理"
            rules={[{ required: true, message: '请选择目标代理' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={agentTreeQuery.isFetching}
              options={agentOptions}
              placeholder="选择设备的新归属代理"
            />
          </Form.Item>
          <Form.Item name="reason" label="转移原因">
            <Input.TextArea
              rows={3}
              maxLength={512}
              placeholder="可选，写入审计记录"
            />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary">
          设备转移不修改凭证、Topic 或 MQTT Client
          ID，旧代理将失去当前数据访问权。
        </Typography.Text>
      </Modal>

      <Modal
        title={editingDevice ? '编辑设备' : '注册设备'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleModalCancel}
        confirmLoading={saveMutation.isPending}
        cancelButtonProps={{ disabled: saveMutation.isPending }}
        closable={!saveMutation.isPending}
        mask={{ closable: !saveMutation.isPending }}
        width="min(600px, calc(100vw - 32px))"
        destroyOnHidden
      >
        <Form<DeviceFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          preserve={false}
        >
          {!editingDevice && (
            <Form.Item
              label="所属产品"
              name="productId"
              rules={[{ required: true, message: '请选择所属产品' }]}
              extra={
                productsQuery.isError ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => productsQuery.refetch()}
                  >
                    产品列表加载失败，点击重试
                  </Button>
                ) : undefined
              }
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="请选择产品"
                loading={productsQuery.isFetching}
                disabled={productsQuery.isError || products.length === 0}
                notFoundContent={
                  productsQuery.isError
                    ? '产品加载失败，请刷新页面重试'
                    : '暂无可用产品'
                }
                options={products.map((product) => ({
                  label: product.name,
                  value: product.id,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item
            label="设备名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入设备名称' },
            ]}
          >
            <Input maxLength={100} placeholder="请输入设备名称" />
          </Form.Item>
          <Form.Item label="固件版本" name="firmwareVersion">
            <Input maxLength={100} placeholder="请输入固件版本（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="设备连接凭证"
        open={!!credential}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setCredential(null)}
          >
            我已保存，关闭
          </Button>,
        ]}
        onCancel={() => setCredential(null)}
        width="min(720px, calc(100vw - 32px))"
        destroyOnHidden
      >
        {credential && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Text type="warning">
              请立即复制并妥善保存。设备密钥和 MQTT
              密码仅在注册时返回，关闭后无法再次查看。
            </Typography.Text>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="设备 ID">
                <Typography.Text copyable>
                  {credential.deviceId}
                </Typography.Text>
              </Descriptions.Item>
              {credential.productKey && (
                <Descriptions.Item label="产品 Key">
                  <Typography.Text copyable>
                    {credential.productKey}
                  </Typography.Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="设备密钥">
                <Typography.Text copyable>
                  {credential.deviceSecret}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="MQTT Broker">
                <Typography.Text copyable>
                  {credential.brokerUrl}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="MQTT 用户名">
                <Typography.Text copyable>
                  {credential.mqttUsername}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="MQTT 密码">
                <Typography.Text copyable>
                  {credential.mqttPassword}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="MQTT Client ID">
                <Typography.Text copyable>
                  {credential.mqttClientId}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="上报 Topic">
                <Typography.Text copyable>
                  {credential.mqttPublishTopic}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="订阅 Topic">
                <Typography.Text copyable>
                  {credential.mqttSubscribeTopic}
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
};

export default DeviceManagement;
