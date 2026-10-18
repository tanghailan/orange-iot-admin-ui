import { request } from '@umijs/max';

const unwrap = <T>(response: API.ApiResponse<T>) => {
  if (response.code !== 0) {
    throw new Error(response.message || '操作失败，请稍后重试。');
  }
  return response.data;
};

export async function getAdminUsers(params: API.PageRequest) {
  const response = await request<API.ApiResponse<API.PageResponse<API.AdminUserResponse>>>(
    '/admin/rbac/users',
    { method: 'GET', params },
  );
  return unwrap(response);
}

export async function getAssignableRoles() {
  const response = await request<API.ApiResponse<API.AdminUserRoleResponse[]>>(
    '/admin/rbac/user-roles',
    { method: 'GET' },
  );
  return unwrap(response);
}

export async function getAssignableAgents() {
  const response = await request<
    API.ApiResponse<API.AdminAssignableAgentResponse[]>
  >('/admin/rbac/user-agents', { method: 'GET' });
  return unwrap(response);
}

export async function createAdminUser(data: {
  username: string;
  password: string;
  roleIds: number[];
  agentId: API.AgentId;
}) {
  const response = await request<API.ApiResponse<void>>('/admin/rbac/users', {
    method: 'POST',
    data,
  });
  return unwrap(response);
}

export async function updateAdminUserAgent(id: number, agentId: API.AgentId) {
  const response = await request<API.ApiResponse<void>>(
    `/admin/rbac/users/${id}/agent`,
    {
      method: 'PUT',
      data: { agentId },
    },
  );
  return unwrap(response);
}

export async function updateAdminUserStatus(id: number, status: number) {
  const response = await request<API.ApiResponse<void>>(`/admin/rbac/users/${id}/status`, {
    method: 'PUT',
    data: { status },
  });
  return unwrap(response);
}

export async function updateAdminUserRoles(id: number, roleIds: number[]) {
  const response = await request<API.ApiResponse<void>>(`/admin/rbac/users/${id}/roles`, {
    method: 'PUT',
    data: { roleIds },
  });
  return unwrap(response);
}

export async function resetAdminPassword(id: number, password: string) {
  const response = await request<API.ApiResponse<void>>(`/admin/rbac/users/${id}/password`, {
    method: 'PUT',
    data: { password },
  });
  return unwrap(response);
}

export async function getAdminRoles() {
  const response = await request<API.ApiResponse<API.AdminRoleResponse[]>>(
    '/admin/rbac/roles',
    { method: 'GET' },
  );
  return unwrap(response);
}

export async function saveAdminRole(data: {
  roleCode: string;
  roleName: string;
  description?: string;
  status: number;
  permissionIds: number[];
}, id?: number) {
  const response = await request<API.ApiResponse<void>>(
    id ? `/admin/rbac/roles/${id}` : '/admin/rbac/roles',
    { method: id ? 'PUT' : 'POST', data },
  );
  return unwrap(response);
}

export async function deleteAdminRole(id: number) {
  const response = await request<API.ApiResponse<void>>(`/admin/rbac/roles/${id}`, {
    method: 'DELETE',
  });
  return unwrap(response);
}

export async function getAdminMenus() {
  const response = await request<API.ApiResponse<API.AdminMenuResponse[]>>(
    '/admin/rbac/menus',
    { method: 'GET' },
  );
  return unwrap(response);
}

export async function saveAdminMenu(data: {
  menuCode: string;
  parentCode?: string;
  menuType: 'DIRECTORY' | 'PAGE';
  menuName: string;
  path?: string;
  icon?: string;
  permissionCode?: string;
  sortOrder: number;
  status: number;
}, id?: number) {
  const response = await request<API.ApiResponse<void>>(
    id ? `/admin/rbac/menus/${id}` : '/admin/rbac/menus',
    { method: id ? 'PUT' : 'POST', data },
  );
  return unwrap(response);
}

export async function deleteAdminMenu(id: number) {
  const response = await request<API.ApiResponse<void>>(`/admin/rbac/menus/${id}`, {
    method: 'DELETE',
  });
  return unwrap(response);
}

export async function getAdminPermissions() {
  const response = await request<API.ApiResponse<API.AdminPermissionResponse[]>>(
    '/admin/rbac/permissions',
    { method: 'GET' },
  );
  return unwrap(response);
}

export async function saveAdminPermission(data: {
  permissionCode: string;
  permissionName: string;
  permissionType: API.AdminPermissionResponse['permissionType'];
  module: string;
  description?: string;
  status: number;
}, id?: number) {
  const response = await request<API.ApiResponse<void>>(
    id ? `/admin/rbac/permissions/${id}` : '/admin/rbac/permissions',
    { method: id ? 'PUT' : 'POST', data },
  );
  return unwrap(response);
}

export async function deleteAdminPermission(id: number) {
  const response = await request<API.ApiResponse<void>>(`/admin/rbac/permissions/${id}`, {
    method: 'DELETE',
  });
  return unwrap(response);
}
