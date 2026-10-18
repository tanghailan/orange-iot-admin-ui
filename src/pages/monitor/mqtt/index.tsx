import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  FireOutlined,
  InboxOutlined,
  MessageOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { FC, ReactNode } from 'react';
import {
  getMqttStreamBacklog,
  type MqttInstanceMetric,
  type MqttStreamBacklog,
} from '@/services/iot/monitor';

type AlertState = {
  label: string;
  type: 'success' | 'warning' | 'error' | 'info';
  tagColor: string;
  icon: ReactNode;
};

function getAlertState(level?: string): AlertState {
  switch (level?.toUpperCase()) {
    case 'OK':
      return {
        label: '正常',
        type: 'success',
        tagColor: 'green',
        icon: <CheckCircleOutlined />,
      };
    case 'WARN':
      return {
        label: '需要关注',
        type: 'warning',
        tagColor: 'orange',
        icon: <WarningOutlined />,
      };
    case 'CRITICAL':
      return {
        label: '需要处理',
        type: 'error',
        tagColor: 'red',
        icon: <CloseCircleOutlined />,
      };
    default:
      return {
        label: level || '未知',
        type: 'info',
        tagColor: 'default',
        icon: <ThunderboltOutlined />,
      };
  }
}

function formatCheckedAt(value?: string | null) {
  return value ? value.replace('T', ' ') : '暂无时间信息';
}

function formatNumber(value?: number) {
  const number = value != null && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('zh-CN').format(number);
}

function formatRate(value?: number) {
  const rate = value != null && Number.isFinite(value) ? value : 0;
  return `${rate.toFixed(rate >= 10 ? 0 : 1)} 条/秒`;
}

