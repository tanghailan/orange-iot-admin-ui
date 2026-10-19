import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type { TreeDataNode } from 'antd';
import {
  Button,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tree,
  Typography,
} from 'antd';
import type { Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteAdminPermission,
  getAdminMenus,
  getAdminPermissions,
  saveAdminPermission,
} from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';
import { groupPermissionsByMenu } from '../shared';

const typeLabel: Record<API.AdminPermissionResponse['permissionType'], string> =
  {
    MENU: '菜单',
    ACTION: '操作',
    API: '接口',
  };

const typeColor: Record<API.AdminPermissionResponse['permissionType'], string> =
  {
    MENU: 'blue',
    ACTION: 'gold',
    API: 'purple',
  };

const AdminPermissionsPage = () => {
  const access = useAccess();
  const [menus, setMenus] = useState<API.AdminMenuResponse[]>([]);
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
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [permissionList, menuList] = await Promise.all([
        getAdminPermissions(),
        getAdminMenus(),
      ]);
      setPermissions(permissionList);
      setMenus(menuList);
      setSelectedKeys([]);
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

  const clearSelection = () => {
    setSelectedKeys([]);
  };

  const resetFilters = () => {
    setKeyword('');
    setModule(undefined);
    setPermissionType(undefined);
    setStatus(undefined);
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

  const selectedRows = useMemo(() => {
    const selectedIds = new Set(
      selectedKeys
        .map((key) => String(key))
        .filter((key) => key.startsWith('permission:'))
        .map((key) => Number(key.slice('permission:'.length))),
    );
    return permissions.filter((permission) => selectedIds.has(permission.id));
  }, [permissions, selectedKeys]);

  const togglePermissionSelection = useCallback((permissionId: number) => {
    const key = `permission:${permissionId}`;
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }, []);

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

  const handleDelete = async (permission: API.AdminPermissionResponse) => {
    try {
      await deleteAdminPermission(permission.id);
      message.success('权限项已删除');
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '权限项删除失败');
    }
  };

  const treeData = useMemo<TreeDataNode[]>(() => {
    const { menuTree, permissionsByPage, unassignedByModule } =
      groupPermissionsByMenu(menus, filteredPermissions);

    const permissionNode = (
      permission: API.AdminPermissionResponse,
    ): TreeDataNode => ({
      key: `permission:${permission.id}`,
      className: 'iot-permission-tree-leaf',
      isLeaf: true,
      title: (
        <div className="iot-permission-tree-item">
          <div className="iot-permission-tree-main">
            <Checkbox
              checked={selectedKeys.includes(`permission:${permission.id}`)}
              onClick={(event) => event.stopPropagation()}
              onChange={() => togglePermissionSelection(permission.id)}
            />
            <Space size={8}>
              <Typography.Text strong>
                {permission.permissionName}
              </Typography.Text>
              <Tag color={typeColor[permission.permissionType]}>
                {typeLabel[permission.permissionType]}
              </Tag>
              <Tag color={permission.status === 1 ? 'green' : 'default'}>
                {permission.status === 1 ? '启用' : '停用'}
              </Tag>
            </Space>
            <Typography.Text code>{permission.permissionCode}</Typography.Text>
          </div>
          <div className="iot-permission-tree-meta">
            <Typography.Text type="secondary">
              {permission.description || '暂无说明'}
            </Typography.Text>
            <Space size={4} onClick={(event) => event.stopPropagation()}>
              {access.canUpdateAdminPermission && (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => setEditing(permission)}
                >
                  编辑
                </Button>
              )}
              {access.canDeleteAdminPermission && (
                <Popconfirm
                  title="删除这个权限项？"
                  description="菜单或角色仍在使用的权限项不能删除。"
                  onConfirm={() => void handleDelete(permission)}
                >
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>
        </div>
      ),
    });

    const renderGroupTitle = (content: ReactNode) => (
      <div className="iot-permission-tree-group">{content}</div>
    );

    const buildNodes = (items: API.AdminMenuResponse[]): TreeDataNode[] =>
      items.flatMap((item) => {
        if (item.menuType === 'PAGE') {
          const pagePermissions = permissionsByPage.get(item.menuCode) || [];
          if (!pagePermissions.length) return [];
          return [
            {
              key: `page:${item.menuCode}`,
              className: 'iot-permission-tree-group-node',
              title: renderGroupTitle(
                <>
                  <Typography.Text strong>{item.menuName}</Typography.Text>
                  <Tag color="blue">页面</Tag>
                  <Typography.Text type="secondary">
                    {pagePermissions.length} 项权限
                  </Typography.Text>
                </>,
              ),
              children: pagePermissions.map(permissionNode),
            },
          ];
        }

        const children = buildNodes(item.children);
        if (!children.length) return [];
        return [
          {
            key: `menu:${item.menuCode}`,
            className: 'iot-permission-tree-group-node',
            title: renderGroupTitle(
              <>
                <Typography.Text strong>{item.menuName}</Typography.Text>
                <Tag>{children.length} 个页面</Tag>
              </>,
            ),
            children,
          },
        ];
      });

    const nodes = buildNodes(menuTree);
    if (unassignedByModule.size > 0) {
      nodes.push({
        key: 'unassigned',
        className: 'iot-permission-tree-group-node',
        title: renderGroupTitle(
          <>
            <Typography.Text strong>未关联菜单</Typography.Text>
            <Tag color="orange">{unassignedByModule.size} 个模块</Tag>
          </>,
        ),
        children: Array.from(unassignedByModule.entries()).map(
          ([moduleName, modulePermissions]) => ({
            key: `unassigned-module:${moduleName}`,
            className: 'iot-permission-tree-group-node',
            title: renderGroupTitle(
              <>
                <Typography.Text strong>
                  {moduleName || '未分组'}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {modulePermissions.length} 项权限
                </Typography.Text>
              </>,
            ),
            children: modulePermissions.map(permissionNode),
          }),
        ),
      });
    }
    return nodes;
  }, [
    access.canDeleteAdminPermission,
    access.canUpdateAdminPermission,
    filteredPermissions,
    handleDelete,
    menus,
    selectedKeys,
    togglePermissionSelection,
  ]);

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
          disabled={!filteredPermissions.length}
          onClick={() => exportRows(filteredPermissions, '筛选结果')}
        >
          导出筛选结果
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
            clearSelection();
          }}
          onSearch={(value) => {
            setKeyword(value);
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
            clearSelection();
          }}
        />
        <Button onClick={resetFilters}>重置</Button>
      </Space>
      <div className="iot-permission-tree-panel">
        <div className="iot-permission-tree-header">
          <Space size={12}>
            <Typography.Text strong>权限树</Typography.Text>
            <Typography.Text type="secondary">
              共 {filteredPermissions.length} 项权限，按菜单页面归类
            </Typography.Text>
          </Space>
          <Typography.Text type="secondary">
            勾选权限后可批量导出
          </Typography.Text>
        </div>
        <Spin spinning={loading}>
          {treeData.length ? (
            <Tree
              blockNode
              className="iot-tree-compact iot-permission-tree"
              defaultExpandAll
              selectable={false}
              treeData={treeData}
            />
          ) : (
            <Empty description="没有符合条件的权限" />
          )}
        </Spin>
      </div>

      <Modal
        title={editing?.id ? '编辑权限项' : '新建权限项'}
        open={editing !== undefined}
        onOk={() => void submit()}
        onCancel={() => setEditing(undefined)}
        confirmLoading={saving}
        forceRender
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
