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
  InputNumber,
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
import { deleteAdminMenu, getAdminMenus, saveAdminMenu } from '@/services/iot';
import { downloadCsv } from '@/utils/exportCsv';
import { buildMenuTree } from '../shared';

function filterMenuRows(
  menus: API.AdminMenuResponse[],
  keyword: string,
  menuType?: API.AdminMenuResponse['menuType'],
  status?: number,
) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const matches = (menu: API.AdminMenuResponse) => {
    const matchesKeyword =
      !normalizedKeyword ||
      [menu.menuCode, menu.menuName, menu.path, menu.permissionCode].some(
        (value) => value?.toLowerCase().includes(normalizedKeyword),
      );
    const matchesType = menuType === undefined || menu.menuType === menuType;
    const matchesStatus = status === undefined || menu.status === status;
    return matchesKeyword && matchesType && matchesStatus;
  };

  if (!normalizedKeyword && menuType === undefined && status === undefined) {
    return menus;
  }

  const includedCodes = new Set(
    menus.filter(matches).map((menu) => menu.menuCode),
  );
  menus.forEach((menu) => {
    if (!includedCodes.has(menu.menuCode)) return;
    let parentCode = menu.parentCode;
    while (parentCode) {
      const parent = menus.find(
        (candidate) => candidate.menuCode === parentCode,
      );
      if (!parent || includedCodes.has(parent.menuCode)) break;
      includedCodes.add(parent.menuCode);
      parentCode = parent.parentCode;
    }
  });

  return menus.filter((menu) => includedCodes.has(menu.menuCode));
}