function formatBytes(value?: number) {
  const bytes = value != null && Number.isFinite(value) ? value : 0;
  if (bytes < 1024) {
    return `${formatNumber(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatBytesPerSecond(value?: number) {
  return `${formatBytes(value)}/秒`;
}

const metricSkeletonKeys = [
  'broker',
  'online-devices',
  'received-rate',
  'published-rate',
  'pending',
  'stream',
  'consumers',
  'batch-buffer',
  'processed',
  'processing-failed',
  'dead-letter',
  'retry-buffer',
];

const MqttMonitor: FC = () => {
  const backlogQuery = useQuery({
    queryKey: ['mqtt-stream-backlog'],
    queryFn: getMqttStreamBacklog,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const backlog = backlogQuery.data;
  const alertState = backlog ? getAlertState(backlog.alertLevel) : undefined;
  const errorMessage =
    backlogQuery.error instanceof Error
      ? backlogQuery.error.message
      : '暂时无法获取 MQTT 监控数据，请稍后重试。';

  const renderMetric = (
    title: string,
    value: number,
    icon: ReactNode,
    color: string,
    note?: string,
    formatter?: (value: number) => string,
  ) => (
    <Card
      loading={backlogQuery.isLoading}
      style={{ height: '100%', borderRadius: 10 }}
      styles={{ body: { padding: '18px 20px' } }}
    >
      <Statistic
        title={title}
        value={value}
        formatter={(currentValue) => {
          const number = Number(currentValue);
          const safeNumber = Number.isFinite(number) ? number : 0;
          return formatter ? formatter(safeNumber) : formatNumber(safeNumber);
        }}
        prefix={<span style={{ color, marginRight: 4 }}>{icon}</span>}
        styles={{
          content: { color: '#172b4d', fontSize: 26, fontWeight: 600 },
        }}
      />
      {note && (
        <Typography.Text
          type="secondary"
          style={{ display: 'block', marginTop: 8, fontSize: 12 }}
        >
          {note}
        </Typography.Text>
      )}
    </Card>
  );

  const renderSnapshot = (data: MqttStreamBacklog) => {
    const instanceColumns = [
      {
        title: 'Core 实例',
        dataIndex: 'instanceId',
        key: 'instanceId',
        render: (value: string, record: MqttInstanceMetric) => (
          <Space orientation="vertical" size={0}>
            <Typography.Text strong>{value || '未知实例'}</Typography.Text>
            <Typography.Text type="secondary" ellipsis>
              {record.clientId || '未连接'}
            </Typography.Text>
            <Typography.Text type="secondary">
              {record.connectedAt
                ? `连接于 ${formatCheckedAt(record.connectedAt)}`
                : '暂无连接记录'}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Broker',
        dataIndex: 'connected',
        key: 'connected',
        render: (connected: boolean) => (
          <Tag color={connected ? 'green' : 'red'}>
            {connected ? '已连接' : '未连接'}
          </Tag>
        ),
      },
      {
        title: 'CPU',
        dataIndex: 'systemCpuUsagePercent',
        key: 'systemCpuUsagePercent',
        render: (value: number) => {
          const usage = value != null && Number.isFinite(value) ? value : -1;
          return usage < 0 ? '不支持' : `${usage.toFixed(1)}%`;
        },
      },
      {
        title: 'JVM 堆',
        dataIndex: 'jvmHeapUsedBytes',
        key: 'jvmHeapUsedBytes',
        render: (value: number, record: MqttInstanceMetric) =>
          `${formatBytes(value)} / ${formatBytes(record.jvmHeapMaxBytes)}`,
      },
      {
        title: '线程数',
        dataIndex: 'threadCount',
        key: 'threadCount',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '上行速率',
        dataIndex: 'receivedRatePerSecond',
        key: 'receivedRatePerSecond',
        render: (value: number) => formatRate(value),
      },
      {
        title: '处理速率',
        dataIndex: 'processedRatePerSecond',
        key: 'processedRatePerSecond',
        render: (value: number) => formatRate(value),
      },
      {
        title: '本周期平均处理耗时',
        dataIndex: 'averageProcessingTimeMillis',
        key: 'averageProcessingTimeMillis',
        render: (value: number) => `${(value ?? 0).toFixed(1)} ms`,
      },
      {
        title: '落库缓冲',
        dataIndex: 'messageBatchBufferSize',
        key: 'messageBatchBufferSize',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '重试缓冲',
        dataIndex: 'retryBufferSize',
        key: 'retryBufferSize',
        render: (value: number) => formatNumber(value),
      },
      {
        title: '更新时间',
        dataIndex: 'snapshotAt',
        key: 'snapshotAt',
        render: (value: string | null) => formatCheckedAt(value),
      },
    ];

    return (
      <>
        {alertState && (
          <Alert
            type={alertState.type}
            showIcon
            icon={alertState.icon}
            title={
              <Space wrap>
                <span>MQTT 处理状态</span>
                <Tag color={alertState.tagColor}>{alertState.label}</Tag>
              </Space>
            }
            description={data.alertMessage || '当前快照没有附带告警说明。'}
            style={{ borderRadius: 8 }}
          />
        )}

        <Typography.Title level={5} style={{ margin: '4px 0 -4px' }}>
          连接与吞吐
        </Typography.Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              'Broker 连接',
              data.connectedInstanceCount,
              <CloudServerOutlined />,
              data.brokerConnected ? '#2b8a68' : '#d64545',
              `${formatNumber(data.coreInstanceCount)} 个 Core 实例`,
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '在线设备',
              data.onlineDeviceCount,
              <TeamOutlined />,
              '#3978c5',
              '由 Core 连接事件维护',
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '上行速率',
              data.receivedRatePerSecond,
              <ArrowUpOutlined />,
              '#3978c5',
              `${formatBytesPerSecond(data.receivedBytesPerSecond)} · 累计 ${formatNumber(data.receivedCount)} 条 / ${formatBytes(data.receivedBytes)}`,
              formatRate,
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '下行速率',
              data.publishedRatePerSecond,
              <ArrowDownOutlined />,
              '#8d63c7',
              `${formatBytesPerSecond(data.publishedBytesPerSecond)} · 累计 ${formatNumber(data.publishedCount)} 条 / ${formatBytes(data.publishedBytes)}`,
              formatRate,
            )}
          </Col>
        </Row>

        <Typography.Title level={5} style={{ margin: '12px 0 -4px' }}>
          队列与消费
        </Typography.Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '待处理消息',
              data.pendingCount,
              <InboxOutlined />,
              data.pendingCount > 0 ? '#c47b24' : '#2b8a68',
              data.pendingCount > 0
                ? `最早一条已等待 ${formatNumber(data.oldestPendingAgeSeconds)} 秒`
                : '已投递但尚未确认的消息',
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              'Stream 条目',
              data.streamLength,
              <DatabaseOutlined />,
              '#3978c5',
              '包含尚未裁剪的已确认历史',
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '消费组消费者',
              data.consumerCount,
              <NodeIndexOutlined />,
              '#3978c5',
              `${formatNumber(data.workerCount)} 个 Core Worker`,
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '落库缓冲',
              data.messageBatchBufferSize,
              <MessageOutlined />,
              data.messageBatchBufferSize > 0 ? '#c47b24' : '#2b8a68',
              '等待批量写入数据库的消息',
            )}
          </Col>
        </Row>

        <Typography.Title level={5} style={{ margin: '12px 0 -4px' }}>
          处理质量
        </Typography.Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '已处理消息',
              data.processedCount,
              <CheckCircleOutlined />,
              '#2b8a68',
              `处理速率 ${formatRate(data.processedRatePerSecond)} · 平均耗时 ${Number(data.averageProcessingTimeMillis ?? 0).toFixed(1)} ms`,
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '处理失败',
              data.processingFailedCount,
              <WarningOutlined />,
              data.processingFailedRatePerSecond > 0 ? '#d64545' : '#2b8a68',
              `本周期 ${formatRate(data.processingFailedRatePerSecond)} · Stream 写入失败累计 ${formatNumber(data.rejectedCount)}`,
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '死信消息',
              data.deadLetterCount,
              <FireOutlined />,
              data.deadLetterCount > 0 ? '#d64545' : '#2b8a68',
              `死信 Stream 记录 · 下行发布失败 ${formatNumber(data.publishFailedCount)} 条`,
            )}
          </Col>
          <Col xs={24} sm={12} xl={6}>
            {renderMetric(
              '重试缓冲',
              data.retryBufferSize,
              <ThunderboltOutlined />,
              data.retryBufferSize > 0 ? '#c47b24' : '#2b8a68',
              `已恢复 ${formatNumber(data.retryRecoveredCount)} 条`,
            )}
          </Col>
        </Row>

        <Card
          title="Core 实例健康"
          style={{ borderRadius: 10 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table<MqttInstanceMetric>
            rowKey="instanceId"
            size="middle"
            pagination={false}
            dataSource={data.instances ?? []}
            columns={instanceColumns}
            locale={{ emptyText: <Empty description="暂无 Core 实例快照" /> }}
            scroll={{ x: 1260 }}
          />
        </Card>

        <Card
          title="MQTT 运行快照"
          style={{ borderRadius: 10 }}
          styles={{ body: { padding: '8px 22px 18px' } }}
        >
          <Descriptions
            column={{ xs: 1, sm: 2, md: 3 }}
            size="small"
            items={[
              {
                key: 'stream',
                label: 'Stream Key',
                children: (
                  <Typography.Text copyable={Boolean(data.streamKey)}>
                    {data.streamKey || '未配置'}
                  </Typography.Text>
                ),
              },
              {
                key: 'group',
                label: '消费组',
                children: (
                  <Typography.Text copyable={Boolean(data.streamGroup)}>
                    {data.streamGroup || '未配置'}
                  </Typography.Text>
                ),
              },
              {
                key: 'workers',
                label: 'Core Worker',
                children: formatNumber(data.workerCount),
              },
              {
                key: 'connection',
                label: '连接成功/断开',
                children: `${formatNumber(data.connectCount)} / ${formatNumber(data.disconnectCount)}`,
              },
              {
                key: 'connectionFailure',
                label: '连接/订阅失败',
                children: `${formatNumber(data.connectionFailureCount)} / ${formatNumber(data.subscriptionFailureCount)}`,
              },
              {
                key: 'lastMetricAt',
                label: '指标更新时间',
                children: (
                  <Space size={6}>
                    <ClockCircleOutlined />
                    {formatCheckedAt(data.lastMetricAt)}
                  </Space>
                ),
              },
              {
                key: 'checkedAt',
                label: '页面快照时间',
                children: (
                  <Space size={6}>
                    <ClockCircleOutlined />
                    {formatCheckedAt(data.checkedAt)}
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </>
    );
  };

  return (
    <PageContainer
      title="MQTT 监控"
      subTitle="连接状态、消息吞吐、队列积压与 Core 实例健康"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={backlogQuery.isFetching}
          onClick={() => backlogQuery.refetch()}
        >
          刷新
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ display: 'flex' }}>
        {backlogQuery.isError && (
          <Alert
            type={backlog ? 'warning' : 'error'}
            showIcon
            title={
              backlog
                ? '刷新失败，当前展示的是上次成功获取的数据'
                : 'MQTT 监控数据加载失败'
            }
            description={errorMessage}
            action={
              <Button
                size="small"
                onClick={() => backlogQuery.refetch()}
                loading={backlogQuery.isFetching}
              >
                重试
              </Button>
            }
          />
        )}

        {backlog && renderSnapshot(backlog)}

        {!backlogQuery.isLoading && !backlogQuery.isError && !backlog && (
          <Card style={{ borderRadius: 10 }}>
            <Empty description="监控接口暂未返回快照" />
          </Card>
        )}

        {backlogQuery.isLoading && (
          <Row gutter={[16, 16]}>
            {metricSkeletonKeys.map((key) => (
              <Col key={key} xs={24} sm={12} xl={6}>
                <Card loading style={{ height: 126, borderRadius: 10 }} />
              </Col>
            ))}
          </Row>
        )}

        <Typography.Paragraph
          type="secondary"
          style={{ margin: 0, fontSize: 12 }}
        >
          Core 每 15 秒将实例心跳和累计指标写入共享 Redis，Admin 聚合后展示；
          高频 MQTT 报文不直接写入监控表。页面每 15 秒刷新一次，Stream
          条目数包含 未裁剪的已确认历史，排查积压优先看待处理消息和处理失败。
        </Typography.Paragraph>
      </Space>
    </PageContainer>
  );
};

export default MqttMonitor;
