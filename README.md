# Orange IoT Admin UI

React administration console for the Orange IoT platform.

## Features

- IoT overview and MQTT Stream backlog monitoring
- Product and device management
- Firmware upload and release state management
- Device command dispatch, command history, and message history, including firmware upgrade payloads
- System configuration and scheduled job management
- Permission-code based navigation and operation visibility
- Sa-Token based admin login and logout

## Requirements

- Node.js 22 or later
- npm

## Development

Install dependencies and start the UI:

```bash
npm ci
npm run dev
```

The development proxy sends `/api/v1/admin/*` to the Admin service. Admin UI pages use `/admin/*`, keeping browser routes separate from API routes. The default API target is `http://localhost:8811`. Set `IOT_ADMIN_API_URL` to use another Admin service:

```bash
IOT_ADMIN_API_URL=http://localhost:8811 npm run dev
```

The `start:test` and `start:pre` scripts use the same proxy target and rewrite.

## Production

Build the static application:

```bash
npm run build
```

The Umi proxy only runs in development. Configure the production web server or ingress to forward same-origin requests under `/api/v1/admin/` to the Admin service under the same path. The browser stores the Sa-Token access token and sends it in the `Authorization` header.

## Project Structure

- `src/pages/iot`: dashboard, product, device, firmware, command/message, scheduled job, and system configuration pages
- `src/pages/monitor`: MQTT Stream monitoring
- `src/services/iot`: Admin API clients
- `config/routes.ts`: application routes and navigation
- `config/proxy.ts`: development and staging API proxy
