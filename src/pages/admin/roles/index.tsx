import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
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
  getAdminMenus,
  getAdminPermissions,
  getAdminRoles,
  saveAdminRole,
} from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';
import { PermissionPicker } from '../shared';

const AdminRolesPage = () => {
  const access = useAccess();
  const [roles, setRoles] = useState<API.AdminRoleResponse[]>([]);
  const [menus, setMenus] = useState<API.AdminMenuResponse[]>([]);
  const [permissions, setPermissions] = useState<API.AdminPermissionResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<API.AdminRoleResponse>();
  const [authorizing, setAuthorizing] = useState<API.AdminRoleResponse>();
  const [viewing, setViewing] = useState<API.AdminRoleResponse>();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<number>();
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<API.AdminRoleResponse[]>([]);
  const [form] = Form.useForm();
  const activeRole = editing || authorizing || viewing;
  const canSaveRole = Boolean(editing || authorizing);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [roleList, menuList, permissionList] = await Promise.all([
        getAdminRoles(),
        getAdminMenus(),
        getAdminPermissions(),
      ]);
      setRoles(roleList);
      setMenus(menuList);
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
    if (!activeRole) {
      form.resetFields();
      setCheckedIds([]);
      return;
    }
    form.setFieldsValue({
      roleCode: activeRole.roleCode,
      roleName: activeRole.roleName,
      description: activeRole.description,
      status: activeRole.status,
    });
    setCheckedIds(activeRole.permissionIds);
  }, [activeRole, form]);

  const submit = async () => {
    const values = await form.validateFields();
    if (!editing && !authorizing) return;
    setSaving(true);
    try {
      await saveAdminRole(
        { ...values, permissionIds: checkedIds },
        editing?.id || authorizing?.id,
      );
      message.success(
        authorizing ? '角色授权已更新' : editing?.id ? '角色已更新' : '角色已创建',
      );
      setEditing(undefined);
      setAuthorizing(undefined);
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
      width: 300,
      className: 'iot-action-cell',
      render: (_, role) =>
        role.builtIn === 1 ? (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setEditing(undefined);
              setAuthorizing(undefined);
              setViewing(role);
            }}
          >
            查看授权
          </Button>
        ) : (
          <Space className="iot-table-actions" size={4}>
            {access.canUpdateAdminRole && (
              <>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setAuthorizing(undefined);
                    setViewing(undefined);
                    setEditing(role);
                  }}
                >
                  编辑
                </Button>
                <Button
                  type="link"
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => {
                    setEditing(undefined);
                    setViewing(undefined);
                    setAuthorizing(role);
                  }}
                >
                  授权
                </Button>
              </>
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
        className="iot-admin-table"
        tableLayout="fixed"
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
        title={
          viewing
            ? '查看角色授权'
            : authorizing
              ? `角色授权：${authorizing.roleName}`
              : editing?.id
                ? '编辑角色'
                : '新建角色'
        }
        open={activeRole !== undefined}
        onOk={canSaveRole ? () => void submit() : undefined}
        onCancel={() => {
          setEditing(undefined);
          setAuthorizing(undefined);
          setViewing(undefined);
        }}
        confirmLoading={saving}
        width={760}
        forceRender
        destroyOnHidden
        footer={
          viewing ? (
            <Button onClick={() => setViewing(undefined)}>关闭</Button>
          ) : undefined
        }
      >
        <Form form={form} layout="vertical">
          <Space align="start" size={16} style={{ display: 'flex' }}>
            <Form.Item
              name="roleName"
              label="角色名称"
              rules={[{ required: true, max: 128 }]}
              style={{ flex: 1 }}
            >
              <Input disabled={!editing} placeholder="例如：设备运维" />
            </Form.Item>
            <Form.Item
              name="roleCode"
              label="角色编码"
              rules={[
                { required: true, max: 64 },
                {
                  pattern: /^[a-z][a-z0-9]*(?::[a-z][a-z0-9-]*){0,5}$/,
                  message: '以小写字母开头，可使用小写字母、数字、冒号和连字符',
                },
              ]}
              style={{ flex: 1 }}
            >
              <Input
                disabled={!editing || Boolean(editing?.id)}
                placeholder="例如：operator 或 iot:operator"
              />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="角色说明">
            <Input.TextArea
              disabled={!editing}
              rows={2}
              maxLength={512}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="角色状态"
            rules={[{ required: true }]}
          >
            <Select
              disabled={!editing}
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
                menus={menus}
                permissions={permissions}
                value={checkedIds}
                onChange={setCheckedIds}
                disabled={Boolean(viewing)}
              />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AdminRolesPage;
