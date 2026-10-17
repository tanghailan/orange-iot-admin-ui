import { request } from '@umijs/max';

export type FirmwareStatus = 'draft' | 'released' | 'obsolete';

export type FirmwareRecord = {
  id: number;
  productId: number;
  productName?: string;
  productKey?: string;
  version: string;
  name: string;
  objectKey: string;
  downloadUrl?: string;
  sizeBytes: number;
  checksum?: string;
  description?: string;
  status: FirmwareStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type FirmwareUploadResult = {
  objectKey: string;
  name: string;
  sizeBytes: number;
  checksum: string;
};

export type FirmwareCreatePayload = {
  productId: number;
  version: string;
  name: string;
  objectKey: string;
  sizeBytes: number;
  checksum: string;
  description?: string;
};

export type FirmwareUpdatePayload = {
  description?: string;
  status?: FirmwareStatus;
};

export type FirmwarePageParams = {
  page?: number;
  size?: number;
  productId?: number;
  status?: FirmwareStatus;
  keyword?: string;
};

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  requestId?: string;
};

type FirmwarePageResponse = {
  list: FirmwareRecord[];
  total: number;
  current: number;
  size: number;
};

type RequestOptions = { [key: string]: any };

/** 上传固件文件到存储，POST /api/v1/admin/firmwares/upload（代理前缀为 /admin）。 */
export async function uploadFirmware(
  file: File,
  options?: RequestOptions,
) {
  const formData = new FormData();
  formData.append('file', file);

  return request<ApiResponse<FirmwareUploadResult>>('/admin/firmwares/upload', {
    method: 'POST',
    data: formData,
    ...(options || {}),
  });
}

/** 上传完成后创建固件记录，POST /api/v1/admin/firmwares。 */
export async function createFirmware(
  body: FirmwareCreatePayload,
  options?: RequestOptions,
) {
  return request<ApiResponse<FirmwareRecord>>('/admin/firmwares', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 更新固件说明或状态，PUT /api/v1/admin/firmwares/{id}。 */
export async function updateFirmware(
  id: number,
  body: FirmwareUpdatePayload,
  options?: RequestOptions,
) {
  return request<ApiResponse<FirmwareRecord>>(`/admin/firmwares/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 删除固件 DELETE /api/v1/admin/firmwares/{id}。 */
export async function deleteFirmware(id: number, options?: RequestOptions) {
  return request<ApiResponse<void>>(`/admin/firmwares/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 固件分页列表 GET /api/v1/admin/firmwares。 */
export async function pageFirmwares(
  params: FirmwarePageParams,
  options?: RequestOptions,
) {
  return request<ApiResponse<FirmwarePageResponse>>('/admin/firmwares', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

/** 固件详情 GET /api/v1/admin/firmwares/{id}。 */
export async function getFirmware(id: number, options?: RequestOptions) {
  return request<ApiResponse<FirmwareRecord>>(`/admin/firmwares/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 为已发布固件生成新的下载地址，供设备升级指令使用。 */
export async function getFirmwareDownloadUrl(
  id: number,
  options?: RequestOptions,
) {
  return request<ApiResponse<string>>(
    `/admin/firmwares/${id}/download-url`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
