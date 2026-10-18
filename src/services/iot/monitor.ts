import { request } from '@umijs/max';

type AdminApiResponse<T> = {
  code: number;
  message?: string;
  data: T | null;
  requestId?: string;
};

export type ManagementStats = {
  deviceTotal: number;
  productTotal: number;
};

export type MqttStreamBacklog = {
  streamKey: string;
  streamGroup: string;
  streamLength: number;
  pendingCount: number;
  oldestPendingAgeSeconds: number;
  consumerCount: number;
  deadLetterCount: number;
  messageBatchBufferSize: number;
  processedCount: number;
  rejectedCount: number;
  retryBufferSize: number;
  retryQueuedCount: number;
  retryRecoveredCount: number;
  receivedCount: number;
  receivedBytes: number;
  publishedCount: number;
  publishedBytes: number;
  publishFailedCount: number;
  connectCount: number;
  disconnectCount: number;
  connectionFailureCount: number;
  subscriptionFailureCount: number;
  processingFailedCount: number;
  onlineDeviceCount: number;
  coreInstanceCount: number;
  connectedInstanceCount: number;
  workerCount: number;
  receivedRatePerSecond: number;
  processedRatePerSecond: number;
  publishedRatePerSecond: number;
  receivedBytesPerSecond: number;
  publishedBytesPerSecond: number;
  processingFailedRatePerSecond: number;
  publishFailedRatePerSecond: number;
  connectionFailureRatePerSecond: number;
  subscriptionFailureRatePerSecond: number;
  deadLetterRatePerSecond: number;
  rejectedRatePerSecond: number;
  averageProcessingTimeMillis: number;
  brokerConnected: boolean;
  lastMetricAt: string | null;
  instances: MqttInstanceMetric[];
  alertLevel: string;
  alertMessage: string;
  checkedAt: string | null;
};

export type MqttInstanceMetric = {
  instanceId: string;
  clientId: string;
  connected: boolean;
  connectedAt: string | null;
  receivedCount: number;
  receivedBytes: number;
  streamEnqueuedCount: number;
  processedCount: number;
  processedIntervalCount: number;
  receivedRatePerSecond: number;
  receivedBytesPerSecond: number;
  processedRatePerSecond: number;
  publishedRatePerSecond: number;
  publishedBytesPerSecond: number;
  processingFailedRatePerSecond: number;
  publishFailedRatePerSecond: number;
  connectionFailureRatePerSecond: number;
  subscriptionFailureRatePerSecond: number;
  deadLetterRatePerSecond: number;
  rejectedRatePerSecond: number;
  averageProcessingTimeMillis: number;
  publishedCount: number;
  publishedBytes: number;
  publishFailedCount: number;
  connectCount: number;
  disconnectCount: number;
  connectionFailureCount: number;
  subscriptionFailureCount: number;
  processingFailedCount: number;
  rejectedCount: number;
  retryQueuedCount: number;
  retryRecoveredCount: number;
  messageBatchBufferSize: number;
  retryBufferSize: number;
  workerCount: number;
  systemCpuUsagePercent: number;
  jvmHeapUsedBytes: number;
  jvmHeapMaxBytes: number;
  threadCount: number;
  onlineDeviceCount: number;
  snapshotAt: string | null;
};

function unwrapSuccess<T>(response: AdminApiResponse<T>): T | null {
  if (response?.code !== 0) {
    throw new Error(response?.message || '接口返回失败，请稍后重试。');
  }
  return response.data ?? null;
}

/** GET /api/v1/admin/stats/management */
export async function getManagementStatsSnapshot() {
  const response = await request<AdminApiResponse<ManagementStats>>(
    '/api/v1/admin/stats/management',
    { method: 'GET' },
  );
  return unwrapSuccess(response);
}

/** GET /api/v1/admin/mqtt/stream/backlog */
export async function getMqttStreamBacklog() {
  const response = await request<AdminApiResponse<MqttStreamBacklog>>(
    '/api/v1/admin/mqtt/stream/backlog',
    {
      method: 'GET',
    },
  );
  return unwrapSuccess(response);
}
