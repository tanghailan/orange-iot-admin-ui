import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  InboxOutlined,
  ReloadOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import type { FC, ReactNode } from 'react';
import {
  getMqttStreamBacklog,
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
        icon: <WarningOutlined />,
      };
    default:
      return {
        label: level || '未知',
        type: 'info',
        tagColor: 'default',
        icon: <ApiOutlined />,
      };
  }
}

function formatCheckedAt(value?: string | null) {
  return value ? value.replace('T', ' ') : '暂无时间信息';
}

const MqttMonitor: FC = () => {
  const backlogQuery = useQuery({
    queryKey: ['mqtt-stream-backlog'],
    queryFn: getMqttStreamBacklog,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const backlog = backlogQuery.data;
  const alertState = backlog ? getAlertState(backlog.alertLevel) : undefined;
  const errorMessage =
    backlogQuery.error instanceof Error
      ? backlogQuery.error.message
      : '暂时无法获取 MQTT Stream 积压数据，请稍后重试。';

  const renderMetric = (
    title: string,
    value: number,
    icon: ReactNode,
    color: string,
    note?: string,
  ) => (
    <Card
      loading={backlogQuery.isLoading}
      style={{ height: '100%', borderRadius: 10 }}
      bodyStyle={{ padding: '20px 22px' }}
    >
      <Statistic
        title={title}
        value={value}
        prefix={<span style={{ color, marginRight: 4 }}>{icon}</span>}
        valueStyle={{ color: '#172b4d', fontSize: 28, fontWeight: 600 }}
      />
      {note && (
        <Typography.Text
          type="secondary"
          style={{ display: 'block', marginTop: 8 }}
        >
          {note}
        </Typography.Text>
      )}
    </Card>
  );

  const renderSnapshot = (data: MqttStreamBacklog) => (
    <>
      {alertState && (
        <Alert
          type={alertState.type}
          showIcon
          icon={alertState.icon}
          message={
            <Space wrap>
              <span>Stream 处理状态</span>
              <Tag color={alertState.tagColor}>{alertState.label}</Tag>
            </Space>
          }
          description={data.alertMessage || '当前快照没有附带告警说明。'}
          style={{ borderRadius: 8 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={8}>
          {renderMetric(
            '待处理消息',
            data.pendingCount,
            <InboxOutlined />,
            data.pendingCount > 0 ? '#c47b24' : '#2b8a68',
            '已投递给消费者但尚未确认',
          )}
        </Col>
        <Col xs={24} sm={12} xl={8}>
          {renderMetric(
            'Stream 条目',
            data.streamLength,
            <DatabaseOutlined />,
            '#3978c5',
            '包含尚未裁剪的已确认历史',
          )}
        </Col>
        <Col xs={24} sm={12} xl={8}>
          {renderMetric(
            '消费组消费者',
            data.consumerCount,
            <TeamOutlined />,
            '#3978c5',
            '当前消费组内的消费者数量',
          )}
        </Col>
      </Row>

      <Card
        title="Stream 快照信息"
        style={{ borderRadius: 10 }}
        bodyStyle={{ padding: '8px 22px 18px' }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Typography.Text type="secondary">Stream Key</Typography.Text>
            <Typography.Text
              copyable={Boolean(data.streamKey)}
              style={{
                display: 'block',
                marginTop: 5,
                overflowWrap: 'anywhere',
              }}
            >
              {data.streamKey || '未配置'}
            </Typography.Text>
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text type="secondary">消费组</Typography.Text>
            <Typography.Text
              copyable={Boolean(data.streamGroup)}
              style={{
                display: 'block',
                marginTop: 5,
                overflowWrap: 'anywhere',
              }}
            >
              {data.streamGroup || '未配置'}
            </Typography.Text>
          </Col>
          <Col xs={24}>
            <Space size={8}>
              <ClockCircleOutlined style={{ color: '#66788a' }} />
              <Typography.Text type="secondary">快照时间</Typography.Text>
              <Typography.Text>
                {formatCheckedAt(data.checkedAt)}
              </Typography.Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </>
  );

  return (
    <PageContainer
      title="MQTT 监控"
      subTitle="Redis Stream 消费积压与处理状态"
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
            message={
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
            <Empty description="监控接口暂未返回 Stream 快照" />
          </Card>
        )}

        {backlogQuery.isLoading && (
          <Row gutter={[16, 16]}>
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Col key={item} xs={24} sm={12} xl={8}>
                <Card loading style={{ height: 126, borderRadius: 10 }} />
              </Col>
            ))}
          </Row>
        )}

        <Typography.Paragraph
          type="secondary"
          style={{ margin: 0, fontSize: 12 }}
        >
          页面由 Admin 直接读取共享 Redis，无需 Core 在线。消费组消费者数是
          Redis 登记数量；Stream
          条目数包含未裁剪的已确认历史，不能直接视为待处理消息数。每 30
          秒自动刷新。
        </Typography.Paragraph>
      </Space>
    </PageContainer>
  );
};

export default MqttMonitor;
