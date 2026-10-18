import { request } from '@umijs/max';

export type SystemConfigValueType = 'string' | 'int' | 'long' | 'bool' | 'json';
export type SystemConfigStatus = 0 | 1;

export type SystemConfigRecord = {
  id: number;
  configKey: string;
  configValue: string | null;
  valueType: SystemConfigValueType;
  name: string;
  description?: string | null;
  status: SystemConfigStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemConfigPageParams = {
  page?: number;
  size?: number;
  keyword?: string;
  valueType?: SystemConfigValueType;
  status?: SystemConfigStatus;
};

export type SystemConfigCreatePayload = {
  configKey: string;
  configValue?: string;
  valueType?: SystemConfigValueType;
  name: string;
  description?: string;
};

export type SystemConfigUpdatePayload = {
  configValue?: string;
  valueType?: SystemConfigValueType;
  name?: string;
  description?: string;
  status?: SystemConfigStatus;
};

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T | null;
  requestId?: string;
};

export type SystemConfigPageResponse = {
  list: SystemConfigRecord[];
  total: number;
  current: number;
  size: number;
};

type RequestOptions = { [key: string]: any };

/** 分页查询系统配置 GET /api/v1/admin/system-configs。 */
export async function pageSystemConfigs(
  params: SystemConfigPageParams,
  options?: RequestOptions,
) {
  return request<ApiResponse<SystemConfigPageResponse>>('/api/v1/admin/system-configs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 查询系统配置详情 GET /api/v1/admin/system-configs/{id}。 */
export async function getSystemConfig(id: number, options?: RequestOptions) {
  return request<ApiResponse<SystemConfigRecord>>(`/api/v1/admin/system-configs/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建系统配置 POST /api/v1/admin/system-configs。 */
export async function createSystemConfig(
  body: SystemConfigCreatePayload,
  options?: RequestOptions,
) {
  return request<ApiResponse<SystemConfigRecord>>('/api/v1/admin/system-configs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新系统配置 PUT /api/v1/admin/system-configs/{id}。 */
export async function updateSystemConfig(
  id: number,
  body: SystemConfigUpdatePayload,
  options?: RequestOptions,
) {
  return request<ApiResponse<SystemConfigRecord>>(`/api/v1/admin/system-configs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除系统配置 DELETE /api/v1/admin/system-configs/{id}。 */
export async function deleteSystemConfig(id: number, options?: RequestOptions) {
  return request<ApiResponse<void>>(`/api/v1/admin/system-configs/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}
