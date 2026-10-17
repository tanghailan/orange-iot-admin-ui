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
  consumerCount: number;
  alertLevel: string;
  alertMessage: string;
  checkedAt: string | null;
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
    '/admin/stats/management',
    { method: 'GET' },
  );
  return unwrapSuccess(response);
}

/** GET /api/v1/admin/mqtt/stream/backlog */
export async function getMqttStreamBacklog() {
  const response = await request<AdminApiResponse<MqttStreamBacklog>>(
    '/admin/mqtt/stream/backlog',
    {
      method: 'GET',
    },
  );
  return unwrapSuccess(response);
}
