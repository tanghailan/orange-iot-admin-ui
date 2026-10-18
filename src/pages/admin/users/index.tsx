import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type { TreeSelectProps } from 'antd';
import {
  Button,
  Form,
  Input,
  Modal,
  message,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAdminUser,
  getAdminUsers,
  getAssignableAgents,
  getAssignableRoles,
  resetAdminPassword,
  updateAdminUserAgent,
  updateAdminUserRoles,
  updateAdminUserStatus,
} from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';

type AgentTreeOption = NonNullable<TreeSelectProps['treeData']>[number];

const buildAgentTreeData = (
  agents: API.AdminAssignableAgentResponse[],
): AgentTreeOption[] => {
  const nodes = new Map<string, AgentTreeOption>();
  agents.forEach((agent) => {
    nodes.set(String(agent.id), {
      key: String(agent.id),
      value: agent.id,
      title: `${agent.name}${agent.agentCode ? `（${agent.agentCode}）` : ''}`,
      children: [],
    });
  });

  const roots: AgentTreeOption[] = [];
  agents.forEach((agent) => {
    const node = nodes.get(String(agent.id));
    if (!node) return;
    const parent =
      agent.parentId !== null && agent.parentId !== undefined
        ? nodes.get(String(agent.parentId))
        : undefined;
    if (parent) {
      parent.children?.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const AdminUsersPage = () => {
  const access = useAccess();
  const [rows, setRows] = useState<API.AdminUserResponse[]>([]);
  const [roles, setRoles] = useState<API.AdminUserRoleResponse[]>([]);
  const [agents, setAgents] = useState<API.AdminAssignableAgentResponse[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<API.AdminUserResponse[]>([]);
  const [agentUser, setAgentUser] = useState<API.AdminUserResponse>();
  const [userModal, setUserModal] = useState<
    { mode: 'create' } | { mode: 'roles'; user: API.AdminUserResponse } | null
  >(null);
  const [passwordUser, setPasswordUser] = useState<API.AdminUserResponse>();
  const [userForm] = Form.useForm();
  const [agentForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const agentTreeData = useMemo(() => buildAgentTreeData(agents), [agents]);

  const loadData = useCallback(
    async (nextPage: number, nextKeyword: string) => {
      setLoading(true);
      try {
        const [userPage, roleOptions] = await Promise.all([
          getAdminUsers({ page: nextPage, size: 10, keyword: nextKeyword }),
          getAssignableRoles(),
        ]);
        setRows(userPage.list);
        setTotal(userPage.total);
        setRoles(roleOptions);
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : '账号列表加载失败',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const exportRows = (items: API.AdminUserResponse[], suffix: string) => {
    if (!items.length) return;
    downloadCsv(
      `管理账号-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: 'ID', value: (user) => user.id },
        { title: '账号', value: (user) => user.username },
        {
          title: '角色',
          value: (user) => user.roles.map((role) => role.roleName).join('、'),
        },
        {
          title: '所属代理',
          value: (user) => user.agentName || '平台账号',
        },
        {
          title: '状态',
          value: (user) => (user.status === 1 ? '启用' : '停用'),
        },
        { title: '创建时间', value: (user) => user.createdAt },
      ],
      items,
    );
  };

  useEffect(() => {
    void loadData(page, keyword);
  }, [keyword, loadData, page]);

  useEffect(() => {
    let active = true;
    setAgentsLoading(true);
    getAssignableAgents()
      .then((options) => {
        if (active) setAgents(options);
      })
      .catch((error) => {
        if (active) {
          message.error(
            error instanceof Error ? error.message : '代理列表加载失败',
          );
        }
      })
      .finally(() => {
        if (active) setAgentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userModal) return;
    if (userModal.mode === 'create') {
      userForm.resetFields();
    } else {
      userForm.setFieldsValue({
        roleIds: userModal.user.roles
          .map((role) => role.id)
          .filter((id) => roles.some((option) => option.id === id)),
      });
    }
  }, [roles, userForm, userModal]);

  useEffect(() => {
    if (!agentUser) return;
    agentForm.setFieldsValue({ agentId: agentUser.agentId });
  }, [agentForm, agentUser]);

  useEffect(() => {
    if (!passwordUser) return;
    passwordForm.resetFields();
    passwordForm.setFieldsValue({ username: passwordUser.username });
  }, [passwordForm, passwordUser]);

  const submitUser = async () => {
    const values = await userForm.validateFields();
    setSaving(true);
    try {
      if (userModal?.mode === 'create') {
        await createAdminUser(values);
        message.success('账号已创建');
      } else if (userModal?.mode === 'roles') {
        await updateAdminUserRoles(userModal.user.id, values.roleIds);
        message.success('角色分配已更新');
      }
      setUserModal(null);
      if (userModal?.mode === 'create' && page !== 1) setPage(1);
      else await loadData(page, keyword);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const submitAgent = async () => {
    const values = await agentForm.validateFields();
    if (!agentUser) return;
    setSaving(true);
    try {
      await updateAdminUserAgent(agentUser.id, values.agentId);
      message.success('所属代理已更新');
      setAgentUser(undefined);
      agentForm.resetFields();
      await loadData(page, keyword);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '所属代理更新失败',
      );
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async () => {
    const values = await passwordForm.validateFields();
    if (!passwordUser) return;
    setSaving(true);
    try {
      await resetAdminPassword(passwordUser.id, values.password);
      message.success('密码已重置');
      setPasswordUser(undefined);
      passwordForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重置密码失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<API.AdminUserResponse> = [
    {
      title: '账号',
      dataIndex: 'username',
      width: 180,
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (userRoles) => (
        <Space wrap>
          {userRoles.map((role: API.AdminUserRoleResponse) => (
            <Tag
              color={role.roleCode === 'super_admin' ? 'gold' : 'blue'}
              key={role.id}
            >
              {role.roleName}
            </Tag>
          ))}
          {!userRoles.length && (
            <Typography.Text type="secondary">未分配</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: '所属代理',
      dataIndex: 'agentName',
      width: 180,
      render: (_, user) =>
        user.agentName ? (
          <Tag color="cyan">
            {user.agentName}
            {user.agentCode ? `（${user.agentCode}）` : ''}
          </Tag>
        ) : (
          <Typography.Text type="secondary">平台账号</Typography.Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status, user) => (
        <Switch
          checked={status === 1}
          checkedChildren="启用"
          unCheckedChildren="停用"
          disabled={!access.canUpdateAdminUser}
          onChange={async (enabled) => {
            try {
              await updateAdminUserStatus(user.id, enabled ? 1 : 0);
              message.success(enabled ? '账号已启用' : '账号已停用');
              await loadData(page, keyword);
            } catch (error) {
              message.error(
                error instanceof Error ? error.message : '状态更新失败',
              );
            }
          }}
        />
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt', width: 190 },
    {
      title: '操作',
      width: 360,
      className: 'iot-action-cell',
      render: (_, user) => (
        <Space className="iot-table-actions" size={4}>
          {access.canUpdateAdminUser &&
            !user.roles.some((role) => role.roleCode === 'super_admin') && (
              <Button type="link" onClick={() => setAgentUser(user)}>
                调整所属代理
              </Button>
            )}
          {access.canAssignAdminUserRoles &&
            !user.roles.some((role) => role.roleCode === 'super_admin') && (
              <Button
                type="link"
                onClick={() => setUserModal({ mode: 'roles', user })}
              >
                分配角色
              </Button>
            )}
          {access.canResetAdminPassword && (
            <Button type="link" onClick={() => setPasswordUser(user)}>
              重置密码
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="账号管理"
      subTitle="维护后台账号、角色和登录状态"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => void loadData(page, keyword)}
        >
          刷新
        </Button>,
        <Button
          key="export-page"
          icon={<DownloadOutlined />}
          disabled={!rows.length}
          onClick={() => exportRows(rows, '当前页')}
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
        access.canCreateAdminUser && (
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setUserModal({ mode: 'create' })}
          >
            新建账号
          </Button>
        ),
      ]}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索账号"
          style={{ width: 280 }}
          onSearch={(value) => {
            setKeyword(value);
            setPage(1);
            setSelectedKeys([]);
            setSelectedRows([]);
          }}
        />
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        className="iot-admin-table"
        tableLayout="fixed"
        columns={columns}
        dataSource={rows}
        rowSelection={{
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedKeys,
          onChange: (keys, selected) => {
            setSelectedKeys(keys);
            setSelectedRows(selected);
          },
        }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          showTotal: (value) => `共 ${value} 个账号`,
          onChange: (nextPage) => {
            setPage(nextPage);
          },
        }}
      />

      <Modal
        title={userModal?.mode === 'create' ? '新建管理账号' : '分配账号角色'}
        open={userModal !== null}
        onOk={() => void submitUser()}
        onCancel={() => setUserModal(null)}
        confirmLoading={saving}
        forceRender
        destroyOnHidden
      >
        <Form form={userForm} layout="vertical">
          {userModal?.mode === 'create' && (
            <>
              <Form.Item
                name="username"
                label="登录账号"
                rules={[{ required: true, max: 64 }]}
              >
                <Input autoComplete="username" />
              </Form.Item>
              <Form.Item
                name="password"
                label="初始密码"
                rules={[
                  { required: true },
                  { min: 8, max: 72, message: '密码长度需为 8 到 72 位' },
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="agentId"
                label="所属代理"
                rules={[{ required: true, message: '请选择所属代理' }]}
              >
                <TreeSelect
                  treeData={agentTreeData}
                  loading={agentsLoading}
                  placeholder="选择所属代理"
                  showSearch
                  treeNodeLabelProp="title"
                  treeNodeFilterProp="title"
                  notFoundContent={agentsLoading ? '加载中...' : '暂无可选代理'}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="roleIds"
            label="角色"
            rules={[{ required: true, message: '至少选择一个角色' }]}
          >
            <Select
              mode="multiple"
              options={roles.map((role) => ({
                value: role.id,
                label: role.roleName,
              }))}
              placeholder="选择一个或多个角色"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`调整所属代理：${agentUser?.username || ''}`}
        open={agentUser !== undefined}
        onOk={() => void submitAgent()}
        onCancel={() => {
          setAgentUser(undefined);
          agentForm.resetFields();
        }}
        confirmLoading={saving}
        forceRender
        destroyOnHidden
      >
        <Form form={agentForm} layout="vertical">
          <Form.Item
            name="agentId"
            label="所属代理"
            rules={[{ required: true, message: '请选择所属代理' }]}
          >
            <TreeSelect
              treeData={agentTreeData}
              loading={agentsLoading}
              placeholder="选择所属代理"
              showSearch
              treeNodeLabelProp="title"
              treeNodeFilterProp="title"
              notFoundContent={agentsLoading ? '加载中...' : '暂无可选代理'}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`重置密码：${passwordUser?.username || ''}`}
        open={passwordUser !== undefined}
        onOk={() => void submitPassword()}
        onCancel={() => {
          setPasswordUser(undefined);
          passwordForm.resetFields();
        }}
        confirmLoading={saving}
        forceRender
        destroyOnHidden
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="username" hidden>
            <Input autoComplete="username" tabIndex={-1} />
          </Form.Item>
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true },
              { min: 8, max: 72, message: '密码长度需为 8 到 72 位' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AdminUsersPage;
