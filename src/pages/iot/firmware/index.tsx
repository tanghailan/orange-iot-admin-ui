import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccess } from '@umijs/max';
import type { UploadFile, UploadProps } from 'antd';
import {
  Alert,
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
  Tag,
  Typography,
  Upload,
} from 'antd';
import React, { useRef, useState } from 'react';
import { listProducts } from '@/services/iot';
import {
  createFirmware,
  deleteFirmware,
  type FirmwareCreatePayload,
  type FirmwareRecord,
  type FirmwareStatus,
  type FirmwareUpdatePayload,
  type FirmwareUploadResult,
  getFirmware,
  pageFirmwares,
  updateFirmware,
  uploadFirmware,
} from '@/services/iot/firmware';
import { downloadCsv } from '@/utils/exportCsv';

type FirmwareFormValues = {
  productId?: number;
  version?: string;
  description?: string;
  status?: FirmwareStatus;
};

const STATUS_LABELS: Record<FirmwareStatus, string> = {
  draft: '草稿',
  released: '已发布',
  obsolete: '已废弃',
};

const STATUS_COLORS: Record<FirmwareStatus, string> = {
  draft: 'default',
  released: 'success',
  obsolete: 'warning',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const value = error as {
      message?: string;
      info?: { message?: string };
      response?: { data?: { message?: string } };
    };
    return (
      value.info?.message ||
      value.response?.data?.message ||
      value.message ||
      fallback
    );
  }
  return fallback;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const FirmwareManagement: React.FC = () => {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const access = useAccess();
  const [form] = Form.useForm<FirmwareFormValues>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFirmware, setEditingFirmware] = useState<FirmwareRecord | null>(
    null,
  );
  const [selectedFirmware, setSelectedFirmware] =
    useState<FirmwareRecord | null>(null);
  const [currentRows, setCurrentRows] = useState<FirmwareRecord[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<FirmwareRecord[]>([]);
  const [uploadedFile, setUploadedFile] = useState<FirmwareUploadResult | null>(
    null,
  );
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const isUploading = fileList.some((file) => file.status === 'uploading');

  const productsQuery = useQuery({
    queryKey: ['iot-products'],
    queryFn: async () => {
      const response = await listProducts({ skipErrorHandler: true });
      if (response.code !== 0) {
        throw new Error(response.message || '产品列表加载失败');
      }
      return response.data || [];
    },
  });
  const products = productsQuery.data || [];

  const exportRows = (rows: FirmwareRecord[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `固件版本-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: 'ID', value: (row) => row.id },
        { title: '版本号', value: (row) => row.version },
        { title: '产品名称', value: (row) => row.productName },
        { title: '产品 Key', value: (row) => row.productKey },
        { title: '文件名', value: (row) => row.name },
        { title: '文件大小（字节）', value: (row) => row.sizeBytes },
        { title: 'SHA-256', value: (row) => row.checksum },
        {
          title: '状态',
          value: (row) => STATUS_LABELS[row.status] || row.status,
        },
        { title: '说明', value: (row) => row.description },
        { title: '创建时间', value: (row) => row.createdAt },
        { title: '更新时间', value: (row) => row.updatedAt },
      ],
      rows,
    );
  };

  const firmwareDetailQuery = useQuery({
    queryKey: ['firmware-detail', selectedFirmware?.id],
    queryFn: async () => {
      const firmware = selectedFirmware;
      if (!firmware) throw new Error('未选择固件');
      const response = await getFirmware(firmware.id, {
        skipErrorHandler: true,
      });
      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || '固件详情加载失败');
      }
      return response.data;
    },
    enabled: !!selectedFirmware,
  });

  const resetModal = () => {
    setModalVisible(false);
    setEditingFirmware(null);
    setUploadedFile(null);
    setFileList([]);
    form.resetFields();
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFirmware(id, { skipErrorHandler: true }),
    onSuccess: (response) => {
      if (response.code !== 0) {
        message.error(response.message || '删除固件失败');
        return;
      }
      message.success('固件已删除');
      actionRef.current?.reload();
    },
    onError: (error) => message.error(getErrorMessage(error, '删除固件失败')),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FirmwareFormValues) => {
      if (editingFirmware) {
        const payload: FirmwareUpdatePayload = {
          description: values.description?.trim() || '',
          status: values.status,
        };
        return updateFirmware(editingFirmware.id, payload, {
          skipErrorHandler: true,
        });
      }

      if (!uploadedFile) {
        throw new Error('请先上传固件文件');
      }
      const productId = values.productId;
      const version = values.version?.trim();
      if (productId === undefined || !version) {
        throw new Error('请选择产品并填写版本号');
      }
      const payload: FirmwareCreatePayload = {
        productId,
        version,
        description: values.description?.trim() || '',
        name: uploadedFile.name,
        objectKey: uploadedFile.objectKey,
        sizeBytes: uploadedFile.sizeBytes,
        checksum: uploadedFile.checksum,
      };
      return createFirmware(payload, { skipErrorHandler: true });
    },
    onSuccess: (response) => {
      if (response.code !== 0) {
        message.error(response.message || '保存固件失败');
        return;
      }
      message.success(editingFirmware ? '固件信息已更新' : '固件记录已创建');
      resetModal();
      actionRef.current?.reload();
    },
    onError: (error) => message.error(getErrorMessage(error, '保存固件失败')),
  });

  const handleCreate = () => {
    setEditingFirmware(null);
    setUploadedFile(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({ status: 'draft' });
    setModalVisible(true);
  };

  const handleEdit = (record: FirmwareRecord) => {
    setEditingFirmware(record);
    setUploadedFile(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({
      description: record.description || '',
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleCancel = () => {
    if (isUploading) return;
    if (!editingFirmware && uploadedFile) {
      Modal.confirm({
        title: '固件文件已上传',
        content:
          '关闭后不会创建固件记录，已上传的文件仍会保留在存储中。确定关闭吗？',
        okText: '关闭',
        cancelText: '继续编辑',
        onOk: resetModal,
      });
      return;
    }
    resetModal();
  };

  const uploadProps: UploadProps = {
    name: 'file',
    maxCount: 1,
    fileList,
    showUploadList: { showRemoveIcon: !isUploading },
    beforeUpload: (file) => {
      if (file.size > 50 * 1024 * 1024) {
        message.error('文件大小不能超过 50 MB');
        return Upload.LIST_IGNORE;
      }
      setUploadedFile(null);
      return true;
    },
    customRequest: async ({ file, onProgress, onSuccess, onError }) => {
      try {
        const response = await uploadFirmware(file as File, {
          skipErrorHandler: true,
          onUploadProgress: (event: { loaded: number; total?: number }) => {
            if (event.total) {
              onProgress?.({
                percent: Math.round((event.loaded / event.total) * 100),
              });
            }
          },
        });
        if (response.code !== 0 || !response.data?.objectKey) {
          throw new Error(response.message || '固件上传失败');
        }
        setUploadedFile(response.data);
        onProgress?.({ percent: 100 });
        onSuccess?.(response);
        message.success('固件文件上传成功');
      } catch (error) {
        const uploadError =
          error instanceof Error ? error : new Error('固件上传失败');
        onError?.(uploadError);
        message.error(getErrorMessage(error, '固件上传失败'));
      }
    },
    onChange: ({ file, fileList: nextFileList }) => {
      setFileList(nextFileList.slice(-1));
      if (file.status === 'removed' || file.status === 'error') {
        setUploadedFile(null);
      }
    },
    onRemove: () => {
      setUploadedFile(null);
      return true;
    },
  };

  const columns: ProColumns<FirmwareRecord>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, search: false },
    { title: '版本号', dataIndex: 'version', width: 130, search: false },
    { title: '所属产品', dataIndex: 'productName', width: 160, search: false },
    {
      title: '产品',
      dataIndex: 'productId',
      hideInTable: true,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        products.map((product) => [product.id, { text: product.name }]),
      ),
      fieldProps: {
        allowClear: true,
        placeholder: '全部产品',
        loading: productsQuery.isFetching,
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      valueEnum: {
        draft: { text: STATUS_LABELS.draft },
        released: { text: STATUS_LABELS.released },
        obsolete: { text: STATUS_LABELS.obsolete },
      },
      render: (_, record) => (
        <Tag color={STATUS_COLORS[record.status]}>
          {STATUS_LABELS[record.status] || record.status}
        </Tag>
      ),
    },
    {
      title: '固件文件',
      dataIndex: 'name',
      width: 200,
      search: false,
      ellipsis: true,
    },
    {
      title: '文件大小',
      dataIndex: 'sizeBytes',
      width: 120,
      search: false,
      render: (_, record) => formatFileSize(record.sizeBytes),
    },
    {
      title: '版本/文件名',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索版本号或文件名', allowClear: true },
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 220,
      search: false,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedFirmware(record)}
        >
          详情
        </Button>,
        access.canUpdateFirmware ? (
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        ) : null,
        access.canDeleteFirmware ? (
          <Popconfirm
            key="delete"
            title="删除固件"
            description="删除后会同时移除存储中的固件文件，无法恢复。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer>
      {productsQuery.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="产品列表加载失败"
          description={getErrorMessage(
            productsQuery.error,
            '请检查连接后重试。',
          )}
          action={
            <Button size="small" onClick={() => productsQuery.refetch()}>
              重试
            </Button>
          }
        />
      )}
      <ProTable<FirmwareRecord>
        headerTitle="固件版本"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1320 }}
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
          ...(access.canCreateFirmware
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  上传固件
                </Button>,
              ]
            : []),
        ]}
        request={async (params) => {
          try {
            const response = await pageFirmwares(
              {
                page: params.current,
                size: params.pageSize,
                productId: params.productId,
                status: params.status as FirmwareStatus | undefined,
                keyword: params.keyword,
              },
              { skipErrorHandler: true },
            );
            if (response.code !== 0) {
              message.error(response.message || '固件列表加载失败');
              setCurrentRows([]);
              setSelectedKeys([]);
              setSelectedRows([]);
              return { data: [], success: false, total: 0 };
            }
            const rows = response.data?.list || [];
            setCurrentRows(rows);
            return {
              data: rows,
              success: true,
              total: response.data?.total || 0,
            };
          } catch (error) {
            message.error(getErrorMessage(error, '固件列表加载失败'));
            setCurrentRows([]);
            setSelectedKeys([]);
            setSelectedRows([]);
            return { data: [], success: false, total: 0 };
          }
        }}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedKeys,
          onChange: (keys, rows) => {
            setSelectedKeys(keys);
            setSelectedRows(rows);
          },
        }}
      />

      <Drawer
        title="固件详情"
        open={!!selectedFirmware}
        onClose={() => setSelectedFirmware(null)}
        width="min(560px, calc(100vw - 24px))"
        destroyOnHidden
      >
        {firmwareDetailQuery.isPending ? (
          <Empty
            description="正在加载固件详情"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : firmwareDetailQuery.isError ? (
          <Empty
            description={getErrorMessage(
              firmwareDetailQuery.error,
              '固件详情加载失败',
            )}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={() => firmwareDetailQuery.refetch()}>重试</Button>
          </Empty>
        ) : firmwareDetailQuery.data ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="固件 ID">
              {firmwareDetailQuery.data.id}
            </Descriptions.Item>
            <Descriptions.Item label="所属产品">
              {firmwareDetailQuery.data.productName ||
                firmwareDetailQuery.data.productKey ||
                `产品 #${firmwareDetailQuery.data.productId}`}
            </Descriptions.Item>
            <Descriptions.Item label="版本号">
              {firmwareDetailQuery.data.version}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLORS[firmwareDetailQuery.data.status]}>
                {STATUS_LABELS[firmwareDetailQuery.data.status] ||
                  firmwareDetailQuery.data.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="文件名">
              {firmwareDetailQuery.data.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {formatFileSize(firmwareDetailQuery.data.sizeBytes)}
            </Descriptions.Item>
            <Descriptions.Item label="校验和">
              {firmwareDetailQuery.data.checksum ? (
                <Typography.Text copyable>
                  {firmwareDetailQuery.data.checksum}
                </Typography.Text>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="存储对象">
              {firmwareDetailQuery.data.objectKey ? (
                <Typography.Text copyable>
                  {firmwareDetailQuery.data.objectKey}
                </Typography.Text>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="下载地址">
              {firmwareDetailQuery.data.downloadUrl ? (
                <Typography.Link
                  href={firmwareDetailQuery.data.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  下载固件
                </Typography.Link>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="版本说明">
              {firmwareDetailQuery.data.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {firmwareDetailQuery.data.createdAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {firmwareDetailQuery.data.updatedAt || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>

      <Modal
        title={editingFirmware ? '编辑固件信息' : '上传固件'}
        open={modalVisible}
        width={640}
        style={{ maxWidth: 'calc(100vw - 24px)' }}
        styles={{
          body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' },
        }}
        maskClosable={!isUploading}
        closable={!isUploading}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        okText={editingFirmware ? '保存修改' : '创建固件'}
        cancelText="取消"
        confirmLoading={saveMutation.isPending}
        okButtonProps={{
          disabled:
            isUploading ||
            (!editingFirmware &&
              (!uploadedFile ||
                productsQuery.isLoading ||
                products.length === 0)),
        }}
        cancelButtonProps={{ disabled: isUploading || saveMutation.isPending }}
        destroyOnHidden
      >
        <Form<FirmwareFormValues>
          form={form}
          layout="vertical"
          initialValues={{ status: 'draft' }}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          {editingFirmware ? (
            <>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
                message={`${editingFirmware.productName || `产品 #${editingFirmware.productId}`} · ${editingFirmware.version}`}
                description="产品、版本号和已上传文件不可修改。"
              />
              <Form.Item
                label="发布状态"
                name="status"
                rules={[{ required: true, message: '请选择固件状态' }]}
              >
                <Select
                  options={Object.entries(STATUS_LABELS).map(
                    ([value, label]) => ({
                      value,
                      label,
                    }),
                  )}
                />
              </Form.Item>
              <Form.Item
                label="版本说明"
                name="description"
                rules={[{ max: 512, message: '说明不能超过 512 个字符' }]}
              >
                <Input.TextArea
                  rows={4}
                  showCount
                  maxLength={512}
                  placeholder="填写版本说明"
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                label="所属产品"
                name="productId"
                rules={[{ required: true, message: '请选择产品' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  loading={productsQuery.isLoading}
                  disabled={productsQuery.isError || products.length === 0}
                  placeholder={products.length ? '请选择产品' : '暂无可选产品'}
                  options={products.map((product) => ({
                    label: product.name,
                    value: product.id,
                  }))}
                />
              </Form.Item>
              <Form.Item
                label="版本号"
                name="version"
                rules={[
                  { required: true, whitespace: true, message: '请输入版本号' },
                  { max: 64, message: '版本号不能超过 64 个字符' },
                ]}
              >
                <Input placeholder="例如 1.0.0" maxLength={64} />
              </Form.Item>
              <Form.Item label="固件文件" required>
                <Upload {...uploadProps}>
                  <Button
                    icon={<UploadOutlined />}
                    loading={isUploading}
                    disabled={isUploading}
                  >
                    选择文件并上传
                  </Button>
                </Upload>
                <div style={{ color: 'rgba(0, 0, 0, 0.45)', marginTop: 8 }}>
                  固件包最大 50 MB。文件选定后会立即上传。
                </div>
                {uploadedFile && (
                  <Alert
                    type="success"
                    showIcon
                    style={{ marginTop: 12 }}
                    message={uploadedFile.name}
                    description={`${formatFileSize(uploadedFile.sizeBytes)} · SHA-256 ${uploadedFile.checksum}`}
                  />
                )}
              </Form.Item>
              <Form.Item
                label="版本说明"
                name="description"
                rules={[{ max: 512, message: '说明不能超过 512 个字符' }]}
              >
                <Input.TextArea
                  rows={4}
                  showCount
                  maxLength={512}
                  placeholder="填写版本说明（可选）"
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default FirmwareManagement;
