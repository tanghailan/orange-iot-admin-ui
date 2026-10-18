import { request } from '@umijs/max';

export type AgentAuditLogRecord = {
  id: number;
  operatorUserId: number;
  operatorUsername?: string;
  agentId?: API.AgentId | null;
  agentCode?: string;
  agentName?: string;
  operationType: string;
  targetType: string;
  targetId?: string;
  beforeJson?: string;
  afterJson?: string;
  createdAt: string;
};

export type AgentAuditLogPage = API.PageResponse<AgentAuditLogRecord>;

type ApiResponse<T> = {
  code: number;
  message?: string;
  data: T;
};

export async function pageAgentAuditLogs(params: {
  page: number;
  size: number;
  keyword?: string;
  operationType?: string;
  targetType?: string;
}) {
  const response = await request<ApiResponse<AgentAuditLogPage>>(
    '/admin/agent-audits',
    {
      method: 'GET',
      params,
      skipErrorHandler: true,
    },
  );
  if (response.code !== 0) {
    throw new Error(response.message || '代理审计加载失败');
  }
  return response.data;
}
