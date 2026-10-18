import { request } from '@umijs/max';

/** 登录接口 POST /api/v1/admin/auth/login */
export async function adminLogin(body: API.AdminLoginRequest, options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.AdminLoginResponse>>('/api/v1/admin/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/v1/admin/auth/logout */
export async function adminLogout(options?: { [key: string]: any }) {
  return request<API.ApiResponse<void>>('/api/v1/admin/auth/logout', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 当前登录用户信息 GET /api/v1/admin/user/info */
export async function getCurrentUserInfo(options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.AdminUserInfoResponse>>('/api/v1/admin/user/info', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 当前登录用户权限码 GET /api/v1/admin/auth/codes */
export async function getCurrentAccessCodes(options?: { [key: string]: any }) {
  return request<API.ApiResponse<string[]>>('/api/v1/admin/auth/codes', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 当前用户可见的菜单树 GET /api/v1/admin/auth/menus */
export async function getCurrentMenus(options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.AdminMenuResponse[]>>('/api/v1/admin/auth/menus', {
    method: 'GET',
    ...(options || {}),
  });
}
