import {
  ApiOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Statistic, Typography } from 'antd';
import type { FC } from 'react';
import { getManagementStatsSnapshot } from '@/services/iot/monitor';

const formatUpdateTime = (timestamp: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const IoTDashboard: FC = () => {
  const managementQuery = useQuery({
    queryKey: ['iot-stats-management'],
    queryFn: getManagementStatsSnapshot,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const management = managementQuery.data;
  const updatedAt = managementQuery.dataUpdatedAt;

  return (
    <PageContainer
      title="IoT 管理概览"
      subTitle="产品与设备规模"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          loading={managementQuery.isFetching}
          onClick={() => void managementQuery.refetch()}
        >
          刷新
        </Button>,
      ]}
    >
      {managementQuery.isError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="管理统计暂不可用"
          description="无法读取产品和设备总数，请检查 Admin 服务及数据库连接。"
          action={
            <Button size="small" onClick={() => void managementQuery.refetch()}>
              重试
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card
            loading={managementQuery.isLoading}
            style={{ height: '100%', borderRadius: 10 }}
          >
            <Statistic
              title="产品总数"
              value={management?.productTotal ?? '--'}
              prefix={
                <AppstoreOutlined
                  style={{ color: '#3978c5', marginRight: 4 }}
                />
              }
              valueStyle={{ color: '#172b4d', fontSize: 28, fontWeight: 600 }}
            />
            <Typography.Text
              type="secondary"
              style={{ display: 'block', marginTop: 8 }}
            >
              Admin 管理数据
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card
            loading={managementQuery.isLoading}
            style={{ height: '100%', borderRadius: 10 }}
          >
            <Statistic
              title="设备总数"
              value={management?.deviceTotal ?? '--'}
              prefix={
                <ApiOutlined style={{ color: '#3978c5', marginRight: 4 }} />
              }
              valueStyle={{ color: '#172b4d', fontSize: 28, fontWeight: 600 }}
            />
            <Typography.Text
              type="secondary"
              style={{ display: 'block', marginTop: 8 }}
            >
              Admin 管理数据
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Typography.Text
        type="secondary"
        style={{ display: 'block', marginTop: 16, fontSize: 12 }}
      >
        自动刷新间隔 30 秒
        {updatedAt ? ` · 最近刷新 ${formatUpdateTime(updatedAt)}` : ''}
      </Typography.Text>
    </PageContainer>
  );
};

export default IoTDashboard;
