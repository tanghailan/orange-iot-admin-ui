import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import {
  type AgentAuditLogRecord,
  pageAgentAuditLogs,
} from '@/services/iot/agentAudit';

const operationOptions = [
  { label: '创建代理', value: 'CREATE' },
  { label: '编辑代理', value: 'UPDATE' },
  { label: '移动代理', value: 'MOVE' },
  { label: '启用代理', value: 'ENABLE' },
  { label: '停用代理', value: 'DISABLE' },
  { label: '产品授权', value: 'GRANT_PRODUCT' },
  { label: '绑定账号', value: 'BIND_USER' },
  { label: '转移设备', value: 'TRANSFER_DEVICE' },
];

const targetOptions = [
  { label: '代理', value: 'AGENT' },
  { label: '账号', value: 'USER' },
  { label: '设备', value: 'DEVICE' },
];

function formatTime(value?: string) {
  return value ? value.replace('T', ' ') : '-';
}

function formatJson(value?: string) {
  if (!value) return '-';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

const AgentAuditPage = () => {
  const access = useAccess();
  const [rows, setRows] = useState<AgentAuditLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [operationType, setOperationType] = useState<string>();
  const [targetType, setTargetType] = useState<string>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AgentAuditLogRecord>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pageAgentAuditLogs({
        page,
        size: 20,
        keyword: keyword || undefined,
        operationType,
        targetType,
      });
      setRows(result.list);
      setTotal(result.total);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '代理审计加载失败',
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, operationType, page, targetType]);

  useEffect(() => {
    if (access.canViewAgentAudits) void loadData();
  }, [access.canViewAgentAudits, loadData]);

  const columns: ColumnsType<AgentAuditLogRecord> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => formatTime(value),
    },
    {
      title: '操作人',
      dataIndex: 'operatorUsername',
      width: 140,
      render: (value: string, record) =>
        value || `用户 #${record.operatorUserId}`,
    },
    {
      title: '代理范围',
      dataIndex: 'agentName',
      width: 190,
      render: (value: string, record) =>
        value ? (
          <Tag color="cyan">
            {value}
            {record.agentCode ? `（${record.agentCode}）` : ''}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      dataIndex: 'operationType',
      width: 120,
      render: (value: string) =>
        operationOptions.find((option) => option.value === value)?.label ||
        value,
    },
    {
      title: '对象',
      width: 150,
      render: (_, record) => `${record.targetType} / ${record.targetId || '-'}`,
    },
    {
      title: '详情',
      width: 90,
      render: (_, record) => (
        <Button type="link" onClick={() => setSelected(record)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="代理审计"
      subTitle="追踪代理树、账号绑定、产品授权和设备转移等关键变更"
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void loadData()}
        >
          刷新
        </Button>
      }
    >
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            placeholder="搜索对象 ID、操作或对象类型"
            style={{ width: 280 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="操作类型"
            style={{ width: 150 }}
            options={operationOptions}
            value={operationType}
            onChange={(value) => {
              setOperationType(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="对象类型"
            style={{ width: 140 }}
            options={targetOptions}
            value={targetType}
            onChange={(value) => {
              setTargetType(value);
              setPage(1);
            }}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showTotal: (value) => `共 ${value} 条审计记录`,
            onChange: setPage,
          }}
        />
      </Card>
      <Drawer
        title="审计详情"
        width={620}
        open={selected !== undefined}
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="记录 ID">
                {selected.id}
              </Descriptions.Item>
              <Descriptions.Item label="操作时间">
                {formatTime(selected.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {selected.operatorUsername ||
                  `用户 #${selected.operatorUserId}`}
              </Descriptions.Item>
              <Descriptions.Item label="代理范围">
                {selected.agentName || '平台范围'}
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {operationOptions.find(
                  (option) => option.value === selected.operationType,
                )?.label || selected.operationType}
              </Descriptions.Item>
              <Descriptions.Item label="目标">
                {selected.targetType} / {selected.targetId || '-'}
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Text strong>变更前</Typography.Text>
              <Typography.Paragraph
                copyable={
                  selected.beforeJson ? { text: selected.beforeJson } : false
                }
                style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                <Typography.Text code>
                  {formatJson(selected.beforeJson)}
                </Typography.Text>
              </Typography.Paragraph>
            </div>
            <div>
              <Typography.Text strong>变更后</Typography.Text>
              <Typography.Paragraph
                copyable={
                  selected.afterJson ? { text: selected.afterJson } : false
                }
                style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
              >
                <Typography.Text code>
                  {formatJson(selected.afterJson)}
                </Typography.Text>
              </Typography.Paragraph>
            </div>
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default AgentAuditPage;
