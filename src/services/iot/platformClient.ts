import { request } from '@umijs/max';

/** 创建平台凭证 POST /api/v1/admin/platform-clients */
export async function createPlatformClient(
  body: API.PlatformClientCreateRequest,
  options?: { [key: string]: any },
) {
  return request<API.ApiResponse<API.PlatformClientCreatedResponse>>(
    '/api/v1/admin/platform-clients',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
      ...(options || {}),
    },
  );
}

/** 平台凭证列表，不返回令牌 GET /api/v1/admin/platform-clients */
export async function listPlatformClients(options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.PlatformClientResponse[]>>(
    '/api/v1/admin/platform-clients',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
