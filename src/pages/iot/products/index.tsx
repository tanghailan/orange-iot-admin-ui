import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccess } from '@umijs/max';
import {
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
} from 'antd';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  pageProducts,
  updateProduct,
} from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';

type ProductRow = {
  id: number;
  name: string;
  productKey: string;
  description?: string;
  status: number;
  protocolVersion?: number;
  allowUpgrade?: number;
  allowReboot?: number;
  allowPullLog?: number;
  commands?: API.ProductCommandResponse[];
  properties?: API.ProductPropertyResponse[];
  createdAt?: string;
};

type CommandFormValue = {
  commandName: string;
  cmd: number;
  timeoutSeconds: number;
  ackMode: 'none' | 'ack' | 'finish';
  enabled?: boolean;
};

type PropertyFormValue = {
  propertyName: string;
  valueType: 'string' | 'int' | 'bool' | 'json';
  accessMode: 'reported' | 'desired';
};

type ProductFormValues = {
  name: string;
  productKey?: string;
  description?: string;
  protocolVersion?: number;
  allowUpgrade?: boolean;
  allowReboot?: boolean;
  allowPullLog?: boolean;
  commands?: CommandFormValue[];
  properties?: PropertyFormValue[];
};

type SaveProductVariables =
  | { mode: 'create'; values: ProductFormValues }
  | { mode: 'update'; id: number; values: ProductFormValues };

type ProductPageData = {
  list?: ProductRow[];
  total?: number;
};

type TableRequestParams = {
  current?: number;
  pageSize?: number;
  keyword?: string;
};

