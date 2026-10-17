/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState:
    | {
        currentUser?: API.CurrentUser;
        accessCodes?: string[];
        menus?: API.AdminMenuResponse[];
      }
    | undefined,
) {
  const { currentUser } = initialState ?? {};
  const codes = new Set(initialState?.accessCodes ?? []);
  const menuPaths = new Set<string>();
  const collectPaths = (menus: API.AdminMenuResponse[] = []) => {
    menus.forEach((menu) => {
      if (menu.path) menuPaths.add(menu.path);
      collectPaths(menu.children || []);
    });
  };
  collectPaths(initialState?.menus);
  const has = (code: string) => codes.has(code);
  const canOpen = (code: string, path: string) =>
    has(code) && menuPaths.has(path);
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    canViewDashboard: canOpen('iot:dashboard:view', '/iot/dashboard'),
    canViewProducts: canOpen('iot:product:list', '/iot/products'),
    canCreateProduct: has('iot:product:create'),
    canUpdateProduct: has('iot:product:update'),
    canDeleteProduct: has('iot:product:delete'),
    canViewDevices: canOpen('iot:device:list', '/iot/devices'),
    canCreateDevice: has('iot:device:create'),
    canUpdateDevice: has('iot:device:update'),
    canDeleteDevice: has('iot:device:delete'),
    canTransferDevice: has('iot:device:transfer'),
    canViewAgents: canOpen('iot:agent:list', '/iot/agents'),
    canCreateAgent: has('iot:agent:create'),
    canUpdateAgent: has('iot:agent:update'),
    canDisableAgent: has('iot:agent:disable'),
    canGrantAgentProducts: has('iot:agent:product:grant'),
    canListDevices: has('iot:device:list'),
    canViewMessages:
      canOpen('iot:message:list', '/operations/messages') &&
      has('iot:command:list') &&
      has('iot:message:list'),
    canSendCommand: has('iot:command:send'),
    canViewFirmware: canOpen('iot:firmware:list', '/operations/firmware'),
    canCreateFirmware: has('iot:firmware:create'),
    canUpdateFirmware: has('iot:firmware:update'),
    canDeleteFirmware: has('iot:firmware:delete'),
    canListFirmware: has('iot:firmware:list'),
    canViewMqttMonitor: canOpen('iot:monitor:view', '/operations/mqtt'),
    canViewScheduledJobs: canOpen('iot:job:list', '/operations/scheduled-jobs'),
    canUpdateScheduledJob: has('iot:job:update'),
    canTriggerScheduledJob: has('iot:job:trigger'),
    canViewSystemConfigs: canOpen('iot:config:list', '/admin/system-configs'),
    canCreateSystemConfig: has('iot:config:create'),
    canUpdateSystemConfig: has('iot:config:update'),
    canDeleteSystemConfig: has('iot:config:delete'),
    canViewAdminUsers: canOpen('system:user:list', '/admin/users'),
    canCreateAdminUser: has('system:user:create'),
    canUpdateAdminUser: has('system:user:update'),
    canAssignAdminUserRoles: has('system:user:assign-roles'),
    canResetAdminPassword: has('system:user:reset-password'),
    canViewAdminRoles: canOpen('system:role:list', '/admin/roles'),
    canCreateAdminRole: has('system:role:create'),
    canUpdateAdminRole: has('system:role:update'),
    canDeleteAdminRole: has('system:role:delete'),
    canViewAdminMenus: canOpen('system:menu:list', '/admin/menus'),
    canCreateAdminMenu: has('system:menu:create'),
    canUpdateAdminMenu: has('system:menu:update'),
    canDeleteAdminMenu: has('system:menu:delete'),
    canViewAdminPermissions: canOpen(
      'system:permission:list',
      '/admin/permissions',
    ),
    canCreateAdminPermission: has('system:permission:create'),
    canUpdateAdminPermission: has('system:permission:update'),
    canDeleteAdminPermission: has('system:permission:delete'),
  };
}
