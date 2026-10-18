// @ts-ignore
/* eslint-disable */

declare namespace API {
  // 通用 API 响应结构
  type ApiResponse<T> = {
    code: number;
    message: string;
    data: T;
    requestId?: string;
  };

  // 后端 PageRequest 使用 page/size/keyword。
  type PageRequest = {
    page?: number;
    size?: number;
    keyword?: string;
  };

  // 后端 PageResponse 使用 list/total/current/size。
  type PageResponse<T> = {
    list: T[];
    total: number;
    current: number;
    size: number;
  };

  // ==================== 认证相关 ====================
  type AdminLoginRequest = {
    username: string;
    password: string;
  };

  type AdminLoginResponse = {
    accessToken: string;
  };

  type AdminUserInfoResponse = {
    userId: string;
    username: string;
    realName: string;
    roles: string[];
  };

  type AdminMenuResponse = {
    id: number;
    menuCode: string;
    parentCode?: string;
    menuType: 'DIRECTORY' | 'PAGE';
    menuName: string;
    name: string;
    path?: string;
    icon?: string;
    permissionCode?: string;
    sortOrder: number;
    status: number;
    children: AdminMenuResponse[];
  };

  type AdminPermissionResponse = {
    id: number;
    permissionCode: string;
    permissionName: string;
    permissionType: 'MENU' | 'ACTION' | 'API';
    module: string;
    description?: string;
    status: number;
  };

  type AdminRoleResponse = {
    id: number;
    roleCode: string;
    roleName: string;
    description?: string;
    builtIn: number;
    status: number;
    permissionIds: number[];
  };

  type AdminUserRoleResponse = {
    id: number;
    roleCode: string;
    roleName: string;
  };

  type AdminAssignableAgentResponse = {
    id: AgentId;
    agentCode?: string;
    name: string;
    parentId?: AgentId | null;
    depth: number;
  };

  type AdminUserResponse = {
    id: number;
    username: string;
    status: number;
    createdAt: string;
    roles: AdminUserRoleResponse[];
    agentId?: AgentId | null;
    agentCode?: string;
    agentName?: string;
  };

  type AgentAuditLogRecord = {
    id: number;
    operatorUserId: number;
    operatorUsername?: string;
    agentId?: AgentId | null;
    agentCode?: string;
    agentName?: string;
    operationType: string;
    targetType: string;
    targetId?: string;
    beforeJson?: string;
    afterJson?: string;
    createdAt: string;
  };

  // ==================== 产品相关 ====================
  type ProductCreateRequest = {
    name: string;
    description?: string;
    productKey: string;
  };

  type ProductUpdateRequest = {
    name?: string;
    description?: string;
    status?: number;
  };

  type ProductResponse = {
    id: number;
    name: string;
    description?: string;
    productKey: string;
    status: number;
    createdAt: string;
  };

  // ==================== 设备相关 ====================
  type DeviceCreateRequest = {
    productId: number;
    name?: string;
    firmwareVersion?: string;
  };

  type DeviceUpdateRequest = {
    name?: string;
    firmwareVersion?: string;
  };

  type DeviceCredentialResponse = {
    id: number;
    productId: number;
    productKey: string;
    deviceId: string;
    name: string;
    status: number;
    online: boolean;
    firmwareVersion?: string;
    lastOnlineAt?: string;
    createdAt: string;
    deviceSecret: string;
    mqttPassword: string;
    brokerUrl: string;
    mqttUsername: string;
    mqttClientId: string;
    mqttPublishTopic: string;
    mqttSubscribeTopic: string;
  };

  type DeviceResponse = {
    id: number;
    productId: number;
    productKey: string;
    deviceId: string;
    name: string;
    status: number;
    online: boolean;
    firmwareVersion?: string;
    lastOnlineAt?: string;
    createdAt: string;
    ownerAgentId?: AgentId | null;
    ownerAgentCode?: string;
    ownerAgentName?: string;
  };

  type DevicePageRequest = {
    page?: number;
    size?: number;
    keyword?: string;
    productId?: number;
    status?: number;
    online?: boolean;
  };

  // ==================== 统计相关 ====================
  // ==================== 固件相关 ====================
  type FirmwareCreateRequest = {
    productId: number;
    version: string;
    name: string;
    objectKey: string;
    sizeBytes: number;
    checksum: string;
    description?: string;
  };

  type FirmwareUpdateRequest = {
    description?: string;
    status?: FirmwareStatus;
  };

  type FirmwareStatus = 'draft' | 'released' | 'obsolete';

  type FirmwareResponse = {
    id: number;
    productId: number;
    productName: string;
    productKey: string;
    version: string;
    name: string;
    objectKey: string;
    downloadUrl?: string;
    sizeBytes: number;
    checksum?: string;
    description?: string;
    status: FirmwareStatus;
    createdAt: string;
    updatedAt: string;
  };

  type FirmwarePageRequest = {
    page?: number;
    size?: number;
    keyword?: string;
    productId?: number;
    status?: FirmwareStatus;
  };

  // ==================== MQTT监控相关 ====================
  type MqttStreamBacklog = {
    streamKey: string;
    streamGroup: string;
    streamLength: number;
    pendingCount: number;
    consumerCount: number;
    messageBatchBufferSize: number;
    processedCount: number;
    rejectedCount: number;
    alertLevel: string;
    alertMessage: string;
    checkedAt: string | null;
  };

  // ==================== 代理与数据范围相关 ====================
  type AgentId = number | string;

  type AgentAccountSummary = {
    id?: AgentId;
    username?: string;
    realName?: string;
    status?: number;
  };

  type AgentDeviceSummary = {
    deviceId: string;
    name?: string;
    productName?: string;
    status?: number;
  };

  type AgentTreeNode = {
    id: AgentId;
    agentCode?: string;
    agentName?: string;
    name?: string;
    parentId?: AgentId | null;
    level?: number;
    depth?: number;
    status?: number;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    accountCount?: number;
    userCount?: number;
    deviceCount?: number;
    accounts?: AgentAccountSummary[];
    users?: AgentAccountSummary[];
    devices?: AgentDeviceSummary[];
    children?: AgentTreeNode[];
  };

  type AgentTreeResponse =
    | AgentTreeNode[]
    | {
        tree?: AgentTreeNode[];
        nodes?: AgentTreeNode[];
        list?: AgentTreeNode[];
      };

  type AgentCreateRequest = {
    agentCode: string;
    name: string;
    parentId?: AgentId | null;
    description?: string;
  };

  type AgentUpdateRequest = {
    name: string;
    description?: string;
  };

  type AgentMoveRequest = {
    parentId?: AgentId | null;
  };

  type AgentProductResponse = {
    id: number;
    name: string;
    productKey?: string;
    status?: number;
    authorized?: boolean;
    granted?: boolean;
  };

  type AgentProductsResponse =
    | AgentProductResponse[]
    | {
        products?: AgentProductResponse[];
        productIds?: number[];
        list?: AgentProductResponse[];
      };

  type AgentProductsUpdateRequest = {
    productIds: number[];
  };

  type DeviceTransferRequest = {
    targetAgentId: AgentId;
    reason?: string;
  };
}
