# Orange IoT 管理前端

Orange IoT 平台的 React 管理控制台。

## 功能

- IoT 运行概览与 MQTT Stream 积压监控
- 产品和设备管理
- 固件上传及发布状态管理
- 设备指令下发、指令历史和消息历史，支持从已发布固件生成升级载荷
- 系统配置和定时任务管理
- 基于权限码控制菜单和操作入口
- 基于 Sa-Token 的管理端登录与退出

## 环境要求

- Node.js 22 或更高版本
- npm

## 本地开发

安装依赖并启动前端：

```bash
npm ci
npm run dev
```

开发代理会将 `/admin/*` 请求转发到 Admin 服务，并改写为 `/api/v1/admin/*`。默认目标地址为 `http://localhost:8811`。如需连接其他 Admin 服务，可设置 `IOT_ADMIN_API_URL`：

```bash
IOT_ADMIN_API_URL=http://localhost:8811 npm run dev
```

`start:test` 和 `start:pre` 使用相同的代理目标及路径改写。

开发环境右上角的 `OpenAPI 文档` 入口直接打开 Admin 服务的 Knife4j 文档，默认地址为
`http://localhost:8811/doc.html`。如需使用其他地址，可设置 `IOT_OPENAPI_DOCS_URL`：

```bash
IOT_OPENAPI_DOCS_URL=http://localhost:8811/doc.html npm run dev
```

后端原始 OpenAPI 定义地址为 `http://localhost:8811/v3/api-docs/admin`。

## 生产部署

构建静态前端：

```bash
npm run build
```

Umi 代理只在开发时生效。生产环境需在 Web 服务器或 Ingress 中配置同源转发：将 `/admin/` 请求转发到 Admin 服务的 `/api/v1/admin/`。浏览器会保存 Sa-Token 访问令牌，并通过 `Authorization` 请求头发送。

## 目录结构

- `src/pages/iot`：概览、产品、设备、固件、指令/消息、定时任务和系统配置页面
- `src/pages/monitor`：MQTT Stream 监控
- `src/services/iot`：Admin API 客户端
- `config/routes.ts`：应用路由和导航
- `config/proxy.ts`：开发及预发布代理
