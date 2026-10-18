import { request } from '@umijs/max';

export type ScheduledJobRecord = {
  jobName: string;
  description?: string;
  cronExpression: string;
  enabled: boolean;
  updatedAt?: string;
};

export type ScheduledJobUpdatePayload = {
  cronExpression?: string;
  enabled?: boolean;
};

export type ScheduledJobLogRecord = {
  id: number;
  jobName: string;
  instanceId?: string;
  triggerType?: 'cron' | 'manual' | string;
  status?: 'success' | 'failure' | string;
  message?: string;
  errorMessage?: string;
  durationMs?: number;
  startedAt?: string;
  finishedAt?: string;
};

export type ScheduledJobLogPage = {
  list: ScheduledJobLogRecord[];
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
  if (!response || response.code !== 0) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response.data;
}

/** 查询定时任务列表。 */
export async function listScheduledJobs(options?: RequestOptions) {
  const response = await request<ApiResponse<ScheduledJobRecord[]>>(
    '/api/v1/admin/scheduled-jobs',
    {
      method: 'GET',
      skipErrorHandler: true,
      ...(options || {}),
    },
  );
  return unwrap(response, '定时任务加载失败');
}

/** 更新任务的 Spring 六段 Cron 表达式和启用状态。 */
export async function updateScheduledJob(
  jobName: string,
  body: ScheduledJobUpdatePayload,
  options?: RequestOptions,
) {
  const response = await request<ApiResponse<ScheduledJobRecord>>(
    `/api/v1/admin/scheduled-jobs/${encodeURIComponent(jobName)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: body,
      skipErrorHandler: true,
      ...(options || {}),
    },
  );
  return unwrap(response, '定时任务更新失败');
}

/** 手动触发一个定时任务。 */
export async function triggerScheduledJob(
  jobName: string,
  options?: RequestOptions,
) {
  const response = await request<ApiResponse<void>>(
    `/api/v1/admin/scheduled-jobs/${encodeURIComponent(jobName)}/trigger`,
    {
      method: 'POST',
      skipErrorHandler: true,
      ...(options || {}),
    },
  );
  return unwrap(response, '手动触发任务失败');
}

/** 分页查询执行日志，可按任务名筛选。 */
export async function pageScheduledJobLogs(
  params: { page: number; size: number; jobName?: string; status?: string },
  options?: RequestOptions,
) {
  const response = await request<ApiResponse<ScheduledJobLogPage>>(
    '/api/v1/admin/scheduled-jobs/logs',
    {
      method: 'GET',
      params,
      skipErrorHandler: true,
      ...(options || {}),
    },
  );
  return unwrap(response, '执行日志加载失败');
}

/** 导出勾选的定时任务执行日志。 */
export async function exportScheduledJobLogs(
  ids: number[],
  options?: RequestOptions,
) {
  return request<Blob>('/api/v1/admin/scheduled-jobs/logs/export', {
    method: 'GET',
    params: { ids: ids.join(',') },
    responseType: 'blob',
    skipErrorHandler: true,
    ...(options || {}),
  });
}