const AdminMenusPage = () => {
  const access = useAccess();
  const [menus, setMenus] = useState<API.AdminMenuResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<API.AdminMenuResponse>();
  const [keyword, setKeyword] = useState('');
  const [menuType, setMenuType] = useState<API.AdminMenuResponse['menuType']>();
  const [status, setStatus] = useState<number>();
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<API.AdminMenuResponse[]>([]);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setMenus(await getAdminMenus());
      setSelectedKeys([]);
      setSelectedRows([]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '菜单加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const exportRows = (items: API.AdminMenuResponse[], suffix: string) => {
    if (!items.length) return;
    downloadCsv(
      `菜单-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: 'ID', value: (menu) => menu.id },
        { title: '菜单编码', value: (menu) => menu.menuCode },
        { title: '上级目录', value: (menu) => menu.parentCode },
        { title: '菜单名称', value: (menu) => menu.menuName },
        {
          title: '类型',
          value: (menu) => (menu.menuType === 'DIRECTORY' ? '目录' : '页面'),
        },
        { title: '路由', value: (menu) => menu.path },
        { title: '图标', value: (menu) => menu.icon },
        { title: '权限码', value: (menu) => menu.permissionCode },
        { title: '排序', value: (menu) => menu.sortOrder },
        {
          title: '状态',
          value: (menu) => (menu.status === 1 ? '显示' : '隐藏'),
        },
      ],
      items,
    );
  };

  const filteredMenus = useMemo(
    () => filterMenuRows(menus, keyword, menuType, status),
    [keyword, menuType, menus, status],
  );

  const resetFilters = () => {
    setKeyword('');
    setMenuType(undefined);
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
      return;
    }
    form.setFieldsValue({
      menuCode: editing.menuCode,
      parentCode: editing.parentCode,
      menuType: editing.menuType,
      menuName: editing.menuName,
      path: editing.path,
      icon: editing.icon,
      permissionCode: editing.permissionCode,
      sortOrder: editing.sortOrder,
      status: editing.status,
    });
  }, [editing, form]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await saveAdminMenu(values, editing?.id || undefined);
      message.success(editing?.id ? '菜单已更新' : '目录已创建');
      setEditing(undefined);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '菜单保存失败');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<API.AdminMenuResponse> = [
    {
      title: '菜单名称',
      dataIndex: 'menuName',
      render: (value, menu) => (
        <Space>
          <Typography.Text strong={menu.menuType === 'DIRECTORY'}>
            {value}
          </Typography.Text>
          {menu.status === 0 && <Tag>隐藏</Tag>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'menuType',
      width: 100,
      render: (type) => (type === 'DIRECTORY' ? '目录' : '页面'),
    },
    {
      title: '路由',
      dataIndex: 'path',
      width: 210,
      render: (path) =>
        path || <Typography.Text type="secondary">目录</Typography.Text>,
    },
    {
      title: '权限码',
      dataIndex: 'permissionCode',
      width: 200,
      render: (code) => code || '—',
    },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    {
      title: '操作',
      width: 150,
      render: (_, menu) => (
        <Space>
          {access.canUpdateAdminMenu && (
            <Button type="link" onClick={() => setEditing(menu)}>
              编辑
            </Button>
          )}
          {access.canDeleteAdminMenu && (
            <Popconfirm
              title="删除这个菜单？"
              description="目录必须先移除其下的子菜单。"
              onConfirm={async () => {
                try {
                  await deleteAdminMenu(menu.id);
                  message.success('菜单已删除');
                  await loadData();
                } catch (error) {
                  message.error(
                    error instanceof Error ? error.message : '菜单删除失败',
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

  const parentOptions = menus
    .filter((menu) => menu.menuType === 'DIRECTORY' && menu.id !== editing?.id)
    .map((menu) => ({ value: menu.menuCode, label: menu.menuName }));

  return (
    <PageContainer
      title="菜单管理"
      subTitle="调整导航分组、名称、图标和排序；页面路由与权限标识由应用固定"
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
          disabled={!filteredMenus.length}
          onClick={() => exportRows(filteredMenus, '筛选结果')}
        >
          导出菜单列表
        </Button>,
        <Button
          key="export-selected"
          icon={<DownloadOutlined />}
          disabled={!selectedRows.length}
          onClick={() => exportRows(selectedRows, '已选')}
        >
          导出已选（{selectedRows.length}）
        </Button>,
        access.canCreateAdminMenu && (
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              setEditing({
                id: 0,
                menuCode: '',
                menuType: 'DIRECTORY',
                menuName: '',
                icon: '',
                sortOrder: 50,
                status: 1,
                name: '',
                children: [],
              })
            }
          >
            新建目录
          </Button>
        ),
      ]}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索菜单名称、编码、路由或权限码"
          value={keyword}
          style={{ width: 360 }}
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
          placeholder="全部类型"
          value={menuType}
          style={{ width: 140 }}
          options={[
            { value: 'DIRECTORY', label: '目录' },
            { value: 'PAGE', label: '页面' },
          ]}
          onChange={(value?: API.AdminMenuResponse['menuType']) => {
            setMenuType(value);
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
            { value: 1, label: '显示' },
            { value: 0, label: '隐藏' },
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
        rowKey="menuCode"
        loading={loading}
        columns={columns}
        dataSource={buildMenuTree(filteredMenus)}
        pagination={false}
        expandable={{ defaultExpandAllRows: true }}
        rowSelection={{
          checkStrictly: true,
          selectedRowKeys: selectedKeys,
          onChange: (keys, selected) => {
            setSelectedKeys(keys);
            setSelectedRows(selected);
          },
        }}
      />

      <Modal
        title={editing?.id ? '编辑菜单' : '新建目录'}
        open={editing !== undefined}
        onOk={() => void submit()}
        onCancel={() => setEditing(undefined)}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="menuName"
            label="菜单名称"
            rules={[{ required: true, max: 128 }]}
          >
            <Input placeholder="例如：设备接入" />
          </Form.Item>
          <Form.Item
            name="menuCode"
            label="菜单编码"
            rules={[{ required: true, max: 64 }]}
          >
            <Input
              disabled={Boolean(editing?.id)}
              placeholder="例如：device-access"
            />
          </Form.Item>
          {editing?.id ? (
            <>
              <Form.Item name="menuType" label="类型">
                <Select
                  disabled
                  options={[
                    { value: 'DIRECTORY', label: '目录' },
                    { value: 'PAGE', label: '页面' },
                  ]}
                />
              </Form.Item>
              {editing.menuType === 'PAGE' && (
                <>
                  <Form.Item name="path" label="页面路由">
                    <Input disabled />
                  </Form.Item>
                  <Form.Item name="permissionCode" label="页面权限">
                    <Input disabled />
                  </Form.Item>
                </>
              )}
            </>
          ) : (
            <Form.Item name="menuType" label="类型" initialValue="DIRECTORY">
              <Select
                disabled
                options={[{ value: 'DIRECTORY', label: '目录' }]}
              />
            </Form.Item>
          )}
          <Form.Item name="parentCode" label="上级目录">
            <Select allowClear options={parentOptions} placeholder="顶级目录" />
          </Form.Item>
          <Form.Item name="icon" label="图标名称">
            <Input placeholder="例如：appstore、setting" />
          </Form.Item>
          <Space align="start" style={{ display: 'flex' }}>
            <Form.Item
              name="sortOrder"
              label="排序"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item
              name="status"
              label="状态"
              valuePropName="checked"
              getValueProps={(value) => ({ checked: value === 1 })}
              getValueFromEvent={(checked) => (checked ? 1 : 0)}
            >
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default AdminMenusPage;
