import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  Button,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAdminPermission,
  getAdminPermissions,
  saveAdminPermission,
} from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';

const typeLabel: Record<API.AdminPermissionResponse['permissionType'], string> =
  {
    MENU: '菜单',
    ACTION: '操作',
    API: '接口',
  };

const AdminPermissionsPage = () => {
  const access = useAccess();
  const [permissions, setPermissions] = useState<API.AdminPermissionResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<API.AdminPermissionResponse>();
  const [keyword, setKeyword] = useState('');
  const [module, setModule] = useState<string>();
  const [permissionType, setPermissionType] =
    useState<API.AdminPermissionResponse['permissionType']>();
  const [status, setStatus] = useState<number>();
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<
    API.AdminPermissionResponse[]
  >([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setPermissions(await getAdminPermissions());
      setSelectedKeys([]);
      setSelectedRows([]);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '权限清单加载失败',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredPermissions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return permissions.filter((permission) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [
          permission.permissionName,
          permission.permissionCode,
          permission.description,
        ].some((value) => value?.toLowerCase().includes(normalizedKeyword));
      const matchesModule = !module || permission.module === module;
      const matchesType =
        !permissionType || permission.permissionType === permissionType;
      const matchesStatus =
        status === undefined || permission.status === status;
      return matchesKeyword && matchesModule && matchesType && matchesStatus;
    });
  }, [keyword, module, permissionType, permissions, status]);

  const visibleRows = filteredPermissions.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const clearSelection = () => {
    setSelectedKeys([]);
    setSelectedRows([]);
  };

  const resetFilters = () => {
    setKeyword('');
    setModule(undefined);
    setPermissionType(undefined);
    setStatus(undefined);
    setPage(1);
    clearSelection();
  };

  const exportRows = (items: API.AdminPermissionResponse[], suffix: string) => {
    if (!items.length) return;
    downloadCsv(
      `权限清单-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: 'ID', value: (permission) => permission.id },
        { title: '模块', value: (permission) => permission.module },
        { title: '权限名称', value: (permission) => permission.permissionName },
        { title: '权限编码', value: (permission) => permission.permissionCode },
        {
          title: '类型',
          value: (permission) => typeLabel[permission.permissionType],
        },
        { title: '说明', value: (permission) => permission.description },
        {
          title: '状态',
          value: (permission) => (permission.status === 1 ? '启用' : '停用'),
        },
      ],
      items,
    );
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!editing) {
      form.resetFields();
      return;
    }
    form.setFieldsValue(editing);
  }, [editing, form]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await saveAdminPermission(values, editing?.id || undefined);
      message.success(editing?.id ? '权限项已更新' : '权限项已创建');
      setEditing(undefined);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '权限项保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<API.AdminPermissionResponse> = [
    {
      title: '模块',
      dataIndex: 'module',
      width: 130,
      render: (module) => <Tag>{module}</Tag>,
    },
    {
      title: '权限名称',
      dataIndex: 'permissionName',
      width: 180,
      render: (name, permission) => (
        <Space>
          <Typography.Text strong>{name}</Typography.Text>
          <Tag
            color={permission.permissionType === 'MENU' ? 'blue' : 'default'}
          >
            {typeLabel[permission.permissionType]}
          </Tag>
        </Space>
      ),
    },
    { title: '权限编码', dataIndex: 'permissionCode', width: 250 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      width: 140,
      render: (_, permission) => (
        <Space>
          {access.canUpdateAdminPermission && (
            <Button type="link" onClick={() => setEditing(permission)}>
              编辑
            </Button>
          )}
          {access.canDeleteAdminPermission && (
            <Popconfirm
              title="删除这个权限项？"
              description="菜单或角色仍在使用的权限项不能删除。"
              onConfirm={async () => {
                try {
                  await deleteAdminPermission(permission.id);
                  message.success('权限项已删除');
                  await loadData();
                } catch (error) {
                  message.error(
                    error instanceof Error ? error.message : '权限项删除失败',
                  );
                }
              }}
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="权限管理"
      subTitle="维护接口校验使用的权限编码，并查看角色可分配的菜单与操作权限"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => void loadData()}
        >
          刷新
        </Button>,
        <Button
          key="export-page"
          icon={<DownloadOutlined />}
          disabled={!visibleRows.length}
          onClick={() => exportRows(visibleRows, '当前页')}
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
        access.canCreateAdminPermission && (
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              setEditing({
                id: 0,
                permissionCode: '',
                permissionName: '',
                permissionType: 'ACTION',
                module: '',
                description: '',
                status: 1,
              })
            }
          >
            新建权限项
          </Button>
        ),
      ]}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索权限名称、编码或说明"
          value={keyword}
          style={{ width: 320 }}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(1);
            clearSelection();
          }}
          onSearch={(value) => {
            setKeyword(value);
            setPage(1);
            clearSelection();
          }}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="全部模块"
          value={module}
          style={{ width: 180 }}
          options={Array.from(
            new Set(permissions.map((permission) => permission.module)),
          )
            .sort()
            .map((value) => ({ value, label: value }))}
          onChange={(value?: string) => {
            setModule(value);
            setPage(1);
            clearSelection();
          }}
        />
        <Select
          allowClear
          placeholder="全部类型"
          value={permissionType}
          style={{ width: 140 }}
          options={Object.entries(typeLabel).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(value?: API.AdminPermissionResponse['permissionType']) => {
            setPermissionType(value);
            setPage(1);
            clearSelection();
          }}
        />
        <Select
          allowClear
          placeholder="全部状态"
          value={status}
          style={{ width: 140 }}
          options={[
            { value: 1, label: '启用' },
            { value: 0, label: '停用' },
          ]}
          onChange={(value?: number) => {
            setStatus(value);
            setPage(1);
            clearSelection();
          }}
        />
        <Button onClick={resetFilters}>重置</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={visibleRows}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys, selected) => {
            setSelectedKeys(keys);
            setSelectedRows(selected);
          },
        }}
        pagination={{
          current: page,
          pageSize,
          total: filteredPermissions.length,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
      />

      <Modal
        title={editing?.id ? '编辑权限项' : '新建权限项'}
        open={editing !== undefined}
        onOk={() => void submit()}
        onCancel={() => setEditing(undefined)}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="permissionName"
            label="权限名称"
            rules={[{ required: true, max: 128 }]}
          >
            <Input placeholder="例如：批量导出设备" />
          </Form.Item>
          <Form.Item
            name="permissionCode"
            label="权限编码"
            rules={[
              { required: true, max: 128 },
              {
                pattern: /^[a-z][a-z0-9]*(?::[a-z][a-z0-9-]*){1,5}$/,
                message: '使用小写字母、数字和冒号',
              },
            ]}
          >
            <Input
              disabled={Boolean(editing?.id)}
              placeholder="例如：iot:device:export"
            />
          </Form.Item>
          <Space align="start" style={{ display: 'flex' }}>
            <Form.Item
              name="permissionType"
              label="权限类型"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select
                disabled={Boolean(editing?.id)}
                options={[
                  { value: 'MENU', label: '菜单' },
                  { value: 'ACTION', label: '操作' },
                  { value: 'API', label: '接口' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="module"
              label="所属模块"
              rules={[{ required: true, max: 64 }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="例如：设备管理" />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="权限说明">
            <Input.TextArea rows={2} maxLength={512} />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            getValueProps={(value) => ({ checked: value === 1 })}
            getValueFromEvent={(checked) => (checked ? 1 : 0)}
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AdminPermissionsPage;
