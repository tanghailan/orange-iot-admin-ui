import { request } from '@umijs/max';

export type CommandRecord = {
  commandId: string;
  cmd: number;
  deviceId: string;
  payload?: string;
  status?: string;
  sentAt?: string;
  ackedAt?: string;
  finishedAt?: string;
  createdAt?: string;
};

export type DeviceMessageRecord = {
  id: number;
  deviceId: string;
  direction?: string;
  messageType?: string;
  topic?: string;
  payload?: string;
  msgId?: string;
  createdAt?: string;
};

export type MessagePage<T> = {
  list: T[];
  total: number;
  current: number;
  size: number;
};

type ApiResponse<T> = {
  code: number;
  message?: string;
  data: T;
  requestId?: string;
};

type RequestOptions = Record<string, unknown>;

function unwrap<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.code !== 0) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
}

/** 向设备下发命令，data 为 JSON 对象字符串。 */
export async function sendDeviceCommand(
  deviceId: string,
  body: { cmd: number; data: string },
  options?: RequestOptions,
) {
  const response = await request<ApiResponse<CommandRecord>>(
    `/api/v1/admin/devices/${encodeURIComponent(deviceId)}/commands`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      ...(options || {}),
    },
  );
  return unwrap(response, '指令下发失败');
}

/** 分页查询设备指令历史。 */
export async function pageDeviceCommands(
  deviceId: string,
  params: { page: number; size: number },
  options?: RequestOptions,
) {
  const response = await request<ApiResponse<MessagePage<CommandRecord>>>(
    `/api/v1/admin/devices/${encodeURIComponent(deviceId)}/commands`,
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
  return unwrap(response, '指令历史加载失败');
}

/** 分页查询设备消息历史。 */
export async function pageDeviceMessages(
  deviceId: string,
  params: { page: number; size: number },
  options?: RequestOptions,
) {
  const response = await request<ApiResponse<MessagePage<DeviceMessageRecord>>>(
    `/api/v1/admin/devices/${encodeURIComponent(deviceId)}/messages`,
    {
      method: 'GET',
      params,
      ...(options || {}),
    },
  );
  return unwrap(response, '消息历史加载失败');
}
