import { request } from '@umijs/max';

export type AuditLogRecord = {
  id: number;
  eventId: string;
  occurredAt: string;
  eventCategory: 'AUDIT' | 'SECURITY' | string;
  serviceName: string;
  actionCode: string;
  actorType: 'ADMIN' | 'SYSTEM' | 'DEVICE' | 'SERVICE' | string;
  actorId?: number;
  actorName?: string;
  operatorUsername?: string;
  agentId?: API.AgentId | null;
  agentCode?: string;
  agentName?: string;
  targetType?: string;
  targetId?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED' | string;
  errorCode?: string;
  requestId?: string;
  sourceIp?: string;
  userAgent?: string;
  beforeJson?: string;
  afterJson?: string;
  detailJson?: string;
};

type AuditLogPage = API.PageResponse<AuditLogRecord>;

export async function pageAuditLogs(params: {
  page: number;
  size: number;
  keyword?: string;
  eventCategory?: string;
  actionCode?: string;
  outcome?: string;
}) {
  const response = await request<API.ApiResponse<AuditLogPage>>(
    '/api/v1/admin/audits',
    {
      method: 'GET',
      params,
      skipErrorHandler: true,
    },
  );
  if (response.code !== 0) {
    throw new Error(response.message || '统一审计加载失败');
  }
  return response.data;
}
