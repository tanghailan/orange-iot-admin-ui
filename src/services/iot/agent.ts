import { request } from '@umijs/max';

type RequestOptions = { [key: string]: any };

const agentPath = (agentId: API.AgentId) =>
  `/admin/agents/${encodeURIComponent(String(agentId))}`;

const extractAgentNodes = (
  data: API.AgentTreeResponse | undefined,
): API.AgentTreeNode[] => {
  if (Array.isArray(data)) return data;
  return data?.tree || data?.nodes || data?.list || [];
};

export function getAgentTreeNodes(
  data: API.AgentTreeResponse | undefined,
): API.AgentTreeNode[] {
  return extractAgentNodes(data);
}

export function flattenAgentTree(
  nodes: API.AgentTreeNode[],
): API.AgentTreeNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenAgentTree(node.children || []),
  ]);
}

/** GET /api/v1/admin/agents/tree (the dev proxy maps /admin to /api/v1/admin) */
export async function getAgentTree(options?: RequestOptions) {
  return request<API.ApiResponse<API.AgentTreeResponse>>('/admin/agents/tree', {
    method: 'GET',
    ...(options || {}),
  });
}

/** POST /api/v1/admin/agents */
export async function createAgent(
  body: API.AgentCreateRequest,
  options?: RequestOptions,
) {
  return request<API.ApiResponse<API.AgentTreeNode>>('/admin/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** PUT /api/v1/admin/agents/{agentId} */
export async function updateAgent(
  agentId: API.AgentId,
  body: API.AgentUpdateRequest,
  options?: RequestOptions,
) {
  return request<API.ApiResponse<API.AgentTreeNode>>(
    agentPath(agentId),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      data: body,
      ...(options || {}),
    },
  );
}

/** POST /api/v1/admin/agents/{agentId}/move */
export async function moveAgent(
  agentId: API.AgentId,
  body: API.AgentMoveRequest,
  options?: RequestOptions,
) {
  return request<API.ApiResponse<void>>(`${agentPath(agentId)}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** POST /api/v1/admin/agents/{agentId}/disable */
export async function disableAgent(
  agentId: API.AgentId,
  options?: RequestOptions,
) {
  return request<API.ApiResponse<void>>(`${agentPath(agentId)}/disable`, {
    method: 'POST',
    ...(options || {}),
  });
}

/** GET /api/v1/admin/agents/{agentId}/products */
export async function getAgentProducts(
  agentId: API.AgentId,
  options?: RequestOptions,
) {
  return request<API.ApiResponse<API.AgentProductsResponse>>(
    `${agentPath(agentId)}/products`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/** PUT /api/v1/admin/agents/{agentId}/products */
export async function updateAgentProducts(
  agentId: API.AgentId,
  body: API.AgentProductsUpdateRequest,
  options?: RequestOptions,
) {
  return request<API.ApiResponse<void>>(`${agentPath(agentId)}/products`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** POST /api/v1/admin/devices/{deviceId}/transfer */
export async function transferDevice(
  deviceId: string,
  body: API.DeviceTransferRequest,
  options?: RequestOptions,
) {
  return request<API.ApiResponse<void>>(
    `/admin/devices/${encodeURIComponent(deviceId)}/transfer`,
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
