import type { TreeDataNode } from 'antd';
import { Tree } from 'antd';

type PermissionPickerProps = {
  permissions: API.AdminPermissionResponse[];
  value: number[];
  onChange: (ids: number[]) => void;
};

export function PermissionPicker({
  permissions,
  value,
  onChange,
}: PermissionPickerProps) {
  const modules = new Map<string, Map<string, API.AdminPermissionResponse[]>>();
  permissions.forEach((permission) => {
    const types = modules.get(permission.module) || new Map();
    const items = types.get(permission.permissionType) || [];
    items.push(permission);
    types.set(permission.permissionType, items);
    modules.set(permission.module, types);
  });

  const treeData: TreeDataNode[] = Array.from(modules.entries()).map(
    ([module, types]) => ({
      key: `module:${module}`,
      title: module,
      children: Array.from(types.entries()).map(([type, items]) => ({
        key: `type:${module}:${type}`,
        title:
          type === 'MENU'
            ? '菜单权限'
            : type === 'ACTION'
              ? '操作权限'
              : '接口权限',
        children: items.map((permission) => ({
          key: String(permission.id),
          title: `${permission.permissionName}（${permission.permissionCode}）`,
        })),
      })),
    }),
  );

  return (
    <Tree
      checkable
      defaultExpandAll
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
