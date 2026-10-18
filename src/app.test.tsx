import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all heavy dependencies before importing app
const mockReplace = vi.fn();
const mockHistory = {
  location: {
    pathname: '/welcome',
    search: '',
    hash: '',
  },
  replace: mockReplace,
};

const mockGetCurrentUserInfo = vi.fn();
const mockGetCurrentAccessCodes = vi.fn();
const mockGetCurrentMenus = vi.fn();

vi.mock('@umijs/max', () => ({
  history: mockHistory,
  Link: ({ children }: any) => children,
}));

vi.mock('@/services/iot', () => ({
  getCurrentUserInfo: mockGetCurrentUserInfo,
  getCurrentAccessCodes: mockGetCurrentAccessCodes,
  getCurrentMenus: mockGetCurrentMenus,
}));

vi.mock('@/components', () => ({
  AvatarDropdown: () => null,
  DocLink: () => null,
  ErrorBoundary: ({ children }: any) => children,
  Footer: () => null,
  LangDropdown: () => null,
  OfflineBanner: () => null,
  VersionDropdown: () => null,
}));

vi.mock('@ant-design/pro-components', () => ({
  SettingDrawer: () => null,
}));

vi.mock('@ant-design/icons', () => ({
  ApiOutlined: () => null,
  AppstoreOutlined: () => null,
  CloudOutlined: () => null,
  DashboardOutlined: () => null,
  DownloadOutlined: () => null,
  LineChartOutlined: () => null,
  MenuOutlined: () => null,
  MessageOutlined: () => null,
  MobileOutlined: () => null,
  SafetyOutlined: () => null,
  ScheduleOutlined: () => null,
  SettingOutlined: () => null,
  TeamOutlined: () => null,
  UserOutlined: () => null,
}));

vi.mock('./requestErrorConfig', () => ({
  errorConfig: {},
}));

vi.mock('../config/defaultSettings', () => ({
  default: { navTheme: 'light' },
}));

describe('app getInitialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory.location = {
      pathname: '/welcome',
      search: '',
      hash: '',
    };
  });

  it('should fetch currentUser when not on login page', async () => {
    const { getInitialState } = await import('./app');
    mockGetCurrentUserInfo.mockResolvedValue({
      code: 0,
      data: {
        username: 'test',
        realName: 'Test User',
        roles: ['super_admin'],
      },
    });

    const state = await getInitialState();

    expect(mockGetCurrentUserInfo).toHaveBeenCalled();
    expect(state.currentUser).toMatchObject({
      name: 'Test User',
      access: 'admin',
    });
    expect(state.settingDrawerOpen).toBe(false);
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should redirect to login when currentUser fetch fails (401)', async () => {
    const { getInitialState } = await import('./app');
    mockGetCurrentUserInfo.mockRejectedValue(new Error('401 Unauthorized'));

    const state = await getInitialState();

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('/user/login?redirect='),
    );
    expect(state.currentUser).toBeUndefined();
  });

  it('should not fetch currentUser on login page', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/user/login',
      search: '',
      hash: '',
    };

    const state = await getInitialState();

    expect(mockGetCurrentUserInfo).not.toHaveBeenCalled();
    expect(state.currentUser).toBeUndefined();
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should encode redirect path correctly on 401', async () => {
    const { getInitialState } = await import('./app');
    mockHistory.location = {
      pathname: '/admin/users',
      search: '?page=2',
      hash: '#section',
    };
    mockGetCurrentUserInfo.mockRejectedValue(new Error('401'));

    await getInitialState();

    expect(mockReplace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/admin/users?page=2#section')}`,
    );
  });

  it('should include default settings in initial state', async () => {
    const { getInitialState } = await import('./app');
    mockGetCurrentUserInfo.mockResolvedValue({
      code: 0,
      data: { name: 'User' },
    });

    const state = await getInitialState();

    expect(state.settings).toEqual({ navTheme: 'light' });
  });

  it('fetchUserInfo should return user data on success', async () => {
    const { getInitialState } = await import('./app');
    mockGetCurrentUserInfo.mockResolvedValue({
      code: 0,
      data: {
        username: 'fetched',
        realName: 'Fetched User',
        roles: [],
      },
    });

    const state = await getInitialState();

    const user = await state.fetchUserInfo?.();
    expect(user).toMatchObject({ name: 'Fetched User', access: 'user' });
  });
});
