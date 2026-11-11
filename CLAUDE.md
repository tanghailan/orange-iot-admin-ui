# 管理端前端 Agent 开发规范

跨仓库的架构、接口归属和页面改动顺序见工作区根目录 [`../Agent开发手册.md`](../Agent开发手册.md)。
工作区工作流入口是 [`../AGENTS.md`](../AGENTS.md)。档位和收尾只认工作区根目录 `.cursor/rules/agent-workflow.mdc`。
本文件只保留 `orange-iot-admin-ui` 的工具约束。业务页面不要按 Ant Design Pro 模板的 mock 登录、`/api/currentUser` 或 `src/services/ant-design-pro/` 来写。

## 命令

- Node.js 22 或更高，包管理用 npm 和 `package-lock.json`。
- 联调使用 `npm run dev`。它关闭 mock，并把 `/api/v1/admin/` 代理到 Admin 服务，默认 `http://localhost:8811`。
- 检查使用 `npm run lint`（Biome + `tsc`）。不要引入 ESLint 或 Prettier。
- 写 antd 组件前先执行 `npx antd info <Component>`，按 antd 6 的属性来写。
- `npm run simple` 会不可逆裁剪模板，没有明确要求不要执行。
- `src/.umi` 是生成目录，异常时删除后重启。

## 代码位置

- 物联网接口手写在 `src/services/iot/`，类型在 `src/services/typings.d.ts`。
- 不要修改 `src/services/ant-design-pro/`。
- 侧栏来自后端菜单。新页面要同时改路由、`src/access.ts`、页面按钮权限和 Admin 的菜单种子，路径与权限码保持一致。
- 成功响应是 `code === 0`。Token 键名是 `iot_admin_token`，放在 `Authorization` 头，不加 `Bearer`。