const ProductManagement: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const access = useAccess();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ProductFormValues>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [currentRows, setCurrentRows] = useState<ProductRow[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<ProductRow[]>([]);

  const reloadProducts = () => actionRef.current?.reload();

  const exportRows = (rows: ProductRow[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `产品-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: 'ID', value: (row) => row.id },
        { title: '产品名称', value: (row) => row.name },
        { title: '产品 Key', value: (row) => row.productKey },
        { title: '描述', value: (row) => row.description },
        { title: '状态', value: (row) => (row.status === 1 ? '启用' : '禁用') },
        { title: '协议版本', value: (row) => row.protocolVersion ?? 1 },
        {
          title: '允许升级',
          value: (row) => (row.allowUpgrade === 0 ? '关' : '开'),
        },
        {
          title: '允许重启',
          value: (row) => (row.allowReboot === 0 ? '关' : '开'),
        },
        {
          title: '允许拉日志',
          value: (row) => (row.allowPullLog === 0 ? '关' : '开'),
        },
        { title: '创建时间', value: (row) => row.createdAt },
      ],
      rows,
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      message.success('产品已删除');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      reloadProducts();
    },
    onError: (error) => message.error(error.message || '删除产品失败'),
  });

  const saveMutation = useMutation<void, Error, SaveProductVariables>({
    mutationFn: async (variables) => {
      if (variables.mode === 'update') {
        const body: API.ProductUpdateRequest = {
          name: variables.values.name.trim(),
          description: variables.values.description?.trim() || undefined,
          protocolVersion: variables.values.protocolVersion,
          allowUpgrade: variables.values.allowUpgrade ? 1 : 0,
          allowReboot: variables.values.allowReboot ? 1 : 0,
          allowPullLog: variables.values.allowPullLog ? 1 : 0,
          commands: (variables.values.commands || []).map((command) => ({
            commandName: command.commandName.trim(),
            cmd: command.cmd,
            timeoutSeconds: command.timeoutSeconds,
            ackMode: command.ackMode,
            enabled: command.enabled ? 1 : 0,
          })),
          properties: (variables.values.properties || []).map((property) => ({
            propertyName: property.propertyName.trim(),
            valueType: property.valueType,
            accessMode: property.accessMode,
          })),
        };
        const response = await updateProduct(variables.id, body);
        if (response.code !== 0) {
          throw new Error(response.message || '更新产品失败');
        }
        return;
      }

      const body = {
        name: variables.values.name.trim(),
        productKey: variables.values.productKey?.trim(),
        description: variables.values.description?.trim() || undefined,
      };
      const response = await createProduct(body as API.ProductCreateRequest);
      if (response.code !== 0) {
        throw new Error(response.message || '创建产品失败');
      }
    },
    onSuccess: (_data, variables) => {
      message.success(
        variables.mode === 'update' ? '产品已更新' : '产品已创建',
      );
      setIsModalVisible(false);
      setEditingProduct(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      reloadProducts();
    },
    onError: (error) => message.error(error.message || '保存产品失败'),
  });

  const columns: ProColumns<ProductRow>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      width: 200,
      search: false,
      ellipsis: true,
    },
    {
      title: '产品 Key',
      dataIndex: 'productKey',
      width: 200,
      search: false,
      ellipsis: true,
    },
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { allowClear: true, placeholder: '产品名称或 Key' },
    },
    {
      title: '描述',
      dataIndex: 'description',
      search: false,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      search: false,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '协议版本',
      dataIndex: 'protocolVersion',
      width: 100,
      search: false,
      render: (_, record) => record.protocolVersion ?? 1,
    },
    {
      title: '升级',
      dataIndex: 'allowUpgrade',
      width: 80,
      search: false,
      render: (_, record) => (record.allowUpgrade === 0 ? '关' : '开'),
    },
    {
      title: '重启',
      dataIndex: 'allowReboot',
      width: 80,
      search: false,
      render: (_, record) => (record.allowReboot === 0 ? '关' : '开'),
    },
    {
      title: '拉日志',
      dataIndex: 'allowPullLog',
      width: 90,
      search: false,
      render: (_, record) => (record.allowPullLog === 0 ? '关' : '开'),
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
      width: 180,
      className: 'iot-action-cell',
      fixed: 'right',
      render: (_, record) => {
        const rowDeleteLoading =
          deleteMutation.isPending && deleteMutation.variables === record.id;
        return [
          access.canUpdateProduct ? (
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
          access.canDeleteProduct ? (
            <Popconfirm
              key="delete"
              title="确认删除此产品？"
              description="产品下存在设备时，后端会拒绝删除。"
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

  function handleCreate() {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({ name: '', productKey: '', description: '' });
    setIsModalVisible(true);
  }

  function handleEdit(record: ProductRow) {
    form.resetFields();
    setEditingProduct(record);
    setIsModalVisible(true);
  }

  useLayoutEffect(() => {
    if (!isModalVisible || !editingProduct) {
      return;
    }
    form.setFieldsValue({
      name: editingProduct.name,
      description: editingProduct.description || '',
      protocolVersion: editingProduct.protocolVersion ?? 1,
      allowUpgrade: editingProduct.allowUpgrade !== 0,
      allowReboot: editingProduct.allowReboot !== 0,
      allowPullLog: editingProduct.allowPullLog !== 0,
      commands: (editingProduct.commands || []).map((command) => ({
        commandName: command.commandName,
        cmd: command.cmd,
        timeoutSeconds: command.timeoutSeconds,
        ackMode: command.ackMode,
        enabled: command.enabled !== 0,
      })),
      properties: (editingProduct.properties || []).map((property) => ({
        propertyName: property.propertyName,
        valueType: property.valueType,
        accessMode: property.accessMode,
      })),
    });
  }, [editingProduct, form, isModalVisible]);

  function handleModalCancel() {
    if (saveMutation.isPending) return;
    setIsModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
  }

  function handleSubmit(values: ProductFormValues) {
    if (editingProduct) {
      saveMutation.mutate({
        mode: 'update',
        id: editingProduct.id,
        values,
      });
      return;
    }
    saveMutation.mutate({ mode: 'create', values });
  }

  const loadProducts = useCallback(async (params: TableRequestParams) => {
    setLoadError(undefined);
    try {
      const query = {
        page: params.current,
        size: params.pageSize,
        keyword: params.keyword || undefined,
      };
      const response = await pageProducts(query as unknown as API.PageRequest);
      if (response.code !== 0) {
        throw new Error(response.message || '产品列表加载失败');
      }
      const page = response.data as unknown as ProductPageData | undefined;
      const rows = page?.list || [];
      setCurrentRows(rows);
      return {
        data: rows,
        success: true,
        total: page?.total || 0,
      };
    } catch (error) {
      const description =
        error instanceof Error ? error.message : '产品列表加载失败';
      setLoadError(description);
      setCurrentRows([]);
      setSelectedKeys([]);
      setSelectedRows([]);
      return { data: [], success: false, total: 0 };
    }
  }, []);

  return (
    <PageContainer>
      <ProTable<ProductRow, TableRequestParams>
        headerTitle="产品管理"
        actionRef={actionRef}
        rowKey="id"
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
          ...(access.canCreateProduct
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  新建产品
                </Button>,
              ]
            : []),
        ]}
        request={loadProducts}
        columns={columns}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedKeys,
          onChange: (keys, rows) => {
            setSelectedKeys(keys);
            setSelectedRows(rows);
          },
        }}
        scroll={{ x: 1480 }}
        locale={{
          emptyText: loadError ? (
            <Empty description={loadError} image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button onClick={reloadProducts}>重试</Button>
            </Empty>
          ) : (
            <Empty
              description="暂无产品"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />

      <Modal
        title={editingProduct ? '编辑产品' : '新建产品'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={handleModalCancel}
        confirmLoading={saveMutation.isPending}
        cancelButtonProps={{ disabled: saveMutation.isPending }}
        closable={!saveMutation.isPending}
        mask={{ closable: !saveMutation.isPending }}
        width={
          editingProduct
            ? 'min(980px, calc(100vw - 32px))'
            : 'min(600px, calc(100vw - 32px))'
        }
        forceRender
        destroyOnHidden
      >
        <Form<ProductFormValues>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          preserve={false}
        >
          <Form.Item
            label="产品名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入产品名称' },
            ]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          {editingProduct ? (
            <Form.Item label="产品 Key">
              <Input value={editingProduct.productKey} disabled />
            </Form.Item>
          ) : (
            <Form.Item
              label="产品 Key"
              name="productKey"
              rules={[
                { required: true, whitespace: true, message: '请输入产品 Key' },
              ]}
            >
              <Input placeholder="请输入产品唯一标识 Key" />
            </Form.Item>
          )}
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={4} placeholder="请输入产品描述（可选）" />
          </Form.Item>
          {editingProduct ? (
            <>
              <Form.Item
                label="协议版本"
                name="protocolVersion"
                rules={[{ required: true, message: '请输入协议版本' }]}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
              <Space size="large" wrap>
                <Form.Item
                  label="允许升级"
                  name="allowUpgrade"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="允许重启"
                  name="allowReboot"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="允许拉日志"
                  name="allowPullLog"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Space>
              <Form.Item label="业务命令" required={false}>
                <Form.List name="commands">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Space
                          key={field.key}
                          align="start"
                          wrap
                          style={{ display: 'flex', marginBottom: 8 }}
                        >
                          <Form.Item
                            name={[field.name, 'commandName']}
                            rules={[
                              {
                                required: true,
                                whitespace: true,
                                message: '请输入命令名字',
                              },
                            ]}
                          >
                            <Input
                              placeholder="命令名字"
                              style={{ width: 140 }}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'cmd']}
                            rules={[
                              { required: true, message: '请输入命令号' },
                            ]}
                          >
                            <InputNumber
                              min={16}
                              max={255}
                              precision={0}
                              placeholder="cmd ≥ 16"
                              style={{ width: 120 }}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'timeoutSeconds']}
                            rules={[{ required: true, message: '请输入超时' }]}
                          >
                            <InputNumber
                              min={1}
                              precision={0}
                              placeholder="超时秒"
                              style={{ width: 110 }}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'ackMode']}
                            rules={[{ required: true, message: '请选择回执' }]}
                          >
                            <Select
                              placeholder="回执"
                              style={{ width: 110 }}
                              options={[
                                { value: 'none', label: 'none' },
                                { value: 'ack', label: 'ack' },
                                { value: 'finish', label: 'finish' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'enabled']}
                            valuePropName="checked"
                          >
                            <Switch
                              checkedChildren="启用"
                              unCheckedChildren="停用"
                            />
                          </Form.Item>
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        </Space>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() =>
                          add({
                            cmd: 16,
                            timeoutSeconds: 30,
                            ackMode: 'ack',
                            enabled: true,
                          })
                        }
                        icon={<PlusOutlined />}
                      >
                        添加命令
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
              <Form.Item label="属性">
                <Form.List name="properties">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Space
                          key={field.key}
                          align="start"
                          wrap
                          style={{ display: 'flex', marginBottom: 8 }}
                        >
                          <Form.Item
                            name={[field.name, 'propertyName']}
                            rules={[
                              {
                                required: true,
                                whitespace: true,
                                message: '请输入属性名字',
                              },
                            ]}
                          >
                            <Input
                              placeholder="属性名字"
                              style={{ width: 160 }}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'valueType']}
                            rules={[
                              { required: true, message: '请选择值类型' },
                            ]}
                          >
                            <Select
                              placeholder="值类型"
                              style={{ width: 120 }}
                              options={[
                                { value: 'string', label: 'string' },
                                { value: 'int', label: 'int' },
                                { value: 'bool', label: 'bool' },
                                { value: 'json', label: 'json' },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'accessMode']}
                            rules={[
                              { required: true, message: '请选择访问方式' },
                            ]}
                          >
                            <Select
                              placeholder="访问方式"
                              style={{ width: 130 }}
                              options={[
                                { value: 'reported', label: 'reported' },
                                { value: 'desired', label: 'desired' },
                              ]}
                            />
                          </Form.Item>
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        </Space>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() =>
                          add({ valueType: 'string', accessMode: 'reported' })
                        }
                        icon={<PlusOutlined />}
                      >
                        添加属性
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>
            </>
          ) : null}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ProductManagement;
