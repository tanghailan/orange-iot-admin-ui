import type { TreeDataNode } from 'antd';
import { Tree } from 'antd';

type PermissionPickerProps = {
  menus: API.AdminMenuResponse[];
  permissions: API.AdminPermissionResponse[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

export function PermissionPicker({
  menus,
  permissions,
  value,
  onChange,
  disabled = false,
}: PermissionPickerProps) {
  const menuTree = buildMenuTree(menus.filter((menu) => menu.status === 1));
  const directories = menuTree.filter((menu) => menu.menuType === 'DIRECTORY');
  const pages = menuTree.flatMap((menu) =>
    menu.menuType === 'DIRECTORY'
      ? menu.children.filter((child) => child.menuType === 'PAGE')
      : menu.menuType === 'PAGE'
        ? [menu]
        : [],
  );
  const permissionsByPage = new Map<
    string,
    API.AdminPermissionResponse[]
  >();
  const unassignedByDirectory = new Map<
    string,
    API.AdminPermissionResponse[]
  >();

  permissions.forEach((permission) => {
    const matchingPages = pages
      .filter((page) => page.permissionCode)
      .map((page) => {
        const pagePermission = page.permissionCode as string;
        const pageParts = pagePermission.split(':');
        const pagePrefix = pageParts.slice(0, -1).join(':');
        const matchesExact = pagePermission === permission.permissionCode;
        const matchesPrefix =
          pagePrefix.length > 0 &&
          permission.permissionCode.startsWith(`${pagePrefix}:`);

        return {
          page,
          score: matchesExact
            ? Number.MAX_SAFE_INTEGER
            : matchesPrefix
              ? pagePrefix.length
              : 0,
        };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);
    const page =
      permission.permissionCode.startsWith('iot:command:')
        ? pages.find((item) => item.menuCode === 'messages')
        : matchingPages[0]?.page;

    if (page) {
      const items = permissionsByPage.get(page.menuCode) || [];
      items.push(permission);
      permissionsByPage.set(page.menuCode, items);
      return;
    }

    const directoryCode =
      permission.module === 'IoT'
        ? 'iot'
        : permission.module === '消息' || permission.module === '运维'
          ? 'operations'
          : 'platform';
    const items = unassignedByDirectory.get(directoryCode) || [];
    items.push(permission);
    unassignedByDirectory.set(directoryCode, items);
  });

  const treeData: TreeDataNode[] = directories.map((directory) => ({
    key: `menu:${directory.menuCode}`,
    title: directory.menuName,
    children: [
      ...directory.children
        .filter((page) => page.menuType === 'PAGE')
        .map((page) => {
          const pagePermissions = permissionsByPage.get(page.menuCode) || [];
          return {
            key: `menu:${page.menuCode}`,
            title: page.menuName,
            disableCheckbox: pagePermissions.length === 0,
            children: pagePermissions.map((permission) => ({
              key: String(permission.id),
              title: `${permission.permissionName}（${permission.permissionCode}）`,
            })),
          };
        }),
      ...(unassignedByDirectory.get(directory.menuCode) || []).length
        ? [
            {
              key: `unassigned:${directory.menuCode}`,
              title: '未关联页面',
              children: (
                unassignedByDirectory.get(directory.menuCode) || []
              ).map((permission) => ({
                key: String(permission.id),
                title: `${permission.permissionName}（${permission.permissionCode}）`,
              })),
            },
          ]
        : [],
    ],
  }));

  return (
    <Tree
      checkable
      defaultExpandAll
      disabled={disabled}
      selectable={false}
      checkedKeys={value.map(String)}
      treeData={treeData}
      onCheck={(keys) => {
        const checkedKeys = Array.isArray(keys) ? keys : keys.checked;
        onChange(
          checkedKeys
            .filter((key) => /^\d+$/.test(String(key)))
            .map((key) => Number(key)),
        );
      }}
    />
  );
}

export function buildMenuTree(menus: API.AdminMenuResponse[]) {
  const byCode = new Map<
    string,
    API.AdminMenuResponse & { children: API.AdminMenuResponse[] }
  >();
  menus.forEach((menu) => {
    byCode.set(menu.menuCode, { ...menu, children: [] });
  });
  const roots: (API.AdminMenuResponse & {
    children: API.AdminMenuResponse[];
  })[] = [];
  byCode.forEach((menu) => {
    const parent = menu.parentCode ? byCode.get(menu.parentCode) : undefined;
    if (parent) parent.children.push(menu);
    else roots.push(menu);
  });
  return roots;
}
