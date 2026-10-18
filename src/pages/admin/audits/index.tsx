import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
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
import { type AuditLogRecord, pageAuditLogs } from '@/services/iot/audit';

const categoryOptions = [
  { label: '操作审计', value: 'AUDIT' },
  { label: '安全审计', value: 'SECURITY' },
];

const outcomeOptions = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILURE' },
  { label: '拒绝', value: 'DENIED' },
];

const categoryLabels: Record<string, string> = {
  AUDIT: '操作审计',
  SECURITY: '安全审计',
};

const outcomeLabels: Record<string, string> = {
  SUCCESS: '成功',
  FAILURE: '失败',
  DENIED: '拒绝',
};

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

function outcomeColor(value: string) {
  if (value === 'SUCCESS') return 'green';
  if (value === 'DENIED') return 'orange';
  return 'red';
}

function actorLabel(record: AuditLogRecord) {
  return (
    record.operatorUsername ||
    record.actorName ||
    (record.actorId ? `用户 #${record.actorId}` : record.actorType)
  );
}

const AdminAuditsPage = () => {
  const access = useAccess();
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [eventCategory, setEventCategory] = useState<string>();
  const [actionCode, setActionCode] = useState<string>();
  const [outcome, setOutcome] = useState<string>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AuditLogRecord>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pageAuditLogs({
        page,
        size: 20,
        keyword: keyword || undefined,
        eventCategory,
        actionCode,
        outcome,
      });
      setRows(result.list);
      setTotal(result.total);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : '统一审计加载失败',
      );
    } finally {
      setLoading(false);
    }
  }, [actionCode, eventCategory, keyword, outcome, page]);

  useEffect(() => {
    if (access.canViewAdminAudits) void loadData();
  }, [access.canViewAdminAudits, loadData]);

  const columns: ColumnsType<AuditLogRecord> = [
    {
      title: '时间',
      dataIndex: 'occurredAt',
      width: 170,
      fixed: 'left',
      render: (value: string) => formatTime(value),
    },
    {
      title: '类别',
      dataIndex: 'eventCategory',
      width: 110,
      render: (value: string) => (
        <Tag color={value === 'SECURITY' ? 'orange' : 'blue'}>
          {categoryLabels[value] || value}
        </Tag>
      ),
    },
    {
      title: '服务',
      dataIndex: 'serviceName',
      width: 190,
      ellipsis: true,
    },
    {
      title: '动作',
      dataIndex: 'actionCode',
      width: 210,
      ellipsis: true,
    },
    {
      title: '操作人',
      width: 140,
      render: (_, record) => actorLabel(record),
    },
    {
      title: '目标',
      width: 180,
      ellipsis: true,
      render: (_, record) => {
        const target = `${record.targetType || '-'} / ${record.targetId || '-'}`;
        return (
          <Typography.Text ellipsis={{ tooltip: target }}>
            {target}
          </Typography.Text>
        );
      },
    },
    {
      title: '结果',
      dataIndex: 'outcome',
      width: 90,
      render: (value: string) => (
        <Tag color={outcomeColor(value)}>{outcomeLabels[value] || value}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'operation',
      width: 96,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelected(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="统一审计"
      subTitle="统一查看管理操作、跨服务调用和安全拒绝事件，支持按 requestId 关联检索"
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
            placeholder="搜索动作、目标或 requestId"
            style={{ width: 300 }}
            onSearch={(value) => {
              setKeyword(value);
              setPage(1);
            }}
          />
          <Input.Search
            allowClear
            placeholder="动作编码"
            style={{ width: 190 }}
            onSearch={(value) => {
              setActionCode(value || undefined);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="事件类别"
            style={{ width: 140 }}
            options={categoryOptions}
            value={eventCategory}
            onChange={(value) => {
              setEventCategory(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="处理结果"
            style={{ width: 130 }}
            options={outcomeOptions}
            value={outcome}
            onChange={(value) => {
              setOutcome(value);
              setPage(1);
            }}
          />
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          tableLayout="fixed"
          scroll={{ x: 1200 }}
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
        size={720}
        open={selected !== undefined}
        onClose={() => setSelected(undefined)}
      >
        {selected && (
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="记录 ID">
                {selected.id}
              </Descriptions.Item>
              <Descriptions.Item label="事件 ID">
                {selected.eventId}
              </Descriptions.Item>
              <Descriptions.Item label="发生时间">
                {formatTime(selected.occurredAt)}
              </Descriptions.Item>
              <Descriptions.Item label="事件类别">
                {categoryLabels[selected.eventCategory] ||
                  selected.eventCategory}
              </Descriptions.Item>
              <Descriptions.Item label="来源服务">
                {selected.serviceName}
              </Descriptions.Item>
              <Descriptions.Item label="动作编码">
                {selected.actionCode}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                {actorLabel(selected)}
              </Descriptions.Item>
              <Descriptions.Item label="代理范围">
                {selected.agentName
                  ? `${selected.agentName}${selected.agentCode ? `（${selected.agentCode}）` : ''}`
                  : '平台范围'}
              </Descriptions.Item>
              <Descriptions.Item label="目标">
                {selected.targetType || '-'} / {selected.targetId || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="处理结果">
                <Tag color={outcomeColor(selected.outcome)}>
                  {outcomeLabels[selected.outcome] || selected.outcome}
                </Tag>
                {selected.errorCode ? ` ${selected.errorCode}` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="requestId">
                <Typography.Text copyable={!!selected.requestId}>
                  {selected.requestId || '-'}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="来源 IP">
                {selected.sourceIp || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="User-Agent">
                {selected.userAgent || '-'}
              </Descriptions.Item>
            </Descriptions>
            {[
              ['变更前', selected.beforeJson],
              ['变更后', selected.afterJson],
              ['扩展详情', selected.detailJson],
            ].map(([label, value]) => (
              <div key={label}>
                <Typography.Text strong>{label}</Typography.Text>
                <Typography.Paragraph
                  copyable={value ? { text: value } : false}
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  <Typography.Text code>{formatJson(value)}</Typography.Text>
                </Typography.Paragraph>
              </div>
            ))}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default AdminAuditsPage;
