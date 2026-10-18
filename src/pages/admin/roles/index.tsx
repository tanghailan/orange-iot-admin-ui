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
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAdminRole,
  getAdminPermissions,
  getAdminRoles,
  saveAdminRole,
} from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';
import { PermissionPicker } from '../shared';

const AdminRolesPage = () => {
  const access = useAccess();
  const [roles, setRoles] = useState<API.AdminRoleResponse[]>([]);
  const [permissions, setPermissions] = useState<API.AdminPermissionResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<API.AdminRoleResponse>();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<number>();
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<API.AdminRoleResponse[]>([]);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [roleList, permissionList] = await Promise.all([
        getAdminRoles(),
        getAdminPermissions(),
      ]);
      setRoles(roleList);
      setPermissions(permissionList);
      setSelectedKeys([]);
      setSelectedRows([]);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '角色数据加载失败',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const exportRows = (items: API.AdminRoleResponse[], suffix: string) => {
    if (!items.length) return;
    downloadCsv(
      `角色-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: 'ID', value: (role) => role.id },
        { title: '角色名称', value: (role) => role.roleName },
        { title: '角色编码', value: (role) => role.roleCode },
        { title: '说明', value: (role) => role.description },
        {
          title: '内置角色',
          value: (role) => (role.builtIn === 1 ? '是' : '否'),
        },
        {
          title: '状态',
          value: (role) => (role.status === 1 ? '启用' : '停用'),
        },
        { title: '权限数', value: (role) => role.permissionIds.length },
      ],
      items,
    );
  };

  const filteredRoles = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return roles.filter((role) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [role.roleName, role.roleCode, role.description].some((value) =>
          value?.toLowerCase().includes(normalizedKeyword),
        );
      const matchesStatus = status === undefined || role.status === status;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, roles, status]);

  const resetFilters = () => {
    setKeyword('');
    setStatus(undefined);
    setSelectedKeys([]);
    setSelectedRows([]);
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!editing) {
      form.resetFields();
      setCheckedIds([]);
      return;
    }
    form.setFieldsValue({
      roleCode: editing.roleCode,
      roleName: editing.roleName,
      description: editing.description,
      status: editing.status,
    });
    setCheckedIds(editing.permissionIds);
  }, [editing, form]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await saveAdminRole(
        { ...values, permissionIds: checkedIds },
        editing?.id,
      );
      message.success(editing ? '角色已更新' : '角色已创建');
      setEditing(undefined);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '角色保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<API.AdminRoleResponse> = [
    {
      title: '角色名称',
      dataIndex: 'roleName',
      render: (value, role) => (
        <Space>
          <Typography.Text strong>{value}</Typography.Text>
          {role.builtIn === 1 && <Tag color="gold">内置</Tag>}
        </Space>
      ),
    },
    { title: '角色编码', dataIndex: 'roleCode', width: 220 },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '权限数',
      dataIndex: 'permissionIds',
      width: 100,
      render: (ids: number[]) => ids.length,
    },
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
      width: 160,
      render: (_, role) =>
        role.builtIn === 1 ? (
          <Typography.Text type="secondary">系统角色</Typography.Text>
        ) : (
          <Space>
            {access.canUpdateAdminRole && (
              <Button type="link" onClick={() => setEditing(role)}>
                编辑权限
              </Button>
            )}
            {access.canDeleteAdminRole && (
              <Popconfirm
                title="删除这个角色？"
                description="已分配给账号的角色不能删除。"
                onConfirm={async () => {
                  try {
                    await deleteAdminRole(role.id);
                    message.success('角色已删除');
                    await loadData();
                  } catch (error) {
                    message.error(
                      error instanceof Error ? error.message : '角色删除失败',
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
      title="角色管理"
      subTitle="将菜单访问和操作权限组合成角色，再分配给管理账号"
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
          disabled={!filteredRoles.length}
          onClick={() => exportRows(filteredRoles, '筛选结果')}
        >
          导出角色列表
        </Button>,
        <Button
          key="export-selected"
          icon={<DownloadOutlined />}
          disabled={!selectedRows.length}
          onClick={() => exportRows(selectedRows, '已选')}
        >
          导出已选（{selectedRows.length}）
        </Button>,
        access.canCreateAdminRole && (
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              setEditing({
                id: 0,
                roleCode: '',
                roleName: '',
                description: '',
                builtIn: 0,
                status: 1,
                permissionIds: [],
              })
            }
          >
            新建角色
          </Button>
        ),
      ]}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索角色名称、编码或说明"
          value={keyword}
          style={{ width: 320 }}
          onChange={(event) => {
            setKeyword(event.target.value);
            setSelectedKeys([]);
            setSelectedRows([]);
          }}
          onSearch={(value) => {
            setKeyword(value);
            setSelectedKeys([]);
            setSelectedRows([]);
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
            setSelectedKeys([]);
            setSelectedRows([]);
          }}
        />
        <Button onClick={resetFilters}>重置</Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredRoles}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys, selected) => {
            setSelectedKeys(keys);
            setSelectedRows(selected);
          },
        }}
      />

      <Modal
        title={editing?.id ? '编辑角色' : '新建角色'}
        open={editing !== undefined}
        onOk={() => void submit()}
        onCancel={() => setEditing(undefined)}
        confirmLoading={saving}
        width={760}
        forceRender
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Space align="start" size={16} style={{ display: 'flex' }}>
            <Form.Item
              name="roleName"
              label="角色名称"
              rules={[{ required: true, max: 128 }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="例如：设备运维" />
            </Form.Item>
            <Form.Item
              name="roleCode"
              label="角色编码"
              rules={[
                { required: true, max: 64 },
                {
                  pattern: /^[a-z][a-z0-9]*(?::[a-z][a-z0-9-]*){1,5}$/,
                  message: '使用小写字母、数字和冒号',
                },
              ]}
              style={{ flex: 1 }}
            >
              <Input
                disabled={Boolean(editing?.id)}
                placeholder="例如：iot:operator"
              />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="角色说明">
            <Input.TextArea rows={2} maxLength={512} />
          </Form.Item>
          <Form.Item
            name="status"
            label="角色状态"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '停用' },
              ]}
            />
          </Form.Item>
          <Form.Item label="菜单与权限">
            <div
              style={{
                maxHeight: 360,
                overflow: 'auto',
                padding: '8px 12px',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
              }}
            >
              <PermissionPicker
                permissions={permissions}
                value={checkedIds}
                onChange={setCheckedIds}
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AdminRolesPage;
