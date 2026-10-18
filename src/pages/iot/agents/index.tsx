import {
  EditOutlined,
  FolderAddOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type { TreeDataNode } from 'antd';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tree,
  Typography,
  theme,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAgent,
  disableAgent,
  getAgentProducts,
  getAgentTree,
  getAgentTreeNodes,
  listProducts,
  moveAgent,
  transferDevice,
  updateAgent,
  updateAgentProducts,
} from '@/services/iot';
import { getErrorMessage } from '@/utils/errorMessage';

type AgentRow = {
  id: API.AgentId;
  agentCode: string;
  name: string;
  parentId: API.AgentId | null;
  level: number;
  status: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  accountCount: number;
  deviceCount: number;
  accounts: API.AgentAccountSummary[];
  devices: API.AgentDeviceSummary[];
  children: AgentRow[];
};

type AgentFormValues = {
  agentCode?: string;
  name: string;
  parentId?: string;
  description?: string;
};

type MoveFormValues = {
  parentId?: string;
};

type TransferFormValues = {
  deviceId: string;
  targetAgentId: string;
  reason?: string;
};

type AgentModalState =
  | { mode: 'create'; parentId?: API.AgentId }
  | { mode: 'edit'; agent: AgentRow }
  | null;

const toAgentRow = (node: API.AgentTreeNode, fallbackLevel = 0): AgentRow => {
  const accounts = node.accounts || node.users || [];
  const devices = node.devices || [];
  return {
    id: node.id,
    agentCode: node.agentCode || String(node.id),
    name: node.name || node.agentName || node.agentCode || String(node.id),
    parentId: node.parentId ?? null,
    level: node.level ?? node.depth ?? fallbackLevel,
    status: node.status ?? 1,
    description: node.description,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    accountCount: node.accountCount ?? node.userCount ?? accounts.length,
    deviceCount: node.deviceCount ?? devices.length,
    accounts,
    devices,
    children: (node.children || []).map((child) =>
      toAgentRow(child, (node.level ?? node.depth ?? fallbackLevel) + 1),
    ),
  };
};

const normalizeAgents = (data: API.AgentTreeResponse | undefined) =>
  getAgentTreeNodes(data).map((node) => toAgentRow(node));

const findAgent = (
  agents: AgentRow[],
  id: string | undefined,
): AgentRow | undefined => {
  if (!id) return undefined;
  for (const agent of agents) {
    if (String(agent.id) === id) return agent;
    const child = findAgent(agent.children, id);
    if (child) return child;
  }
  return undefined;
};

const getDescendantIds = (agent: AgentRow): Set<string> => {
  const ids = new Set<string>();
  const visit = (node: AgentRow) => {
    node.children.forEach((child) => {
      ids.add(String(child.id));
      visit(child);
    });
  };
  visit(agent);
  return ids;
};

const isDirectAgent = (agent: AgentRow) =>
  agent.parentId === null || agent.agentCode === 'DIRECT';

const toTreeData = (agents: AgentRow[]): TreeDataNode[] =>
  agents.map((agent) => ({
    key: String(agent.id),
    title: (
      <Space size={6}>
        <Typography.Text ellipsis>{agent.name}</Typography.Text>
        <Typography.Text
          type={agent.status === 1 ? 'success' : 'secondary'}
          style={{ fontSize: 12, whiteSpace: 'nowrap' }}
        >
          {agent.status === 1 ? '启用' : '停用'}
        </Typography.Text>
      </Space>
    ),
    children: toTreeData(agent.children),
  }));

const productIdsFromResponse = (
  data: API.AgentProductsResponse | undefined,
): number[] => {
  if (Array.isArray(data)) {
    return data
      .filter(
        (product) =>
          product.directGranted ??
          product.authorized ??
          product.granted ??
          true,
      )
      .map((product) => product.id ?? product.productId)
      .filter((id): id is number => id !== undefined);
  }
  if (data?.productIds) return data.productIds;
  return (data?.products || data?.list || [])
    .filter(
      (product) =>
        product.directGranted ?? product.authorized ?? product.granted ?? true,
    )
    .map((product) => product.id ?? product.productId)
    .filter((id): id is number => id !== undefined);
};

const ensureSuccess = <T,>(response: API.ApiResponse<T>, fallback: string) => {
  if (response.code !== 0) {
    throw new Error(response.message || fallback);
  }
  return response.data;
};

