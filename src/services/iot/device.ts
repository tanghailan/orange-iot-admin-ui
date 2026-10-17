import { request } from '@umijs/max';

/** 创建产品 POST /admin/products */
export async function createProduct(body: API.ProductCreateRequest, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.ProductResponse>>('/admin/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新产品 PUT /admin/products/{id} */
export async function updateProduct(id: number, body: API.ProductUpdateRequest, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.ProductResponse>>(`/admin/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除产品 DELETE /admin/products/{id} */
export async function deleteProduct(id: number, options?: { [key: string]: any }) {
  return request<API.ApiResponse<void>>(`/admin/products/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 产品列表（全量） GET /admin/products */
export async function listProducts(options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.ProductResponse[]>>('/admin/products', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 产品分页列表 GET /admin/products/page */
export async function pageProducts(params: API.PageRequest, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.PageResponse<API.ProductResponse>>>('/admin/products/page', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 注册设备 POST /admin/devices */
export async function createDevice(body: API.DeviceCreateRequest, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.DeviceCredentialResponse>>('/admin/devices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新设备 PUT /admin/devices/{deviceId} */
export async function updateDevice(deviceId: string, body: API.DeviceUpdateRequest, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.DeviceResponse>>(`/admin/devices/${deviceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除设备 DELETE /admin/devices/{deviceId} */
export async function deleteDevice(deviceId: string, options?: { [key: string]: any }) {
  return request<API.ApiResponse<void>>(`/admin/devices/${deviceId}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 设备列表（全量） GET /admin/devices */
export async function listDevices(options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.DeviceResponse[]>>('/admin/devices', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 设备分页列表 GET /admin/devices/page */
export async function pageDevices(params: API.DevicePageRequest, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.PageResponse<API.DeviceResponse>>>('/admin/devices/page', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 设备详情 GET /admin/devices/{deviceId} */
export async function getDevice(deviceId: string, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.DeviceResponse>>(`/admin/devices/${deviceId}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 禁用设备 POST /admin/devices/{deviceId}/disable */
export async function disableDevice(deviceId: string, options?: { [key: string]: any }) {
  return request<API.ApiResponse<void>>(`/admin/devices/${deviceId}/disable`, {
    method: 'POST',
    ...(options || {}),
  });
}

/** 启用设备 POST /admin/devices/{deviceId}/enable */
export async function enableDevice(deviceId: string, options?: { [key: string]: any }) {
  return request<API.ApiResponse<void>>(`/admin/devices/${deviceId}/enable`, {
    method: 'POST',
    ...(options || {}),
  });
}
