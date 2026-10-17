import {
  ApiOutlined,
  AppstoreOutlined,
  CloudOutlined,
  DashboardOutlined,
  DownloadOutlined,
  LineChartOutlined,
  LinkOutlined,
  MenuOutlined,
  MessageOutlined,
  MobileOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  Settings as LayoutSettings,
  MenuDataItem,
} from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';

// Initialize dayjs plugins globally
dayjs.extend(relativeTime);

import {
  AvatarDropdown,
  ErrorBoundary,
  Footer,
  OfflineBanner,
} from '@/components';
import {
  getCurrentAccessCodes,
  getCurrentMenus,
  getCurrentUserInfo,
} from '@/services/iot';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';

const firstMenuPath = (
  menus: API.AdminMenuResponse[] = [],
): string | undefined => {
  for (const menu of menus) {
    if (menu.path) return menu.path;
    const childPath = firstMenuPath(menu.children);
    if (childPath) return childPath;
  }
  return undefined;
};

const hasMenuPath = (
  menus: API.AdminMenuResponse[] = [],
  path: string,
): boolean =>
  menus.some((menu) => menu.path === path || hasMenuPath(menu.children, path));

const menuIconMap: Record<string, React.ComponentType> = {
  api: ApiOutlined,
  appstore: AppstoreOutlined,
  cloud: CloudOutlined,
  dashboard: DashboardOutlined,
  download: DownloadOutlined,
  lineChart: LineChartOutlined,
  menu: MenuOutlined,
  message: MessageOutlined,
  mobile: MobileOutlined,
  safety: SafetyOutlined,
  schedule: ScheduleOutlined,
  setting: SettingOutlined,
  team: TeamOutlined,
  user: UserOutlined,
};

const mapMenuIcons = (menus: API.AdminMenuResponse[] = []): MenuDataItem[] =>
  menus.map((menu): MenuDataItem => {
    const Icon = menu.icon ? menuIconMap[menu.icon] : undefined;
    return {
      ...menu,
      // ProLayout/Ant Menu uses key to track selected and expanded nodes.
      key: menu.menuCode,
      icon: Icon ? <Icon /> : undefined,
      children: mapMenuIcons(menu.children),
    };
  });

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  accessCodes?: string[];
  menus?: API.AdminMenuResponse[];
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
  fetchAccessCodes?: () => Promise<string[]>;
  fetchMenus?: () => Promise<API.AdminMenuResponse[]>;
  settingDrawerOpen?: boolean;
}> {
  const fetchUserInfo = async () => {
    try {
      const msg = await getCurrentUserInfo({
        skipErrorHandler: true,
      });

      // 检查响应是否成功 (code === 0)
      if (msg.code === 0 && msg.data) {
        const user = msg.data;
        return {
          ...user,
          name: user.realName || user.username,
          access: user.roles?.includes('super_admin') ? 'admin' : 'user',
        } as API.CurrentUser;
      }
      return undefined;
    } catch (_error) {
      const { pathname, search, hash } = history.location;
      if (pathname !== loginPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(pathname + search + hash)}`,
        );
      }
    }
    return undefined;
  };
  const fetchAccessCodes = async () => {
    try {
      const response = await getCurrentAccessCodes({ skipErrorHandler: true });
      return response.code === 0 ? response.data || [] : [];
    } catch {
      return [];
    }
  };
  const fetchMenus = async () => {
    try {
      const response = await getCurrentMenus({ skipErrorHandler: true });
      return response.code === 0 ? response.data || [] : [];
    } catch {
      return [];
    }
  };
  // 如果不是登录页面，执行
  const { location } = history;
  if (
    ![loginPath, '/user/register', '/user/register-result'].includes(
      location.pathname,
    )
  ) {
    const currentUser = await fetchUserInfo();
    const accessCodes = currentUser ? await fetchAccessCodes() : [];
    const menus = currentUser ? await fetchMenus() : [];
    return {
      fetchUserInfo,
      fetchAccessCodes,
      fetchMenus,
      currentUser,
      accessCodes,
      menus,
      settings: defaultSettings as Partial<LayoutSettings>,
      settingDrawerOpen: false,
    };
  }
  return {
    fetchUserInfo,
    fetchAccessCodes,
    fetchMenus,
    accessCodes: [],
    menus: [],
    settings: defaultSettings as Partial<LayoutSettings>,
    settingDrawerOpen: false,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    menuItemRender: (item, dom) => {
      if (item.path) {
        return (
          <Link to={item.path} prefetch>
            {dom}
          </Link>
        );
      }
      return dom;
    },
    menuDataRender: () => mapMenuIcons(initialState?.menus),
    actionsRender: () => [],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: initialState?.currentUser?.name || '管理用户',
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    // waterMarkProps: {
    //   content: initialState?.currentUser?.name,
    // },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
        );
        return;
      }
      if (
        initialState?.currentUser &&
        location.pathname === '/iot/dashboard' &&
        !hasMenuPath(initialState.menus, location.pathname)
      ) {
        const fallback = firstMenuPath(initialState.menus);
        if (fallback && fallback !== location.pathname) {
          history.replace(fallback);
        }
      }
    },
    links: isDev
      ? [
          <a
            key="openapi"
            href={__ORANGE_IOT_OPENAPI_DOCS_URL__}
            target="_blank"
            rel="noreferrer"
          >
            <LinkOutlined />
            <span>OpenAPI 文档</span>
          </a>,
        ]
      : [],
    // Replace ProLayout's default ErrorBoundary with our offline-aware version,
    // so chunk load errors show friendly messages instead of "Something went wrong."
    ErrorBoundary,
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          <SettingDrawer
            disableUrlParams
            enableDarkTheme
            collapse={initialState?.settingDrawerOpen}
            onCollapseChange={(open) => {
              setInitialState((s) => ({
                ...s,
                settingDrawerOpen: open,
              }));
            }}
            settings={initialState?.settings}
            onSettingChange={(settings) => {
              setInitialState((s) => ({
                ...s,
                settings,
              }));
            }}
          />
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  baseURL: '',
  ...errorConfig,
};

export function rootContainer(container: React.ReactNode) {
  return (
    <>
      <OfflineBanner />
      <ErrorBoundary>{container}</ErrorBoundary>
    </>
  );
}