const AgentManagement: React.FC = () => {
  const access = useAccess();
  const { token } = theme.useToken();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [agentModal, setAgentModal] = useState<AgentModalState>(null);
  const [moveModalAgent, setMoveModalAgent] = useState<AgentRow>();
  const [productsModalAgent, setProductsModalAgent] = useState<AgentRow>();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<API.ProductResponse[]>([]);
  const [grantedProductIds, setGrantedProductIds] = useState<number[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [agentForm] = Form.useForm<AgentFormValues>();
  const [moveForm] = Form.useForm<MoveFormValues>();
  const [transferForm] = Form.useForm<TransferFormValues>();

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAgentTree({ skipErrorHandler: true });
      const nextAgents = normalizeAgents(
        ensureSuccess(response, '代理树加载失败'),
      );
      setAgents(nextAgents);
      setSelectedAgentId((current) => {
        if (current && findAgent(nextAgents, current)) return current;
        return nextAgents[0] ? String(nextAgents[0].id) : undefined;
      });
    } catch (error) {
      message.error(getErrorMessage(error, '代理树加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (!agentModal) {
      agentForm.resetFields();
      return;
    }
    if (agentModal.mode === 'create') {
      agentForm.resetFields();
      agentForm.setFieldsValue({
        parentId:
          agentModal.parentId === undefined
            ? undefined
            : String(agentModal.parentId),
      });
      return;
    }
    agentForm.resetFields();
    agentForm.setFieldsValue({
      agentCode: agentModal.agent.agentCode,
      name: agentModal.agent.name,
      description: agentModal.agent.description || '',
    });
  }, [agentForm, agentModal]);

  const flatAgents = useMemo(
    () => agents.flatMap((agent) => flattenAgentRows(agent)),
    [agents],
  );
  const selectedAgent = useMemo(
    () => findAgent(agents, selectedAgentId),
    [agents, selectedAgentId],
  );
  const treeData = useMemo(() => toTreeData(agents), [agents]);
  const agentOptions = useMemo(
    () =>
      flatAgents.map((agent) => ({
        value: String(agent.id),
        label: `${agent.name}（${agent.agentCode}）`,
      })),
    [flatAgents],
  );
  const moveOptions = useMemo(() => {
    if (!moveModalAgent) return agentOptions;
    const excludedIds = getDescendantIds(moveModalAgent);
    excludedIds.add(String(moveModalAgent.id));
    return agentOptions.filter((option) => !excludedIds.has(option.value));
  }, [agentOptions, moveModalAgent]);

  const openCreate = (parentId?: API.AgentId) => {
    setAgentModal({ mode: 'create', parentId });
  };

  const openEdit = (agent: AgentRow) => {
    setAgentModal({ mode: 'edit', agent });
  };

  const submitAgent = async () => {
    const values = await agentForm.validateFields();
    setSaving(true);
    try {
      if (agentModal?.mode === 'edit') {
        const response = await updateAgent(
          agentModal.agent.id,
          {
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
          },
          { skipErrorHandler: true },
        );
        ensureSuccess(response, '代理更新失败');
        message.success('代理已更新');
      } else if (agentModal?.mode === 'create') {
        const response = await createAgent(
          {
            agentCode: values.agentCode?.trim() || '',
            name: values.name.trim(),
            parentId: values.parentId || null,
            description: values.description?.trim() || undefined,
          },
          { skipErrorHandler: true },
        );
        ensureSuccess(response, '代理创建失败');
        message.success('代理已创建');
      }
      setAgentModal(null);
      await loadAgents();
    } catch (error) {
      message.error(getErrorMessage(error, '代理保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const openMove = (agent: AgentRow) => {
    moveForm.resetFields();
    moveForm.setFieldsValue({
      parentId:
        agent.parentId === undefined || agent.parentId === null
          ? undefined
          : String(agent.parentId),
    });
    setMoveModalAgent(agent);
  };

  const submitMove = async () => {
    const values = await moveForm.validateFields();
    if (!moveModalAgent) return;
    setSaving(true);
    try {
      const response = await moveAgent(
        moveModalAgent.id,
        { parentId: values.parentId || null },
        { skipErrorHandler: true },
      );
      ensureSuccess(response, '代理移动失败');
      message.success('代理层级已调整');
      setMoveModalAgent(undefined);
      await loadAgents();
    } catch (error) {
      message.error(getErrorMessage(error, '代理移动失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (agent: AgentRow) => {
    setSaving(true);
    try {
      const response = await disableAgent(agent.id, {
        skipErrorHandler: true,
      });
      ensureSuccess(response, '代理停用失败');
      message.success('代理已停用');
      await loadAgents();
    } catch (error) {
      message.error(getErrorMessage(error, '代理停用失败'));
    } finally {
      setSaving(false);
    }
  };

  const openProducts = async (agent: AgentRow) => {
    setProductsModalAgent(agent);
    setProductsLoading(true);
    try {
      const [productsResponse, grantsResponse] = await Promise.all([
        listProducts({ skipErrorHandler: true }),
        getAgentProducts(agent.id, { skipErrorHandler: true }),
      ]);
      setAllProducts(ensureSuccess(productsResponse, '产品列表加载失败') || []);
      setGrantedProductIds(
        productIdsFromResponse(
          ensureSuccess(grantsResponse, '代理产品授权加载失败'),
        ),
      );
    } catch (error) {
      setProductsModalAgent(undefined);
      message.error(getErrorMessage(error, '代理产品授权加载失败'));
    } finally {
      setProductsLoading(false);
    }
  };

  const submitProducts = async () => {
    if (!productsModalAgent) return;
    setSaving(true);
    try {
      const response = await updateAgentProducts(
        productsModalAgent.id,
        { productIds: grantedProductIds },
        { skipErrorHandler: true },
      );
      ensureSuccess(response, '产品授权保存失败');
      message.success('产品授权已更新');
      setProductsModalAgent(undefined);
    } catch (error) {
      message.error(getErrorMessage(error, '产品授权保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const openTransfer = () => {
    transferForm.resetFields();
    setTransferModalOpen(true);
  };

  const submitTransfer = async () => {
    const values = await transferForm.validateFields();
    setSaving(true);
    try {
      const response = await transferDevice(
        values.deviceId.trim(),
        {
          targetAgentId: values.targetAgentId,
          reason: values.reason?.trim() || undefined,
        },
        { skipErrorHandler: true },
      );
      ensureSuccess(response, '设备转移失败');
      message.success('设备归属已转移');
      setTransferModalOpen(false);
      transferForm.resetFields();
      await loadAgents();
    } catch (error) {
      message.error(getErrorMessage(error, '设备转移失败'));
    } finally {
      setSaving(false);
    }
  };

  const childColumns: ProColumns<AgentRow>[] = [
    {
      title: '代理名称',
      dataIndex: 'name',
      width: 170,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => setSelectedAgentId(String(record.id))}
        >
          {record.name}
        </Button>
      ),
    },
    { title: '代理编码', dataIndex: 'agentCode', width: 150 },
    {
      title: '级别',
      dataIndex: 'level',
      width: 72,
      render: (_, record) => `L${record.level}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '启用' : '停用'}
        </Tag>
      ),
    },
    { title: '账号数', dataIndex: 'accountCount', width: 72 },
    { title: '设备数', dataIndex: 'deviceCount', width: 72 },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      className: 'iot-action-cell',
      render: (_, record) => [
        access.canUpdateAgent && !isDirectAgent(record) ? (
          <Button
            key="edit"
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
        ) : null,
        access.canUpdateAgent && !isDirectAgent(record) ? (
          <Button
            key="move"
            type="link"
            size="small"
            icon={<SwapOutlined />}
            onClick={() => openMove(record)}
          >
            移动
          </Button>
        ) : null,
        access.canDisableAgent &&
        record.status === 1 &&
        !isDirectAgent(record) ? (
          <Popconfirm
            key="disable"
            title="确认停用这个代理？"
            description="停用只影响代理后台操作，不会断开设备连接。"
            okText="停用"
            cancelText="取消"
            onConfirm={() => void handleDisable(record)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              loading={saving}
            >
              停用
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer
      title="代理管理"
      subTitle="维护多级代理树、产品授权和设备当前归属；数据范围由后端按代理子树校验"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void loadAgents()}
        >
          刷新
        </Button>,
        access.canTransferDevice && (
          <Button key="transfer" icon={<SwapOutlined />} onClick={openTransfer}>
            设备转移
          </Button>
        ),
        access.canCreateAgent && (
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreate()}
          >
            新建代理
          </Button>
        ),
      ]}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 360px) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Card
          title="代理树"
          extra={
            access.canCreateAgent && selectedAgent ? (
              <Button
                type="link"
                size="small"
                icon={<FolderAddOutlined />}
                onClick={() => openCreate(selectedAgent.id)}
              >
                新建下级
              </Button>
            ) : undefined
          }
        >
          {loading && !agents.length ? (
            <Empty description="正在加载代理树" />
          ) : agents.length ? (
            <Tree
              blockNode
              defaultExpandAll
              selectedKeys={selectedAgentId ? [selectedAgentId] : []}
              treeData={treeData}
              onSelect={(keys) => {
                if (keys[0] !== undefined) setSelectedAgentId(String(keys[0]));
              }}
            />
          ) : (
            <Empty description="暂无代理节点" />
          )}
        </Card>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: '100%',
          }}
        >
          <Card
            title={selectedAgent ? '代理信息' : '请选择代理'}
            extra={
              selectedAgent ? (
                <Space>
                  {access.canUpdateAgent && (
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => openEdit(selectedAgent)}
                    >
                      编辑
                    </Button>
                  )}
                  {access.canUpdateAgent && !isDirectAgent(selectedAgent) && (
                    <Button
                      icon={<SwapOutlined />}
                      onClick={() => openMove(selectedAgent)}
                    >
                      移动
                    </Button>
                  )}
                  {access.canGrantAgentProducts && (
                    <Button
                      icon={<SafetyCertificateOutlined />}
                      onClick={() => void openProducts(selectedAgent)}
                    >
                      产品授权
                    </Button>
                  )}
                  {access.canDisableAgent &&
                    selectedAgent.status === 1 &&
                    !isDirectAgent(selectedAgent) && (
                      <Popconfirm
                        title="确认停用这个代理？"
                        description="停用前请确认下级代理和设备仍有明确的运营安排。"
                        okText="停用"
                        cancelText="取消"
                        onConfirm={() => void handleDisable(selectedAgent)}
                      >
                        <Button danger icon={<StopOutlined />} loading={saving}>
                          停用
                        </Button>
                      </Popconfirm>
                    )}
                </Space>
              ) : undefined
            }
          >
            {selectedAgent ? (
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="代理名称">
                  {selectedAgent.name}
                </Descriptions.Item>
                <Descriptions.Item label="代理编码">
                  <Typography.Text copyable>
                    {selectedAgent.agentCode}
                  </Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="代理级别">
                  L{selectedAgent.level}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={selectedAgent.status === 1 ? 'green' : 'default'}>
                    {selectedAgent.status === 1 ? '启用' : '停用'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="账号数">
                  {selectedAgent.accountCount}
                  {selectedAgent.accounts.length > 0 && (
                    <Typography.Text type="secondary">
                      {' '}
                      （
                      {selectedAgent.accounts
                        .slice(0, 5)
                        .map(
                          (account) =>
                            account.realName ||
                            account.username ||
                            String(account.id || ''),
                        )
                        .join('、')}
                      {selectedAgent.accounts.length > 5 ? '…' : ''}）
                    </Typography.Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="设备数">
                  {selectedAgent.deviceCount}
                  {selectedAgent.devices.length > 0 && (
                    <Typography.Text type="secondary">
                      {' '}
                      （
                      {selectedAgent.devices
                        .slice(0, 5)
                        .map((device) => device.name || device.deviceId)
                        .join('、')}
                      {selectedAgent.devices.length > 5 ? '…' : ''}）
                    </Typography.Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="上级代理" span="filled">
                  {selectedAgent.parentId === null
                    ? '平台直属'
                    : findAgent(agents, String(selectedAgent.parentId))?.name ||
                      String(selectedAgent.parentId)}
                </Descriptions.Item>
                <Descriptions.Item label="说明" span="filled">
                  {selectedAgent.description || '—'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Empty description="从左侧选择一个代理节点" />
            )}
          </Card>

          {selectedAgent && (
            <Card title={`下级代理（${selectedAgent.children.length}）`}>
              <ProTable<AgentRow>
                rowKey={(record) => String(record.id)}
                search={false}
                options={false}
                pagination={false}
                dataSource={selectedAgent.children}
                columns={childColumns}
                expandable={{
                  expandIcon: ({ expanded, onExpand, record }) =>
                    record.children.length ? (
                      <Button
                        type="text"
                        size="small"
                        shape="circle"
                        aria-label={
                          expanded
                            ? `收起${record.name}的下级代理`
                            : `展开${record.name}的下级代理`
                        }
                        icon={
                          <RightOutlined
                            rotate={expanded ? 90 : 0}
                            style={{ fontSize: 11 }}
                          />
                        }
                        onClick={(event) => onExpand(record, event)}
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          marginInlineEnd: 4,
                          color: expanded
                            ? token.colorPrimary
                            : token.colorTextTertiary,
                        }}
                      />
                    ) : (
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: 28,
                        }}
                      />
                    ),
                }}
                locale={{ emptyText: <Empty description="暂无下级代理" /> }}
              />
            </Card>
          )}
        </div>
      </div>

      <Modal
        title={agentModal?.mode === 'edit' ? '编辑代理' : '新建代理'}
        open={agentModal !== null}
        onOk={() => void submitAgent()}
        onCancel={() => setAgentModal(null)}
        confirmLoading={saving}
        forceRender
      >
        <Form form={agentForm} layout="vertical">
          {agentModal?.mode === 'create' && (
            <Form.Item
              name="agentCode"
              label="代理编码"
              rules={[
                { required: true, whitespace: true, max: 64 },
                {
                  pattern: /^[A-Za-z][A-Za-z0-9_-]*$/,
                  message: '使用字母开头的字母、数字、下划线或短横线',
                },
              ]}
            >
              <Input placeholder="例如：east-channel" />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="代理名称"
            rules={[{ required: true, whitespace: true, max: 128 }]}
          >
            <Input placeholder="请输入代理名称" />
          </Form.Item>
          {agentModal?.mode === 'create' && (
            <Form.Item name="parentId" label="上级代理">
              <Select
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                options={agentOptions}
                placeholder="不选择表示平台直属"
              />
            </Form.Item>
          )}
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} maxLength={512} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`移动代理：${moveModalAgent?.name || ''}`}
        open={moveModalAgent !== undefined}
        onOk={() => void submitMove()}
        onCancel={() => setMoveModalAgent(undefined)}
        confirmLoading={saving}
        forceRender
      >
        <Form form={moveForm} layout="vertical">
          <Form.Item
            name="parentId"
            label="新的上级代理"
            extra="不能选择当前代理或其下级节点，后端也会再次校验代理树不能成环。"
          >
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              options={moveOptions}
              placeholder="不选择表示移动到平台直属"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`产品授权：${productsModalAgent?.name || ''}`}
        open={productsModalAgent !== undefined}
        onOk={() => void submitProducts()}
        onCancel={() => setProductsModalAgent(undefined)}
        confirmLoading={saving || productsLoading}
        destroyOnHidden
      >
        <Select
          mode="multiple"
          showSearch={{ optionFilterProp: 'label' }}
          style={{ width: '100%' }}
          loading={productsLoading}
          value={grantedProductIds}
          options={allProducts.map((product) => ({
            value: product.id,
            label: `${product.name}（${product.productKey}）`,
          }))}
          placeholder="选择可由该代理及下级使用的产品"
          onChange={(values) => setGrantedProductIds(values.map(Number))}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          产品授权会沿代理树向下继承；撤销授权前请确认下级设备使用情况，最终以服务端校验结果为准。
        </Typography.Paragraph>
      </Modal>

      <Modal
        title="设备转移"
        open={transferModalOpen}
        onOk={() => void submitTransfer()}
        onCancel={() => setTransferModalOpen(false)}
        confirmLoading={saving}
        forceRender
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item
            name="deviceId"
            label="设备 ID"
            rules={[
              { required: true, whitespace: true, message: '请输入设备 ID' },
            ]}
          >
            <Input placeholder="请输入需要转移的设备 ID" />
          </Form.Item>
          <Form.Item
            name="targetAgentId"
            label="目标代理"
            rules={[{ required: true, message: '请选择目标代理' }]}
          >
            <Select
              showSearch={{ optionFilterProp: 'label' }}
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
        <Typography.Paragraph type="secondary">
          转移只更新设备当前归属，不修改设备凭证、Topic 或 MQTT Client
          ID；旧代理将失去该设备的当前数据访问权。
        </Typography.Paragraph>
      </Modal>
    </PageContainer>
  );
};

const flattenAgentRows = (agent: AgentRow): AgentRow[] => [
  agent,
  ...agent.children.flatMap((child) => flattenAgentRows(child)),
];

export default AgentManagement;
