import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccess } from '@umijs/max';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Pagination,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import { getDevice } from '@/services/iot';
import {
  type FirmwareRecord,
  getFirmwareDownloadUrl,
  pageFirmwares,
} from '@/services/iot/firmware';
import {
  type CommandRecord,
  type DeviceMessageRecord,
  pageDeviceCommands,
  pageDeviceMessages,
  sendDeviceCommand,
} from '@/services/iot/message';
import { downloadCsv } from '@/utils/exportCsv';

type CommandFormValues = {
  preset: string;
  customCmd?: number;
  firmwareId?: number;
  data: string;
};

const PAGE_SIZE = 10;

const commandOptions = [
  { label: '2 - 升级', value: '2' },
  { label: '4 - 重启', value: '4' },
  { label: '5 - 拉日志', value: '5' },
  { label: '扩展命令', value: 'custom' },
];

function formatTime(value?: string) {
  return value ? value.replace('T', ' ') : '-';
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatPayload(payload?: string) {
  if (!payload) return '-';
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

function JsonPayload({ value }: { value?: string }) {
  if (!value) return <Typography.Text type="secondary">-</Typography.Text>;
  return (
    <Typography.Paragraph
      copyable={{ text: value }}
      ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
      style={{ marginBottom: 0, maxWidth: 460, overflowWrap: 'anywhere' }}
    >
      <Typography.Text code>{formatPayload(value)}</Typography.Text>
    </Typography.Paragraph>
  );
}

const commandColumns: TableColumnsType<CommandRecord> = [
  {
    title: '任务 ID',
    dataIndex: 'commandId',
    width: 210,
    ellipsis: true,
  },
  {
    title: '命令',
    dataIndex: 'cmd',
    width: 120,
    render: (cmd: number) => {
      const label = commandOptions.find(
        (option) => option.value === String(cmd),
      )?.label;
      return label ? label : `扩展命令 ${cmd}`;
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 120,
    render: (status?: string) => {
      const color =
        status === 'finished' || status === 'acked'
          ? 'green'
          : status === 'timeout' || status === 'failed'
            ? 'red'
            : status === 'sent'
              ? 'blue'
              : 'default';
      return <Tag color={color}>{status || '未知'}</Tag>;
    },
  },
  {
    title: '载荷',
    dataIndex: 'payload',
    width: 300,
    render: (payload?: string) => <JsonPayload value={payload} />,
  },
  { title: '发送时间', dataIndex: 'sentAt', width: 180, render: formatTime },
  { title: '回执时间', dataIndex: 'ackedAt', width: 180, render: formatTime },
  {
    title: '完成时间',
    dataIndex: 'finishedAt',
    width: 180,
    render: formatTime,
  },
  { title: '创建时间', dataIndex: 'createdAt', width: 180, render: formatTime },
];

const messageColumns: TableColumnsType<DeviceMessageRecord> = [
  { title: '消息 ID', dataIndex: 'id', width: 100 },
  {
    title: '方向',
    dataIndex: 'direction',
    width: 100,
    render: (direction?: string) => (
      <Tag
        color={
          direction === 'up'
            ? 'blue'
            : direction === 'down'
              ? 'orange'
              : 'default'
        }
      >
        {direction === 'up'
          ? '上行'
          : direction === 'down'
            ? '下行'
            : direction || '未知'}
      </Tag>
    ),
  },
  {
    title: '消息类型',
    dataIndex: 'messageType',
    width: 140,
    render: (value?: string) => value || '-',
  },
  {
    title: 'Topic',
    dataIndex: 'topic',
    width: 260,
    ellipsis: true,
    render: (value?: string) => value || '-',
  },
  {
    title: '载荷',
    dataIndex: 'payload',
    width: 320,
    render: (payload?: string) => <JsonPayload value={payload} />,
  },
  {
    title: '业务消息 ID',
    dataIndex: 'msgId',
    width: 200,
    ellipsis: true,
    render: (value?: string) => value || '-',
  },
  { title: '时间', dataIndex: 'createdAt', width: 180, render: formatTime },
];

const MessagesPage: React.FC = () => {
  const access = useAccess();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CommandFormValues>();
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [commandPage, setCommandPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [commandSize, setCommandSize] = useState(PAGE_SIZE);
  const [messageSize, setMessageSize] = useState(PAGE_SIZE);
  const [preset, setPreset] = useState('2');
  const [activePanel, setActivePanel] = useState('command-history');
  const [selectedCommandKeys, setSelectedCommandKeys] = useState<React.Key[]>(
    [],
  );
  const [selectedCommands, setSelectedCommands] = useState<CommandRecord[]>([]);
  const [selectedMessageKeys, setSelectedMessageKeys] = useState<React.Key[]>(
    [],
  );
  const [selectedMessages, setSelectedMessages] = useState<
    DeviceMessageRecord[]
  >([]);

  const commandsQuery = useQuery({
    queryKey: ['iot-command-history', activeDeviceId, commandPage, commandSize],
    queryFn: () =>
      pageDeviceCommands(activeDeviceId, {
        page: commandPage,
        size: commandSize,
      }),
    enabled: Boolean(activeDeviceId && activePanel === 'command-history'),
  });

  const messagesQuery = useQuery({
    queryKey: ['iot-message-history', activeDeviceId, messagePage, messageSize],
    queryFn: () =>
      pageDeviceMessages(activeDeviceId, {
        page: messagePage,
        size: messageSize,
      }),
    enabled: Boolean(activeDeviceId && activePanel === 'message-history'),
  });

  const otaDeviceQuery = useQuery({
    queryKey: ['iot-ota-device', activeDeviceId],
    queryFn: async () => {
      const response = await getDevice(activeDeviceId, {
        skipErrorHandler: true,
      });
      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || '设备信息加载失败');
      }
      return response.data;
    },
    enabled: Boolean(
      activeDeviceId && activePanel === 'command' && access.canListDevices,
    ),
  });

  const otaFirmwaresQuery = useQuery({
    queryKey: ['iot-ota-firmwares', otaDeviceQuery.data?.productId],
    queryFn: async () => {
      const device = otaDeviceQuery.data;
      if (!device) throw new Error('未加载设备信息');
      const response = await pageFirmwares(
        {
          page: 1,
          size: 100,
          productId: device.productId,
          status: 'released',
        },
        { skipErrorHandler: true },
      );
      if (response.code !== 0) {
        throw new Error(response.message || '固件列表加载失败');
      }
      return (response.data?.list || []) as FirmwareRecord[];
    },
    enabled: Boolean(
      otaDeviceQuery.data?.productId &&
        activePanel === 'command' &&
        access.canListFirmware,
    ),
  });

  const otaDownloadUrlMutation = useMutation({
    mutationFn: async (firmwareId: number) => {
      const response = await getFirmwareDownloadUrl(firmwareId, {
        skipErrorHandler: true,
      });
      if (response.code !== 0 || !response.data) {
        throw new Error(response.message || '固件下载地址生成失败');
      }
      return response.data;
    },
    onError: (error) => message.error(errorText(error, '固件下载地址生成失败')),
  });

  const sendMutation = useMutation({
    mutationFn: async (variables: {
      deviceId: string;
      values: CommandFormValues;
    }) => {
      const { deviceId, values } = variables;
      const cmd =
        values.preset === 'custom'
          ? Number(values.customCmd)
          : Number(values.preset);
      return sendDeviceCommand(deviceId, {
        cmd,
        data: values.data.trim(),
      });
    },
    onSuccess: async (_, variables) => {
      message.success('指令已提交');
      setCommandPage(1);
      setSelectedCommandKeys([]);
      setSelectedCommands([]);
      await queryClient.invalidateQueries({
        queryKey: ['iot-command-history', variables.deviceId],
      });
      form.setFieldValue('data', '{}');
    },
    onError: (error) => message.error(errorText(error, '指令下发失败')),
  });

  const handleSearch = () => {
    const nextDeviceId = deviceIdInput.trim();
    if (!nextDeviceId) {
      message.warning('请先填写设备 ID');
      return;
    }
    setCommandPage(1);
    setMessagePage(1);
    setSelectedCommandKeys([]);
    setSelectedCommands([]);
    setSelectedMessageKeys([]);
    setSelectedMessages([]);
    if (nextDeviceId === activeDeviceId) {
      void queryClient.invalidateQueries({
        queryKey: ['iot-command-history', nextDeviceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['iot-message-history', nextDeviceId],
      });
    } else {
      setActiveDeviceId(nextDeviceId);
      form.setFieldsValue({ firmwareId: undefined, data: '{}' });
    }
  };

  const refreshHistory = () => {
    if (!activeDeviceId) return;
    void queryClient.invalidateQueries({
      queryKey: ['iot-command-history', activeDeviceId],
    });
    void queryClient.invalidateQueries({
      queryKey: ['iot-message-history', activeDeviceId],
    });
  };

  const submitCommand = (values: CommandFormValues) => {
    sendMutation.mutate({ deviceId: activeDeviceId, values });
  };

  const commands = commandsQuery.data;
  const deviceMessages = messagesQuery.data;

  const exportCommandRows = (rows: CommandRecord[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `设备指令-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: '任务 ID', value: (row) => row.commandId },
        { title: '设备 ID', value: (row) => row.deviceId },
        { title: '命令号', value: (row) => row.cmd },
        { title: '载荷', value: (row) => row.payload },
        { title: '状态', value: (row) => row.status },
        { title: '发送时间', value: (row) => row.sentAt },
        { title: '回执时间', value: (row) => row.ackedAt },
        { title: '完成时间', value: (row) => row.finishedAt },
        { title: '创建时间', value: (row) => row.createdAt },
      ],
      rows,
    );
  };

  const exportMessageRows = (rows: DeviceMessageRecord[], suffix: string) => {
    if (!rows.length) return;
    downloadCsv(
      `设备消息-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { title: '消息 ID', value: (row) => row.id },
        { title: '设备 ID', value: (row) => row.deviceId },
        { title: '方向', value: (row) => row.direction },
        { title: '消息类型', value: (row) => row.messageType },
        { title: 'Topic', value: (row) => row.topic },
        { title: '载荷', value: (row) => row.payload },
        { title: '业务消息 ID', value: (row) => row.msgId },
        { title: '时间', value: (row) => row.createdAt },
      ],
      rows,
    );
  };

  return (
    <PageContainer
      title="指令与消息"
      subTitle="按设备查询指令和消息历史，并下发设备命令"
      extra={[
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          disabled={!activeDeviceId}
          loading={commandsQuery.isFetching || messagesQuery.isFetching}
          onClick={refreshHistory}
        >
          刷新历史
        </Button>,
      ]}
    >
      <Space orientation="vertical" size={16} style={{ display: 'flex' }}>
        <Card size="small">
          <Space.Compact style={{ width: '100%', maxWidth: 640 }}>
            <Input
              value={deviceIdInput}
              placeholder="输入设备 ID"
              aria-label="设备 ID"
              onChange={(event) => setDeviceIdInput(event.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              查询历史
            </Button>
          </Space.Compact>
          {activeDeviceId && (
            <Typography.Text
              type="secondary"
              style={{ display: 'block', marginTop: 8 }}
            >
              当前设备：<Typography.Text code>{activeDeviceId}</Typography.Text>
            </Typography.Text>
          )}
        </Card>

        <Tabs
          activeKey={activePanel}
          onChange={setActivePanel}
          size="small"
          type="card"
          items={[
            { key: 'command', label: '下发指令' },
            { key: 'command-history', label: '指令历史' },
            { key: 'message-history', label: '消息历史' },
          ]}
        />

        {activePanel === 'command' && (
          <Card title="下发指令">
            {access.canSendCommand ? (
              <>
                {!activeDeviceId && (
                  <Alert
                    type="info"
                    showIcon
                    message="先输入设备 ID 并查询历史，再下发指令。"
                    style={{ marginBottom: 16 }}
                  />
                )}
                <Form<CommandFormValues>
                  form={form}
                  layout="vertical"
                  initialValues={{ preset: '2', data: '{}' }}
                  onValuesChange={(changed) => {
                    if (changed.preset) {
                      setPreset(changed.preset);
                      if (changed.preset !== '2') {
                        form.setFieldValue('firmwareId', undefined);
                      }
                    }
                  }}
                  onFinish={submitCommand}
                >
                  <Space align="start" wrap style={{ width: '100%' }}>
                    <Form.Item
                      label="命令号"
                      name="preset"
                      rules={[{ required: true, message: '请选择命令' }]}
                      style={{ minWidth: 220 }}
                    >
                      <Select options={commandOptions} />
                    </Form.Item>
                    {preset === 'custom' && (
                      <Form.Item
                        label="扩展命令号"
                        name="customCmd"
                        rules={[
                          { required: true, message: '请输入扩展命令号' },
                          {
                            validator: async (_, value?: number) => {
                              if (
                                value === undefined ||
                                (Number.isInteger(value) &&
                                  value >= 2 &&
                                  value <= 255)
                              ) {
                                return;
                              }
                              throw new Error('命令号必须是 2 到 255 的整数');
                            },
                          },
                        ]}
                        style={{ minWidth: 180 }}
                      >
                        <InputNumber
                          min={2}
                          max={255}
                          precision={0}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    )}
                  </Space>
                  {preset === '2' &&
                    access.canListDevices &&
                    access.canListFirmware && (
                      <>
                        <Form.Item label="已发布固件（可选）" name="firmwareId">
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder={
                              !activeDeviceId
                                ? '先查询设备后选择固件'
                                : otaDeviceQuery.isError
                                  ? '设备信息加载失败'
                                  : '选择该设备所属产品的固件版本'
                            }
                            loading={
                              otaDeviceQuery.isFetching ||
                              otaFirmwaresQuery.isFetching ||
                              otaDownloadUrlMutation.isPending
                            }
                            disabled={
                              !activeDeviceId ||
                              otaDeviceQuery.isError ||
                              otaFirmwaresQuery.isError ||
                              otaDownloadUrlMutation.isPending
                            }
                            notFoundContent={
                              otaFirmwaresQuery.isError
                                ? '固件加载失败'
                                : '当前产品没有已发布固件'
                            }
                            options={(otaFirmwaresQuery.data || []).map(
                              (firmware) => ({
                                label: `${firmware.version} · ${firmware.name}`,
                                value: firmware.id,
                              }),
                            )}
                            onChange={(firmwareId?: number) => {
                              const firmware = otaFirmwaresQuery.data?.find(
                                (item) => item.id === firmwareId,
                              );
                              if (!firmware) return;
                              otaDownloadUrlMutation.mutate(firmware.id, {
                                onSuccess: (url) => {
                                  form.setFieldValue(
                                    'data',
                                    JSON.stringify(
                                      {
                                        version: firmware.version,
                                        url,
                                        size: firmware.sizeBytes,
                                      },
                                      null,
                                      2,
                                    ),
                                  );
                                },
                              });
                            }}
                          />
                        </Form.Item>
                        <Alert
                          type="info"
                          showIcon
                          message="选择固件会填入版本、下载地址和文件大小。固件库保存的是 SHA-256，协议字段是可选 MD5，因此不会自动填入 md5。"
                          style={{ marginBottom: 16 }}
                        />
                      </>
                    )}
                  <Form.Item
                    label="data（JSON 对象）"
                    name="data"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: '请输入 JSON 对象',
                      },
                      {
                        validator: async (_, value?: string) => {
                          if (!value?.trim()) return;
                          try {
                            const parsed: unknown = JSON.parse(value);
                            if (
                              parsed === null ||
                              Array.isArray(parsed) ||
                              typeof parsed !== 'object'
                            ) {
                              throw new Error();
                            }
                          } catch {
                            throw new Error(
                              '请输入合法的 JSON 对象，例如 {"version":"1.0.0"}',
                            );
                          }
                        },
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={4}
                      spellCheck={false}
                      placeholder='{"version":"1.0.0"}'
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    loading={sendMutation.isPending}
                    disabled={!activeDeviceId}
                  >
                    下发命令
                  </Button>
                </Form>
              </>
            ) : (
              <Alert
                type="info"
                showIcon
                message="当前账号没有下发指令权限。"
              />
            )}
          </Card>
        )}

        {activePanel === 'command-history' && (
          <Card
            title="指令历史"
            extra={
              <Space wrap>
                <Typography.Text type="secondary">
                  共 {commands?.total ?? 0} 条
                </Typography.Text>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={!commands?.list.length}
                  onClick={() =>
                    exportCommandRows(commands?.list || [], '当前页')
                  }
                >
                  导出当前页
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={!selectedCommands.length}
                  onClick={() => exportCommandRows(selectedCommands, '已选')}
                >
                  导出已选（{selectedCommands.length}）
                </Button>
              </Space>
            }
          >
            {commandsQuery.isError && (
              <Alert
                type="error"
                showIcon
                message={errorText(commandsQuery.error, '指令历史加载失败')}
                action={
                  <Button size="small" onClick={() => commandsQuery.refetch()}>
                    重试
                  </Button>
                }
                style={{ marginBottom: 16 }}
              />
            )}
            <Table<CommandRecord>
              rowKey="commandId"
              columns={commandColumns}
              dataSource={commands?.list || []}
              rowSelection={{
                preserveSelectedRowKeys: true,
                selectedRowKeys: selectedCommandKeys,
                onChange: (keys, rows) => {
                  setSelectedCommandKeys(keys);
                  setSelectedCommands(rows);
                },
              }}
              loading={commandsQuery.isLoading}
              pagination={false}
              scroll={{ x: 1250 }}
              locale={{
                emptyText: activeDeviceId ? (
                  <Empty
                    description={
                      commandsQuery.isError ? '加载失败' : '暂无指令记录'
                    }
                  />
                ) : (
                  <Empty description="填写设备 ID 后查询指令历史" />
                ),
              }}
            />
            {commands && commands.total > 0 && (
              <Pagination
                current={commandPage}
                pageSize={commandSize}
                total={commands.total}
                showSizeChanger
                responsive
                pageSizeOptions={[10, 20, 50]}
                showTotal={(total) => `共 ${total} 条`}
                onChange={(page, size) => {
                  setCommandPage(page);
                  setCommandSize(size);
                }}
                style={{
                  marginTop: 16,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  rowGap: 8,
                }}
              />
            )}
          </Card>
        )}

        {activePanel === 'message-history' && (
          <Card
            title="消息历史"
            extra={
              <Space wrap>
                <Typography.Text type="secondary">
                  共 {deviceMessages?.total ?? 0} 条
                </Typography.Text>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={!deviceMessages?.list.length}
                  onClick={() =>
                    exportMessageRows(deviceMessages?.list || [], '当前页')
                  }
                >
                  导出当前页
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={!selectedMessages.length}
                  onClick={() => exportMessageRows(selectedMessages, '已选')}
                >
                  导出已选（{selectedMessages.length}）
                </Button>
              </Space>
            }
          >
            {messagesQuery.isError && (
              <Alert
                type="error"
                showIcon
                message={errorText(messagesQuery.error, '消息历史加载失败')}
                action={
                  <Button size="small" onClick={() => messagesQuery.refetch()}>
                    重试
                  </Button>
                }
                style={{ marginBottom: 16 }}
              />
            )}
            <Table<DeviceMessageRecord>
              rowKey="id"
              columns={messageColumns}
              dataSource={deviceMessages?.list || []}
              rowSelection={{
                preserveSelectedRowKeys: true,
                selectedRowKeys: selectedMessageKeys,
                onChange: (keys, rows) => {
                  setSelectedMessageKeys(keys);
                  setSelectedMessages(rows);
                },
              }}
              loading={messagesQuery.isLoading}
              pagination={false}
              scroll={{ x: 1300 }}
              locale={{
                emptyText: activeDeviceId ? (
                  <Empty
                    description={
                      messagesQuery.isError ? '加载失败' : '暂无消息记录'
                    }
                  />
                ) : (
                  <Empty description="填写设备 ID 后查询消息历史" />
                ),
              }}
            />
            {deviceMessages && deviceMessages.total > 0 && (
              <Pagination
                current={messagePage}
                pageSize={messageSize}
                total={deviceMessages.total}
                showSizeChanger
                responsive
                pageSizeOptions={[10, 20, 50]}
                showTotal={(total) => `共 ${total} 条`}
                onChange={(page, size) => {
                  setMessagePage(page);
                  setMessageSize(size);
                }}
                style={{
                  marginTop: 16,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  rowGap: 8,
                }}
              />
            )}
          </Card>
        )}
      </Space>
    </PageContainer>
  );
};

export default MessagesPage;
